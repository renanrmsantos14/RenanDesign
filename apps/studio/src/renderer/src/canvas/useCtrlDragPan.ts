import { useEffect } from 'react';
import type { Viewport } from '@xyflow/react';

import { useCanvasStore } from './store.js';

interface Camera {
  getViewport: () => Viewport;
  setViewport: (viewport: Viewport) => void;
}

const isOnCanvas = (target: EventTarget | null): boolean =>
  target !== null &&
  'closest' in target &&
  (target as Element).closest('[data-testid="canvas"]') !== null &&
  (target as Element).closest('.nopan') === null;

export function installCtrlDragPan(root: Window, camera: Camera): () => void {
  const controller = new AbortController();
  const capture = { capture: true, signal: controller.signal };
  let last: { x: number; y: number; pointerId: number } | null = null;
  let moved = false;
  let swallowClick = false;

  const isCanvasPress = (event: PointerEvent | MouseEvent): boolean =>
    event.button === 0 &&
    event.ctrlKey &&
    useCanvasStore.getState().isSpacePanning &&
    isOnCanvas(event.target);

  root.addEventListener(
    'pointerdown',
    (event) => {
      if (!isCanvasPress(event)) return;
      event.preventDefault();
      event.stopPropagation();
      last = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      moved = false;
    },
    capture,
  );
  // d3-zoom rejects a Ctrl press and React Flow would start a marquee from the mousedown that follows.
  root.addEventListener(
    'mousedown',
    (event) => {
      if (last === null && !isCanvasPress(event)) return;
      event.preventDefault();
      event.stopPropagation();
    },
    capture,
  );
  // On macOS a Ctrl press is also a secondary click, which would open the pane menu.
  root.addEventListener(
    'contextmenu',
    (event) => {
      if (last === null && !isCanvasPress(event)) return;
      event.preventDefault();
      event.stopPropagation();
    },
    capture,
  );
  // A dragged press still ends in a click, which would select or deselect what it lands on.
  root.addEventListener(
    'click',
    (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    capture,
  );
  root.addEventListener(
    'pointermove',
    (event) => {
      if (last === null || event.pointerId !== last.pointerId) return;
      // A release over a Frame's guest never reaches the host.
      if ((event.buttons & 1) === 0) {
        last = null;
        return;
      }
      moved = true;
      const viewport = camera.getViewport();
      camera.setViewport({ ...viewport, x: viewport.x + event.clientX - last.x, y: viewport.y + event.clientY - last.y });
      last = { ...last, x: event.clientX, y: event.clientY };
    },
    capture,
  );
  const end = (event: PointerEvent): void => {
    if (last === null || event.pointerId !== last.pointerId) return;
    last = null;
    if (!moved) return;
    swallowClick = true;
    setTimeout(() => (swallowClick = false));
  };
  root.addEventListener('pointerup', end, capture);
  root.addEventListener('pointercancel', end, capture);
  root.addEventListener('blur', () => (last = null), { signal: controller.signal });
  return () => controller.abort();
}

export function useCtrlDragPan(camera: Camera): void {
  const { getViewport, setViewport } = camera;
  useEffect(() => installCtrlDragPan(window, { getViewport, setViewport }), [getViewport, setViewport]);
}
