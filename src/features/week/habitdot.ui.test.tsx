import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { HabitDot } from './HabitTracker'

// Regression guard for the iPhone X / iOS 16 habits glitch: toggling a dot must not remount its inner
// element or attach JS-driven transforms (those created long-lived composited layers on old WebKit).
describe('HabitDot', () => {
  it('keeps the same inner element when toggled and uses no inline transform', () => {
    const { container, rerender } = render(<HabitDot on={false} onClick={() => {}} label="Read, Sunday: not done" />)
    const before = container.querySelector('button > span')
    rerender(<HabitDot on onClick={() => {}} label="Read, Sunday: done" />)
    const after = container.querySelector('button > span')
    expect(after).toBe(before)
    expect((after as HTMLElement).getAttribute('style') ?? '').not.toMatch(/transform/)
    expect(container.querySelector('button')?.getAttribute('aria-pressed')).toBe('true')
  })
})
