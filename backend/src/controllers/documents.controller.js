const documentsService = require('../services/documents.service');

function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function uploadDocument(req, res, next) {
  if (!req.file) {
    next(createHttpError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.'));
    return;
  }

  try {
    const document = documentsService.registerDocument(req.file);
    res.status(201).json({ data: { document } });
  } catch (error) {
    next(error);
  }
}

function listDocuments(req, res, next) {
  try {
    res.status(200).json({ data: { documents: documentsService.listDocuments() } });
  } catch (error) {
    next(error);
  }
}

function downloadDocument(req, res, next) {
  const download = documentsService.getDownload(req.params.id);

  if (!download) {
    next(createHttpError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.'));
    return;
  }

  res.download(download.storagePath, download.document.originalName, (error) => {
    if (!error) return;
    if (res.headersSent) return next(error);
    if (error.code === 'ENOENT') {
      return next(createHttpError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.'));
    }
    next(error);
  });
}

function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);

  const knownErrors = {
    FILE_REQUIRED: [400, 'Envie um arquivo no campo file.'],
    FILE_TYPE_NOT_ALLOWED: [415, 'O tipo do arquivo não é permitido.'],
    LIMIT_FILE_SIZE: [413, 'O arquivo excede o tamanho máximo permitido.'],
    LIMIT_FIELD_COUNT: [400, 'Não envie campos adicionais no formulário.'],
    LIMIT_PART_COUNT: [400, 'Envie somente um arquivo no formulário.'],
    LIMIT_UNEXPECTED_FILE: [400, 'Envie um único arquivo no campo file.'],
    INVALID_MULTIPART: [400, 'Requisição multipart inválida.'],
    DOCUMENT_NOT_FOUND: [404, 'Documento não encontrado.']
  };
  const [statusCode, message] = knownErrors[error.code] || [500, 'Não foi possível processar a solicitação.'];

  res.status(statusCode).json({
    error: {
      code: knownErrors[error.code] ? error.code : 'INTERNAL_ERROR',
      message
    }
  });
}

module.exports = {
  uploadDocument,
  listDocuments,
  downloadDocument,
  handleError
};