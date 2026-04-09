/** True if `thumbnail` should be rendered as an image (`<img src>`). */
export function isSpeakingThumbnailMediaUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (t.startsWith("//")) return true;
  if (t.startsWith("/")) return true;
  if (/^data:image\//i.test(t)) return true;
  return false;
}
