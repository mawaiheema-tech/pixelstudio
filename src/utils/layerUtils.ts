
import type {
  Point,
  EditorLayer,
  LayerResizeAction,
} from "../types/editor";

export function findLayerAtPoint(
  point: Point,
  layers: EditorLayer[],
  offset: Point,
  zoom: number
): EditorLayer | null {
  const imagePoint = {
    x: (point.x - offset.x) / zoom,
    y: (point.y - offset.y) / zoom,
  };

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];

    if (!layer.visible) continue;

    const inside =
      imagePoint.x >= layer.x &&
      imagePoint.x <= layer.x + layer.width &&
      imagePoint.y >= layer.y &&
      imagePoint.y <= layer.y + layer.height;

    if (inside) return layer;
  }

  return null;
}

export function getResizeHandle(
  point: Point,
  layer: EditorLayer,
  offset: Point,
  zoom: number
): LayerResizeAction["handle"] | null {
  const left = offset.x + layer.x * zoom;
  const top = offset.y + layer.y * zoom;
  const width = layer.width * zoom;
  const height = layer.height * zoom;

  const centerX = left + width / 2;
  const centerY = top + height / 2;

  const angle = ((layer.rotation ?? 0) * Math.PI) / 180;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const corners = [
    { name: "nw" as const, x: left, y: top },
    { name: "ne" as const, x: left + width, y: top },
    { name: "sw" as const, x: left, y: top + height },
    { name: "se" as const, x: left + width, y: top + height },
  ];

  const hitArea = 10;

  for (const corner of corners) {
    const dx = corner.x - centerX;
    const dy = corner.y - centerY;

    const rotatedX = centerX + dx * cos - dy * sin;
    const rotatedY = centerY + dx * sin + dy * cos;

    if (
      Math.abs(point.x - rotatedX) <= hitArea &&
      Math.abs(point.y - rotatedY) <= hitArea
    ) {
      return corner.name;
    }
  }

  return null;
}
