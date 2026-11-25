import type {
  GitCheckState,
  GitMeasurement,
  GitMergeResult,
  GitPrState,
  GitPullRequestCheck,
  GitPullRequestDetail,
  GitPullRequestList,
} from '@studio/events';
import { gh, type GhRunner } from './gh.js';
import { FAILING_CONCLUSIONS } from './github/gh-reader.js';
import { log } from '../log/index.js';

const logger = log('git-status');

const MERGEABLE_STATES = new Set(['CLEAN', 'UNSTABLE', 'HAS_HOOKS']);
const SKIPPED = new Set(['SKIPPED', 'NEUTRAL', 'STALE']);
const PR_URL = /github\.com\/([^/]+\/[^/]+)\/pull\/\d+/;

interface RawCheck {
  __typename?: string;
  name?: string;
  workflowName?: string;
  status?: string;
  conclusion?: string | null;
  detailsUrl?: string;
  context?: string;
  state?: string;
  targetUrl?: string;
}

interface RawPull {
  number: number;
  title: string;
  url: string;
  state: GitPrState;
  isDraft: boolean;
  baseRefName: string;
  headRefName: string;
  author?: { login?: string } | null;
  additions?: number;
  deletions?: number;
  mergeStateStatus: string;
  statusCheckRollup?: RawCheck[] | null;
  headRepositoryOwner?: { login?: string } | null;
}

/** The PR the pill measured names the repository it lives in, which for a fork is the parent, not `origin`. */
export function pullRequestRepo(measurement: GitMeasurement): string | undefined {
  const fromPr = measurement.pr === undefined ? undefined : PR_URL.exec(measurement.pr.url)?.[1];
  return fromPr ?? measurement.repo;
}

export function checkOf(raw: RawCheck): GitPullRequestCheck {
  const isStatus = raw.__typename === 'StatusContext';
  const name = (isStatus ? raw.context : raw.name) ?? raw.workflowName ?? '';
  const url = isStatus ? raw.targetUrl : raw.detailsUrl;
  return { name, state: checkStateOf(raw, isStatus), ...(url ? { url } : {}) };
}

function checkStateOf(raw: RawCheck, isStatus: boolean): GitCheckState {
  if (isStatus) {
    if (raw.state === 'SUCCESS') return 'passing';
    if (raw.state === 'ERROR' || raw.state === 'FAILURE') return 'failing';
    return 'pending';
  }
  if (raw.status !== 'COMPLETED') return 'pending';
  if (raw.conclusion && FAILING_CONCLUSIONS.has(raw.conclusion)) return 'failing';
  if (raw.conclusion && SKIPPED.has(raw.conclusion)) return 'skipped';
  return 'passing';
}

function detailOf(raw: RawPull, viewerCanMerge: boolean): GitPullRequestDetail {
  return {
    number: raw.number,
    title: raw.title,
    url: raw.url,
    state: raw.state,
    isDraft: raw.isDraft,
    baseRefName: raw.baseRefName,
    headRefName: raw.headRefName,
    author: raw.author?.login ?? '',
    additions: raw.additions ?? 0,
    deletions: raw.deletions ?? 0,
    checks: (raw.statusCheckRollup ?? []).map(checkOf),
    canMerge: viewerCanMerge && raw.state === 'OPEN' && !raw.isDraft && MERGEABLE_STATES.has(raw.mergeStateStatus),
  };
}

export async function listPullRequests(
  worktreePath: string,
  measurement: GitMeasurement | undefined,
  runner: GhRunner = gh,
): Promise<GitPullRequestList> {
  const repo = measurement === undefined ? undefined : pullRequestRepo(measurement);
  if (measurement?.origin !== 'github' || measurement.branch === undefined || repo === undefined) return { ok: false, reason: 'no-github' };
  // The bare branch name matches every fork's branch of that name; the origin's owner narrows it.
  const headOwner = measurement.repo?.split('/')[0]?.toLowerCase();
  const result = await runner(worktreePath, [
    'pr', 'list', '-R', repo, '--head', measurement.branch, '--state', 'all', '--limit', '200',
    '--json', 'number,title,url,state,isDraft,baseRefName,headRefName,author,additions,deletions,mergeStateStatus,statusCheckRollup,headRepositoryOwner',
  ]);
  if (!result.ok) {
    logger.warn('could not list pull requests', { timedOut: result.timedOut, exitCode: result.exitCode });
    return { ok: false, reason: 'failed' };
  }
  try {
    const raw: RawPull[] = JSON.parse(result.out);
    const own = headOwner === undefined ? raw : raw.filter((pull) => pull.headRepositoryOwner?.login?.toLowerCase() === headOwner);
    const viewerCanMerge = measurement.pr?.viewerCanMerge !== false;
    return { ok: true, pulls: own.map((pull) => detailOf(pull, viewerCanMerge)) };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** `-R` keeps gh from switching or deleting the local branch: the Project's worktree stays on it. */
export async function mergePullRequest(
  worktreePath: string,
  measurement: GitMeasurement | undefined,
  number: number,
  runner: GhRunner = gh,
): Promise<GitMergeResult> {
  const listed = await listPullRequests(worktreePath, measurement, runner);
  if (!listed.ok) return { ok: false, reason: 'failed' };
  const repo = measurement === undefined ? undefined : pullRequestRepo(measurement);
  if (repo === undefined || !listed.pulls.some((pull) => pull.number === number && pull.canMerge)) return { ok: false, reason: 'not-mergeable' };
  const result = await runner(worktreePath, ['pr', 'merge', String(number), '-R', repo, '--merge', '--delete-branch']);
  if (!result.ok) {
    logger.warn('could not merge the pull request', { timedOut: result.timedOut, exitCode: result.exitCode });
    return { ok: false, reason: 'failed' };
  }
  return { ok: true };
}
