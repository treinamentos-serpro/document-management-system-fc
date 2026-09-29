const fs = require('node:fs/promises');
const path = require('node:path');
const { resolveStoragePath } = require('../config/storage');

async function removeUploadedFile(file) {
  const storagePath = resolveStoragePath(file.filename);
  if (path.resolve(file.path) !== storagePath) {
    throw new Error('Caminho do upload não corresponde ao nome armazenado.');
  }

  await fs.rm(storagePath, { force: true });
}

module.exports = { removeUploadedFile, resolveStoragePath };