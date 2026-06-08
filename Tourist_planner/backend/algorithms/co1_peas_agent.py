"""
CO1 — PEAS Agent Model, Environment Types, Knowledge Representation

Topics covered:
  - PEAS description (Performance, Environment, Actuators, Sensors)
  - Environment type classification (observable, deterministic, episodic, static, discrete, agents)
  - Knowledge representation: graph, rule-based, constraint-based
  - Problem formulation review
  - Python essentials: dataclasses, typing, recursion, complexity

Standalone runnable: python co1_peas_agent.py
"""

from __future__ import annotations
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dataclasses import dataclass, field
from typing import List, Dict, Any, Callable, Optional, Tuple
from enum import Enum, auto
import math

from data.hyderabad_attractions import ATTRACTIONS, ATTRACTION_MAP, GRAPH, get_neighbors, straight_line_distance
from models.state import TouristState, Action, TouristProblem


# ===========================================================================
# PEAS FRAMEWORK
# ===========================================================================

@dataclass
class PEAS:
    """
    PEAS description of the Tourist Navigation Agent.

    P — Performance Measure: what does success look like?
    E — Environment: what is the agent embedded in?
    A — Actuators: how does the agent act on the world?
    S — Sensors: how does the agent perceive the world?
    """
    performance_measures: List[str]
    environment: List[str]
    actuators: List[str]
    sensors: List[str]

    def describe(self) -> str:
        lines = ["=" * 65, "PEAS AGENT DESCRIPTION — Hyderabad Tourist Navigator", "=" * 65]
        sections = [
            ("Performance Measures", self.performance_measures),
            ("Environment",          self.environment),
            ("Actuators",            self.actuators),
            ("Sensors",              self.sensors),
        ]
        for title, items in sections:
            lines.append(f"\n  [{title}]")
            for item in items:
                lines.append(f"    • {item}")
        lines.append("=" * 65)
        return "\n".join(lines)


TOURIST_AGENT_PEAS = PEAS(
    performance_measures=[
        "Maximize total attraction rating covered",
        "Minimize total travel cost (INR)",
        "Minimize total travel + visit time (minutes)",
        "Maximize preference match (category alignment)",
        "Minimize crowd exposure (if avoid_crowds=True)",
        "Maximize satisfaction score (rating × preference_match)",
    ],
    environment=[
        "25 Hyderabad tourist attractions (nodes)",
        "Road network connecting attractions (weighted graph)",
        "Dynamic crowd levels varying by time of day",
        "Weather conditions (sunny / cloudy / rainy)",
        "Tourist budget and time constraints",
        "Opening/closing hours per attraction",
    ],
    actuators=[
        "Route planner: selects next attraction to visit",
        "Schedule generator: assigns time slots to attractions",
        "Itinerary formatter: produces human-readable plan",
        "Alert system: warns about budget / time overruns",
    ],
    sensors=[
        "GPS module: current location (lat/lng)",
        "Clock: current time of day",
        "Budget tracker: remaining INR",
        "Crowd sensor: estimated crowd level at attraction",
        "Weather API: current weather conditions",
        "User preference profile: categories, budget, time",
    ],
)


# ===========================================================================
# ENVIRONMENT TYPE CLASSIFICATION
# ===========================================================================

class ObservabilityType(Enum):
    FULLY_OBSERVABLE = auto()
    PARTIALLY_OBSERVABLE = auto()

class DeterminismType(Enum):
    DETERMINISTIC = auto()
    STOCHASTIC = auto()

class EpisodicType(Enum):
    EPISODIC = auto()
    SEQUENTIAL = auto()

class DynamismType(Enum):
    STATIC = auto()
    DYNAMIC = auto()
    SEMIDYNAMIC = auto()

class DiscreteType(Enum):
    DISCRETE = auto()
    CONTINUOUS = auto()

class AgentType(Enum):
    SINGLE = auto()
    MULTI = auto()


@dataclass
class EnvironmentClassification:
    """CO1: Classifies the tourist navigation environment on 6 dimensions."""
    observability: ObservabilityType
    determinism: DeterminismType
    episodic: EpisodicType
    dynamism: DynamismType
    discreteness: DiscreteType
    agents: AgentType
    justifications: Dict[str, str] = field(default_factory=dict)

    def describe(self) -> str:
        lines = ["\n  ENVIRONMENT TYPE CLASSIFICATION", "  " + "-"*50]
        attrs = [
            ("Observability", self.observability.name, self.justifications.get("observability", "")),
            ("Determinism",   self.determinism.name,   self.justifications.get("determinism", "")),
            ("Episodic",      self.episodic.name,      self.justifications.get("episodic", "")),
            ("Dynamism",      self.dynamism.name,       self.justifications.get("dynamism", "")),
            ("Discreteness",  self.discreteness.name,  self.justifications.get("discreteness", "")),
            ("Agents",        self.agents.name,         self.justifications.get("agents", "")),
        ]
        for name, val, just in attrs:
            lines.append(f"  {name:<16}: {val:<25} — {just}")
        return "\n".join(lines)


TOURIST_ENV = EnvironmentClassification(
    observability=ObservabilityType.PARTIALLY_OBSERVABLE,
    determinism=DeterminismType.STOCHASTIC,
    episodic=EpisodicType.SEQUENTIAL,
    dynamism=DynamismType.DYNAMIC,
    discreteness=DiscreteType.DISCRETE,
    agents=AgentType.SINGLE,
    justifications={
        "observability": "Crowd levels and exact travel times are uncertain until visited",
        "determinism":   "Traffic, weather, and crowds are stochastic",
        "episodic":      "Each decision affects future states (budget, time, visited set)",
        "dynamism":      "Crowds and traffic change while agent deliberates",
        "discreteness":  "Attractions and time slots are discrete choices",
        "agents":        "Single tourist agent; no adversaries (CO4 adds adversarial weather)",
    }
)


# ===========================================================================
# KNOWLEDGE REPRESENTATION
# ===========================================================================

class KnowledgeBase:
    """
    CO1: Three forms of knowledge representation:
    1. Graph — attraction connectivity
    2. Rule-based — if/then decision rules
    3. Constraint-based — hard limits on solutions
    """

    def __init__(self):
        # --- 1. Graph representation ---
        self.graph: Dict[int, List[Tuple[int, float, float, float]]] = GRAPH
        self.attractions: Dict[int, Any] = ATTRACTION_MAP

        # --- 2. Rule-based representation ---
        # Each rule: (name, condition_fn, recommendation)
        self.rules: List[Tuple[str, Callable[[TouristState, TouristProblem], bool], str]] = [
            (
                "BUDGET_CRITICAL",
                lambda s, p: s.cost_spent > 0.8 * p.budget_inr,
                "Budget >80% used — prefer free attractions"
            ),
            (
                "TIME_CRITICAL",
                lambda s, p: s.time_elapsed_min > 0.75 * p.max_time_min,
                "Time >75% elapsed — head toward must-visit goals"
            ),
            (
                "MORNING_VISIT_RELIGIOUS",
                lambda s, p: 6 <= s.day_hour < 10,
                "Morning: ideal time for religious sites (Birla Mandir opens 7am)"
            ),
            (
                "AVOID_AFTERNOON_CROWDS",
                lambda s, p: p.avoid_crowds and 12 <= s.day_hour < 16,
                "Afternoon: crowds peak — prefer indoor museums"
            ),
            (
                "CLOSING_SOON",
                lambda s, p: any(
                    self.attractions[g].closing_time - s.day_hour <= 1
                    for g in p.goal_ids if g in self.attractions
                ),
                "Goal attraction closing within 1 hour — prioritize immediately"
            ),
        ]

        # --- 3. Constraint representation ---
        self.constraints: List[Tuple[str, str]] = [
            ("BUDGET", "sum(entry_costs + travel_costs) <= budget_inr"),
            ("TIME",   "sum(visit_durations + travel_times) <= max_time_min"),
            ("OPEN",   "arrival_hour in [opening_time, closing_time) for each visit"),
            ("UNIQUE", "each attraction visited at most once"),
            ("START",  "route begins at start_id"),
        ]

    def fire_rules(self, state: TouristState, problem: TouristProblem) -> List[str]:
        """Return names of all rules that fire in current state."""
        fired = []
        for name, condition, _ in self.rules:
            try:
                if condition(state, problem):
                    fired.append(name)
            except Exception:
                pass
        return fired

    def get_rule_advice(self, state: TouristState, problem: TouristProblem) -> List[str]:
        """Return advice strings for all fired rules."""
        advice = []
        for name, condition, recommendation in self.rules:
            try:
                if condition(state, problem):
                    advice.append(f"[{name}] {recommendation}")
            except Exception:
                pass
        return advice

    def describe_graph(self) -> str:
        lines = ["\n  GRAPH REPRESENTATION"]
        lines.append(f"  Nodes: {len(self.attractions)}, Edges: {sum(len(v) for v in self.graph.values())//2}")
        return "\n".join(lines)

    def describe_constraints(self) -> str:
        lines = ["\n  CONSTRAINT REPRESENTATION"]
        for name, expr in self.constraints:
            lines.append(f"  [{name}]: {expr}")
        return "\n".join(lines)


# ===========================================================================
# AGENT CLASS
# ===========================================================================

class TouristAgent:
    """
    CO1: The full agent — integrates PEAS, environment model, and KB.
    Acts as the orchestrator that other CO modules plug into.
    """

    def __init__(self, problem: TouristProblem):
        self.problem = problem
        self.kb = KnowledgeBase()
        self.trace: List[Dict[str, Any]] = []

    def perceive(self, state: TouristState) -> Dict[str, Any]:
        """Sensor readings for current state."""
        attr = ATTRACTION_MAP.get(state.current_id)
        return {
            "location": state.current_id,
            "location_name": attr.name if attr else "Unknown",
            "time": state.day_hour,
            "time_slot": state.time_slot(),
            "budget_remaining": self.problem.budget_inr - state.cost_spent,
            "time_remaining_min": self.problem.max_time_min - state.time_elapsed_min,
            "visited_count": len(state.visited),
            "crowd_level": attr.crowd_probs.get(state.time_slot(), 0.5) if attr else 0.5,
            "active_rules": self.kb.fire_rules(state, self.problem),
        }

    def log(self, step: str, data: Dict[str, Any]) -> None:
        self.trace.append({"step": step, **data})

    def get_peas(self) -> Dict[str, Any]:
        return {
            "performance_measures": TOURIST_AGENT_PEAS.performance_measures,
            "environment": TOURIST_AGENT_PEAS.environment,
            "actuators": TOURIST_AGENT_PEAS.actuators,
            "sensors": TOURIST_AGENT_PEAS.sensors,
        }

    def get_environment_type(self) -> Dict[str, str]:
        env = TOURIST_ENV
        return {
            "observability": env.observability.name,
            "determinism": env.determinism.name,
            "episodic": env.episodic.name,
            "dynamism": env.dynamism.name,
            "discreteness": env.discreteness.name,
            "agents": env.agents.name,
            "justifications": env.justifications,
        }


# ===========================================================================
# Standalone runner
# ===========================================================================

if __name__ == "__main__":
    print(TOURIST_AGENT_PEAS.describe())
    print(TOURIST_ENV.describe())

    problem = TouristProblem(
        start_id=0, goal_ids=[1, 9, 16],
        budget_inr=500, max_time_min=300,
        avoid_crowds=True
    )
    agent = TouristAgent(problem)

    state = TouristState(
        current_id=0, visited=(0,),
        time_elapsed_min=0, cost_spent=0, day_hour=9.0
    )
    perception = agent.perceive(state)
    print("\n  AGENT PERCEPTION AT START")
    print("  " + "-"*50)
    for k, v in perception.items():
        print(f"  {k:<25}: {v}")

    state2 = TouristState(
        current_id=0, visited=(0,),
        time_elapsed_min=250, cost_spent=430, day_hour=13.5
    )
    advice = agent.kb.get_rule_advice(state2, problem)
    print("\n  RULE FIRING (stressed state)")
    print("  " + "-"*50)
    for a in advice:
        print(f"  {a}")

    kb = KnowledgeBase()
    print(kb.describe_graph())
    print(kb.describe_constraints())
