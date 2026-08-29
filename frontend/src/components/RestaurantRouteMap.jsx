import {
  Bike,
  Car,
  LocateFixed,
  MapPin,
  Navigation,
  PersonStanding,
  RefreshCw,
  Route,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";
import "../styles/restaurant_route_map.css";


const MAP_STYLE =
  "https://tiles.openfreemap.org/styles/bright";


const ROUTE_SOURCE_ID =
  "foodkindl-route-source";


const ROUTE_LAYER_ID =
  "foodkindl-route-layer";


const ROUTE_OUTLINE_LAYER_ID =
  "foodkindl-route-outline";


const MODE_CONFIG = {

  walk: {
    label:
      "Walk",

    icon:
      PersonStanding,

    orsProfile:
      "foot-walking",
  },

  drive: {
    label:
      "Drive",

    icon:
      Car,

    orsProfile:
      "driving-car",
  },

  ride: {
    label:
      "Ride",

    icon:
      Bike,

    /*
      openrouteservice does not expose a general
      motorbike profile in the public Directions API.

      For FoodKindl's current "Ride" mode we use
      driving-car as the road-routing approximation.

      If you later integrate a provider with a
      motorcycle / two-wheeler profile, change this.
    */
    orsProfile:
      "driving-car",
  },

};


function parseCoordinate(
  value
) {

  const parsed =
    Number(
      value
    );


  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;

}


function getRestaurantCoordinates(
  restaurant
) {

  const latitude =
    parseCoordinate(
      restaurant?.latitude
    );


  const longitude =
    parseCoordinate(
      restaurant?.longitude
    );


  if (
    latitude === null ||
    longitude === null
  ) {

    return null;

  }


  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {

    return null;

  }


  return {
    latitude,
    longitude,
  };

}


function formatDistance(
  metres
) {

  const value =
    Number(
      metres
    );


  if (
    !Number.isFinite(
      value
    )
  ) {

    return "—";

  }


  if (
    value < 1000
  ) {

    return (
      `${Math.round(value)} m`
    );

  }


  return (
    `${(
      value /
      1000
    ).toFixed(1)} km`
  );

}


function formatDuration(
  seconds
) {

  const value =
    Number(
      seconds
    );


  if (
    !Number.isFinite(
      value
    )
  ) {

    return "—";

  }


  const totalMinutes =
    Math.max(
      1,
      Math.round(
        value /
        60
      )
    );


  if (
    totalMinutes < 60
  ) {

    return (
      `${totalMinutes} min`
    );

  }


  const hours =
    Math.floor(
      totalMinutes /
      60
    );


  const minutes =
    totalMinutes %
    60;


  return minutes
    ? `${hours} hr ${minutes} min`
    : `${hours} hr`;

}


function getBrowserLocation() {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      if (
        !navigator.geolocation
      ) {

        reject(
          new Error(
            "Location is not supported by this browser."
          )
        );

        return;

      }


      navigator.geolocation.getCurrentPosition(
        position => {

          resolve({
            latitude:
              position.coords.latitude,

            longitude:
              position.coords.longitude,

            accuracy:
              position.coords.accuracy,
          });

        },
        error => {

          let message =
            "FoodKindl could not access your current location.";


          if (
            error?.code === 1
          ) {

            message =
              "Location permission was denied. Please allow location access and try again.";

          }


          if (
            error?.code === 2
          ) {

            message =
              "Your current location is unavailable. Please try again.";

          }


          if (
            error?.code === 3
          ) {

            message =
              "Getting your current location took too long. Please try again.";

          }


          reject(
            new Error(
              message
            )
          );

        },
        {
          enableHighAccuracy:
            true,

          timeout:
            15000,

          maximumAge:
            30000,
        }
      );

    }
  );

}


async function fetchOpenRouteServiceRoute({
  start,
  end,
  mode,
}) {

  const apiKey =
    import.meta.env
      .VITE_ORS_KEY;


  if (!apiKey) {

    throw new Error(
      "VITE_ORS_KEY is missing. Add your openrouteservice API key to the frontend environment."
    );

  }


  const modeConfig =
    MODE_CONFIG[
      mode
    ] ||
    MODE_CONFIG.drive;


  const response =
    await fetch(
      `https://api.openrouteservice.org/v2/directions/${modeConfig.orsProfile}/geojson`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            apiKey,

          "Content-Type":
            "application/json",

          Accept:
            "application/json, application/geo+json",
        },

        body:
          JSON.stringify({
            coordinates: [
              [
                start.longitude,
                start.latitude,
              ],
              [
                end.longitude,
                end.latitude,
              ],
            ],
          }),
      }
    );


  if (
    !response.ok
  ) {

    let message =
      `Route request failed (${response.status}).`;


    try {

      const data =
        await response.json();


      message =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        message;

    } catch {
      // Keep fallback message.
    }


    throw new Error(
      String(
        message
      )
    );

  }


  const data =
    await response.json();


  const feature =
    data?.features?.[0];


  if (
    !feature?.geometry?.coordinates?.length
  ) {

    throw new Error(
      "No route was returned for this journey."
    );

  }


  return data;

}


function fitMapToRoute(
  map,
  routeGeoJson
) {

  const coordinates =
    routeGeoJson
      ?.features?.[0]
      ?.geometry
      ?.coordinates;


  if (
    !Array.isArray(
      coordinates
    ) ||
    coordinates.length === 0
  ) {

    return;

  }


  const bounds =
    coordinates.reduce(
      (
        currentBounds,
        coordinate
      ) => {

        return (
          currentBounds.extend(
            coordinate
          )
        );

      },
      new maplibregl.LngLatBounds(
        coordinates[0],
        coordinates[0]
      )
    );


  map.fitBounds(
    bounds,
    {
      padding: {
        top:
          70,

        right:
          55,

        bottom:
          80,

        left:
          55,
      },

      maxZoom:
        16,

      duration:
        900,
    }
  );

}


function drawRoute(
  map,
  routeGeoJson
) {

  if (
    !map ||
    !map.isStyleLoaded()
  ) {

    return;

  }


  const existingSource =
    map.getSource(
      ROUTE_SOURCE_ID
    );


  if (
    existingSource
  ) {

    existingSource.setData(
      routeGeoJson
    );

    return;

  }


  map.addSource(
    ROUTE_SOURCE_ID,
    {
      type:
        "geojson",

      data:
        routeGeoJson,
    }
  );


  map.addLayer({
    id:
      ROUTE_OUTLINE_LAYER_ID,

    type:
      "line",

    source:
      ROUTE_SOURCE_ID,

    layout: {
      "line-join":
        "round",

      "line-cap":
        "round",
    },

    paint: {
      "line-color":
        "#111111",

      "line-width":
        9,

      "line-opacity":
        0.28,
    },
  });


  map.addLayer({
    id:
      ROUTE_LAYER_ID,

    type:
      "line",

    source:
      ROUTE_SOURCE_ID,

    layout: {
      "line-join":
        "round",

      "line-cap":
        "round",
    },

    paint: {
      "line-color":
        "#ff6a23",

      "line-width":
        5.5,

      "line-opacity":
        0.95,
    },
  });

}


function removeRoute(
  map
) {

  if (!map) {
    return;
  }


  if (
    map.getLayer(
      ROUTE_LAYER_ID
    )
  ) {

    map.removeLayer(
      ROUTE_LAYER_ID
    );

  }


  if (
    map.getLayer(
      ROUTE_OUTLINE_LAYER_ID
    )
  ) {

    map.removeLayer(
      ROUTE_OUTLINE_LAYER_ID
    );

  }


  if (
    map.getSource(
      ROUTE_SOURCE_ID
    )
  ) {

    map.removeSource(
      ROUTE_SOURCE_ID
    );

  }

}


export default function RestaurantRouteMap({
  restaurant,
  initialMode = "drive",
}) {

  const mapContainerRef =
    useRef(null);


  const mapRef =
    useRef(null);


  const userMarkerRef =
    useRef(null);


  const restaurantMarkerRef =
    useRef(null);


  const [
    selectedMode,
    setSelectedMode,
  ] = useState(
    MODE_CONFIG[
      initialMode
    ]
      ? initialMode
      : "drive"
  );


  const [
    userLocation,
    setUserLocation,
  ] = useState(null);


  const [
    routeData,
    setRouteData,
  ] = useState(null);


  const [
    routeSummary,
    setRouteSummary,
  ] = useState(null);


  const [
    locating,
    setLocating,
  ] = useState(false);


  const [
    routing,
    setRouting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const restaurantCoordinates =
    useMemo(
      () =>
        getRestaurantCoordinates(
          restaurant
        ),
      [
        restaurant?.id,
        restaurant?.latitude,
        restaurant?.longitude,
      ]
    );


  // =========================================================
  // CREATE MAP
  // =========================================================

  useEffect(
    () => {

      if (
        !mapContainerRef.current ||
        !restaurantCoordinates
      ) {

        return undefined;

      }


      const map =
        new maplibregl.Map({
          container:
            mapContainerRef.current,

          style:
            MAP_STYLE,

          center: [
            restaurantCoordinates.longitude,
            restaurantCoordinates.latitude,
          ],

          zoom:
            14,
        });


      mapRef.current =
        map;


      map.addControl(
        new maplibregl.NavigationControl({
          visualizePitch:
            true,
        }),
        "top-right"
      );


      map.on(
        "load",
        () => {

          restaurantMarkerRef.current =
            new maplibregl.Marker({
              color:
                "#ff6a23",
            })
              .setLngLat([
                restaurantCoordinates.longitude,
                restaurantCoordinates.latitude,
              ])
              .setPopup(
                new maplibregl.Popup({
                  offset:
                    22,
                })
                  .setHTML(
                    `
                      <div style="font-family:system-ui,sans-serif">
                        <strong>${String(
                          restaurant?.name ||
                          "Restaurant"
                        ).replace(
                          /</g,
                          "&lt;"
                        )}</strong>
                        ${
                          restaurant?.locality ||
                          restaurant?.city
                            ? `<div style="margin-top:4px;font-size:12px;opacity:.72">
                                ${[
                                  restaurant?.locality,
                                  restaurant?.city,
                                ]
                                  .filter(Boolean)
                                  .join(", ")
                                  .replace(
                                    /</g,
                                    "&lt;"
                                  )}
                              </div>`
                            : ""
                        }
                      </div>
                    `
                  )
              )
              .addTo(
                map
              );

        }
      );


      return () => {

        userMarkerRef.current
          ?.remove();


        restaurantMarkerRef.current
          ?.remove();


        map.remove();


        mapRef.current =
          null;

      };

    },
    [
      restaurant?.id,
      restaurantCoordinates?.latitude,
      restaurantCoordinates?.longitude,
    ]
  );


  // =========================================================
  // UPDATE USER MARKER
  // =========================================================

  useEffect(
    () => {

      const map =
        mapRef.current;


      if (
        !map ||
        !userLocation
      ) {

        return;

      }


      if (
        userMarkerRef.current
      ) {

        userMarkerRef.current
          .setLngLat([
            userLocation.longitude,
            userLocation.latitude,
          ]);

        return;

      }


      userMarkerRef.current =
        new maplibregl.Marker({
          color:
            "#1677ff",
        })
          .setLngLat([
            userLocation.longitude,
            userLocation.latitude,
          ])
          .setPopup(
            new maplibregl.Popup({
              offset:
                22,
            })
              .setHTML(
                "<strong>Your location</strong>"
              )
          )
          .addTo(
            map
          );

    },
    [
      userLocation,
    ]
  );


  // =========================================================
  // DRAW ROUTE WHEN ROUTE CHANGES
  // =========================================================

  useEffect(
    () => {

      const map =
        mapRef.current;


      if (
        !map ||
        !routeData
      ) {

        return;

      }


      const render =
        () => {

          drawRoute(
            map,
            routeData
          );


          fitMapToRoute(
            map,
            routeData
          );

        };


      if (
        map.isStyleLoaded()
      ) {

        render();

      } else {

        map.once(
          "load",
          render
        );

      }

    },
    [
      routeData,
    ]
  );


  // =========================================================
  // GET CURRENT LOCATION
  // =========================================================

  async function locateUser() {

    try {

      setError("");

      setLocating(
        true
      );


      const location =
        await getBrowserLocation();


      setUserLocation(
        location
      );


      return location;

    } catch (
      locationError
    ) {

      setError(
        locationError?.message ||
        "Unable to get your current location."
      );


      return null;

    } finally {

      setLocating(
        false
      );

    }

  }


  // =========================================================
  // CREATE ROUTE
  // =========================================================

  async function createRoute(
    mode = selectedMode
  ) {

    if (
      !restaurantCoordinates
    ) {

      setError(
        "This restaurant does not have valid map coordinates."
      );

      return;

    }


    try {

      setError("");

      setRouting(
        true
      );


      let start =
        userLocation;


      if (!start) {

        start =
          await locateUser();

      }


      if (!start) {

        return;

      }


      const data =
        await fetchOpenRouteServiceRoute({
          start,

          end:
            restaurantCoordinates,

          mode,
        });


      const summary =
        data
          ?.features?.[0]
          ?.properties?.summary;


      setRouteData(
        data
      );


      setRouteSummary({
        distance:
          summary?.distance ??
          null,

        duration:
          summary?.duration ??
          null,
      });

    } catch (
      routeError
    ) {

      setRouteData(
        null
      );


      setRouteSummary(
        null
      );


      setError(
        routeError?.message ||
        "FoodKindl could not create this route."
      );

    } finally {

      setRouting(
        false
      );

    }

  }


  // =========================================================
  // CHANGE MODE AND RECALCULATE
  // =========================================================

  async function changeMode(
    mode
  ) {

    setSelectedMode(
      mode
    );


    if (
      userLocation
    ) {

      await createRoute(
        mode
      );

    }

  }


  // =========================================================
  // REFRESH CURRENT LOCATION + ROUTE
  // =========================================================

  async function refreshRoute() {

    const location =
      await locateUser();


    if (!location) {
      return;
    }


    setUserLocation(
      location
    );


    try {

      setRouting(
        true
      );


      const data =
        await fetchOpenRouteServiceRoute({
          start:
            location,

          end:
            restaurantCoordinates,

          mode:
            selectedMode,
        });


      const summary =
        data
          ?.features?.[0]
          ?.properties?.summary;


      setRouteData(
        data
      );


      setRouteSummary({
        distance:
          summary?.distance ??
          null,

        duration:
          summary?.duration ??
          null,
      });

    } catch (
      routeError
    ) {

      setError(
        routeError?.message ||
        "Unable to refresh the route."
      );

    } finally {

      setRouting(
        false
      );

    }

  }


  // =========================================================
  // EMPTY / INVALID RESTAURANT LOCATION
  // =========================================================

  if (
    !restaurantCoordinates
  ) {

    return (
      <section className="fk-route-card fk-route-error-card">

        <MapPin
          size={21}
        />

        <div>

          <strong>
            Route unavailable
          </strong>

          <span>
            This restaurant does not have valid latitude and longitude yet.
          </span>

        </div>

      </section>
    );

  }


  return (
    <section className="fk-route-card">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="fk-route-header">

        <div className="fk-route-header-icon">

          <Route
            size={20}
          />

        </div>


        <div className="fk-route-header-copy">

          <span>
            FOODKINDL ROUTE
          </span>

          <h3>
            Get there from your location
          </h3>

          <p>

            {
              restaurant?.name ||
              "Selected restaurant"
            }

          </p>

        </div>


        {
          userLocation &&
          (
            <button
              type="button"
              className="fk-route-refresh"
              onClick={
                refreshRoute
              }
              disabled={
                locating ||
                routing
              }
              title="Refresh current location"
            >

              <RefreshCw
                size={16}
              />

            </button>
          )
        }

      </header>


      {/* =====================================================
          TRAVEL MODES
      ====================================================== */}

      <div className="fk-route-modes">

        {
          Object.entries(
            MODE_CONFIG
          )
            .map(
              (
                [
                  mode,
                  config,
                ]
              ) => {

                const Icon =
                  config.icon;


                return (
                  <button
                    type="button"
                    key={
                      mode
                    }
                    className={
                      selectedMode ===
                        mode
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      changeMode(
                        mode
                      )
                    }
                    disabled={
                      routing
                    }
                  >

                    <Icon
                      size={17}
                    />

                    <span>
                      {config.label}
                    </span>

                  </button>
                );

              }
            )
        }

      </div>


      {/* =====================================================
          ROUTE SUMMARY
      ====================================================== */}

      <div className="fk-route-summary">

        <div>

          <span>
            DISTANCE
          </span>

          <strong>
            {
              routeSummary
                ? formatDistance(
                    routeSummary.distance
                  )
                : "—"
            }
          </strong>

        </div>


        <div>

          <span>
            ETA
          </span>

          <strong>
            {
              routeSummary
                ? formatDuration(
                    routeSummary.duration
                  )
                : "—"
            }
          </strong>

        </div>


        <div>

          <span>
            MODE
          </span>

          <strong>
            {
              MODE_CONFIG[
                selectedMode
              ].label
            }
          </strong>

        </div>

      </div>


      {/* =====================================================
          MAP
      ====================================================== */}

      <div className="fk-route-map-shell">

        <div
          ref={
            mapContainerRef
          }
          className="fk-route-map"
        />


        {
          !userLocation &&
          (
            <div className="fk-route-map-overlay">

              <div className="fk-route-map-overlay-icon">

                <LocateFixed
                  size={20}
                />

              </div>

              <strong>
                Use your current location
              </strong>

              <span>
                FoodKindl needs location access to calculate distance and ETA.
              </span>

              <button
                type="button"
                onClick={
                  () =>
                    createRoute(
                      selectedMode
                    )
                }
                disabled={
                  locating ||
                  routing
                }
              >

                <Navigation
                  size={16}
                />

                {
                  locating
                    ? "Finding your location..."
                    : routing
                      ? "Creating route..."
                      : "Show route"
                }

              </button>

            </div>
          )
        }

      </div>


      {/* =====================================================
          PRIMARY ACTION AFTER LOCATION EXISTS
      ====================================================== */}

      {
        userLocation &&
        !routeData &&
        (
          <button
            type="button"
            className="fk-route-primary-action"
            onClick={
              () =>
                createRoute(
                  selectedMode
                )
            }
            disabled={
              routing
            }
          >

            <Navigation
              size={17}
            />

            {
              routing
                ? "Creating route..."
                : "Show route"
            }

          </button>
        )
      }


      {/* =====================================================
          USER LOCATION ACCURACY
      ====================================================== */}

      {
        userLocation &&
        (
          <div className="fk-route-location-status">

            <LocateFixed
              size={14}
            />

            <span>

              Current location found

              {
                Number.isFinite(
                  userLocation.accuracy
                )
                  ? ` • accuracy ±${Math.round(
                      userLocation.accuracy
                    )} m`
                  : ""
              }

            </span>

          </div>
        )
      }


      {/* =====================================================
          ERROR
      ====================================================== */}

      {
        error &&
        (
          <div className="fk-route-error">

            {error}

          </div>
        )
      }


      {
        selectedMode ===
          "ride" &&
        (
          <div className="fk-route-note">

            Ride currently uses a road-driving route as an approximation.
            A dedicated two-wheeler routing provider can be added later.

          </div>
        )
      }

    </section>
  );
}
