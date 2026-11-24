import { t } from '@studio/i18n';
import { LAYER } from '../overlay/layers.js';
import { useAppInfoStore } from './store.js';

const STAMP_DATE = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function VersionStampView({ version, builtAt }: { version: string; builtAt: string }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-testid="version-stamp"
      style={{
        position: 'fixed', insetInlineEnd: 6, bottom: 3, zIndex: LAYER.top,
        fontSize: 10, lineHeight: 1, opacity: 0.45, color: 'var(--color-text-secondary)',
        fontVariantNumeric: 'tabular-nums', pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap',
      }}
    >
      {t('app.version-stamp', { version, date: STAMP_DATE.format(new Date(builtAt)) })}
    </span>
  );
}

export function VersionStamp(): React.JSX.Element | null {
  const version = useAppInfoStore((state) => state.version);
  const builtAt = useAppInfoStore((state) => state.builtAt);
  return version === undefined || builtAt === undefined ? null : <VersionStampView version={version} builtAt={builtAt} />;
}
