import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from '@astryxdesign/core/Layout';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Text } from '@astryxdesign/core/Text';
import { type ReleaseNote, type ReleaseNoteKind, type UpdateOffer, type UpdateState } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { studio } from '../bridge.js';
import { Dialog, DialogHeader } from '../overlay/Dialog.js';
import './update.css';

const SECTIONS: { kind: ReleaseNoteKind; title: StringKey }[] = [
  { kind: 'feature', title: 'update.prompt.feature' },
  { kind: 'fix', title: 'update.prompt.fix' },
  { kind: 'improvement', title: 'update.prompt.improvement' },
];

export type UpdatePhase = 'downloading' | 'installing' | 'failed';

interface UpdateProgress {
  version: string;
  phase: UpdatePhase;
  percent: number;
}

/** After the designer accepts, the offer was `available`; landing anywhere but download or downloaded means it stopped. */
export function updatePhase(state: UpdateState): UpdatePhase {
  if (state.status === 'downloaded') return 'installing';
  if (state.status === 'available' || state.status === 'downloading' || state.status === 'checking') return 'downloading';
  return 'failed';
}

const PHASE_TITLE: Record<UpdatePhase, StringKey> = {
  downloading: 'update.progress.downloading',
  installing: 'update.progress.installing',
  failed: 'update.progress.failed',
};

interface UpdateOfferDialogViewProps {
  offer: UpdateOffer | null;
  progress?: UpdateProgress | null;
  onAnswer: (accept: boolean) => void;
  onClose?: () => void;
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

function ProgressLayout({ progress, onClose }: { progress: UpdateProgress; onClose: () => void }): React.JSX.Element {
  const { phase, version, percent } = progress;
  return (
    <Layout
      header={<DialogHeader title={t(PHASE_TITLE[phase])} subtitle={t('update.progress.version', { version })} hasDivider />}
      content={
        <LayoutContent padding={4}>
          <VStack gap={3}>
            {phase === 'failed' ? null : (
              <ProgressBar
                label={t('update.progress.bar')}
                isLabelHidden
                value={percent}
                hasValueLabel={phase === 'downloading'}
                isIndeterminate={phase === 'installing'}
                data-testid="update-progress-bar"
              />
            )}
            <Text type="body" color="secondary">
              {phase === 'downloading'
                ? t('update.progress.downloadingDetail')
                : phase === 'installing'
                  ? t('update.progress.installingDetail', { version })
                  : t('update.progress.failedDetail')}
            </Text>
          </VStack>
        </LayoutContent>
      }
      footer={
        phase === 'installing' ? undefined : (
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end">
              <Button
                label={t(phase === 'failed' ? 'update.progress.close' : 'update.progress.hide')}
                variant="secondary"
                onClick={onClose}
                data-testid="update-progress-close"
              />
            </HStack>
          </LayoutFooter>
        )
      }
    />
  );
}

export function UpdateOfferDialogView({ offer, progress = null, onAnswer, onClose = () => {}, isInline }: UpdateOfferDialogViewProps): React.JSX.Element {
  return (
    <Dialog
      isOpen={offer !== null || progress !== null}
      {...(isInline === undefined ? {} : { isInline })}
      onOpenChange={(isOpen) => {
        if (isOpen) return;
        if (progress !== null) {
          if (progress.phase !== 'installing') onClose();
          return;
        }
        onAnswer(false);
      }}
      purpose="info"
      width={520}
      data-testid={progress === null ? 'update-offer-dialog' : 'update-progress-dialog'}
      data-update-phase={progress?.phase}
    >
      {progress !== null ? <ProgressLayout progress={progress} onClose={onClose} /> : offer === null ? null : (
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

/** `null` until main answers: the state before that is not a verdict. */
function useUpdateState(isWatching: boolean): UpdateState | null {
  const [state, setState] = useState<UpdateState | null>(null);
  useEffect(() => {
    if (!isWatching) return undefined;
    let pushed = false;
    const unsubscribe = studio().onUpdateState((next) => {
      pushed = true;
      setState(next);
    });
    void studio().updateStatus().then((snapshot) => {
      if (!pushed) setState(snapshot);
    });
    return () => {
      unsubscribe();
      setState(null);
    };
  }, [isWatching]);
  return state;
}

export function UpdateOfferDialog(): React.JSX.Element {
  const [offer, setOffer] = useState<UpdateOffer | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [hidden, setHidden] = useState<UpdatePhase | null>(null);
  const pushed = useRef(false);
  const state = useUpdateState(accepted !== null);

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

  const phase = state === null ? 'downloading' : updatePhase(state);
  const progress: UpdateProgress | null = accepted === null || hidden === phase
    ? null
    : { version: accepted, phase, percent: state?.percent ?? 0 };

  return (
    <UpdateOfferDialogView
      offer={offer}
      progress={progress}
      onClose={() => {
        if (phase === 'failed') {
          setAccepted(null);
          setHidden(null);
        } else setHidden(phase);
      }}
      onAnswer={(accept) => {
        if (offer === null) return;
        setOffer(null);
        if (accept) {
          setAccepted(offer.version);
          setHidden(null);
        }
        studio().updateAnswer({ version: offer.version, accept });
      }}
    />
  );
}
