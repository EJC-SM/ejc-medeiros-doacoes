# Plano de Refatoracao (executavel)

Data: 2026-06-08

## Objetivo
Reduzir complexidade, aumentar seguranca e manter simplicidade de uso para publico amplo.

## Fase 1 - Estruturacao Base (curto prazo)
- Criar projeto Vite + TypeScript.
- Separar componentes por pasta:
  - `src/components/header/`
  - `src/components/form-doacao/`
  - `src/components/painel-coordenador/`
  - `src/components/painel-dirigente/`
- Mover estilos para CSS modular + tokens globais.
- Criar `src/state/firebase.ts` como unico gateway de sincronizacao.

## Fase 2 - Seguranca e Validacao
- Criar `src/utils/validation.ts` com regras por campo:
  - Nome: tamanho e caracteres permitidos.
  - Telefone: mascara + formato valido.
  - Quantidade: inteiro positivo, maximo por item.
- Sanitizar strings antes de salvar e antes de renderizar.
- Criar camada `services/admin.ts` para acoes sensiveis via backend.

## Fase 3 - Acessibilidade e UX
- Revisar semantica (landmarks e hierarquia de titulos).
- Garantir fluxo de teclado em todos os modais/formularios.
- Mensagens dinamicas com `aria-live`.
- Melhorar foco visivel e contraste.

## Fase 4 - SEO + Performance
- Meta tags e Open Graph.
- Schema.org para organizacao/evento.
- Otimizacao de imagens (logo/QR), lazy loading e tamanhos.

## Fase 5 - Qualidade e Governanca
- Biome para lint/format.
- Husky + pre-commit para quality gate.
- Checklist de release e guia de manutencao.

## Entregaveis
- Codigo modular em TypeScript.
- Regras de seguranca documentadas.
- Documentacao tecnica completa e onboarding.
