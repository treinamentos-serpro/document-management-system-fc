const { randomUUID } = require('node:crypto');
const documentsRepository = require('../repositories/documents.repository');
const storageRepository = require('../repositories/storage.repository');
const { hasExpectedContent } = require('./file-validation.service');

function toPublicDocument(document) {
  const { storageName, storagePath, ...publicDocument } = document;
  return publicDocument;
}

async function registerDocument(file) {
  try {
    if (!(await hasExpectedContent(file))) {
      const error = new Error('O conteúdo não corresponde ao tipo de arquivo informado.');
      error.code = 'FILE_CONTENT_INVALID';
      throw error;
    }

    const document = {
      id: randomUUID(),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner: process.env.DEFAULT_OWNER || 'default',
      storageName: file.filename
    };

    documentsRepository.add(document);
    return toPublicDocument(document);
  } catch (error) {
    await storageRepository.removeUploadedFile(file).catch(() => {});
    throw error;
  }
}

function listDocuments() {
  return documentsRepository
    .findAll()
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map(toPublicDocument);
}

function getDownload(id) {
  const document = documentsRepository.findById(id);
  if (!document) return null;

  return {
    document: toPublicDocument(document),
    storagePath: storageRepository.resolveStoragePath(document.storageName)
  };
}

module.exports = {
  registerDocument,
  listDocuments,
  getDownload
};