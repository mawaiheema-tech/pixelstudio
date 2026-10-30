
import { useEffect, useRef, useState } from "react";
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
  MousePointer2,
  Crop,
  SlidersHorizontal,
  Layers,
  Download,
  Undo2,
  Redo2,
  Settings,
  Image as ImageIcon,
  Check,
  X,
  Lock,
  Unlock,
} from "lucide-react";
import "./App.css";

type Point = {
  x: number;
  y: number;
};

type CropRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Selection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TransformAction =
  | "rotate-left"
  | "rotate-right"
  | "flip-horizontal"
  | "flip-vertical";

type PresetName =
  | "original"
  | "vivid"
  | "warm"
  | "cool"
  | "grayscale"
  | "vintage"
  | "custom";

const presets = {
  original: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
  },
  vivid: {
    brightness: 110,
    contrast: 120,
    saturation: 150,
    blur: 0,
  },
  warm: {
    brightness: 105,
    contrast: 105,
    saturation: 115,
    blur: 0,
  },
  cool: {
    brightness: 105,
    contrast: 110,
    saturation: 90,
    blur: 0,
  },
  grayscale: {
    brightness: 100,
    contrast: 110,
    saturation: 0,
    blur: 0,
  },
  vintage: {
    brightness: 105,
    contrast: 90,
    saturation: 75,
    blur: 0,
  },
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageName, setImageName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [lastPosition, setLastPosition] = useState<Point>({
    x: 0,
    y: 0,
  });

  // Crop states
  const [cropMode, setCropMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [cropStart, setCropStart] = useState<Point | null>(null);
  const [cropSelection, setCropSelection] =
    useState<Selection | null>(null);
  const [cropRegion, setCropRegion] =
    useState<CropRegion | null>(null);

  const [imageRevision, setImageRevision] = useState(0);

  // Resize states
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  // Image adjustment states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [activePreset, setActivePreset] =
    useState<PresetName>("original");

  // Get current image dimensions.
  const getImageDimensions = () => {
    const image = imageRef.current;

    if (!image) return null;

    return cropRegion
      ? {
          width: cropRegion.width,
          height: cropRegion.height,
        }
      : {
          width: image.width,
          height: image.height,
        };
  };

  // Reset image adjustments.
  const resetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setActivePreset("original");
  };

  // Apply a preset.
  const applyPreset = (name: Exclude<PresetName, "custom">) => {
    const preset = presets[name];

    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setSaturation(preset.saturation);
    setBlur(preset.blur);
    setActivePreset(name);
  };

  // Update resize dimensions when image changes.
  useEffect(() => {
    const dimensions = getImageDimensions();

    if (dimensions) {
      setResizeWidth(Math.round(dimensions.width));
      setResizeHeight(Math.round(dimensions.height));
    }
  }, [imageRevision, cropRegion]);

  // Convert mouse position to canvas coordinates.
  const getCanvasPoint = (
    event: React.MouseEvent<HTMLCanvasElement>
  ): Point => {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  // Draw image and crop selection.
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

    // Draw adjusted image.
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

    // Crop selection overlay.
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

      ctx.clearRect(
        x,
        y,
        selectionWidth,
        selectionHeight
      );

      // Redraw selected area with adjustments.
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

      ctx.strokeRect(
        x,
        y,
        selectionWidth,
        selectionHeight
      );

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
  };

  // Redraw canvas whenever its display properties change.
  useEffect(() => {
    drawCanvas();
  }, [
    zoom,
    offset,
    imageName,
    cropRegion,
    cropMode,
    cropSelection,
    imageRevision,
    brightness,
    contrast,
    saturation,
    blur,
  ]);

  // Handle browser resizing.
  useEffect(() => {
    const handleResize = () => drawCanvas();

    window.addEventListener("resize", handleResize);
    drawCanvas();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Fit image inside canvas.
  const fitToScreen = () => {
    const canvas = canvasRef.current;
    const dimensions = getImageDimensions();

    if (!canvas || !dimensions) return;

    const scaleX = canvas.clientWidth / dimensions.width;
    const scaleY = canvas.clientHeight / dimensions.height;

    const newZoom = Math.min(scaleX, scaleY, 1);

    setZoom(newZoom);

    setOffset({
      x:
        (canvas.clientWidth -
          dimensions.width * newZoom) /
        2,
      y:
        (canvas.clientHeight -
          dimensions.height * newZoom) /
        2,
    });
  };

  // Upload image.
  const uploadImage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !["image/png", "image/jpeg", "image/webp"].includes(
        file.type
      )
    ) {
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
          x:
            (canvas.clientWidth - image.width * scale) /
            2,
          y:
            (canvas.clientHeight - image.height * scale) /
            2,
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

  // Zoom.
  const handleZoom = (direction: number) => {
    const nextZoom = Math.min(
      5,
      Math.max(0.1, zoom + direction)
    );

    setZoom(nextZoom);
  };

  // Mouse down.
  const handleMouseDown = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
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

    setIsDragging(true);

    setLastPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  // Mouse move.
  const handleMouseMove = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (cropMode && isSelecting && cropStart) {
      const point = getCanvasPoint(event);
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

      setCropSelection({
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      });

      return;
    }

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

    if (
      cropSelection.width < 10 ||
      cropSelection.height < 10
    ) {
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

    if (nextCrop.width <= 0 || nextCrop.height <= 0) {
      return;
    }

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
        x:
          (canvas.clientWidth - nextCrop.width * newZoom) /
          2,
        y:
          (canvas.clientHeight - nextCrop.height * newZoom) /
          2,
      });
    });
  };

  const resetCrop = () => {
    setCropRegion(null);
    cancelCrop();

    requestAnimationFrame(() => {
      fitToScreen();
    });
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
      action === "rotate-left" ||
      action === "rotate-right";

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

    // Keep adjustments separate from the underlying image.
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
        x:
          (canvas.clientWidth -
            transformedImage.width * scale) /
          2,
        y:
          (canvas.clientHeight -
            transformedImage.height * scale) /
          2,
      });
    };

    transformedImage.onerror = () => {
      alert("Unable to transform this image.");
    };

    transformedImage.src =
      transformCanvas.toDataURL("image/png");
  };

  // Resize functions.
  const handleResizeWidth = (value: number) => {
    const width = Math.max(1, Math.min(12000, value));

    setResizeWidth(width);

    if (lockAspectRatio) {
      const dimensions = getImageDimensions();

      if (!dimensions) return;

      const ratio = dimensions.width / dimensions.height;

      setResizeHeight(
        Math.max(1, Math.round(width / ratio))
      );
    }
  };

  const handleResizeHeight = (value: number) => {
    const height = Math.max(1, Math.min(12000, value));

    setResizeHeight(height);

    if (lockAspectRatio) {
      const dimensions = getImageDimensions();

      if (!dimensions) return;

      const ratio = dimensions.width / dimensions.height;

      setResizeWidth(
        Math.max(1, Math.round(height * ratio))
      );
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

    // Resize the original pixel data.
    // Adjustment filters remain separate in React state.
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
        x:
          (canvas.clientWidth -
            resizedImage.width * scale) /
          2,
        y:
          (canvas.clientHeight -
            resizedImage.height * scale) /
          2,
      });
    };

    resizedImage.onerror = () => {
      alert("Unable to resize this image.");
    };

    resizedImage.src = resizeCanvas.toDataURL("image/png");
  };

  // Restore original uploaded image.
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
        x:
          (canvas.clientWidth -
            originalImage.width * scale) /
          2,
        y:
          (canvas.clientHeight -
            originalImage.height * scale) /
          2,
      });
    });
  };

  // Reset canvas view.
  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
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
            title="Undo"
            disabled
          >
            <Undo2 />
          </button>

          <button
            className="icon-button"
            title="Redo"
            disabled
          >
            <Redo2 />
          </button>

          <span className="divider" />

          <button className="export-button" disabled>
            <Download size={17} />
            Export
          </button>
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
              document
                .querySelector(".adjustment-section")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            }}
          >
            <SlidersHorizontal />
          </button>

          <button
            className="tool"
            title="Layers"
            disabled
          >
            <Layers />
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
              {/* Rotate and flip */}
              {imageName && !cropMode && (
                <div className="transform-actions">
                  <button
                    className="control-button"
                    title="Rotate left"
                    onClick={() =>
                      transformImage("rotate-left")
                    }
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    className="control-button"
                    title="Rotate right"
                    onClick={() =>
                      transformImage("rotate-right")
                    }
                  >
                    <RotateCw size={16} />
                  </button>

                  <button
                    className="control-button"
                    title="Flip horizontally"
                    onClick={() =>
                      transformImage("flip-horizontal")
                    }
                  >
                    <FlipHorizontal size={16} />
                  </button>

                  <button
                    className="control-button"
                    title="Flip vertically"
                    onClick={() =>
                      transformImage("flip-vertical")
                    }
                  >
                    <FlipVertical size={16} />
                  </button>
                </div>
              )}

              {/* Crop controls */}
              {cropMode && (
                <>
                  <button
                    className="crop-cancel-button"
                    onClick={cancelCrop}
                  >
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
                <button
                  className="crop-cancel-button"
                  onClick={resetCrop}
                >
                  <RotateCcw size={16} />
                  Reset Crop
                </button>
              )}

              <button
                className="upload-button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
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
          </div>

          {/* Canvas */}
          <div className="canvas-area">
            <div className="canvas-container">
              <canvas
                ref={canvasRef}
                className={
                  cropMode
                    ? "canvas crop-cursor"
                    : isDragging
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
              <button
                className="control-button"
                onClick={fitToScreen}
              >
                <Maximize size={16} />
                Fit
              </button>

              <button
                className="control-button"
                onClick={resetView}
              >
                <RotateCcw size={16} />
                Reset View
              </button>
            </div>
          </div>
        </section>

        {/* Right properties panel */}
        <aside className="right-panel">
          <div className="panel-heading">
            <h3>Properties</h3>
          </div>

          {!imageName ? (
            <div className="empty-panel">
              <ImagePlus size={30} />
              <p>No image selected</p>
              <span>
                Upload an image to see its properties.
              </span>
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
                      <strong>
                        {Math.round(dimensions.width)} px
                      </strong>
                    </div>

                    <div className="property-row">
                      <span>Image height</span>
                      <strong>
                        {Math.round(dimensions.height)} px
                      </strong>
                    </div>
                  </>
                ) : null;
              })()}

              {cropRegion && (
                <>
                  <div className="property-row">
                    <span>Crop width</span>
                    <strong>
                      {Math.round(cropRegion.width)} px
                    </strong>
                  </div>

                  <div className="property-row">
                    <span>Crop height</span>
                    <strong>
                      {Math.round(cropRegion.height)} px
                    </strong>
                  </div>
                </>
              )}

              {/* Image Adjustments */}
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

                {/* Presets */}
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

                {/* Brightness */}
                <div className="adjustment-control">
                  <div className="adjustment-label">
                    <label htmlFor="brightness">
                      Brightness
                    </label>
                    <strong>{brightness}%</strong>
                  </div>

                  <input
                    id="brightness"
                    type="range"
                    min="0"
                    max="200"
                    value={brightness}
                    onChange={(event) => {
                      setBrightness(
                        Number(event.target.value)
                      );
                      setActivePreset("custom");
                    }}
                  />
                </div>

                {/* Contrast */}
                <div className="adjustment-control">
                  <div className="adjustment-label">
                    <label htmlFor="contrast">
                      Contrast
                    </label>
                    <strong>{contrast}%</strong>
                  </div>

                  <input
                    id="contrast"
                    type="range"
                    min="0"
                    max="200"
                    value={contrast}
                    onChange={(event) => {
                      setContrast(
                        Number(event.target.value)
                      );
                      setActivePreset("custom");
                    }}
                  />
                </div>

                {/* Saturation */}
                <div className="adjustment-control">
                  <div className="adjustment-label">
                    <label htmlFor="saturation">
                      Saturation
                    </label>
                    <strong>{saturation}%</strong>
                  </div>

                  <input
                    id="saturation"
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(event) => {
                      setSaturation(
                        Number(event.target.value)
                      );
                      setActivePreset("custom");
                    }}
                  />
                </div>

                {/* Blur */}
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
                      handleResizeWidth(
                        Number(event.target.value)
                      )
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
                      handleResizeHeight(
                        Number(event.target.value)
                      )
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
        </aside>
      </main>
    </div>
  );
}

export default App;
