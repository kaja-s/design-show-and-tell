// The phone that made a character keeps its id and private edit token, so
// "edit my character" works later without an account.
const KEY = "village:me";
export type Me = { id: string; token: string };

export function readMe(): Me | null {
  try {
    const raw = localStorage.getItem(KEY);
    const me = raw ? (JSON.parse(raw) as Me) : null;
    return me?.id && me.token ? me : null;
  } catch {
    return null;
  }
}
export function writeMe(me: Me) {
  try {
    localStorage.setItem(KEY, JSON.stringify(me));
  } catch {}
}
export function clearMe() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
