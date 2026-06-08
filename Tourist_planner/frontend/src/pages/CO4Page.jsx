import React, { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import PageLayout from '../components/PageLayout'
import TraceViewer from '../components/TraceViewer'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'
import { Scale, Swords, CloudRain } from 'lucide-react'

const CATEGORIES = ['historical', 'nature', 'religious', 'museum', 'entertainment', 'cultural', 'shopping', 'modern']

export default function CO4Page() {
  const { attractions, routePath, setLoading, setStatus, loading, resolveRoutingIds } = useApp()
  const [budget, setBudget]         = useState(600)
  const [maxTime, setMaxTime]       = useState(400)
  const [totalCost, setTotalCost]   = useState(200)
  const [totalTime, setTotalTime]   = useState(180)
  const [timeSlot, setTimeSlot]     = useState('afternoon')
  const [prefCats, setPrefCats]     = useState(['historical'])
  const [depthLimit, setDepthLimit] = useState(4)
  const [rainProb, setRainProb]     = useState(0.3)
  const [utilResult, setUtilResult] = useState(null)
  const [minimaxResult, setMinimaxResult] = useState(null)
  const [euResult, setEuResult]     = useState(null)

  function toggleCat(cat) {
    setPrefCats(c => c.includes(cat) ? c.filter(x => x !== cat) : [...c, cat])
  }

  async function runUtility() {
    if (!routePath.length) { setStatus('⚠ Run a search first (CO2)'); return }
    setLoading(true); setStatus('Computing utility...')
    try {
      const data = await api.computeUtility({
        path: resolveRoutingIds(routePath), total_cost: totalCost, total_time_min: totalTime,
        time_slot: timeSlot, preferred_categories: prefCats,
        budget_inr: budget, max_time_min: maxTime,
      })
      setUtilResult(data)
      setStatus(`✅ Utility: ${data.utility?.toFixed(4)}`)
    } catch { setStatus('⚠ Error') }
    setLoading(false)
  }

  async function runMinimax() {
    if (!routePath.length) { setStatus('⚠ Run a search first (CO2)'); return }
    setLoading(true); setStatus('Running Minimax + Alpha-Beta...')
    try {
      const data = await api.runMinimax({
        attractions: resolveRoutingIds(routePath), depth_limit: depthLimit,
        budget_inr: budget, max_time_min: maxTime,
        preferred_categories: prefCats,
      })
      setMinimaxResult(data)
      setStatus(`✅ Minimax: value=${data.minimax_value}, pruned=${data.nodes_pruned}`)
    } catch { setStatus('⚠ Error') }
    setLoading(false)
  }

  async function runEU() {
    if (!routePath.length) { setStatus('⚠ Run a search first (CO2)'); return }
    setLoading(true); setStatus('Computing expected utility...')
    try {
      const data = await api.expectedUtility({
        attraction_ids: resolveRoutingIds(routePath), weather_prob_rain: rainProb,
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

  const hasRoute = routePath.length > 0

  return (
    <PageLayout
      title="CO4 — Decision Theory"
      subtitle="Multi-attribute Utility · Minimax · Alpha-Beta Pruning · Expected Utility · Bounded Rationality"
      accentClass="text-amber-700"
    >
      {/* Info banner */}
      <div className="co-banner bg-amber-50 border-amber-200 text-amber-800">
        <strong>Decision Theory</strong> — Utility function U(route) combines rating,
        cost efficiency, time efficiency, category preference, and crowd penalty.
        Minimax models tourist (MAX) vs. nature (MIN). Alpha-Beta pruning cuts
        irrelevant branches. Expected utility handles weather uncertainty.
      </div>

      {/* Common config */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Common Configuration</p>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Preferred Categories</p>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => toggleCat(c)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all
                  ${prefCats.includes(c)
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Budget (₹)</label>
            <input type="number" value={budget} onChange={e => setBudget(+e.target.value)} className="inp text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Max Time (min)</label>
            <input type="number" value={maxTime} onChange={e => setMaxTime(+e.target.value)} className="inp text-sm" />
          </div>
        </div>
        {!hasRoute && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            ⚠ Run a search algorithm on the CO2 page first to get a route
          </div>
        )}
      </div>

      {/* Section 1: Utility */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-700">
          <Scale size={16} />
          <span className="text-sm font-bold">1. Utility Function U(route)</span>
        </div>
        <p className="text-xs text-gray-500">
          Route: {hasRoute ? routePath.map(id => attractions.find(a => a.id === id)?.name?.split(' ')[0]).join(' → ') : '—'}
        </p>
        <button onClick={runUtility} disabled={loading || !hasRoute}
          className="btn-primary w-full">
          Compute Utility
        </button>
        {utilResult && (
          <div className="space-y-2">
            <div className="text-center">
              <span className="text-3xl font-bold text-amber-600">{utilResult.utility?.toFixed(4)}</span>
              <span className="text-xs text-gray-400 ml-2">/ ~1.0</span>
            </div>
            {radarData.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Radar dataKey="val" fill="#f59e0b" fillOpacity={0.3} stroke="#f59e0b" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
              {Object.entries(utilResult.components || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between px-2 py-1 bg-gray-50 rounded-lg">
                  <span>{k.replace(/_/g, ' ')}</span>
                  <span className="text-gray-800 font-semibold">{(+v).toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Minimax */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-700">
          <Swords size={16} />
          <span className="text-sm font-bold">2. Minimax + Alpha-Beta Pruning</span>
        </div>
        <p className="text-xs text-gray-500">
          Tourist (MAX) selects best attraction vs. Nature (MIN) that disrupts with crowds/weather.
        </p>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Depth Limit: {depthLimit}</label>
          <input type="range" min={2} max={6} value={depthLimit}
            onChange={e => setDepthLimit(+e.target.value)}
            className="w-full accent-amber-500" />
        </div>
        <button onClick={runMinimax} disabled={loading || !hasRoute}
          className="btn-primary w-full">
          Run Minimax
        </button>
        {minimaxResult && (
          <div className="space-y-2 text-xs">
            <div className="bg-amber-50 rounded-lg px-3 py-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Minimax Value</span>
                <span className="font-bold text-amber-700">{minimaxResult.minimax_value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Best First Choice</span>
                <span className="font-semibold text-gray-800">{minimaxResult.optimal_first_choice}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-gray-500">
              {[
                { label: 'Evaluated', value: minimaxResult.nodes_evaluated },
                { label: 'Pruned', value: minimaxResult.nodes_pruned },
                { label: 'Prune Ratio', value: `${(minimaxResult.pruning_ratio * 100).toFixed(1)}%` },
                { label: 'Runtime', value: `${minimaxResult.runtime_ms} ms` },
              ].map(s => (
                <div key={s.label} className="flex justify-between px-2 py-1 bg-gray-50 rounded-lg">
                  <span>{s.label}</span>
                  <span className="font-semibold text-gray-700">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Expected Utility */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-700">
          <CloudRain size={16} />
          <span className="text-sm font-bold">3. Expected Utility (Weather Uncertainty)</span>
        </div>
        <p className="text-xs text-gray-500">
          EU = P(sunny) · U(sunny) + P(rain) · U(rain). Uses Bayesian probability from CO5.
        </p>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Probability of Rain: {(rainProb * 100).toFixed(0)}%</label>
          <input type="range" min={0} max={1} step={0.05} value={rainProb}
            onChange={e => setRainProb(+e.target.value)}
            className="w-full accent-amber-500" />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Sunny</span><span>Rainy</span>
          </div>
        </div>
        <button onClick={runEU} disabled={loading || !hasRoute}
          className="btn-primary w-full">
          Compute Expected Utility
        </button>
        {euResult && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-gray-500">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="text-left py-1 font-semibold">Attraction</th>
                  <th className="text-right py-1 font-semibold">U(sunny)</th>
                  <th className="text-right py-1 font-semibold">U(rain)</th>
                  <th className="text-right py-1 font-semibold">EU</th>
                  <th className="text-right py-1 font-semibold">OK?</th>
                </tr>
              </thead>
              <tbody>
                {(euResult.results || []).map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1 truncate max-w-[100px]">{r.name}</td>
                    <td className="text-right py-1">{r.utility_sunny?.toFixed(3)}</td>
                    <td className="text-right py-1">{r.utility_rain?.toFixed(3)}</td>
                    <td className="text-right py-1 font-semibold text-amber-600">{r.expected_utility?.toFixed(3)}</td>
                    <td className="text-right py-1">{r.recommended ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
