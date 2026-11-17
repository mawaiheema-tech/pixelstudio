
import type { CropRegion, EditorLayer } from "../types/editor";

type ExportFormat = "png" | "jpeg" | "webp";

type ExportOptions = {
  image: HTMLImageElement;
  source: CropRegion;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  layers: EditorLayer[];
  format: ExportFormat;
  quality: number;
  width: number;
  height: number;
};

export function createExportDataURL({
  image,
  source,
  brightness,
  contrast,
  saturation,
  blur,
  layers,
  format,
  quality,
  width,
  height,
}: ExportOptions): string {
  const canvas = document.createElement("canvas");
  const outputWidth = width || source.width;
  const outputHeight = height || source.height;

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create export canvas.");
  }

  ctx.scale(
    outputWidth / source.width,
    outputHeight / source.height
  );
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;

  ctx.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    source.width,
    source.height
  );

  ctx.filter = "none";

  layers.forEach((layer) => {
    if (!layer.visible) return;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode ?? "source-over";    

    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    if (layer.type === "text") {
      ctx.fillStyle = layer.fill;
      ctx.font = `${layer.fontSize ?? 32}px Arial`;
      ctx.textBaseline = "top";
      ctx.fillText(layer.text ?? "", layer.x, layer.y, layer.width);
    }

    if (layer.type === "rectangle") {
      ctx.fillStyle = layer.fill;
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
    }

    if (layer.type === "circle") {
      ctx.fillStyle = layer.fill;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        layer.width / 2,
        layer.height / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    if (layer.type === "image" && layer.image) {
      ctx.drawImage(layer.image, layer.x, layer.y, layer.width, layer.height);
    }

    ctx.restore();
  });

  const mimeType = `image/${format}`;
 
  const outputQuality = format === "png" ? undefined : quality / 100;

  return canvas.toDataURL(mimeType, outputQuality);
}