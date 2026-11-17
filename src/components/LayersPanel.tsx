
import {
  Trash2,
  Type,
  Square,
  Circle,
  ImagePlus,
  Image as ImageIcon,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import type { EditorLayer } from "../types/editor";

type LayersPanelProps = {
  layers: EditorLayer[];
  selectedLayer: EditorLayer | undefined;

  setSelectedLayerId: (id: string | null) => void;

  addTextLayer: () => void;
  addShapeLayer: (type: "rectangle" | "circle") => void;
  onAddImageLayer: () => void;

  updateLayer: (
    id: string,
    updates: Partial<EditorLayer>
  ) => void;

  deleteSelectedLayer: () => void;
  moveLayerOrder: (id: string, direction: -1 | 1) => void;
};

function LayersPanel({
  layers,
  selectedLayer,
  setSelectedLayerId,
  addTextLayer,
  addShapeLayer,
  onAddImageLayer,
  updateLayer,
  deleteSelectedLayer,
  moveLayerOrder,
}: LayersPanelProps) {
  return (
    <div className="layers-panel">
      <div className="layers-heading">
        <h4>Layers ({layers.length})</h4>

        <button
          className="layer-delete-button"
          onClick={deleteSelectedLayer}
          disabled={!selectedLayer}
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
        onClick={onAddImageLayer}
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
                selectedLayer?.id === layer.id
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
<label>
  Blend Mode

  <select
    value={selectedLayer.blendMode ?? "source-over"}
    onChange={(event) =>
      updateLayer(selectedLayer.id, {
        blendMode: event.target.value as
          | "source-over"
          | "multiply"
          | "screen"
          | "overlay"
          | "darken"
          | "lighten",
      })
    }
  >
    <option value="source-over">Normal</option>
    <option value="multiply">Multiply</option>
    <option value="screen">Screen</option>
    <option value="overlay">Overlay</option>
    <option value="darken">Darken</option>
    <option value="lighten">Lighten</option>
  </select>
</label>

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
  );
}

export default LayersPanel;

