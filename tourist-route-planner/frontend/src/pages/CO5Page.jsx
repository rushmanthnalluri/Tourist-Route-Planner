import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import PageLayout from '../components/PageLayout'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'
import { Brain, Sigma, GitBranch } from 'lucide-react'

const HMM_OBS = ['gps_stationary', 'gps_moving', 'ticket_scanned', 'photo_taken']

export default function CO5Page() {
  const { attractions, setLoading, setStatus, loading } = useApp()
  const [weather, setWeather]     = useState('sunny')
  const [timeSlot, setTimeSlot]   = useState('afternoon')
  const [dayType, setDayType]     = useState('weekday')
  const [attractionId, setAttrId] = useState(0)
  const [method, setMethod]       = useState('exact')
  const [hmmObs, setHmmObs]       = useState([...HMM_OBS])
  const [bayesResult, setBayesResult]   = useState(null)
  const [inferResult, setInferResult]   = useState(null)
  const [hmmResult, setHmmResult]       = useState(null)

  function toggleObs(obs) {
    setHmmObs(o => o.includes(obs) ? o.filter(x => x !== obs) : [...o, obs])
  }

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
    <PageLayout
      title="CO5 — Probabilistic Reasoning"
      subtitle="Bayes' Rule · Bayesian Network · Variable Elimination · Sampling · HMM · Sensor Fusion"
      accentClass="text-violet-700"
    >
      {/* Info banner */}
      <div className="co-banner bg-violet-50 border-violet-200 text-violet-800">
        <strong>Probabilistic AI</strong> — Bayes Rule updates crowd belief given
        evidence. Bayesian Network (Weather→Crowd→WaitTime→Satisfaction) with CPTs.
        Variable Elimination (exact) and Rejection / Likelihood-Weighting sampling.
        HMM tracks tourist state (Resting / Traveling / Visiting) via Viterbi.
      </div>

      {/* Common evidence */}
      <div className="card p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Common Evidence</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Weather', weather, setWeather, ['sunny', 'cloudy', 'rain']],
            ['Time Slot', timeSlot, setTimeSlot, ['morning', 'afternoon', 'evening']],
            ['Day Type', dayType, setDayType, ['weekday', 'weekend', 'holiday']],
          ].map(([label, val, setter, opts]) => (
            <div key={label}>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
              <select value={val} onChange={e => setter(e.target.value)}
                className="inp text-sm">
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1: Bayes' Rule */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-violet-700">
          <Sigma size={16} />
          <span className="text-sm font-bold">1. Bayes' Rule — Crowd Estimation</span>
        </div>
        <p className="text-xs text-gray-500">
          P(crowd | evidence) = P(evidence | crowd) · P(crowd) / P(evidence)
        </p>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Attraction</label>
          <select value={attractionId} onChange={e => setAttrId(+e.target.value)}
            className="inp text-sm">
            {attractions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button onClick={runBayes} disabled={loading}
          className="btn-primary w-full">
          Run Bayes Update
        </button>
        {bayesResult && (
          <div className="space-y-2">
            <div className={`text-xs font-bold px-3 py-2 rounded-lg ${bayesResult.recommendation === 'AVOID' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {bayesResult.recommendation === 'AVOID' ? '⚠ AVOID — High crowd expected' : '✅ Recommended — Low crowd expected'}
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={crowdData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} width={120} />
                <Tooltip formatter={v => v.toFixed(3)}
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', fontSize: 10, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {crowdData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Section 2: BN Inference */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-violet-700">
          <Brain size={16} />
          <span className="text-sm font-bold">2. Bayesian Network Inference</span>
        </div>
        <p className="text-xs text-gray-500">
          Query: P(Satisfaction | Weather, TimeSlot, DayType) via Variable Elimination or Sampling
        </p>
        <div className="flex gap-2">
          {[
            { id: 'exact', label: 'Var. Elimination' },
            { id: 'rejection', label: 'Rejection Sampling' },
            { id: 'likelihood_weighting', label: 'Likelihood Weighting' },
          ].map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              className={`flex-1 text-xs py-2 rounded-lg font-medium transition-all
                ${method === m.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={runInfer} disabled={loading}
          className="btn-primary w-full">
          Infer Satisfaction
        </button>
        {inferResult && (
          <div className="space-y-2">
            {inferResult['P(satisfaction=good)'] != null && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20">Good:</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div className="bg-emerald-500 h-3 rounded-full transition-all"
                    style={{ width: `${(inferResult['P(satisfaction=good)'] * 100).toFixed(0)}%` }} />
                </div>
                <span className="text-xs font-semibold text-emerald-600 w-16 text-right">
                  {inferResult['P(satisfaction=good)'].toFixed(4)}
                </span>
              </div>
            )}
            {inferResult['P(satisfaction=poor)'] != null && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20">Poor:</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div className="bg-red-500 h-3 rounded-full transition-all"
                    style={{ width: `${(inferResult['P(satisfaction=poor)'] * 100).toFixed(0)}%` }} />
                </div>
                <span className="text-xs font-semibold text-red-600 w-16 text-right">
                  {inferResult['P(satisfaction=poor)'].toFixed(4)}
                </span>
              </div>
            )}
            {inferResult.probabilities && (
              <div className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg p-3">
                {Object.entries(inferResult.probabilities).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>{k}</span>
                    <span className="font-semibold text-violet-600">{typeof v === 'number' ? v.toFixed(4) : v}</span>
                  </div>
                ))}
                {inferResult.acceptance_rate != null && (
                  <div className="flex justify-between pt-1 border-t border-gray-200">
                    <span>Acceptance Rate</span>
                    <span className="font-semibold text-violet-600">{(inferResult.acceptance_rate * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3: HMM */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-violet-700">
          <GitBranch size={16} />
          <span className="text-sm font-bold">3. HMM Tourist State Tracking</span>
        </div>
        <p className="text-xs text-gray-500">
          Hidden states: Resting / Traveling / Visiting. Observations: GPS, ticket scans, photos.
          Viterbi algorithm finds the most likely state sequence.
        </p>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Observations (click to toggle)</p>
          <div className="flex flex-wrap gap-1">
            {HMM_OBS.map(obs => (
              <button key={obs} onClick={() => toggleObs(obs)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all
                  ${hmmObs.includes(obs)
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {obs.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Active: {hmmObs.join(' → ')}</p>
        </div>
        <button onClick={runHMM} disabled={loading}
          className="btn-primary w-full">
          Track Tourist State
        </button>
        {hmmResult && (
          <div className="space-y-2">
            <div className="bg-violet-50 rounded-lg px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Viterbi Path</span>
                <span className="font-semibold text-violet-700">{hmmResult.viterbi_path?.join(' → ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Most Likely Current State</span>
                <span className="font-bold text-violet-700">{hmmResult.most_likely_current_state}</span>
              </div>
            </div>
            {beliefData.length > 0 && (
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={beliefData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="state" tick={{ fontSize: 9, fill: '#64748b' }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 9, fill: '#64748b' }} />
                  <Tooltip formatter={v => v.toFixed(3)}
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', fontSize: 10, borderRadius: 8 }} />
                  <Bar dataKey="prob" fill="#a855f7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="text-[10px] text-gray-500 font-mono space-y-0.5 max-h-32 overflow-y-auto">
              {(hmmResult.belief_states || []).map((bs, i) => (
                <div key={i} className="bg-gray-50 px-2 py-1 rounded">
                  t={i} | {hmmResult.observations?.[i]?.padEnd(18, ' ')} |
                  R:{bs.resting?.toFixed(2)} T:{bs.traveling?.toFixed(2)} V:{bs.visiting?.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
