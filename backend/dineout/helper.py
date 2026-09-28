"""Overpass search and OSM field extraction for Dine Out."""
import math


def search_places(latitude, longitude, *, place_type="all", cuisine=None,
                  radius_metres=3000, fetch_elements=None):
    """Find named food places; fetch_elements(query) returns Overpass elements."""
    lat, lon = float(latitude), float(longitude)
    if not (math.isfinite(lat) and math.isfinite(lon)
            and -90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("Invalid coordinates")
    if fetch_elements is None:
        raise ValueError("An Overpass fetch function is required")
    radius = max(500, min(5000, int(radius_metres)))
    selectors = {
        "restaurant": '["amenity"="restaurant"]',
        "cafe": '["amenity"="cafe"]',
        "fast_food": '["amenity"="fast_food"]',
    }
    if place_type not in {"all", "restaurant", "cafe"}:
        raise ValueError("Invalid place type")
    selected = list(selectors) if place_type == "all" else [place_type]
    # Overpass can evaluate a local bounding box more cheaply than several
    # around filters; the circle is applied to each returned center below.
    lat_delta = radius / 111_000
    lon_delta = radius / (111_000 * max(abs(math.cos(math.radians(lat))), 0.01))
    south, north = max(-90, lat - lat_delta), min(90, lat + lat_delta)
    west, east = max(-180, lon - lon_delta), min(180, lon + lon_delta)
    bbox = f"{south:.6f},{west:.6f},{north:.6f},{east:.6f}"
    clauses = "\n".join(
        f'nwr{selector}["name"]({bbox});'
        for selector in (selectors[kind] for kind in selected)
    )
    query = f'[out:json][timeout:22];({clauses});out center tags;'
    elements = fetch_elements(query)
    wanted = str(cuisine or "").strip().lower()
    results, seen = [], set()
    for item in elements:
        tags = item.get("tags") or {}
        name = str(tags.get("name") or "").strip()
        coords = item.get("center") or item
        try:
            place_lat = float(coords["lat"])
            place_lon = float(coords["lon"])
        except (KeyError, TypeError, ValueError):
            continue
        if (not name or not math.isfinite(place_lat) or not math.isfinite(place_lon)
                or not -90 <= place_lat <= 90 or not -180 <= place_lon <= 180):
            continue
        phi1, phi2 = math.radians(lat), math.radians(place_lat)
        delta_phi = phi2 - phi1
        delta_lon = math.radians(place_lon - lon)
        arc = (math.sin(delta_phi / 2) ** 2
               + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lon / 2) ** 2)
        if 12_742_000 * math.asin(min(1, math.sqrt(arc))) > radius:
            continue
        cuisine_value = str(tags.get("cuisine") or "")
        if wanted and wanted != "all cuisines" and wanted not in cuisine_value.lower().replace("_", " "):
            continue
        identifier = f'{item.get("type")}/{item.get("id")}'
        if identifier in seen:
            continue
        seen.add(identifier)
        category = tags.get("amenity", "restaurant")
        address = ", ".join(str(tags[k]).strip() for k in
                            ("addr:housenumber", "addr:street", "addr:suburb", "addr:city")
                            if tags.get(k))
        results.append({
            "id": identifier, "name": name, "category": category,
            "latitude": place_lat, "longitude": place_lon,
            "cuisine": cuisine_value.replace("_", " ").replace(";", ", "),
            "address": address, "opening_hours": tags.get("opening_hours", ""),
            "phone": tags.get("phone") or tags.get("contact:phone", ""),
            "website": tags.get("website") or tags.get("contact:website", ""),
            "diet_vegetarian": tags.get("diet:vegetarian"),
            "diet_vegan": tags.get("diet:vegan"),
            "diet_meat": tags.get("diet:meat"),
            "diet_fish": tags.get("diet:fish"),
            "diet_non_vegetarian": tags.get("diet:non-vegetarian"),
            "tags": tags,
        })
    return results
