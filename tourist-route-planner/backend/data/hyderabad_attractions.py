"""
CO1 - Knowledge Representation: Graph-based attraction data for Hyderabad
25 real Hyderabad tourist attractions with coordinates, costs, durations,
categories, opening hours, and crowd probability distributions.

Standalone runnable: python hyderabad_attractions.py
"""

from __future__ import annotations
import math
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional

# ---------------------------------------------------------------------------
# Attraction dataclass
# ---------------------------------------------------------------------------

@dataclass
class Attraction:
    id: int
    name: str
    lat: float
    lng: float
    entry_cost: float          # INR
    duration_min: int          # average visit duration in minutes
    category: str              # historical | nature | religious | museum | entertainment | cultural | shopping
    rating: float              # out of 5
    opening_time: int          # 24h format, e.g. 9 = 9:00 AM
    closing_time: int          # 24h format
    description: str
    # Crowd probability per time slot: morning(6-12) / afternoon(12-17) / evening(17-21)
    crowd_probs: Dict[str, float] = field(default_factory=dict)
    # Weather sensitivity: how much rain degrades the visit (0-1)
    weather_sensitivity: float = 0.3

    def is_open(self, hour: int) -> bool:
        return self.opening_time <= hour < self.closing_time

    def __repr__(self) -> str:
        return f"Attraction({self.id}: {self.name})"


# ---------------------------------------------------------------------------
# 25 Hyderabad Attractions
# ---------------------------------------------------------------------------

ATTRACTIONS: List[Attraction] = [
    Attraction(
        id=0, name="Charminar", lat=17.3616, lng=78.4747,
        entry_cost=25, duration_min=60, category="historical", rating=4.5,
        opening_time=9, closing_time=17,
        description="Iconic 16th-century mosque and monument, symbol of Hyderabad.",
        crowd_probs={"morning": 0.4, "afternoon": 0.8, "evening": 0.7},
        weather_sensitivity=0.2
    ),
    Attraction(
        id=1, name="Golconda Fort", lat=17.3833, lng=78.4011,
        entry_cost=50, duration_min=120, category="historical", rating=4.6,
        opening_time=8, closing_time=17,
        description="Medieval fortress with acoustic wonders and panoramic views.",
        crowd_probs={"morning": 0.3, "afternoon": 0.7, "evening": 0.6},
        weather_sensitivity=0.3
    ),
    Attraction(
        id=2, name="Hussain Sagar Lake", lat=17.4239, lng=78.4738,
        entry_cost=0, duration_min=60, category="nature", rating=4.2,
        opening_time=6, closing_time=22,
        description="Large artificial lake with Buddha statue island.",
        crowd_probs={"morning": 0.5, "afternoon": 0.5, "evening": 0.9},
        weather_sensitivity=0.4
    ),
    Attraction(
        id=3, name="Salar Jung Museum", lat=17.3714, lng=78.4804,
        entry_cost=20, duration_min=90, category="museum", rating=4.4,
        opening_time=10, closing_time=17,
        description="One of India's largest one-man collections of antiques.",
        crowd_probs={"morning": 0.4, "afternoon": 0.6, "evening": 0.3},
        weather_sensitivity=0.1
    ),
    Attraction(
        id=4, name="Birla Mandir", lat=17.4062, lng=78.4691,
        entry_cost=0, duration_min=45, category="religious", rating=4.5,
        opening_time=7, closing_time=12,
        description="Beautiful white marble temple on Naubath Pahad hill.",
        crowd_probs={"morning": 0.7, "afternoon": 0.4, "evening": 0.8},
        weather_sensitivity=0.2
    ),
    Attraction(
        id=5, name="Ramoji Film City", lat=17.2543, lng=78.6808,
        entry_cost=1500, duration_min=480, category="entertainment", rating=4.3,
        opening_time=9, closing_time=20,
        description="World's largest integrated film studio complex.",
        crowd_probs={"morning": 0.5, "afternoon": 0.8, "evening": 0.6},
        weather_sensitivity=0.5
    ),
    Attraction(
        id=6, name="Nehru Zoological Park", lat=17.3490, lng=78.4499,
        entry_cost=80, duration_min=180, category="nature", rating=4.3,
        opening_time=8, closing_time=17,
        description="Large zoo with over 1,500 animals, lion and tiger safaris.",
        crowd_probs={"morning": 0.5, "afternoon": 0.7, "evening": 0.3},
        weather_sensitivity=0.4
    ),
    Attraction(
        id=7, name="Lumbini Park", lat=17.4130, lng=78.4720,
        entry_cost=30, duration_min=60, category="nature", rating=4.0,
        opening_time=9, closing_time=21,
        description="Scenic park by Hussain Sagar with laser shows and boating.",
        crowd_probs={"morning": 0.3, "afternoon": 0.5, "evening": 0.9},
        weather_sensitivity=0.4
    ),
    Attraction(
        id=8, name="Birla Science Museum", lat=17.4068, lng=78.4684,
        entry_cost=60, duration_min=90, category="museum", rating=4.1,
        opening_time=10, closing_time=20,
        description="Interactive science exhibits with planetarium shows.",
        crowd_probs={"morning": 0.3, "afternoon": 0.6, "evening": 0.5},
        weather_sensitivity=0.1
    ),
    Attraction(
        id=9, name="Chowmahalla Palace", lat=17.3578, lng=78.4694,
        entry_cost=80, duration_min=90, category="historical", rating=4.5,
        opening_time=10, closing_time=17,
        description="Royal palace of the Nizams with spectacular architecture.",
        crowd_probs={"morning": 0.3, "afternoon": 0.6, "evening": 0.3},
        weather_sensitivity=0.2
    ),
    Attraction(
        id=10, name="Qutb Shahi Tombs", lat=17.3950, lng=78.3971,
        entry_cost=25, duration_min=90, category="historical", rating=4.3,
        opening_time=9, closing_time=17,
        description="Magnificent tombs of the Qutb Shahi dynasty with Persian architecture.",
        crowd_probs={"morning": 0.3, "afternoon": 0.5, "evening": 0.3},
        weather_sensitivity=0.2
    ),
    Attraction(
        id=11, name="Taramati Baradari", lat=17.3291, lng=78.3977,
        entry_cost=30, duration_min=60, category="historical", rating=4.0,
        opening_time=9, closing_time=18,
        description="Mughal-era pavilion with cultural performances and history.",
        crowd_probs={"morning": 0.2, "afternoon": 0.4, "evening": 0.6},
        weather_sensitivity=0.3
    ),
    Attraction(
        id=12, name="Snow World", lat=17.4400, lng=78.4980,
        entry_cost=600, duration_min=120, category="entertainment", rating=4.0,
        opening_time=11, closing_time=20,
        description="Indoor snow theme park with slides and snow activities.",
        crowd_probs={"morning": 0.2, "afternoon": 0.8, "evening": 0.7},
        weather_sensitivity=0.0
    ),
    Attraction(
        id=13, name="NTR Gardens", lat=17.4050, lng=78.4610,
        entry_cost=20, duration_min=60, category="nature", rating=4.0,
        opening_time=9, closing_time=21,
        description="Beautiful garden with toy train, boating, and recreational spots.",
        crowd_probs={"morning": 0.4, "afternoon": 0.5, "evening": 0.8},
        weather_sensitivity=0.5
    ),
    Attraction(
        id=14, name="Shilparamam", lat=17.4524, lng=78.3737,
        entry_cost=50, duration_min=90, category="cultural", rating=4.1,
        opening_time=10, closing_time=20,
        description="Crafts village showcasing traditional arts, crafts and culture.",
        crowd_probs={"morning": 0.3, "afternoon": 0.5, "evening": 0.7},
        weather_sensitivity=0.3
    ),
    Attraction(
        id=15, name="Hitech City / Cyber Towers", lat=17.4474, lng=78.3762,
        entry_cost=0, duration_min=45, category="modern", rating=4.0,
        opening_time=8, closing_time=22,
        description="India's IT hub — modern architecture and vibrant street life.",
        crowd_probs={"morning": 0.6, "afternoon": 0.7, "evening": 0.5},
        weather_sensitivity=0.1
    ),
    Attraction(
        id=16, name="Mecca Masjid", lat=17.3604, lng=78.4737,
        entry_cost=0, duration_min=30, category="religious", rating=4.4,
        opening_time=6, closing_time=20,
        description="One of the oldest and largest mosques in India.",
        crowd_probs={"morning": 0.6, "afternoon": 0.5, "evening": 0.6},
        weather_sensitivity=0.2
    ),
    Attraction(
        id=17, name="Tank Bund", lat=17.4212, lng=78.4730,
        entry_cost=0, duration_min=45, category="nature", rating=4.0,
        opening_time=6, closing_time=22,
        description="Scenic promenade along Hussain Sagar with statues of Telugu poets.",
        crowd_probs={"morning": 0.5, "afternoon": 0.4, "evening": 0.9},
        weather_sensitivity=0.5
    ),
    Attraction(
        id=18, name="Laad Bazaar", lat=17.3609, lng=78.4730,
        entry_cost=0, duration_min=60, category="shopping", rating=4.2,
        opening_time=10, closing_time=21,
        description="Famous bangle market near Charminar; traditional Hyderabadi crafts.",
        crowd_probs={"morning": 0.4, "afternoon": 0.8, "evening": 0.9},
        weather_sensitivity=0.1
    ),
    Attraction(
        id=19, name="Lotus Pond", lat=17.4260, lng=78.3600,
        entry_cost=20, duration_min=60, category="nature", rating=4.0,
        opening_time=9, closing_time=21,
        description="Serene lake park with walking paths and lotus gardens.",
        crowd_probs={"morning": 0.4, "afternoon": 0.4, "evening": 0.7},
        weather_sensitivity=0.4
    ),
    Attraction(
        id=20, name="Paigah Tombs", lat=17.3728, lng=78.5000,
        entry_cost=15, duration_min=45, category="historical", rating=3.9,
        opening_time=9, closing_time=17,
        description="Ornate 19th-century tombs of the Paigah nobility.",
        crowd_probs={"morning": 0.2, "afternoon": 0.3, "evening": 0.2},
        weather_sensitivity=0.2
    ),
    Attraction(
        id=21, name="KBR National Park", lat=17.4264, lng=78.4285,
        entry_cost=10, duration_min=90, category="nature", rating=4.3,
        opening_time=6, closing_time=18,
        description="Urban forest park with 600+ bird species and nature trails.",
        crowd_probs={"morning": 0.7, "afternoon": 0.4, "evening": 0.5},
        weather_sensitivity=0.3
    ),
    Attraction(
        id=22, name="Jalavihar Water Park", lat=17.4188, lng=78.4706,
        entry_cost=100, duration_min=180, category="entertainment", rating=4.0,
        opening_time=10, closing_time=18,
        description="Water park on the shore of Hussain Sagar.",
        crowd_probs={"morning": 0.3, "afternoon": 0.9, "evening": 0.5},
        weather_sensitivity=0.7
    ),
    Attraction(
        id=23, name="Sudha Cars Museum", lat=17.4218, lng=78.5016,
        entry_cost=50, duration_min=60, category="museum", rating=4.1,
        opening_time=9, closing_time=18,
        description="Unique museum of quirky car-shaped vehicles, Guinness record holder.",
        crowd_probs={"morning": 0.3, "afternoon": 0.5, "evening": 0.4},
        weather_sensitivity=0.1
    ),
    Attraction(
        id=24, name="Falaknuma Palace", lat=17.3300, lng=78.4600,
        entry_cost=0, duration_min=90, category="historical", rating=4.7,
        opening_time=9, closing_time=17,
        description="Exquisite Nizam palace-hotel; one of the world's finest.",
        crowd_probs={"morning": 0.4, "afternoon": 0.6, "evening": 0.3},
        weather_sensitivity=0.1
    ),
]

# Index for O(1) lookup
ATTRACTION_MAP: Dict[int, Attraction] = {a.id: a for a in ATTRACTIONS}

# ---------------------------------------------------------------------------
# Graph (adjacency list): roads between attractions
# Each edge: (neighbor_id, road_distance_km, travel_time_min, travel_cost_inr)
# ---------------------------------------------------------------------------

def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance between two lat/lng points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def build_graph(
    attractions: List[Attraction],
    max_road_km: float = 15.0,
    road_factor: float = 1.35,
    avg_speed_kmh: float = 20.0,
    auto_cost_per_km: float = 12.0
) -> Dict[int, List[Tuple[int, float, float, float]]]:
    """
    Build adjacency list: id -> [(neighbor_id, road_km, time_min, cost_inr), ...]
    Connects all pairs within max_road_km straight-line.
    road_factor accounts for winding roads.
    avg_speed_kmh = typical Hyderabad city speed.
    auto_cost_per_km = approximate auto-rickshaw fare.
    """
    graph: Dict[int, List[Tuple[int, float, float, float]]] = {a.id: [] for a in attractions}
    for i, src in enumerate(attractions):
        for j, dst in enumerate(attractions):
            if i >= j:
                continue
            sl_dist = haversine(src.lat, src.lng, dst.lat, dst.lng)
            if sl_dist <= max_road_km:
                road_km = round(sl_dist * road_factor, 2)
                time_min = round((road_km / avg_speed_kmh) * 60, 1)
                cost_inr = round(road_km * auto_cost_per_km, 0)
                graph[src.id].append((dst.id, road_km, time_min, cost_inr))
                graph[dst.id].append((src.id, road_km, time_min, cost_inr))
    return graph


GRAPH: Dict[int, List[Tuple[int, float, float, float]]] = build_graph(ATTRACTIONS)


def straight_line_distance(a_id: int, b_id: int) -> float:
    """Heuristic: straight-line km between two attraction IDs."""
    a, b = ATTRACTION_MAP[a_id], ATTRACTION_MAP[b_id]
    return haversine(a.lat, a.lng, b.lat, b.lng)


def get_neighbors(node_id: int) -> List[Tuple[int, float, float, float]]:
    """Return neighbors of a node: [(id, road_km, time_min, cost_inr)]"""
    return GRAPH.get(node_id, [])


def get_attraction(a_id: int) -> Attraction:
    return ATTRACTION_MAP[a_id]


# ---------------------------------------------------------------------------
# Standalone runner — python hyderabad_attractions.py
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("HYDERABAD TOURIST ATTRACTIONS — KNOWLEDGE BASE")
    print("=" * 60)
    for a in ATTRACTIONS:
        status = f"{a.opening_time:02d}:00–{a.closing_time:02d}:00"
        print(f"  [{a.id:2d}] {a.name:<30} | Rs{a.entry_cost:<5} | {a.duration_min} min | "
              f"{a.category:<15} | *{a.rating} | {status}")

    print("\n" + "=" * 60)
    print("GRAPH CONNECTIVITY SUMMARY")
    print("=" * 60)
    total_edges = sum(len(v) for v in GRAPH.values()) // 2
    print(f"  Nodes: {len(ATTRACTIONS)} attractions")
    print(f"  Edges: {total_edges} road connections")
    for a in ATTRACTIONS:
        nbrs = GRAPH[a.id]
        nbr_names = [ATTRACTION_MAP[n[0]].name for n in nbrs[:3]]
        print(f"  {a.name:<30} -> {len(nbrs)} neighbors  (e.g. {', '.join(nbr_names)}...)")

    print("\n" + "=" * 60)
    print("SAMPLE DISTANCES")
    print("=" * 60)
    pairs = [(0, 1), (0, 16), (1, 10), (2, 7), (5, 0)]
    for a_id, b_id in pairs:
        d = straight_line_distance(a_id, b_id)
        a, b = ATTRACTION_MAP[a_id], ATTRACTION_MAP[b_id]
        print(f"  {a.name:<25} <-> {b.name:<25} : {d:.2f} km (straight-line)")
