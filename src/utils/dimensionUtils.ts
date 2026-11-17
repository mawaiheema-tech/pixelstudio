import type { CropRegion } from "../types/editor";

type ImageDimensions = {
  width: number;
  height: number;
};

export function getImageDimensions(
  originalImageDimensions: ImageDimensions | null,
  cropRegion: CropRegion | null
): ImageDimensions | null {
  if (!originalImageDimensions) return null;

  return cropRegion
    ? { width: cropRegion.width, height: cropRegion.height }
    : originalImageDimensions;
}