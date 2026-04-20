import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskForm } from "./TaskForm";
import { useStore } from "@/store/useStore";
import { useStrings } from "@/lib/strings";

export function AddTaskButton({
  semesterId,
  classes,
  weekCount,
  currentWeek,
  startDate,
  className,
}) {
  const [open, setOpen] = useState(false);
  const lang = useStore((s) => s.lang ?? "en");
  const t = useStrings(lang);

  return (
    <>
      <Button size="icon" className={className} onClick={() => setOpen(true)}>
        <Plus className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.addTask}</DialogTitle>
          </DialogHeader>
          {open && (
            <TaskForm
              semesterId={semesterId}
              classes={classes}
              weekCount={weekCount}
              defaultWeek={currentWeek}
              startDate={startDate}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
