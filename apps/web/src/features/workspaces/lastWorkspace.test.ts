import { afterEach, describe, expect, it } from 'vitest';
import { getLastWorkspace, setLastWorkspace } from './lastWorkspace';

describe('lastWorkspace', () => {
  afterEach(() => {
    localStorage.removeItem('devsync-last-workspace');
  });

  it('stores and reads the last workspace id', () => {
    expect(getLastWorkspace()).toBeNull();
    setLastWorkspace('ws-42');
    expect(getLastWorkspace()).toBe('ws-42');
  });
});
