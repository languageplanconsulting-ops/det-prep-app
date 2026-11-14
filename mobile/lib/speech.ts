import { useCallback, useEffect, useRef, useState } from "react";

import { synthesizeSpeech } from "./api";
import { Sound } from "./audio-player";

/**
 * Spoken audio for listening tasks. The content bank's recorded clips mostly live only in an
 * admin browser (the files on the server are missing), so — like the website — we fall back to
 * server text-to-speech of the transcript. Generated clips are cached per text for the session,
 * so "listen again" never pays for a second synthesis.
 */
const cache = new Map<string, Promise<string>>();

function ttsUri(text: string): Promise<string> {
  const key = text.trim();
  let p = cache.get(key);
  if (!p) {
    p = synthesizeSpeech(key);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

export function useSpeech() {
  const sound = useRef<Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useRef(0);

  const stop = useCallback(async () => {
    token.current += 1;
    const s = sound.current;
    sound.current = null;
    setPlaying(false);
    if (s) {
      try {
        await s.unloadAsync();
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => () => void stop(), [stop]);

  /** Plays `text` — the recording at `uri` first when given, otherwise (or if it fails) TTS. */
  const play = useCallback(
    async (text: string, uri?: string | null) => {
      await stop();
      const my = token.current;
      setError(null);
      setLoading(true);
      const start = async (src: string, timeoutMs: number) => {
        const { sound: s } = await Sound.createAsync({ uri: src });
        if (my !== token.current) {
          await s.unloadAsync();
          return;
        }
        if (!(await s.waitUntilLoaded(timeoutMs))) {
          await s.unloadAsync();
          throw new Error("audio did not load");
        }
        if (my !== token.current) {
          await s.unloadAsync();
          return;
        }
        sound.current = s;
        s.setOnPlaybackStatusUpdate((st) => {
          if (st.isLoaded && st.didJustFinish) setPlaying(false);
        });
        await s.playAsync();
        setPlaying(true);
      };
      try {
        if (uri) {
          try {
            await start(uri, 2500);
            return;
          } catch {
            /* recording missing — fall through to TTS */
          }
        }
        await start(await ttsUri(text), 8000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "audio");
        setPlaying(false);
      } finally {
        if (my === token.current) setLoading(false);
      }
    },
    [stop],
  );

  return { play, stop, playing, loading, error };
}
