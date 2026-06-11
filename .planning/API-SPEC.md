# API SPEC

## Base
- Vercel Functions em `/api/*`
- Dev local: middleware equivalente em `api/dev-server.cjs` (via Vite plugin)

## Autenticação — visão geral

```
[Primeiro deploy]
  GET /api/auth/status → initialSetupComplete: false
  UI setup → POST /api/auth/initial-setup (x-setup-token + coordHash + dirHash)
  GET /api/auth/status → initialSetupComplete: true

[Login rotineiro]
  GET /api/auth/challenge?role=...
  Browser: PBKDF2(senha, salt) → HMAC(chave, nonce) = proof
  POST /api/auth { role, proof, nonce } → { token, expiresAt }

[Troca de senha]
  POST /api/admin { action: change_password, password_role, passwordHash }
  (requer sessão dirigente)
```

Senha literal **nunca** aparece em requests de rede. Ver [SECURITY.md](./SECURITY.md).

## Endpoints

### `GET /api/health`
- Retorna saúde básica da API.

### `GET /api/runtime-config`
- Injeta config Firebase para o frontend via variáveis de ambiente.

### `GET /api/auth/status`
- Estado do setup de senhas.
- Response: `{ initialSetupComplete, coordConfigured, dirConfigured, coordUpdatedAt?, dirUpdatedAt?, iterations, algo, salts? }`
- `salts` só quando `initialSetupComplete === false`.

### `GET /api/auth/challenge?role=coordenador|dirigente`
- Emite nonce de uso único (TTL ~60s) + salt PBKDF2 da role.
- Response: `{ nonce, salt, iterations, algo, expiresAt }`

### `POST /api/auth/initial-setup` (uso único)
- Header: `x-setup-token` = env `AUTH_SETUP_TOKEN`
- Body: `{ "coordHash": "...", "dirHash": "..." }` — derivados PBKDF2-SHA256 (base64url, 210k iterações), **sem senha literal**
- Pré-condição: `auth/meta.initialSetupComplete !== true`
- Sucesso: grava hashes em `auth/senha_coord` e `auth/senha_dir`, marca `initialSetupComplete: true`, remove `senha_*` legados de `config/`
- Pós-setup: retorna **410** `setup_already_completed`
- Erros: `401 invalid_setup_token`, `400 invalid_password_hash`

### `POST /api/auth`
- Login com prova criptográfica (challenge-response).
- Body: `{ "role": "coordenador"|"dirigente", "proof": "...", "nonce": "..." }`
- Response: `{ token, expiresAt }`
- Requer setup inicial concluído (`503 setup_required` se pendente)
- Nonce de uso único, TTL ~60s (`401` se expirado ou inválido)
- Senha **nunca** trafega na rede

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
- `change_password`: body `{ "action": "change_password", "password_role": "coordenador"|"dirigente", "passwordHash": "..." }`

## Variáveis obrigatórias
- `FIREBASE_DATABASE_URL`
- `FIREBASE_DATABASE_SECRET` (recomendado para ambiente server)
- `ADMIN_API_TOKEN` (recomendado para proteger mutações sensíveis)
- `SESSION_SECRET` (fallback de assinatura de sessão)
- `AUTH_SETUP_TOKEN` (setup inicial único de senhas; pode remover após concluir)

## Segurança
- Sanitização básica de texto no backend.
- Validação de payloads essenciais.
- Rate limiting em login e mutações.
- Security headers em todas as respostas de API.
- Regras Firebase recomendadas em `database.rules.json`.
