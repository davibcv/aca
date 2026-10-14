# Requisitos e práticas de segurança iniciais

Princípios

- Princípio do menor privilégio: o agente só recebe permissões estritamente necessárias.
- Segredos jamais em texto ou em logs; usar GitHub Secrets.
- Tratar o código do projeto-alvo como não confiável; limitar execução de scripts e validar a origem dos conteúdos.
- Auditar e armazenar logs e artefatos de cada execução.

Recomendações práticas

- Use GitHub Actions com secrets para armazenar chaves de API.
- Não conceda ao agente permissões de escrita na branch estável sem revisão humana.
- Configure timeouts e limites de tentativa por tarefa (ex.: 3 tentativas, 30 minutos cada por execução padrão).
- Faça análise de dependências para identificar pacotes com sinais de compromisso antes de instalar.

Checklist inicial de segurança

- [ ] Verificar e limitar secrets disponíveis ao workflow.
- [ ] Adotar análise estática de dependências antes da execução.
- [ ] Garantir que artefatos e relatórios não contenham segredos.

