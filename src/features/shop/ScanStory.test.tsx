import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ScanStory from './ScanStory'

const scene = () => screen.getByLabelText('تصور توضيحي لمسح صفحة البلانر').querySelector('[class*="scene"]')!

describe('ScanStory', () => {
  it('presents the planner notes and the illustrative scan limitation', () => {
    render(<ScanStory />)
    expect(screen.getByText('تصور توضيحي لميزة الاسكان — قيد التطوير')).toBeInTheDocument()
    expect(screen.getAllByText('أفكار مشروع التخرج')[0]).toBeInTheDocument()
    expect(screen.getAllByText('ترتيب المراجع ومراجعة المقدمة')[0]).toBeInTheDocument()
    expect(screen.getAllByText('تجهيز المسودة الأولى')[0]).toBeInTheDocument()
    expect(screen.getAllByText('إنهاء الفصل الأول قبل الخميس')[0]).toBeInTheDocument()
  })

  it('shows print stationery and a physical binder before the in-phone camera handoff', () => {
    render(<ScanStory />)
    expect(screen.getByLabelText('دفتر بلانر ورقي مفتوح')).toBeInTheDocument()
    expect(document.querySelectorAll('[class*="rings"] i')).toHaveLength(6)
    expect(document.querySelector('[data-page="cover"] img')).toHaveAttribute('src', expect.stringContaining('/shop/cover.webp'))
    expect(screen.getByText('الأسبوع · ١٢ — ١٨ يناير')).toBeInTheDocument()
    expect(screen.getByText('الثلاثاء · ١٣ يناير')).toBeInTheDocument()
    expect(document.querySelector('[data-camera-preview="true"]')).toBeInTheDocument()
    expect(document.querySelector('[data-capture-flash="true"]')).toBeInTheDocument()
    expect(document.querySelector('[data-page="today"]')).toBeNull()
    expect(screen.getByLabelText('تصور توضيحي لشاشة الملاحظات في التطبيق')).toBeInTheDocument()
    expect(document.querySelector('[aria-label="Notes"]')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="page"]')?.textContent).toContain('Notes')
    expect(document.querySelectorAll('[class*="demoCard"]')).toHaveLength(2)
    expect(document.querySelector('[aria-label="Notes"]')?.closest('[aria-hidden="true"]')).toBeInTheDocument()
    expect(document.querySelector('[class*="demoNew"]')?.textContent).toContain('New page')
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
