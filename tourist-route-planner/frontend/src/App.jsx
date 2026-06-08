import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import NavSidebar from './components/NavSidebar'
import { ErrorBoundary } from './components/ErrorBoundary'
import HomePage   from './pages/HomePage'
import CO1Page    from './pages/CO1Page'
import CO2Page    from './pages/CO2Page'
import CO3Page    from './pages/CO3Page'
import CO4Page    from './pages/CO4Page'
import CO5Page    from './pages/CO5Page'
import CO6Page    from './pages/CO6Page'

export default function App() {
  return (
    <AppProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <NavSidebar />
        <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <ErrorBoundary>
            <Routes>
              <Route path="/"    element={<HomePage />} />
              <Route path="/co1" element={<CO1Page />} />
              <Route path="/co2" element={<CO2Page />} />
              <Route path="/co3" element={<CO3Page />} />
              <Route path="/co4" element={<CO4Page />} />
              <Route path="/co5" element={<CO5Page />} />
              <Route path="/co6" element={<CO6Page />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </AppProvider>
  )
}
