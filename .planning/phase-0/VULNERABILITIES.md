# Fase 0 - Vulnerability Assessment

Data: 2026-06-08
Metodo: revisao manual estaticas do codigo atual (single-file).

## Criticidade Alta

1) Configuracao Firebase exposta no frontend (hardcoded)
- Evidencia: `ejc-doacoes.html` continha `firebaseConfig` literal no cliente.
- Impacto: facilita abuso da base por terceiros com engenharia reversa e automacao.
- Status: MITIGADO (agora runtime config via endpoint + env da Vercel).
- Proximo passo: rotacionar credenciais e aplicar regras fortes no Firebase.

2) Segredos/senhas de operacao armazenados e sincronizados em texto puro
- Evidencia: `config/senha_coord` e `config/senha_dir` sao lidas/escritas em claro.
- Impacto: qualquer cliente com acesso ao DB pode ler/alterar credenciais.
- Recomendacao:
  - Nao armazenar senha de painel no cliente/Realtime DB.
  - Migrar autorizacao de acoes sensiveis para backend (Vercel Function) com verificacao server-side.

3) Ausencia de controle de autorizacao server-side para operacoes sensiveis
- Evidencia: funcoes cliente executam reset, troca de senha e alteracoes de config diretamente.
- Impacto: bypass de UI permite chamadas diretas no console/SDK.
- Recomendacao:
  - Criar endpoints server-side para mutacoes criticas.
  - Aplicar autenticao real (Firebase Auth) e regras por role.

## Criticidade Media

4) Uso extensivo de `innerHTML` com dados dinamicos
- Evidencia: multiplos pontos de renderizacao (`lista`, `totais`, `recados`).
- Impacto: risco de XSS armazenado se dados maliciosos entrarem no fluxo.
- Recomendacao:
  - Preferir `textContent`/DOM API.
  - Sanitizacao centralizada de qualquer campo textual antes de persistir e antes de renderizar.

5) Validacao de entrada insuficiente
- Evidencia: campos aceitam texto livre sem whitelist robusta.
- Impacto: injecao de payloads em telas e exportacoes.
- Recomendacao:
  - Regras por campo (nome/equipe/telefone/quantidade).
  - Limites min/max, regex e normalizacao.

6) Exportacao CSV com possivel formula injection
- Evidencia: campos do usuario entram no CSV.
- Impacto: ao abrir no Excel, celulas iniciadas com `=`, `+`, `-`, `@` podem executar formula.
- Recomendacao:
  - Prefixar campos iniciados por esses caracteres com apostrofo `'`.

## Criticidade Baixa

7) Dependencia de multiplas CDNs para SDK
- Evidencia: gstatic/jsdelivr/unpkg fallback.
- Impacto: superficie de supply chain maior; inconsistencias.
- Recomendacao:
  - Reduzir para fonte oficial e controlar versao com bundler (Vite).

## Recomendacoes Prioritarias (ordem)
1. Endurecer Firebase Rules (imediato)
2. Rotacionar chaves e remover segredos hardcoded (parcialmente feito)
3. Mover acoes sensiveis para backend server-side
4. Implementar validacao/sanitizacao estrita
5. Eliminar `innerHTML` nos fluxos com dados externos
6. Mitigar CSV injection
