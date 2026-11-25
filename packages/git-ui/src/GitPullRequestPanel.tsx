import type { ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { GitCheckState, GitMergeResult, GitPullRequestCheck, GitPullRequestDetail, GitPullRequestList, GitPrState } from '@studio/events';
import { INERT_BUTTON } from './primitives.js';
import { fill } from './strings.js';

type PullState = 'open' | 'draft' | 'merged' | 'closed';

export interface GitPullRequestPanelStrings {
  heading: string;
  loading: string;
  empty: string;
  failed: string;
  noGithub: string;
  /** `{number}` template. */
  number: string;
  /** `{base}` and `{head}` template. */
  branches: string;
  /** `{passing}` and `{total}` template. */
  checksSummary: string;
  back: string;
  openOnGithub: string;
  state: Record<PullState, string>;
  check: Record<GitCheckState, string>;
  noChecks: string;
  merge: string;
  confirmMerge: string;
  cancel: string;
  merging: string;
  mergeFailed: Record<Exclude<GitMergeResult, { ok: true }>['reason'], string>;
}

export interface GitPullRequestPanelGlyphs {
  pull: Record<PullState, ReactNode>;
  check: Record<GitCheckState, ReactNode>;
  back: ReactNode;
  external: ReactNode;
}

export interface GitMergeFailure {
  number: number;
  reason: Exclude<GitMergeResult, { ok: true }>['reason'];
}

export interface GitPullRequestPanelProps {
  /** Absent while it loads. */
  list?: GitPullRequestList;
  strings: GitPullRequestPanelStrings;
  glyphs: GitPullRequestPanelGlyphs;
  /** The PR whose detail shows; a branch with one PR shows it without asking. */
  selected?: number;
  confirming?: number;
  merging?: number;
  mergeFailure?: GitMergeFailure;
  onSelect: (number: number | undefined) => void;
  onOpen: (url: string) => void;
  onMerge: (number: number) => void;
  onConfirmMerge: (number: number) => void;
  onCancelMerge: () => void;
}

const HUE: Record<PullState | GitCheckState, string> = {
  open: 'var(--studio-git-ready-hue)',
  draft: 'var(--studio-git-neutral-hue)',
  merged: 'var(--studio-git-merged-hue)',
  closed: 'var(--studio-git-error-hue)',
  passing: 'var(--studio-git-ready-hue)',
  failing: 'var(--studio-git-error-hue)',
  pending: 'var(--studio-git-upload-hue)',
  skipped: 'var(--studio-git-neutral-hue)',
};

const MONO = { fontFamily: 'var(--font-family-mono, ui-monospace, monospace)', fontSize: 11 } as const;
const ELLIPSIS = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
const ROW = { ...INERT_BUTTON, cursor: 'pointer', textAlign: 'start', width: '100%', minWidth: 0, borderRadius: 'var(--radius-element)' } as const;
const ICON_BUTTON = { ...INERT_BUTTON, cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 'var(--radius-element)', color: 'var(--color-text-secondary)' } as const;
const CELL = { padding: 'var(--spacing-1) var(--spacing-1-5)' } as const;
const HOVER_HREF = 'git-pr-panel-hover';

function pullStateOf(state: GitPrState, isDraft: boolean): PullState {
  if (state === 'MERGED') return 'merged';
  if (state === 'CLOSED') return 'closed';
  return isDraft ? 'draft' : 'open';
}

function Glyph({ hue, children }: { hue: string; children: ReactNode }): React.JSX.Element {
  return <span aria-hidden="true" style={{ display: 'flex', flex: '0 0 auto', color: hue }}>{children}</span>;
}

function Diff({ pull }: { pull: GitPullRequestDetail }): React.JSX.Element {
  return (
    <span style={{ ...MONO, flex: '0 0 auto', display: 'flex', gap: 4 }}>
      <span style={{ color: 'var(--studio-git-ready-hue)' }}>+{pull.additions.toLocaleString()}</span>
      <span style={{ color: 'var(--studio-git-error-hue)' }}>-{pull.deletions.toLocaleString()}</span>
    </span>
  );
}

function Branches({ pull, strings }: { pull: GitPullRequestDetail; strings: GitPullRequestPanelStrings }): React.JSX.Element {
  return <span style={{ ...MONO, ...ELLIPSIS, color: 'var(--color-text-secondary)' }}>{fill(strings.branches, { base: pull.baseRefName, head: pull.headRefName })}</span>;
}

function PullRow({ pull, props }: { pull: GitPullRequestDetail; props: GitPullRequestPanelProps }): React.JSX.Element {
  const state = pullStateOf(pull.state, pull.isDraft);
  return (
    <HStack as="button" className="git-pr-panel-row" gap={2} vAlign="start" onClick={() => props.onSelect(pull.number)} style={{ ...ROW, padding: 'var(--spacing-2)' }} data-testid="git-pr-panel-pull" data-number={pull.number}>
      <span style={{ paddingTop: 2 }}><Glyph hue={HUE[state]}>{props.glyphs.pull[state]}</Glyph></span>
      <VStack gap={0.5} style={{ flex: '1 1 auto', minWidth: 0 }}>
        <HStack gap={1.5} vAlign="center">
          <Text type="supporting" color="secondary" style={{ flex: '0 0 auto' }}>{fill(props.strings.number, { number: pull.number })}</Text>
          <Text type="body" weight="medium" color="primary" style={{ ...ELLIPSIS, flex: '1 1 auto' }}>{pull.title}</Text>
          <Diff pull={pull} />
        </HStack>
        <HStack gap={1.5} vAlign="center" style={{ minWidth: 0 }}>
          <Text type="supporting" color="secondary" style={{ flex: '0 0 auto' }}>{pull.author}</Text>
          <Branches pull={pull} strings={props.strings} />
        </HStack>
      </VStack>
    </HStack>
  );
}

function CheckRow({ check, props }: { check: GitPullRequestCheck; props: GitPullRequestPanelProps }): React.JSX.Element {
  const { url } = check;
  const body = (
    <>
      <Glyph hue={HUE[check.state]}>{props.glyphs.check[check.state]}</Glyph>
      <Text type="supporting" color="primary" style={{ ...ELLIPSIS, flex: '1 1 auto' }}>{check.name}</Text>
      <Text type="supporting" color="secondary" style={{ flex: '0 0 auto' }}>{props.strings.check[check.state]}</Text>
    </>
  );
  return url === undefined ? (
    <HStack gap={2} vAlign="center" data-testid="git-pr-panel-check" data-state={check.state} style={{ ...CELL, minWidth: 0 }}>{body}</HStack>
  ) : (
    <HStack as="button" className="git-pr-panel-row" gap={2} vAlign="center" data-testid="git-pr-panel-check" data-state={check.state} onClick={() => props.onOpen(url)} style={{ ...ROW, ...CELL }}>{body}</HStack>
  );
}

function checksRollup(checks: GitPullRequestCheck[]): GitCheckState {
  if (checks.some((check) => check.state === 'failing')) return 'failing';
  if (checks.some((check) => check.state === 'pending')) return 'pending';
  return 'passing';
}

function MergeControls({ number, props }: { number: number; props: GitPullRequestPanelProps }): React.JSX.Element {
  const { strings } = props;
  const isMerging = props.merging === number;
  if (props.confirming !== number && !isMerging) {
    return <Button label={strings.merge} variant="primary" size="sm" isDisabled={props.merging !== undefined} onClick={() => props.onMerge(number)} data-testid="git-pr-panel-merge" style={{ width: '100%' }} />;
  }
  return (
    <HStack gap={2}>
      <Button label={strings.cancel} variant="secondary" size="sm" isDisabled={isMerging} onClick={props.onCancelMerge} data-testid="git-pr-panel-cancel" style={{ flex: 1 }} />
      <Button label={isMerging ? strings.merging : strings.confirmMerge} variant="primary" size="sm" isDisabled={isMerging} onClick={() => props.onConfirmMerge(number)} data-testid="git-pr-panel-confirm" style={{ flex: 1 }} />
    </HStack>
  );
}

function StateBadge({ state, props }: { state: PullState; props: GitPullRequestPanelProps }): React.JSX.Element {
  const hue = HUE[state];
  return (
    <HStack
      gap={1}
      vAlign="center"
      data-testid="git-pr-panel-state"
      style={{ padding: '2px 8px', borderRadius: 999, color: hue, border: `1px solid color-mix(in srgb, ${hue} 45%, transparent)`, background: `color-mix(in srgb, ${hue} 14%, transparent)` }}
    >
      <Glyph hue="inherit">{props.glyphs.pull[state]}</Glyph>
      <Text type="supporting" weight="medium" style={{ color: 'inherit' }}>{props.strings.state[state]}</Text>
    </HStack>
  );
}

function PullDetail({ pull, canGoBack, props }: { pull: GitPullRequestDetail; canGoBack: boolean; props: GitPullRequestPanelProps }): React.JSX.Element {
  const { strings, glyphs } = props;
  const passing = pull.checks.filter((check) => check.state === 'passing' || check.state === 'skipped').length;
  const rollup = checksRollup(pull.checks);
  const failure = props.mergeFailure?.number === pull.number ? props.mergeFailure.reason : undefined;
  return (
    <VStack gap={2} data-testid="git-pr-panel-detail" data-number={pull.number} style={{ padding: 'var(--spacing-1)' }}>
      <HStack gap={1} vAlign="center">
        {canGoBack ? (
          <button type="button" className="git-pr-panel-row" aria-label={strings.back} onClick={() => props.onSelect(undefined)} style={ICON_BUTTON} data-testid="git-pr-panel-back">{glyphs.back}</button>
        ) : null}
        <Text type="supporting" color="secondary">{fill(strings.number, { number: pull.number })}</Text>
        <button type="button" className="git-pr-panel-row" aria-label={strings.openOnGithub} onClick={() => props.onOpen(pull.url)} style={ICON_BUTTON} data-testid="git-pr-panel-open">{glyphs.external}</button>
        <span style={{ flex: '1 1 auto' }} />
        <StateBadge state={pullStateOf(pull.state, pull.isDraft)} props={props} />
      </HStack>
      <Text type="body" weight="semibold" color="primary" style={{ fontSize: 15, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{pull.title}</Text>
      <HStack gap={2} vAlign="center" style={{ minWidth: 0 }}>
        <Text type="supporting" color="secondary" style={{ flex: '0 0 auto' }}>{pull.author}</Text>
        <Branches pull={pull} strings={strings} />
        <span style={{ flex: '1 1 auto' }} />
        <Diff pull={pull} />
      </HStack>
      <VStack gap={0.5} style={{ borderTop: '0.5px solid var(--studio-git-menu-border)', paddingTop: 'var(--spacing-2)' }}>
        {pull.checks.length === 0 ? (
          <Text type="supporting" color="secondary" style={CELL}>{strings.noChecks}</Text>
        ) : (
          <>
            <HStack gap={2} vAlign="center" style={CELL} data-testid="git-pr-panel-checks-summary">
              <Glyph hue={HUE[rollup]}>{glyphs.check[rollup]}</Glyph>
              <Text type="supporting" weight="medium" color="primary">{fill(strings.checksSummary, { passing, total: pull.checks.length })}</Text>
            </HStack>
            {pull.checks.map((check, index) => <CheckRow key={`${check.name}-${String(index)}`} check={check} props={props} />)}
          </>
        )}
      </VStack>
      {failure === undefined ? null : (
        <Text type="supporting" style={{ color: 'var(--studio-git-error-hue)' }} data-testid="git-pr-panel-merge-failed">{strings.mergeFailed[failure]}</Text>
      )}
      {pull.canMerge ? <MergeControls number={pull.number} props={props} /> : null}
    </VStack>
  );
}

function Notice({ text }: { text: string }): React.JSX.Element {
  return <Text type="supporting" color="secondary" data-testid="git-pr-panel-notice" style={{ padding: 'var(--spacing-2)' }}>{text}</Text>;
}

function Body(props: GitPullRequestPanelProps): React.ReactNode {
  const { list, strings } = props;
  if (list === undefined) return <Notice text={strings.loading} />;
  if (!list.ok) return <Notice text={list.reason === 'no-github' ? strings.noGithub : strings.failed} />;
  if (list.pulls.length === 0) return <Notice text={strings.empty} />;
  const only = list.pulls.length === 1 ? list.pulls[0] : undefined;
  const pull = only ?? list.pulls.find((candidate) => candidate.number === props.selected);
  if (pull !== undefined) return <PullDetail pull={pull} canGoBack={only === undefined} props={props} />;
  return (
    <>
      <Text type="supporting" color="secondary" style={{ padding: 'var(--spacing-1) var(--spacing-2)' }}>{strings.heading}</Text>
      {list.pulls.map((candidate) => <PullRow key={candidate.number} pull={candidate} props={props} />)}
    </>
  );
}

export function GitPullRequestPanel(props: GitPullRequestPanelProps): React.JSX.Element {
  return (
    <VStack
      role="dialog"
      aria-label={props.strings.heading}
      data-testid="git-pr-panel"
      gap={0.5}
      style={{
        padding: 'var(--spacing-1-5)',
        background: 'var(--studio-git-menu-fill)',
        border: '0.5px solid var(--studio-git-menu-border)',
        borderRadius: 'var(--radius-element)',
        width: 400,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'min(520px, calc(100vh - 56px))',
        overflowY: 'auto',
      }}
    >
      <style href={HOVER_HREF} precedence="medium">{`.git-pr-panel-row:hover { background: var(--color-background-gray); }`}</style>
      <Body {...props} />
    </VStack>
  );
}
