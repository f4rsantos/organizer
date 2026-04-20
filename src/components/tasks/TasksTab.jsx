import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { useStore } from "@/store/useStore";
import { useStrings } from "@/lib/strings";
import { useCurrentSemester } from "@/hooks/useCurrentSemester";
import { useTaskProgress } from "@/hooks/useTaskProgress";
import { useMergedTasks } from '@/hooks/useMergedTasks'
import { SvgProgressWheel } from "@/components/common/SvgProgressWheel";
import { WeekSelector } from "./WeekSelector";
import { ClassSection } from "./ClassSection";
import { AddTaskButton } from "./AddTaskButton";
import { TaskAlertsPanel } from './TaskAlertsPanel'

function fireConfetti() {
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.4 },
    colors: ["#6366f1", "#22c55e", "#f97316", "#ec4899"],
  });
}

function ClassRing({ groups, byClass }) {
  const withTasks = groups.filter((g) => g.tasks.length > 0);
  if (withTasks.length === 0) return null;

  return (
    <div className="flex gap-3 justify-center flex-wrap md:hidden">
      {withTasks.map(({ cls }) => (
        <div key={cls.id} className="flex flex-col items-center gap-1">
          <SvgProgressWheel
            pct={byClass[cls.id] ?? 0}
            size={56}
            strokeWidth={5}
          />
          <span
            className="text-xs text-muted-foreground max-w-[60px] truncate text-center"
            style={{ color: cls.color }}
          >
            {cls.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function DesktopLayout({ overall, allDone, groups, byClass, t, children }) {
  const visibleGroups = groups.filter(
    (g) => g.tasks.length > 0 || g.cls.id !== "other",
  );
  const half = Math.ceil(visibleGroups.length / 2);
  const left = visibleGroups.slice(0, half);
  const right = visibleGroups.slice(half);

  return (
    <div className="hidden md:flex flex-1 overflow-hidden items-center gap-6 px-6 py-6">
      <div className="flex-1 overflow-y-auto space-y-3 max-h-full">
        {left.map(({ cls, tasks }) => (
          <ClassSection
            key={cls.id}
            cls={cls}
            tasks={tasks}
            ratio={byClass[cls.id] ?? 0}
          />
        ))}
      </div>

      <div className="flex flex-col items-center justify-center shrink-0">
        <SvgProgressWheel
          pct={overall}
          size={220}
          strokeWidth={18}
          celebrate
          label={
            allDone ? t.timeToRelax : `${Math.round(overall * 100)}% ${t.done}`
          }
          sublabel={children}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 max-h-full">
        {right.map(({ cls, tasks }) => (
          <ClassSection
            key={cls.id}
            cls={cls}
            tasks={tasks}
            ratio={byClass[cls.id] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

export function TasksTab() {
  const { semester, currentWeek, weekCount } = useCurrentSemester();
  const activeSemesterId = useStore((s) => s.activeSemesterId);
  const allClasses = useStore((s) => s.classes);
  const classes = allClasses.filter((c) => c.semesterId === activeSemesterId);
  const semesterTasks = useMergedTasks(activeSemesterId)
  const classNameById = classes.reduce((acc, cls) => {
    acc[cls.id] = cls.name
    return acc
  }, {})
  const allHolidays = useStore((s) => s.holidays);
  const semesterHolidays = (allHolidays ?? []).filter(
    (h) => h.semesterId === activeSemesterId,
  );
  const lang = useStore((s) => s.lang ?? "en");
  const t = useStrings(lang);
  const [displayWeek, setDisplayWeek] = useState(null);
  const week = displayWeek ?? currentWeek ?? 1;
  const { overall, byClass, groups } = useTaskProgress(
    activeSemesterId,
    classes,
    week,
    semesterTasks,
  );

  const prevOverall = useRef(overall);
  const allDone = overall >= 1 && groups.some((g) => g.tasks.length > 0);

  useEffect(() => {
    if (
      overall >= 1 &&
      prevOverall.current < 1 &&
      groups.some((g) => g.tasks.length > 0)
    ) {
      fireConfetti();
    }
    prevOverall.current = overall;
  }, [overall, groups]);

  if (!semester) {
    const otherGroup = groups.find(g => g.cls.id === 'other')
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen p-4 pt-8 gap-4">
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold">{t.tasks}</h1>
          <AddTaskButton semesterId={activeSemesterId} classes={[]} weekCount={1} currentWeek={1} startDate={null} className="h-9 w-9 rounded-full" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3">
          {otherGroup && otherGroup.tasks.length > 0
            ? <ClassSection cls={otherGroup.cls} tasks={otherGroup.tasks} ratio={byClass[otherGroup.cls.id] ?? 0} />
            : <p className="text-sm text-muted-foreground text-center pt-8">{t.noTasks}</p>
          }
        </div>
      </div>
    )
  }

  const weekSelector = (
    <WeekSelector
      week={week}
      weekCount={weekCount}
      startDate={semester.startDate}
      semesterHolidays={semesterHolidays}
      onChange={(fn) => setDisplayWeek((w) => fn(w ?? week))}
    />
  );

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen select-none">
      <div className="shrink-0 px-4 md:px-6 pt-8 md:pt-12 md:pb-3">
        <TaskAlertsPanel tasks={semesterTasks} classNameById={classNameById} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-5 md:hidden">
        <div className="flex items-center gap-4">
          <div className="flex-1" />
          <SvgProgressWheel
            pct={overall}
            size={160}
            strokeWidth={14}
            celebrate
            label={
              allDone
                ? t.timeToRelax
                : `${Math.round(overall * 100)}% ${t.done}`
            }
            sublabel={t.weekLabel(week)}
          />
          <div className="flex-1 flex justify-end">
            <AddTaskButton
              semesterId={activeSemesterId}
              classes={classes}
              weekCount={weekCount}
              currentWeek={week}
              startDate={semester.startDate}
              className="h-12 w-12 rounded-full shadow-md"
            />
          </div>
        </div>
        <ClassRing groups={groups} byClass={byClass} />
        <div className="space-y-3">
          {groups
            .filter((g) => g.tasks.length > 0 || g.cls.id !== "other")
            .map(({ cls, tasks }) => (
              <ClassSection
                key={cls.id}
                cls={cls}
                tasks={tasks}
                ratio={byClass[cls.id] ?? 0}
              />
            ))}
        </div>
      </div>

      <DesktopLayout
        overall={overall}
        allDone={allDone}
        groups={groups}
        byClass={byClass}
        t={t}
      >
        {t.weekLabel(week)}
      </DesktopLayout>

      <div className="hidden md:flex justify-end px-4 pb-2 pt-2 shrink-0">
        <AddTaskButton
          semesterId={activeSemesterId}
          classes={classes}
          weekCount={weekCount}
          currentWeek={week}
          startDate={semester.startDate}
          className="h-12 w-12 rounded-full"
        />
      </div>
      <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3">
        {weekSelector}
      </div>
    </div>
  );
}