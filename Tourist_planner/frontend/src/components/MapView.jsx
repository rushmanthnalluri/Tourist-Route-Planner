import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

function displayAttraction(id, attractions, startId, goalIds) {
  const direct = attractions.find(a => a.id === id)
  if (direct && !direct.isCustom) {
    const start = attractions.find(a => a.id === startId)
    if (start?.isCustom && start.snapToId === id) return start
    for (const gid of goalIds) {
      const g = attractions.find(a => a.id === gid)
      if (g?.isCustom && g.snapToId === id) return g
    }
  }
  return direct
}

function MapClickPicker({ active, onPick }) {
  useMapEvents({
    click(e) {
      if (active && onPick) onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/* ── Custom div-icon builder ── */
function makeNumberIcon(n, color = '#4f46e5', isStart = false, isGoal = false) {
  const bg = isStart ? '#f97316' : isGoal ? '#4f46e5' : color
  return L.divIcon({
    html: `
      <div style="
        background:${bg};
        color:white;
        border-radius:50%;
        width:32px;height:32px;
        display:flex;align-items:center;justify-content:center;
        font-size:13px;font-weight:700;font-family:Inter,sans-serif;
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
      ">${n}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  })
}

function makeLabelIcon(text, color = '#4f46e5') {
  return L.divIcon({
    html: `
      <div style="
        background:white;
        color:${color};
        border:2px solid ${color};
        border-radius:8px;
        padding:3px 8px;
        font-size:11px;font-weight:600;font-family:Inter,sans-serif;
        white-space:nowrap;
        box-shadow:0 1px 6px rgba(0,0,0,0.15);
      ">${text}</div>`,
    className: '',
    iconAnchor: [0, -6],
    popupAnchor: [0, -10],
  })
}

/* ── Auto-fit bounds ── */
function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length >= 2) {
      try {
        map.fitBounds(L.latLngBounds(positions), { padding: [60, 60], maxZoom: 14 })
      } catch (_) {}
    } else if (positions.length === 1) {
      map.setView(positions[0], 14)
    }
  }, [JSON.stringify(positions)])
  return null
}

/* ═══════════════════════════════════════════════════════════
   MapView
   ─ When routePath has items: show ONLY those nodes + polyline
   ─ When routePath is empty:  clean map (no markers, no edges)
   ═══════════════════════════════════════════════════════════ */
export default function MapView({
  attractions,
  routePath = [],
  startId,
  goalIds = [],
  mapPickActive = false,
  onMapPick,
}) {
  const HYD_CENTRE = [17.385, 78.4867]

  /* Route markers, or start + goals when no route yet */
  const routeAttrs = routePath.length > 0
    ? routePath.map(id => displayAttraction(id, attractions, startId, goalIds)).filter(Boolean)
    : attractions.filter(a => a.id === startId || goalIds.includes(a.id))

  const routeCoords = routeAttrs.map(a => [a.lat, a.lng])
  const hasFullRoute = routePath.length >= 2

  const boundsPositions = routeCoords.length >= 1 ? routeCoords : []
  
  const [roadCoords, setRoadCoords] = useState([])

  useEffect(() => {
    if (hasFullRoute && routeCoords.length >= 2) {
      const coordString = routeCoords.map(c => `${c[1]},${c[0]}`).join(';')
      fetch(`https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes.length > 0) {
            // OSRM returns [lng, lat] so we map it to [lat, lng] for Leaflet
            const roadLine = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]])
            setRoadCoords(roadLine)
          } else {
            setRoadCoords(routeCoords)
          }
        })
        .catch(err => {
          console.error("OSRM Routing Error", err)
          setRoadCoords(routeCoords)
        })
    } else {
      setRoadCoords([])
    }
  }, [JSON.stringify(routeCoords), hasFullRoute])

  return (
    <MapContainer
      center={HYD_CENTRE}
      zoom={12}
      style={{ width: '100%', height: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='© OpenStreetMap © CARTO'
      />

      <MapClickPicker active={mapPickActive} onPick={onMapPick} />

      {mapPickActive && (
        <div className="leaflet-top leaflet-center" style={{ width: '100%', pointerEvents: 'none' }}>
          <div
            className="leaflet-control"
            style={{
              margin: '12px auto',
              width: 'fit-content',
              background: '#4f46e5',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(79,70,229,0.35)',
            }}
          >
            Click the map to set your custom place
          </div>
        </div>
      )}

      {boundsPositions.length >= 1 && <FitBounds positions={boundsPositions} />}

      {/* ── Route polyline (only when a full path exists) ── */}
      {hasFullRoute && roadCoords.length >= 2 && (
        <Polyline
          positions={roadCoords}
          color="#4f46e5"
          weight={5}
          opacity={0.9}
          className="animated-path"
        />
      )}

      {/* ── Route nodes only ── */}
      {routeAttrs.map((a, idx) => {
        const isStart  = a.id === startId
        const isGoal   = goalIds.includes(a.id) && !isStart
        const label    = hasFullRoute ? idx + 1 : (isStart ? 'S' : 'G')
        const icon     = makeNumberIcon(label, '#4f46e5', isStart, isGoal)

        return (
          <Marker key={a.id} position={[a.lat, a.lng]} icon={icon}>
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                  {hasFullRoute ? `${idx + 1}. ` : ''}{a.name}
                </div>
                {!a.isCustom && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    {a.category} · ⭐ {a.rating}
                  </div>
                )}
                {a.isCustom && a.snapName && (
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                    Routes via {a.snapName}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  ₹{a.entry_cost || 'Free'} · {a.duration_min} min
                </div>
                {isStart && <div style={{ fontSize: 11, color: '#f97316', marginTop: 4, fontWeight: 600 }}>📍 Start</div>}
                {isGoal  && <div style={{ fontSize: 11, color: '#4f46e5', marginTop: 4, fontWeight: 600 }}>🎯 Goal</div>}
              </div>
            </Popup>
          </Marker>
        )
      })}

    </MapContainer>
  )
}
