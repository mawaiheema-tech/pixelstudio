import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import {
  ImagePlus,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  Image as ImageIcon,
  Check,
  X,
  Type,
  Square,
  Circle,
  Sun,
  Moon,
} from "lucide-react";
import "./App.css";
import {
  saveProject,
  getAllProjects,
  getProject,
  deleteProject,
} from "./services/projectStorage";
import { presets } from "./constants/presets";
import type { SavedProject } from "./services/projectStorage";
import type {
  Point,
  CropRegion,
  Selection,
  TransformAction,
  PresetName,
  EditorLayer,
  LayerResizeAction,
  HistorySnapshot,
} from "./types/editor";
import { imageToDataURL, dataURLToImage } from "./utils/imageUtils";
import Toolbar from "./components/Toolbar";
import PropertiesPanel from "./components/PropertiesPanel";
import LayersPanel from "./components/LayersPanel";
import HistoryPanel from "./components/HistoryPanel";
import ProjectsPanel from "./components/ProjectsPanel";
import { findLayerAtPoint, getResizeHandle } from "./utils/layerUtils";
import { calculateCropRegion } from "./utils/cropUtils";
import { transformImageCanvas } from "./utils/transformUtils";
import { resizeImageCanvas } from "./utils/resizeUtils";
import { createExportDataURL } from "./utils/exportUtils";
import { getCanvasPoint } from "./utils/canvasUtils";
import { getImageDimensions as calculateImageDimensions } from "./utils/dimensionUtils";
import { isSupportedImage } from "./utils/fileUtils";
import { loadLayerImage } from "./utils/layerImageUtils";
import ExportSettings from "./components/ExportSettings";



function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layerImageInputRef = useRef<HTMLInputElement>(null);
  const [darkMode, setDarkMode] = useState(true);
  
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{
  width: number;
  height: number;
} | null>(null);

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
  const [comparisonPosition, setComparisonPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransformingLayer, setIsTransformingLayer] = useState(false);
  const [lastPosition, setLastPosition] = useState<Point>({ x: 0, y: 0 });

  const [cropMode, setCropMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [cropStart, setCropStart] = useState<Point | null>(null);
  const [cropSelection, setCropSelection] = useState<Selection | null>(null);
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [imageRevision, setImageRevision] = useState(0);
  const [cropAspectRatio, setCropAspectRatio] = useState<number | null>(null);

  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const [exportQuality, setExportQuality] = useState(92);
  const [exportWidth, setExportWidth] = useState(0);
  const [exportHeight, setExportHeight] = useState(0);
  const [exportLockAspectRatio, setExportLockAspectRatio] = useState(true);

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
  const historyIndexRef = useRef(0);
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
      historyIndexRef.current = 0;
      setHistoryIndex(0);
      return;
    }

    setHistory((previous) => {
      const next = previous.slice(0, historyIndexRef.current + 1);
      next.push(snapshot);
      const trimmed = next.length > 100 ? next.slice(-100) : next;
      const nextIndex = trimmed.length - 1;
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
      return trimmed;
    });
   }, [
    imageName, imageRevision, cropRegion, brightness, contrast,
    saturation, blur, activePreset, layers, selectedLayerId,
    isTransformingLayer,
  ]);

  const restoreHistory = useCallback((index: number) => {
    const snapshot = history[index];
    if (!snapshot) return;

    isRestoringHistory.current = true;
    imageRef.current = snapshot.image;
    
    if (snapshot.image) {
      setOriginalImageDimensions({
        width: snapshot.image.width,
        height: snapshot.image.height,
      });
    }  
    const restoredDimensions = snapshot.cropRegion ?? snapshot.image;

  if (restoredDimensions) {
    setResizeWidth(Math.round(restoredDimensions.width));
    setResizeHeight(Math.round(restoredDimensions.height));
  }

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
    historyIndexRef.current = index;
    setHistoryIndex(index);
  }, [history]);

  const undo = useCallback(() => {
  if (historyIndex > 0) restoreHistory(historyIndex - 1);
}, [historyIndex, restoreHistory]);

const redo = useCallback(() => {
  if (historyIndex < history.length - 1) {
    restoreHistory(historyIndex + 1);
  }
}, [historyIndex, history.length, restoreHistory]);

  useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;

    const isTyping =
      !!target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable);

    if (isTyping) return;

    const modifier = event.ctrlKey || event.metaKey;

    // Undo and Redo
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();

      if (event.shiftKey) redo();
      else undo();

      return;
    }

    if (modifier && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
  if (!selectedLayerId) return;

  event.preventDefault();

  const layerIdToDelete = selectedLayerId;

  setLayers((previous) =>
    previous.filter((layer) => layer.id !== layerIdToDelete)
  );

  setSelectedLayerId(null);
  return;
}

    // Zoom in
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom((previous) => Math.min(5, previous + 0.1));
      return;
    }

    // Zoom out
    if (event.key === "-") {
      event.preventDefault();
      setZoom((previous) => Math.max(0.1, previous - 0.1));
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [historyIndex, history.length, selectedLayerId, undo, redo]);
const getImageDimensions = () => {
  return calculateImageDimensions(originalImageDimensions, cropRegion);
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

  const drawCanvas = useCallback(() => {
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

    // Draw edited image
ctx.save();
ctx.filter = filter;
ctx.drawImage(
  image,
  source.x, source.y, source.width, source.height,
  offset.x, offset.y, drawWidth, drawHeight
);
ctx.restore();

// Draw original image on the left side
const originalImage = originalImageRef.current;

if (originalImage) {
  ctx.save();

  const clipWidth = drawWidth * (comparisonPosition / 100);

  ctx.beginPath();
  ctx.rect(offset.x, offset.y, clipWidth, drawHeight);
  ctx.clip();

  ctx.filter = "none";
  ctx.drawImage(
    originalImage,
    source.x, source.y, source.width, source.height,
    offset.x, offset.y, drawWidth, drawHeight
  );

  ctx.restore();

  // Draw comparison divider
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
  }, [
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
]);

  useEffect(() => {
  drawCanvas();
}, [drawCanvas]);

  useEffect(() => {
  const handleResize = () => drawCanvas();

  window.addEventListener("resize", handleResize);
  drawCanvas();

  return () => window.removeEventListener("resize", handleResize);
}, [drawCanvas]);

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

    if (!isSupportedImage(file)) {
  alert("Please upload a PNG, JPG, or WebP image.");
  event.target.value = "";
  return;
}

    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      imageRef.current = image;
      setOriginalImageDimensions({
        width: image.width,
        height: image.height,
      });
      setResizeWidth(image.width);
      setResizeHeight(image.height);
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
    setOriginalImageDimensions({
      width: currentImage.width,
      height: currentImage.height,
    });

    setResizeWidth(currentImage.width);
    setResizeHeight(currentImage.height);
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

const uploadLayerImage = async (
  event: ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!isSupportedImage(file)) {
    alert("Please upload a PNG, JPG, or WebP image.");
    event.target.value = "";
    return;
  }

  event.target.value = "";

  try {
    const image = await loadLayerImage(file);
    const id = crypto.randomUUID();

    const newLayer: EditorLayer = {
      id,
      name: file.name,
      type: "image",
      x: 40,
      y: 40,
      width: image.width,
      height: image.height,
      visible: true,
      locked: false,
      opacity: 1,
      fill: "#ffffff",
      image,
    };

    setLayers((previous) => [...previous, newLayer]);
    setSelectedLayerId(id);
    setActivePanel("layers");
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Unable to load this image layer."
    );
  }
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
      const handle = getResizeHandle(point, activeLayer, offset, zoom);

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
    const clickedLayer = findLayerAtPoint(point, layers, offset, zoom);

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
  directionX < 0 ? startX - selectionWidth : startX;

const selectionY =
  directionY < 0 ? startY - selectionHeight : startY;

setCropSelection({
  x: selectionX,
  y: selectionY,
  width: selectionWidth,
  height: selectionHeight,
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

const nextCrop = calculateCropRegion(
  cropSelection,
  current,
  offset,
  zoom
);

if (!nextCrop) return;

    setCropRegion(nextCrop);
    setResizeWidth(Math.round(nextCrop.width));
    setResizeHeight(Math.round(nextCrop.height));
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

    if (imageRef.current) {
    setResizeWidth(imageRef.current.width);
    setResizeHeight(imageRef.current.height);
  }


    requestAnimationFrame(() => fitToScreen());
  };

const transformImage = async (action: TransformAction) => {
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

  try {
    const transformedImage = await transformImageCanvas(
      image,
      source,
      action
    );

    imageRef.current = transformedImage;

    setOriginalImageDimensions({
      width: transformedImage.width,
      height: transformedImage.height,
    });

    setResizeWidth(transformedImage.width);
    setResizeHeight(transformedImage.height);
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
  } catch {
    alert("Unable to transform this image.");
  }
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

  const applyResize = async () => {
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
try {
  const resizedImage = await resizeImageCanvas(
    image,
    source,
    resizeWidth,
    resizeHeight
  );

  imageRef.current = resizedImage;

  setOriginalImageDimensions({
    width: resizedImage.width,
    height: resizedImage.height,
  });

  setResizeWidth(resizedImage.width);
  setResizeHeight(resizedImage.height);
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
} catch {
  alert("Unable to resize this image.");
}
};
  const resetResizeFields = () => {
    const originalImage = originalImageRef.current;

    if (!originalImage) {
      alert("Original image is unavailable.");
      return;
    }

    imageRef.current = originalImage;
    setOriginalImageDimensions({
      width: originalImage.width,
      height: originalImage.height,
    });
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
  const image = imageRef.current;

  if (!image) {
    alert("Please upload an image before exporting.");
    return;
  }

  const source = cropRegion ?? {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };

  try {
    const dataURL = createExportDataURL({
      image,
      source,
      brightness,
      contrast,
      saturation,
      blur,
      layers,
      format,
      quality: exportQuality,
      width: exportWidth,
      height: exportHeight,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `pixelstudio-export.${format === "jpeg" ? "jpg" : format}`;
    link.click();
  } catch {
    alert("Unable to export this image.");
  }
};


  return (
    <div className={`app ${darkMode ? "dark-mode" : "light-mode"}`}>
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
  className="icon-button theme-toggle"
  title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
  onClick={() => setDarkMode(!darkMode)}
>
  {darkMode ? <Sun /> : <Moon />}
</button>
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
<ExportSettings
  quality={exportQuality}
  width={exportWidth}
  height={exportHeight}
  lockAspectRatio={exportLockAspectRatio}
  sourceWidth={cropRegion?.width ?? imageRef.current?.width ?? 0}
  sourceHeight={cropRegion?.height ?? imageRef.current?.height ?? 0}
  onQualityChange={setExportQuality}
  onWidthChange={setExportWidth}
  onHeightChange={setExportHeight}
  onLockAspectRatioChange={setExportLockAspectRatio}
/>

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
  <Toolbar
    cropMode={cropMode}
    activePanel={activePanel}
    cancelCrop={cancelCrop}
    startCrop={startCrop}
    setActivePanel={setActivePanel}
  />

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
<div className="crop-ratio-controls">
  <button
  className={cropAspectRatio === null ? "active" : ""}
  onClick={() => setCropAspectRatio(null)}
>
  Free
</button>

<button
  className={cropAspectRatio === 1 ? "active" : ""}
  onClick={() => setCropAspectRatio(1)}
>
  1:1
</button>

<button
  className={cropAspectRatio === 4 / 3 ? "active" : ""}
  onClick={() => setCropAspectRatio(4 / 3)}
>
  4:3
</button>

<button
  className={cropAspectRatio === 16 / 9 ? "active" : ""}
  onClick={() => setCropAspectRatio(16 / 9)}
>
  16:9
</button>

<button
  className={cropAspectRatio === 9 / 16 ? "active" : ""}
  onClick={() => setCropAspectRatio(9 / 16)}
>
  9:16
</button>
</div>
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
          
          {/* Before / After Comparison */}
{imageName && (
  <div className="comparison-controls">
    <label>
      Original / Edited: {comparisonPosition}%
    </label>

    <input
      type="range"
      min="0"
      max="100"
      value={comparisonPosition}
      onChange={(e) =>
        setComparisonPosition(Number(e.target.value))
      }
    />
  </div>
)}

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
                Layers 
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
                Projects
              </button>
            </div>
          </div>

{/* Properties panel */}
{activePanel === "properties" && (
  <PropertiesPanel
    imageName={imageName}
    zoom={zoom}
    offset={offset}
    cropRegion={cropRegion}
    brightness={brightness}
    contrast={contrast}
    saturation={saturation}
    blur={blur}
    activePreset={activePreset}
    resizeWidth={resizeWidth}
    resizeHeight={resizeHeight}
    lockAspectRatio={lockAspectRatio}
    getImageDimensions={getImageDimensions}
    resetAdjustments={resetAdjustments}
    applyPreset={applyPreset}
    setBrightness={setBrightness}
    setContrast={setContrast}
    setSaturation={setSaturation}
    setBlur={setBlur}
    setActivePreset={setActivePreset}
    setLockAspectRatio={setLockAspectRatio}
    setResizeWidth={setResizeWidth}
    setResizeHeight={setResizeHeight}
    handleResizeWidth={handleResizeWidth}
    handleResizeHeight={handleResizeHeight}
    resetResizeFields={resetResizeFields}
    applyResize={applyResize}
  />
)}
{/* Saved Projects panel */}
{activePanel === "projects" && (
  <ProjectsPanel
    savedProjects={savedProjects}
    handleOpenProject={handleOpenProject}
    handleDeleteProject={handleDeleteProject}
  />
)}

{/* Layers panel */}
{activePanel === "layers" && (
  <LayersPanel
    layers={layers}
    selectedLayer={selectedLayer}
    setSelectedLayerId={setSelectedLayerId}
    addTextLayer={addTextLayer}
    addShapeLayer={addShapeLayer}
    onAddImageLayer={() => layerImageInputRef.current?.click()}
    deleteSelectedLayer={deleteSelectedLayer}
    updateLayer={updateLayer}
    moveLayerOrder={moveLayerOrder}
  />
)}
{/* History panel */}
{activePanel === "history" && (
  <HistoryPanel
    history={history}
    historyIndex={historyIndex}
    undo={undo}
    redo={redo}
    restoreHistory={restoreHistory}
  />
)}
</aside>
      </main>
    </div>
  );
}

export default App;
