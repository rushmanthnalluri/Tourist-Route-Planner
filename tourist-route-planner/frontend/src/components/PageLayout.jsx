import React from 'react'
import MapView from './MapView'
import { useApp } from '../context/AppContext'

/**
 * Standard layout used by every CO page:
 *   [Map  ←  left 55%  ] [Panel  →  right 45%]
 * The map is always visible; the panel scrolls independently.
 */
export default function PageLayout({ children, title, subtitle, accentClass = 'text-primary-600' }) {
  const { routePath, attractions, startId, goalIds, statusMsg, loading, mapPickActive, handleMapPick } = useApp()

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Page header */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className={`text-lg font-bold leading-none ${accentClass}`}>{title}</h1>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {(loading || (statusMsg && statusMsg !== 'Ready')) && (
          <p className={`text-xs shrink-0 max-w-xs text-right ${loading ? 'text-primary-600' : 'text-gray-500'}`}>
            {loading ? 'Working…' : statusMsg}
          </p>
        )}
      </header>

      {/* Body: map + panel side by side */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Map — left 55% */}
        <div className="flex-[55] min-w-0 relative p-3">
          <MapView
            attractions={attractions}
            routePath={routePath}
            startId={startId}
            goalIds={goalIds}
            mapPickActive={mapPickActive}
            onMapPick={handleMapPick}
          />
        </div>

        {/* Right panel divider */}
        <div className="w-px bg-gray-200 shrink-0" />

        {/* Panel — right 45% */}
        <div className="flex-[45] min-w-0 overflow-y-auto bg-gray-50">
          <div className="p-5 space-y-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
