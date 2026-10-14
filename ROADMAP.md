# Roteiro incremental (ROADMAP)

Fase 1 — Concepção e estrutura (concluída nesta entrega)
- Critério de conclusão: documentação inicial criada no repositório, decisões pendentes identificadas e plano incremental com critérios objetivos.

Fase 2 — Base executável e integração contínua
- Objetivos:
  - Criar scaffold do projeto em TypeScript (esqueleto npm package).
  - Pipeline GitHub Actions que executa lint, typecheck e testes (sem IA).
- Critérios de aceitação:
  - PR mostrando estrutura inicial e workflow que passa em um repositório de exemplo mínimo.
  - Artefato de log e relatório salvo como artefato do workflow.

Fase 3 — Modelo de tarefas e execução controlada
- Objetivos:
  - Definir esquema de tarefas (JSON/TypeScript types), estados e limites de tentativas.
  - Implementar executor que consome uma tarefa e grava logs.
- Critérios de aceitação:
  - Execução manual de uma tarefa de exemplo que grava histórico e artefatos.

Fase 4 — Integração com IA (uma só por vez)
- Objetivos:
  - Ligar um provedor de IA com limites configuráveis e simular consultas em modo "dry-run".
- Critérios de aceitação:
  - Chaves armazenadas em GitHub Secrets.
  - Logs de consumo e estimativa de custo para uma execução de exemplo.

Fase 5 — Modificação e teste de código
- Objetivos:
  - Agent cria branch, aplica mudanças, executa testes, gera relatório e NÃO faz merge automático.
- Critérios de aceitação:
  - Teste de regressão criado para bug corrigido.
  - Comparação antes/depois de testes automatizados.

Fase 6 — Automação cíclica
- Objetivos:
  - Adicionar agendamento via cron e controles de concorrência.
- Critérios de aceitação:
  - Execução programada que respeita limites e registra execução.

Fase 7 — Integração com Fluent-Roleplay
- Objetivos:
  - Inspecionar repo alvo, criar avaliação inicial e só então propor correções automatizadas.
- Critérios de aceitação:
  - Relatório de avaliação gerado.

Fase 8 — Geração de APK
- Objetivos:
  - Analisar possibilidade e automatizar build de APK em runner apropriado.
- Critérios de aceitação:
  - APK gerado como artefato e instruções para instalação e testes.

Fase 9 — Expansão
- Objetivos:
  - Suporte a múltiplos provedores, revisão independente e melhorias de custo.
