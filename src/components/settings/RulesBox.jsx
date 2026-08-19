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

      function personOf(data) {
        return data.authUids[request.auth.uid];
      }
      function isKnownDevice(data) {
        return data.authUids.keys().hasAny([request.auth.uid]);
      }
      function onlyEnrollsSelf() {
        return request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['members', 'authUids', 'updatedAt', 'serverUpdatedAt'])
          && request.resource.data.authUids.diff(resource.data.authUids)
              .affectedKeys().hasOnly([request.auth.uid])
          && (
            request.resource.data.members.diff(resource.data.members)
                .affectedKeys().size() == 0
            || (
              request.resource.data.members.diff(resource.data.members)
                  .affectedKeys().hasOnly([personOf(request.resource.data)])
              && request.resource.data.members[personOf(request.resource.data)].role == 'member'
            )
          );
      }

      allow create: if request.auth != null
        && request.resource.data.authUids.keys().hasOnly([request.auth.uid])
        && personOf(request.resource.data) == request.resource.data.hostPersonId
        && request.resource.data.members.keys().hasOnly([request.resource.data.hostPersonId]);

      allow update: if request.auth != null && (
        isKnownDevice(resource.data)
        || onlyEnrollsSelf()
      );

      allow delete: if request.auth != null
        && isKnownDevice(resource.data)
        && personOf(resource.data) == resource.data.hostPersonId;
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
