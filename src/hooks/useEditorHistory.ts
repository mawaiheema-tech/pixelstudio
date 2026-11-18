import { useCallback, useRef, useState } from "react";
import type { HistorySnapshot } from "../types/editor";

export function useEditorHistory() {
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const historyIndexRef = useRef(0);
  const isRestoringHistory = useRef(false);
  const historyReady = useRef(false);

  const addSnapshot = useCallback((snapshot: HistorySnapshot) => {
    if (isRestoringHistory.current) {
      isRestoringHistory.current = false;
      return;
    }

    if (!historyReady.current) {
      historyReady.current = true;
      setHistory([snapshot]);
      historyIndexRef.current = 0;
      setHistoryIndex(0);
      return;
    }

    setHistory((previous) => {
      const next = previous.slice(0, historyIndexRef.current + 1);
      next.push(snapshot);

      const trimmed = next.length > 100 ? next.slice(-100) : next;
      const nextIndex = trimmed.length - 1;

      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);

      return trimmed;
    });
  }, []);

  const markRestoring = useCallback(() => {
    isRestoringHistory.current = true;
  }, []);

  const updateHistoryIndex = useCallback((index: number) => {
    historyIndexRef.current = index;
    setHistoryIndex(index);
  }, []);

  const undo = useCallback(
    (restoreHistory: (index: number) => void) => {
      if (historyIndex > 0) {
        restoreHistory(historyIndex - 1);
      }
    },
    [historyIndex]
  );

  const redo = useCallback(
    (restoreHistory: (index: number) => void) => {
      if (historyIndex < history.length - 1) {
        restoreHistory(historyIndex + 1);
      }
    },
    [historyIndex, history.length]
  );

  return {
    history,
    historyIndex,
    isRestoringHistory,
    historyReady,
    addSnapshot,
    markRestoring,
    updateHistoryIndex,
    undo,
    redo,
  };
}