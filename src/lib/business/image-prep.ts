// Browser-side file preparation for the owner menu import. Same limits as the
// visitor menu scanner (1600px JPEG, PDFs rendered to page images).

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82

export async function imageFileToDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * ratio)
  const h = Math.round(bmp.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

export async function menuFileToDataUrls(file: File): Promise<string[]> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (isPdf) {
    const { pdfToImages } = await import('@/app/tools/_components/pdf-to-images')
    return pdfToImages(file)
  }
  if (!file.type.startsWith('image/')) throw new Error('Please use a photo (JPG, PNG, HEIC) or a PDF.')
  return [await imageFileToDataUrl(file)]
}
