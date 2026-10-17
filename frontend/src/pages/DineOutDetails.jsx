
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Calendar,
  Check,
  Clock,
  LocateFixed,
  Navigation,
  Eye,
  MapPin,
  ShieldCheck,
  Users,
  Utensils,
  X,
} from "lucide-react";

import { Link, useParams } from "react-router-dom";

import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import api from "../api";
import DineOutBookingPanel from "../components/DineOutBookingPanel";

import "leaflet/dist/leaflet.css";
import "../styles/DineOutDetails.css";
import "../styles/DineOutDetailsGPS.css";

/* ============================================================
   HELPERS
============================================================ */

function validCoordinate(value, limit) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value)) &&
    Math.abs(Number(value)) <= limit
  );
}

function memberName(member) {
  return (
    member?.name ||
    member?.full_name ||
    member?.username ||
    "FoodKindl member"
  );
}

function initials(name) {
  return String(name || "F")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getRequestErrorMessage(error) {
  const data = error.response?.data;
  const status = error.response?.status;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "The requested API or invitation was not found.";
  }

  if (status === 409) {
    return "This request conflicts with the current invitation status.";
  }

  if (!error.response) {
    return "Cannot connect to Django. Check the backend.";
  }

  return "Unable to complete your request.";
}

/* ============================================================
   RESTAURANT GPS MAP
============================================================ */

function FitRestaurantMap({
  restaurant,
  user,
  route,
  navigating,
}) {
  const map = useMap();

  const restaurantLat = restaurant[0];
  const restaurantLng = restaurant[1];
  const userLat = user?.[0];
  const userLng = user?.[1];

  useEffect(() => {
    if (navigating && user) {
      map.setView(user, Math.max(map.getZoom(), 16), {
        animate: true,
      });
      return;
    }

    if (route?.length) {
      map.fitBounds(route, {
        padding: [42, 42],
        maxZoom: 15,
      });
    } else if (user) {
      map.fitBounds([restaurant, user], {
        padding: [42, 42],
        maxZoom: 15,
      });
    } else {
      map.setView(restaurant, 15);
    }
  }, [
    map,
    restaurantLat,
    restaurantLng,
    userLat,
    userLng,
    route,
    navigating,
  ]);

  return null;
}

/* ============================================================
   LIVE RESTAURANT NAVIGATION
============================================================ */

function RestaurantGPSMap({ invitation }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeSteps, setRouteSteps] = useState([]);

  const [navigating, setNavigating] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState(null);

  const lastRouteRequest = useRef(0);

  const latitude =
    invitation.latitude ??
    invitation.restaurant_latitude;

  const longitude =
    invitation.longitude ??
    invitation.restaurant_longitude;

  const hasCoordinates =
    validCoordinate(latitude, 90) &&
    validCoordinate(longitude, 180);

  const restaurantLat = hasCoordinates
    ? Number(latitude)
    : null;

  const restaurantLng = hasCoordinates
    ? Number(longitude)
    : null;

  const restaurant = useMemo(
    () =>
      hasCoordinates
        ? [restaurantLat, restaurantLng]
        : null,
    [hasCoordinates, restaurantLat, restaurantLng]
  );

  /* --------------------------------------------------------
     WATCH LIVE USER LOCATION
  -------------------------------------------------------- */

  useEffect(() => {
    if (!navigating) return;

    if (!navigator.geolocation) {
      setLocationError("GPS is not supported by this browser.");
      setNavigating(false);
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const current = [
          coords.latitude,
          coords.longitude,
        ];

        setUserLocation(current);
        setLocationError("");

        const now = Date.now();

        if (now - lastRouteRequest.current > 20000) {
          lastRouteRequest.current = now;
          setRouteOrigin(current);
        }
      },
      (error) => {
        setLocationError(
          error.code === 1
            ? "Location permission denied. Navigation stopped."
            : "GPS signal lost. Trying again..."
        );

        if (error.code === 1) {
          setNavigating(false);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watcher);
    };
  }, [navigating]);

  const activeOrigin = navigating
    ? routeOrigin
    : userLocation;

  const originLat = activeOrigin?.[0];
  const originLng = activeOrigin?.[1];

  /* --------------------------------------------------------
     FETCH DRIVING ROUTE FROM OSRM
  -------------------------------------------------------- */

  useEffect(() => {
    if (
      originLat == null ||
      originLng == null ||
      restaurantLat == null ||
      restaurantLng == null
    ) {
      setRoute(null);
      setRouteSummary(null);
      setRouteSteps([]);
      return;
    }

    const controller = new AbortController();

    setRouteLoading(true);
    setRouteError("");

    const url =
      "https://router.project-osrm.org/route/v1/driving/" +
      `${originLng},${originLat};` +
      `${restaurantLng},${restaurantLat}` +
      "?overview=full&geometries=geojson&steps=true";

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Route service unavailable");
        }
        return response.json();
      })
      .then((data) => {
        const result = data.routes?.[0];

        if (
          data.code !== "Ok" ||
          !result?.geometry?.coordinates?.length
        ) {
          throw new Error("No driving route found");
        }

        setRoute(
          result.geometry.coordinates.map(
            ([lon, lat]) => [lat, lon]
          )
        );

        setRouteSummary({
          km: result.distance / 1000,
          minutes: Math.round(result.duration / 60),
        });

        setRouteSteps(
          result.legs?.flatMap((leg) => leg.steps || []) || []
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setRouteError(
            "Road directions are unavailable right now."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    originLat,
    originLng,
    restaurantLat,
    restaurantLng,
  ]);

  /* --------------------------------------------------------
     GPS ACTIONS
  -------------------------------------------------------- */

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationError("GPS is not supported.");
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation([
          coords.latitude,
          coords.longitude,
        ]);
        setLocating(false);
      },
      (error) => {
        setLocationError(
          error.code === 1
            ? "Please enable location permission."
            : "Unable to determine your location."
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }

  function startNavigation() {
    if (!hasCoordinates) return;

    if (!navigator.geolocation) {
      setLocationError("GPS is not supported.");
      return;
    }

    lastRouteRequest.current = Date.now();

    if (userLocation) {
      setRouteOrigin(userLocation);
    }

    setLocationError("");
    setNavigating(true);
  }

  function stopNavigation() {
    setNavigating(false);
    setRouteOrigin(null);
  }

  /* --------------------------------------------------------
     NEXT ROUTE INSTRUCTION
  -------------------------------------------------------- */

  const closestStepIndex =
    userLocation && routeSteps.length
      ? routeSteps.reduce(
          (closest, step, index) => {
            const location = step.maneuver?.location;

            if (!location) return closest;

            const [lon, lat] = location;

            const distance = Math.hypot(
              (lat - userLocation[0]) * 111000,
              (lon - userLocation[1]) *
                111000 *
                Math.cos(
                  (userLocation[0] * Math.PI) / 180
                )
            );

            return distance < closest.distance
              ? { index, distance }
              : closest;
          },
          { index: 0, distance: Infinity }
        ).index
      : -1;

  const nextStep =
    closestStepIndex >= 0
      ? routeSteps[
          Math.min(
            closestStepIndex + 1,
            routeSteps.length - 1
          )
        ]
      : null;

  const instruction = nextStep
    ? `${
        nextStep.maneuver?.modifier ||
        nextStep.maneuver?.type ||
        "Continue"
      } ${
        nextStep.name
          ? `onto ${nextStep.name}`
          : "ahead"
      }`
    : "Waiting for your location and route...";

  /* --------------------------------------------------------
     MAP UI
  -------------------------------------------------------- */

  return (
    <section
      className="dineout-gps-section"
      aria-label="Restaurant map"
    >
      <div className="dineout-gps-heading">
        <div>
          <small>MEETING POINT</small>
          <h2>Find the restaurant</h2>
        </div>

        <MapPin size={22} aria-hidden="true" />
      </div>

      {hasCoordinates ? (
        <div className="dineout-gps-map">
          <MapContainer
            center={restaurant}
            zoom={15}
            scrollWheelZoom={false}
            style={{
              height: "100%",
              width: "100%",
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <CircleMarker
              center={restaurant}
              radius={12}
              pathOptions={{
                color: "#fff3e9",
                weight: 3,
                fillColor: "#f47743",
                fillOpacity: 1,
              }}
            >
              <Popup>
                <strong>
                  {invitation.restaurant_name}
                </strong>
                <div>
                  {invitation.restaurant_address}
                </div>
              </Popup>
            </CircleMarker>

            {userLocation && (
              <CircleMarker
                center={userLocation}
                radius={9}
                pathOptions={{
                  color: "#fff",
                  weight: 3,
                  fillColor: "#3488f5",
                  fillOpacity: 1,
                }}
              >
                <Popup>Your location</Popup>
              </CircleMarker>
            )}

            {route && (
              <Polyline
                positions={route}
                pathOptions={{
                  color: "#3488f5",
                  weight: 6,
                  opacity: 0.9,
                }}
              />
            )}

            <FitRestaurantMap
              restaurant={restaurant}
              user={userLocation}
              route={route}
              navigating={navigating}
            />
          </MapContainer>
        </div>
      ) : (
        <p className="dineout-gps-empty">
          Restaurant coordinates are unavailable.
        </p>
      )}

      <p className="dineout-gps-address">
        {invitation.restaurant_address ||
          invitation.restaurant_name}
      </p>

      {routeLoading && (
        <p className="dineout-gps-status">
          Calculating driving route...
        </p>
      )}

      {routeSummary && (
        <p className="dineout-gps-status">
          Driving route: {routeSummary.km.toFixed(1)} km
          {" · "}
          about {routeSummary.minutes} min
        </p>
      )}

      {navigating && (
        <div
          className="dineout-navigation-panel"
          aria-live="polite"
        >
          <strong>Live navigation</strong>
          <p>{instruction}</p>
          <small>
            Your GPS position updates on this map.
          </small>
        </div>
      )}

      {routeError && (
        <p
          className="dineout-gps-error"
          role="alert"
        >
          {routeError}
        </p>
      )}

      {locationError && (
        <p
          className="dineout-gps-error"
          role="alert"
        >
          {locationError}
        </p>
      )}

      <div className="dineout-gps-actions">
        {hasCoordinates && (
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
          >
            <LocateFixed size={18} />
            {locating
              ? "Finding your location..."
              : userLocation
                ? "Refresh my location"
                : "Use my location"}
          </button>
        )}

        {hasCoordinates &&
          (navigating ? (
            <button
              type="button"
              className="dineout-stop-navigation"
              onClick={stopNavigation}
            >
              <X size={18} />
              Stop navigation
            </button>
          ) : (
            <button
              type="button"
              onClick={startNavigation}
            >
              <Navigation size={18} />
              Start navigation
            </button>
          ))}
      </div>
    </section>
  );
}

/* ============================================================
   HOST ARRIVAL CHECK-IN
============================================================ */

function HostArrivalCheckIn({ dineOutId }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!dineOutId) {
      setBooking(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const eligibility = await api.get(
        `/table-bookings/eligibility/${dineOutId}/`
      );

      const existingBooking =
        eligibility.data?.booking || null;

      if (!existingBooking) {
        setBooking(null);
        return;
      }

      const visitResponse = await api.get(
        `/table-bookings/${existingBooking.id}/visit-status/`
      );

      setBooking(
        visitResponse.data?.booking || existingBooking
      );
    } catch (requestError) {
      setError(
        getRequestErrorMessage(requestError)
      );
    } finally {
      setLoading(false);
    }
  }, [dineOutId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* --------------------------------------------------------
     CHECK-IN
  -------------------------------------------------------- */

  async function checkIn() {
    if (
      !booking ||
      booking.status !== "confirmed" ||
      submitting ||
      booking.member_checked_in_at ||
      ["verified", "no_show", "disputed"].includes(
        booking.visit_status
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await api.post(
        `/table-bookings/${booking.id}/check-in/`
      );

      setNotice(
        "Your arrival was recorded. Waiting for restaurant verification."
      );

      await refresh();
    } catch (requestError) {
      setError(
        getRequestErrorMessage(requestError)
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!dineOutId) {
    return null;
  }

  if (!loading && !error && !booking) {
    return null;
  }

  const checkedIn = Boolean(
    booking?.member_checked_in_at
  );

  const verified =
    booking?.visit_status === "verified";

  const issue =
    booking?.visit_status === "disputed" ||
    booking?.visit_status === "no_show";

  const isConfirmed =
    booking?.status === "confirmed";

  const canCheckIn =
    isConfirmed &&
    !checkedIn &&
    !verified &&
    !issue;

  /* --------------------------------------------------------
     CHECK-IN UI
  -------------------------------------------------------- */

  return (
    <section
      className="dineout-response-panel"
      style={{ marginTop: 16 }}
    >
      <div style={{ width: "100%" }}>
        <small>
          VISIT CHECK-IN · HOST ONLY
        </small>

        <h3 style={{ marginTop: 8 }}>
          Have you reached the restaurant?
        </h3>

        {loading ? (
          <p>Checking your arrival status...</p>
        ) : booking ? (
          <>
            <p>
              Booking reference:{" "}
              <strong>
                {booking.booking_reference}
              </strong>
            </p>

            <p>
              Reservation:{" "}
              <strong>
                {booking.status}
              </strong>
            </p>

            {verified ? (
              <div role="status">
                <p>
                  <strong>
                    Visit Verified
                  </strong>
                </p>

                <p>
                  Your arrival and the restaurant's
                  confirmation have been recorded.
                </p>
              </div>
            ) : issue ? (
              <div role="status">
                <p>
                  <strong>
                    Visit Requires Review
                  </strong>
                </p>

                <p>
                  Current status:{" "}
                  {booking.visit_status}
                </p>
              </div>
            ) : checkedIn ? (
              <div role="status">
                <p>
                  <strong>
                    You've Checked In
                  </strong>
                </p>

                <p>
                  Waiting for restaurant verification.
                </p>
              </div>
            ) : isConfirmed ? (
              <>
                <p>
                  When you arrive at the restaurant,
                  tap the button below.
                </p>

                <button
                  type="button"
                  onClick={checkIn}
                  disabled={
                    !canCheckIn ||
                    loading ||
                    submitting
                  }
                  style={{
                    padding: "12px 20px",
                    background: "#257650",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor:
                      submitting
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  <MapPin
                    size={17}
                    style={{
                      display: "inline-block",
                      verticalAlign: "middle",
                      marginRight: 8,
                    }}
                  />

                  {submitting
                    ? "Recording arrival..."
                    : "I've Arrived"}
                </button>

                <p style={{ marginTop: 12 }}>
                  <small>
                    Check-in is available from
                    2 hours before to 6 hours
                    after your booking time.
                  </small>
                </p>

                <p>
                  <small>
                    Your check-in records a claimed
                    arrival. The restaurant must
                    also verify your visit.
                  </small>
                </p>
              </>
            ) : (
              <p>
                Your table must be confirmed before
                check-in becomes available.
              </p>
            )}
          </>
        ) : null}

        {notice && (
          <p role="status">
            {notice}
          </p>
        )}

        {error && (
          <p
            role="alert"
            style={{ color: "#b64226" }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={refresh}
          disabled={loading || submitting}
          style={{ marginTop: 12 }}
        >
          {loading
            ? "Checking..."
            : "Refresh arrival status"}
        </button>
      </div>
    </section>
  );
}

/* ============================================================
   MAIN DINE OUT DETAILS PAGE
============================================================ */

export default function DineOutDetails() {
  const { dineOutId } = useParams();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [responding, setResponding] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");

  /* --------------------------------------------------------
     FETCH INVITATION
  -------------------------------------------------------- */

  const loadInvitation = useCallback(
    async ({ showLoader = false } = {}) => {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      try {
        const response = await api.get(
          `/dineout/dine-outs/${dineOutId}/`
        );

        setInvitation(response.data);
        return true;
      } catch (requestError) {
        const status = requestError.response?.status;

        if (status === 404) {
          setError(
            "This invitation was not found or was not shared with you."
          );
        } else if (status === 403) {
          setError(
            "You do not have permission to view this invitation."
          );
        } else {
          setError(
            getRequestErrorMessage(requestError)
          );
        }

        return false;
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [dineOutId]
  );

  useEffect(() => {
    void loadInvitation({ showLoader: true });
  }, [loadInvitation]);

  /* --------------------------------------------------------
     INVITED MEMBERS
  -------------------------------------------------------- */

  const invitedMembers = useMemo(() => {
    return Array.isArray(invitation?.invited_members)
      ? invitation.invited_members
      : [];
  }, [invitation]);

  /* --------------------------------------------------------
     ACCEPT / DECLINE / JOIN
  -------------------------------------------------------- */

  async function respond(action) {
    if (responding) return;

    setResponding(true);
    setResponseMessage("");

    try {
      const response = await api.post(
        `/dineout/dine-outs/${dineOutId}/${action}/`
      );

      const newStatus = response.data?.status;

      setInvitation((current) => {
        if (!current) return current;

        const wasAccepted =
          current.my_response_status === "accepted";

        const isAccepted =
          newStatus === "accepted";

        let count = Number(
          current.accepted_guests || 0
        );

        if (!wasAccepted && isAccepted) {
          count += 1;
        } else if (wasAccepted && !isAccepted) {
          count = Math.max(0, count - 1);
        }

        return {
          ...current,
          my_response_status: newStatus,
          accepted_guests: count,
        };
      });

      if (action === "join") {
        setResponseMessage(
          "You joined this Dine Out."
        );
      } else if (action === "accept") {
        setResponseMessage(
          "You accepted the invitation."
        );
      } else if (
        invitation?.visibility === "public"
      ) {
        setResponseMessage(
          "You left this Dine Out."
        );
      } else {
        setResponseMessage(
          "You declined the invitation."
        );
      }

      await loadInvitation();
    } catch (requestError) {
      console.error(
        "DINE OUT RESPONSE ERROR:",
        requestError
      );

      setResponseMessage(
        getRequestErrorMessage(requestError)
      );
    } finally {
      setResponding(false);
    }
  }

  /* ========================================================
     LOADING AND ERROR STATES
  ======================================================== */

  if (loading) {
    return (
      <main className="dineout-details-page">
        <section className="dineout-details-card dineout-details-state">
          <span className="dineout-details-loader" />
          <p>Loading Dine Out invitation...</p>
        </section>
      </main>
    );
  }

  if (error || !invitation) {
    return (
      <main className="dineout-details-page">
        <section className="dineout-details-card dineout-details-state">
          <p className="dineout-details-error">
            {error ||
              "Unable to load the Dine Out invitation."}
          </p>

          <Link
            to="/dine-out"
            className="dineout-details-button"
          >
            Return to Dine Out
          </Link>
        </section>
      </main>
    );
  }

  /* ========================================================
     INVITATION INFORMATION
  ======================================================== */

  const startsAt = invitation.starts_at
    ? new Date(invitation.starts_at)
    : null;

  const validDate =
    startsAt &&
    !Number.isNaN(startsAt.getTime());

  const formattedDate = validDate
    ? startsAt.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date unavailable";

  const formattedTime = validDate
    ? startsAt.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "Time unavailable";

  const isPrivate =
    invitation.visibility === "invited_only";

  const isPublic =
    invitation.visibility === "public";

  const isHost =
    invitation.is_host === true;

  const responseStatus =
    invitation.my_response_status;

  const acceptedGuests = Math.max(
    0,
    Number(invitation.accepted_guests) || 0
  );

  const maximumGuests = Math.max(
    0,
    Number(invitation.maximum_guests) || 0
  );

  const availablePlaces = Math.max(
    0,
    maximumGuests - acceptedGuests
  );

  const isFull =
    maximumGuests > 0 &&
    availablePlaces === 0;

  const hasJoinedPublicEvent =
    isPublic &&
    responseStatus === "accepted";

  const selectedRestaurantId = String(
    invitation.restaurant_external_id || ""
  ).trim();

  const isRegisteredPartnerSelection =
    /^foodkindl-\d+$/.test(
      selectedRestaurantId
    );

  const hostName =
    invitation.host_name ||
    invitation.host?.full_name ||
    invitation.host?.username ||
    "Dine Out Host";

  const totalDiners =
    acceptedGuests + 1;

  /* ========================================================
     PAGE UI
  ======================================================== */

  return (
    <main className="dineout-details-page">
      <section className="dineout-details-card">

        {/* ================================================
            HEADER
        ================================================ */}

        <header className="dineout-details-header">
          <div>
            <p className="dineout-details-eyebrow">
              FOODKINDL DINE OUT
            </p>

            <h1>{invitation.title}</h1>

            <p className="dineout-details-description">
              {invitation.description ||
                invitation.meetup_notes ||
                "Meet people over a shared meal."}
            </p>
          </div>

          <span
            className={`dineout-visibility-badge ${
              isPrivate ? "private" : "public"
            }`}
          >
            {isPrivate ? (
              <ShieldCheck size={16} />
            ) : (
              <Eye size={16} />
            )}

            {isPrivate
              ? "Selected guests only"
              : "Visible to everyone"}
          </span>
        </header>

        {/* ================================================
            RESTAURANT
        ================================================ */}

        <div className="dineout-details-restaurant">
          <span className="dineout-details-icon">
            <Utensils size={24} />
          </span>

          <div>
            <small>
              Selected restaurant
            </small>

            <strong>
              {invitation.restaurant_name}
            </strong>

            <span>
              {invitation.restaurant_cuisine ||
                "Cuisine not specified"}
            </span>
          </div>
        </div>

        {/* ================================================
            DATE / TIME / LOCATION / GUESTS
        ================================================ */}

        <div className="dineout-details-grid">
          <article>
            <Calendar size={20} />
            <div>
              <small>Date</small>
              <strong>
                {formattedDate}
              </strong>
            </div>
          </article>

          <article>
            <Clock size={20} />
            <div>
              <small>Time</small>
              <strong>
                {formattedTime}
              </strong>
            </div>
          </article>

          <article>
            <MapPin size={20} />
            <div>
              <small>Location</small>
              <strong>
                {invitation.restaurant_address ||
                  invitation.restaurant_name}
              </strong>
            </div>
          </article>

          <article>
            <Users size={20} />
            <div>
              <small>Guests</small>
              <strong>
                {acceptedGuests} accepted ·{" "}
                {maximumGuests} maximum
              </strong>
              <small>
                Total including host: {totalDiners}
              </small>
            </div>
          </article>
        </div>

        {/* ================================================
            HOST AND TABLE BOOKING
        ================================================ */}

        {isHost && (
          <section
            className="dineout-booking-section"
            style={{ marginTop: 24 }}
          >
            <div className="dineout-section-heading">
              <div>
                <small>
                  RESTAURANT RESERVATION
                </small>
                <h2>Table Booking</h2>
              </div>
            </div>

            {isRegisteredPartnerSelection ? (
              <>
                <DineOutBookingPanel
                  dineOutId={invitation.id}
                  acceptedGuests={acceptedGuests}
                />

                <HostArrivalCheckIn
                  dineOutId={invitation.id}
                />
              </>
            ) : (
              <div
                className="dineout-response-panel"
                role="status"
                style={{ marginTop: 12 }}
              >
                <div>
                  <strong>
                    Booking unavailable for this invitation
                  </strong>

                  <p>
                    This invitation was not saved
                    against a registered FoodKindl
                    Partner restaurant.
                  </p>

                  <p>
                    To request a table, create a new
                    Dine Out and select a restaurant
                    from FoodKindl Partners.
                  </p>

                  <small>
                    Saved restaurant ID:{" "}
                    {selectedRestaurantId ||
                      "not available"}
                  </small>

                  <p>
                    Accepted guests: {acceptedGuests}.
                    No table is reserved.
                  </p>
                </div>

                <Link
                  to="/dine-out"
                  className="dineout-details-button"
                >
                  Choose FoodKindl Partner
                </Link>
              </div>
            )}
          </section>
        )}

        {/* ================================================
            RESTAURANT MAP AND NAVIGATION
        ================================================ */}

        <RestaurantGPSMap invitation={invitation} />

        {/* ================================================
            PRIVATE GUEST LIST
        ================================================ */}

        {isPrivate && (
          <section className="dineout-invited-section">
            <div className="dineout-section-heading">
              <div>
                <small>
                  PRIVATE GUEST LIST
                </small>
                <h2>Selected guests</h2>
              </div>

              <span>
                {invitedMembers.length} invited
              </span>
            </div>

            <div className="dineout-guest-list">
              <article className="dineout-guest">
                <span className="dineout-guest-avatar">
                  {initials(hostName)}
                </span>

                <div>
                  <strong>{hostName}</strong>
                  <small>
                    Host · Automatically attending
                  </small>
                </div>
              </article>

              {invitedMembers.map((member) => {
                const name = memberName(member);

                const memberStatus =
                  member.response_status ||
                  member.invitation_status ||
                  null;

                return (
                  <article
                    className="dineout-guest"
                    key={member.id}
                  >
                    <span className="dineout-guest-avatar">
                      {initials(name)}
                    </span>

                    <div>
                      <strong>
                        {name}
                      </strong>

                      <small>
                        {memberStatus === "accepted"
                          ? "Accepted"
                          : memberStatus === "declined"
                            ? "Declined"
                            : "Invited guest"}
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ================================================
            DIETARY NOTES
        ================================================ */}

        {invitation.dietary_notes && (
          <div className="dineout-details-note">
            <small>
              Dietary preferences
            </small>
            <p>
              {invitation.dietary_notes}
            </p>
          </div>
        )}

        {/* ================================================
            PRIVATE INVITATION RESPONSE
        ================================================ */}

        {isPrivate && !isHost && (
          <section className="dineout-response-panel">
            <div>
              <small>
                YOUR RESPONSE
              </small>

              <strong
                className={`response-${
                  responseStatus || "pending"
                }`}
              >
                {responseStatus
                  ? responseStatus.charAt(0).toUpperCase() +
                    responseStatus.slice(1)
                  : "Pending"}
              </strong>
            </div>

            <div className="dineout-response-actions">
              <button
                type="button"
                disabled={
                  responding ||
                  responseStatus === "accepted"
                }
                onClick={() =>
                  respond("accept")
                }
              >
                <Check size={18} />
                {responding
                  ? "Please wait..."
                  : "Accept"}
              </button>

              <button
                type="button"
                className="decline"
                disabled={
                  responding ||
                  responseStatus === "declined"
                }
                onClick={() =>
                  respond("decline")
                }
              >
                <X size={18} />
                {responding
                  ? "Please wait..."
                  : "Decline"}
              </button>
            </div>
          </section>
        )}

        {/* ================================================
            PUBLIC DINE OUT RESPONSE
        ================================================ */}

        {isPublic && !isHost && (
          <section className="dineout-response-panel">
            <div>
              <small>
                PUBLIC DINE OUT
              </small>

              <strong
                className={
                  hasJoinedPublicEvent
                    ? "response-accepted"
                    : isFull
                      ? "response-declined"
                      : "response-pending"
                }
              >
                {hasJoinedPublicEvent
                  ? "You are joining"
                  : isFull
                    ? "Dine Out is full"
                    : `${availablePlaces} place${
                        availablePlaces === 1
                          ? ""
                          : "s"
                      } available`}
              </strong>
            </div>

            <div className="dineout-response-actions">
              {hasJoinedPublicEvent ? (
                <button
                  type="button"
                  className="decline"
                  disabled={responding}
                  onClick={() =>
                    respond("decline")
                  }
                >
                  <X size={18} />
                  {responding
                    ? "Please wait..."
                    : "Leave Dine Out"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    responding ||
                    isFull
                  }
                  onClick={() =>
                    respond("join")
                  }
                >
                  <Check size={18} />
                  {responding
                    ? "Joining..."
                    : isFull
                      ? "Dine Out is full"
                      : `Join Dine Out (${acceptedGuests}/${maximumGuests})`}
                </button>
              )}
            </div>
          </section>
        )}

        {/* ================================================
            HOST INFORMATION
        ================================================ */}

        {isHost && (
          <p className="dineout-response-message">
            You are hosting this Dine Out.
            You are automatically counted as attending.
            The maximum guest count does not include you.
          </p>
        )}

        {/* ================================================
            RESPONSE MESSAGE
        ================================================ */}

        {responseMessage && (
          <p className="dineout-response-message">
            {responseMessage}
          </p>
        )}

        {/* ================================================
            PAGE ACTIONS
        ================================================ */}

        <div className="dineout-details-actions">
          <Link
            to="/dine-out"
            className="dineout-details-button dineout-details-button--secondary"
          >
            Back to Dine Out
          </Link>

          <Link
            to="/food-invites"
            className="dineout-details-button"
          >
            My invitations
          </Link>
        </div>
      </section>
    </main>
  );
}
