import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Star, Clock, IndianRupee, Search, ChevronRight,
         Cpu, Calendar, GitMerge, Brain, Zap, Plus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const CO_CARDS = [
  { to:'/co1', co:'CO1', title:'PEAS Agent Model',    sub:'Problem formulation · Knowledge graphs · Rule sets',  color:'bg-slate-100 border-slate-200',  icon:'🤖', tc:'text-slate-700' },
  { to:'/co2', co:'CO2', title:'Search Algorithms',   sub:'BFS · DFS · UCS · A* · Greedy · IDA*',               color:'bg-blue-50 border-blue-200',     icon:'🔍', tc:'text-blue-700' },
  { to:'/co3', co:'CO3', title:'CSP Scheduling',      sub:'Backtracking · AC-3 · MRV · LCV · Min-Conflicts',    color:'bg-emerald-50 border-emerald-200',icon:'📅', tc:'text-emerald-700' },
  { to:'/co4', co:'CO4', title:'Decision Theory',     sub:'Utility · Minimax · Alpha-Beta · Expected Utility',   color:'bg-amber-50 border-amber-200',   icon:'⚖️', tc:'text-amber-700' },
  { to:'/co5', co:'CO5', title:'Probabilistic AI',    sub:'Bayes Rule · Bayesian Network · HMM · Sampling',      color:'bg-violet-50 border-violet-200', icon:'🧠', tc:'text-violet-700' },
  { to:'/co6', co:'CO6', title:'Hybrid Pipeline',     sub:'Search + CSP + Probabilistic + Decision + Ethics',    color:'bg-orange-50 border-orange-200', icon:'⚡', tc:'text-orange-700' },
]

const CATEGORY_COLORS = {
  historical:    'bg-amber-100 text-amber-700',
  nature:        'bg-green-100 text-green-700',
  religious:     'bg-purple-100 text-purple-700',
  museum:        'bg-blue-100 text-blue-700',
  entertainment: 'bg-pink-100 text-pink-700',
  cultural:      'bg-teal-100 text-teal-700',
  shopping:      'bg-rose-100 text-rose-700',
  modern:        'bg-gray-100 text-gray-600',
}

export default function HomePage() {
  const { attractions, startId, setStartId, goalIds, toggleGoal, 
          addCustomPlace, removeCustomPlace, mapPickActive, startMapPick, cancelMapPick, setStatus } = useApp()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customLat, setCustomLat] = useState('')
  const [customLng, setCustomLng] = useState('')
  const navigate = useNavigate()

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
    setSearch(name)
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

  const categories = ['all', ...new Set(attractions.map(a => a.category))]
  const filtered = attractions.filter(a =>
    (catFilter === 'all' || a.category === catFilter) &&
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Hero */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hyderabad Tourist Route Optimizer
            </h1>
            <p className="text-gray-500 mt-1 text-sm max-w-xl">
              An intelligent AI system combining Search, CSP, Decision Theory, and
              Probabilistic Reasoning to plan your perfect Hyderabad itinerary.
              Use the sidebar to search destinations (e.g. Charminar) and set Start / Goal.
            </p>
          </div>
          <button
            onClick={() => navigate('/co6')}
            className="btn-primary ml-4 shrink-0"
          >
            <Zap size={15} /> Run Full Pipeline
          </button>
        </div>

        {/* CO module cards */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {CO_CARDS.map(c => (
            <button
              key={c.to}
              onClick={() => navigate(c.to)}
              className={`text-left p-3 rounded-xl border ${c.color} hover:shadow-md transition-all group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{c.icon}</span>
                <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className={`text-xs font-bold mt-2 ${c.tc}`}>{c.co}</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">{c.title}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{c.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Attraction picker */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col w-64 shrink-0 border-r border-gray-200 bg-white p-4 gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Select Attractions</p>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              className="inp pl-8 text-sm"
              placeholder="Search attractions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`pill-tab ${catFilter === c ? 'pill-active' : 'pill-inactive'}`}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAdd(v => !v)}
              className="w-full flex items-center justify-center gap-1 text-xs font-medium text-primary-600 hover:bg-primary-50 py-2 rounded-lg"
            >
              <Plus size={14} />
              {showAdd ? 'Hide custom place' : 'Add custom place'}
            </button>

            {showAdd && (
              <form onSubmit={submitCustom} className="space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-100 mt-2">
                <input
                  className="inp text-xs w-full"
                  placeholder="Place name"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
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
                  className={`w-full text-xs py-1.5 rounded-md border flex items-center justify-center gap-1
                    ${mapPickActive
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:bg-white'}`}
                >
                  <MapPin size={12} />
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

          {/* Summary */}
          <div className="mt-auto border-t border-gray-100 pt-3 space-y-1.5 text-xs text-gray-500">
            <div>
              <span className="font-medium text-gray-700">Start: </span>
              {attractions.find(a => a.id === startId)?.name || '—'}
            </div>
            <div>
              <span className="font-medium text-gray-700">Goals ({goalIds.length}): </span>
              {goalIds.map(id => attractions.find(a => a.id === id)?.name?.split(' ')[0]).join(', ') || '—'}
            </div>
            {goalIds.length > 0 && (
              <button
                onClick={() => navigate('/co2')}
                className="btn-primary w-full mt-2 text-xs py-2"
              >
                <Cpu size={13} /> Find Route →
              </button>
            )}
          </div>
        </div>

        {/* Attraction grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(a => {
              const isStart = a.id === startId
              const isGoal  = goalIds.includes(a.id)
              const catCls  = CATEGORY_COLORS[a.category] || 'bg-gray-100 text-gray-600'

              return (
                <div
                  key={a.id}
                  className={`card p-4 transition-all hover:shadow-md
                    ${isStart ? 'ring-2 ring-orange-400' : ''}
                    ${isGoal && !isStart ? 'ring-2 ring-indigo-400' : ''}`}
                >
                    <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{a.name}</p>
                      <span className={`badge mt-1 ${catCls}`}>{a.isCustom ? 'custom' : a.category}</span>
                    </div>
                    {!a.isCustom && (
                      <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-semibold text-gray-700">{a.rating}</span>
                      </div>
                    )}
                    {a.isCustom && (
                      <button
                        onClick={() => removeCustomPlace(a.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Remove custom place"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{a.description}</p>

                  <div className="flex gap-3 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <IndianRupee size={11} />
                      {a.entry_cost > 0 ? `₹${a.entry_cost}` : 'Free'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />{a.duration_min} min
                    </span>
                    <span className="text-gray-400">
                      {String(a.opening_time).padStart(2,'0')}:00–{String(a.closing_time).padStart(2,'0')}:00
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setStartId(a.id)}
                      className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors
                        ${isStart
                          ? 'bg-orange-500 text-white'
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
                    >
                      {isStart ? '📍 Start' : 'Set Start'}
                    </button>
                    <button
                      onClick={() => toggleGoal(a.id)}
                      disabled={isStart}
                      className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors
                        ${isGoal && !isStart
                          ? 'bg-indigo-500 text-white'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}
                        disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {isGoal && !isStart ? '✓ Goal' : '+ Goal'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
