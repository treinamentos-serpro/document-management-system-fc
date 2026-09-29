const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../../..');
const storageDirectory = path.resolve(
  projectRoot,
  process.env.STORAGE_DIR || 'backend/storage'
);

function resolveStoragePath(storageName) {
  const validStorageName = typeof storageName === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|doc|docx|txt|rtf)$/i.test(storageName);
  if (!validStorageName || path.basename(storageName) !== storageName) {
    throw new Error('Nome de armazenamento inválido.');
  }

  const storagePath = path.resolve(storageDirectory, storageName);
  const relativePath = path.relative(storageDirectory, storagePath);
  if (
    !relativePath
    || relativePath === '..'
    || relativePath.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativePath)
  ) {
    throw new Error('Caminho fora do diretório de armazenamento.');
  }

  return storagePath;
}

module.exports = { storageDirectory, resolveStoragePath };