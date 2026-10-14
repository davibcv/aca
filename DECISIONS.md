# Decisões e questões pendentes (ADR)

Decisões já tomadas (provisórias)

1. Linguagem inicial: TypeScript/Node.js — justificativa: compatibilidade com Fluent-Roleplay.
2. Executor inicial: GitHub Actions — justificativa: infraestrutura pronta e integração nativa com repositórios.
3. Armazenamento inicial: arquivos JSON/SQLite — justificação: simplicidade e auditabilidade.

Questões que precisam de decisão antes da implementação

- Provedor de IA inicial: OpenAI, outro API comercial, ou LLM local? Precisamos avaliar custos, latência e políticas de uso.
- Política de execução: quais permissões o agente terá para criar branches, push e abrir PRs?
- Ambiente de execução para builds complexos (ex.: gerar APK): usar runners self-hosted ou serviços gerenciados?
- Estratégia de testes: quais testes automatizados são solicitados para o Fluent-Roleplay (unitários, integração, e2e)?

Notas de segurança

- O agente não terá permissões de merge automático.
- Credenciais e secrets só via GitHub Secrets.

Como decidir

Para cada questão pendente, proponho criar uma pequena avaliação (1–2 dias de trabalho) que liste opções, custos e riscos, e então escolher a alternativa com menor custo operacional e maior segurança.
