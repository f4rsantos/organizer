import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Trash2, User, Users, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useStrings } from "@/lib/strings";
import { KanbanBoard } from "./KanbanBoard";
import { KanbanBoardSkeleton } from "./KanbanBoardSkeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { MultiSelectFilter, MultiSelectItem } from "./MultiSelectFilter";
import { ALL_VALUE } from "@/lib/multiSelectFilter";
import { useMergedKanbanBoard } from "@/hooks/useMergedKanbanBoard";
import { useCollabActions } from "@/hooks/useCollabActions";
import { getMemberList } from "@/lib/collab/teamColors";
import { sortByOrder } from "@/lib/utils";

const FREE_BOARD_ID = "__free__";

export function KanbanTab() {
  const noneMode = useStore((s) => s.settings?.semesterMode === "none");
  const storeActiveSemesterId = useStore((s) => s.activeSemesterId);
  const activeSemesterId = noneMode ? null : storeActiveSemesterId;
  const boardId = activeSemesterId ?? FREE_BOARD_ID;
  const localBoard = useStore((s) => s.kanban?.[boardId]);
  const board = useMergedKanbanBoard(activeSemesterId);
  const clearDone = useStore((s) => s.clearKanbanDone);
  const wipeAll = useStore((s) => s.wipeKanban);
  const { deleteSharedCard } = useCollabActions();
  const ensureBoard = useStore((s) => s.ensureKanbanBoard);
  const lang = useStore((s) => s.lang ?? "en");
  const t = useStrings(lang);
  const [confirm, setConfirm] = useState(null);

  const allClasses = useStore((s) => s.classes ?? []);
  const classes = useMemo(() => {
    return allClasses.filter((c) => c.semesterId === activeSemesterId);
  }, [allClasses, activeSemesterId]);

  const collabEnabled = useStore((s) => s.settings?.collabEnabled === true);
  const memberships = useStore((s) => s.collab?.memberships ?? []);
  const runtimeTeams = useStore((s) => s.collabRuntime?.teams ?? {});
  const userId = useStore((s) => s.collab?.userId);
  const hydrated = useStore((s) => s.hydrated === true);

  const teamsSyncing =
    collabEnabled &&
    memberships.some((m) => !runtimeTeams[m.teamId]?.syncStatus);

  const [syncTimedOut, setSyncTimedOut] = useState(false);
  useEffect(() => {
    if (!teamsSyncing) return;
    const timer = setTimeout(() => setSyncTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, [teamsSyncing]);

  const boardReady = hydrated && (!teamsSyncing || syncTimedOut);

  const teams = useMemo(() => {
    return (collabEnabled ? memberships : []).map((m) => {
      const runtime = runtimeTeams[m.teamId];
      return {
        teamId: m.teamId,
        name: runtime?.name ?? m.teamName ?? "Team",
      };
    });
  }, [collabEnabled, memberships, runtimeTeams]);

  const selfUserIds = useMemo(() => {
    const ids = new Set();
    if (userId) ids.add(userId);
    return ids;
  }, [userId]);

  const allMembers = useMemo(() => {
    if (!collabEnabled) return [];
    const memberMap = new Map();
    for (const membership of memberships) {
      const team = runtimeTeams[membership.teamId];
      const list = getMemberList(team);
      for (const member of list) {
        if (selfUserIds.has(member.userId)) continue;
        memberMap.set(member.userId, member);
      }
    }
    return [...memberMap.values()];
  }, [collabEnabled, memberships, runtimeTeams, selfUserIds]);

  const [filterClass, setFilterClass] = useState([ALL_VALUE]);
  const [filterTeam, setFilterTeam] = useState([ALL_VALUE]);
  const [filterAssignee, setFilterAssignee] = useState([ALL_VALUE]);

  const classAll = filterClass.includes(ALL_VALUE);
  const teamAll = filterTeam.includes(ALL_VALUE);
  const assigneeAll = filterAssignee.includes(ALL_VALUE);

  const buildLabel = (values, allLabel, resolve) => {
    if (!values.length) return allLabel;
    if (values.length === 1) return resolve(values[0]);
    const template = t.kanbanFilterCount ?? "{n} selected";
    return template.replace("{n}", String(values.length));
  };

  const teamLabel = teamAll
    ? t.kanbanAllTeams
    : buildLabel(filterTeam, t.kanbanAllTeams, (value) =>
        value === "__personal__"
          ? (t.collabPersonal ?? "Personal")
          : (teams.find((tm) => tm.teamId === value)?.name ??
            t.kanbanFilterTeam),
      );

  const assigneeLabel = assigneeAll
    ? t.kanbanAllAssignees
    : buildLabel(filterAssignee, t.kanbanAllAssignees, (value) => {
        if (value === "__me__") return t.collabMe ?? "Me";
        if (value === "__unassigned__") return t.collabUnassigned ?? "Unassigned";
        return (
          allMembers.find((m) => m.userId === value)?.alias ??
          (t.collabRoleMember ?? "Member")
        );
      });

  const classLabel = classAll
    ? t.kanbanAllClasses
    : buildLabel(filterClass, t.kanbanAllClasses, (value) =>
        value === "__none__"
          ? (t.kanbanNoClass ?? "No class")
          : (classes.find((c) => c.id === value)?.name ?? t.kanbanFilterClass),
      );

  const hasActiveFilters = !classAll || !teamAll || !assigneeAll;
  const resetFilters = () => {
    setFilterClass([ALL_VALUE]);
    setFilterTeam([ALL_VALUE]);
    setFilterAssignee([ALL_VALUE]);
  };

  const filteredBoard = useMemo(() => {
    const cards = (board?.cards ?? []).filter((card) => {
      if (!classAll) {
        const matches = filterClass.some((value) =>
          value === "__none__"
            ? !card.classId && !card.className
            : card.classId === value || card.className === value,
        );
        if (!matches) return false;
      }

      if (!teamAll) {
        const teamId =
          card.sharedMeta?.teamId ?? card.sharedRef?.teamId ?? null;
        const matches = filterTeam.some((value) =>
          value === "__personal__" ? teamId === null : teamId === value,
        );
        if (!matches) return false;
      }

      if (!assigneeAll) {
        const isPersonal = !card.sharedMeta?.remote && !card.sharedRef?.teamId;
        const matches = filterAssignee.some((value) => {
          if (value === "__me__")
            return isPersonal || selfUserIds.has(card.assigneeUserId);
          if (value === "__unassigned__")
            return !isPersonal && !card.assigneeUserId;
          return card.assigneeUserId === value;
        });
        if (!matches) return false;
      }

      return true;
    });

    return {
      columns: board?.columns ?? [],
      cards,
    };
  }, [
    board,
    filterClass,
    filterTeam,
    filterAssignee,
    classAll,
    teamAll,
    assigneeAll,
    selfUserIds,
  ]);

  useEffect(() => {
    if (hydrated && noneMode && !localBoard?.columns?.length)
      ensureBoard(FREE_BOARD_ID);
  }, [hydrated, noneMode, localBoard, ensureBoard]);

  const removeRemoteCards = async (onlyDone) => {
    const columns = sortByOrder(localBoard?.columns ?? []);
    const doneColumnId = columns[columns.length - 1]?.id;
    const targets = (board?.cards ?? []).filter(
      (card) =>
        card.sharedMeta?.remote &&
        (!onlyDone || card.columnId === doneColumnId),
    );
    for (const card of targets) {
      await deleteSharedCard({
        teamId: card.sharedMeta.teamId,
        sharedCardId: card.sharedMeta.sharedCardId,
      });
    }
  };

  const handleClearDone = async () => {
    clearDone(boardId);
    await removeRemoteCards(true);
  };

  const handleWipeAll = async () => {
    wipeAll(boardId);
    await removeRemoteCards(false);
  };

  return (
    <div className="flex flex-col h-tab-pane py-4 gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0 px-4">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {teams.length > 0 && (
            <MultiSelectFilter
              value={filterTeam}
              onValueChange={setFilterTeam}
              icon={Users}
              label={teamLabel}
              className="sm:min-w-[110px]"
            >
              <MultiSelectItem value={ALL_VALUE}>
                {t.kanbanAllTeams}
              </MultiSelectItem>
              <MultiSelectItem value="__personal__">
                {t.collabPersonal ?? "Personal"}
              </MultiSelectItem>
              {teams.map((team) => (
                <MultiSelectItem key={team.teamId} value={team.teamId}>
                  {team.name}
                </MultiSelectItem>
              ))}
            </MultiSelectFilter>
          )}

          {collabEnabled && memberships.length > 0 && (
            <MultiSelectFilter
              value={filterAssignee}
              onValueChange={setFilterAssignee}
              icon={User}
              label={assigneeLabel}
              className="sm:min-w-[120px]"
            >
              <MultiSelectItem value={ALL_VALUE}>
                {t.kanbanAllAssignees}
              </MultiSelectItem>
              <MultiSelectItem value="__me__">
                {t.collabMe ?? "Me"}
              </MultiSelectItem>
              <MultiSelectItem value="__unassigned__">
                {t.collabUnassigned ?? "Unassigned"}
              </MultiSelectItem>
              {allMembers.map((member) => (
                <MultiSelectItem key={member.userId} value={member.userId}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: member.color }}
                    />
                    {member.alias || (t.collabRoleMember ?? "Member")}
                  </span>
                </MultiSelectItem>
              ))}
            </MultiSelectFilter>
          )}

          {classes.length > 0 && (
            <MultiSelectFilter
              value={filterClass}
              onValueChange={setFilterClass}
              icon={BookOpen}
              label={classLabel}
              className="sm:min-w-[110px]"
            >
              <MultiSelectItem value={ALL_VALUE}>
                {t.kanbanAllClasses}
              </MultiSelectItem>
              {classes.map((cls) => (
                <MultiSelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </MultiSelectItem>
              ))}
              <MultiSelectItem value="__none__">
                {t.kanbanNoClass ?? "No class"}
              </MultiSelectItem>
            </MultiSelectFilter>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={resetFilters}
            >
              <X className="h-3 w-3" />
              {t.kanbanResetFilters}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setConfirm("done")}
            title={t.clearDoneTitle}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="capitalize">{t.done}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setConfirm("all")}
            title={t.wipeAllTitle}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="capitalize">{t.all ?? "All"}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-y-hidden md:overflow-x-auto flex px-4 has-[[data-kanban-banded]]:md:overflow-y-auto">
        {boardReady
          ? (
            <KanbanBoard
              semId={boardId}
              board={filteredBoard}
              localBoard={localBoard}
            />
          )
          : <KanbanBoardSkeleton />}
      </div>

      <ConfirmDialog
        open={confirm === "done"}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={t.clearDoneTitle}
        description={t.clearDoneDesc}
        onConfirm={handleClearDone}
      />
      <ConfirmDialog
        open={confirm === "all"}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={t.wipeAllTitle}
        description={t.wipeAllDesc}
        onConfirm={handleWipeAll}
      />
    </div>
  );
}
