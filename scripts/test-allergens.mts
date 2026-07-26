/**
 * Allergen matcher test cases. Run: npx tsx scripts/test-allergens.mts
 *
 * No unit-test runner in this repo (Playwright only, for browser E2E), so this
 * is a plain script that exits non-zero on failure. Every case here is a real
 * label pattern that broke a previous version of the matcher.
 */
import { findAllergenMatches, findAllergenHits } from '../src/shared/allergens'

type Case = { label: string; text: string; allergens: string[]; expect: Record<string, string> }
const CASES: Case[] = [
  {
    label: 'free-from claim must NOT be a hit',
    text: 'Gluten-free oats, water, salt. Dairy free.',
    allergens: ['gluten'],
    expect: {},
  },
  {
    label: 'ingredient = contains',
    text: 'Wheat flour, sugar, soy lecithin, salt.',
    allergens: ['gluten', 'soy'],
    expect: { gluten: 'contains', soy: 'contains' },
  },
  {
    label: 'precautionary only = may_contain',
    text: 'Oats, sugar, sunflower oil. May contain traces of peanuts and sesame.',
    allergens: ['peanuts', 'sesame'],
    expect: { peanuts: 'may_contain', sesame: 'may_contain' },
  },
  {
    label: 'ingredient beats warning for the same allergen',
    text: 'Soy protein, water, salt. May contain soy and nuts.',
    allergens: ['soy', 'nuts'],
    expect: { soy: 'contains', nuts: 'may_contain' },
  },
  {
    label: 'French label: ingredient + precautionary',
    text: 'Farine de blé, sucre, huile de tournesol. Peut contenir des traces de fruits à coque et arachide.',
    allergens: ['gluten', 'peanuts'],
    expect: { gluten: 'contains', peanuts: 'may_contain' },
  },
  {
    label: 'German label: Spuren von',
    text: 'Weizenmehl, Zucker, Sojalecithin. Kann Spuren von Erdnuss enthalten.',
    allergens: ['gluten', 'soy', 'peanuts'],
    expect: { gluten: 'contains', soy: 'contains', peanuts: 'may_contain' },
  },
  {
    label: '"no soy" negation before the keyword',
    text: 'Rice, water, salt. Contains no soy.',
    allergens: ['soy'],
    expect: {},
  },
  {
    label: 'shared-equipment phrasing',
    text: 'Cocoa mass, sugar, cocoa butter. Produced in a factory that also handles milk and nuts.',
    allergens: ['nuts'],
    expect: { nuts: 'may_contain' },
  },
  {
    label: 'custom user-typed allergen',
    text: 'Chicory root fibre, oats, salt.',
    allergens: ['chicory'],
    expect: { chicory: 'contains' },
  },
  {
    label: 'clean label, nothing flagged',
    text: 'Water, rice, salt.',
    allergens: ['gluten', 'soy', 'nuts'],
    expect: {},
  },
]

let pass = 0
for (const c of CASES) {
  const got = Object.fromEntries(findAllergenMatches(c.text, c.allergens).map((m) => [m.allergen, m.kind]))
  const ok = JSON.stringify(got) === JSON.stringify(c.expect)
  if (ok) pass++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.label}`)
  if (!ok) console.log(`      expected ${JSON.stringify(c.expect)}\n      got      ${JSON.stringify(got)}`)
}
console.log(`\n${pass}/${CASES.length} passed`)
console.log('back-compat findAllergenHits:', findAllergenHits('Wheat flour, may contain nuts', ['gluten', 'nuts']))

// Regression cases for boundary matching
const EXTRA: [string, string, string[], Record<string,string>][] = [
  ['"cocoa" must not flag coconut', 'Cocoa mass, sugar, cocoa butter.', ['coconut'], {}],
  ['"nutrition" must not flag nuts', 'Nutrition information per 100g. Oats, salt.', ['nuts'], {}],
  ['bare "nuts" flags nuts', 'Oats, sugar, mixed nuts.', ['nuts'], { nuts: 'contains' }],
  ['"nutmeg" must not flag nuts', 'Flour, sugar, nutmeg, cinnamon.', ['nuts'], {}],
  ['"noix de coco" flags coconut', 'Farine, sucre, noix de coco râpée.', ['coconut'], { coconut: 'contains' }],
  ['fruits à coque flags nuts', 'Farine de riz, sucre, fruits à coque.', ['nuts'], { nuts: 'contains' }],
]
console.log('\n--- boundary regressions')
let p2 = 0
for (const [label, text, allergens, expect] of EXTRA) {
  const got = Object.fromEntries(findAllergenMatches(text, allergens).map((m) => [m.allergen, m.kind]))
  const ok = JSON.stringify(got) === JSON.stringify(expect)
  if (ok) p2++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  expected ${JSON.stringify(expect)} got ${JSON.stringify(got)}`}`)
}
console.log(`${p2}/${EXTRA.length} passed`)

const failed = (CASES.length - pass) + (EXTRA.length - p2)
if (failed > 0) {
  console.error(`\n${failed} case(s) failed`)
  process.exit(1)
}
console.log('\nall allergen matcher cases passed')
