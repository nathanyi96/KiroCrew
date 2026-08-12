// The "Respond" control on a change-request LIST ROW: opens (or resumes) a session
// that answers the feedback that change request received (see lib/respond.ts).
//
// Two deliberate departures from ReviewButton, both because this renders per ROW
// rather than once in a header:
//
// 1. It does NOT subscribe to the record. ReviewButton keeps a `useQuery` per
//    instance so it can render "Review" vs "Resume", which costs one subscription
//    per mounted row — up to 200 on the animated list. This reads the record inside
//    the click instead. That is also strictly more correct for the decision the read
//    drives: a fresh read cannot hand back a 30s-stale "no session exists" and
//    duplicate a session the user already has.
// 2. It is a compact icon button rather than an `AgentSessionButton`, whose
//    hardcoded accent fill is a header-primary look and would dominate the card.
//
// The row group already contains the card's own `<button>`, so this is the second
// and last control the `max-two-buttons-per-row` rule allows there. A further row
// action has to become an overflow menu.
import { useState } from 'react'
import { MessageSquareReply } from 'lucide-react'
import { issueRadarApi, type PullRequest, RepoRef } from '../api'
import { useRespondToPr } from '../lib/respond'
import { providerTerms } from '../lib/links'

import { i18nT } from '../../../i18n/t'

export default function PrRespondButton({
  repoRef, pull, ready, notReadyReason, localPath,
}: {
  repoRef: RepoRef
  pull: PullRequest
  /** Whether this repo has a usable local checkout to work in. */
  ready: boolean
  /** Why it is not ready, already translated by the owner. */
  notReadyReason: string
  localPath: string
}) {
  const terms = providerTerms(repoRef)
  const { respondToPr, busy } = useRespondToPr()
  const [lookupFailed, setLookupFailed] = useState(false)

  const onClick = async () => {
    if (busy || !ready) return
    setLookupFailed(false)
    // A FAILED lookup must not be read as "no session exists": acting on that
    // would start a second session and overwrite the existing record's link,
    // orphaning the session the user already has. So a failure reports itself and
    // does nothing, which is recoverable — the user clicks again.
    let existing = null
    try {
      const res = await issueRadarApi.getInvestigation(repoRef, pull.number, 'pull', 'respond')
      existing = res.investigation
    } catch {
      setLookupFailed(true)
      return
    }
    await respondToPr(repoRef, pull, localPath, existing)
  }

  const label = i18nT('apps.issueRadar.components.prRespondButton.answer_feedback', {
    subject: terms.changeRequestShort,
    number: pull.number,
  })
  const title = !ready
    ? notReadyReason
    : lookupFailed
      ? i18nT('apps.issueRadar.components.prRespondButton.lookup_failed')
      : i18nT('apps.issueRadar.components.prRespondButton.answer_feedback_hint', {
          label: terms.changeRequestTitle,
        })

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || !ready}
      aria-label={label}
      title={title}
      className="mt-3 flex-shrink-0 rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <MessageSquareReply size={14} aria-hidden="true" />
    </button>
  )
}
