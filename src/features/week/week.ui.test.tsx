import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { getWeek, useStore } from '../../store'
import { DayTasks } from './DayTasks'
import { HabitTracker } from './HabitTracker'
import { WeekPage } from './WeekPage'

const W = '2027-01-03'
const LONG_AR = 'مذاكرة الرياضيات Math 2 الفصل الثالث كاملًا مع حل التمارين'
const HABIT_AR = 'قراءة ١٠ صفحات من كتاب العادات الذرية'

beforeEach(() => { useStore.getState().resetAll() })

const tasks = () => getWeek(useStore.getState(), W).days[0]
const field = (n: number) => screen.getByLabelText(`Sun tasks, line ${n}`, { exact: true }) as HTMLTextAreaElement

describe('weekly planner legend', () => {
  it('lives in the planner section, not the habit tracker, and has no buttons', () => {
    render(<MemoryRouter><WeekPage week={W} /></MemoryRouter>)
    const planner = screen.getByTestId('weekly-planner')
    const legend = within(planner).getByRole('group', { name: 'Task status legend' })
    expect(within(legend).queryAllByRole('button')).toHaveLength(0)
    expect(legend.querySelector('button, a, [tabindex]')).toBeNull()
    expect(within(legend).getByText(/tap its circle/i)).toBeInTheDocument()
    const habits = screen.getByRole('region', { name: 'Habit tracker' })
    expect(habits.contains(legend)).toBe(false)
    expect(within(habits).queryByText('Task status')).toBeNull()
    // legend comes before the first day row
    expect(legend.compareDocumentPosition(screen.getAllByRole('group', { name: / tasks$/ })[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('text fields', () => {
  it('task field has dir=auto and keeps full long mixed text', async () => {
    const user = userEvent.setup()
    render(<DayTasks week={W} day={0} label="Sun tasks" />)
    expect(field(1)).toHaveAttribute('dir', 'auto')
    await user.click(field(1))
    await user.paste(LONG_AR)
    expect(field(1).value).toBe(LONG_AR)
    expect(tasks()[0].text).toBe(LONG_AR)
  })

  it('habit name has dir=auto and persists Arabic text', async () => {
    const user = userEvent.setup()
    render(<HabitTracker week={W} />)
    const input = screen.getByLabelText('Habit 1 name')
    expect(input).toHaveAttribute('dir', 'auto')
    await user.click(input)
    await user.paste(HABIT_AR)
    expect((input as HTMLTextAreaElement).value).toBe(HABIT_AR)
    expect(getWeek(useStore.getState(), W).habits[0].name).toBe(HABIT_AR)
  })
})

describe('status button', () => {
  it('cycles empty -> ok -> delay -> stuck -> cancel -> empty on a row with text', async () => {
    const user = userEvent.setup()
    render(<DayTasks week={W} day={0} label="Sun tasks" />)
    await user.type(field(1), 'Call bank')
    const btn = () => screen.getAllByRole('button', { name: /^Task status:/ })[0]
    expect(btn()).toHaveAccessibleName('Task status: none. Tap to mark OK')
    const seen: (string | null)[] = []
    for (let i = 0; i < 5; i++) { await user.click(btn()); seen.push(tasks()[0].status) }
    expect(seen).toEqual(['ok', 'delay', 'stuck', 'cancel', null])
    await user.click(btn()); await user.click(btn()); await user.click(btn()); await user.click(btn())
    expect(btn()).toHaveAccessibleName('Task status: Cancel. Tap to clear')
  })

  it('on an empty row a click focuses the field and sets no status', async () => {
    const user = userEvent.setup()
    render(<DayTasks week={W} day={0} label="Sun tasks" />)
    const btn = screen.getAllByRole('button', { name: /write a task first/ })[1]
    expect(btn).toHaveAttribute('title', 'Write a task first')
    await user.click(btn)
    expect(field(2)).toHaveFocus()
    expect(tasks().every((t) => t.status === null)).toBe(true)
  })
})

describe('line keyboard behaviour', () => {
  it('Enter inserts and focuses the next line; Backspace on empty removes and focuses previous', async () => {
    const user = userEvent.setup()
    render(<DayTasks week={W} day={0} label="Sun tasks" />)
    await user.type(field(1), 'One{Enter}')
    expect(field(2)).toHaveFocus()
    expect(field(1).value).toBe('One')
    expect(tasks().length).toBe(6)
    await user.keyboard('{Backspace}')
    expect(field(1)).toHaveFocus()
    expect(tasks().length).toBe(5)
    expect(field(1).value).toBe('One')
  })
})
