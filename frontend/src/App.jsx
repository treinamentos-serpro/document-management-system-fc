import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments, uploadDocument } from './services/documentsApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function refreshDocuments() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const result = await listDocuments();
        if (isCurrent) setDocuments(result);
      } catch (error) {
        if (isCurrent) setErrorMessage(error.message);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    refreshDocuments();
    return () => {
      isCurrent = false;
    };
  }, [refreshCount]);

  async function handleUpload(file) {
    setErrorMessage('');
    setSuccessMessage('');
    setIsUploading(true);

    try {
      await uploadDocument(file);
      setSuccessMessage(`${file.name} foi enviado.`);
      setRefreshCount((count) => count + 1);
      return true;
    } catch (error) {
      setErrorMessage(error.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  function handleDownloadError(error) {
    setErrorMessage(error.message);
    setSuccessMessage('');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="DMS, início">
          <span className="brand__mark" aria-hidden="true">D</span>
          <span>DMS<span className="brand__divider">/</span>ARQUIVO</span>
        </a>
        <div className="storage-status">
          <span className="storage-status__dot" aria-hidden="true" />
          Armazenamento local
        </div>
      </header>

      <main id="inicio" className="page-content">
        <section className="intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">GESTÃO DE DOCUMENTOS <span>01 — BIBLIOTECA</span></p>
            <h1 id="page-title">Documentos<span className="intro__period">.</span></h1>
            <p className="intro__description">
              Seus arquivos, organizados em um só lugar.
            </p>
          </div>
          <div className="document-count" aria-live="polite">
            <span className="document-count__number">{documents.length.toString().padStart(2, '0')}</span>
            <span className="document-count__label">{documents.length === 1 ? 'documento' : 'documentos'}<br />na biblioteca</span>
          </div>
        </section>

        <section className="upload-section" aria-labelledby="upload-heading">
          <div className="upload-section__copy">
            <p className="eyebrow eyebrow--light">01 / ADICIONAR</p>
            <h2 id="upload-heading">Um novo arquivo<br />começa aqui.</h2>
            <p>PDF, DOC, DOCX, TXT ou RTF. Até 10 MB por arquivo.</p>
          </div>
          <UploadComponent onUpload={handleUpload} isUploading={isUploading} />
        </section>

        {(errorMessage || successMessage) && (
          <div
            className={`feedback ${errorMessage ? 'feedback--error' : 'feedback--success'}`}
            role={errorMessage ? 'alert' : 'status'}
          >
            <span>{errorMessage || successMessage}</span>
            <button
              className="feedback__dismiss"
              type="button"
              aria-label="Fechar mensagem"
              onClick={() => {
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              ×
            </button>
          </div>
        )}

        <section className="library-section" aria-labelledby="library-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 / ARQUIVOS</p>
              <h2 id="library-heading">Sua biblioteca</h2>
            </div>
            <button
              className="refresh-button"
              type="button"
              onClick={() => setRefreshCount((count) => count + 1)}
              disabled={isLoading}
              title="Atualizar documentos"
            >
              <span aria-hidden="true">↻</span>
              Atualizar
            </button>
          </div>

          <DocumentList
            documents={documents}
            isLoading={isLoading}
            onDownloadError={handleDownloadError}
          />
        </section>

        <footer className="page-footer">
          <span>DMS <span aria-hidden="true">/</span> DOCUMENT MANAGEMENT SYSTEM</span>
          <span>ARQUIVOS DISPONÍVEIS NESTA SESSÃO</span>
        </footer>
      </main>
    </div>
  );
}