
import type { Point } from "../types/editor";
import type { MouseEvent } from "react";

export function getCanvasPoint(
  event: MouseEvent<HTMLCanvasElement>
): Point {
  const rect = event.currentTarget.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}
