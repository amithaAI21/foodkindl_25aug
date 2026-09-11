
import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
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

  return (
    error?.message ||
    "Unable to update this Food Invite."
  );
}

function splitDateTime(
  value
) {
  if (!value) {
    return {
      date: "",
      time: "",
    };
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      date: "",
      time: "",
    };
  }

  const pad =
    (number) =>
      String(number)
        .padStart(
          2,
          "0"
        );

  return {
    date:
      `${date.getFullYear()}-${pad(
        date.getMonth() + 1
      )}-${pad(
        date.getDate()
      )}`,

    time:
      `${pad(
        date.getHours()
      )}:${pad(
        date.getMinutes()
      )}`,
  };
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

  const result =
    new Date(
      `${date}T${time}`
    );

  if (
    Number.isNaN(
      result.getTime()
    )
  ) {
    return null;
  }

  return result.toISOString();
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
      // Fallback below
    }
  }

  input.focus();
  input.click();
}

const EMPTY_FORM = {
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

export default function EditFoodInvite() {
  const navigate =
    useNavigate();

  const {
    inviteId,
  } = useParams();

  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

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

  useEffect(() => {
    loadInvite();
  }, [inviteId]);

  function updateField(
    field,
    value
  ) {
    setForm(
      (previous) => ({
        ...previous,
        [field]:
          value,
      })
    );

    if (error) {
      setError("");
    }
  }

  async function loadInvite() {
    setLoading(true);
    setError("");

    try {
      const response =
        await api.get(
          `/food-invites/${inviteId}/`
        );

      const invite =
        response?.data;

      if (!invite) {
        throw new Error(
          "Food Invite not found."
        );
      }

      const isCreator =
        Boolean(
          invite.is_creator ||
          invite.created_by_me ||
          invite.creator_is_me
        );

      if (!isCreator) {
        setError(
          "Only the creator can edit this Food Invite."
        );

        setLoading(false);

        return;
      }

      const start =
        splitDateTime(
          invite.start_at
        );

      const end =
        splitDateTime(
          invite.end_at
        );

      const participantIds =
        Array.isArray(
          invite.participants
        )
          ? invite.participants
              .filter(
                (participant) =>
                  participant?.status !==
                  "declined"
              )
              .map(
                (participant) =>
                  participant?.user_id ??
                  participant?.id
              )
              .filter(
                (id) =>
                  id != null
              )
          : [];

      setForm({
        title:
          invite.title || "",

        description:
          invite.description || "",

        cuisine:
          invite.cuisine || "",

        dishes_planned:
          invite.dishes_planned ||
          "",

        dietary_notes:
          invite.dietary_notes ||
          "",

        start_date:
          start.date,

        start_time:
          start.time,

        end_date:
          end.date,

        end_time:
          end.time,

        cook_venue_type:
          invite.cook_venue_type ||
          "home",

        venue_name:
          invite.venue_name ||
          "",

        location_label:
          invite.location_label ||
          "",

        private_address:
          invite.private_address ||
          "",

        latitude:
          invite.latitude ??
          "",

        longitude:
          invite.longitude ??
          "",

        max_participants:
          invite.max_participants ??
          4,

        kitchen_contribution:
          invite.kitchen_contribution ??
          "",

        what_to_bring:
          invite.what_to_bring ||
          "",

        verified_only:
          Boolean(
            invite.verified_only
          ),

        women_only:
          Boolean(
            invite.women_only
          ),

        recipients:
          participantIds,
      });
    } catch (
      requestError
    ) {
      console.error(
        "LOAD EDIT INVITE ERROR:",
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
      setLoading(false);
    }
  }

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

      () => {
        setError(
          "Unable to access your current location."
        );

        setLocationLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

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

      const startAt =
        combineDateAndTime(
          form.start_date,
          form.start_time
        );

      if (!startAt) {
        throw new Error(
          "Please select a valid start date and time."
        );
      }

      let endAt =
        null;

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

        if (
          !endAt ||
          new Date(endAt) <=
            new Date(startAt)
        ) {
          throw new Error(
            "End date/time must be after start date/time."
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

      const payload = {
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
          form.latitude === ""
            ? null
            : Number(
                form.latitude
              ),

        longitude:
          form.longitude === ""
            ? null
            : Number(
                form.longitude
              ),

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

        recipient_user_ids:
          form.recipients,

        dishes_planned:
          form.dishes_planned.trim(),

        dietary_notes:
          form.dietary_notes.trim(),

        what_to_bring:
          form.what_to_bring.trim(),
      };

      console.log(
        "EDIT FOOD INVITE PAYLOAD:",
        payload
      );

      await api.patch(
        `/food-invites/${inviteId}/`,
        payload
      );

      navigate(
        `/food-invites/${inviteId}`,
        {
          replace: true,
        }
      );
    } catch (
      requestError
    ) {
      console.error(
        "EDIT FOOD INVITE ERROR:",
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

  if (loading) {
    return (
      <main className="fi-page">
        <div className="fi-empty">
          Loading Food Invite...
        </div>
      </main>
    );
  }

  return (
    <main className="fi-page">

      <section className="fi-hero">
        <div>
          <span className="fi-eyebrow">
            ✏️ EDIT COOK TOGETHER
          </span>

          <h1>
            Update your food moment.
          </h1>

          <p>
            Change the meal,
            guests, time,
            location or other
            invite details.
          </p>
        </div>

        <button
          type="button"
          className="fi-secondary"
          onClick={() =>
            navigate(
              `/food-invites/${inviteId}`
            )
          }
        >
          ← Back to Invite
        </button>
      </section>

      <form
        className="fi-create-card"
        onSubmit={submit}
      >

        <div className="fi-form-heading">
          <div>
            <span className="fi-eyebrow">
              EDIT INVITE
            </span>

            <h2>
              Cook Together details
            </h2>
          </div>
        </div>

        <div className="fi-grid">

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
            />
          </label>

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
            />
          </label>

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
            />
          </label>

          <label className="fi-field">
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
            />
          </label>

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
            />
          </label>

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
            />
          </label>

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
            />
          </label>

          <label className="fi-field">
            <span>
              Latitude
            </span>

            <input
              type="number"
              step="0.000001"
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
            />
          </label>

          <label className="fi-field">
            <span>
              Longitude
            </span>

            <input
              type="number"
              step="0.000001"
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
            />
          </label>

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

          <div className="fi-field fi-span-2">
            <span>
              Update location on map
            </span>

            <div className="fi-map-helper">
              Click anywhere on
              OpenStreetMap to move
              the meeting point.
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
                      {form.venue_name ||
                        "FoodKindl meetup"}
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>

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
            />
          </label>

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
            />
          </label>

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
            />
          </label>

          <div className="fi-span-2">
            <PeopleSelector
              selectedIds={
                form.recipients
              }
              onChange={(
                selectedIds
              ) =>
                updateField(
                  "recipients",
                  selectedIds
                )
              }
              label="Invited FoodKindl members"
              helperText="Add or remove invited members."
              maxSelections={Math.max(
                Number(
                  form.max_participants
                ) - 1,
                1
              )}
            />
          </div>

        </div>

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

        {error && (
          <div className="fi-alert fi-error">
            {error}
          </div>
        )}

        <div className="fi-form-actions">
          <button
            type="button"
            className="fi-secondary"
            onClick={() =>
              navigate(
                `/food-invites/${inviteId}`
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
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>

      </form>

    </main>
  );
}
