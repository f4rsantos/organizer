import { useMemo, useState } from 'react'
import { Check, Copy, Crown, Link2, Pencil, Plus, Trash2, UserMinus, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { loadFirebaseConfig } from '@/lib/firebase'
import { buildInviteLink, parseInviteLink } from '@/lib/collab/link'
import {
  createTeam,
  deleteTeam,
  generateInvite,
  joinWithInvite,
  leaveTeam,
  updateTeamMeta,
} from '@/lib/collab/firebase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const DAY_MS = 24 * 60 * 60 * 1000

function daysLeft(expiresAt) {
  return Math.max(0, Math.ceil(((expiresAt ?? Date.now()) - Date.now()) / DAY_MS))
}

function parseDays(raw, fallback = 1) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.round(n))
}

function PanelCard({ icon, title, subtitle, children }) {
  const Icon = icon
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{title}</p>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function TeamRow({ team, t, isHost, onGenerateInvite, onDelete, onLeave, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name ?? '')
  const [daysInput, setDaysInput] = useState(String(Math.max(1, daysLeft(team.expiresAt))))
  const [completionMode, setCompletionMode] = useState(team.sharedTaskCompletionMode === 'personal' ? 'personal' : 'for-all')
  const [membersCanEditShared, setMembersCanEditShared] = useState(team.membersCanEditShared !== false)
  const [inviteDaysInput, setInviteDaysInput] = useState('1')
  const [copiedInvite, setCopiedInvite] = useState(false)

  const save = async () => {
    await onUpdate({
      name: name.trim() || team.name,
      expiresAt: Date.now() + parseDays(daysInput, 365) * DAY_MS,
      sharedTaskCompletionMode: completionMode,
      membersCanEditShared,
    })
    setEditing(false)
  }

  const handleInvite = async () => {
    await onGenerateInvite(parseDays(inviteDaysInput, 1))
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 1600)
  }

  const roleLabel = isHost ? t.collabRoleHost : t.collabRoleMember

  return (
    <div className="rounded-lg border border-border p-3">
      {editing
        ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t.collabTeamName}</p>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.collabTeamName} />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t.collabTeamDuration}</p>
              <Input
                type="number"
                min={1}
                className="w-32"
                value={daysInput}
                onChange={e => setDaysInput(e.target.value)}
                onBlur={() => { if (daysInput === '') setDaysInput('365') }}
              />
            </div>

            <div className="space-y-1 pt-1">
              <p className="text-xs text-muted-foreground">{t.collabTaskCompletionMode}</p>
              <Select value={completionMode} onValueChange={setCompletionMode}>
                <SelectTrigger className="h-8 w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">{t.collabTaskCompletionPersonal}</SelectItem>
                  <SelectItem value="for-all">{t.collabTaskCompletionForAll}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t.collabTaskPermissions}</p>
              <Select value={membersCanEditShared ? 'everyone' : 'host-only'} onValueChange={v => setMembersCanEditShared(v === 'everyone')}>
                <SelectTrigger className="h-8 w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">{t.collabTaskPermissionsEveryone}</SelectItem>
                  <SelectItem value="host-only">{t.collabTaskPermissionsHostOnly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={save} title={t.save}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)} title={t.cancel}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )
        : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{team.name ?? t.collabDefaultTeamName}</p>
                <p className="text-xs text-muted-foreground truncate">{t.collabEndsAt} {new Date(team.expiresAt).toLocaleString()}</p>
                {isHost && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {team.sharedTaskCompletionMode === 'for-all' ? t.collabTaskCompletionForAll : t.collabTaskCompletionPersonal}
                    {' · '}
                    {team.membersCanEditShared !== false ? t.collabTaskPermissionsEveryone : t.collabTaskPermissionsHostOnly}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="h-5 text-[11px]">
                {isHost ? <Crown className="h-3 w-3 mr-1" /> : null}
                {roleLabel}
              </Badge>
            </div>

            <div className="flex items-center justify-end gap-1 pt-1">
                {isHost && (
                  <span className="text-[11px] text-muted-foreground mr-1">{t.collabInviteTtl}</span>
                )}
                {isHost && (
                  <Input
                    type="number"
                    min={1}
                    className="h-7 w-16 text-xs"
                    value={inviteDaysInput}
                    onChange={e => setInviteDaysInput(e.target.value)}
                    onBlur={() => { if (inviteDaysInput === '') setInviteDaysInput('1') }}
                    title={t.collabInviteTtl}
                  />
                )}
                {isHost && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title={t.collabInvite}
                    onClick={handleInvite}
                  >
                    {copiedInvite ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                )}
                {isHost && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditing(true)}
                    title={t.collabEditTeam}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              {isHost
                ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title={t.collabDeleteTeam}
                      onClick={onDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )
                : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title={t.collabLeave}
                      onClick={onLeave}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  )
              }
            </div>
            {copiedInvite && <p className="text-[11px] text-muted-foreground">{t.linkCopied}</p>}
          </>
        )
      }
    </div>
  )
}

export function CollabPanel() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const collab = useStore(s => s.collab ?? { userId: null, memberships: [] })
  const runtimeTeams = useStore(s => s.collabRuntime?.teams ?? {})
  const addMembership = useStore(s => s.addCollabMembership)
  const removeMembership = useStore(s => s.removeCollabMembership)
  const clearTaskSharedRefByTeam = useStore(s => s.clearTaskSharedRefByTeam)
  const deleteLocalSharedTasksByTeam = useStore(s => s.deleteLocalSharedTasksByTeam)
  const localTasks = useStore(s => s.tasks ?? [])

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [durationInput, setDurationInput] = useState('365')
  const [joinLink, setJoinLink] = useState('')
  const [error, setError] = useState(null)
  const [leaveTeamId, setLeaveTeamId] = useState(null)
  const [deleteTeamId, setDeleteTeamId] = useState(null)

  const firebaseConfig = loadFirebaseConfig()
  const disabled = !firebaseConfig

  const teams = useMemo(() => {
    return (collab.memberships ?? []).map(m => {
      const runtime = runtimeTeams[m.teamId]
      return {
        ...m,
        name: runtime?.name ?? m.teamName ?? 'Team',
        hostUserId: runtime?.hostUserId ?? m.hostUserId,
        expiresAt: runtime?.expiresAt ?? m.expiresAt,
        sharedTaskCompletionMode: runtime?.sharedTaskCompletionMode ?? 'for-all',
        membersCanEditShared: runtime?.membersCanEditShared ?? true,
      }
    })
  }, [collab.memberships, runtimeTeams])

  const leavingSharedTasks = useMemo(() => {
    if (!leaveTeamId) return []
    return localTasks.filter(task => task?.sharedRef?.teamId === leaveTeamId)
  }, [localTasks, leaveTeamId])

  const deletingSharedTasks = useMemo(() => {
    if (!deleteTeamId) return []
    return localTasks.filter(task => task?.sharedRef?.teamId === deleteTeamId)
  }, [localTasks, deleteTeamId])

  const handleCreateTeam = async () => {
    if (disabled || !collab.userId || !name.trim()) return
    setError(null)
    try {
      const expiresAt = Date.now() + parseDays(durationInput, 365) * DAY_MS
      const teamId = await createTeam({
        config: firebaseConfig,
        hostUserId: collab.userId,
        name: name.trim(),
        expiresAt,
      })
      addMembership({
        teamId,
        apiKey: firebaseConfig.apiKey,
        projectId: firebaseConfig.projectId,
        hostUserId: collab.userId,
        teamName: name.trim(),
        expiresAt,
      })
      setName('')
      setDurationInput('365')
      setCreating(false)
    } catch {
      setError(t.collabErrorCreate)
    }
  }

  const handleGenerateInvite = async (team, ttlDays = 1) => {
    setError(null)
    try {
      const ttlMs = Math.max(1, ttlDays) * DAY_MS
      const { token } = await generateInvite({
        config: { apiKey: team.apiKey, projectId: team.projectId },
        teamId: team.teamId,
        ttlMs,
      })
      const link = buildInviteLink({
        projectId: team.projectId,
        apiKey: team.apiKey,
        teamId: team.teamId,
        token,
      })
      await navigator.clipboard.writeText(link)
    } catch {
      setError(t.collabErrorInvite)
    }
  }

  const handleJoin = async () => {
    if (!collab.userId) return
    const parsed = parseInviteLink(joinLink.trim())
    if (!parsed) {
      setError(t.collabErrorInvalidLink)
      return
    }

    setError(null)
    try {
      await joinWithInvite({
        config: { apiKey: parsed.apiKey, projectId: parsed.projectId },
        teamId: parsed.teamId,
        token: parsed.token,
        userId: collab.userId,
      })

      addMembership({
        teamId: parsed.teamId,
        apiKey: parsed.apiKey,
        projectId: parsed.projectId,
      })
      setJoinLink('')
    } catch {
      setError(t.collabErrorJoin)
    }
  }

  const handleLeaveConfirmed = async deleteLocalToo => {
    const membership = teams.find(team => team.teamId === leaveTeamId)
    if (!membership || !collab.userId) {
      setLeaveTeamId(null)
      return
    }

    try {
      await leaveTeam({
        config: { apiKey: membership.apiKey, projectId: membership.projectId },
        teamId: membership.teamId,
        userId: collab.userId,
      })
    } catch {
    }

    removeMembership(membership.teamId)
    if (deleteLocalToo) deleteLocalSharedTasksByTeam(membership.teamId)
    else clearTaskSharedRefByTeam(membership.teamId)
    setLeaveTeamId(null)
  }

  const handleDeleteTeamConfirmed = async deleteLocalToo => {
    const membership = teams.find(team => team.teamId === deleteTeamId)
    if (!membership) {
      setDeleteTeamId(null)
      return
    }

    try {
      await deleteTeam({
        config: { apiKey: membership.apiKey, projectId: membership.projectId },
        teamId: membership.teamId,
      })
    } catch {
      setError(t.collabErrorDeleteTeam)
      return
    }

    removeMembership(membership.teamId)
    if (deleteLocalToo) deleteLocalSharedTasksByTeam(membership.teamId)
    else clearTaskSharedRefByTeam(membership.teamId)
    setDeleteTeamId(null)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <PanelCard icon={Users} title={t.collabCreateTeam} subtitle={t.collabPanelSubtitle}>
          {disabled && <p className="text-xs text-muted-foreground">{t.collabRequiresFirebase}</p>}

          {!creating
            ? <Button size="sm" variant="outline" disabled={disabled} className="gap-1.5" onClick={() => setCreating(true)}>
                <Plus className="h-3.5 w-3.5" /> {t.collabCreateTeam}
              </Button>
            : (
              <div className="space-y-2">
                <Input placeholder={t.collabTeamName} value={name} onChange={e => setName(e.target.value)} />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="w-28"
                    value={durationInput}
                    onChange={e => setDurationInput(e.target.value)}
                    onBlur={() => { if (durationInput === '') setDurationInput('365') }}
                  />
                  <span className="text-xs text-muted-foreground">{t.collabTeamDuration}</span>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" disabled={!name.trim()} onClick={handleCreateTeam}>{t.collabCreateTeam}</Button>
                  <Button size="sm" variant="outline" onClick={() => setCreating(false)}>{t.cancel}</Button>
                </div>
              </div>
            )
          }
        </PanelCard>

        <PanelCard icon={Link2} title={t.collabJoinTeam}>
          <Input placeholder={t.collabInvitePlaceholder} value={joinLink} onChange={e => setJoinLink(e.target.value)} />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" disabled={!joinLink.trim()} onClick={handleJoin}>{t.collabJoinTeam}</Button>
          </div>
        </PanelCard>
      </div>

      <PanelCard icon={Users} title={t.collabYourTeams}>
        <div className="space-y-2">
          {teams.map(team => {
            const isHost = team.hostUserId === collab.userId
            return (
              <TeamRow
                key={team.teamId}
                team={team}
                t={t}
                isHost={isHost}
                onGenerateInvite={daysToUse => handleGenerateInvite(team, daysToUse)}
                onDelete={() => setDeleteTeamId(team.teamId)}
                onLeave={() => setLeaveTeamId(team.teamId)}
                onUpdate={updates => updateTeamMeta({
                  config: { apiKey: team.apiKey, projectId: team.projectId },
                  teamId: team.teamId,
                  updates,
                })}
              />
            )
          })}
          {teams.length === 0 && <p className="text-sm text-muted-foreground">{t.collabNoTeams}</p>}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </PanelCard>

      <Dialog open={!!leaveTeamId} onOpenChange={open => !open && setLeaveTeamId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.confirm}</DialogTitle>
          </DialogHeader>
          {leavingSharedTasks.length > 0
            ? <p className="text-sm text-muted-foreground">{t.collabLeaveWithLocalPrompt}</p>
            : <p className="text-sm text-muted-foreground">{t.collabLeavePrompt}</p>
          }
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveTeamId(null)}>{t.cancel}</Button>
            {leavingSharedTasks.length > 0 && (
              <Button variant="outline" onClick={() => handleLeaveConfirmed(false)}>{t.collabKeepLocalTasks}</Button>
            )}
            <Button variant="destructive" onClick={() => handleLeaveConfirmed(leavingSharedTasks.length > 0)}>
              {leavingSharedTasks.length > 0 ? t.collabDeleteLocalTasksToo : t.collabLeave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTeamId} onOpenChange={open => !open && setDeleteTeamId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.collabDeleteTeam}</DialogTitle>
          </DialogHeader>
          {deletingSharedTasks.length > 0
            ? <p className="text-sm text-muted-foreground">{t.collabDeleteTeamWithLocalPrompt}</p>
            : <p className="text-sm text-muted-foreground">{t.collabDeleteTeamPrompt}</p>
          }
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTeamId(null)}>{t.cancel}</Button>
            {deletingSharedTasks.length > 0 && (
              <Button variant="outline" onClick={() => handleDeleteTeamConfirmed(false)}>{t.collabKeepLocalTasks}</Button>
            )}
            <Button variant="destructive" onClick={() => handleDeleteTeamConfirmed(deletingSharedTasks.length > 0)}>
              {deletingSharedTasks.length > 0 ? t.collabDeleteLocalTasksToo : t.collabDeleteTeam}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
