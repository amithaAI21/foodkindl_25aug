// src/pages/DineOut.jsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import {
  ExternalLink,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import "leaflet/dist/leaflet.css";
import "../styles/DineOutOriginal.css";
import "../styles/DineOutDetails.css";
import "../styles/DineOutVisibility.css";

import api from "../api";


/* ============================================================
   LEAFLET MARKER FIX
============================================================ */

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});


/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_CENTER = [
  12.9716,
  77.5946,
];


const CUISINES = [
  "All cuisines",
  "Indian",
  "Kerala",
  "South Indian",
  "North Indian",
  "Biryani",
  "Chinese",
  "Italian",
  "Mexican",
  "Japanese",
  "Mediterranean",
];


/* ============================================================
   HELPERS
============================================================ */

function getLatitude(
  restaurant
) {
  return Number(
    restaurant?.latitude ??
    restaurant?.lat
  );
}


function getLongitude(
  restaurant
) {
  return Number(
    restaurant?.longitude ??
    restaurant?.lon
  );
}


function hasValidCoordinates(
  restaurant
) {
  return (
    Number.isFinite(
      getLatitude(restaurant)
    ) &&
    Number.isFinite(
      getLongitude(restaurant)
    )
  );
}


function getPopularityScore(
  restaurant
) {
  const rating = Number(
    restaurant.rating || 0
  );

  const reviews = Number(
    restaurant.review_count ||
    restaurant.user_ratings_total ||
    0
  );

  const distance = Number(
    restaurant.distance_km || 99
  );

  return (
    rating * 100 +
    Math.log10(reviews + 1) * 20 -
    distance
  );
}


/* ============================================================
   MAP CONTROLLER
============================================================ */

function MapController({
  center,
  restaurants,
}) {
  const map = useMap();

  useEffect(
    () => {
      const locations =
        restaurants
          .filter(
            hasValidCoordinates
          )
          .map(
            restaurant => [
              getLatitude(
                restaurant
              ),
              getLongitude(
                restaurant
              ),
            ]
          );

      const timer =
        window.setTimeout(
          () => {
            map.invalidateSize();

            if (
              locations.length > 1
            ) {
              map.fitBounds(
                locations,
                {
                  padding: [
                    35,
                    35,
                  ],
                  maxZoom: 15,
                }
              );
            } else if (
              locations.length === 1
            ) {
              map.setView(
                locations[0],
                15
              );
            } else {
              map.setView(
                center,
                14
              );
            }
          },
          150
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      map,
      center,
      restaurants,
    ]
  );

  return null;
}


/* ============================================================
   RESTAURANT IMAGE
============================================================ */

function RestaurantImage({
  restaurant,
  className =
    "restaurant-image",
}) {
  const [
    failed,
    setFailed,
  ] = useState(false);

  const image =
    restaurant.image_url ||
    restaurant.image ||
    restaurant.photo_url ||
    restaurant.cover_photo;

  if (
    !image ||
    failed
  ) {
    return (
      <div
        className={
          `${className} restaurant-image-empty`
        }
      >
        <Utensils size={28} />

        <span>
          Photo unavailable
        </span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={image}
      alt={
        restaurant.name ||
        "Restaurant"
      }
      onError={() =>
        setFailed(true)
      }
    />
  );
}


/* ============================================================
   RESTAURANT DETAILS MODAL
============================================================ */

function RestaurantDetailsModal({
  restaurant,
  onClose,
  onChoose,
}) {
  if (!restaurant) {
    return null;
  }

  const latitude =
    getLatitude(restaurant);

  const longitude =
    getLongitude(restaurant);

  return (
    <div
      className="restaurant-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <article
        className="restaurant-modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          `${restaurant.name} details`
        }
        onMouseDown={
          event =>
            event.stopPropagation()
        }
      >
        <button
          type="button"
          className="restaurant-modal-close"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={20} />
        </button>

        <RestaurantImage
          restaurant={restaurant}
          className="restaurant-modal-image"
        />

        <div className="restaurant-modal-content">
          <p className="eyebrow">
            RESTAURANT DETAILS
          </p>

          <h2>
            {restaurant.name}
          </h2>

          <p className="restaurant-modal-cuisine">
            {
              restaurant.cuisine ||
              "Cuisine unavailable"
            }
          </p>

          <dl className="restaurant-facts">
            <div>
              <dt>
                Address
              </dt>

              <dd>
                {
                  restaurant.address ||
                  restaurant.location_label ||
                  "Address unavailable"
                }
              </dd>
            </div>

            <div>
              <dt>
                Distance
              </dt>

              <dd>
                {
                  restaurant.distance_km !=
                  null
                    ? `${restaurant.distance_km} km away`
                    : "Not available"
                }
              </dd>
            </div>

            <div>
              <dt>
                Opening hours
              </dt>

              <dd>
                {
                  restaurant.opening_hours ||
                  "Contact restaurant"
                }
              </dd>
            </div>

            <div>
              <dt>
                Rating
              </dt>

              <dd>
                {
                  restaurant.rating
                    ? `${restaurant.rating} / 5`
                    : "Not available"
                }
              </dd>
            </div>
          </dl>

          <div className="restaurant-contact-actions">
            {
              restaurant.phone &&
              (
                <a
                  href={
                    `tel:${restaurant.phone}`
                  }
                >
                  <Phone size={16} />

                  Call
                </a>
              )
            }

            {
              restaurant.website &&
              (
                <a
                  href={
                    restaurant.website
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink
                    size={16}
                  />

                  Website
                </a>
              )
            }

            {
              hasValidCoordinates(
                restaurant
              ) &&
              (
                <a
                  href={
                    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={16} />

                  Directions
                </a>
              )
            }
          </div>

          <button
            type="button"
            className="primary-button restaurant-modal-choose"
            onClick={() =>
              onChoose(
                restaurant
              )
            }
          >
            Choose this restaurant
          </button>
        </div>
      </article>
    </div>
  );
}


/* ============================================================
   DINE OUT PAGE
============================================================ */

export default function DineOut() {
  const navigate =
    useNavigate();

  const skipAutocompleteRef =
    useRef(false);

  const autocompleteRequestRef =
    useRef(0);


  /* ----------------------------------------------------------
     LOCATION AND RESTAURANTS
  ---------------------------------------------------------- */

  const [
    location,
    setLocation,
  ] = useState(
    "Indiranagar"
  );

  const [
    cuisine,
    setCuisine,
  ] = useState(
    "All cuisines"
  );

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    locationSuggestions,
    setLocationSuggestions,
  ] = useState([]);

  const [
    restaurants,
    setRestaurants,
  ] = useState([]);

  const [
    selectedRestaurant,
    setSelectedRestaurant,
  ] = useState(null);

  const [
    detailsRestaurant,
    setDetailsRestaurant,
  ] = useState(null);

  const [
    coordinates,
    setCoordinates,
  ] = useState({
    latitude:
      DEFAULT_CENTER[0],

    longitude:
      DEFAULT_CENTER[1],
  });

  const [
    mapCenter,
    setMapCenter,
  ] = useState(
    DEFAULT_CENTER
  );


  /* ----------------------------------------------------------
     LOADING AND MESSAGES
  ---------------------------------------------------------- */

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(false);

  const [
    restaurantLoading,
    setRestaurantLoading,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    pageError,
    setPageError,
  ] = useState("");

  const [
    createError,
    setCreateError,
  ] = useState("");

  const [
    createSuccess,
    setCreateSuccess,
  ] = useState("");

  const [
    createdInviteId,
    setCreatedInviteId,
  ] = useState(null);


  /* ----------------------------------------------------------
     DINE OUT FORM
  ---------------------------------------------------------- */

  const [
    meetupTitle,
    setMeetupTitle,
  ] = useState("");

  const [
    meetupNotes,
    setMeetupNotes,
  ] = useState("");

  const [
    eventDate,
    setEventDate,
  ] = useState("");

  const [
    eventTime,
    setEventTime,
  ] = useState("");

  const [
    maximumGuests,
    setMaximumGuests,
  ] = useState(2);

  const [
    bookingStatus,
    setBookingStatus,
  ] = useState(
    "not_booked"
  );

  const [
    dietaryNotes,
    setDietaryNotes,
  ] = useState("");

  const [
    visibility,
    setVisibility,
  ] = useState("public");

  const [
    availableMembers,
    setAvailableMembers,
  ] = useState([]);

  const [
    selectedMemberIds,
    setSelectedMemberIds,
  ] = useState([]);

  const [
    membersLoading,
    setMembersLoading,
  ] = useState(false);

  const [
    membersError,
    setMembersError,
  ] = useState("");


  /* ----------------------------------------------------------
     LOAD MEMBERS FOR PRIVATE INVITATIONS

     Change VITE_MEMBER_DIRECTORY_ENDPOINT in .env only if your
     existing member/profile-list endpoint uses a different URL.
  ---------------------------------------------------------- */

  useEffect(() => {
    if (visibility !== "invited_only") {
      return;
    }

    if (availableMembers.length > 0) {
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      setMembersLoading(true);
      setMembersError("");

      try {
        const endpoint =
            import.meta.env.VITE_MEMBER_DIRECTORY_ENDPOINT ||
            "/dineout/members/";

        const response = await api.get(endpoint);

        const rawMembers = Array.isArray(response.data)
          ? response.data
          : (
              response.data?.results ||
              response.data?.members ||
              response.data?.profiles ||
              []
            );

        const normalizedMembers = rawMembers
          .map(item => {
            const user = item.user || item;
            const id = user.id || item.user_id;
            const name =
              user.name ||
              user.full_name ||
              [user.first_name, user.last_name]
                .filter(Boolean)
                .join(" ") ||
              user.username ||
              item.display_name ||
              user.email;

            if (!id || !name) {
              return null;
            }

            return {
              id: Number(id),
              name,
              email: user.email || "",
            };
          })
          .filter(Boolean);

        if (!cancelled) {
          setAvailableMembers(normalizedMembers);
        }
      } catch (error) {
        if (!cancelled) {
          setMembersError(
            "Could not load FoodKindl members. Check the member-directory API endpoint."
          );
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [visibility, availableMembers.length]);


  function toggleInvitedMember(memberId) {
    setSelectedMemberIds(current =>
      current.includes(memberId)
        ? current.filter(id => id !== memberId)
        : [...current, memberId]
    );
  }


  /* ----------------------------------------------------------
     POPULAR RESTAURANTS
  ---------------------------------------------------------- */

  const visibleRestaurants =
    useMemo(
      () => {
        const query =
          searchText
            .trim()
            .toLowerCase();

        const filtered =
          restaurants.filter(
            restaurant => {
              if (!query) {
                return true;
              }

              return [
                restaurant.name,
                restaurant.cuisine,
                restaurant.address,
                restaurant.location_label,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query);
            }
          );

        return [
          ...filtered,
        ]
          .sort(
            (
              first,
              second
            ) =>
              getPopularityScore(
                second
              ) -
              getPopularityScore(
                first
              )
          )
          .slice(
            0,
            10
          );
      },
      [
        restaurants,
        searchText,
      ]
    );


  /* ----------------------------------------------------------
     AUTOCOMPLETE
  ---------------------------------------------------------- */

  useEffect(
    () => {
      const query =
        location.trim();

      /*
       * A location was selected.
       * Do not search for it again.
       */
      if (
        skipAutocompleteRef.current
      ) {
        skipAutocompleteRef.current =
          false;

        setLocationSuggestions([]);

        return undefined;
      }

      if (
        query.length < 2
      ) {
        setLocationSuggestions([]);
        setLocationLoading(false);

        return undefined;
      }

      const requestNumber =
        ++autocompleteRequestRef.current;

      const timer =
        window.setTimeout(
          async () => {
            try {
              setLocationLoading(
                true
              );

              const response =
                await api.get(
                  "/dineout/locations/autocomplete/",
                  {
                    params: {
                      q: query,
                      limit: 8,
                    },
                  }
                );

              if (
                requestNumber !==
                autocompleteRequestRef.current
              ) {
                return;
              }

              const results =
                Array.isArray(
                  response.data
                )
                  ? response.data
                  : response.data
                      ?.results ||
                    [];

              setLocationSuggestions(
                results
              );
            } catch (
              requestError
            ) {
              console.error(
                "Location autocomplete error:",
                requestError
              );

              if (
                requestNumber ===
                autocompleteRequestRef.current
              ) {
                setLocationSuggestions(
                  []
                );
              }
            } finally {
              if (
                requestNumber ===
                autocompleteRequestRef.current
              ) {
                setLocationLoading(
                  false
                );
              }
            }
          },
          350
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      location,
    ]
  );


  /* ----------------------------------------------------------
     FETCH RESTAURANTS
  ---------------------------------------------------------- */

  async function fetchRestaurants(
    latitude =
      coordinates.latitude,

    longitude =
      coordinates.longitude,

    selectedCuisine =
      cuisine
  ) {
    try {
      setRestaurantLoading(
        true
      );

      setPageError("");

      const response =
        await api.get(
          "/dineout/restaurants/recommendations/",
          {
            params: {
              latitude,
              longitude,

              cuisine:
                selectedCuisine ===
                "All cuisines"
                  ? undefined
                  : selectedCuisine,

              limit: 10,
            },
          }
        );

      const results =
        Array.isArray(
          response.data
        )
          ? response.data
          : response.data
              ?.results ||
            response.data
              ?.restaurants ||
            [];

      setRestaurants(
        results
      );

      setSelectedRestaurant(
        results[0] || null
      );

      if (
        results.length === 0
      ) {
        setPageError(
          "No restaurants found in this area."
        );
      }
    } catch (
      requestError
    ) {
      console.error(
        "Restaurant search error:",
        requestError.response
          ?.data ||
        requestError
      );

      setRestaurants([]);
      setSelectedRestaurant(null);

      setPageError(
        requestError.response
          ?.data
          ?.detail ||
        "Unable to load restaurants."
      );
    } finally {
      setRestaurantLoading(
        false
      );
    }
  }


  /* ----------------------------------------------------------
     SELECT LOCATION
  ---------------------------------------------------------- */

  async function selectLocation(
    place
  ) {
    const latitude =
      Number(
        place.latitude ??
        place.lat
      );

    const longitude =
      Number(
        place.longitude ??
        place.lon
      );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setPageError(
        "This location has invalid coordinates."
      );

      return;
    }

    const locationName =
      place.name ||
      place.display_name ||
      place.location_label ||
      "Selected location";

    autocompleteRequestRef.current += 1;

    skipAutocompleteRef.current =
      true;

    setLocation(
      locationName
    );

    setLocationSuggestions([]);
    setLocationLoading(false);

    setCoordinates({
      latitude,
      longitude,
    });

    setMapCenter([
      latitude,
      longitude,
    ]);

    await fetchRestaurants(
      latitude,
      longitude,
      cuisine
    );
  }


  /* ----------------------------------------------------------
     LOCATION INPUT
  ---------------------------------------------------------- */

  function handleLocationChange(
    event
  ) {
    skipAutocompleteRef.current =
      false;

    setLocation(
      event.target.value
    );
  }


  function clearLocation() {
    autocompleteRequestRef.current += 1;

    skipAutocompleteRef.current =
      false;

    setLocation("");
    setLocationSuggestions([]);
    setLocationLoading(false);
  }


  /* ----------------------------------------------------------
     CURRENT LOCATION
  ---------------------------------------------------------- */

  function useCurrentLocation() {
    if (
      !navigator.geolocation
    ) {
      setPageError(
        "Location is not supported by this browser."
      );

      return;
    }

    navigator.geolocation
      .getCurrentPosition(
        async ({
          coords,
        }) => {
          const latitude =
            coords.latitude;

          const longitude =
            coords.longitude;

          autocompleteRequestRef.current += 1;

          skipAutocompleteRef.current =
            true;

          setLocation(
            "Current location"
          );

          setLocationSuggestions([]);

          setCoordinates({
            latitude,
            longitude,
          });

          setMapCenter([
            latitude,
            longitude,
          ]);

          await fetchRestaurants(
            latitude,
            longitude,
            cuisine
          );
        },

        () => {
          setPageError(
            "Unable to access your current location."
          );
        }
      );
  }


  /* ----------------------------------------------------------
     CHOOSE RESTAURANT
  ---------------------------------------------------------- */

  function chooseRestaurant(
    restaurant
  ) {
    setSelectedRestaurant(
      restaurant
    );

    setDetailsRestaurant(
      null
    );

    if (
      hasValidCoordinates(
        restaurant
      )
    ) {
      setMapCenter([
        getLatitude(
          restaurant
        ),
        getLongitude(
          restaurant
        ),
      ]);
    }

    window.setTimeout(
      () => {
        document
          .getElementById(
            "plan-meetup"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      },
      100
    );
  }


  /* ----------------------------------------------------------
     CREATE ERROR
  ---------------------------------------------------------- */

  function showCreateError(
    message
  ) {
    setCreateError(message);
    setCreateSuccess("");

    document
      .getElementById(
        "plan-meetup"
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }


  /* ----------------------------------------------------------
     CREATE DINE OUT
  ---------------------------------------------------------- */

  async function createDineOut() {
    setCreateError("");
    setCreateSuccess("");
    setCreatedInviteId(null);

    if (!selectedRestaurant) {
      showCreateError(
        "Please choose a restaurant."
      );

      return;
    }

    if (
      !meetupTitle.trim()
    ) {
      showCreateError(
        "Please enter a meetup title."
      );

      return;
    }

    if (
      !eventDate ||
      !eventTime
    ) {
      showCreateError(
        "Please choose a valid date and time."
      );

      return;
    }

    const startsAt =
      new Date(
        `${eventDate}T${eventTime}:00`
      );

    if (
      Number.isNaN(
        startsAt.getTime()
      )
    ) {
      showCreateError(
        "The selected date or time is invalid."
      );

      return;
    }

    if (
      startsAt <= new Date()
    ) {
      showCreateError(
        "Please choose a future date and time."
      );

      return;
    }

    const guestCount =
      Number(
        maximumGuests
      );

    if (
      !Number.isInteger(
        guestCount
      ) ||
      guestCount < 1 ||
      guestCount > 20
    ) {
      showCreateError(
        "Maximum guests must be between 1 and 20."
      );

      return;
    }

    if (
      visibility === "invited_only" &&
      selectedMemberIds.length === 0
    ) {
      showCreateError(
        "Please select at least one guest for a private Dine Out."
      );

      return;
    }

    if (selectedMemberIds.length > guestCount) {
      showCreateError(
        `You selected ${selectedMemberIds.length} guests, but the maximum is ${guestCount}.`
      );

      return;
    }

    const latitude =
      getLatitude(
        selectedRestaurant
      );

    const longitude =
      getLongitude(
        selectedRestaurant
      );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      showCreateError(
        "The selected restaurant has invalid coordinates."
      );

      return;
    }

    const payload = {
      title:
        meetupTitle.trim(),

      description:
        meetupNotes.trim(),

      restaurant_external_id:
        String(
          selectedRestaurant.id ||
          ""
        ),

      restaurant_name:
        selectedRestaurant.name,

      restaurant_address:
        selectedRestaurant.address ||
        selectedRestaurant.location_label ||
        "",

      restaurant_cuisine:
        selectedRestaurant.cuisine ||
        "",

      restaurant_phone:
        selectedRestaurant.phone ||
        "",

      restaurant_website:
        selectedRestaurant.website ||
        "",

      latitude,
      longitude,

      starts_at:
        startsAt.toISOString(),

      maximum_guests:
        guestCount,

      budget_label: "",

      booking_status:
        bookingStatus,

      dietary_notes:
        dietaryNotes.trim(),

      meetup_notes:
        meetupNotes.trim(),

      verified_only: false,

      women_only: false,

      visibility,

      invited_member_ids:
        visibility === "invited_only"
          ? selectedMemberIds
          : [],

      status: "published",
    };

    try {
      setCreating(true);

      console.log(
        "CREATE DINE OUT PAYLOAD:",
        payload
      );

      const response =
        await api.post(
          "/dineout/dine-outs/",
          payload
        );

      console.log(
        "CREATE DINE OUT SUCCESS:",
        response.data
      );

      setCreateSuccess(
        "Dine Out invitation created successfully."
      );

      setCreatedInviteId(
        response.data?.id || null
      );

      document
        .getElementById(
          "plan-meetup"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

      setMeetupTitle("");
      setMeetupNotes("");
      setEventDate("");
      setEventTime("");
      setMaximumGuests(2);
      setBookingStatus("not_booked");
      setDietaryNotes("");
      setVisibility("public");
      setSelectedMemberIds([]);
    } catch (
      requestError
    ) {
      console.error(
        "CREATE DINE OUT FAILED:",
        {
          status:
            requestError.response
              ?.status,

          response:
            requestError.response
              ?.data,

          message:
            requestError.message,
        }
      );

      const responseStatus =
        requestError.response
          ?.status;

      const responseData =
        requestError.response
          ?.data;

      if (
        responseStatus === 401
      ) {
        showCreateError(
          "Your login session has expired. Please log in again."
        );

        return;
      }

      if (
        responseStatus === 403
      ) {
        showCreateError(
          "You do not have permission to create this invitation."
        );

        return;
      }

      if (
        responseStatus === 404
      ) {
        showCreateError(
          "The Dine Out API was not found. Check your Django URLs."
        );

        return;
      }

      if (
        responseData &&
        typeof responseData ===
          "object"
      ) {
        const backendError =
          Object.entries(
            responseData
          )
            .map(
              ([
                field,
                value,
              ]) => {
                const message =
                  Array.isArray(
                    value
                  )
                    ? value.join(" ")
                    : String(value);

                return (
                  `${field}: ${message}`
                );
              }
            )
            .join(" ");

        showCreateError(
          backendError ||
          "Unable to create the invitation."
        );

        return;
      }

      showCreateError(
        "Unable to create the Dine Out invitation."
      );
    } finally {
      setCreating(false);
    }
  }


  const today =
    new Date()
      .toISOString()
      .split("T")[0];


  /* ============================================================
     JSX
  ============================================================ */

  return (
    <main className="dineout-page">
      <section className="dineout-hero">
        <div>
          <p className="eyebrow">
            FOODKINDL DINE OUT
          </p>

          <h1>
            Find a place.
            <br />
            Meet over food.
          </h1>

          <p className="hero-text">
            Discover restaurants,
            choose a place and invite
            people.
          </p>
        </div>

        <div className="hero-card">
          <span>
            MEET OVER FOOD
          </span>

          <strong>
            Pick a place.
            Invite your people.
          </strong>
        </div>
      </section>


      <section className="location-card">
        <div className="section-heading">
          <p className="eyebrow">
            FIND AN AREA
          </p>

          <h2>
            Where do you want to dine?
          </h2>

          <p>
            Search a locality,
            neighbourhood, landmark
            or city.
          </p>
        </div>

        <div className="location-search">
          <div className="location-input-wrap">
            <Search size={20} />

            <input
              type="text"
              value={location}
              onChange={
                handleLocationChange
              }
              placeholder="Search locality, area or city"
              autoComplete="off"
            />

            {
              location &&
              (
                <button
                  type="button"
                  className="icon-button"
                  onClick={
                    clearLocation
                  }
                  aria-label="Clear location"
                >
                  <X size={18} />
                </button>
              )
            }
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={
              useCurrentLocation
            }
          >
            <MapPin size={17} />

            Use my current location
          </button>

          {
            locationLoading &&
            (
              <p className="search-status">
                Searching locations...
              </p>
            )
          }

          {
            locationSuggestions.length >
              0 &&
            (
              <div className="location-suggestions">
                {
                  locationSuggestions.map(
                    (
                      place,
                      index
                    ) => (
                      <button
                        key={
                          place.id ||
                          index
                        }
                        type="button"
                        className="location-suggestion"
                        onClick={() =>
                          selectLocation(
                            place
                          )
                        }
                      >
                        <MapPin size={18} />

                        <span>
                          <strong>
                            {
                              place.name ||
                              place.display_name
                            }
                          </strong>

                          <small>
                            {
                              place.display_name ||
                              ""
                            }
                          </small>
                        </span>
                      </button>
                    )
                  )
                }
              </div>
            )
          }
        </div>
      </section>


      <section className="mood-card">
        <div className="mood-header">
          <div>
            <p className="eyebrow">
              FOODKINDL DINE OUT
            </p>

            <h2>
              What are you in the mood for?
            </h2>

            <p>
              Showing 10 popular
              restaurants around{" "}
              <strong>
                {location}
              </strong>.
            </p>
          </div>

          <Sparkles size={26} />
        </div>

        <div className="filters">
          <input
            type="text"
            value={searchText}
            onChange={
              event =>
                setSearchText(
                  event.target.value
                )
            }
            placeholder="Restaurant, dish or craving"
          />

          <select
            value={cuisine}
            onChange={
              event =>
                setCuisine(
                  event.target.value
                )
            }
          >
            {
              CUISINES.map(
                item => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )
            }
          </select>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              fetchRestaurants()
            }
            disabled={
              restaurantLoading
            }
          >
            <Search size={17} />

            {
              restaurantLoading
                ? "Searching..."
                : "Find places"
            }
          </button>
        </div>
      </section>


      {
        pageError &&
        (
          <div
            className="error-message"
            role="alert"
          >
            {pageError}
          </div>
        )
      }


      <section className="results-layout">
        <div className="restaurant-list">
          <div className="results-heading">
            <div>
              <p className="eyebrow">
                POPULAR NEAR YOU
              </p>

              <h2>
                Places around {location}
              </h2>
            </div>

            <span>
              {
                visibleRestaurants.length
              }{" "}
              places
            </span>
          </div>

          {
            restaurantLoading &&
            (
              <div className="empty-state">
                Loading restaurants...
              </div>
            )
          }

          {
            !restaurantLoading &&
            visibleRestaurants.length ===
              0 &&
            (
              <div className="empty-state">
                Search an area to see
                restaurants.
              </div>
            )
          }

          {
            visibleRestaurants.map(
              (
                restaurant,
                index
              ) => (
                <article
                  key={
                    restaurant.id ||
                    index
                  }
                  className={
                    `restaurant-card ${
                      selectedRestaurant
                        ?.id ===
                      restaurant.id
                        ? "selected"
                        : ""
                    }`
                  }
                  onClick={() =>
                    setSelectedRestaurant(
                      restaurant
                    )
                  }
                >
                  <RestaurantImage
                    restaurant={
                      restaurant
                    }
                  />

                  <div className="restaurant-content">
                    <p className="restaurant-number">
                      {index + 1}
                    </p>

                    <p className="eyebrow">
                      POPULAR PICK
                    </p>

                    <h3>
                      {restaurant.name}
                    </h3>

                    <p>
                      {
                        restaurant.cuisine ||
                        "Cuisine unavailable"
                      }
                    </p>

                    <small>
                      {
                        restaurant.address ||
                        restaurant.location_label ||
                        "Address unavailable"
                      }
                    </small>

                    <div className="restaurant-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={
                          event => {
                            event.stopPropagation();

                            setDetailsRestaurant(
                              restaurant
                            );
                          }
                        }
                      >
                        View details
                      </button>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={
                          event => {
                            event.stopPropagation();

                            chooseRestaurant(
                              restaurant
                            );
                          }
                        }
                      >
                        Choose
                      </button>
                    </div>
                  </div>
                </article>
              )
            )
          }
        </div>


        <aside className="map-panel">
          <MapContainer
            center={mapCenter}
            zoom={14}
            scrollWheelZoom
            className="restaurant-map"
          >
            <MapController
              center={mapCenter}
              restaurants={
                visibleRestaurants
              }
            />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {
              visibleRestaurants.map(
                (
                  restaurant,
                  index
                ) => {
                  if (
                    !hasValidCoordinates(
                      restaurant
                    )
                  ) {
                    return null;
                  }

                  return (
                    <Marker
                      key={
                        restaurant.id ||
                        index
                      }
                      position={[
                        getLatitude(
                          restaurant
                        ),
                        getLongitude(
                          restaurant
                        ),
                      ]}
                    >
                      <Popup>
                        <strong>
                          {
                            restaurant.name
                          }
                        </strong>

                        <br />

                        {
                          restaurant.cuisine ||
                          "Restaurant"
                        }

                        <br />

                        {
                          restaurant.address ||
                          restaurant.location_label ||
                          ""
                        }
                      </Popup>
                    </Marker>
                  );
                }
              )
            }
          </MapContainer>
        </aside>
      </section>


      {
        selectedRestaurant &&
        (
          <section className="restaurant-details">
            <p className="eyebrow">
              SELECTED RESTAURANT
            </p>

            <h2>
              {
                selectedRestaurant.name
              }
            </h2>

            <p>
              {
                selectedRestaurant.address ||
                selectedRestaurant.location_label ||
                "Address unavailable"
              }
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                chooseRestaurant(
                  selectedRestaurant
                )
              }
            >
              Plan the meetup
            </button>
          </section>
        )
      }


      <section
        id="plan-meetup"
        className="plan-meetup"
      >
        <p className="eyebrow">
          NEXT STEP
        </p>

        <h2>
          Plan the meetup
        </h2>

        {
          selectedRestaurant &&
          (
            <div className="selected-place">
              <MapPin size={18} />

              <span>
                <small>
                  Selected restaurant
                </small>

                <strong>
                  {
                    selectedRestaurant.name
                  }
                </strong>
              </span>
            </div>
          )
        }

        {
          createError &&
          (
            <div
              className="error-message"
              role="alert"
            >
              {createError}
            </div>
          )
        }

        {
          createSuccess &&
          (
            <div
              className="success-message"
              role="status"
              aria-live="polite"
            >
              <strong>
                {createSuccess}
              </strong>

              {
                createdInviteId &&
                (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      navigate(
                        `/dine-out/${createdInviteId}`
                      )
                    }
                  >
                    View invitation
                  </button>
                )
              }
            </div>
          )
        }

        <label>
          Meetup title

          <input
            type="text"
            value={meetupTitle}
            onChange={
              event =>
                setMeetupTitle(
                  event.target.value
                )
            }
            placeholder="Meetup title"
          />
        </label>

        <label>
          Notes

          <textarea
            rows={4}
            value={meetupNotes}
            onChange={
              event =>
                setMeetupNotes(
                  event.target.value
                )
            }
            placeholder="Add notes for your guests"
          />
        </label>

        <div className="plan-grid">
          <label>
            Date

            <input
              type="date"
              value={eventDate}
              min={today}
              onChange={
                event =>
                  setEventDate(
                    event.target.value
                  )
              }
            />
          </label>

          <label>
            Time

            <input
              type="time"
              value={eventTime}
              onChange={
                event =>
                  setEventTime(
                    event.target.value
                  )
              }
            />
          </label>

          <label>
            Maximum guests

            <input
              type="number"
              min="1"
              max="20"
              value={maximumGuests}
              onChange={
                event =>
                  setMaximumGuests(
                    event.target.value
                  )
              }
            />
          </label>
        </div>

        <label>
          Booking status

          <select
            value={bookingStatus}
            onChange={
              event =>
                setBookingStatus(
                  event.target.value
                )
            }
          >
            <option value="not_booked">
              Not booked yet
            </option>

            <option value="booked">
              Table booked
            </option>

            <option value="walk_in">
              Walk in
            </option>
          </select>
        </label>

        <label>
          Dietary preferences

          <textarea
            rows={2}
            value={dietaryNotes}
            onChange={
              event =>
                setDietaryNotes(
                  event.target.value
                )
            }
            placeholder="Dietary preferences or allergies"
          />
        </label>

        <fieldset className="dineout-visibility-fieldset">
          <legend>Who can see this Dine Out?</legend>

          <label className="dineout-visibility-option">
            <input
              type="radio"
              name="dineout-visibility"
              value="public"
              checked={visibility === "public"}
              onChange={() => {
                setVisibility("public");
                setSelectedMemberIds([]);
              }}
            />

            <span>
              <strong>Everyone</strong>
              <small>Visible to all FoodKindl members.</small>
            </span>
          </label>

          <label className="dineout-visibility-option">
            <input
              type="radio"
              name="dineout-visibility"
              value="invited_only"
              checked={visibility === "invited_only"}
              onChange={() => setVisibility("invited_only")}
            />

            <span>
              <strong>Selected guests only</strong>
              <small>Only you and selected guests can see it.</small>
            </span>
          </label>
        </fieldset>

        {
          visibility === "invited_only" &&
          (
            <section className="dineout-member-picker">
              <div className="dineout-member-picker__heading">
                <strong>Select guests</strong>
                <span>
                  {selectedMemberIds.length}/{maximumGuests} selected
                </span>
              </div>

              {membersLoading && <p>Loading members...</p>}
              {membersError && <p className="error-message">{membersError}</p>}

              {!membersLoading && !membersError && availableMembers.length === 0 && (
                <p>No members are available to invite.</p>
              )}

              <div className="dineout-member-picker__list">
                {availableMembers.map(member => (
                  <label key={member.id} className="dineout-member-option">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      disabled={
                        !selectedMemberIds.includes(member.id) &&
                        selectedMemberIds.length >= Number(maximumGuests)
                      }
                      onChange={() => toggleInvitedMember(member.id)}
                    />

                    <span>
                      <strong>{member.name}</strong>
                      {member.email && <small>{member.email}</small>}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )
        }

        <button
          type="button"
          className="primary-button"
          onClick={
            createDineOut
          }
          disabled={creating}
        >
          {
            creating
              ? "Creating invitation..."
              : "Create Dine Out invite"
          }
        </button>
      </section>


      <RestaurantDetailsModal
        restaurant={
          detailsRestaurant
        }
        onClose={() =>
          setDetailsRestaurant(
            null
          )
        }
        onChoose={
          chooseRestaurant
        }
      />
    </main>
  );
}
