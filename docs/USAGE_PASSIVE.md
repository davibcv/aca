# Uso do modo passivo

Este projeto inclui um workflow passivo para verificar periodicamente o estado do repositório e executar uma análise leve.

## Como ativar

1. Vá para a aba "Actions" no GitHub.
2. Selecione o workflow "Passive Operate".
3. Clique em "Run workflow".
4. Escolha a branch `feature/phase-2` e confirme.

## O que o workflow faz

- faz checkout do código;
- instala dependências com npm;
- executa o script:
  `node scripts/run_analysis_and_patch.js`

## Script de apoio

O script `scripts/run_analysis_and_patch.js` deve ser expandido no futuro para:
- inspecionar o estado do repositório;
- identificar ficheiros alterados;
- sugerir patches ou ações;
- registrar logs locais para monitorização.

## Observações

Este modo é uma base de scaffold para a Fase 2. A lógica final de análise e correção deve ser evoluída conforme o fluxo real do agente.
