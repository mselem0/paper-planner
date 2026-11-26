/** Shared types for the scan engine (pure data; no DOM). */

export interface Marker { id: number; x: number; y: number; size: number; center: [number, number] }

interface FieldBase { id: string; maps_to: string }
export interface DotField extends FieldBase { kind: 'dot'; cx: number; cy: number; r: number }
export interface SymbolCircleField extends FieldBase { kind: 'symbol-circle'; cx: number; cy: number; r: number; symbols: string[] }
export interface BoxesField extends FieldBase {
  kind: 'choice-boxes'
  boxes: { value: string; x: number; y: number; s: number }[]
}
export interface LineField extends FieldBase { kind: 'text-line' | 'amount'; x: number; y: number; w: number; h: number }
export type TemplateField = DotField | SymbolCircleField | BoxesField | LineField

export interface PageTemplate {
  schema: string
  product: string
  layout_version: number
  page_type: string
  page_size_mm: [number, number]
  dropout_color: string
  markers: { dictionary: string; items: Marker[] }
  qr: { x: number; y: number; size: number; payload: string; ecc: string; modules?: number }
  fields: TemplateField[]
  thresholds: { dot_filled_min_ratio: number; box_filled_min_ratio: number; ink_gray_max: number }
}

/** Parsed `P27:<layout>:<type>:<key>` page code. */
export interface PageCode { raw: string; product: 'P27'; layout: number; type: string; key: string }

export type ScanErrorCode = 'bad_image' | 'markers_missing' | 'qr_unreadable' | 'template_unsupported'
export interface ScanError { code: ScanErrorCode; message: string; missing?: number[]; pageId?: string }

export type CellKind = TemplateField['kind']

/**
 * One reading of one template field.
 * value: dot -> filled; choice-boxes -> picked box value or null (none / ambiguous);
 *        symbol-circle -> has a mark (which symbol it is needs a human/recogniser); text-line/amount -> has writing.
 */
export interface ScanCell {
  id: string
  kind: CellKind
  /** Store path from the template, e.g. `weeks[2027-01-17].habits[0].done[3]`. */
  mapsTo: string
  value: boolean | string | null
  /** 0..1, how far the measurement is from the decision threshold. */
  confidence: number
  /** The measurement is close to a threshold or ambiguous: highlight it on the review screen. */
  uncertain: boolean
  /** Needs a human look even if the measurement is clear: any written line / drawn symbol (content is not read on-device), or uncertain. */
  needsReview: boolean
  ambiguous?: boolean
  /** Ink ratio (dot / symbol / line) used for the decision. */
  ratio?: number
  /** Per-box ink ratios (choice-boxes). */
  ratios?: Record<string, number>
  /** Flat-page crop for review / handwriting recognition (symbol-circle & text-line, when there is writing). */
  crop?: ImageData
}

export interface ScanOk {
  ok: true
  pageId: string
  page: PageCode
  /** `week.v1` style id of the template used. */
  templateId: string
  cells: ScanCell[]
  byId: Record<string, ScanCell>
  /** Detected marker centres in source-image pixels (ids 0..3), useful for a camera overlay. */
  markers: Record<number, [number, number]>
  /** Flat page at 8 px/mm; only present with `keepFlat`. */
  flat?: ImageData
}
export interface ScanFail { ok: false; error: ScanError }
export type ScanResult = ScanOk | ScanFail

export interface ScanOptions {
  /** Produce crops for every symbol-circle / text-line, not only the marked ones. */
  cropAll?: boolean
  /** Return the warped page in the result (debug / review UI). */
  keepFlat?: boolean
}
