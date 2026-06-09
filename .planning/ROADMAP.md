# EJC Medeiros Doações — Roadmap Refatoração

**Data**: junho 2026  
**Status**: 🟢 Refatoração concluída (Fases 0–5)
**Versão**: v2.0 (refatorada)

---

## 📋 Executive Summary

Refatorar aplicativo monolítico de gerencimento de doações (HTML 1161 linhas) para arquitetura modular, TypeScript, e acessibilidade extrema. Mantém Firebase realtime, melhora validação, segurança e DX.

**Escopo**: Refactor modular + TypeScript + Validação forte + Acessibilidade + SEO  
**Prazo**: ⚡ Crítico (2-3 dias de refactor + 1-2 dias security review)  
**Equipe**: User (você) + IA (Claude)  

---

## 🎯 Vision

**Atual**: Monolítico, difícil manutenção, validação fraca, acessibilidade deficiente  
**Alvo**: Modular, tipado, validado 100%, acessível (WCAG AA), pronto para escalabilidade

**Usuários**: Jovens (7+) até idosos — interface EXTREMAMENTE simples e clara

---

## 🚨 Critical Constraints

| Req | Priority | Status |
|-----|----------|--------|
| ❌ Zero data loss | BLOCKER | ⚠️ Atual: sim, mas em localStorage |
| ♿ WCAG AA minimum | HIGH | 🔴 Atual: deficiente |
| 📱 Mobile-first | HIGH | 🟢 Atual: ok, mas pode melhorar |
| 🔐 Form validation | HIGH | 🔴 Atual: fraca |
| 🚀 Performance | MEDIUM | 🟢 Atual: ok (1861 linhas) |
| 📊 Firebase realtime | MUST-HAVE | 🟢 Atual: sim |

---

## 📦 Architecture Target

```
src/
├── components/
│   ├── header/
│   │   ├── header.ts
│   │   ├── header.css
│   │   └── header.html
│   ├── form-doacao/
│   │   ├── form-doacao.ts
│   │   ├── form-doacao.css
│   │   └── form-doacao.html
│   ├── painel-coord/
│   ├── banco-dados/
│   └── [outros components]
├── state/
│   ├── firebase.ts        # Firebase integration
│   ├── store.ts           # Global state management
│   └── types.ts           # TypeScript interfaces
├── utils/
│   ├── validation.ts      # Máscaras, sanitização, règles
│   ├── accessibility.ts   # ARIA, keyboard support
│   ├── seo.ts            # Meta tags, schema.org
│   └── security.ts       # CSRF, XSS protection
├── styles/
│   ├── variables.css     # Design tokens
│   ├── global.css        # Reset, base styles
│   └── a11y.css          # Accessibility utilities
└── main.ts               # Entry point
```

---

## 🔄 Phase Breakdown

### **Phase 0: Analysis + Audit** (1 dia)
- [x] Coletar contexto do usuário (DONE)
- [x] Mapear código: componentes, fluxos, dependências
- [x] Audit inicial: vulnerabilidades, code smell, performance
- [x] Documentar Firebase usage (collections, queries)
- [x] Criar spec inicial de migração
- **Outputs**: `.planning/phase-0/ANALYSIS.md`, `.planning/phase-0/SPEC.md`, `.planning/phase-0/AUDIT.md`

### **Phase 1: Refactoring Estrutural** (1-2 dias)
- [x] Setup Vite + package.json
- [x] Criar estrutura `src/components/{name}/{name.ts+css+html}`
- [x] Extrair components base (header, form, painel coordenador, painel dirigente)
- [x] Setup Firebase integration layer (`state/firebase.ts`)
- [x] Setup state management básico
- **Outputs**: Git commit com nova estrutura

## ⏰ Lembretes Pendentes (Bloqueios Atuais)

1. **Vercel ENV pendente**
- Definir na Vercel as variáveis `FIREBASE_*`, `ADMIN_API_TOKEN` e `SESSION_SECRET`.
- Enquanto não houver acesso à Vercel, usar `.env` local para testes.

2. **Publicar Firebase Rules**
- Aplicar `database.rules.json` no Firebase Console (arquivo criado no repo).

### **Phase 2: TypeScript + Validação** (1-2 dias)
- [x] Converter base do formulário para TS funcional
- [x] Adicionar tipos iniciais para Firebase e catálogo de itens
- [x] Implementar validação inicial (nome, equipe, telefone, quantidade)
- [x] Sanitização de inputs (XSS prevention) no fluxo de doação
- [x] Token CSRF básico de sessão no formulário modular
- [x] Migrar painel do coordenador (filtro, métricas, lista e totais)
- [x] Migrar painel do dirigente (itens, equipes e recado com sync)
- [x] Implementar marcação de entrega no painel do coordenador
- [x] Reduzir `innerHTML` em fluxo crítico do coordenador (render seguro via DOM)
- [x] Finalizar hardening XSS no painel dirigente (render seguro de listas)
- [x] Melhorar CSS global e dos painéis para legibilidade/acessibilidade
- [x] Fechar hardening residual em fluxos críticos (coordenador/main)
- **Outputs**: TS compiler passing, validation tests

### **Phase 3: Acessibilidade + SEO** (1 dia)
- [x] Audit WCAG (checklist baseline registrado em `.planning/phase-3/WCAG-REVIEW.md`)
- [x] Adicionar ARIA labels e landmarks principais
- [x] Keyboard navigation base (skip link + foco visível)
- [x] Color contrast check (WCAG AA) - ajuste inicial aplicado (validação final pendente de auditoria manual)
- [x] Meta tags e schema.org markup
- [x] Open Graph + Twitter cards
- [x] Performance base: reduzir motion para usuários com `prefers-reduced-motion`
- [x] Medição de Web Vitals (CLS/LCP/INP) instrumentada no frontend
- [x] Estabelecer versão de teste estável sem layout incompleto (navegação por áreas + estado claro)
- [x] `variables.css`, `a11y.css`, `accessibility.ts` adicionados
- **Outputs**: a11y.css, updated metadata

### **Phase 4: Security Deep-Dive** (depois, 1-2 dias)
- [x] Code review de validação + auth (login server-side + sessão admin)
- [x] npm audit + dependency check (sem vulnerabilidades high no baseline atual)
- [x] Rate limiting server-side em mutações de API (`/api/doacoes`, `/api/config`)
- [x] Firebase security rules review (`database.rules.json`)
- [x] OWASP top 10 checklist (`.planning/SECURITY.md`)
- [x] Endpoints de API criados (`/api/doacoes`, `/api/config`, `/api/health`, `/api/auth`, `/api/admin`)
- [x] Security headers base em responses de API
- [x] Proteção de rotas sensíveis via `ADMIN_API_TOKEN` + sessão admin
- [x] Paridade funcional legado: login, export, pix, travas, reset, branding
- **Outputs**: SECURITY.md, patches

### **Phase 5: Documentação Final** (concluída)
- [x] ANALYSIS.md (estado atual pós-refactor)
- [x] DEV-GUIDE.md (como estender, estrutura)
- [x] DEPLOYMENT.md (Vercel + Firebase setup)
- [x] LESSONS-LEARNED.md (decisões, trade-offs)
- [x] RELEASE-CHECKLIST.md (checklist de release)
- [x] README.md atualizado
- [x] Biome para lint/format
- [x] Husky + pre-commit (`npm run check`)
- **Outputs**: Todos os .md em `.planning/` + README raiz

---

## 📊 Decision Matrix

| Decisão | Escolha | Rationale |
|---------|---------|-----------|
| Build too | Vite | Rápido, moderno, suporte TypeScript nativo |
| Frontend | Vanilla TS | Sem dependências, simples manutenção comunidade |
| Backend | Firebase | Já em uso, realtime, sincronização perfeita |
| Database | Firebase Realtime Database | Realtime, schema legado preservado |
| Deployment | Vercel | Atual, zero-downtime, próximo de Brasil |
| Auth | Current (senha) | Melhorar validação, sem 2FA agora |
| Storage | localStorage + Firebase | Offline-first + sync |

---

## 🎯 Success Criteria

- ✓ Zero breaking changes (mesmas funcionalidades)
- ✓ WCAG AA compliance
- ✓ TypeScript com 0 errors
- ✓ Validação 100% (sem XSS/CSRF possível)
- ✓ Modular: cada component independente
- ✓ Maintainability: novo dev consegue entender em 1h
- ✓ Performance: LCP < 2.5s, CLS < 0.1, FID < 100ms

---

## 🚀 Next Steps

### **Agora**
1. [x] Integrar frontend com endpoints backend (`/api/doacoes`, `/api/config`)
2. [x] Fechar baseline de SEO técnico (meta + OG/Twitter + schema.org)
3. [x] Fechar baseline de acessibilidade (landmarks, labels, foco visível, reduced motion)

### **Próximo ciclo (pós-refactor)**
4. [ ] Rodar auditoria manual WCAG completa (teclado + leitor de tela)
5. [ ] Medir Web Vitals reais em produção
6. [ ] Publicar Firebase Rules + ENV Vercel (ver DEPLOYMENT.md)
7. [ ] Rotacionar senhas padrão após primeiro deploy
8. [ ] Backlog opcional: banco de dados avançado, gráfico por equipe, CI GitHub Actions

---

## 📝 Glossário

- **FCP**: First Contentful Paint
- **LCP**: Largest Contentful Paint  
- **CLS**: Cumulative Layout Shift
- **WCAG**: Web Content Accessibility Guidelines
- **ARIA**: Accessible Rich Internet Applications
- **XSS**: Cross-Site Scripting
- **CSRF**: Cross-Site Request Forgery
- **DX**: Developer Experience

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Firebase usage muda durante refactor | HIGH | Manter API abstrata em `state/firebase.ts` |
| localStorage incompatível com new structure | MEDIUM | Manter schema, só mudar como acessa |
| Acessibilidade quebra funcionalidade | MEDIUM | Testar com screen reader, real users |
| TypeScript compilation errors | LOW | Usar TS strict mode desde início, types.ts forte |

---

## ✅ Checklist Pré-Execução

Antes de começar Phase 0, confirme:

- [ ] Acesso a `https://github.com/EJC-SM/ejc-medeiros-doacoes` (git clone)
- [ ] Você quer que eu comece Phase 0 agora?
- [ ] Alguma dúvida sobre o roadmap acima?
- [ ] Firebase config está segura (não commitado .env)?

---

**Prepared by**: Claude (GitHub Copilot)  
**Last Updated**: 8 junho 2026 (Fase 5 concluída)
