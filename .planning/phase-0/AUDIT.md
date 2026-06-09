# Fase 0 - AUDIT

Data: 2026-06-08
Tipo: auditoria tecnica inicial (arquitetura + seguranca + operacao).

## 1. Inventario do Estado Atual
- App legado monolitico em `ejc-doacoes.html` (HTML/CSS/JS acoplados).
- Novo baseline modular criado em `src/` com Vite + TypeScript.
- Endpoint `api/runtime-config.js` para runtime config no deploy.
- Fallback local implementado via `VITE_FIREBASE_*` para dev local.

## 2. Conformidade com Objetivo da Fase 0
- ANALYSIS: OK
- AUDIT: OK
- SPEC: OK
- Registro no roadmap: pendente de ajuste fino (corrigido neste ciclo).

## 3. Achados de Auditoria
- Achado A1 (alto): credenciais/segredos operacionais ainda modelados no cliente legado.
- Achado A2 (medio): uso extensivo de `innerHTML` em renderizacao de dados dinamicos.
- Achado A3 (medio): validacao de entrada ainda nao centralizada.
- Achado A4 (baixo): dependencia de multiplos CDNs para SDK no legado.

## 4. Status de Mitigacoes
- M1: Remocao de firebaseConfig hardcoded do fluxo legado: concluida.
- M2: Runtime config por endpoint: concluida.
- M3: Fallback local Vite para desenvolvimento: concluida.
- M4: Endurecimento de Firebase Rules: pendente (lembrete aberto no roadmap).

## 5. Risco Residual
- Sem revisão de rules e sem backend auth para acoes sensiveis, ainda existe risco de abuso por cliente malicioso.

## 6. Recomendacao Imediata para Phase 2
- Priorizar migracao de validacao/sanitizacao e fluxo de doacao funcional para camada modular.
- Em seguida, migrar acoes administrativas para endpoints server-side.
