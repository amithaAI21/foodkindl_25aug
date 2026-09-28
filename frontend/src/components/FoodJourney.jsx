import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./FoodJourney.css";

const pin = (colour) =>
  L.divIcon({
    className: "fj-pin-wrapper",
    html: `<span style="
      display:block;width:20px;height:20px;
      border:3px solid white;border-radius:50%;
      background:${colour};
      box-shadow:0 2px 8px #0006;
    "></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

const startPin = pin("#239b6b");
const endPin = pin("#f75b42");
const foodPin = pin("#ec8a31");
const livePin = pin("#247cff");

function distanceMetres(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(x)));
}

function turnText(step) {
  const maneuver = step?.maneuver || {};
  const road = step?.name ? ` onto ${step.name}` : "";
  if (maneuver.type === "arrive") return "Arrive at your stop";
  if (maneuver.type === "depart") return `Head out${road}`;
  if (maneuver.type === "roundabout") return `Enter the roundabout${road}`;
  if (maneuver.type === "turn" || maneuver.type === "fork" || maneuver.type === "merge") {
    return `${maneuver.modifier ? `Go ${maneuver.modifier}` : "Continue"}${road}`;
  }
  return `Continue${road}`;
}

function FollowLocation({ position, enabled }) {
  const map = useMap();
  useEffect(() => {
    if (enabled && position) map.panTo(position);
  }, [map, position, enabled]);
  return null;
}

function FitRoute({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points, { padding: [30, 30] });
    }
  }, [map, points]);

  return null;
}

function shortPlaceName(value) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function formatDuration(value) {
  const minutes = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return hours ? `${hours} hr ${remainder} min` : `${remainder} min`;
}

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function localTimeValue(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function validPoint(latitude, longitude) {
  return (
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude))
  );
}

function parseRequest(mealPreference, foodWish) {
  const raw = `${mealPreference} ${foodWish}`.toLowerCase();
  const meal = /\bbreakfast\b/.test(raw) ? "Breakfast"
    : /\bbrunch\b/.test(raw) ? "Brunch"
    : /\blunch\b/.test(raw) ? "Lunch"
    : /\bdinner\b/.test(raw) ? "Dinner"
    : /\b(chai|tea|coffee)\b/.test(raw) ? "Tea or coffee"
    : /\bsnacks?\b/.test(raw) ? "Snack" : "";
  const dish = raw.replace(/\b(for|the|a|an|some|near|around|time|prefer|want|would|like|quick|breakfast|brunch|lunch|dinner|chai|tea|coffee|snacks?|vegetarian)\b/g, " ")
    .replace(/\s+/g, " ").trim();
  return { meal, dish, vegetarian: /\b(vegetarian|pure veg)\b/.test(raw) };
}

function matchesDish(place, dish) {
  if (!dish) return true;
  const searchable = [place.name, place.category, place.cuisine,
    place.description, ...(Array.isArray(place.menuItems) ? place.menuItems : [])]
    .filter(Boolean).join(" ").toLowerCase();
  return searchable.includes(dish);
}

function mealFits(meal, arrival) {
  const hour = arrival.getHours() + arrival.getMinutes() / 60;
  if (meal === "Breakfast") return hour >= 6 && hour < 11;
  if (meal === "Brunch") return hour >= 10 && hour < 13;
  if (meal === "Lunch") return hour >= 12 && hour < 16;
  if (meal === "Dinner") return hour >= 18 || hour < 1;
  if (meal === "Tea or coffee") return hour >= 6 && hour < 23;
  if (meal === "Snack") return hour >= 10 && hour < 23;
  return true;
}

function suggestedLabel(place, arrival, requestedMeal) {
  if (requestedMeal && mealFits(requestedMeal, arrival)) return `${requestedMeal} stop`;
  const hour = arrival.getHours();
  const category = `${place.category || ""} ${place.cuisine || ""}`.toLowerCase();
  if (/cafe|café|coffee|tea|chai/.test(category)) return "Coffee or chai stop";
  if (hour >= 6 && hour < 11) return "Breakfast stop";
  if (hour >= 11 && hour < 15) return "Lunch stop";
  if (hour >= 15 && hour < 18) return "Snack stop";
  return "Dinner stop";
}

export default function FoodJourney({
  origin = "Starting point",
  destination = "Destination",
  travelMinutes = 0,
  travelMode = "car",
  places = [],
  routeCoordinates = [],
  mealPreference = "",
  foodWish = "",
}) {
  const navigate = useNavigate();
  const [departure, setDeparture] = useState(() => new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [navigationActive, setNavigationActive] = useState(false);
  const [position, setPosition] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [targetIndex, setTargetIndex] = useState(0);
  const [liveRoute, setLiveRoute] = useState(null);
  const [plannedRoute, setPlannedRoute] = useState(null);
  const [routeError, setRouteError] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const lastRouteRef = useRef({ at: 0, point: null });

  const routePoints = useMemo(
    () =>
      (Array.isArray(routeCoordinates) ? routeCoordinates : [])
        .map((point) => {
          // Coordinates from your Food Walk API are [longitude, latitude].
          if (Array.isArray(point)) {
            return [Number(point[1]), Number(point[0])];
          }

          return [Number(point?.latitude), Number(point?.longitude)];
        })
        .filter(
          ([latitude, longitude]) =>
            validPoint(latitude, longitude) &&
            Math.abs(latitude) <= 90 &&
            Math.abs(longitude) <= 180
        ),
    [routeCoordinates]
  );

  const startPoint = routePoints[0];
  const endPoint = routePoints[routePoints.length - 1];

  const candidates = useMemo(() => {
    const duration = Number(travelMinutes);

    if (!Number.isFinite(duration) || duration <= 0) return [];

    const unique = new Map();

    for (const place of Array.isArray(places) ? places : []) {
      const position = Number(place.routeMinutes);

      if (
        place?.id == null ||
        !place.name ||
        place.routeMinutes == null ||
        !Number.isFinite(position) ||
        position < 0 ||
        position > duration
      ) {
        continue;
      }

      unique.set(String(place.id), {
        ...place,
        routeMinutes: position,
        stopMinutes: Math.max(5, Number(place.stopMinutes) || 30),
      });
    }

    return [...unique.values()].sort(
      (a, b) => a.routeMinutes - b.routeMinutes
    );
  }, [places, travelMinutes]);

  const wish = `${mealPreference} ${foodWish}`.trim();
  const request = useMemo(
    () => parseRequest(mealPreference, foodWish),
    [mealPreference, foodWish]
  );

  const rankedPlaces = useMemo(() => candidates.map((place) => {
    const arrival = addMinutes(departure, place.routeMinutes);
    const dishMatch = matchesDish(place, request.dish);
    const timeMatch = mealFits(request.meal, arrival);
    const vegMatch = !request.vegetarian || place.vegetarian === true;
    return { ...place, dishMatch, timeMatch, vegMatch,
      score: (dishMatch ? 100 : 0) + (timeMatch ? 30 : 0) +
        (vegMatch ? 20 : 0) - (Number(place.detourKm) || 0) * 10 };
  }), [candidates, departure, request]);

  const confirmedMatches = rankedPlaces.filter(
    (place) => place.dishMatch && place.timeMatch && place.vegMatch
  );

  const recommendations = useMemo(() => {
    const limit = Number(travelMinutes) < 90 ? 1 :
      Number(travelMinutes) < 240 ? 2 : 4;
    return [...rankedPlaces]
      .filter((place) => place.vegMatch && place.timeMatch)
      .sort((a, b) => b.score - a.score || a.routeMinutes - b.routeMinutes)
      .slice(0, limit)
      .sort((a, b) => a.routeMinutes - b.routeMinutes);
  }, [rankedPlaces, travelMinutes]);

  const selectedStops = useMemo(() => candidates.filter((place) =>
    selectedIds.includes(String(place.id))
  ), [candidates, selectedIds]);

  useEffect(() => {
    if (!startPoint || !endPoint || selectedStops.length === 0) {
      setPlannedRoute(null);
      setRouteError("");
      setRouteLoading(false);
      return;
    }
    const stops = [...selectedStops].sort((a, b) => a.routeMinutes - b.routeMinutes);
    if (stops.some((place) => !validPoint(place.latitude, place.longitude))) {
      setPlannedRoute(null);
      setRouteError("A selected restaurant has no map coordinates.");
      return;
    }
    const controller = new AbortController();
    const mode = travelMode === "walking" ? "foot" :
      travelMode === "bicycle" || travelMode === "bike" ? "bike" : "car";
    const profile = mode === "foot" ? "walking" : "driving";
    const points = [startPoint, ...stops.map((place) =>
      [Number(place.latitude), Number(place.longitude)]), endPoint];
    const coordinates = points.map(([lat, lon]) => `${lon},${lat}`).join(";");
    const url = `https://routing.openstreetmap.de/routed-${mode}/route/v1/${profile}/` +
      `${coordinates}?overview=full&geometries=geojson&steps=false`;
    setRouteLoading(true);
    setPlannedRoute(null);
    setRouteError("");
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Routing service unavailable");
        return response.json();
      })
      .then((payload) => {
        const route = payload.routes?.[0];
        if (!route?.geometry?.coordinates?.length) throw new Error("No route via the restaurant was found");
        setPlannedRoute({
          points: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
          minutes: route.duration / 60,
          distanceKm: route.distance / 1000,
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setRouteError(
          "A road route through this restaurant could not be calculated. Try another stop."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setRouteLoading(false);
      });
    return () => controller.abort();
  }, [selectedStops, startPoint, endPoint, travelMode]);
  const navigationTargets = useMemo(() => [
    ...(startPoint ? [{ name: shortPlaceName(origin), point: startPoint }] : []),
    ...selectedStops
      .filter((place) => validPoint(place.latitude, place.longitude))
      .sort((a, b) => a.routeMinutes - b.routeMinutes)
      .map((place) => ({
        name: place.name,
        point: [Number(place.latitude), Number(place.longitude)],
      })),
    ...(endPoint ? [{ name: shortPlaceName(destination), point: endPoint }] : []),
  ], [selectedStops, startPoint, origin, endPoint, destination]);
  const currentTarget = navigationTargets[targetIndex];

  useEffect(() => {
    if (!navigationActive) return;
    if (!navigator.geolocation) {
      setGpsError("This device does not support GPS location.");
      setNavigationActive(false);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude]);
        setGpsError("");
      },
      (error) => setGpsError(error.code === 1
        ? "Allow location access in your browser to start navigation."
        : "GPS location is unavailable. Move to an open area and try again."),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [navigationActive]);

  useEffect(() => {
    if (!navigationActive || !position || !currentTarget) return;
    if (distanceMetres(position, currentTarget.point) < 70) {
      if (targetIndex < navigationTargets.length - 1) {
        setTargetIndex((index) => index + 1);
        lastRouteRef.current = { at: 0, point: null };
      } else {
        setNavigationActive(false);
        setLiveRoute(null);
        setGpsError("You have reached your destination.");
      }
    }
  }, [navigationActive, position, currentTarget, targetIndex, navigationTargets.length]);

  useEffect(() => {
    if (!navigationActive || !position || !currentTarget) return;
    const previous = lastRouteRef.current;
    if (Date.now() - previous.at < 15000 && previous.point &&
        distanceMetres(previous.point, position) < 35) return;
    lastRouteRef.current = { at: Date.now(), point: position };
    const controller = new AbortController();
    const mode = travelMode === "walking" ? "foot" :
      travelMode === "bicycle" || travelMode === "bike" ? "bike" : "car";
    const profile = mode === "foot" ? "walking" : "driving";
    const [lat, lon] = position;
    const [targetLat, targetLon] = currentTarget.point;
    const url = `https://routing.openstreetmap.de/routed-${mode}/route/v1/${profile}/` +
      `${lon},${lat};${targetLon},${targetLat}?overview=full&geometries=geojson&steps=true`;
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Routing unavailable");
        return response.json();
      })
      .then((payload) => {
        const route = payload.routes?.[0];
        if (!route?.geometry?.coordinates?.length) throw new Error("No road route found");
        const steps = route.legs?.flatMap((leg) => leg.steps || []) || [];
        setLiveRoute({
          points: route.geometry.coordinates.map(([x, y]) => [y, x]),
          distance: route.distance,
          duration: route.duration,
          instruction: turnText(steps.find((step) =>
            step.maneuver?.type !== "depart" && step.maneuver?.type !== "arrive") || steps[0]),
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setLiveRoute(null);
          setGpsError("Live road directions are temporarily unavailable. GPS position is still shown.");
        }
      });
    return () => controller.abort();
  }, [navigationActive, position, currentTarget, travelMode]);

  const foodStopMinutes = selectedStops.reduce(
    (total, place) => total + place.stopMinutes,
    0
  );

  const actualTravelMinutes = plannedRoute?.minutes ?? Number(travelMinutes);
  const totalMinutes = actualTravelMinutes + foodStopMinutes;

  function arrivalAt(place) {
    const earlierStopMinutes = selectedStops
      .filter((selected) => selected.routeMinutes < place.routeMinutes)
      .reduce((total, selected) => total + selected.stopMinutes, 0);

    return addMinutes(
      departure,
      place.routeMinutes + earlierStopMinutes
    );
  }

  function toggleStop(place) {
    const id = String(place.id);

    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function changeDeparture(value) {
    if (!value) return;

    const [hours, minutes] = value.split(":").map(Number);
    const next = new Date(departure);
    next.setHours(hours, minutes, 0, 0);
    setDeparture(next);
  }

  function startNavigation() {
    if (navigationActive) {
      setNavigationActive(false);
      setLiveRoute(null);
      return;
    }
    if (!endPoint) {
      setGpsError("Build a route before starting navigation.");
      return;
    }
    setTargetIndex(0);
    setPosition(null);
    setLiveRoute(null);
    setGpsError("");
    lastRouteRef.current = { at: 0, point: null };
    setNavigationActive(true);
  }

  return (
    <main className="fj-page">
      <header className="fj-header">
        <div>
          <div className="fj-logo">
            Food<span>Kindl</span>
          </div>
          <div className="fj-logo-subtitle">F O O D &nbsp; W A L K</div>
        </div>

        <button
          type="button"
          className="fj-back"
          onClick={() => navigate("/food-walk")}
        >
          ← Edit route
        </button>
      </header>

      <h1>Your food journey</h1>

      <p className="fj-route-title">
        📍 {shortPlaceName(origin)}
        <span aria-hidden="true"> → </span>
        <strong>{shortPlaceName(destination)}</strong>
      </p>

      <div className="fj-time-actions">
        <button
          type="button"
          className="fj-primary"
          onClick={() => {
            setDeparture(new Date());
            setShowTimePicker(false);
          }}
        >
          ▶ &nbsp; Start now
        </button>

        <button
          type="button"
          className="fj-secondary"
          onClick={() => setShowTimePicker((current) => !current)}
        >
          ◷ &nbsp; Change time
        </button>
      </div>

      {showTimePicker && (
        <label className="fj-picker">
          Departure time
          <input
            type="time"
            value={localTimeValue(departure)}
            onChange={(event) => changeDeparture(event.target.value)}
          />
        </label>
      )}

      <section className="fj-summary" aria-label="Trip duration">
        <div className="fj-summary-top">
          <div>
            <span className="fj-summary-icon">
              {travelMode === "walking"
                ? "🚶"
                : travelMode === "bike" || travelMode === "bicycle"
                ? "🚲"
                : "🚗"}
            </span>
            <span>
              <small>Travel</small>
              <strong>{formatDuration(actualTravelMinutes)}</strong>
            </span>
          </div>

          <div>
            <span className="fj-summary-icon">🍴</span>
            <span>
              <small>Selected food stops</small>
              <strong>{formatDuration(foodStopMinutes)}</strong>
            </span>
          </div>
        </div>

        <div className="fj-total">
          Total trip about <strong>{formatDuration(totalMinutes)}</strong>
        </div>
      </section>

      {routePoints.length > 1 && (
        <section className="fj-map" aria-label="Planned route map">
          <MapContainer
            center={startPoint}
            zoom={11}
            scrollWheelZoom={false}
            className="fj-leaflet-map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {(selectedStops.length === 0 || plannedRoute) && (
              <Polyline
                positions={plannedRoute?.points || routePoints}
                pathOptions={{ color: "#f75b42", weight: 5 }}
              />
            )}
            <Marker position={startPoint} icon={startPin} />
            <Marker position={endPoint} icon={endPin} />
            {position && navigationActive && (
              <Marker position={position} icon={livePin} />
            )}
            {liveRoute?.points?.length > 1 && navigationActive && (
              <Polyline positions={liveRoute.points}
                pathOptions={{ color: "#247cff", weight: 6 }} />
            )}

            {selectedStops
              .filter((place) =>
                validPoint(place.latitude, place.longitude)
              )
              .map((place) => (
                <Marker
                  key={place.id}
                  position={[
                    Number(place.latitude),
                    Number(place.longitude),
                  ]}
                  icon={foodPin}
                />
              ))}

            <FitRoute points={plannedRoute?.points || routePoints} />
            <FollowLocation position={position} enabled={navigationActive} />
          </MapContainer>
        </section>
      )}

      {routeLoading && <p className="fj-note" role="status">
        Calculating the road route through your selected food stop…
      </p>}
      {routeError && <p className="fj-empty" role="alert">{routeError}</p>}

      {navigationActive && (
        <section className="fj-live-status" role="status" aria-live="polite"
          style={{ margin: "18px 0", padding: "16px 18px", borderRadius: 16,
            background: "#eaf2ff", color: "#173b70" }}>
          <strong>Live GPS navigation · Next: {currentTarget?.name || "Destination"}</strong>
          <p>{liveRoute?.instruction || "Locating you and finding a road route…"}</p>
          {liveRoute && <small>
            {(liveRoute.distance / 1000).toFixed(1)} km · about {formatDuration(liveRoute.duration / 60)} to next stop
          </small>}
        </section>
      )}
      {gpsError && <p className="fj-empty" role="alert">{gpsError}</p>}

      {request.dish && confirmedMatches.length === 0 &&
        recommendations.length > 0 && (
          <p className="fj-empty">
            We could not confirm {request.dish} at a suitable stop on this
            route. Here are other places along the way. Check menus and
            opening hours before visiting.
          </p>
        )}
                

      <section className="fj-timeline" aria-label="Suggested stops">
        {recommendations.length === 0 ? (
          <div className="fj-empty">
            {candidates.length === 0
              ? "No restaurants were returned for this route. Try another route."
              : `No suitable stop was found for ${wish || "this trip"} at the selected time. Try a different departure time or preference.`}
          </div>
        ) : (
          recommendations.map((place) => {
            const selected = selectedIds.includes(String(place.id));
            const arrival = arrivalAt(place);
            const label = suggestedLabel(place, arrival, request.meal);
            const area = shortPlaceName(place.area);

            return (
              <div className="fj-timeline-row" key={place.id}>
                <div className="fj-time">
                  <strong>{formatTime(arrival)}</strong>
                  <span className={`fj-dot ${selected ? "selected" : ""}`}>
                    {selected ? "✓" : ""}
                  </span>
                </div>

                <article className="fj-stop-card">
                  <div className="fj-stop-icon" aria-hidden="true">
                    {/coffee|cafe|café|chai|tea/i.test(
                      `${place.name} ${place.category}`
                    )
                      ? "☕"
                      : "🍽️"}
                  </div>

                  <div className="fj-stop-details">
                    <span className="fj-meal-label">
                      {label}
                      {area ? ` near ${area}` : ""}
                    </span>

                    <h2>{place.name}</h2>
                    {request.dish && place.dishMatch && (
                      <p className="fj-cuisine">Listing mentions {request.dish}</p>
                    )}

                    <p className="fj-meta">
                      {Number(place.detourKm || 0).toFixed(2)} km from
                      route · {place.stopMinutes} min stop
                    </p>

                    {place.cuisine && (
                      <p className="fj-cuisine">{place.cuisine}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className={`fj-add ${selected ? "selected" : ""}`}
                    onClick={() => toggleStop(place)}
                  >
                    {selected ? "✓ Added" : "+ Add stop"}
                  </button>
                </article>
              </div>
            );
          })
        )}
      </section>

      <p className="fj-note">
        ⓘ &nbsp; Arrival times are estimates. Restaurant opening hours
        have not been verified.
      </p>

      <button
        type="button"
        className="fj-navigation"
        onClick={startNavigation}
        disabled={routePoints.length < 2 || routeLoading ||
          (selectedStops.length > 0 && !plannedRoute)}
      >
        ➤ &nbsp; {navigationActive ? "End navigation" : "Start live navigation"}
      </button>
    </main>
  );
}
