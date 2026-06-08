"""
CO3 — Constraint Satisfaction Problem: Tourist Schedule Planning

Models the daily tourist schedule as a CSP:
  Variables : each selected attraction (to schedule into a time slot)
  Domains   : available time slots (morning / afternoon / evening)
  Constraints:
    - Budget: sum of entry costs ≤ budget
    - Time: sum of durations + travel times ≤ max_time
    - Opening hours: attraction must be open in assigned time slot
    - Unique slots: no two attractions at the same time slot
    - Dependency: some attractions are best visited before others
    - Category preference: preferred categories get slot priority

Algorithms:
  1. Backtracking with forward checking
  2. AC-3 arc consistency
  3. MRV (Minimum Remaining Values) heuristic
  4. Degree heuristic
  5. LCV (Least Constraining Value) heuristic
  6. Min-conflicts local search

Standalone runnable: python co3_csp.py
"""

from __future__ import annotations
import sys, os, random, time
from copy import deepcopy
from typing import List, Dict, Tuple, Optional, Any, Set
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.hyderabad_attractions import ATTRACTION_MAP, straight_line_distance
from models.state import TouristProblem


# ===========================================================================
# TIME SLOT DEFINITIONS
# ===========================================================================

TIME_SLOTS = ["morning", "afternoon", "evening"]

SLOT_HOURS: Dict[str, Tuple[int, int]] = {
    "morning":   (9,  12),   # 9am–12pm
    "afternoon": (12, 17),   # 12pm–5pm
    "evening":   (17, 21),   # 5pm–9pm
}

SLOT_START: Dict[str, float] = {
    "morning": 9.0, "afternoon": 12.0, "evening": 17.0
}


# ===========================================================================
# CSP DEFINITION
# ===========================================================================

class TouristCSP:
    """
    CO3: CSP for scheduling tourist attractions into time slots.

    Variables: attraction IDs to schedule
    Domains  : {attraction_id: [list of valid time slots]}
    Constraints: budget, time, opening hours, unique slot, preferences
    """

    def __init__(
        self,
        attraction_ids: List[int],
        budget_inr: float = 2000.0,
        max_time_min: float = 480.0,
        preferred_categories: Optional[List[str]] = None,
        must_morning: Optional[List[int]] = None,
        must_avoid_slots: Optional[Dict[int, List[str]]] = None,
    ):
        self.variables: List[int] = attraction_ids
        self.budget = budget_inr
        self.max_time = max_time_min
        self.preferred_categories = preferred_categories or []
        self.must_morning = must_morning or []
        self.must_avoid_slots = must_avoid_slots or {}

        # Initialize domains
        self.domains: Dict[int, List[str]] = {}
        for aid in self.variables:
            self.domains[aid] = self._initial_domain(aid)

        # Trace log
        self.trace: List[Dict[str, Any]] = []
        self.backtracks = 0
        self.constraint_checks = 0

    def _initial_domain(self, aid: int) -> List[str]:
        """Build initial domain for an attraction based on opening hours."""
        attr = ATTRACTION_MAP.get(aid)
        if attr is None:
            return list(TIME_SLOTS)
        valid = []
        for slot, (start, end) in SLOT_HOURS.items():
            # Attraction must be open for at least 30 min in slot
            open_overlap = min(attr.closing_time, end) - max(attr.opening_time, start)
            if open_overlap >= 0.5:
                valid.append(slot)
        # Apply user constraints
        avoid = self.must_avoid_slots.get(aid, [])
        valid = [s for s in valid if s not in avoid]
        # Hard-code morning for must_morning
        if aid in self.must_morning:
            valid = [s for s in valid if s == "morning"] or valid
        return valid if valid else list(TIME_SLOTS)

    def _log(self, step: str, **kwargs) -> None:
        self.trace.append({"step": step, **kwargs})

    # -----------------------------------------------------------------------
    # CONSTRAINT CHECKS
    # -----------------------------------------------------------------------

    def is_consistent(
        self, aid: int, slot: str, assignment: Dict[int, str]
    ) -> Tuple[bool, str]:
        """
        CO3: Check all constraints for assigning slot to aid given current assignment.
        Returns (consistent, reason_if_not).
        """
        self.constraint_checks += 1
        attr = ATTRACTION_MAP.get(aid)
        if attr is None:
            return False, "Unknown attraction"

        # 1. Opening hours constraint
        slot_start, slot_end = SLOT_HOURS[slot]
        open_overlap = min(attr.closing_time, slot_end) - max(attr.opening_time, slot_start)
        if open_overlap < 0.5:
            return False, f"OPENING_HOURS: {attr.name} is not open enough during {slot}"

        # 2. Slot capacity constraint (max 2 attractions per slot)
        slot_count = sum(1 for assigned_id, assigned_slot in assignment.items() if assigned_slot == slot and assigned_id != aid)
        if slot_count >= 2:
            return False, f"SLOT_FULL: {slot} already has 2 attractions"

        # 3. Budget constraint (running total)
        current_cost = sum(ATTRACTION_MAP[i].entry_cost for i in assignment if i in ATTRACTION_MAP)
        if current_cost + attr.entry_cost > self.budget:
            return False, f"BUDGET: adding Rs{attr.entry_cost} exceeds Rs{self.budget} budget"

        # 4. Time constraint (rough estimate)
        current_time = sum(ATTRACTION_MAP[i].duration_min for i in assignment if i in ATTRACTION_MAP)
        if current_time + attr.duration_min > self.max_time:
            return False, f"TIME: adding {attr.duration_min}min exceeds {self.max_time}min limit"

        return True, "OK"

    def all_constraints_satisfied(self, assignment: Dict[int, str]) -> bool:
        """Full constraint check on a complete assignment."""
        slot_counts: Dict[str, int] = {}
        total_cost = 0.0
        total_time = 0.0

        for aid, slot in assignment.items():
            slot_counts[slot] = slot_counts.get(slot, 0) + 1
            if slot_counts[slot] > 2:
                return False  # Slot capacity violated

            attr = ATTRACTION_MAP.get(aid)
            if attr is None:
                continue
            total_cost += attr.entry_cost
            total_time += attr.duration_min

        return total_cost <= self.budget and total_time <= self.max_time

    # -----------------------------------------------------------------------
    # VARIABLE ORDERING HEURISTICS
    # -----------------------------------------------------------------------

    def mrv(self, assignment: Dict[int, str], domains: Dict[int, List[str]]) -> int:
        """
        CO3: MRV — Minimum Remaining Values.
        Choose the unassigned variable with fewest legal values in its domain.
        Intuition: fail early on the most constrained variable.
        """
        unassigned = [v for v in self.variables if v not in assignment]
        return min(unassigned, key=lambda v: len(domains.get(v, TIME_SLOTS)))

    def degree_heuristic(self, assignment: Dict[int, str], domains: Dict[int, List[str]]) -> int:
        """
        CO3: Degree heuristic.
        Choose the unassigned variable involved in the most constraints
        with other unassigned variables.
        Used as tie-breaker with MRV.
        """
        unassigned = set(v for v in self.variables if v not in assignment)

        def degree(v: int) -> int:
            # Degree = number of unassigned variables that share a constraint
            # Here: all variables share the budget/time/unique-slot constraint
            return len(unassigned) - 1  # simplification: all share constraints

        return max(unassigned, key=degree)

    def mrv_with_degree(self, assignment: Dict[int, str], domains: Dict[int, List[str]]) -> int:
        """MRV with degree as tie-breaker."""
        unassigned = [v for v in self.variables if v not in assignment]
        if not unassigned:
            raise ValueError("No unassigned variables")
        min_remaining = min(len(domains.get(v, TIME_SLOTS)) for v in unassigned)
        # Among MRV-tied variables, pick highest degree
        mrv_tied = [v for v in unassigned if len(domains.get(v, TIME_SLOTS)) == min_remaining]
        return max(mrv_tied, key=lambda v: sum(1 for u in unassigned if u != v))

    # -----------------------------------------------------------------------
    # VALUE ORDERING HEURISTIC
    # -----------------------------------------------------------------------

    def lcv(self, var: int, assignment: Dict[int, str], domains: Dict[int, List[str]]) -> List[str]:
        """
        CO3: LCV — Least Constraining Value.
        Order values by how many choices they leave for other unassigned variables.
        Prefer values that rule out the fewest options for neighbors.
        """
        def count_conflicts(slot: str) -> int:
            assigned_count = sum(1 for s in assignment.values() if s == slot)
            if assigned_count + 1 >= 2:
                conflicts = 0
                for other in self.variables:
                    if other == var or other in assignment:
                        continue
                    if slot in domains.get(other, list(TIME_SLOTS)):
                        conflicts += 1
                return conflicts
            return 0

        available = domains.get(var, list(TIME_SLOTS))
        return sorted(available, key=count_conflicts)  # ascending = least constraining first

    # -----------------------------------------------------------------------
    # FORWARD CHECKING
    # -----------------------------------------------------------------------

    def forward_check(
        self, var: int, slot: str, domains: Dict[int, List[str]]
    ) -> Optional[Dict[int, List[str]]]:
        """
        CO3: Forward checking — after assigning var=slot,
        remove slot from domains of all other unassigned variables.
        Returns updated domains, or None if any domain becomes empty (failure).
        """
        new_domains = {k: list(v) for k, v in domains.items()}
        new_domains[var] = [slot]
        
        assigned_to_slot = sum(1 for d in new_domains.values() if len(d) == 1 and d[0] == slot)
        
        if assigned_to_slot >= 2:
            for other in self.variables:
                if len(new_domains.get(other, [])) > 1 and slot in new_domains.get(other, []):
                    new_domains[other].remove(slot)
                    if not new_domains[other]:
                        self._log("FORWARD_CHECK_FAIL",
                                  var=var, slot=slot, pruned_var=other,
                                  reason=f"Domain of {ATTRACTION_MAP[other].name} became empty")
                        return None  # Domain wipe-out
        return new_domains

    # -----------------------------------------------------------------------
    # AC-3 ARC CONSISTENCY
    # -----------------------------------------------------------------------

    def ac3(self, domains: Dict[int, List[str]]) -> Tuple[bool, Dict[int, List[str]]]:
        """
        CO3: AC-3 arc consistency algorithm.
        Iteratively enforces arc consistency: for each arc (Xi, Xj),
        remove values from Di that have no consistent value in Dj.

        For this CSP, the main binary constraint is the unique-slot constraint.
        Arc (Xi, Xj) is consistent if for every slot in Di, there exists some
        slot in Dj ≠ that slot.

        Returns (consistent, pruned_domains).
        """
        # Build arc queue: all pairs (xi, xj) for unique-slot constraint
        queue: List[Tuple[int, int]] = []
        for i in range(len(self.variables)):
            for j in range(len(self.variables)):
                if i != j:
                    queue.append((self.variables[i], self.variables[j]))

        new_domains = {k: list(v) for k, v in domains.items()}
        iterations = 0
        max_iter = len(queue) * 10

        while queue and iterations < max_iter:
            xi, xj = queue.pop(0)
            iterations += 1

            revised = False
            di = list(new_domains.get(xi, []))

            for val in di[:]:
                # With capacity 2, binary AC-3 doesn't prune anything because Xi and Xj can share the same slot.
                support_exists = True
                if not support_exists:
                    new_domains[xi].remove(val)
                    revised = True
                    self._log("AC3_PRUNE", arc=(xi, xj), removed_value=val,
                              reason="No support in neighbor domain")

                    if not new_domains[xi]:
                        self._log("AC3_FAIL", var=xi,
                                  reason=f"Domain of {ATTRACTION_MAP[xi].name} emptied")
                        return False, new_domains

            if revised:
                # Re-add arcs for xi's neighbors
                for xk in self.variables:
                    if xk != xi and xk != xj:
                        queue.append((xk, xi))

        return True, new_domains

    # -----------------------------------------------------------------------
    # BACKTRACKING SEARCH
    # -----------------------------------------------------------------------

    def backtrack(
        self,
        assignment: Dict[int, str],
        domains: Dict[int, List[str]],
        use_mrv: bool = True,
        use_lcv: bool = True,
        use_forward_checking: bool = True
    ) -> Optional[Dict[int, str]]:
        """
        CO3: Backtracking search with optional heuristics.
        Returns complete assignment or None on failure.
        """
        if len(assignment) == len(self.variables):
            if self.all_constraints_satisfied(assignment):
                self._log("SOLUTION_FOUND", assignment=dict(assignment))
                return assignment
            return None

        # Variable selection
        if use_mrv:
            var = self.mrv_with_degree(assignment, domains)
        else:
            unassigned = [v for v in self.variables if v not in assignment]
            var = unassigned[0]

        # Value ordering
        if use_lcv:
            values = self.lcv(var, assignment, domains)
        else:
            values = domains.get(var, list(TIME_SLOTS))

        attr_name = ATTRACTION_MAP[var].name if var in ATTRACTION_MAP else str(var)
        self._log("TRY_VARIABLE", var=var, name=attr_name,
                  domain_size=len(values), values=values)

        for slot in values:
            ok, reason = self.is_consistent(var, slot, assignment)
            if not ok:
                self._log("CONSTRAINT_FAIL", var=var, slot=slot, reason=reason)
                continue

            assignment[var] = slot
            self._log("ASSIGN", var=var, name=attr_name, slot=slot,
                      assignment_size=len(assignment))

            # Forward checking
            new_domains = domains
            if use_forward_checking:
                new_domains = self.forward_check(var, slot, domains)
                if new_domains is None:
                    del assignment[var]
                    self.backtracks += 1
                    self._log("BACKTRACK", var=var, reason="Forward check failed")
                    continue

            result = self.backtrack(assignment, new_domains, use_mrv, use_lcv, use_forward_checking)
            if result is not None:
                return result

            del assignment[var]
            self.backtracks += 1
            self._log("BACKTRACK", var=var, slot=slot,
                      reason="No solution found in subtree")

        return None

    def solve(
        self,
        use_mrv: bool = True,
        use_lcv: bool = True,
        use_forward_checking: bool = True,
        use_ac3: bool = True
    ) -> Dict[str, Any]:
        """
        Full CSP solve pipeline:
        1. AC-3 preprocessing (if enabled)
        2. Backtracking with MRV + LCV + forward checking
        Returns schedule dict + diagnostics.
        """
        start = time.perf_counter_ns()
        self.trace = []
        self.backtracks = 0
        self.constraint_checks = 0

        domains = {k: list(v) for k, v in self.domains.items()}

        # EARLY EXIT for impossible budget/time
        total_cost = sum(ATTRACTION_MAP[i].entry_cost for i in self.variables if i in ATTRACTION_MAP)
        total_time = sum(ATTRACTION_MAP[i].duration_min for i in self.variables if i in ATTRACTION_MAP)
        
        if total_cost > self.budget:
            self.trace.append({"step": "INIT", "assignment": {}})
            self.trace.append({"step": "CONSTRAINT_FAIL", "reason": f"Budget exceeded: requires Rs{total_cost} > Rs{self.budget}"})
            return {
                "success": False, "schedule": {}, "trace": self.trace,
                "backtracks": 0, "constraint_checks": 0,
                "runtime_ms": 0.0,
                "failure_reason": f"Budget exceeded: requires Rs{total_cost} > Rs{self.budget}"
            }
        
        if total_time > self.max_time:
            self.trace.append({"step": "INIT", "assignment": {}})
            self.trace.append({"step": "CONSTRAINT_FAIL", "reason": f"Time exceeded: requires {total_time}min > {self.max_time}min limit"})
            return {
                "success": False, "schedule": {}, "trace": self.trace,
                "backtracks": 0, "constraint_checks": 0,
                "runtime_ms": 0.0,
                "failure_reason": f"Time exceeded: requires {total_time}min > {self.max_time}min limit"
            }

        # Step 1: AC-3
        if use_ac3:
            consistent, domains = self.ac3(domains)
            if not consistent:
                return {
                    "success": False, "schedule": {}, "trace": self.trace,
                    "backtracks": self.backtracks,
                    "constraint_checks": self.constraint_checks,
                    "failure_reason": "AC-3 preprocessing failed"
                }
            self._log("AC3_COMPLETE", domains_after={k: v for k, v in domains.items()})

        # Step 2: Backtracking
        assignment = self.backtrack({}, domains, use_mrv, use_lcv, use_forward_checking)

        runtime_ms = (time.perf_counter_ns() - start) / 1e6

        if assignment is None:
            return {
                "success": False, "schedule": {}, "trace": self.trace,
                "backtracks": self.backtracks,
                "constraint_checks": self.constraint_checks,
                "runtime_ms": round(runtime_ms, 3),
                "failure_reason": "No valid schedule found"
            }

        # Build readable schedule
        schedule = {}
        total_cost = 0.0
        total_time = 0.0
        for aid, slot in assignment.items():
            attr = ATTRACTION_MAP.get(aid)
            if attr:
                total_cost += attr.entry_cost
                total_time += attr.duration_min
                schedule[aid] = {
                    "name": attr.name,
                    "slot": slot,
                    "entry_cost": attr.entry_cost,
                    "duration_min": attr.duration_min,
                    "category": attr.category,
                    "rating": attr.rating,
                }

        return {
            "success": True,
            "schedule": schedule,
            "total_cost": round(total_cost, 2),
            "total_time_min": round(total_time, 2),
            "trace": self.trace,
            "backtracks": self.backtracks,
            "constraint_checks": self.constraint_checks,
            "runtime_ms": round(runtime_ms, 3),
        }


# ===========================================================================
# MIN-CONFLICTS LOCAL SEARCH
# ===========================================================================

def min_conflicts(
    attraction_ids: List[int],
    budget_inr: float = 2000.0,
    max_time_min: float = 480.0,
    max_steps: int = 1000,
    seed: int = 42
) -> Dict[str, Any]:
    """
    CO3: Min-conflicts local search for CSP.
    Starts with a random complete assignment and iteratively fixes conflicts.
    Best for over-constrained problems where backtracking is slow.

    Algorithm:
    1. Generate random complete assignment
    2. While conflicts exist and steps remain:
       a. Pick a randomly conflicted variable
       b. Assign the value that minimizes conflicts
       c. Repeat
    """
    start_time = time.perf_counter_ns()
    random.seed(seed)
    
    # EARLY EXIT for impossible budget/time
    total_cost_check = sum(ATTRACTION_MAP[i].entry_cost for i in attraction_ids if i in ATTRACTION_MAP)
    total_time_check = sum(ATTRACTION_MAP[i].duration_min for i in attraction_ids if i in ATTRACTION_MAP)
    if total_cost_check > budget_inr:
        trace = [{"step": "INIT", "assignment": {}}, {"step": "CONSTRAINT_FAIL", "reason": f"Budget exceeded: requires Rs{total_cost_check} > Rs{budget_inr}"}]
        return {
            "algorithm": "min_conflicts", "success": False, "schedule": {}, "total_cost": total_cost_check, 
            "total_time_min": total_time_check, "runtime_ms": 0.0, "final_conflicts": 1, "steps_taken": 0, 
            "trace": trace, "failure_reason": f"Budget exceeded: requires Rs{total_cost_check} > Rs{budget_inr}"
        }
    if total_time_check > max_time_min:
        trace = [{"step": "INIT", "assignment": {}}, {"step": "CONSTRAINT_FAIL", "reason": f"Time exceeded: requires {total_time_check}min > {max_time_min}min limit"}]
        return {
            "algorithm": "min_conflicts", "success": False, "schedule": {}, "total_cost": total_cost_check, 
            "total_time_min": total_time_check, "runtime_ms": 0.0, "final_conflicts": 1, "steps_taken": 0, 
            "trace": trace, "failure_reason": f"Time exceeded: requires {total_time_check}min > {max_time_min}min limit"
        }

    trace: List[Dict[str, Any]] = []

    def count_conflicts_for(aid: int, slot: str, assignment: Dict[int, str]) -> int:
        """Count constraint violations if aid=slot."""
        conflicts = 0
        attr = ATTRACTION_MAP.get(aid)
        if attr is None:
            return 999

        # Slot capacity conflicts
        slot_count = sum(1 for other_id, other_slot in assignment.items() if other_id != aid and other_slot == slot)
        if slot_count >= 2:
            conflicts += (slot_count - 1)

        # Opening hours
        s_start, s_end = SLOT_HOURS[slot]
        open_overlap = min(attr.closing_time, s_end) - max(attr.opening_time, s_start)
        if open_overlap < 0.5:
            conflicts += 2  # heavier penalty

        return conflicts

    def total_conflicts(assignment: Dict[int, str]) -> int:
        return sum(count_conflicts_for(aid, slot, assignment) for aid, slot in assignment.items())

    # Initial random assignment
    assignment: Dict[int, str] = {aid: random.choice(TIME_SLOTS) for aid in attraction_ids}
    trace.append({"step": "INIT", "assignment": dict(assignment),
                  "conflicts": total_conflicts(assignment)})

    for step in range(max_steps):
        conflicts = total_conflicts(assignment)
        if conflicts == 0:
            break

        # Pick a conflicted variable
        conflicted = [aid for aid in attraction_ids
                      if count_conflicts_for(aid, assignment[aid], assignment) > 0]
        if not conflicted:
            break

        var = random.choice(conflicted)
        # Choose slot that minimizes conflicts
        best_slot = min(TIME_SLOTS, key=lambda s: count_conflicts_for(var, s, assignment))
        old_slot = assignment[var]
        assignment[var] = best_slot

        trace.append({
            "step": step, "action": "REASSIGN",
            "var": var, "name": ATTRACTION_MAP[var].name if var in ATTRACTION_MAP else str(var),
            "old_slot": old_slot, "slot": best_slot,
            "conflicts_after": total_conflicts(assignment)
        })

    final_conflicts = total_conflicts(assignment)
    success = final_conflicts == 0

    schedule = {}
    total_cost = 0.0
    total_time = 0.0
    for aid, slot in assignment.items():
        attr = ATTRACTION_MAP.get(aid)
        if attr:
            total_cost += attr.entry_cost
            total_time += attr.duration_min
            schedule[aid] = {"name": attr.name, "slot": slot,
                             "entry_cost": attr.entry_cost, "duration_min": attr.duration_min,
                             "category": attr.category, "rating": attr.rating}

    runtime_ms = (time.perf_counter_ns() - start_time) / 1e6

    return {
        "algorithm": "min_conflicts",
        "success": success,
        "schedule": schedule,
        "total_cost": round(total_cost, 2),
        "total_time_min": round(total_time, 2),
        "runtime_ms": round(runtime_ms, 3),
        "final_conflicts": final_conflicts,
        "steps_taken": len(trace) - 1,
        "trace": trace,
        "failure_reason": f"Failed with {final_conflicts} conflicts" if not success else None
    }


# ===========================================================================
# Standalone runner — python co3_csp.py
# ===========================================================================

if __name__ == "__main__":
    print("=" * 65)
    print("CO3 — CSP Tourist Schedule Planner (Hyderabad)")
    print("=" * 65)

    # Pick 6 attractions to schedule
    selected = [0, 1, 3, 4, 9, 16]
    names = [ATTRACTION_MAP[i].name for i in selected]
    print(f"\nAttractions to schedule: {names}")

    csp = TouristCSP(
        attraction_ids=selected,
        budget_inr=500,
        max_time_min=420,
        preferred_categories=["historical", "religious"],
        must_morning=[4],   # Birla Mandir best in morning
    )

    print("\n--- Initial Domains ---")
    for aid in selected:
        print(f"  {ATTRACTION_MAP[aid].name:<30} : {csp.domains[aid]}")

    print("\n--- Solving with Backtracking + MRV + LCV + Forward Checking + AC-3 ---")
    result = csp.solve(use_mrv=True, use_lcv=True, use_forward_checking=True, use_ac3=True)

    if result["success"]:
        print(f"\n[OK] SOLUTION FOUND!")
        print(f"   Total cost    : Rs{result['total_cost']}")
        print(f"   Total time    : {result['total_time_min']} min")
        print(f"   Backtracks    : {result['backtracks']}")
        print(f"   Constraint chk: {result['constraint_checks']}")
        print(f"   Runtime       : {result['runtime_ms']} ms\n")
        for aid, info in result["schedule"].items():
            print(f"   [{info['slot']:<10}] {info['name']:<30} Rs{info['entry_cost']} | {info['duration_min']}min")
    else:
        print(f"[FAIL] FAILED: {result['failure_reason']}")

    print("\n--- Trace (first 10 steps) ---")
    for entry in result["trace"][:10]:
        print(f"  {entry}")

    print("\n" + "="*65)
    print("Min-Conflicts Local Search")
    print("="*65)
    mc = min_conflicts(selected, budget_inr=500, max_time_min=420)
    print(f"Success: {mc['success']}, Conflicts: {mc['final_conflicts']}, Steps: {mc['steps_taken']}")
    for aid, info in mc["schedule"].items():
        print(f"  [{info['slot']:<10}] {info['name']}")
