import { afterEach, describe, expect, it } from 'bun:test';
import type { Viewport } from '@xyflow/react';

import { useCanvasStore } from './store.js';
import { installCtrlDragPan } from './useCtrlDragPan.js';

const onCanvas = { closest: (selector: string) => (selector === '[data-testid="canvas"]' ? {} : null) };

function pointer(type: string, init: { x?: number; y?: number; ctrlKey?: boolean; buttons?: number }): Event {
  const event = new Event(type, { cancelable: true });
  return Object.assign(event, {
    button: 0,
    pointerId: 1,
    buttons: init.buttons ?? 1,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    ctrlKey: init.ctrlKey ?? true,
  });
}

function setup(): { root: EventTarget; viewport: () => Viewport; cleanup: () => void } {
  let current: Viewport = { x: 0, y: 0, zoom: 1 };
  const root = new EventTarget();
  const cleanup = installCtrlDragPan(root as unknown as Window, {
    getViewport: () => current,
    setViewport: (next) => (current = next),
  });
  return { root, viewport: () => current, cleanup };
}

function press(root: EventTarget, event: Event): void {
  Object.defineProperty(event, 'target', { value: onCanvas });
  root.dispatchEvent(event);
}

afterEach(() => useCanvasStore.getState().setSpacePanning(false));

describe('Ctrl drag pan', () => {
  it('moves the camera by the pointer delta while Ctrl is held', () => {
    useCanvasStore.getState().setSpacePanning(true);
    const { root, viewport, cleanup } = setup();

    const down = pointer('pointerdown', { x: 10, y: 10 });
    press(root, down);
    root.dispatchEvent(pointer('pointermove', { x: 40, y: 25 }));
    root.dispatchEvent(pointer('pointerup', { x: 40, y: 25 }));
    root.dispatchEvent(pointer('pointermove', { x: 90, y: 90 }));

    expect(down.defaultPrevented).toBe(true);
    expect(viewport()).toEqual({ x: 30, y: 15, zoom: 1 });
    cleanup();
  });

  it('swallows the click that ends a drag', () => {
    useCanvasStore.getState().setSpacePanning(true);
    const { root, cleanup } = setup();

    press(root, pointer('pointerdown', { x: 10, y: 10 }));
    root.dispatchEvent(pointer('pointermove', { x: 40, y: 25 }));
    root.dispatchEvent(pointer('pointerup', { x: 40, y: 25 }));
    const click = pointer('click', { x: 40, y: 25 });
    root.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    cleanup();
  });

  it('ends the pan when a move arrives with the button already up', () => {
    useCanvasStore.getState().setSpacePanning(true);
    const { root, viewport, cleanup } = setup();

    press(root, pointer('pointerdown', { x: 10, y: 10 }));
    root.dispatchEvent(pointer('pointermove', { x: 40, y: 25, buttons: 0 }));
    root.dispatchEvent(pointer('pointermove', { x: 90, y: 90 }));

    expect(viewport()).toEqual({ x: 0, y: 0, zoom: 1 });
    cleanup();
  });

  it('leaves a press alone when Ctrl is not held', () => {
    const { root, viewport, cleanup } = setup();

    const down = pointer('pointerdown', { x: 10, y: 10, ctrlKey: false });
    press(root, down);
    root.dispatchEvent(pointer('pointermove', { x: 40, y: 25 }));

    expect(down.defaultPrevented).toBe(false);
    expect(viewport()).toEqual({ x: 0, y: 0, zoom: 1 });
    cleanup();
  });
});
