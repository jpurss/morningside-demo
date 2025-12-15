import { BrowserRouter, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/app-shell"
import { ToastProvider } from "@/components/ui/toast"
import { ExecutiveDashboardProvider } from "@/lib/executive-dashboard-store"
import { DashboardPage } from "@/pages/dashboard-page"
import { DataAuditPage } from "@/pages/data-audit-page"
import { HomePage } from "@/pages/home-page"
import { RosterPage } from "@/pages/roster-page"
import { ScopeGuardPage } from "@/pages/scope-guard-page"

export function App() {
  return (
    <ToastProvider>
      <ExecutiveDashboardProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/roster" element={<RosterPage />} />
              <Route path="/audit" element={<DataAuditPage />} />
              <Route path="/scope-guard" element={<ScopeGuardPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ExecutiveDashboardProvider>
    </ToastProvider>
  )
}

export default App;
