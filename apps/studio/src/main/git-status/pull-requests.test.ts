import { describe, expect, it } from 'bun:test';
import type { GitMeasurement } from '@studio/events';
import type { GhResult, GhRunner } from './gh.js';
import { emptyMeasurement } from './measure.js';
import { checkOf, listPullRequests, mergePullRequest, pullRequestRepo } from './pull-requests.js';
import { FAIL, ok } from './github/test-support.js';

const CWD = '/tmp/any';

const MEASURED: GitMeasurement = { ...emptyMeasurement('main', true), origin: 'github', repo: 'me/app', head: 'branch', branch: 'feat' };

const PULL = {
  number: 7,
  title: 'Add the panel',
  url: 'https://github.com/me/app/pull/7',
  state: 'OPEN',
  isDraft: false,
  baseRefName: 'main',
  mergeStateStatus: 'CLEAN',
  headRepositoryOwner: { login: 'me' },
  statusCheckRollup: [
    { __typename: 'CheckRun', name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS', detailsUrl: 'https://ci/1' },
    { __typename: 'CheckRun', name: 'e2e', status: 'IN_PROGRESS', conclusion: null },
    { __typename: 'StatusContext', context: 'deploy', state: 'FAILURE', targetUrl: 'https://ci/2' },
  ],
};

function scripted(answers: GhResult[]): { runner: GhRunner; calls: string[][] } {
  const calls: string[][] = [];
  const runner: GhRunner = async (_cwd, args) => {
    calls.push(args);
    return answers.shift() ?? FAIL;
  };
  return { runner, calls };
}

describe('checkOf', () => {
  it('reads a check run and a status context', () => {
    expect(checkOf(PULL.statusCheckRollup[0]!)).toEqual({ name: 'verify', state: 'passing', url: 'https://ci/1' });
    expect(checkOf(PULL.statusCheckRollup[1]!)).toEqual({ name: 'e2e', state: 'pending' });
    expect(checkOf(PULL.statusCheckRollup[2]!)).toEqual({ name: 'deploy', state: 'failing', url: 'https://ci/2' });
    expect(checkOf({ __typename: 'CheckRun', name: 'lint', status: 'COMPLETED', conclusion: 'SKIPPED' }).state).toBe('skipped');
  });
});

describe('pullRequestRepo', () => {
  it('prefers the repository the measured PR lives in', () => {
    const pr = { number: 1, url: 'https://github.com/up/app/pull/1', state: 'OPEN' as const, isDraft: false, mergeStateStatus: 'CLEAN', checks: 'none' as const, baseRefName: 'main', updatedAt: '' };
    expect(pullRequestRepo({ ...MEASURED, pr })).toBe('up/app');
    expect(pullRequestRepo(MEASURED)).toBe('me/app');
  });
});

describe('listPullRequests', () => {
  it('lists every PR of the branch with its checks', async () => {
    const { runner, calls } = scripted([ok(JSON.stringify([PULL]))]);
    const list = await listPullRequests(CWD, MEASURED, runner);
    expect(calls[0]).toEqual(expect.arrayContaining(['pr', 'list', '-R', 'me/app', '--head', 'feat', '--state', 'all']));
    expect(list.ok && list.pulls[0]).toMatchObject({ number: 7, title: 'Add the panel', canMerge: true });
    expect(list.ok && list.pulls[0]?.checks.map((check) => check.state)).toEqual(['passing', 'pending', 'failing']);
  });

  it('a draft or a conflicted PR cannot be merged', async () => {
    const { runner } = scripted([ok(JSON.stringify([{ ...PULL, isDraft: true }, { ...PULL, number: 8, mergeStateStatus: 'DIRTY' }]))]);
    const list = await listPullRequests(CWD, MEASURED, runner);
    expect(list.ok && list.pulls.map((pull) => pull.canMerge)).toEqual([false, false]);
  });

  it('leaves out another fork\'s branch of the same name', async () => {
    const { runner } = scripted([ok(JSON.stringify([PULL, { ...PULL, number: 9, headRepositoryOwner: { login: 'someone' } }]))]);
    const list = await listPullRequests(CWD, MEASURED, runner);
    expect(list.ok && list.pulls.map((pull) => pull.number)).toEqual([7]);
  });

  it('a PR the viewer cannot merge offers no merge', async () => {
    const pr = { number: 7, url: 'https://github.com/up/app/pull/7', state: 'OPEN' as const, isDraft: false, mergeStateStatus: 'CLEAN', checks: 'none' as const, baseRefName: 'main', updatedAt: '', viewerCanMerge: false };
    const { runner } = scripted([ok(JSON.stringify([PULL]))]);
    const list = await listPullRequests(CWD, { ...MEASURED, pr }, runner);
    expect(list.ok && list.pulls[0]?.canMerge).toBe(false);
  });

  it('answers no-github without running gh off GitHub', async () => {
    const { runner, calls } = scripted([]);
    expect(await listPullRequests(CWD, { ...MEASURED, origin: 'other' }, runner)).toEqual({ ok: false, reason: 'no-github' });
    expect(calls).toEqual([]);
  });

  it('a gh failure is failed', async () => {
    const { runner } = scripted([FAIL]);
    expect(await listPullRequests(CWD, MEASURED, runner)).toEqual({ ok: false, reason: 'failed' });
  });
});

describe('mergePullRequest', () => {
  it('merges with a merge commit through -R, so the worktree keeps its branch', async () => {
    const { runner, calls } = scripted([ok(JSON.stringify([PULL])), ok('')]);
    expect(await mergePullRequest(CWD, MEASURED, 7, runner)).toEqual({ ok: true });
    expect(calls[1]).toEqual(['pr', 'merge', '7', '-R', 'me/app', '--merge', '--delete-branch']);
  });

  it('refuses a PR that is not mergeable without calling merge', async () => {
    const { runner, calls } = scripted([ok(JSON.stringify([{ ...PULL, mergeStateStatus: 'BLOCKED' }]))]);
    expect(await mergePullRequest(CWD, MEASURED, 7, runner)).toEqual({ ok: false, reason: 'not-mergeable' });
    expect(calls).toHaveLength(1);
  });

  it('a failed merge is failed', async () => {
    const { runner } = scripted([ok(JSON.stringify([PULL])), FAIL]);
    expect(await mergePullRequest(CWD, MEASURED, 7, runner)).toEqual({ ok: false, reason: 'failed' });
  });
});
