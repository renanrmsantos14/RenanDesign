import type { UpdateApplied } from '@studio/events';
import { defineDomain } from '../state/store.js';

interface PendingInstall {
  installing?: string;
}

const domain = defineDomain<PendingInstall>({
  name: 'update-install',
  version: 1,
  fallback: () => ({}),
});

export function appliedUpdate(pending: PendingInstall, running: string): UpdateApplied | null {
  return pending.installing === running ? { version: running } : null;
}

export function recordInstalling(version: string): void {
  if (domain.read().installing === version) return;
  domain.write({ installing: version });
}

/** Read once per launch: the record is cleared whether or not the install took. */
export function takePendingInstall(running: string): UpdateApplied | null {
  const pending = domain.read();
  if (pending.installing === undefined) return null;
  domain.write({});
  return appliedUpdate(pending, running);
}
