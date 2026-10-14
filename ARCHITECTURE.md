# Proposta de arquitetura — Agente de Reparação de Aplicativos (ACA)

Resumo mínimo viável

- Repositório do agente separado dos repositórios dos projetos-alvo.
- Implementação inicial em TypeScript (Node.js) para compatibilidade com o ecossistema do Fluent-Roleplay.
- Componentes principais:
  - API/CLI de controle: recebe tarefas e expõe status.
  - Orquestrador: coordena a execução de um ciclo (fetch repo, avaliação, alteração, verificação, relatório).
  - Executor isolado: executa comandos do projeto-alvo em ambiente controlado (GitHub Actions runners primeiro; no futuro, containers locais ou runners dedicados).
  - Analisador estático: integra lint, TypeScript, testes unitários e análise de dependências.
  - Integrador IA (opcional inicialmente): gera propostas de mudança quando necessário.
  - Registro (state store): guarda histórico de tarefas, tentativas e artefatos. Inicialmente um arquivo JSON por tarefa ou SQLite; posteriormente migrável para banco gerenciado.
  - Gerador de relatórios e artefatos: armazena resultados como artefatos do GitHub Actions e cria commits/branches com diffs.

Motivações das escolhas

- TypeScript/Node.js: compatibilidade com o ecossistema existente do Fluent-Roleplay e facilidade de executar em GitHub Actions (ambiente já preparado e barato).
- GitHub Actions como executor inicial: evita necessidade de infraestrutura nova, permite armazenamento de artefatos e uso de secrets; custo controlável (usar minutos gratuitos cuidadosamente).
- Armazenamento inicial local (JSON/SQLite): simplicidade e rastreabilidade no repositório; migrável no futuro.

Alternativas

- Linguagem: Python (mais pacotes ML/IA), mas aumenta a discrepância com o projeto-alvo e dependências; avaliar se vantagens superam o custo.
- Executor: runners dedicados ou infra de containers (mais seguro e controlável) mas com custo adicional.
- IA: OpenAI, Anthropic, local LLMs (llama.cpp, GPT4all). Priorizar provedor com camadas gratuitas e política clara para produção.

Segurança e isolamento

- Nunca armazenar segredos no repositório; usar GitHub Actions Secrets.
- Executar comandos do projeto-alvo em runners controlados e limitar tempo/calls.
- Tratar o código do projeto-alvo como não confiável; validar scripts antes de executar.

Escalabilidade

- Projeto modular que permite adicionar mais provedores de IA, mecanismos de revisão, e persistência escalável.

Observações abertas

- Escolha do provedor de IA e limite de uso (orçamento/quotas).
- Estratégia de rollback e política de merges (o agente não deve mergear automaticamente).
