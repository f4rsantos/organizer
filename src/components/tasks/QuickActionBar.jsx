import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { getStrings, useStrings } from "@/lib/strings";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { useMergedKanbanBoard } from "@/hooks/useMergedKanbanBoard";
import { useCollabActions } from "@/hooks/useCollabActions";
import { useQuickActionHistory } from "@/hooks/useQuickActionHistory";
import { parseWithFallback } from "@/lib/quickAction/parseWithFallback";
import { canUndo, executeQuickAction, quickActionScope, storeQuickActionContext } from "@/lib/quickAction/execute";

const MAX_TEXTAREA_PX = 150;
const FALLBACK_LANG = "en";

function AutoTextarea({ value, onChange, onKeyDown, placeholder }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      autoFocus
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      className="flex w-full resize-none overflow-y-auto rounded-lg border-0 bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
      style={{ minHeight: "38px", maxHeight: `${MAX_TEXTAREA_PX}px` }}
    />
  );
}

function useMergedTasks(semesterId, localTasks) {
  const { cards: mergedCards } = useMergedKanbanBoard(semesterId);
  return useMemo(() => {
    const byId = new Map((localTasks ?? []).map((task) => [task.id, task]));
    for (const card of mergedCards) if (!byId.has(card.id)) byId.set(card.id, card);
    return [...byId.values()];
  }, [localTasks, mergedCards]);
}

export function QuickActionBar({ onDone }) {
  const lang = useStore((s) => s.lang ?? "en");
  const t = useStrings(lang);
  const state = useStore((s) => s);
  const setQuickActionUndo = useStore((s) => s.setQuickActionUndo);
  const scope = quickActionScope(state);
  const tasks = useMergedTasks(scope.semesterId, state.tasks);
  const shared = useCollabActions();
  const [text, setText] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { history, remember } = useQuickActionHistory();

  const { isSupported, isListening, start, stop } = useSpeechInput({ lang, onResult: (value) => setText(value) });

  const runParse = () => {
    if (!text.trim()) return;
    const now = new Date();
    const items = parseWithFallback(text, {
      classes: scope.classes,
      now,
      t,
      columns: scope.columns,
      teams: state.collabRuntime?.teams ?? {},
      lang,
      apps: state.settings?.apps ?? {},
      navbar: state.settings?.navbar ?? {},
    }, { lang: FALLBACK_LANG, t: getStrings(FALLBACK_LANG) });
    const result = executeQuickAction(items, storeQuickActionContext(useStore, { t, now, tasks, shared }));
    remember(text);
    if (canUndo(result.effects)) setQuickActionUndo({ ...result, at: Date.now() });
    setText("");
    setHistoryIndex(-1);
    onDone?.();
  };

  const recall = (delta) => {
    const next = Math.max(-1, Math.min(history.length - 1, historyIndex + delta));
    setHistoryIndex(next);
    setText(next === -1 ? "" : history[next]);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runParse();
      return;
    }
    if (text.includes("\n") || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    recall(e.key === "ArrowUp" ? 1 : -1);
  };

  return (
    <div className="flex items-center gap-2">
      <AutoTextarea
        placeholder={t.quickActionPlaceholder}
        value={text}
        onChange={(e) => { setText(e.target.value); setHistoryIndex(-1); }}
        onKeyDown={onKeyDown}
      />
      {isSupported && (
        <Button type="button" variant="clear" size="icon" className="border-0" onClick={() => (isListening ? stop() : start())}>
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
