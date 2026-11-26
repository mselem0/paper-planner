/** Single place to configure the paper-planner preview ("shop"). */

/** International format, digits only. Set VITE_WHATSAPP_NUMBER at build time; empty = not configured yet. */
export const WHATSAPP_NUMBER: string = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g, '')

export const PRODUCT_NAME = '2027 Planner'

/** Number of days before a previously seen preview may be shown automatically again. */
export const PREVIEW_REPEAT_DAYS = 0

/**
 * The page images are screenshots of the app, not print art. While true, a persistent label says so under the preview and
 * in the order sheet. Only switch off once real print art is supplied and the owner confirms.
 */
export const PAGES_ARE_ILLUSTRATIVE = true

export const ILLUSTRATIVE_LABEL = 'صور توضيحية من شاشات التطبيق، مش صفحات الطباعة النهائية'

export interface ShopPageDef { key: string; img: string; thumb: string; width: number; height: number; label: string }

const base = import.meta.env.BASE_URL
const page = (key: string, label: string): ShopPageDef => ({
  key, label, img: `${base}shop/${key}.webp`, thumb: `${base}shop/${key}-thumb.webp`, width: 780, height: 1548,
})

export const PAGES: readonly ShopPageDef[] = [
  page('cover', 'الغلاف · 2027 Planner'),
  page('today', 'صفحة اليوم'),
  page('week', 'الأسبوع والأولويات'),
  page('month', 'الشهر'),
  page('budget', 'الميزانية'),
  page('year', 'السنة كلها'),
  page('quarter', 'خطة الربع'),
  page('notes', 'النوتس'),
]

export const THUMB_WIDTH = 160
export const THUMB_HEIGHT = 318

export const MESSAGE_TEMPLATE = {
  intro: (product: string) => `أهلاً، عايز أطلب ${product} (البلانر الورقي).`,
  name: (v: string) => `الاسم: ${v}`,
  note: (v: string) => `ملاحظة: ${v}`,
  page: (label: string) => `(كنت بشوف صفحة: ${label})`,
}
