import type {
  ChangeEvent,
  MouseEvent,
  RefObject,
} from "react";

import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Type,
  Square,
  Circle,
  ImagePlus,
  X,
  Check,
  Upload,
  ZoomOut,
  ZoomIn,
  Maximize,
} from "lucide-react";

import type {
  Point,
  CropRegion,
  Selection,
  TransformAction,
} from "../types/editor";

type CanvasWorkspaceProps = {
  imageName: string;
  cropMode: boolean;
  cropAspectRatio: number | null;
  cropSelection: Selection | null;
  cropRegion: CropRegion | null;
  comparisonPosition: number;
  isDragging: boolean;
  layerDragStart: Point | null;
  zoom: number;

  canvasRef: RefObject<HTMLCanvasElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  layerImageInputRef: RefObject<HTMLInputElement | null>;

  setCropAspectRatio: (value: number | null) => void;
  setComparisonPosition: (value: number) => void;

  transformImage: (action: TransformAction) => void;
  addTextLayer: () => void;
  addShapeLayer: (type: "rectangle" | "circle") => void;

  cancelCrop: () => void;
  applyCrop: () => void;
  resetCrop: () => void;

  uploadImage: (event: ChangeEvent<HTMLInputElement>) => void;
  uploadLayerImage: (event: ChangeEvent<HTMLInputElement>) => void;

  handleMouseDown: (event: MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (event: MouseEvent<HTMLCanvasElement>) => void;
  stopDragging: () => void;

  handleZoom: (direction: number) => void;
  fitToScreen: () => void;
  resetView: () => void;
};

export default function CanvasWorkspace({
  imageName,
  cropMode,
  cropAspectRatio,
  cropSelection,
  cropRegion,
  comparisonPosition,
  isDragging,
  layerDragStart,
  zoom,
  canvasRef,
  fileInputRef,
  layerImageInputRef,
  setCropAspectRatio,
  setComparisonPosition,
  transformImage,
  addTextLayer,
  addShapeLayer,
  cancelCrop,
  applyCrop,
  resetCrop,
  uploadImage,
  uploadLayerImage,
  handleMouseDown,
  handleMouseMove,
  stopDragging,
  handleZoom,
  fitToScreen,
  resetView,
}: CanvasWorkspaceProps) {
  return (
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
            onChange={(event) =>
              setComparisonPosition(Number(event.target.value))
            }
          />
        </div>
      )}

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
  );
}
