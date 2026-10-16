/**
 * Save model and storage (GDD §8, CLAUDE.md rule 7). The backend is an interface so the
 * Playgama Bridge storage API can plug in at epic 8; dev builds and failures fall back to
 * localStorage or memory. Nothing in here ever throws into gameplay.
 */

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'peek-and-find:save';

export interface SaveData {
  version: number;
  level: number;
  totalStars: number;
  bestStreak: number;
  streak: number;
  /** UTC date key "YYYYMMDD" of the last completed daily chain, or null. */
  lastDailyDate: string | null;
  dailyDone: boolean;
  sound: boolean;
  music: boolean;
  scenesPlayed: number;
  /** Per-player salt for non-daily scene seeds; created once, never changed. */
  seedSalt: number;
}

export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export class MemoryBackend implements StorageBackend {
  private readonly map = new Map<string, string>();
  get(key: string): Promise<string | null> {
    return Promise.resolve(this.map.get(key) ?? null);
  }
  set(key: string, value: string): Promise<void> {
    this.map.set(key, value);
    return Promise.resolve();
  }
}

/** Browser localStorage; private mode or quota errors degrade to "nothing stored". */
export class LocalStorageBackend implements StorageBackend {
  get(key: string): Promise<string | null> {
    try {
      return Promise.resolve(window.localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  }
  set(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore: saving is best effort
    }
    return Promise.resolve();
  }
}

/** Random 32-bit salt. The only unseeded randomness in the game, by design. */
export function newSeedSalt(): number {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return (a[0] as number) >>> 0;
  } catch {
    return Math.floor(Math.random() * 0x100000000) >>> 0;
  }
}

export function defaultSave(seedSalt: number = newSeedSalt()): SaveData {
  return {
    version: SAVE_VERSION,
    level: 1,
    totalStars: 0,
    bestStreak: 0,
    streak: 0,
    lastDailyDate: null,
    dailyDone: false,
    sound: true,
    music: true,
    scenesPlayed: 0,
    seedSalt,
  };
}

function num(v: unknown, fallback: number, min = 0): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min ? Math.floor(v) : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/**
 * Coerces whatever was stored into a valid SaveData. Unknown or newer versions start fresh
 * (keeping the salt when it is usable so the player's scene sequence does not change).
 */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null) return defaultSave();
  const r = raw as Record<string, unknown>;
  const salt =
    typeof r.seedSalt === 'number' && Number.isFinite(r.seedSalt)
      ? r.seedSalt >>> 0
      : newSeedSalt();
  const d = defaultSave(salt);
  const version = num(r.version, 0);
  if (version !== SAVE_VERSION) return d;
  return {
    version: SAVE_VERSION,
    level: num(r.level, d.level, 1),
    totalStars: num(r.totalStars, d.totalStars),
    bestStreak: num(r.bestStreak, d.bestStreak),
    streak: num(r.streak, d.streak),
    lastDailyDate:
      typeof r.lastDailyDate === 'string' && /^\d{8}$/.test(r.lastDailyDate)
        ? r.lastDailyDate
        : null,
    dailyDone: bool(r.dailyDone, d.dailyDone),
    sound: bool(r.sound, d.sound),
    music: bool(r.music, d.music),
    scenesPlayed: num(r.scenesPlayed, d.scenesPlayed),
    seedSalt: salt,
  };
}

export class SaveStore {
  constructor(
    private readonly backend: StorageBackend,
    private readonly key: string = SAVE_KEY,
  ) {}

  /** Never rejects: any failure yields a fresh default save. */
  async load(): Promise<SaveData> {
    try {
      const raw = await this.backend.get(this.key);
      if (!raw) return defaultSave();
      return migrate(JSON.parse(raw) as unknown);
    } catch {
      return defaultSave();
    }
  }

  /** Never rejects: returns false when the backend failed. */
  async save(data: SaveData): Promise<boolean> {
    try {
      await this.backend.set(this.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.backend.set(this.key, '');
    } catch {
      // ignore
    }
  }
}
