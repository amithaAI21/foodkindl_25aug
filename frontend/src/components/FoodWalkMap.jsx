import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Map,
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  LngLatBounds,
  setWorkerUrl,
} from "maplibre-gl";

import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import "maplibre-gl/dist/maplibre-gl.css";
import "../styles/food_walk.css";

setWorkerUrl(workerUrl);

// ============================================================
// CONFIG
// ============================================================

const VALHALLA_URL =
  import.meta.env.VITE_VALHALLA_URL ||
  "https://valhalla1.openstreetmap.de";


const MAP_STYLE = {
  version: 8,

  sources: {
    osm: {
      type: "raster",

      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],

      tileSize: 256,

      attribution:
        "© OpenStreetMap contributors",

      maxzoom: 19,
    },
  },

  layers: [
    {
      id: "osm-base",

      type: "raster",

      source: "osm",

      minzoom: 0,

      maxzoom: 19,
    },
  ],
};


// ============================================================
// HELPERS
// ============================================================

function numberOrNull(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


function normalizePoint(
  value,
  fallbackLabel = ""
) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return {
      name: value || fallbackLabel,
      latitude: null,
      longitude: null,
    };
  }

  const latitude =
    numberOrNull(
      value.latitude ??
        value.lat ??
        value.restaurant_latitude
    );

  const longitude =
    numberOrNull(
      value.longitude ??
        value.lng ??
        value.lon ??
        value.restaurant_longitude
    );

  return {
    ...value,

    name:
      value.name ||
      value.label ||
      value.location_label ||
      value.display_name ||
      fallbackLabel ||
      "Location",

    latitude,
    longitude,
  };
}


function normalizeStop(
  stop,
  index = 0
) {
  if (!stop) {
    return null;
  }

  const point =
    normalizePoint(
      stop,
      `Stop ${index + 1}`
    );

  if (!point) {
    return null;
  }

  return {
    ...point,

    id:
      stop.id ||
      stop.restaurant_id ||
      `stop-${index}`,

    restaurant_id:
      stop.restaurant_id ||
      stop.id ||
      null,

    name:
      stop.name ||
      stop.venue_name ||
      stop.restaurant_name ||
      `Stop ${index + 1}`,

    cuisine:
      stop.cuisine || "",

    locality:
      stop.locality || "",

    city:
      stop.city || "",
  };
}


function isCoordinatePoint(point) {
  return (
    point &&
    Number.isFinite(
      Number(point.latitude)
    ) &&
    Number.isFinite(
      Number(point.longitude)
    )
  );
}


// ============================================================
// VALHALLA POLYLINE 6 DECODER
// ============================================================

function decodePolyline6(encoded) {
  if (!encoded) {
    return [];
  }

  let index = 0;
  let latitude = 0;
  let longitude = 0;

  const coordinates = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte =
        encoded.charCodeAt(index++) - 63;

      result |=
        (byte & 0x1f) << shift;

      shift += 5;
    } while (byte >= 0x20);

    latitude +=
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte =
        encoded.charCodeAt(index++) - 63;

      result |=
        (byte & 0x1f) << shift;

      shift += 5;
    } while (byte >= 0x20);

    longitude +=
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    coordinates.push([
      longitude / 1e6,
      latitude / 1e6,
    ]);
  }

  return coordinates;
}


// ============================================================
// DISTANCE
// ============================================================

function haversineMeters(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const earthRadius = 6371000;

  const toRadians =
    value =>
      value * Math.PI / 180;

  const latitudeDifference =
    toRadians(
      latitude2 - latitude1
    );

  const longitudeDifference =
    toRadians(
      longitude2 - longitude1
    );

  const firstLatitude =
    toRadians(latitude1);

  const secondLatitude =
    toRadians(latitude2);

  const a =
    Math.sin(
      latitudeDifference / 2
    ) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(
        longitudeDifference / 2
      ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}


function nearestRouteDistance(
  latitude,
  longitude,
  coordinates
) {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length === 0
  ) {
    return Infinity;
  }

  let minimum =
    Infinity;

  for (
    let index = 0;
    index < coordinates.length;
    index += 3
  ) {
    const [
      routeLongitude,
      routeLatitude,
    ] = coordinates[index];

    const distance =
      haversineMeters(
        latitude,
        longitude,
        routeLatitude,
        routeLongitude
      );

    if (distance < minimum) {
      minimum = distance;
    }
  }

  return minimum;
}


// ============================================================
// FORMATTERS
// ============================================================

function formatDistance(kilometers) {
  const value =
    Number(kilometers);

  if (!Number.isFinite(value)) {
    return "--";
  }

  if (value < 1) {
    return `${Math.round(
      value * 1000
    )} m`;
  }

  return `${value.toFixed(1)} km`;
}


function formatDuration(seconds) {
  const value =
    Number(seconds);

  if (!Number.isFinite(value)) {
    return "--";
  }

  const minutes =
    Math.max(
      1,
      Math.round(value / 60)
    );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(minutes / 60);

  const remainingMinutes =
    minutes % 60;

  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}


function getManeuverInfo(type) {
  const maneuverType = Number(type);

  switch (maneuverType) {
    case 1: return { symbol: "↑", label: "START" };
    case 2: return { symbol: "↗", label: "START RIGHT" };
    case 3: return { symbol: "↖", label: "START LEFT" };
    case 4:
    case 5:
    case 6: return { symbol: "●", label: "DESTINATION" };
    case 7:
    case 8: return { symbol: "↑", label: "GO STRAIGHT" };
    case 9: return { symbol: "↗", label: "SLIGHT RIGHT" };
    case 10: return { symbol: "→", label: "TURN RIGHT" };
    case 11: return { symbol: "↘", label: "SHARP RIGHT" };
    case 12: return { symbol: "⤵", label: "U-TURN RIGHT" };
    case 13: return { symbol: "⤴", label: "U-TURN LEFT" };
    case 14: return { symbol: "↙", label: "SHARP LEFT" };
    case 15: return { symbol: "←", label: "TURN LEFT" };
    case 16: return { symbol: "↖", label: "SLIGHT LEFT" };
    case 17: return { symbol: "↑", label: "TAKE RAMP" };
    case 18: return { symbol: "↗", label: "RAMP RIGHT" };
    case 19: return { symbol: "↖", label: "RAMP LEFT" };
    case 20: return { symbol: "↗", label: "EXIT RIGHT" };
    case 21: return { symbol: "↖", label: "EXIT LEFT" };
    case 22: return { symbol: "↑", label: "KEEP STRAIGHT" };
    case 23: return { symbol: "↗", label: "KEEP RIGHT" };
    case 24: return { symbol: "↖", label: "KEEP LEFT" };
    case 25: return { symbol: "⇢", label: "MERGE" };
    case 26: return { symbol: "⟳", label: "ENTER ROUNDABOUT" };
    case 27: return { symbol: "⟳", label: "EXIT ROUNDABOUT" };
    default: return { symbol: "↑", label: "CONTINUE" };
  }
}



function formatEta(seconds) {
  const value = Number(seconds);

  if (!Number.isFinite(value)) {
    return "--";
  }

  const date = new Date(
    Date.now() +
    value * 1000
  );

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


// ============================================================
// COMPONENT
// ============================================================

export default function FoodWalkMap({
  start = null,
  destination = null,
  restaurants = [],
  selectedStops = [],
  startLabel = "",
  destinationLabel = "",
  navigationEnabled = false,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const userMarkerRef = useRef(null);
  const staticMarkersRef = useRef([]);
  const watchIdRef = useRef(null);
  const routeCoordinatesRef = useRef([]);
  const routeTripRef = useRef(null);
  const currentLocationRef = useRef(null);
  const lastRerouteAtRef = useRef(0);
  const travelModeRef = useRef("auto");

  const [mapReady, setMapReady] = useState(false);
  const [navigationStarted, setNavigationStarted] = useState(false);
  const [followUser, setFollowUser] = useState(true);
  const [travelMode, setTravelMode] = useState("auto");

  const [routeSummary, setRouteSummary] = useState(null);

  const [nextInstruction, setNextInstruction] = useState(
    "Choose a mode and start navigation."
  );

  const [nextTurnDistance, setNextTurnDistance] = useState("");
  const [currentRoadName, setCurrentRoadName] = useState("");

  const [maneuverSymbol, setManeuverSymbol] = useState("↑");
  const [maneuverLabel, setManeuverLabel] = useState("GO STRAIGHT");

  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(null);
  const [locationReady, setLocationReady] = useState(false);

  const [loadingRoute, setLoadingRoute] = useState(false);

  const [error, setError] = useState("");
  const [mapError, setMapError] = useState("");

  const [remainingStopIndex, setRemainingStopIndex] = useState(0);
  const [arrived, setArrived] = useState(false);

  const [rerouting, setRerouting] = useState(false);


  const normalizedStart = useMemo(
    () =>
      normalizePoint(
        start,
        startLabel
      ),
    [
      start,
      startLabel,
    ]
  );


  const normalizedDestination = useMemo(
    () =>
      normalizePoint(
        destination,
        destinationLabel
      ),
    [
      destination,
      destinationLabel,
    ]
  );


  const normalizedSelectedStops = useMemo(
    () =>
      (
        Array.isArray(
          selectedStops
        )
          ? selectedStops
          : []
      )
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
        .filter(Boolean),
    [
      selectedStops,
    ]
  );


  const coordinateStops = useMemo(
    () =>
      normalizedSelectedStops
        .filter(
          isCoordinatePoint
        ),
    [
      normalizedSelectedStops,
    ]
  );


  const missingCoordinateStops = useMemo(
    () =>
      normalizedSelectedStops
        .filter(
          stop =>
            !isCoordinatePoint(
              stop
            )
        ),
    [
      normalizedSelectedStops,
    ]
  );


  const canNavigate =
    coordinateStops.length > 0 ||
    isCoordinatePoint(
      normalizedDestination
    );


  const remainingStops =
    coordinateStops.slice(
      remainingStopIndex
    );


  const nextTarget =
    remainingStops[0] ||
    (
      isCoordinatePoint(
        normalizedDestination
      )
        ? normalizedDestination
        : null
    );


  const totalStops =
    coordinateStops.length;


  const completedStops =
    Math.min(
      remainingStopIndex,
      totalStops
    );


  // ==========================================================
  // MODE
  // ==========================================================

  function getCosting(
    mode =
      travelModeRef.current
  ) {
    if (
      mode === "bicycle"
    ) {
      return "bicycle";
    }

    if (
      mode === "auto"
    ) {
      return "auto";
    }

    return "pedestrian";
  }


  // ==========================================================
  // MAP INITIALIZATION
  // ==========================================================

  useEffect(
    () => {

      if (
        !mapContainerRef.current ||
        mapRef.current
      ) {
        return undefined;
      }


      let map;


      try {

        map =
          new Map({

            container:
              mapContainerRef.current,

            style:
              MAP_STYLE,

            center: [
              77.5946,
              12.9716,
            ],

            zoom:
              11,

            minZoom:
              3,

            maxZoom:
              19,

            attributionControl:
              true,
          });


        mapRef.current =
          map;


        setMapReady(
          true
        );


        if (
          typeof ResizeObserver !==
          "undefined"
        ) {

          resizeObserverRef.current =
            new ResizeObserver(
              () => {

                requestAnimationFrame(
                  () => {

                    mapRef.current
                      ?.resize();
                  }
                );
              }
            );


          resizeObserverRef.current
            .observe(
              mapContainerRef.current
            );
        }


        map.addControl(

          new NavigationControl({
            visualizePitch:
              true,
          }),

          "top-right"
        );


        map.addControl(

          new ScaleControl({
            unit:
              "metric",
          }),

          "bottom-right"
        );


        map.on(
          "load",
          () => {

            setMapReady(
              true
            );

            setMapError(
              ""
            );

            requestAnimationFrame(
              () => {

                map.resize();
              }
            );
          }
        );


        map.on(
          "error",
          event => {

            console.warn(
              "MAPLIBRE MAP ERROR:",
              event?.error ||
              event
            );

            setMapReady(
              true
            );
          }
        );


        map.on(
          "dragstart",
          () => {

            setFollowUser(
              false
            );
          }
        );


        const handleResize =
          () => {

            map.resize();
          };


        window.addEventListener(
          "resize",
          handleResize
        );


        return () => {

          window.removeEventListener(
            "resize",
            handleResize
          );


          resizeObserverRef.current
            ?.disconnect();


          if (
            watchIdRef.current !==
            null
          ) {

            navigator
              .geolocation
              ?.clearWatch(
                watchIdRef.current
              );
          }


          staticMarkersRef.current
            .forEach(
              marker =>
                marker.remove()
            );


          staticMarkersRef.current =
            [];


          userMarkerRef.current
            ?.remove();


          userMarkerRef.current =
            null;


          map.remove();


          mapRef.current =
            null;
        };


      } catch (
        mapCreationError
      ) {

        console.error(
          mapCreationError
        );


        setMapReady(
          true
        );


        setMapError(
          mapCreationError?.message ||
          "Map could not be created."
        );


        return undefined;
      }

    },
    []
  );


  // ==========================================================
  // CURRENT LOCATION ON LOAD
  // ==========================================================

  useEffect(
    () => {

      if (
        !mapReady ||
        currentLocationRef.current
      ) {
        return;
      }


      acquireCurrentLocation({
        centerMap:
          false,

        startWatching:
          false,
      });

    },
    [
      mapReady,
    ]
  );


  // ==========================================================
  // PREVIEW REFRESH
  // ==========================================================

  useEffect(
    () => {

      if (
        !mapReady
      ) {
        return;
      }


      drawStaticMarkers();


      if (
        !navigationStarted
      ) {

        drawPreviewRoute();
      }

    },
    [
      mapReady,
      normalizedStart,
      normalizedDestination,
      coordinateStops,
      restaurants,
      navigationStarted,
      travelMode,
    ]
  );


  // ==========================================================
  // MARKERS
  // ==========================================================

  function clearStaticMarkers() {

    staticMarkersRef.current
      .forEach(
        marker =>
          marker.remove()
      );


    staticMarkersRef.current =
      [];
  }


  function createMarkerElement(
    className,
    text
  ) {

    const element =
      document.createElement(
        "div"
      );


    element.className =
      className;


    element.textContent =
      text;


    return element;
  }

function addMarker(
  point,
  className,
  text,
  title
) {
  if (
    !mapRef.current ||
    !isCoordinatePoint(point)
  ) {
    return;
  }

  const element =
    createMarkerElement(
      className,
      text
    );

  const popupHtml = `
    <div class="food-map-hotel-popup">
      <div class="food-map-hotel-popup-icon">
        🍴
      </div>

      <div class="food-map-hotel-popup-content">
        <strong>
          ${title || point.name || "Hotel"}
        </strong>

        ${
          point.cuisine
            ? `<span>${point.cuisine}</span>`
            : ""
        }

        ${
          point.locality
            ? `<small>${point.locality}</small>`
            : ""
        }
      </div>
    </div>
  `;

  const marker =
    new Marker({
      element,
      anchor: "bottom",
    })

      .setLngLat([
        Number(
          point.longitude
        ),

        Number(
          point.latitude
        ),
      ])

      .setPopup(
        new Popup({
          offset: 18,
          closeButton: false,
          className:
            "food-map-hotel-popup-wrapper",
        }).setHTML(
          popupHtml
        )
      )

      .addTo(
        mapRef.current
      );

  staticMarkersRef.current.push(
    marker
  );
}


  function drawStaticMarkers() {

    clearStaticMarkers();


    if (
      isCoordinatePoint(
        normalizedStart
      )
    ) {

      addMarker(
        normalizedStart,
        "food-nav-marker food-nav-marker-start",
        "S",
        startLabel ||
        normalizedStart.name ||
        "Start"
      );
    }


    coordinateStops
      .forEach(
        (
          stop,
          index
        ) => {

          addMarker(
            stop,
            "food-nav-marker food-nav-marker-stop",
            String(
              index + 1
            ),
            stop.name
          );
        }
      );


    if (
      isCoordinatePoint(
        normalizedDestination
      )
    ) {

      addMarker(
        normalizedDestination,
        "food-nav-marker food-nav-marker-destination",
        "D",
        destinationLabel ||
        normalizedDestination.name ||
        "Destination"
      );
    }


    const selectedIds =
      new Set(

        coordinateStops
          .map(
            stop =>
              Number(
                stop.restaurant_id ||
                stop.id
              )
          )
      );


    (
      Array.isArray(
        restaurants
      )
        ? restaurants
        : []
    )

      .map(
        (
          restaurant,
          index
        ) =>
          normalizeStop(
            restaurant,
            index
          )
      )

      .filter(
        isCoordinatePoint
      )

      .filter(
        restaurant =>
          !selectedIds.has(
            Number(
              restaurant.restaurant_id ||
              restaurant.id
            )
          )
      )

      .forEach(
        restaurant => {

                  addMarker(
          restaurant,
          "food-nav-marker food-nav-marker-hotel",
          "🍴",
          restaurant.name
        );
        }
      );
  }


  // ==========================================================
  // LOCATION BUILDERS
  // ==========================================================

  function getPreviewLocations() {

    const locations =
      [];


    if (
      isCoordinatePoint(
        normalizedStart
      )
    ) {

      locations.push({

        lat:
          Number(
            normalizedStart.latitude
          ),

        lon:
          Number(
            normalizedStart.longitude
          ),

        type:
          "break",
      });
    }


    coordinateStops
      .forEach(
        stop => {

          locations.push({

            lat:
              Number(
                stop.latitude
              ),

            lon:
              Number(
                stop.longitude
              ),

            type:
              "break",
          });
        }
      );


    if (
      isCoordinatePoint(
        normalizedDestination
      )
    ) {

      locations.push({

        lat:
          Number(
            normalizedDestination.latitude
          ),

        lon:
          Number(
            normalizedDestination.longitude
          ),

        type:
          "break",
      });
    }


    return locations;
  }


  function buildNavigationLocations(
    latitude,
    longitude
  ) {

    const locations = [

      {
        lat:
          Number(
            latitude
          ),

        lon:
          Number(
            longitude
          ),

        type:
          "break",
      },
    ];


    remainingStops
      .forEach(
        stop => {

          locations.push({

            lat:
              Number(
                stop.latitude
              ),

            lon:
              Number(
                stop.longitude
              ),

            type:
              "break",
          });
        }
      );


    if (
      isCoordinatePoint(
        normalizedDestination
      )
    ) {

      const alreadyIncluded =
        locations.some(
          point =>

            Math.abs(
              point.lat -
              Number(
                normalizedDestination.latitude
              )
            ) <
            0.000001

            &&

            Math.abs(
              point.lon -
              Number(
                normalizedDestination.longitude
              )
            ) <
            0.000001
        );


      if (
        !alreadyIncluded
      ) {

        locations.push({

          lat:
            Number(
              normalizedDestination.latitude
            ),

          lon:
            Number(
              normalizedDestination.longitude
            ),

          type:
            "break",
        });
      }
    }


    return locations;
  }


  // ==========================================================
  // VALHALLA
  // ==========================================================

  async function requestValhallaRoute(
    locations,
    mode =
      travelModeRef.current
  ) {

    const response =
      await fetch(

        `${VALHALLA_URL}/route`,

        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({

              locations,

              costing:
                getCosting(
                  mode
                ),

              units:
                "kilometers",

              directions_options: {

                units:
                  "kilometers",

                language:
                  "en-US",
              },
            }),
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `Routing service returned ${response.status}.`
      );
    }


    const data =
      await response.json();


    if (
      !data?.trip?.legs?.length
    ) {

      throw new Error(
        "No route was returned."
      );
    }


    return data.trip;
  }


  function extractRouteCoordinates(
    trip
  ) {

    const coordinates =
      [];


    trip.legs
      .forEach(
        leg => {

          coordinates.push(

            ...decodePolyline6(
              leg.shape
            )
          );
        }
      );


    return coordinates;
  }


  // ==========================================================
  // ROUTE DRAWING
  // ==========================================================

  function drawRoute(
    coordinates,
    liveNavigation =
      false
  ) {

    const map =
      mapRef.current;


    if (
      !map ||
      !coordinates.length
    ) {
      return;
    }


    if (
      !map.isStyleLoaded()
    ) {

      map.once(
        "load",
        () => {

          if (
            mapRef.current ===
            map
          ) {

            drawRoute(
              coordinates,
              liveNavigation
            );
          }
        }
      );

      return;
    }


    const geoJson = {

      type:
        "Feature",

      properties: {},

      geometry: {

        type:
          "LineString",

        coordinates,
      },
    };


    if (
      map.getSource(
        "food-walk-route"
      )
    ) {

      map
        .getSource(
          "food-walk-route"
        )
        .setData(
          geoJson
        );

    } else {

      map.addSource(
        "food-walk-route",
        {

          type:
            "geojson",

          data:
            geoJson,
        }
      );


      map.addLayer({

        id:
          "food-walk-route-outline",

        type:
          "line",

        source:
          "food-walk-route",

        layout: {

          "line-cap":
            "round",

          "line-join":
            "round",
        },

        paint: {

          "line-color":
            liveNavigation
              ? "#dcecff"
              : "#ffffff",

          "line-width":
            liveNavigation
              ? 13
              : 10,

          "line-opacity":
            liveNavigation
              ? 0.95
              : 0.82,
        },
      });


      map.addLayer({

        id:
          "food-walk-route-line",

        type:
          "line",

        source:
          "food-walk-route",

        layout: {

          "line-cap":
            "round",

          "line-join":
            "round",
        },

        paint: {

          "line-color":
            liveNavigation
              ? "#247cff"
              : "#ff5f22",

          "line-width":
            liveNavigation
              ? 8
              : 6,

          "line-opacity":
            1,
        },
      });
    }


    if (
      map.getLayer(
        "food-walk-route-outline"
      )
    ) {

      map.setPaintProperty(
        "food-walk-route-outline",
        "line-color",
        liveNavigation
          ? "#dcecff"
          : "#ffffff"
      );


      map.setPaintProperty(
        "food-walk-route-outline",
        "line-width",
        liveNavigation
          ? 13
          : 10
      );
    }


    if (
      map.getLayer(
        "food-walk-route-line"
      )
    ) {

      map.setPaintProperty(
        "food-walk-route-line",
        "line-color",
        liveNavigation
          ? "#247cff"
          : "#ff5f22"
      );


      map.setPaintProperty(
        "food-walk-route-line",
        "line-width",
        liveNavigation
          ? 8
          : 6
      );
    }
  }


  function fitRoute(
    coordinates
  ) {

    const map =
      mapRef.current;


    if (
      !map ||
      !coordinates.length
    ) {
      return;
    }


    const bounds =
      coordinates.reduce(

        (
          current,
          coordinate
        ) =>
          current.extend(
            coordinate
          ),

        new LngLatBounds(
          coordinates[0],
          coordinates[0]
        )
      );


    map.fitBounds(
      bounds,
      {

        padding: {

          top:
            navigationStarted
              ? 125
              : 70,

          bottom:
            navigationStarted
              ? 210
              : 70,

          left:
            45,

          right:
            45,
        },

        maxZoom:
          16,

        duration:
          650,
      }
    );
  }


  // ==========================================================
  // PREVIEW ROUTE
  // ==========================================================

  async function drawPreviewRoute() {

    if (
      navigationStarted
    ) {
      return;
    }


    const locations =
      getPreviewLocations();


    if (
      locations.length <
      2
    ) {
      return;
    }


    try {

      setError(
        ""
      );


      const trip =
        await requestValhallaRoute(
          locations,
          travelModeRef.current
        );


      const coordinates =
        extractRouteCoordinates(
          trip
        );


      drawRoute(
        coordinates,
        false
      );


      fitRoute(
        coordinates
      );


    } catch (
      routeError
    ) {

      console.warn(
        routeError
      );


      setError(
        routeError?.message ||
        "Shortest route could not be loaded."
      );
    }
  }


  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  function updateUserMarker(
    latitude,
    longitude,
    heading =
      null
  ) {

    const map =
      mapRef.current;


    if (
      !map
    ) {
      return;
    }


    if (
      !userMarkerRef.current
    ) {

      const element =
        document.createElement(
          "div"
        );


      element.className =
        "food-nav-current-location";


      element.innerHTML = `

        <span
          class="food-nav-current-pulse"
        ></span>

        <span
          class="food-nav-current-dot"
        >
          <span
            class="food-nav-car-arrow"
          >
            ▲
          </span>
        </span>
      `;


      userMarkerRef.current =
        new Marker({

          element,

          anchor:
            "center",
        })

          .setLngLat([
            longitude,
            latitude,
          ])

          .addTo(
            map
          );
    }


    userMarkerRef.current
      .setLngLat([
        longitude,
        latitude,
      ]);


    const arrow =
      userMarkerRef.current
        .getElement()
        .querySelector(
          ".food-nav-car-arrow"
        );


    if (
      arrow &&
      Number.isFinite(
        Number(
          heading
        )
      )
    ) {

      arrow.style.transform =
        `rotate(${Number(heading)}deg)`;
    }


    if (
      navigationStarted &&
      followUser
    ) {

      const isCar =
        travelModeRef.current ===
        "auto";


      map.easeTo({

        center: [
          longitude,
          latitude,
        ],

        zoom:
          isCar
            ? 18
            : 17,

        pitch:
          isCar
            ? 62
            : 32,

        bearing:
          Number.isFinite(
            Number(
              heading
            )
          )
            ? Number(
                heading
              )
            : map.getBearing(),

        padding:
          isCar
            ? {
                top:
                  110,

                bottom:
                  220,

                left:
                  25,

                right:
                  25,
              }
            : {
                top:
                  90,

                bottom:
                  190,

                left:
                  20,

                right:
                  20,
              },

        duration:
          400,
      });
    }
  }


  function acquireCurrentLocation({
    centerMap =
      true,

    startWatching =
      false,
  } = {}) {

    if (
      !navigator.geolocation
    ) {

      setError(
        "Live location is not supported by this browser."
      );

      return;
    }


    setError(
      ""
    );


    navigator.geolocation
      .getCurrentPosition(

        position => {

          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          const heading =
            position.coords.heading;

          const accuracy =
            position.coords.accuracy;

          const speed =
            position.coords.speed;


          currentLocationRef.current =
            {
              latitude,
              longitude,
              heading,
              accuracy,
              speed,
            };


          setLocationReady(
            true
          );


          setLocationAccuracy(
            accuracy
          );


          if (
            speed !==
              null &&
            speed !==
              undefined &&
            Number.isFinite(
              Number(
                speed
              )
            )
          ) {

            setCurrentSpeed(
              Number(speed) *
              3.6
            );

          } else {

            setCurrentSpeed(
              null
            );
          }


          updateUserMarker(
            latitude,
            longitude,
            heading
          );


          if (
            centerMap &&
            mapRef.current
          ) {

            mapRef.current
              .easeTo({

                center: [
                  longitude,
                  latitude,
                ],

                zoom:
                  15.5,

                duration:
                  550,
              });
          }


          if (
            startWatching
          ) {

            startLocationWatch();
          }
        },


        locationError => {

          console.error(
            locationError
          );


          if (
            locationError.code ===
            1
          ) {

            setError(
              "Location permission is blocked. Enable browser and Windows location access."
            );

          } else if (
            locationError.code ===
            2
          ) {

            setError(
              "Your current location could not be determined."
            );

          } else {

            setError(
              "Current location request timed out."
            );
          }
        },


        {
          enableHighAccuracy:
            true,

          timeout:
            15000,

          maximumAge:
            0,
        }
      );
  }


  // ==========================================================
  // TURN-BY-TURN
  // ==========================================================

  function updateInstruction(
    latitude,
    longitude
  ) {

    const trip =
      routeTripRef.current;


    if (
      !trip?.legs?.length
    ) {
      return;
    }


    let closestManeuver =
      null;


    let smallestDistance =
      Infinity;


    trip.legs
      .forEach(
        leg => {

          const routeShape =
            decodePolyline6(
              leg.shape
            );


          (
            leg.maneuvers ||
            []
          )

            .forEach(
              maneuver => {

                const point =
                  routeShape[
                    Number(
                      maneuver
                        .begin_shape_index
                    )
                  ];


                if (
                  !point
                ) {
                  return;
                }


                const distance =
                  haversineMeters(

                    latitude,

                    longitude,

                    point[1],

                    point[0]
                  );


                if (
                  distance <
                  smallestDistance
                ) {

                  smallestDistance =
                    distance;


                  closestManeuver =
                    maneuver;
                }
              }
            );
        }
      );


    if (
      !closestManeuver
    ) {
      return;
    }


    if (
      smallestDistance <
      1000
    ) {

      setNextTurnDistance(
        `${Math.max(
          0,
          Math.round(
            smallestDistance
          )
        )} m`
      );

    } else {

      setNextTurnDistance(
        `${(
          smallestDistance /
          1000
        ).toFixed(1)} km`
      );
    }


    setNextInstruction(

      closestManeuver
        .instruction ||

      closestManeuver
        .verbal_pre_transition_instruction ||

      "Continue straight."
    );


    setCurrentRoadName(

      closestManeuver
        .street_names?.[0] ||

      closestManeuver
        .begin_street_names?.[0] ||

      ""
    );


    const maneuverInfo =
      getManeuverInfo(
        closestManeuver.type
      );

    setManeuverSymbol(
      maneuverInfo.symbol
    );

    setManeuverLabel(
      maneuverInfo.label
    );
  }


  // ==========================================================
  // ARRIVAL
  // ==========================================================

  function checkArrival(
    latitude,
    longitude
  ) {

    if (
      !nextTarget ||
      !isCoordinatePoint(
        nextTarget
      )
    ) {
      return;
    }


    const distance =
      haversineMeters(

        latitude,

        longitude,

        Number(
          nextTarget.latitude
        ),

        Number(
          nextTarget.longitude
        )
      );


    const threshold =
      travelModeRef.current ===
        "auto"
        ? 45
        : travelModeRef.current ===
            "bicycle"
          ? 30
          : 20;


    if (
      distance >
      threshold
    ) {
      return;
    }


    if (
      remainingStops.length >
      0
    ) {

      const reached =
        remainingStops[0];


      setManeuverLabel(
        "ARRIVED AT STOP"
      );

      setNextInstruction(
        `Reached ${reached.name}.`
      );


      setNextTurnDistance(
        "Arrived"
      );


      setCurrentRoadName(
        "Continuing to the next FoodKindl stop"
      );


      const nextIndex =
        remainingStopIndex +
        1;


      setRemainingStopIndex(
        nextIndex
      );


      window.setTimeout(
        () => {

          const current =
            currentLocationRef.current;


          if (
            current
          ) {

            calculateNavigationRoute(
              current.latitude,
              current.longitude,
              {
                fit:
                  false,
              }
            );
          }

        },
        700
      );


      return;
    }


    if (
      isCoordinatePoint(
        normalizedDestination
      )
    ) {

      setArrived(
        true
      );

      setManeuverLabel(
        "ARRIVED"
      );

      setNextTurnDistance(
        "Arrived"
      );


      setNextInstruction(
        `You have arrived at ${
          destinationLabel ||
          normalizedDestination.name ||
          "your destination"
        }.`
      );


      setCurrentRoadName(
        "FoodKindl journey complete"
      );
    }
  }


  // ==========================================================
  // LIVE ROUTE
  // ==========================================================

  async function calculateNavigationRoute(
    latitude,
    longitude,
    {
      fit =
        false,
    } = {}
  ) {

    const locations =
      buildNavigationLocations(
        latitude,
        longitude
      );


    if (
      locations.length <
      2
    ) {

      setError(
        "A destination or stop with coordinates is required."
      );

      return;
    }


    try {

      setLoadingRoute(
        true
      );


      setError(
        ""
      );


      const trip =
        await requestValhallaRoute(
          locations,
          travelModeRef.current
        );


      const coordinates =
        extractRouteCoordinates(
          trip
        );


      routeTripRef.current =
        trip;


      routeCoordinatesRef.current =
        coordinates;


      setRouteSummary(
        trip.summary ||
        null
      );


      setRerouting(
        false
      );


      const first =
        trip
          ?.legs?.[0]
          ?.maneuvers?.[0];


      if (
        first
      ) {

        setNextInstruction(
          first.instruction ||
          "Continue on the route."
        );


        const maneuverInfo =
          getManeuverInfo(
            first.type
          );

        setManeuverSymbol(
          maneuverInfo.symbol
        );

        setManeuverLabel(
          maneuverInfo.label
        );


        setCurrentRoadName(
          first.street_names?.[0] ||
          first.begin_street_names?.[0] ||
          ""
        );


        if (
          Number.isFinite(
            Number(
              first.length
            )
          )
        ) {

          setNextTurnDistance(
            formatDistance(
              first.length
            )
          );
        }
      }


      drawRoute(
        coordinates,
        true
      );


      if (
        fit
      ) {

        fitRoute(
          coordinates
        );
      }


    } catch (
      routeError
    ) {

      setRerouting(
        false
      );


      console.error(
        routeError
      );


      setError(
        routeError.message ||
        "Navigation route could not be calculated."
      );


    } finally {

      setLoadingRoute(
        false
      );
    }
  }


  // ==========================================================
  // AUTO REROUTE
  // ==========================================================

  function maybeReroute(
    latitude,
    longitude
  ) {

    const coordinates =
      routeCoordinatesRef.current;


    if (
      !coordinates.length
    ) {
      return;
    }


    const offRouteMeters =
      nearestRouteDistance(
        latitude,
        longitude,
        coordinates
      );


    const threshold =
      travelModeRef.current ===
        "auto"
        ? 70
        : travelModeRef.current ===
            "bicycle"
          ? 45
          : 30;


    if (
      offRouteMeters <=
      threshold
    ) {
      return;
    }


    const now =
      Date.now();


    if (
      now -
      lastRerouteAtRef.current <
      10000
    ) {
      return;
    }


    lastRerouteAtRef.current =
      now;


    setRerouting(
      true
    );

    setManeuverLabel(
      "REROUTING"
    );

    setNextInstruction(
      "Finding a better route…"
    );


    setNextTurnDistance(
      "Rerouting"
    );


    calculateNavigationRoute(
      latitude,
      longitude,
      {
        fit:
          false,
      }
    );
  }


  // ==========================================================
  // LIVE WATCH
  // ==========================================================

  function startLocationWatch() {

    if (
      !navigator.geolocation
    ) {

      setError(
        "Live location is not supported."
      );

      return;
    }


    if (
      watchIdRef.current !==
      null
    ) {

      navigator
        .geolocation
        .clearWatch(
          watchIdRef.current
        );
    }


    watchIdRef.current =
      navigator.geolocation
        .watchPosition(

          position => {

            const latitude =
              position.coords.latitude;

            const longitude =
              position.coords.longitude;

            const heading =
              position.coords.heading;

            const accuracy =
              position.coords.accuracy;

            const speed =
              position.coords.speed;


            currentLocationRef.current =
              {
                latitude,
                longitude,
                heading,
                accuracy,
                speed,
              };


            setLocationReady(
              true
            );


            setLocationAccuracy(
              accuracy
            );


            if (
              speed !==
                null &&
              speed !==
                undefined &&
              Number.isFinite(
                Number(
                  speed
                )
              )
            ) {

              setCurrentSpeed(
                Number(speed) *
                3.6
              );

            } else {

              setCurrentSpeed(
                null
              );
            }


            updateUserMarker(
              latitude,
              longitude,
              heading
            );


            updateInstruction(
              latitude,
              longitude
            );


            checkArrival(
              latitude,
              longitude
            );


            maybeReroute(
              latitude,
              longitude
            );
          },


          locationError => {

            console.error(
              locationError
            );


            setError(
              locationError.code ===
                1
                ? "Location permission is blocked."
                : "Live location could not be updated."
            );
          },


          {
            enableHighAccuracy:
              true,

            maximumAge:
              500,

            timeout:
              10000,
          }
        );
  }


  // ==========================================================
  // START NAVIGATION
  // ==========================================================

  function startNavigation() {

    if (
      !canNavigate
    ) {

      setError(
        "Add at least one destination or Food Walk stop with coordinates."
      );

      return;
    }


    if (
      missingCoordinateStops.length >
      0
    ) {

      setError(
        `Navigation needs coordinates for: ${
          missingCoordinateStops
            .map(
              stop =>
                stop.name
            )
            .join(", ")
        }`
      );

      return;
    }


    if (
      !navigator.geolocation
    ) {

      setError(
        "Live location is not supported by this browser."
      );

      return;
    }


    setError(
      ""
    );


    setArrived(
      false
    );


    setRemainingStopIndex(
      0
    );


    navigator.geolocation
      .getCurrentPosition(

        async position => {

          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          const heading =
            position.coords.heading;

          const accuracy =
            position.coords.accuracy;

          const speed =
            position.coords.speed;


          currentLocationRef.current =
            {
              latitude,
              longitude,
              heading,
              accuracy,
              speed,
            };


          setLocationReady(
            true
          );


          setNavigationStarted(
            true
          );


          setFollowUser(
            true
          );


          setLocationAccuracy(
            accuracy
          );


          if (
            speed !==
              null &&
            speed !==
              undefined &&
            Number.isFinite(
              Number(
                speed
              )
            )
          ) {

            setCurrentSpeed(
              Number(speed) *
              3.6
            );
          }


          updateUserMarker(
            latitude,
            longitude,
            heading
          );


          const map =
            mapRef.current;


          if (
            map
          ) {

            const isCar =
              travelModeRef.current ===
              "auto";


            map.easeTo({

              center: [
                longitude,
                latitude,
              ],

              zoom:
                isCar
                  ? 18
                  : 17,

              pitch:
                isCar
                  ? 62
                  : 32,

              bearing:
                Number.isFinite(
                  Number(
                    heading
                  )
                )
                  ? Number(
                      heading
                    )
                  : map.getBearing(),

              padding:
                isCar
                  ? {
                      top:
                        110,

                      bottom:
                        220,

                      left:
                        25,

                      right:
                        25,
                    }
                  : {
                      top:
                        90,

                      bottom:
                        190,

                      left:
                        20,

                      right:
                        20,
                    },

              duration:
                600,
            });
          }


          await calculateNavigationRoute(
            latitude,
            longitude,
            {
              fit:
                false,
            }
          );


          startLocationWatch();
        },


        locationError => {

          console.error(
            locationError
          );


          if (
            locationError.code ===
            1
          ) {

            setError(
              "Location permission is blocked. Allow location access in the browser and Windows Settings."
            );

          } else if (
            locationError.code ===
            2
          ) {

            setError(
              "Your current GPS location is unavailable."
            );

          } else {

            setError(
              "Location request timed out."
            );
          }
        },


        {
          enableHighAccuracy:
            true,

          timeout:
            15000,

          maximumAge:
            0,
        }
      );
  }


  // ==========================================================
  // END NAVIGATION
  // ==========================================================

  function endNavigation() {

    if (
      watchIdRef.current !==
      null
    ) {

      navigator.geolocation
        .clearWatch(
          watchIdRef.current
        );


      watchIdRef.current =
        null;
    }


    setNavigationStarted(
      false
    );


    setFollowUser(
      false
    );


    setRouteSummary(
      null
    );


    setCurrentSpeed(
      null
    );


    setArrived(
      false
    );


    setRerouting(
      false
    );


    setRemainingStopIndex(
      0
    );


    setNextTurnDistance(
      ""
    );

    setManeuverLabel(
      "GO STRAIGHT"
    );

    setCurrentRoadName(
      ""
    );


    routeTripRef.current =
      null;


    routeCoordinatesRef.current =
      [];


    setNextInstruction(
      "Navigation ended."
    );


    window.setTimeout(
      () => {

        mapRef.current
          ?.resize();


        drawPreviewRoute();

      },
      100
    );
  }


  // ==========================================================
  // RECENTER
  // ==========================================================

  function recenter() {

    const map =
      mapRef.current;


    const position =
      currentLocationRef.current;


    if (
      !map ||
      !position
    ) {
      return;
    }


    setFollowUser(
      true
    );


    const isCar =
      travelModeRef.current ===
      "auto";


    map.easeTo({

      center: [
        position.longitude,
        position.latitude,
      ],

      zoom:
        isCar
          ? 18
          : 17,

      pitch:
        isCar
          ? 62
          : 32,

      bearing:
        Number.isFinite(
          Number(
            position.heading
          )
        )
          ? Number(
              position.heading
            )
          : map.getBearing(),

      padding:
        isCar
          ? {
              top:
                110,

              bottom:
                220,

              left:
                25,

              right:
                25,
            }
          : {
              top:
                90,

              bottom:
                190,

              left:
                20,

              right:
                20,
            },

      duration:
        400,
    });
  }


  // ==========================================================
  // MODE CHANGE
  // ==========================================================

  async function changeMode(
    mode
  ) {

    travelModeRef.current =
      mode;


    setTravelMode(
      mode
    );


    const position =
      currentLocationRef.current;


    if (
      navigationStarted &&
      position
    ) {

      await calculateNavigationRoute(
        position.latitude,
        position.longitude,
        {
          fit:
            false,
        }
      );


      recenter();


      return;
    }


    if (
      mapRef.current &&
      mapReady
    ) {

      window.setTimeout(
        () => {

          drawPreviewRoute();

        },
        0
      );
    }
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="food-nav-shell">


      <div
        ref={
          mapContainerRef
        }
        className="food-nav-map"
      />


      {
        !mapReady &&
        (
          <div className="food-nav-map-loading">

            <div className="food-nav-map-loader" />

            <strong>
              Loading map...
            </strong>

            <span>
              Preparing your FoodKindl route
            </span>

          </div>
        )
      }


      {
        mapError &&
        (
          <div className="food-nav-map-error">

            {
              mapError
            }

          </div>
        )
      }


      {/* =====================================================
          MODE SWITCHER
      ===================================================== */}

      <div className="food-nav-mode-switcher">

        <button
          type="button"
          className={
            travelMode ===
              "pedestrian"
              ? "active"
              : ""
          }
          onClick={() =>
            changeMode(
              "pedestrian"
            )
          }
        >

          🚶

          <span>
            Walk
          </span>

        </button>


        <button
          type="button"
          className={
            travelMode ===
              "bicycle"
              ? "active"
              : ""
          }
          onClick={() =>
            changeMode(
              "bicycle"
            )
          }
        >

          🚲

          <span>
            Bike
          </span>

        </button>


        <button
          type="button"
          className={
            travelMode ===
              "auto"
              ? "active"
              : ""
          }
          onClick={() =>
            changeMode(
              "auto"
            )
          }
        >

          🚗

          <span>
            Car
          </span>

        </button>

      </div>


      {/* =====================================================
          ADVANCED NAVIGATION HUD
      ===================================================== */}

      {
        navigationStarted &&
        (
          <div
            className={
              arrived
                ? "food-nav-driving-hud arrived"
                : rerouting
                  ? "food-nav-driving-hud rerouting"
                  : "food-nav-driving-hud"
            }
          >

            <div className="food-nav-driving-turn">

              {
                arrived
                  ? "✓"
                  : rerouting
                    ? "↻"
                    : maneuverSymbol
              }

            </div>


            <div className="food-nav-driving-copy">

              <div className="food-nav-driving-topline">

                <span className="food-nav-driving-action">
                  {
                    arrived
                      ? "ARRIVED"
                      : rerouting
                        ? "REROUTING"
                        : maneuverLabel
                  }
                </span>

                <div className="food-nav-driving-topright">

                  <span className="food-nav-driving-distance">
                    {
                      nextTurnDistance ||
                      (
                        arrived
                          ? "Arrived"
                          : "Continue"
                      )
                    }
                  </span>

                  {
                    totalStops > 0 &&
                    (
                      <span className="food-nav-driving-progress">
                        Stop{" "}
                        {
                          Math.min(
                            completedStops + 1,
                            totalStops
                          )
                        }
                        /
                        {
                          totalStops
                        }
                      </span>
                    )
                  }

                </div>

              </div>


              <div className="food-nav-driving-instruction">

                {
                  nextInstruction
                }

              </div>


              {
                currentRoadName &&
                (
                  <div className="food-nav-driving-road">

                    onto {
                      currentRoadName
                    }

                  </div>
                )
              }

            </div>

          </div>
        )
      }


      {/* =====================================================
          MY LOCATION / RECENTER
      ===================================================== */}

      {
        navigationStarted
          ? (
              <button
                type="button"
                className={
                  followUser
                    ? "food-nav-recenter active"
                    : "food-nav-recenter"
                }
                onClick={
                  recenter
                }
                aria-label="Follow current location"
              >

                ◎

              </button>
            )
          : (
              <button
                type="button"
                className="food-nav-my-location"
                onClick={() =>
                  acquireCurrentLocation({
                    centerMap:
                      true,
                    startWatching:
                      false,
                  })
                }
              >

                ◎{" "}

                {
                  locationReady
                    ? "My Location"
                    : "Find Me"
                }

              </button>
            )
      }


      {/* =====================================================
          REROUTING BADGE
      ===================================================== */}

      {
        rerouting &&
        (
          <div className="food-nav-rerouting-badge">

            <span className="food-nav-rerouting-spinner" />

            Recalculating route

          </div>
        )
      }


      {/* =====================================================
          BOTTOM NAVIGATION BAR
      ===================================================== */}

      <div
        className={
          navigationStarted
            ? "food-nav-bottom advanced"
            : "food-nav-bottom"
        }
      >

        <div className="food-nav-route-title">

          <div>

            <small>

              {
                navigationStarted
                  ? "LIVE NAVIGATION"
                  : "FOOD WALK ROUTE"
              }

            </small>


            <strong>

              {
                navigationStarted
                  ? (
                      nextTarget?.name ||
                      destinationLabel ||
                      normalizedDestination?.name ||
                      "Next destination"
                    )
                  : (
                      `${startLabel ||
                        normalizedStart?.name ||
                        "Current location"} → ${
                        destinationLabel ||
                        normalizedDestination?.name ||
                        "Destination"
                      }`
                    )
              }

            </strong>

          </div>


          {
            totalStops >
              0 &&
            (
              <span>

                {
                  Math.max(
                    0,
                    totalStops -
                    completedStops
                  )
                }

                {" left"}

              </span>
            )
          }

        </div>


        {
          error &&
          (
            <div className="food-nav-error">

              {
                error
              }

            </div>
          )
        }


        {
          routeSummary &&
          (
            <div className="food-nav-summary advanced">


              <div>

                <strong>

                  {
                    formatDuration(
                      routeSummary.time
                    )
                  }

                </strong>

                <span>
                  remaining
                </span>

              </div>


              <div>

                <strong>

                  {
                    formatDistance(
                      routeSummary.length
                    )
                  }

                </strong>

                <span>
                  distance
                </span>

              </div>


              <div>

                <strong>

                  {
                    formatEta(
                      routeSummary.time
                    )
                  }

                </strong>

                <span>
                  ETA
                </span>

              </div>


              <div>

                <strong>

                  {
                    currentSpeed !==
                      null
                      ? `${Math.round(
                          currentSpeed
                        )} km/h`
                      : "--"
                  }

                </strong>

                <span>
                  speed
                </span>

              </div>

            </div>
          )
        }


        {
          !navigationStarted
            ? (

                <button
                  type="button"
                  className="food-nav-start-button"
                  onClick={
                    startNavigation
                  }
                  disabled={
                    loadingRoute ||
                    !canNavigate
                  }
                >

                  {
                    loadingRoute
                      ? "Preparing Navigation..."
                      : canNavigate
                        ? "Start Real-Time Navigation"
                        : "Add a Destination to Navigate"
                  }

                </button>

              )
            : (

                <div className="food-nav-running-actions">


                  <button
                    type="button"
                    className="food-nav-follow-button"
                    onClick={
                      recenter
                    }
                  >

                    ◎ Follow

                  </button>


                  <button
                    type="button"
                    className="food-nav-end-button"
                    onClick={
                      endNavigation
                    }
                  >

                    End

                  </button>

                </div>
              )
        }

      </div>

    </div>
  );
}