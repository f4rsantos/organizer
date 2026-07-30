import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Table as TableIcon, Link2, Link2Off,
  Undo2, Redo2, Palette, Type, Minus, Plus, Mic,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { PRESET_COLORS } from '@/lib/constants'
import { useSpeechInput } from '@/hooks/useSpeechInput'

const FONT_SIZES = [
  { value: null, labelKey: 'notesSizeNormal' },
  { value: '0.85em', labelKey: 'notesSizeSmall' },
  { value: '1.25em', labelKey: 'notesSizeLarge' },
  { value: '1.6em', labelKey: 'notesSizeHuge' },
]

function ToolButton({ icon: Icon, active, disabled, title, onClick }) {
  return (
    <Button type="button" variant="ghost" size="icon" title={title} disabled={disabled}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={cn('h-7 w-7 shrink-0', active && 'bg-primary/15 text-primary')}>
      <Icon className="h-3.5 w-3.5" />
    </Button>
  )
}

function Popover({ open, children }) {
  if (!open) return null
  return (
    <div className="absolute left-0 top-8 z-20 rounded-lg border border-border bg-popover p-2 shadow-md">
      {children}
    </div>
  )
}

function normalizeHex(value) {
  const raw = String(value ?? '').trim().replace(/^#/, '')
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(raw)) return null
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw
  return `#${full.toLowerCase()}`
}

export function EditorToolbar({ editor, t, lang }) {
  const [palette, setPalette] = useState(false)
  const [sizes, setSizes] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [hex, setHex] = useState('')
  const customRef = useRef(null)

  const chain = () => editor.chain().focus()

  const applyHex = () => {
    const color = normalizeHex(hex)
    if (!color) return
    chain().setColor(color).run()
    setHex('')
    setPalette(false)
  }

  // Recognition resends the full transcript on every event, so the previously
  // inserted span is replaced rather than appended to.
  const dictationRef = useRef(null)
  const speech = useSpeechInput({
    lang,
    onResult: text => {
      if (!text) return
      const start = dictationRef.current ?? editor.state.selection.from
      dictationRef.current = start
      editor.chain().focus()
        .insertContentAt({ from: start, to: editor.state.selection.to }, text)
        .run()
    },
  })

  useEffect(() => {
    if (!speech.isListening) dictationRef.current = null
  }, [speech.isListening])

  const applyLink = () => {
    const url = linkUrl.trim()
    if (url) chain().extendMarkRange('link').setLink({ href: url }).run()
    setLinkOpen(false)
    setLinkUrl('')
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border/60 bg-card/40 p-1">
        <ToolButton icon={Bold} title={t.notesBold} active={editor.isActive('bold')}
          onClick={() => chain().toggleBold().run()} />
        <ToolButton icon={Italic} title={t.notesItalic} active={editor.isActive('italic')}
          onClick={() => chain().toggleItalic().run()} />
        <ToolButton icon={Strikethrough} title={t.notesStrike} active={editor.isActive('strike')}
          onClick={() => chain().toggleStrike().run()} />

        <span className="mx-1 h-4 w-px bg-border" />

        <ToolButton icon={Heading1} title={t.notesHeading1} active={editor.isActive('heading', { level: 1 })}
          onClick={() => chain().toggleHeading({ level: 1 }).run()} />
        <ToolButton icon={Heading2} title={t.notesHeading2} active={editor.isActive('heading', { level: 2 })}
          onClick={() => chain().toggleHeading({ level: 2 }).run()} />
        <ToolButton icon={Heading3} title={t.notesHeading3} active={editor.isActive('heading', { level: 3 })}
          onClick={() => chain().toggleHeading({ level: 3 }).run()} />

        <span className="mx-1 h-4 w-px bg-border" />

        <ToolButton icon={List} title={t.notesBulletList} active={editor.isActive('bulletList')}
          onClick={() => chain().toggleBulletList().run()} />
        <ToolButton icon={ListOrdered} title={t.notesOrderedList} active={editor.isActive('orderedList')}
          onClick={() => chain().toggleOrderedList().run()} />
        <ToolButton icon={ListChecks} title={t.notesTaskList} active={editor.isActive('taskList')}
          onClick={() => chain().toggleTaskList().run()} />
        <ToolButton icon={Quote} title={t.notesQuote} active={editor.isActive('blockquote')}
          onClick={() => chain().toggleBlockquote().run()} />

        <span className="mx-1 h-4 w-px bg-border" />

        <ToolButton icon={TableIcon} title={t.notesInsertTable}
          onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <ToolButton icon={Code} title={t.notesCodeBlock} active={editor.isActive('codeBlock')}
          onClick={() => chain().toggleCodeBlock().run()} />
        <ToolButton icon={Minus} title={t.notesDivider}
          onClick={() => chain().setHorizontalRule().run()} />

        {editor.isActive('link') ? (
          <ToolButton icon={Link2Off} title={t.notesRemoveLink} active
            onClick={() => chain().unsetLink().run()} />
        ) : (
          <ToolButton icon={Link2} title={t.notesAddLink}
            onClick={() => { setLinkUrl(''); setLinkOpen(true) }} />
        )}

        <span className="mx-1 h-4 w-px bg-border" />

        <div className="relative">
          <ToolButton icon={Palette} title={t.notesTextColor} active={palette}
            onClick={() => { setPalette(v => !v); setSizes(false) }} />
          <Popover open={palette}>
            <div className="grid w-44 grid-cols-6 gap-1">
              {PRESET_COLORS.map(color => (
                <button key={color} type="button" title={color}
                  className="h-5 w-5 rounded-full border border-border/50"
                  style={{ backgroundColor: color }}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { chain().setColor(color).run(); setPalette(false) }} />
              ))}
              <button type="button" title={t.notesColorCustom}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-muted-foreground/60 text-muted-foreground hover:text-foreground"
                onMouseDown={e => e.preventDefault()}
                onClick={() => customRef.current?.click()}>
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">#</span>
              <input value={hex} placeholder="7c3aed" spellCheck={false} maxLength={7}
                className="h-6 w-20 rounded border border-border bg-background px-1.5 font-mono text-[11px] outline-none focus:ring-1 focus:ring-primary/40"
                onMouseDown={e => e.stopPropagation()}
                onChange={e => setHex(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyHex() }} />
              <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]"
                disabled={!normalizeHex(hex)}
                onMouseDown={e => e.preventDefault()}
                onClick={applyHex}>
                {t.notesColorApply}
              </Button>
            </div>
            <input ref={customRef} type="color" className="sr-only" tabIndex={-1}
              onChange={e => { chain().setColor(e.target.value).run(); setPalette(false) }} />
            <button type="button"
              className="mt-2 w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { chain().unsetColor().run(); setPalette(false) }}>
              {t.notesColorReset}
            </button>
          </Popover>
        </div>

        <div className="relative">
          <ToolButton icon={Type} title={t.notesTextSize} active={sizes}
            onClick={() => { setSizes(v => !v); setPalette(false) }} />
          <Popover open={sizes}>
            <div className="flex w-32 flex-col">
              {FONT_SIZES.map(size => (
                <button key={size.labelKey} type="button"
                  className="rounded px-2 py-1 text-left text-xs hover:bg-accent"
                  style={size.value ? { fontSize: size.value } : undefined}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    if (size.value) chain().setFontSize(size.value).run()
                    else chain().unsetFontSize().run()
                    setSizes(false)
                  }}>
                  {t[size.labelKey]}
                </button>
              ))}
            </div>
          </Popover>
        </div>

        <span className="mx-1 h-4 w-px bg-border" />

        {speech.isSupported && (
          <ToolButton icon={Mic} active={speech.isListening}
            title={speech.isListening ? t.voiceInputStopAria : t.voiceInputAria}
            onClick={() => (speech.isListening ? speech.stop() : speech.start())} />
        )}

        <ToolButton icon={Undo2} title={t.notesUndo} disabled={!editor.can().undo()}
          onClick={() => chain().undo().run()} />
        <ToolButton icon={Redo2} title={t.notesRedo} disabled={!editor.can().redo()}
          onClick={() => chain().redo().run()} />
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.notesAddLink}</DialogTitle>
          </DialogHeader>
          <Input value={linkUrl} placeholder="https://" autoFocus
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyLink() }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>{t.cancel}</Button>
            <Button onClick={applyLink}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


