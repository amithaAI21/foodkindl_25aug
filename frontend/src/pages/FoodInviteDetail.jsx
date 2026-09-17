import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../api";
import "../styles/FoodInvites.css";


const ENDPOINT =
  "/cook-togethers/";


function backendError(
  error,
  fallback
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
    data &&
    typeof data === "object"
  ) {
    const firstValue =
      Object.values(data)[0];

    if (
      Array.isArray(firstValue)
    ) {
      return firstValue.join(" ");
    }

    if (
      typeof firstValue ===
      "string"
    ) {
      return firstValue;
    }
  }

  return fallback;
}


function formatDate(value) {
  if (!value) {
    return "Date to be confirmed";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}


function formatTime(value) {
  if (!value) {
    return "Time to be confirmed";
  }

  const parts =
    String(value).split(":");

  if (parts.length < 2) {
    return value;
  }

  const date = new Date();

  date.setHours(
    Number(parts[0]),
    Number(parts[1]),
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );
}


export default function FoodInviteDetail() {
  const navigate =
    useNavigate();

  const {
    id,
    inviteId: routeInviteId,
  } = useParams();

  const inviteId =
    routeInviteId || id;

  const [
    invite,
    setInvite,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");


  const loadInvite =
    useCallback(
      async () => {
        if (!inviteId) {
          setError(
            "Invitation ID is missing."
          );

          setLoading(false);

          return;
        }

        setLoading(true);
        setError("");

        try {
          const response =
            await api.get(
              `${ENDPOINT}${inviteId}/`
            );

          setInvite(
            response.data
          );
        } catch (
          requestError
        ) {
          console.error(
            "COOK TOGETHER DETAIL ERROR:",
            requestError
              ?.response
              ?.status,
            requestError
              ?.response
              ?.data
          );

          setError(
            backendError(
              requestError,
              "Unable to load this Cook Together."
            )
          );
        } finally {
          setLoading(false);
        }
      },
      [
        inviteId,
      ]
    );


  useEffect(
    () => {
      loadInvite();
    },
    [
      loadInvite,
    ]
  );


  async function respond(
    action
  ) {
    if (actionLoading) {
      return;
    }

    const actionEndpoint =
      action === "accept"
        ? "accept-invitation"
        : "decline-invitation";

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await api.post(
        `${ENDPOINT}${inviteId}/${actionEndpoint}/`
      );

      if (
        action === "decline"
      ) {
        navigate(
          "/food-invites",
          {
            replace: true,
          }
        );

        return;
      }

      setMessage(
        "Invitation accepted."
      );

      await loadInvite();
    } catch (
      requestError
    ) {
      setError(
        backendError(
          requestError,
          "Unable to update this invitation."
        )
      );
    } finally {
      setActionLoading(false);
    }
  }


  async function deleteInvite() {
    if (actionLoading) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this Cook Together? This cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await api.delete(
        `${ENDPOINT}${inviteId}/`
      );

      navigate(
        "/food-invites",
        {
          replace: true,
        }
      );
    } catch (
      requestError
    ) {
      setError(
        backendError(
          requestError,
          "Unable to delete this Cook Together."
        )
      );
    } finally {
      setActionLoading(false);
    }
  }


  if (loading) {
    return (
      <main className="fi-page">
        <div className="fi-empty">
          Loading Cook Together...
        </div>
      </main>
    );
  }


  if (
    error &&
    !invite
  ) {
    return (
      <main className="fi-page">
        <div className="fi-alert fi-error">
          {error}
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
          ← Back to Food Invites
        </button>
      </main>
    );
  }


  if (!invite) {
    return (
      <main className="fi-page">
        <div className="fi-empty">
          Cook Together not found.
        </div>
      </main>
    );
  }


  const myStatus =
    String(
      invite
        .my_invitation_status ||
      invite.status ||
      "open"
    ).toLowerCase();

  const isHost =
    Boolean(
      invite.is_host
    );

  const isPendingInvitation =
    Boolean(
      !isHost &&
      invite.is_invited &&
      invite
        .my_invitation_status ===
        "pending"
    );

  const invitedCount =
    invite
      .invited_members
      ?.length ||
    0;

  const approvedCount =
    invite
      .approved_guest_count ||
    0;


  /*
   * Exact-location map
   *
   * The backend can return any one of these:
   *
   * latitude and longitude
   * lat and lng
   * venue_latitude and venue_longitude
   *
   * If coordinates are unavailable, the map searches
   * using exact_address and location_name.
   */

  const latitude = Number(
    invite.latitude ??
    invite.lat ??
    invite.venue_latitude
  );

  const longitude = Number(
    invite.longitude ??
    invite.lng ??
    invite.lon ??
    invite.venue_longitude
  );

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const addressQuery = [
    invite.exact_address,
    invite.location_name,
  ]
    .filter(Boolean)
    .join(", ");

  const mapQuery =
    hasCoordinates
      ? `${latitude},${longitude}`
      : addressQuery;

  const hasMapLocation =
    Boolean(mapQuery);

  const mapEmbedUrl =
    hasMapLocation
      ? `https://www.google.com/maps?q=${encodeURIComponent(
          mapQuery
        )}&z=16&output=embed`
      : "";

  const mapOpenUrl =
    hasMapLocation
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          mapQuery
        )}`
      : "";


  return (
    <main className="fi-page fi-detail-page">

      <section className="fi-detail-hero">

        <button
          type="button"
          className="fi-detail-back"
          onClick={() =>
            navigate(
              "/food-invites"
            )
          }
        >
          ← All invitations
        </button>


        <div className="fi-detail-hero-copy">

          <span className="fi-eyebrow">
            🍳 COOK TOGETHER
          </span>

          <h1>
            {
              invite.title ||
              invite.dish ||
              "Cook Together"
            }
          </h1>

          <p>
            {
              invite.description ||
              `Join ${
                invite.host_name ||
                "a FoodKindl member"
              } for a shared cooking experience.`
            }
          </p>


          <div className="fi-detail-hero-meta">

            <span>
              🗓 {
                formatDate(
                  invite.event_date
                )
              }
            </span>

            <span>
              ◷ {
                formatTime(
                  invite.start_time
                )
              }
            </span>

            <span>
              ⌂ {
                invite.location_name ||
                "Location to be set"
              }
            </span>

          </div>

        </div>


        <div
          className="fi-detail-dish-mark"
          aria-hidden="true"
        >
          <span>
            🍲
          </span>

          <small>
            {
              invite.dish ||
              "A shared meal"
            }
          </small>
        </div>

      </section>


      {error && (
        <div className="fi-alert fi-error">
          {error}
        </div>
      )}


      {message && (
        <div
          className="fi-alert fi-success"
          role="status"
        >
          {message}
        </div>
      )}


      <section className="fi-detail-layout">

        <div className="fi-detail-main">

          <div className="fi-detail-heading">

            <div>
              <span className="fi-eyebrow">
                INVITATION DETAILS
              </span>

              <h2>
                Everything you need to know
              </h2>
            </div>


            <span
              className={
                `fi-status fi-status-${myStatus}`
              }
            >
              {myStatus}
            </span>

          </div>


          <div className="fi-detail-grid">

            <DetailItem
              icon="♥"
              label="Hosted by"
              value={
                invite.host_name ||
                "FoodKindl member"
              }
            />


            <DetailItem
              icon="🍛"
              label="What we're cooking"
              value={
                invite.dish ||
                "Not specified"
              }
            />


            <DetailItem
              icon="🗓"
              label="Date"
              value={
                formatDate(
                  invite.event_date
                )
              }
            />


            <DetailItem
              icon="◷"
              label="Time"
              value={
                formatTime(
                  invite.start_time
                )
              }
            />


            <DetailItem
              icon="⌂"
              label="Area or venue"
              value={
                invite.location_name ||
                "Not specified"
              }
              wide
            />


            <DetailItem
              icon="📍"
              label="Exact address"
              value={
                invite.exact_address ||
                "The host has not added an exact address yet."
              }
              wide
              accent
            />


            <DetailItem
              icon="👥"
              label="Confirmed guests"
              value={
                `${approvedCount}/${
                  invite.maximum_guests ||
                  "—"
                }`
              }
            />


            <DetailItem
              icon="✦"
              label="People invited"
              value={
                String(
                  invitedCount
                )
              }
            />


            {invite.dietary_notes && (
              <DetailItem
                icon="🌿"
                label="Dietary notes"
                value={
                  invite.dietary_notes
                }
                wide
              />
            )}

          </div>


          {hasMapLocation && (
            <section className="fi-detail-map">

              <div className="fi-detail-map-heading">

                <div>
                  <span className="fi-eyebrow">
                    MEETING LOCATION
                  </span>

                  <h3>
                    Find the exact place
                  </h3>

                  <p>
                    {
                      invite.exact_address ||
                      invite.location_name
                    }
                  </p>
                </div>


                <a
                  className="fi-map-link"
                  href={mapOpenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Google Maps ↗
                </a>

              </div>


              <div className="fi-map-frame">
                <iframe
                  title="Cook Together meeting location"
                  src={mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>


              <div className="fi-map-coordinate-note">

                <span>
                  📍 {
                    hasCoordinates
                      ? "Pinned using exact coordinates"
                      : "Located using the address"
                  }
                </span>

                {hasCoordinates && (
                  <small>
                    {latitude.toFixed(6)},{" "}
                    {longitude.toFixed(6)}
                  </small>
                )}

              </div>

            </section>
          )}


          <div className="fi-detail-badges">

            {invite.verified_only && (
              <span>
                ✓ Verified profiles only
              </span>
            )}

            {invite.women_only && (
              <span>
                ♀ Women-only gathering
              </span>
            )}

          </div>

        </div>


        <aside className="fi-rsvp-card">

          {/* <span className="fi-rsvp-kicker">
            YOUR INVITATION
          </span>

          <h2>
            {
              isHost
                ? "You’re hosting this table"
                : myStatus === "approved"
                ? "Your seat is confirmed"
                : "Will you join the table?"
            }
          </h2>

          <p>
            {
              isHost
                ? "Manage this invitation and keep an eye on confirmed guests."
                : "Good food tastes better with good company."
            }
          </p> */}


          {/* <div className="fi-rsvp-count">

            <strong>
              {approvedCount}
            </strong>

            <span>
              of {
                invite.maximum_guests ||
                "—"
              } seats confirmed
            </span>

          </div> */}


          <div className="fi-rsvp-actions">

            {isHost && (
              <button
                type="button"
                className="fi-decline"
                disabled={
                  actionLoading
                }
                onClick={
                  deleteInvite
                }
              >
                {
                  actionLoading
                    ? "Please wait..."
                    : "Delete invitation"
                }
              </button>
            )}


            {isPendingInvitation && (
              <>
                <button
                  type="button"
                  className="fi-primary"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    respond("accept")
                  }
                >
                  {
                    actionLoading
                      ? "Please wait..."
                      : "Accept invitation"
                  }
                </button>

                <button
                  type="button"
                  className="fi-decline"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    respond("decline")
                  }
                >
                  Decline
                </button>
              </>
            )}


            {!isHost &&
              !isPendingInvitation && (
                <button
                  type="button"
                  className="fi-secondary"
                  onClick={() =>
                    navigate(
                      "/food-invites"
                    )
                  }
                >
                  Back to invitations
                </button>
              )}

          </div>


          <small>
            FoodKindl · Meet people through food
          </small>

        </aside>

      </section>

    </main>
  );
}


function DetailItem({
  icon,
  label,
  value,
  wide = false,
  accent = false,
}) {
  const className = [
    "fi-detail-item",
    wide
      ? "is-wide"
      : "",
    accent
      ? "is-accent"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>

      <span className="fi-detail-item-icon">
        {icon}
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>

    </div>
  );
}