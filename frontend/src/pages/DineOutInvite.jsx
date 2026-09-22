// import React, {
//   useMemo,
//   useState,
// } from "react";

// import {
//   Check,
//   ChevronRight,
//   Building2,
//   Clock3,
//   Coffee,
//   Croissant,
//   ExternalLink,
//   ImageOff,
//   LayoutGrid,
//   Loader2,
//   MapPin,
//   Phone,
//   Search,
//   Sparkles,
//   Star,
//   Utensils,
// } from "lucide-react";

// import "../styles/dineout_unique.css";

// const CUISINE_OPTIONS = [
//   { value: "", label: "Any cuisine", icon: "🍽️" },
//   { value: "kerala", label: "Kerala", icon: "🥥" },
//   { value: "south_indian", label: "South Indian", icon: "🥘" },
//   { value: "north_indian", label: "North Indian", icon: "🍛" },
//   { value: "biryani", label: "Biryani", icon: "🍚" },
//   { value: "chinese", label: "Chinese", icon: "🥡" },
//   { value: "italian", label: "Italian", icon: "🍝" },
//   { value: "arabian", label: "Arabian", icon: "🥙" },
// ];


// const CUISINE_ALIASES = {
//   kerala: [
//     "kerala",
//     "keralite",
//     "malayali",
//     "malabar",
//     "nadan",
//     "appam",
//     "puttu",
//     "porotta",
//     "parotta",
//     "sadya",
//     "sadhya",
//     "meen",
//   ],
//   south_indian: [
//     "south indian",
//     "dosa",
//     "idli",
//     "vada",
//     "uttapam",
//   ],
//   north_indian: [
//     "north indian",
//     "punjabi",
//     "tandoor",
//     "mughlai",
//   ],
//   biryani: [
//     "biryani",
//     "biriyani",
//   ],
//   chinese: [
//     "chinese",
//     "indo chinese",
//     "schezwan",
//     "szechuan",
//   ],
//   italian: [
//     "italian",
//     "pizza",
//     "pasta",
//   ],
//   arabian: [
//     "arabian",
//     "arabic",
//     "shawarma",
//     "mandi",
//     "kebab",
//   ],
// };


// function normalizeSearchText(value) {
//   return String(value || "")
//     .toLowerCase()
//     .replace(/[_-]+/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();
// }


// function matchesCuisine(place, cuisine) {
//   const selected = normalizeSearchText(cuisine);

//   if (!selected) {
//     return true;
//   }

//   const aliases =
//     CUISINE_ALIASES[selected] ||
//     [selected];

//   const tags = place?.osm_tags || {};

//   const searchable = normalizeSearchText([
//     place?.name,
//     place?.cuisine,
//     place?.category,
//     place?.restaurant_type,
//     tags?.cuisine,
//     tags?.description,
//     tags?.brand,
//   ].filter(Boolean).join(" "));

//   return aliases.some(
//     alias =>
//       searchable.includes(
//         normalizeSearchText(alias)
//       )
//   );
// }



// // ============================================================
// // SMART FOOD / RESTAURANT INTENT
// // ============================================================

// // ============================================================
// // CUISINE RANKING — DO NOT HARD-FILTER UNKNOWN OSM PLACES
// // ============================================================

// function getCuisineMatchScore(place, cuisine) {
//   const selected = normalizeSearchText(cuisine);

//   if (!selected) {
//     return 0;
//   }

//   const aliases =
//     CUISINE_ALIASES[selected] ||
//     [selected];

//   const tags =
//     place?.osm_tags ||
//     {};

//   const name =
//     normalizeSearchText(
//       place?.name
//     );

//   const cuisineText =
//     normalizeSearchText(
//       [
//         place?.cuisine,
//         tags?.cuisine,
//         tags?.description,
//         tags?.name,
//       ]
//         .filter(Boolean)
//         .join(" ")
//     );

//   let score = 0;

//   aliases.forEach(alias => {
//     const keyword =
//       normalizeSearchText(alias);

//     if (!keyword) {
//       return;
//     }

//     if (cuisineText.includes(keyword)) {
//       score += 100;
//     }

//     if (name.includes(keyword)) {
//       score += 70;
//     }
//   });

//   return score;
// }


// function interpretFoodIntent(query) {
//   const value = normalizeSearchText(query);

//   const intent = {
//     cuisine: "",
//     type: "",
//   };

//   if (!value) return intent;

//   for (const [cuisine, aliases] of Object.entries(CUISINE_ALIASES)) {
//     if (aliases.some(alias => value.includes(normalizeSearchText(alias)))) {
//       intent.cuisine = cuisine;
//       break;
//     }
//   }

//   const dishHints = {
//     kerala: ["beef fry", "fish curry", "karimeen", "kappa", "idiyappam", "stew"],
//     south_indian: ["masala dosa", "filter coffee", "pongal"],
//     north_indian: ["butter chicken", "dal makhani", "naan", "chole"],
//     biryani: ["hyderabadi biryani", "donne biryani", "dum biryani"],
//     chinese: ["fried rice", "hakka noodles", "momos"],
//     italian: ["spaghetti", "lasagna"],
//     arabian: ["alfaham", "al faham", "kabsa"],
//   };

//   if (!intent.cuisine) {
//     for (const [cuisine, words] of Object.entries(dishHints)) {
//       if (words.some(word => value.includes(word))) {
//         intent.cuisine = cuisine;
//         break;
//       }
//     }
//   }

//   if (value.includes("cafe") || value.includes("café") || value.includes("coffee shop")) {
//     intent.type = "cafe";
//   } else if (value.includes("bakery") || value.includes("bakes")) {
//     intent.type = "bakery";
//   } else if (value.includes("hotel")) {
//     intent.type = "hotel";
//   } else if (value.includes("restaurant") || value.includes("eatery")) {
//     intent.type = "restaurant";
//   }

//   return intent;
// }


// export default function DineOutInvite({
//   form,
//   updateField,

//   restaurants = [],
//   restaurantsLoading = false,
//   restaurantsError = "",

//   userPreferences = {},

//   onSearchRestaurants,
//   onSelectRestaurant,

//   selectedRestaurant = null,

//   restaurantSearchDone = false,
// }) {

//   // =========================================================
//   // FILTERS
//   // =========================================================

//   const [
//     category,
//     setCategory,
//   ] = useState("all");


//   const [
//     openOnly,
//     setOpenOnly,
//   ] = useState(false);


//   const [
//     smartMessage,
//     setSmartMessage,
//   ] = useState(
//     "Choose a cuisine or tell FoodKindl what you are craving."
//   );


//   // =========================================================
//   // DETAILS PANEL
//   // =========================================================

//   const [
//     detailRestaurant,
//     setDetailRestaurant,
//   ] = useState(null);


//   // =========================================================
//   // VALUES
//   // =========================================================

//   const location =
//     String(
//       form?.city ||
//       ""
//     ).trim();


//   const locationReady =
//     Number.isFinite(
//       Number(
//         form?.search_latitude
//       )
//     ) &&
//     Number.isFinite(
//       Number(
//         form?.search_longitude
//       )
//     );


//   // =========================================================
//   // NORMALIZE
//   // =========================================================

//   const normalized =
//     useMemo(
//       () => {

//         return (
//           Array.isArray(
//             restaurants
//           )
//             ? restaurants
//             : []
//         ).map(
//           (
//             place,
//             index
//           ) => {

//             const tags =
//               place?.osm_tags ||
//               {};


//             const id =
//               place.id ||
//               place.source_id ||
//               `${place.name}-${index}`;


//             const distance =
//               Number(
//                 place
//                   .distance_from_search_km ??
//                 place
//                   .distance_from_route_km ??
//                 0
//               );


//             const photos =
//               Array.isArray(
//                 place.photos
//               )
//                 ? place.photos.filter(
//                     Boolean
//                   )
//                 : [];

//             const image =
//               place.photo_url ||
//               place.image ||
//               place.photo ||
//               place.image_url ||
//               photos[0] ||
//               tags.image ||
//               null;


//             return {
//               ...place,

//               id,

//               name:
//                 place.name ||
//                 "Unnamed place",

//               category:
//                 place.restaurant_type ||
//                 place.category ||
//                 place.type ||
//                 "restaurant",

//               fsqPlaceId:
//                 place.fsq_place_id ||
//                 place.source_id ||
//                 "",

//               primaryType:
//                 place.primary_type ||
//                 "",

//               primaryTypeLabel:
//                 place.primary_type_label ||
//                 place.primary_type ||
//                 "",

//               types:
//                 Array.isArray(
//                   place.types
//                 )
//                   ? place.types
//                   : [],

//               mainCuisine:
//                 place.main_cuisine ||
//                 "",

//               cuisine:
//                 place.main_cuisine ||
//                 place.cuisine ||
//                 "",

//               cuisines:
//                 Array.isArray(
//                   place.cuisines
//                 )
//                   ? place.cuisines
//                   : [],

//               address:
//                 place.address ||
//                 place.locality ||
//                 place.city ||
//                 "",

//               latitude:
//                 Number(
//                   place.latitude
//                 ),

//               longitude:
//                 Number(
//                   place.longitude
//                 ),

//               rating:
//                 Number(
//                   place.rating ||
//                   0
//                 ),

//               reviewCount:
//                 Number(
//                   place.review_count ||
//                   0
//                 ),

//               distanceKm:
//                 Number.isFinite(
//                   distance
//                 )
//                   ? distance
//                   : 0,

//               openingHours:
//                 place.opening_hours ||
//                 tags.opening_hours ||
//                 "",

//               phone:
//                 place.phone ||
//                 tags.phone ||
//                 tags[
//                   "contact:phone"
//                 ] ||
//                 "",

//               website:
//                 place.website ||
//                 tags.website ||
//                 tags[
//                   "contact:website"
//                 ] ||
//                 "",

//               googleMapsUri:
//                 place.google_maps_uri ||
//                 "",

//               photos,

//               image,

//               matchesPreference:
//                 Boolean(
//                   place.matches_preference
//                 ),

//               recommendationReason:
//                 place
//                   .recommendation_reason ||
//                 "",
//             };

//           }
//         );

//       },
//       [
//         restaurants,
//       ]
//     );


//   // =========================================================
//   // FILTER RESULTS
//   // =========================================================

//   const visibleRestaurants =
//     useMemo(
//       () => {

//         let results =
//           [
//             ...normalized,
//           ];


//         if (
//           category !==
//           "all"
//         ) {

//           results =
//             results.filter(
//               place => {

//                 const type =
//                   String(
//                     place.category ||
//                     ""
//                   )
//                     .toLowerCase()
//                     .replace(
//                       "_",
//                       " "
//                     );


//                 if (
//                   category ===
//                   "restaurant"
//                 ) {

//                   return (
//                     type.includes(
//                       "restaurant"
//                     ) ||
//                     type.includes(
//                       "fast food"
//                     ) ||
//                     type.includes(
//                       "food court"
//                     )
//                   );

//                 }


//                 if (
//                   category ===
//                   "cafe"
//                 ) {

//                   return (
//                     type.includes(
//                       "cafe"
//                     ) ||
//                     type.includes(
//                       "coffee"
//                     )
//                   );

//                 }


//                 if (
//                   category ===
//                   "hotel"
//                 ) {

//                   return (
//                     type.includes(
//                       "hotel"
//                     ) ||
//                     type.includes(
//                       "food hotel"
//                     )
//                   );

//                 }


//                 if (
//                   category ===
//                   "bakery"
//                 ) {

//                   return type.includes(
//                     "bakery"
//                   );

//                 }


//                 return true;

//               }
//             );

//         }
// if (
//           openOnly
//         ) {

//           results =
//             results.filter(
//               place => {

//                 /*
//                  * OSM opening_hours is not
//                  * true realtime open status.
//                  *
//                  * For now only keep places
//                  * with opening-hour info.
//                  */

//                 return Boolean(
//                   place.openingHours
//                 );

//               }
//             );

//         }


//         results.sort(
//           (
//             a,
//             b
//           ) => {

//             const aScore =
//               Number(
//                 a.match_score ||
//                 0
//               );

//             const bScore =
//               Number(
//                 b.match_score ||
//                 0
//               );


//             if (
//               bScore !==
//               aScore
//             ) {

//               return (
//                 bScore -
//                 aScore
//               );

//             }


//             return (
//               a.distanceKm -
//               b.distanceKm
//             );

//           }
//         );


//         return results;

//       },
//       [
//         normalized,
//         category,
//         openOnly,
//         form?.cuisine,
//       ]
//     );


//   // =========================================================
//   // SEARCH
//   // =========================================================

//   function search(searchMode = "smart") {

//     if (!locationReady) {
//       setSmartMessage(
//         "Select an area first."
//       );
//       return;
//     }

//     const foodQuery =
//       String(
//         form?.food_query ||
//         ""
//       ).trim();

//     const selectedCuisine =
//       String(
//         form?.cuisine ||
//         ""
//       ).trim();

//     const intent =
//       interpretFoodIntent(
//         foodQuery
//       );

//     const finalCuisine =
//       selectedCuisine ||
//       intent.cuisine ||
//       "";

//     // Search Restaurants explicitly restricts to restaurants.
//     // AI Recommend only restricts type when the user selected one
//     // or the text clearly expresses a type such as "cafe".
//     const finalType =
//       searchMode === "restaurants"
//         ? "restaurant"
//         : (
//             category !== "all"
//               ? category
//               : (
//                   intent.type ||
//                   ""
//                 )
//           );

//     if (
//       !foodQuery &&
//       !finalCuisine &&
//       !finalType
//     ) {
//       setSmartMessage(
//         "Choose a cuisine, place type, or enter a restaurant, dish or craving."
//       );
//       return;
//     }

//     const cuisineLabel =
//       CUISINE_OPTIONS.find(
//         item =>
//           item.value ===
//           finalCuisine
//       )?.label;

//     if (
//       searchMode === "restaurants"
//     ) {
//       setCategory(
//         "restaurant"
//       );
//     } else if (
//       category === "all" &&
//       intent.type
//     ) {
//       setCategory(
//         intent.type
//       );
//     }

//     if (
//       !selectedCuisine &&
//       intent.cuisine
//     ) {
//       updateField(
//         "cuisine",
//         intent.cuisine
//       );
//     }

//     setSmartMessage(
//       cuisineLabel
//         ? `Finding the strongest ${cuisineLabel} matches around ${location}. FoodKindl ranks matching places using cuisine, place type, available ratings and distance.`
//         : foodQuery
//           ? `Matching “${foodQuery}” with nearby restaurant names, dishes, cuisines and place types.`
//           : `Finding ${finalType || "food places"} around ${location}.`
//     );

//     onSearchRestaurants?.({
//       food_query:
//         foodQuery,

//       cuisine:
//         finalCuisine,

//       dine_venue_type:
//         finalType,
//     });

//   }

//   function handleEnter(
//     event
//   ) {

//     if (
//       event.key !==
//       "Enter"
//     ) {
//       return;
//     }


//     event.preventDefault();

//     search("smart");

//   }


//   // =========================================================
//   // SELECT RESTAURANT
//   // =========================================================

//   function choosePlace(
//     place
//   ) {

//     updateField(
//       "venue_name",
//       place.name
//     );


//     updateField(
//       "restaurant_name",
//       place.name
//     );


//     updateField(
//       "restaurant_address",
//       place.address
//     );


//     updateField(
//       "location_label",
//       place.locality ||
//       place.city ||
//       place.address
//     );


//     updateField(
//       "latitude",
//       place.latitude
//     );


//     updateField(
//       "longitude",
//       place.longitude
//     );


//     if (
//       place.cuisine
//     ) {

//       updateField(
//         "cuisine",
//         place.cuisine
//       );

//     }


//     setDetailRestaurant(
//       place
//     );


//     onSelectRestaurant?.(
//       place
//     );

//   }


//   // =========================================================
//   // VIEW DETAILS
//   // =========================================================

//   function viewDetails(
//     place
//   ) {

//     setDetailRestaurant(
//       place
//     );

//   }


//   // =========================================================
//   // DEFAULT DETAILS
//   // =========================================================

//   const activeDetails =
//     detailRestaurant ||
//     selectedRestaurant ||
//     visibleRestaurants[0] ||
//     null;


//   // =========================================================
//   // UI
//   // =========================================================

//   return (
//     <>

//       {/* =====================================================
//           DARK BROWN DISCOVERY BOX
//       ====================================================== */}

//       <section className="fk-dine-discovery-shell">

//         <div className="fk-dine-discovery-heading">

//           <div>

//             <span>
//               FOODKINDL DINE OUT
//             </span>

//             <h2>
//               What are you in the
//               mood for?
//             </h2>

//             <p>
//               Discover restaurants,
//               cafés and food places
//               around{" "}
//               <strong>
//                 {
//                   location ||
//                   "your selected area"
//                 }
//               </strong>
//               , matched to your
//               preferences.
//             </p>

//           </div>


//           <Sparkles
//             size={25}
//           />

//         </div>


//         {/* SEARCH */}

//         <div className="fk-dine-food-search">

//           <Search size={18} />

//           <input
//             type="text"
//             value={form.food_query || ""}
//             placeholder="Restaurant, dish or craving — e.g. Empire, Kerala food, biryani..."
//             onChange={
//               event =>
//                 updateField(
//                   "food_query",
//                   event.target.value
//                 )
//             }
//             onKeyDown={handleEnter}
//           />

//           <button
//             type="button"
//             className="fk-ai-recommend-button"
//             disabled={!locationReady || restaurantsLoading}
//             onClick={() => search("smart")}
//           >
//             {restaurantsLoading ? (
//               <>
//                 <Loader2 size={15} className="fk-spin" />
//                 Searching
//               </>
//             ) : (
//               <>
//                 <Sparkles size={15} />
//                 AI Recommend
//               </>
//             )}
//           </button>

//         </div>

//         <div className="fk-dine-search-actions">

//           <button
//             type="button"
//             className="fk-search-restaurants-button"
//             disabled={!locationReady || restaurantsLoading}
//             onClick={() => search("restaurants")}
//           >
//             <Utensils size={15} />
//             Search Restaurants
//           </button>

//           <span className="fk-ai-search-hint">
//             <Sparkles size={13} />
//             Search by restaurant name, cuisine, dish or craving.
//           </span>

//         </div>


//         {/* SMART SEARCH MESSAGE */}

//         <div className="fk-smart-search-note">
//           <Sparkles size={14} />
//           <span>{smartMessage}</span>
//         </div>


//         {/* CUISINE */}

//         <div className="fk-smart-filter-section">

//           <span className="fk-smart-filter-label">
//             CUISINE
//           </span>

//           <div className="fk-cuisine-chip-row">

//             {CUISINE_OPTIONS.map(
//               option => (

//                 <button
//                   key={
//                     option.value ||
//                     "any"
//                   }
//                   type="button"
//                   className={
//                     form.cuisine ===
//                     option.value
//                       ? "active"
//                       : ""
//                   }
//                   onClick={() => {
//                     updateField(
//                       "cuisine",
//                       option.value
//                     );

//                     setSmartMessage(
//                       option.value
//                         ? `Ready to find ${option.label} places around ${location || "your area"}.`
//                         : "Choose a cuisine or tell FoodKindl what you are craving."
//                     );
//                   }}
//                 >

//                   <span
//                     aria-hidden="true"
//                     className="fk-cuisine-emoji"
//                   >
//                     {option.icon}
//                   </span>

//                   {option.label}

//                 </button>

//               )
//             )}

//           </div>

//         </div>


//         {/* PLACE TYPE */}

//         <div className="fk-smart-filter-section">

//           <span className="fk-smart-filter-label">
//             PLACE TYPE
//           </span>

//           <div className="fk-dine-filter-row">

//             <button
//               type="button"
//               className={
//                 category === "all"
//                   ? "active"
//                   : ""
//               }
//               onClick={() =>
//                 setCategory("all")
//               }
//             >
//               <LayoutGrid size={14} />
//               All
//             </button>

//             <button
//               type="button"
//               className={
//                 category === "restaurant"
//                   ? "active"
//                   : ""
//               }
//               onClick={() =>
//                 setCategory("restaurant")
//               }
//             >
//               <Utensils size={14} />
//               Restaurants
//             </button>

//             <button
//               type="button"
//               className={
//                 category === "cafe"
//                   ? "active"
//                   : ""
//               }
//               onClick={() =>
//                 setCategory("cafe")
//               }
//             >
//               <Coffee size={14} />
//               Cafés
//             </button>

//             <button
//               type="button"
//               className={
//                 category === "hotel"
//                   ? "active"
//                   : ""
//               }
//               onClick={() =>
//                 setCategory("hotel")
//               }
//             >
//               <Building2 size={14} />
//               Hotels
//             </button>

//             <button
//               type="button"
//               className={
//                 category === "bakery"
//                   ? "active"
//                   : ""
//               }
//               onClick={() =>
//                 setCategory("bakery")
//               }
//             >
//               <Croissant size={14} />
//               Bakeries
//             </button>

//             <button
//               type="button"
//               className={
//                 openOnly
//                   ? "active"
//                   : ""
//               }
//               onClick={() =>
//                 setOpenOnly(
//                   current =>
//                     !current
//                 )
//               }
//             >
//               <Clock3 size={14} />
//               Open hours
//             </button>

//           </div>

//         </div>

//       </section>


//       {/* =====================================================
//           ERROR
//       ====================================================== */}

//       {restaurantsError && (

//         <div className="fk-dineout-error">

//           {
//             restaurantsError
//           }

//         </div>

//       )}


//       {/* =====================================================
//           LOADING
//       ====================================================== */}

//       {restaurantsLoading && (

//         <div className="fk-dine-loading">

//           <Loader2
//             size={24}
//             className="fk-spin"
//           />


//           <div>

//             <strong>
//               Finding places
//               around{" "}
//               {
//                 location
//               }
//             </strong>

//             <span>
//               FoodKindl is looking
//               for nearby food
//               places.
//             </span>

//           </div>

//         </div>

//       )}


//       {/* =====================================================
//           RESULTS
//       ====================================================== */}

//       {!restaurantsLoading &&
//         visibleRestaurants.length >
//         0 && (

//         <section className="fk-dine-results">

//           {/* TITLE */}

//           <div className="fk-dine-results-heading">

//             <div>

//               <span>
//                 RECOMMENDED FOR YOU
//               </span>

//               <h3>
//                 Places around{" "}
//                 {
//                   location
//                 }
//               </h3>

//             </div>


//             <strong>
//               {
//                 visibleRestaurants.length
//               }{" "}
//               places
//             </strong>

//           </div>


//           {/* ===============================================
//               LIST LEFT + DETAILS RIGHT
//           ================================================ */}

//           <div className="fk-dine-results-layout">

//             {/* =============================================
//                 LEFT
//             ============================================== */}

//             <div className="fk-dine-restaurant-list">

//               {visibleRestaurants.map(
//                 (
//                   place,
//                   index
//                 ) => {

//                   const selected =
//                     String(
//                       selectedRestaurant
//                         ?.id
//                     ) ===
//                     String(
//                       place.id
//                     );


//                   const detailsActive =
//                     String(
//                       activeDetails
//                         ?.id
//                     ) ===
//                     String(
//                       place.id
//                     );


//                   return (

//                     <article
//   key={place.id}
//   className={[
//     "fk-dine-list-card",

//     detailsActive
//       ? "active"
//       : "",

//     place.image
//       ? "has-image"
//       : "no-image",
//   ]
//     .filter(Boolean)
//     .join(" ")}
// >

//   {place.image && (
//     <div className="fk-dine-list-thumb">

//       <img
//         src={place.image}
//         alt={place.name}
//         loading="lazy"
//         onError={event => {
//           const image =
//             event.currentTarget;

//           const imageContainer =
//             image.closest(
//               ".fk-dine-list-thumb"
//             );

//           const card =
//             image.closest(
//               ".fk-dine-list-card"
//             );

//           imageContainer?.remove();

//           card?.classList.remove(
//             "has-image"
//           );

//           card?.classList.add(
//             "no-image"
//           );
//         }}
//       />

//       <span className="fk-dine-rank">
//         {index + 1}
//       </span>

//     </div>
//   )}


//   <div className="fk-dine-list-content">

//     {(place.matchesPreference ||
//       index < 3) && (
//       <span className="fk-dine-pick">
//         ✨ FoodKindl Pick
//       </span>
//     )}


//     <h4>
//       {place.name}
//     </h4>


//     <p className="fk-dine-cuisine">
//       {place.mainCuisine ||
//         place.cuisine ||
//         place.primaryTypeLabel ||
//         formatRestaurantType(
//           place.category
//         )}
//     </p>


//     <div className="fk-dine-meta">

//       {place.distanceKm > 0 && (
//         <span>
//           <MapPin size={12} />

//           {place.distanceKm.toFixed(
//             1
//           )} km
//         </span>
//       )}


//       {place.rating > 0 && (
//         <span>
//           <Star
//             size={12}
//             fill="currentColor"
//           />

//           {place.rating}

//           {place.reviewCount >
//             0 && (
//             <>
//               {" "}
//               ({place.reviewCount.toLocaleString()})
//             </>
//           )}
//         </span>
//       )}

//     </div>


//     <div className="fk-dine-card-actions">

//       <button
//         type="button"
//         className="fk-view-details"
//         onClick={() =>
//           viewDetails(
//             place
//           )
//         }
//       >
//         View details

//         <ChevronRight size={14} />
//       </button>


//       <button
//         type="button"
//         className={
//           selected
//             ? "fk-quick-select selected"
//             : "fk-quick-select"
//         }
//         onClick={() =>
//           choosePlace(
//             place
//           )
//         }
//       >
//         {selected ? (
//           <>
//             <Check size={14} />

//             Selected
//           </>
//         ) : (
//           "Choose"
//         )}
//       </button>

//     </div>

//   </div>

// </article>

//                   );

//                 }
//               )}

//             </div>


//             {/* =============================================
//                 RIGHT DETAILS
//             ============================================== */}

//             <aside className="fk-dine-details-panel">

//               {activeDetails ? (

//                 <RestaurantDetails
//                   place={
//                     activeDetails
//                   }

//                   selected={
//                     String(
//                       selectedRestaurant
//                         ?.id
//                     ) ===
//                     String(
//                       activeDetails.id
//                     )
//                   }

//                   onChoose={
//                     choosePlace
//                   }
//                 />

//               ) : (

//                 <div className="fk-dine-details-empty">

//                   <Utensils
//                     size={30}
//                   />

//                   <strong>
//                     Select a restaurant
//                   </strong>

//                   <span>
//                     View restaurant
//                     information here.
//                   </span>

//                 </div>

//               )}

//             </aside>

//           </div>

//         </section>

//       )}


//       {/* =====================================================
//           EMPTY
//       ====================================================== */}

//       {!restaurantsLoading &&
//         restaurantSearchDone &&
//         visibleRestaurants.length ===
//         0 &&
//         !restaurantsError && (

//         <div className="fk-dine-empty">

//           <Search
//             size={27}
//           />

//           <h3>
//             No places found
//           </h3>

//           <p>
//             Try another food,
//             category or nearby
//             location.
//           </p>

//         </div>

//       )}

//     </>
//   );
// }


// // ============================================================
// // RESTAURANT DETAILS
// // ============================================================

// function RestaurantDetails({
//   place,
//   selected,
//   onChoose,
// }) {

//   const photos =
//     Array.isArray(
//       place?.photos
//     )
//       ? place.photos.filter(
//           Boolean
//         )
//       : [];

//   const heroImage =
//     place?.image ||
//     photos[0] ||
//     null;

//   const secondaryPhotos =
//     photos
//       .filter(
//         url =>
//           url !== heroImage
//       )
//       .slice(
//         0,
//         3
//       );

//   const displayType =
//     place?.primaryTypeLabel ||
//     place?.primaryType ||
//     formatRestaurantType(
//       place?.category
//     );

//   const displayCuisine =
//     place?.mainCuisine ||
//     place?.cuisine ||
//     "";

//   return (

//     <div className="fk-detail-inner">

//       {/* IMAGE */}

//       <div className="fk-detail-image">

//         {heroImage ? (

//           <img
//             src={heroImage}
//             alt={place.name}
//             loading="lazy"
//             onError={
//               event => {
//                 event.currentTarget.style.display =
//                   "none";
//               }
//             }
//           />

//         ) : (

//           <div className="fk-detail-image-placeholder">

//             <ImageOff
//               size={30}
//             />

//             <span>
//               Restaurant photo
//               unavailable
//             </span>

//           </div>

//         )}


//         {place.matchesPreference && (

//           <span className="fk-detail-pick">
//             ✨ Recommended
//           </span>

//         )}

//       </div>


//       {/* PHOTO STRIP */}

//       {secondaryPhotos.length > 0 && (

//         <div className="fk-detail-photo-strip">

//           {secondaryPhotos.map(
//             (
//               photoUrl,
//               index
//             ) => (

//               <img
//                 key={
//                   `${place.id}-photo-${index}`
//                 }
//                 src={photoUrl}
//                 alt={
//                   `${place.name} ${index + 2}`
//                 }
//                 loading="lazy"
//                 onError={
//                   event => {
//                     event.currentTarget.style.display =
//                       "none";
//                   }
//                 }
//               />

//             )
//           )}

//         </div>

//       )}


//       {/* DETAILS */}

//       <div className="fk-detail-content">

//         <span className="fk-detail-type">
//           {displayType}
//         </span>


//         <h3>
//           {place.name}
//         </h3>


//         {displayCuisine && (

//           <p className="fk-detail-cuisine">
//             {displayCuisine}
//           </p>

//         )}


//         {/* RATING / REVIEWS / DISTANCE */}

//         <div className="fk-detail-stats">

//           {place.rating > 0 && (

//             <div>

//               <Star
//                 size={15}
//                 fill="currentColor"
//               />

//               <span>
//                 {place.rating}

//                 {place.reviewCount > 0 && (
//                   <>
//                     {" "}
//                     ({place.reviewCount.toLocaleString()} reviews)
//                   </>
//                 )}
//               </span>

//             </div>

//           )}


//           {place.distanceKm > 0 && (

//             <div>

//               <MapPin
//                 size={15}
//               />

//               <span>
//                 {
//                   place.distanceKm
//                     .toFixed(
//                       1
//                     )
//                 }{" "}
//                 km away
//               </span>

//             </div>

//           )}

//         </div>


//         {/* PRIMARY TYPE / TYPES */}

//         {(place.primaryTypeLabel ||
//           place.types?.length > 0) && (

//           <div className="fk-detail-row">

//             <Utensils
//               size={16}
//             />

//             <div>

//               <span>
//                 PLACE TYPE
//               </span>

//               <p>
//                 {
//                   place.primaryTypeLabel ||
//                   formatRestaurantType(
//                     place.category
//                   )
//                 }
//               </p>

//               {place.types?.length > 0 && (

//                 <div className="fk-detail-type-chips">

//                   {place.types
//                     .slice(
//                       0,
//                       5
//                     )
//                     .map(
//                       type => (

//                         <span
//                           key={type}
//                         >
//                           {type}
//                         </span>

//                       )
//                     )}

//                 </div>

//               )}

//             </div>

//           </div>

//         )}


//         {displayCuisine && (

//           <div className="fk-detail-row">

//             <Utensils
//               size={16}
//             />

//             <div>

//               <span>
//                 MAIN CUISINE
//               </span>

//               <p>
//                 {displayCuisine}
//               </p>

//             </div>

//           </div>

//         )}


//         {place.address && (

//           <div className="fk-detail-row">

//             <MapPin
//               size={16}
//             />

//             <div>

//               <span>
//                 FULL ADDRESS
//               </span>

//               <p>
//                 {place.address}
//               </p>

//             </div>

//           </div>

//         )}


//         {place.openingHours && (

//           <div className="fk-detail-row">

//             <Clock3
//               size={16}
//             />

//             <div>

//               <span>
//                 OPENING HOURS
//               </span>

//               <p className="fk-detail-hours">
//                 {place.openingHours}
//               </p>

//             </div>

//           </div>

//         )}


//         {place.phone && (

//           <div className="fk-detail-row">

//             <Phone
//               size={16}
//             />

//             <div>

//               <span>
//                 PHONE
//               </span>

//               <p>
//                 <a
//                   href={
//                     `tel:${place.phone}`
//                   }
//                 >
//                   {place.phone}
//                 </a>
//               </p>

//             </div>

//           </div>

//         )}


//         {place.recommendationReason && (

//           <div className="fk-detail-reason">

//             <Sparkles
//               size={16}
//             />

//             <div>

//               <strong>
//                 Why FoodKindl
//                 recommends it
//               </strong>

//               <p>
//                 {
//                   place
//                     .recommendationReason
//                 }
//               </p>

//             </div>

//           </div>

//         )}


//         <div className="fk-detail-actions">

//           {place.website && (

//             <a
//               href={place.website}
//               target="_blank"
//               rel="noreferrer"
//             >

//               Website

//               <ExternalLink
//                 size={14}
//               />

//             </a>

//           )}


//           {place.googleMapsUri && (

//             <a
//               href={
//                 place.googleMapsUri
//               }
//               target="_blank"
//               rel="noreferrer"
//             >

//               Map

//               <MapPin
//                 size={14}
//               />

//             </a>

//           )}


//           <button
//             type="button"
//             className={
//               selected
//                 ? "selected"
//                 : ""
//             }
//             onClick={() =>
//               onChoose(
//                 place
//               )
//             }
//           >

//             {selected ? (
//               <>
//                 <Check
//                   size={16}
//                 />

//                 Selected
//               </>
//             ) : (
//               "Choose this place"
//             )}

//           </button>

//         </div>

//       </div>

//     </div>

//   );
// }


// // ============================================================
// // TYPE LABEL
// // ============================================================

// function formatRestaurantType(
//   value
// ) {

//   const type =
//     String(
//       value ||
//       "restaurant"
//     )
//       .replace(
//         /_/g,
//         " "
//       );


//   return (
//     type
//       .charAt(0)
//       .toUpperCase()
//     +
//     type.slice(1)
//   );

// }

// src/pages/DineOut.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import {
  ExternalLink,
  MapPin,
  Navigation,
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

const DEFAULT_CENTER = [12.9716, 77.5946];

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

function getLatitude(restaurant) {
  return Number(restaurant?.latitude ?? restaurant?.lat);
}

function getLongitude(restaurant) {
  return Number(restaurant?.longitude ?? restaurant?.lon);
}

function hasValidCoordinates(restaurant) {
  return (
    Number.isFinite(getLatitude(restaurant)) &&
    Number.isFinite(getLongitude(restaurant))
  );
}

function getPopularityScore(restaurant) {
  const rating = Number(restaurant.rating || 0);

  const reviews = Number(
    restaurant.review_count || restaurant.user_ratings_total || 0,
  );

  const distance = Number(restaurant.distance_km || 99);

  return rating * 100 + Math.log10(reviews + 1) * 20 - distance;
}

function distanceBetweenCoordinates(first, second) {
  if (!first || !second) {
    return Infinity;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMetres = 6371000;
  const latitudeDifference = toRadians(second[0] - first[0]);
  const longitudeDifference = toRadians(second[1] - first[1]);
  const firstLatitude = toRadians(first[0]);
  const secondLatitude = toRadians(second[0]);
  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    earthRadiusMetres * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
  );
}

function getDrivingInstruction(step) {
  if (!step) {
    return "Continue on the current road";
  }

  const maneuver = step.maneuver || {};
  const modifier = maneuver.modifier || "";
  const road = step.name ? ` onto ${step.name}` : "";

  if (maneuver.type === "arrive") {
    return "You have reached the restaurant";
  }

  if (maneuver.type === "depart") {
    return `Start driving${road}`;
  }

  if (maneuver.type === "roundabout" || maneuver.type === "rotary") {
    return maneuver.exit
      ? `At the roundabout, take exit ${maneuver.exit}${road}`
      : `Enter the roundabout${road}`;
  }

  const instructions = {
    left: "Turn left",
    "slight left": "Keep slightly left",
    "sharp left": "Make a sharp left",
    right: "Turn right",
    "slight right": "Keep slightly right",
    "sharp right": "Make a sharp right",
    straight: "Continue straight",
    uturn: "Make a U-turn",
  };

  return `${instructions[modifier] || "Continue"}${road}`;
}

function LiveRestaurantNavigation({ restaurant, onStatus }) {
  const map = useMap();
  const [currentPosition, setCurrentPosition] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const lastRoutedPositionRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      onStatus((current) => ({
        ...current,
        loading: false,
        error: "Live location is not supported by this browser.",
      }));
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition([
          position.coords.latitude,
          position.coords.longitude,
        ]);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Allow location access to start navigation."
            : "Your live location could not be determined.";
        onStatus((current) => ({ ...current, loading: false, error: message }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [onStatus]);

  useEffect(() => {
    if (!currentPosition || !hasValidCoordinates(restaurant)) {
      return undefined;
    }

    if (
      lastRoutedPositionRef.current &&
      distanceBetweenCoordinates(
        lastRoutedPositionRef.current,
        currentPosition,
      ) < 40
    ) {
      return undefined;
    }

    lastRoutedPositionRef.current = currentPosition;
    const controller = new AbortController();

    async function loadRoadRoute() {
      const destinationLatitude = getLatitude(restaurant);
      const destinationLongitude = getLongitude(restaurant);
      const [latitude, longitude] = currentPosition;

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${destinationLongitude},${destinationLatitude}?overview=full&geometries=geojson&steps=true`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Road route request failed");
        }

        const payload = await response.json();
        const route = payload.routes?.[0];
        if (!route?.geometry?.coordinates?.length) {
          throw new Error("No road route was found");
        }

        const points = route.geometry.coordinates.map(([lon, lat]) => [
          lat,
          lon,
        ]);
        const steps = route.legs?.[0]?.steps || [];
        const nextStep =
          steps.find(
            (step) => step.maneuver?.type !== "depart" && step.distance > 8,
          ) ||
          steps[1] ||
          steps[0];

        setRoutePoints(points);
        onStatus({
          loading: false,
          error: "",
          instruction: getDrivingInstruction(nextStep),
          instructionDistance: nextStep?.distance || 0,
          distance: route.distance || 0,
          duration: route.duration || 0,
        });

        map.fitBounds(points, { padding: [45, 45], maxZoom: 17 });
      } catch (error) {
        if (error.name !== "AbortError") {
          onStatus((current) => ({
            ...current,
            loading: false,
            error: "Road navigation is temporarily unavailable.",
          }));
        }
      }
    }

    loadRoadRoute();
    return () => controller.abort();
  }, [currentPosition, map, onStatus, restaurant]);

  return (
    <>
      {routePoints.length > 0 && (
        <Polyline
          positions={routePoints}
          pathOptions={{ color: "#2878ff", weight: 6 }}
        />
      )}

      {currentPosition && (
        <CircleMarker
          center={currentPosition}
          radius={9}
          pathOptions={{
            color: "white",
            weight: 3,
            fillColor: "#2878ff",
            fillOpacity: 1,
          }}
        >
          <Popup>Your live location</Popup>
        </CircleMarker>
      )}
    </>
  );
}

/* ============================================================
   MAP CONTROLLER
============================================================ */

function MapController({ center, restaurants }) {
  const map = useMap();

  useEffect(() => {
    const locations = restaurants
      .filter(hasValidCoordinates)
      .map((restaurant) => [getLatitude(restaurant), getLongitude(restaurant)]);

    const timer = window.setTimeout(() => {
      map.invalidateSize();

      if (locations.length > 1) {
        map.fitBounds(locations, {
          padding: [35, 35],
          maxZoom: 15,
        });
      } else if (locations.length === 1) {
        map.setView(locations[0], 15);
      } else {
        map.setView(center, 14);
      }
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [map, center, restaurants]);

  return null;
}

/* ============================================================
   RESTAURANT IMAGE
============================================================ */

function RestaurantImage({ restaurant, className = "restaurant-image" }) {
  const [failed, setFailed] = useState(false);

  const image =
    restaurant.image_url ||
    restaurant.image ||
    restaurant.photo_url ||
    restaurant.cover_photo;

  if (!image || failed) {
    return (
      <div className={`${className} restaurant-image-empty`}>
        <Utensils size={28} />

        <span>Photo unavailable</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={image}
      alt={restaurant.name || "Restaurant"}
      onError={() => setFailed(true)}
    />
  );
}

/* ============================================================
   RESTAURANT DETAILS MODAL
============================================================ */

function RestaurantDetailsModal({ restaurant, onClose, onChoose, onNavigate }) {
  if (!restaurant) {
    return null;
  }

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
        aria-label={`${restaurant.name} details`}
        onMouseDown={(event) => event.stopPropagation()}
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
          <p className="eyebrow">RESTAURANT DETAILS</p>

          <h2>{restaurant.name}</h2>

          <p className="restaurant-modal-cuisine">
            {restaurant.cuisine || "Cuisine unavailable"}
          </p>

          <dl className="restaurant-facts">
            <div>
              <dt>Address</dt>

              <dd>
                {restaurant.address ||
                  restaurant.location_label ||
                  "Address unavailable"}
              </dd>
            </div>

            <div>
              <dt>Distance</dt>

              <dd>
                {restaurant.distance_km != null
                  ? `${restaurant.distance_km} km away`
                  : "Not available"}
              </dd>
            </div>

            <div>
              <dt>Opening hours</dt>

              <dd>{restaurant.opening_hours || "Contact restaurant"}</dd>
            </div>

            <div>
              <dt>Rating</dt>

              <dd>
                {restaurant.rating
                  ? `${restaurant.rating} / 5`
                  : "Not available"}
              </dd>
            </div>
          </dl>

          <div className="restaurant-contact-actions">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`}>
                <Phone size={16} />
                Call
              </a>
            )}

            {restaurant.website && (
              <a href={restaurant.website} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Website
              </a>
            )}

            {hasValidCoordinates(restaurant) && (
              <button type="button" onClick={() => onNavigate(restaurant)}>
                <Navigation size={16} />
                Navigate here
              </button>
            )}
          </div>

          <button
            type="button"
            className="primary-button restaurant-modal-choose"
            onClick={() => onChoose(restaurant)}
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
  const navigate = useNavigate();

  const skipAutocompleteRef = useRef(false);

  const autocompleteRequestRef = useRef(0);

  /* ----------------------------------------------------------
     LOCATION AND RESTAURANTS
  ---------------------------------------------------------- */

  const [location, setLocation] = useState("Indiranagar");

  const [cuisine, setCuisine] = useState("All cuisines");

  const [searchText, setSearchText] = useState("");

  const [locationSuggestions, setLocationSuggestions] = useState([]);

  const [restaurants, setRestaurants] = useState([]);

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const [detailsRestaurant, setDetailsRestaurant] = useState(null);

  const [navigationRestaurant, setNavigationRestaurant] = useState(null);

  const [navigationStatus, setNavigationStatus] = useState({
    loading: false,
    error: "",
    instruction: "Waiting for your live location",
    instructionDistance: 0,
    distance: 0,
    duration: 0,
  });

  const [coordinates, setCoordinates] = useState({
    latitude: DEFAULT_CENTER[0],

    longitude: DEFAULT_CENTER[1],
  });

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  /* ----------------------------------------------------------
     LOADING AND MESSAGES
  ---------------------------------------------------------- */

  const [locationLoading, setLocationLoading] = useState(false);

  const [restaurantLoading, setRestaurantLoading] = useState(false);

  const [creating, setCreating] = useState(false);

  const [pageError, setPageError] = useState("");

  const [createError, setCreateError] = useState("");

  const [createSuccess, setCreateSuccess] = useState("");

  const [createdInviteId, setCreatedInviteId] = useState(null);

  /* ----------------------------------------------------------
     DINE OUT FORM
  ---------------------------------------------------------- */

  const [meetupTitle, setMeetupTitle] = useState("");

  const [meetupNotes, setMeetupNotes] = useState("");

  const [eventDate, setEventDate] = useState("");

  const [eventTime, setEventTime] = useState("");

  const [maximumGuests, setMaximumGuests] = useState(2);

  const [bookingStatus, setBookingStatus] = useState("not_booked");

  const [dietaryNotes, setDietaryNotes] = useState("");

  const [visibility, setVisibility] = useState("public");

  const [availableMembers, setAvailableMembers] = useState([]);

  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const [membersLoading, setMembersLoading] = useState(false);

  const [membersError, setMembersError] = useState("");

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
          import.meta.env.VITE_MEMBER_DIRECTORY_ENDPOINT || "/dineout/members/";

        const response = await api.get(endpoint);

        const rawMembers = Array.isArray(response.data)
          ? response.data
          : response.data?.results ||
            response.data?.members ||
            response.data?.profiles ||
            [];

        const normalizedMembers = rawMembers
          .map((item) => {
            const user = item.user || item;
            const id = user.id || item.user_id;
            const name =
              user.name ||
              user.full_name ||
              [user.first_name, user.last_name].filter(Boolean).join(" ") ||
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
            "Could not load FoodKindl members. Check the member-directory API endpoint.",
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
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  /* ----------------------------------------------------------
     POPULAR RESTAURANTS
  ---------------------------------------------------------- */

  const visibleRestaurants = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const filtered = restaurants.filter((restaurant) => {
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
    });

    return [...filtered]
      .sort(
        (first, second) =>
          getPopularityScore(second) - getPopularityScore(first),
      )
      .slice(0, 10);
  }, [restaurants, searchText]);

  /* ----------------------------------------------------------
     AUTOCOMPLETE
  ---------------------------------------------------------- */

  useEffect(() => {
    const query = location.trim();

    /*
     * A location was selected.
     * Do not search for it again.
     */
    if (skipAutocompleteRef.current) {
      skipAutocompleteRef.current = false;

      setLocationSuggestions([]);

      return undefined;
    }

    if (query.length < 2) {
      setLocationSuggestions([]);
      setLocationLoading(false);

      return undefined;
    }

    const requestNumber = ++autocompleteRequestRef.current;

    const timer = window.setTimeout(async () => {
      try {
        setLocationLoading(true);

        const response = await api.get("/dineout/locations/autocomplete/", {
          params: {
            q: query,
            limit: 8,
          },
        });

        if (requestNumber !== autocompleteRequestRef.current) {
          return;
        }

        const results = Array.isArray(response.data)
          ? response.data
          : response.data?.results || [];

        setLocationSuggestions(results);
      } catch (requestError) {
        console.error("Location autocomplete error:", requestError);

        if (requestNumber === autocompleteRequestRef.current) {
          setLocationSuggestions([]);
        }
      } finally {
        if (requestNumber === autocompleteRequestRef.current) {
          setLocationLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [location]);

  /* ----------------------------------------------------------
     FETCH RESTAURANTS
  ---------------------------------------------------------- */

  async function fetchRestaurants(
    latitude = coordinates.latitude,

    longitude = coordinates.longitude,

    selectedCuisine = cuisine,
  ) {
    try {
      setRestaurantLoading(true);

      setPageError("");

      const response = await api.get("/dineout/restaurants/recommendations/", {
        params: {
          latitude,
          longitude,

          cuisine:
            selectedCuisine === "All cuisines" ? undefined : selectedCuisine,

          limit: 10,
        },
      });

      const results = Array.isArray(response.data)
        ? response.data
        : response.data?.results || response.data?.restaurants || [];

      setRestaurants(results);

      setSelectedRestaurant(results[0] || null);

      if (results.length === 0) {
        setPageError("No restaurants found in this area.");
      }
    } catch (requestError) {
      console.error(
        "Restaurant search error:",
        requestError.response?.data || requestError,
      );

      setRestaurants([]);
      setSelectedRestaurant(null);

      setPageError(
        requestError.response?.data?.detail || "Unable to load restaurants.",
      );
    } finally {
      setRestaurantLoading(false);
    }
  }

  /* ----------------------------------------------------------
     SELECT LOCATION
  ---------------------------------------------------------- */

  async function selectLocation(place) {
    const latitude = Number(place.latitude ?? place.lat);

    const longitude = Number(place.longitude ?? place.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setPageError("This location has invalid coordinates.");

      return;
    }

    const locationName =
      place.name ||
      place.display_name ||
      place.location_label ||
      "Selected location";

    autocompleteRequestRef.current += 1;

    skipAutocompleteRef.current = true;

    setLocation(locationName);

    setLocationSuggestions([]);
    setLocationLoading(false);

    setCoordinates({
      latitude,
      longitude,
    });

    setMapCenter([latitude, longitude]);

    await fetchRestaurants(latitude, longitude, cuisine);
  }

  /* ----------------------------------------------------------
     LOCATION INPUT
  ---------------------------------------------------------- */

  function handleLocationChange(event) {
    skipAutocompleteRef.current = false;

    setLocation(event.target.value);
  }

  function clearLocation() {
    autocompleteRequestRef.current += 1;

    skipAutocompleteRef.current = false;

    setLocation("");
    setLocationSuggestions([]);
    setLocationLoading(false);
  }

  /* ----------------------------------------------------------
     CURRENT LOCATION
  ---------------------------------------------------------- */

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setPageError("Location is not supported by this browser.");

      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const latitude = coords.latitude;

        const longitude = coords.longitude;

        autocompleteRequestRef.current += 1;

        skipAutocompleteRef.current = true;

        setLocation("Current location");

        setLocationSuggestions([]);

        setCoordinates({
          latitude,
          longitude,
        });

        setMapCenter([latitude, longitude]);

        await fetchRestaurants(latitude, longitude, cuisine);
      },

      () => {
        setPageError("Unable to access your current location.");
      },
    );
  }

  /* ----------------------------------------------------------
     CHOOSE RESTAURANT
  ---------------------------------------------------------- */

  function chooseRestaurant(restaurant) {
    setSelectedRestaurant(restaurant);

    setDetailsRestaurant(null);

    if (hasValidCoordinates(restaurant)) {
      setMapCenter([getLatitude(restaurant), getLongitude(restaurant)]);
    }

    window.setTimeout(() => {
      document.getElementById("plan-meetup")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function startRestaurantNavigation(restaurant) {
    if (!hasValidCoordinates(restaurant)) {
      setPageError("This restaurant does not have valid map coordinates.");
      return;
    }

    setPageError("");
    setDetailsRestaurant(null);
    setSelectedRestaurant(restaurant);
    setNavigationRestaurant(restaurant);
    setNavigationStatus({
      loading: true,
      error: "",
      instruction: "Finding your live location…",
      instructionDistance: 0,
      distance: 0,
      duration: 0,
    });
    setMapCenter([getLatitude(restaurant), getLongitude(restaurant)]);
  }

  function endRestaurantNavigation() {
    setNavigationRestaurant(null);
    setNavigationStatus({
      loading: false,
      error: "",
      instruction: "Waiting for your live location",
      instructionDistance: 0,
      distance: 0,
      duration: 0,
    });
  }

  /* ----------------------------------------------------------
     CREATE ERROR
  ---------------------------------------------------------- */

  function showCreateError(message) {
    setCreateError(message);
    setCreateSuccess("");

    document.getElementById("plan-meetup")?.scrollIntoView({
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
      showCreateError("Please choose a restaurant.");

      return;
    }

    if (!meetupTitle.trim()) {
      showCreateError("Please enter a meetup title.");

      return;
    }

    if (!eventDate || !eventTime) {
      showCreateError("Please choose a valid date and time.");

      return;
    }

    const startsAt = new Date(`${eventDate}T${eventTime}:00`);

    if (Number.isNaN(startsAt.getTime())) {
      showCreateError("The selected date or time is invalid.");

      return;
    }

    if (startsAt <= new Date()) {
      showCreateError("Please choose a future date and time.");

      return;
    }

    const guestCount = Number(maximumGuests);

    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
      showCreateError("Maximum guests must be between 1 and 20.");

      return;
    }

    if (visibility === "invited_only" && selectedMemberIds.length === 0) {
      showCreateError(
        "Please select at least one guest for a private Dine Out.",
      );

      return;
    }

    if (selectedMemberIds.length > guestCount) {
      showCreateError(
        `You selected ${selectedMemberIds.length} guests, but the maximum is ${guestCount}.`,
      );

      return;
    }

    const latitude = getLatitude(selectedRestaurant);

    const longitude = getLongitude(selectedRestaurant);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      showCreateError("The selected restaurant has invalid coordinates.");

      return;
    }

    const payload = {
      title: meetupTitle.trim(),

      description: meetupNotes.trim(),

      restaurant_external_id: String(selectedRestaurant.id || ""),

      restaurant_name: selectedRestaurant.name,

      restaurant_address:
        selectedRestaurant.address || selectedRestaurant.location_label || "",

      restaurant_cuisine: selectedRestaurant.cuisine || "",

      restaurant_phone: selectedRestaurant.phone || "",

      restaurant_website: selectedRestaurant.website || "",

      latitude,
      longitude,

      starts_at: startsAt.toISOString(),

      maximum_guests: guestCount,

      budget_label: "",

      booking_status: bookingStatus,

      dietary_notes: dietaryNotes.trim(),

      meetup_notes: meetupNotes.trim(),

      verified_only: false,

      women_only: false,

      visibility,

      invited_member_ids:
        visibility === "invited_only" ? selectedMemberIds : [],

      status: "published",
    };

    try {
      setCreating(true);

      console.log("CREATE DINE OUT PAYLOAD:", payload);

      const response = await api.post("/dineout/dine-outs/", payload);

      console.log("CREATE DINE OUT SUCCESS:", response.data);

      setCreateSuccess("Dine Out invitation created successfully.");

      setCreatedInviteId(response.data?.id || null);

      document.getElementById("plan-meetup")?.scrollIntoView({
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
    } catch (requestError) {
      console.error("CREATE DINE OUT FAILED:", {
        status: requestError.response?.status,

        response: requestError.response?.data,

        message: requestError.message,
      });

      const responseStatus = requestError.response?.status;

      const responseData = requestError.response?.data;

      if (responseStatus === 401) {
        showCreateError("Your login session has expired. Please log in again.");

        return;
      }

      if (responseStatus === 403) {
        showCreateError(
          "You do not have permission to create this invitation.",
        );

        return;
      }

      if (responseStatus === 404) {
        showCreateError(
          "The Dine Out API was not found. Check your Django URLs.",
        );

        return;
      }

      if (responseData && typeof responseData === "object") {
        const backendError = Object.entries(responseData)
          .map(([field, value]) => {
            const message = Array.isArray(value)
              ? value.join(" ")
              : String(value);

            return `${field}: ${message}`;
          })
          .join(" ");

        showCreateError(backendError || "Unable to create the invitation.");

        return;
      }

      showCreateError("Unable to create the Dine Out invitation.");
    } finally {
      setCreating(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  /* ============================================================
     JSX
  ============================================================ */

  return (
    <main className="dineout-page">
      <section className="dineout-hero">
        <div>
          <p className="eyebrow">FOODKINDL DINE OUT</p>

          <h1>
            Find a place.
            <br />
            Meet over food.
          </h1>

          <p className="hero-text">
            Discover restaurants, choose a place and invite people.
          </p>
        </div>

        <div className="hero-card">
          <span>MEET OVER FOOD</span>

          <strong>Pick a place. Invite your people.</strong>
        </div>
      </section>

      <section className="location-card">
        <div className="section-heading">
          <p className="eyebrow">FIND AN AREA</p>

          <h2>Where do you want to dine?</h2>

          <p>Search a locality, neighbourhood, landmark or city.</p>
        </div>

        <div className="location-search">
          <div className="location-input-wrap">
            <Search size={20} />

            <input
              type="text"
              value={location}
              onChange={handleLocationChange}
              placeholder="Search locality, area or city"
              autoComplete="off"
            />

            {location && (
              <button
                type="button"
                className="icon-button"
                onClick={clearLocation}
                aria-label="Clear location"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={useCurrentLocation}
          >
            <MapPin size={17} />
            Use my current location
          </button>

          {locationLoading && (
            <p className="search-status">Searching locations...</p>
          )}

          {locationSuggestions.length > 0 && (
            <div className="location-suggestions">
              {locationSuggestions.map((place, index) => (
                <button
                  key={place.id || index}
                  type="button"
                  className="location-suggestion"
                  onClick={() => selectLocation(place)}
                >
                  <MapPin size={18} />

                  <span>
                    <strong>{place.name || place.display_name}</strong>

                    <small>{place.display_name || ""}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mood-card">
        <div className="mood-header">
          <div>
            <p className="eyebrow">FOODKINDL DINE OUT</p>

            <h2>What are you in the mood for?</h2>

            <p>
              Showing 10 popular restaurants around <strong>{location}</strong>.
            </p>
          </div>

          <Sparkles size={26} />
        </div>

        <div className="filters">
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Restaurant, dish or craving"
          />

          <select
            value={cuisine}
            onChange={(event) => setCuisine(event.target.value)}
          >
            {CUISINES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="primary-button"
            onClick={() => fetchRestaurants()}
            disabled={restaurantLoading}
          >
            <Search size={17} />

            {restaurantLoading ? "Searching..." : "Find places"}
          </button>
        </div>
      </section>

      {pageError && (
        <div className="error-message" role="alert">
          {pageError}
        </div>
      )}

      <section className="results-layout">
        <div className="restaurant-list">
          <div className="results-heading">
            <div>
              <p className="eyebrow">POPULAR NEAR YOU</p>

              <h2>Places around {location}</h2>
            </div>

            <span>{visibleRestaurants.length} places</span>
          </div>

          {restaurantLoading && (
            <div className="empty-state">Loading restaurants...</div>
          )}

          {!restaurantLoading && visibleRestaurants.length === 0 && (
            <div className="empty-state">
              Search an area to see restaurants.
            </div>
          )}

          {visibleRestaurants.map((restaurant, index) => (
            <article
              key={restaurant.id || index}
              className={`restaurant-card ${
                selectedRestaurant?.id === restaurant.id ? "selected" : ""
              }`}
              onClick={() => setSelectedRestaurant(restaurant)}
            >
              <RestaurantImage restaurant={restaurant} />

              <div className="restaurant-content">
                <p className="restaurant-number">{index + 1}</p>

                <p className="eyebrow">POPULAR PICK</p>

                <h3>{restaurant.name}</h3>

                <p>{restaurant.cuisine || "Cuisine unavailable"}</p>

                <small>
                  {restaurant.address ||
                    restaurant.location_label ||
                    "Address unavailable"}
                </small>

                <div className="restaurant-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={(event) => {
                      event.stopPropagation();

                      setDetailsRestaurant(restaurant);
                    }}
                  >
                    View details
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startRestaurantNavigation(restaurant);
                    }}
                  >
                    <Navigation size={16} />
                    Navigate
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={(event) => {
                      event.stopPropagation();

                      chooseRestaurant(restaurant);
                    }}
                  >
                    Choose
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="map-panel" style={{ position: "relative" }}>
          <MapContainer
            center={mapCenter}
            zoom={14}
            scrollWheelZoom
            className="restaurant-map"
          >
            <MapController
              center={mapCenter}
              restaurants={visibleRestaurants}
            />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {visibleRestaurants.map((restaurant, index) => {
              if (!hasValidCoordinates(restaurant)) {
                return null;
              }

              return (
                <Marker
                  key={restaurant.id || index}
                  position={[getLatitude(restaurant), getLongitude(restaurant)]}
                >
                  <Popup>
                    <strong>{restaurant.name}</strong>

                    <br />

                    {restaurant.cuisine || "Restaurant"}

                    <br />

                    {restaurant.address || restaurant.location_label || ""}
                  </Popup>
                </Marker>
              );
            })}

            {navigationRestaurant && (
              <LiveRestaurantNavigation
                restaurant={navigationRestaurant}
                onStatus={setNavigationStatus}
              />
            )}
          </MapContainer>

          {navigationRestaurant && (
            <div
              className="dineout-live-navigation"
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                right: 16,
                zIndex: 1000,
                padding: "14px 16px",
                borderRadius: 16,
                background: "rgba(31, 17, 12, 0.94)",
                color: "white",
                boxShadow: "0 10px 30px rgba(0,0,0,.28)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div>
                  <small style={{ color: "#ff7043", fontWeight: 800 }}>
                    LIVE ROAD NAVIGATION
                  </small>
                  <strong style={{ display: "block", marginTop: 4 }}>
                    {navigationStatus.instruction}
                  </strong>
                  <span
                    style={{ display: "block", marginTop: 4, opacity: 0.8 }}
                  >
                    {navigationStatus.loading
                      ? "Calculating road route…"
                      : `${(navigationStatus.distance / 1000).toFixed(1)} km · ${Math.max(1, Math.round(navigationStatus.duration / 60))} min`}
                  </span>
                  {navigationStatus.instructionDistance > 0 && (
                    <span
                      style={{ display: "block", marginTop: 2, opacity: 0.8 }}
                    >
                      In {Math.round(navigationStatus.instructionDistance)} m
                    </span>
                  )}
                  {navigationStatus.error && (
                    <span
                      style={{
                        display: "block",
                        marginTop: 5,
                        color: "#ffb4a2",
                      }}
                    >
                      {navigationStatus.error}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={endRestaurantNavigation}
                  style={{ alignSelf: "flex-start" }}
                >
                  End
                </button>
              </div>
            </div>
          )}
        </aside>
      </section>

      {selectedRestaurant && (
        <section className="restaurant-details">
          <p className="eyebrow">SELECTED RESTAURANT</p>

          <h2>{selectedRestaurant.name}</h2>

          <p>
            {selectedRestaurant.address ||
              selectedRestaurant.location_label ||
              "Address unavailable"}
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => chooseRestaurant(selectedRestaurant)}
          >
            Plan the meetup
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => startRestaurantNavigation(selectedRestaurant)}
          >
            <Navigation size={17} />
            Start navigation
          </button>
        </section>
      )}

      <section id="plan-meetup" className="plan-meetup">
        <p className="eyebrow">NEXT STEP</p>

        <h2>Plan the meetup</h2>

        {selectedRestaurant && (
          <div className="selected-place">
            <MapPin size={18} />

            <span>
              <small>Selected restaurant</small>

              <strong>{selectedRestaurant.name}</strong>
            </span>
          </div>
        )}

        {createError && (
          <div className="error-message" role="alert">
            {createError}
          </div>
        )}

        {createSuccess && (
          <div className="success-message" role="status" aria-live="polite">
            <strong>{createSuccess}</strong>

            {createdInviteId && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate(`/dine-out/${createdInviteId}`)}
              >
                View invitation
              </button>
            )}
          </div>
        )}

        <label>
          Meetup title
          <input
            type="text"
            value={meetupTitle}
            onChange={(event) => setMeetupTitle(event.target.value)}
            placeholder="Meetup title"
          />
        </label>

        <label>
          Notes
          <textarea
            rows={4}
            value={meetupNotes}
            onChange={(event) => setMeetupNotes(event.target.value)}
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
              onChange={(event) => setEventDate(event.target.value)}
            />
          </label>

          <label>
            Time
            <input
              type="time"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
            />
          </label>

          <label>
            Maximum guests
            <input
              type="number"
              min="1"
              max="20"
              value={maximumGuests}
              onChange={(event) => setMaximumGuests(event.target.value)}
            />
          </label>
        </div>

        <label>
          Booking status
          <select
            value={bookingStatus}
            onChange={(event) => setBookingStatus(event.target.value)}
          >
            <option value="not_booked">Not booked yet</option>

            <option value="booked">Table booked</option>

            <option value="walk_in">Walk in</option>
          </select>
        </label>

        <label>
          Dietary preferences
          <textarea
            rows={2}
            value={dietaryNotes}
            onChange={(event) => setDietaryNotes(event.target.value)}
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

        {visibility === "invited_only" && (
          <section className="dineout-member-picker">
            <div className="dineout-member-picker__heading">
              <strong>Select guests</strong>
              <span>
                {selectedMemberIds.length}/{maximumGuests} selected
              </span>
            </div>

            {membersLoading && <p>Loading members...</p>}
            {membersError && <p className="error-message">{membersError}</p>}

            {!membersLoading &&
              !membersError &&
              availableMembers.length === 0 && (
                <p>No members are available to invite.</p>
              )}

            <div className="dineout-member-picker__list">
              {availableMembers.map((member) => (
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
        )}

        <button
          type="button"
          className="primary-button"
          onClick={createDineOut}
          disabled={creating}
        >
          {creating ? "Creating invitation..." : "Create Dine Out invite"}
        </button>
      </section>

      <RestaurantDetailsModal
        restaurant={detailsRestaurant}
        onClose={() => setDetailsRestaurant(null)}
        onChoose={chooseRestaurant}
        onNavigate={startRestaurantNavigation}
      />
    </main>
  );
}
