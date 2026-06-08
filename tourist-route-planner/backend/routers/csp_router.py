"""CO3 CSP Scheduling API endpoints."""
from fastapi import APIRouter
from typing import List, Optional, Dict
from pydantic import BaseModel
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from algorithms.co3_csp import TouristCSP, min_conflicts

router = APIRouter(prefix="/api/csp", tags=["CO3 CSP"])


class CSPRequest(BaseModel):
    attraction_ids: List[int]
    budget_inr: float = 2000.0
    max_time_min: float = 480.0
    preferred_categories: Optional[List[str]] = None
    must_morning: Optional[List[int]] = None
    use_mrv: bool = True
    use_lcv: bool = True
    use_forward_checking: bool = True
    use_ac3: bool = True
    algorithm: str = "backtracking"   # backtracking | min_conflicts


@router.post("/schedule")
async def schedule(req: CSPRequest):
    if req.algorithm == "min_conflicts":
        result = min_conflicts(
            req.attraction_ids, req.budget_inr, req.max_time_min
        )
        return result

    csp = TouristCSP(
        attraction_ids=req.attraction_ids,
        budget_inr=req.budget_inr,
        max_time_min=req.max_time_min,
        preferred_categories=req.preferred_categories or [],
        must_morning=req.must_morning or [],
    )
    result = csp.solve(
        use_mrv=req.use_mrv,
        use_lcv=req.use_lcv,
        use_forward_checking=req.use_forward_checking,
        use_ac3=req.use_ac3,
    )
    return result


@router.get("/domains/{attraction_id}")
async def get_domains(attraction_id: int):
    csp = TouristCSP(attraction_ids=[attraction_id])
    return {"attraction_id": attraction_id, "domain": csp.domains.get(attraction_id, [])}
