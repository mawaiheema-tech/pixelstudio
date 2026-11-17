
type ExportSettingsProps = {
  quality: number;
  width: number;
  height: number;
  lockAspectRatio: boolean;
  sourceWidth: number;
  sourceHeight: number;
  onQualityChange: (value: number) => void;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onLockAspectRatioChange: (value: boolean) => void;
};

export default function ExportSettings({
  quality,
  width,
  height,
  lockAspectRatio,
  sourceWidth,
  sourceHeight,
  onQualityChange,
  onWidthChange,
  onHeightChange,
  onLockAspectRatioChange,
}: ExportSettingsProps) {
  return (
    <details className="export-settings">
      <summary>Export Settings</summary>

      <div className="export-settings-panel">
        <label>Quality: {quality}%</label>

        <input
          type="range"
          min="10"
          max="100"
          value={quality}
          onChange={(event) =>
            onQualityChange(Number(event.target.value))
          }
        />

        <label>Width (px)</label>

        <input
          type="number"
          min="1"
          value={width || sourceWidth || ""}
          onChange={(event) => {
            const value = Math.max(1, Number(event.target.value));

            onWidthChange(value);

            if (lockAspectRatio && sourceWidth > 0) {
              onHeightChange(
                Math.round(value * sourceHeight / sourceWidth)
              );
            }
          }}
        />

        <label>Height (px)</label>

        <input
          type="number"
          min="1"
          value={height || sourceHeight || ""}
          onChange={(event) => {
            const value = Math.max(1, Number(event.target.value));

            onHeightChange(value);

            if (lockAspectRatio && sourceHeight > 0) {
              onWidthChange(
                Math.round(value * sourceWidth / sourceHeight)
              );
            }
          }}
        />

        <label className="export-lock-control">
          <input
            type="checkbox"
            checked={lockAspectRatio}
            onChange={(event) =>
              onLockAspectRatioChange(event.target.checked)
            }
          />
          Maintain aspect ratio
        </label>
      </div>
    </details>
  );
}