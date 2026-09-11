
import React, {
  useEffect,
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
} from "react-leaflet";

import L from "leaflet";

import api from "../api";

import "leaflet/dist/leaflet.css";
import "../styles/FoodInvites.css";


// ============================================================
// FOODKINDL OPENSTREETMAP MARKER
// ============================================================

const foodKindlMarker = L.divIcon({
  className: "foodkindl-map-marker",

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
// MAIN COMPONENT
// ============================================================

export default function FoodInviteDetail() {
  const navigate = useNavigate();

  const {
    inviteId,
  } = useParams();

  const [
    invite,
    setInvite,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);


  // ==========================================================
  // LOAD INVITE
  // ==========================================================

  useEffect(() => {
    loadInvite();
  }, [inviteId]);


  async function loadInvite() {
    setLoading(true);
    setError("");

    try {
      const response =
        await api.get(
          `/food-invites/${inviteId}/`
        );

      console.log(
        "FOOD INVITE DETAIL RESPONSE:",
        response?.data
      );

      setInvite(
        response?.data || null
      );
    } catch (
      requestError
    ) {
      console.error(
        "FOOD INVITE DETAIL ERROR:",
        requestError?.response?.status,
        requestError?.response?.data,
        requestError
      );

      setError(
        requestError?.response?.data?.detail ||
        requestError?.response?.data?.error ||
        "Unable to load this Food Invite."
      );
    } finally {
      setLoading(false);
    }
  }


  // ==========================================================
  // ACCEPT / DECLINE
  // ==========================================================

  async function respond(
    action
  ) {
    if (actionLoading) {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await api.post(
        `/food-invites/${inviteId}/respond/`,
        {
          action,
        }
      );

      await loadInvite();
    } catch (
      requestError
    ) {
      console.error(
        "FOOD INVITE RESPONSE ERROR:",
        requestError?.response?.status,
        requestError?.response?.data,
        requestError
      );

      setError(
        requestError?.response?.data?.detail ||
        requestError?.response?.data?.error ||
        "Unable to update this invite."
      );
    } finally {
      setActionLoading(false);
    }
  }


  // ==========================================================
  // DELETE INVITE
  // ==========================================================

  async function deleteInvite() {
    if (actionLoading) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this Food Invite? This cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await api.delete(
        `/food-invites/${inviteId}/`
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
      console.error(
        "DELETE FOOD INVITE ERROR:",
        requestError?.response?.status,
        requestError?.response?.data,
        requestError
      );

      setError(
        requestError?.response?.data?.detail ||
        requestError?.response?.data?.error ||
        "Unable to delete this Food Invite."
      );
    } finally {
      setActionLoading(false);
    }
  }


  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  function formatDateTime(
    value
  ) {
    if (!value) {
      return "Not specified";
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
      return String(value);
    }
  }


  // ==========================================================
  // INVITE TYPE
  // ==========================================================

  function getTypeMeta(
    value
  ) {
    if (
      value ===
      "cook_together"
    ) {
      return {
        icon:
          "🍳",

        label:
          "Cook Together",
      };
    }

    if (
      value ===
      "dine_out"
    ) {
      return {
        icon:
          "🍽️",

        label:
          "Dine Out",
      };
    }

    if (
      value ===
      "food_walk"
    ) {
      return {
        icon:
          "🚶",

        label:
          "Food Walk",
      };
    }

    return {
      icon:
        "🍴",

      label:
        "Food Invite",
    };
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="fi-page">

        <div className="fi-empty">
          Loading Food Invite...
        </div>

      </main>
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

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


  // ==========================================================
  // NOT FOUND
  // ==========================================================

  if (!invite) {
    return (
      <main className="fi-page">

        <div className="fi-empty">
          Invite not found.
        </div>

      </main>
    );
  }


  // ==========================================================
  // DERIVED VALUES
  // ==========================================================

  const meta =
    getTypeMeta(
      invite.invite_type
    );


  const myStatus =
    String(
      invite.my_participant_status ||
      invite.status ||
      ""
    ).toLowerCase();


  const isCreator =
    Boolean(
      invite.is_creator ||
      invite.created_by_me ||
      invite.creator_is_me
    );


  const invitedCount =
    invite.invited_count ??
    0;


  const acceptedCount =
    invite.accepted_count ??
    0;


  const declinedCount =
    invite.declined_count ??
    0;


  // ==========================================================
  // LATITUDE / LONGITUDE
  // ==========================================================

  const latitude =
    Number(
      invite.latitude ??
      invite.lat ??
      invite.venue_latitude
    );


  const longitude =
    Number(
      invite.longitude ??
      invite.lng ??
      invite.lon ??
      invite.venue_longitude
    );


  const hasMapLocation =
    Number.isFinite(
      latitude
    )
    &&
    Number.isFinite(
      longitude
    );


  // ==========================================================
  // PRIVACY
  //
  // Creator: exact map
  // Accepted invitee: exact map
  // Pending invitee: do not reveal private address / exact map
  // ==========================================================

  const canSeeExactLocation =
    isCreator ||
    myStatus ===
      "accepted";


  const shouldShowMap =
    hasMapLocation &&
    canSeeExactLocation;


  // ==========================================================
  // OPENSTREETMAP URL
  // ==========================================================

  const openStreetMapUrl =
    hasMapLocation
      ? (
          "https://www.openstreetmap.org/" +
          `?mlat=${latitude}` +
          `&mlon=${longitude}` +
          `#map=17/${latitude}/${longitude}`
        )
      : "";


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main className="fi-page">

      {/* ======================================================
          HERO
      ======================================================= */}

      <section className="fi-hero">

        <div>

          <span className="fi-eyebrow">
            {meta.icon}{" "}
            {meta.label}
          </span>

          <h1>
            {invite.title ||
              meta.label}
          </h1>

          <p>
            {invite.description ||
              "A FoodKindl food experience."}
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


      {/* ======================================================
          DETAILS
      ======================================================= */}

      <section className="fi-create-card">

        <div className="fi-form-heading">

          <div>

            <span className="fi-eyebrow">
              INVITE DETAILS
            </span>

            <h2>
              About this food moment
            </h2>

          </div>


          <span
            className={`fi-status fi-status-${myStatus}`}
          >
            {myStatus ||
              "open"}
          </span>

        </div>


        <div className="fi-grid">

          {/* TYPE */}

          <div className="fi-field">

            <span>
              Type
            </span>

            <div>
              {meta.icon}{" "}
              {meta.label}
            </div>

          </div>


          {/* CUISINE */}

          <div className="fi-field">

            <span>
              Cuisine
            </span>

            <div>
              {invite.cuisine ||
                "Not specified"}
            </div>

          </div>


          {/* START */}

          <div className="fi-field">

            <span>
              Starts
            </span>

            <div>
              {formatDateTime(
                invite.start_at
              )}
            </div>

          </div>


          {/* END */}

          <div className="fi-field">

            <span>
              Ends
            </span>

            <div>
              {formatDateTime(
                invite.end_at
              )}
            </div>

          </div>


          {/* VENUE */}

          <div className="fi-field">

            <span>
              Venue
            </span>

            <div>
              {invite.venue_name ||
                "Not specified"}
            </div>

          </div>


          {/* PUBLIC LOCATION */}

          <div className="fi-field">

            <span>
              Public location
            </span>

            <div>
              {invite.location_label ||
                "Not specified"}
            </div>

          </div>


          {/* PEOPLE */}

          <div className="fi-field">

            <span>
              People
            </span>

            <div>
              Invited:{" "}
              {invitedCount}
            </div>

            <div>
              Accepted:{" "}
              {acceptedCount}
            </div>

            <div>
              Declined:{" "}
              {declinedCount}
            </div>

            <div>
              Capacity:{" "}
              {invite.max_participants ||
                "—"}
            </div>

          </div>


          {/* CONTRIBUTION */}

          <div className="fi-field">

            <span>
              Contribution
            </span>

            <div>
              {Number(
                invite.kitchen_contribution ||
                0
              ) > 0
                ? `₹${invite.kitchen_contribution}`
                : "No contribution"}
            </div>

          </div>


          {/* SAFETY */}

          {invite.verified_only && (

            <div className="fi-field">

              <span>
                Safety preference
              </span>

              <div>
                ✓ Verified profiles only
              </div>

            </div>

          )}


          {invite.women_only && (

            <div className="fi-field">

              <span>
                Invite preference
              </span>

              <div>
                ♀ Women only
              </div>

            </div>

          )}


          {/* PRIVATE ADDRESS */}

          {
            invite.private_address &&
            canSeeExactLocation &&
            (

              <div className="fi-field fi-span-2">

                <span>
                  Exact address
                </span>

                <div>
                  {String(
                    invite.private_address
                  )}
                </div>

              </div>

            )
          }


          {/* LATITUDE / LONGITUDE */}

          {
            hasMapLocation &&
            canSeeExactLocation &&
            (

              <>
                <div className="fi-field">

                  <span>
                    Latitude
                  </span>

                  <div>
                    {latitude}
                  </div>

                </div>


                <div className="fi-field">

                  <span>
                    Longitude
                  </span>

                  <div>
                    {longitude}
                  </div>

                </div>
              </>

            )
          }

        </div>


        {/* ====================================================
            LOCATION PRIVACY MESSAGE
        ===================================================== */}

        {
          hasMapLocation &&
          !canSeeExactLocation &&
          (

            <div className="fi-alert fi-location-private">

              📍 Exact meeting location will be shown after
              you accept this Food Invite.

            </div>

          )
        }


        {/* ====================================================
            OPENSTREETMAP
        ===================================================== */}

        {
          shouldShowMap &&
          (

            <section className="fi-location-section">

              <div className="fi-location-header">

                <div>

                  <span className="fi-eyebrow">
                    MEETING LOCATION
                  </span>

                  <h2>
                    Where you'll meet
                  </h2>

                  <p>
                    {invite.venue_name ||
                      invite.location_label ||
                      "FoodKindl meeting point"}
                  </p>

                </div>

              </div>


              <div className="fi-osm-container">

                <MapContainer
                  center={[
                    latitude,
                    longitude,
                  ]}
                  zoom={16}
                  scrollWheelZoom={false}
                  className="fi-osm-map"
                >

                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />


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
                        {invite.venue_name ||
                          "FoodKindl meetup"}
                      </strong>

                      {
                        invite.location_label &&
                        (
                          <>
                            <br />

                            {
                              invite.location_label
                            }
                          </>
                        )
                      }

                      {
                        invite.private_address &&
                        canSeeExactLocation &&
                        (
                          <>
                            <br />

                            {
                              invite.private_address
                            }
                          </>
                        )
                      }

                    </Popup>

                  </Marker>

                </MapContainer>

              </div>


              <div className="fi-location-footer">

                <div>
                  📍{" "}
                  {invite.location_label ||
                    invite.venue_name ||
                    "Meeting location"}
                </div>


                <a
                  className="fi-secondary"
                  href={
                    openStreetMapUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on OpenStreetMap ↗
                </a>

              </div>

            </section>

          )
        }


        {/* ====================================================
            ERROR
        ===================================================== */}

        {
          error &&
          (

            <div className="fi-alert fi-error">
              {error}
            </div>

          )
        }


        {/* ====================================================
            ACTIONS
        ===================================================== */}

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
            Back
          </button>


          {/* CREATOR ACTIONS */}

          {
            isCreator &&
            (
              <>

                <button
                  type="button"
                  className="fi-secondary"
                  onClick={() =>
                    navigate(
                      `/food-invites/${inviteId}/edit`
                    )
                  }
                >
                  Edit Invite
                </button>


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
                  {actionLoading
                    ? "Please wait..."
                    : "Delete Invite"}
                </button>

              </>
            )
          }


          {/* INVITEE ACTIONS */}

          {
            !isCreator &&
            myStatus ===
              "invited" &&
            (
              <>

                <button
                  type="button"
                  className="fi-decline"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    respond(
                      "decline"
                    )
                  }
                >
                  Decline
                </button>


                <button
                  type="button"
                  className="fi-primary"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    respond(
                      "accept"
                    )
                  }
                >
                  Accept Invite
                </button>

              </>
            )
          }

        </div>

      </section>

    </main>
  );
}
