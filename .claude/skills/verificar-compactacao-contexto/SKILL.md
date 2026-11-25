---
name: verificar-compactacao-contexto
description: Verifica o botão Compact context do medidor de contexto e o limite de compactação automática em Settings (Claude e Codex). Use ao mudar UsageMeter, session.compact, session.compacted, settings autoCompactWindow ou reduce.ts compact_boundary.
---

# Verificar compactação de contexto

Rode da raiz, com `PATH=$HOME/.nvm/versions/node/v26.12.1/bin:$PATH`.

1. Testes: `bun run test:unit` (0 fail). Não junte arquivos em um `bun test` único: os mocks de módulo contaminam e geram falhas falsas. Para um arquivo, `bun test <arquivo>` sozinho (`session.test.ts`, `reduce.test.ts`, `state.test.ts`, `autoCompactRow.test.ts`, `ChatPanel.test.tsx`, `session-state.test.ts`).
2. Tipos e regras: `bun run typecheck && bun run check:imports && bun run check:strings` (as strings novas existem em en, ja e zh-CN).
3. Casos de borda cobertos pelos testes: `compact()` recusado com turno ativo ou sessão fechada; `compact_boundary` zera o medidor para `post_tokens`; `CLAUDE_CODE_AUTO_COMPACT_WINDOW` só definida com limite salvo; limite fora de 100k–1M ou decimal (`100000.0`) recusado; vazio limpa o limite.
4. Visual (precisa de GPU/janela): `bun run showroom usage` e `bun run showroom settings`. Abra o popover do medidor: botão "Compact context" desabilitado com motivo durante turno; campo "Auto-compact" em Settings aceita `300000` e `300.000`, mostra erro para `abc`. Em ambiente sem GPU o Electron encerra com "GPU process isn't usable"; registre como não verificado visualmente.
5. `apps/studio/src/main/codex/validate.test.ts` tem timeout conhecido no verify completo: rode sozinho. `scripts/secrets.test.ts` isolado estoura 60 s por rede; passa dentro do `bun run verify`.
