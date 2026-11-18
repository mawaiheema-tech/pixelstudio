import type {
  CropRegion,
  EditorLayer,
  Point,
  Selection,
} from "../types/editor";

type CanvasRendererOptions = {
  canvas: HTMLCanvasElement | null;
  image: HTMLImageElement | null;
  originalImage: HTMLImageElement | null;
  cropRegion: CropRegion | null;
  zoom: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  offset: Point;
  comparisonPosition: number;
  layers: EditorLayer[];
  selectedLayerId: string | null;
  cropMode: boolean;
  cropSelection: Selection | null;
};

export function drawCanvas({
  canvas,
  image,
  originalImage,
  cropRegion,
  zoom,
  brightness,
  contrast,
  saturation,
  blur,
  offset,
  comparisonPosition,
  layers,
  selectedLayerId,
  cropMode,
  cropSelection,
}: CanvasRendererOptions): void {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.clearRect(0, 0, width, height);

  if (!image) {
    ctx.fillStyle = "#999";
    ctx.font = "15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "Upload an image to start editing",
      width / 2,
      height / 2
    );
    return;
  }

  const source = cropRegion ?? {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };

  const drawWidth = source.width * zoom;
  const drawHeight = source.height * zoom;

  const filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;

  // Draw edited image
  ctx.save();
  ctx.filter = filter;

  ctx.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    offset.x,
    offset.y,
    drawWidth,
    drawHeight
  );

  ctx.restore();

  // Draw original image for before/after comparison
  if (originalImage) {
    ctx.save();

    const clipWidth = drawWidth * (comparisonPosition / 100);

    ctx.beginPath();
    ctx.rect(offset.x, offset.y, clipWidth, drawHeight);
    ctx.clip();

    ctx.filter = "none";

    ctx.drawImage(
      originalImage,
      source.x,
      source.y,
      source.width,
      source.height,
      offset.x,
      offset.y,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    // Comparison divider
    const dividerX = offset.x + clipWidth;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dividerX, offset.y);
    ctx.lineTo(dividerX, offset.y + drawHeight);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Draw editor layers
  layers.forEach((layer) => {
    if (!layer.visible) return;

    const layerX = offset.x + layer.x * zoom;
    const layerY = offset.y + layer.y * zoom;
    const layerWidth = layer.width * zoom;
    const layerHeight = layer.height * zoom;

    ctx.save();

    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode ?? "source-over";

    const centerX = layerX + layerWidth / 2;
    const centerY = layerY + layerHeight / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    if (layer.type === "text") {
      ctx.fillStyle = layer.fill;
      ctx.font = `${(layer.fontSize ?? 32) * zoom}px Arial`;
      ctx.textBaseline = "top";
      ctx.fillText(layer.text ?? "", layerX, layerY, layerWidth);
    }

    if (layer.type === "rectangle") {
      ctx.fillStyle = layer.fill;
      ctx.fillRect(layerX, layerY, layerWidth, layerHeight);
    }

    if (layer.type === "circle") {
      ctx.fillStyle = layer.fill;
      ctx.beginPath();

      ctx.ellipse(
        layerX + layerWidth / 2,
        layerY + layerHeight / 2,
        layerWidth / 2,
        layerHeight / 2,
        0,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    if (layer.type === "image" && layer.image) {
      ctx.drawImage(
        layer.image,
        layerX,
        layerY,
        layerWidth,
        layerHeight
      );
    }

    ctx.restore();
  });

  // Draw selected layer controls
  const currentSelectedLayer = layers.find(
    (layer) => layer.id === selectedLayerId
  );

  if (currentSelectedLayer?.visible) {
    const x = offset.x + currentSelectedLayer.x * zoom;
    const y = offset.y + currentSelectedLayer.y * zoom;
    const selectedWidth = currentSelectedLayer.width * zoom;
    const selectedHeight = currentSelectedLayer.height * zoom;

    ctx.save();

    const selectionCenterX = x + selectedWidth / 2;
    const selectionCenterY = y + selectedHeight / 2;

    ctx.translate(selectionCenterX, selectionCenterY);

    ctx.rotate(
      ((currentSelectedLayer.rotation ?? 0) * Math.PI) / 180
    );

    ctx.translate(-selectionCenterX, -selectionCenterY);

    // Selection border
    ctx.strokeStyle = "#9b85ff";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);

    ctx.strokeRect(x, y, selectedWidth, selectedHeight);

    ctx.setLineDash([]);

    // Resize handles
    const handles = [
      [x, y],
      [x + selectedWidth, y],
      [x, y + selectedHeight],
      [x + selectedWidth, y + selectedHeight],
    ];

    handles.forEach(([handleX, handleY]) => {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#9b85ff";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.rect(handleX - 5, handleY - 5, 10, 10);
      ctx.fill();
      ctx.stroke();
    });

    // Rotation handle
    const rotateHandleX = x + selectedWidth / 2;
    const rotateHandleY = y - 25;

    ctx.beginPath();
    ctx.moveTo(rotateHandleX, y);
    ctx.lineTo(rotateHandleX, rotateHandleY);
    ctx.strokeStyle = "#9b85ff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rotateHandleX, rotateHandleY, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#9b85ff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  // Draw crop selection overlay
  if (cropMode && cropSelection) {
    const {
      x,
      y,
      width: selectionWidth,
      height: selectionHeight,
    } = cropSelection;

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, width, height);

    ctx.clearRect(x, y, selectionWidth, selectionHeight);

    ctx.filter = filter;

    ctx.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      offset.x,
      offset.y,
      drawWidth,
      drawHeight
    );

    ctx.filter = "none";

    ctx.strokeStyle = "#9b85ff";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 4]);

    ctx.strokeRect(x, y, selectionWidth, selectionHeight);

    ctx.setLineDash([]);
    ctx.fillStyle = "#9b85ff";

    const corners = [
      [x, y],
      [x + selectionWidth, y],
      [x, y + selectionHeight],
      [x + selectionWidth, y + selectionHeight],
    ];

    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx - 4, cy - 4, 8, 8);
    });

    ctx.restore();
  }
}