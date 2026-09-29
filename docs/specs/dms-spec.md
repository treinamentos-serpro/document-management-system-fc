# Especificação - Document Management System

> Documento de planejamento. Os requisitos e contratos abaixo descrevem o
> comportamento desejado; os endpoints de documentos ainda não estão implementados.

## 1. Objetivo

Entregar uma aplicação web simples para enviar, listar e baixar documentos, armazenando os arquivos no filesystem local e mantendo seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Enviar um documento por requisição.
- Listar os documentos enviados durante a execução atual do backend.
- Baixar um documento pelo identificador.
- Exibir no frontend o formulário de upload, a lista de documentos e ações de download.
- Exibir estados de carregamento, lista vazia e erros das operações.
- Associar os documentos a um owner padrão/configurável, sem autenticação nesta fase.

### Fora do escopo

- Armazenamento em nuvem, banco de dados ou provedores externos.
- Persistência dos metadados além da memória do processo.
- Autenticação, autorização e isolamento de documentos entre usuários.
- Versionamento, edição, exclusão, busca avançada e compartilhamento de documentos.
- Upload de múltiplos arquivos em uma única requisição.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo usando o formulário do frontend. |
| RF-02 | A API aceita um arquivo por requisição `multipart/form-data`, no campo `file`. |
| RF-03 | Após um upload válido, o sistema atribui um identificador único, grava o arquivo localmente e registra os metadados em memória. |
| RF-04 | O usuário pode listar os documentos disponíveis na execução atual do backend. |
| RF-05 | A lista apresenta nome original, tamanho, tipo, data de envio e owner, ordenada do envio mais recente para o mais antigo. |
| RF-06 | O usuário pode baixar um documento pelo identificador; o download preserva o nome original como nome sugerido ao salvar. |
| RF-07 | O frontend apresenta o resultado das operações e mensagens compreensíveis para falhas de validação ou de comunicação. |
| RF-08 | A API retorna `404` quando o identificador solicitado não corresponder a um documento conhecido. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são armazenados no filesystem local em `backend/storage`, usando Multer com `diskStorage`. |
| RNF-02 | Os metadados são mantidos em memória; reiniciar o backend os remove, mesmo que os arquivos físicos permaneçam no disco. |
| RNF-03 | O limite padrão de upload é 10 MiB e pode ser ajustado por variável de ambiente. |
| RNF-04 | A allowlist padrão aceita PDF, DOC, DOCX, TXT e RTF; a configuração por ambiente pode somente restringir os tipos suportados. |
| RNF-05 | O nome físico do arquivo é gerado pela aplicação. Caminhos locais e nomes físicos não são expostos pela API. |
| RNF-06 | A configuração operacional, incluindo porta, diretório e limites, é feita por variáveis de ambiente, em linha com 12-Factor App. |
| RNF-07 | O backend usa Node.js, Express e CommonJS; o frontend usa React e Vite. A implementação permanece em JavaScript. |
| RNF-08 | O código backend separa rotas, controllers, services e repositories, com fluxo de dependência `routes -> controllers -> services -> repositories`. |
| RNF-09 | A comunicação frontend-backend usa `fetch` e o prefixo `/api`, encaminhado pelo proxy já configurado no Vite. |
| RNF-10 | Erros inesperados não expõem stack traces, caminhos locais ou detalhes internos ao cliente. |
| RNF-11 | Os testes backend usam o runner nativo `node:test` e cobrem contratos, validações e casos de erro. |

### Configuração proposta

Os nomes abaixo são propostas para a implementação; devem ser usados de forma consistente entre backend e documentação:

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local dos arquivos. |
| `MAX_UPLOAD_SIZE_BYTES` | `10485760` | Limite por arquivo (10 MiB). |
| `ALLOWED_MIME_TYPES` | PDF, DOC, DOCX, TXT e RTF | Subconjunto, em lista separada por vírgulas, dos tipos de mídia suportados. Tipos fora da allowlist padrão não são aceitos. |
| `DEFAULT_OWNER` | `default` | Owner atribuído aos documentos nesta fase sem autenticação. |

O tipo de mídia enviado pelo cliente não comprova o conteúdo real do arquivo. A validação por tipo e extensão deve ser tratada como uma allowlist de entrada, sem usá-la como garantia de segurança do conteúdo.

O backend também confere assinaturas básicas dos formatos aceitos e valida arquivos TXT como UTF-8 sem bytes nulos. Essas verificações reduzem uploads acidentais ou evidentemente incompatíveis, mas não substituem parsers completos, análise antivírus ou uma garantia de que o conteúdo é seguro.

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único do documento, gerado pelo backend. |
| `originalName` | string | Nome original enviado pelo cliente; usado apenas como metadado e nome sugerido no download. |
| `mimeType` | string | Tipo de mídia registrado para o documento. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601, UTC. |
| `owner` | string | Owner padrão definido pela configuração do backend; não identifica uma sessão autenticada. |

### Dados internos de armazenamento

O registro mantido pelo repository associa os metadados públicos a um nome físico gerado, por exemplo `storageName`. Esse valor serve para localizar o arquivo em `STORAGE_DIR`, não é retornado ao cliente e nunca deve ser derivado diretamente do nome original recebido.

Os metadados existem somente na memória do processo. Portanto, após reiniciar o servidor, a API não terá registros para localizar os arquivos que permaneceram no diretório local. Recuperação de registros e limpeza de arquivos órfãos ficam fora do escopo desta versão.

## 6. Contratos de API

As rotas abaixo são expostas pelo backend sem o prefixo `/api`. No navegador, o frontend chama os caminhos com `/api`; o proxy do Vite remove esse prefixo ao encaminhar a requisição ao backend.

### Formato de erro

Respostas de erro em JSON usam o formato:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo file."
  }
}
```

`code` é estável para consumo pelo frontend; `message` é uma descrição adequada para exibição ao usuário e não inclui detalhes internos.

### `POST /upload`

- **Entrada:** `multipart/form-data` com exatamente um arquivo no campo `file`.
- **Validações:** arquivo presente, tamanho dentro do limite e tipo/extensão na allowlist configurada.
- **Sucesso:** `201 Created`, `Content-Type: application/json`.

```json
{
  "data": {
    "document": {
      "id": "<id>",
      "originalName": "relatorio.pdf",
      "mimeType": "application/pdf",
      "size": 12345,
      "uploadedAt": "2026-09-29T12:00:00.000Z",
      "owner": "default"
    }
  }
}
```

- **Erros:** `400 Bad Request` se o arquivo estiver ausente ou a requisição multipart for inválida; `413 Content Too Large` se exceder o limite; `415 Unsupported Media Type` se o tipo não for aceito; `500 Internal Server Error` para falha inesperada de gravação ou processamento.

### `GET /documents`

- **Entrada:** sem parâmetros obrigatórios.
- **Sucesso:** `200 OK`, com os metadados disponíveis em memória, ordenados por `uploadedAt` decrescente. Se não houver documentos, retorna lista vazia.

```json
{
  "data": {
    "documents": []
  }
}
```

- **Erro:** `500 Internal Server Error` para falha inesperada ao consultar o repository.

### `GET /documents/:id/download`

- **Entrada:** `id` do documento no path.
- **Sucesso:** `200 OK`, corpo binário do arquivo, `Content-Type` correspondente ao documento e `Content-Disposition: attachment` com o nome original devidamente codificado.
- **Erros:** `404 Not Found` se o documento não existir na memória ou se seu arquivo local não estiver disponível; `500 Internal Server Error` para falha inesperada de leitura.

Respostas de download com erro usam o formato JSON comum de erro. O nome original deve ser tratado como dado não confiável ao compor cabeçalhos HTTP.

### Códigos de erro sugeridos

| HTTP | `code` sugerido | Condição |
| --- | --- | --- |
| 400 | `FILE_REQUIRED` / `INVALID_MULTIPART` | Arquivo ausente ou requisição inválida. |
| 413 | `FILE_TOO_LARGE` | Limite por arquivo excedido. |
| 415 | `FILE_TYPE_NOT_ALLOWED` | Tipo ou extensão fora da allowlist. |
| 404 | `DOCUMENT_NOT_FOUND` | Documento ou arquivo local não encontrado. |
| 500 | `INTERNAL_ERROR` | Falha inesperada, sem detalhes internos na resposta. |

## 7. Decisões arquiteturais

- **Rotas:** declaram os endpoints e compõem os middlewares HTTP, incluindo o middleware de upload do Multer.
- **Controllers:** convertem entrada HTTP em chamadas de serviço e formatam status, cabeçalhos e respostas.
- **Services:** aplicam regras de negócio, validam operações e coordenam repositories.
- **Repositories:** mantêm os metadados em memória e abstraem a gravação/leitura local dos arquivos.
- O fluxo de dependência é unidirecional: `routes -> controllers -> services -> repositories`. Camadas internas não dependem de Express nem de detalhes HTTP.
- Multer usa `diskStorage` e escreve exclusivamente no diretório local configurado. Falhas após a gravação devem evitar deixar arquivo parcial ou órfão sempre que possível.
- O backend segue Express/CommonJS; o frontend segue React/Vite e organização por componentes, páginas e serviços.
- O frontend consome a API por `fetch` usando `/api`; o proxy do Vite encaminha ao backend local.
- A fase inicial não adiciona autenticação, persistência de metadados em banco ou dependências de armazenamento externo.
- O endpoint existente `GET /health` deve ser preservado.

## 8. Plano de execução

As etapas a seguir são futuras e não fazem parte da criação desta especificação. A implementação deve ocorrer em tarefas próprias, sem ampliar o escopo documental atual.

1. **Backend e armazenamento:** definir configuração por ambiente; implementar repository de metadados em memória e acesso ao filesystem; configurar Multer com `diskStorage`, nome físico gerado, limites e allowlist; criar services, controllers e rotas para upload, listagem e download; preservar `GET /health`.
2. **Testes backend:** cobrir upload válido, ausência de arquivo, tipo não aceito, limite excedido, listagem vazia/ordenada, download válido e documento/arquivo inexistente usando `node:test`; verificar a forma das respostas HTTP.
3. **Frontend:** criar serviço de API com `fetch` via `/api`, componentes de upload, listagem e download e a página principal; tratar carregamento, sucesso, lista vazia e falhas.
4. **Integração e validação:** subir backend e frontend, percorrer upload-listagem-download manualmente, validar cabeçalhos e erros, rodar a suíte backend e corrigir divergências em tarefas de implementação correspondentes.

## 9. Estado atual e critérios de aceite

No momento da elaboração desta especificação, o backend expõe somente `GET /health`; as rotas de documentos e as camadas de aplicação ainda precisam ser implementadas. O frontend ainda não oferece o fluxo de gestão de documentos.

Esta especificação está completa quando:

- Os requisitos funcionais e não funcionais estão identificados e verificáveis.
- O modelo de dados diferencia metadados públicos de detalhes internos de armazenamento.
- Os três contratos definem entrada, sucesso, erros e status HTTP.
- As decisões respeitam Clean Architecture simples, Multer com armazenamento local e metadados em memória.
- O plano descreve as fases futuras sem implementar arquivos de backend ou frontend.