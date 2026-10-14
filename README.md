# ACA

Agente Corretor de Aplicativos (ACA) — scaffold Phase 2

Este repositório contém um agente autónomo mínimo para gerar propostas de patchs para um repositório, aplicar alterações localmente e reportar resultados.

Status: fase 2 — scaffold funcional (mock provider) com integração opcional Gemini.

Estrutura
- `src/` — código fonte TypeScript
- `src/providers/` — providers de AI (mock e Gemini)
- `src/orchestrator.ts` — ciclo do agente
- `src/workflow.ts` — executor do workflow (escreve relatório)
- `src/runner.ts` — runner utilitário para execuções isoladas
- `src/state.ts` — armazenamento simples de tasks em `.aca_state/tasks.json`
- `tests/` — testes vitais (vitest)

Quickstart (local)
1. Clone o repositório e instale dependências:

   git clone https://github.com/davibcv/aca.git
   cd aca
   npm ci

2. Run em modo dry-run (não aplica patches):

   export ACA_DRY_RUN=1
   npx ts-node src/index.ts

   # ou build e executar
   npm run build
   ACA_DRY_RUN=1 node dist/index.js

3. Para usar o Gemini provider localmente (não partilhar a chave no chat):

   export ACA_PROVIDER=gemini
   export GEMINI_API="<sua_chave_aqui>"     # nome do secret esperado pelo projeto
   # opcionalmente, se usar endpoint alternativo:
   # export GEMINI_API_URL="https://..."

   export ACA_DRY_RUN=1
   npx ts-node src/index.ts

Secrets e GitHub Actions
- Regista o secret `GEMINI_API` em Settings → Secrets and variables → Actions para que os workflows possam aceder à chave sem expô-la no código.

CI e Workflows
- O repositório inclui um workflow de CI que executa `npm run ci` em pushes e PRs.
- Tem também um workflow manual (`Run ACA workflow`) que permite disparar o agente (por defeito em dry-run). Sempre verifica `dry_run` antes de aplicar alterações num repositório remoto.

Como funciona
- `src/index.ts` é o ponto de entrada canonical: chama `runWorkflow`.
- `runWorkflow` chama `runCycle` (orchestrator) que busca/gera tasks, pede uma `proposal` ao provider e aplica patches com `patcher` (quando houver).
- Propostas são gravadas como relatórios em `.aca_reports/` (um ficheiro JSON por execução).

Contribuição e roadmap
- Integrar provider Gemini com prompts robustos e parsing tolerante.
- Melhorar regras de segurança (validar patches antes de aplicar, testes automatizados, revisão humana opcional).
- Adicionar testes end-to-end e integração com GitHub PR flow.

Licença
- UNLICENSED (ver package.json)
