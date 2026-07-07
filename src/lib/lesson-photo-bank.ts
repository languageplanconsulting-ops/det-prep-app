/**
 * Openly-licensed photo bank for write/speak-about-photo lessons — ported
 * from det-mobile/src/lib/photos.ts. Images are the Openverse thumbnail
 * proxy URL (`display`), same as mobile — no re-hosting needed.
 */
import manifest from "./photo-bank-manifest.json";

export type PhotoMeta = {
  id: string;
  scene: string;
  display: string;
  source_url: string;
  title: string;
  tags: string[];
  license: string;
  license_version: string;
  license_url: string;
  creator: string;
  attribution: string;
  landing: string;
  provider: string;
  width: number;
  height: number;
};

export const PHOTOS = manifest as PhotoMeta[];

const byId = new Map(PHOTOS.map((p) => [p.id, p]));

export function getPhoto(id: string): PhotoMeta | undefined {
  return byId.get(id);
}

export function photoCredit(p: PhotoMeta): string {
  return `${p.creator} · ${p.license.toUpperCase()} ${p.license_version} · via ${p.provider}`;
}
