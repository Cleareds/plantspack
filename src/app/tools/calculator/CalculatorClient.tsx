'use client'

import { useMemo, useState } from 'react'
import { Calculator, Droplets, Cloud, Trees, Heart, Fish, Share2 } from 'lucide-react'

// Per-year savings of a vegan diet vs an average omnivorous diet.
// Sources cited on the page; see references section.
const PER_YEAR = {
  landAnimals: 30, // Counting Animals / Faunalytics estimate
  seaAnimals: 200, // Counting Animals / Faunalytics estimate
  co2Kg: 750, // Scarborough 2023, Poore & Nemecek 2018 - midpoint of reported ranges
  waterLitres: 1_100_000, // Mekonnen & Hoekstra 2012 differential, conservative
  landSqM: 2_500, // Poore & Nemecek 2018 - vegan vs average diet
} as const

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 10) return Math.round(n).toLocaleString()
  return n.toFixed(1)
}

export default function CalculatorClient() {
  const [years, setYears] = useState<number>(1)

  const r = useMemo(() => {
    const y = Math.max(0, years)
    return {
      landAnimals: y * PER_YEAR.landAnimals,
      seaAnimals: y * PER_YEAR.seaAnimals,
      totalAnimals: y * (PER_YEAR.landAnimals + PER_YEAR.seaAnimals),
      co2Kg: y * PER_YEAR.co2Kg,
      waterLitres: y * PER_YEAR.waterLitres,
      landSqM: y * PER_YEAR.landSqM,
    }
  }, [years])

  const shareText = `${fmt(r.totalAnimals)} animals, ${fmt(r.co2Kg)}kg CO2, and ${fmt(r.waterLitres)} litres of water saved in ${years} year${years === 1 ? '' : 's'} of being vegan. Calculate yours:`
  const shareUrl = 'https://www.plantspack.com/tools/calculator'

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
