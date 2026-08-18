import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Trash2, User, Users, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useStrings } from "@/lib/strings";
import { KanbanBoard } from "./KanbanBoard";
import { KanbanBoardSkeleton } from "./KanbanBoardSkeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useMergedKanbanBoard } from "@/hooks/useMergedKanbanBoard";
import { getMemberList } from "@/lib/collab/teamColors";

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

  const allMembers = useMemo(() => {
    if (!collabEnabled) return [];
    const memberMap = new Map();
    if (userId) {
      memberMap.set(userId, { userId, alias: "", color: "#6366f1" });
    }
    for (const membership of memberships) {
      const team = runtimeTeams[membership.teamId];
      const list = getMemberList(team);
      for (const member of list) {
        memberMap.set(member.userId, member);
      }
    }
    return [...memberMap.values()];
  }, [collabEnabled, memberships, runtimeTeams, userId]);

  const [filterClass, setFilterClass] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");

  const hasActiveFilters =
    filterClass !== "all" || filterTeam !== "all" || filterAssignee !== "all";
  const resetFilters = () => {
    setFilterClass("all");
    setFilterTeam("all");
    setFilterAssignee("all");
  };

  const filteredBoard = useMemo(() => {
    const cards = (board?.cards ?? []).filter((card) => {
      if (filterClass !== "all") {
        if (filterClass === "__none__") {
          if (card.classId || card.className) return false;
        } else {
          if (card.classId !== filterClass && card.className !== filterClass)
            return false;
        }
      }

      if (filterTeam !== "all") {
        const teamId =
          card.sharedMeta?.teamId ?? card.sharedRef?.teamId ?? null;
        if (filterTeam === "__personal__") {
          if (teamId !== null) return false;
        } else {
          if (teamId !== filterTeam) return false;
        }
      }

      if (filterAssignee !== "all") {
        const isPersonal = !card.sharedMeta?.remote && !card.sharedRef?.teamId;
        if (filterAssignee === userId || filterAssignee === "__me__") {
          if (!isPersonal && card.assigneeUserId !== userId) return false;
        } else if (filterAssignee === "__unassigned__") {
          if (isPersonal || card.assigneeUserId) return false;
        } else {
          if (card.assigneeUserId !== filterAssignee) return false;
        }
      }

      return true;
    });

    return {
      columns: board?.columns ?? [],
      cards,
    };
  }, [board, filterClass, filterTeam, filterAssignee, userId]);

  useEffect(() => {
    if (hydrated && noneMode && !localBoard?.columns?.length)
      ensureBoard(FREE_BOARD_ID);
  }, [hydrated, noneMode, localBoard, ensureBoard]);

  return (
    <div className="flex flex-col h-tab-pane p-4 pt-4 gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {teams.length > 0 && (
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-0 max-w-[45vw] sm:max-w-none sm:min-w-[110px] bg-secondary/30 gap-1">
                <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {filterTeam === "all" && t.kanbanAllTeams}
                  {filterTeam === "__personal__" &&
                    (t.collabPersonal ?? "Personal")}
                  {filterTeam !== "all" &&
                    filterTeam !== "__personal__" &&
                    (teams.find((tm) => tm.teamId === filterTeam)?.name ??
                      t.kanbanFilterTeam)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.kanbanAllTeams}</SelectItem>
                <SelectItem value="__personal__">
                  {t.collabPersonal ?? "Personal"}
                </SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.teamId} value={team.teamId}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {allMembers.length > 0 && (
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-0 max-w-[45vw] sm:max-w-none sm:min-w-[120px] bg-secondary/30 gap-1">
                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {filterAssignee === "all" && t.kanbanAllAssignees}
                  {filterAssignee === "__unassigned__" &&
                    (t.collabUnassigned ?? "Unassigned")}
                  {filterAssignee !== "all" &&
                    filterAssignee !== "__unassigned__" && (
                      <span className="flex items-center gap-1.5">
                        {allMembers.find(
                          (m) => m.userId === filterAssignee,
                        ) && (
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: allMembers.find(
                                (m) => m.userId === filterAssignee,
                              )?.color,
                            }}
                          />
                        )}
                        {filterAssignee === userId
                          ? (t.collabYou ?? "You")
                          : allMembers.find((m) => m.userId === filterAssignee)
                              ?.alias ||
                            (t.collabRoleMember ?? "Member")}
                      </span>
                    )}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.kanbanAllAssignees}</SelectItem>
                <SelectItem value="__unassigned__">
                  {t.collabUnassigned ?? "Unassigned"}
                </SelectItem>
                {allMembers.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: member.color }}
                      />
                      {member.userId === userId
                        ? (t.collabYou ?? "You")
                        : member.alias || (t.collabRoleMember ?? "Member")}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {classes.length > 0 && (
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-0 max-w-[45vw] sm:max-w-none sm:min-w-[110px] bg-secondary/30 gap-1">
                <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {filterClass === "all" && t.kanbanAllClasses}
                  {filterClass === "__none__" &&
                    (t.kanbanNoClass ?? "No class")}
                  {filterClass !== "all" &&
                    filterClass !== "__none__" &&
                    (classes.find((c) => c.id === filterClass)?.name ??
                      t.kanbanFilterClass)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.kanbanAllClasses}</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
                <SelectItem value="__none__">
                  {t.kanbanNoClass ?? "No class"}
                </SelectItem>
              </SelectContent>
            </Select>
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

      <div className="flex-1 overflow-y-auto md:overflow-y-hidden md:overflow-x-auto flex has-[[data-kanban-banded]]:md:overflow-y-auto">
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
        onConfirm={() => clearDone(boardId)}
      />
      <ConfirmDialog
        open={confirm === "all"}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={t.wipeAllTitle}
        description={t.wipeAllDesc}
        onConfirm={() => wipeAll(boardId)}
      />
    </div>
  );
}
