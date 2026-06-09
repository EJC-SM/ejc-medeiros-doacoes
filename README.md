# EJC Medeiros — Doações

Aplicação web para **registrar, acompanhar e administrar doações** do EJC Medeiros, com suporte a duas etapas de arrecadação, sincronização em tempo real e painéis para coordenador e dirigente.

**Stack:** Vite + TypeScript (frontend) · Vercel Functions (API) · Firebase Realtime Database

---

## Início rápido

```bash
cp .env.example .env   # preencher variáveis locais (opcional para dev)
npm install
npm run dev
```

Abra `http://localhost:5173`.

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento + API local em `/api/*` |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Preview do build |
| `npm run typecheck` | Verificação TypeScript |
| `npm run lint` | Lint com Biome |
| `npm run format` | Formatação com Biome |
| `npm run check` | Typecheck + Biome (usado no pre-commit) |

---

## Áreas do app

| Área | Acesso | Função |
|------|--------|--------|
| **Pública** | Aberta | Registrar doações, ver totais, Pix, versículo e recado |
| **Coordenador** | Senha | Listar, filtrar, marcar entregas, exportar CSV |
| **Dirigente** | Senha | Itens, equipes, recado, branding, Pix, travas, reset |

Senhas padrão (altere após deploy): ver [DEPLOYMENT.md](.planning/DEPLOYMENT.md#senhas-iniciais).

---

## Estrutura do projeto

```
├── api/                 # Vercel Serverless Functions
├── src/
│   ├── components/      # UI modular (header, form, painéis)
│   ├── state/           # store, api client, firebase gateway
│   ├── utils/           # validação, auth, export, a11y
│   └── styles/          # tokens, global, a11y
├── database.rules.json  # Regras Firebase (publicar no console)
├── index.html           # Entry HTML + SEO
└── .planning/           # Documentação técnica
```

---

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [ANALYSIS.md](.planning/ANALYSIS.md) | Estado atual do sistema pós-refatoração |
| [DEV-GUIDE.md](.planning/DEV-GUIDE.md) | Como estender componentes e APIs |
| [DEPLOYMENT.md](.planning/DEPLOYMENT.md) | Vercel, Firebase, variáveis de ambiente |
| [API-SPEC.md](.planning/API-SPEC.md) | Contrato dos endpoints |
| [SECURITY.md](.planning/SECURITY.md) | Medidas de segurança e OWASP |
| [LESSONS-LEARNED.md](.planning/LESSONS-LEARNED.md) | Decisões e trade-offs |
| [RELEASE-CHECKLIST.md](.planning/RELEASE-CHECKLIST.md) | Checklist antes de publicar |
| [ROADMAP.md](.planning/ROADMAP.md) | Histórico das fases do refactor |

---

## Deploy

Produção recomendada: **Vercel** + **Firebase Realtime Database**.

Passo a passo completo: [DEPLOYMENT.md](.planning/DEPLOYMENT.md).

---

## Legado

O arquivo `ejc-doacoes.html` é a versão monolítica anterior (~1861 linhas), mantida como referência. O deploy atual usa `index.html` + `src/` via `vercel.json`.

---

## Licença

Projeto privado — EJC Medeiros.
