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
| `ADMIN_API_TOKEN` | Recomendado | Token fixo para mutações admin |
| `SESSION_SECRET` | Recomendado | Assinatura de sessão (fallback) |

Referência local: `.env.example`

### Produção vs Preview

Defina as mesmas variáveis para **Production** e, se usar previews, para **Preview** também.

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

### Senhas iniciais

Senhas padrão (existem **apenas no backend** até serem alteradas no Firebase):

| Papel | Senha padrão |
|-------|----------------|
| Coordenador | `ejcdoacoes2025` |
| Dirigente | `Senh@ejc123!*` |

**Ações imediatas após primeiro deploy:**

1. Login como **Dirigente**
2. Trocar senha do Coordenador e do Dirigente
3. Confirmar Pix, itens e equipes
4. Testar registro público de doação

### Publicar rules Firebase

Confirme que as rules foram aplicadas (client não deve conseguir `.write` direto).

### Smoke test

- [ ] `GET /api/health` retorna `{ ok: true }`
- [ ] `GET /api/runtime-config` retorna firebase config (sem erro 500)
- [ ] Formulário público registra doação
- [ ] Login coordenador funciona
- [ ] Login dirigente funciona

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
```

Com `FIREBASE_DATABASE_URL` definido, a API local (`/api/*`) passa a **ler e gravar no banco real** — o mesmo usado em producao. A barra de status do app exibira: *"Desenvolvimento conectado ao Firebase de producao"*.

`FIREBASE_DATABASE_SECRET` e **obrigatorio para escrita** (mutacoes via REST autenticado). Sem ele, apenas leituras funcionam.

As variaveis `VITE_FIREBASE_*` sao opcionais; se omitidas, `/api/runtime-config` reutiliza `FIREBASE_*` para o SDK no browser.

> **Atencao:** testes locais alteram dados reais. Evite reset de doacoes em producao durante testes.

### Sem Firebase (memoria local)

Se `FIREBASE_DATABASE_URL` nao estiver no `.env`, a API usa memoria volatil — dados somem ao reiniciar `npm run dev`:

- Login com senhas padrao acima
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
| Login admin falha | Senha alterada no DB | Reset via Firebase `config/senha_*` |
| Doação não sincroniza | Rules ou secret | Verificar rules + `FIREBASE_DATABASE_SECRET` |
| Painel vazio após deploy | Hydrate falhou | Checar Network tab em `/api/config` e `/api/doacoes` |
| Pre-commit falha | Lint/typecheck | `npm run check` e corrigir |

---

## 11. Referências

- [API-SPEC.md](./API-SPEC.md)
- [SECURITY.md](./SECURITY.md)
- [DEV-GUIDE.md](./DEV-GUIDE.md)
