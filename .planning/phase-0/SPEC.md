# Fase 0 - SPEC

Data: 2026-06-08
Escopo: contrato tecnico para migracao do app legado para base modular TypeScript.

## 1. Objetivo da Fase
Formalizar o que sera migrado do `ejc-doacoes.html` para a arquitetura em `src/`, sem perda funcional.

## 2. Escopo Funcional Obrigatorio
- Registro de doacao publica (nome, telefone, equipe, itens, quantidades).
- Sincronizacao multi-dispositivo via Firebase Realtime Database.
- Painel de coordenador (login, listagem, totais, filtros, exportacao).
- Painel de dirigente (itens, equipes, recados, pix, travas de etapa, reset).
- Persistencia local como fallback (localStorage) durante indisponibilidade de rede.

## 3. Contrato de Dados (baseline)
- `doacoes/etapa1` e `doacoes/etapa2`: mapa de doacoes por id.
- `config/*`: itens, categorias, equipes, pix, recados, nome do evento, versiculo, travas e credenciais atuais.
- Chaves locais em `localStorage` devem manter compatibilidade de leitura na migracao.

## 4. Requisitos Nao-Funcionais
- Acessibilidade: evoluir para WCAG AA.
- Seguranca: reduzir uso de `innerHTML` com dados dinamicos e centralizar validacao/sanitizacao.
- Performance: manter UX mobile-first sem regressao perceptivel.
- Manutenibilidade: separar UI, estado e integracao.

## 5. Arquitetura Alvo da Migracao
- `src/components/`: componentes de tela.
- `src/state/store.ts`: estado local e serializacao.
- `src/state/firebase.ts`: gateway unico de sync/runtime config.
- `src/utils/`: validacao, a11y e helpers de seguranca.

## 6. Criterios de Aceite da Fase 0
- Documento de analise publicado.
- Documento de auditoria publicado.
- Spec funcional publicado.
- Roadmap refletindo status real (Phase 0 concluida no que foi prometido documentalmente).
