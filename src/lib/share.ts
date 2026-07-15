/**
 * Clipboard + Web Share helpers shared by the legacy PassageTools island and
 * the academic passage page's handlers.
 *
 * `navigator.clipboard` is undefined on non-secure origins and inside some
 * in-app webviews, so every entry point here reports what actually happened.
 * Callers must not announce "Copied" without checking the result — an empty
 * clipboard behind a success toast is worse than an honest failure.
 */

/** Copy `text`, returning whether it actually landed in the clipboard. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure origin — fall through to the legacy path.
  }
  return legacyCopy(text);
}

/** execCommand path for insecure origins / older webviews. Restores the user's
 *  own selection afterwards so copying doesn't clobber what they highlighted. */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);

    const sel = document.getSelection();
    const prev = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);

    if (prev && sel) {
      sel.removeAllRanges();
      sel.addRange(prev);
    }
    return ok;
  } catch {
    return false;
  }
}

export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'failed';

/**
 * Hand off to the OS share sheet where available, else copy the URL.
 * `cancelled` means the user dismissed the sheet — the caller should stay
 * silent rather than fall back to copying, which would be a surprise.
 */
export async function shareOrCopyLink(data: {
  title: string;
  text?: string;
  url: string;
}): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Anything else (NotAllowedError, unsupported payload) → copy instead.
    }
  }
  return (await copyToClipboard(data.url)) ? 'copied' : 'failed';
}
