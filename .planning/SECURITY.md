# SECURITY

Data: 2026-06-08  
Escopo: medidas de seguranca aplicadas entre Fases 1-4.

## Autenticacao administrativa

- Login server-side em `POST /api/auth` com verificacao de senha no backend.
- Sessao administrativa via header `x-admin-session` (HMAC com `ADMIN_API_TOKEN` ou `SESSION_SECRET`).
- Rotas sensiveis (`PUT /api/doacoes`, `PUT /api/config`, `POST /api/admin`) exigem sessao ou `x-admin-token`.
- Senhas padrao existem apenas no backend (`api/auth.js`), nao no bundle frontend.

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
| A02 Cryptographic Failures | Parcial | Sem senhas no client; rotacionar secrets em producao |
| A03 Injection | Parcial | Sanitizacao + CSV escape + validacao |
| A04 Insecure Design | Parcial | Separacao publico/admin + API gateway |
| A05 Security Misconfiguration | Parcial | Headers, env obrigatoria, rules documentadas |
| A06 Vulnerable Components | Em monitoramento | `npm audit` no pipeline |
| A07 Auth Failures | Parcial | Login backend + rate limit |
| A08 Software/Data Integrity | Parcial | Sem scripts de terceiros no bundle principal |
| A09 Logging Failures | Pendente | Adicionar observabilidade server-side futura |
| A10 SSRF | N/A | Sem fetch arbitrario server-side para URLs externas |

## Pendencias operacionais

1. Publicar `database.rules.json` no Firebase Console.
2. Configurar `FIREBASE_*`, `ADMIN_API_TOKEN` e `SESSION_SECRET` na Vercel.
3. Rotacionar senhas padrao apos primeiro deploy seguro.
4. Considerar hash de senhas (bcrypt/argon2) em migracao futura.
