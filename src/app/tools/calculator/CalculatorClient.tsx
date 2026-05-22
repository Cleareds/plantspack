'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calculator, Droplets, Cloud, Trees, Heart, Fish, Share2, Car, Plane } from 'lucide-react'

// Per-year savings of a vegan diet vs an average omnivorous diet.
// Sources cited on the page; see references section.
const PER_YEAR = {
  landAnimals: 30, // Counting Animals / Faunalytics estimate
  seaAnimals: 200, // Counting Animals / Faunalytics estimate
  co2Kg: 750, // Scarborough 2023, Poore & Nemecek 2018 - midpoint of reported ranges
  waterLitres: 1_100_000, // Mekonnen & Hoekstra 2012 differential, conservative
  landSqM: 2_500, // Poore & Nemecek 2018 - vegan vs average diet
} as const

// Equivalence references for visceral comparisons:
// - Average passenger car emits ~4.6 tonnes CO2/year (EPA 2024)
// - Round-trip transatlantic flight per passenger ~2 tonnes CO2 (ICAO)
const CAR_TONNES_PER_YEAR = 4.6
const FLIGHT_TONNES_PER_TRIP = 2.0

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 10) return Math.round(n).toLocaleString()
  return n.toFixed(1)
}

export default function CalculatorClient() {
  const [years, setYears] = useState<number>(1)
  const [projectionYears, setProjectionYears] = useState<number>(20)

  // Read ?y= from URL on first render (shareable links).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    const y = parseFloat(p.get('y') ?? '')
    if (Number.isFinite(y) && y >= 0 && y <= 100) setYears(y)
    const p2 = parseFloat(p.get('p') ?? '')
    if (Number.isFinite(p2) && p2 >= 0 && p2 <= 80) setProjectionYears(p2)
  }, [])

  const r = useMemo(() => {
    const y = Math.max(0, years)
    return {
      landAnimals: y * PER_YEAR.landAnimals,
      seaAnimals: y * PER_YEAR.seaAnimals,
      totalAnimals: y * (PER_YEAR.landAnimals + PER_YEAR.seaAnimals),
      co2Kg: y * PER_YEAR.co2Kg,
      waterLitres: y * PER_YEAR.waterLitres,
      landSqM: y * PER_YEAR.landSqM,
      carsOff: (y * PER_YEAR.co2Kg) / (CAR_TONNES_PER_YEAR * 1000),
      flightsAvoided: (y * PER_YEAR.co2Kg) / (FLIGHT_TONNES_PER_TRIP * 1000),
    }
  }, [years])

  const projection = useMemo(() => {
    const future = Math.max(0, projectionYears)
    return {
      animals: future * (PER_YEAR.landAnimals + PER_YEAR.seaAnimals),
      co2Kg: future * PER_YEAR.co2Kg,
    }
  }, [projectionYears])

  const shareText = `${fmt(r.totalAnimals)} animals, ${fmt(r.co2Kg)}kg CO2, and ${fmt(r.waterLitres)} litres of water saved in ${years} year${years === 1 ? '' : 's'} of being vegan. Calculate yours:`
  const shareUrl = typeof window === 'undefined'
    ? 'https://www.plantspack.com/tools/calculator'
    : `${window.location.origin}/tools/calculator?y=${years}&p=${projectionYears}`

  return (
    <div>
      <div className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-6 md:p-8 mb-6">
        <label className="block text-sm font-semibold text-on-surface mb-2">
          How long have you been vegan?
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={years}
            onChange={(e) => setYears(parseFloat(e.target.value) || 0)}
            className="w-32 px-4 py-3 rounded-xl ghost-border bg-surface text-on-surface text-lg font-semibold focus:outline-none focus:border-primary"
          />
          <span className="text-on-surface-variant">year{years === 1 ? '' : 's'}</span>
        </div>
        <p className="text-xs text-on-surface-variant mt-2">
          Decimals work too (0.5 = 6 months). Estimates compare a vegan diet to the average omnivorous diet.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <Stat icon={Heart} label="Land animals" value={fmt(r.landAnimals)} sub="cows, pigs, chickens, etc." />
        <Stat icon={Fish} label="Sea animals" value={fmt(r.seaAnimals)} sub="fish, shellfish, bycatch" />
        <Stat icon={Cloud} label="CO2e avoided" value={`${fmt(r.co2Kg)} kg`} sub="vs average diet" />
        <Stat icon={Droplets} label="Water saved" value={`${fmt(r.waterLitres)} L`} sub="green + blue water footprint" />
        <Stat icon={Trees} label="Land spared" value={`${fmt(r.landSqM)} m²`} sub="cropland + pasture" />
        <Stat icon={Calculator} label="Total animals" value={fmt(r.totalAnimals)} sub="land + sea, lifetime" />
      </div>

      {r.co2Kg > 0 && (
        <div className="rounded-2xl ghost-border bg-primary/5 p-5 mb-6">
          <div className="text-xs uppercase tracking-wider font-bold text-primary mb-3">That CO2 saved is equivalent to</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Equiv icon={Car} value={fmt(r.carsOff)} label={r.carsOff < 1 ? 'fraction of a car off the road for a year' : `cars off the road for a year`} />
            <Equiv icon={Plane} value={fmt(r.flightsAvoided)} label={r.flightsAvoided < 1 ? 'fraction of a transatlantic flight' : `transatlantic round-trips avoided`} />
          </div>
        </div>
      )}

      <div className="rounded-2xl ghost-border bg-surface-container-lowest p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-on-surface">If you stay vegan for {projectionYears} more years...</label>
        </div>
        <input
          type="range"
          min={0}
          max={60}
          step={1}
          value={projectionYears}
          onChange={(e) => setProjectionYears(parseInt(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-on-surface-variant mt-1 mb-3">
          <span>0</span>
          <span>30 yrs</span>
          <span>60 yrs</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface p-4">
            <div className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Future animals</div>
            <div className="text-2xl font-extrabold text-on-surface tabular-nums">{fmt(projection.animals)}</div>
          </div>
          <div className="rounded-xl bg-surface p-4">
            <div className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Future CO2</div>
            <div className="text-2xl font-extrabold text-on-surface tabular-nums">{fmt(projection.co2Kg)} kg</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
        >
          <Share2 className="h-4 w-4" />
          Share on X
        </a>
        <a
          href={`https://www.reddit.com/submit?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full ghost-border bg-surface-container-lowest text-on-surface text-sm font-semibold hover:border-primary/30"
        >
          <Share2 className="h-4 w-4" />
          Share on Reddit
        </a>
        <button
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(shareUrl).catch(() => {})
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full ghost-border bg-surface-container-lowest text-on-surface text-sm font-semibold hover:border-primary/30"
        >
          Copy link
        </button>
      </div>

      <div className="rounded-2xl ghost-border bg-surface-container-lowest p-6 text-sm text-on-surface-variant leading-relaxed">
        <h2 className="text-base font-bold text-on-surface mb-3">How we calculated this</h2>
        <p className="mb-3">
          These are estimates with real variance - food systems differ by country, farming practice, and study methodology. We use peer-reviewed sources and pick conservative midpoints rather than the highest-impact numbers other vegan calculators sometimes cite.
        </p>
        <ul className="space-y-2 list-disc list-outside ml-5">
          <li>
            <strong>Animals (~230/year)</strong> - Harish Sethu&apos;s analysis at{' '}
            <a href="https://countinganimals.com/how-many-animals-does-a-vegetarian-save/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Counting Animals</a>, derived from USDA and NOAA slaughter data. Updated figures in line with{' '}
            <a href="https://faunalytics.org/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Faunalytics</a> reports.
          </li>
          <li>
            <strong>CO2e (~750 kg/year)</strong> - Midpoint of Scarborough et al. 2023 (Nature Food){' '}
            <a href="https://www.nature.com/articles/s43016-023-00795-w" target="_blank" rel="noopener noreferrer" className="text-primary underline">[link]</a>{' '}
            and Poore &amp; Nemecek 2018 (Science){' '}
            <a href="https://www.science.org/doi/10.1126/science.aaq0216" target="_blank" rel="noopener noreferrer" className="text-primary underline">[link]</a>. Vegans emit ~75% less from food than high-meat eaters; vs the average diet the saving is smaller.
          </li>
          <li>
            <strong>Water (~1.1M L/year)</strong> - Differential between vegan and omnivorous diet water footprints in Mekonnen &amp; Hoekstra 2012{' '}
            <a href="https://waterfootprint.org/resources/Mekonnen-Hoekstra-2012-WaterFootprintFarmAnimalProducts.pdf" target="_blank" rel="noopener noreferrer" className="text-primary underline">[PDF]</a>. Includes green (rainfall) and blue (irrigation) water; the figure shrinks if you only count blue water.
          </li>
          <li>
            <strong>Land (~2,500 m²/year)</strong> - Poore &amp; Nemecek 2018. A vegan diet uses ~76% less agricultural land than the global average diet. We use a conservative average.
          </li>
        </ul>
        <p className="mt-4 text-xs">
          Why we don&apos;t cite Cowspiracy&apos;s figures: several of them (1,100 gallons water per almond, 660 gallons per burger) don&apos;t hold up under peer review. The numbers here are smaller but defensible.
        </p>
      </div>
    </div>
  )
}

function Equiv({ icon: Icon, value, label }: { icon: typeof Car; value: string; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xl font-extrabold text-on-surface tabular-nums">{value}</div>
        <div className="text-xs text-on-surface-variant leading-snug">{label}</div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Calculator
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-2xl ghost-border bg-surface-container-lowest p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider font-bold text-on-surface-variant">{label}</div>
          <div className="text-2xl font-extrabold text-on-surface tabular-nums">{value}</div>
          <div className="text-xs text-on-surface-variant mt-0.5">{sub}</div>
        </div>
      </div>
    </div>
  )
}
