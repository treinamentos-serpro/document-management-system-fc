const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { once } = require('node:events');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-app-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_UPLOAD_SIZE_BYTES = '32';
const app = require('../src/app');
const documentsController = require('../src/controllers/documents.controller');

test.after(() => {
  fs.rmSync(storageDirectory, { recursive: true, force: true });
});

// Garante que o app Express foi exportado.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('ALLOWED_MIME_TYPES rejeita tipos fora da allowlist padrão', () => {
  const result = spawnSync(process.execPath, ['-e', "require('./src/routes/documents.routes')"], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, ALLOWED_MIME_TYPES: 'image/png' },
    encoding: 'utf8'
  });

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /ALLOWED_MIME_TYPES only supports built-in MIME types/);
});

test('upload, listagem e download de documentos funcionam pela aplicação', async (context) => {
  const server = app.listen(0);
  await once(server, 'listening');
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.strictEqual(healthResponse.status, 200);
  assert.deepStrictEqual(await healthResponse.json(), { status: 'ok' });

  const formData = new FormData();
  formData.append('file', new Blob(['documento de teste'], { type: 'text/plain' }), 'teste.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: formData
  });
  assert.strictEqual(uploadResponse.status, 201);
  const { data: { document } } = await uploadResponse.json();
  assert.strictEqual(document.originalName, 'teste.txt');

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(listResponse.status, 200);
  const { data: { documents } } = await listResponse.json();
  assert.strictEqual(documents.length, 1);
  assert.strictEqual(documents[0].id, document.id);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), 'documento de teste');

  const emptyFormData = new FormData();
  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: emptyFormData
  });
  assert.strictEqual(missingFileResponse.status, 400);
  assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const oversizedFormData = new FormData();
  oversizedFormData.append('file', new Blob(['x'.repeat(33)], { type: 'text/plain' }), 'grande.txt');
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: oversizedFormData
  });
  assert.strictEqual(oversizedResponse.status, 413);
  assert.strictEqual((await oversizedResponse.json()).error.code, 'LIMIT_FILE_SIZE');

  const unknownDocumentResponse = await fetch(`${baseUrl}/documents/00000000-0000-4000-8000-000000000000/download`);
  assert.strictEqual(unknownDocumentResponse.status, 404);
  assert.strictEqual((await unknownDocumentResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

  const storedFile = fs.readdirSync(storageDirectory).find((fileName) => fileName.endsWith('.txt'));
  assert.ok(storedFile);
  fs.unlinkSync(path.join(storageDirectory, storedFile));
  const missingLocalFileResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(missingLocalFileResponse.status, 404);
  assert.strictEqual((await missingLocalFileResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

  await new Promise((resolve) => setTimeout(resolve, 10));
  const newerFormData = new FormData();
  newerFormData.append('file', new Blob(['documento mais recente'], { type: 'text/plain' }), 'mais-recente.txt');
  const newerUploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: newerFormData
  });
  assert.strictEqual(newerUploadResponse.status, 201);
  const { data: { document: newerDocument } } = await newerUploadResponse.json();
  assert.ok(newerDocument.uploadedAt > document.uploadedAt);

  const newestListResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(newestListResponse.status, 200);
  const { data: { documents: newestDocuments } } = await newestListResponse.json();
  assert.deepStrictEqual(newestDocuments.map(({ id }) => id), [newerDocument.id, document.id]);

  const rejectedFormData = new FormData();
  rejectedFormData.append('file', new Blob(['imagem'], { type: 'image/png' }), 'imagem.png');
  const rejectedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: rejectedFormData
  });
  assert.strictEqual(rejectedResponse.status, 415);
  const { error } = await rejectedResponse.json();
  assert.strictEqual(error.code, 'FILE_TYPE_NOT_ALLOWED');

  const malformedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    body: ''
  });
  assert.strictEqual(malformedResponse.status, 400);
  assert.strictEqual((await malformedResponse.json()).error.code, 'INVALID_MULTIPART');

  const fieldFormData = new FormData();
  fieldFormData.append('file', new Blob(['documento'], { type: 'text/plain' }), 'campo.txt');
  fieldFormData.append('extra', 'valor');
  const fieldResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: fieldFormData
  });
  assert.strictEqual(fieldResponse.status, 400);
  assert.strictEqual((await fieldResponse.json()).error.code, 'LIMIT_FIELD_COUNT');

  const partsFormData = new FormData();
  partsFormData.append('file', new Blob(['documento'], { type: 'text/plain' }), 'primeiro.txt');
  partsFormData.append('file', new Blob(['documento'], { type: 'text/plain' }), 'segundo.txt');
  const partsResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: partsFormData
  });
  assert.strictEqual(partsResponse.status, 400);
  assert.strictEqual((await partsResponse.json()).error.code, 'LIMIT_UNEXPECTED_FILE');
});

test('multipart part-count errors are returned as client errors', () => {
  const response = {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  documentsController.handleError({ code: 'LIMIT_PART_COUNT' }, {}, response, () => {});

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.error.code, 'LIMIT_PART_COUNT');

  documentsController.handleError({ code: 'EACCES', message: 'storage path unavailable' }, {}, response, () => {});

  assert.strictEqual(response.statusCode, 500);
  assert.strictEqual(response.body.error.code, 'INTERNAL_ERROR');
  assert.strictEqual(response.body.error.message, 'Não foi possível processar a solicitação.');
});
