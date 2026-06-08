import React, { useState } from 'react'
import PageLayout from '../components/PageLayout'
import TraceViewer from '../components/TraceViewer'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'
import { Zap, AlertTriangle, Shield, BarChart3 } from 'lucide-react'

const STAGES = [
  { key: 'co1_setup',         label: 'CO1 — Agent Setup',     color: 'text-gray-600' },
  { key: 'co2_search',        label: 'CO2 — Search',          color: 'text-blue-600' },
  { key: 'co3_csp',           label: 'CO3 — CSP Schedule',    color: 'text-emerald-600' },
  { key: 'co5_probabilistic', label: 'CO5 — Probabilistic',   color: 'text-violet-600' },
  { key: 'co4_decision',      label: 'CO4 — Decision',        color: 'text-amber-600' },
  { key: 'co6_hybrid',        label: 'CO6 — Ethics & Audit',  color: 'text-orange-600' },
]

export default function CO6Page() {
  const { attractions, goalIds, setRoutePath, setTraceSteps, setLoading, setStatus, loading, routingPayload } = useApp()
  const [budget, setBudget]         = useState(600)
  const [maxTime, setMaxTime]       = useState(400)
  const [startHour, setStartHour]   = useState(9)
  const [weather, setWeather]       = useState('sunny')
  const [dayType, setDayType]       = useState('weekday')
  const [costMode, setCostMode]     = useState('distance')
  const [avoidCrowds, setAvoidCrowds] = useState(false)
  const [result, setResult]         = useState(null)
  const [activeStage, setActiveStage] = useState(null)

  async function runHybrid() {
    if (!goalIds.length) { setStatus('⚠ Select goals first'); return }
    setLoading(true); setStatus('Running full hybrid pipeline...')
    try {
      const data = await api.hybridPlan(routingPayload({
        budget_inr: budget, max_time_min: maxTime, start_hour: startHour,
        weather, day_type: dayType, cost_mode: costMode,
        avoid_crowds: avoidCrowds,
      }))
      setResult(data)
      if (data.final_recommendation?.route?.path) {
        setRoutePath(data.final_recommendation.route.path)
      }
      if (data.co2_search?.astar_trace) {
        setTraceSteps(data.co2_search.astar_trace)
      }
      setStatus(`✅ Hybrid done — ${data.total_runtime_ms}ms`)
    } catch (e) { setStatus('⚠ Error: ' + e.message) }
    setLoading(false)
  }

  const rec   = result?.final_recommendation
  const route = rec?.route
  const schedule = rec?.schedule || {}

  return (
    <PageLayout
      title="CO6 — Hybrid Intelligent Pipeline"
      subtitle="CO1 Agent → CO2 Search → CO3 CSP → CO5 Probabilistic → CO4 Decision → CO6 Ethics & Explainability"
      accentClass="text-orange-700"
    >
      {/* Info banner */}
      <div className="co-banner bg-orange-50 border-orange-200 text-orange-800">
        <strong>Hybrid Architecture</strong> — Combines all 6 COs into one pipeline:
        Agent perceives environment → A* finds candidate routes → CSP schedules visits →
        Bayesian Network predicts satisfaction → Utility selects best plan →
        Ethics audit checks bias in heuristics and uncertainty miscalibration.
      </div>

      {/* Config */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Pipeline Configuration</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Budget (₹)</label>
            <input type="number" value={budget} onChange={e => setBudget(+e.target.value)} className="inp text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Max Time (min)</label>
            <input type="number" value={maxTime} onChange={e => setMaxTime(+e.target.value)} className="inp text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Start Hour</label>
            <input type="number" min={6} max={18} value={startHour}
              onChange={e => setStartHour(+e.target.value)} className="inp text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Cost Mode</label>
            <select value={costMode} onChange={e => setCostMode(e.target.value)} className="inp text-sm">
              <option value="distance">Distance</option>
              <option value="cost">Cost</option>
              <option value="time">Time</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Weather</label>
            <select value={weather} onChange={e => setWeather(e.target.value)} className="inp text-sm">
              <option value="sunny">Sunny</option>
              <option value="cloudy">Cloudy</option>
              <option value="rain">Rain</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Day Type</label>
            <select value={dayType} onChange={e => setDayType(e.target.value)} className="inp text-sm">
              <option value="weekday">Weekday</option>
              <option value="weekend">Weekend</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
          <input type="checkbox" checked={avoidCrowds}
            onChange={e => setAvoidCrowds(e.target.checked)} className="accent-orange-500 rounded" />
          Avoid Crowds (CO1 Rule-based heuristic)
        </label>
        <button onClick={runHybrid} disabled={loading}
          className="btn-primary w-full">
          <Zap size={16} /> Run Full Hybrid Pipeline
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Pipeline execution trace */}
          <div className="card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Pipeline Execution</p>
            <div className="space-y-1.5">
              {result.pipeline_trace?.map((entry, i) => {
                const stageDef = STAGES.find(s => s.key === entry.stage)
                return (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400 w-16 text-right tabular-nums">{entry.elapsed_ms}ms</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                    <span className={stageDef?.color || 'text-gray-500 font-medium'}>
                      {stageDef?.label || entry.stage}
                    </span>
                    {entry.status === 'ok' && <span className="text-emerald-500">✅</span>}
                    {entry.status === 'fail' && <span className="text-red-500">❌</span>}
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <BarChart3 size={14} />
              Total runtime: <strong className="text-gray-700">{result.total_runtime_ms} ms</strong>
            </div>
          </div>

          {/* Stage drill-down */}
          <div className="card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Stage Details</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {STAGES.map(s => (
                <button key={s.key} onClick={() => setActiveStage(activeStage === s.key ? null : s.key)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border
                    ${activeStage === s.key
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                  {s.label.split('—')[0].trim()}
                </button>
              ))}
            </div>

            {activeStage === 'co1_setup' && result.co1_setup && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1.5">
                <div className="font-semibold text-gray-700">PEAS Actuators: {(result.co1_setup.peas?.actuators || []).join(' · ')}</div>
                <div className="text-gray-500">Environment: {result.co1_setup.environment_type?.observability} | {result.co1_setup.environment_type?.determinism}</div>
                <div className="text-gray-500">Rules fired: {(result.co1_setup.rules_fired || []).join(', ') || 'None'}</div>
                {(result.co1_setup.rule_advice || []).map((a, i) => (
                  <div key={i} className="text-amber-600 font-medium">⚡ {a}</div>
                ))}
              </div>
            )}

            {activeStage === 'co2_search' && result.co2_search && (
              <div className="bg-blue-50 rounded-lg p-3 text-xs space-y-1.5">
                <div className="font-semibold text-blue-700">Candidate paths: {result.co2_search.candidate_paths?.length}</div>
                {(result.co2_search.candidate_paths || []).map((p, i) => (
                  <div key={i} className="text-blue-600 flex justify-between">
                    <span className="font-medium">{p.algorithm}:</span>
                    <span>{p.total_distance_km?.toFixed(2)}km | {p.nodes_expanded} expanded</span>
                  </div>
                ))}
              </div>
            )}

            {activeStage === 'co3_csp' && result.co3_csp?.csp_result && (
              <div className="bg-emerald-50 rounded-lg p-3 text-xs space-y-1.5">
                <div className="font-semibold text-emerald-700">
                  {result.co3_csp.csp_result.success ? '✅ Schedule Found' : '❌ ' + result.co3_csp.csp_result.failure_reason}
                </div>
                {result.co3_csp.csp_result.success && Object.entries(result.co3_csp.csp_result.schedule || {}).map(([id, s]) => (
                  <div key={id} className="text-emerald-600">[{s.slot}] {s.name}</div>
                ))}
              </div>
            )}

            {activeStage === 'co5_probabilistic' && result.co5_probabilistic && (
              <div className="bg-violet-50 rounded-lg p-3 text-xs space-y-1.5">
                <div className="text-violet-700">
                  P(satisfaction=good): <strong>{result.co5_probabilistic.satisfaction_inference?.['P(satisfaction=good)']}</strong>
                </div>
                <div className="text-gray-500">Crowd levels: {JSON.stringify(result.co5_probabilistic.crowd_inference)}</div>
                <div className="text-violet-700">
                  HMM state: <strong>{result.co5_probabilistic.hmm_tracking?.most_likely_current_state}</strong>
                </div>
              </div>
            )}

            {activeStage === 'co4_decision' && result.co4_decision && (
              <div className="bg-amber-50 rounded-lg p-3 text-xs space-y-1.5">
                {(result.co4_decision.scored_routes || []).map((r, i) => (
                  <div key={i} className={i === 0 ? 'text-amber-700 font-semibold' : 'text-gray-500'}>
                    {i === 0 ? '🏆 ' : `#${i + 1} `}
                    {r.algorithm}: U={r.utility?.toFixed(4)} EU={r.expected_utility_adjusted?.toFixed(4)}
                  </div>
                ))}
                <div className="text-gray-500">Minimax value: {result.co4_decision.minimax_result?.minimax_value}</div>
                <div className="text-gray-500">Alpha-Beta pruned: {result.co4_decision.minimax_result?.nodes_pruned}</div>
              </div>
            )}

            {activeStage === 'co6_hybrid' && result.co6_hybrid && (
              <div className="bg-orange-50 rounded-lg p-3 text-xs space-y-1.5">
                {(result.co6_hybrid.bias_analysis || []).map((b, i) => (
                  <div key={i} className={`flex items-start gap-2 ${b.severity === 'high' ? 'text-red-600' : b.severity === 'medium' ? 'text-orange-600' : 'text-yellow-700'}`}>
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">[{b.severity.toUpperCase()}] {b.type}: </span>
                      {b.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Final recommendation */}
          {rec && (
            <div className="card p-4 border-orange-200 bg-orange-50 space-y-2">
              <div className="flex items-center gap-2 text-orange-700">
                <Shield size={16} />
                <span className="text-sm font-bold">Final Recommendation</span>
              </div>
              {rec.explanation?.map((line, i) => (
                <div key={i} className={`text-xs ${line.startsWith('  •') ? 'text-gray-500 pl-3' : 'text-gray-700 font-medium'}`}>
                  {line}
                </div>
              ))}
              {Object.keys(schedule).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-bold text-orange-600 mb-1">📅 CSP Schedule:</p>
                  <div className="space-y-0.5">
                    {Object.entries(schedule).map(([id, s]) => (
                      <div key={id} className="text-xs text-gray-600 flex justify-between bg-white rounded-lg px-3 py-1.5 border border-orange-100">
                        <span>[{s.slot}] <strong>{s.name}</strong></span>
                        <span className="text-gray-400">₹{s.entry_cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {route && (
                <div className="flex gap-2 pt-1">
                  <div className="bg-white rounded-lg px-3 py-2 text-xs text-center flex-1 border border-orange-100">
                    <span className="text-gray-400 block">Total Distance</span>
                    <span className="font-bold text-gray-800">{route.total_distance_km?.toFixed(2)} km</span>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 text-xs text-center flex-1 border border-orange-100">
                    <span className="text-gray-400 block">Total Cost</span>
                    <span className="font-bold text-gray-800">₹{route.total_cost?.toFixed(0)}</span>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 text-xs text-center flex-1 border border-orange-100">
                    <span className="text-gray-400 block">Total Time</span>
                    <span className="font-bold text-gray-800">{route.total_time_min?.toFixed(0)} min</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ethics summary */}
          {result.co6_hybrid?.bias_analysis && (
            <div className="card p-4 space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <Shield size={16} />
                <span className="text-sm font-bold">Ethics & Limitations Summary</span>
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                <p className="mb-1"><strong>Technical biases identified:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  {result.co6_hybrid.bias_analysis.map((b, i) => (
                    <li key={i}>
                      <span className="font-medium">{b.type}:</span> {b.description}
                    </li>
                  ))}
                </ul>
                <p className="mt-2">
                  <strong>Key limitations:</strong> Heuristic bias toward popular attractions,
                  uncertainty miscalibration in crowd predictions, and CSP optimality
                  vs. runtime tradeoffs. The system is a planning <em>aid</em>, not a substitute
                  for human judgment.
                </p>
              </div>
            </div>
          )}
          
          {/* Trace viewer */}
          {result.co2_search?.astar_trace && (
            <TraceViewer trace={result.co2_search.astar_trace} title="A* Hybrid Pipeline Trace" />
          )}
        </div>
      )}
    </PageLayout>
  )
}
