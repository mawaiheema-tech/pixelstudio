
import type { Dispatch, SetStateAction } from "react";
import {
  ImagePlus,
  Image as ImageIcon,
  Lock,
  Unlock,
} from "lucide-react";

import type { Point, CropRegion, PresetName } from "../types/editor";

type PropertiesPanelProps = {
  imageName: string;
  zoom: number;
  offset: Point;
  cropRegion: CropRegion | null;

  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  activePreset: PresetName;

  resizeWidth: number;
  resizeHeight: number;
  lockAspectRatio: boolean;

  getImageDimensions: () => {
    width: number;
    height: number;
  } | null;

  resetAdjustments: () => void;
  applyPreset: (name: Exclude<PresetName, "custom">) => void;

  setBrightness: Dispatch<SetStateAction<number>>;
  setContrast: Dispatch<SetStateAction<number>>;
  setSaturation: Dispatch<SetStateAction<number>>;
  setBlur: Dispatch<SetStateAction<number>>;
  setActivePreset: Dispatch<SetStateAction<PresetName>>;

  setLockAspectRatio: Dispatch<SetStateAction<boolean>>;
  setResizeWidth: Dispatch<SetStateAction<number>>;
  setResizeHeight: Dispatch<SetStateAction<number>>;

  handleResizeWidth: (value: number) => void;
  handleResizeHeight: (value: number) => void;
  resetResizeFields: () => void;
  applyResize: () => void;
};

function PropertiesPanel({
  imageName,
  zoom,
  offset,
  cropRegion,
  brightness,
  contrast,
  saturation,
  blur,
  activePreset,
  resizeWidth,
  resizeHeight,
  lockAspectRatio,
  getImageDimensions,
  resetAdjustments,
  applyPreset,
  setBrightness,
  setContrast,
  setSaturation,
  setBlur,
  setActivePreset,
  setLockAspectRatio,
  setResizeWidth,
  setResizeHeight,
  handleResizeWidth,
  handleResizeHeight,
  resetResizeFields,
  applyResize,
}: PropertiesPanelProps) {
  if (!imageName) {
    return (
      <div className="empty-panel">
        <ImagePlus size={30} />
        <p>No image selected</p>
        <span>Upload an image to see its properties.</span>
      </div>
    );
  }

  const dimensions = getImageDimensions();

  return (
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

      {dimensions && (
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
      )}

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
  );
}

export default PropertiesPanel;
