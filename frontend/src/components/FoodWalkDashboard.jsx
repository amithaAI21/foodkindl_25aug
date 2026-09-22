import { useEffect, useMemo, useRef, useState } from "react";

import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import api from "../api";
import "./FoodWalkDashboard.css";

/* ============================================================
   MAP MARKERS
============================================================ */

const mapPin = (label, background, size = 34) =>
  L.divIcon({
    className: "fw-map-pin-wrapper",

    html: `
      <span style="
        width:${size}px;
        height:${size}px;
        display:flex;
        align-items:center;
        justify-content:center;
        box-sizing:border-box;
        border:3px solid #fff;
        border-radius:50% 50% 50% 0;
        background:${background};
        color:#fff;
        font:800 ${size <= 30 ? 13 : 15}px/1 Arial,sans-serif;
        box-shadow:0 3px 10px rgba(0,0,0,.32);
        transform:rotate(-45deg);
      ">
        <span style="transform:rotate(45deg)">
          ${label}
        </span>
      </span>
    `,

    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });

const startIcon = mapPin("A", "#07836f", 36);

const endIcon = mapPin("B", "#234bb6", 36);

const restaurantIcon = mapPin("🍴", "#8b4b35", 30);

const selectedRestaurantIcon = (number) => mapPin(number, "#ff5a36", 38);

const liveLocationIcon = L.divIcon({
  className: "fw-live-location-wrapper",

  html: `
      <span style="
        width:22px;
        height:22px;
        display:block;
        border-radius:50%;
        background:#247cff;
        border:4px solid #fff;
        box-shadow:
          0 0 0 8px rgba(36,124,255,.2),
          0 3px 12px rgba(0,0,0,.35);
      "></span>
    `,

  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/* ============================================================
   BASIC HELPERS
============================================================ */

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function FitMap({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length < 2) {
      return;
    }

    const validPoints = points.filter(
      (point) =>
        Array.isArray(point) &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1])),
    );

    if (validPoints.length > 1) {
      map.fitBounds(L.latLngBounds(validPoints), {
        padding: [42, 42],
      });
    }
  }, [map, points]);

  return null;
}

/* ============================================================
   DISTANCE HELPERS
============================================================ */

function distanceMeters(first, second) {
  if (!first || !second) {
    return Infinity;
  }

  const toRadians = (value) => (value * Math.PI) / 180;

  const latitude1 = Number(first.latitude);

  const longitude1 = Number(first.longitude);

  const latitude2 = Number(second.latitude);

  const longitude2 = Number(second.longitude);

  if (![latitude1, longitude1, latitude2, longitude2].every(Number.isFinite)) {
    return Infinity;
  }

  const latitudeDifference = toRadians(latitude2 - latitude1);

  const longitudeDifference = toRadians(longitude2 - longitude1);

  const calculation =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    6371000 * 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation))
  );
}

function formatLiveDistance(meters) {
  if (!Number.isFinite(meters)) {
    return "--";
  }

  if (meters < 1000) {
    return `${Math.max(0, Math.round(meters))} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

/* ============================================================
   TURN INSTRUCTION FORMATTER
============================================================ */

function createTurnInstruction(step) {
  const maneuver = step?.maneuver || {};

  const type = maneuver.type || "";

  const modifier = maneuver.modifier || "";

  const roadName = step?.name?.trim();

  let message = "Continue straight";

  if (type === "depart") {
    message = roadName ? `Start on ${roadName}` : "Start walking";
  } else if (type === "arrive") {
    message = "You have reached your destination";
  } else if (type === "roundabout" || type === "rotary") {
    message = maneuver.exit
      ? `At the roundabout, take exit ${maneuver.exit}`
      : "Enter the roundabout";
  } else {
    const messages = {
      left: "Turn left",

      "slight left": "Keep slightly left",

      "sharp left": "Take a sharp left",

      right: "Turn right",

      "slight right": "Keep slightly right",

      "sharp right": "Take a sharp right",

      uturn: "Make a U-turn",

      straight: "Continue straight",
    };

    message =
      messages[modifier] ||
      (type === "merge"
        ? "Merge"
        : type === "fork"
          ? "Continue at the fork"
          : "Continue");

    if (roadName) {
      message += ` onto ${roadName}`;
    }
  }

  return message;
}

function chooseTravelMode(distanceKm) {
  const distance = Number(distanceKm);

  if (!Number.isFinite(distance)) {
    return "walking";
  }

  if (distance <= 5) {
    return "walking";
  }

  if (distance <= 15) {
    return "bicycle";
  }

  return "car";
}

function getRoutingConfig(travelMode) {
  if (travelMode === "bike" || travelMode === "bicycle") {
    return {
      osrmBase: "https://routing.openstreetmap.de/routed-bike/route/v1/driving",

      valhallaCosting: "bicycle",
    };
  }

  if (travelMode === "car") {
    return {
      osrmBase: "https://routing.openstreetmap.de/routed-car/route/v1/driving",

      valhallaCosting: "auto",
    };
  }

  return {
    osrmBase: "https://routing.openstreetmap.de/routed-foot/route/v1/walking",

    valhallaCosting: "pedestrian",
  };
}
/* ============================================================
   LIVE ROAD ROUTING
============================================================ */

async function fetchRoadRoute(current, target, travelMode = "walking") {
  const startLongitude = Number(current.longitude);

  const startLatitude = Number(current.latitude);

  const endLongitude = Number(target.longitude);

  const endLatitude = Number(target.latitude);

  if (
    ![startLongitude, startLatitude, endLongitude, endLatitude].every(
      Number.isFinite,
    )
  ) {
    throw new Error("The navigation coordinates are invalid.");
  }

  const routingConfig = getRoutingConfig(travelMode);

  const osrmUrl =
    `${routingConfig.osrmBase}/` +
    `${startLongitude},${startLatitude};` +
    `${endLongitude},${endLatitude}` +
    "?overview=full&geometries=geojson&steps=true";

  try {
    const response = await fetch(osrmUrl);

    if (!response.ok) {
      throw new Error(`OSRM ${response.status}`);
    }

    const payload = await response.json();

    const route = payload?.routes?.[0];

    const coordinates = route?.geometry?.coordinates;

    const rawSteps = route?.legs?.flatMap((leg) => leg.steps || []) || [];

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error("No route geometry was returned.");
    }

    return {
      positions: coordinates.map(([longitude, latitude]) => [
        latitude,
        longitude,
      ]),

      instructions: rawSteps
        .map((step, index) => {
          const location = step?.maneuver?.location;

          if (!Array.isArray(location)) {
            return null;
          }

          return {
            id: `${index}-${location[0]}-${location[1]}`,

            instruction: createTurnInstruction(step),

            latitude: Number(location[1]),

            longitude: Number(location[0]),

            distance: Number(step.distance || 0),

            duration: Number(step.duration || 0),
          };
        })
        .filter(Boolean),

      distance: Number(route.distance || 0),

      duration: Number(route.duration || 0),

      travelMode,
    };
  } catch (osrmError) {
    console.warn("Primary router failed:", osrmError);
  }

  /*
   * Valhalla fallback
   */

  const response = await fetch("https://valhalla1.openstreetmap.de/route", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      locations: [
        {
          lat: startLatitude,

          lon: startLongitude,
        },

        {
          lat: endLatitude,

          lon: endLongitude,
        },
      ],

      costing: routingConfig.valhallaCosting,

      units: "kilometers",

      shape_format: "geojson",
    }),
  });

  if (!response.ok) {
    throw new Error("Navigation is temporarily unavailable.");
  }

  const payload = await response.json();

  const coordinates = payload?.trip?.legs?.[0]?.shape?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error(`No ${travelMode} route was found.`);
  }

  return {
    positions: coordinates.map(([longitude, latitude]) => [
      latitude,
      longitude,
    ]),

    instructions: [],

    distance: Number(payload?.trip?.summary?.length || 0) * 1000,

    duration: Number(payload?.trip?.summary?.time || 0),

    travelMode,
  };
}
/*
 * Valhalla is the fallback if the
 * primary OSRM service fails.
 */

/* ============================================================
   LIVE NAVIGATION CONTROLLER
============================================================ */

function LiveNavigationController({
  active,
  stops,
  destination,
  travelMode,
  onStatus,
}) {
  const map = useMap();

  const [position, setPosition] = useState(null);

  const [target, setTarget] = useState(null);

  const [roadRoute, setRoadRoute] = useState([]);

  const [routeConnector, setRouteConnector] = useState([]);

  const targetIndexRef = useRef(0);

  const lastRoutePositionRef = useRef(null);

  const lastRouteAtRef = useRef(0);

  const routeRequestRef = useRef(0);

  const hasFittedRouteRef = useRef(false);

  const instructionsRef = useRef([]);

  const instructionIndexRef = useRef(0);

  /*
   * Reset navigation when the list
   * of stops changes.
   */

  useEffect(() => {
    targetIndexRef.current = 0;

    setTarget(stops[0] || destination || null);

    setRoadRoute([]);
    setRouteConnector([]);

    lastRoutePositionRef.current = null;

    lastRouteAtRef.current = 0;

    hasFittedRouteRef.current = false;

    instructionsRef.current = [];

    instructionIndexRef.current = 0;
  }, [stops, destination]);

  useEffect(() => {
    if (!active) {
      setPosition(null);
      setRoadRoute([]);
      setRouteConnector([]);

      instructionsRef.current = [];

      instructionIndexRef.current = 0;

      return undefined;
    }

    if (!navigator.geolocation) {
      onStatus({
        error: "Live location is not supported by this browser.",
      });

      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (reading) => {
        const current = {
          latitude: reading.coords.latitude,

          longitude: reading.coords.longitude,

          accuracy: reading.coords.accuracy,

          speed: reading.coords.speed,
        };

        setPosition(current);

        /*
         * The road-routing server may move or snap
         * the GPS coordinate to its nearest mapped
         * walking road.
         *
         * This connector always begins at the exact
         * blue GPS location marker.
         */

        setRouteConnector((connector) =>
          connector.length > 1
            ? [[current.latitude, current.longitude], connector[1]]
            : connector,
        );

        /*
         * Keep the map following the user.
         */

        if (hasFittedRouteRef.current) {
          map.panTo([current.latitude, current.longitude], {
            animate: true,
            duration: 0.5,
          });
        }

        /*
         * Navigation order:
         *
         * GPS
         * → Food Walk start
         * → selected restaurants
         * → final destination
         */

        const targets = [...stops, ...(destination ? [destination] : [])];

        let index = targetIndexRef.current;

        let next = targets[index] || null;

        let distance = distanceMeters(current, next);

        /*
         * Move to the next destination when the
         * user is within 40 metres of the current
         * destination.
         */

        if (next && distance <= 40) {
          index += 1;

          targetIndexRef.current = index;

          next = targets[index] || null;

          distance = distanceMeters(current, next);

          instructionsRef.current = [];

          instructionIndexRef.current = 0;

          setRoadRoute([]);
          setRouteConnector([]);

          lastRoutePositionRef.current = null;

          lastRouteAtRef.current = 0;

          hasFittedRouteRef.current = false;
        }

        setTarget(next);

        /*
         * Determine which turn instruction
         * should currently be displayed.
         */

        let instructionIndex = instructionIndexRef.current;

        while (
          instructionsRef.current[instructionIndex] &&
          distanceMeters(
            current,

            instructionsRef.current[instructionIndex],
          ) <= 22
        ) {
          instructionIndex += 1;
        }

        instructionIndexRef.current = instructionIndex;

        const nextInstruction =
          instructionsRef.current[instructionIndex] || null;

        const nextInstructionDistance = nextInstruction
          ? distanceMeters(current, nextInstruction)
          : null;

        onStatus({
          error: "",

          arrived: !next,

          targetName: next?.name || "Destination",

          distance: next ? distance : 0,

          duration: null,

          accuracy: reading.coords.accuracy,

          speed: Number.isFinite(reading.coords.speed)
            ? reading.coords.speed * 3.6
            : null,

          completed: Math.min(index, targets.length),

          total: targets.length,

          nextInstruction: !next
            ? "You have reached your destination"
            : nextInstruction?.instruction || "Continue on the current road",

          nextInstructionDistance,
        });

        if (!next) {
          setRoadRoute([]);
          setRouteConnector([]);

          instructionsRef.current = [];

          return;
        }

        const movedSinceRoute = lastRoutePositionRef.current
          ? distanceMeters(
              current,

              lastRoutePositionRef.current,
            )
          : Infinity;

        const routeAge = Date.now() - lastRouteAtRef.current;

        /*
         * Recalculate the road route when:
         *
         * 1. The user moves at least 35 metres.
         * 2. The existing route is 15 seconds old.
         */

        if (movedSinceRoute < 35 && routeAge < 15000) {
          return;
        }

        const requestId = routeRequestRef.current + 1;

        routeRequestRef.current = requestId;

        lastRoutePositionRef.current = current;

        lastRouteAtRef.current = Date.now();

        fetchRoadRoute(current, next, travelMode)
          .then((result) => {
            if (routeRequestRef.current !== requestId) {
              return;
            }

            const firstRoadPoint = result.positions[0];

            setRoadRoute(result.positions);

            instructionsRef.current = Array.isArray(result.instructions)
              ? result.instructions
              : [];

            instructionIndexRef.current = 0;

            /*
             * The first OSRM instruction is normally
             * "depart". If it is already behind or
             * extremely close to the current GPS point,
             * move to the following instruction.
             */

            while (
              instructionsRef.current[instructionIndexRef.current] &&
              distanceMeters(
                current,

                instructionsRef.current[instructionIndexRef.current],
              ) <= 15
            ) {
              instructionIndexRef.current += 1;
            }

            const firstInstruction =
              instructionsRef.current[instructionIndexRef.current] || null;

            /*
             * Join the exact GPS position with the
             * first point returned by the router.
             */

            setRouteConnector(
              firstRoadPoint
                ? [[current.latitude, current.longitude], firstRoadPoint]
                : [],
            );

            /*
             * Show the complete road route when
             * navigation first begins.
             */

            const boundsPoints = [
              [current.latitude, current.longitude],

              ...result.positions,
            ];

            if (boundsPoints.length > 1 && !hasFittedRouteRef.current) {
              map.fitBounds(boundsPoints, {
                padding: [45, 45],

                maxZoom: 17,
              });

              hasFittedRouteRef.current = true;
            }

            onStatus({
              error: "",

              arrived: false,

              targetName: next.name || "Destination",

              distance: result.distance,

              duration: result.duration,

              accuracy: reading.coords.accuracy,

              speed: Number.isFinite(reading.coords.speed)
                ? reading.coords.speed * 3.6
                : null,

              completed: Math.min(index, targets.length),

              total: targets.length,

              nextInstruction:
                firstInstruction?.instruction || "Continue on the current road",

              nextInstructionDistance: firstInstruction
                ? distanceMeters(current, firstInstruction)
                : null,
            });
          })
          .catch((routeError) => {
            if (routeRequestRef.current !== requestId) {
              return;
            }

            console.error(routeError);

            onStatus({
              error:
                routeError.message ||
                "Road navigation is temporarily unavailable.",

              arrived: false,

              targetName: next.name || "Destination",

              distance,

              duration: null,

              completed: Math.min(index, targets.length),

              total: targets.length,

              nextInstruction: "Waiting for road directions",

              nextInstructionDistance: null,
            });
          });
      },

      (locationError) => {
        let message = "Your live location could not be determined.";

        if (locationError.code === 1) {
          message =
            "Location permission is blocked. Allow location access in your browser.";
        } else if (locationError.code === 2) {
          message = "Your location is unavailable. Turn on GPS and try again.";
        } else if (locationError.code === 3) {
          message = "The GPS request timed out. Please try again.";
        }

        onStatus({
          error: message,
        });
      },

      {
        enableHighAccuracy: true,

        maximumAge: 500,

        timeout: 15000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [active, map, stops, destination, travelMode, onStatus]);

  if (!active || !position) {
    return null;
  }

  return (
    <>
      {/* LIVE GPS LOCATION */}

      <Marker
        icon={liveLocationIcon}
        position={[position.latitude, position.longitude]}
        zIndexOffset={2000}
      >
        <Popup>
          Your live location
          <br />
          GPS accuracy: {Math.round(position.accuracy || 0)} metres
        </Popup>
      </Marker>

      {/* GPS TO NEAREST MAPPED ROAD */}

      {target && routeConnector.length > 1 && (
        <Polyline
          positions={routeConnector}
          color="#247cff"
          weight={7}
          opacity={0.95}
          dashArray="4 10"
        />
      )}

      {/* ROAD-FOLLOWING WALKING ROUTE */}

      {target && roadRoute.length > 1 && (
        <Polyline
          positions={roadRoute}
          color="#247cff"
          weight={7}
          opacity={0.95}
        />
      )}
    </>
  );
}

/* ============================================================
   LOCATION AUTOCOMPLETE
============================================================ */

function LocationInput({ label, value, onChange, onPick }) {
  const [suggestions, setSuggestions] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const [open, setOpen] = useState(false);

  const [hasUserTyped, setHasUserTyped] = useState(false);

  useEffect(() => {
    /*
     * Do not search the default Start and
     * Destination values during page load.
     */
    if (!hasUserTyped) {
      return undefined;
    }

    const trimmed = value.trim();

    if (trimmed.length < 3) {
      setSuggestions([]);
      setOpen(false);

      return undefined;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await api.get("/foodwalk/location-suggestions/", {
          params: {
            q: trimmed,
          },

          signal: controller.signal,
        });

        const results = Array.isArray(response.data) ? response.data : [];

        setSuggestions(results);

        setOpen(results.length > 0);
      } catch (requestError) {
        /*
         * Ignore cancelled searches.
         */

        if (
          requestError.code === "ERR_CANCELED" ||
          requestError.name === "CanceledError"
        ) {
          return;
        }

        console.error(requestError);

        setSuggestions([]);
        setOpen(false);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);

      controller.abort();
    };
  }, [value, hasUserTyped]);

  function handleChange(event) {
    setHasUserTyped(true);

    onChange(event.target.value);
  }

  function handleSelect(place) {
    const selectedValue = place.label || place.display_name || place.name;

    /*
     * Stop searching after the user
     * selects a suggestion.
     */

    setHasUserTyped(false);
    setOpen(false);
    setSuggestions([]);
    setIsLoading(false);

    onPick(selectedValue);
  }

  return (
    <label
      className="fw-location"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
    >
      <span>{label}</span>

      <input
        value={value}
        onChange={handleChange}
        placeholder={`Search ${label.toLowerCase()}`}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={`${label}-listbox`}
      />

      {isLoading && <small>Searching…</small>}

      {open && suggestions.length > 0 && (
        <div className="fw-suggestions" id={`${label}-listbox`} role="listbox">
          {suggestions.map((place, index) => {
            const placeLabel =
              place.label || place.display_name || place.name || "Location";

            return (
              <button
                key={
                  place.id || `${place.latitude}-${place.longitude}-${index}`
                }
                type="button"
                role="option"
                onMouseDown={(event) => {
                  event.preventDefault();

                  handleSelect(place);
                }}
              >
                <b>{place.name || placeLabel.split(",")[0]}</b>

                <span>{placeLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </label>
  );
}
/* ============================================================
   MAIN FOOD WALK COMPONENT
============================================================ */

export default function FoodWalk() {
  const [start, setStart] = useState("Indiranagar, Bengaluru");

  const [travelModeChoice, setTravelModeChoice] = useState("auto");

  const [activeTravelMode, setActiveTravelMode] = useState("walking");

  const [end, setEnd] = useState("Whitefield, Bengaluru");

  const [budget, setBudget] = useState(1000);

  const [foodType, setFoodType] = useState("all");

  const [data, setData] = useState(null);

  const [selected, setSelected] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [navigationActive, setNavigationActive] = useState(false);

  const [navigationTarget, setNavigationTarget] = useState(null);

  const [navStatus, setNavStatus] = useState({
    error: "",
    arrived: false,
    targetName: "",
    distance: null,
    duration: null,
    accuracy: null,
    speed: null,
    completed: 0,
    total: 0,

    nextInstruction: "Waiting for your location",

    nextInstructionDistance: null,
  });

  /* ============================================================
     ROUTE COORDINATES
  ============================================================ */

  const routePoints = useMemo(() => {
    if (!Array.isArray(data?.route?.coordinates)) {
      return [];
    }

    return data.route.coordinates
      .map(([longitude, latitude]) => [Number(latitude), Number(longitude)])
      .filter(
        ([latitude, longitude]) =>
          Number.isFinite(latitude) && Number.isFinite(longitude),
      );
  }, [data?.route?.coordinates]);

  /* ============================================================
     SELECTED RESTAURANTS
  ============================================================ */

  const selectedIds = useMemo(
    () => new Set(selected.map((place) => String(place.id))),
    [selected],
  );

  const orderedSelected = useMemo(
    () =>
      [...selected].sort(
        (first, second) =>
          Number(first.route_progress || 0) -
          Number(second.route_progress || 0),
      ),
    [selected],
  );

  /*
   * The navigation targets must be memoized.
   * Otherwise, React creates a new array after
   * every render and restarts the GPS watcher.
   */

  const liveNavigationStops = useMemo(() => {
    const plannedStart = data?.start
      ? {
          ...data.start,

          id: "food-walk-start",

          name: data.start.name || start || "Food Walk starting point",

          isFoodWalkStart: true,
        }
      : null;

    /*
     * Navigate button:
     *
     * GPS → Food Walk start → restaurant
     */

    if (navigationTarget) {
      return [...(plannedStart ? [plannedStart] : []), navigationTarget];
    }

    /*
     * Full navigation:
     *
     * GPS → Food Walk start → selected
     * restaurants → destination
     */

    return [...(plannedStart ? [plannedStart] : []), ...orderedSelected];
  }, [navigationTarget, orderedSelected, data?.start, start]);

  const liveNavigationDestination = useMemo(() => {
    /*
     * When navigating to one restaurant,
     * the restaurant is already included
     * in liveNavigationStops.
     */

    if (navigationTarget) {
      return null;
    }

    return data?.end || null;
  }, [navigationTarget, data?.end]);

  const selectedTotal = useMemo(
    () =>
      selected.reduce(
        (sum, place) => sum + Number(place.estimated_cost || 0),
        0,
      ),
    [selected],
  );

  /* ============================================================
     FILTER RESTAURANTS
  ============================================================ */

  const filteredPlaces = useMemo(() => {
    if (!Array.isArray(data?.places)) {
      return [];
    }

    // The backend is the single source of truth for food preferences.
    // Do not filter the same results again using incomplete cuisine text.
    return data.places;
  }, [data?.places]);

  const validPlaces = useMemo(
    () =>
      filteredPlaces.filter(
        (place) =>
          Number.isFinite(Number(place.latitude)) &&
          Number.isFinite(Number(place.longitude)),
      ),
    [filteredPlaces],
  );

  /* ============================================================
     MAP BOUNDS
  ============================================================ */

  const mapBoundsPoints = useMemo(() => {
    const restaurantPoints = orderedSelected
      .map((place) => [Number(place.latitude), Number(place.longitude)])
      .filter(
        ([latitude, longitude]) =>
          Number.isFinite(latitude) && Number.isFinite(longitude),
      );

    return [...routePoints, ...restaurantPoints];
  }, [routePoints, orderedSelected]);

  /* ============================================================
     BUILD FOOD WALK
  ============================================================ */

  async function planWalk(event) {
    event.preventDefault();

    setError("");
    setData(null);
    setSelected([]);
    setNavigationActive(false);
    setNavigationTarget(null);

    try {
      setLoading(true);

      const response = await api.post("/foodwalk/build-food-walk/", {
        start,
        end,
        travel_mode: travelModeChoice,
        budget_per_person: Number(budget),
        food_type: foodType,
      });

      const result = response.data;
      const returnedMode = result.travel_mode || travelModeChoice;

      setActiveTravelMode(returnedMode === "bicycle" ? "bike" : returnedMode);

      setData(result);
      setSelected(result.recommended_stops || []);
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError.response?.data?.error ||
          "Could not build your Food Walk. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  /* ============================================================
     ADD OR REMOVE RESTAURANT
  ============================================================ */

  function toggleStop(place) {
    const alreadySelected = selected.some((item) => item.id === place.id);

    if (alreadySelected) {
      setSelected((items) => items.filter((item) => item.id !== place.id));

      setError("");
      return;
    }

    if (selected.length >= 4) {
      setError("A Food Walk can have up to four stops.");

      return;
    }

    const restaurantCost = Number(place.estimated_cost || 0);

    const newTotal = selectedTotal + restaurantCost;

    if (newTotal > Number(budget)) {
      const confirmed = window.confirm(
        `This stop will exceed your budget by ₹${
          newTotal - Number(budget)
        }. Do you still want to add it?`,
      );

      if (!confirmed) {
        return;
      }
    }

    const latitude = Number(place.latitude);

    const longitude = Number(place.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("This restaurant does not have valid navigation coordinates.");

      return;
    }

    setError("");

    setSelected((items) => [...items, place]);
  }

  const isSelected = (id) => selected.some((place) => place.id === id);

  /* ============================================================
     NAVIGATE TO ONE RESTAURANT
  ============================================================ */

  function openRestaurantNavigation(place) {
    const latitude = Number(place?.latitude);

    const longitude = Number(place?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Navigation is unavailable for this restaurant.");

      return;
    }

    if (!data?.start) {
      setError("Build your Food Walk before starting navigation.");

      return;
    }

    setError("");

    setNavigationTarget(place);

    setNavigationActive(true);

    setNavStatus({
      error: "",
      arrived: false,

      targetName: data.start.name || start || "Food Walk starting point",

      distance: null,
      duration: null,
      accuracy: null,
      speed: null,
      completed: 0,
      total: 2,

      nextInstruction: "Connecting to your Food Walk starting point",

      nextInstructionDistance: null,
    });
  }

  /* ============================================================
     COMPLETE FOOD WALK NAVIGATION
  ============================================================ */

  function openFullNavigation() {
    const startLatitude = Number(data?.start?.latitude);

    const startLongitude = Number(data?.start?.longitude);

    const endLatitude = Number(data?.end?.latitude);

    const endLongitude = Number(data?.end?.longitude);

    if (
      !Number.isFinite(startLatitude) ||
      !Number.isFinite(startLongitude) ||
      !Number.isFinite(endLatitude) ||
      !Number.isFinite(endLongitude)
    ) {
      setError("Build your Food Walk before starting navigation.");

      return;
    }

    setError("");

    setNavigationTarget(null);

    setNavigationActive(true);

    setNavStatus({
      error: "",
      arrived: false,

      targetName: data.start.name || start || "Food Walk starting point",

      distance: null,
      duration: null,
      accuracy: null,
      speed: null,
      completed: 0,

      /*
       * Starting point + restaurants + destination.
       */

      total: orderedSelected.length + 2,

      nextInstruction: "Connecting to your Food Walk starting point",

      nextInstructionDistance: null,
    });
  }

  function endNavigation() {
    setNavigationActive(false);

    setNavigationTarget(null);

    setNavStatus({
      error: "",
      arrived: false,
      targetName: "",
      distance: null,
      duration: null,
      accuracy: null,
      speed: null,
      completed: 0,
      total: 0,

      nextInstruction: "Waiting for your location",

      nextInstructionDistance: null,
    });
  }

  /* ============================================================
     PART 4 CONTINUES WITH THE RETURNED JSX
  ============================================================ */
  return (
    <main className="foodwalk">
      {/* LEFT CONTROL PANEL */}

      <section className="fw-panel">
        <p className="fw-eyebrow">FOODKINDL · MEET PEOPLE THROUGH FOOD</p>

        <h1>Plan a Food Walk</h1>

        <p className="fw-subtitle">
          Choose two places. We recommend food stops naturally placed along your
          route.
        </p>

        <form onSubmit={planWalk}>
          <LocationInput
            label="Start"
            value={start}
            onChange={setStart}
            onPick={setStart}
          />

          <LocationInput
            label="Destination"
            value={end}
            onChange={setEnd}
            onPick={setEnd}
          />

          <div className="fw-filter-label">Choose travel mode:</div>

          <div className="fw-food-types">
            {[
              ["auto", "✨", "Auto"],
              ["walking", "🚶", "Walk"],
              ["bike", "🏍️", "Bike"],
              ["car", "🚗", "Car"],
            ].map(([value, icon, label]) => (
              <button
                key={value}
                type="button"
                className={travelModeChoice === value ? "active" : ""}
                onClick={() => setTravelModeChoice(value)}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <div className="fw-filter-label">Select food preference:</div>

          <div className="fw-food-types">
            {[
              ["all", "🍽️", "All"],

              ["veg", "🥦", "Vegetarian"],

              ["non-veg", "🍗", "Non-Vegetarian"],
            ].map(([value, emoji, label]) => (
              <button
                key={value}
                type="button"
                className={foodType === value ? "active" : ""}
                onClick={() => setFoodType(value)}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          <label className="fw-budget">
            <span>Budget per person</span>

            <input
              type="number"
              min="200"
              step="100"
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value))}
            />
          </label>

          <button className="fw-submit" type="submit" disabled={loading}>
            {loading ? "Finding great stops…" : "Build my Food Walk →"}
          </button>
        </form>

        {error && <p className="fw-error">{error}</p>}

        {data?.warning && <p className="fw-warning">{data.warning}</p>}

        {data?.message && <p className="fw-warning">{data.message}</p>}
      </section>

      {/* MAP AND RESULTS */}

      <section className="fw-content">
        <div
          className="fw-map"
          style={{
            height: "500px",
            position: "relative",
          }}
        >
          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={12}
            style={{
              height: "100%",

              width: "100%",
            }}
          >
            <TileLayer
              attribution="© OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {!navigationActive && <FitMap points={mapBoundsPoints} />}

            <LiveNavigationController
              active={navigationActive}
              stops={liveNavigationStops}
              destination={liveNavigationDestination}
              travelMode={activeTravelMode}
              onStatus={setNavStatus}
            />

            {/* PLANNED FOOD WALK ROUTE */}

            {routePoints.length > 1 && (
              <>
                {/* White route outline */}

                <Polyline
                  positions={routePoints}
                  color="#ffffff"
                  weight={10}
                  opacity={navigationActive ? 0.7 : 0.85}
                />

                {/* Orange planned route */}

                <Polyline
                  positions={routePoints}
                  color="#ff5a36"
                  weight={6}
                  opacity={navigationActive ? 0.78 : 1}
                />
              </>
            )}

            {/* START MARKER */}

            {data?.start && (
              <Marker
                icon={startIcon}
                position={[
                  Number(data.start.latitude),

                  Number(data.start.longitude),
                ]}
                zIndexOffset={1100}
              >
                <Popup>
                  <b>Food Walk Start</b>

                  <br />

                  {data.start.name}
                </Popup>
              </Marker>
            )}

            {/* END MARKER */}

            {data?.end && (
              <Marker
                icon={endIcon}
                position={[
                  Number(data.end.latitude),

                  Number(data.end.longitude),
                ]}
                zIndexOffset={1100}
              >
                <Popup>
                  <b>Final Destination</b>

                  <br />

                  {data.end.name}
                </Popup>
              </Marker>
            )}

            {/* OTHER RESTAURANTS */}

            {validPlaces
              .filter((place) => !selectedIds.has(String(place.id)))
              .map((place) => (
                <Marker
                  key={place.id}
                  icon={restaurantIcon}
                  position={[Number(place.latitude), Number(place.longitude)]}
                  zIndexOffset={300}
                >
                  <Popup>
                    <b>{place.name}</b>
                    <br />
                    {place.cuisine || place.category || "Restaurant"}
                    <br />
                    {money(place.estimated_cost)}
                    {" · "}
                    {place.distance_from_route_km} km from route
                    <br />
                    <br />
                    <button
                      type="button"
                      onClick={() => openRestaurantNavigation(place)}
                    >
                      Navigate ↗
                    </button>
                  </Popup>
                </Marker>
              ))}

            {/* SELECTED RESTAURANTS */}

            {orderedSelected.map((place, index) => (
              <Marker
                key={`selected-${place.id}`}
                icon={selectedRestaurantIcon(index + 1)}
                position={[Number(place.latitude), Number(place.longitude)]}
                zIndexOffset={1000 + index}
              >
                <Popup>
                  <b>
                    {index + 1}. {place.name}
                  </b>
                  <br />
                  {place.cuisine || place.category || "Restaurant"}
                  <br />
                  {money(place.estimated_cost)}
                  {" · "}
                  {place.distance_from_route_km} km from route
                  <br />
                  <br />
                  <button
                    type="button"
                    onClick={() => openRestaurantNavigation(place)}
                  >
                    Navigate ↗
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* LIVE NAVIGATION HUD */}

          {navigationActive && (
            <div
              className="fw-live-navigation-hud"
              style={{
                position: "absolute",

                top: 16,

                left: "50%",

                transform: "translateX(-50%)",

                zIndex: 1000,

                width: "min(560px, calc(100% - 32px))",

                boxSizing: "border-box",

                padding: "14px 16px",

                borderRadius: 16,

                background: "rgba(20,8,4,.94)",

                color: "#fff",

                boxShadow: "0 8px 28px rgba(0,0,0,.32)",

                display: "flex",

                alignItems: "center",

                justifyContent: "space-between",

                gap: 16,
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <small
                  style={{
                    color: "#ff7a52",

                    fontWeight: 800,
                  }}
                >
                  {navStatus.arrived ? "ARRIVED" : "LIVE NAVIGATION"}
                </small>

                <strong
                  style={{
                    display: "block",

                    marginTop: 4,
                  }}
                >
                  {navStatus.error ||
                    (navStatus.arrived
                      ? "You have reached your destination"
                      : navStatus.distance === null
                        ? "Waiting for GPS location permission…"
                        : `Next: ${navStatus.targetName || "Destination"}`)}
                </strong>

                {/* NEXT TURN */}

                {!navStatus.error && !navStatus.arrived && (
                  <div
                    style={{
                      display: "flex",

                      alignItems: "center",

                      gap: 10,

                      marginTop: 10,

                      padding: "9px 11px",

                      borderRadius: 11,

                      background: "rgba(255,255,255,.1)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "grid",

                        placeItems: "center",

                        width: 36,

                        height: 36,

                        flex: "0 0 36px",

                        borderRadius: "50%",

                        background: "#247cff",

                        fontSize: 23,

                        fontWeight: 900,
                      }}
                    >
                      {navStatus.nextInstruction
                        ?.toLowerCase()
                        .includes("u-turn")
                        ? "↶"
                        : navStatus.nextInstruction
                              ?.toLowerCase()
                              .includes("left")
                          ? "↰"
                          : navStatus.nextInstruction
                                ?.toLowerCase()
                                .includes("right")
                            ? "↱"
                            : navStatus.nextInstruction
                                  ?.toLowerCase()
                                  .includes("roundabout")
                              ? "↻"
                              : "↑"}
                    </span>

                    <span>
                      <b>
                        {navStatus.nextInstruction ||
                          "Continue on the current road"}
                      </b>

                      {Number.isFinite(navStatus.nextInstructionDistance) && (
                        <small
                          style={{
                            display: "block",

                            marginTop: 2,

                            opacity: 0.76,
                          }}
                        >
                          In{" "}
                          {formatLiveDistance(
                            navStatus.nextInstructionDistance,
                          )}
                        </small>
                      )}
                    </span>
                  </div>
                )}

                {/* ROUTE INFORMATION */}

                {!navStatus.error &&
                  !navStatus.arrived &&
                  navStatus.distance !== null && (
                    <span
                      style={{
                        display: "block",

                        marginTop: 6,

                        opacity: 0.78,
                      }}
                    >
                      {formatLiveDistance(navStatus.distance)} away
                      {navStatus.total > 0
                        ? ` · ${navStatus.completed}/${navStatus.total} completed`
                        : ""}
                      {navStatus.speed !== null
                        ? ` · ${Math.round(navStatus.speed)} km/h`
                        : ""}
                      {Number.isFinite(navStatus.duration)
                        ? ` · about ${Math.max(
                            1,

                            Math.round(navStatus.duration / 60),
                          )} min`
                        : ""}
                    </span>
                  )}
              </div>

              <button
                type="button"
                onClick={endNavigation}
                style={{
                  flex: "0 0 auto",

                  padding: "9px 13px",

                  border: "1px solid rgba(255,255,255,.3)",

                  borderRadius: 10,

                  background: "transparent",

                  color: "#fff",

                  cursor: "pointer",
                }}
              >
                End
              </button>
            </div>
          )}
        </div>

        {/* RESULTS */}

        {data && (
          <section className="fw-results">
            <div className="fw-result-head">
              <div>
                <p className="fw-eyebrow">AI-RECOMMENDED STOPS</p>

                <h2>
                  {data.distance_km} km · about {data.duration_minutes} min
                </h2>

                {/* AUTOMATIC TRAVEL MODE */}

                <p className="fw-travel-mode">
                  {activeTravelMode === "walking"
                    ? "🚶 Walking route"
                    : activeTravelMode === "bike" ||
                        activeTravelMode === "bicycle"
                      ? "🏍️ Bike route"
                      : "🚗 Car route"}
                </p>
              </div>

              <button
                type="button"
                onClick={navigationActive ? endNavigation : openFullNavigation}
              >
                {navigationActive
                  ? "End navigation"
                  : "Start live navigation ↗"}
              </button>
            </div>

            <div className="fw-summary">
              <span>
                {selected.length}
                /4 stops
              </span>

              <strong>{money(selectedTotal)}</strong>

              <span>
                {money(
                  Math.max(
                    0,

                    Number(budget) - selectedTotal,
                  ),
                )}{" "}
                left
              </span>
            </div>

            <h3>Your Food Walk</h3>

            <div className="fw-recommended">
              {orderedSelected.map((place, index) => (
                <article key={place.id}>
                  <b>{index + 1}</b>

                  <div>
                    <small>
                      {place.category || "Restaurant"}
                      {" · "}
                      {place.route_progress}% along the route
                    </small>

                    <h4>{place.name}</h4>

                    <p>
                      {place.ai_reason ||
                        `${place.distance_from_route_km} km from your route`}
                    </p>
                  </div>

                  <strong>{money(place.estimated_cost)}</strong>

                  <div className="fw-stop-actions">
                    <button
                      type="button"
                      onClick={() => openRestaurantNavigation(place)}
                    >
                      Navigate ↗
                    </button>

                    <button type="button" onClick={() => toggleStop(place)}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <h3>Other restaurants along your route</h3>

            <div className="fw-places">
              {filteredPlaces.map((place) => (
                <article key={place.id}>
                  <small>
                    {place.cuisine || place.category || "Restaurant"}
                  </small>

                  <h4>{place.name}</h4>

                  <p>{place.distance_from_route_km} km from route</p>

                  <strong>{money(place.estimated_cost)}</strong>

                  <button
                    type="button"
                    className={isSelected(place.id) ? "added" : ""}
                    onClick={() => toggleStop(place)}
                  >
                    {isSelected(place.id) ? "Added ✓" : "Add stop"}
                  </button>

                  <button
                    type="button"
                    onClick={() => openRestaurantNavigation(place)}
                  >
                    Navigate ↗
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
