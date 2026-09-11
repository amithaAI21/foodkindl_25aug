import React, {
  useEffect,
  useMemo,
} from "react";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";


// ============================================================
// LEAFLET DEFAULT MARKER ICONS
// VITE / NETLIFY SAFE
// ============================================================

import markerIcon2x from
  "leaflet/dist/images/marker-icon-2x.png";

import markerIcon from
  "leaflet/dist/images/marker-icon.png";

import markerShadow from
  "leaflet/dist/images/marker-shadow.png";


delete L.Icon.Default.prototype
  ._getIconUrl;


L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    markerIcon2x,

  iconUrl:
    markerIcon,

  shadowUrl:
    markerShadow,
});


// ============================================================
// HELPERS
// ============================================================

function validCoordinate(
  value
) {
  return Number.isFinite(
    Number(value)
  );
}


function normalizeText(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replaceAll("_", " ");
}


// ============================================================
// ONLY RESTAURANTS / CAFÉS
// ============================================================

function isRestaurantOrCafe(
  restaurant
) {
  const tags =
    restaurant?.osm_tags ||
    {};

  const typeText =
    normalizeText(
      [
        restaurant
          ?.restaurant_type,

        restaurant
          ?.category,

        restaurant
          ?.primary_type,

        restaurant
          ?.primary_type_label,

        restaurant
          ?.type,

        ...(Array.isArray(
          restaurant?.types
        )
          ? restaurant.types
          : []),

        tags?.amenity,
      ]
        .filter(Boolean)
        .join(" ")
    );

  /*
   * Reject obvious non-food POIs
   * even if a provider returned them
   * in the nearby-places response.
   */
  const blocked = [
    "bank",
    "atm",
    "church",
    "place of worship",
    "temple",
    "mosque",
    "school",
    "college",
    "university",
    "hospital",
    "clinic",
    "pharmacy",
    "office",
    "police",
    "government",
    "fuel",
    "petrol",
    "supermarket",
    "grocery",
  ];

  if (
    blocked.some(
      value =>
        typeText.includes(
          value
        )
    )
  ) {
    return false;
  }

  return (
    typeText.includes(
      "restaurant"
    ) ||
    typeText.includes(
      "cafe"
    ) ||
    typeText.includes(
      "café"
    ) ||
    typeText.includes(
      "coffee"
    ) ||
    typeText.includes(
      "fast food"
    ) ||
    typeText.includes(
      "food court"
    )
  );
}


function getRestaurantType(
  restaurant
) {
  const value =
    normalizeText(
      restaurant
        ?.restaurant_type ||
      restaurant
        ?.primary_type ||
      restaurant
        ?.category ||
      ""
    );


  if (
    value.includes(
      "cafe"
    ) ||
    value.includes(
      "café"
    ) ||
    value.includes(
      "coffee"
    )
  ) {
    return "Café";
  }


  if (
    value.includes(
      "fast food"
    )
  ) {
    return "Fast Food";
  }


  if (
    value.includes(
      "food court"
    )
  ) {
    return "Food Court";
  }


  return "Restaurant";
}


// ============================================================
// CUSTOM RESTAURANT MARKERS
//
// Normal restaurant: brown/orange pin
// Selected restaurant: larger golden/orange pin with ✓
// ============================================================

function createRestaurantIcon(
  selected = false,
  index = null
) {
  const label =
    selected
      ? "✓"
      : (
          Number.isInteger(
            index
          )
            ? String(
                index + 1
              )
            : "🍴"
        );

  const className =
    selected
      ? "fk-dine-map-pin selected"
      : "fk-dine-map-pin";

  return L.divIcon({
    className:
      "fk-dine-map-marker-shell",

    html: `
      <div class="${className}">
        <span>
          ${label}
        </span>
      </div>
    `,

    iconSize:
      selected
        ? [48, 48]
        : [38, 38],

    iconAnchor:
      selected
        ? [24, 48]
        : [19, 38],

    popupAnchor:
      selected
        ? [0, -46]
        : [0, -36],
  });
}


// ============================================================
// MAP CONTROLLER
// ============================================================

function MapController({
  centerLatitude,
  centerLongitude,
  selectedRestaurant,
}) {
  const map =
    useMap();


  useEffect(
    () => {

      const selectedLat =
        Number(
          selectedRestaurant
            ?.latitude
        );

      const selectedLng =
        Number(
          selectedRestaurant
            ?.longitude
        );


      /*
       * When user chooses a restaurant,
       * focus the map on that place.
       */
      if (
        Number.isFinite(
          selectedLat
        ) &&
        Number.isFinite(
          selectedLng
        )
      ) {

        map.flyTo(
          [
            selectedLat,
            selectedLng,
          ],
          16,
          {
            duration: 0.7,
          }
        );

        return;
      }


      /*
       * Otherwise keep map centred on
       * the location the user searched.
       */
      const centerLat =
        Number(
          centerLatitude
        );

      const centerLng =
        Number(
          centerLongitude
        );


      if (
        Number.isFinite(
          centerLat
        ) &&
        Number.isFinite(
          centerLng
        )
      ) {

        map.flyTo(
          [
            centerLat,
            centerLng,
          ],
          14,
          {
            duration: 0.7,
          }
        );
      }

    },
    [
      centerLatitude,
      centerLongitude,
      selectedRestaurant,
      map,
    ]
  );


  return null;
}


// ============================================================
// FIT RESTAURANTS ON MAP
// ============================================================

function FitRestaurantBounds({
  restaurants,
  selectedRestaurant,
}) {
  const map =
    useMap();


  useEffect(
    () => {

      /*
       * Do not override selected
       * restaurant flyTo behaviour.
       */
      if (
        selectedRestaurant
      ) {
        return;
      }


      const points =
        restaurants
          .filter(
            place =>
              validCoordinate(
                place.latitude
              ) &&
              validCoordinate(
                place.longitude
              )
          )
          .map(
            place => [
              Number(
                place.latitude
              ),

              Number(
                place.longitude
              ),
            ]
          );


      if (
        points.length === 0
      ) {
        return;
      }


      if (
        points.length === 1
      ) {

        map.setView(
          points[0],
          15
        );

        return;
      }


      const bounds =
        L.latLngBounds(
          points
        );


      map.fitBounds(
        bounds,
        {
          padding: [
            40,
            40,
          ],

          maxZoom: 15,
        }
      );

    },
    [
      restaurants,
      selectedRestaurant,
      map,
    ]
  );


  return null;
}


// ============================================================
// COMPONENT
// ============================================================

export default function DineOutRestaurantMap({
  restaurants = [],

  centerLatitude,
  centerLongitude,

  selectedRestaurant =
    null,

  onSelectRestaurant,
}) {

  // =========================================================
  // VALID RESTAURANTS
  //
  // Important:
  // 1. Must have coordinates.
  // 2. Must actually be a restaurant / cafe.
  // =========================================================

  const validRestaurants =
    useMemo(
      () => {

        if (
          !Array.isArray(
            restaurants
          )
        ) {
          return [];
        }


        return restaurants.filter(
          restaurant =>
            validCoordinate(
              restaurant
                ?.latitude
            ) &&
            validCoordinate(
              restaurant
                ?.longitude
            ) &&
            isRestaurantOrCafe(
              restaurant
            )
        );

      },
      [
        restaurants,
      ]
    );


  // =========================================================
  // INITIAL CENTER
  // Bengaluru fallback only if user has not picked a location.
  // =========================================================

  const initialLatitude =
    validCoordinate(
      centerLatitude
    )
      ? Number(
          centerLatitude
        )
      : 12.9716;


  const initialLongitude =
    validCoordinate(
      centerLongitude
    )
      ? Number(
          centerLongitude
        )
      : 77.5946;


  // =========================================================
  // UI
  // =========================================================

  return (

    <div className="fk-dineout-leaflet-wrap">

      <style>
        {`
          .fk-dine-map-marker-shell {
            background: transparent !important;
            border: 0 !important;
          }

          .fk-dine-map-pin {
            width: 38px;
            height: 38px;
            border-radius: 50% 50% 50% 8px;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            background: #7a3f1d;
            border: 3px solid #fff4e7;
            box-shadow:
              0 5px 13px rgba(0, 0, 0, 0.34);
            color: #ffffff;
            font-weight: 900;
            font-size: 12px;
            transition:
              transform 0.18s ease,
              box-shadow 0.18s ease;
          }

          .fk-dine-map-pin > span {
            transform: rotate(45deg);
            display: block;
          }

          .fk-dine-map-pin:hover {
            transform:
              rotate(-45deg)
              scale(1.08);
          }

          .fk-dine-map-pin.selected {
            width: 48px;
            height: 48px;
            background: #ff9f43;
            border: 4px solid #fff7ec;
            color: #241006;
            font-size: 21px;
            box-shadow:
              0 0 0 6px rgba(255,159,67,0.26),
              0 7px 18px rgba(0,0,0,0.42);
            z-index: 9999;
          }

          .fk-map-popup-button.selected {
            font-weight: 800;
          }
        `}
      </style>


      <MapContainer

        center={[
          initialLatitude,
          initialLongitude,
        ]}

        zoom={14}

        scrollWheelZoom={
          true
        }

        style={{
          width:
            "100%",

          height:
            "520px",

          minHeight:
            "520px",
        }}

      >

        {/* =================================================
            OPENSTREETMAP TILES
        ================================================== */}

        <TileLayer
          attribution={
            "&copy; OpenStreetMap contributors"
          }
          url={
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />


        {/* =================================================
            MAP CENTER / SELECTED RESTAURANT FOCUS
        ================================================== */}

        <MapController

          centerLatitude={
            centerLatitude
          }

          centerLongitude={
            centerLongitude
          }

          selectedRestaurant={
            selectedRestaurant
          }

        />


        {/* =================================================
            FIT ALL RESTAURANT / CAFE MARKERS
        ================================================== */}

        <FitRestaurantBounds

          restaurants={
            validRestaurants
          }

          selectedRestaurant={
            selectedRestaurant
          }

        />


        {/* =================================================
            RESTAURANT / CAFE MARKERS
        ================================================== */}

        {validRestaurants.map(
          (
            restaurant,
            index
          ) => {

            const restaurantId =
              restaurant.id ||
              restaurant.source_id ||
              `${restaurant.name}-${index}`;


            /*
             * Support id and source_id
             * so selected markers still work
             * with external places APIs.
             */
            const selectedId =
              selectedRestaurant
                ?.id ||
              selectedRestaurant
                ?.source_id ||
              null;


            const currentId =
              restaurant.id ||
              restaurant.source_id ||
              null;


            const isSelected =
              selectedId !==
                null &&
              currentId !==
                null
                ? String(
                    selectedId
                  ) ===
                  String(
                    currentId
                  )
                : (
                    selectedRestaurant
                      ?.name &&
                    selectedRestaurant
                      ?.name ===
                      restaurant.name
                  );


            const type =
              getRestaurantType(
                restaurant
              );


            const distance =
              restaurant
                ?.distance_from_search_km ??
              restaurant
                ?.distance_from_route_km;


            return (

              <Marker

                key={
                  restaurantId
                }

                position={[
                  Number(
                    restaurant
                      .latitude
                  ),

                  Number(
                    restaurant
                      .longitude
                  ),
                ]}

                icon={
                  createRestaurantIcon(
                    isSelected,
                    index
                  )
                }

                zIndexOffset={
                  isSelected
                    ? 1000
                    : 0
                }

                eventHandlers={{
                  click: () => {

                    onSelectRestaurant?.(
                      restaurant
                    );

                  },
                }}

              >

                <Popup>

                  <div className="fk-map-popup">

                    {/* RECOMMENDATION */}

                    {restaurant
                      ?.matches_preference && (

                      <span className="fk-map-popup-pick">
                        ✨ Recommended
                        for you
                      </span>

                    )}


                    {/* NAME */}

                    <h3>
                      {
                        restaurant.name
                      }
                    </h3>


                    {/* TYPE / CUISINE */}

                    <div className="fk-map-popup-tags">

                      <span>
                        {type}
                      </span>


                      {restaurant
                        ?.cuisine && (

                        <span>
                          {
                            restaurant
                              .cuisine
                          }
                        </span>

                      )}

                    </div>


                    {/* DISTANCE */}

                    {Number.isFinite(
                      Number(
                        distance
                      )
                    ) && (

                      <div className="fk-map-popup-line">

                        📍{" "}

                        {Number(
                          distance
                        ).toFixed(
                          1
                        )}{" "}

                        km away

                      </div>

                    )}


                    {/* LOCALITY */}

                    {restaurant
                      ?.locality && (

                      <div className="fk-map-popup-line">

                        {
                          restaurant
                            .locality
                        }

                      </div>

                    )}


                    {/* ADDRESS */}

                    {restaurant
                      ?.address && (

                      <div className="fk-map-popup-line">

                        {
                          restaurant
                            .address
                        }

                      </div>

                    )}


                    {/* REASON */}

                    {restaurant
                      ?.recommendation_reason && (

                      <div className="fk-map-popup-reason">

                        {
                          restaurant
                            .recommendation_reason
                        }

                      </div>

                    )}


                    {/* OPENING HOURS */}

                    {restaurant
                      ?.opening_hours && (

                      <div className="fk-map-popup-hours">

                        🕒{" "}

                        {
                          restaurant
                            .opening_hours
                        }

                      </div>

                    )}


                    {/* SELECT BUTTON */}

                    <button

                      type="button"

                      className={
                        isSelected
                          ? "fk-map-popup-button selected"
                          : "fk-map-popup-button"
                      }

                      onClick={() =>
                        onSelectRestaurant?.(
                          restaurant
                        )
                      }

                    >

                      {
                        isSelected
                          ? "✓ Selected"
                          : "Choose this place"
                      }

                    </button>

                  </div>

                </Popup>

              </Marker>

            );

          }
        )}

      </MapContainer>


      {/* ===================================================
          NO RESTAURANTS / CAFES
      ==================================================== */}

      {validRestaurants.length ===
        0 && (

        <div className="fk-map-no-results">

          <strong>
            No restaurants or cafés
            shown yet
          </strong>

          <span>
            Select a location
            to discover restaurants
            and cafés nearby.
          </span>

        </div>

      )}

    </div>

  );
}
