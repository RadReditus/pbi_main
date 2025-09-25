export const session = {
  get token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } },
  set token(v: string) { try { localStorage.setItem('token', v || ''); } catch {} },

  get apiKey() { try { return localStorage.getItem('apiKey') || ''; } catch { return ''; } },
  set apiKey(v: string) { try { localStorage.setItem('apiKey', v || ''); } catch {} },

  clear() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('apiKey');
    } catch {}
  },
};
