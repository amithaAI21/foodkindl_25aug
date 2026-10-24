// src/pages/DineOut.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";

import RestaurantRouteMap from "../components/RestaurantRouteMap";

import RestaurantDashboard, { RestaurantSummary } from "../components/RestaurantDashboard";

import GoogleRestaurantMap from "../components/GoogleRestaurantMap";

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

import { useLocation, useNavigate } from "react-router-dom";

import "../styles/DineOutOriginal.css";

import "../styles/DineOutDetails.css";

import "../styles/DineOutVisibility.css";

import "../styles/DineOutReference.css";

import "../styles/DineOutOSM.css";

import "../styles/DineOutPlanPage.css";

import api from "../api";

function backendMediaUrl(url) {
  if (!url) return null;
  if (/^https:\/\//i.test(url)) return url;
  const base = new URL(api.defaults.baseURL || "/api/", window.location.origin);
  return new URL(url, base.origin).toString();
}


/* ============================================================

   GOOGLE MAPS DEFAULT CENTER

\\\\\============================================================ */

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

function cuisineTokens(restaurant) {

  return String(restaurant?.tags?.cuisine || restaurant?.cuisine || "")

    .split(/[;,]/)

    .map((token) => token.trim().replaceAll("_", " ").toLowerCase())

    .filter(Boolean);

}

function cuisineLabel(token) {

  return token.replace(/\b\w/g, (character) => character.toUpperCase());

}

const PLACE_TYPES = [

  ["all", "All places"],

  ["restaurant", "Restaurant"],

  ["cafe", "Café"],

];

/* ============================================================

   HELPERS

\\\\\============================================================ */

function getLatitude(restaurant) {

  const value = restaurant?.latitude ?? restaurant?.lat ?? restaurant?.center?.lat;

  return value === null || value === undefined || value === "" ? NaN : Number(value);

}

function getLongitude(restaurant) {

  const value = restaurant?.longitude ?? restaurant?.lon ?? restaurant?.center?.lon;

  return value === null || value === undefined || value === "" ? NaN : Number(value);

}

function hasValidCoordinates(restaurant) {

  return (

    Number.isFinite(getLatitude(restaurant)) &&

    Number.isFinite(getLongitude(restaurant)) &&

    Math.abs(getLatitude(restaurant)) <= 90 &&

    Math.abs(getLongitude(restaurant)) <= 180

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

function RestaurantImage({ restaurant, className = "restaurant-image" }) {
  const photo = backendMediaUrl(restaurant?.photo_url || restaurant?.image_url);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);
  return (
    <div className={`${className} osm-restaurant-art`} style={{ position: "relative", overflow: "hidden" }}>
      {photo && !failed ? (
        <img src={photo} alt={`${restaurant?.name || "Restaurant"} food or venue`}
          loading="lazy" onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : <Utensils size={48} strokeWidth={1.15} />}
      {photo && !failed && (restaurant?.photo_attributions || []).map((a, i) => (
        <small key={i} style={{position:"absolute",bottom:0,left:0,background:"#000b",color:"white",fontSize:10,padding:3}}>
          {a.uri?.startsWith("https://") ? <a href={a.uri} target="_blank" rel="noreferrer" style={{color:"white"}}>{a.displayName || "Photographer"}</a> : a.displayName}
        </small>
      ))}
    </div>
  );
}

function googleField(restaurant, ...keys) {
  return keys.map((key) => restaurant?.[key]).find((value) => value !== undefined && value !== null && value !== "");
}

function GoogleRestaurantFacts({ restaurant }) {
  const hours = googleField(restaurant, "currentOpeningHours", "regularOpeningHours", "opening_hours");
  const hoursText = typeof hours === "string"
    ? hours
    : (hours?.weekdayDescriptions || []).join(" · ");
  const phone = googleField(restaurant, "phone", "nationalPhoneNumber", "internationalPhoneNumber");
  const website = googleField(restaurant, "website", "websiteUri");
  const websiteUrl = typeof website === "string" && /^https?:\/\//i.test(website) ? website : null;
  const mapsUrl = googleField(restaurant, "google_maps_uri", "googleMapsUri");
  const validMapsUrl = typeof mapsUrl === "string" && /^https?:\/\//i.test(mapsUrl) ? mapsUrl : null;
  return <>
    <dl className="osm-facts">
      {hoursText && <div><dt>Opening hours</dt><dd>{hoursText}</dd></div>}
      {phone && <div><dt>Phone</dt><dd><a href={`tel:${String(phone).replace(/[^+\d]/g, "")}`}>{phone}</a></dd></div>}
      {websiteUrl && <div><dt>Website</dt><dd><a href={websiteUrl} target="_blank" rel="noopener noreferrer">Visit website</a></dd></div>}
      {validMapsUrl && <div><dt>Google Maps</dt><dd><a href={validMapsUrl} target="_blank" rel="noopener noreferrer">View listing</a></dd></div>}
    </dl>
    {restaurant.source === "google" && <small>Listing provided by Google Maps</small>}
    {(restaurant.attributions || []).map((a, i) => <small key={i} style={{ display: "block" }}>
      {a.providerUri && /^https?:\/\//i.test(a.providerUri)
        ? <a href={a.providerUri} target="_blank" rel="noopener noreferrer">{a.provider || "Data provider"}</a>
        : (a.provider || "")}
    </small>)}
  </>;
}

function RestaurantDetailsModal(props) { return <RestaurantDashboard {...props} />; }

/* ============================================================

   DINE OUT PAGE

\\\\\============================================================ */

export default function DineOut() {

  const navigate = useNavigate();

  const routeLocation = useLocation();

  const isPlanPage = new URLSearchParams(routeLocation.search).get("step") === "plan";

  const skipAutocompleteRef = useRef(false);

  const autocompleteRequestRef = useRef(0);

  /* ----------------------------------------------------------

     LOCATION AND RESTAURANTS

  ---------------------------------------------------------- */

  const [location, setLocation] = useState("");

  const [locationSelected, setLocationSelected] = useState(false);

  const [searchedLocation, setSearchedLocation] = useState("");

  const [cuisine, setCuisine] = useState("All cuisines");

  const [placeType, setPlaceType] = useState("all");

  // Restaurant discovery: FoodKindl partners or live Google Places listings.

  const [restaurantSource, setRestaurantSource] = useState("other");

  const [foodFilter, setFoodFilter] = useState("all");

  const [radiusKm, setRadiusKm] = useState(5);

  const [searchCoverage, setSearchCoverage] = useState("");

  const [restaurantQuery, setRestaurantQuery] = useState("");

  const [searchedRestaurantQuery, setSearchedRestaurantQuery] = useState("");
  const [minimumRating, setMinimumRating] = useState(0);
  const [restaurantSort, setRestaurantSort] = useState("distance");

  const [locationSuggestions, setLocationSuggestions] = useState([]);

  const [restaurants, setRestaurants] = useState([]);

  const [selectedRestaurant, setSelectedRestaurant] = useState(() => routeLocation.state?.selectedRestaurant ?? null);

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

    gpsAccuracy: null,

    lastGpsUpdate: "",

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

  const restaurantRequestRef = useRef(0);

  const restaurantAbortRef = useRef(null);

  useEffect(() => () => {

    restaurantRequestRef.current += 1;

    restaurantAbortRef.current?.abort();

  }, []);

  const [creating, setCreating] = useState(false);

  const [bookingRestaurant, setBookingRestaurant] = useState(null);

  const [bookingDate, setBookingDate] = useState("");

  const [bookingTime, setBookingTime] = useState("");

  const [bookingGuests, setBookingGuests] = useState(3);

  const [bookingNotes, setBookingNotes] = useState("");

  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const [bookingError, setBookingError] = useState("");

  const [bookingSuccess, setBookingSuccess] = useState("");

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

  const [maximumGuests, setMaximumGuests] = useState(3);

  const [bookingStatus, setBookingStatus] = useState("not_booked");

  const [dietaryNotes, setDietaryNotes] = useState("");

  const [visibility, setVisibility] = useState("public");

  const [availableMembers, setAvailableMembers] = useState([]);

  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const [membersLoading, setMembersLoading] = useState(false);

  const [membersError, setMembersError] = useState("");

  /* ----------------------------------------------------------

     LOAD ELIGIBLE FOODKINDL MEMBERS FOR PRIVATE INVITATIONS

     /people/ is handled by FoodKindlPeopleView, which already

     excludes restaurant partners, inactive accounts, blocked

     users and the logged-in user at the Django level.

     Note: the current People API returns up to 20 members.

     For a larger directory, add pagination to the backend.

  ---------------------------------------------------------- */

  useEffect(() => {

    if (visibility !== "invited_only") return undefined;

    let cancelled = false;

    async function loadMembers() {

      setMembersLoading(true);

      setMembersError("");

      try {

        // Never use the unfiltered /dineout/members/ endpoint here.

        const response = await api.get("/auth/people/");

        const data = response.data;

        const rawMembers = Array.isArray(data)

          ? data

          : Array.isArray(data?.results)

            ? data.results

            : [];

        const normalizedMembers = rawMembers

          .map((item) => {

            const user = item?.user || item;

            const id = Number(user?.id ?? item?.user_id ?? item?.member_id);

            const name = String(

              user?.full_name ||

              [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||

              user?.display_name ||

              user?.username ||

              "Member"

            ).trim();

            if (!Number.isInteger(id) || id <= 0) return null;

            return { id, name, email: user?.email || "" };

          })

          .filter(Boolean);

        if (!cancelled) {

          setAvailableMembers(normalizedMembers);

          const allowedIds = new Set(normalizedMembers.map((member) => member.id));

          setSelectedMemberIds((current) =>

            current.filter((id) => allowedIds.has(id))

          );

        }

      } catch (error) {

        console.error("Dine Out member directory error:", error);

        if (!cancelled) {

          setAvailableMembers([]);

          setMembersError("Could not load FoodKindl members. Please try again.");

        }

      } finally {

        if (!cancelled) setMembersLoading(false);

      }

    }

    loadMembers();

    return () => { cancelled = true; };

  }, [visibility]);

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

  const availableCuisines = useMemo(() => {

    const values = new Set();

    restaurants.forEach((restaurant) => {

      if (restaurant?.name && hasValidCoordinates(restaurant)) {

        cuisineTokens(restaurant).forEach((token) => values.add(token));

      }

    });

    return [...values].sort((a, b) => a.localeCompare(b));

  }, [restaurants]);

  const visibleRestaurants = useMemo(() => {

    const query = searchedRestaurantQuery.trim().toLowerCase();

    const seen = new Set();

    return restaurants.filter((restaurant) => {

      const name = String(restaurant?.name || restaurant?.tags?.name || "").trim();

      if (!name || !hasValidCoordinates(restaurant)) return false;

      const isPartner = restaurant.is_foodkindl_partner === true;

      if (restaurantSource === "partner" && !isPartner) return false;

      if (restaurantSource === "other" && isPartner) return false;

      const key = `${name.toLowerCase()}:${getLatitude(restaurant).toFixed(5)}:${getLongitude(restaurant).toFixed(5)}`;

      if (seen.has(key)) return false;

      const amenity = String(restaurant?.amenity || restaurant?.tags?.amenity || restaurant?.category || "").toLowerCase();

      const cuisineValues = cuisineTokens(restaurant);

      const cuisineText = cuisineValues.join(" ");

      const vegetarian = String(restaurant?.diet_vegetarian ?? restaurant?.tags?.["diet:vegetarian"] ?? "").toLowerCase();

      const matchesType = placeType === "all" ||

        (placeType === "restaurant" && amenity === "restaurant") ||

        (placeType === "cafe" && amenity === "cafe");

      const matchesFood = foodFilter === "all" ||

        (foodFilter === "veg" && ["yes", "only"].includes(vegetarian));

      const matchesCuisine = cuisine === "All cuisines" || cuisineValues.includes(cuisine);

      const matchesSearch = !query || `${name} ${cuisineText}`.toLowerCase().includes(query);
      const numericRating = Number(restaurant?.rating);
      const matchesRating = minimumRating === 0 || (restaurant?.rating != null && Number.isFinite(numericRating) && numericRating >= minimumRating);

      if (!matchesType || !matchesFood || !matchesCuisine || !matchesSearch || !matchesRating) return false;

      seen.add(key);

      return true;

    }).sort((a, b) => {
      if (restaurantSort === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0) || (Number(b.review_count) || 0) - (Number(a.review_count) || 0);
      if (restaurantSort === "reviews") return (Number(b.review_count) || 0) - (Number(a.review_count) || 0);
      return (Number(a.distance_km) || 0) - (Number(b.distance_km) || 0);
    });

  }, [restaurants, searchedRestaurantQuery, placeType, foodFilter, cuisine, restaurantSource, minimumRating, restaurantSort]);

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

    if (query.length < 3) {

      setLocationSuggestions([]);

      setLocationLoading(false);

      return undefined;

    }

    const requestNumber = ++autocompleteRequestRef.current;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {

      try {

        setLocationLoading(true);

        const response = await api.get("/dineout/locations/autocomplete/", {

          signal: controller.signal, timeout: 15000,

          params: {

            q: query,

            limit: 8,

          },

        });

        if (controller.signal.aborted || requestNumber !== autocompleteRequestRef.current) {

          return;

        }

        const results = Array.isArray(response.data)

          ? response.data

          : response.data?.results || [];

        setLocationSuggestions(results);

      } catch (requestError) {

        if (controller.signal.aborted) return;

        setPageError(requestError.response?.data?.detail || "Location search is unavailable.");

        if (requestNumber === autocompleteRequestRef.current) {

          setLocationSuggestions([]);

        }

      } finally {

        if (requestNumber === autocompleteRequestRef.current) {

          setLocationLoading(false);

        }

      }

    }, 700);

    return () => {

      window.clearTimeout(timer);

      controller.abort();

    };

  }, [location]);

  /* ----------------------------------------------------------

     FETCH RESTAURANTS

  ---------------------------------------------------------- */

  async function fetchRestaurants(

    latitude = coordinates.latitude,

    longitude = coordinates.longitude,

    selectedCuisine = cuisine,

    sourceOverride = restaurantSource,
    queryOverride = restaurantQuery,

  ) {

    const requestId = ++restaurantRequestRef.current;

    restaurantAbortRef.current?.abort();

    const controller = new AbortController();

    restaurantAbortRef.current = controller;

    try {

      setRestaurantLoading(true);

      setRestaurants([]);

      setPageError("");

      const response = await api.get("/dineout/restaurants/recommendations/", {

        signal: controller.signal,

        timeout: 35000,

        params: {
          // Location is optional when searching for a restaurant by name.
          ...(locationSelected ? {
            latitude,
            longitude,
            radius: radiusKm * 1000,
          } : {}),
          limit: 100,
          source: !locationSelected ? "other" : sourceOverride,
          search: queryOverride.trim(),
        },

      });

      if (controller.signal.aborted || requestId !== restaurantRequestRef.current) return;

      const results = Array.isArray(response.data)

        ? response.data : response.data?.results || response.data?.restaurants || [];

      // Diagnostic: inspect the actual API URL and partner rows in the browser console.

      setRestaurants(results);

      setSearchedRestaurantQuery(queryOverride.trim());

      setCuisine("All cuisines");

      const searchedMetres = Number(response.data?.searched_radius_metres);

      const mappedCount = Number(response.data?.mapped_places_in_area);

      const areaMessage = locationSelected
        ? `Search radius: ${radiusKm} km. ${queryOverride.trim() ? `Restaurant search: ${queryOverride.trim()}.` : "Showing nearby restaurants."}`
        : `Google Places name search: ${queryOverride.trim()}. Results are not restricted to a radius.`;
      if (!locationSelected && results.length && hasValidCoordinates(results[0])) {
        setMapCenter([getLatitude(results[0]), getLongitude(results[0])]);
      }

      const partnerCount = results.filter((r) => r.is_foodkindl_partner).length;

      setSearchCoverage(`${areaMessage} ${partnerCount} FoodKindl Partner${partnerCount === 1 ? "" : "s"} and ${results.length - partnerCount} other restaurants returned.`);

      setSelectedRestaurant(null);

      setHighlightedRestaurant(null);

      if (results.length === 0) {

        setPageError("Google Places returned no restaurants or cafés here. Try another location or radius.");

      }

    } catch (requestError) {

      if (controller.signal.aborted || requestId !== restaurantRequestRef.current) return;

      console.error(

        "Restaurant search error:",

        {

          url: `${requestError.config?.baseURL || ""}${requestError.config?.url || ""}`,

          status: requestError.response?.status,

          response: requestError.response?.data,

          message: requestError.message,

        },

      );

      setRestaurants([]);

      setSearchCoverage("");

      setSelectedRestaurant(null);

      setHighlightedRestaurant(null);

      setPageError(

        requestError.response?.data?.detail || "Restaurant search could not finish. Please try again.",

      );

    } finally {

      if (requestId === restaurantRequestRef.current) setRestaurantLoading(false);

    }

  }

  /* ----------------------------------------------------------

     SELECT LOCATION

  ---------------------------------------------------------- */

  async function selectLocation(place) {

    restaurantRequestRef.current += 1;

    restaurantAbortRef.current?.abort();

    setRestaurantLoading(false);

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

    restaurantRequestRef.current += 1;

    restaurantAbortRef.current?.abort();

    setRestaurantLoading(false);

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

    restaurantRequestRef.current += 1;

    restaurantAbortRef.current?.abort();

    setRestaurantLoading(false);

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

    restaurantRequestRef.current += 1;

    restaurantAbortRef.current?.abort();

    setRestaurantLoading(false);

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

    if (!locationSelected && !restaurantQuery.trim()) {
      setPageError("Select a location or enter a restaurant name.");
      return;
    }
    if (!locationSelected && restaurantQuery.trim().length < 2) {
      setPageError("Enter at least two characters in the restaurant name.");
      return;
    }
    // Name-only search should show external Google results, not partner-only data.
    if (!locationSelected) setRestaurantSource("other");

    setLocationSuggestions([]);

    setSearchedLocation(locationSelected ? location : "");

    setSearchedRestaurantQuery(restaurantQuery);

    await fetchRestaurants(coordinates.latitude, coordinates.longitude, "All cuisines");

  }

  function openRestaurantDetails(restaurant) {
    setDetailsRestaurant(restaurant);
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

  async function submitTableBooking(event) {

    event.preventDefault();

    setBookingError("");

    if (bookingRestaurant?.is_foodkindl_partner !== true || !bookingRestaurant?.accepts_foodkindl_booking) { setBookingError("Table booking is only available for enabled FoodKindl partners."); return; }

    const idMatch = String(bookingRestaurant?.id || "").match(/^foodkindl-(\d+)$/);

    if (!idMatch) {

      setBookingError("Only registered FoodKindl restaurants can accept bookings.");

      return;

    }

    try {

      setBookingSubmitting(true);

      const response = await api.post("/table-bookings/", {

        restaurant: Number(idMatch[1]),

        booking_date: bookingDate,

        booking_time: bookingTime,

        guest_count: Number(bookingGuests),

        special_request: bookingNotes,

      });

      setBookingRestaurant(null);

      setBookingSuccess(`Booking request sent. Reference: ${response.data.booking_reference}. Await partner confirmation.`);

    } catch (error) {

      const data = error.response?.data;

      setBookingError(typeof data?.detail === "string" ? data.detail :

        data ? Object.entries(data).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`).join(" | ") :

        "Could not send booking request.");

    } finally {

      setBookingSubmitting(false);

    }

  }

  function chooseRestaurant(restaurant) {

    setSelectedRestaurant(restaurant);

    setHighlightedRestaurant(restaurant);

    setDetailsRestaurant(null);

    navigate(`${routeLocation.pathname}?step=plan`, {

      state: { selectedRestaurant: restaurant },

    });

    window.scrollTo({ top: 0, behavior: "smooth" });

  }

  function startRestaurantNavigation(restaurant) {

    if (!hasValidCoordinates(restaurant)) {

      setPageError("This restaurant has no valid coordinates.");

      return;

    }

    setDetailsRestaurant(null);

    viewRestaurantOnMap(restaurant);

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

    if (

      visibility === "invited_only" &&

      selectedMemberIds.some((id) => !availableMembers.some((member) => member.id === id))

    ) {

      showCreateError("Guest list changed. Please select FoodKindl members again.");

      return;

    }

    if (selectedMemberIds.length > guestCount) {

      showCreateError(

        `You selected ${selectedMemberIds.length} guests, but the maximum is ${guestCount}.`,

      );

      return;

    }

        const latitude = Number(

      getLatitude(selectedRestaurant).toFixed(6)

    );

    const longitude = Number(

      getLongitude(selectedRestaurant).toFixed(6)

    );

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

      const response = await api.post("/dineout/dine-outs/", payload);

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

    <main className={`dineout-page${isPlanPage ? " dineout-plan-page" : ""}`}>

      {!isPlanPage && <>

      <section className="dineout-hero">

        <div>

          <p className="eyebrow">FOODKINDL DINE OUT</p>

          <h1>

            Where shall we dine?

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

            <MapPin size={20} />

            <input

              type="text"

              value={location}

              onChange={handleLocationChange}

              placeholder="Choose a location"

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

              Select a location for nearby dining, or search by restaurant name anywhere in India.

            </p>

          </div>

          <Sparkles size={26} />

        </div>

        <div className="filters">

          <input
              type="search"
              value={restaurantQuery}
              onChange={(event) => setRestaurantQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void searchPlaces(); }}
              placeholder="Search restaurants without choosing a location"
              aria-label="Search restaurants by name"
            />

          <button

            type="button"

            className="primary-button"

            onClick={searchPlaces}

            disabled={restaurantLoading}

          >

            <Search size={17} />

            {restaurantLoading ? "Searching..." : "Search"}

          </button>

        </div>

      </section>

      <section className="fk-source-picker" aria-label="Choose restaurant source"

        style={{ margin: "18px 0", padding: 16, borderRadius: 14, border: "1px solid rgba(212,125,82,.35)" }}>

        <h2 style={{ fontSize: "1.1rem", marginBottom: 12 }}>Choose restaurants</h2>

        <div role="group" aria-label="Restaurant listing type"

          style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>

          <button type="button" aria-pressed={restaurantSource === "partner"}

            className={restaurantSource === "partner" ? "primary-button" : "secondary-button"}

            onClick={() => { setRestaurantSource("partner"); if (locationSelected) void fetchRestaurants(coordinates.latitude, coordinates.longitude, cuisine, "partner"); }}>FoodKindl Partners</button>

          <button type="button" aria-pressed={restaurantSource === "other"}

            className={restaurantSource === "other" ? "primary-button" : "secondary-button"}

            onClick={() => { setRestaurantSource("other"); if (locationSelected) void fetchRestaurants(coordinates.latitude, coordinates.longitude, cuisine, "other"); }}>Other Restaurants</button>

        </div>

        <p style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>

          {restaurantSource === "partner"

            ? "Restaurants registered with FoodKindl. Book a table when bookings are enabled."

            : "Restaurants discovered through Google Places. Plan a Dine Out; FoodKindl table bookings are partner-only."}

        </p>

      </section>

      <section aria-label="Ratings and sorting" style={{display:"flex", flexWrap:"wrap", gap:14, alignItems:"center", margin:"16px 0", padding:14, border:"1px solid rgba(212,125,82,.35)", borderRadius:12}}>
        <label style={{display:"flex", gap:8, alignItems:"center"}}>Minimum rating
          <select value={minimumRating} onChange={e => setMinimumRating(Number(e.target.value))} aria-label="Minimum Google rating">
            <option value={0}>Any rating (including unrated)</option>
            <option value={3}>3.0★ and above</option>
            <option value={3.5}>3.5★ and above</option>
            <option value={4}>4.0★ and above</option>
            <option value={4.5}>4.5★ and above</option>
          </select>
        </label>
        <label style={{display:"flex", gap:8, alignItems:"center"}}>Sort by
          <select value={restaurantSort} onChange={e => setRestaurantSort(e.target.value)} aria-label="Sort restaurants">
            <option value="distance">Nearest first</option>
            <option value="rating">Highest rated</option>
            <option value="reviews">Most reviewed</option>
          </select>
        </label>
        <button type="button" className="secondary-button" onClick={() => {setMinimumRating(0);setRestaurantSort("distance");setPlaceType("all");setFoodFilter("all");setCuisine("All cuisines");}}>Reset filters</button>
      </section>
      <section className="osm-discovery-filters" aria-label="Restaurant filters">

        <div className="osm-filter-group"><span>Places</span><div className="osm-segments">

          {PLACE_TYPES.map(([value, label]) => <button key={value} type="button" className={placeType === value ? "active" : ""}

            aria-pressed={placeType === value} onClick={() => setPlaceType(value)}>{label}</button>)}

        </div></div>

        <div className="osm-filter-group"><span>Food</span><div className="osm-segments">

          {[["all", "All"], ["veg", "Vegetarian options"]].map(([value, label]) =>

            <button key={value} type="button" className={foodFilter === value ? "active" : ""}

              aria-pressed={foodFilter === value} onClick={() => setFoodFilter(value)}>{label}</button>)}

        </div></div>

        <label className="osm-radius">Radius <strong>{radiusKm} km</strong>

          <input type="range" min="1" max="5" step="1" value={radiusKm}

            onChange={(event) => { setRadiusKm(Number(event.target.value)); setRestaurants([]); setSearchCoverage(""); }}

            aria-label="Search radius in kilometres" />

        </label>

        <small>Google Places may return fewer places than the 100-result limit.</small>

        <div className="osm-filter-group"><span>Cuisine</span><div className="osm-segments">

          {["All cuisines", ...availableCuisines].map((item) => <button key={item} type="button" className={cuisine === item ? "active" : ""}

            aria-pressed={cuisine === item} onClick={() => setCuisine(item)}>{item === "All cuisines" ? item : cuisineLabel(item)}</button>)}

        </div></div>

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

              <p className="eyebrow">RESTAURANTS NEAR YOU</p>

              <h2>{searchedLocation ? `Places to dine in ${searchedLocation}` : "Places to dine"}</h2>

            </div>

            <span>{visibleRestaurants.length} {visibleRestaurants.length === 1 ? "place" : "places"}</span>

          </div>

          {searchCoverage && <p className="search-status" role="status">{searchCoverage}</p>}

          {restaurantLoading && (

            <div className="empty-state">Finding nearby restaurants…</div>

          )}

          {!restaurantLoading && visibleRestaurants.length === 0 && (

            <div className="empty-state">

              {restaurantSource === "partner" && restaurants.length === 0

                ? "No FoodKindl Partner restaurants found in this area. Try a different location or radius."

                : restaurantSource === "partner" && !restaurants.some((r) => r.is_foodkindl_partner)

                  ? "No registered FoodKindl Partner restaurants found within the searched radius."

                : restaurants.length > 0 && foodFilter === "veg"

                  ? "No restaurants here have confirmed vegetarian options in the listing provider. Try All to see places with unknown dietary details."

                  : restaurants.length > 0

                    ? "No restaurants match these filters. Try another cuisine or place type."

                    : "Select a location and press Search. Only Google Places listings with a name and location will appear."}

            </div>

          )}

          {visibleRestaurants.map((restaurant, index) => (

            <article

              key={restaurant.id || index}

              className={`restaurant-card ${

                highlightedRestaurant === restaurant ? "selected" : ""

              }`}

              onClick={() => openRestaurantDetails(restaurant)}

            >

              <RestaurantImage restaurant={restaurant} />

              <div className="restaurant-content">

                <h3>{restaurant.name}</h3>

                <RestaurantSummary restaurant={restaurant} />

                {restaurant.is_foodkindl_partner && (

                  <span className="fk-partner-label" style={{ display: "inline-block", marginBottom: 8, padding: "5px 10px", borderRadius: 12, border: "1px solid #d95d38", color: "#ffb39b", fontWeight: 700, fontSize: 12 }}>

                    FoodKindl Partner

                  </span>

                )}

                {(restaurant.cuisine || restaurant.tags?.cuisine) && <p>{String(restaurant.cuisine || restaurant.tags.cuisine).replaceAll(";", " · ")}</p>}

                <div className="osm-badges">

                  {(restaurant.amenity || restaurant.tags?.amenity) && <span>{restaurant.amenity || restaurant.tags.amenity}</span>}

                  {["yes", "only"].includes(String(restaurant.diet_vegetarian ?? restaurant.tags?.["diet:vegetarian"]).toLowerCase()) && <span>Vegetarian options</span>}

                </div>

                {(restaurant.address || restaurant.location_label) &&

                  <small>{restaurant.address || restaurant.location_label}</small>}

                <GoogleRestaurantFacts restaurant={restaurant} />

                <div className="restaurant-actions">

                  {restaurantSource === "partner" && restaurant.is_foodkindl_partner === true && restaurant.accepts_foodkindl_booking && /^foodkindl-\d+$/.test(String(restaurant.id)) && <button type="button" className="primary-button" onClick={event=>{event.stopPropagation();setBookingError("");setBookingRestaurant(restaurant);}}>Request a table</button>}

                  {restaurantSource === "partner" && restaurant.is_foodkindl_partner && !restaurant.accepts_foodkindl_booking && (

                    <span style={{ fontSize: 12, opacity: .8, alignSelf: "center" }}>Table bookings not enabled</span>

                  )}

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

          {highlightedRestaurant ? <>

            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>

              <button type="button" className="secondary-button" onClick={() => {setHighlightedRestaurant(null);setDetailsRestaurant(null);}}>Show all restaurant pins</button>

              <button type="button" className="secondary-button" onClick={()=>setDetailsRestaurant(highlightedRestaurant)}>Restaurant details</button>

            </div>

            <RestaurantRouteMap key={highlightedRestaurant.id} invitation={{

              id: highlightedRestaurant.id, latitude: getLatitude(highlightedRestaurant),

              longitude: getLongitude(highlightedRestaurant), restaurant_name: highlightedRestaurant.name,

              restaurant_address: highlightedRestaurant.address || highlightedRestaurant.location_label,

              restaurant_external_id: String(highlightedRestaurant.id || '')

            }} />

          </> : <GoogleRestaurantMap center={mapCenter} restaurants={visibleRestaurants}

            highlightedRestaurant={null} onSelect={openRestaurantDetails} />}

        </aside>

      </section>

      </>}

      {isPlanPage && <section id="plan-meetup" className="plan-meetup">

        <button type="button" className="secondary-button dineout-plan-back"

          onClick={() => navigate(routeLocation.pathname)}>

          ← Back to restaurants

        </button>

        <p className="eyebrow">NEXT STEP</p>

        <h2>Plan a Dine Out</h2>

        {selectedRestaurant && (

          <div className="selected-place">

            <MapPin size={18} />

            <span>

              <small>Selected restaurant</small>

              <strong>{selectedRestaurant.name}</strong>

              {(selectedRestaurant.address || selectedRestaurant.location_label) &&

                <small>{selectedRestaurant.address || selectedRestaurant.location_label}</small>}

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

      </section>}

      {bookingSuccess && <p role="status" className="search-status" style={{padding:16}}>{bookingSuccess}</p>}

      {bookingRestaurant?.is_foodkindl_partner === true && /^foodkindl-\d+$/.test(String(bookingRestaurant.id)) && (

        <div className="restaurant-modal-backdrop" onMouseDown={() => !bookingSubmitting && setBookingRestaurant(null)}>

          <form className="restaurant-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={submitTableBooking}

            style={{display:"grid",gap:12,padding:24,maxWidth:480,margin:"auto"}}>

            <h2>Request a table · {bookingRestaurant.name}</h2>

            <label>Date<input type="date" required min={localDateKey(new Date())} value={bookingDate} onChange={(e)=>setBookingDate(e.target.value)} /></label>

            <label>Time<input type="time" required value={bookingTime} onChange={(e)=>setBookingTime(e.target.value)} /></label>

            <label>Guests<input type="number" required min="1" max="20" value={bookingGuests} onChange={(e)=>setBookingGuests(e.target.value)} /></label>

            <label>Special requests<textarea value={bookingNotes} onChange={(e)=>setBookingNotes(e.target.value)} /></label>

            <p>A request is not confirmed until the restaurant accepts it.</p>

            {bookingError && <p role="alert" className="error-message">{bookingError}</p>}

            <button type="submit" className="primary-button" disabled={bookingSubmitting}>{bookingSubmitting ? "Sending..." : "Request Booking"}</button>

            <button type="button" className="secondary-button" disabled={bookingSubmitting} onClick={()=>setBookingRestaurant(null)}>Cancel</button>

          </form>

        </div>

      )}

      <RestaurantDetailsModal

        restaurant={detailsRestaurant}

        onClose={() => setDetailsRestaurant(null)}

        onChoose={chooseRestaurant}

        onNavigate={startRestaurantNavigation}

      />

    </main>

  );

}
