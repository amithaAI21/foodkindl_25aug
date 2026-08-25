import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Footprints,
  MapPin,
  Minus,
  Plus,
  Search,
  Star,
  Utensils,
  X,
} from "lucide-react";

import api from "../api";

import FoodWalkMap from "../components/FoodWalkMap";
import LocationAutocomplete from "../components/LocationAutocomplete";

import "../styles/food_walk.css";



const MAX_STOPS = 5;
const MIN_STOPS = 2;


/* ============================================================
   NORMALIZE STOP
============================================================ */

function normalizeStop(
  stop,
  index = 0
) {

  if (!stop) {
    return null;
  }


  if (
    typeof stop === "string"
  ) {

    const name =
      stop.trim();


    if (!name) {
      return null;
    }


    return {

      id:
        `manual-${index}-${name}`,

      restaurant_id:
        null,

      name,

      cuisine:
        "",

      locality:
        "",

      city:
        "",

      image_url:
        "",

      rating:
        null,

      latitude:
        null,

      longitude:
        null,

      distance_from_route_km:
        null,

      route_position:
        null,

      is_foodkindl_partner:
        false,

      source:
        "manual",
    };
  }


  const name =
    String(
      stop.name ||
      stop.venue_name ||
      stop.restaurant_name ||
      ""
    ).trim();


  if (!name) {
    return null;
  }


  return {

    id:
      stop.id ||
      stop.restaurant_id ||
      `stop-${index}-${name}`,

    restaurant_id:
      stop.restaurant_id ||
      stop.id ||
      null,

    name,

    cuisine:
      stop.cuisine ||
      "",

    locality:
      stop.locality ||
      "",

    city:
      stop.city ||
      "",

    image_url:
      stop.image_url ||
      stop.images?.[0]?.image_url ||
      "",

    rating:
      stop.rating ??
      null,

    latitude:
      stop.latitude ??
      stop.lat ??
      stop.restaurant_latitude ??
      null,

    longitude:
      stop.longitude ??
      stop.lng ??
      stop.lon ??
      stop.restaurant_longitude ??
      null,

    distance_from_route_km:
      stop.distance_from_route_km ??
      null,

    route_position:
      stop.route_position ??
      null,

    is_foodkindl_partner:
      stop.is_foodkindl_partner === true,

    source:
      stop.source ||
      "restaurant",
  };
}


/* ============================================================
   NORMALIZE RESTAURANT
============================================================ */

function normalizeRestaurant(
  restaurant
) {

  if (!restaurant) {
    return null;
  }


  const rawLatitude =
    restaurant.latitude ??
    restaurant.lat ??
    restaurant.restaurant_latitude ??
    null;


  const rawLongitude =
    restaurant.longitude ??
    restaurant.lng ??
    restaurant.lon ??
    restaurant.restaurant_longitude ??
    null;


  const latitude =
    rawLatitude !== null &&
    rawLatitude !== undefined &&
    rawLatitude !== ""
      ? Number(rawLatitude)
      : null;


  const longitude =
    rawLongitude !== null &&
    rawLongitude !== undefined &&
    rawLongitude !== ""
      ? Number(rawLongitude)
      : null;


  return {

    ...restaurant,

    latitude:
      Number.isFinite(latitude)
        ? latitude
        : null,

    longitude:
      Number.isFinite(longitude)
        ? longitude
        : null,

    image_url:
      restaurant.image_url ||
      restaurant.images?.[0]?.image_url ||
      "",

    rating:
      restaurant.rating ??
      null,

    distance_from_route_km:
      restaurant.distance_from_route_km ??
      null,

    route_position:
      restaurant.route_position ??
      null,

    is_foodkindl_partner:
      restaurant.is_foodkindl_partner === true,
  };
}


/* ============================================================
   RESTAURANT → STOP
============================================================ */

function restaurantToStop(
  restaurant
) {

  return {

    id:
      restaurant.id,

    restaurant_id:
      restaurant.id,

    name:
      restaurant.name,

    cuisine:
      restaurant.cuisine ||
      "",

    locality:
      restaurant.locality ||
      "",

    city:
      restaurant.city ||
      "",

    image_url:
      restaurant.image_url ||
      "",

    rating:
      restaurant.rating ??
      null,

    latitude:
      restaurant.latitude ??
      null,

    longitude:
      restaurant.longitude ??
      null,

    distance_from_route_km:
      restaurant.distance_from_route_km ??
      null,

    route_position:
      restaurant.route_position ??
      null,

    is_foodkindl_partner:
      restaurant.is_foodkindl_partner === true,

    source:
      "restaurant",
  };
}


/* ============================================================
   FOOD WALK PLANNER
============================================================ */

export default function FoodWalkPlanner({

  locationLabel = "",
  destination = "",
  cuisine = "",
  stops = [],

  onLocationChange,
  onDestinationChange,
  onCuisineChange,
  onStopsChange,

}) {


  /* =========================================================
     STATE
  ========================================================= */

  const [
    recommendations,
    setRecommendations,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    manualStop,
    setManualStop,
  ] = useState("");


  const [
    routeInfo,
    setRouteInfo,
  ] = useState(null);


  /*
   * Selected autocomplete locations.
   *
   * These contain:
   *
   * {
   *   name,
   *   display_name,
   *   latitude,
   *   longitude,
   *   city,
   *   state,
   *   ...
   * }
   */

  const [
    selectedStart,
    setSelectedStart,
  ] = useState(null);


  const [
    selectedDestination,
    setSelectedDestination,
  ] = useState(null);


  const [
    selectedRestaurantDetail,
    setSelectedRestaurantDetail,
  ] = useState(null);


  const [
    restaurantDetailLoading,
    setRestaurantDetailLoading,
  ] = useState(false);


  /* =========================================================
     NORMALIZED STOPS
  ========================================================= */

  const normalizedStops =
    useMemo(
      () => {

        const currentStops =
          Array.isArray(stops)
            ? stops
            : [];


        return currentStops

          .map(
            (
              stop,
              index
            ) =>
              normalizeStop(
                stop,
                index
              )
          )

          .filter(Boolean);

      },
      [
        stops,
      ]
    );


  /* =========================================================
     SELECTED RESTAURANT IDS
  ========================================================= */

  const selectedRestaurantIds =
    useMemo(
      () => {

        return new Set(

          normalizedStops

            .map(
              stop =>
                stop.restaurant_id
            )

            .filter(
              value =>
                value !== null &&
                value !== undefined
            )

            .map(Number)

        );

      },
      [
        normalizedStops,
      ]
    );


  /* =========================================================
     ESTIMATED TIME
  ========================================================= */

  const estimatedMinutes =
    useMemo(
      () => {

        if (
          normalizedStops.length === 0
        ) {

          return 0;
        }


        const stopMinutes =
          normalizedStops.length *
          40;


        const movementMinutes =
          Math.max(
            0,
            normalizedStops.length - 1
          )
          *
          10;


        return (
          stopMinutes +
          movementMinutes
        );

      },
      [
        normalizedStops.length,
      ]
    );


  const estimatedDuration =
    useMemo(
      () => {

        if (!estimatedMinutes) {

          return (
            "Add stops to estimate time"
          );
        }


        const hours =
          Math.floor(
            estimatedMinutes /
            60
          );


        const minutes =
          estimatedMinutes %
          60;


        if (
          hours &&
          minutes
        ) {

          return (
            `${hours} hr ${minutes} min`
          );
        }


        if (hours) {

          return (
            `${hours} hr`
          );
        }


        return (
          `${minutes} min`
        );

      },
      [
        estimatedMinutes,
      ]
    );


  /* =========================================================
     LOAD FOOD WALK RECOMMENDATIONS
  ========================================================= */

  async function loadRecommendations() {

    const startValue =
      locationLabel.trim();


    const destinationValue =
      destination.trim();


    if (
      !startValue ||
      !destinationValue
    ) {

      setRecommendations(
        []
      );


      setRouteInfo(
        null
      );


      setError(
        ""
      );


      return;
    }


    try {

      setLoading(
        true
      );


      setError(
        ""
      );


      /* =====================================================
         BUILD PARAMETERS

         If autocomplete coordinates exist we send them.

         Backend can use coordinates directly instead of
         geocoding the text again.
      ===================================================== */

      const params = {

        start:
          startValue,

        destination:
          destinationValue,

        cuisine:
          cuisine.trim(),

        max_detour_km:
          2,
      };


      if (
        selectedStart?.latitude !==
          undefined &&
        selectedStart?.latitude !==
          null
      ) {

        params.start_lat =
          selectedStart.latitude;
      }


      if (
        selectedStart?.longitude !==
          undefined &&
        selectedStart?.longitude !==
          null
      ) {

        params.start_lng =
          selectedStart.longitude;
      }


      if (
        selectedDestination?.latitude !==
          undefined &&
        selectedDestination?.latitude !==
          null
      ) {

        params.destination_lat =
          selectedDestination.latitude;
      }


      if (
        selectedDestination?.longitude !==
          undefined &&
        selectedDestination?.longitude !==
          null
      ) {

        params.destination_lng =
          selectedDestination.longitude;
      }


      const response =
        await api.get(
          "/restaurants/food-walk/",
          {
            params,
          }
        );


      const data =
        response.data ||
        {};


      const rawRestaurants =
        Array.isArray(
          data.restaurants
        )
          ? data.restaurants
          : [];


      const normalizedRestaurants =
        rawRestaurants

          .map(
            normalizeRestaurant
          )

          .filter(Boolean);


      console.log(
        "FOOD WALK API:",
        data
      );


      console.log(
        "FOOD WALK START:",
        data.start
      );


      console.log(
        "FOOD WALK DESTINATION:",
        data.destination
      );


      console.log(
        "FOOD WALK RESTAURANTS:",
        normalizedRestaurants
      );


      setRecommendations(
        normalizedRestaurants
      );


      setRouteInfo(
        {

          start:
            data.start ||
            (
              selectedStart
                ? {
                    name:
                      selectedStart.name,

                    latitude:
                      selectedStart.latitude,

                    longitude:
                      selectedStart.longitude,

                    matched_location:
                      selectedStart.display_name,
                  }
                : null
            ),

          destination:
            data.destination ||
            (
              selectedDestination
                ? {
                    name:
                      selectedDestination.name,

                    latitude:
                      selectedDestination.latitude,

                    longitude:
                      selectedDestination.longitude,

                    matched_location:
                      selectedDestination.display_name,
                  }
                : null
            ),

          routeType:
            data.route_type ||
            "",

          routeDistance:
            data.route_distance_km ??
            null,

          maxDetour:
            data.max_detour_km ??
            null,

          restaurantCount:
            data.restaurant_count ??
            normalizedRestaurants.length,
        }
      );


    } catch (
      requestError
    ) {

      console.error(
        "Food Walk recommendation error:",
        requestError.response?.data ||
        requestError
      );


      setRecommendations(
        []
      );


      setRouteInfo(
        null
      );


      setError(
        requestError
          ?.response
          ?.data
          ?.detail
        ||
        "Food Walk recommendations could not be loaded."
      );


    } finally {

      setLoading(
        false
      );
    }
  }


  /* =========================================================
     AUTO LOAD

     Wait 600ms after typing/selecting.
  ========================================================= */

  useEffect(
    () => {

      const timer =
        window.setTimeout(
          () => {

            loadRecommendations();

          },
          600
        );


      return () => {

        window.clearTimeout(
          timer
        );

      };

    },
    [
      locationLabel,
      destination,
      cuisine,
      selectedStart,
      selectedDestination,
    ]
  );


  /* =========================================================
     START LOCATION CHANGE
  ========================================================= */

  function handleStartChange(
    value
  ) {

    /*
     * User typed something after previously
     * selecting a suggestion.
     *
     * Clear old coordinates.
     */

    setSelectedStart(
      null
    );


    onLocationChange?.(
      value
    );
  }


  /* =========================================================
     START LOCATION SELECT
  ========================================================= */

  function handleStartSelect(
    place
  ) {

    setSelectedStart(
      place
    );


    onLocationChange?.(
      place.name ||
      place.display_name ||
      ""
    );
  }


  /* =========================================================
     DESTINATION CHANGE
  ========================================================= */

  function handleDestinationChange(
    value
  ) {

    setSelectedDestination(
      null
    );


    onDestinationChange?.(
      value
    );
  }


  /* =========================================================
     DESTINATION SELECT
  ========================================================= */

  function handleDestinationSelect(
    place
  ) {

    setSelectedDestination(
      place
    );


    onDestinationChange?.(
      place.name ||
      place.display_name ||
      ""
    );
  }


  /* =========================================================
     UPDATE STOPS
  ========================================================= */

  function updateStops(
    nextStops
  ) {

    onStopsChange?.(
      nextStops.slice(
        0,
        MAX_STOPS
      )
    );
  }


  /* =========================================================
     ADD RECOMMENDED RESTAURANT
  ========================================================= */

  function addRestaurant(
    restaurant
  ) {

    if (
      normalizedStops.length >=
      MAX_STOPS
    ) {

      setError(
        `A Food Walk can have up to ${MAX_STOPS} stops.`
      );

      return;
    }


    const restaurantId =
      Number(
        restaurant.id
      );


    if (
      selectedRestaurantIds.has(
        restaurantId
      )
    ) {

      return;
    }


    const newStop =
      restaurantToStop(
        restaurant
      );


    updateStops(
      [
        ...normalizedStops,
        newStop,
      ]
    );


    setError(
      ""
    );
  }


  /* =========================================================
     ADD MANUAL STOP
  ========================================================= */

  function addManualStop() {

    const name =
      manualStop.trim();


    if (!name) {
      return;
    }


    if (
      normalizedStops.length >=
      MAX_STOPS
    ) {

      setError(
        `A Food Walk can have up to ${MAX_STOPS} stops.`
      );

      return;
    }


    const newStop = {

      id:
        `manual-${Date.now()}`,

      restaurant_id:
        null,

      name,

      cuisine:
        "",

      locality:
        "",

      city:
        "",

      image_url:
        "",

      rating:
        null,

      latitude:
        null,

      longitude:
        null,

      distance_from_route_km:
        null,

      route_position:
        null,

      is_foodkindl_partner:
        false,

      source:
        "manual",
    };


    updateStops(
      [
        ...normalizedStops,
        newStop,
      ]
    );


    setManualStop(
      ""
    );


    setError(
      ""
    );
  }


  /* =========================================================
     REMOVE STOP
  ========================================================= */

  function removeStop(
    index
  ) {

    const nextStops =
      normalizedStops.filter(
        (
          _,
          currentIndex
        ) =>
          currentIndex !==
          index
      );


    updateStops(
      nextStops
    );
  }


  /* =========================================================
     MOVE STOP
  ========================================================= */

  function moveStop(
    index,
    direction
  ) {

    const targetIndex =
      index +
      direction;


    if (
      targetIndex < 0 ||
      targetIndex >=
      normalizedStops.length
    ) {

      return;
    }


    const nextStops = [
      ...normalizedStops,
    ];


    [
      nextStops[index],
      nextStops[targetIndex],
    ] = [
      nextStops[targetIndex],
      nextStops[index],
    ];


    updateStops(
      nextStops
    );
  }


  /* =========================================================
     RESTAURANT DETAILS
  ========================================================= */

  async function openRestaurantDetail(
    restaurant
  ) {

    if (!restaurant) {
      return;
    }


    setSelectedRestaurantDetail(
      restaurant
    );


    if (!restaurant.id) {
      return;
    }


    try {

      setRestaurantDetailLoading(
        true
      );


      const response =
        await api.get(
          `/restaurants/${restaurant.id}/`
        );


      if (
        response?.data
      ) {

        setSelectedRestaurantDetail(
          {
            ...restaurant,
            ...response.data,
          }
        );
      }


    } catch (
      requestError
    ) {

      console.error(
        "Restaurant detail error:",
        requestError?.response?.data ||
        requestError
      );


    } finally {

      setRestaurantDetailLoading(
        false
      );
    }
  }


  function closeRestaurantDetail() {

    setSelectedRestaurantDetail(
      null
    );


    setRestaurantDetailLoading(
      false
    );
  }


  /* =========================================================
     ROUTE READY
  ========================================================= */

  const routeReady =
    normalizedStops.length >=
    MIN_STOPS;


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <section className="food-walk-experience">

      <div className="food-walk-workspace">


        {/* =====================================================
            LEFT SIDE
        ====================================================== */}

        <div className="food-walk-workspace-left">


          {/* ===================================================
              HERO
          ==================================================== */}

          <div className="food-walk-hero">

            <div>

              <div className="food-walk-eyebrow">

                <Footprints
                  size={15}
                />

                FOODKINDL FOOD WALK

              </div>


              <h2>

                Build a food journey,

                <span>
                  {" "}
                  one stop at a time.
                </span>

              </h2>


              <p>

                Choose your starting point and destination.
                Discover restaurants and cafes along your
                route, then add your favourite stops.

              </p>

            </div>


            <div className="food-walk-hero-status">

              <strong>
                {
                  normalizedStops.length
                }
              </strong>

              <span>
                of {MAX_STOPS} stops
              </span>

            </div>

          </div>


          {/* ===================================================
              ROUTE SEARCH
          ==================================================== */}

          <div className="food-walk-search-card">


            {/* START */}

            <div className="food-walk-search-point">

              <div className="food-walk-point-icon">

                <MapPin
                  size={17}
                />

              </div>


              <label>

                <span>
                  Start
                </span>


                <LocationAutocomplete

                  value={
                    locationLabel
                  }

                  placeholder={
                    "Search starting point"
                  }

                  onChange={
                    handleStartChange
                  }

                  onSelect={
                    handleStartSelect
                  }

                />

              </label>

            </div>


            {/* CONNECTOR */}

            <div className="food-walk-search-line">

              <span />

              <Footprints
                size={17}
              />

              <span />

            </div>


            {/* DESTINATION */}

            <div className="food-walk-search-point">

              <div className="food-walk-point-icon destination">

                <MapPin
                  size={17}
                />

              </div>


              <label>

                <span>
                  Destination
                </span>


                <LocationAutocomplete

                  value={
                    destination
                  }

                  placeholder={
                    "Search destination"
                  }

                  onChange={
                    handleDestinationChange
                  }

                  onSelect={
                    handleDestinationSelect
                  }

                />

              </label>

            </div>


            {/* CUISINE */}

            <div className="food-walk-food-filter">

              <Search
                size={16}
              />


              <input

                type="text"

                value={
                  cuisine
                }

                onChange={
                  event =>
                    onCuisineChange?.(
                      event.target.value
                    )
                }

                placeholder={
                  "Kerala, cafe, dessert..."
                }

              />

            </div>

          </div>


          {/* ===================================================
              SELECTED LOCATION INFO
          ==================================================== */}

          {
            (
              selectedStart ||
              selectedDestination
            ) &&
            (

              <div className="food-walk-route-strip">

                <div>

                  <MapPin
                    size={14}
                  />


                  <strong>

                    {
                      selectedStart
                        ?.name ||
                      locationLabel
                    }

                  </strong>


                  <span className="food-walk-route-arrow">
                    →
                  </span>


                  <strong>

                    {
                      selectedDestination
                        ?.name ||
                      destination
                    }

                  </strong>

                </div>


                <div className="food-walk-route-meta">

                  {
                    selectedStart?.city &&
                    (

                      <span>
                        {
                          selectedStart.city
                        }
                      </span>

                    )
                  }


                  {
                    selectedDestination?.city &&
                    (

                      <span>
                        {
                          selectedDestination.city
                        }
                      </span>

                    )
                  }

                </div>

              </div>

            )
          }


          {/* ===================================================
              ROUTE SUMMARY
          ==================================================== */}

          {
            routeInfo &&
            (

              <div className="food-walk-route-strip">

                <div>

                  <MapPin
                    size={14}
                  />


                  <strong>
                    {
                      locationLabel
                    }
                  </strong>


                  <span className="food-walk-route-arrow">
                    →
                  </span>


                  <strong>
                    {
                      destination
                    }
                  </strong>

                </div>


                <div className="food-walk-route-meta">

                  {
                    routeInfo.routeDistance !==
                      null &&
                    (

                      <span>

                        {
                          routeInfo.routeDistance
                        } km

                      </span>

                    )
                  }


                  <span>
                    {
                      estimatedDuration
                    }
                  </span>


                  {
                    routeInfo.routeType &&
                    (

                      <span className="highlight">

                        {
                          routeInfo.routeType ===
                          "food_trail"
                            ? "Food Trail"
                            : "Food Walk"
                        }

                      </span>

                    )
                  }

                </div>

              </div>

            )
          }


          {/* ===================================================
              JOURNEY
          ==================================================== */}

          <div className="food-walk-main-layout">

            <div className="food-walk-journey">

              <div className="food-walk-section-header">

                <div>

                  <span>
                    YOUR JOURNEY
                  </span>

                  <h3>
                    Build your route
                  </h3>

                </div>


                <small>

                  {
                    routeReady
                      ? "Ready"
                      :
                      `Add ${Math.max(
                        MIN_STOPS -
                        normalizedStops.length,
                        0
                      )} more`
                  }

                </small>

              </div>


              {/* START */}

              <div className="food-walk-timeline-point">

                <div className="food-walk-timeline-dot" />


                <div>

                  <span>
                    START
                  </span>


                  <strong>

                    {
                      selectedStart
                        ?.display_name ||
                      locationLabel ||
                      "Choose starting point"
                    }

                  </strong>

                </div>

              </div>


              {/* =================================================
                  STOPS
              ================================================== */}

              <div className="food-walk-timeline">

                {
                  normalizedStops.length ===
                  0
                    ? (

                      <div className="food-walk-empty">

                        <Utensils
                          size={27}
                        />

                        <strong>
                          No food stops yet
                        </strong>

                        <span>
                          Add a restaurant or cafe
                          from the recommendations.
                        </span>

                      </div>

                    )
                    : (

                      normalizedStops.map(
                        (
                          stop,
                          index
                        ) => (

                          <div
                            className="food-walk-timeline-stop"
                            key={
                              `${stop.id}-${index}`
                            }
                          >

                            <div className="food-walk-timeline-marker">

                              <span>
                                {
                                  index + 1
                                }
                              </span>

                            </div>


                            <div className="food-walk-stop-card">

                              {
                                stop.image_url
                                  ? (

                                    <img
                                      src={
                                        stop.image_url
                                      }
                                      alt={
                                        stop.name
                                      }
                                    />

                                  )
                                  : (

                                    <div className="food-walk-stop-placeholder">

                                      <Utensils
                                        size={21}
                                      />

                                    </div>

                                  )
                              }


                              <div className="food-walk-stop-info">

                                <div className="food-walk-stop-title">

                                  <strong>
                                    {
                                      stop.name
                                    }
                                  </strong>


                                  {
                                    stop.is_foodkindl_partner &&
                                    (

                                      <span className="food-walk-partner">

                                        <Check
                                          size={10}
                                        />

                                        Partner

                                      </span>

                                    )
                                  }

                                </div>


                                <span>

                                  {
                                    [
                                      stop.cuisine,
                                      stop.locality,
                                      stop.city,
                                    ]
                                      .filter(Boolean)
                                      .join(" • ")
                                    ||
                                    "Food stop"
                                  }

                                </span>


                                {
                                  stop.rating !==
                                    null &&
                                  (

                                    <small>

                                      <Star
                                        size={11}
                                        fill="currentColor"
                                      />

                                      {
                                        stop.rating
                                      }

                                    </small>

                                  )
                                }


                                {
                                  stop.distance_from_route_km !==
                                    null &&
                                  (

                                    <small>

                                      <MapPin
                                        size={11}
                                      />

                                      {
                                        stop.distance_from_route_km
                                      } km from route

                                    </small>

                                  )
                                }

                              </div>


                              <div className="food-walk-stop-controls">

                                <button
                                  type="button"
                                  onClick={() =>
                                    moveStop(
                                      index,
                                      -1
                                    )
                                  }
                                  disabled={
                                    index === 0
                                  }
                                >

                                  <ArrowUp
                                    size={13}
                                  />

                                </button>


                                <button
                                  type="button"
                                  onClick={() =>
                                    moveStop(
                                      index,
                                      1
                                    )
                                  }
                                  disabled={
                                    index ===
                                    normalizedStops.length - 1
                                  }
                                >

                                  <ArrowDown
                                    size={13}
                                  />

                                </button>


                                <button
                                  type="button"
                                  className="remove"
                                  onClick={() =>
                                    removeStop(
                                      index
                                    )
                                  }
                                >

                                  <Minus
                                    size={13}
                                  />

                                </button>

                              </div>

                            </div>

                          </div>

                        )
                      )

                    )
                }

              </div>


              {/* DESTINATION */}

              <div className="food-walk-timeline-point destination">

                <div className="food-walk-timeline-dot destination" />


                <div>

                  <span>
                    DESTINATION
                  </span>


                  <strong>

                    {
                      selectedDestination
                        ?.display_name ||
                      destination ||
                      "Choose destination"
                    }

                  </strong>

                </div>

              </div>


              {/* =================================================
                  MANUAL STOP
              ================================================== */}

              <div className="food-walk-custom-stop">

                <Plus
                  size={16}
                />


                <input

                  type="text"

                  value={
                    manualStop
                  }

                  onChange={
                    event =>
                      setManualStop(
                        event.target.value
                      )
                  }

                  onKeyDown={
                    event => {

                      if (
                        event.key ===
                        "Enter"
                      ) {

                        event.preventDefault();

                        addManualStop();
                      }

                    }
                  }

                  placeholder={
                    "Add a place manually"
                  }

                  disabled={
                    normalizedStops.length >=
                    MAX_STOPS
                  }

                />


                <button

                  type="button"

                  onClick={
                    addManualStop
                  }

                  disabled={
                    normalizedStops.length >=
                      MAX_STOPS
                    ||
                    !manualStop.trim()
                  }

                >

                  Add

                </button>

              </div>


              {/* READY */}

              <div
                className={
                  routeReady
                    ? "food-walk-ready ready"
                    : "food-walk-ready"
                }
              >

                {
                  routeReady
                    ? (

                      <>

                        <Check
                          size={16}
                        />

                        Your Food Walk is ready

                      </>

                    )
                    : (

                      <>

                        <Footprints
                          size={16}
                        />

                        Add at least{" "}
                        {
                          MIN_STOPS
                        } stops

                      </>

                    )
                }

              </div>

            </div>

          </div>

        </div>


        {/* =====================================================
            RIGHT MAP
        ====================================================== */}

        <aside className="food-walk-workspace-map">

          <div className="food-walk-map-panel-label">

            <span>
              LIVE ROUTE
            </span>

            <strong>
              Navigation preview
            </strong>

          </div>


          <div className="food-walk-map-section">

            <div className="food-walk-map-heading">

              <MapPin
                size={16}
              />


              <div>

                <strong>
                  Route preview
                </strong>


                <span>

                  {
                    locationLabel &&
                    destination
                      ? (
                        `${locationLabel} → ${destination}`
                      )
                      : (
                        "Enter a start and destination."
                      )
                  }

                </span>

              </div>

            </div>


            <FoodWalkMap

              start={
                routeInfo?.start ||
                (
                  selectedStart
                    ? {
                        name:
                          selectedStart.name,

                        latitude:
                          selectedStart.latitude,

                        longitude:
                          selectedStart.longitude,
                      }
                    : null
                )
              }

              destination={
                routeInfo?.destination ||
                (
                  selectedDestination
                    ? {
                        name:
                          selectedDestination.name,

                        latitude:
                          selectedDestination.latitude,

                        longitude:
                          selectedDestination.longitude,
                      }
                    : null
                )
              }

              restaurants={
                recommendations
              }

              selectedStops={
                normalizedStops
              }

              startLabel={
                locationLabel
              }

              destinationLabel={
                destination
              }

              navigationEnabled={
                routeReady
              }

            />

          </div>


          {/* ===================================================
              PLACES WORTH A STOP
          ==================================================== */}

          <div className="food-walk-map-recommendations">

            <aside className="food-walk-discover">

              <div className="food-walk-section-header">

                <div>

                  <span>
                    ALONG YOUR ROUTE
                  </span>

                  <h3>
                    Places worth a stop
                  </h3>

                </div>


                {
                  routeInfo &&
                  (

                    <small>

                      {
                        routeInfo.restaurantCount
                      } found

                    </small>

                  )
                }

              </div>


              {/* ERROR */}

              {
                error &&
                (

                  <div className="food-walk-error">

                    {
                      error
                    }

                  </div>

                )
              }


              {/* EMPTY */}

              {
                (
                  !locationLabel.trim() ||
                  !destination.trim()
                )
                  ? (

                    <div className="food-walk-discover-empty">

                      <MapPin
                        size={26}
                      />

                      <strong>
                        Tell us your route
                      </strong>

                      <span>
                        Enter a starting point
                        and destination.
                      </span>

                    </div>

                  )

                  : loading
                    ? (

                      <div className="food-walk-discover-empty">

                        <Footprints
                          size={25}
                        />

                        <strong>
                          Finding nearby places...
                        </strong>

                      </div>

                    )

                    : recommendations.length ===
                      0
                      ? (

                        <div className="food-walk-discover-empty">

                          <Utensils
                            size={26}
                          />

                          <strong>
                            No places found
                          </strong>

                          <span>
                            Try another route
                            or cuisine.
                          </span>

                        </div>

                      )

                      : (

                        <div className="food-walk-discover-list">

                          {
                            recommendations.map(
                              restaurant => {

                                const selected =
                                  selectedRestaurantIds.has(
                                    Number(
                                      restaurant.id
                                    )
                                  );


                                const imageUrl =
                                  restaurant.image_url ||
                                  "";


                                return (

                                  <article

                                    key={
                                      restaurant.id
                                    }

                                    className={
                                      selected
                                        ? "food-walk-place selected"
                                        : "food-walk-place"
                                    }

                                    role="button"

                                    tabIndex={0}

                                    onClick={() =>
                                      openRestaurantDetail(
                                        restaurant
                                      )
                                    }

                                    onKeyDown={
                                      event => {

                                        if (
                                          event.key ===
                                            "Enter" ||
                                          event.key ===
                                            " "
                                        ) {

                                          event.preventDefault();

                                          openRestaurantDetail(
                                            restaurant
                                          );
                                        }

                                      }
                                    }

                                  >


                                    {/* IMAGE */}

                                    <div className="food-walk-place-image">

                                      {
                                        imageUrl
                                          ? (

                                            <img
                                              src={
                                                imageUrl
                                              }
                                              alt={
                                                restaurant.name
                                              }
                                            />

                                          )
                                          : (

                                            <Utensils
                                              size={25}
                                            />

                                          )
                                      }


                                      {
                                        restaurant.is_foodkindl_partner &&
                                        (

                                          <span className="food-walk-place-partner">

                                            <Check
                                              size={10}
                                            />

                                            FoodKindl

                                          </span>

                                        )
                                      }

                                    </div>


                                    {/* INFO */}

                                    <div className="food-walk-place-content">

                                      <div>

                                        <strong>
                                          {
                                            restaurant.name
                                          }
                                        </strong>


                                        <span>

                                          {
                                            [
                                              restaurant.cuisine,
                                              restaurant.locality,
                                              restaurant.city,
                                            ]
                                              .filter(Boolean)
                                              .join(" • ")
                                            ||
                                            "FoodKindl place"
                                          }

                                        </span>

                                      </div>


                                      <div className="food-walk-place-meta">

                                        {
                                          restaurant.rating !==
                                            null &&
                                          restaurant.rating !==
                                            undefined &&
                                          (

                                            <span>

                                              <Star
                                                size={11}
                                                fill="currentColor"
                                              />

                                              {
                                                restaurant.rating
                                              }

                                            </span>

                                          )
                                        }


                                        {
                                          restaurant.distance_from_route_km !==
                                            null &&
                                          restaurant.distance_from_route_km !==
                                            undefined &&
                                          (

                                            <span>

                                              <MapPin
                                                size={11}
                                              />

                                              {
                                                restaurant.distance_from_route_km
                                              } km

                                            </span>

                                          )
                                        }

                                      </div>


                                      <div className="food-walk-place-actions">

                                        <button

                                          type="button"

                                          className="food-walk-place-view"

                                          onClick={
                                            event => {

                                              event.stopPropagation();

                                              openRestaurantDetail(
                                                restaurant
                                              );
                                            }
                                          }

                                        >

                                          View details

                                        </button>


                                        <button

                                          type="button"

                                          className={
                                            selected
                                              ? "food-walk-place-add selected"
                                              : "food-walk-place-add"
                                          }

                                          disabled={
                                            selected ||
                                            normalizedStops.length >=
                                            MAX_STOPS
                                          }

                                          onClick={
                                            event => {

                                              event.stopPropagation();

                                              addRestaurant(
                                                restaurant
                                              );
                                            }
                                          }

                                        >

                                          {
                                            selected
                                              ? (

                                                <>

                                                  <Check
                                                    size={14}
                                                  />

                                                  Added

                                                </>

                                              )
                                              : (

                                                <>

                                                  <Plus
                                                    size={14}
                                                  />

                                                  Add to Walk

                                                </>

                                              )
                                          }

                                        </button>

                                      </div>

                                    </div>

                                  </article>

                                );
                              }
                            )
                          }

                        </div>

                      )
              }


              {/* =================================================
                  CUSTOMER PLACE SUBMISSION — CURRENTLY DISABLED

                  The "Suggest place" feature was previously rendered
                  here. It is intentionally hidden from Food Walk for
                  now because restaurant/place submission is handled
                  elsewhere in FoodKindl.

                  IMPORTANT:
                  Only the feature UI is disabled. The structural
                  closing tags below must remain active because they
                  close:
                  1. food-walk-discover
                  2. food-walk-map-recommendations
                  3. food-walk-workspace-map
                  4. food-walk-workspace
              ================================================== */}

            </aside>

          </div>

        </aside>

      </div>


      {/* =====================================================
          RESTAURANT DETAIL MODAL
      ====================================================== */}

      {
        selectedRestaurantDetail &&
        (

          <div
            className="food-walk-restaurant-modal-backdrop"
            onClick={
              closeRestaurantDetail
            }
          >

            <div
              className="food-walk-restaurant-modal"
              onClick={
                event =>
                  event.stopPropagation()
              }
            >

              <button
                type="button"
                className="food-walk-restaurant-modal-close"
                onClick={
                  closeRestaurantDetail
                }
                aria-label={
                  "Close restaurant details"
                }
              >

                <X
                  size={18}
                />

              </button>


              {/* MEDIA */}

              <div className="food-walk-restaurant-modal-media">

                {
                  (
                    selectedRestaurantDetail.image_url ||
                    selectedRestaurantDetail.images?.[0]?.image_url
                  )
                    ? (

                      <img
                        src={
                          selectedRestaurantDetail.image_url ||
                          selectedRestaurantDetail.images?.[0]?.image_url
                        }
                        alt={
                          selectedRestaurantDetail.name ||
                          "Restaurant"
                        }
                      />

                    )
                    : (

                      <div className="food-walk-restaurant-modal-placeholder">

                        <Utensils
                          size={42}
                        />

                      </div>

                    )
                }


                {
                  selectedRestaurantDetail.is_foodkindl_partner &&
                  (

                    <span className="food-walk-restaurant-modal-partner">

                      <Check
                        size={12}
                      />

                      FoodKindl Partner

                    </span>

                  )
                }

              </div>


              {/* CONTENT */}

              <div className="food-walk-restaurant-modal-content">

                {
                  restaurantDetailLoading &&
                  (

                    <span className="food-walk-restaurant-loading">

                      Loading latest details...

                    </span>

                  )
                }


                <div className="food-walk-restaurant-modal-head">

                  <div>

                    <span>
                      FOOD STOP
                    </span>


                    <h3>

                      {
                        selectedRestaurantDetail.name ||
                        "Restaurant"
                      }

                    </h3>


                    <p>

                      {
                        [
                          selectedRestaurantDetail.cuisine,
                          selectedRestaurantDetail.locality,
                          selectedRestaurantDetail.city,
                        ]
                          .filter(Boolean)
                          .join(" • ")
                        ||
                        "FoodKindl place"
                      }

                    </p>

                  </div>


                  <div className="food-walk-restaurant-modal-rating">

                    {
                      selectedRestaurantDetail.rating !==
                        null &&
                      selectedRestaurantDetail.rating !==
                        undefined &&
                      (

                        <span>

                          <Star
                            size={14}
                            fill="currentColor"
                          />

                          {
                            selectedRestaurantDetail.rating
                          }

                        </span>

                      )
                    }


                    {
                      selectedRestaurantDetail.distance_from_route_km !==
                        null &&
                      selectedRestaurantDetail.distance_from_route_km !==
                        undefined &&
                      (

                        <span>

                          <MapPin
                            size={14}
                          />

                          {
                            selectedRestaurantDetail.distance_from_route_km
                          } km

                        </span>

                      )
                    }

                  </div>

                </div>


                {
                  selectedRestaurantDetail.description &&
                  (

                    <p className="food-walk-restaurant-description">

                      {
                        selectedRestaurantDetail.description
                      }

                    </p>

                  )
                }


                {/* INFO GRID */}

                <div className="food-walk-restaurant-info-grid">

                  <div>

                    <span>
                      CUISINE
                    </span>

                    <strong>

                      {
                        selectedRestaurantDetail.cuisine ||
                        "Not specified"
                      }

                    </strong>

                  </div>


                  <div>

                    <span>
                      LOCATION
                    </span>

                    <strong>

                      {
                        [
                          selectedRestaurantDetail.locality,
                          selectedRestaurantDetail.city,
                        ]
                          .filter(Boolean)
                          .join(", ")
                        ||
                        "Not specified"
                      }

                    </strong>

                  </div>


                  {
                    (
                      selectedRestaurantDetail.average_cost_for_two ||
                      selectedRestaurantDetail.price_range
                    ) &&
                    (

                      <div>

                        <span>
                          COST FOR TWO
                        </span>

                        <strong>

                          {
                            selectedRestaurantDetail.average_cost_for_two
                              ? `₹${selectedRestaurantDetail.average_cost_for_two}`
                              : selectedRestaurantDetail.price_range
                          }

                        </strong>

                      </div>

                    )
                  }


                  {
                    selectedRestaurantDetail.restaurant_type &&
                    (

                      <div>

                        <span>
                          TYPE
                        </span>

                        <strong>

                          {
                            selectedRestaurantDetail.restaurant_type ===
                            "cafe"
                              ? "Cafe"
                              : "Restaurant"
                          }

                        </strong>

                      </div>

                    )
                  }

                </div>


                {/* MENU */}

                {
                  Array.isArray(
                    selectedRestaurantDetail.menu_items
                  ) &&
                  selectedRestaurantDetail.menu_items.length >
                  0 &&
                  (

                    <div className="food-walk-restaurant-menu">

                      <span>
                        POPULAR ITEMS
                      </span>


                      <div>

                        {
                          selectedRestaurantDetail.menu_items

                            .slice(
                              0,
                              4
                            )

                            .map(
                              (
                                item,
                                index
                              ) => (

                                <div
                                  key={
                                    item.id ||
                                    `${item.name}-${index}`
                                  }
                                >

                                  <strong>
                                    {
                                      item.name
                                    }
                                  </strong>


                                  {
                                    item.price &&
                                    (

                                      <span>
                                        ₹{
                                          item.price
                                        }
                                      </span>

                                    )
                                  }

                                </div>

                              )
                            )
                        }

                      </div>

                    </div>

                  )
                }


                {/* ACTIONS */}

                <div className="food-walk-restaurant-modal-actions">

                  <button
                    type="button"
                    className="secondary"
                    onClick={
                      closeRestaurantDetail
                    }
                  >

                    Close

                  </button>


                  <button

                    type="button"

                    className="primary"

                    disabled={
                      selectedRestaurantIds.has(
                        Number(
                          selectedRestaurantDetail.id
                        )
                      )
                      ||
                      normalizedStops.length >=
                      MAX_STOPS
                    }

                    onClick={() => {

                      if (
                        !selectedRestaurantIds.has(
                          Number(
                            selectedRestaurantDetail.id
                          )
                        )
                      ) {

                        addRestaurant(
                          selectedRestaurantDetail
                        );
                      }


                      closeRestaurantDetail();

                    }}

                  >

                    {
                      selectedRestaurantIds.has(
                        Number(
                          selectedRestaurantDetail.id
                        )
                      )
                        ? "Already added"
                        : "Add to Food Walk"
                    }

                  </button>

                </div>

              </div>

            </div>

          </div>

        )
      }

    </section>

  );
}