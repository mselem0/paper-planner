/**
 * Template registry. The JSON files live in docs/print-scan/templates/ (the single source shared with the
 * print design and the Python reference tools) and are imported from there, not copied.
 */
import week1 from '../../../../docs/print-scan/templates/week.v1.json'
import type { PageCode, PageTemplate } from './types'

/** QR page-type letter -> template page_type (SPEC §4). Only the week page has a template so far. */
const TYPE_NAMES: Record<string, string> = { W: 'week' }

const TEMPLATES: Record<string, PageTemplate> = {
  'week.v1': week1 as unknown as PageTemplate,
}

/** Parse `P27:<layout>:<type>:<key>`; null when it is not one of ours. The key may itself contain ':'. */
export function parsePageCode(raw: string): PageCode | null {
  const [product, layout, type, ...rest] = raw.trim().split(':')
  const key = rest.join(':')
  if (product !== 'P27' || !/^\d+$/.test(layout ?? '') || !type || !key) return null
  return { raw: raw.trim(), product: 'P27', layout: Number(layout), type, key }
}

export const templateId = (code: PageCode): string | null => {
  const name = TYPE_NAMES[code.type]
  return name ? `${name}.v${code.layout}` : null
}

export function resolveTemplate(code: PageCode): { id: string; template: PageTemplate } | null {
  const id = templateId(code)
  const template = id ? TEMPLATES[id] : undefined
  return id && template ? { id, template } : null
}

/** All registered templates (used to locate the QR before the page type is known). */
export const allTemplates = (): { id: string; template: PageTemplate }[] =>
  Object.entries(TEMPLATES).map(([id, template]) => ({ id, template }))
