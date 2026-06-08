"""CO5 Probabilistic Reasoning API endpoints."""
from fastapi import APIRouter
from typing import Optional, Dict
from pydantic import BaseModel
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from algorithms.co5_probabilistic import (
    BayesianNetwork, TouristHMM, bayes_update_crowd,
    rejection_sampling, likelihood_weighting,
)

router = APIRouter(prefix="/api/probabilistic", tags=["CO5 Probabilistic"])

_bn  = BayesianNetwork()
_hmm = TouristHMM()


class BayesRequest(BaseModel):
    attraction_id: int
    time_slot: str = "afternoon"
    day_type: str = "weekday"
    weather: str = "sunny"


class InferenceRequest(BaseModel):
    evidence: Dict[str, str]
    query: str = "satisfaction"
    n_samples: int = 5000
    method: str = "exact"   # exact | rejection | likelihood_weighting


class HMMRequest(BaseModel):
    observations: list


@router.post("/bayes-update")
async def bayes_update(req: BayesRequest):
    return bayes_update_crowd(req.time_slot, req.day_type, req.weather, req.attraction_id)


@router.post("/infer")
async def infer(req: InferenceRequest):
    if req.method == "exact":
        return _bn.infer_satisfaction(req.evidence)
    elif req.method == "rejection":
        return rejection_sampling(_bn, req.query, req.evidence, req.n_samples)
    else:
        return likelihood_weighting(_bn, req.query, req.evidence, req.n_samples)


@router.post("/crowd")
async def infer_crowd(weather: Optional[str] = None,
                      time_slot: Optional[str] = None,
                      day_type: Optional[str] = None):
    return _bn.infer_crowd_given_evidence(weather, time_slot, day_type)


@router.post("/hmm")
async def hmm_track(req: HMMRequest):
    return _hmm.sensor_fusion(req.observations)
