
import {
  MousePointer2,
  Crop,
  SlidersHorizontal,
  Layers,
  History,
  Settings,
} from "lucide-react";

type ToolbarProps = {
  cropMode: boolean;
  activePanel: "properties" | "layers" | "history" | "projects";
  cancelCrop: () => void;
  startCrop: () => void;
  setActivePanel: (
    panel: "properties" | "layers" | "history" | "projects"
  ) => void;
};

function Toolbar({
  cropMode,
  activePanel,
  cancelCrop,
  startCrop,
  setActivePanel,
}: ToolbarProps) {
  return (
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
  );
}

export default Toolbar;
