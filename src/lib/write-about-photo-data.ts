import type { PhotoSpeakItem } from "@/types/photo-speak";

import {
  findWriteAboutPhotoItemInStorage,
  getWriteAboutPhotoRoundForItemId,
  getWriteAboutPhotoSetByRound,
  type WriteAboutPhotoRoundNum,
} from "@/lib/write-about-photo-storage";

export type { WriteAboutPhotoRoundNum };

/** @deprecated Use round-based routes; kept for typing helpers. */
export interface WritePhotoRound {
  id: string;
  round: WriteAboutPhotoRoundNum;
  titleEn: string;
  titleTh: string;
  items: PhotoSpeakItem[];
}

export function findWriteAboutPhotoItem(id: string): PhotoSpeakItem | undefined {
  return findWriteAboutPhotoItemInStorage(id);
}

export function getWriteAboutPhotoRoundNumberForItem(itemId: string): WriteAboutPhotoRoundNum | undefined {
  return getWriteAboutPhotoRoundForItemId(itemId);
}

/** Items for a round (1–5), or undefined if invalid round. */
export function getWriteAboutPhotoRound(round: number): PhotoSpeakItem[] | undefined {
  return getWriteAboutPhotoSetByRound(round);
}
