import { useEffect, useMemo, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Menu,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { CardDetailDialog } from "./CardDetailDialog";
import { cn } from "@/lib/utils";
import { fireConfetti } from "@/lib/confetti";
import { Checkbox } from "@/components/ui/checkbox";
import { useStrings } from "@/lib/strings";
import { useCollabActions } from "@/hooks/useCollabActions";
import { ShareToTeamDialog } from "@/components/collab/ShareToTeamDialog";
import { PRIORITY_COLORS as PRIORITY_DOT } from "@/lib/constants";
import { getMemberColor, getMemberList, getMemberDisplayName } from "@/lib/collab/teamColors";
import { useTeamUserId, entityTeamId } from "@/hooks/useTeamIdentity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export function KanbanCard({
  card,
  semId,
  prevColumnId = null,
  nextColumnId = null,
  doneColumnId = null,
  localBoard,
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTeamId, setShareTeamId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const deleteCard = useStore((s) => s.deleteKanbanCard);
  const moveCard = useStore((s) => s.moveKanbanCard);
  const updateCard = useStore((s) => s.updateKanbanCard);
  const checklistPreviewMode = useStore(
    (s) =>
      s.settings?.kanbanChecklistPreviewMode ??
      (s.settings?.kanbanShowChecklistInline ? "all" : "none"),
  );
  const classes = useStore((s) => s.classes ?? []);
  const lang = useStore((s) => s.lang ?? "en");
  const t = useStrings(lang);
  const teamUserId = useTeamUserId();
  const userId = teamUserId(entityTeamId(card));
  const {
    teams,
    getTeamName,
    shareKanbanCardToTeam,
    moveSharedCard,
    updateSharedCard,
    deleteSharedCard,
  } = useCollabActions();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const isSharedRemote = !!card?.sharedMeta?.remote;
  const sharedTeamId = card?.sharedMeta?.teamId;
  const sharedCardId = card?.sharedMeta?.sharedCardId;
  const isBackedBySharedTask = !isSharedRemote && !!card?.sharedRef?.teamId;
  const sharedBadgeText = useMemo(() => {
    const teamId = card?.sharedMeta?.teamId ?? card?.sharedRef?.teamId;
    if (!teamId) return null;
    return getTeamName(teamId) ?? "shared";
  }, [card?.sharedMeta?.teamId, card?.sharedRef?.teamId, getTeamName]);

  const runtimeTeams = useStore((s) => s.collabRuntime?.teams ?? {});
  const assigneeBadge = useMemo(() => {
    if (!card.assigneeUserId) return null;
    const teamId = card.sharedMeta?.teamId ?? card.sharedRef?.teamId;
    if (!teamId) return null;
    const team = runtimeTeams[teamId];
    const members = team?.members ?? {};
    const member = members[card.assigneeUserId];
    if (!member) return null;
    return {
      alias: getMemberDisplayName({ ...member, userId: card.assigneeUserId }, userId, t),
      color: getMemberColor(members, card.assigneeUserId),
    };
  }, [card.assigneeUserId, card.sharedMeta?.teamId, card.sharedRef?.teamId, runtimeTeams, userId, t]);

  const cardTeamId = card?.sharedMeta?.teamId ?? card?.sharedRef?.teamId ?? null;
  const assignableMembers = useMemo(() => {
    if (!cardTeamId) return [];
    return getMemberList(runtimeTeams[cardTeamId]);
  }, [cardTeamId, runtimeTeams]);
  const showUnassignedPill =
    !card.assigneeUserId && !!cardTeamId && assignableMembers.length > 0;

  const canShareCard =
    !isSharedRemote && !isBackedBySharedTask && teams.length > 0;

  const style = { transform: CSS.Transform.toString(transform), transition };
  const checklist = card.checklist ?? [];
  const donePct = checklist.length
    ? checklist.filter((i) => i.done).length / checklist.length
    : null;
  const showChecklistInline =
    card?.checklistPreview === true ||
    checklistPreviewMode === "all" ||
    (checklistPreviewMode === "card" && card?.checklistPreview === true);

  const classBadgeText = useMemo(() => {
    const fallback =
      typeof card?.className === "string" ? card.className.trim() : "";
    if (fallback) return fallback;
    if (!card?.classId) return null;
    const semClasses = classes.filter((cls) => cls?.semesterId === semId);
    return semClasses.find((cls) => cls.id === card.classId)?.name ?? null;
  }, [card, classes, semId]);

  const toggleChecklistItem = async (itemId, done) => {
    const patch = {
      checklist: checklist.map((item) =>
        item.id === itemId ? { ...item, done } : item,
      ),
    };
    if (isSharedRemote) {
      await updateSharedCard({ teamId: sharedTeamId, sharedCardId, patch });
      return;
    }
    updateCard(semId, card.id, patch);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleMoveLeft = async () => {
    if (!prevColumnId) return;
    if (isSharedRemote) {
      await moveSharedCard({
        teamId: sharedTeamId,
        sharedCardId,
        targetColumnId: prevColumnId,
      });
      return;
    }
    moveCard(semId, card.id, prevColumnId);
  };

  const handleMoveRight = async () => {
    if (!nextColumnId) return;
    if (nextColumnId === doneColumnId && card.columnId !== doneColumnId)
      fireConfetti();
    if (isSharedRemote) {
      await moveSharedCard({
        teamId: sharedTeamId,
        sharedCardId,
        targetColumnId: nextColumnId,
      });
      return;
    }
    moveCard(semId, card.id, nextColumnId);
  };

  const handleDelete = async () => {
    if (isSharedRemote) {
      await deleteSharedCard({ teamId: sharedTeamId, sharedCardId });
      return;
    }
    deleteCard(semId, card.id);
  };

  const handleSave = async (patch) => {
    if (isSharedRemote) {
      await updateSharedCard({ teamId: sharedTeamId, sharedCardId, patch });
      return;
    }
    updateCard(semId, card.id, patch);
  };

  const handleShare = async () => {
    if (!shareTeamId) return;
    await shareKanbanCardToTeam({
      card,
      teamId: shareTeamId,
      semId,
      localBoard,
    });
    setShareOpen(false);
    setShareTeamId("");
  };

  const openShare = async () => {
    if (!canShareCard) return;
    if (teams.length === 1) {
      await shareKanbanCardToTeam({
        card,
        teamId: teams[0].teamId,
        semId,
        localBoard,
      });
      return;
    }
    setShareOpen(true);
  };

  const lastTapRef = useRef(0);
  const handleCardClick = (e) => {
    if (e.target.closest?.("button, input, textarea, a, select, [role='button'], [role='checkbox'], [contenteditable]")) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      lastTapRef.current = 0;
      setDetailOpen(true);
      return;
    }
    lastTapRef.current = now;
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={handleCardClick}
        onDoubleClick={() => setDetailOpen(true)}
        className={cn(
          "relative rounded-lg border border-border bg-card p-3 space-y-2 select-none",
          "transition-shadow hover:shadow-md",
          isDragging && "opacity-40",
        )}
      >
        <div
          {...attributes}
          {...listeners}
          aria-hidden="true"
          className="absolute left-1/4 top-0 z-0 h-full w-1/2 cursor-grab touch-none active:cursor-grabbing"
        />
        <div className="flex items-start gap-2">
          {card.priority && (
            <span
              className={cn(
                "mt-1.5 h-2 w-2 rounded-full shrink-0",
                PRIORITY_DOT[card.priority],
              )}
            />
          )}
          <p
            className={cn(
              "flex-1 text-sm font-medium leading-snug",
              (card.done || (doneColumnId && card.columnId === doneColumnId)) && "line-through text-muted-foreground",
            )}
          >
            {card.title || "Untitled"}
          </p>
          <div ref={menuRef} className="relative z-10 flex gap-1 shrink-0">
            {menuOpen ? (
              <>
                {prevColumnId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title={t.moveLeft}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      handleMoveLeft();
                      setMenuOpen(false);
                    }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                )}
                {nextColumnId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title={t.moveRight}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      handleMoveRight();
                      setMenuOpen(false);
                    }}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canShareCard && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      openShare();
                      setMenuOpen(false);
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!isSharedRemote && card.views?.list !== true && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    title={t.addToTasks}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      updateCard(semId, card.id, {
                        views: { ...card.views, list: true },
                      });
                      setMenuOpen(false);
                    }}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setDetailOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    handleDelete();
                    setMenuOpen(false);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        {(card.dueDate || classBadgeText || sharedBadgeText || assigneeBadge || showUnassignedPill) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {card.dueDate && (
              <Badge variant="secondary" className="text-xs h-5">
                {card.dueDate}
              </Badge>
            )}
            {classBadgeText && (
              <Badge variant="secondary" className="text-xs h-5">
                {classBadgeText}
              </Badge>
            )}
            {sharedBadgeText && (
              <Badge variant="outline" className="text-xs h-5">
                {sharedBadgeText}
              </Badge>
            )}
            {assigneeBadge && (
              <Badge variant="secondary" className="text-xs h-5 gap-1">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: assigneeBadge.color }}
                />
                {assigneeBadge.alias}
              </Badge>
            )}
            {showUnassignedPill && (
              <Select
                value="__none__"
                onValueChange={(value) => {
                  if (value === "__none__") return;
                  handleSave({ assigneeUserId: value });
                }}
              >
                <SelectTrigger
                  className="relative z-10 !h-5 rounded-full border border-dashed border-foreground/40 !bg-transparent px-2 py-0 text-xs font-medium text-foreground/70 gap-1 hover:text-foreground hover:border-foreground/60"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="h-2 w-2 rounded-full border border-dashed border-current shrink-0" />
                  <span className="truncate">
                    {t.collabUnassigned ?? "Unassigned"}
                  </span>
                </SelectTrigger>
                <SelectContent onPointerDown={(e) => e.stopPropagation()}>
                  {assignableMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: member.color }}
                        />
                        {getMemberDisplayName(member, userId, t)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        {checklist.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${donePct * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {checklist.filter((i) => i.done).length}/{checklist.length}
            </span>
          </div>
        )}
        {showChecklistInline && checklist.length > 0 && (
          <div
            className="space-y-1.5 pt-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox
                  checked={item.done}
                  onCheckedChange={(done) =>
                    toggleChecklistItem(item.id, done === true)
                  }
                />
                <span
                  className={cn(
                    "text-xs leading-snug",
                    item.done && "line-through text-muted-foreground",
                  )}
                >
                  {item.text || "-"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <CardDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        card={card}
        semId={semId}
        onSave={handleSave}
      />
      <ShareToTeamDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={t.collabShareCard}
        teams={teams}
        value={shareTeamId}
        onValueChange={setShareTeamId}
        onConfirm={handleShare}
      />
    </>
  );
}
