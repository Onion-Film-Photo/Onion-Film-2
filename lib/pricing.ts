export const TIERS = [
  { label: 'Free',       max: 10,       price: 0  },
  { label: 'Basic',      max: 50,       price: 19 },
  { label: 'Standard',   max: 100,      price: 39 },
  { label: 'Premium',    max: 200,      price: 69 },
  { label: 'Enterprise', max: Infinity, price: 99 },
] as const

export type Tier = (typeof TIERS)[number]

export function getTier(guestLimit: number): Tier {
  return TIERS.find(t => guestLimit <= t.max) ?? TIERS[TIERS.length - 1]
}
