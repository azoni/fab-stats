/**
 * Post-auth destination hand-off. A signed-out visitor who taps "Sign in to
 * join" on a shared league (or any gated action) shouldn't be dumped on the
 * home page — or, for brand-new accounts, on /import — after authenticating.
 *
 * sessionStorage (tab-scoped): survives the login → /setup hop for new
 * accounts, disappears with the tab. Login PEEKS (new accounts still need the
 * value when /setup finishes); setup CONSUMES.
 */
const KEY = "fab-return-to";

export function setReturnTo(path: string): void {
  try {
    if (path.startsWith("/")) sessionStorage.setItem(KEY, path);
  } catch {}
}

export function peekReturnTo(): string | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v && v.startsWith("/") ? v : null;
  } catch {
    return null;
  }
}

export function consumeReturnTo(): string | null {
  const v = peekReturnTo();
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  return v;
}
