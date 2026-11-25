import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { UpdateOffer, UpdateStatus } from '@studio/events';
import { t } from '@studio/i18n';
import { UpdateOfferDialogView, updatePhase } from './UpdateOfferDialog.js';

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

describe('the update once accepted', () => {
  it('follows the download into the install, and calls anything else a stop', () => {
    const phases = (['available', 'downloading', 'downloaded', 'idle', 'error'] as UpdateStatus[]).map((status) => updatePhase({ status }));
    expect(phases).toEqual(['downloading', 'downloading', 'installing', 'failed', 'failed']);
  });

  it('shows the download with its percent and a way to hide it', () => {
    const markup = renderToStaticMarkup(<UpdateOfferDialogView offer={null} progress={{ version: '2.0.11', phase: 'downloading', percent: 42 }} isInline onAnswer={() => {}} />);
    expect(markup).toContain(t('update.progress.downloading'));
    expect(markup).toContain('data-testid="update-progress-bar"');
    expect(markup).toContain('data-testid="update-progress-close"');
  });

  it('says the app is closing to install and reopening, with nothing to press', () => {
    const markup = renderToStaticMarkup(<UpdateOfferDialogView offer={null} progress={{ version: '2.0.11', phase: 'installing', percent: 100 }} isInline onAnswer={() => {}} />);
    expect(markup).toContain(t('update.progress.installing'));
    expect(markup).toContain(t('update.progress.installingDetail', { version: '2.0.11' }));
    expect(markup).not.toContain('data-testid="update-progress-close"');
  });

  it('says a stopped update will be offered again', () => {
    const markup = renderToStaticMarkup(<UpdateOfferDialogView offer={null} progress={{ version: '2.0.11', phase: 'failed', percent: 0 }} isInline onAnswer={() => {}} />);
    expect(markup).toContain(t('update.progress.failedDetail'));
    expect(markup).not.toContain('data-testid="update-progress-bar"');
  });
});
