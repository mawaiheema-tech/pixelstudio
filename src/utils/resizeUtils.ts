
import type { CropRegion } from "../types/editor";

export function resizeImageCanvas(
  image: HTMLImageElement,
  source: CropRegion,
  width: number,
  height: number
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const resizeCanvas = document.createElement("canvas");
    resizeCanvas.width = width;
    resizeCanvas.height = height;

    const ctx = resizeCanvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Unable to process image."));
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      width,
      height
    );

    const resizedImage = new Image();

    resizedImage.onload = () => resolve(resizedImage);

    resizedImage.onerror = () => {
      reject(new Error("Unable to resize this image."));
    };

    try {
      resizedImage.src = resizeCanvas.toDataURL("image/png");
    } catch (error) {
      reject(error);
    }
  });
}
