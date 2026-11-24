import { describe, expect, it } from 'bun:test';
import { parseReleaseNotes } from './update.js';

describe('parseReleaseNotes', () => {
  it('groups conventional subjects by kind and drops internal ones', () => {
    const notes = parseReleaseNotes([
      '## O que há de novo',
      '',
      '- feat(update): diálogo mostra o que mudou (#10)',
      '- fix(canvas): segurar Ctrl arrasta o Canvas',
      '- perf(canvas): menos redesenhos',
      '- chore(release): 2.0.11',
      '- Primeira versão publicada.',
    ].join('\n'));
    expect(notes).toEqual([
      { kind: 'feature', text: 'Diálogo mostra o que mudou' },
      { kind: 'fix', text: 'Segurar Ctrl arrasta o Canvas' },
      { kind: 'improvement', text: 'Menos redesenhos' },
      { kind: 'improvement', text: 'Primeira versão publicada.' },
    ]);
  });

  it('reads nothing from text without list items', () => {
    expect(parseReleaseNotes('')).toEqual([]);
    expect(parseReleaseNotes('Release 2.0.11')).toEqual([]);
  });
});
