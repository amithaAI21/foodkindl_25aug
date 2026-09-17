import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  Clock,
  Eye,
  MapPin,
  ShieldCheck,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import api from "../api";
import "../styles/DineOutDetails.css";


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
    .map(part => part[0]?.toUpperCase())
    .join("");
}


function getRequestErrorMessage(requestError) {
  const responseData = requestError.response?.data;
  const status = requestError.response?.status;

  if (typeof responseData?.detail === "string") {
    return responseData.detail;
  }

  if (status === 404) {
    return "The Dine Out response API was not found. Restart or redeploy the Django backend.";
  }

  if (status === 401) {
    return "Your login session has expired. Please log in again.";
  }

  if (status === 403) {
    return "You do not have permission to respond to this Dine Out.";
  }

  if (status === 409) {
    return "This Dine Out is already full.";
  }

  if (!requestError.response) {
    return "Cannot connect to the server. Check that the Django backend is running.";
  }

  return "Unable to update your response.";
}


export default function DineOutDetails() {
  const { dineOutId } = useParams();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responding, setResponding] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");


  const loadInvitation = useCallback(async ({ showLoader = false } = {}) => {
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
          "This invitation was not found, or it was not shared with you."
        );
      } else if (status === 403) {
        setError(
          "This is a private invitation and you are not one of the selected guests."
        );
      } else {
        setError(
          requestError.response?.data?.detail ||
          "Unable to load the Dine Out invitation."
        );
      }

      return false;
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [dineOutId]);


  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          `/dineout/dine-outs/${dineOutId}/`
        );

        if (active) {
          setInvitation(response.data);
        }
      } catch (requestError) {
        if (!active) return;

        const status = requestError.response?.status;

        if (status === 404) {
          setError(
            "This invitation was not found, or it was not shared with you."
          );
        } else if (status === 403) {
          setError(
            "This is a private invitation and you are not one of the selected guests."
          );
        } else {
          setError(
            requestError.response?.data?.detail ||
            "Unable to load the Dine Out invitation."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [dineOutId]);


  const invitedMembers = useMemo(
    () => Array.isArray(invitation?.invited_members)
      ? invitation.invited_members
      : [],
    [invitation]
  );


  async function respond(action) {
    if (responding) return;

    setResponding(true);
    setResponseMessage("");

    try {
      const response = await api.post(
        `/dineout/dine-outs/${dineOutId}/${action}/`
      );

      const newStatus = response.data?.status;

      setInvitation(current => {
        if (!current) return current;

        const wasAccepted = current.my_response_status === "accepted";
        const isAccepted = newStatus === "accepted";
        let acceptedGuests = Number(current.accepted_guests || 0);

        if (!wasAccepted && isAccepted) {
          acceptedGuests += 1;
        } else if (wasAccepted && !isAccepted) {
          acceptedGuests = Math.max(0, acceptedGuests - 1);
        }

        return {
          ...current,
          my_response_status: newStatus,
          accepted_guests: acceptedGuests,
        };
      });

      if (action === "join") {
        setResponseMessage("You joined this Dine Out.");
      } else if (action === "accept") {
        setResponseMessage("You accepted this Dine Out invitation.");
      } else if (invitation?.visibility === "public") {
        setResponseMessage("You left this Dine Out.");
      } else {
        setResponseMessage("You declined this Dine Out invitation.");
      }

      // Refresh server totals. A refresh failure must not turn a successful
      // POST into a false "Unable to update" message.
      try {
        await loadInvitation();
      } catch {
        // The optimistic state above already reflects the successful response.
      }
    } catch (requestError) {
      console.error("DINE OUT RESPONSE ERROR:", {
        url: `/dineout/dine-outs/${dineOutId}/${action}/`,
        status: requestError.response?.status,
        data: requestError.response?.data,
        message: requestError.message,
      });

      setResponseMessage(
        getRequestErrorMessage(requestError)
      );
    } finally {
      setResponding(false);
    }
  }


  if (loading) {
    return (
      <main className="dineout-details-page">
        <section className="dineout-details-card dineout-details-state">
          <span className="dineout-details-loader" />
          <p>Loading Dine Out invitation…</p>
        </section>
      </main>
    );
  }


  if (error || !invitation) {
    return (
      <main className="dineout-details-page">
        <section className="dineout-details-card dineout-details-state">
          <p className="dineout-details-error">
            {error || "Unable to load the Dine Out invitation."}
          </p>
          <Link to="/dine-out" className="dineout-details-button">
            Return to Dine Out
          </Link>
        </section>
      </main>
    );
  }


  const startsAt = invitation.starts_at
    ? new Date(invitation.starts_at)
    : null;

  const validDate = startsAt && !Number.isNaN(startsAt.getTime());

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

  const isPrivate = invitation.visibility === "invited_only";
  const isPublic = invitation.visibility === "public";
  const isHost = Boolean(invitation.is_host);
  const responseStatus = invitation.my_response_status;
  const acceptedGuests = Number(invitation.accepted_guests || 0);
  const maximumGuests = Number(invitation.maximum_guests || 0);
  const availablePlaces = Math.max(0, maximumGuests - acceptedGuests);
  const isFull = maximumGuests > 0 && availablePlaces === 0;
  const hasJoinedPublicEvent = isPublic && responseStatus === "accepted";


  return (
    <main className="dineout-details-page">
      <section className="dineout-details-card">
        <header className="dineout-details-header">
          <div>
            <p className="dineout-details-eyebrow">FOODKINDL DINE OUT</p>
            <h1>{invitation.title}</h1>
            <p className="dineout-details-description">
              {invitation.description ||
                invitation.meetup_notes ||
                "Meet people over a shared meal."}
            </p>
          </div>

          <span className={`dineout-visibility-badge ${isPrivate ? "private" : "public"}`}>
            {isPrivate ? <ShieldCheck size={16} /> : <Eye size={16} />}
            {isPrivate ? "Selected guests only" : "Visible to everyone"}
          </span>
        </header>

        <div className="dineout-details-restaurant">
          <span className="dineout-details-icon">
            <Utensils size={24} />
          </span>
          <div>
            <small>Selected restaurant</small>
            <strong>{invitation.restaurant_name}</strong>
            <span>
              {invitation.restaurant_cuisine || "Cuisine not specified"}
            </span>
          </div>
        </div>

        <div className="dineout-details-grid">
          <article>
            <Calendar size={20} />
            <div><small>Date</small><strong>{formattedDate}</strong></div>
          </article>
          <article>
            <Clock size={20} />
            <div><small>Time</small><strong>{formattedTime}</strong></div>
          </article>
          <article>
            <MapPin size={20} />
            <div>
              <small>Location</small>
              <strong>
                {invitation.restaurant_address || invitation.restaurant_name}
              </strong>
            </div>
          </article>
          <article>
            <Users size={20} />
            <div>
              <small>Guests</small>
              <strong>
                {acceptedGuests} accepted · {maximumGuests} maximum
              </strong>
            </div>
          </article>
        </div>

        {isPrivate && (
          <section className="dineout-invited-section">
            <div className="dineout-section-heading">
              <div>
                <small>PRIVATE GUEST LIST</small>
                <h2>Selected guests</h2>
              </div>
              <span>{invitedMembers.length} invited</span>
            </div>

            {invitedMembers.length > 0 ? (
              <div className="dineout-guest-list">
                {invitedMembers.map(member => {
                  const name = memberName(member);

                  return (
                    <article className="dineout-guest" key={member.id}>
                      <span className="dineout-guest-avatar">
                        {initials(name)}
                      </span>
                      <div>
                        <strong>{name}</strong>
                        <small>Invited guest</small>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="dineout-empty-guests">
                No selected guests were saved for this invitation.
              </p>
            )}
          </section>
        )}

        {invitation.dietary_notes && (
          <div className="dineout-details-note">
            <small>Dietary preferences</small>
            <p>{invitation.dietary_notes}</p>
          </div>
        )}

        {isPrivate && responseStatus && !isHost && (
          <section className="dineout-response-panel">
            <div>
              <small>YOUR RESPONSE</small>
              <strong className={`response-${responseStatus}`}>
                {responseStatus.charAt(0).toUpperCase() + responseStatus.slice(1)}
              </strong>
            </div>

            <div className="dineout-response-actions">
              <button
                type="button"
                disabled={responding || responseStatus === "accepted"}
                onClick={() => respond("accept")}
              >
                <Check size={18} />
                {responding ? "Please wait..." : "Accept"}
              </button>
              <button
                type="button"
                className="decline"
                disabled={responding || responseStatus === "declined"}
                onClick={() => respond("decline")}
              >
                <X size={18} />
                {responding ? "Please wait..." : "Decline"}
              </button>
            </div>
          </section>
        )}

        {isPublic && !isHost && (
          <section className="dineout-response-panel">
            <div>
              <small>PUBLIC DINE OUT</small>
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
                    : `${availablePlaces} place${availablePlaces === 1 ? "" : "s"} available`
                }
              </strong>
            </div>

            <div className="dineout-response-actions">
              {hasJoinedPublicEvent ? (
                <button
                  type="button"
                  className="decline"
                  disabled={responding}
                  onClick={() => respond("decline")}
                >
                  <X size={18} />
                  {responding ? "Please wait..." : "Leave Dine Out"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={responding || isFull}
                  onClick={() => respond("join")}
                >
                  <Check size={18} />
                  {responding
                    ? "Joining..."
                    : isFull
                      ? "Dine Out is full"
                      : `Join Dine Out (${acceptedGuests}/${maximumGuests})`
                  }
                </button>
              )}
            </div>
          </section>
        )}

        {isHost && (
          <p className="dineout-response-message">
            You are hosting this Dine Out. The maximum guest count does not include you.
          </p>
        )}

        {responseMessage && (
          <p className="dineout-response-message">
            {responseMessage}
          </p>
        )}

        <div className="dineout-details-actions">
          <Link
            to="/dine-out"
            className="dineout-details-button dineout-details-button--secondary"
          >
            Back to Dine Out
          </Link>
          <Link to="/food-invites" className="dineout-details-button">
            My invitations
          </Link>
        </div>
      </section>
    </main>
  );
}
