/**
 * iOS Safari plays Web Audio through the "ambient" audio session, which the ringer (silent)
 * switch mutes; the moment any HTMLMediaElement plays, WebKit moves the page to the "playback"
 * session and Web Audio becomes audible regardless of the switch. This installs that trick:
 * on the first touch/click a looping, silent WAV (built in memory, no file, no network) starts
 * in an <audio> element. Nothing happens on other platforms. Inside the YouTube app the host
 * owns the audio session, so this only matters for Safari tests (GDD §12 "audio works on
 * iPhone Safari after first tap").
 */
const SAMPLE_RATE = 8000;
const SECONDS = 0.1;

function silentWavUrl(): string {
  const samples = Math.round(SAMPLE_RATE * SECONDS);
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const str = (o: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true); // 8-bit: 128 = silence
  str(36, 'data');
  v.setUint32(40, samples, true);
  new Uint8Array(buf, 44).fill(128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Idempotent; call once at startup. */
export function installIosUnmute(): void {
  if (typeof document === 'undefined' || !isIosLike()) return;
  let el: HTMLAudioElement | null = null;
  const kick = (): void => {
    if (!el) {
      el = document.createElement('audio');
      el.src = silentWavUrl();
      el.loop = true;
      el.preload = 'auto';
      el.setAttribute('playsinline', '');
    }
    if (el.paused) {
      el.play().catch(() => {
        /* not allowed yet: the next gesture tries again */
      });
    }
  };
  document.addEventListener('touchend', kick, { passive: true });
  document.addEventListener('click', kick, { passive: true });
}
