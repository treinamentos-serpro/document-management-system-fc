import DownloadButton from './DownloadButton.jsx';
import formatFileSize from '../utils/formatFileSize.js';

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function getFileType(document) {
  const extension = document.originalName?.split('.').pop();
  return extension && extension !== document.originalName
    ? extension.toUpperCase()
    : document.mimeType || 'ARQUIVO';
}

export default function DocumentList({ documents, isLoading, listError, onRetry, onDownloadError }) {
  if (isLoading && documents.length === 0) {
    return <p className="list-message" role="status">Carregando documentos...</p>;
  }

  if (!isLoading && listError && documents.length === 0) {
    return (
      <div className="list-message" role="alert">
        <p>Não foi possível carregar os documentos.</p>
        <button className="refresh-button" type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!isLoading && documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state__index" aria-hidden="true">00</span>
        <div>
          <h3>A biblioteca está vazia.</h3>
          <p>Os documentos enviados aparecerão aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-table-wrap" aria-busy={isLoading}>
      <table className="document-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Tipo</th>
            <th scope="col">Tamanho</th>
            <th scope="col">Enviado em</th>
            <th scope="col">Owner</th>
            <th scope="col"><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td className="document-name" data-label="Nome">
                <span className="document-name__mark" aria-hidden="true">DOC</span>
                <span title={document.originalName}>{document.originalName}</span>
              </td>
              <td data-label="Tipo"><span className="file-type">{getFileType(document)}</span></td>
              <td className="table-muted" data-label="Tamanho">{formatFileSize(document.size)}</td>
              <td className="table-muted" data-label="Enviado em">{formatDate(document.uploadedAt)}</td>
              <td className="table-muted" data-label="Owner">{document.owner}</td>
              <td className="document-action" data-label="Ação">
                <DownloadButton document={document} onError={onDownloadError} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}