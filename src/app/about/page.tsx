import { Metadata } from 'next'
import Link from 'next/link'
import { Heart, Leaf, Shield, HandHeart } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About PlantsPack - Built for the Mission, Not the Markets',
  description: 'PlantsPack is a community-funded vegan platform. No investors, no ads, no paywalls. 50% of revenue goes to animal welfare causes.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">

        {/* Hero / Manifesto */}
        <div className="mb-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest">
              <Leaf className="h-3.5 w-3.5" />
              <span>Founder&apos;s Manifesto</span>
            </div>
          </div>
          <h1 className="font-headline font-extrabold text-4xl md:text-6xl text-on-surface tracking-tight leading-[1.1] mb-6">
            Built for the Mission,
            <br />
            <span className="text-primary">Not the Markets</span>
          </h1>
        </div>

        {/* The Problem */}
        <div className="prose prose-lg max-w-none mb-12">
          <div className="bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border p-8 md:p-10 space-y-5 text-on-surface-variant text-lg leading-relaxed">
            <p>
              We built PlantsPack because we were tired of seeing great vegan platforms disappear.
              Most apps today are built on venture capital &mdash; millions of dollars in debt that force them
              to prioritize growth and ads over the actual community. When the money runs out, the platform dies.
            </p>
            <p className="font-semibold text-on-surface text-xl">
              We are doing things differently.
            </p>
            <p>
              We are a team of two &mdash; Oleksandra and Anton, originally from Ukraine, based in Belgium.
              Oleksandra is 10+ years vegan and Anton joined her on this journey 1.5 years ago.
              Our monthly costs are less than a dinner out. Because we are lean, we don&apos;t answer to investors &mdash;
              we answer to you.
            </p>
            <p>
              Our goal isn&apos;t to become a billion-dollar company. It&apos;s to create a <strong>permanent, digital home
              for the vegan movement</strong>.
            </p>
          </div>
        </div>

        {/* Why We Exist */}
        <div className="bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border p-8 md:p-10 mb-12">
          <div className="flex items-center gap-3 mb-5">
            <Heart className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-on-surface">Why We Exist</h2>
          </div>
          <div className="space-y-4 text-on-surface-variant text-lg leading-relaxed">
            <p>
              There is no safe space for vegans to express their thoughts and share their joys
              without being hit by hate, trolling, or invites to &ldquo;the fight.&rdquo;
            </p>
            <p>
              When we travel, when we post things online, when we participate in social gatherings &mdash;
              it&apos;s always at least a little uncomfortable. We find our ways, everybody does.
              But wouldn&apos;t it be nice to have an online space where you don&apos;t have to worry about all that?
            </p>
            <p>
              A space to express, share, and enjoy the lifestyle we consider best for us and the planet.
              To support people on their first steps. To feel safe while doing something meaningful.
            </p>
          </div>
        </div>

        {/* The 50/50 Pledge */}
        <div className="rounded-2xl border-2 border-primary ring-8 ring-primary/5 bg-surface-container-lowest p-8 md:p-10 mb-12">
          <div className="flex items-center gap-3 mb-5">
            <HandHeart className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-on-surface">The 50/50 Transparency Pledge</h2>
          </div>
          <p className="text-on-surface-variant text-lg leading-relaxed mb-6">
            When you become a Supporter, your contribution does two things:
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-primary/5 rounded-xl p-6">
              <div className="text-3xl font-extrabold text-primary mb-2">50%</div>
              <div className="font-semibold text-on-surface mb-1">Goes to the Platform</div>
              <p className="text-sm text-on-surface-variant">
                Covers our servers, security, and the tools we need to keep the maps,
                recipes, and community features running.
              </p>
            </div>
            <div className="bg-primary/5 rounded-xl p-6">
              <div className="text-3xl font-extrabold text-primary mb-2">50%</div>
              <div className="font-semibold text-on-surface mb-1">Goes to the Animals</div>
              <p className="text-sm text-on-surface-variant">
                Every cent of profit beyond our basic needs is donated to animal shelters
                in Ukraine and community-voted vegan causes.
              </p>
            </div>
          </div>
          <p className="text-on-surface-variant text-sm italic">
            No bloated salaries. No shady data selling. Just a community-funded tool that gives back.
          </p>
        </div>

        {/* Community Principles */}
        <div className="bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border p-8 md:p-10 mb-12">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-on-surface">Our Principles</h2>
          </div>
          <ul className="space-y-4 text-on-surface-variant text-lg">
            <li className="flex gap-3">
              <span className="text-primary font-bold mt-1">1.</span>
              <span><strong>Everything is free.</strong> No paywalls, no premium content gates. Every feature is available to everyone.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold mt-1">2.</span>
              <span><strong>No hate.</strong> PlantsPack is a safe, drama-light space. We moderate actively.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold mt-1">3.</span>
              <span><strong>Community decides.</strong> Everyone can vote on what we build next. Check the <Link href="/roadmap" className="text-primary hover:underline font-semibold">roadmap</Link>.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold mt-1">4.</span>
              <span><strong>No investors, no ads.</strong> We are funded by voluntary supporters, not venture capital.</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center mb-12">
          <Link
            href="/support"
            className="inline-flex items-center gap-3 silk-gradient hover:opacity-90 text-on-primary-btn px-8 py-4 rounded-2xl font-bold text-lg transition-colors"
          >
            <Heart className="h-5 w-5" />
            Become a Supporter
          </Link>
          <p className="text-sm text-outline mt-3">
            Everything is free. Supporting is optional, and deeply appreciated.
          </p>
        </div>

        {/* Stay Connected */}
        <div className="bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border p-8 mb-8">
          <h2 className="text-xl font-bold text-on-surface mb-4">Stay Connected</h2>
          <div className="space-y-3 text-on-surface-variant">
            <p>
              Follow <Link href="/user/admin" className="text-primary hover:underline font-semibold">@admin</Link> for updates.
              <span className="mx-2">·</span>
              <Link href="/contact" className="text-primary hover:underline font-semibold">Contact us</Link>
              <span className="mx-2">·</span>
              <a href="mailto:hello@cleareds.com" className="text-primary hover:underline font-semibold">hello@cleareds.com</a>
            </p>
            <div className="flex flex-wrap gap-4 pt-3 border-t border-outline-variant/15">
              <a href="https://x.com/plantspackX" target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors text-sm">X (Twitter)</a>
              <a href="https://www.instagram.com/plants.pack/" target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors text-sm">Instagram</a>
              <a href="https://www.facebook.com/profile.php?id=61583784658664" target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors text-sm">Facebook</a>
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="bg-surface-container-low rounded-lg p-6 text-sm text-on-surface-variant">
          <p>Cleareds is an official Belgian company entity from Anton Kravchuk (admin).</p>
        </div>
      </div>
    </div>
  )
}
