import { MESSAGE_TEMPLATE as T, PRODUCT_NAME } from './config'

export interface WhatsAppMessage { text: string; url: string | null }

/** Builds the prefilled Arabic order message and its wa.me link (url is null when no number is configured). */
export function buildWhatsAppMessage(
  input: { name?: string; note?: string; pageLabel: string },
  number: string,
  product: string = PRODUCT_NAME,
): WhatsAppMessage {
  const name = (input.name ?? '').trim()
  const note = (input.note ?? '').trim()
  const lines = [T.intro(product)]
  if (name) lines.push(T.name(name))
  if (note) lines.push(T.note(note))
  lines.push(T.page(input.pageLabel))
  const text = lines.join('\n')
  const digits = (number ?? '').replace(/\D/g, '')
  return { text, url: digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null }
}
