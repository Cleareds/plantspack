import type { ScanResult, ToolName } from './tool-quota'

// Pricing as of 2026-05. Both per 1M tokens. Vision images ~1k input tokens at
// 1024px-ish. We pad costs upward to stay safely within the budget cap.
const PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 }, // pre-classifier
  'gpt-4o': { input: 2.5, output: 10 }, // main scanner
} as const

const PRECLASSIFY_MODEL = 'gpt-4o-mini'
const SCAN_MODEL = 'gpt-4o'

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
  choices: { message: { content: string } }[]
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
  const inTok = resp.usage?.prompt_tokens ?? 800
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
- Be honest about uncertainty - don't guess "vegan" when you can't tell.`

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
- If a dish name is unreadable but the section header is visible (e.g. "MAINS" section but one item too blurry), note that in visibility.issues - don't fabricate the dish.`

export async function scanImage(
  dataUrls: string[],
  tool: ToolName,
): Promise<{ result: ScanResult; costUsd: number }> {
  const prompt = tool === 'ingredient' ? INGREDIENT_PROMPT : MENU_PROMPT
  const introText = dataUrls.length === 1
    ? prompt
    : `${prompt}\n\nThe user has uploaded ${dataUrls.length} images of the same menu (multi-page). Treat them as one combined menu when listing dishes.`

  const resp = await openai<ChatResp>({
    model: SCAN_MODEL,
    max_tokens: 1500,
    temperature: 0.1,
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
    parsed = { verdict: 'unclear', summary: 'Could not read this image clearly. Try a sharper photo.' }
  }

  const inTok = resp.usage?.prompt_tokens ?? 2000 * dataUrls.length
  const outTok = resp.usage?.completion_tokens ?? 400
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
- "uncertain" for ingredients that can be plant or animal (mono- and diglycerides, lecithin, vitamin D3, natural flavours, lactic acid).`

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
- "unclear" if the input is not actually a menu (random text, just a single word, etc).
- "verdict" reflects vegan-friendliness overall: "vegan" if 2+ clear options, "uncertain" if only askable/swappable, "not_vegan" if nothing works.`

export async function scanText(
  text: string,
  tool: ToolName,
): Promise<{ result: ScanResult; costUsd: number }> {
  // Cheap sanity check before calling the LLM
  if (text.trim().length < 20) {
    return {
      result: { verdict: 'unclear', summary: 'Too little text to analyse. Paste the full ingredient list or menu.' },
      costUsd: 0,
    }
  }
  if (text.length > 8000) text = text.slice(0, 8000)

  const prompt = tool === 'ingredient' ? INGREDIENT_TEXT_PROMPT : MENU_TEXT_PROMPT

  const resp = await openai<ChatResp>({
    model: SCAN_MODEL,
    max_tokens: 1200,
    temperature: 0.1,
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
