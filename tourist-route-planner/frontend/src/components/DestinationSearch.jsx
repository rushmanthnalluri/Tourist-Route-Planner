import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Search, Plus, MapPin, Star, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const CATEGORY_COLORS = {
  historical: 'bg-amber-100 text-amber-700',
  nature: 'bg-green-100 text-green-700',
  religious: 'bg-purple-100 text-purple-700',
  museum: 'bg-blue-100 text-blue-700',
  entertainment: 'bg-pink-100 text-pink-700',
  cultural: 'bg-teal-100 text-teal-700',
  shopping: 'bg-rose-100 text-rose-700',
  custom: 'bg-slate-200 text-slate-600',
}

export default function DestinationSearch() {
  const {
    attractions,
    startId,
    goalIds,
    setStartId,
    toggleGoal,
    addCustomPlace,
    removeCustomPlace,
    mapPickActive,
    startMapPick,
    cancelMapPick,
    setStatus,
  } = useApp()

  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customLat, setCustomLat] = useState('')
  const [customLng, setCustomLng] = useState('')
  const inputRef = useRef(null)

  const categories = useMemo(
    () => ['all', ...new Set(attractions.map(a => a.category))],
    [attractions]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return attractions.filter(a => {
      if (catFilter !== 'all' && a.category !== catFilter) return false
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
      )
    })
  }, [attractions, query, catFilter])

  useEffect(() => {
    if (mapPickActive) setShowAdd(true)
  }, [mapPickActive])

  function pickResult(a) {
    setQuery(a.name)
    inputRef.current?.blur()
  }

  function submitCustom(e) {
    e.preventDefault()
    const name = customName.trim()
    if (!name) {
      setStatus('⚠ Enter a name for the custom place')
      return
    }
    const lat = parseFloat(customLat)
    const lng = parseFloat(customLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setStatus('⚠ Enter valid latitude & longitude, or pick on the map')
      return
    }
    addCustomPlace({ name, lat, lng })
    setCustomName('')
    setCustomLat('')
    setCustomLng('')
    setShowAdd(false)
    cancelMapPick()
    setQuery(name)
    setStatus(`✅ Added "${name}" — set as Start or Goal below`)
  }

  function onMapPickClick() {
    startMapPick(({ lat, lng }) => {
      setCustomLat(lat.toFixed(5))
      setCustomLng(lng.toFixed(5))
      setShowAdd(true)
      setStatus('📍 Location set — enter a name and save')
    })
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 border-t border-gray-100">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Destinations
        </p>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            className="inp pl-8 text-xs w-full"
            placeholder="Search e.g. Charminar…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select
          className="inp text-[11px] mt-1.5 w-full py-1.5"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          {categories.map(c => (
            <option key={c} value={c}>
              {c === 'all' ? 'All categories' : c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-gray-400 px-2 py-4 text-center">
            No places match &quot;{query}&quot;
          </p>
        ) : (
          filtered.map(a => {
            const isStart = a.id === startId
            const isGoal = goalIds.includes(a.id)
            const catCls = CATEGORY_COLORS[a.category] || 'bg-gray-100 text-gray-600'

            return (
              <div
                key={a.id}
                className={`rounded-lg border p-2 transition-colors
                  ${isStart ? 'border-orange-300 bg-orange-50/50' : ''}
                  ${isGoal && !isStart ? 'border-indigo-300 bg-indigo-50/50' : ''}
                  ${!isStart && !isGoal ? 'border-gray-100 bg-white hover:border-gray-200' : ''}`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => pickResult(a)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold text-gray-900 leading-tight pr-1">
                      {a.name}
                    </p>
                    {!a.isCustom && (
                      <span className="flex items-center gap-0.5 text-amber-500 shrink-0">
                        <Star size={10} fill="currentColor" />
                        <span className="text-[10px] text-gray-600">{a.rating}</span>
                      </span>
                    )}
                  </div>
                  <span className={`badge mt-1 text-[9px] ${catCls}`}>
                    {a.isCustom ? 'custom' : a.category}
                  </span>
                  {a.isCustom && a.snapName && (
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      Routes via {a.snapName}
                    </p>
                  )}
                </button>
                <div className="flex gap-1 mt-2">
                  <button
                    type="button"
                    onClick={() => setStartId(a.id)}
                    className={`flex-1 text-[10px] py-1 rounded-md font-medium
                      ${isStart
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                  >
                    {isStart ? '📍 Start' : 'Start'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGoal(a.id)}
                    disabled={isStart}
                    className={`flex-1 text-[10px] py-1 rounded-md font-medium
                      ${isGoal && !isStart
                        ? 'bg-indigo-500 text-white'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}
                      disabled:opacity-40`}
                  >
                    {isGoal && !isStart ? '✓ Goal' : '+ Goal'}
                  </button>
                  {a.isCustom && (
                    <button
                      type="button"
                      onClick={() => removeCustomPlace(a.id)}
                      className="px-1.5 text-gray-400 hover:text-red-500"
                      title="Remove custom place"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="shrink-0 px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
        <button
          type="button"
          onClick={() => setShowAdd(v => !v)}
          className="w-full flex items-center justify-center gap-1 text-[11px] font-medium text-primary-600 hover:bg-primary-50 py-1.5 rounded-lg"
        >
          <Plus size={13} />
          {showAdd ? 'Hide custom place' : 'Add custom place'}
        </button>

        {showAdd && (
          <form onSubmit={submitCustom} className="space-y-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
            <input
              className="inp text-xs w-full"
              placeholder="Place name"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                className="inp text-xs"
                placeholder="Latitude"
                value={customLat}
                onChange={e => setCustomLat(e.target.value)}
              />
              <input
                className="inp text-xs"
                placeholder="Longitude"
                value={customLng}
                onChange={e => setCustomLng(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={onMapPickClick}
              className={`w-full text-[10px] py-1.5 rounded-md border flex items-center justify-center gap-1
                ${mapPickActive
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-white'}`}
            >
              <MapPin size={11} />
              {mapPickActive ? 'Click the map…' : 'Pick on map'}
            </button>
            {mapPickActive && (
              <button
                type="button"
                onClick={cancelMapPick}
                className="w-full text-[10px] text-gray-500"
              >
                Cancel map pick
              </button>
            )}
            <button type="submit" className="btn-primary w-full text-xs py-1.5">
              Save place
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
