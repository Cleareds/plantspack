'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Check,
  Heart,
  Leaf,
  ArrowLeft,
  Loader2,
  X,
  MapPin,
  Coffee,
  Users,
  BookOpen,
} from 'lucide-react'
import {
  redirectToCheckout,
  getUserSubscription,
  createPortalSession,
  type UserSubscription
} from '@/lib/stripe'

interface Supporter {
  username: string
  first_name: string | null
  avatar_url: string | null
  subscription_tier: string
}

interface Stats {
  places: number
  recipes: number
  members: number
}

function SupportContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [managingSubscription, setManagingSubscription] = useState(false)
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')
  const error = searchParams.get('error')

  useEffect(() => {
    if (user) {
      getUserSubscription(user.id).then(setSubscription)
    }

    fetch('/api/supporters').then(r => r.json()).then(d => setSupporters(d.supporters || []))
    fetch('/api/stats').then(r => r.json()).then(d => setStats(d))
  }, [user])

  const handleDonate = async () => {
    if (!user) {
      router.push('/auth')
      return
    }

    setLoading(true)
    try {
      await redirectToCheckout('medium', user.id)
    } catch (err) {
      console.error('Error starting checkout:', err)
      alert(err instanceof Error ? err.message : 'Failed to start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!user) return

    setManagingSubscription(true)
    try {
      const portalUrl = await createPortalSession(user.id)
      window.location.href = portalUrl
    } catch (err) {
      console.error('Error opening customer portal:', err)
      alert('Failed to open subscription management. Please try again.')
    } finally {
      setManagingSubscription(false)
    }
  }

  const isSupporter = subscription && subscription.tier !== 'free'

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Feed</span>
            </Link>
            {isSupporter && (
              <button
                onClick={handleManageSubscription}
                disabled={managingSubscription}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors"
              >
                {managingSubscription ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Manage Subscription</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Success/Cancel/Error Messages */}
        {success && (
          <div className="mb-12 p-5 bg-primary/5 border border-primary/15 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-primary/10 rounded-full">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-on-surface font-semibold">
                  Thank you for your support!
                </p>
                <p className="text-on-surface-variant text-sm mt-1">
                  Your supporter badge is now active on your profile. You&apos;re helping keep PlantsPack free for everyone.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-12 p-5 bg-error/5 border border-error/15 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-error/10 rounded-full">
                <X className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-error font-semibold">
                  Something went wrong
                </p>
                <p className="text-error/80 text-sm mt-1">
                  {error === 'payment_failed'
                    ? 'Payment could not be processed. Please check your payment method and try again.'
                    : error === 'session_expired'
                    ? 'Your checkout session has expired. Please start the process again.'
                    : 'An unexpected error occurred. Please contact support or try again later.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {canceled && (
          <div className="mb-12 p-5 bg-tertiary/5 border border-tertiary/15 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-tertiary/10 rounded-full">
                <ArrowLeft className="h-5 w-5 text-tertiary" />
              </div>
              <p className="text-on-surface-variant">
                No worries! PlantsPack is free for everyone. Come back anytime if you&apos;d like to support us.
              </p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest">
              <Leaf className="h-3.5 w-3.5" />
              <span>Free Forever</span>
            </div>
          </div>
          <h1 className="font-headline font-extrabold text-5xl md:text-7xl text-on-surface tracking-tight leading-[1.1] mb-6">
            PlantsPack is
            <br />
            <span className="text-primary">free. Forever.</span>
          </h1>
          <p className="text-on-surface-variant text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto">
            We believe the vegan community should grow without paywalls.
            Every feature is free for everyone. If you love what we&apos;re building,
            consider supporting us.
          </p>
        </div>

        {/* Impact Counters */}
        {stats && (
          <div className="grid grid-cols-3 gap-6 mb-20">
            <div className="text-center p-6 rounded-[2rem] bg-surface-container-lowest border border-outline-variant/10">
              <MapPin className="h-6 w-6 text-primary mx-auto mb-3" />
              <div className="text-3xl font-extrabold text-on-surface tracking-tight">{stats.places.toLocaleString()}</div>
              <div className="text-sm text-on-surface-variant mt-1">Places mapped</div>
            </div>
            <div className="text-center p-6 rounded-[2rem] bg-surface-container-lowest border border-outline-variant/10">
              <BookOpen className="h-6 w-6 text-primary mx-auto mb-3" />
              <div className="text-3xl font-extrabold text-on-surface tracking-tight">{stats.recipes.toLocaleString()}</div>
              <div className="text-sm text-on-surface-variant mt-1">Recipes shared</div>
            </div>
            <div className="text-center p-6 rounded-[2rem] bg-surface-container-lowest border border-outline-variant/10">
              <Users className="h-6 w-6 text-primary mx-auto mb-3" />
              <div className="text-3xl font-extrabold text-on-surface tracking-tight">{stats.members.toLocaleString()}</div>
              <div className="text-sm text-on-surface-variant mt-1">Members</div>
            </div>
          </div>
        )}

        {/* Donate Section */}
        <div className="rounded-[2.5rem] border-2 border-primary ring-8 ring-primary/5 bg-surface-container-lowest p-8 lg:p-12 mb-20">
          <div className="text-center mb-10">
            <Heart className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight mb-3">
              Support the Mission
            </h2>
            <p className="text-on-surface-variant text-lg max-w-xl mx-auto">
              Help keep PlantsPack free for everyone. Your support goes directly toward
              servers, development, and growing the vegan community.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Buy Me a Coffee */}
            <a
              href="https://buymeacoffee.com/plantspack"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-outline-variant/10 bg-surface-container-low hover:bg-surface-container transition-colors group"
            >
              <Coffee className="h-8 w-8 text-yellow-600 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-on-surface text-lg">Buy us a coffee</span>
              <span className="text-sm text-on-surface-variant text-center">One-time donation, any amount</span>
            </a>

            {/* Stripe Supporter */}
            <button
              onClick={handleDonate}
              disabled={loading || (isSupporter ?? false)}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Heart className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
              )}
              <span className="font-bold text-on-surface text-lg">
                {isSupporter ? 'You\'re a Supporter!' : 'Become a Supporter'}
              </span>
              <span className="text-sm text-on-surface-variant text-center">
                {isSupporter ? 'Thank you for your support' : '$3/month · Badge on your profile'}
              </span>
            </button>
          </div>

          {/* What supporters get */}
          <div className="mt-10 pt-8 border-t border-outline-variant/10">
            <p className="text-center text-sm font-medium text-on-surface-variant mb-4">What supporters get:</p>
            <div className="flex flex-wrap justify-center gap-4">
              {['Supporter badge', 'Discuss and vote on platform\'s future', 'Our eternal gratitude'].map((perk) => (
                <div key={perk} className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm text-on-surface-variant">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Supporter Wall */}
        {supporters.length > 0 && (
          <div className="mb-20">
            <div className="text-center mb-8">
              <h2 className="font-headline font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight mb-2">
                Our Supporters
              </h2>
              <p className="text-on-surface-variant">
                These amazing people help keep PlantsPack free
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {supporters.map((supporter) => (
                <Link
                  key={supporter.username}
                  href={`/profile/${supporter.username}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-surface-container-low transition-colors group"
                >
                  <div className="relative">
                    {supporter.avatar_url ? (
                      <img
                        src={supporter.avatar_url}
                        alt={supporter.first_name || supporter.username}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                        <span className="text-primary font-bold text-lg">
                          {(supporter.first_name || supporter.username)[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                      <Heart className="h-3 w-3 text-white fill-white" />
                    </div>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium">
                    {supporter.first_name || supporter.username}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Manage Subscription for existing subscribers */}
        {isSupporter && (
          <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 text-center">
            <h3 className="font-headline font-bold text-xl text-on-surface mb-2">Manage Your Subscription</h3>
            <p className="text-on-surface-variant text-sm mb-4">
              Update payment method, change plan, or cancel anytime.
            </p>
            <button
              onClick={handleManageSubscription}
              disabled={managingSubscription}
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface-container-low hover:bg-surface-container rounded-xl font-medium text-on-surface transition-colors disabled:opacity-50"
            >
              {managingSubscription ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>Manage Subscription</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SupportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SupportContent />
    </Suspense>
  )
}
