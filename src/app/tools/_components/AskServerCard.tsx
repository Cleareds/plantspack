'use client'

import { useState } from 'react'
import { MessageSquare, Printer, Copy, Check } from 'lucide-react'
import { RESTAURANT_CARDS, ALSO_AVOID_PREFIX, translateAllergen } from '../cards/cards-data'
import type { ScanResult } from '@/lib/tool-quota'

// Translated wrapper template. {dishes} is replaced with a quoted list of the
// dish names the user wants to ask about. Falls back to English if missing.
const ASK_TEMPLATE: Record<string, { intro: string; ask: string; thanks: string }> = {
  en: {
    intro: 'Hello! I am vegan and would like to order:',
    ask: 'Could you confirm these dishes contain no meat, fish, shellfish, eggs, dairy, butter, cheese, cream, or honey? If any do, could the kitchen prepare them without?',
    thanks: 'Thank you so much for your help.',
  },
  es: {
    intro: '¡Hola! Soy vegano y me gustaría pedir:',
    ask: '¿Podría confirmar que estos platos no contienen carne, pescado, marisco, huevos, lácteos, mantequilla, queso, nata ni miel? Si alguno los contiene, ¿podrían prepararlo sin esos ingredientes?',
    thanks: 'Muchas gracias por su ayuda.',
  },
  fr: {
    intro: 'Bonjour ! Je suis végane et je voudrais commander :',
    ask: 'Pourriez-vous confirmer que ces plats ne contiennent pas de viande, poisson, fruits de mer, œufs, produits laitiers, beurre, fromage, crème ou miel ? Si certains en contiennent, la cuisine pourrait-elle les préparer sans ces ingrédients ?',
    thanks: 'Merci beaucoup pour votre aide.',
  },
  de: {
    intro: 'Hallo! Ich lebe vegan und möchte gerne bestellen:',
    ask: 'Könnten Sie bestätigen, dass diese Gerichte kein Fleisch, Fisch, Meeresfrüchte, Eier, Milchprodukte, Butter, Käse, Sahne oder Honig enthalten? Falls doch, könnte die Küche sie ohne diese Zutaten zubereiten?',
    thanks: 'Vielen Dank für Ihre Hilfe.',
  },
  it: {
    intro: 'Salve! Sono vegano e vorrei ordinare:',
    ask: 'Potrebbe confermare che questi piatti non contengono carne, pesce, frutti di mare, uova, latticini, burro, formaggio, panna o miele? Se alcuni li contengono, la cucina potrebbe prepararli senza?',
    thanks: 'Grazie mille per il vostro aiuto.',
  },
  pt: {
    intro: 'Olá! Sou vegano e gostaria de pedir:',
    ask: 'Poderia confirmar que estes pratos não contêm carne, peixe, marisco, ovos, lacticínios, manteiga, queijo, natas ou mel? Se algum contiver, a cozinha poderia prepará-los sem esses ingredientes?',
    thanks: 'Muito obrigado pela sua ajuda.',
  },
  ja: {
    intro: 'こんにちは。私はヴィーガンで、以下を注文したいです：',
    ask: 'これらの料理に肉、魚、貝、卵、乳製品、バター、チーズ、クリーム、はちみつが含まれていないことを確認していただけますか？もし含まれている場合、これらを使わずに作ってもらえますか？',
    thanks: 'ご協力ありがとうございます。',
  },
  th: {
    intro: 'สวัสดีค่ะ/ครับ ฉันเป็นวีแกน อยากสั่ง:',
    ask: 'รบกวนตรวจสอบให้หน่อยได้ไหมว่าเมนูเหล่านี้ไม่มีเนื้อสัตว์ ปลา อาหารทะเล ไข่ ผลิตภัณฑ์จากนม เนย ชีส ครีม หรือน้ำผึ้ง? ถ้ามี ครัวสามารถทำให้โดยไม่ใส่สิ่งเหล่านั้นได้ไหม?',
    thanks: 'ขอบคุณมากค่ะ/ครับ',
  },
}

interface Props {
  result: ScanResult
  allergens: string[]
}

export default function AskServerCard({ result, allergens }: Props) {
  const candidateItems = (result.items ?? []).filter((i) => i.status !== 'not_vegan')
  const [open, setOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState('en')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(candidateItems.filter((i) => i.status === 'uncertain').map((i) => i.name)),
  )
  const [copied, setCopied] = useState(false)

  if (candidateItems.length === 0) return null

  const lang = ASK_TEMPLATE[selectedLang] ? selectedLang : 'en'
  const template = ASK_TEMPLATE[lang]
  const card = RESTAURANT_CARDS.find((c) => c.lang === lang)
  const isRtl = lang === 'ar' || lang === 'he' || lang === 'ur'

  const dishList = Array.from(selectedItems)

  function toggleItem(name: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const fullText = [
    template.intro,
    dishList.map((d) => `  - ${d}`).join('\n'),
    '',
    template.ask,
    allergens.length > 0
      ? `${ALSO_AVOID_PREFIX[lang] ?? ALSO_AVOID_PREFIX.en}: ${allergens.map((a) => translateAllergen(a, lang)).join(', ')}.`
      : '',
    '',
    template.thanks,
  ].filter(Boolean).join('\n')

  async function copyText() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl ghost-border bg-surface text-on-surface font-semibold hover:border-primary/30 mt-3"
      >
        <MessageSquare className="h-4 w-4" />
        Generate ask-the-server card
      </button>
    )
  }

  return (
    <div className="mt-4 rounded-2xl ghost-border bg-surface-container-lowest overflow-hidden print:shadow-none">
      <div className="p-4 flex items-center justify-between border-b border-on-surface/10 print:hidden">
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <MessageSquare className="h-4 w-4 text-primary" />
          Ask-the-server card
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-on-surface-variant hover:text-on-surface"
        >
          Close
        </button>
      </div>

      <div className="p-4 print:hidden">
        <label className="block text-xs font-semibold text-on-surface-variant mb-2">Show in</label>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          className="w-full px-3 py-2 rounded-lg ghost-border bg-surface text-on-surface text-sm focus:outline-none focus:border-primary mb-4"
        >
          {RESTAURANT_CARDS.filter((c) => ASK_TEMPLATE[c.lang]).map((c) => (
            <option key={c.lang} value={c.lang}>
              {c.label} / {c.native}
            </option>
          ))}
        </select>

        <label className="block text-xs font-semibold text-on-surface-variant mb-2">Dishes to ask about</label>
        <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
          {candidateItems.map((item) => (
            <label key={item.name} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={selectedItems.has(item.name)}
                onChange={() => toggleItem(item.name)}
                className="accent-primary"
              />
              <span className="flex-1 min-w-0 truncate">{item.name}</span>
              {item.status === 'uncertain' && (
                <span className="text-xs text-warning font-semibold">Ask</span>
              )}
            </label>
          ))}
        </div>
      </div>

      <article
        className="p-5 md:p-6 bg-surface-container-lowest print:bg-white border-t border-on-surface/10"
        lang={lang}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {card && (
          <div className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3 print:text-black" dir="ltr">
            {card.label} / {card.native}
          </div>
        )}
        <p className="text-on-surface mb-2 print:text-black">{template.intro}</p>
        {dishList.length > 0 && (
          <ul className="mb-3 list-disc list-outside ml-5 text-on-surface print:text-black">
            {dishList.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        <p className="text-on-surface mb-3 print:text-black">{template.ask}</p>
        {allergens.length > 0 && (
          <p className="text-on-surface mb-3 print:text-black">
            <strong>{ALSO_AVOID_PREFIX[lang] ?? ALSO_AVOID_PREFIX.en}:</strong>{' '}
            {allergens.map((a) => translateAllergen(a, lang)).join(', ')}.
          </p>
        )}
        <p className="text-on-surface italic print:text-black">{template.thanks}</p>
      </article>

      <div className="p-4 flex gap-2 print:hidden">
        <button
          onClick={copyText}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl ghost-border bg-surface text-on-surface text-sm font-semibold hover:border-primary/30"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy text'}
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>
    </div>
  )
}
