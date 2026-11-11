import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  Clock,
  Eye,
  MapPin,
  Navigation,
  ShieldCheck,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import api, { backendUrl } from "../api";
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

function firstValue(...values) {
  return values.find(value => typeof value === "string" && value.trim())?.trim() || "";
}

function safeExternalUrl(value, allowBackendRelative = false) {
  const raw = firstValue(value);
  if (!raw) return "";

  try {
    const absolute = /^https?:\/\//i.test(raw)
      ? raw
      : raw.startsWith("//")
        ? `${window.location.protocol}${raw}`
        : raw.startsWith("/") && allowBackendRelative
          ? `${backendUrl}${raw}`
          : `https://${raw}`;
    const url = new URL(absolute);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function openingHoursText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.filter(Boolean).join(" · ");
  if (Array.isArray(value?.weekdayDescriptions)) {
    return value.weekdayDescriptions.filter(Boolean).join(" · ");
  }
  if (Array.isArray(value?.weekday_text)) {
    return value.weekday_text.filter(Boolean).join(" · ");
  }
  return "";
}


export default function DineOutDetails() {
  const { dineOutId } = useParams();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responding, setResponding] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [restaurantImageError, setRestaurantImageError] = useState(false);
  const [gettingDirections, setGettingDirections] = useState(false);
  const [directionsUrl, setDirectionsUrl] = useState("");
  const [directionsError, setDirectionsError] = useState("");
  const [wikiFoodReference, setWikiFoodReference] = useState({
    image: "",
    description: "",
    source: "",
  });

  const searchedFoodQuery = firstValue(
    invitation?.searched_food,
    invitation?.food_query,
  );


  useEffect(() => {
    let active = true;

    async function loadInvitation() {
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
        if (active) setLoading(false);
      }
    }

    loadInvitation();

    return () => {
      active = false;
    };
  }, [dineOutId]);

  // If the host submitted before the Wikipedia lookup completed, load the
  // searched dish's reference image and description when an invitee opens it.
  useEffect(() => {
    const query = searchedFoodQuery;
    const savedDescription = firstValue(
      invitation?.food_description,
      invitation?.searched_food_description,
    );
    const savedImage = safeExternalUrl(firstValue(
      invitation?.food_image_url,
      invitation?.searched_food_image_url,
    ), true);

    if (!query || (savedDescription && savedImage)) {
      setWikiFoodReference({ image: "", description: "", source: "" });
      return undefined;
    }

    let active = true;
    const title = query.trim().replace(/\s+/g, "_");

    async function loadFoodReference() {
      try {
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { headers: { Accept: "application/json" } },
        );
        if (!response.ok) return;

        const data = await response.json();
        if (!active || data.type === "disambiguation" || !data.extract) return;

        const sentences = String(data.extract).replace(/\s+/g, " ").trim()
          .match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
        const description = sentences.slice(0, 2).join(" ").trim();
        const image = data.thumbnail?.source || data.originalimage?.source || "";
        const source = data.content_urls?.desktop?.page || "";

        setWikiFoodReference({ image, description, source });
      } catch {
        // Keep the saved values and omit the reference if Wikipedia is offline.
      }
    }

    loadFoodReference();
    return () => { active = false; };
  }, [searchedFoodQuery, invitation?.food_description, invitation?.food_image_url,
    invitation?.searched_food_description, invitation?.searched_food_image_url]);


  const invitedMembers = useMemo(
    () => Array.isArray(invitation?.invited_members)
      ? invitation.invited_members
      : [],
    [invitation]
  );


  async function respond(action) {
    setResponding(true);
    setResponseMessage("");

    try {
      await api.post(
        `/dineout/dine-outs/${dineOutId}/${action}/`
      );

      const refreshed = await api.get(
        `/dineout/dine-outs/${dineOutId}/`
      );

      setInvitation(refreshed.data);

      setResponseMessage(
        action === "join"
          ? "You joined this Dine Out."
          : action === "accept"
            ? "You accepted this Dine Out invitation."
            : invitation.visibility === "public"
              ? "You left this Dine Out."
              : "You declined this Dine Out invitation."
      );
    } catch (requestError) {
      setResponseMessage(
        requestError.response?.data?.detail ||
        "Unable to update your response."
      );
    } finally {
      setResponding(false);
    }
  }

  function getDirectionsFromCurrentLocation() {
    setDirectionsError("");
    setDirectionsUrl("");

    if (!navigator.geolocation) {
      setDirectionsError("Location access is not available in this browser.");
      return;
    }

    setGettingDirections(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const destinationLat = Number(invitation?.latitude);
        const destinationLng = Number(invitation?.longitude);
        const destination = Number.isFinite(destinationLat) && Number.isFinite(destinationLng)
          ? `${destinationLat},${destinationLng}`
          : firstValue(invitation?.restaurant_address, invitation?.restaurant_name);

        if (!destination) {
          setDirectionsError("The restaurant location is not available for directions.");
          setGettingDirections(false);
          return;
        }

        const origin = `${coords.latitude},${coords.longitude}`;
        const url = new URL("https://www.google.com/maps/dir/");
        url.searchParams.set("api", "1");
        url.searchParams.set("origin", origin);
        url.searchParams.set("destination", destination);
        url.searchParams.set("travelmode", "driving");
        setDirectionsUrl(url.toString());
        setGettingDirections(false);
      },
      (locationError) => {
        const message = locationError.code === 1
          ? "Allow location access in your browser to get directions."
          : "Could not get your current location. Please try again.";
        setDirectionsError(message);
        setGettingDirections(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
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
          <p className="dineout-details-error">{error}</p>
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
  const acceptedGuestMembers = Array.isArray(invitation.accepted_guest_members)
    ? invitation.accepted_guest_members
    : [];
  const maximumGuests = Number(invitation.maximum_guests || 0);
  const isFull = maximumGuests > 0 && acceptedGuests >= maximumGuests;
  const hasJoinedPublicEvent =
    isPublic && responseStatus === "accepted";

  const restaurant = invitation.restaurant || invitation.selected_restaurant || {};
  const restaurantImage = safeExternalUrl(firstValue(
    invitation.restaurant_image_url,
    invitation.restaurant_photo_url,
    invitation.restaurant_image,
    invitation.image_url,
    invitation.photo_url,
    restaurant.image_url,
    restaurant.photo_url,
    restaurant.image,
    restaurant.images?.[0]?.image_url,
    restaurant.images?.[0]?.url,
  ), true);
  const restaurantWebsite = safeExternalUrl(firstValue(
    invitation.restaurant_website,
    invitation.website,
    invitation.website_url,
    invitation.website_uri,
    restaurant.website,
    restaurant.website_url,
    restaurant.website_uri,
    restaurant.websiteUri,
  ));
  const restaurantWebsiteLabel = (() => {
    if (!restaurantWebsite) return "";
    try {
      return new URL(restaurantWebsite).hostname.replace(/^www\./i, "");
    } catch {
      return "Visit website";
    }
  })();
  const restaurantPhone = firstValue(
    invitation.restaurant_phone,
    restaurant.phone_number,
    restaurant.phone,
  );
  const searchedFood = searchedFoodQuery;
  const foodImage = safeExternalUrl(firstValue(
    invitation.food_image_url,
    invitation.searched_food_image_url,
  ), true) || wikiFoodReference.image;
  const foodDescription = firstValue(
    invitation.food_description,
    invitation.searched_food_description,
  ) || wikiFoodReference.description;
  const foodDescriptionSource = safeExternalUrl(firstValue(
    invitation.food_description_source,
    invitation.food_source_url,
  )) || safeExternalUrl(wikiFoodReference.source);
  const restaurantMenuItems = Array.isArray(invitation.restaurant_menu_items)
    ? invitation.restaurant_menu_items.filter(item => item && (item.name || item.title))
    : [];
  const restaurantHours = openingHoursText(
    invitation.restaurant_opening_hours ||
    invitation.opening_hours ||
    restaurant.opening_hours ||
    restaurant.current_opening_hours
  );
  const restaurantType = firstValue(
    invitation.restaurant_type,
    restaurant.restaurant_type,
    restaurant.category,
  );
  const host = invitation.host;
  const guestResponses = Array.isArray(invitation.responses)
    ? invitation.responses
    : [];
  const hostId = host?.id == null ? null : String(host.id);
  const visibleInvitedMembers = invitedMembers.filter(member =>
    hostId === null || String(member.id) !== hostId
  );
  const currentResponseStatus = responseStatus || "pending";

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

        <section className="dineout-details-restaurant" aria-label="Selected restaurant">
          {restaurantImage && !restaurantImageError ? (
            <img
              className="dineout-restaurant-photo"
              src={restaurantImage}
              alt={`${invitation.restaurant_name || "Selected restaurant"}`}
              loading="lazy"
              onError={() => setRestaurantImageError(true)}
            />
          ) : (
            <span className="dineout-details-icon" aria-hidden="true">
              <Utensils size={24} />
            </span>
          )}
          <div className="dineout-restaurant-summary">
            <small>Selected restaurant{restaurantType ? ` · ${restaurantType}` : ""}</small>
            <strong>{invitation.restaurant_name || "Restaurant details unavailable"}</strong>
            <span>{invitation.restaurant_cuisine || "Cuisine not specified"}</span>
            {restaurantHours && <span className="dineout-restaurant-hours">Hours: {restaurantHours}</span>}
            <div className="dineout-restaurant-links">
              {restaurantPhone && (
                <a href={`tel:${restaurantPhone.replace(/[^+\d]/g, "")}`}>
                  Call restaurant
                </a>
              )}
              {restaurantWebsite && (
                <a href={restaurantWebsite} target="_blank" rel="noreferrer">
                  {restaurantWebsiteLabel}
                </a>
              )}
            </div>
          </div>
        </section>

        {(searchedFood || restaurantMenuItems.length > 0) && (
          <section className="dineout-menu-details" aria-label="Menu details">
            <h2>Menu</h2>
            {restaurantMenuItems.length > 0 && (
              <ul className="dineout-menu-list">
                {restaurantMenuItems.map((item, index) => {
                  const menuImage = safeExternalUrl(firstValue(
                    item.image_url,
                    item.photo_url,
                    item.image,
                  ), true);
                  return (
                    <li key={`${item.id || item.name || item.title}-${index}`}>
                      {menuImage && <img src={menuImage} alt={item.name || item.title} loading="lazy" />}
                      <div>
                        <strong>{item.name || item.title || item.item_name}</strong>
                        {item.description && <p>{item.description}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {searchedFood && (
              <article className="dineout-food-reference" aria-label={`About ${searchedFood}`}>
                <div className="dineout-food-reference-copy">
                  <small>SEARCHED DISH</small>
                  <h3>About {searchedFood}</h3>
                  {foodDescription && <p>{foodDescription}</p>}
                  {foodDescriptionSource && (
                    <a href={foodDescriptionSource} target="_blank" rel="noopener noreferrer">
                      Source: Wikipedia
                    </a>
                  )}
                  <small className="dineout-food-reference-note">
                    Reference image only. Contact the restaurant to confirm the dish is available.
                  </small>
                </div>
                {foodImage && (
                  <img
                    className="dineout-food-reference-image"
                    src={foodImage}
                    alt={`${searchedFood} food reference`}
                    loading="lazy"
                  />
                )}
              </article>
            )}
            {searchedFood && restaurantMenuItems.length === 0 && (
              <p className="dineout-menu-unavailable">
                The restaurant has not shared its full menu with FoodKindl yet. Call or visit the website to confirm {searchedFood}.
              </p>
            )}
          </section>
        )}

        <div className="dineout-details-grid">
          <article><Calendar size={20} /><div><small>Date</small><strong>{formattedDate}</strong></div></article>
          <article><Clock size={20} /><div><small>Time</small><strong>{formattedTime}</strong></div></article>
          <article className="dineout-location-fact">
            <MapPin size={20} />
            <div>
              <small>Restaurant location</small>
              <strong>{invitation.restaurant_address || invitation.restaurant_name}</strong>
              <button
                type="button"
                className="dineout-directions-button"
                onClick={getDirectionsFromCurrentLocation}
                disabled={gettingDirections}
              >
                <Navigation size={15} />
                {gettingDirections ? "Getting your location…" : "Directions from my current location"}
              </button>
              {directionsUrl && (
                <a className="dineout-directions-link" href={directionsUrl} target="_blank" rel="noopener noreferrer">
                  Open route in Google Maps
                </a>
              )}
              {directionsError && <span className="dineout-directions-error" role="status">{directionsError}</span>}
            </div>
          </article>
          <article className="dineout-guests-fact">
            <Users size={20} />
            <div>
              <small>Guests</small>
              <strong>{acceptedGuests} accepted · {maximumGuests} maximum</strong>
              <span>Total including host: {acceptedGuests + 1}</span>
              <div className="dineout-accepted-guests">
                <small>Attending including host</small>
                {(host || acceptedGuestMembers.length > 0) ? (
                  <ul>
                    {host && (
                      <li key={`host-${host.id || "unknown"}`}>
                        <Link className="dineout-profile-name" to={`/connect/member/${host.id}`}>
                          {memberName(host)} (Host)
                        </Link>
                      </li>
                    )}
                    {acceptedGuestMembers.map((member) => (
                      <li key={member.id}>
                        <Link className="dineout-profile-name" to={`/connect/member/${member.id}`}>
                          {memberName(member)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>No host or accepted guests are listed.</span>
                )}
              </div>
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
              <span>{visibleInvitedMembers.length} invited</span>
            </div>

            {visibleInvitedMembers.length > 0 || host ? (
              <div className="dineout-guest-list">
                {host && (
                  <article className="dineout-guest dineout-guest--host" key={`host-${host.id || "unknown"}`}>
                    <span className="dineout-guest-avatar">{initials(memberName(host))}</span>
                    <div>
                      <Link className="dineout-profile-name" to={`/connect/member/${host.id}`}>
                        {memberName(host)} (Host)
                      </Link>
                      <small>Host · Automatically attending</small>
                    </div>
                  </article>
                )}
                {visibleInvitedMembers.map(member => {
                  const name = memberName(member);
                  const matchingResponse = guestResponses.find(response =>
                    String(response.guest?.id ?? response.guest_id ?? "") === String(member.id)
                  );
                  const status = member.response_status || matchingResponse?.status;
                  return (
                    <article className="dineout-guest" key={member.id}>
                      <span className="dineout-guest-avatar">{initials(name)}</span>
                      <div>
                      <Link className="dineout-profile-name" to={`/connect/member/${member.id}`}>
                        {name}
                      </Link>
                        <small>Invited guest</small>
                        {status && <small className={`dineout-guest-status response-${status}`}>{status}</small>}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="dineout-empty-guests">No selected guests were saved for this invitation.</p>
            )}
          </section>
        )}

        {invitation.dietary_notes && (
          <div className="dineout-details-note">
            <small>Dietary preferences</small>
            <p>{invitation.dietary_notes}</p>
          </div>
        )}

        {isPrivate && !isHost && (
          <section className="dineout-response-panel">
            <div className="dineout-response-summary">
              <small>YOUR RESPONSE</small>
              <strong className={`response-${currentResponseStatus}`}>
                {currentResponseStatus.charAt(0).toUpperCase() + currentResponseStatus.slice(1)}
              </strong>
              <span>Choose whether you’d like to join this Dine Out.</span>
            </div>

            <div className="dineout-response-actions">
              <button type="button" className="accept" disabled={responding || responseStatus === "accepted"} onClick={() => respond("accept")}>
                <Check size={18} /> {responding ? "Saving..." : responseStatus === "accepted" ? "Accepted" : "Accept invitation"}
              </button>
              <button type="button" className="decline" disabled={responding || responseStatus === "declined"} onClick={() => respond("decline")}>
                <X size={18} /> {responseStatus === "declined" ? "Declined" : "Decline invitation"}
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
                    : `${maximumGuests - acceptedGuests} place${maximumGuests - acceptedGuests === 1 ? "" : "s"} available`
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

        {responseMessage && <p className="dineout-response-message">{responseMessage}</p>}

        <div className="dineout-details-actions">
          <Link to="/dine-out" className="dineout-details-button dineout-details-button--secondary">Back to Dine Out</Link>
          <Link to="/food-invites" className="dineout-details-button">My invitations</Link>
        </div>

      </section>
    </main>
  );
}
