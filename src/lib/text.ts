/** String <-> line array helpers for LineList-backed text fields. */
export const toLines = (s: string): string[] => (s === '' ? [] : s.split('\n'))
export const fromLines = (l: string[]): string => {
  const out = [...l]
  while (out.length && out[out.length - 1] === '') out.pop()
  return out.join('\n')
}
