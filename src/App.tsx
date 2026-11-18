import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Undo2,
  Redo2,
  Image as ImageIcon,
  Sun,
  Moon,
} from "lucide-react";
import "./App.css";

import { presets } from "./constants/presets";
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
import { getAllProjects } from "./services/projectStorage";
import type { SavedProject } from "./services/projectStorage";
import Toolbar from "./components/Toolbar";
import RightPanel from "./components/RightPanel";
import { calculateCropRegion } from "./utils/cropUtils";
import { transformImageCanvas } from "./utils/transformUtils";
import { resizeImageCanvas } from "./utils/resizeUtils";
import { createExportDataURL } from "./utils/exportUtils";
import { getImageDimensions as calculateImageDimensions } from "./utils/dimensionUtils";
import { isSupportedImage } from "./utils/fileUtils";
import { loadLayerImage } from "./utils/layerImageUtils";
import ExportSettings from "./components/ExportSettings";
import CanvasWorkspace from "./components/CanvasWorkspace";
import { useEditorHistory } from "./hooks/useEditorHistory";
import { drawCanvas as renderEditorCanvas } from "./utils/canvasRenderer";
import { useCanvasInteractions } from "./hooks/useCanvasInteractions";
import { useProjectManagement } from "./hooks/useProjectManagement";

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

    const {
    history,historyIndex, addSnapshot, markRestoring, updateHistoryIndex,
    undo: undoHistory,
    redo: redoHistory,
  } = useEditorHistory();
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

    addSnapshot(snapshot);
  }, [
    imageName,
    imageRevision,
    cropRegion,
    brightness,
    contrast,
    saturation,
    blur,
    activePreset,
    layers,
    selectedLayerId,
    isTransformingLayer,
    addSnapshot,
  ]);

    const restoreHistory = useCallback((index: number) => {
    const snapshot = history[index];
    if (!snapshot) return;

    markRestoring();
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

    updateHistoryIndex(index);
  }, [history, markRestoring, updateHistoryIndex]);

  const undo = useCallback(() => {
    undoHistory(restoreHistory);
  }, [undoHistory, restoreHistory]);

  const redo = useCallback(() => {
    redoHistory(restoreHistory);
  }, [redoHistory, restoreHistory]);

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
    renderEditorCanvas({
      canvas: canvasRef.current,
      image: imageRef.current,
      originalImage: originalImageRef.current,
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
    });
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

  const {
    handleSaveProject,
    handleOpenProject,
    handleDeleteProject,
  } = useProjectManagement({
    imageRef,
    originalImageRef,

    imageName,
    projectName,

    layers,
    selectedLayerId,
    cropRegion,

    brightness,
    contrast,
    saturation,
    blur,
    activePreset,

    selectedProjectId,

    setOriginalImageDimensions,
    setResizeWidth,
    setResizeHeight,

    setImageName,
    setProjectName,

    setCropRegion,
    setBrightness,
    setContrast,
    setSaturation,
    setBlur,
    setActivePreset,

    setLayers,
    setSelectedLayerId,

    setSavedProjects,
    setSelectedProjectId,

    setImageRevision,
    setIsSavingProject,
  });

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

  const {
    handleMouseDown,
    handleMouseMove,
    stopDragging,
  } = useCanvasInteractions({
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
  });


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
<CanvasWorkspace
  imageName={imageName}
  cropMode={cropMode}
  cropAspectRatio={cropAspectRatio}
  cropSelection={cropSelection}
  cropRegion={cropRegion}
  comparisonPosition={comparisonPosition}
  isDragging={isDragging}
  layerDragStart={layerDragStart}
  zoom={zoom}
  canvasRef={canvasRef}
  fileInputRef={fileInputRef}
  layerImageInputRef={layerImageInputRef}
  setCropAspectRatio={setCropAspectRatio}
  setComparisonPosition={setComparisonPosition}
  transformImage={transformImage}
  addTextLayer={addTextLayer}
  addShapeLayer={addShapeLayer}
  cancelCrop={cancelCrop}
  applyCrop={applyCrop}
  resetCrop={resetCrop}
  uploadImage={uploadImage}
  uploadLayerImage={uploadLayerImage}
  handleMouseDown={handleMouseDown}
  handleMouseMove={handleMouseMove}
  stopDragging={stopDragging}
  handleZoom={handleZoom}
  fitToScreen={fitToScreen}
  resetView={resetView}
/>

{/* Right panel */}
<RightPanel
  activePanel={activePanel}
  setActivePanel={setActivePanel}
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
  savedProjects={savedProjects}
  handleOpenProject={handleOpenProject}
  handleDeleteProject={handleDeleteProject}
  layers={layers}
  selectedLayer={selectedLayer}
  setSelectedLayerId={setSelectedLayerId}
  addTextLayer={addTextLayer}
  addShapeLayer={addShapeLayer}
  onAddImageLayer={() => layerImageInputRef.current?.click()}
  deleteSelectedLayer={deleteSelectedLayer}
  updateLayer={updateLayer}
  moveLayerOrder={moveLayerOrder}
  history={history}
  historyIndex={historyIndex}
  undo={undo}
  redo={redo}
  restoreHistory={restoreHistory}
/>
      </main>
    </div>
  );
}

export default App;
