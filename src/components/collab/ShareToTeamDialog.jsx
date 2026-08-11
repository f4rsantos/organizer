import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStrings } from '@/lib/strings'

export function ShareToTeamDialog({ open, onOpenChange, title, teams, value, onValueChange, onConfirm }) {
  const t = useStrings()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t.collabSelectTeam} />
            </SelectTrigger>
            <SelectContent>
              {teams.map(team => (
                <SelectItem key={team.teamId} value={team.teamId}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button disabled={!value} onClick={onConfirm}>{t.collabShare}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
