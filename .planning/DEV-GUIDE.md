# Guia do Desenvolvedor

Como entender, estender e manter o EJC Medeiros Doações.

---

## 1. Pré-requisitos

- Node.js 18+
- npm 9+
- Conta Firebase (produção) ou apenas `npm run dev` (API em memória)

---

## 2. Fluxo de boot

1. `index.html` carrega `src/main.ts`.
2. `main.ts` monta header, navegação (**Equipistas | Coordenador**) e dois painéis globais.
3. `initFirebaseGateway()` tenta `/api/runtime-config` ou `VITE_FIREBASE_*`.
4. `hydrateAllFromApi()` sincroniza config + doações para `localStorage`.
5. Componentes leem/escrevem via `store.ts` e opcionalmente `api.ts` / `firebase.ts`.

### Painel do Coordenador (sub-abas)

```
src/components/painel-coordenador/
  painel-coordenador.ts   # shell: login, sub-tabs, roteamento
  sub-doacoes.ts          # stats, filtro, entregas, gráfico, export, recado
  sub-banco.ts            # gate dirigente, CRUD itens/categorias
  sub-dirigente.ts        # wrapper → mountDirigentePanel()
```

Estado interno: `coordSubTab: 'doacoes' | 'banco' | 'dirigente'`.

Autenticação em camadas:

| Ação | Quem autentica |
|------|----------------|
| Doações, export, recado | Sessão **coordenador** |
| Banco de dados | Reauth **dirigente** → token auxiliar + flag `ejc_banco_unlock` |
| Sub-aba Dirigente | Login **dirigente** embarcado (token auxiliar, sessão coord preservada) |
| Reset / travas / senhas | Token dirigente embarcado |

---

## 3. Estrutura de componentes

Cada componente segue o padrão:

```
src/components/nome/
  nome.html   # template estático (?raw import)
  nome.css    # estilos escopados ao componente
  nome.ts     # mount, eventos, render dinâmico
```

### Criar um novo componente

1. Crie a pasta em `src/components/meu-componente/`.
2. Exporte `renderMeuComponente(): HTMLElement` e opcionalmente `refreshMeuComponente()`.
3. Importe em `main.ts` e monte no painel adequado.
4. Use `textContent` / `createElement` para dados dinâmicos (evite `innerHTML` com input do usuário).

---

## 4. Camada de estado

### `store.ts` — localStorage

Funções get/set para etapa, doações, equipes, itens, **categorias** (`ejc_d_cats`), recado, Pix, logo, branding e trava.

Chaves legadas preservadas (`ejc_doacoes_etapa1`, `ejc_d_itens`, `ejc_d_cats`, etc.).

### `api.ts` — cliente HTTP

| Função | Uso |
|--------|-----|
| `fetchDoacoesApi` | GET doações |
| `createDoacaoApi` | POST doação pública |
| `updateEntregaApi` | PUT entrega (requer sessão admin) |
| `updateConfigApi` | PUT config (requer sessão dirigente) |
| `adminActionApi` | reset, lock, troca senha |
| `hydrateAllFromApi` | bootstrap inicial |

Headers admin: `adminAuthHeaders()` de `utils/auth.ts`.

### `firebase.ts` — gateway direto

Usado como **fallback** quando a API falha ou em dev sem backend Firebase:

- `syncDoacoesEtapa`
- `syncConfigValue`

Preferir sempre a API em produção.

---

## 5. Utilitários

| Arquivo | Responsabilidade |
|---------|------------------|
| `validation.ts` | Regras por campo (nome, equipe, telefone, quantidade) |
| `security.ts` | Sanitização, máscara telefone, CSRF client |
| `auth.ts` | Login, sessão, headers admin |
| `export.ts` | CSV com escape anti–formula injection |
| `login-gate.ts` | UI de login reutilizável |
| `accessibility.ts` | trapFocus, announceLive |
| `web-vitals.ts` | CLS, LCP, INP no console |

---

## 6. API serverless (`api/`)

| Arquivo | Rota |
|---------|------|
| `health.js` | GET `/api/health` |
| `runtime-config.js` | GET `/api/runtime-config` |
| `auth/status.js` | GET `/api/auth/status` |
| `auth/challenge.js` | GET `/api/auth/challenge` |
| `auth/initial-setup.js` | POST `/api/auth/initial-setup` |
| `auth.js` | POST `/api/auth` (login) |
| `password.js` | Lógica PBKDF2, challenge, setup (shared) |
| `auth-store.js` | Leitura/escrita do nó `auth/` no Firebase |
| `doacoes.js` | GET/POST/PUT `/api/doacoes` |
| `config.js` | GET/PUT `/api/config` |
| `admin.js` | POST `/api/admin` |
| `_firebase.js` | Helpers compartilhados |

Contrato completo: [API-SPEC.md](./API-SPEC.md).

### Dev local

`vite.config.ts` emula as mesmas rotas em memória (`__ejcApiState`).

---

## 7. Autenticação

### Boot (`src/main.ts`)

1. `fetchAuthSetupStatus()` → `GET /api/auth/status`
2. Se `initialSetupComplete === false` → `mountInitialSetup()` (`src/components/auth-setup/initial-setup.ts`) bloqueia o app
3. Após setup → `bootMain()` monta header, formulário e painéis

### Setup inicial (uma vez por ambiente)

- UI: token `AUTH_SETUP_TOKEN` + senhas Coordenador/Dirigente (mín. 8 chars)
- `hashForStorage()` em `src/utils/password-auth.ts` deriva PBKDF2 no browser
- `initialSetupApi()` → `POST /api/auth/initial-setup` com `{ coordHash, dirHash }` + header `x-setup-token`
- Backend (`api/password.js`) grava em `auth/`, remove `senha_*` legados de `config/`

### Login (challenge-response)

1. `fetchAuthChallenge(role)` → `GET /api/auth/challenge?role=...`
2. `buildLoginProof(password, challenge)` → PBKDF2 + HMAC → `{ proof, nonce }`
3. `POST /api/auth` com `{ role, proof, nonce }` — senha **nunca** no body
4. Token salvo em `sessionStorage` (`ejc_admin_session`)
5. Mutações admin enviam `x-admin-session` via `adminAuthHeaders()` (`src/utils/auth.ts`)

### Sessões em camadas

| Contexto | Token / flag |
|----------|----------------|
| Coordenador logado | `ejc_admin_session` |
| Banco desbloqueado | `ejc_banco_dir_token` + `ejc_banco_unlock` |
| Dirigente embarcado | `ejc_embedded_dir_token` |

Logout coordenador limpa também `ejc_banco_unlock` e sessão embarcada do dirigente.

### Troca rotineira de senha

- Accordion **Senhas e segurança** (`src/components/painel-dirigente/sections/sec-senhas.ts`)
- Requer sessão dirigente → `changePasswordApi()` com `passwordHash` only

**Coordenador** pode marcar entregas, editar recado e exportar.  
**Dirigente** (sub-aba ou desbloqueio do banco) altera config e ações em `/api/admin`.

Arquivos-chave: `src/utils/password-auth.ts`, `src/utils/login-gate.ts`, `api/password.js`, `api/auth-store.js`.

---

## 8. Estilos e a11y

- Tokens: `src/styles/variables.css`
- Global: `src/styles/global.css`
- A11y: `src/styles/a11y.css` (skip link, focus-visible, sr-only, reduced motion)

Use classes utilitárias existentes antes de criar novas.

---

## 9. TypeScript

- Strict mode em `tsconfig.json`
- Tipos centrais: `src/state/types.ts`
- Após alterações: `npm run typecheck`

---

## 10. Qualidade de código

```bash
npm run lint      # Biome lint
npm run format    # Biome format
npm run check     # typecheck + biome check (pre-commit)
```

Husky executa `npm run check` em cada commit.

---

## 10b. Testes automatizados

```bash
npm run test        # unitários (Vitest)
npm run test:watch  # unitários em watch
npm run test:e2e    # E2E (Playwright)
npm run test:all    # check + unitários + E2E
```

### Estrutura

```
tests/
  unit/                 # Vitest + jsdom (vitest.config.ts)
    setup.ts            # shim de WebCrypto para jsdom
    validation.test.ts  # regras de campo (nome, equipe, telefone, quantidade)
    security.test.ts    # sanitização, formatPhoneBr, CSRF client
    export.test.ts      # CSV: cabeçalho, anti-formula-injection, backup
    store.test.ts       # etapa pública, totais, meta restante, filtro de itens
  e2e/                  # Playwright (playwright.config.ts)
    _mock-api.ts        # intercepta /api/* — determinístico, sem Firebase
    doacao.spec.ts      # fluxo público de doação + validação de campos
    navegacao.spec.ts   # abas Equipistas/Coordenador + gate de login
```

### Convenções

- **Unitários:** alvo são funções puras / com `localStorage`/`sessionStorage`. Para utilitários que dependem de DOM (ex.: `export.ts` gera `Blob`), os testes interceptam `URL.createObjectURL`/`Blob`.
- **E2E:** todas as rotas `/api/*` são mockadas via `page.route` (`tests/e2e/_mock-api.ts`), então os testes não tocam o Firebase. O Playwright sobe o próprio `vite` na porta 4318 (ver `playwright.config.ts`).
- Pré-requisito do E2E na primeira execução: `npx playwright install chromium`.

---

## 11. Extensões comuns

### Adicionar campo na doação

1. Atualize `Doacao` em `types.ts`.
2. Valide em `validation.ts` e `api/doacoes.js`.
3. Ajuste formulário em `form-doacao.*`.
4. Renderize no painel coordenador.

### Adicionar config global

1. Campo em `store.ts` + `applyAppConfig`.
2. GET/PUT em `api/config.js` + `vite.config.ts` (dev).
3. UI no painel dirigente.
4. Exibição pública se aplicável (form ou header).

### Novo endpoint

1. Crie `api/novo.js` (handler Vercel).
2. Espelhe rota em `vite.config.ts`.
3. Cliente em `state/api.ts`.
4. Documente em `API-SPEC.md`.

---

## 12. Testes manuais sugeridos

- [ ] Setup inicial (se `initialSetupComplete === false`): token + senhas, app carrega após conclusão
- [ ] Registrar doação na etapa 1 e 2
- [ ] Login coordenador → sub-aba Doações: filtrar, stats, marcar entrega, recado, export CSV + backup 3 seções
- [ ] Sub-aba Banco: desbloquear com senha dirigente → CRUD item/categoria, meta, visível/oculto
- [ ] Sub-aba Dirigente: travas, Pix/logo (drag-drop), equipes 1ª e 2ª etapa, reset, troca de senha
- [ ] Network tab: login e troca de senha sem campo `password` literal
- [ ] Tentar registrar doação com etapa travada (deve bloquear)
- [ ] Logout coord e verificar painéis protegidos

---

## 13. Onde buscar ajuda

- Deploy: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Segurança: [SECURITY.md](./SECURITY.md)
- Decisões de arquitetura: [LESSONS-LEARNED.md](./LESSONS-LEARNED.md)
