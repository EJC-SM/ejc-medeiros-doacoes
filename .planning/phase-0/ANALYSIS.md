# Fase 0 - Analysis

Data: 2026-06-08
Escopo: estado atual da aplicacao, riscos e pontos para refatoracao.

## 1. Arquitetura Atual
- Aplicacao single-file em `ejc-doacoes.html` com HTML + CSS + JS no mesmo arquivo (1861 linhas).
- Persistencia hibrida:
  - `localStorage` para cache e estado local.
  - Firebase Realtime Database para sincronizacao multi-dispositivo.
- Roteamento simples por telas internas (`registrar`, `coordenador`) com manipulacao direta de DOM.
- Deploy em Vercel com rewrite para o arquivo unico (`vercel.json`).

## 2. Fluxos Principais
- Doacao publica: nome + equipe + itens (+ telefone opcional) -> grava em `localStorage` e sincroniza no Firebase.
- Coordenador: login por senha para visualizar painel, filtros e exportacao.
- Dirigente: login por senha para alterar configuracoes sensiveis (itens, equipes, recados, PIX, bloqueio de etapa, reset).

## 3. Riscos Tecnicos Observados
- Acoplamento alto: regra de negocio, renderizacao, integracao externa e estado no mesmo arquivo.
- Falta de modularidade dificulta testes e manutencao.
- Uso extensivo de `innerHTML` para renderizacao com dados variaveis.
- Sem pipeline de qualidade (lint/typecheck/tests).

## 4. Acessibilidade (snapshot inicial)
- Pontos positivos:
  - Idioma definido (`lang=pt-BR`).
  - Labels presentes em varios campos.
- Gaps:
  - Dependencia forte de cliques e handlers inline (`onclick`, `onkeydown`).
  - Falta de landmarks semanticos completos e possivel navegacao por teclado inconsistente.
  - Mensagens de erro/sucesso sem `aria-live` robusto.

## 5. Plano de Refatoracao (resumo)
- Extrair para estrutura modular em `src/components/...`.
- Migrar para TypeScript e separar camadas:
  - `state/` (store + firebase gateway)
  - `services/` (auth/config/doacoes)
  - `ui/` (render + acessibilidade)
- Substituir renderizacao por APIs seguras (evitar `innerHTML` com dados nao confiaveis).
- Introduzir validacoes de entrada centralizadas e utilitarios de sanitizacao.

## 6. Acao Imediata Executada
- Removida configuracao Firebase hardcoded do frontend.
- Adicionado endpoint runtime em `api/runtime-config.js` para injetar configuracao via variaveis de ambiente na Vercel.
- Frontend agora busca `/api/runtime-config` antes de inicializar Firebase.
