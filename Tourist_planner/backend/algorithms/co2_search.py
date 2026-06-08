"""
CO2 — Search Algorithms for Tourist Route Planning

Algorithms implemented:
  1. BFS  — Breadth-First Search (optimal for uniform edge cost)
  2. DFS  — Depth-First Search (memory-efficient, not optimal)
  3. UCS  — Uniform-Cost Search (optimal, minimizes path cost)
  4. Greedy — Greedy Best-First Search (fast, not optimal)
  5. A*   — A* Search (optimal + efficient with admissible heuristic)
  6. IDA* — Iterative Deepening A* (memory-bounded)

All algorithms:
  - Accept a TouristProblem and a cost_mode ('distance' | 'cost' | 'time')
  - Return SearchResult with full step-by-step trace
  - Log: node expansions, frontier size, generated nodes, runtime, peak memory

Heuristic (A* / Greedy):
  h(n) = straight-line distance (km) to nearest unvisited goal attraction
  Admissibility proof: h ≤ actual road distance (Haversine ≤ road distance)
  Consistency: h(n) ≤ c(n,a,n') + h(n') since triangle inequality holds

Standalone runnable: python co2_search.py
"""

from __future__ import annotations
import sys, os, time, heapq, tracemalloc
from collections import deque
from typing import List, Dict, Tuple, Optional, Any, Set
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.hyderabad_attractions import (
    ATTRACTION_MAP, GRAPH, get_neighbors, straight_line_distance
)
from models.state import TouristState, Action, SearchNode, TouristProblem, SearchResult


# ===========================================================================
# COST FUNCTIONS
# ===========================================================================

COST_MODES = ("distance", "cost", "time")

def edge_cost(nbr: Tuple[int, float, float, float], mode: str) -> float:
    """
    Extract scalar cost from edge tuple (id, road_km, time_min, cost_inr).
    CO2: defines the step cost c(s, a, s').
    """
    _, road_km, time_min, cost_inr = nbr
    if mode == "distance":
        return road_km
    elif mode == "cost":
        return cost_inr
    else:  # time
        return time_min


def visit_cost(attr_id: int, mode: str) -> float:
    """Cost of staying at an attraction (entry fee or duration)."""
    attr = ATTRACTION_MAP.get(attr_id)
    if attr is None:
        return 0.0
    if mode == "cost":
        return attr.entry_cost
    elif mode == "time":
        return attr.duration_min
    return 0.0


# ===========================================================================
# HEURISTIC
# ===========================================================================

def heuristic(state: TouristState, problem: TouristProblem, mode: str) -> float:
    """
    CO2: Admissible heuristic h(n).
    Returns min straight-line distance (km) to nearest unvisited goal.
    For cost/time modes, scale by average cost-per-km.

    Admissibility: h(n) ≤ h*(n) because straight-line ≤ road distance.
    Consistency : h(n) ≤ c(n,a,n') + h(n') — triangle inequality on Euclidean space.
    """
    unvisited_goals = [g for g in problem.goal_ids if g not in state.visited]
    if not unvisited_goals:
        return 0.0

    min_dist = min(straight_line_distance(state.current_id, g) for g in unvisited_goals)

    if mode == "distance":
        return min_dist
    elif mode == "cost":
        # avg auto fare ~ Rs12/km, so h = 12 * straight_line (admissible since road > straight)
        return min_dist * 12.0
    else:  # time: avg speed 20 km/h → min_time = dist/speed * 60
        return (min_dist / 20.0) * 60.0


# ===========================================================================
# TRANSITION MODEL
# ===========================================================================

def expand(node: SearchNode, problem: TouristProblem, mode: str) -> List[SearchNode]:
    """
    CO2: Generate successor nodes.
    Applies feasibility checks: budget, time, open hours, not-revisit.
    """
    successors: List[SearchNode] = []
    state = node.state
    attr = ATTRACTION_MAP.get(state.current_id)
    if attr is None:
        return successors

    for nbr_id, road_km, time_min, cost_inr in get_neighbors(state.current_id):
        # Skip already-visited (unless it's the goal check)
        if nbr_id in state.visited:
            continue

        nbr_attr = ATTRACTION_MAP.get(nbr_id)
        if nbr_attr is None:
            continue

        # Arrival time check
        arrival_hour = state.day_hour + time_min / 60.0
        if not nbr_attr.is_open(int(arrival_hour)):
            continue  # Closed when we'd arrive

        # Budget feasibility
        total_cost = cost_inr + nbr_attr.entry_cost
        if not problem.is_budget_ok(state, total_cost):
            continue

        # Time feasibility
        total_time = time_min + nbr_attr.duration_min
        if not problem.is_time_ok(state, total_time):
            continue

        # Build new state
        new_state = TouristState(
            current_id=nbr_id,
            visited=state.visited.union([nbr_id]),
            time_elapsed_min=state.time_elapsed_min + total_time,
            cost_spent=state.cost_spent + total_cost,
            day_hour=arrival_hour + nbr_attr.duration_min / 60.0
        )

        action = Action(
            from_id=state.current_id, to_id=nbr_id,
            travel_km=road_km, travel_time_min=time_min, travel_cost=cost_inr
        )

        step_g = edge_cost((nbr_id, road_km, time_min, cost_inr), mode) + visit_cost(nbr_id, mode)
        new_g = node.path_cost + step_g
        h = heuristic(new_state, problem, mode)

        child = SearchNode(
            state=new_state, parent=node, action=action,
            path_cost=new_g, depth=node.depth + 1, heuristic=h
        )
        successors.append(child)

    return successors


# ===========================================================================
# TRACE HELPER
# ===========================================================================

def make_trace_entry(
    step: int, algorithm: str, action: str,
    node_id: int, g: float, h: float, frontier_size: int,
    extra: Optional[Dict] = None
) -> Dict[str, Any]:
    attr = ATTRACTION_MAP.get(node_id)
    entry: Dict[str, Any] = {
        "step": step,
        "algorithm": algorithm,
        "action": action,
        "node_id": node_id,
        "node_name": attr.name if attr else str(node_id),
        "g": round(g, 3),
        "h": round(h, 3),
        "f": round(g + h, 3),
        "frontier_size": frontier_size,
    }
    if extra:
        entry.update(extra)
    return entry


def build_result(
    algorithm: str, goal_node: Optional[SearchNode],
    nodes_expanded: int, nodes_generated: int, peak_frontier: int,
    start_ns: int, trace: List[Dict], mode: str
) -> SearchResult:
    runtime_ms = (time.perf_counter_ns() - start_ns) / 1e6

    if goal_node is None:
        return SearchResult(
            algorithm=algorithm, path=[], actions=[],
            total_cost=0, total_time_min=0, total_distance_km=0,
            nodes_expanded=nodes_expanded, nodes_generated=nodes_generated,
            peak_frontier_size=peak_frontier, runtime_ms=runtime_ms,
            trace=trace, success=False, failure_reason="No path found within constraints"
        )

    path = goal_node.extract_path()
    actions = goal_node.extract_actions()
    total_dist = sum(a.travel_km for a in actions)
    total_time = goal_node.state.time_elapsed_min
    total_cost = goal_node.state.cost_spent

    return SearchResult(
        algorithm=algorithm, path=path, actions=actions,
        total_cost=total_cost, total_time_min=total_time, total_distance_km=total_dist,
        nodes_expanded=nodes_expanded, nodes_generated=nodes_generated,
        peak_frontier_size=peak_frontier, runtime_ms=runtime_ms,
        trace=trace, success=True
    )


# ===========================================================================
# 1. BFS — Breadth-First Search
# ===========================================================================

def bfs(problem: TouristProblem, mode: str = "distance") -> SearchResult:
    """
    CO2: BFS — FIFO frontier (deque).
    Explores level by level. Optimal only for unit-cost graphs.
    Closed set prevents revisiting the same (location, visited-set) state.
    Time complexity: O(b^d), Space: O(b^d)
    """
    start_ns = time.perf_counter_ns()
    trace: List[Dict] = []
    root = SearchNode(
        state=problem.initial_state(), parent=None, action=None,
        path_cost=0, heuristic=heuristic(problem.initial_state(), problem, mode)
    )
    frontier: deque = deque([root])
    closed: Set[TouristState] = set()
    nodes_expanded = 0
    nodes_generated = 1
    peak_frontier = 1
    step = 0

    trace.append(make_trace_entry(step, "BFS", "INIT", root.state.current_id, 0, root.heuristic, 1))

    while frontier:
        peak_frontier = max(peak_frontier, len(frontier))
        node = frontier.popleft()   # FIFO
        step += 1

        if node.state in closed:
            continue
        closed.add(node.state)
        nodes_expanded += 1

        trace.append(make_trace_entry(
            step, "BFS", "EXPAND", node.state.current_id,
            node.path_cost, node.heuristic, len(frontier),
            {"depth": node.depth, "visited": list(node.state.visited)}
        ))

        if problem.goal_test(node.state):
            return build_result("BFS", node, nodes_expanded, nodes_generated, peak_frontier, start_ns, trace, mode)

        for child in expand(node, problem, mode):
            if child.state not in closed:
                frontier.append(child)
                nodes_generated += 1
                trace.append(make_trace_entry(
                    step, "BFS", "GENERATE", child.state.current_id,
                    child.path_cost, child.heuristic, len(frontier)
                ))

    return build_result("BFS", None, nodes_expanded, nodes_generated, peak_frontier, start_ns, trace, mode)


# ===========================================================================
# 2. DFS — Depth-First Search
# ===========================================================================

def dfs(problem: TouristProblem, mode: str = "distance", depth_limit: int = 15) -> SearchResult:
    """
    CO2: DFS — LIFO frontier (stack).
    Low memory O(b*m), not optimal, depth_limit prevents infinite paths.
    Closed set tracks (current_id, visited_frozenset) to avoid cycles.
    Time complexity: O(b^m), Space: O(b*m)
    """
    start_ns = time.perf_counter_ns()
    trace: List[Dict] = []
    root = SearchNode(
        state=problem.initial_state(), parent=None, action=None,
        path_cost=0, heuristic=heuristic(problem.initial_state(), problem, mode)
    )
    frontier: List[SearchNode] = [root]
    closed: Set[TouristState] = set()
    nodes_expanded = 0
    nodes_generated = 1
    peak_frontier = 1
    step = 0

    trace.append(make_trace_entry(step, "DFS", "INIT", root.state.current_id, 0, root.heuristic, 1))

    while frontier:
        peak_frontier = max(peak_frontier, len(frontier))
        node = frontier.pop()   # LIFO
        step += 1

        if node.state in closed:
            continue
        if node.depth > depth_limit:
            trace.append(make_trace_entry(step, "DFS", "DEPTH_LIMIT", node.state.current_id,
                                          node.path_cost, node.heuristic, len(frontier)))
            continue

        closed.add(node.state)
        nodes_expanded += 1

        trace.append(make_trace_entry(
            step, "DFS", "EXPAND", node.state.current_id,
            node.path_cost, node.heuristic, len(frontier),
            {"depth": node.depth, "visited": list(node.state.visited)}
        ))

        if problem.goal_test(node.state):
            return build_result("DFS", node, nodes_expanded, nodes_generated, peak_frontier, start_ns, trace, mode)

        for child in reversed(expand(node, problem, mode)):   # reverse to keep left-first order
            if child.state not in closed:
                frontier.append(child)
                nodes_generated += 1

    return build_result("DFS", None, nodes_expanded, nodes_generated, peak_frontier, start_ns, trace, mode)


# ===========================================================================
# 3. UCS — Uniform-Cost Search
# ===========================================================================

def ucs(problem: TouristProblem, mode: str = "cost") -> SearchResult:
    """
    CO2: UCS — priority queue ordered by path cost g(n).
    Optimal for any non-negative step costs.
    Equivalent to Dijkstra's algorithm on state space.
    Time complexity: O(b^(1 + floor(C*/ε))), Space: same
    """
    start_ns = time.perf_counter_ns()
    trace: List[Dict] = []
    init_state = problem.initial_state()
    root = SearchNode(state=init_state, parent=None, action=None, path_cost=0)

    # heap: (priority, tie_break_counter, node)
    counter = 0
    heap: List[Tuple[float, int, SearchNode]] = [(0.0, counter, root)]
    closed: Dict[TouristState, float] = {}   # state → best g seen
    nodes_expanded = 0
    nodes_generated = 1
    peak_frontier = 1
    step = 0

    trace.append(make_trace_entry(step, "UCS", "INIT", root.state.current_id, 0, 0, 1))

    while heap:
        peak_frontier = max(peak_frontier, len(heap))
        g, _, node = heapq.heappop(heap)
        step += 1

        if node.state in closed and closed[node.state] < g:
            continue  # Stale entry in heap

        closed[node.state] = g
        nodes_expanded += 1

        trace.append(make_trace_entry(
            step, "UCS", "EXPAND", node.state.current_id,
            node.path_cost, 0, len(heap),
            {"depth": node.depth, "visited": list(node.state.visited), "g": round(g, 2)}
        ))

        if problem.goal_test(node.state):
            return build_result("UCS", node, nodes_expanded, nodes_generated, peak_frontier, start_ns, trace, mode)

        for child in expand(node, problem, mode):
            if child.state not in closed or closed[child.state] > child.path_cost:
                counter += 1
                heapq.heappush(heap, (child.path_cost, counter, child))
                nodes_generated += 1
                trace.append(make_trace_entry(
                    step, "UCS", "GENERATE", child.state.current_id,
                    child.path_cost, 0, len(heap)
                ))

    return build_result("UCS", None, nodes_expanded, nodes_generated, peak_frontier, start_ns, trace, mode)


# ===========================================================================
# 4. GREEDY BEST-FIRST SEARCH
# ===========================================================================

def greedy(problem: TouristProblem, mode: str = "distance") -> SearchResult:
    """
    CO2: Greedy — priority queue ordered by heuristic h(n) only.
    Fast but not optimal — can miss better paths through less promising nodes.
    """
    start_ns = time.perf_counter_ns()
    trace: List[Dict] = []
    init_state = problem.initial_state()
    h0 = heuristic(init_state, problem, mode)
    root = SearchNode(state=init_state, parent=None, action=None, path_cost=0, heuristic=h0)

    counter = 0
    heap: List[Tuple[float, int, SearchNode]] = [(h0, counter, root)]
    closed: Set[TouristState] = set()
    nodes_expanded = 0
    nodes_generated = 1
    peak_frontier = 1
    step = 0

    trace.append(make_trace_entry(step, "Greedy", "INIT", root.state.current_id, 0, h0, 1))

    while heap:
        peak_frontier = max(peak_frontier, len(heap))
        h_val, _, node = heapq.heappop(heap)
        step += 1

        if node.state in closed:
            continue
        closed.add(node.state)
        nodes_expanded += 1

        trace.append(make_trace_entry(
            step, "Greedy", "EXPAND", node.state.current_id,
            node.path_cost, node.heuristic, len(heap),
            {"depth": node.depth, "visited": list(node.state.visited)}
        ))

        if problem.goal_test(node.state):
            return build_result("Greedy", node, nodes_expanded, nodes_generated, peak_frontier, start_ns, trace, mode)

        for child in expand(node, problem, mode):
            if child.state not in closed:
                counter += 1
                heapq.heappush(heap, (child.heuristic, counter, child))
                nodes_generated += 1

    return build_result("Greedy", None, nodes_expanded, nodes_generated, peak_frontier, start_ns, trace, mode)


# ===========================================================================
# 5. A* SEARCH
# ===========================================================================

def astar(problem: TouristProblem, mode: str = "distance") -> SearchResult:
    """
    CO2: A* — priority queue ordered by f(n) = g(n) + h(n).
    Optimal and complete if heuristic is admissible.
    Consistent heuristic → each state expanded at most once (like UCS closed set).
    Tie-breaking: prefer shallower depth to reduce expansions.

    Time complexity: O(b^d) with perfect heuristic; degrades toward UCS with h=0.
    Space: O(b^d) — keeps all generated nodes.
    """
    start_ns = time.perf_counter_ns()
    trace: List[Dict] = []
    init_state = problem.initial_state()
    h0 = heuristic(init_state, problem, mode)
    root = SearchNode(state=init_state, parent=None, action=None, path_cost=0, heuristic=h0, depth=0)

    counter = 0
    heap: List[Tuple[float, float, int, SearchNode]] = [(root.f, 0.0, counter, root)]
    closed: Dict[TouristState, float] = {}
    nodes_expanded = 0
    nodes_generated = 1
    peak_frontier = 1
    step = 0

    trace.append(make_trace_entry(step, "A*", "INIT", root.state.current_id, 0, h0, 1))

    while heap:
        peak_frontier = max(peak_frontier, len(heap))
        f_val, g_val, _, node = heapq.heappop(heap)
        step += 1

        if node.state in closed:
            continue
        closed[node.state] = node.path_cost
        nodes_expanded += 1

        trace.append(make_trace_entry(
            step, "A*", "EXPAND", node.state.current_id,
            node.path_cost, node.heuristic, len(heap),
            {
                "f": round(node.f, 3),
                "depth": node.depth,
                "visited": list(node.state.visited),
                "heuristic_note": f"h={node.heuristic:.2f} (admissible: SL-dist to nearest goal)"
            }
        ))

        if problem.goal_test(node.state):
            return build_result("A*", node, nodes_expanded, nodes_generated, peak_frontier, start_ns, trace, mode)

        for child in expand(node, problem, mode):
            if child.state not in closed:
                counter += 1
                # Tie-break by depth (prefer shallower for equal f)
                heapq.heappush(heap, (child.f, child.path_cost, counter, child))
                nodes_generated += 1
                trace.append(make_trace_entry(
                    step, "A*", "GENERATE", child.state.current_id,
                    child.path_cost, child.heuristic, len(heap),
                    {"f": round(child.f, 3)}
                ))

    return build_result("A*", None, nodes_expanded, nodes_generated, peak_frontier, start_ns, trace, mode)


# ===========================================================================
# 6. IDA* — Iterative Deepening A*
# ===========================================================================

def _ida_search(
    node: SearchNode, bound: float, problem: TouristProblem,
    mode: str, trace: List[Dict], counts: Dict[str, int]
) -> Tuple[Optional[SearchNode], float]:
    """
    IDA* recursive DFS with f-value bound.
    Returns (goal_node, next_bound) where next_bound = min f exceeding current bound.
    CO2: memory-bounded — only stores current path (O(d) space).
    """
    f = node.f
    if f > bound:
        return None, f
    if problem.goal_test(node.state):
        return node, bound

    minimum = float("inf")
    counts["expanded"] += 1
    trace.append(make_trace_entry(
        counts["step"], "IDA*", "EXPAND", node.state.current_id,
        node.path_cost, node.heuristic, 0,
        {"bound": round(bound, 2), "f": round(f, 2)}
    ))
    counts["step"] += 1

    for child in expand(node, problem, mode):
        counts["generated"] += 1
        result, t = _ida_search(child, bound, problem, mode, trace, counts)
        if result is not None:
            return result, bound
        minimum = min(minimum, t)

    return None, minimum


def idastar(problem: TouristProblem, mode: str = "distance", max_iterations: int = 20) -> SearchResult:
    """
    CO2: IDA* — memory-bounded A*.
    Iteratively raises the f-cost threshold from h(start) upward.
    Space: O(d), Time: O(b^d) per iteration (can expand nodes multiple times).
    """
    start_ns = time.perf_counter_ns()
    trace: List[Dict] = []
    init_state = problem.initial_state()
    h0 = heuristic(init_state, problem, mode)
    root = SearchNode(state=init_state, parent=None, action=None, path_cost=0, heuristic=h0)

    bound = h0
    counts = {"expanded": 0, "generated": 1, "step": 0}

    trace.append(make_trace_entry(0, "IDA*", "INIT", root.state.current_id, 0, h0, 0,
                                  {"initial_bound": round(bound, 2)}))

    for iteration in range(max_iterations):
        trace.append({"step": counts["step"], "algorithm": "IDA*", "action": "NEW_ITERATION",
                       "iteration": iteration, "bound": round(bound, 2)})
        result, new_bound = _ida_search(root, bound, problem, mode, trace, counts)
        if result is not None:
            return build_result("IDA*", result, counts["expanded"], counts["generated"],
                                0, start_ns, trace, mode)
        if new_bound == float("inf"):
            break
        bound = new_bound

    return build_result("IDA*", None, counts["expanded"], counts["generated"],
                        0, start_ns, trace, mode)


# ===========================================================================
# EMPIRICAL PROFILER — Compare all algorithms
# ===========================================================================

def profile_all(problem: TouristProblem, mode: str = "distance") -> Dict[str, Any]:
    """
    CO2: Empirically compare BFS, DFS, UCS, Greedy, A*, IDA* on same problem.
    Reports: path length, cost, nodes expanded, runtime, optimality gap.
    """
    algorithms = [
        ("BFS",    lambda: bfs(problem, mode)),
        ("DFS",    lambda: dfs(problem, mode)),
        ("UCS",    lambda: ucs(problem, mode)),
        ("Greedy", lambda: greedy(problem, mode)),
        ("A*",     lambda: astar(problem, mode)),
        ("IDA*",   lambda: idastar(problem, mode)),
    ]
    results: Dict[str, Any] = {}
    best_cost = float("inf")

    for name, fn in algorithms:
        r = fn()
        results[name] = {
            "success": r.success,
            "path": r.path,
            "path_length": len(r.path),
            "total_cost": round(r.total_cost, 2),
            "total_time_min": round(r.total_time_min, 2),
            "total_distance_km": round(r.total_distance_km, 2),
            "nodes_expanded": r.nodes_expanded,
            "nodes_generated": r.nodes_generated,
            "runtime_ms": round(r.runtime_ms, 3),
            "failure_reason": r.failure_reason,
        }
        if r.success and r.total_cost < best_cost:
            best_cost = r.total_cost

    # Optimality gap vs best found
    for name in results:
        if results[name]["success"] and best_cost > 0:
            gap = (results[name]["total_cost"] - best_cost) / best_cost * 100
            results[name]["optimality_gap_pct"] = round(gap, 1)
        else:
            results[name]["optimality_gap_pct"] = None

    return results


# ===========================================================================
# Standalone runner — python co2_search.py
# ===========================================================================

if __name__ == "__main__":
    from data.hyderabad_attractions import ATTRACTION_MAP

    print("=" * 65)
    print("CO2 — SEARCH ALGORITHMS — Tourist Route Finder (Hyderabad)")
    print("=" * 65)

    # Problem: start at Charminar (0), visit Golconda (1), Mecca Masjid (16), Birla Mandir (4)
    problem = TouristProblem(
        start_id=0,
        goal_ids=[1, 16, 4],
        must_visit=[1, 16, 4],
        budget_inr=600,
        max_time_min=400,
        start_hour=9.0
    )
    print(f"\nProblem: {problem}")
    print(f"Start: {ATTRACTION_MAP[0].name}")
    print(f"Goals: {[ATTRACTION_MAP[g].name for g in problem.goal_ids]}\n")

    print("Running A* (distance mode)...")
    result = astar(problem, mode="distance")
    print(result.summary())
    if result.success:
        path_names = [ATTRACTION_MAP[p].name for p in result.path]
        print(f"  Path names: {' -> '.join(path_names)}")

    print("\n" + "="*65)
    print("EMPIRICAL COMPARISON — All Algorithms")
    print("="*65)
    profile = profile_all(problem, mode="distance")
    print(f"\n{'Algorithm':<10} {'Success':<8} {'Expanded':<10} {'Cost(km)':<10} {'Time(ms)':<10} {'Gap%'}")
    print("-" * 60)
    for alg, data in profile.items():
        gap = f"{data['optimality_gap_pct']:.1f}%" if data['optimality_gap_pct'] is not None else "N/A"
        print(f"{alg:<10} {str(data['success']):<8} {data['nodes_expanded']:<10} "
              f"{data['total_distance_km']:<10} {data['runtime_ms']:<10} {gap}")

    print("\n" + "="*65)
    print("A* TRACE (first 10 steps)")
    print("="*65)
    result2 = astar(problem, mode="distance")
    for entry in result2.trace[:10]:
        print(f"  Step {entry['step']:3d} | {entry['action']:<10} | "
              f"Node: {entry.get('node_name',''):<25} | "
              f"g={entry['g']:.2f} h={entry['h']:.2f} f={entry['f']:.2f}")
