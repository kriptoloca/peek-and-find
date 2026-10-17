/** True inside the YouTube Playables host: the `ytgame` global or the host's frame domain. */
export function hostedByYoutube(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof (window as { ytgame?: unknown }).ytgame !== 'undefined') return true;
  return /\.usercontent\.goog$/.test(window.location.hostname);
}
