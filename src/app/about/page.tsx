import { Metadata } from 'next'
import Link from 'next/link'
import { Heart, Target, Users, DollarSign } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About PlantsPack - Vegan Community Platform',
  description: 'Learn about PlantsPack, a safe space for vegans to share, encourage and enjoy vegan lifestyle everywhere at all times.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About PlantsPack</h1>
          <p className="text-xl text-gray-600">
            A safe space for vegans to share, encourage and enjoy vegan lifestyle everywhere at all times.
          </p>
        </div>

        {/* Our Story */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
          <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
            <p>
              At the moment, there are just 2 people and a dog behind all PlantsPack features.
              We're Oleksandra and Anton, originally from Ukraine, based in Belgium for the last 6 years.
              Oleksandra is 10+ years vegan and Anton has finally joined her in this amazing journey 1.5 years ago.
            </p>
            <p>
              What we found out is - there is no safe space for vegans to express their thoughts and share their pains and joy without being hit by hate, anger, trolling or at least occasional invites to "the fight".
            </p>
            <p>
              When we travel somewhere, when we post things online or participate in social gatherings - it's always at least a little awkward and uncomfortable. We find our ways, everybody does, but wouldn't it be nice to have an online space to not worry about all that? A space to express, share and enjoy the lifestyle we consider best for us and the planet + support people on their first steps in this amazing journey.
            </p>
            <p>
              We'd love everyone to become vegan, but also we do not want to prove our point everyday to just feel OK with the harsh world.
              We'd like to feel safe, while learning about new things, engaging with other like-minded people and by doing something meaningful without constant debates about the basics of our lifestyle.
            </p>
            <p className="font-semibold">
              That's how the idea was born.
            </p>
          </div>
        </div>

        {/* Mission */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
          </div>
          <p className="text-lg text-gray-700">
            Safe informative space for vegans to share, encourage and enjoy vegan lifestyle everywhere at all times.
          </p>
        </div>

        {/* Goals */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Our Goals</h2>
          </div>
          <ul className="space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">•</span>
              <span>Build a stable community-driven application to share stories, insights and places suitable for vegans.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">•</span>
              <span>Allow our community to self-organise in packs or other forms to have a comfortable space knowledge base to store, organise and share favourite and most suitable content.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">•</span>
              <span>Support vegan and animal-friendly initiatives with resources accumulated by the application.</span>
            </li>
          </ul>
        </div>

        {/* Community Bases */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Community Bases We Aim For</h2>
          </div>
          <ul className="space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">•</span>
              <span><strong>No hate.</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">•</span>
              <span><strong>No preference or premium content prioritisation</strong> - All paid features are allowing more features but not prioritising the content produced by paid users.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">•</span>
              <span>The community decides what features to build and incorporate, but Oleksandra and Anton leave the right for a final decision. <strong>Only Support or Premium users can vote for roadmap features.</strong> Check the <Link href="/roadmap" className="text-green-600 hover:text-green-700 underline">roadmap page</Link> to vote for next features.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">•</span>
              <span><strong>At least 50% of revenue will go to initiatives or places we support.</strong></span>
            </li>
          </ul>
        </div>

        {/* What We Support */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">We Directly Support</h2>
          </div>
          <ul className="space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">•</span>
              <span>Animal shelters in Ukraine.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">•</span>
              <span>Vegan initiatives across the world that we (Oleksandra and Anton) consider relevant.</span>
            </li>
          </ul>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Important Notes</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex gap-3">
              <span>•</span>
              <span>It's a family and community-driven project.</span>
            </li>
            <li className="flex gap-3">
              <span>•</span>
              <span>We do not have resources to build everything we want fast, but we're doing our best.</span>
            </li>
            <li className="flex gap-3">
              <span>•</span>
              <span>We do not have or aim for any affiliations / sponsorship if they do not fit our community bases, mission and goals.</span>
            </li>
          </ul>
        </div>

        {/* Follow & Contact */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Stay Connected</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              Follow <Link href="/user/admin" className="text-green-600 hover:text-green-700 font-semibold">@admin</Link> for news and updates of the roadmap and platform.
            </p>
            <p>
              Contact us or send an email to{' '}
              <a href="mailto:hello@cleareds.com" className="text-green-600 hover:text-green-700 font-semibold">
                hello@cleareds.com
              </a>{' '}
              for more details.
            </p>

            {/* Social Media Links */}
            <div className="pt-4 border-t border-gray-200">
              <p className="font-semibold mb-3">Follow us on social media:</p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="https://x.com/plantspackX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X (Twitter)
                </a>
                <a
                  href="https://www.instagram.com/plants.pack/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61583784658664"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="bg-gray-100 rounded-lg p-6 text-sm text-gray-600">
          <p>
            Cleareds is an official 1-man Belgian company entity from Anton Kravchuk (admin).
          </p>
        </div>
      </div>
    </div>
  )
}
