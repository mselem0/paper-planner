import { HashRouter, Route, Routes } from 'react-router-dom'
import { Shell } from '../components/shell/Shell'
import { Toaster } from '../components/shell/Toaster'
import { CoverPage } from '../features/cover/CoverPage'
import { YearPage } from '../features/year/YearPage'
import {
  MonthRoute, NotFound, NoteRoute, NotesRoute, QuarterRoute, ReviewRoute, SettingsRoute, TodayRoute, WeekRoute,
} from '../routes/placeholders'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<CoverPage />} />
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
    </HashRouter>
  )
}
