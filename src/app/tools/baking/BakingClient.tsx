'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Star } from 'lucide-react'
import {
  BAKING_INGREDIENTS,
  RECIPE_CONTEXTS,
  rankOptionsForContext,
  type RecipeContext,
  type BakingOption,
} from '@/lib/baking-substitutes'

export default function BakingClient() {
  const [ingredientKey, setIngredientKey] = useState<string>(BAKING_INGREDIENTS[0].key)
  const ingredient = BAKING_INGREDIENTS.find((i) => i.key === ingredientKey)!

  const [amount, setAmount] = useState<number>(ingredient.defaultAmount)
  const [context, setContext] = useState<RecipeContext | ''>('')

  function pickIngredient(key: string) {
    setIngredientKey(key)
    const next = BAKING_INGREDIENTS.find((i) => i.key === key)
    if (next) setAmount(next.defaultAmount)
  }

  const options = useMemo(() => {
    return rankOptionsForContext(ingredient.options, (context || null) as RecipeContext | null)
  }, [ingredient, context])

  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : ingredient.defaultAmount

  return (
    <div className="space-y-6">
      <div className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-5 md:p-6">
        <label className="block text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">
          What does your recipe call for?
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {BAKING_INGREDIENTS.map((i) => (
            <button
              key={i.key}
              onClick={() => pickIngredient(i.key)}
              className={`text-sm font-semibold px-3 py-2.5 rounded-lg transition text-left ${
                ingredient.key === i.key
                  ? 'bg-primary text-on-primary'
                  : 'ghost-border bg-surface text-on-surface hover:border-primary/30'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">
              How much?
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                min={0}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                className="w-24 px-3 py-2.5 rounded-lg ghost-border bg-surface text-on-surface font-mono text-center focus:outline-none focus:border-primary"
              />
              <span className="text-sm text-on-surface-variant">
                {ingredient.unitLabel}
                {safeAmount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">
              Recipe type <span className="text-on-surface-variant/60 font-normal normal-case">(optional)</span>
            </label>
            <select
              value={context}
              onChange={(e) => setContext(e.target.value as RecipeContext | '')}
              className="w-full px-3 py-2.5 rounded-lg ghost-border bg-surface text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="">Any / not sure</option>
              {RECIPE_CONTEXTS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-xs uppercase tracking-wider font-bold text-on-surface-variant">
            Replacements for {ingredient.label.toLowerCase()}{' '}
            {context && (
              <span className="text-primary">— ranked for {RECIPE_CONTEXTS.find((c) => c.key === context)?.label.toLowerCase()}</span>
            )}
          </h2>
        </div>

        {options.length === 0 ? (
          <div className="p-5 rounded-2xl ghost-border bg-surface-container-lowest text-sm text-on-surface-variant">
            None of our recommended substitutes works well for this recipe type. Try changing the recipe type filter.
          </div>
        ) : (
          <ol className="space-y-3">
            {options.map((opt, idx) => (
              <OptionCard key={opt.name} option={opt} amount={safeAmount} top={idx === 0 && !!context} />
            ))}
          </ol>
        )}
      </div>

      <div className="p-4 rounded-xl bg-surface-container-lowest ghost-border text-xs text-on-surface-variant leading-relaxed">
        Ratios drawn from widely-published vegan baking references. Not AI-generated. Treat as a starting point — your flour, fat, and oven all vary, and your first bake with a substitute is the truest test.
      </div>
    </div>
  )
}

function OptionCard({ option, amount, top }: { option: BakingOption; amount: number; top: boolean }) {
  return (
    <li className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-5">
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-on-surface">{option.name}</h3>
            {top && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                <Star className="h-3 w-3" />
                Best match
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-lg bg-primary/5 ghost-border p-3 mb-3">
        <div className="text-xs uppercase tracking-wider font-bold text-primary mb-1">Use this much</div>
        <p className="text-sm md:text-base text-on-surface font-semibold leading-relaxed">{option.compute(amount)}</p>
      </div>
      <p className="text-sm text-on-surface-variant leading-relaxed">{option.notes}</p>
      {option.bestFor.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {option.bestFor.map((c) => {
            const label = RECIPE_CONTEXTS.find((x) => x.key === c)?.label ?? c
            return (
              <span key={c} className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">
                {label}
              </span>
            )
          })}
        </div>
      )}
    </li>
  )
}
