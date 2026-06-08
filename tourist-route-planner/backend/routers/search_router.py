"""CO2 Search API endpoints."""
from fastapi import APIRouter, Query
from typing import List
from pydantic import BaseModel
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.state import TouristProblem
from algorithms.co2_search import astar, bfs, dfs, ucs, greedy, idastar, profile_all

router = APIRouter(prefix="/api/search", tags=["CO2 Search"])


class SearchRequest(BaseModel):
    start_id: int
    goal_ids: List[int]
    budget_inr: float = 2000.0
    max_time_min: float = 480.0
    start_hour: float = 9.0
    algorithm: str = "astar"   # astar | bfs | dfs | ucs | greedy | idastar | all
    cost_mode: str = "distance"  # distance | cost | time


def make_problem(req: SearchRequest) -> TouristProblem:
    return TouristProblem(
        start_id=req.start_id,
        goal_ids=req.goal_ids,
        must_visit=req.goal_ids,
        budget_inr=req.budget_inr,
        max_time_min=req.max_time_min,
        start_hour=req.start_hour,
    )


@router.post("/run")
async def run_search(req: SearchRequest):
    problem = make_problem(req)
    algo_map = {
        "astar": astar, "bfs": bfs, "dfs": dfs,
        "ucs": ucs, "greedy": greedy, "idastar": idastar,
    }
    if req.algorithm == "all":
        profile = profile_all(problem, req.cost_mode)
        return {"algorithm": "all", "profile": profile}

    fn = algo_map.get(req.algorithm, astar)
    result = fn(problem, req.cost_mode)
    return {
        "algorithm": req.algorithm,
        "success": result.success,
        "path": result.path,
        "path_names": [],
        "total_cost": result.total_cost,
        "total_time_min": result.total_time_min,
        "total_distance_km": result.total_distance_km,
        "nodes_expanded": result.nodes_expanded,
        "nodes_generated": result.nodes_generated,
        "peak_frontier_size": result.peak_frontier_size,
        "runtime_ms": result.runtime_ms,
        "trace": result.trace,
        "failure_reason": result.failure_reason,
    }


@router.post("/compare")
async def compare_algorithms(req: SearchRequest):
    problem = make_problem(req)
    profile = profile_all(problem, req.cost_mode)
    return {"comparison": profile, "cost_mode": req.cost_mode}
