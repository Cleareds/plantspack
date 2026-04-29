import { Metadata } from 'next'
import Link from 'next/link'
import { Heart, Leaf, Shield, HandHeart, MapPin, BookOpen, Users, Vote } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About PlantsPack — Built for the Mission, Not the Markets',
  description: 'PlantsPack is a community-funded, ad-free vegan platform mapping 37,000+ plant-based places across 170+ countries. No investors — 50% of profit funds animal welfare.',
  alternates: { canonical: 'https://plantspack.com/about' },
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
          <p className="text-on-surface-variant text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            PlantsPack is a free, community-funded platform for vegans and anyone exploring plant-based living.
            No investors. No ads. No paywalls.
          </p>
        </div>

        {/* What is PlantsPack */}
        <div className="bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border p-8 md:p-10 mb-12">
          <h2 className="text-2xl font-bold text-on-surface mb-6">What is PlantsPack?</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-on-surface text-sm">Vegan Places Map</div>
                <p className="text-sm text-on-surface-variant">Find and share vegan-friendly restaurants, stores, and stays worldwide.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-on-surface text-sm">Recipes &amp; Resources</div>
                <p className="text-sm text-on-surface-variant">Discover and share plant-based recipes, products, and lifestyle tips.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-on-surface text-sm">Community &amp; Packs</div>
                <p className="text-sm text-on-surface-variant">Connect with like-minded people. Organise content into curated packs.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Vote className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-on-surface text-sm">You Decide What We Build</div>
                <p className="text-sm text-on-surface-variant">Vote on features and shape the platform&apos;s future on the <Link href="/roadmap" className="text-primary hover:underline">roadmap</Link>.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-on-surface text-sm">Community Contributions</div>
                <p className="text-sm text-on-surface-variant">Anyone can suggest corrections to places. <Link href="/support" className="text-primary hover:underline">Supporters</Link> get direct edit access to keep data accurate.</p>
              </div>
            </div>
          </div>
        </div>

        {/* The Problem */}
        <div className="bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border p-8 md:p-10 mb-12">
          <div className="space-y-5 text-on-surface-variant text-lg leading-relaxed">
            <p>
              We built PlantsPack because we were tired of seeing great vegan platforms disappear.
              Most apps today are built on venture capital &mdash; millions of dollars in debt that force them
              to prioritize growth and ads over the actual community. When the money runs out, the platform dies.
            </p>
            <p className="font-semibold text-on-surface text-xl">
              We are doing things differently.
            </p>
            <p>
              PlantsPack is independent and community-funded. We don&apos;t answer to investors &mdash;
              we answer to you. Our goal isn&apos;t to become a billion-dollar company. It&apos;s to create a
              <strong> permanent, digital home for the vegan movement</strong>.
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
              We&apos;re Oleksandra and Anton, originally from Ukraine.
              Oleksandra is 10+ years vegan and Anton joined her on this journey 2 years ago.
            </p>
            <p>
              There is no safe space for vegans to express their thoughts and share their joys
              without being hit by hate, trolling, or invites to &ldquo;the fight.&rdquo;
            </p>
            <p>
              We wanted a space to express, share, and enjoy the lifestyle we consider best for us and the planet.
              To support people on their first steps. To feel safe while doing something meaningful
              &mdash; without constant debates about the basics of our lifestyle.
            </p>
            <p className="font-semibold text-on-surface">
              That&apos;s how PlantsPack was born.
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
                50% of our profit — after taxes and operating expenses — is donated to animal
                shelters in Ukraine and community-voted vegan causes. We&apos;ll publish receipts.
              </p>
            </div>
          </div>
          <p className="text-on-surface-variant text-sm italic">
            No bloated salaries. No shady data selling. Just a community-funded tool that gives back. The 50% donation is calculated from net profit, not gross revenue — because the law requires us to cover taxes and expenses first. We believe in full transparency about this.
          </p>
        </div>

        {/* Our Principles */}
        <div className="bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border p-8 md:p-10 mb-12">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-on-surface">Our Principles</h2>
          </div>
          <ul className="space-y-4 text-on-surface-variant text-lg">
            <li className="flex gap-3">
              <span className="text-primary font-bold mt-1">1.</span>
              <span><strong>Everything is free.</strong> No paywalls, no premium content gates. Every feature is available to everyone, forever.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold mt-1">2.</span>
              <span><strong>No hate.</strong> PlantsPack is a safe, drama-light space. We moderate actively to keep it that way.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold mt-1">3.</span>
              <span><strong>Community decides.</strong> Every user can <Link href="/roadmap" className="text-primary hover:underline font-semibold">vote on the roadmap</Link> and suggest features. We build what you need, not what investors want.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold mt-1">4.</span>
              <span><strong>No investors, no ads.</strong> Funded by voluntary supporters. We will never sell your data or show you ads.</span>
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
              Follow <Link href="/profile/admin" className="text-primary hover:underline font-semibold">@admin</Link> for updates.
              <span className="mx-2">&middot;</span>
              <Link href="/contact" className="text-primary hover:underline font-semibold">Contact us</Link>
              <span className="mx-2">&middot;</span>
              <a href="mailto:hello@plantspack.com" className="text-primary hover:underline font-semibold">hello@plantspack.com</a>
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
          <p>Cleareds is an official company entity from Anton Kravchuk (admin).</p>
        </div>
      </div>
    </div>
  )
}
