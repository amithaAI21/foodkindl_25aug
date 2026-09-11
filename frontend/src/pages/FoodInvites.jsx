
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api";
import "../styles/FoodInvites.css";

const INVITES_ENDPOINT =
  "/food-invites/";

const INVITE_TYPES = [
  {
    value:
      "cook_together",

    label:
      "Cook Together",

    icon:
      "🍳",

    description:
      "Invite people nearby to cook and share a meal together at home, a clubhouse or another venue.",

    buttonText:
      "Create Cook Together",

    route:
      "/cook-together",
  },

  {
    value:
      "dine_out",

    label:
      "Dine Out",

    icon:
      "🍽️",

    description:
      "Choose a restaurant or café, invite people and turn dining out into a shared experience.",

    buttonText:
      "Plan a Dine Out",

    route:
      "/dine-out",
  },

  {
    value:
      "food_walk",

    label:
      "Food Walk",

    icon:
      "🚶",

    description:
      "Discover great food along a walk, drive or journey and invite others to join your route.",

    buttonText:
      "Plan a Food Walk",

    route:
      "/food-walk",
  },
];

function formatDateTime(
  value
) {
  if (!value) {
    return "Time not set";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-IN",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

function getStatus(
  invite
) {
  return String(
    invite?.my_status ||
      invite?.status ||
      "pending"
  ).toLowerCase();
}

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
    typeof data?.message ===
    "string"
  ) {
    return data.message;
  }

  if (
    Array.isArray(
      data?.non_field_errors
    ) &&
    data.non_field_errors
      .length > 0
  ) {
    return data
      .non_field_errors[0];
  }

  if (
    data &&
    typeof data ===
      "object"
  ) {
    const first =
      Object.entries(
        data
      )[0];

    if (first) {
      const [
        key,
        value,
      ] = first;

      if (
        Array.isArray(
          value
        )
      ) {
        return `${key}: ${value.join(
          ", "
        )}`;
      }

      if (
        typeof value ===
        "string"
      ) {
        return `${key}: ${value}`;
      }
    }
  }

  if (
    error?.message ===
    "Network Error"
  ) {
    return "Unable to connect to the FoodKindl server.";
  }

  return fallback;
}

export default function FoodInvites() {
  const navigate =
    useNavigate();

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "upcoming"
  );

  const [
    invites,
    setInvites,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  // =========================================================
  // LOAD INVITES
  // =========================================================

  async function loadInvites() {
    setLoading(true);
    setError("");

    try {
      const response =
        await api.get(
          INVITES_ENDPOINT
        );

      const data =
        response?.data;

      setInvites(
        Array.isArray(
          data
        )
          ? data
          : Array.isArray(
              data?.results
            )
          ? data.results
          : []
      );
    } catch (
      requestError
    ) {
      console.error(
        "FOOD INVITES LOAD ERROR:",
        requestError?.response
          ?.status,
        requestError?.response
          ?.data,
        requestError
      );

      setError(
        backendError(
          requestError,
          "Unable to load Food Invites."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvites();
  }, []);

  // =========================================================
  // FILTER INVITES
  // =========================================================

  const filteredInvites =
    useMemo(() => {
      const now =
        Date.now();

      if (
        activeTab ===
        "pending"
      ) {
        return invites.filter(
          (invite) =>
            getStatus(
              invite
            ) ===
            "pending"
        );
      }

      if (
        activeTab ===
        "past"
      ) {
        return invites.filter(
          (invite) => {
            const time =
              invite.end_at ||
              invite.start_at;

            if (!time) {
              return false;
            }

            return (
              new Date(
                time
              ).getTime() <
              now
            );
          }
        );
      }

      if (
        activeTab ===
        "created"
      ) {
        return invites.filter(
          (invite) =>
            invite.is_creator ||
            invite.created_by_me ||
            invite.creator_is_me
        );
      }

      return invites.filter(
        (invite) => {
          const time =
            invite.end_at ||
            invite.start_at;

          if (!time) {
            return true;
          }

          return (
            new Date(
              time
            ).getTime() >=
            now
          );
        }
      );
    }, [
      invites,
      activeTab,
    ]);

  // =========================================================
  // OPEN SEPARATE PAGE
  // =========================================================

  function openInviteType(
    typeValue
  ) {
    const inviteType =
      INVITE_TYPES.find(
        (item) =>
          item.value ===
          typeValue
      );

    if (
      !inviteType
        ?.route
    ) {
      return;
    }

    navigate(
      inviteType.route
    );
  }

  // =========================================================
  // ACCEPT / DECLINE
  // =========================================================

  async function respondToInvite(
    inviteId,
    action
  ) {
    setError("");
    setMessage("");

    try {
      await api.post(
        `${INVITES_ENDPOINT}${inviteId}/respond/`,
        {
          action,
        }
      );

      setMessage(
        action ===
          "accept"
          ? "Invite accepted."
          : "Invite declined."
      );

      await loadInvites();
    } catch (
      requestError
    ) {
      console.error(
        "RESPOND FOOD INVITE ERROR:",
        requestError?.response
          ?.status,
        requestError?.response
          ?.data,
        requestError
      );

      setError(
        backendError(
          requestError,
          "Unable to update this Food Invite."
        )
      );
    }
  }

  function inviteTypeMeta(
    value
  ) {
    return (
      INVITE_TYPES.find(
        (item) =>
          item.value ===
          value
      ) || {
        label:
          "Food Invite",

        icon:
          "🍴",
      }
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="fi-page">
      {/* HERO */}

      <section className="fi-hero">
        <div>
          <span className="fi-eyebrow">
            FOODKINDL INVITES
          </span>

          <h1>
            Turn a meal into
            a real
            connection.
          </h1>

          <p>
            Cook together,
            dine out or
            explore a Food
            Walk — and turn
            shared food
            experiences into
            real
            connections.
          </p>
        </div>

        <button
          type="button"
          className="fi-primary"
          onClick={() =>
            navigate(
              "/cook-together"
            )
          }
        >
          + Create an
          Invite
        </button>
      </section>

      {/* THREE EXPERIENCES */}

      <section className="fi-main-options">
        {INVITE_TYPES.map(
          (type) => (
            <article
              key={
                type.value
              }
              className={`fi-main-option fi-option-${type.value}`}
            >
              <div className="fi-main-icon">
                {type.icon}
              </div>

              <div className="fi-main-content">
                <h2>
                  {type.label}
                </h2>

                <p>
                  {
                    type.description
                  }
                </p>

                <button
                  type="button"
                  className="fi-option-button"
                  onClick={() =>
                    openInviteType(
                      type.value
                    )
                  }
                >
                  {
                    type.buttonText
                  }{" "}
                  →
                </button>
              </div>
            </article>
          )
        )}
      </section>

      {/* HOW IT WORKS */}

      <section className="fi-how">
        <div>
          <strong>
            1
          </strong>

          <span>
            Choose the food
            moment
          </span>
        </div>

        <div>
          <strong>
            2
          </strong>

          <span>
            Set place, time
            and preferences
          </span>
        </div>

        <div>
          <strong>
            3
          </strong>

          <span>
            Invite people
            and meet
          </span>
        </div>
      </section>

      {/* MESSAGES */}

      {error && (
        <div className="fi-alert fi-error">
          {error}
        </div>
      )}

      {message && (
        <div className="fi-alert fi-success">
          {message}
        </div>
      )}

      {/* INVITE LIST */}

      <section className="fi-content">
        <div className="fi-tabs">
          {[
            [
              "upcoming",
              "Upcoming",
            ],

            [
              "pending",
              "Pending",
            ],

            [
              "created",
              "Created by me",
            ],

            [
              "past",
              "Past",
            ],
          ].map(
            ([
              value,
              label,
            ]) => (
              <button
                type="button"
                key={value}
                className={
                  activeTab ===
                  value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    value
                  )
                }
              >
                {label}
              </button>
            )
          )}
        </div>

        {loading ? (
          <div className="fi-empty">
            Loading Food
            Invites...
          </div>
        ) : filteredInvites
            .length ===
          0 ? (
          <div className="fi-empty">
            <span>
              🍴
            </span>

            <h3>
              No invites
              here yet
            </h3>

            <p>
              Create a food
              moment or
              accept an
              invite when
              one arrives.
            </p>
          </div>
        ) : (
          <div className="fi-card-grid">
            {filteredInvites.map(
              (invite) => {
                const meta =
                  inviteTypeMeta(
                    invite.invite_type
                  );

                const status =
                  getStatus(
                    invite
                  );

                const participantCount =
                  invite.participant_count ??
                  invite.accepted_count ??
                  invite
                    .participants
                    ?.length ??
                  1;

                return (
                  <article
                    className="fi-invite-card"
                    key={
                      invite.id
                    }
                  >
                    <div className="fi-card-top">
                      <span className="fi-type-pill">
                        {
                          meta.icon
                        }{" "}
                        {
                          meta.label
                        }
                      </span>

                      <span
                        className={`fi-status fi-status-${status}`}
                      >
                        {
                          status
                        }
                      </span>
                    </div>

                    <h3>
                      {invite.title ||
                        meta.label}
                    </h3>

                    {invite.description && (
                      <p>
                        {
                          invite.description
                        }
                      </p>
                    )}

                    <div className="fi-meta-list">
                      <span>
                        🗓️{" "}
                        {formatDateTime(
                          invite.start_at
                        )}
                      </span>

                      <span>
                        📍{" "}
                        {invite.location_label ||
                          invite.venue_name ||
                          "Location shared after acceptance"}
                      </span>

                      {invite.cuisine && (
                        <span>
                          🍛{" "}
                          {
                            invite.cuisine
                          }
                        </span>
                      )}

                      <span>
                        👥{" "}
                        {
                          participantCount
                        }
                        /
                        {invite.max_participants ||
                          "—"}
                      </span>
                    </div>

                    <div className="fi-badges">
                      {invite.verified_only && (
                        <span>
                          ✓ Verified
                          only
                        </span>
                      )}

                      {invite.women_only && (
                        <span>
                          ♀ Women
                          only
                        </span>
                      )}

                      {invite.kitchen_contribution ? (
                        <span>
                          ₹
                          {
                            invite.kitchen_contribution
                          }{" "}
                          contribution
                        </span>
                      ) : null}
                    </div>

                    <div className="fi-card-actions">
                      <button
                        type="button"
                        className="fi-secondary"
                        onClick={() =>
                          navigate(
                            `/food-invites/${invite.id}`
                          )
                        }
                      >
                        View
                        details
                      </button>

                      {!invite.is_creator &&
                        !invite.created_by_me &&
                        status ===
                          "pending" && (
                          <>
                            <button
                              type="button"
                              className="fi-decline"
                              onClick={() =>
                                respondToInvite(
                                  invite.id,
                                  "decline"
                                )
                              }
                            >
                              Decline
                            </button>

                            <button
                              type="button"
                              className="fi-primary"
                              onClick={() =>
                                respondToInvite(
                                  invite.id,
                                  "accept"
                                )
                              }
                            >
                              Accept
                            </button>
                          </>
                        )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}
