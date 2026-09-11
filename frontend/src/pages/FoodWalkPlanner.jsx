
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useNavigate } from "react-router-dom";
import api from "../api";
import PeopleSelector from "./PeopleSelector";

import "../styles/FoodInvites.css";
import "../styles/FoodWalkPlanner.css";

const FOOD_WALK_ENDPOINT =
  "/restaurants/food-walk/";

const GEOCODE_ENDPOINT =
  "/geocode/";

const INVITES_ENDPOINT =
  "/food-invites/";

const DEFAULT_CENTER = [
  12.9716,
  77.5946,
];

const TRAVEL_MODES = [
  {
    value: "walking",
    label: "Walk",
    icon: "🚶",
  },
  {
    value: "cycling",
    label: "Bike",
    icon: "🚲",
  },
  {
    value: "driving",
    label: "Drive",
    icon: "🚗",
  },
  {
    value: "transit",
    label: "Transit",
    icon: "🚆",
  },
];

const CATEGORIES = [
  "All",
  "Breakfast",
  "Street Food",
  "Cafés",
  "Restaurants",
  "Desserts",
  "Bakeries",
  "Local Specialities",
  "Vegetarian",
  "Hidden Gems",
];

function validLocationPoint(
  point
) {
  return (
    point &&
    Number.isFinite(
      Number(
        point.latitude
      )
    ) &&
    Number.isFinite(
      Number(
        point.longitude
      )
    )
  );
}


async function geocodeLocation(
  label
) {
  const query =
    String(
      label || ""
    ).trim();

  if (!query) {
    throw new Error(
      "Location is required."
    );
  }

  const response =
    await api.get(
      GEOCODE_ENDPOINT,
      {
        params: {
          q: query,
        },
      }
    );

  const data =
    response?.data;

  const raw =
    Array.isArray(
      data
    )
      ? data
      : data?.results ||
        data?.features ||
        [];

  const first =
    raw?.[0];

  if (!first) {
    throw new Error(
      `Could not find "${query}". Please choose a suggestion from the location list.`
    );
  }

  const latitude =
    Number(
      first?.latitude ??
      first?.lat ??
      first?.geometry
        ?.coordinates?.[1]
    );

  const longitude =
    Number(
      first?.longitude ??
      first?.lng ??
      first?.lon ??
      first?.geometry
        ?.coordinates?.[0]
    );

  if (
    !Number.isFinite(
      latitude
    ) ||
    !Number.isFinite(
      longitude
    )
  ) {
    throw new Error(
      `No usable coordinates were found for "${query}".`
    );
  }

  return {
    label:
      first?.label ??
      first?.display_name ??
      first?.name ??
      first?.properties?.label ??
      first?.properties?.name ??
      query,

    latitude,
    longitude,
  };
}


function getFoodWalkSearchParams(
  category,
  exploration,
  travelMode
) {
  const value =
    String(
      category || "All"
    ).trim();

  const params = {
    travel_mode:
      travelMode === "walking"
        ? "walk"
        : travelMode === "cycling"
        ? "bike"
        : travelMode === "driving"
        ? "drive"
        : travelMode === "transit"
        ? "drive"
        : "walk",

    max_detour_km:
      exploration === "quick"
        ? 1.5
        : exploration === "explorer"
        ? 5
        : 3,

    limit: 50,
  };

  if (
    value === "Cafés"
  ) {
    params.type =
      "cafe";
  } else if (
    value === "Restaurants"
  ) {
    params.type =
      "restaurant";
  } else if (
    value === "Hidden Gems"
  ) {
    params.hidden_gems =
      true;
  } else if (
    value !== "All"
  ) {
    params.food_query =
      value;
  }

  return params;
}


function normalizeRestaurant(
  raw,
  index
) {
  return {
    id:
      raw?.id ??
      raw?.place_id ??
      raw?.external_id ??
      `place-${index}`,

    name:
      raw?.name ??
      raw?.restaurant_name ??
      "Restaurant",

    latitude:
      Number(
        raw?.latitude ??
        raw?.lat ??
        raw?.location?.lat
      ),

    longitude:
      Number(
        raw?.longitude ??
        raw?.lng ??
        raw?.lon ??
        raw?.location?.lng
      ),

    rating:
      Number(
        raw?.rating ??
        raw?.average_rating ??
        0
      ),

    review_count:
      Number(
        raw?.review_count ??
        raw?.reviews_count ??
        raw?.user_ratings_total ??
        0
      ),

    price_level:
      raw?.price_level ??
      raw?.price ??
      "",

    category:
      raw?.category ??
      raw?.type ??
      "Restaurant",

    cuisines:
      Array.isArray(
        raw?.cuisines
      )
        ? raw.cuisines
        : raw?.cuisine
        ? String(
            raw.cuisine
          )
            .split(",")
            .map((item) =>
              item.trim()
            )
        : [],

    open_now:
      typeof raw?.open_now ===
      "boolean"
        ? raw.open_now
        : null,

    opening_hours:
      raw?.opening_hours ??
      raw?.hours ??
      "",

    popular_dishes:
      raw?.popular_dishes ??
      raw?.menu_highlights ??
      [],

    description:
      raw?.description ??
      raw?.ai_explanation ??
      raw?.reason ??
      "",

    image:
      raw?.image ??
      raw?.photo_url ??
      raw?.image_url ??
      "",

    detour_minutes:
      Number(
        raw?.detour_minutes ??
        raw?.extra_minutes ??
        0
      ),

    detour_km:
      Number(
        raw?.detour_km ??
        raw?.distance_from_route_km ??
        0
      ),

    source:
      raw?.source ??
      "external",

    address:
      raw?.address ??
      raw?.formatted_address ??
      "",

    locality:
      raw?.locality ??
      raw?.location?.locality ??
      "",

    city:
      raw?.city ??
      raw?.location?.city ??
      raw?.location?.locality ??
      "",

    postcode:
      raw?.postcode ??
      raw?.location?.postcode ??
      "",

    tel:
      raw?.tel ??
      raw?.phone ??
      raw?.phone_number ??
      "",

    website:
      raw?.website ??
      "",

    categories:
      Array.isArray(
        raw?.categories
      )
        ? raw.categories
        : [],

    recommendation_reason:
      raw?.recommendation_reason ??
      "",
  };
}

function NumberedMarkerIcon(
  number,
  selected
) {
  return L.divIcon({
    className:
      "fw-marker-wrap",

    html:
      `<div class="fw-marker ${
        selected
          ? "selected"
          : ""
      }"><span>${number}</span></div>`,

    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function MapAutoFit({
  route,
  restaurants,
}) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    route.forEach((point) => {
      if (
        Array.isArray(point) &&
        point.length >= 2
      ) {
        points.push(point);
      }
    });

    restaurants.forEach(
      (place) => {
        if (
          Number.isFinite(
            place.latitude
          ) &&
          Number.isFinite(
            place.longitude
          )
        ) {
          points.push([
            place.latitude,
            place.longitude,
          ]);
        }
      }
    );

    if (points.length > 0) {
      map.fitBounds(
        L.latLngBounds(points),
        {
          padding: [35, 35],
          maxZoom: 14,
        }
      );
    }
  }, [
    map,
    route,
    restaurants,
  ]);

  return null;
}

function LocationInput({
  value,
  onChange,
  placeholder,
  onSelect,
}) {
  const [inputValue, setInputValue] =
    useState(
      typeof value === "string"
        ? value
        : value?.label || ""
    );

  const [results, setResults] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  const [searchError, setSearchError] =
    useState("");

  const timerRef =
    useRef(null);

  const wrapperRef =
    useRef(null);

  const suppressNextSearchRef =
    useRef(false);


  // Keep local input synchronized when parent changes it.
  useEffect(() => {
    const nextValue =
      typeof value === "string"
        ? value
        : value?.label || "";

    setInputValue(
      nextValue
    );
  }, [
    value,
  ]);


  // Close dropdown when clicking outside.
  useEffect(() => {
    function handleClickOutside(
      event
    ) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);


  // Autocomplete search.
  useEffect(() => {
    clearTimeout(
      timerRef.current
    );

    const query =
      String(
        inputValue || ""
      ).trim();


    if (
      suppressNextSearchRef.current
    ) {
      suppressNextSearchRef.current =
        false;

      setResults([]);
      setOpen(false);
      setSearchError("");
      return;
    }


    if (
      query.length < 2
    ) {
      setResults([]);
      setOpen(false);
      setSearchError("");
      return;
    }


    timerRef.current =
      setTimeout(
        async () => {
          setLoading(true);
          setSearchError("");

          try {
            const response =
              await api.get(
                GEOCODE_ENDPOINT,
                {
                  params: {
                    q: query,
                  },
                }
              );


            const raw =
              Array.isArray(
                response?.data
              )
                ? response.data
                : response?.data
                    ?.results ||
                  response?.data
                    ?.features ||
                  [];


            const normalized =
              raw
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    item,
                    index
                  ) => ({
                    id:
                      item?.id ??
                      item?.place_id ??
                      item?.osm_id ??
                      `${query}-${index}`,

                    label:
                      item?.label ??
                      item?.display_name ??
                      item?.name ??
                      item?.properties
                        ?.label ??
                      item?.properties
                        ?.name ??
                      query,

                    latitude:
                      Number(
                        item?.latitude ??
                        item?.lat ??
                        item?.geometry
                          ?.coordinates?.[1]
                      ),

                    longitude:
                      Number(
                        item?.longitude ??
                        item?.lng ??
                        item?.lon ??
                        item?.geometry
                          ?.coordinates?.[0]
                      ),

                    locality:
                      item?.locality ??
                      item?.properties
                        ?.locality ??
                      "",

                    city:
                      item?.city ??
                      item?.properties
                        ?.localadmin ??
                      item?.properties
                        ?.county ??
                      "",

                    state:
                      item?.state ??
                      item?.region ??
                      item?.properties
                        ?.region ??
                      "",

                    country:
                      item?.country ??
                      item?.properties
                        ?.country ??
                      "",
                  })
                )
                .filter(
                  item =>
                    Number.isFinite(
                      item.latitude
                    ) &&
                    Number.isFinite(
                      item.longitude
                    )
                );


            setResults(
              normalized
            );

            setOpen(
              normalized.length > 0
            );


            if (
              normalized.length === 0
            ) {
              setSearchError(
                "No matching locations found."
              );
            }

          } catch (
            requestError
          ) {
            console.error(
              "LOCATION SEARCH ERROR:",
              requestError?.response
                ?.status,
              requestError?.response
                ?.data ||
                requestError
            );

            setResults([]);
            setOpen(false);

            setSearchError(
              requestError?.response
                ?.data?.detail ||
                "Unable to search locations."
            );

          } finally {
            setLoading(false);
          }
        },
        350
      );


    return () =>
      clearTimeout(
        timerRef.current
      );

  }, [
    inputValue,
  ]);


  function handleInputChange(
    event
  ) {
    const nextValue =
      event.target.value;

    setInputValue(
      nextValue
    );

    setResults([]);
    setSearchError("");

    // User edited the text, so old coordinates must be cleared.
    onChange(
      nextValue
    );
  }


  function handleSelect(
    place
  ) {
    const selectedPlace = {
      ...place,

      label:
        place.label,

      latitude:
        Number(
          place.latitude
        ),

      longitude:
        Number(
          place.longitude
        ),
    };


    // Prevent a new autocomplete request for the selected label.
    suppressNextSearchRef.current =
      true;

    setInputValue(
      selectedPlace.label
    );

    setResults([]);
    setOpen(false);
    setSearchError("");

    onSelect(
      selectedPlace
    );
  }


  return (
    <div
      ref={wrapperRef}
      className="fw-location-autocomplete"
    >
      <input
        type="text"
        value={inputValue}
        placeholder={placeholder}
        autoComplete="off"
        onChange={
          handleInputChange
        }
        onFocus={() => {
          if (
            results.length > 0
          ) {
            setOpen(true);
          }
        }}
      />


      {loading && (
        <div className="fw-location-status">
          Searching locations...
        </div>
      )}


      {searchError &&
        !loading && (
          <div className="fw-location-status fw-location-error">
            {searchError}
          </div>
        )}


      {open &&
        results.length > 0 && (
          <div className="fw-location-dropdown">
            {results.map(
              place => (
                <button
                  key={place.id}
                  type="button"
                  className="fw-location-option"
                  onMouseDown={(
                    event
                  ) => {
                    // Prevent blur before selection.
                    event.preventDefault();

                    handleSelect(
                      place
                    );
                  }}
                >
                  <span className="fw-location-pin">
                    📍
                  </span>

                  <span className="fw-location-option-text">
                    {place.label}
                  </span>
                </button>
              )
            )}
          </div>
        )}
    </div>
  );
}


export default function FoodWalkPlanner() {
  const navigate =
    useNavigate();

  const [start, setStart] =
    useState({
      label: "",
      latitude: null,
      longitude: null,
    });

  const [
    destination,
    setDestination,
  ] = useState({
    label: "",
    latitude: null,
    longitude: null,
  });

  const [waypoints, setWaypoints] =
    useState([]);

  const [
    travelMode,
    setTravelMode,
  ] = useState("walking");

  const [
    exploration,
    setExploration,
  ] = useState("balanced");

  const [category, setCategory] =
    useState("All");

  const [route, setRoute] =
    useState([]);

  const [
    routeMeta,
    setRouteMeta,
  ] = useState(null);

  const [
    restaurants,
    setRestaurants,
  ] = useState([]);

  const [
    selectedIds,
    setSelectedIds,
  ] = useState([]);

  const [
    activeRestaurantId,
    setActiveRestaurantId,
  ] = useState(null);

  const [eventForm, setEventForm] =
    useState({
      title: "",
      start_at: "",
      max_participants: 4,
      verified_only: false,
      women_only: false,
      recipients: [],
    });

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const cardRefs =
    useRef({});

  function updateWaypoint(
    index,
    patch
  ) {
    setWaypoints(
      (previous) =>
        previous.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  ...patch,
                }
              : item
        )
    );
  }

  function addWaypoint() {
    setWaypoints(
      (previous) => [
        ...previous,
        {
          label: "",
          latitude: null,
          longitude: null,
        },
      ]
    );
  }

  function removeWaypoint(index) {
    setWaypoints(
      (previous) =>
        previous.filter(
          (_, itemIndex) =>
            itemIndex !== index
        )
    );
  }

  async function findFood() {
    setError("");

    if (
      !start.label.trim()
    ) {
      setError(
        "Please select a starting point from the dropdown."
      );
      return;
    }

    if (
      !validLocationPoint(
        start
      )
    ) {
      setError(
        "Please choose the starting point from the dropdown so FoodKindl gets its exact location."
      );
      return;
    }

    if (
      !destination.label.trim()
    ) {
      setError(
        "Please select a destination from the dropdown."
      );
      return;
    }

    if (
      !validLocationPoint(
        destination
      )
    ) {
      setError(
        "Please choose the destination from the dropdown so FoodKindl gets its exact location."
      );
      return;
    }

    setLoading(true);
    setSelectedIds([]);
    setRestaurants([]);
    setRoute([]);
    setRouteMeta(null);

    try {
      /*
       * Your backend FoodWalkRecommendationView is a GET endpoint
       * and requires start_lat/start_lng/destination_lat/
       * destination_lng as query parameters.
       *
       * If the user typed a location but did not click an
       * autocomplete suggestion, resolve it here automatically.
       */
      const resolvedStart =
        validLocationPoint(
          start
        )
          ? {
              ...start,
              latitude:
                Number(
                  start.latitude
                ),
              longitude:
                Number(
                  start.longitude
                ),
            }
          : await geocodeLocation(
              start.label
            );

      const resolvedDestination =
        validLocationPoint(
          destination
        )
          ? {
              ...destination,
              latitude:
                Number(
                  destination.latitude
                ),
              longitude:
                Number(
                  destination.longitude
                ),
            }
          : await geocodeLocation(
              destination.label
            );

      setStart(
        resolvedStart
      );

      setDestination(
        resolvedDestination
      );

      /*
       * Resolve optional waypoints too so the UI never keeps
       * labels with null coordinates. The current backend route
       * endpoint accepts start + destination; waypoint support
       * can be added server-side later.
       */
      const resolvedWaypoints =
        [];

      for (
        const waypoint
        of waypoints
      ) {
        if (
          !String(
            waypoint?.label ||
            ""
          ).trim()
        ) {
          continue;
        }

        const resolved =
          validLocationPoint(
            waypoint
          )
            ? {
                ...waypoint,
                latitude:
                  Number(
                    waypoint.latitude
                  ),
                longitude:
                  Number(
                    waypoint.longitude
                  ),
              }
            : await geocodeLocation(
                waypoint.label
              );

        resolvedWaypoints.push(
          resolved
        );
      }

      if (
        resolvedWaypoints.length
      ) {
        setWaypoints(
          resolvedWaypoints
        );
      }

      const searchParams =
        getFoodWalkSearchParams(
          category,
          exploration,
          travelMode
        );

      const response =
        await api.get(
          FOOD_WALK_ENDPOINT,
          {
            params: {
              // Send BOTH readable labels and exact coordinates.
              // This works with both your current and corrected backend.
              start:
                resolvedStart.label,

              destination:
                resolvedDestination.label,

              start_lat:
                resolvedStart.latitude,

              start_lng:
                resolvedStart.longitude,

              destination_lat:
                resolvedDestination.latitude,

              destination_lng:
                resolvedDestination.longitude,

              ...searchParams,
            },
          }
        );

      const data =
        response?.data ||
        {};

      console.log(
        "FOOD WALK RESPONSE:",
        data
      );

      const rawRestaurants =
        data?.restaurants ||
        data?.places ||
        data?.results ||
        [];

      const normalized =
        rawRestaurants
          .map(
            normalizeRestaurant
          )
          .filter(
            place =>
              Number.isFinite(
                place.latitude
              ) &&
              Number.isFinite(
                place.longitude
              )
          );

      setRestaurants(
        normalized
      );

      /*
       * Some backend versions expose route geometry while older
       * versions expose only distance + duration.
       */
      const rawRoute =
        data?.route
          ?.coordinates ||
        data?.route_coordinates ||
        data?.polyline ||
        data?.route_points ||
        [];

      const leafletRoute =
        Array.isArray(
          rawRoute
        )
          ? rawRoute
              .map(
                point => {
                  if (
                    !Array.isArray(
                      point
                    ) ||
                    point.length <
                      2
                  ) {
                    return null;
                  }

                  const [
                    a,
                    b,
                  ] = point;

                  /*
                   * Backend service generally uses [lat, lng].
                   * GeoJSON generally uses [lng, lat].
                   */
                  if (
                    Math.abs(
                      Number(a)
                    ) > 90
                  ) {
                    return [
                      Number(b),
                      Number(a),
                    ];
                  }

                  return [
                    Number(a),
                    Number(b),
                  ];
                }
              )
              .filter(
                point =>
                  point &&
                  Number.isFinite(
                    point[0]
                  ) &&
                  Number.isFinite(
                    point[1]
                  )
              )
          : [];

      setRoute(
        leafletRoute
      );

      setRouteMeta({
        duration_minutes:
          data
            ?.route_duration_minutes ??
          data
            ?.duration_minutes ??
          data?.route
            ?.duration_minutes ??
          null,

        distance_km:
          data
            ?.route_distance_km ??
          data
            ?.distance_km ??
          data?.route
            ?.distance_km ??
          null,
      });

      if (
        normalized.length ===
        0
      ) {
        setError(
          "The route was found, but no matching food stops were returned. Try All, Restaurants, Cafés, or Balanced."
        );
      }

    } catch (
      requestError
    ) {
      console.error(
        "FOOD WALK ERROR:",
        requestError?.response
          ?.status,
        requestError?.response
          ?.data,
        requestError
      );

      const backend =
        requestError?.response
          ?.data;

      setError(
        (
          !requestError
            ?.response &&
          requestError
            ?.message
        )
          ? requestError.message
          : backend?.detail ||
            backend?.error ||
            backend
              ?.technical_detail ||
            "Unable to build your Food Walk."
      );

    } finally {
      setLoading(false);
    }
  }

  const visibleRestaurants =
    useMemo(() => {
      return restaurants.filter(
        (place) => {
          if (
            category === "All"
          ) {
            return true;
          }

          const search = [
            place.category,
            ...place.cuisines,
            place.description,
          ]
            .join(" ")
            .toLowerCase();

          return search.includes(
            category.toLowerCase()
          );
        }
      );
    }, [
      restaurants,
      category,
    ]);

  function toggleRestaurant(id) {
    setSelectedIds(
      (previous) =>
        previous.includes(id)
          ? previous.filter(
              (item) =>
                item !== id
            )
          : [
              ...previous,
              id,
            ]
    );
  }

  function showRestaurant(
    place
  ) {
    setActiveRestaurantId(
      place.id
    );

    cardRefs.current[
      place.id
    ]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function buildMyFoodRoute() {
    const desiredStops =
      exploration === "quick"
        ? 2
        : exploration ===
          "explorer"
        ? 5
        : 3;

    const best =
      [...visibleRestaurants]
        .sort(
          (a, b) =>
            b.rating -
              a.rating ||
            a.detour_minutes -
              b.detour_minutes
        )
        .slice(
          0,
          desiredStops
        );

    setSelectedIds(
      best.map(
        (place) =>
          place.id
      )
    );
  }

  const selectedRestaurants =
    visibleRestaurants.filter(
      (place) =>
        selectedIds.includes(
          place.id
        )
    );

  async function createFoodWalkInvite() {
    setSaving(true);
    setError("");

    try {
      if (
        selectedRestaurants
          .length < 1
      ) {
        throw new Error(
          "Please select at least one food stop."
        );
      }

      if (
        !eventForm.title.trim()
      ) {
        throw new Error(
          "Please enter a Food Walk title."
        );
      }

      if (
        !eventForm.start_at
      ) {
        throw new Error(
          "Please select the Food Walk date and time."
        );
      }

      if (
        eventForm.recipients
          .length < 1
      ) {
        throw new Error(
          "Please invite at least one person."
        );
      }

      await api.post(
        INVITES_ENDPOINT,
        {
          invite_type:
            "food_walk",

          title:
            eventForm.title.trim(),

          description:
            `Food Walk from ${start.label} to ${destination.label}`,

          start_at:
            new Date(
              eventForm.start_at
            ).toISOString(),

          location_label:
            `${start.label} → ${destination.label}`,

          max_participants:
            Number(
              eventForm.max_participants
            ),

          verified_only:
            eventForm.verified_only,

          women_only:
            eventForm.women_only,

          recipient_user_ids:
            eventForm.recipients
              .map(Number)
              .filter(Boolean),

          food_walk_stops:
            selectedRestaurants.map(
              (place, index) => ({
                order:
                  index + 1,
                place_id:
                  place.id,
                name:
                  place.name,
                latitude:
                  place.latitude,
                longitude:
                  place.longitude,
                address:
                  place.address,
                detour_minutes:
                  place.detour_minutes,
              })
            ),

          travel_mode:
            travelMode,

          route_start:
            start,

          route_destination:
            destination,

          route_waypoints:
            waypoints,
        }
      );

      navigate(
        "/food-invites",
        {
          replace: true,
        }
      );
    } catch (requestError) {
      if (
        !requestError?.response &&
        requestError?.message
      ) {
        setError(
          requestError.message
        );
      } else {
        setError(
          requestError?.response
            ?.data?.detail ||
          requestError?.response
            ?.data?.error ||
          "Unable to create Food Walk invite."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="fw-page">
      <section className="fw-hero">
        <span className="fw-eyebrow">
          🚶 FOODKINDL FOOD WALK
        </span>

        <h1>
          Find food worth stopping for.
        </h1>

        <p>
          Plan a short walk, city exploration
          or longer journey and discover food
          along your actual route.
        </p>
      </section>

      <section className="fw-planner">
        <div className="fw-route-inputs">
          <div className="fw-location-row">
            <span className="fw-dot start" />

            <LocationInput
              value={start.label}
              onChange={(label) =>
                setStart(
                  (previous) => ({
                    ...previous,
                    label,
                    latitude:
                      null,
                    longitude:
                      null,
                  })
                )
              }
              onSelect={(place) =>
                setStart({
                  ...place,
                  label:
                    place.label,
                })
              }
              placeholder="Starting point"
            />
          </div>

          {waypoints.map(
            (
              waypoint,
              index
            ) => (
              <div
                className="fw-location-row"
                key={index}
              >
                <span className="fw-dot stop" />

                <LocationInput
                  value={
                    waypoint.label
                  }
                  onChange={(label) =>
                    updateWaypoint(
                      index,
                      {
                        label,
                        latitude:
                          null,
                        longitude:
                          null,
                      }
                    )
                  }
                  onSelect={(place) =>
                    updateWaypoint(
                      index,
                      place
                    )
                  }
                  placeholder={`Stop ${
                    index + 1
                  }`}
                />

                <button
                  type="button"
                  className="fw-remove"
                  onClick={() =>
                    removeWaypoint(
                      index
                    )
                  }
                >
                  ×
                </button>
              </div>
            )
          )}

          <button
            type="button"
            className="fw-add-stop"
            onClick={addWaypoint}
          >
            + Add stop
          </button>

          <div className="fw-location-row">
            <span className="fw-dot destination" />

            <LocationInput
              value={
                destination.label
              }
              onChange={(label) =>
                setDestination(
                  (previous) => ({
                    ...previous,
                    label,
                    latitude:
                      null,
                    longitude:
                      null,
                  })
                )
              }
              onSelect={(place) =>
                setDestination({
                  ...place,
                  label:
                    place.label,
                })
              }
              placeholder="Destination"
            />
          </div>
        </div>

        <div className="fw-mode-row">
          {TRAVEL_MODES.map(
            (mode) => (
              <button
                type="button"
                key={
                  mode.value
                }
                className={
                  travelMode ===
                  mode.value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTravelMode(
                    mode.value
                  )
                }
              >
                <span>
                  {mode.icon}
                </span>

                {mode.label}
              </button>
            )
          )}
        </div>

        <div className="fw-exploration">
          <span>
            How adventurous?
          </span>

          <div>
            {[
              [
                "quick",
                "Quick",
              ],
              [
                "balanced",
                "Balanced",
              ],
              [
                "explorer",
                "Food Explorer",
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
                    exploration ===
                    value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setExploration(
                      value
                    )
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>

        <div className="fw-category-scroll">
          {CATEGORIES.map(
            (item) => (
              <button
                type="button"
                key={item}
                className={
                  category === item
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCategory(item)
                }
              >
                {item}
              </button>
            )
          )}
        </div>

        <div className="fw-filter-actions">
          <button
            type="button"
            className="fw-secondary"
            onClick={() =>
              navigate(
                "/food-invites"
              )
            }
          >
            ← Food Invites
          </button>

          <button
            type="button"
            className="fw-primary"
            onClick={findFood}
            disabled={loading}
          >
            {loading
              ? "Finding food..."
              : "Find Food Along My Route"}
          </button>
        </div>
      </section>

      {error && (
        <div className="fw-alert">
          {error}
        </div>
      )}

      {(route.length > 0 ||
        visibleRestaurants
          .length > 0) && (
        <>
          <section className="fw-summary">
            <div>
              <strong>
                {
                  visibleRestaurants
                    .length
                }
              </strong>

              <span>
                food stops found
              </span>
            </div>

            <div>
              <strong>
                {routeMeta
                  ?.duration_minutes
                  ? `${Math.round(
                      routeMeta.duration_minutes
                    )} min`
                  : "—"}
              </strong>

              <span>
                base journey
              </span>
            </div>

            <div>
              <strong>
                {routeMeta
                  ?.distance_km
                  ? `${Number(
                      routeMeta.distance_km
                    ).toFixed(
                      1
                    )} km`
                  : "—"}
              </strong>

              <span>
                route distance
              </span>
            </div>
          </section>

          <section className="fw-results-layout">
            <div className="fw-map-panel">
              <MapContainer
                center={
                  DEFAULT_CENTER
                }
                zoom={11}
                scrollWheelZoom
                className="fw-map"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {route.length > 1 && (
                  <Polyline
                    positions={route}
                    pathOptions={{
                      weight: 5,
                    }}
                  />
                )}

                {visibleRestaurants.map(
                  (
                    place,
                    index
                  ) => {
                    if (
                      !Number.isFinite(
                        place.latitude
                      ) ||
                      !Number.isFinite(
                        place.longitude
                      )
                    ) {
                      return null;
                    }

                    const selected =
                      selectedIds.includes(
                        place.id
                      );

                    return (
                      <Marker
                        key={
                          place.id
                        }
                        position={[
                          place.latitude,
                          place.longitude,
                        ]}
                        icon={NumberedMarkerIcon(
                          index +
                            1,
                          selected
                        )}
                        eventHandlers={{
                          click:
                            () =>
                              showRestaurant(
                                place
                              ),
                        }}
                      >
                        <Popup>
                          <strong>
                            {
                              place.name
                            }
                          </strong>

                          <br />

                          ⭐{" "}
                          {place.rating ||
                            "—"}{" "}
                          · +
                          {
                            place.detour_minutes
                          }{" "}
                          min
                        </Popup>
                      </Marker>
                    );
                  }
                )}

                <MapAutoFit
                  route={route}
                  restaurants={
                    visibleRestaurants
                  }
                />
              </MapContainer>
            </div>

            <div className="fw-results-panel">
              <div className="fw-results-heading">
                <div>
                  <span className="fw-eyebrow">
                    YOUR FOOD OPTIONS
                  </span>

                  <h2>
                    Choose your stops
                  </h2>
                </div>

                <button
                  type="button"
                  className="fw-ai-route"
                  onClick={
                    buildMyFoodRoute
                  }
                >
                  ✨ Build My Food Route
                </button>
              </div>

              <div className="fw-card-list">
                {visibleRestaurants.map(
                  (place) => {
                    const selected =
                      selectedIds.includes(
                        place.id
                      );

                    const active =
                      activeRestaurantId ===
                      place.id;

                    return (
                      <article
                        key={
                          place.id
                        }
                        ref={(
                          node
                        ) => {
                          cardRefs.current[
                            place.id
                          ] =
                            node;
                        }}
                        className={`fw-place-card ${
                          active
                            ? "active"
                            : ""
                        }`}
                      >
                        <div className="fw-place-image">
                          {place.image ? (
                            <img
                              src={
                                place.image
                              }
                              alt={
                                place.name
                              }
                            />
                          ) : (
                            <div className="fw-image-fallback">
                              🍴
                            </div>
                          )}
                        </div>

                        <div className="fw-place-main">
                          <div className="fw-place-title-row">
                            <div>
                              <h4>
                                {
                                  place.name
                                }
                              </h4>

                              <div className="fw-place-sub">
                                <span>
                                  ⭐{" "}
                                  {place.rating ||
                                    "New"}
                                </span>

                                {place.review_count >
                                  0 && (
                                  <span>
                                    {place.review_count.toLocaleString(
                                      "en-IN"
                                    )}{" "}
                                    reviews
                                  </span>
                                )}

                                {place.price_level && (
                                  <span>
                                    {
                                      place.price_level
                                    }
                                  </span>
                                )}
                              </div>
                            </div>

                            {place.source ===
                              "foodkindl" && (
                              <span className="fw-kindl-badge">
                                FoodKindl
                                Place ✓
                              </span>
                            )}
                          </div>

                          <div className="fw-tags">
                            <span>
                              {
                                place.category
                              }
                            </span>

                            {place.cuisines
                              .slice(
                                0,
                                3
                              )
                              .map(
                                (
                                  item
                                ) => (
                                  <span
                                    key={
                                      item
                                    }
                                  >
                                    {
                                      item
                                    }
                                  </span>
                                )
                              )}
                          </div>

                          {(place.address ||
                            place.locality ||
                            place.city) && (
                            <div className="fw-place-location">
                              <span>
                                📍
                              </span>

                              <span>
                                {place.address ||
                                  [
                                    place.locality,
                                    place.city,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                              </span>
                            </div>
                          )}

                          {(place.tel ||
                            place.website) && (
                            <div className="fw-place-contact">
                              {place.tel && (
                                <a
                                  href={`tel:${place.tel}`}
                                >
                                  ☎ {place.tel}
                                </a>
                              )}

                              {place.website && (
                                <a
                                  href={place.website}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  🌐 Website
                                </a>
                              )}
                            </div>
                          )}

                          {place.opening_hours && (
                            <div className="fw-place-hours">
                              🕒{" "}
                              {Array.isArray(
                                place.opening_hours
                              )
                                ? place.opening_hours
                                    .map(
                                      (item) =>
                                        typeof item ===
                                        "string"
                                          ? item
                                          : item?.display ||
                                            item?.day ||
                                            ""
                                    )
                                    .filter(Boolean)
                                    .join(" · ")
                                : typeof place.opening_hours ===
                                  "object"
                                ? JSON.stringify(
                                    place.opening_hours
                                  )
                                : String(
                                    place.opening_hours
                                  )}
                            </div>
                          )}

                          <div className="fw-route-meta">
                            <strong>
                              +
                              {Math.round(
                                place.detour_minutes
                              )}{" "}
                              min
                              detour
                            </strong>

                            {place.open_now ===
                              true && (
                              <span className="fw-open">
                                Open
                                now
                              </span>
                            )}
                          </div>

                          {place.description && (
                            <p className="fw-description">
                              <strong>
                                Why
                                stop
                                here?
                              </strong>{" "}
                              {
                                place.recommendation_reason ||
                                place.description
                              }
                            </p>
                          )}

                          <div className="fw-place-actions">
                            <button
                              type="button"
                              className="fw-secondary"
                              onClick={() =>
                                showRestaurant(
                                  place
                                )
                              }
                            >
                              Show on map
                            </button>

                            <button
                              type="button"
                              className={
                                selected
                                  ? "fw-remove-route"
                                  : "fw-primary"
                              }
                              onClick={() =>
                                toggleRestaurant(
                                  place.id
                                )
                              }
                            >
                              {selected
                                ? "Remove stop"
                                : "+ Add to Food Walk"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {selectedRestaurants.length >
        0 && (
        <section className="fi-create-card">
          <div className="fi-form-heading">
            <div>
              <span className="fi-eyebrow">
                INVITE PEOPLE
              </span>

              <h2>
                Turn this route into a Food Walk
              </h2>
            </div>
          </div>

          <div className="fi-grid">
            <label className="fi-field fi-span-2">
              <span>
                Food Walk title *
              </span>

              <input
                value={
                  eventForm.title
                }
                onChange={(event) =>
                  setEventForm(
                    (previous) => ({
                      ...previous,
                      title:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Saturday Bengaluru Food Walk"
              />
            </label>

            <label className="fi-field">
              <span>
                Date & time *
              </span>

              <input
                type="datetime-local"
                value={
                  eventForm.start_at
                }
                onChange={(event) =>
                  setEventForm(
                    (previous) => ({
                      ...previous,
                      start_at:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </label>

            <label className="fi-field">
              <span>
                Maximum participants
              </span>

              <input
                type="number"
                min="2"
                value={
                  eventForm.max_participants
                }
                onChange={(event) =>
                  setEventForm(
                    (previous) => ({
                      ...previous,
                      max_participants:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </label>

            <div className="fi-span-2">
              <PeopleSelector
                selectedIds={
                  eventForm.recipients
                }
                onChange={(ids) =>
                  setEventForm(
                    (previous) => ({
                      ...previous,
                      recipients:
                        ids,
                    })
                  )
                }
                maxSelections={
                  Math.max(
                    Number(
                      eventForm.max_participants
                    ) - 1,
                    1
                  )
                }
              />
            </div>
          </div>

          <div className="fi-options">
            <label>
              <input
                type="checkbox"
                checked={
                  eventForm.verified_only
                }
                onChange={(event) =>
                  setEventForm(
                    (previous) => ({
                      ...previous,
                      verified_only:
                        event.target
                          .checked,
                    })
                  )
                }
              />

              Verified profiles only
            </label>

            <label>
              <input
                type="checkbox"
                checked={
                  eventForm.women_only
                }
                onChange={(event) =>
                  setEventForm(
                    (previous) => ({
                      ...previous,
                      women_only:
                        event.target
                          .checked,
                    })
                  )
                }
              />

              Women-only invite
            </label>
          </div>

          <div className="fi-form-actions">
            <button
              type="button"
              className="fi-primary"
              disabled={saving}
              onClick={
                createFoodWalkInvite
              }
            >
              {saving
                ? "Creating..."
                : "Create Food Walk Invite"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
