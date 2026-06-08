import React, { useState } from 'react'
import { api } from '../utils/api'

const STAGES = [
  { key: 'co1_setup',        label: 'CO1 — Agent Setup',     color: 'text-slate-300' },
  { key: 'co2_search',       label: 'CO2 — Search',          color: 'text-blue-400'  },
  { key: 'co3_csp',          label: 'CO3 — CSP Schedule',    color: 'text-green-400' },
  { key: 'co5_probabilistic',label: 'CO5 — Probabilistic',   color: 'text-purple-400'},
  { key: 'co4_decision',     label: 'CO4 — Decision',        color: 'text-yellow-400'},
  { key: 'co6_hybrid',       label: 'CO6 — Ethics',          color: 'text-orange-400'},
]

export default function HybridPanel({ attractions, startId, goalIds, onResult, setLoading, setStatus }) {
  const [budget, setBudget]     = useState(600)
  const [maxTime, setMaxTime]   = useState(400)
  const [startHour, setStartHour] = useState(9)
  const [weather, setWeather]   = useState('sunny')
  const [dayType, setDayType]   = useState('weekday')
  const [costMode, setCostMode] = useState('distance')
  const [avoidCrowds, setAvoidCrowds] = useState(false)
  const [result, setResult]     = useState(null)
  const [activeStage, setActiveStage] = useState(null)

  async function runHybrid() {
    if (!goalIds.length) { setStatus('⚠ Select goals first'); return }
    setLoading(true); setStatus('Running full hybrid pipeline...')
    try {
      const data = await api.hybridPlan({
        start_id: startId, goal_ids: goalIds,
        budget_inr: budget, max_time_min: maxTime, start_hour: startHour,
        weather, day_type: dayType, cost_mode: costMode,
        avoid_crowds: avoidCrowds,
      })
      setResult(data)
      if (data.final_recommendation?.route?.path) {
        onResult(data.final_recommendation.route.path, data.co2_search?.astar_trace || [])
      }
      setStatus(`✅ Hybrid done — ${data.total_runtime_ms}ms — Utility: ${data.co4_decision?.selected_route?.utility?.toFixed(4) || '—'}`)
    } catch (e) { setStatus('⚠ Error: ' + e.message) }
    setLoading(false)
  }

  const rec   = result?.final_recommendation
  const route = rec?.route
  const schedule = rec?.schedule || {}

  return (
    <div className="space-y-4">
      <div className="bg-orange-950 border border-orange-800 rounded p-3 text-xs text-orange-200">
        <strong>CO6 — Hybrid Intelligent System</strong>
        <p className="mt-1 text-orange-300 leading-relaxed">
          Full pipeline: CO1 agent perceives → CO2 A* searches routes → CO3 CSP schedules →
          CO5 Bayesian network assesses quality → CO4 utility selects best plan →
          CO6 ethics audit + explainable trace.
        </p>
      </div>

      {/* Config */}
      <div className="space-y-2">
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
          <div>
            <label className="text-xs text-slate-400">Start Hour</label>
            <input type="number" min={6} max={18} value={startHour} onChange={e => setStartHour(+e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Cost Mode</label>
            <select value={costMode} onChange={e => setCostMode(e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 mt-0.5">
              <option>distance</option><option>cost</option><option>time</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Weather</label>
            <select value={weather} onChange={e => setWeather(e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 mt-0.5">
              <option>sunny</option><option>cloudy</option><option>rain</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Day Type</label>
            <select value={dayType} onChange={e => setDayType(e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 mt-0.5">
              <option>weekday</option><option>weekend</option><option>holiday</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" checked={avoidCrowds} onChange={e => setAvoidCrowds(e.target.checked)} className="accent-orange-500" />
          Avoid Crowds (CO1 Rule)
        </label>
        <button onClick={runHybrid}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-2.5 rounded transition-colors">
          ⚡ Run Full Hybrid Pipeline
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* Pipeline stages */}
          <div className="text-xs font-semibold text-slate-300">Pipeline Execution</div>
          <div className="space-y-1">
            {result.pipeline_trace?.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-500 w-14 text-right">{entry.elapsed_ms}ms</span>
                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <span className={STAGES.find(s => s.key === entry.stage)?.color || 'text-slate-400'}>
                  {entry.stage}
                </span>
              </div>
            ))}
          </div>

          {/* Stage drill-down */}
          <div className="text-xs font-semibold text-slate-300">Stage Details</div>
          <div className="flex flex-wrap gap-1">
            {STAGES.map(s => (
              <button key={s.key} onClick={() => setActiveStage(activeStage === s.key ? null : s.key)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors
                  ${activeStage === s.key ? 'border-orange-500 bg-orange-950' : 'border-slate-700 hover:border-slate-500'}`}>
                <span className={s.color}>{s.label.split('—')[0]}</span>
              </button>
            ))}
          </div>

          {activeStage === 'co1_setup' && result.co1_setup && (
            <div className="bg-slate-800 rounded p-2 text-[10px] text-slate-300 space-y-1">
              <div className="font-semibold">PEAS Actuators: {result.co1_setup.peas?.actuators?.join(' · ')}</div>
              <div>Environment: {result.co1_setup.environment_type?.observability} | {result.co1_setup.environment_type?.determinism}</div>
              <div>Rules fired: {result.co1_setup.rules_fired?.join(', ') || 'None'}</div>
              {result.co1_setup.rule_advice?.map((a, i) => (
                <div key={i} className="text-yellow-300">⚡ {a}</div>
              ))}
            </div>
          )}

          {activeStage === 'co2_search' && result.co2_search && (
            <div className="bg-slate-800 rounded p-2 text-[10px] text-slate-300 space-y-1">
              <div>Candidate paths found: {result.co2_search.candidate_paths?.length}</div>
              {result.co2_search.candidate_paths?.map((p, i) => (
                <div key={i} className="text-blue-300">
                  {p.algorithm}: [{p.path_names?.join(' → ')}] | {p.total_distance_km?.toFixed(2)}km | {p.nodes_expanded} expanded
                </div>
              ))}
            </div>
          )}

          {activeStage === 'co3_csp' && result.co3_csp?.csp_result && (
            <div className="bg-slate-800 rounded p-2 text-[10px] text-slate-300 space-y-1">
              <div>CSP: {result.co3_csp.csp_result.success ? '✅ Schedule found' : '❌ ' + result.co3_csp.csp_result.failure_reason}</div>
              {result.co3_csp.csp_result.success && Object.entries(result.co3_csp.csp_result.schedule || {}).map(([id, s]) => (
                <div key={id} className="text-green-300">[{s.slot}] {s.name}</div>
              ))}
            </div>
          )}

          {activeStage === 'co5_probabilistic' && result.co5_probabilistic && (
            <div className="bg-slate-800 rounded p-2 text-[10px] text-slate-300 space-y-1">
              <div>P(satisfaction=good): <span className="text-purple-300">
                {result.co5_probabilistic.satisfaction_inference?.['P(satisfaction=good)']}
              </span></div>
              <div>Crowd levels: {JSON.stringify(result.co5_probabilistic.crowd_inference)}</div>
              <div>HMM state: <span className="text-purple-300">
                {result.co5_probabilistic.hmm_tracking?.most_likely_current_state}
              </span></div>
            </div>
          )}

          {activeStage === 'co4_decision' && result.co4_decision && (
            <div className="bg-slate-800 rounded p-2 text-[10px] text-slate-300 space-y-1">
              {result.co4_decision.scored_routes?.map((r, i) => (
                <div key={i} className={i === 0 ? 'text-yellow-300' : 'text-slate-400'}>
                  {i === 0 ? '🏆 ' : `#${i+1} `}
                  {r.algorithm}: U={r.utility?.toFixed(4)} EU={r.expected_utility_adjusted?.toFixed(4)}
                </div>
              ))}
              <div>Minimax value: {result.co4_decision.minimax_result?.minimax_value}</div>
              <div>Alpha-Beta pruned: {result.co4_decision.minimax_result?.nodes_pruned}</div>
            </div>
          )}

          {activeStage === 'co6_hybrid' && result.co6_hybrid && (
            <div className="bg-slate-800 rounded p-2 text-[10px] space-y-1">
              {result.co6_hybrid.bias_analysis?.map((b, i) => (
                <div key={i} className={`${b.severity === 'high' ? 'text-red-300' : b.severity === 'medium' ? 'text-orange-300' : 'text-yellow-300'}`}>
                  ⚠ [{b.severity.toUpperCase()}] {b.type}: {b.description.slice(0, 100)}...
                </div>
              ))}
            </div>
          )}

          {/* Final recommendation */}
          {rec && (
            <div className="border border-orange-800 bg-orange-950 rounded p-3 space-y-2">
              <div className="text-xs font-bold text-orange-300">🏁 Final Recommendation</div>
              {rec.explanation?.map((line, i) => (
                <div key={i} className={`text-[10px] ${line.startsWith('  •') ? 'text-slate-400 pl-2' : 'text-slate-200'}`}>
                  {line}
                </div>
              ))}
              {Object.keys(schedule).length > 0 && (
                <div className="mt-2 space-y-0.5">
                  <div className="text-[10px] font-semibold text-orange-300">📅 CSP Schedule:</div>
                  {Object.entries(schedule).map(([id, s]) => (
                    <div key={id} className="text-[10px] text-slate-300 flex justify-between">
                      <span>[{s.slot}] {s.name}</span>
                      <span className="text-slate-500">₹{s.entry_cost}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
