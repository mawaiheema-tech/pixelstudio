
export type Point = {
  x: number;
  y: number;
};

export type CropRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Selection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TransformAction =
  | "rotate-left"
  | "rotate-right"
  | "flip-horizontal"
  | "flip-vertical";

export type PresetName =
  | "original"
  | "vivid"
  | "warm"
  | "cool"
  | "grayscale"
  | "vintage"
  | "custom";

export type LayerType = "text" | "rectangle" | "circle" | "image";

export type EditorLayer = {
  id: string;
  name: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  text?: string;
  fontSize?: number;
  fill: string;
  image?: HTMLImageElement;
};

export type LayerResizeAction = {
  id: string;
  handle: "nw" | "ne" | "sw" | "se";
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
};

export type HistorySnapshot = {
  name: string;
  image: HTMLImageElement | null;
  cropRegion: CropRegion | null;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  activePreset: PresetName;
  layers: EditorLayer[];
  selectedLayerId: string | null;
};
