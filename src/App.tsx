import { Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { ExpensesTab } from './pages/group/ExpensesTab'
import { GroupPage } from './pages/group/GroupPage'
import { OverviewTab } from './pages/group/OverviewTab'
import { SettingsTab } from './pages/group/SettingsTab'
import { StatsTab } from './pages/group/StatsTab'
import { HomePage } from './pages/HomePage'
import { ImportPage } from './pages/ImportPage'
import { NewGroupPage } from './pages/NewGroupPage'
import { NotFound } from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="new" element={<NewGroupPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="g/:groupId" element={<GroupPage />}>
          <Route index element={<OverviewTab />} />
          <Route path="expenses" element={<ExpensesTab />} />
          <Route path="stats" element={<StatsTab />} />
          <Route path="settings" element={<SettingsTab />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
