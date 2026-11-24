import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import electron, { app } from 'electron';
import { handle, on } from '../ipc/bridge.js';
import { IPC_EMIT, IPC_INVOKE, IPC_SEND, parseReleaseNotes, type UpdateAnswer, type UpdateOffer, type UpdateState } from '@studio/events';
import type { AppUpdater, UpdateInfo } from 'electron-updater';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { reportUpdateFailure } from './check.js';
import { createUpdateSession } from './session.js';
import { installUpdateProof } from './proof.js';
import { UpdateMachine } from './machine.js';
import { log } from '../log/index.js';
import { capabilities } from '../cloud/capabilities.js';
import { SELF_UPDATE } from '../build-kind.js';
import { isMac } from '../env/platform.js';
import { devSwitches } from '../env/dev-switches.js';
import { dialogParent } from '../window/host.js';

const logger = log('updater');

/** Matches the placeholder `publish.url` in electron-builder.yml; `.invalid` never resolves (RFC 2606). */
const PLACEHOLDER_HOST = '.invalid';

/** electron-updater's messages carry a stack with absolute in-bundle paths; only the first line crosses IPC. */
const firstLine = (message: string): string => message.split('\n')[0] ?? message;

const listeners = new Set<(next: UpdateState) => void>();

const machine = new UpdateMachine({
  waitForNativeStage: isMac(),
  ...(SELF_UPDATE ? { checkIntervalMs: 2 * 60 * 1000 } : {}),
  onInstallFailure: (error) => {
    logger.warn('install failed', { error });
    reportUpdateFailure('install', error);
  },
  emit: (next) => {
    broadcastToRenderers(IPC_EMIT.updateState, next);
    for (const listener of listeners) listener(next);
  },
});

let session: ReturnType<typeof createUpdateSession> | undefined;
/** Awaited by `checkForUpdatesNow`, so a click during startup still lands. */
let wiring: Promise<void> | undefined;

export function updateState(): UpdateState {
  return machine.current();
}

export function onUpdateStateChange(listener: (next: UpdateState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loudlyOff(reason: string, detail: string[]): void {
  logger.info('auto-update is off; this build will not update itself', { reason, detail: detail.join(' ') });
  machine.unsupported(reason);
}

interface FeedConfig {
  provider?: string;
  url?: string;
}

function readFeedConfig(): FeedConfig | undefined {
  const path = join(process.resourcesPath, 'app-update.yml');
  try {
    const raw = readFileSync(path, 'utf8');
    return {
      provider: raw.match(/^provider:\s*(.+)$/m)?.[1]?.trim(),
      url: raw.match(/^url:\s*(.+)$/m)?.[1]?.trim(),
    };
  } catch {
    return undefined;
  }
}

/** Called before `createWindow()`: the renderer asks `update:status` at mount. */
export function registerUpdaterHandlers(): void {
  handle(IPC_INVOKE.updateStatus, (): UpdateState => machine.current());
  on(IPC_SEND.updateRestart, () => restartToUpdate());
  on(IPC_SEND.updateCheck, () => void checkForUpdatesNow());
  handle(IPC_INVOKE.updateOffer, (): UpdateOffer | null => pending?.offer ?? null);
  on(IPC_SEND.updateAnswer, (_event, answer: UpdateAnswer | undefined) => {
    if (typeof answer?.version !== 'string' || typeof answer.accept !== 'boolean') return;
    answerOffer(answer);
  });
}

export function initAutoUpdater(): void {
  if (!capabilities().updates) {
    machine.unsupported('Source builds do not update themselves.');
    return;
  }
  session = installUpdateProof(machine);
  if (session) return;
  if (devSwitches.autoUpdate === '0') {
    logger.info('disabled by STUDIO_AUTO_UPDATE=0');
    machine.unsupported('Auto-update is disabled by STUDIO_AUTO_UPDATE=0.');
    return;
  }

  if (!app.isPackaged) {
    logger.info('skipped: not a packaged build');
    machine.unsupported('This is a development build and does not update itself.');
    return;
  }

  const feed = readFeedConfig();

  if (!feed?.url) {
    loudlyOff('No app-update.yml in the app bundle.', [
      'electron-builder writes it from `publish:` in electron-builder.yml.',
      'If that block was removed, updates cannot be delivered at all.',
    ]);
    return;
  }

  if (feed.provider !== 'generic') {
    loudlyOff(`Refusing to run against the "${feed.provider}" provider.`, [
      'Only the generic provider is allowed. The github provider embeds a',
      'token in the shipped app when the repo is private — every recipient',
      'of the DMG would have it. Fix publish: in electron-builder.yml.',
    ]);
    return;
  }

  if (feed.url.includes(PLACEHOLDER_HOST)) {
    loudlyOff('The update feed URL is still the placeholder.', [
      `  ${feed.url}`,
      '',
      'To turn updates on: stand up a static host, point publish.url in',
      'apps/studio/electron-builder.yml at it, and upload the .zip plus',
      'latest-mac.yml from each cut.',
    ]);
    return;
  }

  wiring = wire(feed.url);
}

/** `import { autoUpdater }` typechecks but resolves to undefined (a CJS getter the module lexer cannot see); only the default export carries it. */
async function loadAutoUpdater(): Promise<AppUpdater> {
  const mod = await import('electron-updater');
  const viaDefault = (mod as unknown as { default?: { autoUpdater?: AppUpdater } }).default
    ?.autoUpdater;
  const resolved = viaDefault ?? mod.autoUpdater;
  if (resolved == null) {
    throw new Error(
      'electron-updater exposed no autoUpdater on either the default or named export',
    );
  }
  return resolved;
}

async function wire(url: string): Promise<void> {
  let autoUpdater: AppUpdater;

  // Covers bringing the machinery up only; a check inside it turns an offline launch into `unsupported` (ONL-1844).
  try {
    autoUpdater = await loadAutoUpdater();

    session = createUpdateSession(autoUpdater, machine, isMac() ? electron.autoUpdater : undefined, undefined, undefined, SELF_UPDATE ? askToUpdate : undefined);
    logger.info('enabled', { url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('could not initialise', { error });
    machine.unsupported(firstLine(message));
    return;
  }

  // `checkForUpdatesAndNotify` adds an OS notification that fires about hourly at our push cadence (ONL-2013).
  machine.startPeriodicChecks(() => void session?.check());
  app.on('before-quit', () => machine.stopPeriodicChecks());

  void session.check();
}

let pending: { offer: UpdateOffer; resolve: (accept: boolean) => void } | undefined;

function notesOf(info: UpdateInfo): string {
  if (typeof info.releaseNotes === 'string') return info.releaseNotes;
  return (info.releaseNotes ?? []).map((entry) => entry.note ?? '').join('\n');
}

/** Answered by the Tab's update dialog; every Tab shows the same offer, and the first answer settles it. */
function askToUpdate(info: UpdateInfo): Promise<boolean> {
  const offer: UpdateOffer = { version: info.version, current: app.getVersion(), notes: parseReleaseNotes(notesOf(info)) };
  logger.info('asking to update', { version: offer.version, notes: offer.notes.length });
  pending?.resolve(false);
  const parent = dialogParent();
  if (parent) {
    if (parent.isMinimized()) parent.restore();
    parent.focus();
  }
  return new Promise((resolve) => {
    pending = { offer, resolve };
    broadcastToRenderers(IPC_EMIT.updateOfferChanged, offer);
  });
}

function answerOffer({ version, accept }: UpdateAnswer): void {
  if (pending?.offer.version !== version) return;
  const { resolve } = pending;
  pending = undefined;
  broadcastToRenderers(IPC_EMIT.updateOfferChanged, null);
  logger.info('update answered', { version, accept });
  resolve(accept);
}

export async function checkForUpdatesNow(): Promise<void> {
  await wiring;

  const state = machine.current();
  if (!session) {
    logger.info('check refused', { reason: state.message ?? 'no updater' });
    machine.refusedCheck();
    return;
  }
  await session.check(true);
}

export function restartToUpdate(): void {
  const instance = session;
  if (instance === undefined) {
    logger.info('restart refused: no updater');
    return;
  }
  instance.restart();
}
