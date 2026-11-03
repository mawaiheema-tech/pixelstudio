import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import {
  ImagePlus, Upload, ZoomIn, ZoomOut, Maximize, RotateCcw,
  RotateCw, FlipHorizontal, FlipVertical, MousePointer2, Crop,
  SlidersHorizontal, Layers, Undo2, Redo2, Settings,
  Image as ImageIcon, Check, X, Lock, Unlock, Type, Square,
  Circle, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, History,
} from "lucide-react";
import "./App.css";
import {
  saveProject,
  getAllProjects,
  getProject,
  deleteProject,
} from "./services/projectStorage";

import type { SavedProject } from "./services/projectStorage";
type Point = { x: number; y: number };
type CropRegion = { x: number; y: number; width: number; height: number };
type Selection = { x: number; y: number; width: number; height: number };

type TransformAction =
  | "rotate-left" | "rotate-right"
  | "flip-horizontal" | "flip-vertical";

type PresetName =
  | "original" | "vivid" | "warm" | "cool"
  | "grayscale" | "vintage" | "custom";

type LayerType = "text" | "rectangle" | "circle" | "image";

type EditorLayer = {
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
type LayerResizeAction = {
  id: string;
  handle: "nw" | "ne" | "sw" | "se";
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
};

type HistorySnapshot = {
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

const presets = {
  original: { brightness: 100, contrast: 100, saturation: 100, blur: 0 },
  vivid: { brightness: 110, contrast: 120, saturation: 150, blur: 0 },
  warm: { brightness: 105, contrast: 105, saturation: 115, blur: 0 },
  cool: { brightness: 105, contrast: 110, saturation: 90, blur: 0 },
  grayscale: { brightness: 100, contrast: 110, saturation: 0, blur: 0 },
  vintage: { brightness: 105, contrast: 90, saturation: 75, blur: 0 },
};

const imageToDataURL = (image: HTMLImageElement): string => {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to process image.");
  }

  ctx.drawImage(image, 0, 0);

  return canvas.toDataURL("image/png");
};

const dataURLToImage = (dataURL: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to restore image."));

    image.src = dataURL;
  });
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layerImageInputRef = useRef<HTMLInputElement>(null);

  const layerDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    layerX: number;
    layerY: number;
  } | null>(null);
  
  const layerResizeRef = useRef<LayerResizeAction | null>(null);
  const layerRotateRef = useRef<{
  id: string;
  centerX: number;
  centerY: number;
  startAngle: number;
  originalRotation: number;
} | null>(null);
  const [imageName, setImageName] = useState("");
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isTransformingLayer, setIsTransformingLayer] = useState(false);
  const [lastPosition, setLastPosition] = useState<Point>({ x: 0, y: 0 });

  const [cropMode, setCropMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [cropStart, setCropStart] = useState<Point | null>(null);
  const [cropSelection, setCropSelection] = useState<Selection | null>(null);
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [imageRevision, setImageRevision] = useState(0);

  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [activePreset, setActivePreset] = useState<PresetName>("original");

  const [layers, setLayers] = useState<EditorLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activePanel, setActivePanel] =
    useState<"properties" | "layers" | "history"| "projects">("properties");
  const [layerDragStart, setLayerDragStart] = useState<Point | null>(null);

  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isRestoringHistory = useRef(false);
  const historyReady = useRef(false);
  
  useEffect(() => {
  let isMounted = true;

  const loadSavedProjects = async () => {
    try {
      const projects = await getAllProjects();

      if (isMounted) {
        setSavedProjects(projects);
      }
    } catch (error) {
      console.error("Unable to load saved projects:", error);
    }
  };

  loadSavedProjects();

  return () => {
    isMounted = false;
  };
}, []);

  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);

 useEffect(() => {
    if (isTransformingLayer) {
      return;
    }
    if (isRestoringHistory.current) {
  isRestoringHistory.current = false;
  return;
}

const snapshot: HistorySnapshot = {
      name: imageName,
      image: imageRef.current,
      cropRegion: cropRegion ? { ...cropRegion } : null,
      brightness,
      contrast,
      saturation,
      blur,
      activePreset,
      layers: layers.map((layer) => ({ ...layer })),
      selectedLayerId,
    };

    if (!historyReady.current) {
      historyReady.current = true;
      setHistory([snapshot]);
      setHistoryIndex(0);
      return;
    }

    setHistory((previous) => {
      const next = previous.slice(0, historyIndex + 1);
      next.push(snapshot);
      const trimmed = next.length > 100 ? next.slice(-100) : next;
      setHistoryIndex(trimmed.length - 1);
      return trimmed;
    });
   }, [
    imageName, imageRevision, cropRegion, brightness, contrast,
    saturation, blur, activePreset, layers, selectedLayerId,
    isTransformingLayer,
  ]);

  const restoreHistory = (index: number) => {
    const snapshot = history[index];
    if (!snapshot) return;

    isRestoringHistory.current = true;
    imageRef.current = snapshot.image;
    setImageName(snapshot.name);
    setCropRegion(snapshot.cropRegion ? { ...snapshot.cropRegion } : null);
    setBrightness(snapshot.brightness);
    setContrast(snapshot.contrast);
    setSaturation(snapshot.saturation);
    setBlur(snapshot.blur);
    setActivePreset(snapshot.activePreset);
    setLayers(snapshot.layers.map((layer) => ({ ...layer })));
    setSelectedLayerId(snapshot.selectedLayerId);
    setCropMode(false);
    setCropSelection(null);
    setCropStart(null);
    setIsSelecting(false);
    setImageRevision((value) => value + 1);
    setHistoryIndex(index);
  };

  const undo = () => {
    if (historyIndex > 0) restoreHistory(historyIndex - 1);
  };

  const redo = () => {
    if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );

      if (isTyping) return;

      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;

      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history.length]);

  const getImageDimensions = () => {
    const image = imageRef.current;
    if (!image) return null;

    return cropRegion
      ? { width: cropRegion.width, height: cropRegion.height }
      : { width: image.width, height: image.height };
  };

  const resetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setActivePreset("original");
  };

  const applyPreset = (name: Exclude<PresetName, "custom">) => {
    const preset = presets[name];
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setSaturation(preset.saturation);
    setBlur(preset.blur);
    setActivePreset(name);
  };

  useEffect(() => {
    const dimensions = getImageDimensions();
    if (dimensions) {
      setResizeWidth(Math.round(dimensions.width));
      setResizeHeight(Math.round(dimensions.height));
    }
  }, [imageRevision, cropRegion]);

  const getCanvasPoint = (event: MouseEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
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
      ctx.fillText("Upload an image to start editing", width / 2, height / 2);
      return;
    }

    const source = cropRegion ?? {
      x: 0, y: 0, width: image.width, height: image.height,
    };

    const drawWidth = source.width * zoom;
    const drawHeight = source.height * zoom;
    const filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;

    ctx.save();
    ctx.filter = filter;
    ctx.drawImage(
      image, source.x, source.y, source.width, source.height,
      offset.x, offset.y, drawWidth, drawHeight
    );
    ctx.restore();

    layers.forEach((layer) => {
      if (!layer.visible) return;

      const layerX = offset.x + layer.x * zoom;
      const layerY = offset.y + layer.y * zoom;
      const layerWidth = layer.width * zoom;
      const layerHeight = layer.height * zoom;

      ctx.save();
      ctx.globalAlpha = layer.opacity;

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
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }

      if (layer.type === "image" && layer.image) {
        ctx.drawImage(layer.image, layerX, layerY, layerWidth, layerHeight);
      }

      ctx.restore();
    });

    const currentSelectedLayer = layers.find(
      (layer) => layer.id === selectedLayerId
    );

  if (currentSelectedLayer?.visible) {
  const x = offset.x + currentSelectedLayer.x * zoom;
  const y = offset.y + currentSelectedLayer.y * zoom;
  const width = currentSelectedLayer.width * zoom;
  const height = currentSelectedLayer.height * zoom;

  ctx.save();

  // Rotate the selection box around the layer's center.
const selectionCenterX = x + width / 2;
const selectionCenterY = y + height / 2;

ctx.translate(selectionCenterX, selectionCenterY);
ctx.rotate(
  ((currentSelectedLayer.rotation ?? 0) * Math.PI) / 180
);
ctx.translate(-selectionCenterX, -selectionCenterY);

  // Selection border
  ctx.strokeStyle = "#9b85ff";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);

  // Four resize handles
  const handles = [
    [x, y],
    [x + width, y],
    [x, y + height],
    [x + width, y + height],
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
  const rotateHandleX = x + width / 2;
  const rotateHandleY = y - 25;

  // Connector line
  ctx.beginPath();
  ctx.moveTo(rotateHandleX, y);
  ctx.lineTo(rotateHandleX, rotateHandleY);
  ctx.strokeStyle = "#9b85ff";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rotation circle
  ctx.beginPath();
  ctx.arc(rotateHandleX, rotateHandleY, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#9b85ff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}
    if (cropMode && cropSelection) {
      const { x, y, width: selectionWidth, height: selectionHeight } =
        cropSelection;

      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, 0, width, height);
      ctx.clearRect(x, y, selectionWidth, selectionHeight);
      ctx.filter = filter;
      ctx.drawImage(
        image, source.x, source.y, source.width, source.height,
        offset.x, offset.y, drawWidth, drawHeight
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

      corners.forEach(([cx, cy]) => ctx.fillRect(cx - 4, cy - 4, 8, 8));
      ctx.restore();
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [
    zoom, offset, imageName, cropRegion, cropMode, cropSelection,
    imageRevision, brightness, contrast, saturation, blur,
    layers, selectedLayerId,
  ]);

  useEffect(() => {
    const handleResize = () => drawCanvas();
    window.addEventListener("resize", handleResize);
    drawCanvas();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fitToScreen = () => {
    const canvas = canvasRef.current;
    const dimensions = getImageDimensions();
    if (!canvas || !dimensions) return;

    const scaleX = canvas.clientWidth / dimensions.width;
    const scaleY = canvas.clientHeight / dimensions.height;
    const newZoom = Math.min(scaleX, scaleY, 1);

    setZoom(newZoom);
    setOffset({
      x: (canvas.clientWidth - dimensions.width * newZoom) / 2,
      y: (canvas.clientHeight - dimensions.height * newZoom) / 2,
    });
  };

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      alert("Please upload a PNG, JPG, or WebP image.");
      event.target.value = "";
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      imageRef.current = image;
      originalImageRef.current = image;
      setImageName(file.name);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setCropRegion(null);
      setCropSelection(null);
      setCropMode(false);
      setIsSelecting(false);
      setCropStart(null);
      setLayers([]);
      setSelectedLayerId(null);
      resetAdjustments();
      setImageRevision((previous) => previous + 1);

      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const scale = Math.min(
          canvas.clientWidth / image.width,
          canvas.clientHeight / image.height,
          1
        );

        setZoom(scale);
        setOffset({
          x: (canvas.clientWidth - image.width * scale) / 2,
          y: (canvas.clientHeight - image.height * scale) / 2,
        });
      });

      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      alert("Unable to load this image.");
    };

    image.src = url;
    event.target.value = "";
  };

  const handleSaveProject = async () => {
  const currentImage = imageRef.current;
  const originalImage = originalImageRef.current;

  if (!currentImage || !originalImage) {
    alert("Please upload an image before saving.");
    return;
  }

  const name = projectName.trim() || imageName || "Untitled Project";

  try {
    setIsSavingProject(true);

    const savedLayers = layers.map((layer) => ({
      ...layer,
      image: layer.image ? imageToDataURL(layer.image) : undefined,
    }));

    const project: SavedProject = {
      id: crypto.randomUUID(),
      name,
      imageName,
      currentImage: imageToDataURL(currentImage),
      originalImage: imageToDataURL(originalImage),
      cropRegion: cropRegion ? { ...cropRegion } : null,
      brightness,
      contrast,
      saturation,
      blur,
      activePreset,
      layers: savedLayers,
      selectedLayerId,
      updatedAt: Date.now(),
    };

    await saveProject(project);

    const projects = await getAllProjects();
    setSavedProjects(projects);
    setSelectedProjectId(project.id);

    alert("Project saved successfully!");
  } catch (error) {
    console.error("Project saving failed:", error);
    alert("Unable to save project. Please try again.");
  } finally {
    setIsSavingProject(false);
  }
};
const handleOpenProject = async (id: string) => {
  try {
    const project = await getProject(id);

    if (!project) {
      alert("Project not found.");
      return;
    }

    const currentImage = await dataURLToImage(project.currentImage);
    const originalImage = await dataURLToImage(project.originalImage);

    const restoredLayers = await Promise.all(
      project.layers.map(async (savedLayer) => {
        const layer = savedLayer as EditorLayer & { image?: string };

        return {
          ...layer,
          image: layer.image
            ? await dataURLToImage(layer.image)
            : undefined,
        } as EditorLayer;
      })
    );

    imageRef.current = currentImage;
    originalImageRef.current = originalImage;

    setImageName(project.imageName);
    setProjectName(project.name);
    setCropRegion(project.cropRegion);
    setBrightness(project.brightness);
    setContrast(project.contrast);
    setSaturation(project.saturation);
    setBlur(project.blur);
    setActivePreset(project.activePreset as PresetName);
    setLayers(restoredLayers);
    setSelectedLayerId(project.selectedLayerId);
    setSelectedProjectId(project.id);
    setImageRevision((previous) => previous + 1);

    alert("Project opened successfully!");
  } catch (error) {
    console.error("Project opening failed:", error);
    alert("Unable to open project.");
  }
};

const handleDeleteProject = async (id: string) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this project?"
  );

  if (!confirmed) return;

  try {
    await deleteProject(id);

    const projects = await getAllProjects();
    setSavedProjects(projects);

    if (selectedProjectId === id) {
      setSelectedProjectId("");
    }

    alert("Project deleted successfully!");
  } catch (error) {
    console.error("Project deletion failed:", error);
    alert("Unable to delete project.");
  }
};

  const uploadLayerImage = (event: ChangeEvent<HTMLInputElement>) => {
    
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      alert("Please upload a PNG, JPG, or WebP image.");
      event.target.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const maxDimension = 400;
      const scale = Math.min(
        1, maxDimension / Math.max(image.width, image.height)
      );

      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const id = crypto.randomUUID();

      const newLayer: EditorLayer = {
        id, name: file.name, type: "image",
        x: 40, y: 40, width, height,
        visible: true, locked: false, opacity: 1,
        fill: "#ffffff", image,
      };

      setLayers((previous) => [...previous, newLayer]);
      setSelectedLayerId(id);
      setActivePanel("layers");
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      alert("Unable to load this image layer.");
    };

    image.src = url;
    event.target.value = "";
  };

  const handleZoom = (direction: number) => {
    setZoom(Math.min(5, Math.max(0.1, zoom + direction)));
  };

  const addTextLayer = () => {
    if (!imageRef.current) {
      alert("Upload a background image first.");
      return;
    }

    const id = crypto.randomUUID();
    const layer: EditorLayer = {
      id, name: "Text Layer", type: "text",
      x: 40, y: 40, width: 240, height: 60,
      visible: true, locked: false, opacity: 1,
      text: "Your text here", fontSize: 32, fill: "#ffffff",
    };

    setLayers((previous) => [...previous, layer]);
    setSelectedLayerId(id);
    setActivePanel("layers");
  };

  const addShapeLayer = (type: "rectangle" | "circle") => {
    if (!imageRef.current) {
      alert("Upload a background image first.");
      return;
    }

    const id = crypto.randomUUID();
    const layer: EditorLayer = {
      id,
      name: type === "rectangle" ? "Rectangle" : "Circle",
      type,
      x: 60, y: 60, width: 150, height: 100,
      visible: true, locked: false, opacity: 1,
      fill: "#8b78ff",
    };

    setLayers((previous) => [...previous, layer]);
    setSelectedLayerId(id);
    setActivePanel("layers");
  };

  // Update a layer.
  const updateLayer = (
    id: string,
    updates: Partial<EditorLayer>
  ) => {
    setLayers((previous) =>
      previous.map((layer) =>
        layer.id === id ? { ...layer, ...updates } : layer
      )
    );
  };

  // Delete selected layer.
  const deleteSelectedLayer = () => {
    if (!selectedLayerId) return;

    setLayers((previous) =>
      previous.filter((layer) => layer.id !== selectedLayerId)
    );

    setSelectedLayerId(null);
  };

  // Change layer stacking order.
  const moveLayerOrder = (id: string, direction: -1 | 1) => {
    setLayers((previous) => {
      const index = previous.findIndex((layer) => layer.id === id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= previous.length) {
        return previous;
      }

      const updated = [...previous];
      [updated[index], updated[nextIndex]] = [
        updated[nextIndex],
        updated[index],
      ];

      return updated;
    });
  };

  // Find the topmost layer under the pointer.
  const findLayerAtPoint = (point: Point) => {
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
  };
  
  // Detect whether the pointer is near a selected layer corner.
  const getResizeHandle = (
    point: Point,
    layer: EditorLayer
  ): LayerResizeAction["handle"] | null => {
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
      { name: "ne" as const, x: left, y: top },
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
  };

  // Mouse down.
  const handleMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);

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
    // Check whether the rotated rotation handle was clicked.
const activeLayer = layers.find(
  (layer) => layer.id === selectedLayerId
);

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
    // Check whether a selected layer's resize handle was clicked.

    if (activeLayer?.visible && !activeLayer.locked) {
      const handle = getResizeHandle(point, activeLayer);

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

    // Check whether a layer was clicked.
    const clickedLayer = findLayerAtPoint(point);

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

    // Start moving the canvas.
    setIsDragging(true);
    setLastPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };



  // Mouse move.
  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);

    // Handle crop selection.
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

      const currentX = Math.min(imageRight, Math.max(imageLeft, point.x));
      const currentY = Math.min(imageBottom, Math.max(imageTop, point.y));
      const startX = Math.min(imageRight, Math.max(imageLeft, cropStart.x));
      const startY = Math.min(imageBottom, Math.max(imageTop, cropStart.y));

      setCropSelection({
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      });

      return;
    }

// Rotate the selected layer.
if (layerRotateRef.current) {
  const rotationData = layerRotateRef.current;

  const currentAngle = Math.atan2(
    point.y - rotationData.centerY,
    point.x - rotationData.centerX
  );

  const angleDifference =
    (currentAngle - rotationData.startAngle) * (180 / Math.PI);

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

// Resize the selected layer.
if (layerResizeRef.current) {
  const resize = layerResizeRef.current;

  const resizingLayer = layers.find(
    (layer) => layer.id === resize.id
  );

  const angle =
    ((resizingLayer?.rotation ?? 0) * Math.PI) / 180;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Convert pointer movement into the layer's local coordinates.
  const screenDX = point.x - resize.startX;
  const screenDY = point.y - resize.startY;

  const dx = (screenDX * cos + screenDY * sin) / zoom;
  const dy = (-screenDX * sin + screenDY * cos) / zoom;

  const isLeft = resize.handle === "nw" || resize.handle === "sw";
  const isTop = resize.handle === "nw" || resize.handle === "ne";

  let width = resize.originalWidth + (isLeft ? -dx : dx);
  let height = resize.originalHeight + (isTop ? -dy : dy);

  // Preserve aspect ratio while Shift is held.
  if (event.shiftKey) {
    const ratio = resize.originalWidth / resize.originalHeight;

    const widthChange =
      Math.abs(width - resize.originalWidth) / resize.originalWidth;

    const heightChange =
      Math.abs(height - resize.originalHeight) / resize.originalHeight;

    if (widthChange >= heightChange) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }
  }

  width = Math.max(10, width);
  height = Math.max(10, height);

  // Find the opposite corner in the original layer.
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

  // Keep the opposite corner fixed after rotation.
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

  const x = anchorX - rotatedAnchorX - newCenterX;
  const y = anchorY - rotatedAnchorY - newCenterY;

  updateLayer(resize.id, {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width,
    height,
  });

  return;
}
    // Move the selected layer.
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

    // Move the canvas.
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

  // Crop functions.
  const startCrop = () => {
    if (!imageRef.current) {
      alert("Please upload an image first.");
      return;
    }

    setCropMode(true);
    setCropSelection(null);
    setCropStart(null);
  };

  const cancelCrop = () => {
    setCropMode(false);
    setCropSelection(null);
    setCropStart(null);
    setIsSelecting(false);
  };

  const applyCrop = () => {
    const image = imageRef.current;

    if (!image || !cropSelection) {
      alert("Please select an area to crop.");
      return;
    }

    if (cropSelection.width < 10 || cropSelection.height < 10) {
      alert("Please select a larger crop area.");
      return;
    }

    const current = cropRegion ?? {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    };

    const nextCrop: CropRegion = {
      x: current.x + (cropSelection.x - offset.x) / zoom,
      y: current.y + (cropSelection.y - offset.y) / zoom,
      width: cropSelection.width / zoom,
      height: cropSelection.height / zoom,
    };

    nextCrop.x = Math.max(current.x, nextCrop.x);
    nextCrop.y = Math.max(current.y, nextCrop.y);
    nextCrop.width = Math.min(
      nextCrop.width,
      current.x + current.width - nextCrop.x
    );
    nextCrop.height = Math.min(
      nextCrop.height,
      current.y + current.height - nextCrop.y
    );

    if (nextCrop.width <= 0 || nextCrop.height <= 0) return;

    setCropRegion(nextCrop);
    setCropMode(false);
    setCropSelection(null);
    setCropStart(null);

    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const newZoom = Math.min(
        canvas.clientWidth / nextCrop.width,
        canvas.clientHeight / nextCrop.height,
        1
      );

      setZoom(newZoom);
      setOffset({
        x: (canvas.clientWidth - nextCrop.width * newZoom) / 2,
        y: (canvas.clientHeight - nextCrop.height * newZoom) / 2,
      });
    });
  };

  const resetCrop = () => {
    setCropRegion(null);
    cancelCrop();

    requestAnimationFrame(() => fitToScreen());
  };

  // Rotate and flip image.
  const transformImage = (action: TransformAction) => {
    const image = imageRef.current;

    if (!image) {
      alert("Please upload an image first.");
      return;
    }

    if (cropMode) {
      alert("Please finish or cancel cropping first.");
      return;
    }

    const source = cropRegion ?? {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    };

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
    if (!ctx) return;

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

    transformedImage.onload = () => {
      imageRef.current = transformedImage;
      setCropRegion(null);
      setCropSelection(null);
      setCropMode(false);
      setIsSelecting(false);
      setCropStart(null);
      setImageRevision((previous) => previous + 1);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const scale = Math.min(
        canvas.clientWidth / transformedImage.width,
        canvas.clientHeight / transformedImage.height,
        1
      );

      setZoom(scale);
      setOffset({
        x: (canvas.clientWidth - transformedImage.width * scale) / 2,
        y: (canvas.clientHeight - transformedImage.height * scale) / 2,
      });
    };

    transformedImage.onerror = () => {
      alert("Unable to transform this image.");
    };

    transformedImage.src = transformCanvas.toDataURL("image/png");
  };

  // Resize functions.
  const handleResizeWidth = (value: number) => {
    const width = Math.max(1, Math.min(12000, value));
    setResizeWidth(width);

    if (lockAspectRatio) {
      const dimensions = getImageDimensions();
      if (!dimensions) return;

      const ratio = dimensions.width / dimensions.height;
      setResizeHeight(Math.max(1, Math.round(width / ratio)));
    }
  };

  const handleResizeHeight = (value: number) => {
    const height = Math.max(1, Math.min(12000, value));
    setResizeHeight(height);

    if (lockAspectRatio) {
      const dimensions = getImageDimensions();
      if (!dimensions) return;

      const ratio = dimensions.width / dimensions.height;
      setResizeWidth(Math.max(1, Math.round(height * ratio)));
    }
  };

  const applyResize = () => {
    const image = imageRef.current;

    if (!image) {
      alert("Please upload an image first.");
      return;
    }

    if (cropMode) {
      alert("Please finish or cancel cropping first.");
      return;
    }

    if (
      !Number.isInteger(resizeWidth) ||
      !Number.isInteger(resizeHeight) ||
      resizeWidth < 1 ||
      resizeHeight < 1 ||
      resizeWidth > 12000 ||
      resizeHeight > 12000
    ) {
      alert("Enter valid dimensions between 1 and 12000 pixels.");
      return;
    }

    const source = cropRegion ?? {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    };

    const resizeCanvas = document.createElement("canvas");
    resizeCanvas.width = resizeWidth;
    resizeCanvas.height = resizeHeight;

    const ctx = resizeCanvas.getContext("2d");
    if (!ctx) return;

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
      resizeWidth,
      resizeHeight
    );

    const resizedImage = new Image();

    resizedImage.onload = () => {
      imageRef.current = resizedImage;
      setCropRegion(null);
      setCropSelection(null);
      setCropMode(false);
      setIsSelecting(false);
      setCropStart(null);
      setImageRevision((previous) => previous + 1);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const scale = Math.min(
        canvas.clientWidth / resizedImage.width,
        canvas.clientHeight / resizedImage.height,
        1
      );

      setZoom(scale);
      setOffset({
        x: (canvas.clientWidth - resizedImage.width * scale) / 2,
        y: (canvas.clientHeight - resizedImage.height * scale) / 2,
      });
    };

    resizedImage.onerror = () => {
      alert("Unable to resize this image.");
    };

    resizedImage.src = resizeCanvas.toDataURL("image/png");
  };

  const resetResizeFields = () => {
    const originalImage = originalImageRef.current;

    if (!originalImage) {
      alert("Original image is unavailable.");
      return;
    }

    imageRef.current = originalImage;
    setCropRegion(null);
    setCropSelection(null);
    setCropStart(null);
    setCropMode(false);
    setIsSelecting(false);
    setResizeWidth(originalImage.width);
    setResizeHeight(originalImage.height);
    setLockAspectRatio(true);
    resetAdjustments();
    setImageRevision((previous) => previous + 1);

    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scale = Math.min(
        canvas.clientWidth / originalImage.width,
        canvas.clientHeight / originalImage.height,
        1
      );

      setZoom(scale);
      setOffset({
        x: (canvas.clientWidth - originalImage.width * scale) / 2,
        y: (canvas.clientHeight - originalImage.height * scale) / 2,
      });
    });
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };
  
 const exportImage = (format: "png" | "jpeg" | "webp" = "png") => {
  const canvas = canvasRef.current;

  if (!canvas) {
    alert("No canvas available to export.");
    return;
  }

  const mimeType = `image/${format}`;
  const quality = format === "png" ? undefined : 0.92;

  const dataUrl = canvas.toDataURL(mimeType, quality);

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `pixelstudio-export.${
    format === "jpeg" ? "jpg" : format
  }`;

  link.click();
};

  return (
    <div className="app">
      {/* Top navigation */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <ImageIcon size={22} />
          </div>
          <span>
            Pixel<span>Studio</span>
          </span>
        </div>

        <div className="topbar-actions">
          <button
            className="icon-button"
            title="Undo (Ctrl+Z)"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <Undo2 />
          </button>

          <button
            className="icon-button"
            title="Redo (Ctrl+Y)"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo2 />
          </button>

          <span className="divider" />

          <div className="export-options">
            <button
    className="export-button"
    onClick={() => exportImage("png")}
  >
    PNG
  </button>

  <button
    className="export-button"
    onClick={() => exportImage("jpeg")}
  >
    JPG
  </button>

  <button
    className="export-button"
    onClick={() => exportImage("webp")}
  >
    WebP
  </button>
</div>
<button
  className="export-button"
  onClick={handleSaveProject}
  disabled={isSavingProject}
>
  {isSavingProject ? "Saving..." : "Save Project"}
</button>

<input
  type="text"
  className="project-name-input"
  placeholder="Project name"
  value={projectName}
  onChange={(event) => setProjectName(event.target.value)}
/>

         </div>
      </header>  

      <main className="editor">
        {/* Left toolbar */}
        <aside className="left-toolbar">
          <button
            className={!cropMode ? "tool active" : "tool"}
            title="Select"
            onClick={cancelCrop}
          >
            <MousePointer2 />
          </button>

          <button
            className={cropMode ? "tool active" : "tool"}
            title="Crop"
            onClick={startCrop}
          >
            <Crop />
          </button>

          <button
            className="tool"
            title="Adjustments"
            onClick={() => {
              setActivePanel("properties");
              document
                .querySelector(".adjustment-section")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <SlidersHorizontal />
          </button>

          <button
            className={activePanel === "layers" ? "tool active" : "tool"}
            title="Layers"
            onClick={() => setActivePanel("layers")}
          >
            <Layers />
          </button>

          <button
            className={activePanel === "history" ? "tool active" : "tool"}
            title="History"
            onClick={() => setActivePanel("history")}
          >
            <History />
          </button>

          <div className="toolbar-spacer" />

          <button className="tool" title="Settings">
            <Settings />
          </button>
        </aside>

        {/* Main workspace */}
        <section className="workspace">
          <div className="workspace-header">
            <div>
              <h2>Workspace</h2>
              <p>{imageName || "Untitled project"}</p>
            </div>

            <div className="workspace-actions">
              {imageName && !cropMode && (
                <div className="transform-actions">
                  <button
                    className="control-button"
                    title="Rotate left"
                    onClick={() => transformImage("rotate-left")}
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    className="control-button"
                    title="Rotate right"
                    onClick={() => transformImage("rotate-right")}
                  >
                    <RotateCw size={16} />
                  </button>

                  <button
                    className="control-button"
                    title="Flip horizontally"
                    onClick={() => transformImage("flip-horizontal")}
                  >
                    <FlipHorizontal size={16} />
                  </button>

                  <button
                    className="control-button"
                    title="Flip vertically"
                    onClick={() => transformImage("flip-vertical")}
                  >
                    <FlipVertical size={16} />
                  </button>
                </div>
              )}

              {imageName && !cropMode && (
                <>
                  <button
                    className="control-button"
                    title="Add text layer"
                    onClick={addTextLayer}
                  >
                    <Type size={16} />
                    Text
                  </button>

                  <button
                    className="control-button"
                    title="Add rectangle"
                    onClick={() => addShapeLayer("rectangle")}
                  >
                    <Square size={16} />
                  </button>

                  <button
                    className="control-button"
                    title="Add circle"
                    onClick={() => addShapeLayer("circle")}
                  >
                    <Circle size={16} />
                  </button>

                  <button
                    className="control-button"
                    title="Add image layer"
                    onClick={() => layerImageInputRef.current?.click()}
                  >
                    <ImagePlus size={16} />
                  </button>
                </>
              )}

              {cropMode && (
                <>
                  <button className="crop-cancel-button" onClick={cancelCrop}>
                    <X size={16} />
                    Cancel
                  </button>

                  <button
                    className="crop-apply-button"
                    onClick={applyCrop}
                    disabled={!cropSelection}
                  >
                    <Check size={16} />
                    Apply Crop
                  </button>
                </>
              )}

              {cropRegion && !cropMode && (
                <button className="crop-cancel-button" onClick={resetCrop}>
                  <RotateCcw size={16} />
                  Reset Crop
                </button>
              )}

              <button
                className="upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={17} />
                Upload Image
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={uploadImage}
            />

            <input
              ref={layerImageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={uploadLayerImage}
            />
          </div>

          {/* Canvas */}
          <div className="canvas-area">
            <div className="canvas-container">
              <canvas
                ref={canvasRef}
                className={
                  cropMode
                    ? "canvas crop-cursor"
                    : isDragging || layerDragStart
                      ? "canvas dragging"
                      : "canvas"
                }
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
              />
            </div>
          </div>

          {/* Canvas controls */}
          <div className="canvas-controls">
            <div className="zoom-controls">
              <button
                className="control-button"
                onClick={() => handleZoom(-0.1)}
                title="Zoom out"
              >
                <ZoomOut size={17} />
              </button>

              <span>{Math.round(zoom * 100)}%</span>

              <button
                className="control-button"
                onClick={() => handleZoom(0.1)}
                title="Zoom in"
              >
                <ZoomIn size={17} />
              </button>
            </div>

            <div className="view-controls">
              <button className="control-button" onClick={fitToScreen}>
                <Maximize size={16} />
                Fit
              </button>

              <button className="control-button" onClick={resetView}>
                <RotateCcw size={16} />
                Reset View
              </button>
            </div>
          </div>
        </section>

                {/* Right panel */}
        <aside className="right-panel">
          <div className="panel-heading">
            <div className="panel-tabs">
              <button
                className={
                  activePanel === "properties"
                    ? "panel-tab active"
                    : "panel-tab"
                }
                onClick={() => setActivePanel("properties")}
              >
                Properties
              </button>

              <button
                className={
                  activePanel === "layers"
                    ? "panel-tab active"
                    : "panel-tab"
                }
                onClick={() => setActivePanel("layers")}
              >
                Layers ({layers.length})
              </button>

              <button
                className={
                  activePanel === "history"
                    ? "panel-tab active"
                    : "panel-tab"
                }
                onClick={() => setActivePanel("history")}
              >
                History
              </button>

              <button
                className={
                  activePanel === "projects"
                  ? "panel-tab active"
                  : "panel-tab"
                }
                onClick={() => setActivePanel("projects")}
              >
                Projects ({savedProjects.length})
              </button>
            </div>
          </div>

          {/* Properties panel */}
          {activePanel === "properties" && (
            <>
              {!imageName ? (
                <div className="empty-panel">
                  <ImagePlus size={30} />
                  <p>No image selected</p>
                  <span>Upload an image to see its properties.</span>
                </div>
              ) : (
                <div className="image-properties">
                  <div className="property-preview">
                    <ImageIcon size={28} />
                  </div>

                  <h4>Image</h4>
                  <p className="filename">{imageName}</p>

                  <div className="property-row">
                    <span>Zoom</span>
                    <strong>{Math.round(zoom * 100)}%</strong>
                  </div>

                  <div className="property-row">
                    <span>Position X</span>
                    <strong>{Math.round(offset.x)} px</strong>
                  </div>

                  <div className="property-row">
                    <span>Position Y</span>
                    <strong>{Math.round(offset.y)} px</strong>
                  </div>

                  {(() => {
                    const dimensions = getImageDimensions();

                    return dimensions ? (
                      <>
                        <div className="property-row">
                          <span>Image width</span>
                          <strong>{Math.round(dimensions.width)} px</strong>
                        </div>

                        <div className="property-row">
                          <span>Image height</span>
                          <strong>{Math.round(dimensions.height)} px</strong>
                        </div>
                      </>
                    ) : null;
                  })()}

                  {cropRegion && (
                    <>
                      <div className="property-row">
                        <span>Crop width</span>
                        <strong>{Math.round(cropRegion.width)} px</strong>
                      </div>

                      <div className="property-row">
                        <span>Crop height</span>
                        <strong>{Math.round(cropRegion.height)} px</strong>
                      </div>
                    </>
                  )}

                  {/* Image adjustments */}
                  <div className="adjustment-section">
                    <div className="adjustment-heading">
                      <h4>Image Adjustments</h4>

                      <button
                        className="adjustment-reset"
                        onClick={resetAdjustments}
                      >
                        Reset
                      </button>
                    </div>

                    <div className="preset-section">
                      <span>Presets</span>

                      <div className="preset-grid">
                        {(
                          [
                            "original",
                            "vivid",
                            "warm",
                            "cool",
                            "grayscale",
                            "vintage",
                          ] as const
                        ).map((preset) => (
                          <button
                            key={preset}
                            className={
                              activePreset === preset
                                ? "preset-button selected"
                                : "preset-button"
                            }
                            onClick={() => applyPreset(preset)}
                          >
                            {preset.charAt(0).toUpperCase() +
                              preset.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="adjustment-control">
                      <div className="adjustment-label">
                        <label htmlFor="brightness">Brightness</label>
                        <strong>{brightness}%</strong>
                      </div>

                      <input
                        id="brightness"
                        type="range"
                        min="0"
                        max="200"
                        value={brightness}
                        onChange={(event) => {
                          setBrightness(Number(event.target.value));
                          setActivePreset("custom");
                        }}
                      />
                    </div>

                    <div className="adjustment-control">
                      <div className="adjustment-label">
                        <label htmlFor="contrast">Contrast</label>
                        <strong>{contrast}%</strong>
                      </div>

                      <input
                        id="contrast"
                        type="range"
                        min="0"
                        max="200"
                        value={contrast}
                        onChange={(event) => {
                          setContrast(Number(event.target.value));
                          setActivePreset("custom");
                        }}
                      />
                    </div>

                    <div className="adjustment-control">
                      <div className="adjustment-label">
                        <label htmlFor="saturation">Saturation</label>
                        <strong>{saturation}%</strong>
                      </div>

                      <input
                        id="saturation"
                        type="range"
                        min="0"
                        max="200"
                        value={saturation}
                        onChange={(event) => {
                          setSaturation(Number(event.target.value));
                          setActivePreset("custom");
                        }}
                      />
                    </div>

                    <div className="adjustment-control">
                      <div className="adjustment-label">
                        <label htmlFor="blur">Blur</label>
                        <strong>{blur}px</strong>
                      </div>

                      <input
                        id="blur"
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={blur}
                        onChange={(event) => {
                          setBlur(Number(event.target.value));
                          setActivePreset("custom");
                        }}
                      />
                    </div>
                  </div>

                  {/* Resize panel */}
                  <div className="resize-section">
                    <div className="resize-heading">
                      <h4>Resize Image</h4>

                      <button
                        className="resize-lock-button"
                        title={
                          lockAspectRatio
                            ? "Unlock aspect ratio"
                            : "Lock aspect ratio"
                        }
                        onClick={() =>
                          setLockAspectRatio((previous) => !previous)
                        }
                      >
                        {lockAspectRatio ? (
                          <Lock size={15} />
                        ) : (
                          <Unlock size={15} />
                        )}

                        {lockAspectRatio ? "Locked" : "Unlocked"}
                      </button>
                    </div>

                    <label className="resize-label">
                      Width (px)
                      <input
                        type="number"
                        min="1"
                        max="12000"
                        value={resizeWidth || ""}
                        onChange={(event) =>
                          handleResizeWidth(Number(event.target.value))
                        }
                      />
                    </label>

                    <label className="resize-label">
                      Height (px)
                      <input
                        type="number"
                        min="1"
                        max="12000"
                        value={resizeHeight || ""}
                        onChange={(event) =>
                          handleResizeHeight(Number(event.target.value))
                        }
                      />
                    </label>

                    <div className="resize-presets">
                      <span>Presets</span>

                      <button
                        onClick={() => {
                          setResizeWidth(640);
                          setResizeHeight(480);
                        }}
                      >
                        640 × 480
                      </button>

                      <button
                        onClick={() => {
                          setResizeWidth(1280);
                          setResizeHeight(720);
                        }}
                      >
                        1280 × 720
                      </button>

                      <button
                        onClick={() => {
                          setResizeWidth(1920);
                          setResizeHeight(1080);
                        }}
                      >
                        1920 × 1080
                      </button>
                    </div>

                    <div className="resize-buttons">
                      <button
                        className="resize-reset"
                        onClick={resetResizeFields}
                      >
                        Reset
                      </button>

                      <button
                        className="resize-apply"
                        onClick={applyResize}
                      >
                        Apply Resize
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {/* Saved Projects panel */}
{activePanel === "projects" && (
  <div className="projects-panel">
    <div className="layers-heading">
      <h4>Saved Projects ({savedProjects.length})</h4>
    </div>

    {savedProjects.length === 0 ? (
      <div className="empty-panel">
        <p>No saved projects yet</p>
        <span>Save your first project to see it here.</span>
      </div>
    ) : (
      <div className="saved-project-list">
        {savedProjects.map((project) => (
          <div className="saved-project-item" key={project.id}>
           <div>
  <strong>{project.name}</strong>
  <span>{project.imageName}</span>

  <button
    className="export-button"
    onClick={() => handleOpenProject(project.id)}
  >
    Open Project
  </button>

  <button
  className="export-button"
  onClick={() => handleDeleteProject(project.id)}
>
  Delete
</button>

</div> 
          </div>
        ))}
      </div>
    )}
  </div>
)}

          {/* Layers panel */}
          {activePanel === "layers" && (
            <div className="layers-panel">
              <div className="layers-heading">
                <h4>Layers ({layers.length})</h4>

                <button
                  className="layer-delete-button"
                  onClick={deleteSelectedLayer}
                  disabled={!selectedLayerId}
                  title="Delete selected layer"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="layer-add-buttons">
                <button onClick={addTextLayer}>
                  <Type size={14} />
                  Text
                </button>

                <button onClick={() => addShapeLayer("rectangle")}>
                  <Square size={14} />
                  Rectangle
                </button>

                <button onClick={() => addShapeLayer("circle")}>
                  <Circle size={14} />
                  Circle
                </button>
              </div>

              <button
                className="layer-add-image"
                onClick={() => layerImageInputRef.current?.click()}
              >
                <ImagePlus size={15} />
                Add image layer
              </button>

              {layers.length === 0 ? (
                <p className="layers-empty">
                  No layers yet. Add text, shapes, or another image.
                </p>
              ) : (
                <div className="layer-list">
                  {[...layers].reverse().map((layer) => (
                    <div
                      key={layer.id}
                      className={
                        selectedLayerId === layer.id
                          ? "layer-item selected"
                          : "layer-item"
                      }
                      onClick={() => setSelectedLayerId(layer.id)}
                    >
                      <span className="layer-type-icon">
                        {layer.type === "text" ? (
                          <Type size={15} />
                        ) : layer.type === "rectangle" ? (
                          <Square size={15} />
                        ) : layer.type === "circle" ? (
                          <Circle size={15} />
                        ) : (
                          <ImageIcon size={15} />
                        )}
                      </span>

                      <span className="layer-name">
                        {layer.name}
                        {layer.locked && (
                          <Lock
                            size={11}
                            className="layer-lock-indicator"
                          />
                        )}
                      </span>

                      <button
                        title={layer.visible ? "Hide layer" : "Show layer"}
                        onClick={(event) => {
                          event.stopPropagation();
                          updateLayer(layer.id, {
                            visible: !layer.visible,
                          });
                        }}
                      >
                        {layer.visible ? (
                          <Eye size={14} />
                        ) : (
                          <EyeOff size={14} />
                        )}
                      </button>

                      <button
                        title={layer.locked ? "Unlock layer" : "Lock layer"}
                        onClick={(event) => {
                          event.stopPropagation();
                          updateLayer(layer.id, {
                            locked: !layer.locked,
                          });
                        }}
                      >
                        {layer.locked ? (
                          <Lock size={14} />
                        ) : (
                          <Unlock size={14} />
                        )}
                      </button>

                      <button
                        title="Move layer up"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveLayerOrder(layer.id, 1);
                        }}
                      >
                        <ChevronUp size={14} />
                      </button>

                      <button
                        title="Move layer down"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveLayerOrder(layer.id, -1);
                        }}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected layer properties */}
              {selectedLayer && (
                <div className="layer-properties">
                  <h4>Selected Layer</h4>

                  <p className="selected-layer-name">
                    {selectedLayer.name}
                  </p>

                  <label>
                    Opacity: {Math.round(selectedLayer.opacity * 100)}%

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedLayer.opacity * 100}
                      onChange={(event) =>
                        updateLayer(selectedLayer.id, {
                          opacity: Number(event.target.value) / 100,
                        })
                      }
                    />
                  </label>

                  {selectedLayer.type === "text" && (
                    <>
                      <label>
                        Text

                        <input
                          type="text"
                          value={selectedLayer.text ?? ""}
                          onChange={(event) =>
                            updateLayer(selectedLayer.id, {
                              text: event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Font size

                        <input
                          type="number"
                          min="8"
                          max="200"
                          value={selectedLayer.fontSize ?? 32}
                          onChange={(event) =>
                            updateLayer(selectedLayer.id, {
                              fontSize: Math.max(
                                8,
                                Math.min(
                                  200,
                                  Number(event.target.value) || 8
                                )
                              ),
                            })
                          }
                        />
                      </label>
                    </>
                  )}

                  <label>
                    Color

                    <input
                      type="color"
                      value={selectedLayer.fill}
                      onChange={(event) =>
                        updateLayer(selectedLayer.id, {
                          fill: event.target.value,
                        })
                      }
                    />
                  </label>

                  <button
                    className="layer-remove-button"
                    onClick={deleteSelectedLayer}
                  >
                    <Trash2 size={14} />
                    Delete Layer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* History panel */}
          {activePanel === "history" && (
            <div className="history-panel">
              <div className="layers-heading">
                <h4>History</h4>

                <div className="history-actions">
                  <button
                    className="control-button"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    title="Undo"
                  >
                    <Undo2 size={15} />
                  </button>

                  <button
                    className="control-button"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo"
                  >
                    <Redo2 size={15} />
                  </button>
                </div>
              </div>

              {history.length === 0 ? (
                <p className="layers-empty">
                  Your editing history will appear here.
                </p>
              ) : (
                <div className="history-list">
                  {history.map((item, index) => (
                    <button
                      key={`${item.name}-${index}`}
                      className={
                        index === historyIndex
                          ? "history-item active"
                          : "history-item"
                      }
                      onClick={() => restoreHistory(index)}
                    >
                      <span className="history-number">
                        {index + 1}
                      </span>

                      <span className="history-label">
                        {item.name || "Editor state"}
                      </span>

                      {index === historyIndex && (
                        <Check size={14} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <p className="history-hint">
                Use Ctrl + Z to undo and Ctrl + Y to redo.
              </p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
