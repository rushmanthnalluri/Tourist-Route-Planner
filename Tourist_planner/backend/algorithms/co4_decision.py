"""
CO4 — Decision Theory, Utility Functions, Minimax, Alpha-Beta Pruning

Models tourist route selection as a decision problem:
  - Utility function: weighted combination of ratings, cost-efficiency, coverage
  - Minimax: adversarial route planning where "nature" (weather/traffic) tries to
    maximize disruption while the tourist minimizes it
  - Alpha-beta pruning: efficient minimax
  - Evaluation function for partial routes (depth-limited search)
  - Expected utility with stochastic events (expectimax concept)
  - Multi-objective utility with bounded rationality

Standalone runnable: python co4_decision.py
"""

from __future__ import annotations
import sys, os, math, time
from typing import List, Dict, Tuple, Optional, Any
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.hyderabad_attractions import ATTRACTION_MAP, GRAPH, get_neighbors, straight_line_distance
from models.state import TouristState, TouristProblem


# ===========================================================================
# UTILITY FUNCTION
# ===========================================================================

class UtilityFunction:
    """
    CO4: Multi-attribute utility function for evaluating tourist routes.
    U(route) = w_rating * rating_score
             + w_cost  * cost_efficiency
             + w_time  * time_efficiency
             + w_pref  * preference_score
             - w_crowd * crowd_penalty

    All weights sum to 1.0. Each component normalized to [0, 1].
    """

    def __init__(
        self,
        w_rating: float = 0.35,
        w_cost: float   = 0.25,
        w_time: float   = 0.20,
        w_pref: float   = 0.15,
        w_crowd: float  = 0.05,
        preferred_categories: Optional[List[str]] = None,
        budget_inr: float = 2000.0,
        max_time_min: float = 480.0,
    ):
        total = w_rating + w_cost + w_time + w_pref + w_crowd
        self.w_rating = w_rating / total
        self.w_cost   = w_cost / total
        self.w_time   = w_time / total
        self.w_pref   = w_pref / total
        self.w_crowd  = w_crowd / total
        self.preferred_categories = preferred_categories or []
        self.budget = budget_inr
        self.max_time = max_time_min

    def evaluate(
        self,
        path: List[int],
        total_cost: float,
        total_time_min: float,
        time_slot: str = "afternoon",
    ) -> Dict[str, float]:
        """
        Compute utility of a route.
        Returns breakdown of all utility components + final score.
        """
        if not path:
            return {"utility": 0.0, "components": {}}

        attrs = [ATTRACTION_MAP[i] for i in path if i in ATTRACTION_MAP]

        # Component 1: Rating score (avg rating normalized 0-5 → 0-1)
        avg_rating = sum(a.rating for a in attrs) / len(attrs) if attrs else 0
        rating_score = avg_rating / 5.0

        # Component 2: Cost efficiency (value per rupee)
        if total_cost > 0:
            total_rating_pts = sum(a.rating for a in attrs)
            cost_efficiency = min(1.0, total_rating_pts / (total_cost / 100))  # normalize
        else:
            cost_efficiency = 1.0  # free route is maximally cost-efficient

        # Component 3: Time efficiency (more attractions per hour = better)
        hours = total_time_min / 60.0 if total_time_min > 0 else 1.0
        time_efficiency = min(1.0, len(path) / (hours * 1.5))  # 1.5 attractions/hr = perfect

        # Component 4: Preference score
        if self.preferred_categories:
            matching = sum(1 for a in attrs if a.category in self.preferred_categories)
            pref_score = matching / len(attrs) if attrs else 0
        else:
            pref_score = 0.5  # neutral

        # Component 5: Crowd penalty
        crowd_levels = [a.crowd_probs.get(time_slot, 0.5) for a in attrs]
        avg_crowd = sum(crowd_levels) / len(crowd_levels) if crowd_levels else 0.5
        crowd_penalty = avg_crowd  # higher crowd = more penalty

        # Final utility
        utility = (
            self.w_rating * rating_score
            + self.w_cost  * cost_efficiency
            + self.w_time  * time_efficiency
            + self.w_pref  * pref_score
            - self.w_crowd * crowd_penalty
        )

        return {
            "utility": round(utility, 4),
            "components": {
                "rating_score":     round(rating_score, 4),
                "cost_efficiency":  round(cost_efficiency, 4),
                "time_efficiency":  round(time_efficiency, 4),
                "preference_score": round(pref_score, 4),
                "crowd_penalty":    round(crowd_penalty, 4),
            },
            "weights": {
                "w_rating": self.w_rating, "w_cost": self.w_cost,
                "w_time": self.w_time, "w_pref": self.w_pref, "w_crowd": self.w_crowd,
            }
        }


# ===========================================================================
# GAME TREE NODE
# ===========================================================================

# GameNode uses manual __init__ (not dataclass) to allow Optional self-reference


class GameNode:
    """
    CO4: Node in a 2-player minimax game tree.
    MAX player = Tourist (maximizes utility)
    MIN player = Nature/Adversary (minimizes tourist's utility)
                 Nature represents weather, traffic, closures.

    Terminal depth = depth_limit (evaluated by eval_fn).
    """

    def __init__(
        self,
        attractions: List[int],
        collected: List[int],
        nature_disrupted: List[int],
        is_max: bool,
        depth: int,
        parent: Optional["GameNode"] = None,
        action_taken: str = "",
    ):
        self.attractions = attractions      # remaining attractions to consider
        self.collected = collected          # attractions tourist successfully visited
        self.nature_disrupted = nature_disrupted  # attractions closed by nature
        self.is_max = is_max                # True = tourist's turn, False = nature's
        self.depth = depth
        self.parent = parent
        self.action_taken = action_taken
        self.children: List["GameNode"] = []
        self.value: Optional[float] = None

    def is_terminal(self, depth_limit: int) -> bool:
        return self.depth >= depth_limit or not self.attractions

    def __repr__(self) -> str:
        player = "TOURIST" if self.is_max else "NATURE"
        return (f"GameNode({player}, depth={self.depth}, "
                f"collected={self.collected}, disrupted={self.nature_disrupted})")


# ===========================================================================
# EVALUATION FUNCTION
# ===========================================================================

def eval_fn(
    node: GameNode,
    utility_fn: UtilityFunction,
    budget_inr: float,
    max_time_min: float,
) -> float:
    """
    CO4: Evaluation function for non-terminal nodes.
    Estimates utility of partial route.

    eval(node) = Σ rating(visited) / (1 + disruption_penalty)
    """
    if not node.collected:
        return 0.0

    attrs = [ATTRACTION_MAP[i] for i in node.collected if i in ATTRACTION_MAP]
    total_cost = sum(a.entry_cost for a in attrs)
    total_time = sum(a.duration_min for a in attrs)

    disruption_count = len(node.nature_disrupted)
    disruption_penalty = 0.1 * disruption_count

    result = utility_fn.evaluate(
        node.collected, total_cost, total_time, "afternoon"
    )
    base = result["utility"]
    return max(0.0, base - disruption_penalty)


# ===========================================================================
# MINIMAX WITH ALPHA-BETA PRUNING
# ===========================================================================

class MinimaxSolver:
    """
    CO4: Minimax with Alpha-Beta pruning for adversarial route planning.

    Game setup:
      - Tourist picks attractions to visit (MAX player, wants high utility)
      - Nature disrupts: can close 1 attraction per turn (MIN player, wants low utility)
      - Alternating turns for depth_limit levels
      - At terminal nodes, evaluate with eval_fn

    Alpha-Beta:
      alpha = best MAX has found (lower bound for MAX)
      beta  = best MIN has found (upper bound for MIN)
      Prune when alpha >= beta
    """

    def __init__(
        self,
        attractions: List[int],
        utility_fn: UtilityFunction,
        depth_limit: int = 4,
        budget_inr: float = 2000.0,
        max_time_min: float = 480.0,
    ):
        self.attractions = attractions
        self.utility_fn = utility_fn
        self.depth_limit = depth_limit
        self.budget = budget_inr
        self.max_time = max_time_min
        self.nodes_evaluated = 0
        self.nodes_pruned = 0
        self.trace: List[Dict[str, Any]] = []

    def _log(self, **kwargs) -> None:
        # Stop collecting trace after 80 entries to keep response payload small
        if len(self.trace) < 80:
            cleaned = {}
            for k, v in kwargs.items():
                if isinstance(v, float) and math.isinf(v):
                    cleaned[k] = 9999.0 if v > 0 else -9999.0
                else:
                    cleaned[k] = v
            self.trace.append(cleaned)

    def minimax(
        self,
        node: GameNode,
        alpha: float,
        beta: float,
    ) -> float:
        """
        CO4: Alpha-beta minimax.
        Returns minimax value of node.
        """
        self.nodes_evaluated += 1

        if node.is_terminal(self.depth_limit):
            val = eval_fn(node, self.utility_fn, self.budget, self.max_time)
            node.value = val
            self._log(
                action="TERMINAL", depth=node.depth,
                player="MAX" if node.is_max else "MIN",
                value=round(val, 4),
                collected=node.collected
            )
            return val

        if node.is_max:
            # Tourist's turn: pick one more attraction to visit
            max_val = float("-inf")
            remaining = [a for a in node.attractions if a not in node.collected and a not in node.nature_disrupted]

            if not remaining:
                val = eval_fn(node, self.utility_fn, self.budget, self.max_time)
                node.value = val
                return val

            for choice in remaining[:4]:  # limit branching factor to 4
                child = GameNode(
                    attractions=node.attractions,
                    collected=node.collected + [choice],
                    nature_disrupted=list(node.nature_disrupted),
                    is_max=False,
                    depth=node.depth + 1,
                    parent=node,
                    action_taken=f"VISIT_{ATTRACTION_MAP[choice].name if choice in ATTRACTION_MAP else choice}"
                )
                node.children.append(child)

                val = self.minimax(child, alpha, beta)
                max_val = max(max_val, val)
                alpha = max(alpha, val)

                self._log(
                    action="MAX_NODE", depth=node.depth, choice=choice,
                    val=round(val, 4), alpha=round(alpha, 4), beta=round(beta, 4)
                )

                if alpha >= beta:
                    self.nodes_pruned += 1
                    self._log(action="ALPHA_BETA_PRUNE", depth=node.depth,
                              reason=f"alpha={alpha:.3f} >= beta={beta:.3f}")
                    break  # Beta cutoff

            node.value = max_val
            return max_val

        else:
            # Nature's turn: disrupt one attraction
            min_val = float("inf")
            available_to_disrupt = [a for a in node.attractions
                                    if a not in node.collected and a not in node.nature_disrupted]

            if not available_to_disrupt:
                # Nature has nothing to disrupt — tourist wins this branch
                val = eval_fn(node, self.utility_fn, self.budget, self.max_time)
                node.value = val
                return val

            # Nature also has option to do nothing
            options = [None] + available_to_disrupt[:3]

            for disruption in options:
                new_disrupted = list(node.nature_disrupted)
                if disruption is not None:
                    new_disrupted.append(disruption)

                child = GameNode(
                    attractions=node.attractions,
                    collected=list(node.collected),
                    nature_disrupted=new_disrupted,
                    is_max=True,
                    depth=node.depth + 1,
                    parent=node,
                    action_taken=(f"DISRUPT_{ATTRACTION_MAP[disruption].name}"
                                  if disruption and disruption in ATTRACTION_MAP
                                  else "NO_DISRUPTION")
                )
                node.children.append(child)

                val = self.minimax(child, alpha, beta)
                min_val = min(min_val, val)
                beta = min(beta, val)

                self._log(
                    action="MIN_NODE", depth=node.depth,
                    disruption=disruption,
                    val=round(val, 4), alpha=round(alpha, 4), beta=round(beta, 4)
                )

                if alpha >= beta:
                    self.nodes_pruned += 1
                    self._log(action="ALPHA_BETA_PRUNE", depth=node.depth,
                              reason=f"alpha={alpha:.3f} >= beta={beta:.3f}")
                    break  # Alpha cutoff

            node.value = min_val
            return min_val

    def solve(self) -> Dict[str, Any]:
        start = time.perf_counter_ns()
        self.nodes_evaluated = 0
        self.nodes_pruned = 0
        self.trace = []

        # Safety: if no attractions passed, return immediately
        if not self.attractions:
            return {
                "minimax_value": 0.0,
                "optimal_first_choice": "None",
                "optimal_collected": [],
                "nodes_evaluated": 0,
                "nodes_pruned": 0,
                "pruning_ratio": 0.0,
                "runtime_ms": 0.0,
                "trace": [],
            }

        root = GameNode(
            attractions=self.attractions,
            collected=[],
            nature_disrupted=[],
            is_max=True,
            depth=0
        )

        minimax_value = self.minimax(root, float("-inf"), float("inf"))
        runtime_ms = (time.perf_counter_ns() - start) / 1e6

        # Extract optimal tourist strategy (best child of root)
        best_child = None
        if root.children:
            best_child = max(root.children, key=lambda c: c.value if c.value is not None else -1)

        return {
            "minimax_value": round(minimax_value, 4),
            "optimal_first_choice": (
                ATTRACTION_MAP[best_child.collected[-1]].name
                if best_child and best_child.collected and best_child.collected[-1] in ATTRACTION_MAP
                else "None"
            ),
            "optimal_collected": best_child.collected if best_child else [],
            "nodes_evaluated": self.nodes_evaluated,
            "nodes_pruned": self.nodes_pruned,
            "pruning_ratio": round(self.nodes_pruned / max(1, self.nodes_evaluated), 3),
            "runtime_ms": round(runtime_ms, 3),
            # Cap trace to keep response size small
            "trace": self.trace[:80],
        }


# ===========================================================================
# EXPECTED UTILITY (Expectimax concept)
# ===========================================================================

def expected_utility(
    attraction_ids: List[int],
    utility_fn: UtilityFunction,
    weather_prob_rain: float = 0.3,
) -> Dict[str, Any]:
    """
    CO4: Expected utility over stochastic weather outcomes.
    EU(route) = P(sunny) * U(route | sunny) + P(rain) * U(route | rain)

    Rain degrades outdoor attractions based on weather_sensitivity.
    Demonstrates: EU > deterministic utility for robust route planning.
    """
    trace = []
    results = []

    for aid in attraction_ids:
        attr = ATTRACTION_MAP.get(aid)
        if attr is None:
            continue

        # Utility in sunny conditions
        u_sunny = utility_fn.evaluate([aid], attr.entry_cost, attr.duration_min, "afternoon")
        util_sunny = u_sunny["utility"]

        # Utility in rainy conditions — degrade by weather_sensitivity
        # (outdoor attractions lose more value in rain than indoor ones)
        util_rain = util_sunny * (1.0 - attr.weather_sensitivity)

        # Expected utility
        eu = (1 - weather_prob_rain) * util_sunny + weather_prob_rain * util_rain

        results.append({
            "id": aid,
            "name": attr.name,
            "utility_sunny": round(util_sunny, 4),
            "utility_rain": round(util_rain, 4),
            "expected_utility": round(eu, 4),
            "weather_sensitivity": attr.weather_sensitivity,
            "recommended": eu > 0.3,
        })

        trace.append({
            "attraction": attr.name,
            "P(rain)": weather_prob_rain,
            "U(sunny)": round(util_sunny, 4),
            "U(rain)": round(util_rain, 4),
            "EU": round(eu, 4)
        })

    results.sort(key=lambda x: x["expected_utility"], reverse=True)
    return {"results": results, "trace": trace, "weather_prob_rain": weather_prob_rain}


# ===========================================================================
# POLICY SELECTION — Bounded Rationality
# ===========================================================================

def policy_selection(
    candidate_routes: List[Dict[str, Any]],
    utility_fn: UtilityFunction,
    aspiration_level: float = 0.5,
) -> Dict[str, Any]:
    """
    CO4: Bounded rationality — satisficing policy.
    Instead of exhaustively finding the optimal route, accept the first route
    that achieves utility >= aspiration_level.

    Demonstrates: real agents often satisfice (Simon's bounded rationality)
    rather than optimize when search is expensive.
    """
    trace = []

    for i, route in enumerate(candidate_routes):
        path = route.get("path", [])
        total_cost = route.get("total_cost", 0)
        total_time = route.get("total_time_min", 0)

        u = utility_fn.evaluate(path, total_cost, total_time)
        util = u["utility"]

        trace.append({"route_idx": i, "utility": round(util, 4),
                       "aspiration_level": aspiration_level,
                       "accepted": util >= aspiration_level})

        if util >= aspiration_level:
            return {
                "policy": "satisficing",
                "accepted_route_idx": i,
                "accepted_route": route,
                "utility": round(util, 4),
                "aspiration_level": aspiration_level,
                "routes_evaluated": i + 1,
                "trace": trace,
            }

    # Fall back to best available
    if candidate_routes:
        scored = []
        for route in candidate_routes:
            u = utility_fn.evaluate(
                route.get("path", []),
                route.get("total_cost", 0),
                route.get("total_time_min", 0)
            )
            scored.append((u["utility"], route))
        best_u, best_route = max(scored, key=lambda x: x[0])
        return {
            "policy": "best_available",
            "accepted_route": best_route,
            "utility": round(best_u, 4),
            "aspiration_level": aspiration_level,
            "routes_evaluated": len(candidate_routes),
            "note": "No route met aspiration level; returning best available",
            "trace": trace,
        }

    return {"policy": "no_routes", "utility": 0.0, "trace": trace}


# ===========================================================================
# Standalone runner — python co4_decision.py
# ===========================================================================

if __name__ == "__main__":
    print("=" * 65)
    print("CO4 — Decision Theory: Utility, Minimax, Alpha-Beta")
    print("=" * 65)

    uf = UtilityFunction(
        w_rating=0.35, w_cost=0.25, w_time=0.20, w_pref=0.15, w_crowd=0.05,
        preferred_categories=["historical", "religious"],
        budget_inr=500, max_time_min=300
    )

    # --- Utility function demo ---
    test_routes = [
        ([0, 16, 9], 200, 180, "afternoon"),     # Charminar, Mecca Masjid, Chowmahalla
        ([1, 10, 11], 150, 270, "morning"),        # Golconda, Qutb Shahi, Taramati
        ([4, 8, 7], 90, 195, "evening"),           # Birla Mandir, Science Mus, Lumbini
    ]
    print("\n--- Utility Function Evaluation ---")
    for path, cost, tmin, slot in test_routes:
        names = [ATTRACTION_MAP[i].name for i in path]
        u = uf.evaluate(path, cost, tmin, slot)
        print(f"\n  Route: {' -> '.join(names)}")
        print(f"  Utility: {u['utility']}")
        for k, v in u["components"].items():
            print(f"    {k:<22}: {v:.4f}")

    # --- Minimax demo ---
    print("\n" + "="*65)
    print("Minimax with Alpha-Beta Pruning")
    print("="*65)
    solver = MinimaxSolver(
        attractions=[0, 1, 4, 9, 16, 3],
        utility_fn=uf, depth_limit=4, budget_inr=500, max_time_min=300
    )
    result = solver.solve()
    print(f"\n  Minimax value    : {result['minimax_value']}")
    print(f"  Optimal 1st pick : {result['optimal_first_choice']}")
    print(f"  Nodes evaluated  : {result['nodes_evaluated']}")
    print(f"  Nodes pruned     : {result['nodes_pruned']}")
    print(f"  Pruning ratio    : {result['pruning_ratio']*100:.1f}%")
    print(f"  Runtime          : {result['runtime_ms']} ms")

    print("\n  Alpha-Beta trace (first 10):")
    for entry in result["trace"][:10]:
        print(f"    {entry}")

    # --- Expected utility ---
    print("\n" + "="*65)
    print("Expected Utility Under Weather Uncertainty")
    print("="*65)
    eu_result = expected_utility([0, 1, 2, 4, 5, 7, 13], uf, weather_prob_rain=0.3)
    print(f"\n  P(rain) = {eu_result['weather_prob_rain']}")
    print(f"\n  {'Attraction':<30} {'U(sunny)':<12} {'U(rain)':<12} {'EU':<10} {'Recommended'}")
    print("  " + "-"*70)
    for r in eu_result["results"]:
        rec = "[Y]" if r["recommended"] else "[N]"
        print(f"  {r['name']:<30} {r['utility_sunny']:<12} {r['utility_rain']:<12} {r['expected_utility']:<10} {rec}")
