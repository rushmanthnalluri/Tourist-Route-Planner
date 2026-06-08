import React, { useState } from 'react'
import PageLayout from '../components/PageLayout'
import TraceViewer from '../components/TraceViewer'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'
import { Calendar, AlertTriangle, CheckCircle } from 'lucide-react'

const SLOT_COLORS = {
  morning: 'bg-amber-50 border-amber-200 text-amber-700',
  afternoon: 'bg-orange-50 border-orange-200 text-orange-700',
  evening: 'bg-indigo-50 border-indigo-200 text-indigo-700',
}
const SLOT_ICONS = { morning: '🌅', afternoon: '☀️', evening: '🌇' }

export default function CO3Page() {
  const { attractions, startId, goalIds, setRoutePath, setTraceSteps, setLoading, setStatus, loading, resolveRoutingIds } = useApp()
  const [budget, setBudget]         = useState(600)
  const [maxTime, setMaxTime]       = useState(600)
  const [algorithm, setAlgorithm]   = useState('backtracking')
  const [useMRV, setUseMRV]         = useState(true)
  const [useLCV, setUseLCV]         = useState(true)
  const [useFC, setUseFC]           = useState(true)
  const [useAC3, setUseAC3]         = useState(true)
  const [result, setResult]         = useState(null)

  async function runCSP() {
    const ids = resolveRoutingIds([startId, ...goalIds])
    if (ids.length < 2) { setStatus('⚠ Select goals first'); return }
    setLoading(true); setStatus('Running CSP...')
    try {
      const data = await api.scheduleCSP({
        attraction_ids: ids, budget_inr: budget, max_time_min: maxTime,
        algorithm, use_mrv: useMRV, use_lcv: useLCV,
        use_forward_checking: useFC, use_ac3: useAC3,
      })
      setResult(data)
      if (data.success && data.schedule) {
        const path = Object.keys(data.schedule).map(Number)
        setRoutePath(path)
        setTraceSteps(data.trace || [])
      }
      setStatus(data.success
        ? `✅ CSP — schedule found (${data.backtracks || 0} backtracks)`
        : `❌ CSP failed — ${data.failure_reason}`)
    } catch (e) { setStatus('⚠ Error') }
    setLoading(false)
  }

  const schedule = result?.schedule || {}
  const bySlot = { morning: [], afternoon: [], evening: [] }
  Object.entries(schedule).forEach(([id, info]) => {
    if (bySlot[info.slot]) bySlot[info.slot].push({ id: +id, ...info })
  })

  return (
    <PageLayout
      title="CO3 — Constraint Satisfaction Problem"
      subtitle="Backtracking · AC-3 · MRV · Degree · LCV · Forward Checking · Min-Conflicts · Scheduling"
      accentClass="text-emerald-700"
    >
      {/* Info banner */}
      <div className="co-banner bg-emerald-50 border-emerald-200 text-emerald-800">
        <strong>CSP Modeling</strong> — Variables: attractions. Domains: time slots
        (morning / afternoon / evening). Constraints: budget ≤ cap, time ≤ cap,
        opening hours, unique slot assignment. Heuristics: MRV (fewest values),
        Degree (most constraints), LCV (least constraining value).
        Propagation: Forward Checking, AC-3 (arc consistency).
      </div>

      {/* Algorithm selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Algorithm</p>
        <div className="flex gap-2">
          {[
            { id: 'backtracking', label: 'Backtracking' },
            { id: 'min_conflicts', label: 'Min-Conflicts' },
          ].map(a => (
            <button key={a.id} onClick={() => setAlgorithm(a.id)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all
                ${algorithm === a.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Heuristic toggles */}
      {algorithm === 'backtracking' && (
        <div className="card p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Heuristics & Propagation</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['MRV (Minimum Remaining Values)', useMRV, setUseMRV],
              ['LCV (Least Constraining Value)', useLCV, setUseLCV],
              ['Forward Checking', useFC, setUseFC],
              ['AC-3 (Arc Consistency)', useAC3, setUseAC3],
            ].map(([label, val, setter]) => (
              <label key={label} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
                  className="accent-emerald-500 rounded" />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Budget & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Budget (₹)</label>
          <input type="number" value={budget} onChange={e => setBudget(+e.target.value)}
            className="inp text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Max Time (min)</label>
          <input type="number" value={maxTime} onChange={e => setMaxTime(+e.target.value)}
            className="inp text-sm" />
        </div>
      </div>

      {/* Run button */}
      <button onClick={runCSP} disabled={loading}
        className="btn-primary w-full">
        <Calendar size={15} /> Schedule Attractions
      </button>

      {/* Result */}
      {result && (
        <div className="space-y-3">
          {result.success ? (
            <>
              <div className="card p-4 border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                  <CheckCircle size={16} /> Schedule Found
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total Cost', value: `₹${result.total_cost}` },
                    { label: 'Total Time', value: `${result.total_time_min} min` },
                    { label: 'Backtracks', value: result.backtracks || 0 },
                    { label: 'Runtime', value: `${result.runtime_ms} ms` },
                    { label: 'Assignments', value: Object.keys(schedule).length },
                    { label: 'Constraints', value: result.constraints_checked || '—' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg px-3 py-2 border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{s.label}</p>
                      <p className="text-sm font-bold text-gray-800">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule by slot */}
              {Object.entries(bySlot).map(([slot, items]) => items.length > 0 && (
                <div key={slot}>
                  <div className={`text-xs font-bold px-3 py-2 rounded-t-lg border ${SLOT_COLORS[slot]} flex items-center gap-2`}>
                    <span>{SLOT_ICONS[slot]}</span>
                    {slot.charAt(0).toUpperCase() + slot.slice(1)}
                  </div>
                  <div className="border border-t-0 border-gray-200 rounded-b-lg divide-y divide-gray-100 bg-white">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="font-medium text-gray-700">{item.name}</span>
                        <span className="text-gray-400">₹{item.entry_cost} · {item.duration_min}min</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="card p-4 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm mb-1">
                <AlertTriangle size={16} /> No Schedule Found
              </div>
              <p className="text-xs text-red-500">{result.failure_reason}</p>
              <p className="text-xs text-gray-500 mt-1">
                Try increasing budget/time or selecting fewer attractions.
                {result.failed_constraint && (
                  <span className="block mt-1 font-mono text-red-400">
                    Last failed constraint: {result.failed_constraint}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Trace */}
          {result.trace && <TraceViewer trace={result.trace} title="CSP Trace" />}
        </div>
      )}
    </PageLayout>
  )
}
