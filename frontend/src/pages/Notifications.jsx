import { useCallback, useEffect, useState } from "react";
import { Bell, Check, MapPin, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import "../styles/NotificationsCenter.css";

const COOK_TOGETHER_URL = "/cook-togethers/";
const DINE_OUT_URL = "/dineout/dine-outs/";

function getRows(response) {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

function getHostName(event) {
  return (
    event.host_name ||
    event.host?.name ||
    event.host?.full_name ||
    event.host?.username ||
    "A FoodKindl member"
  );
}

function getEventName(event, type) {
  if (type === "dine_out") {
    return event.title || event.restaurant_name || "Dine Out";
  }

  return event.title || event.dish || "Cook Together";
}

function getEventDate(event) {
  let dateValue = null;

  if (event.starts_at) {
    dateValue = new Date(event.starts_at);
  } else if (event.event_date) {
    dateValue = new Date(
      `${event.event_date}T${event.start_time || "00:00:00"}`
    );
  }

  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return "Date not specified";
  }

  return dateValue.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDetailsPath(invitation) {
  if (invitation.notificationType === "dine_out") {
    return `/dine-out/${invitation.id}`;
  }

  return `/food-invites/${invitation.id}`;
}

export default function Notifications() {
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState([]);
  const [visitPrompts, setVisitPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    const [cookResult, dineResult, visitResult] =
      await Promise.allSettled([
        api.get(
          `${COOK_TOGETHER_URL}my-invitations/?status=pending`
        ),
        api.get(`${DINE_OUT_URL}invitations/`),
        api.get(`${DINE_OUT_URL}visit-feedback-due/`),
      ]);

    const nextInvitations = [];

    if (cookResult.status === "fulfilled") {
      nextInvitations.push(
        ...getRows(cookResult.value).map((event) => ({
          ...event,
          notificationType: "cook_together",
          key: `cook-${event.id}`,
        }))
      );
    }

    if (dineResult.status === "fulfilled") {
      nextInvitations.push(
        ...getRows(dineResult.value)
          .filter(
            (event) =>
              String(event.my_response_status || "").toLowerCase() ===
              "pending"
          )
          .map((event) => ({
            ...event,
            notificationType: "dine_out",
            key: `dine-${event.id}`,
          }))
      );
    }

    setInvitations(nextInvitations);

    if (visitResult.status === "fulfilled") {
      setVisitPrompts(
        getRows(visitResult.value).map((event) => ({
          ...event,
          key: `visit-${event.id}`,
        }))
      );
    } else {
      // The visit-feedback API is optional until it is added to the backend.
      setVisitPrompts([]);
    }

    if (
      cookResult.status === "rejected" &&
      dineResult.status === "rejected"
    ) {
      setError("Unable to load invitations. Please try again.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function respondToInvitation(invitation, action) {
    if (busyKey) return;

    setBusyKey(invitation.key);
    setError("");
    setMessage("");

    try {
      if (invitation.notificationType === "cook_together") {
        const actionPath =
          action === "accept"
            ? "accept-invitation"
            : "decline-invitation";

        await api.post(
          `${COOK_TOGETHER_URL}${invitation.id}/${actionPath}/`
        );
      } else {
        await api.post(
          `${DINE_OUT_URL}${invitation.id}/${action}/`
        );
      }

      setMessage(
        action === "accept"
          ? "Invitation accepted."
          : "Invitation declined."
      );

      await loadNotifications();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "Unable to update this invitation."
      );
    } finally {
      setBusyKey("");
    }
  }

  async function answerVisitPrompt(event, visited) {
    const key = `visit-${event.id}`;

    if (busyKey) return;

    setBusyKey(key);
    setError("");
    setMessage("");

    try {
      await api.post(
        `${DINE_OUT_URL}${event.id}/visit-feedback/`,
        { visited }
      );

      setMessage("Your visit response has been saved.");
      await loadNotifications();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "Unable to save your visit response."
      );
    } finally {
      setBusyKey("");
    }
  }

  return (
    <main className="fk-notifications-page">
      <header className="fk-notifications-header">
        <Bell size={22} aria-hidden="true" />

        <div>
          <h1>Notifications</h1>
          <p>Invitations and updates about your food plans.</p>
        </div>

        <button
          type="button"
          onClick={loadNotifications}
          disabled={loading}
        >
          Refresh
        </button>
      </header>

      {error && (
        <p className="fk-notice-error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="fk-notice-success" role="status">
          {message}
        </p>
      )}

      <section>
        <h2>Invitations</h2>

        {loading && <p>Loading notifications…</p>}

        {!loading && invitations.length === 0 && (
          <p>You have no pending invitations.</p>
        )}

        {invitations.map((invitation) => {
          const type = invitation.notificationType;
          const place =
            type === "dine_out"
              ? invitation.restaurant_address ||
                invitation.restaurant_name
              : invitation.location_name ||
                invitation.exact_address;

          return (
            <article
              className="fk-notification-card"
              key={invitation.key}
            >
              <div className="fk-notification-copy">
                <strong>
                  {getHostName(invitation)} invited you to{" "}
                  {type === "dine_out" ? "Dine Out" : "Cook Together"}
                </strong>

                <h3>{getEventName(invitation, type)}</h3>

                <p>{getEventDate(invitation)}</p>

                {place && (
                  <p>
                    <MapPin size={15} aria-hidden="true" />
                    {place}
                  </p>
                )}
              </div>

              <div className="fk-notification-actions">
                <button
                  type="button"
                  className="fk-notification-view"
                  disabled={Boolean(busyKey)}
                  onClick={() => navigate(getDetailsPath(invitation))}
                >
                  View details
                </button>

                <button
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() =>
                    respondToInvitation(invitation, "accept")
                  }
                >
                  <Check size={16} aria-hidden="true" />
                  Accept
                </button>

                <button
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() =>
                    respondToInvitation(invitation, "decline")
                  }
                >
                  <X size={16} aria-hidden="true" />
                  Decline
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section>
        <h2>Confirm your Dine Out visit</h2>

        {visitPrompts.length === 0 ? (
          <p>No visit confirmations are due.</p>
        ) : (
          visitPrompts.map((event) => (
            <article
              className="fk-notification-card"
              key={event.key}
            >
              <div className="fk-notification-copy">
                <strong>Did you visit this restaurant?</strong>
                <h3>
                  {event.restaurant_name || event.title || "Dine Out"}
                </h3>
                <p>{getEventDate(event)}</p>
              </div>

              <div className="fk-notification-actions">
                <button
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() => answerVisitPrompt(event, true)}
                >
                  Yes, I visited
                </button>

                <button
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() => answerVisitPrompt(event, false)}
                >
                  No
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}