import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All tools</span>
        </Link>
        <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight mb-3">
          {title}
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-6">{blurb}</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          Coming soon
        </div>
      </div>
    </div>
  )
}
