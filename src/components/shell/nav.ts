import { MONTHS } from '../../lib/months'

export const MONTH_LINKS = MONTHS.map((m) => ({ to: `/m/${m.n}`, ...m }))
export const QUARTER_LINKS = [1, 2, 3, 4].map((q) => ({ to: `/q/${q}`, q }))
