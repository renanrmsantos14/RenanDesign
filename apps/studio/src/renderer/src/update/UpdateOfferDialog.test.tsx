import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { UpdateOffer } from '@studio/events';
import { t } from '@studio/i18n';
import { UpdateOfferDialogView } from './UpdateOfferDialog.js';

const OFFER: UpdateOffer = {
  version: '2.0.11',
  current: '2.0.10',
  notes: [
    { kind: 'fix', text: 'Holding Ctrl pans the Canvas' },
    { kind: 'feature', text: 'The update dialog lists what changed' },
  ],
};

describe('the update offer', () => {
  it('stays closed without an offer', () => {
    expect(renderToStaticMarkup(<UpdateOfferDialogView offer={null} isInline onAnswer={() => {}} />)).toBe('');
  });

  it('lists the changes under their headings, new things first', () => {
    const markup = renderToStaticMarkup(<UpdateOfferDialogView offer={OFFER} isInline onAnswer={() => {}} />);
    expect(markup).toContain(t('update.prompt.versions', { version: '2.0.11', current: '2.0.10' }));
    expect(markup.indexOf(t('update.prompt.feature'))).toBeLessThan(markup.indexOf(t('update.prompt.fix')));
    expect(markup.indexOf('The update dialog lists what changed')).toBeLessThan(markup.indexOf('Holding Ctrl pans the Canvas'));
    expect(markup).not.toContain(t('update.prompt.improvement'));
    expect(markup).toContain('data-testid="update-offer-now"');
    expect(markup).toContain('data-testid="update-offer-later"');
  });

  it('says so when a version has no listed changes', () => {
    const markup = renderToStaticMarkup(<UpdateOfferDialogView offer={{ ...OFFER, notes: [] }} isInline onAnswer={() => {}} />);
    expect(markup).toContain(t('update.prompt.empty'));
  });
});
