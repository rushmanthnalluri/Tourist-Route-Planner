import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import TraceViewer from './TraceViewer'
import { api } from '../utils/api'

const ALGORITHMS = ['astar', 'bfs', 'dfs', 'ucs', 'greedy', 'idastar']
const COST_MODES = ['distance', 'cost', 'time']

const ALG_COLORS = {
  astar: '#f97316', bfs: '#3b82f6', dfs: '#22c55e',
  ucs: '#a855f7', greedy: '#ec4899', idastar: '#14b8a6',
}

export default function SearchPanel({ attractions, startId, goalIds, onResult, setLoading, setStatus }) {
  const [algorithm, setAlgorithm] = useState('astar')
  const [costMode, setCostMode]   = useState('distance')
  const [budget, setBudget]       = useState(600)
  const [maxTime, setMaxTime]     = useState(400)
  const [result, setResult]       = useState(null)
  const [profile, setProfile]     = useState(null)

  async function runSearch() {
    if (!goalIds.length) { setStatus('⚠ Select at least 1 goal'); return }
    setLoading(true); setStatus('Running ' + algorithm + '...')
    try {
      const payload = { start_id: startId, goal_ids: goalIds, budget_inr: budget, max_time_min: maxTime, algorithm, cost_mode: costMode }
      const data = await api.runSearch(payload)
      setResult(data)
      if (data.success && data.path) {
        onResult(data.path, data.trace || [])
        setStatus(`✅ ${algorithm.toUpperCase()} — ${data.path.length} stops, ${data.nodes_expanded} expanded`)
      } else {
        setStatus(`❌ No path found — try relaxing budget/time`)
      }
    } catch (e) { setStatus('⚠ Backend error') }
    setLoading(false)
  }

  async function compareAll() {
    if (!goalIds.length) return
    setLoading(true); setStatus('Comparing all algorithms...')
    try {
      const payload = { start_id: startId, goal_ids: goalIds, budget_inr: budget, max_time_min: maxTime, algorithm: 'all', cost_mode: costMode }
      const data = await api.compareSearch(payload)
      setProfile(data.comparison)
      setStatus('✅ Comparison done')
    } catch (e) { setStatus('⚠ Error') }
    setLoading(false)
  }

  const chartData = profile ? Object.entries(profile).map(([alg, d]) => ({
    alg, expanded: d.nodes_expanded, time: d.runtime_ms, dist: d.total_distance_km,
    success: d.success,
  })) : []

  return (
    <div className="space-y-4">
      {/* CO2 Info */}
      <div className="bg-blue-950 border border-blue-800 rounded p-3 text-xs text-blue-200">
        <strong>CO2 — Search Algorithms</strong>
        <p className="mt-1 text-blue-300 leading-relaxed">
          BFS (breadth-first) · DFS (depth-first) · UCS (uniform-cost) · A* (f=g+h) · Greedy (f=h) · IDA* (memory-bounded).
          Heuristic h(n) = straight-line distance to nearest unvisited goal (admissible + consistent).
        </p>
      </div>

      {/* Config */}
      <div className="space-y-2">
        <label className="text-xs text-slate-400">Algorithm</label>
        <div className="grid grid-cols-3 gap-1">
          {ALGORITHMS.map(a => (
            <button key={a} onClick={() => setAlgorithm(a)}
              className={`text-xs py-1 rounded font-medium transition-colors
                ${algorithm === a ? 'text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              style={algorithm === a ? { backgroundColor: ALG_COLORS[a] } : {}}>
              {a.toUpperCase()}
            </button>
          ))}
        </div>

        <label className="text-xs text-slate-400">Cost Mode</label>
        <div className="flex gap-1">
          {COST_MODES.map(m => (
            <button key={m} onClick={() => setCostMode(m)}
              className={`flex-1 text-xs py-1 rounded transition-colors
                ${costMode === m ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {m}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400">Budget (₹)</label>
            <input type="number" value={budget} onChange={e => setBudget(+e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-orange-500 mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Max Time (min)</label>
            <input type="number" value={maxTime} onChange={e => setMaxTime(+e.target.value)}
              className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-orange-500 mt-0.5" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={runSearch}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold py-2 rounded transition-colors">
            ▶ Run {algorithm.toUpperCase()}
          </button>
          <button onClick={compareAll}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs font-semibold py-2 rounded transition-colors">
            Compare All
          </button>
        </div>
      </div>

      {/* Result summary */}
      {result && (
        <div className={`rounded p-3 text-xs border ${result.success ? 'bg-green-950 border-green-800' : 'bg-red-950 border-red-800'}`}>
          {result.success ? (
            <div className="space-y-1">
              <div className="font-semibold text-green-300">✅ Path found</div>
              <div className="text-slate-300">
                {(result.path || []).join(' → ')}
              </div>
              <div className="grid grid-cols-2 gap-1 mt-1 text-slate-400">
                <span>Distance: {result.total_distance_km?.toFixed(2)} km</span>
                <span>Cost: ₹{result.total_cost?.toFixed(0)}</span>
                <span>Time: {result.total_time_min?.toFixed(0)} min</span>
                <span>Expanded: {result.nodes_expanded} nodes</span>
                <span>Generated: {result.nodes_generated}</span>
                <span>Runtime: {result.runtime_ms?.toFixed(2)} ms</span>
              </div>
            </div>
          ) : (
            <div className="text-red-300">❌ {result.failure_reason || 'No path found'}</div>
          )}
        </div>
      )}

      {/* Comparison chart */}
      {profile && chartData.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">Nodes Expanded (lower = better)</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="alg" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 11 }}
                formatter={(v, name) => [v, name]}
              />
              <Bar dataKey="expanded" radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.success ? (ALG_COLORS[d.alg] || '#475569') : '#374151'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-slate-400">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500">
                  <th className="text-left py-1">Alg</th>
                  <th className="text-right">Expanded</th>
                  <th className="text-right">Dist(km)</th>
                  <th className="text-right">ms</th>
                  <th className="text-right">Gap%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(profile).map(([alg, d]) => (
                  <tr key={alg} className="border-b border-slate-800">
                    <td className="py-0.5 font-semibold" style={{ color: ALG_COLORS[alg] }}>{alg}</td>
                    <td className="text-right">{d.nodes_expanded}</td>
                    <td className="text-right">{d.total_distance_km}</td>
                    <td className="text-right">{d.runtime_ms}</td>
                    <td className="text-right">{d.optimality_gap_pct ?? 'N/A'}{d.optimality_gap_pct != null ? '%' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trace viewer */}
      {result?.trace && (
        <TraceViewer trace={result.trace} title={`${algorithm.toUpperCase()} Trace`} />
      )}
    </div>
  )
}
