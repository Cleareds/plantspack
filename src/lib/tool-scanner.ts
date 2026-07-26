import type { ScanResult, ToolName } from './tool-quota'

// Pricing as of 2026-07. Both per 1M tokens. We pad costs upward to stay safely
// within the budget cap.
const PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 }, // pre-classifier
  'gpt-5.4-mini': { input: 0.75, output: 4.5 }, // main scanner
  'gpt-4o': { input: 2.5, output: 10 }, // previous main scanner, kept for rollback
} as const

const PRECLASSIFY_MODEL = 'gpt-4o-mini'

// Benchmarked 2026-07-26 against 7 real ingredient-label photos from Open Food
// Facts, scored on OFF's own ingredient analysis, plus 2 negative controls
// (brand-recognisable packaging with no readable ingredient list):
//
//   model          correct  mean cost   confabulates on unreadable photo?
//   gpt-4o           7/7    $0.00405    no
//   gpt-5.4-mini     7/7    $0.00280    no
//   gpt-5.4-nano     6/7    $0.00085    no  (but twice said "unclear" on a
//                                            perfectly readable label)
//   gpt-4.1-mini     7/7    $0.00156    YES - invented "skimmed milk powder"
//                                            from a photo of a Nutella jar front
//
// gpt-5.4-mini matches gpt-4o's accuracy at 31% less cost, and matches it on the
// two things that matter for a vegan verdict: it says "unclear" instead of
// guessing when the label isn't readable, and it still flags plant-or-animal
// ingredients as "uncertain" rather than waving them through as vegan (gpt-4.1-
// mini called Coca-Cola's "natural flavourings" plain vegan). gpt-5.4-nano is
// 4.8x cheaper but pays for it in false "couldn't read this" answers, which cost
// a user their monthly scan for nothing.
//
// `detail: 'high' | 'low'` makes no difference to input tokens on the 5.x vision
// pipeline (measured: 3,012 tokens either way), so there is no cheaper detail
// tier to reach for here.
const SCAN_MODEL = 'gpt-5.4-mini'

// The 5.x models reject `max_tokens` and `temperature`, and bill reasoning
// tokens as output — so the completion cap has to cover reasoning plus the
// visible JSON, or the response comes back empty with finish_reason 'length'.
function completionParams(model: keyof typeof PRICING, cap: number) {
  return model.startsWith('gpt-5')
    ? { max_completion_tokens: cap, reasoning_effort: 'low' }
    : { max_tokens: cap, temperature: 0.1 }
}

// Pad estimates upward by 30% so we never under-charge against the budget cap.
function estimateCostUsd(model: keyof typeof PRICING, inTok: number, outTok: number) {
  const p = PRICING[model]
  return ((inTok / 1_000_000) * p.input + (outTok / 1_000_000) * p.output) * 1.3
}

async function openai<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`OpenAI ${r.status}: ${txt.slice(0, 200)}`)
  }
  return (await r.json()) as T
}

interface ChatResp {
  choices: { message: { content: string }; finish_reason?: string }[]
  usage?: { prompt_tokens: number; completion_tokens: number }
}

export async function preClassify(
  dataUrl: string,
  tool: ToolName,
): Promise<{ ok: boolean; costUsd: number }> {
  const targetDesc =
    tool === 'ingredient'
      ? 'a photo of a product ingredient list / nutrition label on packaging'
      : 'a photo of a restaurant menu (printed or chalkboard)'

  const prompt = `Is this image clearly ${targetDesc}? Answer with a single token: Y or N. If unsure, answer N.`

  const resp = await openai<ChatResp>({
    model: PRECLASSIFY_MODEL,
    max_tokens: 2,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
        ],
      },
    ],
  })

  const answer = (resp.choices?.[0]?.message?.content ?? '').trim().toUpperCase()
  // gpt-4o-mini bills images at ~33x the token count of the larger models, so
  // even a `detail: 'low'` image lands around 2,850 prompt tokens (measured
  // 2026-07-25). The old 800-token fallback under-logged the cost 3.5x whenever
  // the usage block was missing, which quietly ate into the daily budget cap.
  const inTok = resp.usage?.prompt_tokens ?? 2900
  const outTok = resp.usage?.completion_tokens ?? 2
  return {
    ok: answer.startsWith('Y'),
    costUsd: estimateCostUsd(PRECLASSIFY_MODEL, inTok, outTok),
  }
}

const INGREDIENT_PROMPT = `You are a vegan ingredient analyser. Look at this product ingredient label and identify any animal-derived ingredients.

Respond ONLY with JSON matching this schema:
{
  "verdict": "vegan" | "not_vegan" | "uncertain" | "unclear",
  "summary": "one short sentence verdict for the user",
  "items": [
    { "name": "ingredient name as printed", "status": "vegan" | "not_vegan" | "uncertain", "note": "optional short explanation" }
  ]
}

Rules:
- "unclear" if the photo is blurry/unreadable. Leave items empty in that case.
- Only list ingredients that are non-vegan or uncertain. Don't list every vegan ingredient.
- "uncertain" for ingredients that can be plant or animal (mono- and diglycerides, lecithin, vitamin D3, natural flavours, lactic acid).
- Be honest about uncertainty - don't guess "vegan" when you can't tell.
- Write "summary" and every "note" in English, using only Latin script. Keep each ingredient "name" exactly as printed on the label, in its original language.`

const MENU_PROMPT = `You are a vegan menu analyser. Look at this restaurant menu and classify EVERY dish you can read.

Respond ONLY with JSON matching this schema:
{
  "verdict": "vegan" | "not_vegan" | "uncertain" | "unclear",
  "summary": "2-3 sentence overview of vegan options + any visibility issues",
  "visibility": {
    "fully_readable": true | false,
    "issues": "optional - describe any cropped sections, glare, blur, cut-off prices, missing pages, dishes you could only partially read"
  },
  "items": [
    { "name": "dish name exactly as printed", "status": "vegan" | "not_vegan" | "uncertain", "note": "for vegan: list known animal products or 'naturally vegan'; for not_vegan: which animal product; for uncertain: what to ask the server" }
  ]
}

Rules:
- List ALL dishes you can read. Yes, including obviously non-vegan ones (burger, steak, etc.) - the user wants a complete picture of the menu so they can see what's where.
- Use the dish name as printed on the menu (keep the original language).
- Be honest about what you cannot see. If half the menu is cut off, glare obscures prices, a section is too blurry to read, or pages are missing - say so in "visibility.issues". Do NOT invent dishes you cannot actually read.
- "verdict" reflects vegan-friendliness of the menu overall:
  - "vegan" if there are 2+ clearly vegan dishes (no swaps needed)
  - "uncertain" if only askable/swappable dishes exist
  - "not_vegan" if no usable options even with swaps
  - "unclear" if the image is too unreadable to assess
- For multi-image uploads: combine all into one items array, deduplicate dishes that appear on multiple pages.
- If a dish name is unreadable but the section header is visible (e.g. "MAINS" section but one item too blurry), note that in visibility.issues - don't fabricate the dish.
- Write "summary", "visibility.issues" and every "note" in English, using only Latin script. Dish "name" values stay in the menu's original language.`

function allergenSuffix(allergens: string[] | undefined): string {
  if (!allergens || allergens.length === 0) return ''
  const list = allergens.map((a) => `"${a}"`).join(', ')
  // Allergens are reported on their own axis, NOT by corrupting "status".
  // The previous version told the model to mark an allergen-containing item
  // "not_vegan", which produced a red "Not vegan" verdict for products that
  // were perfectly vegan and merely contained soy. Two different questions:
  // "is this vegan" and "is this safe for me".
  return `

ALLERGY CONSTRAINTS: The user must avoid: ${list}.
- Add an "allergen" field to any item that contains, or likely contains, one of those allergens, set to the allergen name from that list (e.g. "allergen": "soy"). Say which ingredient is responsible in the note.
- This overrides the rule about which items to list: ALSO include an item for anything carrying one of these allergens even when it is perfectly vegan. A vegan ingredient the user is allergic to is exactly what they need to see.
- Do NOT change "status" or "verdict" because of an allergen. Those two fields answer "is this vegan", nothing else. An item that is vegan but contains soy stays status "vegan" and gets "allergen": "soy".
- Also add a top-level "allergens_found" array listing every allergen from the user's list that appears anywhere in this scan (empty array if none).
- If an allergen appears only in a precautionary warning ("may contain nuts", "produced in a factory that handles sesame"), still report it, and say in the note that it's a cross-contamination warning rather than an ingredient.`
}

export async function scanImage(
  dataUrls: string[],
  tool: ToolName,
  allergens?: string[],
): Promise<{ result: ScanResult; costUsd: number }> {
  const basePrompt = tool === 'ingredient' ? INGREDIENT_PROMPT : MENU_PROMPT
  const prompt = basePrompt + allergenSuffix(allergens)
  const introText = dataUrls.length === 1
    ? prompt
    : `${prompt}\n\nThe user has uploaded ${dataUrls.length} images of the same menu (multi-page). Treat them as one combined menu when listing dishes.`

  const resp = await openai<ChatResp>({
    model: SCAN_MODEL,
    // Menus can run to 40+ dishes, and on a reasoning model the cap covers
    // reasoning tokens too — leave headroom or the JSON comes back truncated.
    ...completionParams(SCAN_MODEL, 3000),
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: introText },
          ...dataUrls.map((url) => ({
            type: 'image_url' as const,
            image_url: { url, detail: 'high' as const },
          })),
        ],
      },
    ],
  })

  const content = resp.choices?.[0]?.message?.content ?? '{}'
  let parsed: ScanResult
  try {
    parsed = JSON.parse(content) as ScanResult
  } catch {
    parsed =
      resp.choices?.[0]?.finish_reason === 'length'
        ? { verdict: 'unclear', summary: 'That menu was too long to read in one go. Try fewer pages at a time.' }
        : { verdict: 'unclear', summary: 'Could not read this image clearly. Try a sharper photo.' }
  }

  // Fallbacks measured on gpt-5.4-mini: ~3,000 prompt tokens per label photo,
  // ~150 completion tokens including reasoning. Padded upward.
  const inTok = resp.usage?.prompt_tokens ?? 3000 * dataUrls.length
  const outTok = resp.usage?.completion_tokens ?? 500
  return {
    result: parsed,
    costUsd: estimateCostUsd(SCAN_MODEL, inTok, outTok),
  }
}

const INGREDIENT_TEXT_PROMPT = `You are a vegan ingredient analyser. Analyse this pasted ingredient list and identify any animal-derived ingredients.

Respond ONLY with JSON matching this schema:
{
  "verdict": "vegan" | "not_vegan" | "uncertain" | "unclear",
  "summary": "one short sentence verdict for the user",
  "items": [
    { "name": "ingredient name", "status": "vegan" | "not_vegan" | "uncertain", "note": "optional short explanation" }
  ]
}

Rules:
- "unclear" if the text is not actually an ingredient list (e.g. random text, just a product name).
- Only list ingredients that are non-vegan or uncertain. Don't list every vegan ingredient.
- "uncertain" for ingredients that can be plant or animal (mono- and diglycerides, lecithin, vitamin D3, natural flavours, lactic acid).
- Write "summary" and every "note" in English, using only Latin script. Keep each ingredient "name" as the user wrote it.`

const MENU_TEXT_PROMPT = `You are a vegan menu analyser. Analyse this pasted menu text and classify EVERY dish.

Respond ONLY with JSON matching this schema:
{
  "verdict": "vegan" | "not_vegan" | "uncertain" | "unclear",
  "summary": "2-3 sentence overview of vegan options",
  "items": [
    { "name": "dish name as written", "status": "vegan" | "not_vegan" | "uncertain", "note": "for vegan: list known animal products or 'naturally vegan'; for not_vegan: which animal product; for uncertain: what to ask the server" }
  ]
}

Rules:
- List ALL dishes from the text. Include obviously non-vegan ones too so the user sees the complete menu landscape.
- Write "summary" and every "note" in English, using only Latin script. Dish "name" values stay in the menu's original language.
- "unclear" if the input is not actually a menu (random text, just a single word, etc).
- "verdict" reflects vegan-friendliness overall: "vegan" if 2+ clear options, "uncertain" if only askable/swappable, "not_vegan" if nothing works.`

export async function scanText(
  text: string,
  tool: ToolName,
  allergens?: string[],
): Promise<{ result: ScanResult; costUsd: number }> {
  // Cheap sanity check before calling the LLM
  if (text.trim().length < 20) {
    return {
      result: { verdict: 'unclear', summary: 'Too little text to analyse. Paste the full ingredient list or menu.' },
      costUsd: 0,
    }
  }
  if (text.length > 8000) text = text.slice(0, 8000)

  const basePrompt = tool === 'ingredient' ? INGREDIENT_TEXT_PROMPT : MENU_TEXT_PROMPT
  const prompt = basePrompt + allergenSuffix(allergens)

  const resp = await openai<ChatResp>({
    model: SCAN_MODEL,
    ...completionParams(SCAN_MODEL, 2500),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text },
    ],
  })

  const content = resp.choices?.[0]?.message?.content ?? '{}'
  let parsed: ScanResult
  try {
    parsed = JSON.parse(content) as ScanResult
  } catch {
    parsed = { verdict: 'unclear', summary: 'Could not parse the response. Try again.' }
  }

  const inTok = resp.usage?.prompt_tokens ?? 1500
  const outTok = resp.usage?.completion_tokens ?? 400
  return {
    result: parsed,
    costUsd: estimateCostUsd(SCAN_MODEL, inTok, outTok),
  }
}
