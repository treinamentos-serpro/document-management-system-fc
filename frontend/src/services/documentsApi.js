const API_BASE_PATH = '/api';

async function readError(response) {
  const payload = await response.json().catch(() => null);
  const error = new Error(
    payload?.error?.message || 'Não foi possível concluir a solicitação.'
  );
  error.code = payload?.error?.code || 'REQUEST_FAILED';
  error.status = response.status;
  return error;
}

export async function listDocuments() {
  const response = await fetch(`${API_BASE_PATH}/documents`);
  if (!response.ok) throw await readError(response);

  const payload = await response.json();
  return payload.data.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_PATH}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) throw await readError(response);

  const payload = await response.json();
  return payload.data.document;
}

export async function downloadDocument(document) {
  const response = await fetch(
    `${API_BASE_PATH}/documents/${encodeURIComponent(document.id)}/download`
  );
  if (!response.ok) throw await readError(response);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = objectUrl;
  link.download = document.originalName;
  link.hidden = true;
  window.document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}