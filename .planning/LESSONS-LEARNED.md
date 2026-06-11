# Lições Aprendidas

Decisões, trade-offs e aprendizados do refactor EJC Medeiros Doações (Fases 0–5).

---

## 1. Monolito → modular

**Decisão:** Vanilla TypeScript + Vite, sem framework SPA.

**Por quê:** Público amplo (7+ a 70+ anos), equipe pequena, necessidade de simplicidade de manutenção. React/Vue agregariam complexidade desproporcional.

**Trade-off:** Mais boilerplate de DOM manual, mas bundle final ~53 KB gzip e zero curva de framework.

---

## 2. Firebase Realtime Database (não Firestore)

**Decisão:** Manter Realtime DB do legado.

**Por quê:** Schema já existente, listeners familiares à equipe, zero migração de dados.

**Trade-off:** Documentação inicial citava Firestore incorretamente — corrigido. Rules e queries são menos expressivas que Firestore.

---

## 3. Persistência híbrida

**Decisão:** `localStorage` + API + Firebase direto (fallback).

**Por quê:** Offline-first durante queda de rede; compatibilidade com chaves legadas.

**Trade-off:** Possível divergência temporária entre clientes se API e sync direto coexistirem. Em produção, priorizar API + rules que bloqueiam write client-side.

---

## 4. Autenticação por senha (sem Firebase Auth)

**Decisão (atualizada jun/2026):** Hashes PBKDF2-SHA256 em `auth/senha_coord` e `auth/senha_dir`; login challenge-response; setup inicial único com `AUTH_SETUP_TOKEN`.

**Por quê:** Paridade com legado sem Firebase Auth; senha literal nunca trafega na rede; hashes ilegíveis no client (nó `auth/` bloqueado nas rules).

**Fluxo resumido:**

1. Primeiro deploy → tela de setup (`POST /api/auth/initial-setup` + `x-setup-token`)
2. Login → `GET /api/auth/challenge` → browser deriva chave + `proof` HMAC → `POST /api/auth`
3. Troca rotineira → painel Dirigente, accordion **Senhas e segurança** (`change_password` com `passwordHash` only)
4. Sessão admin via `x-admin-session` (HMAC com `ADMIN_API_TOKEN` / `SESSION_SECRET`)

**Trade-off:** Sem 2FA; rate limit em memória (serverless). Setup inicial exige guardar `AUTH_SETUP_TOKEN` com cuidado até concluir.

**Legado removido:** `config/senha_coord` / `config/senha_dir` em texto plano — migrados para `auth/` no setup e apagados de `config/`.

---

## 5. innerHTML → DOM seguro

**Decisão:** `textContent` / `createElement` em fluxos com dados do usuário.

**Por quê:** Redução de XSS armazenado (achado A2 da auditoria Fase 0).

**Trade-off:** Templates estáticos ainda usam `innerHTML` uma vez no mount (HTML controlado pelo repo).

---

## 6. API serverless na Vercel

**Decisão:** Mutações críticas via `/api/*` com rate limit e sanitização.

**Por quê:** Client não confiável; rules Firebase sozinhas não validam payload.

**Trade-off:** Rate limit em memória não persiste entre instâncias serverless — suficiente para escala do evento, insuficiente para ataque distribuído grande.

---

## 7. Dev API em memória (Vite plugin)

**Decisão:** Espelhar rotas de produção no middleware do Vite.

**Por quê:** DX — desenvolver sem Firebase configurado.

**Trade-off:** Comportamento pode divergir levemente da Vercel (ex.: cold start, limites de payload).

---

## 8. Acessibilidade

**Decisão:** Baseline WCAG (landmarks, labels, skip link, reduced motion) sem biblioteca a11y.

**Por quê:** Escopo e performance; app é form-heavy.

**Trade-off:** Auditoria manual com leitor de tela ainda recomendada antes do evento real.

---

## 9. Export CSV

**Decisão:** Escape de células iniciadas com `=`, `+`, `-`, `@`.

**Por quê:** Formula injection ao abrir no Excel (achado Fase 0).

**Trade-off:** Usuários que precisam de fórmulas reais no CSV devem editar manualmente.

---

## 10. Qualidade (Fase 5)

**Decisão:** Biome + Husky `pre-commit` → `npm run check`.

**Por quê:** Pipeline leve sem ESLint+Prettier duplicados; gate mínimo antes de commit.

**Trade-off:** Primeiro clone precisa `npm install` para ativar hooks; CI externo ainda não configurado (opcional futuro).

---

## 11. O que faríamos diferente

1. ~~**Hash de senhas desde o início**~~ — implementado (PBKDF2 + challenge-response, jun/2026).
2. **Firebase listeners tipados** — refresh manual funciona, mas realtime UX seria mais fluida.
3. **Testes E2E mínimos** — Playwright em fluxo de doação + login + setup inicial reduziria regressões.
4. **CI na Vercel/GitHub Actions** — rodar `npm run check && npm run build` em PR.

---

## 12. O que funcionou bem

- Roadmap por fases com entregáveis documentais
- Preservação de chaves `localStorage` (zero perda na migração)
- Separação `store` / `api` / `firebase` gateway
- Documentação viva em `.planning/` sincronizada com código

---

## 13. Métricas de sucesso (avaliação)

| Critério | Status |
|----------|--------|
| Paridade funcional legado | ✅ (exceto banco avançado + gráfico) |
| TypeScript 0 errors | ✅ |
| Modularidade | ✅ |
| WCAG baseline | ✅ (auditoria manual pendente) |
| Security deep-dive | ✅ (auth PBKDF2; operacionalização ENV/rules/setup pendente) |
| DX / documentação | ✅ Fase 5 |
