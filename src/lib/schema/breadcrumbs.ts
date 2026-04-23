/**
 * BreadcrumbList JSON-LD helpers.
 *
 * Google uses BreadcrumbList to show hierarchical breadcrumbs under the
 * blue link in SERPs (e.g. "plantspack.com › Vegan Places › Germany › Berlin")
 * instead of the raw URL path. Also a signal that deeper pages are organized,
 * which helps indexation of 4-clicks-deep place pages.
 *
 * https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 */

export interface BreadcrumbItem {
  name: string
  /** Absolute URL. Pass full https URL; Google wants absolute paths here. */
  url: string
}

/**
 * Build a BreadcrumbList JSON-LD object for a hierarchical path.
 *
 * @param items Breadcrumb items in order: [root, level1, ..., current]
 * @returns An object ready to JSON.stringify into a script[type="application/ld+json"] tag.
 */
export function buildBreadcrumbs(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/** Site root — every breadcrumb chain starts here. */
export const HOME_CRUMB: BreadcrumbItem = {
  name: 'Home',
  url: 'https://plantspack.com',
}
