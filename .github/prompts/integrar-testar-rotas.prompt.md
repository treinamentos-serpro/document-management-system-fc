---
description: Registra um router no Express e cria testes de integração para suas rotas.
name: integrar-testar-rotas
argument-hint: nome do recurso (ex. documents)
agent: agent
---

# Integrar e testar rotas do backend

Integre o router existente do recurso `${input:recurso:nome do recurso}` à aplicação Express e cubra seus contratos HTTP com testes de integração.

## Integração

- Inspecione `backend/src/app.js` e `backend/src/routes/${input:recurso}.routes.js` antes de editar.
- Registre o router exportado pela camada de rotas no app Express, seguindo o fluxo `routes -> controllers -> services -> repositories`.
- Preserve o middleware `express.json()`, o endpoint `GET /health`, a exportação do app e o comportamento de inicialização direta do servidor.
- Use os paths definidos pelo router. Não adicione `/api` ao backend se esse prefixo já é removido pelo proxy do Vite.
- Evite registrar o mesmo router mais de uma vez e não altere regras de negócio fora do necessário para a integração.

## Testes de integração

- Crie ou atualize testes em `backend/test` usando `node:test`, `node:assert` e `fetch` nativo.
- Inicie o app em uma porta dinâmica (`0`) e encerre o servidor ao final do teste, inclusive em caso de falha.
- Cubra os principais fluxos de sucesso e erro definidos pelo router. Para upload, valide o envio multipart, a listagem e o download; inclua ao menos um erro representativo, como arquivo ausente, tipo não aceito ou recurso inexistente.
- Se o recurso grava arquivos, configure `STORAGE_DIR` para um diretório temporário antes de carregar o app e remova esse diretório no teardown. Não use nem limpe `backend/storage` durante os testes.
- Verifique status HTTP e formato de resposta sem acoplar os testes a mensagens internas ou caminhos locais.
- Não adicione dependências de teste nem dependa de serviços externos.

## Validação

- Execute `npm --prefix backend test` e corrija falhas relacionadas à integração.
- Mantenha a alteração limitada ao registro do router e aos testes necessários.