import Link from 'next/link'
import { ArrowLeft, Database } from 'lucide-react'

export const metadata = {
  title: 'Data Attribution & Licensing — OpenStreetMap and Other Sources | Plants Pack',
  description:
    'Most place records on Plants Pack originate from OpenStreetMap and remain available under the Open Database License (ODbL). Full credit, licence terms, and every other data source we use.',
  alternates: { canonical: 'https://www.plantspack.com/legal/attribution' },
}

const OSM_SHARE = '87%'
const AS_OF = 'September 2026'

export default function AttributionPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-surface-container-lowest border-b border-outline-variant/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="flex items-center space-x-2 text-primary hover:text-primary-container transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-surface-container-low rounded-full">
              <Database className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-on-surface mb-4">Data Attribution &amp; Licensing</h1>
          <p className="text-on-surface-variant">Last updated: September 8, 2026</p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">OpenStreetMap</h2>
            <p className="text-on-surface-variant leading-relaxed mb-4">
              Plants Pack is built on <strong className="text-on-surface">OpenStreetMap</strong>. The large
              majority of the place records in our directory - about {OSM_SHARE} as of {AS_OF} - originate
              from OpenStreetMap, and so do the map tiles on every map we show.
            </p>
            <div className="rounded-xl border border-outline-variant/25 bg-surface-container-low p-5">
              <p className="text-on-surface leading-relaxed">
                Place data &copy;{' '}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-container underline"
                >
                  OpenStreetMap contributors
                </a>
                , available under the{' '}
                <a
                  href="https://opendatacommons.org/licenses/odbl/1-0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-container underline"
                >
                  Open Database License (ODbL) v1.0
                </a>
                .
              </p>
            </div>
            <p className="text-on-surface-variant leading-relaxed mt-4">
              Records that came from OpenStreetMap stay under the ODbL. That licence is what makes this
              project possible at all, and the obligation runs both ways: OpenStreetMap is maintained by
              volunteers, and we would rather send corrections back than quietly benefit from their work.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">What we add on top</h2>
            <p className="text-on-surface-variant leading-relaxed mb-3">
              Not everything on a place page comes from OpenStreetMap. The parts we research, write or
              collect ourselves include:
            </p>
            <ul className="list-disc list-inside text-on-surface-variant space-y-1 ml-4">
              <li>Vegan classification (fully vegan, mostly vegan, vegan-friendly, vegan options)</li>
              <li>Our verification level and the date we last checked a venue</li>
              <li>Written descriptions, photos, reviews and ratings</li>
              <li>Places submitted by Plants Pack community members</li>
            </ul>
            <p className="text-on-surface-variant leading-relaxed mt-4">
              How each of those is checked is described on our{' '}
              <Link href="/methodology" className="text-primary hover:text-primary-container underline">
                methodology page
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">Other sources</h2>
            <p className="text-on-surface-variant leading-relaxed mb-3">
              A minority of records came from other vegan-first datasets and from our own research. Where a
              record originates from a specific dataset, the place page says so in its verification footer.
              These include:
            </p>
            <ul className="list-disc list-inside text-on-surface-variant space-y-1 ml-4">
              <li>VegGuide.org</li>
              <li>Foursquare Places</li>
              <li>Open Food Facts (used by our product and barcode tools)</li>
              <li>Venue websites, press coverage and direct submissions from venue owners</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">Map tiles</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Map tiles are rendered by{' '}
              <a
                href="https://stadiamaps.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-container underline"
              >
                Stadia Maps
              </a>{' '}
              using{' '}
              <a
                href="https://openmaptiles.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-container underline"
              >
                OpenMapTiles
              </a>
              , from OpenStreetMap data. Every map on the site carries this credit in its corner.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">Corrections</h2>
            <p className="text-on-surface-variant leading-relaxed">
              If a place is wrong, out of date or should not be listed, use the &quot;Suggest
              correction&quot; link on its page. If you believe content here infringes your rights, or you
              have a question about how we attribute a source, email{' '}
              <a
                href="mailto:hello@plantspack.com"
                className="text-primary hover:text-primary-container underline"
              >
                hello@plantspack.com
              </a>{' '}
              and we will fix it.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
