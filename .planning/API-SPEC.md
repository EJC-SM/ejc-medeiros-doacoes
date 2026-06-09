# API SPEC

## Base
- Vercel Functions em `/api/*`
- Dev local: middleware equivalente em `vite.config.ts`

## Endpoints

### `GET /api/health`
- Retorna saúde básica da API.

### `GET /api/runtime-config`
- Injeta config Firebase para o frontend via variáveis de ambiente.

### `POST /api/auth`
- Autentica coordenador ou dirigente.
- Body: `{ "role": "coordenador"|"dirigente", "password": "..." }`
- Response: `{ token, expiresAt }`

### `GET /api/doacoes?etapa=1|2`
- Lista doações da etapa.
- Response: `{ etapa, data: Doacao[] }`

### `POST /api/doacoes`
- Cria doação (público).
- Body:
```json
{
  "etapa": 1,
  "nome": "Joao",
  "equipe": "Apoio",
  "telefone": "(19) 99999-9999",
  "itens": [{"nome":"Arroz","unidade":"kg","quantidade":2}]
}
```

### `PUT /api/doacoes`
- Atualiza entrega de uma doação (requer sessão admin ou `x-admin-token`).
- Header: `x-admin-session` ou `x-admin-token`
- Body para marcar:
```json
{
  "etapa": 1,
  "id": 1717880000000,
  "entregue": {"data":"08/06/2026", "ocasiao":"Reunião"}
}
```

### `GET /api/config?etapa=1|2`
- Lê configuração relevante para etapa (itens, equipes, recado, branding, pix, lock).

### `PUT /api/config`
- Atualiza configuração (requer sessão de **dirigente** ou `x-admin-token`).
- Campos suportados: `itens`, `equipes`, `recado`, `nome_evento`, `versiculo`, `versiculo_ref`, `pix_chave`, `pix_qr`, `logo`, `etapa_locked`.

### `POST /api/admin`
- Ações administrativas (requer sessão de **dirigente** ou `x-admin-token`).
- Ações: `reset_doacoes`, `reset_itens`, `lock_etapa`, `change_password`.

## Variáveis obrigatórias
- `FIREBASE_DATABASE_URL`
- `FIREBASE_DATABASE_SECRET` (recomendado para ambiente server)
- `ADMIN_API_TOKEN` (recomendado para proteger mutações sensíveis)
- `SESSION_SECRET` (fallback de assinatura de sessão)

## Segurança
- Sanitização básica de texto no backend.
- Validação de payloads essenciais.
- Rate limiting em login e mutações.
- Security headers em todas as respostas de API.
- Regras Firebase recomendadas em `database.rules.json`.
