export type SynthNote = {
  f: number;
  start: number;
  dur: number;
  vol?: number;
  slideTo?: number;
};

/** Synthesize a short mono 16-bit WAV (Duolingo-style UI bleeps). */
export function notesToWavBase64(notes: SynthNote[], sampleRate = 22050): string {
  const totalSec = Math.max(...notes.map((n) => n.start + n.dur), 0.05) + 0.04;
  const numSamples = Math.ceil(totalSec * sampleRate);
  const samples = new Float32Array(numSamples);

  for (const n of notes) {
    const start = Math.floor(n.start * sampleRate);
    const end = Math.min(numSamples, Math.floor((n.start + n.dur) * sampleRate));
    const vol = n.vol ?? 0.12;
    for (let i = start; i < end; i++) {
      const t = (i - start) / sampleRate;
      const progress = Math.min(1, t / n.dur);
      let freq = n.f;
      if (n.slideTo && n.slideTo > 0 && n.f > 0) {
        freq = n.f * Math.pow(n.slideTo / n.f, progress);
      }
      const attack = Math.min(1, t / 0.006);
      const decay = Math.exp(-4.2 * progress);
      const env = attack * decay;
      const phase = 2 * Math.PI * freq * t;
      samples[i]! += Math.sin(phase) * vol * env;
    }
  }

  const pcm = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]!));
    pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, pcm.byteLength, true);

  const bytes = new Uint8Array(44 + pcm.byteLength);
  bytes.set(new Uint8Array(header), 0);
  bytes.set(new Uint8Array(pcm.buffer), 44);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return bytesToBase64(bytes);
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : "=";
    out += i + 2 < bytes.length ? B64[n & 63]! : "=";
  }
  return out;
}
