import React, { useState } from 'react'
import { MapPin, Star, Clock, IndianRupee, Search } from 'lucide-react'

const CATEGORY_COLORS = {
  historical: 'bg-amber-900 text-amber-300',
  nature: 'bg-green-900 text-green-300',
  religious: 'bg-purple-900 text-purple-300',
  museum: 'bg-blue-900 text-blue-300',
  entertainment: 'bg-pink-900 text-pink-300',
  cultural: 'bg-teal-900 text-teal-300',
  shopping: 'bg-rose-900 text-rose-300',
  modern: 'bg-slate-700 text-slate-300',
}

export default function AttractionSidebar({ attractions, startId, goalIds, onSetStart, onToggleGoal }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const categories = ['all', ...new Set(attractions.map(a => a.category))]
  const filtered = attractions.filter(a =>
    (filter === 'all' || a.category === filter) &&
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="w-64 flex flex-col border-r border-slate-700 bg-slate-900 shrink-0">
      <div className="p-3 border-b border-slate-700 space-y-2">
        <h2 className="text-sm font-semibold text-slate-300">Attractions</h2>
        <div className="relative">
          <Search size={13} className="absolute left-2 top-2 text-slate-500" />
          <input
            className="w-full bg-slate-800 text-xs pl-7 pr-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-orange-500"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map(a => {
          const isStart  = a.id === startId
          const isGoal   = goalIds.includes(a.id)
          const catColor = CATEGORY_COLORS[a.category] || 'bg-slate-700 text-slate-300'

          return (
            <div
              key={a.id}
              className={`p-3 border-b border-slate-800 hover:bg-slate-800 transition-colors
                ${isStart ? 'border-l-2 border-l-orange-500' : ''}
                ${isGoal && !isStart ? 'border-l-2 border-l-blue-500' : ''}`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{a.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block ${catColor}`}>
                    {a.category}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 text-yellow-400 shrink-0">
                  <Star size={10} fill="currentColor" />
                  <span className="text-[10px]">{a.rating}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-1.5 text-[10px] text-slate-400">
                <span className="flex items-center gap-0.5">
                  <IndianRupee size={9} />{a.entry_cost || 'Free'}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock size={9} />{a.duration_min}m
                </span>
              </div>

              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => onSetStart(a.id)}
                  className={`flex-1 text-[10px] py-0.5 rounded transition-colors
                    ${isStart ? 'bg-orange-600 text-white' : 'bg-slate-700 hover:bg-orange-700 text-slate-300'}`}
                >
                  {isStart ? '📍 Start' : 'Set Start'}
                </button>
                <button
                  onClick={() => onToggleGoal(a.id)}
                  disabled={isStart}
                  className={`flex-1 text-[10px] py-0.5 rounded transition-colors
                    ${isGoal && !isStart ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-blue-700 text-slate-300'}
                    disabled:opacity-40`}
                >
                  {isGoal && !isStart ? '✓ Goal' : 'Add Goal'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-2 border-t border-slate-700 text-[10px] text-slate-500 space-y-0.5">
        <div>🟠 Start: {attractions.find(a => a.id === startId)?.name || '—'}</div>
        <div>🔵 Goals ({goalIds.length}): {goalIds.map(id => attractions.find(a=>a.id===id)?.name?.split(' ')[0]).join(', ')}</div>
      </div>
    </div>
  )
}
