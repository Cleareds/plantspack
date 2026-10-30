import { ORGANISATION_GROUP_LABELS, PLACE_SUBCATEGORIES, isPlaceCategory, type OrganisationGroup } from '@/shared/place-categories'

/** The <option>s of a "Type" select for one category, from the shared list.
 *  A current value that is not in the list (old data) stays selectable, so
 *  opening and saving a form never changes the type behind the editor's back. */
export default function PlaceTypeOptions({ category, current, placeholder = '- choose -' }: {
  category: string
  current?: string | null
  placeholder?: string
}) {
  const list = isPlaceCategory(category) ? PLACE_SUBCATEGORIES[category] : []
  const legacy = current && !list.some(s => s.value === current) ? current : null
  const groups = [...new Set(list.map(s => s.group).filter(Boolean))] as OrganisationGroup[]
  return (
    <>
      <option value="">{placeholder}</option>
      {legacy && <option value={legacy}>{legacy} (old value)</option>}
      {groups.length > 0
        ? groups.map(g => (
            <optgroup key={g} label={ORGANISATION_GROUP_LABELS[g]}>
              {list.filter(s => s.group === g).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </optgroup>
          ))
        : list.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
    </>
  )
}
