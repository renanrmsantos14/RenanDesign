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
  /** `{number}` and `{title}` template. */
  title: string;
  /** `{base}` template. */
  base: string;
  state: Record<PullState, string>;
  check: Record<GitCheckState, string>;
  noChecks: string;
  merge: string;
  confirmMerge: string;
  cancel: string;
  merging: string;
  mergeFailed: Record<Exclude<GitMergeResult, { ok: true }>['reason'], string>;
}

export interface GitMergeFailure {
  number: number;
  reason: Exclude<GitMergeResult, { ok: true }>['reason'];
}

export interface GitPullRequestPanelProps {
  /** Absent while it loads. */
  list?: GitPullRequestList;
  strings: GitPullRequestPanelStrings;
  confirming?: number;
  merging?: number;
  mergeFailure?: GitMergeFailure;
  onOpen: (url: string) => void;
  onMerge: (number: number) => void;
  onConfirmMerge: (number: number) => void;
  onCancelMerge: () => void;
}

const CHECK_HUE: Record<GitCheckState, string> = {
  passing: 'var(--studio-git-ready-hue)',
  failing: 'var(--studio-git-error-hue)',
  pending: 'var(--studio-git-upload-hue)',
  skipped: 'var(--studio-git-neutral-hue)',
};

const STATE_HUE: Record<PullState, string> = {
  open: 'var(--studio-git-ready-hue)',
  draft: 'var(--studio-git-neutral-hue)',
  merged: 'var(--studio-git-merged-hue)',
  closed: 'var(--studio-git-error-hue)',
};

function pullStateOf(state: GitPrState, isDraft: boolean): PullState {
  if (state === 'MERGED') return 'merged';
  if (state === 'CLOSED') return 'closed';
  return isDraft ? 'draft' : 'open';
}

const ROW_LINK = { ...INERT_BUTTON, cursor: 'pointer', textAlign: 'start', width: '100%', minWidth: 0 } as const;

function Dot({ color }: { color: string }): React.JSX.Element {
  return <span aria-hidden="true" style={{ flex: '0 0 auto', width: 8, height: 8, borderRadius: '50%', background: color }} />;
}

function Pull({ pull, props }: { pull: GitPullRequestDetail; props: GitPullRequestPanelProps }): React.JSX.Element {
  const { strings } = props;
  const state = pullStateOf(pull.state, pull.isDraft);
  const failure = props.mergeFailure?.number === pull.number ? props.mergeFailure.reason : undefined;
  return (
    <VStack gap={1.5} data-testid="git-pr-panel-pull" data-number={pull.number} style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-element)', background: 'var(--color-background-gray)' }}>
      <HStack as="button" gap={2} vAlign="center" onClick={() => props.onOpen(pull.url)} style={ROW_LINK} data-testid="git-pr-panel-open">
        <Text type="body" weight="medium" color="primary" style={{ flex: '1 1 auto', minWidth: 0, overflowWrap: 'anywhere' }}>
          {fill(strings.title, { number: pull.number, title: pull.title })}
        </Text>
        <HStack gap={1} vAlign="center" style={{ flex: '0 0 auto' }}>
          <Dot color={STATE_HUE[state]} />
          <Text type="supporting" color="secondary">{strings.state[state]}</Text>
        </HStack>
      </HStack>
      <Text type="supporting" color="secondary">{fill(strings.base, { base: pull.baseRefName })}</Text>
      {pull.checks.length === 0 ? (
        <Text type="supporting" color="secondary">{strings.noChecks}</Text>
      ) : (
        <VStack gap={0.5}>
          {pull.checks.map((check, index) => (
            <Check key={`${check.name}-${String(index)}`} check={check} label={strings.check[check.state]} onOpen={props.onOpen} />
          ))}
        </VStack>
      )}
      {failure === undefined ? null : (
        <Text type="supporting" style={{ color: 'var(--studio-git-error-hue)' }} data-testid="git-pr-panel-merge-failed">{strings.mergeFailed[failure]}</Text>
      )}
      {pull.canMerge ? <MergeControls number={pull.number} props={props} /> : null}
    </VStack>
  );
}

function Check({ check, label, onOpen }: { check: GitPullRequestCheck; label: string; onOpen: (url: string) => void }): React.JSX.Element {
  const { url } = check;
  const body = (
    <>
      <Dot color={CHECK_HUE[check.state]} />
      <Text type="supporting" color="primary" maxLines={1} style={{ flex: '1 1 auto', minWidth: 0 }}>{check.name}</Text>
      <Text type="supporting" color="secondary" style={{ flex: '0 0 auto' }}>{label}</Text>
    </>
  );
  return url === undefined ? (
    <HStack gap={2} vAlign="center" data-testid="git-pr-panel-check" data-state={check.state} style={{ minWidth: 0 }}>{body}</HStack>
  ) : (
    <HStack as="button" gap={2} vAlign="center" data-testid="git-pr-panel-check" data-state={check.state} onClick={() => onOpen(url)} style={ROW_LINK}>{body}</HStack>
  );
}

function MergeControls({ number, props }: { number: number; props: GitPullRequestPanelProps }): React.JSX.Element {
  const { strings } = props;
  const isMerging = props.merging === number;
  if (props.confirming !== number && !isMerging) {
    return (
      <HStack justify="end">
        <Button label={strings.merge} variant="secondary" size="sm" isDisabled={props.merging !== undefined} onClick={() => props.onMerge(number)} data-testid="git-pr-panel-merge" />
      </HStack>
    );
  }
  return (
    <HStack gap={2} justify="end">
      <Button label={strings.cancel} variant="ghost" size="sm" isDisabled={isMerging} onClick={props.onCancelMerge} data-testid="git-pr-panel-cancel" />
      <Button label={isMerging ? strings.merging : strings.confirmMerge} variant="primary" size="sm" isDisabled={isMerging} onClick={() => props.onConfirmMerge(number)} data-testid="git-pr-panel-confirm" />
    </HStack>
  );
}

function Notice({ text }: { text: string }): React.JSX.Element {
  return <Text type="supporting" color="secondary" data-testid="git-pr-panel-notice" style={{ padding: 'var(--spacing-2)' }}>{text}</Text>;
}

export function GitPullRequestPanel(props: GitPullRequestPanelProps): React.JSX.Element {
  const { list, strings } = props;
  const body = (() => {
    if (list === undefined) return <Notice text={strings.loading} />;
    if (!list.ok) return <Notice text={list.reason === 'no-github' ? strings.noGithub : strings.failed} />;
    if (list.pulls.length === 0) return <Notice text={strings.empty} />;
    return list.pulls.map((pull) => <Pull key={pull.number} pull={pull} props={props} />);
  })();
  return (
    <VStack
      role="dialog"
      aria-label={strings.heading}
      data-testid="git-pr-panel"
      gap={1}
      style={{
        padding: 'var(--spacing-1-5)',
        background: 'var(--studio-git-menu-fill)',
        border: '0.5px solid var(--studio-git-menu-border)',
        borderRadius: 'var(--radius-element)',
        width: 340,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'min(480px, calc(100vh - 56px))',
        overflowY: 'auto',
      }}
    >
      <Text type="supporting" color="secondary" style={{ paddingInline: 'var(--spacing-1)', paddingBlock: 'var(--spacing-0-5)' }}>{strings.heading}</Text>
      {body}
    </VStack>
  );
}
