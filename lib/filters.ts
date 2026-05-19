export const FILTERS = [
  { id: 'natural',     label: 'Natural',     css: 'none' },
  { id: 'noir',        label: 'Noir',        css: 'grayscale(100%) contrast(1.2)' },
  { id: 'golden_hour', label: 'Golden Hour', css: 'sepia(40%) saturate(1.4) brightness(1.1)' },
  { id: 'dreamy',      label: 'Dreamy',      css: 'brightness(1.1) saturate(0.8) contrast(0.9)' },
  { id: 'kodak_pop',   label: 'Kodak Pop',   css: 'saturate(1.6) contrast(1.15) brightness(1.05)' },
] as const

export type FilterId = (typeof FILTERS)[number]['id']

export function getFilter(id: FilterId) {
  return FILTERS.find(f => f.id === id) ?? FILTERS[0]
}
