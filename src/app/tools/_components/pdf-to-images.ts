// Client-side PDF -> page-images converter. Lazy-imported so pdfjs-dist
// (~500KB) doesn't bloat the initial bundle.

const MAX_PAGES = 5
const PDF_RENDER_SCALE = 2 // 2x for OCR-friendly resolution
const JPEG_QUALITY = 0.82

export async function pdfToImages(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  // pdfjs needs its worker. Bundle uses module worker, point at the matching
  // version from the CDN (pdfjs-dist publishes the worker alongside the lib).
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const pages = Math.min(doc.numPages, MAX_PAGES)

  const images: string[] = []
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    // White background so transparent PDFs render readably
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // @ts-expect-error - newer pdfjs typings split render into a sub-options object
    await page.render({ canvasContext: ctx, viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    canvas.width = 0 // free GPU memory
  }
  return images
}
