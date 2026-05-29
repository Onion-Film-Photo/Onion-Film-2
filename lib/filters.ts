import type { GlParams } from './webglFilm'

export type FilterDef = {
  id:          string
  label:       string
  description: string
  // CSS string for live viewfinder preview
  css:         string
  // Path to reference photo in /public (already shot on that film stock)
  // null = use gradient swatch
  previewImage: string | null
  // null = passthrough (Natural)
  gl:          GlParams | null
}

export const FILTERS: FilterDef[] = [
  {
    id:           'natural',
    label:        'Natural',
    description:  'No filter — true to life',
    css:          'none',
    previewImage: null,
    gl:           null,
  },
  {
    id:           'ilford_hp5',
    label:        'Ilford HP5',
    description:  'Punchy B&W, high contrast',
    css:          'grayscale(100%) contrast(1.2) brightness(1.05)',
    previewImage: '/Ilford.jpg',
    gl: {
      // HP5 spectral response: more red-sensitive, less blue-sensitive than standard luminance
      matrix:     [0.28, 0.62, 0.10,  0.28, 0.62, 0.10,  0.28, 0.62, 0.10],
      offset:     [0, 0, 0],
      saturation: 0.0,   // full B&W
      contrast:   0.3,   // punchy S-curve
      shadowLift: 0.02,  // slight film-base lift
      grain:      0.035, // noticeable grain (HP5 400 ISO)
      vignette:   0.25,
    },
  },
  {
    id:           'kodak_portra',
    label:        'Kodak Portra 400',
    description:  'Warm, creamy skin tones',
    css:          'contrast(0.95) saturate(0.85) brightness(1.08) sepia(15%) hue-rotate(3deg)',
    previewImage: '/Potra-400.jpg',
    gl: {
      // Warm cast: pull reds up, reduce blue, mix green warmth
      matrix:     [1.06, 0.04, -0.05,   0.00, 0.97, 0.02,   -0.01, 0.02, 0.87],
      offset:     [0.010, 0.005, -0.010],
      saturation: 0.88,  // natural, slightly desaturated
      contrast:   0.05,  // gentle S-curve (Portra is low-contrast)
      shadowLift: 0.025, // lifted toe
      grain:      0.012, // fine-grained for 400 ISO
      vignette:   0.15,
    },
  },
  {
    id:           'fuji_pro',
    label:        'Fuji Pro 400H',
    description:  'Cool, airy, soft pastels',
    css:          'contrast(0.9) saturate(0.72) brightness(1.12) hue-rotate(-12deg)',
    previewImage: '/Fuji-Pro-400.jpg',
    gl: {
      // Fuji "green": slight G boost, reduce R, boost B (cool)
      matrix:     [0.94, 0.01, 0.00,   0.01, 1.01, 0.00,   0.01, 0.02, 1.05],
      offset:     [-0.010, 0.010, 0.020],
      saturation: 0.72,  // strongly desaturated pastels
      contrast:   0.0,   // flat (Fuji Pro 400H is very low contrast)
      shadowLift: 0.05,  // airy, lifted shadows
      grain:      0.010, // very fine grain
      vignette:   0.10,
    },
  },
]

// Video-only filter — not shown in the photo filter picker
export const VIDEO_FILTER: FilterDef = {
  id:           'super8',
  label:        'Super 8',
  description:  'Warm tungsten grade, film grain, vignette',
  css:          'contrast(1.05) saturate(0.8) brightness(0.95) sepia(20%) hue-rotate(8deg)',
  previewImage: null,
  gl: {
    // Kodak Vision3 200T tungsten reference: warm shadows, slight green-red push in mids
    matrix:     [1.08, 0.03, -0.02,  0.01, 0.98, 0.00,  -0.02, 0.01, 0.82],
    offset:     [0.015, 0.005, -0.020],
    saturation: 0.80,  // slightly desaturated (film look)
    contrast:   0.12,  // gentle S-curve
    shadowLift: 0.03,  // warm lifted toe
    grain:      0.030, // visible grain (200T ISO)
    vignette:   0.35,  // stronger vignette for home-movie feel
  },
}

export type FilterId = 'natural' | 'ilford_hp5' | 'kodak_portra' | 'fuji_pro'
export type VideoFilterId = 'super8'

export function getFilter(id: string): FilterDef {
  return FILTERS.find(f => f.id === id) ?? FILTERS[0]
}
