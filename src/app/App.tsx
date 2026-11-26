import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { OverlayCoordinator } from './OverlayCoordinator'
import { Shell } from '../components/shell/Shell'
import { Toaster } from '../components/shell/Toaster'
import { StatsPinger } from '../features/stats/StatsPinger'
import { InstallPrompt } from '../features/install/InstallPrompt'
import { PreviewExperience } from '../features/shop/PreviewExperience'
import { CoverPage } from '../features/cover/CoverPage'
import { YearPage } from '../features/year/YearPage'
import {
  MonthRoute, NotFound, NoteRoute, NotesRoute, QuarterRoute, ReviewRoute, SettingsRoute, TodayRoute, WeekRoute,
} from '../routes/placeholders'

// Loaded on demand so the paper-planner preview stays out of the main planner bundle.
const ShopPage = lazy(() => import('../features/shop/ShopPage').then((m) => ({ default: m.ShopPage })))

export function App() {
  return (
    <HashRouter>
      <OverlayCoordinator>
      <Routes>
        <Route path="/" element={<CoverPage />} />
        <Route path="/shop" element={<Suspense fallback={null}><ShopPage /></Suspense>} />
        <Route element={<Shell />}>
          <Route path="/year" element={<YearPage />} />
          <Route path="/today" element={<TodayRoute />} />
          <Route path="/q/:q" element={<QuarterRoute />} />
          <Route path="/m/:month" element={<MonthRoute />} />
          <Route path="/m/:month/budget" element={<MonthRoute budget />} />
          <Route path="/w/:date" element={<WeekRoute />} />
          <Route path="/notes" element={<NotesRoute />} />
          <Route path="/notes/:id" element={<NoteRoute />} />
          <Route path="/review" element={<ReviewRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
      <InstallPrompt />
      <PreviewExperience />
      <StatsPinger />
      </OverlayCoordinator>
    </HashRouter>
  )
}
