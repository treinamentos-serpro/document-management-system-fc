const express = require('express');
const multer = require('multer');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { storageDirectory } = require('../config/storage');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();
const defaultMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'text/rtf'
]);
const extensionMimeTypes = {
  '.pdf': new Set(['application/pdf']),
  '.doc': new Set(['application/msword']),
  '.docx': new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  '.txt': new Set(['text/plain']),
  '.rtf': new Set(['application/rtf', 'text/rtf'])
};
const configuredMimeTypes = process.env.ALLOWED_MIME_TYPES
  ? process.env.ALLOWED_MIME_TYPES.split(',').map((mimeType) => mimeType.trim().toLowerCase()).filter(Boolean)
  : [...defaultMimeTypes];
const unsupportedMimeTypes = configuredMimeTypes.filter((mimeType) => !defaultMimeTypes.has(mimeType));

if (unsupportedMimeTypes.length > 0) {
  throw new Error(`ALLOWED_MIME_TYPES only supports built-in MIME types: ${unsupportedMimeTypes.join(', ')}`);
}

const allowedMimeTypes = new Set(configuredMimeTypes);
const configuredLimit = Number(process.env.MAX_UPLOAD_SIZE_BYTES);
const maxUploadSize = Number.isSafeInteger(configuredLimit) && configuredLimit > 0
  ? configuredLimit
  : 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDirectory, { recursive: true }, (error) => {
      callback(error, storageDirectory);
    });
  },
  filename(req, file, callback) {
    callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: maxUploadSize, fields: 0, parts: 2 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();
    const acceptedMimeTypes = extensionMimeTypes[extension];
    const isAllowed = allowedMimeTypes.has(mimeType)
      && acceptedMimeTypes?.has(mimeType);

    if (!isAllowed) {
      const error = new Error('Tipo de arquivo não permitido.');
      error.code = 'FILE_TYPE_NOT_ALLOWED';
      callback(error);
      return;
    }

    callback(null, true);
  }
});

const uploadSingleFile = upload.single('file');
const multipartParserErrors = new Set([
  'Multipart: Boundary not found',
  'Malformed part header',
  'Unexpected end of file',
  'Unexpected end of form'
]);

function handleUploadError(req, res, next) {
  uploadSingleFile(req, res, (error) => {
    if (error && multipartParserErrors.has(error.message)) {
      error.code = 'INVALID_MULTIPART';
    }
    next(error);
  });
}

router.post('/upload', handleUploadError, documentsController.uploadDocument);
router.get('/documents', documentsController.listDocuments);
router.get('/documents/:id/download', documentsController.downloadDocument);
router.use(documentsController.handleError);

module.exports = router;