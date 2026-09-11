
import React, {
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";

import api from "../api";
import PeopleSelector from "./PeopleSelector";

import "leaflet/dist/leaflet.css";
import "../styles/FoodInvites.css";

const INVITES_ENDPOINT =
  "/food-invites/";

// Change this only if your AI Kitchen uses a different route.
const AI_KITCHEN_ROUTE =
  "/ai-kitchen";

// ============================================================
// FOODKINDL OPENSTREETMAP MARKER
// ============================================================

const foodKindlMarker =
  L.divIcon({
    className:
      "foodkindl-map-marker",

    html: `
      <div class="foodkindl-map-pin">
        📍
      </div>
    `,

    iconSize: [44, 44],
    iconAnchor: [22, 42],
    popupAnchor: [0, -38],
  });

// ============================================================
// INITIAL FORM
// ============================================================

const INITIAL_FORM = {
  title: "",
  description: "",
  cuisine: "",
  dishes_planned: "",
  dietary_notes: "",

  start_date: "",
  start_time: "",
  end_date: "",
  end_time: "",

  cook_venue_type:
    "home",

  venue_name: "",
  location_label: "",
  private_address: "",

  latitude: "",
  longitude: "",

  max_participants: 4,

  kitchen_contribution:
    "",

  what_to_bring: "",

  verified_only: false,
  women_only: false,

  recipients: [],
};

// ============================================================
// HELPERS
// ============================================================

function getBackendError(
  error
) {
  const data =
    error?.response?.data;

  if (
    typeof data?.detail ===
    "string"
  ) {
    return data.detail;
  }

  if (
    typeof data?.error ===
    "string"
  ) {
    return data.error;
  }

  if (
    typeof data?.message ===
    "string"
  ) {
    return data.message;
  }

  if (
    data &&
    typeof data ===
      "object"
  ) {
    const firstEntry =
      Object.entries(
        data
      )[0];

    if (firstEntry) {
      const [
        field,
        value,
      ] = firstEntry;

      if (
        Array.isArray(
          value
        )
      ) {
        return `${field}: ${value.join(
          ", "
        )}`;
      }

      return `${field}: ${String(
        value
      )}`;
    }
  }

  if (
    error?.message ===
    "Network Error"
  ) {
    return "Unable to connect to the FoodKindl server.";
  }

  return (
    error?.message ||
    "Unable to create Cook Together invite."
  );
}

function combineDateAndTime(
  date,
  time
) {
  if (
    !date ||
    !time
  ) {
    return null;
  }

  const value =
    new Date(
      `${date}T${time}`
    );

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    return null;
  }

  return value.toISOString();
}

function openNativePicker(
  ref
) {
  const input =
    ref?.current;

  if (!input) {
    return;
  }

  if (
    typeof input.showPicker ===
    "function"
  ) {
    try {
      input.showPicker();
      return;
    } catch {
      // fall through
    }
  }

  input.focus();
  input.click();
}

// ============================================================
// CLICKABLE OPENSTREETMAP
// ============================================================

function LocationPicker({
  onPick,
}) {
  useMapEvents({
    click(event) {
      onPick(
        event.latlng.lat,
        event.latlng.lng
      );
    },
  });

  return null;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CookTogether() {
  const navigate =
    useNavigate();

  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(false);

  const startDateRef =
    useRef(null);

  const startTimeRef =
    useRef(null);

  const endDateRef =
    useRef(null);

  const endTimeRef =
    useRef(null);

  // ==========================================================
  // FIELD UPDATE
  // ==========================================================

  function updateField(
    field,
    value
  ) {
    setForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );

    if (error) {
      setError("");
    }
  }

  // ==========================================================
  // AI KITCHEN
  // ==========================================================

  function openAIKitchen() {
    const params =
      new URLSearchParams();

    params.set(
      "source",
      "cook-together"
    );

    if (
      form.cuisine.trim()
    ) {
      params.set(
        "cuisine",
        form.cuisine.trim()
      );
    }

    if (
      form.dishes_planned.trim()
    ) {
      params.set(
        "dish",
        form.dishes_planned.trim()
      );
    }

    if (
      form.dietary_notes.trim()
    ) {
      params.set(
        "dietary_notes",
        form.dietary_notes.trim()
      );
    }

    params.set(
      "servings",
      String(
        form.max_participants ||
        2
      )
    );

    navigate(
      `${AI_KITCHEN_ROUTE}?${params.toString()}`,
      {
        state: {
          source:
            "cook-together",

          cookTogetherDraft:
            form,
        },
      }
    );
  }

  // ==========================================================
  // SET MAP LOCATION
  // ==========================================================

  function setCoordinates(
    latitude,
    longitude
  ) {
    setForm(
      (previous) => ({
        ...previous,

        latitude:
          Number(
            latitude
          ).toFixed(6),

        longitude:
          Number(
            longitude
          ).toFixed(6),
      })
    );
  }

  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  function useCurrentLocation() {
    setError("");

    if (
      !navigator.geolocation
    ) {
      setError(
        "Location is not supported by this browser."
      );

      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates(
          position.coords.latitude,
          position.coords.longitude
        );

        setLocationLoading(false);
      },

      (geoError) => {
        console.error(
          "GEOLOCATION ERROR:",
          geoError
        );

        setError(
          "Unable to access your current location. Allow location access or select the place on the map."
        );

        setLocationLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }

  // ==========================================================
  // DERIVED MAP VALUES
  // ==========================================================

  const latitude =
    Number(
      form.latitude
    );

  const longitude =
    Number(
      form.longitude
    );

  const hasMapLocation =
    form.latitude !== "" &&
    form.longitude !== "" &&
    Number.isFinite(
      latitude
    ) &&
    Number.isFinite(
      longitude
    );

  // Bengaluru fallback.
  const mapCenter =
    hasMapLocation
      ? [
          latitude,
          longitude,
        ]
      : [
          13.0827,
          77.5946,
        ];

  // ==========================================================
  // SUBMIT
  // ==========================================================

  async function submit(
    event
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (
        !form.title.trim()
      ) {
        throw new Error(
          "Please enter a title."
        );
      }

      if (
        !form.start_date ||
        !form.start_time
      ) {
        throw new Error(
          "Please select the start date and start time."
        );
      }

      const startAt =
        combineDateAndTime(
          form.start_date,
          form.start_time
        );

      if (!startAt) {
        throw new Error(
          "Please enter a valid start date and time."
        );
      }

      let endAt = null;

      if (
        form.end_date ||
        form.end_time
      ) {
        if (
          !form.end_date ||
          !form.end_time
        ) {
          throw new Error(
            "Please select both the end date and end time."
          );
        }

        endAt =
          combineDateAndTime(
            form.end_date,
            form.end_time
          );

        if (!endAt) {
          throw new Error(
            "Please enter a valid end date and time."
          );
        }

        if (
          new Date(endAt) <=
          new Date(startAt)
        ) {
          throw new Error(
            "End date and time must be after the start date and time."
          );
        }
      }

      if (
        Number(
          form.max_participants
        ) < 2
      ) {
        throw new Error(
          "Maximum participants must be at least 2."
        );
      }

      if (
        form.recipients
          .length === 0
      ) {
        throw new Error(
          "Please invite at least one FoodKindl member."
        );
      }

      const payloadLatitude =
        form.latitude === ""
          ? null
          : Number(
              form.latitude
            );

      const payloadLongitude =
        form.longitude === ""
          ? null
          : Number(
              form.longitude
            );

      if (
        (
          payloadLatitude ===
          null
        ) !==
        (
          payloadLongitude ===
          null
        )
      ) {
        throw new Error(
          "Please provide both latitude and longitude."
        );
      }

      if (
        payloadLatitude !==
          null &&
        (
          !Number.isFinite(
            payloadLatitude
          ) ||
          payloadLatitude <
            -90 ||
          payloadLatitude >
            90
        )
      ) {
        throw new Error(
          "Latitude must be between -90 and 90."
        );
      }

      if (
        payloadLongitude !==
          null &&
        (
          !Number.isFinite(
            payloadLongitude
          ) ||
          payloadLongitude <
            -180 ||
          payloadLongitude >
            180
        )
      ) {
        throw new Error(
          "Longitude must be between -180 and 180."
        );
      }

      const payload = {
        invite_type:
          "cook_together",

        title:
          form.title.trim(),

        description:
          form.description.trim(),

        cuisine:
          form.cuisine.trim(),

        start_at:
          startAt,

        end_at:
          endAt,

        cook_venue_type:
          form.cook_venue_type,

        venue_name:
          form.venue_name.trim(),

        location_label:
          form.location_label.trim(),

        private_address:
          form.private_address.trim(),

        latitude:
          payloadLatitude,

        longitude:
          payloadLongitude,

        max_participants:
          Number(
            form.max_participants
          ),

        kitchen_contribution:
          form.kitchen_contribution ===
          ""
            ? 0
            : Number(
                form.kitchen_contribution
              ),

        verified_only:
          Boolean(
            form.verified_only
          ),

        women_only:
          Boolean(
            form.women_only
          ),

        // IMPORTANT: backend expects this field.
        recipient_user_ids:
          form.recipients,

        // Keep these only if your backend model/serializer supports them.
        dishes_planned:
          form.dishes_planned.trim(),

        dietary_notes:
          form.dietary_notes.trim(),

        what_to_bring:
          form.what_to_bring.trim(),
      };

      console.log(
        "COOK TOGETHER PAYLOAD:",
        payload
      );

      const response =
        await api.post(
          INVITES_ENDPOINT,
          payload
        );

      const createdInvite =
        response?.data;

      if (
        createdInvite?.id
      ) {
        navigate(
          `/food-invites/${createdInvite.id}`,
          {
            replace: true,
          }
        );

        return;
      }

      navigate(
        "/food-invites",
        {
          replace: true,
        }
      );
    } catch (
      requestError
    ) {
      console.error(
        "CREATE COOK TOGETHER ERROR:",
        requestError?.response?.status,
        requestError?.response?.data,
        requestError
      );

      setError(
        getBackendError(
          requestError
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main className="fi-page">

      {/* HERO */}

      <section className="fi-hero">

        <div>
          <span className="fi-eyebrow">
            🍳 COOK TOGETHER
          </span>

          <h1>
            Cook, share and connect.
          </h1>

          <p>
            Plan what you will cook,
            choose the venue and invite
            FoodKindl members.
          </p>
        </div>

        <button
          type="button"
          className="fi-secondary"
          onClick={() =>
            navigate(
              "/food-invites"
            )
          }
        >
          ← Food Invites
        </button>

      </section>

      {/* FORM */}

      <form
        className="fi-create-card"
        onSubmit={submit}
      >

        <div className="fi-form-heading">

          <div>
            <span className="fi-eyebrow">
              CREATE COOK TOGETHER
            </span>

            <h2>
              Plan the cooking experience
            </h2>
          </div>

          <span className="fi-private-note">
            Exact/private addresses should
            only be shared with accepted guests.
          </span>

        </div>

        <div className="fi-grid">

          {/* TITLE */}

          <label className="fi-field fi-span-2">
            <span>
              Title *
            </span>

            <input
              required
              value={
                form.title
              }
              onChange={(
                event
              ) =>
                updateField(
                  "title",
                  event.target.value
                )
              }
              placeholder="Sunday Kerala lunch together"
            />
          </label>

          {/* DESCRIPTION */}

          <label className="fi-field fi-span-2">
            <span>
              Description
            </span>

            <textarea
              rows={4}
              value={
                form.description
              }
              onChange={(
                event
              ) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              placeholder="Tell people what you're planning and what to expect."
            />
          </label>

          {/* CUISINE */}

          <label className="fi-field">
            <span>
              Cuisine
            </span>

            <input
              value={
                form.cuisine
              }
              onChange={(
                event
              ) =>
                updateField(
                  "cuisine",
                  event.target.value
                )
              }
              placeholder="Kerala, Italian, North Indian..."
            />
          </label>

          {/* DISH + AI KITCHEN */}

          <div className="fi-field">
            <span>
              What are you cooking?
            </span>

            <input
              value={
                form.dishes_planned
              }
              onChange={(
                event
              ) =>
                updateField(
                  "dishes_planned",
                  event.target.value
                )
              }
              placeholder="Appam, stew, sadya..."
            />

            <div className="fi-ai-mini">

              <div className="fi-ai-mini-copy">

                <strong>
                  ✨ Need inspiration?
                </strong>

                <small>
                  Find a dish, recipe and
                  ingredients with AI Kitchen.
                </small>

              </div>

              <button
                type="button"
                className="fi-ai-mini-button"
                onClick={
                  openAIKitchen
                }
              >
                Open AI Kitchen →
              </button>

            </div>

          </div>

          {/* START DATE */}

          <label className="fi-field">
            <span>
              Start date *
            </span>

            <div className="fi-picker-shell">

              <input
                ref={
                  startDateRef
                }
                required
                type="date"
                className="fi-picker-input"
                value={
                  form.start_date
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "start_date",
                    event.target.value
                  )
                }
              />

              <button
                type="button"
                className="fi-picker-button"
                aria-label="Open start date calendar"
                onClick={() =>
                  openNativePicker(
                    startDateRef
                  )
                }
              >
                📅
              </button>

            </div>
          </label>

          {/* START TIME */}

          <label className="fi-field">
            <span>
              Start time *
            </span>

            <div className="fi-picker-shell">

              <input
                ref={
                  startTimeRef
                }
                required
                type="time"
                className="fi-picker-input"
                value={
                  form.start_time
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "start_time",
                    event.target.value
                  )
                }
              />

              <button
                type="button"
                className="fi-picker-button"
                aria-label="Open start time clock"
                onClick={() =>
                  openNativePicker(
                    startTimeRef
                  )
                }
              >
                🕒
              </button>

            </div>
          </label>

          {/* END DATE */}

          <label className="fi-field">
            <span>
              End date
            </span>

            <div className="fi-picker-shell">

              <input
                ref={
                  endDateRef
                }
                type="date"
                className="fi-picker-input"
                value={
                  form.end_date
                }
                min={
                  form.start_date ||
                  undefined
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "end_date",
                    event.target.value
                  )
                }
              />

              <button
                type="button"
                className="fi-picker-button"
                aria-label="Open end date calendar"
                onClick={() =>
                  openNativePicker(
                    endDateRef
                  )
                }
              >
                📅
              </button>

            </div>
          </label>

          {/* END TIME */}

          <label className="fi-field">
            <span>
              End time
            </span>

            <div className="fi-picker-shell">

              <input
                ref={
                  endTimeRef
                }
                type="time"
                className="fi-picker-input"
                value={
                  form.end_time
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "end_time",
                    event.target.value
                  )
                }
              />

              <button
                type="button"
                className="fi-picker-button"
                aria-label="Open end time clock"
                onClick={() =>
                  openNativePicker(
                    endTimeRef
                  )
                }
              >
                🕒
              </button>

            </div>
          </label>

          {/* ONE VENUE TYPE FIELD */}

          <label className="fi-field">
            <span>
              Cooking venue *
            </span>

            <select
              required
              value={
                form.cook_venue_type
              }
              onChange={(
                event
              ) =>
                updateField(
                  "cook_venue_type",
                  event.target.value
                )
              }
            >
              <option value="home">
                Home
              </option>

              <option value="clubhouse">
                Clubhouse
              </option>

              <option value="other">
                Other Venue
              </option>
            </select>
          </label>

          {/* VENUE NAME */}

          <label className="fi-field">
            <span>
              Venue name
            </span>

            <input
              value={
                form.venue_name
              }
              onChange={(
                event
              ) =>
                updateField(
                  "venue_name",
                  event.target.value
                )
              }
              placeholder={
                form.cook_venue_type ===
                "home"
                  ? "My home"
                  : form.cook_venue_type ===
                    "clubhouse"
                  ? "Tower clubhouse"
                  : "Venue name"
              }
            />
          </label>

          {/* PUBLIC AREA */}

          <label className="fi-field">
            <span>
              Public area
            </span>

            <input
              value={
                form.location_label
              }
              onChange={(
                event
              ) =>
                updateField(
                  "location_label",
                  event.target.value
                )
              }
              placeholder="Nagasandra, Bengaluru"
            />
          </label>

          {/* MAX */}

          <label className="fi-field">
            <span>
              Maximum participants
            </span>

            <input
              type="number"
              min="2"
              value={
                form.max_participants
              }
              onChange={(
                event
              ) =>
                updateField(
                  "max_participants",
                  event.target.value
                )
              }
            />
          </label>

          {/* PRIVATE ADDRESS */}

          <label className="fi-field fi-span-2">
            <span>
              Exact/private address
            </span>

            <input
              value={
                form.private_address
              }
              onChange={(
                event
              ) =>
                updateField(
                  "private_address",
                  event.target.value
                )
              }
              placeholder="Full address — shown only to accepted guests"
            />
          </label>

          {/* LATITUDE */}

          <label className="fi-field">
            <span>
              Latitude
            </span>

            <input
              type="number"
              step="0.000001"
              min="-90"
              max="90"
              value={
                form.latitude
              }
              onChange={(
                event
              ) =>
                updateField(
                  "latitude",
                  event.target.value
                )
              }
              placeholder="13.045000"
            />
          </label>

          {/* LONGITUDE */}

          <label className="fi-field">
            <span>
              Longitude
            </span>

            <input
              type="number"
              step="0.000001"
              min="-180"
              max="180"
              value={
                form.longitude
              }
              onChange={(
                event
              ) =>
                updateField(
                  "longitude",
                  event.target.value
                )
              }
              placeholder="77.500000"
            />
          </label>

          {/* LOCATION BUTTON */}

          <div className="fi-span-2">

            <button
              type="button"
              className="fi-secondary"
              disabled={
                locationLoading
              }
              onClick={
                useCurrentLocation
              }
            >
              {locationLoading
                ? "Getting location..."
                : "📍 Use my current location"}
            </button>

          </div>

          {/* OPENSTREETMAP */}

          <div className="fi-field fi-span-2">

            <span>
              Select meeting location on map
            </span>

            <div className="fi-map-helper">
              Click anywhere on the OpenStreetMap
              to set latitude and longitude.
            </div>

            <div className="fi-osm-container">

              <MapContainer
                key={`${mapCenter[0]}-${mapCenter[1]}`}
                center={
                  mapCenter
                }
                zoom={
                  hasMapLocation
                    ? 16
                    : 11
                }
                scrollWheelZoom={
                  true
                }
                className="fi-osm-map"
              >

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <LocationPicker
                  onPick={
                    setCoordinates
                  }
                />

                {hasMapLocation && (
                  <Marker
                    position={[
                      latitude,
                      longitude,
                    ]}
                    icon={
                      foodKindlMarker
                    }
                  >

                    <Popup>
                      <strong>
                        {form.venue_name ||
                          "FoodKindl meetup"}
                      </strong>

                      <br />

                      {form.location_label ||
                        "Selected meeting location"}
                    </Popup>

                  </Marker>
                )}

              </MapContainer>

            </div>

            {hasMapLocation && (
              <div className="fi-map-coordinates">
                📍 Selected:{" "}
                {form.latitude},{" "}
                {form.longitude}
              </div>
            )}

          </div>

          {/* CONTRIBUTION */}

          <label className="fi-field">
            <span>
              Kitchen contribution ₹
            </span>

            <input
              type="number"
              min="0"
              value={
                form.kitchen_contribution
              }
              onChange={(
                event
              ) =>
                updateField(
                  "kitchen_contribution",
                  event.target.value
                )
              }
              placeholder="Optional"
            />
          </label>

          {/* BRING */}

          <label className="fi-field">
            <span>
              What should guests bring?
            </span>

            <input
              value={
                form.what_to_bring
              }
              onChange={(
                event
              ) =>
                updateField(
                  "what_to_bring",
                  event.target.value
                )
              }
              placeholder="Nothing / dessert / ingredients..."
            />
          </label>

          {/* DIETARY */}

          <label className="fi-field fi-span-2">
            <span>
              Dietary notes
            </span>

            <textarea
              rows={3}
              value={
                form.dietary_notes
              }
              onChange={(
                event
              ) =>
                updateField(
                  "dietary_notes",
                  event.target.value
                )
              }
              placeholder="Vegetarian options, allergies, halal, no nuts..."
            />
          </label>

          {/* PEOPLE */}

          <div className="fi-span-2">

            <PeopleSelector
              selectedIds={
                form.recipients
              }
              onChange={(
                selectedUserIds
              ) =>
                updateField(
                  "recipients",
                  selectedUserIds
                )
              }
              label="Invite FoodKindl members"
              helperText="Choose registered FoodKindl members to invite."
              maxSelections={Math.max(
                Number(
                  form.max_participants
                ) - 1,
                1
              )}
            />

          </div>

        </div>

        {/* SAFETY */}

        <div className="fi-options">

          <label>

            <input
              type="checkbox"
              checked={
                form.verified_only
              }
              onChange={(
                event
              ) =>
                updateField(
                  "verified_only",
                  event.target.checked
                )
              }
            />

            Verified profiles only

          </label>

          <label>

            <input
              type="checkbox"
              checked={
                form.women_only
              }
              onChange={(
                event
              ) =>
                updateField(
                  "women_only",
                  event.target.checked
                )
              }
            />

            Women-only invite

          </label>

        </div>

        {/* ERROR */}

        {error && (
          <div className="fi-alert fi-error">
            {error}
          </div>
        )}

        {/* ACTIONS */}

        <div className="fi-form-actions">

          <button
            type="button"
            className="fi-secondary"
            onClick={() =>
              navigate(
                "/food-invites"
              )
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="fi-primary"
            disabled={
              saving
            }
          >
            {saving
              ? "Creating..."
              : "Create Cook Together"}
          </button>

        </div>

      </form>

    </main>
  );
}
