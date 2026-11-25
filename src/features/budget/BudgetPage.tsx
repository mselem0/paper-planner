import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MonthDots, PaperPage } from '../../components/paper'
import type { Month } from '../../lib/dates'
import { budgetTotals, formatAmount, formatMoney, parseAmount } from '../../lib/budget'
import { monthInfo } from '../../lib/months'
import { useStore } from '../../store'
import type { BudgetRow, BudgetSection } from '../../store/types'
import s from './budget.module.css'

function AmountInput({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label: string }) {
  // text !== null while editing, or while the entered text is invalid (kept so nothing is silently cleared).
  const [text, setText] = useState<string | null>(null)
  const parsed = text === null ? null : parseAmount(text)
  const invalid = parsed !== null && !parsed.ok
  const shown = text ?? (value === null ? '' : formatAmount(value))
  return (
    <input
      className={`${s.amount} ${invalid ? s.invalid : ''}`} type="text" inputMode="decimal" value={shown} placeholder="0" aria-label={label}
      aria-invalid={invalid || undefined} autoComplete="off"
      onFocus={() => { if (text === null) setText(value === null ? '' : String(value)) }}
      onBlur={() => { if (text !== null && parseAmount(text).ok) setText(null) }}
      onChange={(e) => {
        setText(e.target.value)
        const r = parseAmount(e.target.value)
        if (r.ok) onChange(r.value)
      }}
    />
  )
}

function Section({ month, section, title, tag, rows }: {
  month: Month; section: BudgetSection; title: string; tag?: string; rows: BudgetRow[]
}) {
  const add = useStore((st) => st.addBudgetRow)
  const update = useStore((st) => st.updateBudgetRow)
  const remove = useStore((st) => st.removeBudgetRow)
  return (
    <section className={s.section} aria-label={title}>
      <h2 className={s.h2}>{title}{tag && <span className={s.tag}>{tag}</span>}</h2>
      {rows.map((r) => (
        <div key={r.id} className={s.row}>
          <input className={s.label} value={r.label} aria-label={`${title} label`} onChange={(e) => update(month, section, r.id, { label: e.target.value })} />
          <AmountInput value={r.amount} label={`${r.label || title} amount`} onChange={(v) => update(month, section, r.id, { amount: v })} />
          <button type="button" className={s.rm} aria-label={`Remove ${r.label || 'row'}`} onClick={() => remove(month, section, r.id)}>&times;</button>
        </div>
      ))}
      <button type="button" className={s.add} onClick={() => add(month, section)}>+ add row</button>
    </section>
  )
}

function Box({ month, field, title, color, value, lines, className = '' }: {
  month: Month; field: 'savingGoal' | 'emergency' | 'notes'; title: string; color: string; value: string; lines: number; className?: string
}) {
  const set = useStore((st) => st.setBudgetText)
  return (
    <section className={`${s.box} ${className}`} style={{ background: color }}>
      <h2 className={s.h2}>{title}</h2>
      <textarea className={s.ruled} rows={lines} value={value} aria-label={title} onChange={(e) => set(month, field, e.target.value)} />
    </section>
  )
}

export function BudgetPage({ month }: { month: Month }) {
  const info = monthInfo(month)
  const b = useStore((st) => st.budgets[month])
  const currency = useStore((st) => st.profile.currency) || 'EGP'
  const t = budgetTotals(b)

  return (
    <PaperPage wide label={`${info.name} budget`}>
      <div className={s.top}>
        <Link to={`/m/${month}`} className={s.back} style={{ color: info.accentInk }}>&larr; {info.name} calendar</Link>
        <MonthDots current={month} accent={info.accent} />
      </div>
      <div className={s.title}>
        <h1 className={s.big}>BUDGET</h1>
        <span className={s.script}>Planner</span>
      </div>
      <div className={s.sums}>
        <div className={s.sum} style={{ background: '#dee7f4' }}><span>total income</span><strong>{formatMoney(t.income, currency)}</strong></div>
        <div className={s.sum} style={{ background: '#f8eeb0' }}><span>total expenses</span><strong>{formatMoney(t.expenses, currency)}</strong></div>
        <div className={s.sum} style={{ background: '#f6d3da' }}><span>left to save</span><strong className={t.left < 0 ? s.neg : ''} data-testid="left">{formatMoney(t.left, currency)}</strong></div>
      </div>
      <div className={s.grid}>
        <Section month={month} section="income" title="INCOME" rows={b.income} />
        <Section month={month} section="spending" title="SPENDING" tag="flexible" rows={b.spending} />
        <Section month={month} section="expenses" title="EXPENSES" tag="fixed" rows={b.expenses} />
        <Section month={month} section="savingDebt" title="SAVING & DEBT" rows={b.savingDebt} />
      </div>
      <div className={s.bottom}>
        <div className={s.col}>
          <Box month={month} field="savingGoal" title="SAVING GOAL" color="#dee7f4" value={b.savingGoal} lines={5} />
          <Box month={month} field="emergency" title="EMERGENCY BUDGET" color="#f8eeb0" value={b.emergency} lines={4} />
          <p className={s.ayah} dir="rtl" lang="ar">
            «وَالَّذِينَ إِذَا أَنفَقُوا لَمْ يُسْرِفُوا وَلَمْ يَقْتُرُوا وَكَانَ بَيْنَ ذَٰلِكَ قَوَامًا»
            <span className={s.medal} aria-label="verse 67">٦٧</span>
          </p>
        </div>
        <Box month={month} field="notes" title="NOTES" color="#f6d3da" value={b.notes} lines={14} className={s.notesBox} />
      </div>
    </PaperPage>
  )
}
