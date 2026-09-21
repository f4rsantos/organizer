import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useCollabActions } from '@/hooks/useCollabActions'
import { nextAliasPromptTeamId } from '@/lib/collab/aliasPrompt'

export function CollabAliasPromptModal() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const memberships = useStore(s => s.collab?.memberships ?? [])
  const promptedTeamIds = useStore(s => s.collab?.aliasPromptedTeamIds ?? [])
  const markCollabAliasPrompted = useStore(s => s.markCollabAliasPrompted)
  const { teams, updateAlias } = useCollabActions()
  const [alias, setAlias] = useState('')

  const teamId = useMemo(
    () => nextAliasPromptTeamId(memberships, promptedTeamIds),
    [memberships, promptedTeamIds],
  )
  const teamName = teams.find(team => team.teamId === teamId)?.name ?? t.collabDefaultTeamName

  if (!teamId) return null

  const handleSkip = () => markCollabAliasPrompted(teamId)

  const handleSave = () => {
    const trimmed = alias.trim()
    if (trimmed) updateAlias(teamId, trimmed)
    markCollabAliasPrompted(teamId)
  }

  return (
    <Dialog key={teamId} open onOpenChange={open => !open && handleSkip()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {t.collabAliasPromptTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t.collabAliasPromptDesc(teamName)}</p>
          <Input
            autoFocus
            value={alias}
            placeholder={t.collabAlias}
            onChange={e => setAlias(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave()
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleSkip}>{t.skip}</Button>
          <Button onClick={handleSave}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
