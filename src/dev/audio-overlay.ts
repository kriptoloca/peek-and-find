/**
 * Dev-only on-screen audio diagnostics (`/test/?audiodebug=1`): the phone cannot show a
 * console, so the state the e2e tests read (`audio.debug()`) is drawn as text in a corner,
 * refreshed twice a second, plus the iOS silent-loop state. Screenshot it and send it.
 * Never part of the production bundle (main.ts imports it behind `import.meta.env.DEV`).
 */
import { audio } from '../game/audio';
import { iosUnmuteState } from '../platform/ios-unmute';

const ID = 'audio-debug';
const REFRESH_MS = 500;

function line(label: string, value: unknown): string {
  const v = Array.isArray(value) ? (value.length ? value.join(',') : '-') : String(value);
  return `${label}: ${v}`;
}

export function renderAudioDebug(): string {
  const a = audio.debug();
  const u = iosUnmuteState();
  const ua = navigator.userAgent.replace(/^Mozilla\/5\.0 \(/, '').slice(0, 60);
  return [
    line('ua', ua),
    line(
      'formats',
      `ogg=${String(a.formats.ogg)} m4a=${String(a.formats.m4a)} webAudio=${String(a.formats.webAudio)}`,
    ),
    line('context', a.contextState),
    line('locked', `${String(a.locked)} unlocked=${String(a.unlocked)}`),
    line('platformEnabled', a.platformEnabled),
    line('toggles', `sound=${String(a.soundOn)} music=${String(a.musicOn)}`),
    line(
      'music',
      `wanted=${String(a.musicWanted)} playing=${String(a.musicPlaying)} paused=${String(a.paused)}`,
    ),
    line('level', a.level.toFixed(4)),
    line('played', a.played),
    line('dropped', a.dropped),
    line('missing', a.missing),
    line('ios', u.ios ? `element=${u.element} kicks=${String(u.kicks)} ${u.lastError}` : 'not iOS'),
  ].join('\n');
}

export function installAudioOverlay(): void {
  if (document.getElementById(ID)) return;
  const el = document.createElement('pre');
  el.id = ID;
  Object.assign(el.style, {
    position: 'fixed',
    left: '4px',
    top: '4px',
    zIndex: '1000',
    margin: '0',
    padding: '6px 8px',
    maxWidth: '96vw',
    whiteSpace: 'pre-wrap',
    font: '11px/1.35 monospace',
    color: '#e8ffe8',
    background: 'rgba(0,0,0,0.65)',
    borderRadius: '6px',
    pointerEvents: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);
  const tick = (): void => {
    el.textContent = renderAudioDebug();
  };
  tick();
  window.setInterval(tick, REFRESH_MS);
}
