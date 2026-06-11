# Checklist de Release

Use este checklist antes de cada deploy em produção (especialmente antes do evento EJC).

---

## Código e qualidade

- [ ] `npm run check` passa (typecheck + Biome)
- [ ] `npm run build` passa sem erros
- [ ] `npm audit` sem vulnerabilidades **high** ou **critical**
- [ ] Alterações revisadas (PR ou pair review)

---

## Variáveis de ambiente (Vercel)

- [ ] `FIREBASE_*` (7 variáveis web) configuradas
- [ ] `FIREBASE_DATABASE_URL` correto
- [ ] `FIREBASE_DATABASE_SECRET` configurado
- [ ] `ADMIN_API_TOKEN` definido (string longa aleatória)
- [ ] `AUTH_SETUP_TOKEN` definido (Preview + Production, até concluir setup)
- [ ] `SESSION_SECRET` definido (se não usar só ADMIN_API_TOKEN)

---

## Firebase

- [ ] `database.rules.json` publicado no console
- [ ] Teste: client **não** consegue `.write` direto no DB
- [ ] Backup CSV exportado (opcional, pré-evento)

---

## Segurança

- [ ] Setup inicial de senhas concluído (`GET /api/auth/status` → `initialSetupComplete: true`)
- [ ] Segundo POST `/api/auth/initial-setup` retorna **410**
- [ ] Network: login e troca de senha **sem** campo `password` literal
- [ ] Nó `auth/` ilegível no browser; `config/` sem `senha_*`
- [ ] `.env` não commitado
- [ ] `ADMIN_API_TOKEN` e `AUTH_SETUP_TOKEN` não expostos no frontend

---

## Setup inicial (primeiro deploy por ambiente)

- [ ] App exibe tela **Configuração inicial de senhas** (se `initialSetupComplete === false`)
- [ ] Setup concluído com `AUTH_SETUP_TOKEN` válido
- [ ] Após setup, app carrega normalmente (formulário público visível)
- [ ] `GET /api/auth/status` → `initialSetupComplete: true`, `coordConfigured` e `dirConfigured` true

## Smoke test em preview/production

- [ ] App carrega sem erro no console crítico
- [ ] `GET /api/health` → OK
- [ ] `GET /api/runtime-config` → firebase config (sem 500)
- [ ] Alternar etapa 1 ↔ 2 no header
- [ ] Registrar doação pública
- [ ] Recado / Pix / versículo visíveis (se configurados)
- [ ] Login **Coordenador** (challenge-response, sem `password` no body) → listagem + export CSV
- [ ] Marcar / remover entrega
- [ ] Login **Dirigente** → adicionar item + salvar recado
- [ ] Troca de senha no accordion **Senhas e segurança** (dirigente)
- [ ] Travar etapa → formulário público bloqueia etapa errada
- [ ] Logout funciona nos painéis

---

## Acessibilidade (recomendado)

- [ ] Navegação completa por teclado (Tab, Enter, Esc)
- [ ] Skip link leva ao conteúdo principal
- [ ] Teste rápido com leitor de tela (NVDA/VoiceOver)
- [ ] Contraste legível em mobile

---

## Performance

- [ ] Web Vitals no console: LCP &lt; 2.5s, CLS &lt; 0.1 (ambiente real)
- [ ] Teste em 4G / mobile

---

## Comunicação

- [ ] URL final compartilhada com equipes
- [ ] Senha coordenador entregue ao casal responsável
- [ ] Senha dirigente restrita à liderança
- [ ] Chave Pix confirmada

---

## Rollback plan

- [ ] Deploy anterior identificado na Vercel (para promote rápido)
- [ ] Contato com suporte Firebase/Vercel se necessário

---

## Pós-release

- [ ] Monitorar logs Vercel nas primeiras 24h
- [ ] Verificar doações chegando no Firebase Console
- [ ] Anotar issues para próximo ciclo

---

**Responsável:** _______________  
**Data do release:** _______________  
**Ambiente:** Preview / Production
