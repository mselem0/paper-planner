import type { CSSProperties } from 'react'
import { LineList, PaperPage } from '../../components/paper'
import { fromLines, toLines } from '../../lib/text'
import { useStore } from '../../store'
import type { ReviewData } from '../../store/types'
import s from './review.module.css'

function Field({ field, label, aria, min = 6, className = '', tone = '' }: { field: keyof ReviewData; label: string; aria?: string; min?: number; className?: string; tone?: string }) {
  const value = useStore((st) => st.review[field])
  const set = useStore((st) => st.setReview)
  return (
    <fieldset className={`${s.box} ${className} ${tone}`}>
      <legend className={s.legend}>{label}</legend>
      <LineList values={toLines(value)} minLines={min} ariaLabel={aria ?? label} onChange={(l) => set(field, fromLines(l))} />
    </fieldset>
  )
}

export function ReviewPage() {
  return (
    <PaperPage wide label="How was my year?">
      <h1 className={s.title} style={{ '--rot': '-4deg' } as CSSProperties}>
        <span>HOW WAS</span><span>MY YEAR ?</span>
      </h1>
      <Field field="goal" label="THE MOST IMPORTANT GOAL I ACHIEVED" aria="Most important goal" min={4} className={s.full} />
      <div className={s.grid}>
        <Field field="inspired" label="WHAT inspired me ?" />
        <Field field="lowest" label="the lowest points" />
        <Field field="skills" label="new skills i learned" tone={s.fill} />
        <Field field="favorites" label="my favorite things" tone={s.fill} />
        <Field field="betterNextYear" label="how can next year be better ?" tone={s.red} />
        <Field field="improve" label="what can i improve next year ?" tone={s.red} />
      </div>
    </PaperPage>
  )
}
