
import type { CropRegion, TransformAction } from "../types/editor";

export function transformImageCanvas(
  image: HTMLImageElement,
  source: CropRegion,
  action: TransformAction
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const isRotation =
      action === "rotate-left" || action === "rotate-right";

    const outputWidth = Math.round(
      isRotation ? source.height : source.width
    );

    const outputHeight = Math.round(
      isRotation ? source.width : source.height
    );

    const transformCanvas = document.createElement("canvas");
    transformCanvas.width = outputWidth;
    transformCanvas.height = outputHeight;

    const ctx = transformCanvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Unable to process image."));
      return;
    }

    ctx.translate(outputWidth / 2, outputHeight / 2);

    if (action === "rotate-right") {
      ctx.rotate(Math.PI / 2);
    } else if (action === "rotate-left") {
      ctx.rotate(-Math.PI / 2);
    } else if (action === "flip-horizontal") {
      ctx.scale(-1, 1);
    } else if (action === "flip-vertical") {
      ctx.scale(1, -1);
    }

    ctx.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      -source.width / 2,
      -source.height / 2,
      source.width,
      source.height
    );

    const transformedImage = new Image();

    transformedImage.onload = () => resolve(transformedImage);

    transformedImage.onerror = () => {
      reject(new Error("Unable to transform this image."));
    };

    try {
      transformedImage.src = transformCanvas.toDataURL("image/png");
    } catch (error) {
      reject(error);
    }
  });
}
