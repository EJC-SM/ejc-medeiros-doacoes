# Análise — Estado Atual do Sistema

**Data:** junho 2026  
**Versão:** v2.0 (refatorada)  
**Escopo:** snapshot pós-conclusão das Fases 0–5

---

## 1. Resumo executivo

O EJC Medeiros Doações evoluiu de um **HTML monolítico** (`ejc-doacoes.html`) para uma aplicação **modular em TypeScript**, com API serverless, autenticação administrativa no backend e documentação completa.

O sistema atende três perfis de uso:

- **Participante:** registra doações na etapa ativa.
- **Coordenador:** painel com sub-abas **Doações | Banco de Dados | Dirigente** — acompanha registros, recado público, exportações e (com senha do dirigente) CRUD de itens/categorias.
- **Dirigente:** configurado dentro da sub-aba do coordenador (travas, senhas, Pix, logo, branding, equipes 1ª/2ª etapa, resets).

Navegação global: **Equipistas | Coordenador** (tab Dirigente removida).

---

## 2. Arquitetura atual

```
Browser
  ├── index.html → src/main.ts
  │     ├── components/ (UI)
  │     ├── state/store.ts (localStorage)
  │     ├── state/api.ts (HTTP → /api/*)
  │     └── state/firebase.ts (sync direto, fallback)
  └── /api/* (Vercel Functions)
        └── Firebase Realtime Database (REST server-side)
```

**Persistência híbrida:**

| Camada | Uso |
|--------|-----|
| `localStorage` | Cache offline, chaves legadas `ejc_*` preservadas |
| Firebase Realtime DB | Fonte de verdade multi-dispositivo |
| API Vercel | Mutações validadas, auth, rate limit |

---

## 3. Modelo de dados

### Firebase

```
doacoes/etapa1|2  →  { [id]: Doacao }
config/
  itens, cats, equipes1, equipes2, recado1, recado2
  nome_evento, versiculo, versiculo_ref
  pix_chave, pix_qr, logo, etapa_locked
  senha_coord, senha_dir
```

### Tipo `Doacao`

```typescript
{
  id: number;
  nome: string;
  equipe: string;
  telefone?: string;
  itens: { nome, unidade, quantidade }[];
  data: string;
  entregue?: { data: string; ocasiao?: string };
}
```

---

## 4. Funcionalidades implementadas

| Módulo | Status |
|--------|--------|
| Formulário público + validação | ✅ |
| Etapas 1 e 2 + trava | ✅ |
| Sync Firebase + API | ✅ |
| Login coordenador / dirigente embarcado | ✅ |
| Painel coordenador (sub-abas Doações, Banco, Dirigente) | ✅ |
| Stats legado, recado coord, backup CSV 3 seções | ✅ |
| Banco de dados (categorias, meta, visível/oculto, CRUD) | ✅ |
| Gráfico de pizza por equipe | ✅ |
| Dirigente embarcado (equipes 1/2, dropzones logo/Pix) | ✅ |
| Pix, logo, versículo | ✅ |
| Reset doações / itens + categorias padrão | ✅ |
| Troca de senhas | ✅ |
| A11y baseline (skip link, ARIA, reduced motion) | ✅ |
| SEO (meta, OG, schema.org) | ✅ |
| Web Vitals instrumentado | ✅ |
| Security headers + rate limit | ✅ |

### Backlog opcional

- Realtime listeners contínuos no client (hoje: hydrate + refresh manual)

---

## 5. Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Build | Vite 5 |
| Linguagem | TypeScript 5.5 (strict) |
| UI | Vanilla TS + CSS modular |
| API | Node.js (Vercel Functions) |
| DB | Firebase Realtime Database |
| Deploy | Vercel |
| Qualidade | Biome + Husky pre-commit |
| A11y/Perf | web-vitals, WCAG baseline |

---

## 6. Segurança (resumo)

- Config Firebase via `/api/runtime-config` (sem hardcode no bundle).
- Login admin server-side (`POST /api/auth`).
- Mutações sensíveis exigem sessão (`x-admin-session`) ou `x-admin-token`.
- Sanitização client + server; CSV com escape anti–formula injection.
- `database.rules.json`: leitura pública controlada, **escrita bloqueada no client**.

Detalhes: [SECURITY.md](./SECURITY.md).

---

## 7. Qualidade e DX

- `npm run check` — typecheck + Biome antes de cada commit (Husky).
- Documentação em `.planning/` + README na raiz.
- API local espelhada em `vite.config.ts` para dev sem Firebase.

---

## 8. Riscos residuais

| Risco | Mitigação recomendada |
|-------|------------------------|
| Senhas em texto no Firebase | Rotacionar após deploy; migrar para hash futuro |
| Rules não publicadas | Aplicar `database.rules.json` no console |
| ENV Vercel incompleta | Seguir [DEPLOYMENT.md](./DEPLOYMENT.md) |
| WCAG sem auditoria manual | Testar com NVDA/VoiceOver antes de evento |

---

## 9. Referências históricas

- Fase 0: [.planning/phase-0/ANALYSIS.md](./phase-0/ANALYSIS.md) — análise do legado
- Roadmap completo: [ROADMAP.md](./ROADMAP.md)
