import { useCallback, useEffect, useRef, useState } from "react";

import { Sound } from "../lib/audio-player";
import { synthesizeExamSpeech } from "../lib/mock-api";

export type TaskAudioState = "idle" | "loading" | "ready" | "error";

/**
 * Exam audio for one task: a hosted `url`, or `text` synthesized on the
 * website's speech endpoint. Counts plays (max `maxPlays`) and reports when a
 * playback reaches the end — the runner uses that to start dictation's clock.
 * `lazy` waits for the first tap before fetching synthesized audio.
 */
export function useTaskAudio({
  url,
  text,
  provider,
  maxPlays = Infinity,
  lazy = false,
  onFinished,
}: {
  url?: string;
  text?: string;
  provider?: string;
  maxPlays?: number;
  lazy?: boolean;
  onFinished?: () => void;
}) {
  const [state, setState] = useState<TaskAudioState>(lazy ? "idle" : "loading");
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const uriRef = useRef<string | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const finishedCb = useRef(onFinished);
  finishedCb.current = onFinished;
  const alive = useRef(true);
  const loadPromise = useRef<Promise<string | null> | null>(null);

  const resolveSource = useCallback((): Promise<string | null> => {
    if (loadPromise.current) return loadPromise.current;
    const p = (async () => {
      const src = url?.trim() ? url.trim() : text?.trim() ? await synthesizeExamSpeech(text.trim(), provider) : null;
      uriRef.current = src;
      return src;
    })();
    loadPromise.current = p;
    return p;
  }, [url, text, provider]);

  useEffect(() => {
    alive.current = true;
    setPlays(0);
    uriRef.current = null;
    loadPromise.current = null;
    if (lazy) {
      setState("idle");
    } else {
      setState("loading");
      resolveSource()
        .then((src) => {
          if (alive.current) setState(src ? "ready" : "error");
        })
        .catch(() => {
          if (alive.current) setState("error");
        });
    }
    return () => {
      alive.current = false;
      const s = soundRef.current;
      soundRef.current = null;
      if (s) void s.unloadAsync();
    };
  }, [lazy, resolveSource]);

  const play = useCallback(async () => {
    if (playing || plays >= maxPlays) return;
    let uri = uriRef.current;
    if (!uri) {
      setState("loading");
      try {
        uri = await resolveSource();
      } catch {
        uri = null;
      }
      if (!alive.current) return;
      if (!uri) {
        setState("error");
        finishedCb.current?.();
        return;
      }
      setState("ready");
    }
    setPlays((p) => p + 1);
    try {
      if (!soundRef.current) {
        const { sound } = await Sound.createAsync({ uri });
        sound.setOnPlaybackStatusUpdate((st) => {
          if (st.didJustFinish) {
            setPlaying(false);
            finishedCb.current?.();
          }
        });
        soundRef.current = sound;
      }
      setPlaying(true);
      await soundRef.current.playAsync();
    } catch {
      setPlaying(false);
      setState("error");
      finishedCb.current?.();
    }
  }, [maxPlays, playing, plays, resolveSource]);

  const stop = useCallback(() => {
    const s = soundRef.current;
    if (s) void s.pauseAsync();
    setPlaying(false);
  }, []);

  return {
    state,
    playing,
    plays,
    playsLeft: Number.isFinite(maxPlays) ? Math.max(0, maxPlays - plays) : Infinity,
    play,
    stop,
  };
}
