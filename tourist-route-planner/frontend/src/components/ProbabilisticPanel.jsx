import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '../utils/api'

const HMM_OBS = ['gps_stationary', 'gps_moving', 'ticket_scanned', 'photo_taken']

export default function ProbabilisticPanel({ attractions, routePath, setLoading, setStatus }) {
  const [weather, setWeather]   = useState('sunny')
  const [timeSlot, setTimeSlot] = useState('afternoon')
  const [dayType, setDayType]   = useState('weekday')
  const [attractionId, setAttrId] = useState(0)
  const [bayesResult, setBayesResult]   = useState(null)
  const [inferResult, setInferResult]   = useState(null)
  const [hmmObs, setHmmObs]     = useState(['gps_stationary', 'gps_moving', 'ticket_scanned', 'photo_taken'])
  const [hmmResult, setHmmResult] = useState(null)
  const [method, setMethod]     = useState('exact')

  async function runBayes() {
    setLoading(true); setStatus('Running Bayesian update...')
    try {
      const data = await api.bayesUpdate({ attraction_id: attractionId, time_slot: timeSlot, day_type: dayType, weather })
      setBayesResult(data)
      setStatus('✅ Bayes update done')
    } catch { setStatus('⚠ Error') }
    setLoading(false)
  }

  async function runInfer() {
    setLoading(true); setStatus('Running BN inference...')
    try {
      const evidence = { weather, time_slot: timeSlot, day_type: dayType }
      const data = await api.infer({ evidence, query: 'satisfaction', method, n_samples: 5000 })
      setInferResult(data)
      setStatus(`✅ Inference done (${method})`)
    } catch { setStatus('⚠ Error') }
    setLoading(false)
  }

  async function runHMM() {
    setLoading(true); setStatus('Running HMM...')
    try {
      const data = await api.hmmTrack({ observations: hmmObs })
      setHmmResult(data)
      setStatus('✅ HMM tracking done')
    } catch { setStatus('⚠ Error') }
    setLoading(false)
  }

  function toggleObs(obs) {
    setHmmObs(o => o.includes(obs) ? o.filter(x => x !== obs) : [...o, obs])
  }

  const crowdData = bayesResult ? [
    { name: 'P(crowd=high)', value: bayesResult['P(crowd=high)'] || 0, fill: '#ef4444' },
    { name: 'P(crowd=low)', value: bayesResult['P(crowd=low)'] || 0, fill: '#22c55e' },
    { name: 'P(long wait)', value: bayesResult['P(long_wait)'] || 0, fill: '#f97316' },
    { name: 'P(crowd|wait)', value: bayesResult['P(crowd=high | long_wait)'] || 0, fill: '#a855f7' },
  ] : []

  const beliefData = hmmResult?.current_belief ? [
    { state: 'Resting', prob: hmmResult.current_belief.resting || 0 },
    { state: 'Traveling', prob: hmmResult.current_belief.traveling || 0 },
    { state: 'Visiting', prob: hmmResult.current_belief.visiting || 0 },
  ] : []

  return (
    <div className="space-y-4">
      <div className="bg-purple-950 border border-purple-800 rounded p-3 text-xs text-purple-200">
        <strong>CO5 — Probabilistic Reasoning</strong>
        <p className="mt-1 text-purple-300 leading-relaxed">
          Bayes' Rule · Bayesian Network (Weather→Crowd→WaitTime→Satisfaction) ·
          CPTs · Variable Elimination · Rejection / Likelihood-Weighting sampling ·
          HMM tourist state tracking · Sensor fusion.
        </p>
      </div>

      {/* Common evidence */}
      <div className="grid grid-cols-3 gap-2">
        {[['Weather', weather, setWeather, ['sunny','cloudy','rain']],
          ['Time Slot', timeSlot, setTimeSlot, ['morning','afternoon','evening']],
          ['Day Type', dayType, setDayType, ['weekday','weekend','holiday']]].map(([label, val, setter, opts]) => (
          <div key={label}>
            <label className="text-xs text-slate-400">{label}</label>
            <select value={val} onChange={e => setter(e.target.value)}
              className="w-full bg-slate-800 text-xs px-1.5 py-1.5 rounded border border-slate-700 mt-0.5">
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Section 1: Bayes' Rule */}
      <div className="border border-slate-700 rounded p-3 space-y-2">
        <div className="text-xs font-semibold text-purple-400">1. Bayes' Rule — Crowd Estimation</div>
        <div>
          <label className="text-xs text-slate-400">Attraction</label>
          <select value={attractionId} onChange={e => setAttrId(+e.target.value)}
            className="w-full bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-700 mt-0.5">
            {attractions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button onClick={runBayes}
          className="w-full bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold py-1.5 rounded">
          Run Bayes Update
        </button>
        {bayesResult && (
          <div className="space-y-2">
            <div className={`text-xs font-semibold ${bayesResult.recommendation === 'AVOID' ? 'text-red-400' : 'text-green-400'}`}>
              Recommendation: {bayesResult.recommendation}
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={crowdData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} width={110} />
                <Tooltip formatter={v => v.toFixed(3)} contentStyle={{ background: '#1e293b', fontSize: 10 }} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {crowdData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Section 2: BN Inference */}
      <div className="border border-slate-700 rounded p-3 space-y-2">
        <div className="text-xs font-semibold text-purple-400">2. Bayesian Network Inference</div>
        <div className="text-xs text-slate-400">Query: P(Satisfaction | Weather, TimeSlot, DayType)</div>
        <div className="flex gap-1">
          {['exact','rejection','likelihood_weighting'].map(m => (
            <button key={m} onClick={() => setMethod(m)}
              className={`flex-1 text-[10px] py-1 rounded transition-colors
                ${method === m ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {m === 'exact' ? 'Var Elim' : m === 'rejection' ? 'Rejection' : 'LW Sampling'}
            </button>
          ))}
        </div>
        <button onClick={runInfer}
          className="w-full bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold py-1.5 rounded">
          Infer Satisfaction
        </button>
        {inferResult && (
          <div className="text-xs space-y-1">
            {inferResult['P(satisfaction=good)'] != null && (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-800 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: `${(inferResult['P(satisfaction=good)'] * 100).toFixed(0)}%` }} />
                </div>
                <span className="text-green-300 w-16 text-right">Good: {inferResult['P(satisfaction=good)']}</span>
              </div>
            )}
            {inferResult['P(satisfaction=poor)'] != null && (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-800 rounded-full h-3">
                  <div className="bg-red-500 h-3 rounded-full" style={{ width: `${(inferResult['P(satisfaction=poor)'] * 100).toFixed(0)}%` }} />
                </div>
                <span className="text-red-300 w-16 text-right">Poor: {inferResult['P(satisfaction=poor)']}</span>
              </div>
            )}
            {inferResult.probabilities && (
              <div className="text-slate-400">
                {Object.entries(inferResult.probabilities).map(([k, v]) => (
                  <div key={k}>{k}: <span className="text-purple-300">{v}</span></div>
                ))}
                {inferResult.acceptance_rate != null &&
                  <div>Acceptance rate: {inferResult.acceptance_rate}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3: HMM */}
      <div className="border border-slate-700 rounded p-3 space-y-2">
        <div className="text-xs font-semibold text-purple-400">3. HMM Tourist State Tracking</div>
        <div className="text-xs text-slate-400">Observations sequence (click to toggle):</div>
        <div className="flex flex-wrap gap-1">
          {HMM_OBS.map(obs => (
            <button key={obs} onClick={() => toggleObs(obs)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors
                ${hmmObs.includes(obs) ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {obs.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-slate-400">Active: {hmmObs.join(' → ')}</div>
        <button onClick={runHMM}
          className="w-full bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold py-1.5 rounded">
          Track Tourist State
        </button>
        {hmmResult && (
          <div className="space-y-2">
            <div className="text-xs">
              <span className="text-slate-400">Viterbi path: </span>
              <span className="text-purple-300">{hmmResult.viterbi_path?.join(' → ')}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-400">Most likely state: </span>
              <span className="text-white font-semibold">{hmmResult.most_likely_current_state}</span>
            </div>
            {beliefData.length > 0 && (
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={beliefData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="state" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Tooltip formatter={v => v.toFixed(3)} contentStyle={{ background: '#1e293b', fontSize: 10 }} />
                  <Bar dataKey="prob" fill="#a855f7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="text-[10px] text-slate-400 space-y-0.5">
              {(hmmResult.belief_states || []).map((bs, i) => (
                <div key={i} className="font-mono">
                  t={i} {hmmResult.observations?.[i]?.padEnd(18,' ')} | R:{bs.resting?.toFixed(2)} T:{bs.traveling?.toFixed(2)} V:{bs.visiting?.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
