import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ScanStory from './ScanStory'
import { PAGES, PRODUCT_NAME } from './config'

const scene = () => screen.getByLabelText('تصور توضيحي لمسح صفحة البلانر').querySelector('[class*="scene"]')!

describe('ScanStory', () => {
  it('uses the configured planner name and presents the illustrative scan limitation', () => {
    render(<ScanStory />)
    expect(screen.getByText(PRODUCT_NAME)).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('تصور توضيحي لميزة الاسكان — قيد التطوير')).toBeInTheDocument()
    expect(screen.getByText('أفكار مشروع التخرج')).toBeInTheDocument()
    expect(screen.getByText('ترتيب المراجع ومراجعة المقدمة')).toBeInTheDocument()
    expect(screen.getByText('تجهيز المسودة الأولى')).toBeInTheDocument()
    expect(screen.getByText('إنهاء الفصل الأول قبل الخميس')).toBeInTheDocument()
  })

  it('turns through the real planner page assets in one fixed story with no carousel controls', () => {
    render(<ScanStory />)
    const pages = Array.from(document.querySelectorAll('[data-page]'))
    expect(pages.map((node) => node.getAttribute('data-page'))).toEqual(['cover', 'today', 'week', 'notes'])
    for (const key of ['cover', 'today', 'week', 'notes']) {
      const definition = PAGES.find((item) => item.key === key)!
      expect(document.querySelector(`[data-page="${key}"] img`)).toHaveAttribute('src', definition.img)
    }
    expect(screen.getByLabelText('تصور توضيحي للتطبيق')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة عرض التصور' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'الصفحة التالية' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'صفحة اليوم' })).toBeNull()
  })

  it('holds the sequence when paused and resumes when the document becomes visible', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const { rerender } = render(<ScanStory paused />)
    expect(scene().className).toContain('paused')
    rerender(<ScanStory />)
    expect(scene().className).not.toContain('paused')

    hidden.mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(scene().className).toContain('paused')
    hidden.mockReturnValue(false)
    fireEvent(document, new Event('visibilitychange'))
    expect(scene().className).not.toContain('paused')
    hidden.mockRestore()
  })

  it('restarts the scene immediately from the replay control', () => {
    render(<ScanStory />)
    const originalScene = scene()
    fireEvent.click(screen.getByRole('button', { name: 'إعادة عرض التصور' }))
    expect(screen.getByText('أُعيد العرض')).toBeInTheDocument()
    expect(scene()).not.toBe(originalScene)
  })
})
