/**
 * Per-place verification footer. Shows where a place sits on the verification
 * ladder and what community feedback it has, in a way that's always positive
 * or neutral and never accusatory.
 *
 * Design principles:
 * - Never say "never reviewed" or any wording that reads as neglect.
 * - Always co-locate an action ("Suggest correction") with neutral states so
 *   readers see a path forward, not a deficit.
 * - Community-confirmed trumps AI-verified in the display priority since a
 *   real human signing off carries more weight than an automated check.
 */
'use client'

import { useState } from 'react'
import { BadgeCheck, Sparkles, Database, AlertCircle, ChevronRight } from 'lucide-react'
import SuggestCorrectionModal from './SuggestCorrectionModal'

interface VerificationFooterProps {
  verificationLevel: number | null | undefined
  verificationMethod: string | null | undefined
  lastVerifiedAt: string | null | undefined
  isVerified: boolean | null | undefined
  tags: string[] | null | undefined
  placeId: string
  placeSlug: string | null | undefined
  /** Full place subset needed for the SuggestCorrectionModal pre-fill. */
  place: {
    id: string
    name: string
    address: string
    description: string | null
    category: string
    website: string | null
    phone: string | null
    opening_hours?: string | Record<string, string> | null
    vegan_level?: string
  }
}

type CommunityState = 'confirmed' | 'suggested' | 'not_yet'

function communityState(isVerified: boolean | null | undefined, tags: string[] | null | undefined): CommunityState {
  if (isVerified) return 'confirmed'
  const tagSet = new Set(tags || [])
  if (tagSet.has('actually_fully_vegan') || tagSet.has('community_correction_confirmed') || tagSet.has('community_report:actually_fully_vegan')) return 'confirmed'
  if ((tags || []).some(t => t.startsWith('community_report:'))) return 'suggested'
  return 'not_yet'
}

function formatDate(s: string | null | undefined): string {
  if (!s) return ''
  try {
    const d = new Date(s)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return ''
  }
}

function methodLabel(method: string | null | undefined): string {
  switch (method) {
    case 'admin_review': return 'Admin-reviewed'
    case 'community_correction': return 'Community-confirmed'
    case 'ai_verified': return 'AI-verified'
    case 'imported': return 'Sourced from a vegan-first dataset'
    default: return 'Imported'
  }
}

export default function VerificationFooter({
  verificationLevel = 0,
  verificationMethod,
  lastVerifiedAt,
  isVerified,
  tags,
  placeId,
  placeSlug,
  place,
}: VerificationFooterProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const community = communityState(isVerified, tags)
  const level = verificationLevel ?? 0
  const showAILine = level >= 2 && community !== 'confirmed' // when community-confirmed, AI line is redundant noise
  const showSourcedLine = level === 1 && community !== 'confirmed' // L1-only places get the sourced label
  const showHonestNote = level === 0 // basically never (every place is at least L1) but here for completeness

  return (
    <div className="mt-6 px-6 py-4 rounded-xl bg-surface-container-low/50 ghost-border text-xs space-y-2">
      {/* Top status block */}
      {community === 'confirmed' && (
        <div className="flex items-start gap-2">
          <BadgeCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-emerald-700">Confirmed</span>
            <span className="text-on-surface-variant">{' '}- {methodLabel(verificationMethod)}{lastVerifiedAt ? ` on ${formatDate(lastVerifiedAt)}` : ''}.</span>
          </div>
        </div>
      )}

      {showAILine && (
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-on-surface">AI-verified</span>
            <span className="text-on-surface-variant">{lastVerifiedAt ? ` on ${formatDate(lastVerifiedAt)}` : ''}. Description and live web evidence cross-checked.</span>
          </div>
        </div>
      )}

      {showSourcedLine && (
        <div className="flex items-start gap-2">
          <Database className="h-4 w-4 text-on-surface-variant flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-on-surface">Sourced</span>
            <span className="text-on-surface-variant">{' '}from a trusted vegan-first dataset. Awaiting deeper verification.</span>
          </div>
        </div>
      )}

      {showHonestNote && (
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-on-surface-variant">
            Imported but unverified. The community can help confirm.
          </div>
        </div>
      )}

      {/* Community status */}
      {community === 'suggested' && (
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-amber-700">Correction suggested.</span>
            <span className="text-on-surface-variant">{' '}A community member flagged something worth checking. Pending review.</span>
          </div>
        </div>
      )}

      {community === 'not_yet' && (
        <div className="flex items-center justify-between gap-2 text-on-surface-variant">
          <span>Community: not yet confirmed.</span>
        </div>
      )}

      {/* Suggest correction is always available, regardless of state. */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-0.5 text-primary font-medium hover:underline"
        >
          Suggest correction <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <SuggestCorrectionModal
        place={place}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
