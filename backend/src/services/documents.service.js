const { randomUUID } = require('node:crypto');
const documentsRepository = require('../repositories/documents.repository');

function toPublicDocument(document) {
  const { storagePath, ...publicDocument } = document;
  return publicDocument;
}

function registerDocument(file) {
  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: process.env.DEFAULT_OWNER || 'default',
    storagePath: file.path
  };

  documentsRepository.add(document);
  return toPublicDocument(document);
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
    storagePath: document.storagePath
  };
}

module.exports = {
  registerDocument,
  listDocuments,
  getDownload
};