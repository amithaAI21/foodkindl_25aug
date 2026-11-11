// src/pages/DineOut.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";


import { RestaurantSummary } from "../components/RestaurantDashboard";

import FocusedRestaurantMap from "../components/FocusedRestaurantMap";

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
import "../styles/DineOutPremium.css";
import "../styles/DineOutCuisineAssistant.css";
import "../styles/FocusedRestaurantMapFix.css";

import api from "../api";

function backendMediaUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = new URL(api.defaults.baseURL || "/api/", window.location.origin);
  return new URL(url, base.origin).toString();
}

function safeWebsiteUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const raw = value.trim();
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
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

// A Google Places "open now" flag is the most reliable source when available.
// When absent, derive a best-effort status from weekly hours, including
// opening intervals that continue after midnight (e.g. Sat 6:30 AM–1 AM Sun).
const RESTAURANT_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseRestaurantClock(value) {
  const match = String(value || "").replace(/[\u200e\u200f\u202f\u00a0]/g, " ")
    .match(/(\d{1,2})(?::(\d{2}))?\s*([AP])\.?M\.?/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return (hour % 12) * 60 + minute + (match[3].toUpperCase() === "P" ? 720 : 0);
}

function weeklyHoursOpenNow(restaurant, now = new Date()) {
  const hoursCandidates = [
    restaurant?.currentOpeningHours,
    restaurant?.current_opening_hours,
    restaurant?.regularOpeningHours,
    restaurant?.regular_opening_hours,
    restaurant?.opening_hours,
  ];
  const descriptions = hoursCandidates.map(hours =>
    Array.isArray(hours?.weekdayDescriptions) ? hours.weekdayDescriptions
    : Array.isArray(hours?.weekday_descriptions) ? hours.weekday_descriptions
    : Array.isArray(hours?.weekday_text) ? hours.weekday_text
    : typeof hours === "string"
      ? hours.split(/;\s*(?=(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*:)/i)
      : []
  ).find(value => value.length) || [];
  if (!descriptions.length) return null;

  const timezone = restaurant?.timeZoneId || restaurant?.timezone || restaurant?.time_zone;
  const address = String(restaurant?.formattedAddress || restaurant?.formatted_address || restaurant?.address || "");
  // For India-based listings, use IST. Otherwise require an explicit timezone;
  // browser-local time can be wrong for a restaurant in another country.
  const zone = timezone || (/\bIndia\b|\bBengaluru\b|\bBangalore\b|\bKarnataka\b/i.test(address)
    ? "Asia/Kolkata" : null);
  if (!zone) return null;

  let dayIndex;
  let minuteNow;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, weekday: "long", hour: "numeric", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now);
    const dayName = parts.find(p => p.type === "weekday")?.value;
    dayIndex = RESTAURANT_DAYS.indexOf(dayName);
    minuteNow = Number(parts.find(p => p.type === "hour")?.value) * 60
      + Number(parts.find(p => p.type === "minute")?.value);
    if (dayIndex < 0 || !Number.isFinite(minuteNow)) return null;
  } catch {
    return null;
  }

  const entries = Object.create(null);
  descriptions.forEach(text => {
    const match = String(text).match(/^\s*(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*:\s*(.*)$/i);
    if (match) entries[RESTAURANT_DAYS.find(day => day.toLowerCase() === match[1].toLowerCase())] = match[2].trim();
  });
  const currentDay = RESTAURANT_DAYS[dayIndex];
  const previousDay = RESTAURANT_DAYS[(dayIndex + 6) % 7];
  if (!(currentDay in entries) || !(previousDay in entries)) return null;

  function intervals(dayName) {
    const value = entries[dayName] || "";
    if (/^open 24 hours$/i.test(value)) return [[0, 1440]];
    if (/^closed$/i.test(value)) return [];
    // Typical Google weekday descriptions use an en dash or thin-spaced en dash.
    const pieces = value.split(/\s*[,;]\s*(?=\d{1,2}(?::\d{2})?\s*[AP]M)/i);
    const parsed = [];
    for (const piece of pieces) {
      const match = piece.replace(/[\u200e\u200f\u202f\u00a0\u2009]/g, " ")
        .match(/^\s*(.*?)\s*[–—-]\s*(.*?)\s*$/);
      if (!match) return null;
      const from = parseRestaurantClock(match[1]);
      const to = parseRestaurantClock(match[2]);
      if (from === null || to === null) return null;
      parsed.push([from, to <= from ? to + 1440 : to]);
    }
    return parsed;
  }

  const today = intervals(currentDay);
  const yesterday = intervals(previousDay);
  if (!today || !yesterday) return null;
  if (today.some(([start, end]) => minuteNow >= start && minuteNow < end)) return true;
  if (yesterday.some(([, end]) => end > 1440 && minuteNow < end - 1440)) return true;
  return false;
}

function openNowStatus(restaurant) {
  const raw = restaurant?.currentOpeningHours?.openNow
    ?? restaurant?.current_opening_hours?.open_now
    ?? restaurant?.opening_hours?.open_now
    ?? restaurant?.openNow
    ?? restaurant?.open_now
    ?? restaurant?.is_open;
  if (raw === true || raw === 1 || raw === "true") return true;
  if (raw === false || raw === 0 || raw === "false") return false;
  return weeklyHoursOpenNow(restaurant);
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
  const photo = backendMediaUrl(
    restaurant?.photo_url ||
    restaurant?.image_url ||
    restaurant?.images?.[0]?.image_url ||
    restaurant?.images?.[0]?.url
  );
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

const WIKI_FOOD_ALIASES = {
  "risotti": "Risotto",
  "risotto": "Risotto",
  "classic lasagna": "Lasagne",
  "lasagna": "Lasagne",
  "lasagne": "Lasagne",
  "andhra meals": "Andhra cuisine",
  "malabari dum biriyani": "Biryani",
  "malabari dum biryani": "Biryani",
};

function normalizeWikiTitle(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bbiriyani\b/g, "biryani")
    .replace(/\brisotti\b/g, "risotto")
    .replace(/\blasagne\b/g, "lasagna")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalWikiFoodTitle(food) {
  const normalized = normalizeWikiTitle(food)
    .replace(/\b(classic|traditional|authentic|spicy|homemade|food|dish|recipe|style)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const alias = WIKI_FOOD_ALIASES[normalized] || WIKI_FOOD_ALIASES[normalizeWikiTitle(food)];
  if (alias) return alias;
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function wikiTitleMatchesFood(articleTitle, expectedTitle) {
  const actual = normalizeWikiTitle(articleTitle);
  const expected = normalizeWikiTitle(expectedTitle);
  return Boolean(actual && expected && (
    actual === expected || actual.startsWith(`${expected} `)
  ));
}

function twoSentenceWikiSummary(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const firstTwo = sentences.slice(0, 2).join(" ").trim();
  const words = firstTwo.split(/\s+/);
  return words.length > 34 ? `${words.slice(0, 34).join(" ")}…` : firstTwo;
}

function GoogleRestaurantFacts({ restaurant }) {
  const hours = googleField(restaurant, "currentOpeningHours", "regularOpeningHours", "opening_hours");
  const hoursText = typeof hours === "string" ? hours : (hours?.weekdayDescriptions || []).join(" · ");
  const phone = googleField(restaurant, "phone", "nationalPhoneNumber", "internationalPhoneNumber");
  const website = safeWebsiteUrl(googleField(restaurant, "website", "websiteUri", "website_uri", "website_url"));
  const mapsUrl = googleField(restaurant, "google_maps_uri", "googleMapsUri");
  const validMapsUrl = typeof mapsUrl === "string" && /^https?:\/\//i.test(mapsUrl) ? mapsUrl : null;
  return <>
    <dl className="osm-facts">
      {hoursText && <div><dt>Opening hours</dt><dd>{hoursText}</dd></div>}
      {phone && <div><dt>Phone</dt><dd>{phone}</dd></div>}
      {website && <div><dt>Website</dt><dd><a href={website} target="_blank" rel="noopener noreferrer">Visit website</a></dd></div>}
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

function RestaurantDetailsSection({ restaurant, onClose, onChoose, onNavigate, searchedFood = "", foodDescription = "", foodDescriptionLoading = false, foodDescriptionSource = "", foodDescriptionImage = "" }) {
  if (!restaurant) return null;
  const rawMenu = Array.isArray(restaurant.menu_items) ? restaurant.menu_items : Array.isArray(restaurant.menu) ? restaurant.menu : [];
  const menuItems = rawMenu.map((item) => typeof item === "string"
    ? { name: item, price: "", description: "" }
    : { name: item?.name || item?.title || item?.item_name || "", price: item?.price || item?.price_label || "", description: item?.description || "" }
  ).filter((item) => item.name);
  const phone = googleField(restaurant, "phone", "nationalPhoneNumber", "internationalPhoneNumber");
  const phoneHref = phone ? `tel:${String(phone).replace(/[^+\d]/g, "")}` : null;
  const website = safeWebsiteUrl(googleField(restaurant, "website", "websiteUri", "website_uri", "website_url"));
  const address = googleField(restaurant, "address", "formattedAddress", "location_label");
  const cuisine = googleField(restaurant, "cuisine", "primaryTypeDisplayName", "primaryType");
  const rating = googleField(restaurant, "rating");
  const reviews = googleField(restaurant, "userRatingCount", "review_count");
  const hours = googleField(restaurant, "currentOpeningHours", "regularOpeningHours", "opening_hours");
  const hoursText = typeof hours === "string" ? hours : (hours?.weekdayDescriptions || []).join(" · ");
  return (
    <section id="fk-restaurant-details" className="fk-restaurant-detail" aria-labelledby="fk-restaurant-detail-title" tabIndex="-1">
        <button className="fk-restaurant-detail-close" type="button" onClick={onClose} aria-label="Close restaurant details"><X size={20} /></button>
        <div className="fk-restaurant-detail-heading">
          <RestaurantImage restaurant={restaurant} />
          <div>
            <span className="fk-detail-eyebrow">RESTAURANT DETAILS</span>
            <h2 id="fk-restaurant-detail-title">{restaurant.name}</h2>
            {rating != null && <p className="fk-detail-rating">★ {rating}{reviews ? ` · ${Number(reviews).toLocaleString("en-IN")} ratings` : ""}</p>}
            {cuisine && <p className="fk-detail-cuisine">{String(cuisine).replaceAll("_", " ")}</p>}
          </div>
        </div>
        <div className="fk-restaurant-detail-facts">
          {address && <div><strong>Address</strong><span>{address}</span></div>}
          {phone && <div><strong>Phone</strong><a href={phoneHref}>{phone}</a></div>}
          {website && <div><strong>Website</strong><a href={website} target="_blank" rel="noopener noreferrer">Visit website</a></div>}
          {hoursText && <div><strong>Opening hours</strong><span>{hoursText}</span></div>}
        </div>
        <section className="fk-restaurant-menu-panel" aria-labelledby="fk-restaurant-menu-title">
          <h3 id="fk-restaurant-menu-title">Menu</h3>
          {searchedFood && <div className="fk-food-description">
            <strong>About {searchedFood}</strong>
            <div className="fk-food-reference-row">
              {foodDescriptionImage && <figure className="fk-food-reference-figure">
                <img className="fk-food-reference-image" src={foodDescriptionImage} alt={`${searchedFood} food reference from Wikipedia`} loading="lazy" />
                <figcaption>Wikipedia food reference · not this restaurant’s dish photo</figcaption>
              </figure>}
              <div className="fk-food-reference-copy">
                <p>{foodDescriptionLoading ? "Loading a short Wikipedia description…" : foodDescription || "No matching Wikipedia summary was found for this food."}</p>
                {foodDescriptionSource && <a className="fk-wiki-source" href={foodDescriptionSource} target="_blank" rel="noopener noreferrer">Source: Wikipedia</a>}
              </div>
            </div>
          </div>}
          {menuItems.length > 0 ? (
            <ul className="fk-menu-items">{menuItems.map((item, index) => <li key={`${item.name}-${index}`}><span><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</span>{item.price && <strong className="fk-menu-price">{item.price}</strong>}</li>)}</ul>
          ) : <p className="fk-menu-unavailable">This restaurant hasn’t shared menu items with FoodKindl yet.</p>}
          {searchedFood && phoneHref && <a className="fk-confirm-food-button" href={phoneHref}><Phone size={16} /> Call to confirm {searchedFood}</a>}
          {searchedFood && !phoneHref && <p className="fk-menu-unavailable">No phone number is listed, so availability can’t be confirmed from this page.</p>}
        </section>
        <div className="fk-restaurant-detail-actions">
          <button type="button" className="primary-button" onClick={() => onChoose(restaurant)}><CalendarDays size={16} /> Plan a Dine Out</button>
          <button type="button" className="secondary-button" onClick={() => onNavigate(restaurant)}><Map size={16} /> View on map</button>
          <button type="button" className="secondary-button" onClick={onClose}>Close</button>
        </div>
    </section>
  );
}

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

  const [cuisineDescription, setCuisineDescription] = useState("");
  const [predictedCuisines, setPredictedCuisines] = useState([]);
  const [selectedPredictedCuisine, setSelectedPredictedCuisine] = useState("");
  const [predictingCuisine, setPredictingCuisine] = useState(false);
  const [cuisinePredictionError, setCuisinePredictionError] = useState("");
  const [foodDescription, setFoodDescription] = useState("");
  const [searchedFoodQuery, setSearchedFoodQuery] = useState("");
  const [foodDescriptionImage, setFoodDescriptionImage] = useState("");
  const [foodDescriptionSource, setFoodDescriptionSource] = useState("");
  const [foodDescriptionLoading, setFoodDescriptionLoading] = useState(false);
  const wikiRequestRef = useRef(0);

  const [placeType, setPlaceType] = useState("all");

  // Restaurant discovery: FoodKindl partners or live Google Places listings.

  const [restaurantSource, setRestaurantSource] = useState("other");

  const [foodFilter, setFoodFilter] = useState("all");

  const [radiusKm, setRadiusKm] = useState(5);

  const [searchCoverage, setSearchCoverage] = useState("");

  const [restaurantQuery, setRestaurantQuery] = useState("");

  const [searchedRestaurantQuery, setSearchedRestaurantQuery] = useState("");
  const [minimumRating, setMinimumRating] = useState(0);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [restaurantSort, setRestaurantSort] = useState("distance");

  const [locationSuggestions, setLocationSuggestions] = useState([]);

  const [restaurants, setRestaurants] = useState([]);

  const [selectedRestaurant, setSelectedRestaurant] = useState(() => routeLocation.state?.selectedRestaurant ?? null);

  const [highlightedRestaurant, setHighlightedRestaurant] = useState(null);
  const [focusRequest, setFocusRequest] = useState(0);

  const [detailsRestaurant, setDetailsRestaurant] = useState(null);

  useEffect(() => {
    if (!detailsRestaurant) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("fk-restaurant-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [detailsRestaurant]);

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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsNotice, setGpsNotice] = useState("");
  const [gpsOrigin, setGpsOrigin] = useState(null);

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

  async function fetchWikipediaFoodDescription(food) {
    const query = String(food || "").trim();
    if (!query) return;
    const requestId = ++wikiRequestRef.current;
    const expectedTitle = canonicalWikiFoodTitle(query);
    setFoodDescription("");
    setFoodDescriptionImage("");
    setFoodDescriptionSource("");
    setFoodDescriptionLoading(true);

    const fetchSummary = async (title) => {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(String(title).replaceAll(" ", "_"))}`;
      const response = await fetch(summaryUrl, { headers: { Accept: "application/json" } });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.type === "disambiguation" || !wikiTitleMatchesFood(data.title, expectedTitle)) return null;
      return data;
    };

    try {
      // Try the normalized food article first (e.g. “Risotti” → “Risotto”).
      let summaryData = await fetchSummary(expectedTitle);

      let searchResultImage = "";
      // If the summary is missing, or has no image, search only for a page
      // whose title matches the food name. This avoids unrelated images.
      if (
        !summaryData ||
        (!summaryData.thumbnail?.source && !summaryData.originalimage?.source)
      ) {
        const searchUrl = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(expectedTitle)}&limit=10`;
        const searchResponse = await fetch(searchUrl, { headers: { Accept: "application/json" } });
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const pages = Array.isArray(searchData.pages) ? searchData.pages : [];
          const matchingPage = pages.find((page) => wikiTitleMatchesFood(page.title, expectedTitle));
          if (matchingPage?.title) {
            searchResultImage = matchingPage.thumbnail?.source || matchingPage.thumbnail?.url || "";
            if (!summaryData) summaryData = await fetchSummary(matchingPage.title);
          }
        }
      }

      if (!summaryData) throw new Error("No matching food article found");
      const summary = twoSentenceWikiSummary(summaryData.extract);
      if (!summary || requestId !== wikiRequestRef.current) return;
      setFoodDescription(summary);
      setFoodDescriptionImage(summaryData.thumbnail?.source || summaryData.originalimage?.source || searchResultImage);
      setFoodDescriptionSource(summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(summaryData.title.replaceAll(" ", "_"))}`);
    } catch {
      if (requestId !== wikiRequestRef.current) return;
      setFoodDescription("");
      setFoodDescriptionImage("");
      setFoodDescriptionSource("");
    } finally {
      if (requestId === wikiRequestRef.current) setFoodDescriptionLoading(false);
    }
  }

  async function detectCuisineFromDescription() {
    const description = cuisineDescription.trim();
    if (!description || predictingCuisine) return;

    setPredictingCuisine(true);
    setCuisinePredictionError("");
    setPredictedCuisines([]);
    setSelectedPredictedCuisine("");

    try {
      const response = await api.post(
        "/dineout/restaurants/predict-cuisine/",
        { description }
      );

      const cuisines = Array.isArray(response.data?.cuisines)
        ? response.data.cuisines
            .filter((item) => typeof item === "string" && item.trim())
            .map((item) => item.trim().replace(/\s+cuisine$/i, ""))
        : [];

      if (!cuisines.length) {
        setCuisinePredictionError(
          "I couldn't identify a cuisine. Try mentioning a region or dish."
        );
        return;
      }

      setPredictedCuisines(cuisines);
      const firstCuisine = cuisines[0].toLowerCase();
      setCuisine(firstCuisine);
      setSelectedPredictedCuisine(firstCuisine);
    } catch (error) {
      setCuisinePredictionError(
        error.response?.data?.detail ||
          "Cuisine detection is temporarily unavailable. Please try again."
      );
    } finally {
      setPredictingCuisine(false);
    }
  }

  function selectPredictedCuisine(label) {
    const cuisineQuery = String(label || "").trim().toLowerCase();
    if (!cuisineQuery) return;

    setCuisine(cuisineQuery);
    setSelectedPredictedCuisine(cuisineQuery);
    setCuisinePredictionError("");
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

      const matchesCuisine =
        cuisine === "All cuisines" ||
        cuisineValues.includes(cuisine) ||
        (restaurant.source === "google" && cuisine !== "All cuisines");
      const matchesOpen = !openNowOnly || openNowStatus(restaurant) === true;

      const matchesSearch = !query || `${name} ${cuisineText}`.toLowerCase().includes(query);
      const numericRating = Number(restaurant?.rating);
      const matchesRating = minimumRating === 0 || (restaurant?.rating != null && Number.isFinite(numericRating) && numericRating >= minimumRating);

      if (!matchesType || !matchesFood || !matchesCuisine || !matchesSearch || !matchesRating || !matchesOpen) return false;

      seen.add(key);

      return true;

    }).sort((a, b) => {
      if (restaurantSort === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0) || (Number(b.review_count) || 0) - (Number(a.review_count) || 0);
      if (restaurantSort === "reviews") return (Number(b.review_count) || 0) - (Number(a.review_count) || 0);
      return (Number(a.distance_km) || 0) - (Number(b.distance_km) || 0);
    });

  }, [restaurants, searchedRestaurantQuery, placeType, foodFilter, cuisine, selectedPredictedCuisine, restaurantSource, minimumRating, restaurantSort, openNowOnly]);

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

      const selectedCuisineLabel =
        selectedCuisine && selectedCuisine !== "All cuisines"
          ? selectedCuisine
          : "";
      const cravingDescription = cuisineDescription.trim();
      const googleCuisineSearch = sourceOverride !== "partner" && Boolean(
        selectedCuisineLabel || cravingDescription
      );
      const combinedSearchText = [
        cravingDescription,
        selectedCuisineLabel,
        queryOverride.trim(),
      ]
        .filter(Boolean)
        .join(" ");
      const googleSearchText = googleCuisineSearch && combinedSearchText
        ? (/\brestaurants?\b/i.test(combinedSearchText)
            ? combinedSearchText
            : `${combinedSearchText} restaurants`)
        : queryOverride.trim();

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
          search: googleCuisineSearch ? googleSearchText : queryOverride.trim(),
          ...(sourceOverride === "partner" && selectedCuisineLabel
            ? { cuisine: selectedCuisine }
            : {}),
        },

      });

      if (controller.signal.aborted || requestId !== restaurantRequestRef.current) return;

      const results = Array.isArray(response.data)

        ? response.data : response.data?.results || response.data?.restaurants || [];

      // Diagnostic: inspect the actual API URL and partner rows in the browser console.

      setRestaurants(results);

      const visibleSearchText =
        [cravingDescription, queryOverride.trim()].filter(Boolean).join(" ") ||
        selectedCuisineLabel;
      setSearchedRestaurantQuery(queryOverride.trim());

      // Keep the selected cuisine when refreshing search results.

      const searchedMetres = Number(response.data?.searched_radius_metres);

      const mappedCount = Number(response.data?.mapped_places_in_area);

      const areaMessage = locationSelected
        ? `Search radius: ${radiusKm} km. ${visibleSearchText ? `Searching for ${visibleSearchText}.` : "Showing nearby restaurants."}`
        : `Google Places search: ${visibleSearchText}. Results are not restricted to a radius.`;
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
    setGpsNotice("");
    setGpsOrigin(null);

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
    setGpsNotice("");
    setGpsOrigin(null);

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
    setGpsNotice("");
    setGpsOrigin(null);

  }

  /* ----------------------------------------------------------

     CURRENT LOCATION

  ---------------------------------------------------------- */

  function useCurrentLocation() {
    // GPS is optional: users can always select a city/area manually.
    setPageError("");
    setGpsNotice("");

    if (!navigator.geolocation) {
      setPageError("Your browser cannot access GPS. Type a city or area above and select a suggestion instead.");
      return;
    }

    if (!window.isSecureContext) {
      setPageError("Location requires HTTPS (or localhost). Type a city or area above instead.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGpsLoading(false);
        const latitude = Number(coords.latitude);
        const longitude = Number(coords.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setPageError("Could not read your coordinates. Enter a city or area manually.");
          return;
        }

        // Cancel older searches only after GPS succeeded, preserving manual search on failure.
        restaurantRequestRef.current += 1;
        restaurantAbortRef.current?.abort();
        setRestaurantLoading(false);
        autocompleteRequestRef.current += 1;
        skipAutocompleteRef.current = true;
        setLocation("Current location");
        setLocationSuggestions([]);
        setCoordinates({ latitude, longitude });
        setGpsOrigin({ lat: latitude, lng: longitude, accuracy: Number(coords.accuracy), timestamp: Date.now() });
        setMapCenter([latitude, longitude]);
        setLocationSelected(true);
        setRestaurants([]);
        setSelectedRestaurant(null);
        setHighlightedRestaurant(null);
        setSearchedLocation("");
        setPageError("");

        const accuracy = Number(coords.accuracy);
        setGpsNotice(
          Number.isFinite(accuracy)
            ? `Location detected (accuracy ±${Math.round(accuracy)} m). You can refine your search by selecting an area manually.`
            : "Location detected. You can refine your search by selecting an area manually."
        );
      },
      (error) => {
        setGpsLoading(false);
        const reason = error?.code === 1
          ? "Location permission was denied."
          : error?.code === 3
            ? "Location request timed out."
            : "Your current location is unavailable.";
        setPageError(`${reason} Type a city or area above, choose a suggestion, and press Search. GPS is not required for Dine Out.`);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }

  async function searchPlaces() {
    const hasSelectedCuisine = cuisine !== "All cuisines";
    const nameOrFoodQuery = restaurantQuery.trim() || cuisineDescription.trim();

    if (
      !locationSelected &&
      !nameOrFoodQuery &&
      !hasSelectedCuisine
    ) {
      setPageError("Select a location or describe a food/restaurant to search.");
      return;
    }
    if (!locationSelected && nameOrFoodQuery && nameOrFoodQuery.length < 2) {
      setPageError("Enter at least two characters for the food or restaurant search.");
      return;
    }
    // Name-only discovery uses other restaurants; partner discovery requires a selected area.
    if (!locationSelected && restaurantSource === "partner") {
      setPageError("Choose an area suggestion to search FoodKindl Partner restaurants, or switch to Other Restaurants for a name-only search.");
      return;
    }

    setLocationSuggestions([]);

    const foodQuery = cuisineDescription.trim() || restaurantQuery.trim();
    setSearchedFoodQuery(foodQuery);
    if (foodQuery) {
      void fetchWikipediaFoodDescription(foodQuery);
    } else {
      wikiRequestRef.current += 1;
      setFoodDescription("");
      setFoodDescriptionImage("");
      setFoodDescriptionSource("");
      setFoodDescriptionLoading(false);
    }

    setSearchedLocation(locationSelected ? location : "");

    setSearchedRestaurantQuery(restaurantQuery);

    await fetchRestaurants(coordinates.latitude, coordinates.longitude, cuisine);

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
    setFocusRequest(n => n + 1);

    setMapCenter([getLatitude(restaurant), getLongitude(restaurant)]);

    // Keep users in restaurant discovery; do not switch to the directions screen.
    window.requestAnimationFrame(() => {
      document.getElementById("dineout-map")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

        const latitude = Number(getLatitude(selectedRestaurant).toFixed(6));
    const longitude = Number(getLongitude(selectedRestaurant).toFixed(6));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      showCreateError("The selected restaurant has invalid coordinates.");
      return;
    }

    // Preserve the food that the host searched for so invitees can see it.
    const searchedFoodForInvite = String(
      searchedFoodQuery || cuisineDescription || restaurantQuery || ""
    ).trim();

    const rawMenuItems = Array.isArray(selectedRestaurant.menu_items)
      ? selectedRestaurant.menu_items
      : Array.isArray(selectedRestaurant.menu)
        ? selectedRestaurant.menu
        : [];

    const restaurantMenuItems = rawMenuItems
      .map((item) => {
        const menuItem = typeof item === "string" ? { name: item } : item || {};
        const image = menuItem.image_url || menuItem.photo_url || menuItem.image || "";
        return {
          name: menuItem.name || menuItem.title || menuItem.item_name || "",
          description: menuItem.description || "",
          image_url: image ? backendMediaUrl(image) : "",
        };
      })
      .filter((item) => item.name);

    const payload = {
      title: meetupTitle.trim(),
      description: meetupNotes.trim(),
      restaurant_external_id: String(selectedRestaurant.id || ""),
      restaurant_name: selectedRestaurant.name || "",
      restaurant_address: selectedRestaurant.address || selectedRestaurant.location_label || "",
      restaurant_cuisine: selectedRestaurant.cuisine || "",
      restaurant_phone: selectedRestaurant.phone || selectedRestaurant.phone_number || "",
      restaurant_website: safeWebsiteUrl(
        selectedRestaurant.website ||
        selectedRestaurant.websiteUri ||
        selectedRestaurant.website_uri ||
        selectedRestaurant.website_url
      ),
      restaurant_image_url: backendMediaUrl(
        selectedRestaurant.restaurant_image_url ||
        selectedRestaurant.photo_url ||
        selectedRestaurant.image_url ||
        selectedRestaurant.images?.[0]?.image_url ||
        selectedRestaurant.images?.[0]?.url
      ) || "",
      searched_food: searchedFoodForInvite,
      food_description: foodDescription || "",
      food_image_url: foodDescriptionImage || "",
      food_description_source: foodDescriptionSource || "",
      restaurant_menu_items: restaurantMenuItems,
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
      invited_member_ids: visibility === "invited_only" ? selectedMemberIds : [],
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

    <main className={`dineout-page fk-dashboard-shell${isPlanPage ? " dineout-plan-page" : ""}`}>
      {!isPlanPage && (
        <aside className="fk-dine-sidebar fk-filter-sidebar" aria-label="Restaurant filters">
          <div className="fk-filter-side-header">
            <div className="fk-filter-side-title"><Sparkles size={19} /> Filters</div>
            <p>Find your ideal dining spot.</p>
          </div>
          <div className="fk-filter-side-body">
            <div className="fk-side-group">
              <span className="fk-side-label">Restaurant source</span>
              <div className="fk-side-choice fk-side-source">
                <button type="button" className={restaurantSource === "partner" ? "active" : ""} aria-pressed={restaurantSource === "partner"} onClick={() => setRestaurantSource("partner")}>FoodKindl Partners</button>
                <button type="button" className={restaurantSource === "other" ? "active" : ""} aria-pressed={restaurantSource === "other"} onClick={() => setRestaurantSource("other")}>Other Restaurants</button>
              </div>
            </div>
            <div className="fk-side-group">
              <span className="fk-side-label">Place type</span>
              <div className="fk-side-choice">
                {PLACE_TYPES.map(([value,label]) => (
                  <button key={value} type="button" className={placeType === value ? "active" : ""} aria-pressed={placeType === value} onClick={() => setPlaceType(value)}>{label}</button>
                ))}
              </div>
            </div>
            <label className="fk-side-group fk-side-check">
              <input type="checkbox" checked={openNowOnly} onChange={e => setOpenNowOnly(e.target.checked)} />
              <span>Open now <small>Only places listed as open</small></span>
            </label>
            <label className="fk-side-group fk-side-field">
              <span className="fk-side-label">Minimum rating</span>
              <select value={minimumRating} onChange={e => setMinimumRating(Number(e.target.value))}>
                <option value={0}>Any rating</option><option value={3}>3.0★ and above</option>
                <option value={3.5}>3.5★ and above</option><option value={4}>4.0★ and above</option>
                <option value={4.5}>4.5★ and above</option>
              </select>
            </label>
            <div className="fk-side-group">
              <span className="fk-side-label">Food preference</span>
              <div className="fk-side-choice">
                {[["all", "All"], ["veg", "Vegetarian options"]].map(([value,label]) => (
                  <button type="button" key={value} className={foodFilter === value ? "active" : ""} aria-pressed={foodFilter === value} onClick={() => setFoodFilter(value)}>{label}</button>
                ))}
              </div>
            </div>
            <label className="fk-side-group fk-side-field">
              <span className="fk-side-label">Cuisine</span>
              <select value={cuisine} onChange={e => {
                setCuisine(e.target.value);
                setSelectedPredictedCuisine("");
              }}>
                <option value="All cuisines">All cuisines</option>
                {[...new Set([
                  ...availableCuisines,
                  ...predictedCuisines.map((item) => item.toLowerCase()),
                ])].map(item => <option value={item} key={item}>{cuisineLabel(item)}</option>)}
              </select>
            </label>

            <section className="fk-side-group fk-cuisine-assistant">
              <label className="fk-side-label" htmlFor="cuisine-description">
                What food are you craving?
              </label>
              <p className="fk-cuisine-help">
                Enter a cuisine or a specific dish. We’ll identify its cuisine,
                then search Google Maps for nearby restaurants.
              </p>

              <textarea
                id="cuisine-description"
                className="fk-cuisine-input"
                value={cuisineDescription}
                maxLength={1000}
                rows={3}
                placeholder="e.g. Classic lasagna, Bengali sweets, or Kerala seafood"
                onChange={(event) => {
                  setCuisineDescription(event.target.value);
                  wikiRequestRef.current += 1;
                  setFoodDescription("");
                  setFoodDescriptionImage("");
                  setFoodDescriptionSource("");
                  setFoodDescriptionLoading(false);
                  setCuisinePredictionError("");
                  setPredictedCuisines([]);
                  setSelectedPredictedCuisine("");
                  setCuisine("All cuisines");
                }}
              />

              <button
                type="button"
                className="fk-cuisine-detect-button"
                onClick={detectCuisineFromDescription}
                disabled={predictingCuisine || !cuisineDescription.trim()}
                aria-busy={predictingCuisine}
              >
                {predictingCuisine ? "Understanding your craving…" : "Find cuisine"}
              </button>

              {predictedCuisines.length > 0 && (
                <div className="fk-cuisine-results" role="status">
                  <span>Choose a cuisine to search nearby:</span>
                  <div className="fk-cuisine-chips">
                    {predictedCuisines.map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={
                          selectedPredictedCuisine === item.toLowerCase()
                            ? "is-selected"
                            : ""
                        }
                        aria-pressed={
                          selectedPredictedCuisine === item.toLowerCase()
                        }
                        onClick={() => selectPredictedCuisine(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cuisinePredictionError && (
                <p className="fk-cuisine-error" role="alert">
                  {cuisinePredictionError}
                </p>
              )}
            </section>
            <label className="fk-side-group fk-side-field">
              <span className="fk-side-label">Search radius: <strong>{radiusKm} km</strong></span>
              <div className="fk-radius-presets" aria-label="Choose search radius">
                {[5, 20].map((km) => (
                  <button
                    type="button"
                    key={km}
                    className={radiusKm === km ? "is-active" : ""}
                    aria-pressed={radiusKm === km}
                    onClick={() => setRadiusKm(km)}
                  >
                    {km} km
                  </button>
                ))}
              </div>
              <input type="range" min="1" max="20" step="1" value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))} />
            </label>
            <button type="button" className="fk-side-reset" onClick={() => {
              setRestaurantSource("other"); setPlaceType("all"); setOpenNowOnly(false);
              setMinimumRating(0); setFoodFilter("all"); setCuisine("All cuisines");
              setCuisineDescription(""); setPredictedCuisines([]); setSelectedPredictedCuisine("");
              setRadiusKm(5);
            }}>↺ Reset filters</button>
            <p className="fk-side-footnote">Radius applies when an area is selected. Some filters require listing data.</p>
          </div>
        </aside>
      )}
      <div className="fk-dine-main-content">

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

      <div className="fk-search-panel fk-discovery-panel">
        <section className="location-card fk-discovery-card" aria-label="Discover restaurants">
          <div className="fk-section-head">
            <span className="fk-section-symbol"><MapPin size={20}/></span>
            <div><h2>Find your next dining spot</h2><p>Choose an area, or look up a restaurant by name.</p></div>
          </div>
          <div className="fk-discovery-fields">
            <div className="fk-discovery-location">
              <label htmlFor="fk-area-input">City, area or landmark</label>
              <div className="fk-location-row">
                <div className="location-input-wrap">
                  <MapPin size={19}/>
                  <input id="fk-area-input" type="text" value={location} onChange={handleLocationChange}
                    placeholder="e.g. Indiranagar, Bengaluru" autoComplete="off"/>
                  {location && <button type="button" className="icon-button" onClick={clearLocation} aria-label="Clear location"><X size={18}/></button>}
                </div>
                <button type="button" className="secondary-button fk-gps-button" onClick={useCurrentLocation} disabled={gpsLoading}
                  aria-busy={gpsLoading}>
                  <Navigation size={17}/>{gpsLoading ? "Detecting..." : "Use my location"}
                </button>
              </div>
              {gpsLoading && <p className="search-status" role="status">Detecting your location...</p>}
              {!gpsLoading && gpsNotice && <p className="fk-location-success" role="status">📍 {gpsNotice}</p>}
              {!gpsLoading && locationSelected && !gpsNotice && <p className="fk-location-success" role="status">✓ Area selected. Search nearby restaurants below.</p>}
              {locationLoading && <p className="search-status" role="status">Finding areas...</p>}
              {locationSuggestions.length > 0 && <div className="location-suggestions">
                {locationSuggestions.map((place, index) => <button key={place.id || index}
                  type="button" className="location-suggestion" onClick={() => selectLocation(place)}>
                  <MapPin size={18}/><span><strong>{place.name || place.display_name}</strong>
                  <small>{place.display_name || ""}</small></span>
                </button>)}
              </div>}
              {!locationSelected && !gpsLoading && !locationLoading && !pageError && (
                <p className="fk-help-text">Location is optional. Search by area or restaurant name.</p>
              )}
            </div>
            <div className="fk-discovery-name">
              <label htmlFor="fk-restaurant-input">Restaurant name (optional)</label>
              <div className="fk-name-search"><Search size={18}/>
                <input id="fk-restaurant-input" type="search" value={restaurantQuery}
                  onChange={e => setRestaurantQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") void searchPlaces(); }}
                  placeholder="Search restaurant name, cuisine or keyword"/>
              </div>
              <p className="fk-help-text">Leave blank to discover restaurants in your selected area.</p>
            </div>
          </div>
          {selectedPredictedCuisine && (
            <p className="fk-cuisine-selection-message" role="status">
              ✓ You chose <strong>{cuisineLabel(selectedPredictedCuisine)}</strong> cuisine
              {cuisineDescription.trim() && <> for <strong>{cuisineDescription.trim()}</strong></>}.
              {" "}Search within <strong>{radiusKm} km</strong> of {gpsOrigin ? "your current location" : "your selected area"},
              {" "}then press <strong>Search Restaurants</strong>.
            </p>
          )}
          <button className="primary-button fk-search-submit" type="button" onClick={searchPlaces}
            disabled={restaurantLoading} aria-busy={restaurantLoading}>
            <Search size={18}/>{restaurantLoading ? "Searching restaurants..." : "Search Restaurants"}
          </button>
        </section>
      </div>

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

            <div className="fk-results-tools">
              <span>{visibleRestaurants.length} {visibleRestaurants.length === 1 ? "place" : "places"}</span>
              <label>Sort by <select value={restaurantSort} onChange={e => setRestaurantSort(e.target.value)}>
                <option value="distance">Nearest first</option>
                <option value="rating">Highest rated</option>
                <option value="reviews">Most reviewed</option>
              </select></label>
            </div>

          </div>

          {searchCoverage && <p className="search-status" role="status">{searchCoverage}</p>}
          {searchCoverage && cuisineDescription.trim() && (
            <aside className="fk-dish-explainer" aria-live="polite">
              <strong>About {cuisineDescription.trim()}</strong>
              <p>{foodDescriptionLoading ? "Loading a short Wikipedia description…" : foodDescription || "A Wikipedia description will appear here when a matching article is found."}</p>
              {foodDescriptionSource && <a className="fk-wiki-source" href={foodDescriptionSource} target="_blank" rel="noopener noreferrer">Source: Wikipedia</a>}
            </aside>
          )}

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

                    : "Enter an area or restaurant name, then press Search Restaurants."}

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
                {openNowStatus(restaurant) === true && <span className="fk-open-badge">● Open now</span>}
                {openNowStatus(restaurant) === false && <span className="fk-closed-badge">Closed now</span>}

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
                    className="secondary-button fk-view-details-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openRestaurantDetails(restaurant);
                    }}
                  >
                    View details <ChevronRight size={16} />
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

        <aside id="dineout-map" className="map-panel fk-dine-map-card" aria-label="Restaurant map">
          <div className="fk-dine-map-heading">
            <div>
              <span className="fk-dine-map-eyebrow">EXPLORE THE AREA</span>
              <h2>{highlightedRestaurant ? highlightedRestaurant.name : "Restaurants near you"}</h2>
              <p>{highlightedRestaurant ? "Only this restaurant is shown · route from your location" : `${visibleRestaurants.length} restaurant locations`}</p>
            </div>
            {highlightedRestaurant && (
              <button type="button" className="fk-dine-map-reset" onClick={() => setHighlightedRestaurant(null)}>
                Show all restaurants
              </button>
            )}
          </div>
          <div className="fk-dine-map-canvas">
            <FocusedRestaurantMap
              center={mapCenter}
              restaurants={highlightedRestaurant ? [] : visibleRestaurants}
              highlightedRestaurant={highlightedRestaurant}
              focusRequest={focusRequest}
              currentLocation={gpsOrigin}
              onSelect={viewRestaurantOnMap}
            />
          </div>
          {highlightedRestaurant ? (
            <div className="fk-dine-selected-summary">
              <strong>{highlightedRestaurant.name}</strong>
              <span>{highlightedRestaurant.address || highlightedRestaurant.location_label || "Restaurant location"}</span>
              <div className="fk-dine-map-actions">
                <button type="button" onClick={() => setDetailsRestaurant(highlightedRestaurant)}>View details</button>
                <button type="button" className="fk-dine-map-primary" onClick={() => chooseRestaurant(highlightedRestaurant)}>Plan a Dine Out</button>
              </div>
            </div>
          ) : (
            <p className="fk-dine-map-tip">Select a restaurant or click <b>View on map</b> to focus its pin.</p>
          )}
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

      <RestaurantDetailsSection

        restaurant={detailsRestaurant}

        onClose={() => setDetailsRestaurant(null)}

        onChoose={chooseRestaurant}

        onNavigate={startRestaurantNavigation}
        searchedFood={searchedFoodQuery}
        foodDescription={foodDescription}
        foodDescriptionImage={foodDescriptionImage}
        foodDescriptionLoading={foodDescriptionLoading}
        foodDescriptionSource={foodDescriptionSource}
      />

      </div>
    </main>

  );

}
