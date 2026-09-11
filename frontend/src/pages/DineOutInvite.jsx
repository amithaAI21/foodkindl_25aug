import React, {
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronRight,
  Building2,
  Clock3,
  Coffee,
  Croissant,
  ExternalLink,
  ImageOff,
  LayoutGrid,
  Loader2,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Star,
  Utensils,
} from "lucide-react";

import "../styles/dineout_unique.css";

const CUISINE_OPTIONS = [
  { value: "", label: "Any cuisine", icon: "🍽️" },
  { value: "kerala", label: "Kerala", icon: "🥥" },
  { value: "south_indian", label: "South Indian", icon: "🥘" },
  { value: "north_indian", label: "North Indian", icon: "🍛" },
  { value: "biryani", label: "Biryani", icon: "🍚" },
  { value: "chinese", label: "Chinese", icon: "🥡" },
  { value: "italian", label: "Italian", icon: "🍝" },
  { value: "arabian", label: "Arabian", icon: "🥙" },
];


const CUISINE_ALIASES = {
  kerala: [
    "kerala",
    "keralite",
    "malayali",
    "malabar",
    "nadan",
    "appam",
    "puttu",
    "porotta",
    "parotta",
    "sadya",
    "sadhya",
    "meen",
  ],
  south_indian: [
    "south indian",
    "dosa",
    "idli",
    "vada",
    "uttapam",
  ],
  north_indian: [
    "north indian",
    "punjabi",
    "tandoor",
    "mughlai",
  ],
  biryani: [
    "biryani",
    "biriyani",
  ],
  chinese: [
    "chinese",
    "indo chinese",
    "schezwan",
    "szechuan",
  ],
  italian: [
    "italian",
    "pizza",
    "pasta",
  ],
  arabian: [
    "arabian",
    "arabic",
    "shawarma",
    "mandi",
    "kebab",
  ],
};


function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function matchesCuisine(place, cuisine) {
  const selected = normalizeSearchText(cuisine);

  if (!selected) {
    return true;
  }

  const aliases =
    CUISINE_ALIASES[selected] ||
    [selected];

  const tags = place?.osm_tags || {};

  const searchable = normalizeSearchText([
    place?.name,
    place?.cuisine,
    place?.category,
    place?.restaurant_type,
    tags?.cuisine,
    tags?.description,
    tags?.brand,
  ].filter(Boolean).join(" "));

  return aliases.some(
    alias =>
      searchable.includes(
        normalizeSearchText(alias)
      )
  );
}



// ============================================================
// SMART FOOD / RESTAURANT INTENT
// ============================================================

// ============================================================
// CUISINE RANKING — DO NOT HARD-FILTER UNKNOWN OSM PLACES
// ============================================================

function getCuisineMatchScore(place, cuisine) {
  const selected = normalizeSearchText(cuisine);

  if (!selected) {
    return 0;
  }

  const aliases =
    CUISINE_ALIASES[selected] ||
    [selected];

  const tags =
    place?.osm_tags ||
    {};

  const name =
    normalizeSearchText(
      place?.name
    );

  const cuisineText =
    normalizeSearchText(
      [
        place?.cuisine,
        tags?.cuisine,
        tags?.description,
        tags?.name,
      ]
        .filter(Boolean)
        .join(" ")
    );

  let score = 0;

  aliases.forEach(alias => {
    const keyword =
      normalizeSearchText(alias);

    if (!keyword) {
      return;
    }

    if (cuisineText.includes(keyword)) {
      score += 100;
    }

    if (name.includes(keyword)) {
      score += 70;
    }
  });

  return score;
}


function interpretFoodIntent(query) {
  const value = normalizeSearchText(query);

  const intent = {
    cuisine: "",
    type: "",
  };

  if (!value) return intent;

  for (const [cuisine, aliases] of Object.entries(CUISINE_ALIASES)) {
    if (aliases.some(alias => value.includes(normalizeSearchText(alias)))) {
      intent.cuisine = cuisine;
      break;
    }
  }

  const dishHints = {
    kerala: ["beef fry", "fish curry", "karimeen", "kappa", "idiyappam", "stew"],
    south_indian: ["masala dosa", "filter coffee", "pongal"],
    north_indian: ["butter chicken", "dal makhani", "naan", "chole"],
    biryani: ["hyderabadi biryani", "donne biryani", "dum biryani"],
    chinese: ["fried rice", "hakka noodles", "momos"],
    italian: ["spaghetti", "lasagna"],
    arabian: ["alfaham", "al faham", "kabsa"],
  };

  if (!intent.cuisine) {
    for (const [cuisine, words] of Object.entries(dishHints)) {
      if (words.some(word => value.includes(word))) {
        intent.cuisine = cuisine;
        break;
      }
    }
  }

  if (value.includes("cafe") || value.includes("café") || value.includes("coffee shop")) {
    intent.type = "cafe";
  } else if (value.includes("bakery") || value.includes("bakes")) {
    intent.type = "bakery";
  } else if (value.includes("hotel")) {
    intent.type = "hotel";
  } else if (value.includes("restaurant") || value.includes("eatery")) {
    intent.type = "restaurant";
  }

  return intent;
}


export default function DineOutInvite({
  form,
  updateField,

  restaurants = [],
  restaurantsLoading = false,
  restaurantsError = "",

  userPreferences = {},

  onSearchRestaurants,
  onSelectRestaurant,

  selectedRestaurant = null,

  restaurantSearchDone = false,
}) {

  // =========================================================
  // FILTERS
  // =========================================================

  const [
    category,
    setCategory,
  ] = useState("all");


  const [
    openOnly,
    setOpenOnly,
  ] = useState(false);


  const [
    smartMessage,
    setSmartMessage,
  ] = useState(
    "Choose a cuisine or tell FoodKindl what you are craving."
  );


  // =========================================================
  // DETAILS PANEL
  // =========================================================

  const [
    detailRestaurant,
    setDetailRestaurant,
  ] = useState(null);


  // =========================================================
  // VALUES
  // =========================================================

  const location =
    String(
      form?.city ||
      ""
    ).trim();


  const locationReady =
    Number.isFinite(
      Number(
        form?.search_latitude
      )
    ) &&
    Number.isFinite(
      Number(
        form?.search_longitude
      )
    );


  // =========================================================
  // NORMALIZE
  // =========================================================

  const normalized =
    useMemo(
      () => {

        return (
          Array.isArray(
            restaurants
          )
            ? restaurants
            : []
        ).map(
          (
            place,
            index
          ) => {

            const tags =
              place?.osm_tags ||
              {};


            const id =
              place.id ||
              place.source_id ||
              `${place.name}-${index}`;


            const distance =
              Number(
                place
                  .distance_from_search_km ??
                place
                  .distance_from_route_km ??
                0
              );


            const photos =
              Array.isArray(
                place.photos
              )
                ? place.photos.filter(
                    Boolean
                  )
                : [];

            const image =
              place.photo_url ||
              place.image ||
              place.photo ||
              place.image_url ||
              photos[0] ||
              tags.image ||
              null;


            return {
              ...place,

              id,

              name:
                place.name ||
                "Unnamed place",

              category:
                place.restaurant_type ||
                place.category ||
                place.type ||
                "restaurant",

              fsqPlaceId:
                place.fsq_place_id ||
                place.source_id ||
                "",

              primaryType:
                place.primary_type ||
                "",

              primaryTypeLabel:
                place.primary_type_label ||
                place.primary_type ||
                "",

              types:
                Array.isArray(
                  place.types
                )
                  ? place.types
                  : [],

              mainCuisine:
                place.main_cuisine ||
                "",

              cuisine:
                place.main_cuisine ||
                place.cuisine ||
                "",

              cuisines:
                Array.isArray(
                  place.cuisines
                )
                  ? place.cuisines
                  : [],

              address:
                place.address ||
                place.locality ||
                place.city ||
                "",

              latitude:
                Number(
                  place.latitude
                ),

              longitude:
                Number(
                  place.longitude
                ),

              rating:
                Number(
                  place.rating ||
                  0
                ),

              reviewCount:
                Number(
                  place.review_count ||
                  0
                ),

              distanceKm:
                Number.isFinite(
                  distance
                )
                  ? distance
                  : 0,

              openingHours:
                place.opening_hours ||
                tags.opening_hours ||
                "",

              phone:
                place.phone ||
                tags.phone ||
                tags[
                  "contact:phone"
                ] ||
                "",

              website:
                place.website ||
                tags.website ||
                tags[
                  "contact:website"
                ] ||
                "",

              googleMapsUri:
                place.google_maps_uri ||
                "",

              photos,

              image,

              matchesPreference:
                Boolean(
                  place.matches_preference
                ),

              recommendationReason:
                place
                  .recommendation_reason ||
                "",
            };

          }
        );

      },
      [
        restaurants,
      ]
    );


  // =========================================================
  // FILTER RESULTS
  // =========================================================

  const visibleRestaurants =
    useMemo(
      () => {

        let results =
          [
            ...normalized,
          ];


        if (
          category !==
          "all"
        ) {

          results =
            results.filter(
              place => {

                const type =
                  String(
                    place.category ||
                    ""
                  )
                    .toLowerCase()
                    .replace(
                      "_",
                      " "
                    );


                if (
                  category ===
                  "restaurant"
                ) {

                  return (
                    type.includes(
                      "restaurant"
                    ) ||
                    type.includes(
                      "fast food"
                    ) ||
                    type.includes(
                      "food court"
                    )
                  );

                }


                if (
                  category ===
                  "cafe"
                ) {

                  return (
                    type.includes(
                      "cafe"
                    ) ||
                    type.includes(
                      "coffee"
                    )
                  );

                }


                if (
                  category ===
                  "hotel"
                ) {

                  return (
                    type.includes(
                      "hotel"
                    ) ||
                    type.includes(
                      "food hotel"
                    )
                  );

                }


                if (
                  category ===
                  "bakery"
                ) {

                  return type.includes(
                    "bakery"
                  );

                }


                return true;

              }
            );

        }
if (
          openOnly
        ) {

          results =
            results.filter(
              place => {

                /*
                 * OSM opening_hours is not
                 * true realtime open status.
                 *
                 * For now only keep places
                 * with opening-hour info.
                 */

                return Boolean(
                  place.openingHours
                );

              }
            );

        }


        results.sort(
          (
            a,
            b
          ) => {

            const aScore =
              Number(
                a.match_score ||
                0
              );

            const bScore =
              Number(
                b.match_score ||
                0
              );


            if (
              bScore !==
              aScore
            ) {

              return (
                bScore -
                aScore
              );

            }


            return (
              a.distanceKm -
              b.distanceKm
            );

          }
        );


        return results;

      },
      [
        normalized,
        category,
        openOnly,
        form?.cuisine,
      ]
    );


  // =========================================================
  // SEARCH
  // =========================================================

  function search(searchMode = "smart") {

    if (!locationReady) {
      setSmartMessage(
        "Select an area first."
      );
      return;
    }

    const foodQuery =
      String(
        form?.food_query ||
        ""
      ).trim();

    const selectedCuisine =
      String(
        form?.cuisine ||
        ""
      ).trim();

    const intent =
      interpretFoodIntent(
        foodQuery
      );

    const finalCuisine =
      selectedCuisine ||
      intent.cuisine ||
      "";

    // Search Restaurants explicitly restricts to restaurants.
    // AI Recommend only restricts type when the user selected one
    // or the text clearly expresses a type such as "cafe".
    const finalType =
      searchMode === "restaurants"
        ? "restaurant"
        : (
            category !== "all"
              ? category
              : (
                  intent.type ||
                  ""
                )
          );

    if (
      !foodQuery &&
      !finalCuisine &&
      !finalType
    ) {
      setSmartMessage(
        "Choose a cuisine, place type, or enter a restaurant, dish or craving."
      );
      return;
    }

    const cuisineLabel =
      CUISINE_OPTIONS.find(
        item =>
          item.value ===
          finalCuisine
      )?.label;

    if (
      searchMode === "restaurants"
    ) {
      setCategory(
        "restaurant"
      );
    } else if (
      category === "all" &&
      intent.type
    ) {
      setCategory(
        intent.type
      );
    }

    if (
      !selectedCuisine &&
      intent.cuisine
    ) {
      updateField(
        "cuisine",
        intent.cuisine
      );
    }

    setSmartMessage(
      cuisineLabel
        ? `Finding the strongest ${cuisineLabel} matches around ${location}. FoodKindl ranks matching places using cuisine, place type, available ratings and distance.`
        : foodQuery
          ? `Matching “${foodQuery}” with nearby restaurant names, dishes, cuisines and place types.`
          : `Finding ${finalType || "food places"} around ${location}.`
    );

    onSearchRestaurants?.({
      food_query:
        foodQuery,

      cuisine:
        finalCuisine,

      dine_venue_type:
        finalType,
    });

  }

  function handleEnter(
    event
  ) {

    if (
      event.key !==
      "Enter"
    ) {
      return;
    }


    event.preventDefault();

    search("smart");

  }


  // =========================================================
  // SELECT RESTAURANT
  // =========================================================

  function choosePlace(
    place
  ) {

    updateField(
      "venue_name",
      place.name
    );


    updateField(
      "restaurant_name",
      place.name
    );


    updateField(
      "restaurant_address",
      place.address
    );


    updateField(
      "location_label",
      place.locality ||
      place.city ||
      place.address
    );


    updateField(
      "latitude",
      place.latitude
    );


    updateField(
      "longitude",
      place.longitude
    );


    if (
      place.cuisine
    ) {

      updateField(
        "cuisine",
        place.cuisine
      );

    }


    setDetailRestaurant(
      place
    );


    onSelectRestaurant?.(
      place
    );

  }


  // =========================================================
  // VIEW DETAILS
  // =========================================================

  function viewDetails(
    place
  ) {

    setDetailRestaurant(
      place
    );

  }


  // =========================================================
  // DEFAULT DETAILS
  // =========================================================

  const activeDetails =
    detailRestaurant ||
    selectedRestaurant ||
    visibleRestaurants[0] ||
    null;


  // =========================================================
  // UI
  // =========================================================

  return (
    <>

      {/* =====================================================
          DARK BROWN DISCOVERY BOX
      ====================================================== */}

      <section className="fk-dine-discovery-shell">

        <div className="fk-dine-discovery-heading">

          <div>

            <span>
              FOODKINDL DINE OUT
            </span>

            <h2>
              What are you in the
              mood for?
            </h2>

            <p>
              Discover restaurants,
              cafés and food places
              around{" "}
              <strong>
                {
                  location ||
                  "your selected area"
                }
              </strong>
              , matched to your
              preferences.
            </p>

          </div>


          <Sparkles
            size={25}
          />

        </div>


        {/* SEARCH */}

        <div className="fk-dine-food-search">

          <Search size={18} />

          <input
            type="text"
            value={form.food_query || ""}
            placeholder="Restaurant, dish or craving — e.g. Empire, Kerala food, biryani..."
            onChange={
              event =>
                updateField(
                  "food_query",
                  event.target.value
                )
            }
            onKeyDown={handleEnter}
          />

          <button
            type="button"
            className="fk-ai-recommend-button"
            disabled={!locationReady || restaurantsLoading}
            onClick={() => search("smart")}
          >
            {restaurantsLoading ? (
              <>
                <Loader2 size={15} className="fk-spin" />
                Searching
              </>
            ) : (
              <>
                <Sparkles size={15} />
                AI Recommend
              </>
            )}
          </button>

        </div>

        <div className="fk-dine-search-actions">

          <button
            type="button"
            className="fk-search-restaurants-button"
            disabled={!locationReady || restaurantsLoading}
            onClick={() => search("restaurants")}
          >
            <Utensils size={15} />
            Search Restaurants
          </button>

          <span className="fk-ai-search-hint">
            <Sparkles size={13} />
            Search by restaurant name, cuisine, dish or craving.
          </span>

        </div>


        {/* SMART SEARCH MESSAGE */}

        <div className="fk-smart-search-note">
          <Sparkles size={14} />
          <span>{smartMessage}</span>
        </div>


        {/* CUISINE */}

        <div className="fk-smart-filter-section">

          <span className="fk-smart-filter-label">
            CUISINE
          </span>

          <div className="fk-cuisine-chip-row">

            {CUISINE_OPTIONS.map(
              option => (

                <button
                  key={
                    option.value ||
                    "any"
                  }
                  type="button"
                  className={
                    form.cuisine ===
                    option.value
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    updateField(
                      "cuisine",
                      option.value
                    );

                    setSmartMessage(
                      option.value
                        ? `Ready to find ${option.label} places around ${location || "your area"}.`
                        : "Choose a cuisine or tell FoodKindl what you are craving."
                    );
                  }}
                >

                  <span
                    aria-hidden="true"
                    className="fk-cuisine-emoji"
                  >
                    {option.icon}
                  </span>

                  {option.label}

                </button>

              )
            )}

          </div>

        </div>


        {/* PLACE TYPE */}

        <div className="fk-smart-filter-section">

          <span className="fk-smart-filter-label">
            PLACE TYPE
          </span>

          <div className="fk-dine-filter-row">

            <button
              type="button"
              className={
                category === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategory("all")
              }
            >
              <LayoutGrid size={14} />
              All
            </button>

            <button
              type="button"
              className={
                category === "restaurant"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategory("restaurant")
              }
            >
              <Utensils size={14} />
              Restaurants
            </button>

            <button
              type="button"
              className={
                category === "cafe"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategory("cafe")
              }
            >
              <Coffee size={14} />
              Cafés
            </button>

            <button
              type="button"
              className={
                category === "hotel"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategory("hotel")
              }
            >
              <Building2 size={14} />
              Hotels
            </button>

            <button
              type="button"
              className={
                category === "bakery"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategory("bakery")
              }
            >
              <Croissant size={14} />
              Bakeries
            </button>

            <button
              type="button"
              className={
                openOnly
                  ? "active"
                  : ""
              }
              onClick={() =>
                setOpenOnly(
                  current =>
                    !current
                )
              }
            >
              <Clock3 size={14} />
              Open hours
            </button>

          </div>

        </div>

      </section>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {restaurantsError && (

        <div className="fk-dineout-error">

          {
            restaurantsError
          }

        </div>

      )}


      {/* =====================================================
          LOADING
      ====================================================== */}

      {restaurantsLoading && (

        <div className="fk-dine-loading">

          <Loader2
            size={24}
            className="fk-spin"
          />


          <div>

            <strong>
              Finding places
              around{" "}
              {
                location
              }
            </strong>

            <span>
              FoodKindl is looking
              for nearby food
              places.
            </span>

          </div>

        </div>

      )}


      {/* =====================================================
          RESULTS
      ====================================================== */}

      {!restaurantsLoading &&
        visibleRestaurants.length >
        0 && (

        <section className="fk-dine-results">

          {/* TITLE */}

          <div className="fk-dine-results-heading">

            <div>

              <span>
                RECOMMENDED FOR YOU
              </span>

              <h3>
                Places around{" "}
                {
                  location
                }
              </h3>

            </div>


            <strong>
              {
                visibleRestaurants.length
              }{" "}
              places
            </strong>

          </div>


          {/* ===============================================
              LIST LEFT + DETAILS RIGHT
          ================================================ */}

          <div className="fk-dine-results-layout">

            {/* =============================================
                LEFT
            ============================================== */}

            <div className="fk-dine-restaurant-list">

              {visibleRestaurants.map(
                (
                  place,
                  index
                ) => {

                  const selected =
                    String(
                      selectedRestaurant
                        ?.id
                    ) ===
                    String(
                      place.id
                    );


                  const detailsActive =
                    String(
                      activeDetails
                        ?.id
                    ) ===
                    String(
                      place.id
                    );


                  return (

                    <article
                      key={
                        place.id
                      }

                      className={
                        detailsActive
                          ? "fk-dine-list-card active"
                          : "fk-dine-list-card"
                      }
                    >

                      {/* IMAGE */}

                      <div className="fk-dine-list-thumb">

                        {place.image ? (

                          <img
                            src={
                              place.image
                            }

                            alt={
                              place.name
                            }

                            loading="lazy"

                            onError={
                              event => {
                                event
                                  .currentTarget
                                  .style
                                  .display =
                                  "none";
                              }
                            }
                          />

                        ) : (

                          <div className="fk-dine-thumb-placeholder">

                            <Utensils
                              size={22}
                            />

                          </div>

                        )}


                        <span className="fk-dine-rank">
                          {
                            index + 1
                          }
                        </span>

                      </div>


                      {/* CONTENT */}

                      <div className="fk-dine-list-content">

                        {(place
                          .matchesPreference ||
                          index < 3) && (

                          <span className="fk-dine-pick">
                            ✨ FoodKindl Pick
                          </span>

                        )}


                        <h4>
                          {
                            place.name
                          }
                        </h4>


                        <p className="fk-dine-cuisine">

                          {
                            place.mainCuisine ||
                            place.cuisine ||
                            place.primaryTypeLabel ||
                            formatRestaurantType(
                              place.category
                            )
                          }

                        </p>


                        <div className="fk-dine-meta">

                          {place.distanceKm >
                            0 && (

                            <span>
                              <MapPin
                                size={12}
                              />

                              {
                                place
                                  .distanceKm
                                  .toFixed(
                                    1
                                  )
                              }{" "}
                              km
                            </span>

                          )}


                          {place.rating >
                            0 && (

                            <span>

                              <Star
                                size={12}
                                fill="currentColor"
                              />

                              {
                                place.rating
                              }

                              {place.reviewCount > 0 && (
                                <>
                                  {" "}
                                  ({place.reviewCount.toLocaleString()})
                                </>
                              )}

                            </span>

                          )}

                        </div>


                        <div className="fk-dine-card-actions">

                          <button
                            type="button"
                            className="fk-view-details"
                            onClick={() =>
                              viewDetails(
                                place
                              )
                            }
                          >

                            View details

                            <ChevronRight
                              size={14}
                            />

                          </button>


                          <button
                            type="button"
                            className={
                              selected
                                ? "fk-quick-select selected"
                                : "fk-quick-select"
                            }
                            onClick={() =>
                              choosePlace(
                                place
                              )
                            }
                          >

                            {selected ? (
                              <>
                                <Check
                                  size={14}
                                />

                                Selected
                              </>
                            ) : (
                              "Choose"
                            )}

                          </button>

                        </div>

                      </div>

                    </article>

                  );

                }
              )}

            </div>


            {/* =============================================
                RIGHT DETAILS
            ============================================== */}

            <aside className="fk-dine-details-panel">

              {activeDetails ? (

                <RestaurantDetails
                  place={
                    activeDetails
                  }

                  selected={
                    String(
                      selectedRestaurant
                        ?.id
                    ) ===
                    String(
                      activeDetails.id
                    )
                  }

                  onChoose={
                    choosePlace
                  }
                />

              ) : (

                <div className="fk-dine-details-empty">

                  <Utensils
                    size={30}
                  />

                  <strong>
                    Select a restaurant
                  </strong>

                  <span>
                    View restaurant
                    information here.
                  </span>

                </div>

              )}

            </aside>

          </div>

        </section>

      )}


      {/* =====================================================
          EMPTY
      ====================================================== */}

      {!restaurantsLoading &&
        restaurantSearchDone &&
        visibleRestaurants.length ===
        0 &&
        !restaurantsError && (

        <div className="fk-dine-empty">

          <Search
            size={27}
          />

          <h3>
            No places found
          </h3>

          <p>
            Try another food,
            category or nearby
            location.
          </p>

        </div>

      )}

    </>
  );
}


// ============================================================
// RESTAURANT DETAILS
// ============================================================

function RestaurantDetails({
  place,
  selected,
  onChoose,
}) {

  const photos =
    Array.isArray(
      place?.photos
    )
      ? place.photos.filter(
          Boolean
        )
      : [];

  const heroImage =
    place?.image ||
    photos[0] ||
    null;

  const secondaryPhotos =
    photos
      .filter(
        url =>
          url !== heroImage
      )
      .slice(
        0,
        3
      );

  const displayType =
    place?.primaryTypeLabel ||
    place?.primaryType ||
    formatRestaurantType(
      place?.category
    );

  const displayCuisine =
    place?.mainCuisine ||
    place?.cuisine ||
    "";

  return (

    <div className="fk-detail-inner">

      {/* IMAGE */}

      <div className="fk-detail-image">

        {heroImage ? (

          <img
            src={heroImage}
            alt={place.name}
            loading="lazy"
            onError={
              event => {
                event.currentTarget.style.display =
                  "none";
              }
            }
          />

        ) : (

          <div className="fk-detail-image-placeholder">

            <ImageOff
              size={30}
            />

            <span>
              Restaurant photo
              unavailable
            </span>

          </div>

        )}


        {place.matchesPreference && (

          <span className="fk-detail-pick">
            ✨ Recommended
          </span>

        )}

      </div>


      {/* PHOTO STRIP */}

      {secondaryPhotos.length > 0 && (

        <div className="fk-detail-photo-strip">

          {secondaryPhotos.map(
            (
              photoUrl,
              index
            ) => (

              <img
                key={
                  `${place.id}-photo-${index}`
                }
                src={photoUrl}
                alt={
                  `${place.name} ${index + 2}`
                }
                loading="lazy"
                onError={
                  event => {
                    event.currentTarget.style.display =
                      "none";
                  }
                }
              />

            )
          )}

        </div>

      )}


      {/* DETAILS */}

      <div className="fk-detail-content">

        <span className="fk-detail-type">
          {displayType}
        </span>


        <h3>
          {place.name}
        </h3>


        {displayCuisine && (

          <p className="fk-detail-cuisine">
            {displayCuisine}
          </p>

        )}


        {/* RATING / REVIEWS / DISTANCE */}

        <div className="fk-detail-stats">

          {place.rating > 0 && (

            <div>

              <Star
                size={15}
                fill="currentColor"
              />

              <span>
                {place.rating}

                {place.reviewCount > 0 && (
                  <>
                    {" "}
                    ({place.reviewCount.toLocaleString()} reviews)
                  </>
                )}
              </span>

            </div>

          )}


          {place.distanceKm > 0 && (

            <div>

              <MapPin
                size={15}
              />

              <span>
                {
                  place.distanceKm
                    .toFixed(
                      1
                    )
                }{" "}
                km away
              </span>

            </div>

          )}

        </div>


        {/* PRIMARY TYPE / TYPES */}

        {(place.primaryTypeLabel ||
          place.types?.length > 0) && (

          <div className="fk-detail-row">

            <Utensils
              size={16}
            />

            <div>

              <span>
                PLACE TYPE
              </span>

              <p>
                {
                  place.primaryTypeLabel ||
                  formatRestaurantType(
                    place.category
                  )
                }
              </p>

              {place.types?.length > 0 && (

                <div className="fk-detail-type-chips">

                  {place.types
                    .slice(
                      0,
                      5
                    )
                    .map(
                      type => (

                        <span
                          key={type}
                        >
                          {type}
                        </span>

                      )
                    )}

                </div>

              )}

            </div>

          </div>

        )}


        {displayCuisine && (

          <div className="fk-detail-row">

            <Utensils
              size={16}
            />

            <div>

              <span>
                MAIN CUISINE
              </span>

              <p>
                {displayCuisine}
              </p>

            </div>

          </div>

        )}


        {place.address && (

          <div className="fk-detail-row">

            <MapPin
              size={16}
            />

            <div>

              <span>
                FULL ADDRESS
              </span>

              <p>
                {place.address}
              </p>

            </div>

          </div>

        )}


        {place.openingHours && (

          <div className="fk-detail-row">

            <Clock3
              size={16}
            />

            <div>

              <span>
                OPENING HOURS
              </span>

              <p className="fk-detail-hours">
                {place.openingHours}
              </p>

            </div>

          </div>

        )}


        {place.phone && (

          <div className="fk-detail-row">

            <Phone
              size={16}
            />

            <div>

              <span>
                PHONE
              </span>

              <p>
                <a
                  href={
                    `tel:${place.phone}`
                  }
                >
                  {place.phone}
                </a>
              </p>

            </div>

          </div>

        )}


        {place.recommendationReason && (

          <div className="fk-detail-reason">

            <Sparkles
              size={16}
            />

            <div>

              <strong>
                Why FoodKindl
                recommends it
              </strong>

              <p>
                {
                  place
                    .recommendationReason
                }
              </p>

            </div>

          </div>

        )}


        <div className="fk-detail-actions">

          {place.website && (

            <a
              href={place.website}
              target="_blank"
              rel="noreferrer"
            >

              Website

              <ExternalLink
                size={14}
              />

            </a>

          )}


          {place.googleMapsUri && (

            <a
              href={
                place.googleMapsUri
              }
              target="_blank"
              rel="noreferrer"
            >

              Map

              <MapPin
                size={14}
              />

            </a>

          )}


          <button
            type="button"
            className={
              selected
                ? "selected"
                : ""
            }
            onClick={() =>
              onChoose(
                place
              )
            }
          >

            {selected ? (
              <>
                <Check
                  size={16}
                />

                Selected
              </>
            ) : (
              "Choose this place"
            )}

          </button>

        </div>

      </div>

    </div>

  );
}


// ============================================================
// TYPE LABEL
// ============================================================

function formatRestaurantType(
  value
) {

  const type =
    String(
      value ||
      "restaurant"
    )
      .replace(
        /_/g,
        " "
      );


  return (
    type
      .charAt(0)
      .toUpperCase()
    +
    type.slice(1)
  );

}