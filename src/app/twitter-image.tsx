// Twitter card uses the same composition as the OpenGraph image.
// Next.js (Turbopack) requires route config to be statically parseable,
// so re-exporting `runtime` etc. from another file is rejected. We
// declare them literally and import only the default render function.
import OgImage from './opengraph-image'

export const runtime = 'edge'
export const alt = 'PlantsPack — vegan places, ranked by the community'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default OgImage
