import React, { useState } from 'react'
import TraceViewer from './TraceViewer'
import { api } from '../utils/api'

const SLOT_COLORS = { morning: 'bg-yellow-900 text-yellow-200', afternoon: 'bg-orange-900 text-orange-200', evening: 'bg-indigo-900 text-indigo-200' }
const SLOT_ICONS  = { morning: '🌅', afternoon: '☀️', evening: '🌇' }

export default function CSPPanel({ attractions, goalIds, startId, setLoading, setStatus }) {
  const [budget, setBudget]     = useState(600)
  const [maxTime, setMaxTime]   = useState(400)
  const [algorithm, setAlgorithm] = useState('backtracking')
  const [useMRV, setUseMRV]     = useState(true)
  const [useLCV, setUseLCV]     = useState(true)
  const [useFC, setUseFC]       = useState(true)
  const [useAC3, setUseAC3]     = useState(true)
  const [result, setResult]     = useState(null)

  async function runCSP() {
    const ids = [startId, ...goalIds].filter((v, i, a) => a.indexOf(v) === i)
    if (ids.length < 2) { setStatus('⚠ Select goals first'); return }
    setLoading(true); setStatus('Running CSP...')
    try {
      const payload = {
        attraction_ids: ids, budget_inr: budget, max_time_min: maxTime,
        algorithm, use_mrv: useMRV, use_lcv: useLCV, use_forward_checking: useFC, use_ac3: useAC3,
      }
      const data = await api.scheduleCSP(payload)
      setResult(data)
      setStatus(data.success ? `✅ CSP — schedule found (${data.backtracks || 0} backtracks)` : `❌ CSP failed — ${data.failure_reason}`)
    } catch (e) { setStatus('⚠ Error') }
    setLoading(false)
  }

  const schedule = result?.schedule || {}
  const bySlot = { morning: [], afternoon: [], evening: [] }
  Object.entries(schedule).forEach(([id, info]) => {
    if (bySlot[info.slot]) bySlot[info.slot].push({ id: +id, ...info })
  })

  return (
    <div className="space-y-4">
      <div className="bg-green-950 border border-green-800 rounded p-3 text-xs text-green-200">
        <strong>CO3 — Constraint Satisfaction Problem</strong>
        <p className="mt-1 text-green-300 leading-relaxed">
          Variables: attractions · Domains: time slots (morning/afternoon/evening) ·
          Constraints: budget, time, opening hours, unique slots.
          Heuristics: MRV · Degree · LCV · Forward Checking · AC-3.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          {['backtracking','min_conflicts'].map(a => (
            <button key={a} onClick={() => setAlgorithm(a)}
              className={`flex-1 text-xs py-1.5 rounded transition-colors
                ${algorithm === a ? 'bg-green-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {a === 'backtracking' ? 'Backtracking' : 'Min-Conflicts'}
            </button>
          ))}
        </div>

        {algorithm === 'backtracking' && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[['MRV', useMRV, setUseMRV], ['LCV', useLCV, setUseLCV],
              ['Forward Check', useFC, setUseFC], ['AC-3', useAC3, setUseAC3]].map(([label, val, setter]) => (
              <label key={label} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
                  className="accent-green-500" />
                {label}
              </label>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400">Budget (₹)</label>
            <input type="number" value={budget} onChange={e => setBudget(+e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Max Time (min)</label>
            <input type="number" value={maxTime} onChange={e => setMaxTime(+e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none mt-0.5" />
          </div>
        </div>

        <button onClick={runCSP}
          className="w-full bg-green-700 hover:bg-green-600 text-white text-xs font-semibold py-2 rounded transition-colors">
          ▶ Schedule Attractions
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {result.success ? (
            <>
              <div className="bg-green-950 border border-green-800 rounded p-2 text-xs space-y-0.5">
                <div className="text-green-300 font-semibold">✅ Schedule Found</div>
                <div className="text-slate-400 grid grid-cols-2 gap-1 mt-1">
                  <span>Total cost: ₹{result.total_cost}</span>
                  <span>Total time: {result.total_time_min} min</span>
                  <span>Backtracks: {result.backtracks || 0}</span>
                  <span>Runtime: {result.runtime_ms} ms</span>
                </div>
              </div>

              {/* Schedule by time slot */}
              {Object.entries(bySlot).map(([slot, items]) => items.length > 0 && (
                <div key={slot}>
                  <div className={`text-xs font-semibold px-2 py-1 rounded-t ${SLOT_COLORS[slot]}`}>
                    {SLOT_ICONS[slot]} {slot.charAt(0).toUpperCase() + slot.slice(1)}
                  </div>
                  <div className="border border-slate-700 rounded-b divide-y divide-slate-800">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-2 py-1.5 text-xs">
                        <span className="text-slate-200">{item.name}</span>
                        <span className="text-slate-400">₹{item.entry_cost} · {item.duration_min}min</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="bg-red-950 border border-red-800 rounded p-3 text-xs text-red-300">
              ❌ {result.failure_reason}<br />
              <span className="text-slate-400 mt-1 block">Try increasing budget or time, or selecting fewer attractions.</span>
            </div>
          )}

          {result.trace && <TraceViewer trace={result.trace} title="CSP Trace" />}
        </div>
      )}
    </div>
  )
}
