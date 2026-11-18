import type { Dispatch, SetStateAction } from "react";
import type { MouseEvent } from "react";

import type {
  Point,
  CropRegion,
  Selection,
  EditorLayer,
  LayerResizeAction,
} from "../types/editor";

import {
  findLayerAtPoint,
  getResizeHandle,
} from "../utils/layerUtils";

import { getCanvasPoint } from "../utils/canvasUtils";

type LayerDragData = {
  id: string;
  startX: number;
  startY: number;
  layerX: number;
  layerY: number;
};

type LayerRotateData = {
  id: string;
  centerX: number;
  centerY: number;
  startAngle: number;
  originalRotation: number;
};

type CanvasInteractionOptions = {
  imageRef: { current: HTMLImageElement | null };

  layerDragRef: { current: LayerDragData | null };
  layerResizeRef: { current: LayerResizeAction | null };
  layerRotateRef: { current: LayerRotateData | null };

  layers: EditorLayer[];
  selectedLayerId: string | null;

  cropMode: boolean;
  isSelecting: boolean;
  cropRegion: CropRegion | null;
  cropStart: Point | null;
  cropAspectRatio: number | null;

  zoom: number;
  offset: Point;

  isDragging: boolean;
  lastPosition: Point;

  setIsDragging: Dispatch<SetStateAction<boolean>>;
  setIsSelecting: Dispatch<SetStateAction<boolean>>;
  setCropStart: Dispatch<SetStateAction<Point | null>>;
  setCropSelection: Dispatch<SetStateAction<Selection | null>>;
  setSelectedLayerId: Dispatch<SetStateAction<string | null>>;
  setIsTransformingLayer: Dispatch<SetStateAction<boolean>>;
  setLayerDragStart: Dispatch<SetStateAction<Point | null>>;
  setLayers: Dispatch<SetStateAction<EditorLayer[]>>;
  setOffset: Dispatch<SetStateAction<Point>>;
  setLastPosition: Dispatch<SetStateAction<Point>>;

  updateLayer: (
    id: string,
    updates: Partial<EditorLayer>
  ) => void;
};

export function useCanvasInteractions({
  imageRef,
  layerDragRef,
  layerResizeRef,
  layerRotateRef,
  layers,
  selectedLayerId,
  cropMode,
  isSelecting,
  cropRegion,
  cropStart,
  cropAspectRatio,
  zoom,
  offset,
  isDragging,
  lastPosition,
  setIsDragging,
  setIsSelecting,
  setCropStart,
  setCropSelection,
  setSelectedLayerId,
  setIsTransformingLayer,
  setLayerDragStart,
  setLayers,
  setOffset,
  setLastPosition,
  updateLayer,
}: CanvasInteractionOptions) {
  const handleMouseDown = (
    event: MouseEvent<HTMLCanvasElement>
  ) => {
    const point = getCanvasPoint(event);

    // Start crop selection
    if (cropMode) {
      setIsSelecting(true);
      setCropStart(point);

      setCropSelection({
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
      });

      return;
    }

    const activeLayer = layers.find(
      (layer) => layer.id === selectedLayerId
    );

    // Check rotation handle
    if (activeLayer?.visible && !activeLayer.locked) {
      const centerX =
        offset.x + (activeLayer.x + activeLayer.width / 2) * zoom;

      const centerY =
        offset.y + (activeLayer.y + activeLayer.height / 2) * zoom;

      const topY = offset.y + activeLayer.y * zoom - 25;
      const angle = ((activeLayer.rotation ?? 0) * Math.PI) / 180;

      const dx = 0;
      const dy = topY - centerY;

      const rotateHandleX =
        centerX + dx * Math.cos(angle) - dy * Math.sin(angle);

      const rotateHandleY =
        centerY + dx * Math.sin(angle) + dy * Math.cos(angle);

      const distance = Math.hypot(
        point.x - rotateHandleX,
        point.y - rotateHandleY
      );

      if (distance <= 12) {
        layerRotateRef.current = {
          id: activeLayer.id,
          centerX,
          centerY,
          startAngle: Math.atan2(
            point.y - centerY,
            point.x - centerX
          ),
          originalRotation: activeLayer.rotation ?? 0,
        };

        setIsTransformingLayer(true);
        return;
      }
    }

    // Check resize handles
    if (activeLayer?.visible && !activeLayer.locked) {
      const handle = getResizeHandle(
        point,
        activeLayer,
        offset,
        zoom
      );

      if (handle) {
        layerResizeRef.current = {
          id: activeLayer.id,
          handle,
          startX: point.x,
          startY: point.y,
          originalX: activeLayer.x,
          originalY: activeLayer.y,
          originalWidth: activeLayer.width,
          originalHeight: activeLayer.height,
        };

        setIsTransformingLayer(true);
        return;
      }
    }

    // Check whether a layer was clicked
    const clickedLayer = findLayerAtPoint(
      point,
      layers,
      offset,
      zoom
    );

    if (clickedLayer) {
      setSelectedLayerId(clickedLayer.id);

      if (!clickedLayer.locked) {
        layerDragRef.current = {
          id: clickedLayer.id,
          startX: point.x,
          startY: point.y,
          layerX: clickedLayer.x,
          layerY: clickedLayer.y,
        };

        setIsTransformingLayer(true);
        setLayerDragStart(point);
        return;
      }
    } else {
      setSelectedLayerId(null);
    }

    // Start moving the canvas
    setIsDragging(true);

    setLastPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMouseMove = (
    event: MouseEvent<HTMLCanvasElement>
  ) => {
    const point = getCanvasPoint(event);

    // Handle crop selection
    if (cropMode && isSelecting && cropStart) {
      const image = imageRef.current;
      if (!image) return;

      const source = cropRegion ?? {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      };

      const imageLeft = offset.x;
      const imageTop = offset.y;
      const imageRight = imageLeft + source.width * zoom;
      const imageBottom = imageTop + source.height * zoom;

      const currentX = Math.min(
        imageRight,
        Math.max(imageLeft, point.x)
      );

      const currentY = Math.min(
        imageBottom,
        Math.max(imageTop, point.y)
      );

      const startX = Math.min(
        imageRight,
        Math.max(imageLeft, cropStart.x)
      );

      const startY = Math.min(
        imageBottom,
        Math.max(imageTop, cropStart.y)
      );

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      const directionX = deltaX < 0 ? -1 : 1;
      const directionY = deltaY < 0 ? -1 : 1;

      let selectionWidth = Math.abs(deltaX);
      let selectionHeight = Math.abs(deltaY);

      const maxWidth =
        directionX < 0
          ? startX - imageLeft
          : imageRight - startX;

      const maxHeight =
        directionY < 0
          ? startY - imageTop
          : imageBottom - startY;

      if (cropAspectRatio !== null) {
        const desiredWidth = Math.max(
          selectionWidth,
          selectionHeight * cropAspectRatio
        );

        const maxAllowedWidth = Math.min(
          maxWidth,
          maxHeight * cropAspectRatio
        );

        selectionWidth = Math.min(
          desiredWidth,
          maxAllowedWidth
        );

        selectionHeight = selectionWidth / cropAspectRatio;
      }

      const selectionX =
        directionX < 0
          ? startX - selectionWidth
          : startX;

      const selectionY =
        directionY < 0
          ? startY - selectionHeight
          : startY;

      setCropSelection({
        x: selectionX,
        y: selectionY,
        width: selectionWidth,
        height: selectionHeight,
      });

      return;
    }

    // Rotate selected layer
    if (layerRotateRef.current) {
      const rotationData = layerRotateRef.current;

      const currentAngle = Math.atan2(
        point.y - rotationData.centerY,
        point.x - rotationData.centerX
      );

      const angleDifference =
        (currentAngle - rotationData.startAngle) *
        (180 / Math.PI);

      const newRotation =
        rotationData.originalRotation + angleDifference;

      setLayers((previousLayers) =>
        previousLayers.map((layer) =>
          layer.id === rotationData.id
            ? { ...layer, rotation: newRotation }
            : layer
        )
      );

      return;
    }

    // Resize selected layer
    if (layerResizeRef.current) {
      const resize = layerResizeRef.current;

      const resizingLayer = layers.find(
        (layer) => layer.id === resize.id
      );

      const angle =
        ((resizingLayer?.rotation ?? 0) * Math.PI) / 180;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const screenDX = point.x - resize.startX;
      const screenDY = point.y - resize.startY;

      const dx = (screenDX * cos + screenDY * sin) / zoom;
      const dy = (-screenDX * sin + screenDY * cos) / zoom;

      const isLeft =
        resize.handle === "nw" || resize.handle === "sw";

      const isTop =
        resize.handle === "nw" || resize.handle === "ne";

      let width =
        resize.originalWidth + (isLeft ? -dx : dx);

      let height =
        resize.originalHeight + (isTop ? -dy : dy);

      // Preserve aspect ratio while Shift is held
      if (event.shiftKey) {
        const ratio =
          resize.originalWidth / resize.originalHeight;

        const widthChange =
          Math.abs(width - resize.originalWidth) /
          resize.originalWidth;

        const heightChange =
          Math.abs(height - resize.originalHeight) /
          resize.originalHeight;

        if (widthChange >= heightChange) {
          height = width / ratio;
        } else {
          width = height * ratio;
        }
      }

      width = Math.max(10, width);
      height = Math.max(10, height);

      const originalAnchorX = isLeft
        ? resize.originalX + resize.originalWidth
        : resize.originalX;

      const originalAnchorY = isTop
        ? resize.originalY + resize.originalHeight
        : resize.originalY;

      const originalCenterX =
        resize.originalX + resize.originalWidth / 2;

      const originalCenterY =
        resize.originalY + resize.originalHeight / 2;

      const anchorX =
        originalCenterX +
        (originalAnchorX - originalCenterX) * cos -
        (originalAnchorY - originalCenterY) * sin;

      const anchorY =
        originalCenterY +
        (originalAnchorX - originalCenterX) * sin +
        (originalAnchorY - originalCenterY) * cos;

      const newAnchorX = isLeft ? width : 0;
      const newAnchorY = isTop ? height : 0;

      const newCenterX = width / 2;
      const newCenterY = height / 2;

      const rotatedAnchorX =
        (newAnchorX - newCenterX) * cos -
        (newAnchorY - newCenterY) * sin;

      const rotatedAnchorY =
        (newAnchorX - newCenterX) * sin +
        (newAnchorY - newCenterY) * cos;

      const x =
        anchorX - rotatedAnchorX - newCenterX;

      const y =
        anchorY - rotatedAnchorY - newCenterY;

      updateLayer(resize.id, {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width,
        height,
      });

      return;
    }

    // Move selected layer
    if (layerDragRef.current) {
      const drag = layerDragRef.current;

      const dx = (point.x - drag.startX) / zoom;
      const dy = (point.y - drag.startY) / zoom;

      updateLayer(drag.id, {
        x: Math.max(0, drag.layerX + dx),
        y: Math.max(0, drag.layerY + dy),
      });

      return;
    }

    // Move canvas
    if (!isDragging) return;

    const dx = event.clientX - lastPosition.x;
    const dy = event.clientY - lastPosition.y;

    setOffset((previous) => ({
      x: previous.x + dx,
      y: previous.y + dy,
    }));

    setLastPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const stopDragging = () => {
    setIsDragging(false);
    setIsSelecting(false);

    const wasTransforming =
      layerDragRef.current !== null ||
      layerResizeRef.current !== null ||
      layerRotateRef.current !== null;

    layerDragRef.current = null;
    layerResizeRef.current = null;
    layerRotateRef.current = null;

    setLayerDragStart(null);

    if (wasTransforming) {
      setIsTransformingLayer(false);
    }
  };

  return {
    handleMouseDown,
    handleMouseMove,
    stopDragging,
  };
}