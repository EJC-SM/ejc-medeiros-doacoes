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
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:watch` | Testes unitários em modo watch |
| `npm run test:e2e` | Testes E2E (Playwright) |
| `npm run test:all` | `check` + unitários + E2E |

---

## Áreas do app

| Área | Acesso | Função |
|------|--------|--------|
| **Pública** | Aberta | Registrar doações, ver totais, Pix, versículo e recado |
| **Coordenador** | Senha | Listar, filtrar, marcar entregas, exportar CSV |
| **Dirigente** | Senha | Itens, equipes, recado, branding, Pix, travas, reset |

**Autenticação:** no primeiro deploy, o app exige **setup inicial de senhas** (PBKDF2 + challenge-response — senha literal nunca trafega na rede). Ver [DEPLOYMENT.md §5](.planning/DEPLOYMENT.md#51-setup-inicial-de-senhas-obrigatório-no-primeiro-deploy).

---

## Estrutura do projeto

```
├── api/                 # Vercel Serverless Functions
├── src/
│   ├── components/      # UI modular (header, form, painéis)
│   ├── state/           # store, api client, firebase gateway
│   ├── utils/           # validação, auth, export, a11y
│   └── styles/          # tokens, global, a11y
├── tests/
│   ├── unit/            # Vitest (jsdom) — validação, security, export, store
│   └── e2e/             # Playwright — fluxos públicos com /api/* mockado
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
Rotação de chaves e proteção do código-fonte: [SECURITY-ROTATION.md](.planning/SECURITY-ROTATION.md).

---

## Licença

Projeto privado — EJC Medeiros.
