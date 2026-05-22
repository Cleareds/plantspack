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

const MENU_PROMPT = `You are a vegan menu analyser. Look at this restaurant menu and classify dishes.

Respond ONLY with JSON matching this schema:
{
  "verdict": "vegan" | "not_vegan" | "uncertain" | "unclear",
  "summary": "one short sentence about vegan options on this menu",
  "items": [
    { "name": "dish name", "status": "vegan" | "not_vegan" | "uncertain", "note": "optional - what to ask about or which animal product makes it non-vegan" }
  ]
}

Rules:
- "unclear" if the photo is unreadable.
- "verdict" should reflect overall menu: "vegan" if multiple clearly vegan dishes, "uncertain" if only ambiguous ones, "not_vegan" if nothing usable.
- List ALL dishes that look vegan or could be made vegan with a small change. Note what to ask about.
- Don't fabricate dishes. Only list what you can actually read.
- Skip clearly non-vegan dishes (the user knows a chicken burger isn't vegan).`

export async function scanImage(
  dataUrl: string,
  tool: ToolName,
): Promise<{ result: ScanResult; costUsd: number }> {
  const prompt = tool === 'ingredient' ? INGREDIENT_PROMPT : MENU_PROMPT

  const resp = await openai<ChatResp>({
    model: SCAN_MODEL,
    max_tokens: 800,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
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

  const inTok = resp.usage?.prompt_tokens ?? 2000
  const outTok = resp.usage?.completion_tokens ?? 400
  return {
    result: parsed,
    costUsd: estimateCostUsd(SCAN_MODEL, inTok, outTok),
  }
}
