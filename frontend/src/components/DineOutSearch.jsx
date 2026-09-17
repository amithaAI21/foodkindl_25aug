// src/components/DineOutSearch.jsx

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

import {
  ExternalLink,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "leaflet/dist/leaflet.css";
import "../styles/DineOutOriginal.css";
import "../styles/DineOutDetails.css";

import api from "../api";


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
];


function isValidCoordinate(value) {
  return Number.isFinite(
    Number(value)
  );
}


function getRestaurantLatitude(
  restaurant
) {
  return Number(
    restaurant.latitude ??
    restaurant.lat
  );
}


function getRestaurantLongitude(
  restaurant
) {
  return Number(
    restaurant.longitude ??
    restaurant.lon
  );
}


function popularityScore(
  restaurant
) {
  const rating = Number(
    restaurant.rating || 0
  );

  const reviewCount = Number(
    restaurant.review_count ||
    restaurant.user_ratings_total ||
    0
  );

  const distance = Number(
    restaurant.distance_km || 99
  );

  return (
    rating * 100 +
    Math.log10(
      reviewCount + 1
    ) * 20 -
    distance
  );
}


function MapController({
  center,
  restaurants,
}) {
  const map = useMap();

  useEffect(() => {
    const locations = restaurants
      .map(restaurant => {
        const latitude =
          getRestaurantLatitude(
            restaurant
          );

        const longitude =
          getRestaurantLongitude(
            restaurant
          );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        return [
          latitude,
          longitude,
        ];
      })
      .filter(Boolean);

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
  }, [
    map,
    center,
    restaurants,
  ]);

  return null;
}


function RestaurantImage({
  restaurant,
  className = "restaurant-image",
}) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);

  const image =
    restaurant.image_url ||
    restaurant.image ||
    restaurant.photo_url ||
    restaurant.cover_photo;

  if (
    !image ||
    imageFailed
  ) {
    return (
      <div
        className={
          `${className} restaurant-image-empty`
        }
      >
        <Utensils size={27} />

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
        setImageFailed(true)
      }
    />
  );
}


function RestaurantDetailsModal({
  restaurant,
  onClose,
  onChoose,
}) {
  if (!restaurant) {
    return null;
  }

  const latitude =
    getRestaurantLatitude(
      restaurant
    );

  const longitude =
    getRestaurantLongitude(
      restaurant
    );

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

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
        onMouseDown={event =>
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
              <dt>Address</dt>

              <dd>
                {
                  restaurant.address ||
                  restaurant.location_label ||
                  "Address unavailable"
                }
              </dd>
            </div>

            <div>
              <dt>Distance</dt>

              <dd>
                {
                  restaurant.distance_km != null
                    ? `${restaurant.distance_km} km away`
                    : "Not available"
                }
              </dd>
            </div>

            <div>
              <dt>Opening hours</dt>

              <dd>
                {
                  restaurant.opening_hours ||
                  "Contact restaurant"
                }
              </dd>
            </div>

            <div>
              <dt>Rating</dt>

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
                  <ExternalLink size={16} />
                  Website
                </a>
              )
            }

            {
              hasCoordinates &&
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
              onChoose(restaurant)
            }
          >
            Choose this restaurant
          </button>
        </div>
      </article>
    </div>
  );
}


export default function DineOutSearch() {
  const navigate =
    useNavigate();

  /*
   * Stops autocomplete from opening
   * again after selecting a place.
   */
  const skipAutocompleteRef =
    useRef(false);

  /*
   * Helps ignore old autocomplete
   * API responses.
   */
  const autocompleteRequestRef =
    useRef(0);


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
    suggestions,
    setSuggestions,
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
    mapCenter,
    setMapCenter,
  ] = useState(
    DEFAULT_CENTER
  );

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
    restaurantLoading,
    setRestaurantLoading,
  ] = useState(false);

  const [
    locationLoading,
    setLocationLoading,
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


  /*
   * Invitation form.
   */
  const [
    meetupTitle,
    setMeetupTitle,
  ] = useState("");

  const [
    description,
    setDescription,
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
    meetupNotes,
    setMeetupNotes,
  ] = useState("");


  /*
   * Filter, sort and show only
   * ten restaurants.
   */
  const popularRestaurants =
    useMemo(
      () => {
        const query =
          searchText
            .trim()
            .toLowerCase();

        const matchingRestaurants =
          restaurants.filter(
            restaurant => {
              if (!query) {
                return true;
              }

              const searchableText = [
                restaurant.name,
                restaurant.cuisine,
                restaurant.address,
                restaurant.location_label,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              return searchableText.includes(
                query
              );
            }
          );

        return [
          ...matchingRestaurants,
        ]
          .sort(
            (
              restaurantOne,
              restaurantTwo
            ) =>
              popularityScore(
                restaurantTwo
              ) -
              popularityScore(
                restaurantOne
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


  /*
   * Location autocomplete.
   */
  useEffect(
    () => {
      const query =
        location.trim();

      if (
        skipAutocompleteRef.current
      ) {
        skipAutocompleteRef.current =
          false;

        setSuggestions([]);

        return undefined;
      }

      if (
        query.length < 2
      ) {
        setSuggestions([]);
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

              /*
               * Ignore old requests.
               */
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
                  : response.data?.results ||
                    [];

              setSuggestions(
                results
              );
            } catch (
              requestError
            ) {
              console.error(
                "Location autocomplete failed:",
                requestError
              );

              if (
                requestNumber ===
                autocompleteRequestRef.current
              ) {
                setSuggestions([]);
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
          : response.data?.results ||
            response.data?.restaurants ||
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
        "Restaurant search failed:",
        requestError.response?.data ||
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


  async function chooseLocation(
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
        "This location does not have valid coordinates."
      );

      return;
    }

    const selectedLocationName =
      place.name ||
      place.display_name ||
      "Selected location";

    /*
     * Invalidate older requests.
     */
    autocompleteRequestRef.current += 1;

    /*
     * Prevent the selected location
     * from triggering autocomplete.
     */
    skipAutocompleteRef.current =
      true;

    setLocation(
      selectedLocationName
    );

    setSuggestions([]);
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
    setSuggestions([]);
    setLocationLoading(false);
  }


  function chooseRestaurant(
    restaurant
  ) {
    setSelectedRestaurant(
      restaurant
    );

    setDetailsRestaurant(
      null
    );

    const latitude =
      getRestaurantLatitude(
        restaurant
      );

    const longitude =
      getRestaurantLongitude(
        restaurant
      );

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      setMapCenter([
        latitude,
        longitude,
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


  /*
   * Create Dine Out invitation.
   */
  async function createDineOut() {
    setCreateError("");
    setCreateSuccess("");

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

    if (!eventDate) {
      showCreateError(
        "Please select a valid date."
      );

      return;
    }

    if (!eventTime) {
      showCreateError(
        "Please select a time."
      );

      return;
    }

    const selectedDateTime =
      new Date(
        `${eventDate}T${eventTime}:00`
      );

    if (
      Number.isNaN(
        selectedDateTime.getTime()
      )
    ) {
      showCreateError(
        "The selected date or time is invalid."
      );

      return;
    }

    if (
      selectedDateTime <=
      new Date()
    ) {
      showCreateError(
        "Please select a future date and time."
      );

      return;
    }

    const maximumGuestCount =
      Number(
        maximumGuests
      );

    if (
      !Number.isInteger(
        maximumGuestCount
      ) ||
      maximumGuestCount < 1 ||
      maximumGuestCount > 20
    ) {
      showCreateError(
        "Maximum guests must be between 1 and 20."
      );

      return;
    }

    const latitude =
      getRestaurantLatitude(
        selectedRestaurant
      );

    const longitude =
      getRestaurantLongitude(
        selectedRestaurant
      );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      showCreateError(
        "The selected restaurant does not have valid coordinates."
      );

      return;
    }

    const payload = {
      title:
        meetupTitle.trim(),

      description:
        description.trim(),

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
        selectedDateTime.toISOString(),

      maximum_guests:
        maximumGuestCount,

      budget_label: "",

      booking_status:
        bookingStatus,

      dietary_notes:
        dietaryNotes.trim(),

      meetup_notes:
        meetupNotes.trim(),

      verified_only: false,

      women_only: false,

      invited_member_ids: [],

      status: "published",
    };

    try {
      setCreating(true);

      console.log(
        "Creating Dine Out:",
        payload
      );

      const response =
        await api.post(
          "/dineout/dine-outs/",
          payload
        );

      console.log(
        "Created Dine Out:",
        response.data
      );

      setCreateSuccess(
        "Your Dine Out invitation was created successfully."
      );

      window.setTimeout(
        () => {
          navigate(
            `/dine-outs/${response.data.id}`
          );
        },
        900
      );
    } catch (
      requestError
    ) {
      console.error(
        "Create Dine Out failed:",
        requestError.response?.status,
        requestError.response?.data ||
          requestError.message
      );

      const responseStatus =
        requestError.response?.status;

      const responseData =
        requestError.response?.data;

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
          "The Dine Out API was not found. Check the Django URL configuration."
        );

        return;
      }

      if (
        responseData &&
        typeof responseData ===
          "object"
      ) {
        const backendMessage =
          Object.entries(
            responseData
          )
            .map(
              ([
                field,
                messages,
              ]) => {
                const message =
                  Array.isArray(
                    messages
                  )
                    ? messages.join(" ")
                    : String(messages);

                return (
                  `${field}: ${message}`
                );
              }
            )
            .join(" ");

        showCreateError(
          backendMessage ||
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
            Discover nearby restaurants,
            choose a place and invite people.
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

          {
            locationLoading &&
            (
              <p className="search-status">
                Searching locations...
              </p>
            )
          }

          {
            suggestions.length > 0 &&
            (
              <div className="location-suggestions">
                {
                  suggestions.map(
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
                          chooseLocation(
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
              Showing up to 10 popular
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
                cuisineName => (
                  <option
                    key={cuisineName}
                    value={cuisineName}
                  >
                    {cuisineName}
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
                popularRestaurants.length
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
            popularRestaurants.length ===
              0 &&
            (
              <div className="empty-state">
                Search an area to see
                restaurants.
              </div>
            )
          }

          {
            popularRestaurants.map(
              (
                restaurant,
                index
              ) => {
                const selected =
                  selectedRestaurant?.id ===
                  restaurant.id;

                return (
                  <article
                    key={
                      restaurant.id ||
                      index
                    }
                    className={
                      `restaurant-card ${
                        selected
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
                          restaurant.distance_km !=
                          null
                            ? `${restaurant.distance_km} km away`
                            : restaurant.address ||
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
                );
              }
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
                popularRestaurants
              }
            />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {
              popularRestaurants.map(
                (
                  restaurant,
                  index
                ) => {
                  const latitude =
                    getRestaurantLatitude(
                      restaurant
                    );

                  const longitude =
                    getRestaurantLongitude(
                      restaurant
                    );

                  if (
                    !Number.isFinite(
                      latitude
                    ) ||
                    !Number.isFinite(
                      longitude
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
                        latitude,
                        longitude,
                      ]}
                      eventHandlers={{
                        click: () =>
                          setSelectedRestaurant(
                            restaurant
                          ),
                      }}
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
              className="error-message dineout-form-message"
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
              className="success-message dineout-form-message"
              role="status"
            >
              {createSuccess}
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
            placeholder="Example: Italian dinner meetup"
          />
        </label>

        <label>
          Description

          <textarea
            rows={4}
            value={description}
            onChange={
              event =>
                setDescription(
                  event.target.value
                )
            }
            placeholder="Add details for your guests"
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
          Dietary preferences or allergies

          <textarea
            rows={2}
            value={dietaryNotes}
            onChange={
              event =>
                setDietaryNotes(
                  event.target.value
                )
            }
            placeholder="Vegetarian, vegan, allergies..."
          />
        </label>

        <label>
          Meetup notes

          <textarea
            rows={2}
            value={meetupNotes}
            onChange={
              event =>
                setMeetupNotes(
                  event.target.value
                )
            }
            placeholder="Meet near the entrance..."
          />
        </label>

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