import { useCallback, useRef, useState } from 'react';
import type { GitMergeResult, GitPullRequestList } from '@studio/events';
import { GitPullRequestPanel, type GitMergeFailure } from '@studio/git-ui';
import { GIT_PR_PANEL_GLYPHS, GIT_PR_PANEL_STRINGS } from '../git-status/presentation.js';

export interface GitPrPanelSource {
  load: () => Promise<GitPullRequestList>;
  merge: (number: number) => Promise<GitMergeResult>;
}

const FAILED: GitPullRequestList = { ok: false, reason: 'failed' };

export function useGitPrPanel(source: GitPrPanelSource | undefined): {
  panel: React.ReactNode;
  onOpenChange: (isOpen: boolean) => void;
} {
  const [list, setList] = useState<GitPullRequestList | undefined>(undefined);
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const [confirming, setConfirming] = useState<number | undefined>(undefined);
  const [merging, setMerging] = useState<number | undefined>(undefined);
  const [mergeFailure, setMergeFailure] = useState<GitMergeFailure | undefined>(undefined);
  const loadSeq = useRef(0);

  const reload = useCallback((): void => {
    if (source === undefined) return;
    const seq = ++loadSeq.current;
    void source.load().then(
      (next) => seq === loadSeq.current && setList(next),
      () => seq === loadSeq.current && setList(FAILED),
    );
  }, [source]);

  const onOpenChange = useCallback(
    (isOpen: boolean): void => {
      if (!isOpen) {
        setConfirming(undefined);
        return;
      }
      setList(undefined);
      setSelected(undefined);
      setMergeFailure(undefined);
      reload();
    },
    [reload],
  );

  const confirmMerge = (number: number): void => {
    if (source === undefined || merging !== undefined) return;
    setMerging(number);
    setMergeFailure(undefined);
    void source
      .merge(number)
      .then(
        (result) => (result.ok ? reload() : setMergeFailure({ number, reason: result.reason })),
        () => setMergeFailure({ number, reason: 'failed' }),
      )
      .finally(() => {
        setMerging(undefined);
        setConfirming(undefined);
      });
  };

  if (source === undefined) return { panel: undefined, onOpenChange };
  return {
    onOpenChange,
    panel: (
      <GitPullRequestPanel
        {...(list === undefined ? {} : { list })}
        strings={GIT_PR_PANEL_STRINGS}
        glyphs={GIT_PR_PANEL_GLYPHS}
        {...(selected === undefined ? {} : { selected })}
        {...(confirming === undefined ? {} : { confirming })}
        {...(merging === undefined ? {} : { merging })}
        {...(mergeFailure === undefined ? {} : { mergeFailure })}
        onSelect={(number) => {
          setSelected(number);
          setConfirming(undefined);
        }}
        onOpen={(url) => window.open(url, '_blank', 'noopener')}
        onMerge={setConfirming}
        onConfirmMerge={confirmMerge}
        onCancelMerge={() => setConfirming(undefined)}
      />
    ),
  };
}
