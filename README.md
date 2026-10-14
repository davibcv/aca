# ACA

Agente de Reparação de Aplicativos (ACA) — núcleo e infraestrutura inicial.

## Objetivo

Este repositório implementa a base operacional do agente de engenharia assistida por IA para:
- receber tarefas de manutenção e desenvolvimento
- avaliar um projeto-alvo
- identificar problemas
- executar verificações determinísticas
- propor correções
- validar mudanças em uma branch isolada
- gerar relatórios e artefatos

## Fase atual

A construção está em fase 2: base executável e integração contínua.

## Estrutura

- `src/` — código do agente e tipos
- `scripts/` — scripts de análise/patch
- `.github/workflows/` — automação
- `docs/` — documentação operacional

## Observações de segurança

- Nunca gravar segredos no código-fonte.
- Usar GitHub Actions Secrets para chaves de API e tokens.
- O agente deve respeitar limites de execução, timeouts, tentativas e branch isolada.
- A execução em repositórios-alvo deve ser controlada e não automática em branch principal.
