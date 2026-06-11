# SECURITY

Data: 2026-06-09  
Escopo: medidas de seguranca aplicadas entre Fases 1-4 + refatoracao de auth (jun/2026).

## Autenticacao administrativa

### Modelo de dados

Hashes PBKDF2-SHA256 (210k iteracoes) armazenados em Firebase:

```
auth/
  senha_coord  → { hash, updatedAt }
  senha_dir    → { hash, updatedAt }
  salts        → { coord, dir }      # por role, gerados no primeiro uso
  meta         → { version, algo, iterations, initialSetupComplete, completedAt? }
```

- Nó `auth/` com **read/write false** no client (`database.rules.json`).
- Campos legados `config/senha_coord` / `config/senha_dir` removidos no setup inicial.

### Fluxo de setup (uso único)

1. `GET /api/auth/status` — se `initialSetupComplete === false`, app bloqueia e exibe tela de setup.
2. Operador informa `AUTH_SETUP_TOKEN` + senhas Coordenador e Dirigente.
3. Browser deriva hashes PBKDF2 com salts do servidor → `POST /api/auth/initial-setup` com `{ coordHash, dirHash }` e header `x-setup-token`.
4. Servidor grava hashes em `auth/`, marca `initialSetupComplete: true`, limpa `senha_*` de `config/`.
5. Tentativas posteriores retornam **410** `setup_already_completed`.

### Fluxo de login (challenge-response)

1. `GET /api/auth/challenge?role=coordenador|dirigente` → nonce (TTL ~60s) + salt + iterations.
2. Browser: PBKDF2(senha, salt) → chave derivada → HMAC-SHA256(chave, nonce) = `proof`.
3. `POST /api/auth` com `{ role, proof, nonce }` — **senha literal nunca trafega**.
4. Servidor valida proof contra hash armazenado, emite sessao `{ token, expiresAt }`.
5. Cliente armazena token em `sessionStorage` (`ejc_admin_session`); mutacoes enviam `x-admin-session`.

### Troca rotineira de senha

- Painel Dirigente → accordion **Senhas e segurança**.
- `POST /api/admin` action `change_password` com `{ password_role, passwordHash }` (sessao dirigente).
- Mesma derivacao PBKDF2 no browser; apenas hash enviado.

### Sessao e rotas protegidas

- Sessao administrativa via header `x-admin-session` (HMAC com `ADMIN_API_TOKEN` ou `SESSION_SECRET`).
- Rotas sensiveis (`PUT /api/doacoes`, `PUT /api/config`, `POST /api/admin`) exigem sessao ou `x-admin-token`.
- Tokens auxiliares para reauth embarcada (banco/dirigente sem derrubar sessao coordenador): `ejc_banco_dir_token`, `ejc_embedded_dir_token`.

## Validacao e sanitizacao

- Sanitizacao de texto no frontend (`src/utils/security.ts`) e backend (`api/_firebase.js`).
- Validacao por campo (`src/utils/validation.ts`) e validacao de payload nas APIs.
- Exportacao CSV com mitigacao de formula injection (`src/utils/export.ts`).

## Protecoes de API

- Rate limiting em login, mutacoes de doacao, config e admin.
- Security headers (`nosniff`, `DENY` frame, `Referrer-Policy`, `Cache-Control`, CSP basico).
- CSRF de sessao no formulario publico (token em `sessionStorage`).

## Firebase

- Config runtime via `/api/runtime-config` (sem hardcode no frontend).
- Escrita no Realtime Database preferencialmente via Vercel Functions com secret server-side.
- Regras recomendadas em `database.rules.json` (leitura publica controlada, escrita bloqueada no client).

## OWASP Top 10 (checklist resumido)

| Risco | Status | Mitigacao |
|------|--------|-----------|
| A01 Broken Access Control | Parcial | Auth server-side + sessao admin + rules Firebase |
| A02 Cryptographic Failures | Mitigado (parcial) | PBKDF2 210k + proof/nonce; senha nunca na rede; HTTPS obrigatorio |
| A03 Injection | Parcial | Sanitizacao + CSV escape + validacao |
| A04 Insecure Design | Parcial | Separacao publico/admin + API gateway |
| A05 Security Misconfiguration | Parcial | Headers, env obrigatoria, rules documentadas |
| A06 Vulnerable Components | Em monitoramento | `npm audit` no pipeline |
| A07 Auth Failures | Mitigado (parcial) | Challenge-response + setup token + rate limit + hashes em nó bloqueado |
| A08 Software/Data Integrity | Parcial | Sem scripts de terceiros no bundle principal |
| A09 Logging Failures | Pendente | Adicionar observabilidade server-side futura |
| A10 SSRF | N/A | Sem fetch arbitrario server-side para URLs externas |

## Pendencias operacionais

1. Publicar `database.rules.json` no Firebase Console (incluir bloco `auth` read/write false).
2. Configurar `FIREBASE_*`, `ADMIN_API_TOKEN`, `SESSION_SECRET` e `AUTH_SETUP_TOKEN` na Vercel (Preview + Production).
3. Executar setup inicial uma vez por ambiente (`/api/auth/status` → formulario ou POST manual).
4. Remover `AUTH_SETUP_TOKEN` da Vercel após setup concluido (opcional).
