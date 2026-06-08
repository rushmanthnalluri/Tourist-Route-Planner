"""CO4 Decision Theory API endpoints."""
from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from algorithms.co4_decision import UtilityFunction, MinimaxSolver, expected_utility, policy_selection

router = APIRouter(prefix="/api/decision", tags=["CO4 Decision"])


class UtilityRequest(BaseModel):
    path: List[int]
    total_cost: float
    total_time_min: float
    time_slot: str = "afternoon"
    preferred_categories: Optional[List[str]] = None
    budget_inr: float = 2000.0
    max_time_min: float = 480.0


class MinimaxRequest(BaseModel):
    attractions: List[int]
    depth_limit: int = 4
    budget_inr: float = 2000.0
    max_time_min: float = 480.0
    preferred_categories: Optional[List[str]] = None


class ExpectedUtilityRequest(BaseModel):
    attraction_ids: List[int]
    weather_prob_rain: float = 0.3
    preferred_categories: Optional[List[str]] = None
    budget_inr: float = 2000.0
    max_time_min: float = 480.0


@router.post("/utility")
async def compute_utility(req: UtilityRequest):
    uf = UtilityFunction(
        preferred_categories=req.preferred_categories or [],
        budget_inr=req.budget_inr,
        max_time_min=req.max_time_min,
    )
    result = uf.evaluate(req.path, req.total_cost, req.total_time_min, req.time_slot)
    return result


@router.post("/minimax")
async def run_minimax(req: MinimaxRequest):
    uf = UtilityFunction(
        preferred_categories=req.preferred_categories or [],
        budget_inr=req.budget_inr,
        max_time_min=req.max_time_min,
    )
    solver = MinimaxSolver(
        attractions=req.attractions,
        utility_fn=uf,
        depth_limit=req.depth_limit,
        budget_inr=req.budget_inr,
        max_time_min=req.max_time_min,
    )
    return solver.solve()


@router.post("/expected-utility")
async def compute_expected_utility(req: ExpectedUtilityRequest):
    uf = UtilityFunction(
        preferred_categories=req.preferred_categories or [],
        budget_inr=req.budget_inr,
        max_time_min=req.max_time_min,
    )
    return expected_utility(req.attraction_ids, uf, req.weather_prob_rain)
