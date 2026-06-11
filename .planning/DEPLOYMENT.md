# Guia de Deploy

Deploy recomendado: **Vercel** (frontend + API) + **Firebase Realtime Database** (dados).

---

## 1. Pré-requisitos

- Repositório no GitHub (ou GitLab/Bitbucket conectado à Vercel)
- Projeto Firebase com **Realtime Database** habilitado
- Domínio opcional (ex.: `ejc-medeiros-doacoes.vercel.app`)

---

## 2. Firebase — configuração

### 2.1 Criar / usar projeto

1. [Firebase Console](https://console.firebase.google.com/)
2. Ative **Realtime Database** (modo produção ou teste inicial)
3. Anote `databaseURL` e credenciais do app web

### 2.2 Regras de segurança

Publique o conteúdo de `database.rules.json` na aba **Regras** do Realtime Database:

- Leitura pública em `doacoes/*` e `config/*` (somente leitura)
- **`auth/` bloqueado** (read/write false) — hashes PBKDF2 das senhas administrativas
- **Escrita bloqueada no client** — mutações via API server-side

```bash
# Alternativa via CLI (se firebase-tools instalado)
firebase deploy --only database
```

### 2.3 Secret server-side

Gere um **Database secret** ou use service account com permissão de escrita REST:

- Variável: `FIREBASE_DATABASE_SECRET`
- Usada apenas nas Vercel Functions (`api/_firebase.js`)

> Nunca commite secrets. Use apenas variáveis de ambiente.

---

## 3. Vercel — variáveis de ambiente

Configure em **Project Settings → Environment Variables**:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `FIREBASE_API_KEY` | Sim | Config web Firebase |
| `FIREBASE_AUTH_DOMAIN` | Sim | `projeto.firebaseapp.com` |
| `FIREBASE_DATABASE_URL` | Sim | URL do Realtime DB |
| `FIREBASE_PROJECT_ID` | Sim | ID do projeto |
| `FIREBASE_STORAGE_BUCKET` | Sim | Bucket padrão |
| `FIREBASE_MESSAGING_SENDER_ID` | Sim | Sender ID |
| `FIREBASE_APP_ID` | Sim | App ID |
| `FIREBASE_DATABASE_SECRET` | Sim (prod) | Auth REST server-side |
| `ADMIN_API_TOKEN` | Sim | Token fixo para mutações admin |
| `SESSION_SECRET` | Recomendado | Assinatura de sessão (`x-admin-session`) |
| `AUTH_SETUP_TOKEN` | Sim (até setup) | Token de uso único para setup inicial de senhas |

Referência local: `.env.example`

> **Importante:** `AUTH_SETUP_TOKEN` deve ser uma string longa e aleatória, distinta de `ADMIN_API_TOKEN`. Guarde em local seguro — só quem possui esse token consegue definir as senhas iniciais. Pode ser removido da Vercel após o setup concluído.

### Produção vs Preview

Defina as mesmas variáveis para **Production** e **Preview** (deploys de branch usam Preview).

---

## 4. Vercel — deploy

### Via Git (recomendado)

1. Conecte o repositório à Vercel
2. **Framework Preset:** Vite
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Deploy automático a cada push na branch principal

### Via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Rewrites

`vercel.json` já configura:

- `/api/*` → Functions em `api/`
- `/*` → `index.html` (SPA)

---

## 5. Pós-deploy

### 5.1 Setup inicial de senhas (obrigatório no primeiro deploy)

Não existem mais senhas padrão embutidas no código. Após o deploy, o app exibe a tela **"Configuração inicial de senhas"** até que o setup seja concluído.

**Pré-requisitos:**

- `AUTH_SETUP_TOKEN` configurado na Vercel (Preview e/ou Production)
- `FIREBASE_DATABASE_SECRET` ativo (escrita no nó `auth/`)
- `database.rules.json` publicado (nó `auth/` bloqueado no client)

**Fluxo (UI):**

1. Abrir o app → tela de setup inicial (não o app normal)
2. Informar o `AUTH_SETUP_TOKEN`
3. Definir senha do **Coordenador** e do **Dirigente** (mín. 8 caracteres, confirmar ambas)
4. O browser deriva hashes PBKDF2-SHA256 (210k iterações) e envia apenas `coordHash` / `dirHash` — **a senha literal nunca trafega na rede**
5. Após sucesso, o app carrega normalmente

**Verificação:**

```bash
# Deve retornar initialSetupComplete: true
curl https://SEU-DOMINIO/api/auth/status

# Segunda tentativa de setup deve retornar 410
curl -X POST https://SEU-DOMINIO/api/auth/initial-setup \
  -H "Content-Type: application/json" \
  -H "x-setup-token: SEU_TOKEN" \
  -d '{"coordHash":"...","dirHash":"..."}'
```

**Alternativa via API (sem UI):** ver [API-SPEC.md](./API-SPEC.md#post-apiauthinitial-setup-uso-único).

**Pós-setup (recomendado):**

1. Remover `AUTH_SETUP_TOKEN` da Vercel (opcional — endpoint fica inutilizável sem o token)
2. Confirmar no Firebase Console: nó `auth/` com hashes; `config/` **sem** `senha_coord` / `senha_dir`
3. Entregar senhas às equipes responsáveis (Coordenador → casal; Dirigente → liderança)

### 5.2 Migração do sistema antigo

Se produção já tinha `config/senha_coord` / `config/senha_dir` (texto plano do legado), elas **não são lidas** pelo novo login. O app exibirá a tela de setup até `auth/meta.initialSetupComplete === true`. O setup inicial remove automaticamente os campos legados de `config/`.

### 5.3 Troca rotineira de senhas

Após o setup, o **Dirigente** troca senhas pelo painel → accordion **Senhas e segurança** (`POST /api/admin` action `change_password`). Apenas `passwordHash` é enviado — mesma política de não trafegar senha literal.

### 5.4 Publicar rules Firebase

Confirme que as rules foram aplicadas:

- Client **não** consegue `.write` direto no DB
- Nó `auth/` ilegível no browser

### 5.5 Smoke test

- [ ] `GET /api/health` retorna `{ ok: true }`
- [ ] `GET /api/runtime-config` retorna firebase config (sem erro 500)
- [ ] `GET /api/auth/status` → `initialSetupComplete: true` (após setup)
- [ ] Formulário público registra doação
- [ ] Login coordenador funciona (Network: body com `proof` + `nonce`, sem `password`)
- [ ] Login dirigente funciona
- [ ] Troca de senha no painel Dirigente funciona

Checklist completo: [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)

---

## 6. Desenvolvimento local

```bash
cp .env.example .env
npm install
npm run dev
```

### Conectado ao Firebase de producao (recomendado para testes reais)

Preencha no `.env` as **mesmas variaveis da Vercel**:

```
FIREBASE_DATABASE_URL=https://SEU-PROJETO.firebaseio.com
FIREBASE_DATABASE_SECRET=seu-secret-aqui
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
ADMIN_API_TOKEN=...
SESSION_SECRET=...
AUTH_SETUP_TOKEN=...
```

Com `FIREBASE_DATABASE_URL` definido, a API local (`/api/*`) passa a **ler e gravar no banco real** — o mesmo usado em producao. A barra de status do app exibira: *"Desenvolvimento conectado ao Firebase de producao"*.

`FIREBASE_DATABASE_SECRET` e **obrigatorio para escrita** (mutacoes via REST autenticado). Sem ele, apenas leituras funcionam.

As variaveis `VITE_FIREBASE_*` sao opcionais; se omitidas, `/api/runtime-config` reutiliza `FIREBASE_*` para o SDK no browser.

> **Atencao:** testes locais alteram dados reais. Evite reset de doacoes em producao durante testes.

**Setup local:** se `auth/meta.initialSetupComplete` ainda for `false` no Firebase, o app exibe a mesma tela de setup inicial. Defina `AUTH_SETUP_TOKEN` no `.env` para concluir o setup localmente.

### Sem Firebase (memoria local)

Se `FIREBASE_DATABASE_URL` nao estiver no `.env`, a API usa memoria volatil — dados somem ao reiniciar `npm run dev`:

- Tela de setup inicial na primeira execucao (requer `AUTH_SETUP_TOKEN` no `.env`)
- Apos setup, login via challenge-response (mesmo fluxo de producao)
- Dados resetam ao reiniciar o servidor

---

## 7. Domínio customizado

1. Vercel → Settings → Domains
2. Adicione o domínio e configure DNS
3. Atualize `canonical` e `og:url` em `index.html` se necessário

---

## 8. Rollback

- Vercel → Deployments → selecione deploy anterior → **Promote to Production**
- Dados Firebase não são revertidos automaticamente — faça backup CSV antes de resets

---

## 9. Monitoramento

- **Web Vitals:** console do browser (`[web-vitals]` logs)
- **Vercel:** Analytics / Logs das Functions
- **Firebase:** Usage tab do Realtime Database

---

## 10. Troubleshooting

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| 500 em `/api/runtime-config` | ENV Firebase incompleta | Preencher todas `FIREBASE_*` |
| Tela de setup não sai | Setup não concluído | Concluir setup com `AUTH_SETUP_TOKEN`; verificar `GET /api/auth/status` |
| `invalid_setup_token` | Token incorreto ou ausente | Conferir `AUTH_SETUP_TOKEN` na Vercel / `.env` |
| Login retorna `setup_required` | Setup pendente | Concluir setup inicial antes de logar |
| Login admin falha após setup | Senha incorreta ou nonce expirado | Tentar novamente (nonce TTL ~60s); verificar hash em `auth/senha_*` |
| Doação não sincroniza | Rules ou secret | Verificar rules + `FIREBASE_DATABASE_SECRET` |
| Painel vazio após deploy | Hydrate falhou | Checar Network tab em `/api/config` e `/api/doacoes` |
| Pre-commit falha | Lint/typecheck | `npm run check` e corrigir |

---

## 11. Referências

- [API-SPEC.md](./API-SPEC.md)
- [SECURITY.md](./SECURITY.md)
- [DEV-GUIDE.md](./DEV-GUIDE.md)
