import { useState } from 'react';
import formatFileSize from '../utils/formatFileSize.js';

const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.txt,.rtf';

export default function UploadComponent({ onUpload, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || isUploading) return;

    const form = event.currentTarget;
    const uploaded = await onUpload(selectedFile);
    if (uploaded) {
      form.reset();
      setSelectedFile(null);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker">
        <span className="file-picker__symbol" aria-hidden="true">+</span>
        <span className="file-picker__text">
          <strong>{selectedFile ? 'Trocar arquivo' : 'Escolher arquivo'}</strong>
          <span>no seu dispositivo</span>
        </span>
        <input
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          disabled={isUploading}
        />
      </label>

      <div className="upload-form__submit">
        <div className="selected-file" aria-live="polite">
          {selectedFile ? (
            <>
              <span className="selected-file__name" title={selectedFile.name}>{selectedFile.name}</span>
              <span className="selected-file__size">{formatFileSize(selectedFile.size)}</span>
            </>
          ) : (
            <span className="selected-file__placeholder">Nenhum arquivo selecionado</span>
          )}
        </div>
        <button className="upload-button" type="submit" disabled={!selectedFile || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar arquivo'}
          {!isUploading && <span aria-hidden="true">→</span>}
        </button>
      </div>
    </form>
  );
}