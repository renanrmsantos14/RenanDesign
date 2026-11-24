import { useEffect } from 'react';

import { isInteractiveTarget } from '../shortcuts/isInteractiveTarget.js';
import { useCanvasStore } from './store.js';

function isPlainShift(event: KeyboardEvent): boolean {
  return event.key === 'Shift' && !event.ctrlKey && !event.metaKey && !event.altKey;
}

function installPreviewHold(): () => void {
  const hold = (held: boolean): void => {
    useCanvasStore.getState().holdPreview(held);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || !isPlainShift(event) || isInteractiveTarget(event.target)) return;
    hold(true);
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') hold(false);
  };
  // Focus moving into a Frame's guest blurs the window; that guest relays the release (`preview-hold`).
  let blurCheck: ReturnType<typeof setTimeout> | undefined;
  const onBlur = (): void => {
    blurCheck = setTimeout(() => {
      if (document.activeElement?.tagName !== 'WEBVIEW') hold(false);
    });
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    clearTimeout(blurCheck);
    hold(false);
  };
}

export function usePreviewHold(): void {
  useEffect(installPreviewHold, []);
}
