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
} from "lucide-react";

import api from "../api";

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

  if (typeof stop === "string") {
    const name = stop.trim();

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


  const name = String(
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
      stop.cuisine || "",

    locality:
      stop.locality || "",

    city:
      stop.city || "",

    image_url:
      stop.image_url ||
      stop.images?.[0]?.image_url ||
      "",

    rating:
      stop.rating ?? null,

    latitude:
      stop.latitude ?? null,

    longitude:
      stop.longitude ?? null,

    distance_from_route_km:
      stop.distance_from_route_km ??
      null,

    route_position:
      stop.route_position ??
      null,

    is_foodkindl_partner:
      stop.is_foodkindl_partner ===
      true,

    source:
      stop.source ||
      "restaurant",
  };
}


/* ============================================================
   RESTAURANT -> STOP
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
      restaurant.cuisine || "",

    locality:
      restaurant.locality || "",

    city:
      restaurant.city || "",

    image_url:
      restaurant.image_url ||
      restaurant.images?.[0]?.image_url ||
      "",

    rating:
      restaurant.rating ?? null,

    latitude:
      restaurant.latitude ?? null,

    longitude:
      restaurant.longitude ?? null,

    distance_from_route_km:
      restaurant.distance_from_route_km ??
      null,

    route_position:
      restaurant.route_position ??
      null,

    is_foodkindl_partner:
      restaurant.is_foodkindl_partner ===
      true,

    source:
      "restaurant",
  };
}


/* ============================================================
   COMPONENT
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


  /* =========================================================
     NORMALIZED STOPS
  ========================================================= */

  const normalizedStops = useMemo(
    () =>

      (
        Array.isArray(stops)
          ? stops
          : []
      )

        .map(
          normalizeStop
        )

        .filter(
          Boolean
        ),

    [
      stops,
    ]
  );


  /* =========================================================
     SELECTED RESTAURANTS
  ========================================================= */

  const selectedRestaurantIds =
    useMemo(
      () =>

        new Set(

          normalizedStops

            .map(
              stop =>
                stop.restaurant_id
            )

            .filter(
              Boolean
            )

            .map(
              Number
            )
        ),

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
          !normalizedStops.length
        ) {
          return 0;
        }


        const stopMinutes =
          normalizedStops.length *
          40;


        const transitionMinutes =
          Math.max(
            0,
            normalizedStops.length - 1
          ) * 10;


        return (
          stopMinutes +
          transitionMinutes
        );

      },

      [
        normalizedStops.length,
      ]
    );


  const estimatedDuration =
    useMemo(
      () => {

        if (
          !estimatedMinutes
        ) {
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
     LOAD ROUTE RECOMMENDATIONS
  ========================================================= */

  async function loadRecommendations() {

    const startValue =
      locationLabel.trim();


    const destinationValue =
      destination.trim();


    /* -------------------------------------------------------
       We need both start and destination.
    ------------------------------------------------------- */

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


      const response =
        await api.get(
          "/restaurants/food-walk/",
          {
            params: {

              start:
                startValue,

              destination:
                destinationValue,

              cuisine:
                cuisine.trim(),

              max_detour_km:
                2,
            },
          }
        );


      const data =
        response.data || {};


      const restaurantData =
        data.restaurants || [];


      setRecommendations(
        Array.isArray(
          restaurantData
        )
          ? restaurantData
          : []
      );


      setRouteInfo(
        {
          start:
            data.start ||
            null,

          destination:
            data.destination ||
            null,

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
            restaurantData.length,
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
        requestError?.response?.data?.detail ||
        (
          "Food Walk recommendations "
          +
          "could not be loaded."
        )
      );


    } finally {

      setLoading(
        false
      );
    }
  }


  /* =========================================================
     AUTO LOAD
  ========================================================= */

  useEffect(
    () => {

      const timer =
        window.setTimeout(
          () => {
            loadRecommendations();
          },
          500
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
    ]
  );


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
     ADD RESTAURANT
  ========================================================= */

  function addRestaurant(
    restaurant
  ) {

    if (
      normalizedStops.length >=
      MAX_STOPS
    ) {

      setError(
        (
          `A Food Walk can have up to `
          +
          `${MAX_STOPS} stops.`
        )
      );

      return;
    }


    if (
      selectedRestaurantIds.has(
        Number(
          restaurant.id
        )
      )
    ) {

      return;
    }


    updateStops(
      [
        ...normalizedStops,

        restaurantToStop(
          restaurant
        ),
      ]
    );


    setError(
      ""
    );
  }


  /* =========================================================
     MANUAL STOP
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
        (
          `A Food Walk can have up to `
          +
          `${MAX_STOPS} stops.`
        )
      );

      return;
    }


    updateStops(
      [
        ...normalizedStops,

        {
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
        },
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
     REMOVE
  ========================================================= */

  function removeStop(
    index
  ) {

    updateStops(

      normalizedStops.filter(

        (
          _,
          currentIndex
        ) =>

          currentIndex !==
          index
      )
    );
  }


  /* =========================================================
     MOVE
  ========================================================= */

  function moveStop(
    index,
    direction
  ) {

    const target =
      index +
      direction;


    if (
      target < 0 ||
      target >=
      normalizedStops.length
    ) {

      return;
    }


    const next = [
      ...normalizedStops,
    ];


    [
      next[index],
      next[target],
    ] = [

      next[target],
      next[index],

    ];


    updateStops(
      next
    );
  }


  /* =========================================================
     JSX
  ========================================================= */

  return (

    <section
      className="food-walk-planner"
    >

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div
        className=
          "food-walk-planner-heading"
      >

        <div
          className=
            "food-walk-planner-icon"
        >
          <Footprints
            size={22}
          />
        </div>


        <div>

          <span>
            FOOD WALK ROUTE
          </span>

          <h3>
            Build a multi-stop food journey.
          </h3>

          <p>
            Choose a starting point and destination.
            FoodKindl will recommend partner restaurants
            and cafes close to your route.
          </p>

        </div>

      </div>


      {/* =====================================================
          START + DESTINATION + FOOD
      ====================================================== */}

      <div
        className=
          "food-walk-filter-grid"
      >

        {/* START */}

        <label>

          Starting point

          <div
            className=
              "food-walk-input-icon"
          >

            <MapPin
              size={16}
            />

            <input
              type="text"

              value={
                locationLabel
              }

              onChange={
                event =>
                  onLocationChange?.(
                    event.target.value
                  )
              }

              placeholder=
                "Nagasandra, Bengaluru"
            />

          </div>

        </label>


        {/* DESTINATION */}

        <label>

          Destination

          <div
            className=
              "food-walk-input-icon"
          >

            <MapPin
              size={16}
            />

            <input
              type="text"

              value={
                destination
              }

              onChange={
                event =>
                  onDestinationChange?.(
                    event.target.value
                  )
              }

              placeholder=
                "Indiranagar, Bengaluru"
            />

          </div>

        </label>


        {/* FOOD */}

        <label>

          Food preference

          <div
            className=
              "food-walk-input-icon"
          >

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

              placeholder=
                "Kerala, cafe, dessert..."
            />

          </div>

        </label>

      </div>


      {/* =====================================================
          ROUTE SUMMARY
      ====================================================== */}

      {
        routeInfo &&
        (

          <div
            className=
              "food-walk-route-summary"
          >

            <div>

              <MapPin
                size={15}
              />

              <strong>
                {locationLabel}
              </strong>

              <span>
                →
              </span>

              <strong>
                {destination}
              </strong>

            </div>


            <div>

              {
                routeInfo.routeDistance !==
                null
                &&
                (
                  <span>
                    {
                      routeInfo.routeDistance
                    }{" "}
                    km
                  </span>
                )
              }


              {
                routeInfo.routeType
                &&
                (
                  <span>
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


      {/* =====================================================
          MAIN GRID
      ====================================================== */}

      <div
        className=
          "food-walk-layout"
      >

        {/* ===================================================
            SELECTED ROUTE
        ==================================================== */}

        <div
          className=
            "food-walk-route-panel"
        >

          <div
            className=
              "food-walk-panel-title"
          >

            <div>

              <span>
                YOUR ROUTE
              </span>

              <strong>
                {
                  normalizedStops.length
                }
                /
                {
                  MAX_STOPS
                }{" "}
                stops
              </strong>

            </div>


            <small>
              {
                estimatedDuration
              }
            </small>

          </div>


          {
            normalizedStops.length ===
            0
              ? (

                <div
                  className=
                    "food-walk-empty-route"
                >

                  <Footprints
                    size={28}
                  />

                  <strong>
                    No stops selected yet
                  </strong>

                  <span>
                    Add recommended places from the
                    right or enter your own food stop.
                  </span>

                </div>
              )

              : (

                <div
                  className=
                    "food-walk-route-list"
                >

                  {
                    normalizedStops.map(

                      (
                        stop,
                        index
                      ) => (

                        <div
                          className=
                            "food-walk-route-stop"

                          key={
                            `${stop.id}-${index}`
                          }
                        >

                          <div
                            className=
                              "food-walk-stop-number"
                          >
                            {
                              index + 1
                            }
                          </div>


                          <div
                            className=
                              "food-walk-stop-main"
                          >

                            <strong>
                              {
                                stop.name
                              }
                            </strong>


                            <span>

                              {
                                [
                                  stop.cuisine,
                                  stop.locality,
                                  stop.city,
                                ]

                                  .filter(
                                    Boolean
                                  )

                                  .join(
                                    " • "
                                  )

                                ||

                                "Food Walk stop"
                              }

                            </span>


                            {
                              stop.distance_from_route_km !==
                              null
                              &&
                              (

                                <small
                                  className=
                                    "food-walk-route-distance"
                                >
                                  {
                                    stop.distance_from_route_km
                                  }{" "}
                                  km from route
                                </small>
                              )
                            }


                            {
                              stop.is_foodkindl_partner
                              &&
                              (

                                <small
                                  className=
                                    "food-walk-partner-badge"
                                >

                                  <Check
                                    size={11}
                                  />

                                  FoodKindl Partner

                                </small>
                              )
                            }

                          </div>


                          <div
                            className=
                              "food-walk-stop-actions"
                          >

                            <button
                              type="button"

                              onClick={
                                () =>
                                  moveStop(
                                    index,
                                    -1
                                  )
                              }

                              disabled={
                                index === 0
                              }

                              aria-label=
                                "Move stop up"
                            >

                              <ArrowUp
                                size={14}
                              />

                            </button>


                            <button
                              type="button"

                              onClick={
                                () =>
                                  moveStop(
                                    index,
                                    1
                                  )
                              }

                              disabled={
                                index ===
                                normalizedStops.length -
                                1
                              }

                              aria-label=
                                "Move stop down"
                            >

                              <ArrowDown
                                size={14}
                              />

                            </button>


                            <button
                              type="button"

                              className=
                                "danger"

                              onClick={
                                () =>
                                  removeStop(
                                    index
                                  )
                              }

                              aria-label=
                                "Remove stop"
                            >

                              <Minus
                                size={14}
                              />

                            </button>

                          </div>


                          {
                            index <
                            normalizedStops.length -
                            1
                            &&
                            (

                              <div
                                className=
                                  "food-walk-route-connector"
                              >

                                <Footprints
                                  size={13}
                                />

                                <span>
                                  Next food stop
                                </span>

                              </div>
                            )
                          }

                        </div>
                      )
                    )
                  }

                </div>
              )
          }


          {/* =================================================
              MANUAL ADD
          ================================================== */}

          <div
            className=
              "food-walk-manual-add"
          >

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

              placeholder=
                "Add another food place manually"

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

              <Plus
                size={15}
              />

              Add stop

            </button>

          </div>


          {/* =================================================
              STATUS
          ================================================== */}

          <div
            className={

              normalizedStops.length >=
              MIN_STOPS

                ? "food-walk-route-status ready"

                : "food-walk-route-status"
            }
          >

            {
              normalizedStops.length >=
              MIN_STOPS

                ? (
                  <>
                    <Check
                      size={15}
                    />

                    Route ready to invite people
                  </>
                )

                : (
                  <>
                    <Footprints
                      size={15}
                    />

                    Add at least{" "}
                    {
                      MIN_STOPS
                    }{" "}
                    stops
                  </>
                )
            }

          </div>

        </div>


        {/* ===================================================
            RECOMMENDED RESTAURANTS
        ==================================================== */}

        <aside
          className=
            "food-walk-recommendation-panel"
        >

          <div
            className=
              "food-walk-panel-title"
          >

            <div>

              <span>
                RECOMMENDED STOPS
              </span>

              <strong>
                Places along your route
              </strong>

            </div>

          </div>


          {/* ERROR */}

          {
            error
            &&
            (

              <div
                className=
                  "food-walk-error"
              >
                {
                  error
                }
              </div>
            )
          }


          {/* NEED LOCATIONS */}

          {
            (
              !locationLabel.trim()
              ||
              !destination.trim()
            )

              ? (

                <div
                  className=
                    "food-walk-recommendation-state"
                >

                  <MapPin
                    size={24}
                  />

                  <strong>
                    Add your route
                  </strong>

                  <span>
                    Enter both starting point and
                    destination to find FoodKindl
                    restaurants along the way.
                  </span>

                </div>
              )


              : loading

                ? (

                  <div
                    className=
                      "food-walk-recommendation-state"
                  >

                    Finding restaurants along
                    your route...

                  </div>
                )


                : recommendations.length ===
                  0

                  ? (

                    <div
                      className=
                        "food-walk-recommendation-state"
                    >

                      <Utensils
                        size={24}
                      />

                      <strong>
                        No restaurants found
                      </strong>

                      <span>
                        There are currently no FoodKindl
                        partner restaurants close to this
                        route. Try another route or food
                        preference.
                      </span>

                    </div>
                  )


                  : (

                    <div
                      className=
                        "food-walk-recommendation-list"
                    >

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
                              restaurant.image_url
                              ||
                              restaurant.images?.[0]?.image_url
                              ||
                              "";


                            return (

                              <article

                                className={

                                  selected

                                    ? (
                                      "food-walk-recommendation-card "
                                      +
                                      "selected"
                                    )

                                    : (
                                      "food-walk-recommendation-card"
                                    )
                                }

                                key={
                                  restaurant.id
                                }
                              >

                                {/* IMAGE */}

                                <div
                                  className=
                                    "food-walk-recommendation-image"
                                >

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
                                          size={24}
                                        />
                                      )
                                  }

                                </div>


                                {/* INFO */}

                                <div
                                  className=
                                    "food-walk-recommendation-main"
                                >

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

                                        .filter(
                                          Boolean
                                        )

                                        .join(
                                          " • "
                                        )

                                      ||

                                      "FoodKindl place"
                                    }

                                  </span>


                                  <div
                                    className=
                                      "food-walk-recommendation-meta"
                                  >

                                    {
                                      restaurant.rating
                                      &&
                                      (

                                        <small>

                                          <Star
                                            size={11}
                                            fill="currentColor"
                                          />

                                          {
                                            restaurant.rating
                                          }

                                        </small>
                                      )
                                    }


                                    {
                                      restaurant.distance_from_route_km !==
                                      undefined
                                      &&
                                      (

                                        <small>

                                          <MapPin
                                            size={11}
                                          />

                                          {
                                            restaurant.distance_from_route_km
                                          }{" "}
                                          km from route

                                        </small>
                                      )
                                    }


                                    {
                                      restaurant.is_foodkindl_partner
                                      &&
                                      (

                                        <small
                                          className=
                                            "partner"
                                        >

                                          <Check
                                            size={11}
                                          />

                                          Partner

                                        </small>
                                      )
                                    }

                                  </div>

                                </div>


                                {/* ADD */}

                                <button
                                  type="button"

                                  disabled={
                                    selected
                                    ||
                                    normalizedStops.length >=
                                    MAX_STOPS
                                  }

                                  onClick={
                                    () =>
                                      addRestaurant(
                                        restaurant
                                      )
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
                                          Add
                                        </>
                                      )
                                  }

                                </button>

                              </article>
                            );
                          }
                        )
                      }

                    </div>
                  )
          }

        </aside>

      </div>

    </section>
  );
}