# Relatório de ações — rotação de chaves e proteção do código-fonte

**Data:** 2026-06-11  
**Contexto:** O arquivo legado `ejc-doacoes.html` foi removido do repositório. Credenciais Firebase e senhas padrão permanecem recuperáveis no **histórico do Git** (commits de 28/05 a 09/06/2026). Este documento lista as ações necessárias em **Vercel**, **Firebase** e **Git**.

---

## Resumo do que foi exposto

| Credencial | Onde apareceu | Ainda no histórico Git? |
|------------|---------------|-------------------------|
| `FIREBASE_API_KEY` (`AIzaSyDDJ85sHIZa47cPAaQRyaot00WHSsTdDPs`) | `ejc-doacoes.html` (hardcoded) | Sim |
| Demais `FIREBASE_*` (authDomain, databaseURL, projectId, etc.) | Idem | Sim |
| Senhas padrão `ejcdoacoes2025` / `Senh@ejc123!*` | Idem + possível sync em `config/senha_*` | Sim (Git); verificar Firebase |
| `FIREBASE_DATABASE_SECRET` | Nunca commitado | Não (rotacionar preventivamente) |
| `ADMIN_API_TOKEN`, `SESSION_SECRET`, `AUTH_SETUP_TOKEN` | Nunca commitados | Não (rotacionar preventivamente) |

---

## 1. Ações na Vercel

Acesse: **Project Settings → Environment Variables** (Production **e** Preview).

### 1.1 Rotacionar variáveis obrigatórias

| Variável | Ação | Como gerar novo valor |
|----------|------|------------------------|
| `FIREBASE_API_KEY` | **Substituir** após regenerar no Firebase (seção 2.1) | Copiar do Firebase Console após rotação |
| `FIREBASE_DATABASE_SECRET` | **Substituir** após regenerar no Firebase (seção 2.2) | Firebase Console → Realtime Database → Secrets |
| `ADMIN_API_TOKEN` | **Gerar novo** (`openssl rand -hex 32`) | Token longo e aleatório; distinto dos demais |
| `SESSION_SECRET` | **Gerar novo** (`openssl rand -hex 32`) | Usado na assinatura HMAC de `x-admin-session` |
| `AUTH_SETUP_TOKEN` | **Gerar novo** se setup ainda não concluído; **remover** após setup | Uso único para `POST /api/auth/initial-setup` |

Manter sincronizados (não rotacionam, mas conferir valores):

- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

### 1.2 Redeploy

1. Após alterar variáveis, acionar **Redeploy** em Production (e Preview, se aplicável).
2. Confirmar `GET /api/health` e `GET /api/runtime-config` respondendo sem erro `missing_firebase_env`.
3. Confirmar `GET /api/auth/status` — verificar se setup inicial já foi concluído.

### 1.3 Invalidar sessões antigas

Após trocar `ADMIN_API_TOKEN` / `SESSION_SECRET`, todas as sessões admin (`x-admin-session`) em uso deixam de ser válidas. Comunicar à equipe para **fazer login novamente**.

### 1.4 Proteções adicionais na Vercel

- [ok] Confirmar que **Environment Variables** não estão expostas em logs de build públicos.
- [ok] Restringir acesso ao projeto Vercel (membros mínimos necessários).
- [ok] Ativar **Deployment Protection** em Preview, se branches forem compartilhadas.
- [ok] Verificar que nenhuma variável `VITE_*` com segredo está definida (segredos não devem ir para o bundle).

---

## 2. Ações no Firebase

Projeto: **`ejc-medeiros-doacoes`**

### 2.1 Rotacionar API Key (prioridade máxima)

1. Abrir [Google Cloud Console](https://console.cloud.google.com/) → projeto `ejc-medeiros-doacoes` → **APIs & Services → Credentials**.
2. Localizar a API key exposta (`AIzaSyDDJ85sHIZa47cPAaQRyaot00WHSsTdDPs`).
3. **Criar nova key** ou **regenerar** a existente.
4. Restringir a nova key:
   - **Application restrictions:** HTTP referrers (web sites)
   - Domínios autorizados: `https://*.vercel.app/*`, domínio customizado (se houver), `http://localhost:*` (apenas dev)
   - **API restrictions:** limitar a Firebase-related APIs necessárias
5. Atualizar `FIREBASE_API_KEY` na Vercel (seção 1).
6. **Desativar ou excluir** a key antiga após confirmar que produção funciona.

### 2.2 Rotacionar Database Secret

1. Firebase Console → **Realtime Database** → aba **Secrets** (Legacy).
2. Gerar **novo secret** para REST autenticado.
3. Atualizar `FIREBASE_DATABASE_SECRET` na Vercel.
4. Revogar o secret anterior após redeploy bem-sucedido.

> Se migrar para Service Account no futuro, o secret legado pode ser descontinuado.

### 2.3 Publicar regras de segurança

1. Firebase Console → Realtime Database → **Regras**.
2. Publicar o conteúdo de `database.rules.json` do repositório.
3. Confirmar:
   - `auth/` → read/write **false** (cliente não acessa hashes de senha)
   - `doacoes/` e `config/` → leitura pública, **escrita bloqueada** no client
   - Mutações apenas via API server-side com `FIREBASE_DATABASE_SECRET`

Alternativa via CLI:

```bash
firebase deploy --only database
```

### 2.4 Limpar dados legados sensíveis

Verificar no Firebase Console → Realtime Database:

- [ok] Remover `config/senha_coord` e `config/senha_dir` se ainda existirem (texto plano do legado).
- [ok] Confirmar nó `auth/` com hashes PBKDF2 e `auth/meta/initialSetupComplete === true`.
- [ok] Se senhas padrão (`ejcdoacoes2025` / `Senh@ejc123!*`) nunca foram trocadas, **alterar imediatamente** pelo painel Dirigente → Senhas e segurança.

### 2.5 Auditoria e monitoramento

- [ok] Revisar **Authentication → Usage** e logs de acesso ao Realtime Database.
- [ok] Verificar se houve escrita não autorizada durante o período em que regras estavam fracas ou ausentes.
- [ok] Considerar backup/export do estado atual antes de limpezas em massa.

---

## 3. Ações no Git / GitHub

Repositório: **`EJC-SM/ejc-medeiros-doacoes`**

### 3.1 Commit da remoção do legado

O arquivo `ejc-doacoes.html` foi removido do working tree. **Commitar e fazer push** dessa remoção para que o HEAD deixe de servir o arquivo legado.

> Isso **não apaga** o histórico — apenas impede que novos clones recebam o arquivo na tip.

### 3.2 Purga do histórico (recomendado se repo for ou ficar público)

Segredos permanecem em commits antigos (`9240162` … `e5ffe82`). Opções:

**Opção A — `git filter-repo` (recomendado)**

```bash
# Instalar: pip install git-filter-repo
git filter-repo --path ejc-doacoes.html --invert-paths --force
git push origin main --force
```

**Opção B — BFG Repo-Cleaner**

```bash
bfg --delete-files ejc-doacoes.html
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin main --force
```

**Atenção:** force push exige coordenação com todos os colaboradores (re-clone ou reset).

### 3.3 Proteções do repositório (GitHub)

Em **Settings → General → Danger Zone** e **Settings → Code security**:

- [ok] Confirmar repositório como **Private** (ou manter private).
- [ ] Ativar **Secret scanning** e **Push protection** (GitHub Advanced Security, se disponível).
- [ok] Ativar **Dependabot alerts** para vulnerabilidades em dependências.
- [ ] Configurar **branch protection** em `main`:
  - Require pull request reviews
  - Block force pushes (exceto durante purga única do histórico)
- [ok] Revisar colaboradores e permissões (princípio do menor privilégio).

### 3.4 Boas práticas contínuas

- [ok] Manter `.env` no `.gitignore` (já configurado).
- [ok] Nunca commitar `.env`, secrets ou credenciais em docs/issues.
- [ok] Usar apenas `.env.example` com placeholders vazios.
- [ok] Executar busca antes de push:

```bash
git diff --staged | grep -iE 'AIza|SECRET|TOKEN|PASSWORD|api[_-]?key' || true
```

- [ ] Considerar pre-commit hook com `gitleaks` ou `detect-secrets`.

---

## 4. Ordem de execução recomendada

```
1. Firebase: publicar database.rules.json
2. Firebase: rotacionar FIREBASE_API_KEY + restringir domínios
3. Firebase: rotacionar FIREBASE_DATABASE_SECRET
4. Vercel: atualizar todas as env vars + redeploy
5. App: concluir setup inicial (se pendente) ou trocar senhas admin
6. Vercel: remover AUTH_SETUP_TOKEN (após setup)
7. Git: commit + push da remoção de ejc-doacoes.html
8. Git: purga do histórico (se repo público ou política exigir)
9. Equipe: re-login admin + validação UAT
```

---

## 5. Checklist de verificação pós-rotação

| Verificação | Comando / ação | Esperado |
|-------------|----------------|----------|
| Runtime config | `GET /api/runtime-config` | JSON com `firebase.*` preenchido |
| Auth status | `GET /api/auth/status` | `initialSetupComplete: true` |
| Login coordenador | UI → painel Coordenador | Login com senha **nova** |
| Login dirigente | UI → sub-aba Dirigente | Login com senha **nova** |
| Mutação protegida | Tentar PUT sem sessão | 401/403 |
| Firebase rules | Console → Simulador | Client write em `auth/` negado |
| Histórico Git | `git log -p -S "AIzaSy"` | Apenas histórico antigo (até purga) |

---

## 6. Referências internas

- [DEPLOYMENT.md](./DEPLOYMENT.md) — variáveis Vercel e fluxo de deploy
- [SECURITY.md](./SECURITY.md) — modelo de auth e OWASP
- [phase-0/VULNERABILITIES.md](./phase-0/VULNERABILITIES.md) — vulnerabilidades do legado
- `.env.example` — lista canônica de variáveis

---

## Responsáveis sugeridos

| Área | Responsável | Prazo sugerido |
|------|-------------|----------------|
| Rotação Firebase | Admin Firebase / DevOps | Imediato |
| Atualização Vercel | Admin Vercel | Imediato |
| Troca senhas admin | Dirigente EJC | Após redeploy |
| Purga Git (se aplicável) | Mantenedor do repo | 1–2 dias |
| Validação UAT | Coordenação EJC | Após todas as rotações |
