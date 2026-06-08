import React, { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { api } from '../utils/api'

const CATEGORIES = ['historical', 'nature', 'religious', 'museum', 'entertainment', 'cultural']

export default function DecisionPanel({ attractions, routePath, setLoading, setStatus }) {
  const [budget, setBudget]       = useState(600)
  const [maxTime, setMaxTime]     = useState(400)
  const [totalCost, setTotalCost] = useState(200)
  const [totalTime, setTotalTime] = useState(180)
  const [timeSlot, setTimeSlot]   = useState('afternoon')
  const [prefCats, setPrefCats]   = useState(['historical'])
  const [depthLimit, setDepthLimit] = useState(4)
  const [utilResult, setUtilResult] = useState(null)
  const [minimaxResult, setMinimaxResult] = useState(null)
  const [euResult, setEuResult]   = useState(null)
  const [rainProb, setRainProb]   = useState(0.3)

  function toggleCat(cat) {
    setPrefCats(c => c.includes(cat) ? c.filter(x => x !== cat) : [...c, cat])
  }

  async function runUtility() {
    if (!routePath.length) return
    setLoading(true); setStatus('Computing utility...')
    try {
      const data = await api.computeUtility({
        path: routePath, total_cost: totalCost, total_time_min: totalTime,
        time_slot: timeSlot, preferred_categories: prefCats,
        budget_inr: budget, max_time_min: maxTime,
      })
      setUtilResult(data)
      setStatus(`✅ Utility: ${data.utility?.toFixed(4)}`)
    } catch { setStatus('⚠ Error') }
    setLoading(false)
  }

  async function runMinimax() {
    if (!routePath.length) return
    setLoading(true); setStatus('Running Minimax + Alpha-Beta...')
    try {
      const data = await api.runMinimax({
        attractions: routePath, depth_limit: depthLimit,
        budget_inr: budget, max_time_min: maxTime,
        preferred_categories: prefCats,
      })
      setMinimaxResult(data)
      setStatus(`✅ Minimax: value=${data.minimax_value}, pruned=${data.nodes_pruned}`)
    } catch { setStatus('⚠ Error') }
    setLoading(false)
  }

  async function runEU() {
    if (!routePath.length) return
    setLoading(true); setStatus('Computing expected utility...')
    try {
      const data = await api.expectedUtility({
        attraction_ids: routePath, weather_prob_rain: rainProb,
        preferred_categories: prefCats, budget_inr: budget, max_time_min: maxTime,
      })
      setEuResult(data)
      setStatus('✅ Expected utility computed')
    } catch { setStatus('⚠ Error') }
    setLoading(false)
  }

  const radarData = utilResult?.components ? [
    { axis: 'Rating', val: +(utilResult.components.rating_score * 100).toFixed(1) },
    { axis: 'Cost Eff', val: +(utilResult.components.cost_efficiency * 100).toFixed(1) },
    { axis: 'Time Eff', val: +(utilResult.components.time_efficiency * 100).toFixed(1) },
    { axis: 'Preference', val: +(utilResult.components.preference_score * 100).toFixed(1) },
    { axis: 'Low Crowd', val: +((1 - utilResult.components.crowd_penalty) * 100).toFixed(1) },
  ] : []

  return (
    <div className="space-y-4">
      <div className="bg-yellow-950 border border-yellow-800 rounded p-3 text-xs text-yellow-200">
        <strong>CO4 — Decision Theory</strong>
        <p className="mt-1 text-yellow-300 leading-relaxed">
          Multi-attribute utility · Minimax (tourist vs. nature) · Alpha-Beta pruning ·
          Expected utility under weather uncertainty · Bounded rationality (satisficing policy).
        </p>
      </div>

      {/* Common config */}
      <div className="space-y-2">
        <label className="text-xs text-slate-400">Preferred Categories</label>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => toggleCat(c)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors
                ${prefCats.includes(c) ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400">Budget (₹)</label>
            <input type="number" value={budget} onChange={e => setBudget(+e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Time Slot</label>
            <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 mt-0.5">
              <option>morning</option><option>afternoon</option><option>evening</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Route Cost (₹)</label>
            <input type="number" value={totalCost} onChange={e => setTotalCost(+e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Route Time (min)</label>
            <input type="number" value={totalTime} onChange={e => setTotalTime(+e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none mt-0.5" />
          </div>
        </div>
      </div>

      {/* Section 1: Utility */}
      <div className="border border-slate-700 rounded p-3 space-y-2">
        <div className="text-xs font-semibold text-yellow-400">1. Utility Function U(route)</div>
        <div className="text-xs text-slate-400">Route: IDs {routePath.slice(0,5).join(' → ')}{routePath.length > 5 ? '...' : ''}</div>
        <button onClick={runUtility}
          className="w-full bg-yellow-700 hover:bg-yellow-600 text-white text-xs font-semibold py-1.5 rounded">
          Compute Utility
        </button>
        {utilResult && (
          <div className="space-y-2">
            <div className="text-center text-2xl font-bold text-yellow-300">
              {utilResult.utility?.toFixed(4)}
              <span className="text-xs text-slate-400 ml-2">/ ~1.0</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Radar dataKey="val" fill="#f59e0b" fillOpacity={0.4} stroke="#f59e0b" />
              </RadarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
              {Object.entries(utilResult.components || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k.replace('_', ' ')}</span>
                  <span className="text-slate-200">{(+v).toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Minimax */}
      <div className="border border-slate-700 rounded p-3 space-y-2">
        <div className="text-xs font-semibold text-yellow-400">2. Minimax + Alpha-Beta Pruning</div>
        <div className="text-xs text-slate-400">Tourist (MAX) vs. Nature (MIN, disrupts attractions)</div>
        <div>
          <label className="text-xs text-slate-400">Depth Limit: {depthLimit}</label>
          <input type="range" min={2} max={6} value={depthLimit} onChange={e => setDepthLimit(+e.target.value)}
            className="w-full accent-yellow-500 mt-0.5" />
        </div>
        <button onClick={runMinimax}
          className="w-full bg-yellow-700 hover:bg-yellow-600 text-white text-xs font-semibold py-1.5 rounded">
          Run Minimax
        </button>
        {minimaxResult && (
          <div className="text-xs space-y-1 text-slate-300">
            <div>Minimax value: <span className="text-yellow-300 font-bold">{minimaxResult.minimax_value}</span></div>
            <div>Best 1st choice: <span className="text-white">{minimaxResult.optimal_first_choice}</span></div>
            <div className="grid grid-cols-2 gap-1 text-slate-400 text-[10px]">
              <span>Evaluated: {minimaxResult.nodes_evaluated}</span>
              <span>Pruned: {minimaxResult.nodes_pruned}</span>
              <span>Prune ratio: {(minimaxResult.pruning_ratio * 100).toFixed(1)}%</span>
              <span>Runtime: {minimaxResult.runtime_ms} ms</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Alpha-Beta trace (first 6 entries):
            </div>
            {(minimaxResult.trace || []).slice(0, 6).map((t, i) => (
              <div key={i} className="text-[10px] text-slate-400 font-mono">
                [{t.action}] α={t.alpha?.toFixed(2)} β={t.beta?.toFixed(2)} val={t.val?.toFixed(3)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Expected Utility */}
      <div className="border border-slate-700 rounded p-3 space-y-2">
        <div className="text-xs font-semibold text-yellow-400">3. Expected Utility (Weather Uncertainty)</div>
        <div className="text-xs text-slate-400">EU = P(sunny)·U(sunny) + P(rain)·U(rain)</div>
        <div>
          <label className="text-xs text-slate-400">P(rain) = {rainProb}</label>
          <input type="range" min={0} max={1} step={0.05} value={rainProb} onChange={e => setRainProb(+e.target.value)}
            className="w-full accent-yellow-500 mt-0.5" />
        </div>
        <button onClick={runEU}
          className="w-full bg-yellow-700 hover:bg-yellow-600 text-white text-xs font-semibold py-1.5 rounded">
          Compute Expected Utility
        </button>
        {euResult && (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-slate-400">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-0.5">Attraction</th>
                  <th className="text-right">U(sunny)</th>
                  <th className="text-right">U(rain)</th>
                  <th className="text-right">EU</th>
                  <th className="text-right">OK?</th>
                </tr>
              </thead>
              <tbody>
                {(euResult.results || []).map((r, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="py-0.5 truncate max-w-[90px]">{r.name}</td>
                    <td className="text-right">{r.utility_sunny}</td>
                    <td className="text-right">{r.utility_rain}</td>
                    <td className="text-right text-yellow-300">{r.expected_utility}</td>
                    <td className="text-right">{r.recommended ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
