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
import { BadgeCheck, Sparkles, Database, AlertCircle, ChevronRight, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import SuggestCorrectionModal from './SuggestCorrectionModal'

interface VerificationFooterProps {
  verificationLevel: number | null | undefined
  verificationMethod: string | null | undefined
  lastVerifiedAt: string | null | undefined
  isVerified: boolean | null | undefined
  tags: string[] | null | undefined
  placeId: string
  placeSlug: string | null | undefined
  /**
   * OSM element this record is linked to, e.g. "node:123". When set, the
   * record derives from OpenStreetMap and the ODbL credit must travel with it,
   * so it is rendered per place rather than only in the site footer.
   */
  osmRef?: string | null
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
  osmRef,
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
  const { user } = useAuth()
  const pathname = usePathname()
  const community = communityState(isVerified, tags)
  const level = verificationLevel ?? 0
  const isAdminReviewed = verificationMethod === 'admin_review'
  const isAIVerified = verificationMethod === 'ai_verified'
  // Admin review and AI verification are stronger signals than dataset import.
  // Both require the explicit verification_method to be set — CLI batch tags
  // (e.g. germany-verification-bump-2026-05-19) do NOT promote to these labels
  // because no admin clicked through them and no AI cross-check was run.
  const showAdminLine = isAdminReviewed && community !== 'confirmed'
  const showAILine = isAIVerified && !isAdminReviewed && community !== 'confirmed'
  // Sourced line covers everything else at level >= 1 that doesn't qualify for
  // admin/AI labels — including batch-cross-referenced places at level >= 2.
  const showSourcedLine = level >= 1 && !isAdminReviewed && !isAIVerified && community !== 'confirmed'
  // A community member personally suggested this place (mobile/web suggest flow),
  // vs. a bulk dataset import. It's genuinely not verified yet, but "Imported" is
  // both inaccurate and fails to credit the contributor — so it gets its own line.
  const isCommunitySubmitted =
    verificationMethod === 'community_submission' || (tags || []).includes('community-submitted')
  const showCommunitySubmittedLine = isCommunitySubmitted && community !== 'confirmed'
  const showHonestNote = level === 0 && !isCommunitySubmitted // stray dataset rows only

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

      {showAdminLine && (
        <div className="flex items-start gap-2">
          <BadgeCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-on-surface">Admin-reviewed</span>
            <span className="text-on-surface-variant">{lastVerifiedAt ? ` on ${formatDate(lastVerifiedAt)}` : ''}. Manually checked by a Plants Pack admin.</span>
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

      {showSourcedLine && level >= 3 && (
        <div className="flex items-start gap-2">
          <Database className="h-4 w-4 text-on-surface-variant flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-on-surface">Cross-referenced</span>
            <span className="text-on-surface-variant">{' '}across multiple vegan-first sources. Awaiting admin or community confirmation.</span>
          </div>
        </div>
      )}

      {showSourcedLine && level < 3 && (
        <div className="flex items-start gap-2">
          <Database className="h-4 w-4 text-on-surface-variant flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-on-surface">Sourced</span>
            <span className="text-on-surface-variant">{' '}from a trusted vegan-first dataset. Awaiting deeper verification.</span>
          </div>
        </div>
      )}

      {showCommunitySubmittedLine && (
        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-on-surface">Suggested by a community member.</span>
            <span className="text-on-surface-variant">{' '}Not yet verified - you can help confirm it below.</span>
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

      {community === 'not_yet' && !isCommunitySubmitted && (
        <div className="flex items-center justify-between gap-2 text-on-surface-variant">
          <span>Community: not yet confirmed.</span>
        </div>
      )}

      {/* ODbL credit for records derived from OpenStreetMap. Required by the
          licence and shown on the record itself, so the credit cannot be lost
          when a single place page is what someone actually reads or shares. */}
      {osmRef && /^(node|way|relation):\d+$/.test(osmRef) && (
        <div className="flex items-start gap-2 pt-1 text-xs text-on-surface-variant">
          <Database className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <div>
            This record derives from{' '}
            <a
              href={`https://www.openstreetmap.org/${osmRef.replace(':', '/')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary transition-colors"
            >
              OpenStreetMap
            </a>
            . &copy; OpenStreetMap contributors, under{' '}
            <a
              href="https://opendatacommons.org/licenses/odbl/1-0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary transition-colors"
            >
              ODbL
            </a>
            .
          </div>
        </div>
      )}

      {/* Suggest correction is always available, regardless of state. Guests
          are routed to sign-in first (the submit endpoint requires a session),
          so they never fill the form only to hit an "Unauthorized" error. */}
      <div className="pt-1 flex items-center gap-4 flex-wrap">
        {user ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-0.5 text-primary font-medium hover:underline"
          >
            Suggest correction <ChevronRight className="h-3 w-3" />
          </button>
        ) : (
          <Link
            href={`/auth?mode=signin&redirect=${encodeURIComponent(pathname || (placeSlug ? `/place/${placeSlug}` : ''))}`}
            className="inline-flex items-center gap-0.5 text-primary font-medium hover:underline"
          >
            Suggest correction <ChevronRight className="h-3 w-3" />
          </Link>
        )}
        <Link
          href="/methodology"
          className="text-on-surface-variant hover:text-primary hover:underline"
        >
          How we verify →
        </Link>
      </div>

      <SuggestCorrectionModal
        place={place}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
