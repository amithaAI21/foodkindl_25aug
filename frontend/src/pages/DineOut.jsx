// src/pages/DineOut.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import {
  ExternalLink,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Map,
  MapPin,
  Navigation,
  Phone,
  Search,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "leaflet/dist/leaflet.css";
import "../styles/DineOutOriginal.css";
import "../styles/DineOutDetails.css";
import "../styles/DineOutVisibility.css";
import "../styles/DineOutReference.css";

import api from "../api";

/* ============================================================
   LEAFLET MARKER FIX
============================================================ */

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_CENTER = [12.9716, 77.5946];

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function InviteDateTimePicker({ date, time, onDateChange, onTimeChange }) {
  const [month, setMonth] = useState(() => {
    const selected = date ? new Date(`${date}T12:00:00`) : new Date();
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });
  const today = localDateKey(new Date());
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const [hours = "", minutes = ""] = time.split(":");
  const hour24 = Number(hours);
  const hour12 = time ? String(hour24 % 12 || 12) : "";
  const period = hour24 >= 12 ? "PM" : "AM";

  function setClock(nextHour, nextMinute, nextPeriod) {
    if (!nextHour || nextMinute === "") {
      onTimeChange("");
      return;
    }
    const converted = (Number(nextHour) % 12) + (nextPeriod === "PM" ? 12 : 0);
    onTimeChange(`${String(converted).padStart(2, "0")}:${nextMinute}`);
  }

  function selectDate(nextDate) {
    onDateChange(nextDate);
    const parsed = new Date(`${nextDate}T12:00:00`);
    setMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }

  return (
    <div className="invite-schedule">
      <div className="invite-calendar">
        <div className="invite-picker-heading"><CalendarDays size={18} /><strong>Pick a date</strong></div>
        <div className="invite-calendar-nav">
          <button type="button" aria-label="Previous month" disabled={localDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0)) < today} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
          <strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
          <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button>
        </div>
        <div className="invite-calendar-grid" role="group" aria-label="Choose Dine Out date">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span className="invite-weekday" key={day}>{day}</span>)}
          {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const key = localDateKey(new Date(month.getFullYear(), month.getMonth(), day));
            return <button key={key} type="button" aria-label={new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { dateStyle: "full" })} aria-pressed={date === key} className={date === key ? "is-active" : ""} disabled={key < today} onClick={() => selectDate(key)}>{day}</button>;
          })}
        </div>
        <div className="invite-date-shortcuts">
          <button type="button" onClick={() => selectDate(today)}>Today</button>
          <button type="button" onClick={() => selectDate(localDateKey(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1)))}>Tomorrow</button>
        </div>
      </div>
      <div className="invite-clock">
        <div className="invite-picker-heading"><Clock3 size={18} /><strong>Pick a time</strong></div>
        <div className="invite-clock-controls">
          <label>Hour<select aria-label="Hour" value={hour12} onChange={(event) => setClock(event.target.value, minutes || "00", period)}><option value="">HH</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, "0")}</option>)}</select></label>
          <span aria-hidden="true">:</span>
          <label>Minute<select aria-label="Minute" value={minutes} onChange={(event) => setClock(hour12 || "12", event.target.value, period)}><option value="">MM</option>{["00", "15", "30", "45"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Period<select aria-label="AM or PM" value={period} onChange={(event) => setClock(hour12 || "12", minutes || "00", event.target.value)}><option>AM</option><option>PM</option></select></label>
        </div>
        <p className="invite-time-hint">Choose a future date and time. Times are shown in your local timezone.</p>
        {date && time && <p className="invite-schedule-summary">{new Date(`${date}T${time}:00`).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>}
      </div>
    </div>
  );
}

const CUISINES = [
  "All cuisines",
  "Indian",
  "Kerala",
  "South Indian",
  "North Indian",
  "Biryani",
  "Chinese",
  "Italian",
  "Mexican",
  "Japanese",
  "Mediterranean",
];

/* ============================================================
   HELPERS
============================================================ */

function getLatitude(restaurant) {
  return Number(restaurant?.latitude ?? restaurant?.lat);
}

function getLongitude(restaurant) {
  return Number(restaurant?.longitude ?? restaurant?.lon);
}

function hasValidCoordinates(restaurant) {
  return (
    Number.isFinite(getLatitude(restaurant)) &&
    Number.isFinite(getLongitude(restaurant))
  );
}

function getPopularityScore(restaurant) {
  const rating = Number(restaurant.rating || 0);

  const reviews = Number(
    restaurant.review_count || restaurant.user_ratings_total || 0,
  );

  const distance = Number(restaurant.distance_km || 99);

  return rating * 100 + Math.log10(reviews + 1) * 20 - distance;
}

function distanceBetweenCoordinates(first, second) {
  if (!first || !second) {
    return Infinity;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMetres = 6371000;
  const latitudeDifference = toRadians(second[0] - first[0]);
  const longitudeDifference = toRadians(second[1] - first[1]);
  const firstLatitude = toRadians(first[0]);
  const secondLatitude = toRadians(second[0]);
  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    earthRadiusMetres * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
  );
}

function getDrivingInstruction(step) {
  if (!step) {
    return "Continue on the current road";
  }

  const maneuver = step.maneuver || {};
  const modifier = maneuver.modifier || "";
  const road = step.name ? ` onto ${step.name}` : "";

  if (maneuver.type === "arrive") {
    return "You have reached the restaurant";
  }

  if (maneuver.type === "depart") {
    return `Start driving${road}`;
  }

  if (maneuver.type === "roundabout" || maneuver.type === "rotary") {
    return maneuver.exit
      ? `At the roundabout, take exit ${maneuver.exit}${road}`
      : `Enter the roundabout${road}`;
  }

  const instructions = {
    left: "Turn left",
    "slight left": "Keep slightly left",
    "sharp left": "Make a sharp left",
    right: "Turn right",
    "slight right": "Keep slightly right",
    "sharp right": "Make a sharp right",
    straight: "Continue straight",
    uturn: "Make a U-turn",
  };

  return `${instructions[modifier] || "Continue"}${road}`;
}

function LiveRestaurantNavigation({ restaurant, onStatus }) {
  const map = useMap();
  const [currentPosition, setCurrentPosition] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const lastRoutedPositionRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      onStatus((current) => ({
        ...current,
        loading: false,
        error: "Live location is not supported by this browser.",
      }));
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition([
          position.coords.latitude,
          position.coords.longitude,
        ]);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Allow location access to start navigation."
            : "Your live location could not be determined.";
        onStatus((current) => ({ ...current, loading: false, error: message }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [onStatus]);

  useEffect(() => {
    if (!currentPosition || !hasValidCoordinates(restaurant)) {
      return undefined;
    }

    if (
      lastRoutedPositionRef.current &&
      distanceBetweenCoordinates(
        lastRoutedPositionRef.current,
        currentPosition,
      ) < 40
    ) {
      return undefined;
    }

    lastRoutedPositionRef.current = currentPosition;
    const controller = new AbortController();

    async function loadRoadRoute() {
      const destinationLatitude = getLatitude(restaurant);
      const destinationLongitude = getLongitude(restaurant);
      const [latitude, longitude] = currentPosition;

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${destinationLongitude},${destinationLatitude}?overview=full&geometries=geojson&steps=true`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Road route request failed");
        }

        const payload = await response.json();
        const route = payload.routes?.[0];
        if (!route?.geometry?.coordinates?.length) {
          throw new Error("No road route was found");
        }

        const points = route.geometry.coordinates.map(([lon, lat]) => [
          lat,
          lon,
        ]);
        const steps = route.legs?.[0]?.steps || [];
        const nextStep =
          steps.find(
            (step) => step.maneuver?.type !== "depart" && step.distance > 8,
          ) ||
          steps[1] ||
          steps[0];

        setRoutePoints(points);
        onStatus({
          loading: false,
          error: "",
          instruction: getDrivingInstruction(nextStep),
          instructionDistance: nextStep?.distance || 0,
          distance: route.distance || 0,
          duration: route.duration || 0,
        });

        map.fitBounds(points, { padding: [45, 45], maxZoom: 17 });
      } catch (error) {
        if (error.name !== "AbortError") {
          onStatus((current) => ({
            ...current,
            loading: false,
            error: "Road navigation is temporarily unavailable.",
          }));
        }
      }
    }

    loadRoadRoute();
    return () => controller.abort();
  }, [currentPosition, map, onStatus, restaurant]);

  return (
    <>
      {routePoints.length > 0 && (
        <Polyline
          positions={routePoints}
          pathOptions={{ color: "#2878ff", weight: 6 }}
        />
      )}

      {currentPosition && (
        <CircleMarker
          center={currentPosition}
          radius={9}
          pathOptions={{
            color: "white",
            weight: 3,
            fillColor: "#2878ff",
            fillOpacity: 1,
          }}
        >
          <Popup>Your live location</Popup>
        </CircleMarker>
      )}
    </>
  );
}

/* ============================================================
   MAP CONTROLLER
============================================================ */

function MapController({ center, restaurants, highlightedRestaurant }) {
  const map = useMap();

  useEffect(() => {
    const locations = restaurants
      .filter(hasValidCoordinates)
      .map((restaurant) => [getLatitude(restaurant), getLongitude(restaurant)]);

    const timer = window.setTimeout(() => {
      map.invalidateSize();

      if (highlightedRestaurant && hasValidCoordinates(highlightedRestaurant)) {
        map.flyTo([getLatitude(highlightedRestaurant), getLongitude(highlightedRestaurant)], 15, {
          duration: 0.5,
        });
      } else if (locations.length > 1) {
        map.fitBounds(locations, {
          padding: [35, 35],
          maxZoom: 15,
        });
      } else if (locations.length === 1) {
        map.setView(locations[0], 15);
      } else {
        map.setView(center, 14);
      }
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [map, center, restaurants, highlightedRestaurant]);

  return null;
}

/* ============================================================
   RESTAURANT IMAGE
============================================================ */

function RestaurantImage({ restaurant, className = "restaurant-image" }) {
  const [failed, setFailed] = useState(false);

  const image =
    restaurant.image_url ||
    restaurant.image ||
    restaurant.photo_url ||
    restaurant.cover_photo;

  if (!image || failed) {
    return (
      <div className={`${className} restaurant-image-empty`}>
        <Utensils size={28} />

        <span>Photo unavailable</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={image}
      alt={restaurant.name || "Restaurant"}
      onError={() => setFailed(true)}
    />
  );
}

/* ============================================================
   RESTAURANT DETAILS MODAL
============================================================ */

function RestaurantDetailsModal({ restaurant, onClose, onChoose, onNavigate }) {
  if (!restaurant) {
    return null;
  }

  return (
    <div
      className="restaurant-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <article
        className="restaurant-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${restaurant.name} details`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="restaurant-modal-close"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={20} />
        </button>

        <RestaurantImage
          restaurant={restaurant}
          className="restaurant-modal-image"
        />

        <div className="restaurant-modal-content">
          <p className="eyebrow">RESTAURANT DETAILS</p>

          <h2>{restaurant.name}</h2>

          <p className="restaurant-modal-cuisine">
            {restaurant.cuisine || "Cuisine unavailable"}
          </p>

          <dl className="restaurant-facts">
            <div>
              <dt>Address</dt>

              <dd>
                {restaurant.address ||
                  restaurant.location_label ||
                  "Address unavailable"}
              </dd>
            </div>

            <div>
              <dt>Distance</dt>

              <dd>
                {restaurant.distance_km != null
                  ? `${restaurant.distance_km} km away`
                  : "Not available"}
              </dd>
            </div>

            <div>
              <dt>Opening hours</dt>

              <dd>{restaurant.opening_hours || "Contact restaurant"}</dd>
            </div>

            <div>
              <dt>Rating</dt>

              <dd>
                {restaurant.rating
                  ? `${restaurant.rating} / 5`
                  : "Not available"}
              </dd>
            </div>
          </dl>

          <div className="restaurant-contact-actions">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`}>
                <Phone size={16} />
                Call
              </a>
            )}

            {restaurant.website && (
              <a href={restaurant.website} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Website
              </a>
            )}

            {hasValidCoordinates(restaurant) && (
              <button type="button" onClick={() => onNavigate(restaurant)}>
                <Navigation size={16} />
                Navigate here
              </button>
            )}
          </div>

          <button
            type="button"
            className="primary-button restaurant-modal-choose"
            onClick={() => onChoose(restaurant)}
          >
            Plan a Dine Out
          </button>
        </div>
      </article>
    </div>
  );
}

/* ============================================================
   DINE OUT PAGE
============================================================ */

export default function DineOut() {
  const navigate = useNavigate();

  const skipAutocompleteRef = useRef(false);

  const autocompleteRequestRef = useRef(0);

  /* ----------------------------------------------------------
     LOCATION AND RESTAURANTS
  ---------------------------------------------------------- */

  const [location, setLocation] = useState("");

  const [locationSelected, setLocationSelected] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState("");

  const [cuisine, setCuisine] = useState("All cuisines");

  const [locationSuggestions, setLocationSuggestions] = useState([]);

  const [restaurants, setRestaurants] = useState([]);

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const [highlightedRestaurant, setHighlightedRestaurant] = useState(null);

  const [detailsRestaurant, setDetailsRestaurant] = useState(null);

  const [navigationRestaurant, setNavigationRestaurant] = useState(null);

  const [navigationStatus, setNavigationStatus] = useState({
    loading: false,
    error: "",
    instruction: "Waiting for your live location",
    instructionDistance: 0,
    distance: 0,
    duration: 0,
  });

  const [coordinates, setCoordinates] = useState({
    latitude: DEFAULT_CENTER[0],

    longitude: DEFAULT_CENTER[1],
  });

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  /* ----------------------------------------------------------
     LOADING AND MESSAGES
  ---------------------------------------------------------- */

  const [locationLoading, setLocationLoading] = useState(false);

  const [restaurantLoading, setRestaurantLoading] = useState(false);

  const [creating, setCreating] = useState(false);

  const [pageError, setPageError] = useState("");

  const [createError, setCreateError] = useState("");

  const [createSuccess, setCreateSuccess] = useState("");

  const [createdInviteId, setCreatedInviteId] = useState(null);

  /* ----------------------------------------------------------
     DINE OUT FORM
  ---------------------------------------------------------- */

  const [meetupTitle, setMeetupTitle] = useState("");

  const [meetupNotes, setMeetupNotes] = useState("");

  const [eventDate, setEventDate] = useState("");

  const [eventTime, setEventTime] = useState("");

  const [maximumGuests, setMaximumGuests] = useState(2);

  const [bookingStatus, setBookingStatus] = useState("not_booked");

  const [dietaryNotes, setDietaryNotes] = useState("");

  const [visibility, setVisibility] = useState("public");

  const [availableMembers, setAvailableMembers] = useState([]);

  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const [membersLoading, setMembersLoading] = useState(false);

  const [membersError, setMembersError] = useState("");

  /* ----------------------------------------------------------
     LOAD MEMBERS FOR PRIVATE INVITATIONS

     Change VITE_MEMBER_DIRECTORY_ENDPOINT in .env only if your
     existing member/profile-list endpoint uses a different URL.
  ---------------------------------------------------------- */

  useEffect(() => {
    if (visibility !== "invited_only") {
      return;
    }

    if (availableMembers.length > 0) {
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      setMembersLoading(true);
      setMembersError("");

      try {
        const endpoint =
          import.meta.env.VITE_MEMBER_DIRECTORY_ENDPOINT || "/dineout/members/";

        const response = await api.get(endpoint);

        const rawMembers = Array.isArray(response.data)
          ? response.data
          : response.data?.results ||
            response.data?.members ||
            response.data?.profiles ||
            [];

        const normalizedMembers = rawMembers
          .map((item) => {
            const user = item.user || item;
            const id = user.id || item.user_id;
            const name =
              user.name ||
              user.full_name ||
              [user.first_name, user.last_name].filter(Boolean).join(" ") ||
              user.username ||
              item.display_name ||
              user.email;

            if (!id || !name) {
              return null;
            }

            return {
              id: Number(id),
              name,
              email: user.email || "",
            };
          })
          .filter(Boolean);

        if (!cancelled) {
          setAvailableMembers(normalizedMembers);
        }
      } catch (error) {
        if (!cancelled) {
          setMembersError(
            "Could not load FoodKindl members. Check the member-directory API endpoint.",
          );
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [visibility, availableMembers.length]);

  function toggleInvitedMember(memberId) {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  /* ----------------------------------------------------------
     POPULAR RESTAURANTS
  ---------------------------------------------------------- */

  const visibleRestaurants = useMemo(
    () => [...restaurants]
      .sort((first, second) => getPopularityScore(second) - getPopularityScore(first))
      .slice(0, 10),
    [restaurants],
  );

  /* ----------------------------------------------------------
     AUTOCOMPLETE
  ---------------------------------------------------------- */

  useEffect(() => {
    const query = location.trim();

    /*
     * A location was selected.
     * Do not search for it again.
     */
    if (skipAutocompleteRef.current) {
      skipAutocompleteRef.current = false;

      setLocationSuggestions([]);

      return undefined;
    }

    if (query.length < 2) {
      setLocationSuggestions([]);
      setLocationLoading(false);

      return undefined;
    }

    const requestNumber = ++autocompleteRequestRef.current;

    const timer = window.setTimeout(async () => {
      try {
        setLocationLoading(true);

        const response = await api.get("/dineout/locations/autocomplete/", {
          params: {
            q: query,
            limit: 8,
          },
        });

        if (requestNumber !== autocompleteRequestRef.current) {
          return;
        }

        const results = Array.isArray(response.data)
          ? response.data
          : response.data?.results || [];

        setLocationSuggestions(results);
      } catch (requestError) {
        console.error("Location autocomplete error:", requestError);

        if (requestNumber === autocompleteRequestRef.current) {
          setLocationSuggestions([]);
        }
      } finally {
        if (requestNumber === autocompleteRequestRef.current) {
          setLocationLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [location]);

  /* ----------------------------------------------------------
     FETCH RESTAURANTS
  ---------------------------------------------------------- */

  async function fetchRestaurants(
    latitude = coordinates.latitude,

    longitude = coordinates.longitude,

    selectedCuisine = cuisine,
  ) {
    try {
      setRestaurantLoading(true);

      setPageError("");

      const response = await api.get("/dineout/restaurants/recommendations/", {
        params: {
          latitude,
          longitude,

          cuisine:
            selectedCuisine === "All cuisines" ? undefined : selectedCuisine,

          limit: 10,
        },
      });

      const results = Array.isArray(response.data)
        ? response.data
        : response.data?.results || response.data?.restaurants || [];

      setRestaurants(results);

      setSelectedRestaurant(null);
      setHighlightedRestaurant(null);

      if (results.length === 0) {
        setPageError("No restaurants found in this area.");
      }
    } catch (requestError) {
      console.error(
        "Restaurant search error:",
        requestError.response?.data || requestError,
      );

      setRestaurants([]);
      setSelectedRestaurant(null);
      setHighlightedRestaurant(null);

      setPageError(
        requestError.response?.data?.detail || "Unable to load restaurants.",
      );
    } finally {
      setRestaurantLoading(false);
    }
  }

  /* ----------------------------------------------------------
     SELECT LOCATION
  ---------------------------------------------------------- */

  async function selectLocation(place) {
    const latitude = Number(place.latitude ?? place.lat);

    const longitude = Number(place.longitude ?? place.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setPageError("This location has invalid coordinates.");

      return;
    }

    const locationName =
      place.name ||
      place.display_name ||
      place.location_label ||
      "Selected location";

    autocompleteRequestRef.current += 1;

    skipAutocompleteRef.current = true;

    setLocation(locationName);

    setLocationSuggestions([]);
    setLocationLoading(false);

    setCoordinates({
      latitude,
      longitude,
    });

    setMapCenter([latitude, longitude]);

    setLocationSelected(true);
    setRestaurants([]);
    setSelectedRestaurant(null);
    setHighlightedRestaurant(null);
    setSearchedLocation("");
  }

  /* ----------------------------------------------------------
     LOCATION INPUT
  ---------------------------------------------------------- */

  function handleLocationChange(event) {
    skipAutocompleteRef.current = false;

    setLocation(event.target.value);
    setLocationSelected(false);
    setRestaurants([]);
    setSelectedRestaurant(null);
    setHighlightedRestaurant(null);
    setSearchedLocation("");
    setPageError("");
  }

  function clearLocation() {
    autocompleteRequestRef.current += 1;

    skipAutocompleteRef.current = false;

    setLocation("");
    setLocationSelected(false);
    setRestaurants([]);
    setSelectedRestaurant(null);
    setHighlightedRestaurant(null);
    setSearchedLocation("");
    setPageError("");
    setLocationSuggestions([]);
    setLocationLoading(false);
  }

  /* ----------------------------------------------------------
     CURRENT LOCATION
  ---------------------------------------------------------- */

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setPageError("Location is not supported by this browser.");

      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = coords.latitude;

        const longitude = coords.longitude;

        autocompleteRequestRef.current += 1;

        skipAutocompleteRef.current = true;

        setLocation("Current location");

        setLocationSuggestions([]);

        setCoordinates({
          latitude,
          longitude,
        });

        setMapCenter([latitude, longitude]);

        setLocationSelected(true);
        setRestaurants([]);
        setSelectedRestaurant(null);
        setHighlightedRestaurant(null);
        setSearchedLocation("");
      },

      () => {
        setPageError("Unable to access your current location.");
      },
    );
  }

  async function searchPlaces() {
    if (!locationSelected || !location.trim()) {
      setPageError("Select a location from the suggestions before searching.");
      return;
    }

    setLocationSuggestions([]);
    setSearchedLocation(location);
    await fetchRestaurants(coordinates.latitude, coordinates.longitude, cuisine);
  }

  function viewRestaurantOnMap(restaurant) {
    if (!hasValidCoordinates(restaurant)) {
      setPageError("This restaurant does not have a map location.");
      return;
    }

    setPageError("");
    setHighlightedRestaurant(restaurant);
    setMapCenter([getLatitude(restaurant), getLongitude(restaurant)]);
    document.getElementById("dineout-map")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  /* ----------------------------------------------------------
     CHOOSE RESTAURANT
  ---------------------------------------------------------- */

  function chooseRestaurant(restaurant) {
    setSelectedRestaurant(restaurant);
    setHighlightedRestaurant(restaurant);

    setDetailsRestaurant(null);

    if (hasValidCoordinates(restaurant)) {
      setMapCenter([getLatitude(restaurant), getLongitude(restaurant)]);
    }

    window.setTimeout(() => {
      document.getElementById("plan-meetup")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function startRestaurantNavigation(restaurant) {
    if (!hasValidCoordinates(restaurant)) {
      setPageError("This restaurant does not have valid map coordinates.");
      return;
    }

    setPageError("");
    setDetailsRestaurant(null);
    setSelectedRestaurant(restaurant);
    setHighlightedRestaurant(restaurant);
    setNavigationRestaurant(restaurant);
    setNavigationStatus({
      loading: true,
      error: "",
      instruction: "Finding your live location…",
      instructionDistance: 0,
      distance: 0,
      duration: 0,
    });
    setMapCenter([getLatitude(restaurant), getLongitude(restaurant)]);
  }

  function endRestaurantNavigation() {
    setNavigationRestaurant(null);
    setNavigationStatus({
      loading: false,
      error: "",
      instruction: "Waiting for your live location",
      instructionDistance: 0,
      distance: 0,
      duration: 0,
    });
  }

  /* ----------------------------------------------------------
     CREATE ERROR
  ---------------------------------------------------------- */

  function showCreateError(message) {
    setCreateError(message);
    setCreateSuccess("");

    document.getElementById("plan-meetup")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  /* ----------------------------------------------------------
     CREATE DINE OUT
  ---------------------------------------------------------- */

  async function createDineOut() {
    setCreateError("");
    setCreateSuccess("");
    setCreatedInviteId(null);

    if (!selectedRestaurant) {
      showCreateError("Please choose a restaurant.");

      return;
    }

    if (!meetupTitle.trim()) {
      showCreateError("Please enter a meetup title.");

      return;
    }

    if (!eventDate || !eventTime) {
      showCreateError("Please choose a valid date and time.");

      return;
    }

    const startsAt = new Date(`${eventDate}T${eventTime}:00`);

    if (Number.isNaN(startsAt.getTime())) {
      showCreateError("The selected date or time is invalid.");

      return;
    }

    if (startsAt <= new Date()) {
      showCreateError("Please choose a future date and time.");

      return;
    }

    const guestCount = Number(maximumGuests);

    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
      showCreateError("Maximum guests must be between 1 and 20.");

      return;
    }

    if (visibility === "invited_only" && selectedMemberIds.length === 0) {
      showCreateError(
        "Please select at least one guest for a private Dine Out.",
      );

      return;
    }

    if (selectedMemberIds.length > guestCount) {
      showCreateError(
        `You selected ${selectedMemberIds.length} guests, but the maximum is ${guestCount}.`,
      );

      return;
    }

    const latitude = getLatitude(selectedRestaurant);

    const longitude = getLongitude(selectedRestaurant);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      showCreateError("The selected restaurant has invalid coordinates.");

      return;
    }

    const payload = {
      title: meetupTitle.trim(),

      description: meetupNotes.trim(),

      restaurant_external_id: String(selectedRestaurant.id || ""),

      restaurant_name: selectedRestaurant.name,

      restaurant_address:
        selectedRestaurant.address || selectedRestaurant.location_label || "",

      restaurant_cuisine: selectedRestaurant.cuisine || "",

      restaurant_phone: selectedRestaurant.phone || "",

      restaurant_website: selectedRestaurant.website || "",

      latitude,
      longitude,

      starts_at: startsAt.toISOString(),

      maximum_guests: guestCount,

      budget_label: "",

      booking_status: bookingStatus,

      dietary_notes: dietaryNotes.trim(),

      meetup_notes: meetupNotes.trim(),

      verified_only: false,

      women_only: false,

      visibility,

      invited_member_ids:
        visibility === "invited_only" ? selectedMemberIds : [],

      status: "published",
    };

    try {
      setCreating(true);

      console.log("CREATE DINE OUT PAYLOAD:", payload);

      const response = await api.post("/dineout/dine-outs/", payload);

      console.log("CREATE DINE OUT SUCCESS:", response.data);

      setCreateSuccess("Dine Out invitation created successfully.");

      setCreatedInviteId(response.data?.id || null);

      document.getElementById("plan-meetup")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      setMeetupTitle("");
      setMeetupNotes("");
      setEventDate("");
      setEventTime("");
      setMaximumGuests(2);
      setBookingStatus("not_booked");
      setDietaryNotes("");
      setVisibility("public");
      setSelectedMemberIds([]);
    } catch (requestError) {
      console.error("CREATE DINE OUT FAILED:", {
        status: requestError.response?.status,

        response: requestError.response?.data,

        message: requestError.message,
      });

      const responseStatus = requestError.response?.status;

      const responseData = requestError.response?.data;

      if (responseStatus === 401) {
        showCreateError("Your login session has expired. Please log in again.");

        return;
      }

      if (responseStatus === 403) {
        showCreateError(
          "You do not have permission to create this invitation.",
        );

        return;
      }

      if (responseStatus === 404) {
        showCreateError(
          "The Dine Out API was not found. Check your Django URLs.",
        );

        return;
      }

      if (responseData && typeof responseData === "object") {
        const backendError = Object.entries(responseData)
          .map(([field, value]) => {
            const message = Array.isArray(value)
              ? value.join(" ")
              : String(value);

            return `${field}: ${message}`;
          })
          .join(" ");

        showCreateError(backendError || "Unable to create the invitation.");

        return;
      }

      showCreateError("Unable to create the Dine Out invitation.");
    } finally {
      setCreating(false);
    }
  }

  /* ============================================================
     JSX
  ============================================================ */

  return (
    <main className="dineout-page">
      <section className="dineout-hero">
        <div>
          <p className="eyebrow">FOODKINDL DINE OUT</p>

          <h1>
            Find a place.
            <br />
            Meet over food.
          </h1>

          <p className="hero-text">
            Discover restaurants, choose a place and invite people.
          </p>
        </div>

        <div className="hero-card">
          <span>MEET OVER FOOD</span>

          <strong>Pick a place. Invite your people.</strong>
        </div>
      </section>

      <section className="location-card">
        <div className="section-heading">
          <p className="eyebrow">FIND AN AREA</p>

          <h2>Where do you want to dine?</h2>

          <p>Search a locality, neighbourhood, landmark or city.</p>
        </div>

        <div className="location-search">
          <div className="location-input-wrap">
            <Search size={20} />

            <input
              type="text"
              value={location}
              onChange={handleLocationChange}
              placeholder="Search locality, area or city"
              autoComplete="off"
            />

            {location && (
              <button
                type="button"
                className="icon-button"
                onClick={clearLocation}
                aria-label="Clear location"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={useCurrentLocation}
          >
            <MapPin size={17} />
            Use my current location
          </button>

          {locationLoading && (
            <p className="search-status">Searching locations...</p>
          )}

          {locationSuggestions.length > 0 && (
            <div className="location-suggestions">
              {locationSuggestions.map((place, index) => (
                <button
                  key={place.id || index}
                  type="button"
                  className="location-suggestion"
                  onClick={() => selectLocation(place)}
                >
                  <MapPin size={18} />

                  <span>
                    <strong>{place.name || place.display_name}</strong>

                    <small>{place.display_name || ""}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mood-card">
        <div className="mood-header">
          <div>
            <p className="eyebrow">FOODKINDL DINE OUT</p>

            <h2>What are you in the mood for?</h2>

            <p>
              Select a location, then press Search places to see restaurants.
            </p>
          </div>

          <Sparkles size={26} />
        </div>

        <div className="filters">
          <select
            value={cuisine}
            onChange={(event) => setCuisine(event.target.value)}
          >
            {CUISINES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="primary-button"
            onClick={searchPlaces}
            disabled={restaurantLoading}
          >
            <Search size={17} />

            {restaurantLoading ? "Searching..." : "Search places"}
          </button>
        </div>
      </section>

      {pageError && (
        <div className="error-message" role="alert">
          {pageError}
        </div>
      )}

      <section className="results-layout">
        <div className="restaurant-list">
          <div className="results-heading">
            <div>
              <p className="eyebrow">POPULAR NEAR YOU</p>

              <h2>{searchedLocation ? `Places to dine in ${searchedLocation}` : "Places to dine"}</h2>
            </div>

            <span>{visibleRestaurants.length} places</span>
          </div>

          {restaurantLoading && (
            <div className="empty-state">Loading restaurants...</div>
          )}

          {!restaurantLoading && visibleRestaurants.length === 0 && (
            <div className="empty-state">
              Select an area and press Search places to see restaurants.
            </div>
          )}

          {visibleRestaurants.map((restaurant, index) => (
            <article
              key={restaurant.id || index}
              className={`restaurant-card ${
                highlightedRestaurant === restaurant ? "selected" : ""
              }`}
              onClick={() => viewRestaurantOnMap(restaurant)}
            >
              <RestaurantImage restaurant={restaurant} />

              <div className="restaurant-content">
                <p className="restaurant-number">{index + 1}</p>

                <p className="eyebrow">POPULAR PICK</p>

                <h3>{restaurant.name}</h3>

                <p>{restaurant.cuisine || "Cuisine unavailable"}</p>

                <small>
                  {restaurant.address ||
                    restaurant.location_label ||
                    "Address unavailable"}
                </small>

                <div className="restaurant-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      chooseRestaurant(restaurant);
                    }}
                  >
                    <CalendarDays size={16} />
                    Plan a Dine Out
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      viewRestaurantOnMap(restaurant);
                    }}
                  >
                    <Map size={16} />
                    View on map
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside id="dineout-map" className="map-panel">
          <MapContainer
            center={mapCenter}
            zoom={14}
            scrollWheelZoom
            className="restaurant-map"
          >
            <MapController
              center={mapCenter}
              restaurants={visibleRestaurants}
              highlightedRestaurant={highlightedRestaurant}
            />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {visibleRestaurants.map((restaurant, index) => {
              if (!hasValidCoordinates(restaurant)) {
                return null;
              }

              return (
                <Marker
                  key={restaurant.id || index}
                  position={[getLatitude(restaurant), getLongitude(restaurant)]}
                  icon={L.divIcon({
                    className: "fk-restaurant-marker",
                    html: `<span class="fk-restaurant-pin${highlightedRestaurant === restaurant ? " is-selected" : ""}" aria-hidden="true"></span>`,
                    iconSize: highlightedRestaurant === restaurant ? [36, 42] : [28, 34],
                    iconAnchor: highlightedRestaurant === restaurant ? [18, 40] : [14, 32],
                    popupAnchor: [0, -34],
                  })}
                  zIndexOffset={highlightedRestaurant === restaurant ? 1000 : 0}
                  eventHandlers={{
                    click: () => {
                      setHighlightedRestaurant(restaurant);
                      setMapCenter([getLatitude(restaurant), getLongitude(restaurant)]);
                    },
                  }}
                >
                  <Popup>
                    <strong>{restaurant.name}</strong>

                    <br />

                    {restaurant.cuisine || "Restaurant"}

                    <br />

                    {restaurant.address || restaurant.location_label || ""}
                  </Popup>
                </Marker>
              );
            })}

            {navigationRestaurant && (
              <LiveRestaurantNavigation
                restaurant={navigationRestaurant}
                onStatus={setNavigationStatus}
              />
            )}
          </MapContainer>

          {visibleRestaurants.some(hasValidCoordinates) && (
            <div className="dineout-map-legend" aria-label="Map marker legend">
              <span><i className="legend-pin is-selected" /> Selected restaurant</span>
              <span><i className="legend-pin" /> Other restaurants</span>
            </div>
          )}

          {navigationRestaurant && (
            <div
              className="dineout-live-navigation"
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                right: 16,
                zIndex: 1000,
                padding: "14px 16px",
                borderRadius: 16,
                background: "rgba(31, 17, 12, 0.94)",
                color: "white",
                boxShadow: "0 10px 30px rgba(0,0,0,.28)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div>
                  <small style={{ color: "#ff7043", fontWeight: 800 }}>
                    LIVE ROAD NAVIGATION
                  </small>
                  <strong style={{ display: "block", marginTop: 4 }}>
                    {navigationStatus.instruction}
                  </strong>
                  <span
                    style={{ display: "block", marginTop: 4, opacity: 0.8 }}
                  >
                    {navigationStatus.loading
                      ? "Calculating road route…"
                      : `${(navigationStatus.distance / 1000).toFixed(1)} km · ${Math.max(1, Math.round(navigationStatus.duration / 60))} min`}
                  </span>
                  {navigationStatus.instructionDistance > 0 && (
                    <span
                      style={{ display: "block", marginTop: 2, opacity: 0.8 }}
                    >
                      In {Math.round(navigationStatus.instructionDistance)} m
                    </span>
                  )}
                  {navigationStatus.error && (
                    <span
                      style={{
                        display: "block",
                        marginTop: 5,
                        color: "#ffb4a2",
                      }}
                    >
                      {navigationStatus.error}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={endRestaurantNavigation}
                  style={{ alignSelf: "flex-start" }}
                >
                  End
                </button>
              </div>
            </div>
          )}
        </aside>
      </section>

      <section id="plan-meetup" className="plan-meetup">
        <p className="eyebrow">NEXT STEP</p>

        <h2>Plan a Dine Out</h2>

        {selectedRestaurant && (
          <div className="selected-place">
            <MapPin size={18} />

            <span>
              <small>Selected restaurant</small>

              <strong>{selectedRestaurant.name}</strong>
            </span>
          </div>
        )}

        {createError && (
          <div className="error-message" role="alert">
            {createError}
          </div>
        )}

        {createSuccess && (
          <div className="success-message" role="status" aria-live="polite">
            <strong>{createSuccess}</strong>

            {createdInviteId && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate(`/dine-out/${createdInviteId}`)}
              >
                View invitation
              </button>
            )}
          </div>
        )}

        <label>
          Meetup title
          <input
            type="text"
            value={meetupTitle}
            onChange={(event) => setMeetupTitle(event.target.value)}
            placeholder="Meetup title"
          />
        </label>

        <label>
          Notes
          <textarea
            rows={4}
            value={meetupNotes}
            onChange={(event) => setMeetupNotes(event.target.value)}
            placeholder="Add notes for your guests"
          />
        </label>

        <InviteDateTimePicker date={eventDate} time={eventTime} onDateChange={setEventDate} onTimeChange={setEventTime} />

        <div className="plan-grid">
          <label>
            Maximum guests
            <input
              type="number"
              min="2"
              max="20"
              value={maximumGuests}
              onChange={(event) => setMaximumGuests(event.target.value)}
            />
          </label>
        </div>

        <label>
          Booking status
          <select
            value={bookingStatus}
            onChange={(event) => setBookingStatus(event.target.value)}
          >
            <option value="not_booked">Not booked yet</option>

            <option value="booked">Table booked</option>

            <option value="walk_in">Walk in</option>
          </select>
        </label>

        <label>
          Dietary preferences
          <textarea
            rows={2}
            value={dietaryNotes}
            onChange={(event) => setDietaryNotes(event.target.value)}
            placeholder="Dietary preferences or allergies"
          />
        </label>

        <fieldset className="dineout-visibility-fieldset">
          <legend>Who can see this Dine Out?</legend>

          <label className="dineout-visibility-option">
            <input
              type="radio"
              name="dineout-visibility"
              value="public"
              checked={visibility === "public"}
              onChange={() => {
                setVisibility("public");
                setSelectedMemberIds([]);
              }}
            />

            <span>
              <strong>Everyone</strong>
              <small>Visible to all FoodKindl members.</small>
            </span>
          </label>

          <label className="dineout-visibility-option">
            <input
              type="radio"
              name="dineout-visibility"
              value="invited_only"
              checked={visibility === "invited_only"}
              onChange={() => setVisibility("invited_only")}
            />

            <span>
              <strong>Selected guests only</strong>
              <small>Only you and selected guests can see it.</small>
            </span>
          </label>
        </fieldset>

        {visibility === "invited_only" && (
          <section className="dineout-member-picker">
            <div className="dineout-member-picker__heading">
              <strong>Select guests</strong>
              <span>
                {selectedMemberIds.length}/{maximumGuests} selected
              </span>
            </div>

            {membersLoading && <p>Loading members...</p>}
            {membersError && (
              <p className="error-message" role="alert">
                {membersError}
              </p>
            )}

            {!membersLoading &&
              !membersError &&
              availableMembers.length === 0 && (
                <p>No members are available to invite.</p>
              )}

            {!membersLoading && !membersError && (
              <div className="dineout-member-picker__list">
                {availableMembers.map((member) => (
                  <label key={member.id} className="dineout-member-option">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      disabled={
                        !selectedMemberIds.includes(member.id) &&
                        selectedMemberIds.length >= Number(maximumGuests)
                      }
                      onChange={() => toggleInvitedMember(member.id)}
                    />

                    <span>
                      <strong>{member.name}</strong>
                      {member.email && <small>{member.email}</small>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>
        )}

        <button
          type="button"
          className="primary-button"
          onClick={createDineOut}
          disabled={creating}
        >
          {creating ? "Creating invitation..." : "Create Dine Out invite"}
        </button>
      </section>

      <RestaurantDetailsModal
        restaurant={detailsRestaurant}
        onClose={() => setDetailsRestaurant(null)}
        onChoose={chooseRestaurant}
        onNavigate={startRestaurantNavigation}
      />
    </main>
  );
}
