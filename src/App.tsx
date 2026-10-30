
import { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  MousePointer2,
  Crop,
  SlidersHorizontal,
  Layers,
  Download,
  Undo2,
  Redo2,
  Settings,
  Image as ImageIcon,
} from "lucide-react";
import "./App.css";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageName, setImageName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

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
      ctx.fillStyle = "#777";
      ctx.font = "15px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "Upload an image to start editing",
        width / 2,
        height / 2
      );
      return;
    }

    const drawWidth = image.width * zoom;
    const drawHeight = image.height * zoom;

    ctx.drawImage(
      image,
      offset.x,
      offset.y,
      drawWidth,
      drawHeight
    );
  };

  useEffect(() => {
    drawCanvas();
  }, [zoom, offset, imageName]);

  useEffect(() => {
    const handleResize = () => drawCanvas();

    window.addEventListener("resize", handleResize);
    drawCanvas();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fitToScreen = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image) return;

    const scaleX = canvas.clientWidth / image.width;
    const scaleY = canvas.clientHeight / image.height;
    const newZoom = Math.min(scaleX, scaleY, 1);

    setZoom(newZoom);
    setOffset({
      x: (canvas.clientWidth - image.width * newZoom) / 2,
      y: (canvas.clientHeight - image.height * newZoom) / 2,
    });
  };

  const uploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      alert("Please upload a PNG, JPG, or WebP image.");
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      imageRef.current = image;
      setImageName(file.name);
      setZoom(1);
      setOffset({ x: 0, y: 0 });

      requestAnimationFrame(() => {
        fitToScreen();
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

  const handleZoom = (direction: number) => {
    const nextZoom = Math.min(5, Math.max(0.1, zoom + direction));
    setZoom(nextZoom);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const dx = event.clientX - lastPosition.x;
    const dy = event.clientY - lastPosition.y;

    setOffset((previous) => ({
      x: previous.x + dx,
      y: previous.y + dy,
    }));

    setLastPosition({ x: event.clientX, y: event.clientY });
  };

  const stopDragging = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><ImageIcon size={22} /></div>
          <span>Pixel<span>Studio</span></span>
        </div>

        <div className="topbar-actions">
          <button className="icon-button" title="Undo" disabled><Undo2 /></button>
          <button className="icon-button" title="Redo" disabled><Redo2 /></button>
          <span className="divider" />
          <button className="export-button" disabled>
            <Download size={17} /> Export
          </button>
        </div>
      </header>

      <main className="editor">
        <aside className="left-toolbar">
          <button className="tool active" title="Select"><MousePointer2 /></button>
          <button className="tool" title="Crop"><Crop /></button>
          <button className="tool" title="Adjustments"><SlidersHorizontal /></button>
          <button className="tool" title="Layers"><Layers /></button>
          <div className="toolbar-spacer" />
          <button className="tool" title="Settings"><Settings /></button>
        </aside>

        <section className="workspace">
          <div className="workspace-header">
            <div>
              <h2>Workspace</h2>
              <p>{imageName || "Untitled project"}</p>
            </div>

            <button
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={17} /> Upload Image
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={uploadImage}
            />
          </div>

          <div className="canvas-area">
            <div className="canvas-container">
              <canvas
                ref={canvasRef}
                className={isDragging ? "canvas dragging" : "canvas"}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
              />
            </div>
          </div>

          <div className="canvas-controls">
            <div className="zoom-controls">
              <button className="control-button" onClick={() => handleZoom(-0.1)} title="Zoom out">
                <ZoomOut size={17} />
              </button>

              <span>{Math.round(zoom * 100)}%</span>

              <button className="control-button" onClick={() => handleZoom(0.1)} title="Zoom in">
                <ZoomIn size={17} />
              </button>
            </div>

            <div className="view-controls">
              <button className="control-button" onClick={fitToScreen}>
                <Maximize size={16} /> Fit
              </button>
              <button className="control-button" onClick={resetView}>
                <RotateCcw size={16} /> Reset
              </button>
            </div>
          </div>
        </section>

        <aside className="right-panel">
          <div className="panel-heading">
            <h3>Properties</h3>
          </div>

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
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
