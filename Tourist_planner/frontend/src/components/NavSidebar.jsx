import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Cpu, Calendar, GitMerge, Brain, Zap, MapPin,
  CheckCircle, Circle, AlertCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

const NAV = [
  { to: '/', icon: Home, label: 'Home', sub: 'Overview' },
  { to: '/co1', icon: MapPin, label: 'CO1 — Agent', sub: 'PEAS · Graph' },
  { to: '/co2', icon: Cpu, label: 'CO2 — Search', sub: 'A* · BFS · DFS' },
  { to: '/co3', icon: Calendar, label: 'CO3 — CSP', sub: 'Scheduling' },
  { to: '/co4', icon: GitMerge, label: 'CO4 — Decision', sub: 'Utility · Minimax' },
  { to: '/co5', icon: Brain, label: 'CO5 — Prob.', sub: 'Bayes · HMM' },
  { to: '/co6', icon: Zap, label: 'CO6 — Hybrid', sub: 'Full pipeline' },
]

const CO_COLORS = {
  '/co1': 'text-slate-600',
  '/co2': 'text-blue-600',
  '/co3': 'text-emerald-600',
  '/co4': 'text-amber-600',
  '/co5': 'text-violet-600',
  '/co6': 'text-orange-600',
}

export default function NavSidebar() {
  const { startId, goalIds, routePath, backendOk, statusMsg, getAttraction } = useApp()
  const location = useLocation()

  const startAttr = getAttraction(startId)

  return (
    <aside className="w-72 flex flex-col bg-white border-r border-gray-200 h-screen shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <MapPin size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">HydAI</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Tourist Route Optimizer</p>
          </div>
        </div>
      </div>

      {/* Backend + activity status */}
      <div className="mx-3 mt-2 space-y-1 shrink-0">
        <div
          className={`px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-2
          ${
            backendOk === true
              ? 'bg-emerald-50 text-emerald-700'
              : backendOk === false
                ? 'bg-red-50 text-red-600'
                : 'bg-gray-50 text-gray-500'
          }`}
        >
          {backendOk === true ? (
            <CheckCircle size={11} />
          ) : backendOk === false ? (
            <AlertCircle size={11} />
          ) : (
            <Circle size={11} />
          )}
          <span className="truncate">
            {backendOk === true
              ? 'Backend connected'
              : backendOk === false
                ? 'Backend offline'
                : 'Connecting...'}
          </span>
        </div>
        {statusMsg && statusMsg !== 'Ready' && (
          <p className="px-3 py-1 rounded-lg text-[10px] bg-gray-50 text-gray-600 leading-snug border border-gray-100 line-clamp-2">
            {statusMsg}
          </p>
        )}
      </div>



      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 border-t border-gray-100">
        <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Modules
        </p>
        <div className="flex flex-col gap-1 px-3">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon
                size={18}
                className={
                  location.pathname === to ? CO_COLORS[to] || 'text-primary-600' : 'text-gray-400'
                }
              />
              <span className="truncate">{label.replace(' — ', ' ')}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Selection summary */}
      <div className="border-t border-gray-100 p-3 shrink-0 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Selection
        </p>
        <div className="bg-gray-50 rounded-lg p-2 space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0">
              S
            </span>
            <span className="text-gray-700 truncate">{startAttr?.name || 'Not set'}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0 mt-0.5">
              G
            </span>
            <span className="text-gray-700 leading-tight">
              {goalIds.length
                ? goalIds.map(id => getAttraction(id)?.name).filter(Boolean).join(', ')
                : 'No goals'}
            </span>
          </div>
          {routePath.length > 0 && (
            <div className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle size={11} />
              <span>{routePath.length}-stop route</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
