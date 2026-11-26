import { useEffect } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OverlayCoordinator, useOverlayCoordinator } from '../../app/OverlayCoordinator'
import { InstallPrompt } from '../install/InstallPrompt'
import { PreviewExperience } from './PreviewExperience'
import { ILLUSTRATIVE_LABEL } from './config'

function setup(path = '/today', includeInstall = false) {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
  function RouteControls() {
    const navigate = useNavigate()
    return <><button type="button" onClick={() => navigate('/week')}>Navigate route</button><button type="button" onClick={() => navigate('/shop')}>Go to shop</button></>
  }
  return render(<MemoryRouter initialEntries={[path]}>
    <OverlayCoordinator>
      <Routes><Route path="/shop" element={<main>Shop page <RouteControls /></main>} /><Route path="*" element={<main><button type="button">Planner action</button><RouteControls /></main>} /></Routes>
      {includeInstall && <InstallPrompt />}
      <PreviewExperience />
    </OverlayCoordinator>
  </MemoryRouter>, { container: root })
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); vi.useFakeTimers()
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('pointer: coarse') || query.includes('max-width'), media: query, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.querySelector('#root')?.remove() })

describe('global planner preview', () => {
  it('opens once on first visit, later closes it, and the FAB reopens the same preview', async () => {
    setup()
    await act(async () => { vi.advanceTimersByTime(999) })
    expect(screen.queryByTestId('planner-preview-dialog')).toBeNull()
    await act(async () => { vi.advanceTimersByTime(1) })
    vi.useRealTimers()
    expect(await screen.findByTestId('planner-preview-dialog')).toHaveAttribute('aria-modal', 'true')
    expect(await screen.findByTestId('preview-later')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تصفح البلانر' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'اطلب البلانر' })).toBeInTheDocument()
    expect(screen.getByTestId('illustrative-label')).toHaveTextContent(ILLUSTRATIVE_LABEL)
    fireEvent.click(screen.getByTestId('preview-later'))
    expect(screen.queryByTestId('planner-preview-dialog')).toBeNull()
    const fab = await screen.findByTestId('paper-planner-fab')
    fab.focus()
    fireEvent.click(fab)
    expect(await screen.findByTestId('planner-preview-dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تصفح البلانر' })).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.getByTestId('paper-planner-fab')).toHaveFocus()
  })

  it('does not autoplay on /shop and marks that route as seen', async () => {
    setup('/shop')
    await act(async () => { vi.advanceTimersByTime(1200) })
    expect(screen.queryByTestId('planner-preview-dialog')).toBeNull()
    expect(localStorage.getItem('rodaina-planner:preview-seen')).not.toBeNull()
    expect(screen.queryByTestId('paper-planner-fab')).toBeNull()
  })

  it('orders Escape from the BuyDialog before the preview and restores focus', async () => {
    setup()
    const trigger = screen.getByRole('button', { name: 'Planner action' })
    trigger.focus()
    await act(async () => { vi.advanceTimersByTime(1000) })
    vi.useRealTimers()
    await screen.findByTestId('planner-preview-dialog')
    const order = await screen.findByRole('button', { name: 'اطلب البلانر' })
    fireEvent.click(order)
    const buy = await screen.findByRole('dialog', { name: '2027 Planner' })
    expect(buy).toHaveAttribute('aria-modal', 'true')
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '2027 Planner' })).toBeNull())
    expect(screen.getByTestId('planner-preview-dialog')).toBeInTheDocument()
    const nativeFocus = trigger.focus.bind(trigger)
    const focus = vi.spyOn(trigger, 'focus').mockImplementation(() => {
      expect((document.querySelector('#root') as HTMLElement).inert).toBe(false)
      nativeFocus()
    })
    fireEvent.keyDown(order, { key: 'Escape' })
    expect(screen.queryByTestId('planner-preview-dialog')).toBeNull()
    expect(trigger).toHaveFocus()
    expect(focus).toHaveBeenCalled()
    expect((document.querySelector('#root') as HTMLElement).inert).toBe(false)
  })

  it('keeps InstallPrompt pending behind the preview until dismissal', async () => {
    setup('/today', true)
    await act(async () => { vi.advanceTimersByTime(1800) })
    vi.useRealTimers()
    expect(await screen.findByTestId('planner-preview-dialog')).toBeInTheDocument()
    expect(screen.queryByText('Keep your planner close')).toBeNull()
    fireEvent.click(screen.getByTestId('preview-later'))
    expect(await screen.findByText('Keep your planner close')).toBeInTheDocument()
    expect(screen.queryByTestId('planner-preview-dialog')).toBeNull()
  })

  it('keeps a late beforeinstallprompt event queued until the preview closes', async () => {
    setup('/today', true)
    await act(async () => { vi.advanceTimersByTime(1000) })
    vi.useRealTimers()
    expect(await screen.findByTestId('planner-preview-dialog')).toBeInTheDocument()
    const bip = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(bip, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed' }) })
    fireEvent(window, bip)
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1900)) })
    expect(screen.queryByText('Keep your planner close')).toBeNull()
    fireEvent.click(screen.getByTestId('preview-later'))
    expect(await screen.findByText('Keep your planner close')).toBeInTheDocument()
    expect(screen.queryByTestId('planner-preview-dialog')).toBeNull()
  })

  it('keeps the two overlays exclusive when returning from the background', async () => {
    setup('/today', true)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    await act(async () => { vi.advanceTimersByTime(1800) })
    expect(screen.getByTestId('planner-preview-dialog')).toBeInTheDocument()
    expect(screen.queryByText('Keep your planner close')).toBeNull()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByTestId('planner-preview-dialog')).toBeInTheDocument()
    expect(screen.queryByText('Keep your planner close')).toBeNull()
    vi.useRealTimers()
    fireEvent.click(screen.getByTestId('preview-later'))
    expect(await screen.findByText('Keep your planner close')).toBeInTheDocument()
    delete (document as { visibilityState?: DocumentVisibilityState }).visibilityState
  })

  it('keeps a pending preview when install is already exiting, then opens after the exit completes', async () => {
    function LockApp() {
      const { setInstallOpen } = useOverlayCoordinator()
      useEffect(() => { setInstallOpen(true) }, [setInstallOpen])
      return <><button type="button" onClick={() => setInstallOpen(false)}>Finish install exit</button><PreviewExperience /></>
    }
    render(<MemoryRouter initialEntries={['/today']}><OverlayCoordinator><LockApp /></OverlayCoordinator></MemoryRouter>)
    await act(async () => { vi.advanceTimersByTime(1500) })
    expect(screen.queryByTestId('planner-preview-dialog')).toBeNull()
    fireEvent.click(screen.getByText('Finish install exit'))
    await act(async () => { vi.advanceTimersByTime(1000) })
    vi.useRealTimers()
    expect(await screen.findByTestId('planner-preview-dialog')).toBeInTheDocument()
  })

  it('cancels the pending auto-open when navigation reaches /shop', async () => {
    setup('/today')
    await act(async () => { vi.advanceTimersByTime(500) })
    fireEvent.click(screen.getByText('Go to shop'))
    await act(async () => { vi.advanceTimersByTime(1200) })
    expect(screen.queryByTestId('planner-preview-dialog')).toBeNull()
  })

  it('does not offer install if eligibility changed while the preview was open', async () => {
    setup('/today', true)
    await act(async () => { vi.advanceTimersByTime(1800) })
    vi.useRealTimers()
    await screen.findByTestId('preview-later')
    localStorage.setItem('rodaina-planner:install-prompt', JSON.stringify({ installed: true, dismissedAt: null }))
    fireEvent.click(screen.getByTestId('preview-later'))
    expect(screen.queryByText('Keep your planner close')).toBeNull()
    expect(screen.getByTestId('paper-planner-fab')).toBeInTheDocument()
  })

  it('does not reopen after dismissal when both browser storage APIs fail', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    setup()
    await act(async () => { vi.advanceTimersByTime(1000) })
    vi.useRealTimers()
    fireEvent.click(await screen.findByTestId('preview-later'))
    fireEvent.click(screen.getByText('Navigate route'))
    expect(screen.queryByTestId('planner-preview-dialog')).toBeNull()
    expect(await screen.findByTestId('paper-planner-fab')).toBeInTheDocument()
  })
})
