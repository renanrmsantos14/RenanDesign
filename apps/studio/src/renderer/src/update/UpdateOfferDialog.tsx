import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { ReleaseNote, ReleaseNoteKind, UpdateOffer } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { studio } from '../bridge.js';
import { Dialog, DialogHeader } from '../overlay/Dialog.js';
import './update.css';

const SECTIONS: { kind: ReleaseNoteKind; title: StringKey }[] = [
  { kind: 'feature', title: 'update.prompt.feature' },
  { kind: 'fix', title: 'update.prompt.fix' },
  { kind: 'improvement', title: 'update.prompt.improvement' },
];

interface UpdateOfferDialogViewProps {
  offer: UpdateOffer | null;
  onAnswer: (accept: boolean) => void;
  isInline?: boolean;
}

function Section({ title, notes }: { title: StringKey; notes: ReleaseNote[] }): React.JSX.Element {
  return (
    <VStack gap={1.5} as="section">
      <Text type="label" color="secondary" className="update-offer-heading">{t(title)}</Text>
      <ul className="update-offer-list">
        {notes.map((note) => (
          <li key={note.text} className="update-offer-item" data-kind={note.kind}>
            <Text type="body">{note.text}</Text>
          </li>
        ))}
      </ul>
    </VStack>
  );
}

export function UpdateOfferDialogView({ offer, onAnswer, isInline }: UpdateOfferDialogViewProps): React.JSX.Element {
  return (
    <Dialog
      isOpen={offer !== null}
      {...(isInline === undefined ? {} : { isInline })}
      onOpenChange={(isOpen) => {
        if (!isOpen) onAnswer(false);
      }}
      purpose="info"
      width={520}
      data-testid="update-offer-dialog"
    >
      {offer === null ? null : (
        <Layout
          header={
            <DialogHeader
              title={t('update.prompt.title')}
              subtitle={t('update.prompt.versions', { version: offer.version, current: offer.current })}
              hasDivider
            />
          }
          content={
            <LayoutContent padding={4} className="update-offer-content">
              {offer.notes.length === 0 ? (
                <Text type="body" color="secondary">{t('update.prompt.empty')}</Text>
              ) : (
                <VStack gap={4}>
                  {SECTIONS.map(({ kind, title }) => {
                    const notes = offer.notes.filter((note) => note.kind === kind);
                    return notes.length === 0 ? null : <Section key={kind} title={title} notes={notes} />;
                  })}
                </VStack>
              )}
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} vAlign="center">
                <Text type="supporting" color="secondary" className="update-offer-note">{t('update.prompt.restartNote')}</Text>
                <HStack gap={2} hAlign="end" style={{ marginInlineStart: 'auto', flex: '0 0 auto' }}>
                  <Button label={t('update.prompt.later')} variant="secondary" onClick={() => onAnswer(false)} data-testid="update-offer-later" />
                  <Button label={t('update.prompt.now')} variant="primary" onClick={() => onAnswer(true)} data-testid="update-offer-now" />
                </HStack>
              </HStack>
            </LayoutFooter>
          }
        />
      )}
    </Dialog>
  );
}

export function UpdateOfferDialog(): React.JSX.Element {
  const [offer, setOffer] = useState<UpdateOffer | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    const unsubscribe = studio().onUpdateOffer((next) => {
      pushed.current = true;
      setOffer(next);
    });
    void studio().updateOffer().then((snapshot) => {
      if (!pushed.current) setOffer(snapshot);
    });
    return unsubscribe;
  }, []);

  return (
    <UpdateOfferDialogView
      offer={offer}
      onAnswer={(accept) => {
        if (offer === null) return;
        setOffer(null);
        studio().updateAnswer({ version: offer.version, accept });
      }}
    />
  );
}
