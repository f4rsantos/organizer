import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

export const RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /organizer/state {
      allow read, write: if request.auth != null;
    }

    match /teams/{teamId} {
      allow get: if request.auth != null;
      allow list: if false;

      allow create: if request.auth != null
        && request.resource.data.hostUserId == request.auth.uid;

      allow update: if request.auth != null && (
        (request.auth.uid in resource.data.members)
        || (
          !(request.auth.uid in resource.data.members)
          && request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(['members', 'updatedAt', 'serverUpdatedAt'])
          && (request.auth.uid in request.resource.data.members)
        )
      );

      allow delete: if request.auth != null
        && resource.data.hostUserId == request.auth.uid;
    }
  }
}`

export function RulesBox({ label, snippet = RULES_SNIPPET }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked: the snippet is selectable in the box
    }
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium">{label}</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[11px] shrink-0"
          onClick={handleCopy}
        >
          {copied
            ? <><Check className="h-3 w-3" /> {t.copied}</>
            : <><Copy className="h-3 w-3" /> {t.copy}</>
          }
        </Button>
      </div>
      <pre className="text-[11px] leading-relaxed overflow-x-auto">{snippet}</pre>
    </div>
  )
}
