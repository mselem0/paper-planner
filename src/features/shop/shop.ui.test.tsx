import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cfg = vi.hoisted(() => ({ number: '201234567890' }))
vi.mock('./config', async (importOriginal) => {
  const real = await importOriginal<typeof import('./config')>()
  return { ...real, get WHATSAPP_NUMBER() { return cfg.number } }
})

import { ILLUSTRATIVE_LABEL, PAGES } from './config'
import { ShopPage } from './ShopPage'

const setup = () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/shop']}><ShopPage /></MemoryRouter>)
  return user
}
const buy = () => screen.getByRole('button', { name: 'اطلب البلانر' })

beforeEach(() => { cfg.number = '201234567890' })
afterEach(() => { vi.restoreAllMocks() })

describe('shop page', () => {
  it('shows the automatic scan story in order without manual page controls', () => {
    setup()
    const story = screen.getByRole('region', { name: 'تصور توضيحي لمسح صفحة البلانر' })
    expect(Array.from(story.querySelectorAll('[data-page]')).map((page) => page.getAttribute('data-page')))
      .toEqual(['cover'])
    expect(within(story).getByLabelText('دفتر بلانر ورقي مفتوح')).toBeInTheDocument()
    expect(story.querySelectorAll('[class*=rings] i')).toHaveLength(6)
    expect(story.querySelector('[data-camera-preview=true]')).toBeInTheDocument()
    expect(within(story).getByRole('button', { name: 'إعادة عرض التصور' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'الصفحة التالية' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'الصفحة السابقة' })).toBeNull()
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.getByTestId('illustrative-label')).toHaveTextContent(ILLUSTRATIVE_LABEL)
    expect(screen.getByText('Designed by : Rodaina')).toBeInTheDocument()
    expect(screen.getByText('Developed by Mohamed selem')).toBeInTheDocument()
    expect(document.querySelector('main')).toHaveAttribute('dir', 'rtl')
  })

  it('the story images have their intrinsic dimensions', () => {
    setup()
    const cover = document.querySelector<HTMLImageElement>('[data-page=cover] img')
    expect(cover).toHaveAttribute('src', expect.stringContaining('/shop/cover.webp'))
    expect(cover).toHaveAttribute('alt', '')
  })
})

describe('order sheet', () => {
  it('opens as a modal dialog, closes on Escape and returns focus to the Buy button', async () => {
    const user = setup()
    await user.click(buy())
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('2027 Planner')
    expect(within(dialog).getByText(ILLUSTRATIVE_LABEL)).toBeInTheDocument()
    expect(within(dialog).getByText(/السعر والشحن والتوفر بيتأكدوا في المحادثة/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(buy()).toHaveFocus()
  })

  it('closes on backdrop click and traps Tab inside', async () => {
    const user = setup()
    await user.click(buy())
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 12; i++) { await user.tab(); expect(dialog.contains(document.activeElement)).toBe(true) }
    await user.click(dialog.parentElement!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('links to wa.me with the Arabic message for the page being viewed', async () => {
    const user = setup()
    await user.click(buy())
    await user.type(screen.getByLabelText('الاسم (اختياري)'), 'منى')
    await user.type(screen.getByLabelText('ملاحظة (اختياري)'), 'A&B')
    const link = screen.getByRole('link', { name: 'كمّل على واتساب' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    const url = new URL(link.getAttribute('href')!)
    expect(url.origin + url.pathname).toBe('https://wa.me/201234567890')
    const text = url.searchParams.get('text')!
    expect(text).toContain('2027 Planner')
    expect(text).toContain('الاسم: منى')
    expect(text).toContain('ملاحظة: A&B')
    expect(text).toContain(`(كنت بشوف صفحة: ${PAGES[0].label})`)
  })

  it('with no number it shows a notice and opens nothing', async () => {
    cfg.number = ''
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const user = setup()
    await user.click(buy())
    expect(screen.queryByRole('link', { name: 'كمّل على واتساب' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'كمّل على واتساب' }))
    expect(screen.getByRole('alert')).toHaveTextContent('رقم واتساب')
    expect(open).not.toHaveBeenCalled()
  })

  it('goes offline: button says "محتاج إنترنت" and is disabled', async () => {
    const user = setup()
    await user.click(buy())
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    window.dispatchEvent(new Event('offline'))
    expect(await screen.findByRole('button', { name: 'محتاج إنترنت' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'كمّل على واتساب' })).toBeNull()
  })
})
