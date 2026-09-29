const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-app-test-'));
process.env.STORAGE_DIR = storageDirectory;
const app = require('../src/app');

test.after(() => {
  fs.rmSync(storageDirectory, { recursive: true, force: true });
});

// Garante que o app Express foi exportado.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
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

  const rejectedFormData = new FormData();
  rejectedFormData.append('file', new Blob(['imagem'], { type: 'image/png' }), 'imagem.png');
  const rejectedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: rejectedFormData
  });
  assert.strictEqual(rejectedResponse.status, 415);
  const { error } = await rejectedResponse.json();
  assert.strictEqual(error.code, 'FILE_TYPE_NOT_ALLOWED');
});
