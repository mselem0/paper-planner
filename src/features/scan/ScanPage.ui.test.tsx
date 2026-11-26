import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ scanPage: vi.fn() }))
vi.mock('./engine', () => ({ scanPage: mock.scanPage, cropToDataUrl: () => 'data:image/png;base64,AAAA' }))
vi.mock('./decode', () => ({ decodeImage: async () => ({}) }))

import { getWeek, useStore } from '../../store'
import { ScanPage } from './ScanPage'
import { WEEK, cell, scanOf } from './testkit'

const Where = () => <div data-testid="where">{useLocation().pathname}</div>
const setup = () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/scan']}>
      <Routes><Route path="/scan" element={<ScanPage />} /><Route path="/w/:d" element={<Where />} /></Routes>
    </MemoryRouter>,
  )
  return user
}
const upload = async (user: ReturnType<typeof userEvent.setup>) =>
  user.upload(screen.getByTestId('scan-camera') as HTMLInputElement, new File(['x'], 'p.jpg', { type: 'image/jpeg' }))
const stored = () => getWeek(useStore.getState(), WEEK)

beforeEach(() => { useStore.getState().resetAll(); mock.scanPage.mockReset() })

describe('scan page', () => {
  it('offers camera capture and gallery pick', () => {
    setup()
    expect(screen.getByTestId('scan-camera')).toHaveAttribute('capture', 'environment')
    expect(screen.getByTestId('scan-gallery')).not.toHaveAttribute('capture')
    expect(screen.getByText(/بقلم داكن/)).toBeInTheDocument()
  })

  it.each([
    ['markers_missing', /الصفحة كلها/],
    ['template_unsupported', /غير مدعومة/],
    ['qr_unreadable', /رمز الصفحة/],
    ['bad_image', /تعذّر فتح الصورة/],
  ])('shows a friendly error for %s with retry', async (code, re) => {
    mock.scanPage.mockResolvedValue({ ok: false, error: { code, message: 'x' } })
    const user = setup()
    await upload(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(re)
    expect(screen.getByRole('button', { name: /حاول مرة أخرى/ })).toBeInTheDocument()
  })

  it('reviews, flags, handles a conflict (default keep) and applies only on confirm', async () => {
    const st = useStore.getState()
    const id = st.addTask(WEEK, 0, 'old task')
    st.updateTask(WEEK, 0, id, { status: 'ok' })
    mock.scanPage.mockResolvedValue(scanOf([
      cell('h0d0', 'dot', 'weeks[DATE].habits[0].done[0]', true),
      cell('h0d1', 'dot', 'weeks[DATE].habits[0].done[1]', false, { uncertain: true }),
      cell('t00', 'text-line', 'weeks[DATE].days[0][0].text', true, { needsReview: true, crop: {} as ImageData }),
      cell('s00', 'choice-boxes', 'weeks[DATE].days[0][0].status', 'delay'),
      cell('t11', 'text-line', 'weeks[DATE].days[1][1].text', true, { needsReview: true, crop: {} as ImageData }),
      cell('s11', 'symbol-circle', 'weeks[DATE].days[1][1].status', true, { needsReview: true }),
      cell('t30', 'text-line', 'weeks[DATE].days[3][0].text', false),
      cell('s30', 'choice-boxes', 'weeks[DATE].days[3][0].status', null),
    ]))
    const user = setup()
    await upload(user)
    await screen.findByText('راجع قبل الحفظ')
    expect(stored().habits[0].done[0]).toBe(false) // nothing written before confirm

    // blank row hidden by default
    expect(screen.queryByLabelText('الخميس - مهمة 1')).toBeNull()
    expect(screen.getByRole('button', { name: /إظهار الأسطر الفارغة \(1\)/ })).toBeInTheDocument()
    // prefilled with the existing text; handwriting crop shown
    expect(screen.getByLabelText('الأحد - مهمة 1')).toHaveValue('old task')
    expect(screen.getAllByRole('img', { name: /خط يد/ }).length).toBeGreaterThan(0)
    // symbol-circle: nothing preselected, flagged
    const sym = screen.getByRole('radiogroup', { name: /^حالة الاثنين - مهمة 2/ })
    expect(within(sym).getAllByRole('radio').every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true)
    expect(within(sym).getByText(/اختر الحالة/)).toBeInTheDocument()
    // choice box preselected
    expect(within(screen.getByRole('radiogroup', { name: /^حالة الأحد - مهمة 1/ })).getByRole('radio', { name: 'تأجيل' })).toBeChecked()

    await user.clear(screen.getByLabelText('الأحد - مهمة 1'))
    await user.type(screen.getByLabelText('الأحد - مهمة 1'), 'new task')
    await user.type(screen.getByLabelText('الاثنين - مهمة 2'), 'call mom')
    await user.click(within(sym).getByRole('radio', { name: 'تم' }))
    await user.click(screen.getByRole('button', { name: 'عادة 1 - الاثنين' })) // user turns an extra dot on

    const conflicts = screen.getByRole('region', { name: 'تعارضات' })
    expect(within(conflicts).getAllByRole('radiogroup')).toHaveLength(2) // text + status
    expect(within(conflicts).getAllByRole('radio', { name: /إبقاء/ }).every((r) => (r as HTMLInputElement).checked)).toBe(true)
    await user.click(within(conflicts).getAllByRole('radio', { name: /استبدال/ })[0]) // replace the text only

    await user.click(screen.getByRole('button', { name: /حفظ 5 تغيير/ }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(`/w/${WEEK}`))
    expect(stored().habits[0].done.slice(0, 2)).toEqual([true, true])
    expect(stored().days[0][0]).toMatchObject({ text: 'new task', status: 'ok' }) // status conflict kept
    expect(stored().days[1][1]).toMatchObject({ text: 'call mom', status: 'ok' })
    expect(stored().days[1][0]).toMatchObject({ text: '', status: null }) // padded
  })
})
