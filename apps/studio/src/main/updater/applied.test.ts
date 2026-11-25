import { describe, expect, it } from 'bun:test';
import { appliedUpdate } from './applied.js';

describe('the update applied on relaunch', () => {
  it('is the recorded version when that version is now running', () => {
    expect(appliedUpdate({ installing: '2.0.12' }, '2.0.12')).toEqual({ version: '2.0.12' });
  });

  it('is nothing when the install did not take or nothing was installing', () => {
    expect(appliedUpdate({ installing: '2.0.12' }, '2.0.11')).toBeNull();
    expect(appliedUpdate({}, '2.0.12')).toBeNull();
  });
});
