import { useEffect, useSyncExternalStore } from 'react'
import { getStats, maybeSend, statsEnabled, subscribeStats, updateStats, type StatsState } from '../../lib/stats'
import { useStore } from '../../store'

export function useStatsState(): StatsState { return useSyncExternalStore(subscribeStats, getStats) }
export { statsEnabled, updateStats }

/** Invisible. Sends the once-a-day usage ping (see lib/stats.ts). */
export function StatsPinger() {
  const name = useStore((st) => st.profile.name)
  const state = useStatsState()
  useEffect(() => {
    if (!statsEnabled()) return
    const timer = setTimeout(() => { void maybeSend(name) }, 1500) // debounce while the name is being typed
    const onVis = () => { if (document.visibilityState === 'visible') void maybeSend(name) }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVis) }
  }, [name, state.shareName, state.optOut])
  return null
}
