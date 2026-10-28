// Resized WebP copies of our own Storage images, made once by
// scripts/make-image-variants.ts (sharp, local, free). They replace Vercel
// image optimisation, which bills per transformation and per cache write.
//
//   {bucket}/{name}.{ext}?v=abc  ->  {bucket}/variants/{name}.abc.w400.webp
//
// The ?v token is part of the variant name, so a replaced image never shows a
// stale variant: until the script runs again the variant 404s and <Img> falls
// back to the original.

const OWN_STORAGE = /^(https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/(?:place-images|city-images))\/([^?#]+)(?:\?v=([\w-]+))?$/

export const VARIANT_WIDTHS = [400, 960] as const

export function variantName(file: string, v?: string | null): (w: number) => string {
  const base = file.replace(/\.[a-z0-9]+$/i, '')
  return (w) => `variants/${base}${v ? `.${v}` : ''}.w${w}.webp`
}

/** srcSet for an image in our own buckets, or null for any other host. */
export function variantSrcSet(src: string | null | undefined, originalWidth = 1200): string | null {
  if (!src) return null
  const m = OWN_STORAGE.exec(src)
  if (!m || m[2].startsWith('variants/')) return null
  const name = variantName(m[2], m[3])
  return [...VARIANT_WIDTHS.map((w) => `${m[1]}/${name(w)} ${w}w`), `${src} ${originalWidth}w`].join(', ')
}
