/**
 * Small playback wrapper over `expo-audio` (expo-av was removed in SDK 58).
 *
 * It keeps the handful of expo-av `Sound` methods the screens already used
 * (createAsync / playAsync / pauseAsync / getStatusAsync /
 * setOnPlaybackStatusUpdate / unloadAsync) so the screens only swap an import.
 */
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from "expo-audio";

export type PlaybackStatus = {
  isLoaded: boolean;
  isPlaying: boolean;
  didJustFinish: boolean;
};

type StatusListener = (status: PlaybackStatus) => void;

let playbackModeReady = false;

/** Play through the speaker even when the iPhone's silent switch is on. */
export async function ensurePlaybackMode(): Promise<void> {
  if (playbackModeReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: "duckOthers",
    });
  } catch {
    /* not fatal — playback still works with the default mode */
  }
  playbackModeReady = true;
}

/** Called by the recorder so the next playback re-applies the playback mode. */
export function markPlaybackModeDirty(): void {
  playbackModeReady = false;
}

function toStatus(player: AudioPlayer, s?: AudioStatus): PlaybackStatus {
  return {
    isLoaded: s ? s.isLoaded : player.isLoaded,
    isPlaying: s ? s.playing : player.playing,
    didJustFinish: s ? s.didJustFinish : false,
  };
}

export class Sound {
  private player: AudioPlayer;
  private sub: { remove: () => void } | null = null;
  private released = false;

  private constructor(player: AudioPlayer) {
    this.player = player;
  }

  static async createAsync(
    source: { uri: string },
    opts: { shouldPlay?: boolean; volume?: number } = {},
  ): Promise<{ sound: Sound }> {
    await ensurePlaybackMode();
    const player = createAudioPlayer({ uri: source.uri });
    if (opts.volume != null) player.volume = opts.volume;
    const sound = new Sound(player);
    if (opts.shouldPlay) player.play();
    return { sound };
  }

  /**
   * Resolves true once the source has loaded, false if it hasn't within `timeoutMs` — a missing
   * file (404) never loads and never errors, so this is how callers detect it.
   */
  async waitUntilLoaded(timeoutMs = 2500): Promise<boolean> {
    const until = Date.now() + timeoutMs;
    while (!this.released && Date.now() < until) {
      if (this.player.isLoaded && (this.player.duration > 0 || this.player.playing)) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return !this.released && this.player.isLoaded && this.player.duration > 0;
  }

  async playAsync(): Promise<void> {
    if (this.released) return;
    await ensurePlaybackMode();
    const p = this.player;
    // expo-audio stays at the end after finishing; rewind so "play" replays.
    if (p.duration > 0 && p.currentTime >= p.duration - 0.05) {
      await p.seekTo(0);
    }
    p.play();
  }

  async pauseAsync(): Promise<void> {
    if (!this.released) this.player.pause();
  }

  async getStatusAsync(): Promise<PlaybackStatus> {
    if (this.released) return { isLoaded: false, isPlaying: false, didJustFinish: false };
    return toStatus(this.player);
  }

  setOnPlaybackStatusUpdate(listener: StatusListener | null): void {
    this.sub?.remove();
    this.sub = null;
    if (!listener || this.released) return;
    this.sub = this.player.addListener("playbackStatusUpdate", (s) =>
      listener(toStatus(this.player, s)),
    );
  }

  async unloadAsync(): Promise<void> {
    if (this.released) return;
    this.released = true;
    this.sub?.remove();
    this.sub = null;
    try {
      this.player.pause();
    } catch {
      /* ignore */
    }
    this.player.remove();
  }
}
