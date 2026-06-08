"""CO6 Hybrid Pipeline API endpoint."""
from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from algorithms.co6_hybrid import HybridTouristPlanner

router = APIRouter(prefix="/api/hybrid", tags=["CO6 Hybrid"])


class HybridRequest(BaseModel):
    start_id: int
    goal_ids: List[int]
    budget_inr: float = 2000.0
    max_time_min: float = 480.0
    start_hour: float = 9.0
    preferred_categories: Optional[List[str]] = None
    avoid_crowds: bool = False
    weather: str = "sunny"
    day_type: str = "weekday"
    cost_mode: str = "distance"


@router.post("/plan")
async def hybrid_plan(req: HybridRequest):
    planner = HybridTouristPlanner(
        start_id=req.start_id,
        goal_ids=req.goal_ids,
        budget_inr=req.budget_inr,
        max_time_min=req.max_time_min,
        start_hour=req.start_hour,
        preferred_categories=req.preferred_categories,
        avoid_crowds=req.avoid_crowds,
        weather=req.weather,
        day_type=req.day_type,
        cost_mode=req.cost_mode,
    )
    return planner.run()
