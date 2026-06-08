import React, { useState } from 'react'
import PageLayout from '../components/PageLayout'
import { useApp } from '../context/AppContext'

const ENV_BADGES = {
  PARTIALLY_OBSERVABLE: 'bg-yellow-100 text-yellow-700',
  STOCHASTIC:           'bg-red-100 text-red-700',
  SEQUENTIAL:           'bg-blue-100 text-blue-700',
  DYNAMIC:              'bg-orange-100 text-orange-700',
  DISCRETE:             'bg-green-100 text-green-700',
  SINGLE:               'bg-gray-100 text-gray-600',
}

const PEAS_DATA = {
  'Performance Measures': [
    'Maximize total attraction rating covered',
    'Minimize total travel cost (INR)',
    'Minimize total travel + visit time',
    'Maximize category preference match',
    'Minimize crowd exposure (if avoid_crowds=True)',
  ],
  'Environment': [
    '25 Hyderabad tourist attractions (graph nodes)',
    'Road network with weighted edges (km, time, cost)',
    'Dynamic crowd levels varying by time of day',
    'Weather conditions (sunny / cloudy / rainy)',
    'Tourist budget & time constraints',
  ],
  'Actuators': [
    'Route planner — selects next attraction',
    'Schedule generator — assigns time slots',
    'Itinerary formatter — human-readable plan',
    'Alert system — warns on budget/time overrun',
  ],
  'Sensors': [
    'GPS module — current location (lat/lng)',
    'Clock — current time of day (24h)',
    'Budget tracker — remaining INR',
    'Crowd sensor — estimated crowd level',
    'Weather API — current conditions',
  ],
}

const ENV_TYPES = [
  { label: 'Observability', value: 'PARTIALLY OBSERVABLE', badge: 'bg-yellow-100 text-yellow-700',
    why: 'Crowd levels and exact travel times are uncertain until visited.' },
  { label: 'Determinism',   value: 'STOCHASTIC',           badge: 'bg-red-100 text-red-700',
    why: 'Traffic, weather, and crowds are stochastic — same action → different outcomes.' },
  { label: 'Episodic',      value: 'SEQUENTIAL',           badge: 'bg-blue-100 text-blue-700',
    why: 'Each visit decision affects future budget, time, and visited set.' },
  { label: 'Dynamism',      value: 'DYNAMIC',              badge: 'bg-orange-100 text-orange-700',
    why: 'Crowds and traffic change while the agent is deliberating.' },
  { label: 'Discreteness',  value: 'DISCRETE',             badge: 'bg-green-100 text-green-700',
    why: 'Finite set of attractions and time slots.' },
  { label: 'Agents',        value: 'SINGLE AGENT',         badge: 'bg-gray-100 text-gray-600',
    why: 'Single tourist agent. CO4 adds adversarial weather as a second player.' },
]

const KNOWLEDGE_TYPES = [
  { type: 'Graph', icon: '🔗', desc: 'Attraction graph: 25 nodes, edges with (road_km, time_min, cost_inr). Used by all search algorithms (CO2).', color: 'bg-blue-50 border-blue-200' },
  { type: 'Rule-based', icon: '📋', desc: 'IF-THEN rules: e.g. "IF budget > 80% spent THEN prefer free attractions". Fires at each state (CO1).', color: 'bg-amber-50 border-amber-200' },
  { type: 'Constraint', icon: '⛓️', desc: 'Hard limits: budget ≤ B, time ≤ T, attraction open, unique visits. Enforced by CSP (CO3).', color: 'bg-emerald-50 border-emerald-200' },
  { type: 'Probabilistic', icon: '🎲', desc: 'Bayesian network CPTs for crowd, weather, satisfaction. Used by probabilistic inference (CO5).', color: 'bg-violet-50 border-violet-200' },
]

const RULES = [
  { name: 'BUDGET_CRITICAL',      trigger: 'cost > 80% of budget',          advice: 'Prefer free attractions' },
  { name: 'TIME_CRITICAL',         trigger: 'time > 75% elapsed',            advice: 'Head toward must-visit goals' },
  { name: 'MORNING_RELIGIOUS',     trigger: '6:00 ≤ hour < 10:00',           advice: 'Ideal time for religious sites' },
  { name: 'AVOID_AFTERNOON_CROWDS',trigger: 'avoid_crowds=True & 12–16h',    advice: 'Prefer indoor museums' },
  { name: 'CLOSING_SOON',          trigger: 'goal closes within 1 hour',     advice: 'Prioritize immediately' },
]

export default function CO1Page() {
  const { attractions, startId } = useApp()
  const [activeTab, setActiveTab] = useState('peas')

  const tabs = [
    { id: 'peas',  label: 'PEAS Model' },
    { id: 'env',   label: 'Environment Types' },
    { id: 'know',  label: 'Knowledge Repr.' },
    { id: 'state', label: 'Problem Formulation' },
  ]

  return (
    <PageLayout
      title="CO1 — Agent Model"
      subtitle="PEAS · Environment types · Knowledge representation · Problem formulation"
      accentClass="text-gray-700"
    >
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors
              ${activeTab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PEAS */}
      {activeTab === 'peas' && (
        <div className="space-y-3">
          <div className="co-banner bg-gray-50 border-gray-200 text-gray-700">
            <strong>PEAS</strong> = Performance · Environment · Actuators · Sensors.
            Describes what the Tourist Navigation Agent is trying to do and how it interacts with the world.
          </div>
          {Object.entries(PEAS_DATA).map(([section, items]) => (
            <div key={section} className="card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{section}</p>
              <ul className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Environment Types */}
      {activeTab === 'env' && (
        <div className="space-y-3">
          <div className="co-banner bg-gray-50 border-gray-200 text-gray-700">
            The tourist navigation environment is classified on <strong>6 dimensions</strong>.
            Each classification affects which AI techniques are most appropriate.
          </div>
          {ENV_TYPES.map(e => (
            <div key={e.label} className="card p-4 flex items-start gap-4">
              <div className="w-32 shrink-0">
                <p className="text-xs font-semibold text-gray-500">{e.label}</p>
                <span className={`badge mt-1 ${e.badge}`}>{e.value}</span>
              </div>
              <p className="text-sm text-gray-600">{e.why}</p>
            </div>
          ))}
        </div>
      )}

      {/* Knowledge Representation */}
      {activeTab === 'know' && (
        <div className="space-y-3">
          <div className="co-banner bg-gray-50 border-gray-200 text-gray-700">
            The system uses <strong>4 forms of knowledge representation</strong> — each suited to a different type of reasoning.
          </div>
          <div className="grid grid-cols-2 gap-3">
            {KNOWLEDGE_TYPES.map(k => (
              <div key={k.type} className={`rounded-xl border p-4 ${k.color}`}>
                <div className="text-2xl mb-2">{k.icon}</div>
                <p className="text-sm font-bold text-gray-800">{k.type}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{k.desc}</p>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Rule Base</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400">
                    <th className="text-left pb-2 font-semibold">Rule</th>
                    <th className="text-left pb-2 font-semibold">Trigger Condition</th>
                    <th className="text-left pb-2 font-semibold">Advice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {RULES.map(r => (
                    <tr key={r.name}>
                      <td className="py-2 font-mono text-indigo-600">{r.name}</td>
                      <td className="py-2 text-gray-600">{r.trigger}</td>
                      <td className="py-2 text-gray-700 font-medium">{r.advice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Problem Formulation */}
      {activeTab === 'state' && (
        <div className="space-y-3">
          <div className="co-banner bg-gray-50 border-gray-200 text-gray-700">
            Formal problem definition used by all search and planning modules.
          </div>
          {[
            { label: 'State', color: 'bg-blue-50 border-blue-200 text-blue-800',
              content: 'TouristState(current_id, visited: tuple, time_elapsed_min, cost_spent, day_hour)\nHashable via (current_id, visited) for closed-set membership.' },
            { label: 'Initial State', color: 'bg-gray-50 border-gray-200 text-gray-700',
              content: `current_id=${startId}, visited=(${startId},), time=0, cost=0, hour=9.0` },
            { label: 'Actions', color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
              content: 'Move(from_id → to_id) — precondition: destination open, budget OK, time OK, not already visited.' },
            { label: 'Transition Model', color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
              content: 'T(state, action) → new_state\nnew visited = old visited + (to_id,)\nnew time = old time + travel_min + visit_duration\nnew cost = old cost + travel_fare + entry_fee' },
            { label: 'Goal Test', color: 'bg-amber-50 border-amber-200 text-amber-800',
              content: 'All goal_ids ⊆ visited' },
            { label: 'Step Cost', color: 'bg-rose-50 border-rose-200 text-rose-800',
              content: 'c(s, a, s′) depends on cost_mode:\n  distance → road_km\n  cost     → fare_inr + entry_fee_inr\n  time     → travel_min + visit_min' },
          ].map(({ label, color, content }) => (
            <div key={label} className={`rounded-xl border p-4 ${color}`}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
