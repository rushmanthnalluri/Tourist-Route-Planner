"""
Tourist Route Optimizer — FastAPI Backend
==========================================
Run: uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs

Module map:
  /api/attractions  → attraction data & graph
  /api/search       → CO2: BFS, DFS, UCS, A*, Greedy, IDA*
  /api/csp          → CO3: Backtracking, AC-3, Min-Conflicts
  /api/decision     → CO4: Utility, Minimax, Alpha-Beta
  /api/probabilistic→ CO5: Bayesian Network, HMM
  /api/hybrid       → CO6: Full hybrid pipeline
"""

import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

from data.hyderabad_attractions import ATTRACTIONS, ATTRACTION_MAP, GRAPH, straight_line_distance
from routers.search_router       import router as search_router
from routers.csp_router          import router as csp_router
from routers.decision_router     import router as decision_router
from routers.probabilistic_router import router as prob_router
from routers.hybrid_router       import router as hybrid_router

# ---------------------------------------------------------------------------
app = FastAPI(
    title="Hyderabad Tourist Route Optimizer",
    description="AI-powered route planner using Search, CSP, Decision Theory & Probabilistic Reasoning",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(search_router)
app.include_router(csp_router)
app.include_router(decision_router)
app.include_router(prob_router)
app.include_router(hybrid_router)


# ---------------------------------------------------------------------------
# Attraction data endpoints
# ---------------------------------------------------------------------------

@app.get("/api/attractions", tags=["Data"])
async def get_attractions():
    """Return all 25 Hyderabad attractions."""
    return [
        {
            "id": a.id,
            "name": a.name,
            "lat": a.lat,
            "lng": a.lng,
            "entry_cost": a.entry_cost,
            "duration_min": a.duration_min,
            "category": a.category,
            "rating": a.rating,
            "opening_time": a.opening_time,
            "closing_time": a.closing_time,
            "description": a.description,
            "crowd_probs": a.crowd_probs,
            "weather_sensitivity": a.weather_sensitivity,
        }
        for a in ATTRACTIONS
    ]


@app.get("/api/attractions/{attraction_id}", tags=["Data"])
async def get_attraction(attraction_id: int):
    a = ATTRACTION_MAP.get(attraction_id)
    if a is None:
        return {"error": "Not found"}
    return {
        "id": a.id, "name": a.name, "lat": a.lat, "lng": a.lng,
        "entry_cost": a.entry_cost, "duration_min": a.duration_min,
        "category": a.category, "rating": a.rating,
        "description": a.description, "crowd_probs": a.crowd_probs,
    }


@app.get("/api/graph", tags=["Data"])
async def get_graph():
    """Return adjacency list for the attraction graph."""
    result = {}
    for node_id, neighbors in GRAPH.items():
        result[node_id] = [
            {"to": n[0], "road_km": n[1], "time_min": n[2], "cost_inr": n[3]}
            for n in neighbors
        ]
    return result


@app.get("/api/distance/{a}/{b}", tags=["Data"])
async def get_distance(a: int, b: int):
    return {"from": a, "to": b, "straight_line_km": round(straight_line_distance(a, b), 3)}


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "running",
        "message": "Hyderabad Tourist Route Optimizer API",
        "endpoints": [
            "/api/attractions",
            "/api/search/run",
            "/api/search/compare",
            "/api/csp/schedule",
            "/api/decision/utility",
            "/api/decision/minimax",
            "/api/decision/expected-utility",
            "/api/probabilistic/bayes-update",
            "/api/probabilistic/infer",
            "/api/probabilistic/hmm",
            "/api/hybrid/plan",
        ],
        "docs": "/docs",
    }
