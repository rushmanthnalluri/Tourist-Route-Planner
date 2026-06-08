import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react'

const ACTION_COLORS = {
  INIT:               'text-gray-500',
  EXPAND:             'text-blue-600',
  GENERATE:           'text-cyan-600',
  BACKTRACK:          'text-red-500',
  ASSIGN:             'text-emerald-600',
  CONSTRAINT_FAIL:    'text-orange-500',
  FORWARD_CHECK_FAIL: 'text-orange-500',
  ALPHA_BETA_PRUNE:   'text-amber-600',
  TERMINAL:           'text-violet-600',
  SOLUTION_FOUND:     'text-emerald-600 font-bold',
  NEW_ITERATION:      'text-gray-600',
  AC3_PRUNE:          'text-orange-500',
  AC3_FAIL:           'text-red-500',
  MAX_NODE:           'text-blue-600',
  MIN_NODE:           'text-red-500',
  DEPTH_LIMIT:        'text-gray-400',
}

const ACTION_BG = {
  EXPAND:          'bg-blue-50',
  SOLUTION_FOUND:  'bg-emerald-50',
  BACKTRACK:       'bg-red-50',
  ALPHA_BETA_PRUNE:'bg-amber-50',
  ASSIGN:          'bg-emerald-50',
  CONSTRAINT_FAIL: 'bg-orange-50',
}

export default function TraceViewer({ trace = [], title = 'Algorithm Trace' }) {
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [speed, setSpeed]     = useState(300)
  const timerRef  = useRef(null)
  const listRef   = useRef(null)

  useEffect(() => { setCurrent(0); setPlaying(false) }, [trace])

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setCurrent(c => {
          if (c >= trace.length - 1) { setPlaying(false); return c }
          return c + 1
        })
      }, speed)
    }
    return () => clearInterval(timerRef.current)
  }, [playing, speed, trace.length])

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[current]
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [current])

  if (!trace.length) return (
    <div className="text-center py-8 text-sm text-gray-400">Run an algorithm to see the trace</div>
  )

  const step = trace[current] || {}
  const actionKey = step.action || step.step || ''

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <span className="text-xs text-gray-400 tabular-nums">{current + 1} / {trace.length}</span>
      </div>

      {/* Current step card */}
      <div className={`rounded-xl border border-gray-200 p-3 ${ACTION_BG[actionKey] || 'bg-gray-50'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-bold ${ACTION_COLORS[actionKey] || 'text-gray-600'}`}>
            {actionKey}
          </span>
          {step.depth != null && (
            <span className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">
              depth {step.depth}
            </span>
          )}
        </div>
        <div className="mt-1.5 text-xs text-gray-600 space-y-0.5">
          {step.node_name && (
            <div>Node: <span className="font-semibold text-gray-900">{step.node_name}</span></div>
          )}
          {step.g != null && (
            <div className="flex gap-3 font-mono">
              <span>g={step.g}</span>
              <span>h={step.h}</span>
              <span className="text-indigo-600 font-semibold">f={step.f}</span>
            </div>
          )}
          {step.slot && (
            <div>Slot: <span className="font-semibold text-emerald-700">{step.slot}</span></div>
          )}
          {step.reason && (
            <div className="text-orange-600">{step.reason}</div>
          )}
          {step.bound != null && (
            <div>Bound: <span className="font-mono text-indigo-600">{step.bound}</span></div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-200"
          style={{ width: `${((current + 1) / trace.length) * 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setCurrent(0); setPlaying(false) }}
          className="btn-ghost px-2 py-1.5 text-xs"
        >
          <RotateCcw size={12} />
        </button>
        <button
          onClick={() => setPlaying(p => !p)}
          className="btn-primary py-1.5 px-3 text-xs flex-1"
        >
          {playing ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Play</>}
        </button>
        <button
          onClick={() => setCurrent(c => Math.min(trace.length - 1, c + 1))}
          className="btn-secondary py-1.5 px-3 text-xs"
        >
          <SkipForward size={12} /> Step
        </button>
        <select
          value={speed}
          onChange={e => setSpeed(+e.target.value)}
          className="inp text-xs py-1.5 w-24"
        >
          <option value={700}>Slow</option>
          <option value={300}>Normal</option>
          <option value={100}>Fast</option>
          <option value={30}>Max</option>
        </select>
      </div>

      {/* Scrollable trace list */}
      <div ref={listRef} className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-50">
        {trace.map((entry, i) => {
          const ak = entry.action || entry.step || ''
          return (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              className={`trace-row flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs transition-colors
                ${i === current ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
            >
              <span className="text-gray-300 w-7 shrink-0 tabular-nums text-right">{i + 1}</span>
              <span className={`font-mono w-28 shrink-0 text-[11px] ${ACTION_COLORS[ak] || 'text-gray-500'}`}>
                {ak}
              </span>
              <span className="text-gray-600 truncate">
                {entry.node_name || entry.name || entry.var || ''}
                {entry.f != null ? ` f=${entry.f}` : ''}
                {entry.slot ? ` → ${entry.slot}` : ''}
                {entry.reason ? ` (${entry.reason})` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
