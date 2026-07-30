import { useMemo, useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { useStrings } from "@/lib/strings";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { parseQuickAction } from "@/lib/parser/quickActionParse";
import { FREE_BOARD_ID } from "@/lib/taskUtils";
import { useWeekContext } from "@/hooks/useWeekContext";
import { nanoid } from "@/lib/ids";
import { useMergedKanbanBoard } from "@/hooks/useMergedKanbanBoard";
import { useCollabActions } from "@/hooks/useCollabActions";
import { sortByOrder } from "@/lib/utils";

function AutoTextarea({ value, onChange, onKeyDown, placeholder, ...props }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      className="flex w-full rounded-lg border-0 bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto"
      style={{ minHeight: "38px", maxHeight: "150px" }}
      {...props}
    />
  );
}

const DEFAULT_COLUMNS = [
  { id: "col_todo", title: "To Do", order: 0 },
  { id: "col_inprogress", title: "In Progress", order: 1 },
  { id: "col_done", title: "Done", order: 2 },
];

export function QuickActionBar({ semesterId, classes = [], onDone }) {
  const lang = useStore((s) => s.lang ?? "en");
  const t = useStrings(lang);
  const addTask = useStore((s) => s.addTask);
  const addEvent = useStore((s) => s.addEvent);
  const boardId = semesterId ?? FREE_BOARD_ID;
  const rawColumns = useStore(
    (s) => s.kanban?.[boardId]?.columns ?? DEFAULT_COLUMNS,
  );
  const columns = useMemo(
    () => sortByOrder(rawColumns),
    [rawColumns],
  );

  const [text, setText] = useState("");

  const { currentWeek, weekCount, dateToWeek } = useWeekContext();
  const resolveWeek = (dateStr, explicitWeek) => {
    if (Number.isFinite(explicitWeek)) return Math.max(1, Math.min(weekCount || explicitWeek, explicitWeek))
    const w = dateStr ? dateToWeek(dateStr) : null
    const fallback = currentWeek ?? 1
    if (!Number.isFinite(w)) return fallback
    return Math.max(1, Math.min(weekCount || w, w))
  }

  const { isSupported, isListening, start, stop } = useSpeechInput({
    lang,
    onResult: (value) => setText(value),
  });

  const teams = useStore((s) => s.collabRuntime?.teams ?? {});
  const apps = useStore((s) => s.settings?.apps ?? {});
  const navbar = useStore((s) => s.settings?.navbar ?? {});
  const setActiveTab = useStore((s) => s.setActiveTab);
  const updateTask = useStore((s) => s.updateTask);
  const localTasks = useStore((s) => s.tasks ?? []);
  const deleteTask = useStore((s) => s.deleteTask);
  const { cards: mergedCards } = useMergedKanbanBoard(semesterId);
  const { moveSharedCard, updateSharedCard, deleteSharedCard } = useCollabActions();

  // Local tasks may double-count with their own kanban card via mergedCards, so search over
  // the union keyed by id — this is what lets "remove the card X" find cards shared by other
  // team members (their cards only exist in the merged/remote view, not in plain s.tasks).
  const tasks = useMemo(() => {
    const byId = new Map(localTasks.map((t) => [t.id, t]));
    for (const card of mergedCards) {
      if (!byId.has(card.id)) byId.set(card.id, card);
    }
    return [...byId.values()];
  }, [localTasks, mergedCards]);
  const focusSync = useStore((s) => s.focusSync);
  const setFocusSync = useStore((s) => s.setFocusSync);
  const updateFocusSettings = useStore((s) => s.updateFocusSettings);
  const grades = useStore((s) => s.grades ?? {});
  const setGradeComponents = useStore((s) => s.setGradeComponents);
  const addNote = useStore((s) => s.addNote);
  const addNoteFolder = useStore((s) => s.addNoteFolder);

  const runFocusCommand = (cmd) => {
    const running = focusSync?.status === "started";
    const phase = focusSync?.phase === "break" ? "break" : "focus";
    const nowSecs = Math.floor(Date.now() / 1000);

    if (cmd.action === "start" || cmd.action === "resume") {
      if (cmd.workMins || cmd.breakMins) {
        updateFocusSettings({
          ...(cmd.workMins ? { intervalMins: cmd.workMins } : {}),
          ...(cmd.breakMins ? { intervalBreakMins: cmd.breakMins } : {}),
        });
      }
      if (cmd.action === "resume" && running) return;
      if (cmd.action === "resume" && !running && focusSync?.startedAt === null && (focusSync?.totalElapsedBase || focusSync?.cycleElapsedBase)) {
        setFocusSync({ status: "started", startedAt: nowSecs });
        return;
      }
      setFocusSync({
        status: "started",
        phase: "focus",
        startedAt: nowSecs,
        totalElapsedBase: 0,
        cycleElapsedBase: 0,
        breakSecsLeftBase: 0,
        activeBreakSource: null,
      });
      return;
    }

    if (cmd.action === "pause") {
      if (!running || focusSync?.startedAt == null) return;
      const elapsed = Math.max(0, nowSecs - focusSync.startedAt);
      if (phase === "focus") {
        setFocusSync({
          status: "paused",
          startedAt: null,
          totalElapsedBase: (focusSync?.totalElapsedBase ?? 0) + elapsed,
          cycleElapsedBase: (focusSync?.cycleElapsedBase ?? 0) + elapsed,
        });
      } else {
        setFocusSync({
          status: "paused",
          startedAt: null,
          breakSecsLeftBase: Math.max(0, (focusSync?.breakSecsLeftBase ?? 0) - elapsed),
        });
      }
      return;
    }

    if (cmd.action === "reset") {
      setFocusSync({
        status: "paused",
        phase: "focus",
        startedAt: null,
        totalElapsedBase: 0,
        cycleElapsedBase: 0,
        breakSecsLeftBase: 0,
        activeBreakSource: null,
      });
      return;
    }

    if (cmd.action === "skipBreak") {
      if (phase !== "break") return;
      setFocusSync({
        phase: "focus",
        startedAt: running ? nowSecs : null,
        cycleElapsedBase: 0,
        breakSecsLeftBase: 0,
        activeBreakSource: null,
      });
    }
  };

  const runGradeCommand = (cmd) => {
    if (!semesterId || !cmd.classId) return;
    const semGrades = grades[semesterId] ?? {};
    const classGrades = semGrades[cmd.classId] ?? { components: [], targetGrade: 9.5 };
    const components = classGrades.components ?? [];

    const nameTokens = cmd.componentName.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const match = components.find((c) => {
      const cTokens = (c.name || "").toLowerCase().split(/\s+/);
      return nameTokens.every((tok) => cTokens.includes(tok));
    });

    if (cmd.type === "addComponent") {
      if (match) {
        setGradeComponents(semesterId, cmd.classId, components.map((c) =>
          c.id === match.id ? { ...c, ...(cmd.weight != null ? { weight: cmd.weight } : {}) } : c
        ));
        return;
      }
      setGradeComponents(semesterId, cmd.classId, [
        ...components,
        { id: nanoid(), name: cmd.componentName, weight: cmd.weight ?? 0.25, grade: null },
      ]);
      return;
    }

    if (cmd.type === "setGrade") {
      if (match) {
        setGradeComponents(semesterId, cmd.classId, components.map((c) =>
          c.id === match.id ? { ...c, grade: cmd.grade, subcomponents: undefined } : c
        ));
        return;
      }
      if (!cmd.componentName) return;
      setGradeComponents(semesterId, cmd.classId, [
        ...components,
        { id: nanoid(), name: cmd.componentName, weight: 0.25, grade: cmd.grade },
      ]);
    }
  };

  const runNoteCommand = (cmd) => {
    if (cmd.type === "addFolder") {
      addNoteFolder(cmd.name || t.notesNewFolder);
      setActiveTab?.("notes");
      return;
    }
    if (cmd.type === "addNote") {
      const id = crypto.randomUUID?.() ?? String(Date.now());
      addNote({ id, kind: "text", title: cmd.title || "" });
      setActiveTab?.("notes");
    }
  };

  const findBestTask = (query) => {
    if (!query) return null;
    const qTokens = query.toLowerCase().trim().split(/\s+/);
    const activeTasks = tasks.filter((t) => !t.done);

    const scored = activeTasks
      .map((t) => {
        const titleTokens = (t.title || "").toLowerCase().split(/\s+/);
        let matches = 0;
        for (const qt of qTokens) {
          if (titleTokens.includes(qt)) matches++;
        }
        return { task: t, score: matches };
      })
      .filter((s) => s.score > 0);

    if (scored.length === 0) return null;

    scored.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;

      const aTime = a.task.dueDate ? new Date(a.task.dueDate).getTime() : 0;
      const bTime = b.task.dueDate ? new Date(b.task.dueDate).getTime() : 0;

      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;

      const now = Date.now();
      const getCategory = (time) => {
        const daysDiff = (time - now) / (1000 * 60 * 60 * 24);
        if (daysDiff >= -1 && daysDiff <= 7) return 0;
        if (daysDiff > 7) return 1;
        return 2;
      };

      const aCat = getCategory(aTime);
      const bCat = getCategory(bTime);

      if (aCat !== bCat) return aCat - bCat;
      return aTime - bTime;
    });

    return scored[0].task;
  };

  const runParse = () => {
    if (!text.trim()) return;
    const items = parseQuickAction(text, {
      classes,
      now: new Date(),
      t,
      columns,
      teams,
      lang,
      apps,
      navbar,
    });

    for (const item of items) {
      if (item.kind === "navigation") {
        setActiveTab(item.target);
        continue;
      }

      if (item.kind === "focus") {
        runFocusCommand(item);
        continue;
      }

      if (item.kind === "gradeAction") {
        runGradeCommand(item);
        continue;
      }

      if (item.kind === "noteAction") {
        runNoteCommand(item);
        continue;
      }

      if (item.kind === "mutation") {
        const targetTask = findBestTask(item.query);
        if (!targetTask) continue;

        const remote = targetTask.sharedMeta?.remote ? targetTask.sharedMeta : null;

        if (item.action === "complete") {
          if (remote) {
            updateSharedCard({ teamId: remote.teamId, sharedCardId: remote.sharedCardId, patch: { done: true } });
          } else {
            updateTask(targetTask.id, { done: true });
          }
        } else if (item.action === "delete") {
          if (remote) {
            deleteSharedCard({ teamId: remote.teamId, sharedCardId: remote.sharedCardId });
          } else {
            deleteTask(targetTask.id);
          }
        } else if (item.action === "move" && item.columnId) {
          if (remote) {
            moveSharedCard({ teamId: remote.teamId, sharedCardId: remote.sharedCardId, targetColumnId: item.columnId });
          } else {
            updateTask(targetTask.id, {
              kanban: { ...targetTask.kanban, columnId: item.columnId },
            });
          }
        } else if (item.action === "share" && item.teamId) {
          if (!remote) updateTask(targetTask.id, { teamId: item.teamId });
        }
        continue;
      }

      if (item.kind === "event") {
        addEvent({
          title: item.title || t.newEvent,
          semesterId: semesterId ?? null,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          allDay: !item.startTime,
          teamId: item.teamId ?? null,
          recurrence: item.recurrence ?? null,
        });
      } else if (item.kind === "kanbanCard") {
        addTask({
          semesterId: semesterId ?? null,
          title: item.title || t.task,
          classId: item.classId,
          priority: item.priority ?? null,
          dueDate: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          weekStart: resolveWeek(item.date, item.week),
          weekEnd: resolveWeek(item.date, item.week),
          views: { list: false, kanban: true, calendar: false },
          kanban: { columnId: item.columnId, order: 0, checklist: [] },
          teamId: item.teamId ?? null,
          recurrence: item.recurrence ?? null,
          duration: item.duration ?? null,
        });
      } else {
        addTask({
          semesterId: semesterId ?? null,
          title: item.title || t.task,
          classId: item.classId,
          priority: item.priority ?? null,
          dueDate: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          weekStart: resolveWeek(item.date, item.week),
          weekEnd: resolveWeek(item.date, item.week),
          views: {
            list: true,
            kanban: false,
            calendar: Boolean(item.showOnCalendar),
          },
          teamId: item.teamId ?? null,
          recurrence: item.recurrence ?? null,
          duration: item.duration ?? null,
        });
      }
    }

    setText("");
    onDone?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AutoTextarea
          autoFocus
          placeholder={t.quickActionPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              runParse();
            }
          }}
        />
        {isSupported && (
          <Button
            type="button"
            variant="clear"
            size="icon"
            className="border-0"
            onClick={() => (isListening ? stop() : start())}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
