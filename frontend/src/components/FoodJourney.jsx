
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadGoogleMaps } from "../components/googleMaps";
import api from "../api";
import "./FoodWalkDashboard.css";
import FoodWalkVoiceAssistant from "../components/FoodWalkVoiceAssistant";

const MAX_STOPS = 4;

function toPoint(place) {
  const lat = Number(place?.latitude ?? place?.lat);
  const lng = Number(place?.longitude ?? place?.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  return { lat, lng };
}

function readableTime(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(value / 60);
  const mins = value % 60;

  return hours ? `${hours} hr ${mins} min` : `${mins} min`;
}

function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== "string") return [];

  const points = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  try {
    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let byte;

      do {
        if (index >= encoded.length) return [];
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      latitude += result & 1 ? ~(result >> 1) : result >> 1;

      result = 0;
      shift = 0;

      do {
        if (index >= encoded.length) return [];
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      longitude += result & 1 ? ~(result >> 1) : result >> 1;

      points.push({
        lat: latitude / 1e5,
        lng: longitude / 1e5,
      });
    }

    return points;
  } catch {
    return [];
  }
}

function extractRoutePoints(route) {
  const geojson =
    route?.polyline?.geoJsonLinestring?.coordinates ||
    route?.polyline?.geoJsonLineString?.coordinates ||
    route?.geoJsonLinestring?.coordinates;

  if (Array.isArray(geojson) && geojson.length) {
    return geojson
      .map((point) => ({
        lat: Number(point[1]),
        lng: Number(point[0]),
      }))
      .filter(
        (point) =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lng)
      );
  }

  const encoded =
    route?.polyline?.encodedPolyline ||
    route?.encodedPolyline;

  return decodePolyline(encoded);
}

function plannedRoutePoints(coordinates) {
  if (!Array.isArray(coordinates)) return [];

  return coordinates
    .filter((point) => Array.isArray(point) && point.length >= 2)
    .map(([lng, lat]) => ({
      lat: Number(lat),
      lng: Number(lng),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng)
    );
}

function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function extractDirections(route) {
  return (route?.legs || [])
    .flatMap((leg) => leg.steps || [])
    .map((step) => {
      const instruction =
        step?.navigationInstruction?.instructions ||
        step?.instruction ||
        "Continue along the route";

      return {
        text: String(instruction).replace(/<[^>]+>/g, " "),
        distance: Number(step.distanceMeters || 0),
        // Routes API step endpoints, when requested in the response field mask.
        endPoint: toPoint(step?.endLocation?.latLng || step?.endLocation),
      };
    });
}

function getApiError(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;

  if (Array.isArray(data?.detail)) {
    return data.detail.join(" ");
  }

  return (
    error?.message ||
    "Unable to calculate the route. Please try again."
  );
}

function GoogleJourneyMap({
  coordinates,
  chosen,
  live,
  navigationPoints,
}) {
  const container = useRef(null);
  const map = useRef(null);
  const overlays = useRef([]);

  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((gm) => {
        if (cancelled || !container.current) return;

        map.current = new gm.Map(container.current, {
          center: { lat: 12.9716, lng: 77.5946 },
          zoom: 12,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });

        setReady(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setMapError(error.message);
        }
      });

    return () => {
      cancelled = true;

      overlays.current.forEach((object) => {
        object.setMap?.(null);
      });

      overlays.current = [];
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;

    const gm = window.google.maps;

    overlays.current.forEach((object) => {
      object.setMap?.(null);
    });

    overlays.current = [];

    const bounds = new gm.LatLngBounds();
    const originalPoints = plannedRoutePoints(coordinates);

    const path =
      navigationPoints.length > 1
        ? navigationPoints
        : originalPoints;

    if (path.length > 1) {
      const outline = new gm.Polyline({
        map: map.current,
        path,
        strokeColor: "#ffffff",
        strokeOpacity: 0.95,
        strokeWeight: 10,
        zIndex: 10,
      });

      const routeLine = new gm.Polyline({
        map: map.current,
        path,
        strokeColor: "#ef633e",
        strokeOpacity: 1,
        strokeWeight: 6,
        zIndex: 11,
      });

      overlays.current.push(outline, routeLine);

      path.forEach((point) => bounds.extend(point));
    }

    function addMarker(point, label, color, title) {
      if (!point) return;

      const marker = new gm.Marker({
        map: map.current,
        position: point,
        title,
        label: {
          text: String(label),
          color: "#ffffff",
          fontWeight: "bold",
        },
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 15,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });

      overlays.current.push(marker);
      bounds.extend(point);
    }

    if (originalPoints.length) {
      addMarker(
        originalPoints[0],
        "A",
        "#16866b",
        "Starting point"
      );

      addMarker(
        originalPoints[originalPoints.length - 1],
        "B",
        "#375bd4",
        "Destination"
      );
    }

    chosen.forEach((place, index) => {
      addMarker(
        toPoint(place),
        index + 1,
        "#f36d49",
        place.name
      );
    });

    if (live) {
      const marker = new gm.Marker({
        map: map.current,
        position: live,
        title: "Your current location",
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#2876fa",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });

      overlays.current.push(marker);
      bounds.extend(live);
    }

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, 55);
    }
  }, [ready, coordinates, chosen, live, navigationPoints]);

  return (
    <div
      className="fj-google-map-wrap"
      style={{ width: "100%", minHeight: 440 }}
    >
      {mapError && (
        <p className="fw-error" role="alert">
          {mapError}
        </p>
      )}

      <div
        ref={container}
        className="fj-google-map"
        style={{
          height: "min(65vh, 620px)",
          minHeight: 440,
          width: "100%",
          borderRadius: 18,
        }}
        aria-label="FoodKindl Google route map"
      />
    </div>
  );
}

export default function FoodJourney({
  origin: inputOrigin,
  destination: inputDestination,
  travelMinutes: inputTravelMinutes,
  travelMode: inputTravelMode,
  places: inputPlaces,
  routeCoordinates: inputCoordinates,
  mealPreference: inputMealPreference,
  foodWish: inputFoodWish,
  selectedIds: inputIds,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const plan = location.state?.foodJourney || {};

  const origin = inputOrigin ?? plan.origin ?? "Start";
  const destination =
    inputDestination ?? plan.destination ?? "Destination";

  const travelMinutes =
    inputTravelMinutes ?? plan.travelMinutes ?? 0;

  const travelMode =
    inputTravelMode ?? plan.travelMode ?? "car";

  const places = inputPlaces ?? plan.places ?? [];

  const routeCoordinates =
    inputCoordinates ?? plan.routeCoordinates ?? [];

  const mealPreference =
    inputMealPreference ?? plan.mealPreference ?? "";

  const foodWish = inputFoodWish ?? plan.foodWish ?? "";

  const [ids, setIds] = useState(() =>
    (inputIds || plan.selectedIds || []).map(String)
  );

  const [departure, setDeparture] = useState(() =>
    new Date().toTimeString().slice(0, 5)
  );
  const [placeQuery, setPlaceQuery] = useState("");

  const [navigation, setNavigation] = useState(false);
  const [live, setLive] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [routeError, setRouteError] = useState("");
  const [routeInfo, setRouteInfo] = useState(null);
  const [navigationPoints, setNavigationPoints] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const requestRef = useRef(null);
  const liveRef = useRef(null);
  const routeKeyRef = useRef("");
  const stepIndexRef = useRef(0);
  const [spokenInstruction, setSpokenInstruction] = useState("");

  const selected = useMemo(
    () =>
      places
        .filter((place) => ids.includes(String(place.id)))
        .sort(
          (a, b) =>
            Number(a.routeMinutes || 0) -
            Number(b.routeMinutes || 0)
        ),
    [places, ids]
  );

  const selectedKey = selected.map((place) => place.id).join(",");

  const filteredPlaces = useMemo(() => {
    const query = placeQuery.trim().toLocaleLowerCase();
    if (!query) return places;

    return places.filter((place) =>
      [place.name, place.category, place.cuisine, place.address]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(query))
    );
  }, [places, placeQuery]);

  const totalMinutes =
    Number(travelMinutes) +
    selected.reduce(
      (sum, place) =>
        sum + Number(place.stopMinutes || 30),
      0
    );

  const destinationPoint = useMemo(() => {
    const points = plannedRoutePoints(routeCoordinates);
    return points.length ? points[points.length - 1] : null;
  }, [routeCoordinates]);

  const stopPoints = useMemo(
    () => selected.map(toPoint).filter(Boolean),
    [selected]
  );

  // User-selected fallback: Bike uses car-road routing (DRIVE).
  // These are driving directions, not verified bicycle-safe directions.
  const isBicycle = ["bike", "bicycle", "cycling"].includes(String(travelMode).toLowerCase());
  const backendMode = {
    walk: "WALK",
    walking: "WALK",
    bike: "DRIVE",
    bicycle: "DRIVE",
    cycling: "DRIVE",
    motorcycle: "TWO_WHEELER",
    scooter: "TWO_WHEELER",
    car: "DRIVE",
    driving: "DRIVE",
  }[String(travelMode).toLowerCase()] || "WALK";
  const calculateRoute = useCallback(
    async (startPoint) => {
      if (!startPoint || !destinationPoint) {
        setRouteError(
          "The start or destination coordinates are unavailable."
        );
        return;
      }

      requestRef.current?.abort();

      const controller = new AbortController();
      requestRef.current = controller;

      setLoadingRoute(true);
      setRouteError("");
      setRouteInfo(null);
      setNavigationPoints([]);
      setSpokenInstruction("");
      stepIndexRef.current = 0;

      try {
        // Routes API: calculate one segment per food stop.
        // The existing /dineout/route/ endpoint supports
        // an origin, a destination and a travel mode.
        const pointsToVisit = [
          ...stopPoints,
          destinationPoint,
        ];

        let currentPoint = startPoint;
        const fullPath = [];
        const allDirections = [];

        let totalDistance = 0;
        let totalDuration = 0;

        for (const point of pointsToVisit) {
          if (controller.signal.aborted) return;

          const response = await api.post(
            "/dineout/route/",
            {
              origin: {
                latitude: currentPoint.lat,
                longitude: currentPoint.lng,
              },
              destination: {
                latitude: point.lat,
                longitude: point.lng,
              },
              travel_mode: backendMode,
            },
            {
              signal: controller.signal,
              timeout: 30000,
            }
          );

          const route = response.data?.route;

          if (!route) {
            throw new Error(
              "Django returned no route for one of the stops."
            );
          }

          const segmentPath = extractRoutePoints(route);

          if (segmentPath.length < 2) {
            throw new Error(
              "Google returned a route without usable map coordinates."
            );
          }

          // Avoid duplicating the shared endpoint between segments.
          if (fullPath.length) {
            fullPath.push(...segmentPath.slice(1));
          } else {
            fullPath.push(...segmentPath);
          }

          totalDistance += Number(route.distanceMeters || 0);
          totalDuration +=
            parseFloat(String(route.duration || "0")) || 0;

          allDirections.push(...extractDirections(route));

          currentPoint = point;
        }

        if (!controller.signal.aborted) {
          setNavigationPoints(fullPath);
          // No announcement until the GPS confirms proximity to a maneuver.
          setSpokenInstruction("");

          setRouteInfo({
            distance: totalDistance,
            duration: totalDuration,
            directions: allDirections,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setRouteError(getApiError(error));
          setNavigationPoints([]);
          setRouteInfo(null);
          setSpokenInstruction("");
        }
      } finally {
        if (requestRef.current === controller) {
          setLoadingRoute(false);
        }
      }
    },
    [backendMode, destinationPoint, stopPoints]
  );

  // Start or stop GPS tracking.
  useEffect(() => {
    if (!navigation) {
      setLive(null);
      liveRef.current = null;
      routeKeyRef.current = "";
      requestRef.current?.abort();
      setLoadingRoute(false);
      setRouteInfo(null);
      setNavigationPoints([]);
      setSpokenInstruction("");
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("Browser geolocation is unavailable.");
      setNavigation(false);
      return;
    }

    setGpsError("");

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const point = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
        };

        liveRef.current = point;
        setLive(point);
        setGpsError("");
      },
      (error) => {
        setGpsError(
          error.code === 1
            ? "Allow location permission to navigate."
            : "Could not retrieve your current location."
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [navigation]);

  // Calculate once when navigation starts or stops change.
  // Do not call Routes API on every GPS update.
  useEffect(() => {
    if (!navigation || !live || !destinationPoint) return;

    const key = `${backendMode}:${selectedKey}`;

    if (routeKeyRef.current === key) return;

    routeKeyRef.current = key;
    calculateRoute(live);
  }, [
    navigation,
    live,
    destinationPoint,
    backendMode,
    selectedKey,
    calculateRoute,
  ]);

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);
  // Only announce a real maneuver when GPS gets close to its endpoint.
  // Missing step coordinates means we cannot safely time automatic prompts.
  useEffect(() => {
    if (!navigation || !live || !routeInfo?.directions?.length || Number(live.accuracy) > 35) return;
    const steps = routeInfo.directions;
    let i = stepIndexRef.current;
    while (i < steps.length && !steps[i].endPoint) i += 1;
    if (i >= steps.length) return;
    if (distanceMeters(live, steps[i].endPoint) <= 65) {
      const upcoming = steps[i + 1];
      if (upcoming?.text) setSpokenInstruction(upcoming.text);
      stepIndexRef.current = i + 1;
    }
  }, [live, navigation, routeInfo]);


  function toggle(id) {
    const value = String(id);

    setIds((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : previous.length < MAX_STOPS
          ? [...previous, value]
          : previous
    );
  }

  function updateRouteFromCurrentLocation() {
    if (!liveRef.current) {
      setRouteError(
        "Waiting for your current GPS location."
      );
      return;
    }

    calculateRoute(liveRef.current);
  }

  return (
    <main className="fj-google-page">
      <header className="fj-new-header">
        <div>
          <b>
            Food<span>Kindl</span>
          </b>
          <small>YOUR FOOD JOURNEY</small>
        </div>

        <button onClick={() => navigate("/food-walk")}>
          ← Edit route
        </button>
      </header>

      <div className="fj-title">
        <h1>Your food journey</h1>
        <p>
          📍 {origin} → {destination}
        </p>
      </div>

      <div className="fj-summaries">
        <div>
          <small>TRAVEL</small>
          <b>{readableTime(travelMinutes)}</b>
        </div>

        <div>
          <small>WITH STOPS</small>
          <b>{readableTime(totalMinutes)}</b>
        </div>

        <div>
          <small>FOOD STOPS</small>
          <b>{selected.length} selected</b>
        </div>

        <div>
          <small>TRAVEL MODE</small>
          <b>{isBicycle ? "Bike (car-road route)" : travelMode}</b>
        </div>
      </div>

      <div className="fj-journey-body">
        <div className="fj-journey-map-col">
          {isBicycle && (
            <p className="fw-error" role="note">
              Bike is using car-road directions as requested. This route may include
              roads unsuitable or prohibited for bicycles, and its ETA is for cars.
              Check road signs and local cycling rules before riding.
            </p>
          )}
          <GoogleJourneyMap
            coordinates={routeCoordinates}
            chosen={selected}
            live={navigation ? live : null}
            navigationPoints={navigationPoints}
          />

          <div className="fj-navbar">
            <button
              type="button"
              className="fw-build"
              onClick={() => setNavigation((value) => !value)}
            >
              {navigation
                ? "■ Stop live navigation"
                : "▶ Start live navigation"}
            </button>

            <span>
              {navigation
                ? "GPS tracking is active"
                : "Start navigation from your current location"}
            </span>
          </div>

          {navigation && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={updateRouteFromCurrentLocation}
                disabled={!live || loadingRoute}
              >
                {loadingRoute
                  ? "Calculating route..."
                  : "↻ Update route from here"}
              </button>
            </div>
          )}

          {live?.accuracy != null && (
            <p style={{ fontSize: 13, opacity: 0.8 }}>
              GPS accuracy: approximately{" "}
              {Math.round(live.accuracy)} metres.
            </p>
          )}

          <FoodWalkVoiceAssistant
  navigationActive={navigation}
  instruction={spokenInstruction}
  onStopNavigation={() => setNavigation(false)}
  onUpdateRoute={updateRouteFromCurrentLocation}
/>

          {gpsError && (
            <p className="fw-error" role="alert">
              {gpsError}
            </p>
          )}

          {routeError && (
            <p className="fw-error" role="alert">
              {routeError}
            </p>
          )}

          {navigation && routeInfo && (
            <div className="fj-live-summary">
              <b>
                {(routeInfo.distance / 1000).toFixed(1)} km
                {" · "}
                {readableTime(routeInfo.duration / 60)}
              </b>

              <p>
                Route calculated from your last GPS position.
                Use Update route after moving or deviating.
              </p>

              <h3>Route directions</h3>

              {routeInfo.directions.length ? (
                <ol>
                  {routeInfo.directions.map(
                    (step, index) => (
                      <li key={index}>
                        {step.text}
                        {step.distance > 0
                          ? ` · ${step.distance} m`
                          : ""}
                      </li>
                    )
                  )}
                </ol>
              ) : (
                <p>
                  Route is available. Detailed turn
                  instructions were not returned.
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="fj-journey-sidebar">
          <h2>Plan your stops</h2>

          <p>
            Choose up to four food stops. The route will be
            recalculated when your selection changes.
          </p>

          <label className="fw-field">
            Departure time
            <input
              type="time"
              value={departure}
              onChange={(event) =>
                setDeparture(event.target.value)
              }
            />
          </label>

          {(mealPreference || foodWish) && (
            <p className="fj-wish">
              🍴 Your wish:{" "}
              {[mealPreference, foodWish]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <input
            type="search"
            value={placeQuery}
            onChange={(event) => setPlaceQuery(event.target.value)}
            placeholder="Search restaurants, e.g. Nandhana Palace Dasarahalli"
            aria-label="Search food stops"
            style={{ width: "100%", margin: "0 0 12px", padding: "10px 12px" }}
          />

          {filteredPlaces.length ? (
            filteredPlaces.map((place) => (
              <article
                key={place.id}
                className="fj-stop-row"
              >
                <div>
                  <b>{place.name}</b>

                  <small>
                    {place.category || "Food stop"}
                    {" · "}
                    About {place.routeMinutes || "?"} min
                    into the trip
                  </small>
                </div>

                <button
                  className={
                    ids.includes(String(place.id))
                      ? "chosen"
                      : ""
                  }
                  onClick={() => toggle(place.id)}
                >
                  {ids.includes(String(place.id))
                    ? "✓ Selected"
                    : "+ Add"}
                </button>
              </article>
            ))
          ) : (
            <p>
              {placeQuery
                ? `No food stops match “${placeQuery}”. Try a shorter name.`
                : "No food stops were returned for this route. Try building the route again."}
            </p>
          )}

          <button
            className="fw-build"
            onClick={() => navigate("/food-walk")}
          >
            Plan another Food Walk →
          </button>
        </aside>
      </div>
    </main>
  );
}
