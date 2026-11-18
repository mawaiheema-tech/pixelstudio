import type { Dispatch, SetStateAction } from "react";

import PropertiesPanel from "./PropertiesPanel";
import ProjectsPanel from "./ProjectsPanel";
import LayersPanel from "./LayersPanel";
import HistoryPanel from "./HistoryPanel";

import type {
  Point,
  CropRegion,
  EditorLayer,
  HistorySnapshot,
  PresetName,
} from "../types/editor";

import type { SavedProject } from "../services/projectStorage";

type ActivePanel = "properties" | "layers" | "history" | "projects";

type RightPanelProps = {
  activePanel: ActivePanel;
  setActivePanel: Dispatch<SetStateAction<ActivePanel>>;

  // Properties
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

  // Projects
  savedProjects: SavedProject[];
  handleOpenProject: (id: string) => void;
  handleDeleteProject: (id: string) => void;

  // Layers
  layers: EditorLayer[];
  selectedLayer: EditorLayer | undefined;
  setSelectedLayerId: (id: string | null) => void;
  addTextLayer: () => void;
  addShapeLayer: (type: "rectangle" | "circle") => void;
  onAddImageLayer: () => void;
  deleteSelectedLayer: () => void;
  updateLayer: (id: string, updates: Partial<EditorLayer>) => void;
  moveLayerOrder: (id: string, direction: -1 | 1) => void;

  // History
  history: HistorySnapshot[];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  restoreHistory: (index: number) => void;
};

export default function RightPanel({
  activePanel,
  setActivePanel,

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

  savedProjects,
  handleOpenProject,
  handleDeleteProject,

  layers,
  selectedLayer,
  setSelectedLayerId,
  addTextLayer,
  addShapeLayer,
  onAddImageLayer,
  deleteSelectedLayer,
  updateLayer,
  moveLayerOrder,

  history,
  historyIndex,
  undo,
  redo,
  restoreHistory,
}: RightPanelProps) {
  const panels: ActivePanel[] = [
    "properties",
    "layers",
    "history",
    "projects",
  ];

  return (
    <aside className="right-panel">
      <div className="panel-heading">
        <div className="panel-tabs">
          {panels.map((panel) => (
            <button
              key={panel}
              className={
                activePanel === panel
                  ? "panel-tab active"
                  : "panel-tab"
              }
              onClick={() => setActivePanel(panel)}
            >
              {panel.charAt(0).toUpperCase() + panel.slice(1)}
            </button>
          ))}
        </div>
      </div>

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

      {activePanel === "projects" && (
        <ProjectsPanel
          savedProjects={savedProjects}
          handleOpenProject={handleOpenProject}
          handleDeleteProject={handleDeleteProject}
        />
      )}

      {activePanel === "layers" && (
        <LayersPanel
          layers={layers}
          selectedLayer={selectedLayer}
          setSelectedLayerId={setSelectedLayerId}
          addTextLayer={addTextLayer}
          addShapeLayer={addShapeLayer}
          onAddImageLayer={onAddImageLayer}
          deleteSelectedLayer={deleteSelectedLayer}
          updateLayer={updateLayer}
          moveLayerOrder={moveLayerOrder}
        />
      )}

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
  );
}