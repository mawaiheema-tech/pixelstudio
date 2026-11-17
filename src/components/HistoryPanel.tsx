
import { Undo2, Redo2, Check } from "lucide-react";
import type { HistorySnapshot } from "../types/editor";

type HistoryPanelProps = {
  history: HistorySnapshot[];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  restoreHistory: (index: number) => void;
};

function HistoryPanel({
  history,
  historyIndex,
  undo,
  redo,
  restoreHistory,
}: HistoryPanelProps) {
  return (
    <div className="history-panel">
      <div className="layers-heading">
        <h4>History</h4>

        <div className="history-actions">
          <button
            className="control-button"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <Undo2 size={15} />
          </button>

          <button
            className="control-button"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
          >
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <p className="layers-empty">
          Your editing history will appear here.
        </p>
      ) : (
        <div className="history-list">
          {history.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              className={
                index === historyIndex
                  ? "history-item active"
                  : "history-item"
              }
              onClick={() => restoreHistory(index)}
            >
              <span className="history-number">
                {index + 1}
              </span>

              <span className="history-label">
                {item.name || "Editor state"}
              </span>

              {index === historyIndex && (
                <Check size={14} />
              )}
            </button>
          ))}
        </div>
      )}

      <p className="history-hint">
        Use Ctrl + Z to undo and Ctrl + Y to redo.
      </p>
    </div>
  );
}

export default HistoryPanel;
