/** `up-to-date` is transient: main returns to `idle` on its own, so a surface keeps no timer for it (ONL-1844). */
export type UpdateStatus =
  | 'unsupported'
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  version?: string;
  percent?: number;
  message?: string;
  restarting?: boolean;
  /** The user asked for this check: `checking` and `up-to-date` earn a pill only then (ONL-2620). */
  requested?: boolean;
}

export const IDLE_UPDATE_STATE: UpdateState = { status: 'idle' };

export type ReleaseNoteKind = 'feature' | 'fix' | 'improvement';

export interface ReleaseNote {
  kind: ReleaseNoteKind;
  text: string;
}

export interface UpdateOffer {
  version: string;
  current: string;
  notes: ReleaseNote[];
}

/** The version a restart-to-update installed, handed to the first Tab that asks after the relaunch. */
export interface UpdateApplied {
  version: string;
}

export interface UpdateAnswer {
  version: string;
  accept: boolean;
}

const CONVENTIONAL = /^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/;
const INTERNAL_TYPES = new Set(['chore', 'ci', 'build', 'test', 'docs', 'refactor', 'style', 'spike']);

/** Reads the `- type(scope): subject` lines the release workflow writes into the feed's `releaseNotes`. */
export function parseReleaseNotes(markdown: string): ReleaseNote[] {
  return markdown.split('\n').flatMap((line): ReleaseNote[] => {
    const item = /^\s*[-*]\s+(.+)$/.exec(line)?.[1]?.trim();
    if (!item) return [];
    const match = CONVENTIONAL.exec(item);
    const type = match?.[1]?.toLowerCase();
    if (type !== undefined && INTERNAL_TYPES.has(type)) return [];
    const text = (match?.[2] ?? item).replace(/\s*\(#\d+\)$/, '').trim();
    if (!text) return [];
    const kind: ReleaseNoteKind = type === 'feat' ? 'feature' : type === 'fix' ? 'fix' : 'improvement';
    return [{ kind, text: text.charAt(0).toUpperCase() + text.slice(1) }];
  });
}
