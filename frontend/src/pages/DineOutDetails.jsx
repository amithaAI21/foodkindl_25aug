
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
  Navigation,
  Eye,
  MapPin,
  ShieldCheck,
  Users,
  Utensils,
  X,
} from "lucide-react";

import { Link, useParams } from "react-router-dom";

import RestaurantRouteMap from "../components/RestaurantRouteMap";

import api from "../api";
import DineOutBookingPanel from "../components/DineOutBookingPanel";


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

function RestaurantGPSMap({ invitation }) {
  return <RestaurantRouteMap invitation={invitation} />;
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

        {isHost && isRegisteredPartnerSelection && (
          <section className="dineout-booking-section" style={{marginTop:24}}>
            <h2>Table booking</h2>
            <DineOutBookingPanel dineOutId={invitation.id} acceptedGuests={acceptedGuests} />
            <HostArrivalCheckIn dineOutId={invitation.id} />
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
