
import type { CropRegion, Selection } from "../types/editor";

export function calculateCropRegion(
  cropSelection: Selection,
  currentCrop: CropRegion,
  offset: { x: number; y: number },
  zoom: number
): CropRegion | null {
  if (zoom <= 0) return null;

  const nextCrop: CropRegion = {
    x: currentCrop.x + (cropSelection.x - offset.x) / zoom,
    y: currentCrop.y + (cropSelection.y - offset.y) / zoom,
    width: cropSelection.width / zoom,
    height: cropSelection.height / zoom,
  };

  nextCrop.x = Math.max(currentCrop.x, nextCrop.x);
  nextCrop.y = Math.max(currentCrop.y, nextCrop.y);

  nextCrop.width = Math.min(
    nextCrop.width,
    currentCrop.x + currentCrop.width - nextCrop.x
  );

  nextCrop.height = Math.min(
    nextCrop.height,
    currentCrop.y + currentCrop.height - nextCrop.y
  );

  if (nextCrop.width <= 0 || nextCrop.height <= 0) {
    return null;
  }

  return nextCrop;
}
