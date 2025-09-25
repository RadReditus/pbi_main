export type Settings = {
  baseUrl: string;
  apiKey: string;
  jwtToken: string;
};
const KEY = 'pbi-settings';

export function loadSettings(): Settings {
  const d = localStorage.getItem(KEY);
  return d ? JSON.parse(d) : { baseUrl: 'http://localhost:3001', apiKey: '0123456789abcdef0123456789abcdef', jwtToken: '' };
}
export function saveSettings(v: Partial<Settings>) {
  const s = { ...loadSettings(), ...v };
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}
