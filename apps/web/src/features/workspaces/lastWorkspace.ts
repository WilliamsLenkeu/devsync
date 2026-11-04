const KEY = 'devsync-last-workspace';

export const getLastWorkspace = (): string | null => localStorage.getItem(KEY);
export const setLastWorkspace = (id: string) => localStorage.setItem(KEY, id);
