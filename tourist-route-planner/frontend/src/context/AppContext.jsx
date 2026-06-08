import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { api } from '../utils/api'
import { nearestAttractionId } from '../utils/geo'

const CUSTOM_STORAGE_KEY = 'hydai-custom-places'
const CUSTOM_ID_START = 1000

const AppContext = createContext(null)

function loadCustomPlaces() {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCustomPlaces(places) {
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(places))
}

export function AppProvider({ children }) {
  const [builtinAttractions, setBuiltinAttractions] = useState([])
  const [customPlaces, setCustomPlaces]             = useState(loadCustomPlaces)
  const [graph, setGraph]                           = useState({})
  const [startId, setStartId]                       = useState(0)
  const [goalIds, setGoalIds]                       = useState([1, 9, 16])
  const [routePath, setRoutePath]                   = useState([])
  const [traceSteps, setTraceSteps]                 = useState([])
  const [loading, setLoading]                       = useState(false)
  const [statusMsg, setStatusMsg]                   = useState('Ready')
  const [backendOk, setBackendOk]                   = useState(null)
  const [mapPickActive, setMapPickActive]           = useState(false)
  const mapPickHandler = useRef(null)

  useEffect(() => {
    Promise.all([api.getAttractions(), api.getGraph()])
      .then(([atts, g]) => {
        setBuiltinAttractions(atts)
        setGraph(g)
        setBackendOk(true)
        setStatusMsg('Ready')
      })
      .catch(() => {
        setBackendOk(false)
        setStatusMsg('⚠ Backend offline — run: uvicorn main:app --reload --port 8000')
      })
  }, [])

  const enrichCustom = useCallback(
    (place, builtins) => {
      const snapToId = nearestAttractionId(place.lat, place.lng, builtins)
      const snapName = builtins.find(a => a.id === snapToId)?.name
      return {
        ...place,
        snapToId,
        snapName,
        category: 'custom',
        entry_cost: 0,
        duration_min: 30,
        rating: 0,
        description: place.description || 'Custom destination',
        isCustom: true,
      }
    },
    []
  )

  const attractions = useMemo(() => {
    const enriched = customPlaces.map(p => enrichCustom(p, builtinAttractions))
    return [...builtinAttractions, ...enriched]
  }, [builtinAttractions, customPlaces, enrichCustom])

  function toggleGoal(id) {
    setGoalIds(g => (g.includes(id) ? g.filter(x => x !== id) : [...g, id]))
  }

  const getAttraction = useCallback(
    (id) => attractions.find(a => a.id === id),
    [attractions]
  )

  /** Map custom IDs to nearest built-in node for routing APIs */
  const resolveRoutingId = useCallback(
    (id) => {
      const a = getAttraction(id)
      if (a?.isCustom && a.snapToId != null) return a.snapToId
      return id
    },
    [getAttraction]
  )

  const resolveRoutingIds = useCallback(
    (ids) => [...new Set(ids.map(resolveRoutingId))],
    [resolveRoutingId]
  )

  const routingPayload = useCallback(
    (extra = {}) => ({
      start_id: resolveRoutingId(startId),
      goal_ids: resolveRoutingIds(goalIds),
      ...extra,
    }),
    [startId, goalIds, resolveRoutingId, resolveRoutingIds]
  )

  function addCustomPlace({ name, lat, lng }) {
    const nextId =
      customPlaces.reduce((max, p) => Math.max(max, p.id), CUSTOM_ID_START - 1) + 1
    const place = { id: nextId, name, lat, lng }
    const next = [...customPlaces, place]
    setCustomPlaces(next)
    saveCustomPlaces(next)
    return nextId
  }

  function removeCustomPlace(id) {
    const next = customPlaces.filter(p => p.id !== id)
    setCustomPlaces(next)
    saveCustomPlaces(next)
    if (startId === id) setStartId(0)
    setGoalIds(g => g.filter(x => x !== id))
    setRoutePath(p => p.filter(x => x !== id))
  }

  function startMapPick(onPick) {
    mapPickHandler.current = onPick
    setMapPickActive(true)
    setStatusMsg('Click the map to set location')
  }

  function cancelMapPick() {
    mapPickHandler.current = null
    setMapPickActive(false)
  }

  function handleMapPick(lat, lng) {
    if (mapPickHandler.current) {
      mapPickHandler.current({ lat, lng })
      mapPickHandler.current = null
      setMapPickActive(false)
    }
  }

  const contextValue = useMemo(() => ({
    attractions,
    graph,
    startId,
    setStartId,
    goalIds,
    setGoalIds,
    toggleGoal,
    routePath,
    setRoutePath,
    traceSteps,
    setTraceSteps,
    loading,
    setLoading,
    statusMsg,
    setStatusMsg,
    setStatus: setStatusMsg,
    backendOk,
    getAttraction,
    routingPayload,
    resolveRoutingId,
    resolveRoutingIds,
    addCustomPlace,
    removeCustomPlace,
    mapPickActive,
    startMapPick,
    cancelMapPick,
    handleMapPick,
  }), [
    attractions, graph, startId, goalIds, routePath, traceSteps, loading, 
    statusMsg, backendOk, mapPickActive, getAttraction, routingPayload, 
    resolveRoutingId, resolveRoutingIds
  ])

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
