import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  ConciergeBell,
  Footprints,
  Home,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Star,
  UserPlus,
  UsersRound,
  Utensils,
  X,
} from "lucide-react";

import {
  Map,
  Marker,
  Popup,
  NavigationControl,
  LngLatBounds,
  setWorkerUrl,
} from "maplibre-gl";

import mapWorkerUrl from
  "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(mapWorkerUrl);

import {
  useNavigate,
} from "react-router-dom";

import api from "../api";

import {
  useAuth,
} from "../context/AuthContext";

import "../styles/food_invites.css";

import FoodWalkPlanner from "./FoodWalkPlanner";
import RestaurantSubmissionModal from "../components/RestaurantSubmissionModal";


// ============================================================
// INVITE TYPES
// ============================================================

const CUISINE_OPTIONS = [
  { value: "", label: "Select cuisine" },

  // Indian regional
  { value: "south_indian", label: "South Indian" },
  { value: "north_indian", label: "North Indian" },
  { value: "kerala", label: "Kerala" },
  { value: "karnataka", label: "Karnataka" },
  { value: "tamil", label: "Tamil" },
  { value: "andhra", label: "Andhra" },
  { value: "telangana", label: "Telangana" },
  { value: "hyderabadi", label: "Hyderabadi" },
  { value: "punjabi", label: "Punjabi" },
  { value: "bengali", label: "Bengali" },
  { value: "rajasthani", label: "Rajasthani" },
  { value: "gujarati", label: "Gujarati" },
  { value: "maharashtrian", label: "Maharashtrian" },
  { value: "goan", label: "Goan" },
  { value: "kashmiri", label: "Kashmiri" },

  // International
  { value: "chinese", label: "Chinese" },
  { value: "indo_chinese", label: "Indo-Chinese" },
  { value: "italian", label: "Italian" },
  { value: "continental", label: "Continental" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "mexican", label: "Mexican" },
  { value: "thai", label: "Thai" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "arabian", label: "Arabian" },
  { value: "middle_eastern", label: "Middle Eastern" },
  { value: "lebanese", label: "Lebanese" },

  // Popular food categories
  { value: "biryani", label: "Biryani" },
  { value: "seafood", label: "Seafood" },
  { value: "street_food", label: "Street Food" },
  { value: "fast_food", label: "Fast Food" },
  { value: "cafe", label: "Cafe" },
  { value: "bakery", label: "Bakery" },
  { value: "desserts", label: "Desserts" },
  { value: "barbecue", label: "Barbecue / Grill" },

  // Diet based
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "jain", label: "Jain" },

  // Other
  { value: "multi_cuisine", label: "Multi Cuisine" },
  { value: "other", label: "Other" },
];


const INVITE_TYPES = [
  {
    id: "cook_together",
    title: "Cook Together",
    description:
      "Cook and enjoy a meal together at home, a clubhouse or another venue.",
    icon: Home,
  },
  {
    id: "dine_out",
    title: "Dine Out",
    description:
      "Meet at a restaurant or cafe and enjoy food together.",
    icon: Utensils,
  },
  {
    id: "food_walk",
    title: "Food Walk",
    description:
      "Explore several food places together and discover local flavours.",
    icon: Footprints,
  },
];


// ============================================================
// DEFAULT FOOD INVITE FORM
// ============================================================

function getDefaultForm() {
  return {
    invite_type: "cook_together",

    title: "",
    description: "",
    cuisine: "",

    invite_date: "",
    invite_hour: "07",
    invite_minute: "00",
    invite_period: "PM",

    cook_venue_type: "home",
    dine_venue_type: "restaurant",

    venue_name: "",
    location_label: "",
    food_walk_destination: "",
    private_address: "",

    max_participants: 2,
    kitchen_contribution: 0,

    // Open invites are visible to all FoodKindl members.
    is_open: false,

    recipient_user_ids: [],

    food_walk_stops: [],
  };
}


// ============================================================
// DEFAULT BOOKING FORM
// ============================================================

function getDefaultBookingForm() {
  return {
    booking_date: "",
    booking_hour: "7",
    booking_minute: "00",
    booking_period: "PM",

    guest_count: 2,

    special_request: "",
  };
}


// ============================================================
// DINE OUT MAP
// ============================================================

const DINE_OUT_MAP_STYLE = {
  version: 8,

  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
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


function getRestaurantCoordinates(restaurant) {
  if (!restaurant) {
    return null;
  }

  const latitude = Number(
    restaurant.latitude ??
    restaurant.lat ??
    restaurant.restaurant_latitude
  );

  const longitude = Number(
    restaurant.longitude ??
    restaurant.lng ??
    restaurant.lon ??
    restaurant.restaurant_longitude
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}


function createRestaurantMarkerElement(selected = false) {
  const element = document.createElement("button");

  element.type = "button";

  element.className = selected
    ? "food-invite-map-marker selected"
    : "food-invite-map-marker";

  element.setAttribute(
    "aria-label",
    "Restaurant"
  );

  element.innerHTML = "<span>🍴</span>";

  return element;
}


function DineOutMapPanel({
  restaurants = [],
  selectedVenueName = "",
  onSelectRestaurant,
  onOpenRestaurant,
  onSuggestPlace,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);

  const validRestaurants = restaurants.filter(
    restaurant =>
      getRestaurantCoordinates(
        restaurant
      )
  );


  useEffect(
    () => {
      if (
        !mapContainerRef.current ||
        mapRef.current
      ) {
        return undefined;
      }

      const firstRestaurant =
        validRestaurants[0];

      const firstCoords =
        getRestaurantCoordinates(
          firstRestaurant
        );

      const initialCenter = firstCoords
        ? [
            firstCoords.longitude,
            firstCoords.latitude,
          ]
        : [
            77.5946,
            12.9716,
          ];

      const map = new Map({
        container:
          mapContainerRef.current,

        style:
          DINE_OUT_MAP_STYLE,

        center:
          initialCenter,

        zoom:
          firstCoords
            ? 13
            : 11,

        attributionControl:
          true,
      });

      map.addControl(
        new NavigationControl(),
        "top-right"
      );

      mapRef.current = map;

      let resizeObserver = null;

      if (
        typeof ResizeObserver !==
        "undefined"
      ) {
        resizeObserver =
          new ResizeObserver(
            () => {
              map.resize();
            }
          );

        resizeObserver.observe(
          mapContainerRef.current
        );
      }

      map.on(
        "load",
        () => {
          map.resize();
        }
      );

      return () => {
        markerRefs.current.forEach(
          marker =>
            marker.remove()
        );

        markerRefs.current = [];

        resizeObserver?.disconnect();

        map.remove();

        mapRef.current = null;
      };
    },
    []
  );


  useEffect(
    () => {
      const map =
        mapRef.current;

      if (!map) {
        return;
      }

      markerRefs.current.forEach(
        marker =>
          marker.remove()
      );

      markerRefs.current = [];

      const boundsPoints = [];

      validRestaurants.forEach(
        restaurant => {
          const coordinates =
            getRestaurantCoordinates(
              restaurant
            );

          if (!coordinates) {
            return;
          }

          const isSelected =
            selectedVenueName ===
            restaurant.name;

          const element =
            createRestaurantMarkerElement(
              isSelected
            );

          const popupContent =
            document.createElement(
              "div"
            );

          popupContent.className =
            "food-invite-map-popup";

          const popupName =
            document.createElement(
              "strong"
            );

          popupName.textContent =
            restaurant.name ||
            "Restaurant";

          const popupCuisine =
            document.createElement(
              "span"
            );

          popupCuisine.textContent =
            restaurant.cuisine ||
            restaurant.restaurant_type ||
            "Restaurant";

          const popupLocation =
            document.createElement(
              "small"
            );

          popupLocation.textContent =
            restaurant.locality ||
            restaurant.city ||
            "";

          popupContent.append(
            popupName,
            popupCuisine,
            popupLocation
          );

          element.addEventListener(
            "click",
            event => {
              event.stopPropagation();

              onSelectRestaurant?.(
                restaurant
              );
            }
          );

          element.addEventListener(
            "dblclick",
            event => {
              event.preventDefault();

              onOpenRestaurant?.(
                restaurant
              );
            }
          );

          const marker =
            new Marker({
              element,
              anchor:
                "bottom",
            })
              .setLngLat([
                coordinates.longitude,
                coordinates.latitude,
              ])
              .setPopup(
                new Popup({
                  offset:
                    18,
                  closeButton:
                    false,
                }).setDOMContent(
                  popupContent
                )
              )
              .addTo(
                map
              );

          markerRefs.current.push(
            marker
          );

          boundsPoints.push([
            coordinates.longitude,
            coordinates.latitude,
          ]);
        }
      );

      if (
        boundsPoints.length ===
        1
      ) {
        map.easeTo({
          center:
            boundsPoints[0],
          zoom:
            14,
          duration:
            450,
        });
      } else if (
        boundsPoints.length >
        1
      ) {
        const bounds =
          boundsPoints.reduce(
            (
              current,
              point
            ) =>
              current.extend(
                point
              ),
            new LngLatBounds(
              boundsPoints[0],
              boundsPoints[0]
            )
          );

        map.fitBounds(
          bounds,
          {
            padding:
              52,
            maxZoom:
              14,
            duration:
              500,
          }
        );
      }

      window.setTimeout(
        () => {
          map.resize();
        },
        50
      );
    },
    [
      restaurants,
      selectedVenueName,
      onSelectRestaurant,
      onOpenRestaurant,
    ]
  );


  return (
    <aside className="food-invite-dine-map-panel">

      <div className="food-invite-dine-map-head">

        <div>

          <span>
            FOODKINDL PLACES
          </span>

          <h3>
            Choose on map
          </h3>

          <p>
            Select a blue restaurant marker or choose from the list below.
          </p>

        </div>

      </div>


      <div
        ref={mapContainerRef}
        className="food-invite-dine-map"
      />


      <div className="food-invite-dine-map-list">

        {
          restaurants.length === 0
            ? (
                <div className="food-invite-restaurant-state compact">

                  <Utensils size={22} />

                  <strong>
                    No partner restaurants found
                  </strong>

                  <span>
                    Try a different cuisine or locality.
                  </span>

                </div>
              )
            : restaurants.map(
                restaurant => {
                  const selected =
                    selectedVenueName ===
                    restaurant.name;

                  return (
                    <button
                      key={restaurant.id}
                      type="button"
                      className={
                        selected
                          ? "food-invite-map-list-card selected"
                          : "food-invite-map-list-card"
                      }
                      onClick={() =>
                        onSelectRestaurant?.(
                          restaurant
                        )
                      }
                    >

                      <div className="food-invite-map-list-main">

                        <strong>
                          {restaurant.name}
                        </strong>

                        <span>
                          {
                            restaurant.cuisine ||
                            (
                              restaurant.restaurant_type ===
                                "cafe"
                                ? "Cafe"
                                : "Restaurant"
                            )
                          }
                        </span>

                        <small>
                          {
                            [
                              restaurant.locality,
                              restaurant.city,
                            ]
                              .filter(Boolean)
                              .join(", ")
                          }
                        </small>

                      </div>


                      <div className="food-invite-map-list-action">

                        {
                          selected
                            ? <Check size={16} />
                            : <Plus size={16} />
                        }

                      </div>

                    </button>
                  );
                }
              )
        }

      </div>


      <div className="food-invite-place-submission">

        <div className="food-invite-place-submission-icon">
          <Plus size={14} />
        </div>

        <div className="food-invite-place-submission-copy">
          <strong>
            Can't find the place?
          </strong>

          <span>
            Suggest a restaurant, cafe or hotel.
          </span>
        </div>

        <button
          type="button"
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();

            if (
              typeof onSuggestPlace ===
              "function"
            ) {
              onSuggestPlace();
            }
          }}
        >
          Add place
          <ArrowRight size={13} />
        </button>

      </div>

    </aside>
  );
}


// ============================================================
// COMPONENT
// ============================================================

export default function FoodInvites() {

  const navigate =
    useNavigate();

  const {
    user,
  } = useAuth();


  const [
    invites,
    setInvites,
  ] = useState([]);


  // Public community invites shown at the top of the page.
  const [
    openInvites,
    setOpenInvites,
  ] = useState([]);


  const [
    bookings,
    setBookings,
  ] = useState([]);


  const [
    connections,
    setConnections,
  ] = useState([]);


  const [
    recommendedRestaurants,
    setRecommendedRestaurants,
  ] = useState([]);


  const [
    restaurantsLoading,
    setRestaurantsLoading,
  ] = useState(false);


  const [
    selectedRestaurant,
    setSelectedRestaurant,
  ] = useState(null);


  const [
    activeRestaurantImage,
    setActiveRestaurantImage,
  ] = useState("");


  const [
    restaurantDetailsLoading,
    setRestaurantDetailsLoading,
  ] = useState(false);


  const [
    bookingForm,
    setBookingForm,
  ] = useState(
    getDefaultBookingForm()
  );


  const [
    bookingSaving,
    setBookingSaving,
  ] = useState(false);


  const [
    bookingSuccess,
    setBookingSuccess,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    showCreate,
    setShowCreate,
  ] = useState(false);


  const [
    showRestaurantSubmission,
    setShowRestaurantSubmission,
  ] = useState(false);


  const [
    selectedInvite,
    setSelectedInvite,
  ] = useState(null);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    responding,
    setResponding,
  ] = useState(false);


  const [
    form,
    setForm,
  ] = useState(
    getDefaultForm()
  );


  // =========================================================
  // API ERROR
  // =========================================================

  function getApiErrorMessage(
    requestError,
    fallback
  ) {

    const data =
      requestError?.response?.data;


    if (!data) {
      return fallback;
    }


    if (
      typeof data === "string"
    ) {
      return data;
    }


    if (data.detail) {
      return data.detail;
    }


    const firstKey =
      Object.keys(data)[0];


    if (firstKey) {

      const value =
        data[firstKey];


      if (Array.isArray(value)) {
        return value[0];
      }


      if (typeof value === "string") {
        return value;
      }
    }


    return fallback;
  }


  // =========================================================
  // CONNECTION MEMBER
  // =========================================================

  function getConnectionMember(
    connection
  ) {

    if (connection?.other_user) {
      return connection.other_user;
    }


    if (
      Number(connection?.sender?.id) ===
      Number(user?.id)
    ) {
      return (
        connection?.receiver ||
        null
      );
    }


    if (
      Number(connection?.receiver?.id) ===
      Number(user?.id)
    ) {
      return (
        connection?.sender ||
        null
      );
    }


    return (
      connection?.receiver ||
      connection?.sender ||
      null
    );
  }


  // =========================================================
  // INVITE TYPE
  // =========================================================

  function formatInviteType(
    inviteType
  ) {

    if (
      inviteType === "cook_together"
    ) {
      return "Cook Together";
    }


    if (
      inviteType === "dine_out"
    ) {
      return "Dine Out";
    }


    if (
      inviteType === "food_walk"
    ) {
      return "Food Walk";
    }


    return "Food Invite";
  }


  // =========================================================
  // ICON
  // =========================================================

  function getInviteIcon(
    inviteType
  ) {

    if (
      inviteType === "cook_together"
    ) {
      return <Home size={24} />;
    }


    if (
      inviteType === "dine_out"
    ) {
      return <Utensils size={24} />;
    }


    return <Footprints size={24} />;
  }


  // =========================================================
  // FORMAT DATE
  // =========================================================

  function formatDate(
    value
  ) {

    if (!value) {
      return "Date to be confirmed";
    }


    return new Date(value).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }


  // =========================================================
  // FORMAT TIME
  // =========================================================

  function formatTime(
    value
  ) {

    if (!value) {
      return "";
    }


    const [
      rawHour,
      minute = "00",
    ] =
      String(value).split(":");


    let hour =
      Number(rawHour);


    const period =
      hour >= 12
        ? "PM"
        : "AM";


    hour =
      hour % 12;


    if (hour === 0) {
      hour = 12;
    }


    return `${hour}:${minute} ${period}`;
  }


  // =========================================================
  // BOOKING DATETIME
  // =========================================================

  function getBookingDateTime(
    booking
  ) {

    if (!booking?.booking_date) {
      return null;
    }


    const bookingTime =
      booking.booking_time ||
      "00:00:00";


    const value =
      new Date(
        `${booking.booking_date}T${bookingTime}`
      );


    if (
      Number.isNaN(
        value.getTime()
      )
    ) {
      return null;
    }


    return value;
  }


  // =========================================================
  // CONFIRMED BOOKINGS
  //
  // A confirmed restaurant booking is treated as an
  // upcoming FoodKindl food moment, even when no separate
  // FoodInvite record exists.
  // =========================================================

  function getConfirmedBookings() {

    const inviteIds =
      new Set(
        invites
          .map(
            invite =>
              String(invite?.id || "")
          )
          .filter(Boolean)
      );


    return bookings.filter(
      booking => {

        if (
          booking?.status !==
          "confirmed"
        ) {
          return false;
        }


        // If this restaurant booking already belongs to a
        // Food Invite, do not show it twice.
        if (
          booking?.food_invite_id &&
          inviteIds.has(
            String(
              booking.food_invite_id
            )
          )
        ) {
          return false;
        }


        return true;
      }
    );
  }


  // =========================================================
  // UPCOMING FOOD MOMENTS
  // =========================================================

  function getUpcomingFoodMoments() {

    const inviteMoments =
      invites.map(
        invite => ({
          source:
            "invite",

          key:
            `invite-${invite.id}`,

          sortDate:
            invite.start_at
              ? new Date(
                  invite.start_at
                )
              : null,

          data:
            invite,
        })
      );


    const bookingMoments =
      getConfirmedBookings()
        .map(
          booking => ({
            source:
              "booking",

            key:
              `booking-${booking.id}`,

            sortDate:
              getBookingDateTime(
                booking
              ),

            data:
              booking,
          })
        );


    return [
      ...inviteMoments,
      ...bookingMoments,
    ].sort(
      (
        first,
        second
      ) => {

        const firstTime =
          first.sortDate?.getTime?.() ||
          Number.MAX_SAFE_INTEGER;

        const secondTime =
          second.sortDate?.getTime?.() ||
          Number.MAX_SAFE_INTEGER;


        return (
          firstTime -
          secondTime
        );
      }
    );
  }


  // =========================================================
  // LOAD INVITES
  // =========================================================

  async function loadInvites() {

    try {

      const response =
        await api.get(
          "/food-invites/"
        );


      const data =
        response.data?.results ||
        response.data ||
        [];


      setInvites(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (requestError) {

      console.error(
        "Food Invite API error:",
        requestError.response?.data ||
        requestError
      );


      setInvites([]);


      setError(
        getApiErrorMessage(
          requestError,
          "Food Invites could not be loaded."
        )
      );
    }
  }


  // =========================================================
  // LOAD OPEN / COMMUNITY INVITES
  //
  // Backend endpoint should return future, active invites with
  // is_open=true and must be visible to every authenticated user.
  // =========================================================

  async function loadOpenInvites() {

    try {

      const response =
        await api.get(
          "/food-invites/open/"
        );


      const data =
        response.data?.results ||
        response.data ||
        [];


      setOpenInvites(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (requestError) {

      console.error(
        "Open Food Invite API error:",
        requestError.response?.data ||
        requestError
      );


      // Keep the rest of the Food Invites page usable even if
      // the public endpoint has not been deployed yet.
      setOpenInvites([]);
    }
  }


  // =========================================================
  // LOAD RESTAURANT BOOKINGS
  //
  // The backend returns bookings belonging to the
  // authenticated user. Once an admin changes a booking
  // to "confirmed", it appears in Upcoming food moments.
  // =========================================================

  async function loadBookings() {

    try {

      const response =
        await api.get(
          "/restaurant-bookings/"
        );


      const data =
        response.data?.results ||
        response.data ||
        [];


      setBookings(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (requestError) {

      console.error(
        "Restaurant booking API error:",
        requestError.response?.data ||
        requestError
      );


      setBookings([]);
    }
  }


  // =========================================================
  // LOAD CONNECTIONS
  // =========================================================

  async function loadConnections() {

    try {

      const response =
        await api.get(
          "/connections/accepted/"
        );


      const data =
        response.data?.results ||
        response.data ||
        [];


      setConnections(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (requestError) {

      console.error(
        "Connection API error:",
        requestError.response?.data ||
        requestError
      );


      setConnections([]);
    }
  }


  // =========================================================
  // LOAD RECOMMENDED RESTAURANTS
  //
  // IMPORTANT:
  // Backend filters to:
  //
  // is_active=True
  // is_foodkindl_partner=True
  // accepts_foodkindl_booking=True
  //
  // Frontend also sends these flags explicitly.
  // =========================================================

  async function loadRecommendedRestaurants() {

    if (
      form.invite_type !==
      "dine_out"
    ) {

      setRecommendedRestaurants([]);

      return;
    }


    try {

      setRestaurantsLoading(true);

      setError("");


      const params = {

        locality:
          form.location_label?.trim() ||
          "",

        cuisine:
          form.cuisine?.trim() ||
          "",

        type:
          form.dine_venue_type ||
          "restaurant",

      };


      console.log(
        "FOODKINDL RESTAURANT RECOMMENDATION PARAMS:",
        params
      );


      const response =
        await api.get(
          "/restaurants/recommended/",
          {
            params,
          }
        );


      console.log(
        "RECOMMENDED RESTAURANTS RESPONSE:",
        response.data
      );


      const data =
        response.data?.results ||
        response.data ||
        [];


      const restaurants =
        Array.isArray(data)
          ? data
          : [];


      // Backend already guarantees that only active
      // FoodKindl booking partners are returned.
      setRecommendedRestaurants(
        restaurants
      );

    } catch (requestError) {

      console.error(
        "Restaurant recommendation API error:",
        requestError.response?.status,
        requestError.response?.data ||
        requestError
      );


      setRecommendedRestaurants([]);


      setError(
        getApiErrorMessage(
          requestError,
          "Restaurant recommendations could not be loaded."
        )
      );

    } finally {

      setRestaurantsLoading(false);
    }
  }


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  async function loadPage() {

    setLoading(true);

    setError("");


    await Promise.all([
      loadOpenInvites(),
      loadInvites(),
      loadBookings(),
      loadConnections(),
    ]);


    setLoading(false);
  }


  useEffect(
    () => {

      loadPage();

    },
    []
  );


  // =========================================================
  // REFRESH INVITES + BOOKINGS
  //
  // This lets a booking approved by an admin appear on this
  // page without requiring the user to manually reload.
  // =========================================================

  useEffect(
    () => {

      const timer =
        window.setInterval(
          () => {

            loadOpenInvites();

            loadInvites();

            loadBookings();

          },
          30000
        );


      return () => {
        window.clearInterval(
          timer
        );
      };

    },
    []
  );


  // =========================================================
  // LOAD RESTAURANTS WHEN DINE OUT FILTERS CHANGE
  // =========================================================

  useEffect(
    () => {

      if (!showCreate) {
        return undefined;
      }


      if (
        form.invite_type !==
        "dine_out"
      ) {

        setRecommendedRestaurants([]);

        return undefined;
      }


      const timer =
        setTimeout(
          () => {
            loadRecommendedRestaurants();
          },
          300
        );


      return () => {
        clearTimeout(timer);
      };

    },
    [
      showCreate,
      form.invite_type,
      form.dine_venue_type,
      form.location_label,
      form.cuisine,
    ]
  );


  // =========================================================
  // FORM UPDATE
  // =========================================================

  function updateField(
    field,
    value
  ) {

    setForm(
      previous => ({
        ...previous,
        [field]: value,
      })
    );
  }


  function updateBookingField(
    field,
    value
  ) {

    setBookingForm(
      previous => ({
        ...previous,
        [field]: value,
      })
    );
  }


  // =========================================================
  // CREATE MODAL
  // =========================================================

  function openCreate(
    inviteType
  ) {

    setSelectedInvite(null);

    setSelectedRestaurant(null);

    setActiveRestaurantImage("");

    setBookingSuccess(null);

    setRecommendedRestaurants([]);


    setForm({
      ...getDefaultForm(),
      invite_type: inviteType,
    });


    setShowCreate(true);

    setError("");

    setMessage("");
  }


  function closeCreate() {

    setShowCreate(false);

    setRecommendedRestaurants([]);

    setSelectedRestaurant(null);

    setBookingSuccess(null);

    setForm(
      getDefaultForm()
    );
  }


  // =========================================================
  // SELECT RESTAURANT
  // =========================================================

  function selectRestaurant(
    restaurant
  ) {

    setForm(
      previous => ({
        ...previous,

        dine_venue_type:
          restaurant.restaurant_type ===
          "cafe"
            ? "cafe"
            : "restaurant",

        venue_name:
          restaurant.name ||
          "",

        location_label:
          [
            restaurant.locality,
            restaurant.city,
          ]
            .filter(Boolean)
            .join(", ") ||
          previous.location_label,

        cuisine:
          previous.cuisine ||
          restaurant.cuisine ||
          "",
      })
    );


    setSelectedRestaurant(null);

    setBookingSuccess(null);


    setMessage(
      `${restaurant.name} selected for your Food Invite.`
    );
  }


  // =========================================================
  // OPEN RESTAURANT DETAIL
  // =========================================================

  async function openRestaurantDetails(
    restaurant
  ) {

    if (!restaurant?.id) {
      return;
    }


    try {

      setRestaurantDetailsLoading(true);

      setError("");

      setBookingSuccess(null);


      const response =
        await api.get(
          `/restaurants/${restaurant.id}/`
        );


      const details =
        response.data;


      setSelectedRestaurant(
        details
      );


      const galleryImages = [
        details.image_url,
        ...(Array.isArray(details.images)
          ? details.images.map(
              image => image.image_url
            )
          : []),
      ].filter(Boolean);


      setActiveRestaurantImage(
        galleryImages[0] || ""
      );


      setBookingForm({

        booking_date:
          form.invite_date ||
          "",

        booking_hour:
          form.invite_hour ||
          "7",

        booking_minute:
          form.invite_minute ||
          "00",

        booking_period:
          form.invite_period ||
          "PM",

        guest_count:
          Number(
            form.max_participants
          ) ||
          2,

        special_request:
          "",
      });

    } catch (requestError) {

      console.error(
        "Restaurant detail error:",
        requestError.response?.data ||
        requestError
      );


      setError(
        getApiErrorMessage(
          requestError,
          "Restaurant details could not be loaded."
        )
      );

    } finally {

      setRestaurantDetailsLoading(false);
    }
  }


  // =========================================================
  // RESTAURANT CARD
  // =========================================================

  function RestaurantCard({
    restaurant,
  }) {

    const selected =
      form.venue_name ===
      restaurant.name;


    return (

      <div
        className={
          selected
            ? "food-invite-restaurant-card selected"
            : "food-invite-restaurant-card"
        }
      >

        <button
          type="button"
          className="food-invite-restaurant-open"
          onClick={() =>
            openRestaurantDetails(
              restaurant
            )
          }
        >

          <div className="food-invite-restaurant-image">

            {
              (
                restaurant.image_url ||
                restaurant.images?.[0]?.image_url
              )
                ? (
                    <img
                      src={
                        restaurant.image_url ||
                        restaurant.images?.[0]?.image_url
                      }
                      alt={
                        restaurant.name
                      }
                    />
                  )
                : (
                    <Utensils
                      size={26}
                    />
                  )
            }

          </div>


          <div className="food-invite-restaurant-content">

            <strong>
              {restaurant.name}
            </strong>


            {
              restaurant.is_foodkindl_partner ===
                true &&
              restaurant.accepts_foodkindl_booking ===
                true &&
              (
                <span className="foodkindl-partner-mini-badge">

                  <Check
                    size={11}
                  />

                  FoodKindl Partner

                </span>
              )
            }


            <span>
              {
                restaurant.cuisine ||
                (
                  restaurant.restaurant_type ===
                    "cafe"
                    ? "Cafe"
                    : "Restaurant"
                )
              }
            </span>


            <div className="food-invite-restaurant-meta">

              {
                restaurant.rating &&
                (
                  <span className="restaurant-rating">

                    <Star
                      size={11}
                      fill="currentColor"
                    />

                    {restaurant.rating}

                  </span>
                )
              }


              {
                restaurant.locality &&
                (
                  <span>

                    <MapPin
                      size={11}
                    />

                    {restaurant.locality}

                  </span>
                )
              }

            </div>


            <small>
              View restaurant
            </small>

          </div>

        </button>


        <button
          type="button"
          className="food-invite-restaurant-select"
          onClick={() =>
            selectRestaurant(
              restaurant
            )
          }
        >

          {
            selected
              ? (
                  <>
                    <Check
                      size={15}
                    />

                    Selected
                  </>
                )
              : (
                  <>
                    <Plus
                      size={15}
                    />

                    Add to Invite
                  </>
                )
          }

        </button>

      </div>
    );
  }


  // =========================================================
  // RECIPIENT
  // =========================================================

  function toggleRecipient(
    userId
  ) {

    const normalizedId =
      Number(userId);


    setForm(
      previous => {

        const exists =
          previous.recipient_user_ids.some(
            id =>
              Number(id) ===
              normalizedId
          );


        return {
          ...previous,

          recipient_user_ids:
            exists
              ? previous.recipient_user_ids.filter(
                  id =>
                    Number(id) !==
                    normalizedId
                )
              : [
                  ...previous.recipient_user_ids,
                  normalizedId,
                ],
        };
      }
    );
  }


  // =========================================================
  // FOOD WALK
  // =========================================================

  function normalizeFoodWalkStops(
    rawStops
  ) {

    if (!Array.isArray(rawStops)) {
      return [];
    }


    return rawStops
      .map(
        stop => {

          if (typeof stop === "string") {

            const name = stop.trim();

            return name
              ? {
                  name,
                }
              : null;
          }


          if (
            stop &&
            typeof stop === "object"
          ) {

            const name = String(
              stop.name || ""
            ).trim();


            if (!name) {
              return null;
            }


            return {
              name,

              restaurant_id:
                stop.restaurant_id ||
                null,

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
                "",

              rating:
                stop.rating ??
                null,

              latitude:
                stop.latitude ??
                null,

              longitude:
                stop.longitude ??
                null,

              distance_from_route_km:
                stop.distance_from_route_km ??
                null,

              route_position:
                stop.route_position ??
                null,

              is_foodkindl_partner:
                stop.is_foodkindl_partner ===
                true,
            };
          }


          return null;
        }
      )
      .filter(Boolean)
      .slice(0, 5);
  }


  // =========================================================
  // BUILD INVITE DATETIME
  // =========================================================

  function buildStartDateTime() {

    let hour =
      Number(
        form.invite_hour
      );


    if (
      form.invite_period ===
        "PM" &&
      hour !== 12
    ) {
      hour += 12;
    }


    if (
      form.invite_period ===
        "AM" &&
      hour === 12
    ) {
      hour = 0;
    }


    return new Date(
      `${form.invite_date}T${String(
        hour
      ).padStart(
        2,
        "0"
      )}:${form.invite_minute}:00`
    );
  }


  // =========================================================
  // BUILD BOOKING TIME
  // =========================================================

  function buildBookingTime() {

    let hour =
      Number(
        bookingForm.booking_hour
      );


    if (
      bookingForm.booking_period ===
        "PM" &&
      hour !== 12
    ) {
      hour += 12;
    }


    if (
      bookingForm.booking_period ===
        "AM" &&
      hour === 12
    ) {
      hour = 0;
    }


    return (
      `${String(hour).padStart(2, "0")}:` +
      `${bookingForm.booking_minute}:00`
    );
  }


  // =========================================================
  // CREATE INVITE
  // =========================================================

  async function createInvite(
    event = null
  ) {

    if (event) {
      event.preventDefault();
    }

    console.log(
      "SEND FOOD INVITE FUNCTION CALLED"
    );


    console.log(
      "SEND FOOD INVITE CLICKED"
    );

    console.log(
      "CURRENT FORM:",
      form
    );


    if (saving) {
      return;
    }


    setSaving(true);

    setError("");

    setMessage("");


    try {

      // ======================================================
      // DATE
      // ======================================================

      if (!form.invite_date) {

        throw new Error(
          "Please select a date."
        );
      }


      // ======================================================
      // CONNECTION
      // ======================================================

      if (
        !form.is_open &&
        (
          !Array.isArray(
            form.recipient_user_ids
          )
          ||
          form.recipient_user_ids.length ===
          0
        )
      ) {

        throw new Error(
          "Please select at least one FoodKindl connection or make this an Open Invite."
        );
      }


      // ======================================================
      // DINE OUT
      // ======================================================

      if (
        form.invite_type ===
          "dine_out"
        &&
        !String(
          form.venue_name ||
          ""
        ).trim()
      ) {

        throw new Error(
          "Please select or enter a restaurant."
        );
      }


      // ======================================================
      // FOOD WALK
      // ======================================================

      let foodWalkStops = [];


      if (
        form.invite_type ===
        "food_walk"
      ) {

        const startingPoint =
          String(
            form.location_label ||
            ""
          ).trim();


        const destination =
          String(
            form.food_walk_destination ||
            ""
          ).trim();


        if (!startingPoint) {

          throw new Error(
            "Please enter the Food Walk starting point."
          );
        }


        if (!destination) {

          throw new Error(
            "Please enter the Food Walk destination."
          );
        }


        foodWalkStops =
          normalizeFoodWalkStops(
            form.food_walk_stops
          );


        console.log(
          "NORMALIZED FOOD WALK STOPS:",
          foodWalkStops
        );


        if (
          foodWalkStops.length <
          2
        ) {

          throw new Error(
            "Please add at least 2 Food Walk stops."
          );
        }


        if (
          foodWalkStops.length >
          5
        ) {

          throw new Error(
            "A Food Walk can have a maximum of 5 stops."
          );
        }
      }


      // ======================================================
      // DATETIME
      // ======================================================

      const startDateTime =
        buildStartDateTime();


      if (
        !startDateTime
        ||
        Number.isNaN(
          startDateTime.getTime()
        )
      ) {

        throw new Error(
          "Please select a valid date and time."
        );
      }


      // ======================================================
      // PAYLOAD
      // ======================================================

      const payload = {

        invite_type:
          form.invite_type,

        title:
          String(
            form.title ||
            ""
          ).trim(),

        description:
          String(
            form.description ||
            ""
          ).trim(),

        cuisine:
          String(
            form.cuisine ||
            ""
          ).trim(),

        start_at:
          startDateTime.toISOString(),

        end_at:
          null,


        cook_venue_type:
          form.invite_type ===
            "cook_together"
            ? form.cook_venue_type
            : "",


        dine_venue_type:
          form.invite_type ===
            "dine_out"
            ? form.dine_venue_type
            : "",


        venue_name:
          form.invite_type ===
            "dine_out"
            ? String(
                form.venue_name ||
                ""
              ).trim()
            : "",


        location_label:
          form.invite_type ===
            "food_walk"
            ? [
                String(
                  form.location_label ||
                  ""
                ).trim(),

                String(
                  form.food_walk_destination ||
                  ""
                ).trim(),
              ]
                .filter(Boolean)
                .join(" → ")
            : String(
                form.location_label ||
                ""
              ).trim(),


        private_address:
          form.invite_type ===
            "cook_together"
            ? String(
                form.private_address ||
                ""
              ).trim()
            : "",


        max_participants:
          Number(
            form.max_participants
          ) || 2,


        kitchen_contribution:
          form.invite_type ===
            "cook_together"
            ? Number(
                form.kitchen_contribution
              ) || 0
            : 0,


        // Public/community visibility.
        is_open:
          form.is_open === true,


        recipient_user_ids:
          form.recipient_user_ids
            .map(Number)
            .filter(Boolean),


        food_walk_stops:
          form.invite_type ===
            "food_walk"
            ? foodWalkStops
            : [],
      };


      console.log(
        "FOOD INVITE PAYLOAD:",
        payload
      );


      // ======================================================
      // API
      // ======================================================

      const response =
        await api.post(
          "/food-invites/",
          payload
        );


      console.log(
        "FOOD INVITE RESPONSE:",
        response.data
      );


      closeCreate();


      setMessage(
        "Food Invite sent successfully."
      );


      await Promise.all([
        loadOpenInvites(),
        loadInvites(),
      ]);


    } catch (requestError) {

      console.error(
        "CREATE FOOD INVITE ERROR:",
        requestError
      );


      console.error(
        "BACKEND ERROR:",
        requestError?.response?.data
      );


      const localError =
        requestError instanceof Error
        &&
        !requestError.response
          ? requestError.message
          : "";


      const apiError =
        requestError?.response?.data;


      if (localError) {

        setError(
          localError
        );

      } else if (
        typeof apiError?.detail ===
        "string"
      ) {

        setError(
          apiError.detail
        );

      } else if (apiError) {

        const firstKey =
          Object.keys(
            apiError
          )[0];


        const firstValue =
          firstKey
            ? apiError[firstKey]
            : null;


        if (
          Array.isArray(
            firstValue
          )
        ) {

          setError(
            `${firstKey}: ${firstValue[0]}`
          );

        } else if (
          typeof firstValue ===
          "string"
        ) {

          setError(
            `${firstKey}: ${firstValue}`
          );

        } else {

          setError(
            JSON.stringify(
              apiError
            )
          );
        }

      } else {

        setError(
          "Food Invite could not be created."
        );
      }


    } finally {

      setSaving(false);
    }
  }


  // =========================================================
  // INVITED MEMBER HELPERS
  // =========================================================

  function getParticipantName(
    participant
  ) {
    return (
      participant?.user_name ||
      participant?.full_name ||
      participant?.name ||
      participant?.user_email ||
      "FoodKindl Member"
    );
  }


  function getParticipantInitial(
    participant
  ) {
    const name =
      getParticipantName(
        participant
      );

    return (
      name
        .trim()
        .charAt(0)
        .toUpperCase() ||
      "F"
    );
  }


  function getParticipantStatus(
    participant
  ) {
    const value =
      String(
        participant?.status ||
        "pending"
      ).toLowerCase();

    if (value === "accepted") {
      return "Accepted";
    }

    if (value === "declined") {
      return "Declined";
    }

    return "Pending";
  }


  function openMemberProfile(
    participant
  ) {
    const userId =
      participant?.user_id;

    if (!userId) {
      return;
    }

    setSelectedInvite(null);

    navigate(
      `/connect/member/${userId}`
    );
  }


  // =========================================================
  // OPEN INVITE
  // =========================================================

  async function openInviteDetails(
    invite
  ) {

    try {

      const response =
        await api.get(
          `/food-invites/${invite.id}/`
        );


      setSelectedInvite(
        response.data
      );

    } catch (requestError) {

      console.error(
        "Invitation detail error:",
        requestError.response?.data ||
        requestError
      );


      setSelectedInvite(
        invite
      );
    }
  }


  // =========================================================
  // RESPOND
  // =========================================================

 // =========================================================
// RESPOND TO FOOD INVITE
// =========================================================

async function respondToInvite(
  responseValue
) {

  if (!selectedInvite?.id) {

    setError(
      "Food Invite information is missing."
    );

    return;
  }


  if (
    responseValue !== "accepted" &&
    responseValue !== "declined"
  ) {

    setError(
      "Invalid Food Invite response."
    );

    return;
  }


  try {

    setResponding(true);

    setError("");

    setMessage("");


    console.log(
      "RESPONDING TO FOOD INVITE:",
      {
        id:
          selectedInvite.id,

        response:
          responseValue,
      }
    );


    const response =
      await api.post(
        `/food-invites/${selectedInvite.id}/respond/`,
        {
          response:
            responseValue,
        }
      );


    console.log(
      "FOOD INVITE RESPONSE:",
      response.data
    );


    /* ======================================================
       UPDATE CURRENT INVITE
    ====================================================== */

    if (
      response.data?.invite
    ) {

      setSelectedInvite(
        response.data.invite
      );

    } else {

      setSelectedInvite(
        previous => ({
          ...previous,

          my_participant_status:
            responseValue,
        })
      );
    }


    /* ======================================================
       REFRESH DATA
    ====================================================== */

    await Promise.all([
      loadInvites(),
      loadBookings(),
    ]);


    /* ======================================================
       SUCCESS
    ====================================================== */

    setMessage(
      responseValue ===
        "accepted"
        ? "Food Invite accepted."
        : "Food Invite declined."
    );


    /* ======================================================
       CLOSE DETAILS MODAL
    ====================================================== */

    setSelectedInvite(
      null
    );


  } catch (
    requestError
  ) {

    console.error(
      "FOOD INVITE RESPONSE ERROR:",
      requestError
    );


    console.error(
      "BACKEND RESPONSE:",
      requestError?.response?.data
    );


    console.error(
      "HTTP STATUS:",
      requestError?.response?.status
    );


    setError(
      getApiErrorMessage(
        requestError,

        responseValue ===
          "accepted"
          ? "Food Invite could not be accepted."
          : "Food Invite could not be declined."
      )
    );


  } finally {

    setResponding(
      false
    );
  }
}

  // =========================================================
  // BOOK RESTAURANT
  // =========================================================

  async function bookRestaurant(
    event
  ) {

    event.preventDefault();


    if (!selectedRestaurant?.id) {

      setError(
        "Restaurant information is unavailable."
      );

      return;
    }


    if (!bookingForm.booking_date) {

      setError(
        "Please select a booking date."
      );

      return;
    }


    try {

      setBookingSaving(true);

      setError("");

      setBookingSuccess(null);


      const response =
        await api.post(
          "/restaurant-bookings/",
          {
            restaurant:
              selectedRestaurant.id,

            booking_date:
              bookingForm.booking_date,

            booking_time:
              buildBookingTime(),

            guest_count:
              Number(
                bookingForm.guest_count
              ),

            special_request:
              bookingForm.special_request.trim(),

            food_invite_id:
              selectedInvite?.id ||
              null,
          }
        );


      setBookingSuccess(
        response.data
      );


      setMessage(
        "Restaurant booking request sent. Waiting for confirmation."
      );


      await loadBookings();

    } catch (requestError) {

      setError(
        getApiErrorMessage(
          requestError,
          "Restaurant booking could not be completed."
        )
      );

    } finally {

      setBookingSaving(false);
    }
  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <main className="food-invites-page">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="food-invites-hero">

        <div>

          <div className="food-invites-kicker">

            <ConciergeBell size={17} />

            FOODKINDL INVITES

          </div>


          <h1>
            Food Invites
          </h1>


          <p>
            Turn a FoodKindl connection into
            a real food moment.
          </p>


          <button
            type="button"
            className="food-invite-create-main"
            onClick={() =>
              openCreate(
                "cook_together"
              )
            }
          >

            <Plus size={18} />

            Create Food Invite

          </button>

        </div>

      </section>


      {/* =====================================================
          GLOBAL MESSAGES
      ===================================================== */}

      {
        error &&
        (
          <div className="food-invite-page-error">
            {error}
          </div>
        )
      }


      {
        message &&
        (
          <div className="food-invite-page-message">
            {message}
          </div>
        )
      }


      {/* =====================================================
          OPEN FOOD INVITES — COMMUNITY DISCOVERY
      ===================================================== */}

      <section className="food-open-invites-section">
                  <div className="food-open-invites-grid">

                    {
                      openInvites.map(
                        invite => (

                          <article
                            key={invite.id}
                            className="food-open-invite-card"
                          >

                            <div className="food-open-card-top">

                              <div className="food-open-card-icon">
                                {
                                  getInviteIcon(
                                    invite.invite_type
                                  )
                                }
                              </div>

                              <span className="food-open-card-badge">
                                OPEN INVITE
                              </span>

                            </div>


                            <div className="food-open-card-body">

                              <span className="food-open-card-type">
                                {
                                  formatInviteType(
                                    invite.invite_type
                                  )
                                }
                              </span>

                              <h3>
                                {
                                  invite.title ||
                                  formatInviteType(
                                    invite.invite_type
                                  )
                                }
                              </h3>

                              {
                                invite.description &&
                                (
                                  <p>
                                    {invite.description}
                                  </p>
                                )
                              }


                              <div className="food-open-card-details">

                                <span>
                                  <CalendarDays size={15} />
                                  {formatDate(invite.start_at)}
                                </span>

                                {
                                  invite.location_label &&
                                  (
                                    <span>
                                      <MapPin size={15} />
                                      {invite.location_label}
                                    </span>
                                  )
                                }

                                {
                                  invite.cuisine &&
                                  (
                                    <span>
                                      <Utensils size={15} />
                                      {invite.cuisine}
                                    </span>
                                  )
                                }

                              </div>

                            </div>


                            <div className="food-open-card-footer">

                              <div className="food-open-host">

                                <div className="food-open-host-avatar">
                                  {
                                    (
                                      invite.creator_name ||
                                      "F"
                                    )
                                      .charAt(0)
                                      .toUpperCase()
                                  }
                                </div>

                                <div>
                                  <small>
                                    Hosted by
                                  </small>

                                  <strong>
                                    {
                                      invite.creator_name ||
                                      "FoodKindl Member"
                                    }
                                  </strong>
                                </div>

                              </div>


                              <button
                                type="button"
                                className="food-open-view-button"
                                onClick={() =>
                                  openInviteDetails(
                                    invite
                                  )
                                }
                              >
                                View Invite
                                <ArrowRight size={16} />
                              </button>

                            </div>

                          </article>
                        )
                      )
                    }

                  </div>
                
        

      </section>


      {/* =====================================================
          UPCOMING INVITES
      ===================================================== */}

      <section className="food-invite-my-section">

        <div className="food-invite-section-title">

          <span>
            MY FOOD INVITES
          </span>

          <h2>
            Upcoming food moments.
          </h2>

        </div>


        {
          loading
            ? (
                <div className="food-invite-empty">
                  Loading...
                </div>
              )
            : getUpcomingFoodMoments().length === 0
              ? (
                  <div className="food-invite-empty">

                    <ConciergeBell
                      size={32}
                    />

                    <h3>
                      No Food Invites yet
                    </h3>


                    <p>
                      Confirmed restaurant bookings and
                      Food Invites will appear here.
                    </p>

                  </div>
                )
              : (
                  <div className="food-invite-list">

                    {
                      getUpcomingFoodMoments().map(
                        moment => {

                          if (
                            moment.source ===
                            "booking"
                          ) {

                            const booking =
                              moment.data;


                            return (

                              <button
                                key={
                                  moment.key
                                }
                                type="button"
                                className="food-invite-row food-invite-booking-row"
                                onClick={() => {

                                  if (
                                    booking.restaurant
                                  ) {

                                    openRestaurantDetails({
                                      id:
                                        booking.restaurant,
                                    });
                                  }

                                }}
                              >

                                <div className="food-invite-row-icon">

                                  <Utensils
                                    size={24}
                                  />

                                </div>


                                <div className="food-invite-row-main">

                                  <strong>

                                    {
                                      booking.restaurant_name ||
                                      "Restaurant booking"
                                    }

                                  </strong>


                                  <span>

                                    <Check
                                      size={13}
                                    />

                                    Booking confirmed by FoodKindl

                                  </span>

                                </div>


                                <div className="food-invite-row-time">

                                  <CalendarDays
                                    size={16}
                                  />

                                  {
                                    booking.booking_date
                                      ? new Date(
                                          `${booking.booking_date}T${booking.booking_time || "00:00:00"}`
                                        ).toLocaleString(
                                          "en-IN",
                                          {
                                            dateStyle:
                                              "medium",

                                            timeStyle:
                                              "short",
                                          }
                                        )
                                      : "Date to be confirmed"
                                  }

                                </div>


                                <div className="food-invite-booking-status">

                                  <span>
                                    CONFIRMED
                                  </span>

                                  {
                                    booking.booking_reference &&
                                    (
                                      <small>
                                        {
                                          booking.booking_reference
                                        }
                                      </small>
                                    )
                                  }

                                </div>


                                <ChevronRight
                                  size={18}
                                />

                              </button>

                            );
                          }


                          const invite =
                            moment.data;


                          return (

                            <button
                              key={
                                moment.key
                              }
                              type="button"
                              className="food-invite-row"
                              onClick={() =>
                                openInviteDetails(
                                  invite
                                )
                              }
                            >

                              <div className="food-invite-row-icon">

                                {
                                  getInviteIcon(
                                    invite.invite_type
                                  )
                                }

                              </div>


                              <div className="food-invite-row-main">

                                <strong>

                                  {
                                    invite.title ||
                                    formatInviteType(
                                      invite.invite_type
                                    )
                                  }

                                </strong>


                                <span>

                                  {
                                    invite.is_creator
                                      ? "Created by you"
                                      : `Invited by ${
                                          invite.creator_name ||
                                          "FoodKindl Member"
                                        }`
                                  }

                                </span>

                              </div>


                              <div className="food-invite-row-time">

                                <CalendarDays
                                  size={16}
                                />

                                {
                                  formatDate(
                                    invite.start_at
                                  )
                                }

                              </div>


                              <ChevronRight
                                size={18}
                              />

                            </button>

                          );
                        }
                      )
                    }

                  </div>
                )
        }

      </section>


      {/* =====================================================
          INVITE TYPES
      ===================================================== */}

      <section className="food-invite-types-section">

        <div className="food-invite-section-title">

          <span>
            CREATE AN INVITE
          </span>

          <h2>
            Choose your food moment.
          </h2>

        </div>


        <div className="food-invite-types-grid">

          {
            INVITE_TYPES.map(
              type => {

                const Icon =
                  type.icon;


                return (

                  <button
                    key={type.id}
                    type="button"
                    className="food-invite-type-card"
                    onClick={() =>
                      openCreate(
                        type.id
                      )
                    }
                  >

                    <span className="food-invite-type-icon">

                      <Icon size={30} />

                    </span>


                    <h3>
                      {type.title}
                    </h3>


                    <p>
                      {type.description}
                    </p>


                    <ArrowRight
                      size={19}
                    />

                  </button>

                );
              }
            )
          }

        </div>

      </section>


      {/* =====================================================
          HOW IT WORKS
      ===================================================== */}

      <section className="food-invite-how">

        <div className="food-invite-section-title">

          <span>
            HOW IT WORKS
          </span>

          <h2>
            From connection to table.
          </h2>

        </div>


        <div className="food-invite-how-grid">

          <article>
            <span>01</span>
            <Plus />
            <h3>Create Invite</h3>
          </article>


          <article>
            <span>02</span>
            <UserPlus />
            <h3>Invite People</h3>
          </article>


          <article>
            <span>03</span>
            <Check />
            <h3>Accept & Confirm</h3>
          </article>


          <article>
            <span>04</span>
            <UsersRound />
            <h3>Meet Through Food</h3>
          </article>

        </div>

      </section>


      {/* =====================================================
          CREATE MODAL
      ===================================================== */}

      {
        showCreate &&
        !selectedRestaurant &&
        (

          <div className="food-invite-modal-backdrop">

            <div
              className={
                form.invite_type ===
                  "dine_out"
                  ? "food-invite-create-shell dine-out"
                  : "food-invite-create-shell"
              }
            >

              {/* =================================================
                  FORM
              ================================================= */}

              <div className="food-invite-create-modal">

                <div className="food-invite-create-header">
  <div>
    <span>Create invite</span>
    <h2>Plan something worth showing up for.</h2>
    <p>
      Pick the kind of food moment, add the details, and invite the
      right people.
    </p>
  </div>

  {/* Top-right close button */}
  <button
    type="button"
    className="food-invite-create-close"
    onClick={closeCreate}
    aria-label="Close create invite"
    title="Close"
  >
    ×
  </button>
</div>


                <form
                  className="food-invite-form"
                  onSubmit={
                    event => {
                      event.preventDefault();
                    }
                  }
                >

                  {/* =================================================
                      EXPERIENCE
                  ================================================= */}

                  <div className="food-invite-form-section">

                    <div className="food-invite-form-section-heading">

                      <span>
                        01
                      </span>


                      <div>

                        <strong>
                          Choose the experience
                        </strong>


                        <small>
                          How would you like to meet?
                        </small>

                      </div>

                    </div>


                    <div className="food-invite-type-selector">

                      <button
                        type="button"
                        className={
                          form.invite_type ===
                            "cook_together"
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          updateField(
                            "invite_type",
                            "cook_together"
                          )
                        }
                      >

                        <Home size={19} />

                        Cook Together

                      </button>


                      <button
                        type="button"
                        className={
                          form.invite_type ===
                            "dine_out"
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          updateField(
                            "invite_type",
                            "dine_out"
                          )
                        }
                      >

                        <Utensils size={19} />

                        Dine Out

                      </button>


                      <button
                        type="button"
                        className={
                          form.invite_type ===
                            "food_walk"
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          updateField(
                            "invite_type",
                            "food_walk"
                          )
                        }
                      >

                        <Footprints size={19} />

                        Food Walk

                      </button>

                    </div>

                  </div>


                  {/* =================================================
                      FOOD DETAILS
                  ================================================= */}

                  <div className="food-invite-form-section">

                    <div className="food-invite-form-section-heading">

                      <span>
                        02
                      </span>


                      <div>

                        <strong>
                          Food details
                        </strong>


                        <small>
                          Tell your invitees what you're planning.
                        </small>

                      </div>

                    </div>


                    <label>

                      Invite title

                      <input
                        type="text"
                        value={
                          form.title
                        }
                        onChange={event =>
                          updateField(
                            "title",
                            event.target.value
                          )
                        }
                        placeholder="Saturday Kerala dinner"
                      />

                    </label>


                    <label>

                      Cuisine

                      <select
                        value={
                          form.cuisine
                        }
                        onChange={event =>
                          updateField(
                            "cuisine",
                            event.target.value
                          )
                        }
                      >

                        {
                          CUISINE_OPTIONS.map(
                            option => (
                              <option
                                key={
                                  option.value ||
                                  "select-cuisine"
                                }
                                value={
                                  option.value
                                }
                              >
                                {
                                  option.label
                                }
                              </option>
                            )
                          )
                        }

                      </select>

                    </label>

                  </div>


                  {/* =================================================
                      PEOPLE
                  ================================================= */}

                  <div className="food-invite-form-section">

                    <div className="food-invite-form-section-heading">

                      <span>
                        03
                      </span>


                      <div>

                        <strong>
                          Invite people
                        </strong>


                        <small>
                          {
                            form.is_open
                              ? "Optional — you can still directly invite your connections."
                              : "Select at least one FoodKindl connection."
                          }
                        </small>

                      </div>

                    </div>


                    <div className="food-invite-connections">

                      {
                        connections.length === 0
                          ? (
                              <p>
                                No available connections.
                              </p>
                            )
                          : connections.map(
                              connection => {

                                const member =
                                  getConnectionMember(
                                    connection
                                  );


                                if (!member) {
                                  return null;
                                }


                                const memberName =
                                  member.full_name ||
                                  [
                                    member.first_name,
                                    member.last_name,
                                  ]
                                    .filter(Boolean)
                                    .join(" ") ||
                                  member.email ||
                                  "FoodKindl Member";


                                const selected =
                                  form.recipient_user_ids.some(
                                    id =>
                                      Number(id) ===
                                      Number(member.id)
                                  );


                                return (

                                  <button
                                    key={member.id}
                                    type="button"
                                    className={
                                      selected
                                        ? "food-invite-person selected"
                                        : "food-invite-person"
                                    }
                                    onClick={() =>
                                      toggleRecipient(
                                        member.id
                                      )
                                    }
                                  >

                                    <strong>
                                      {memberName}
                                    </strong>


                                    {
                                      selected
                                        ? (
                                            <Check
                                              size={17}
                                            />
                                          )
                                        : (
                                            <Plus
                                              size={17}
                                            />
                                          )
                                    }

                                  </button>

                                );
                              }
                            )
                      }

                    </div>


                    <label>

                      Maximum participants

                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={
                          form.max_participants
                        }
                        onChange={event =>
                          updateField(
                            "max_participants",
                            event.target.value
                          )
                        }
                      />

                    </label>

                  </div>


                  {/* =================================================
                      WHEN
                  ================================================= */}

                  <div className="food-invite-form-section">

                    <div className="food-invite-form-section-heading">

                      <span>
                        04
                      </span>

                      <div>

                        <strong>
                          When?
                        </strong>

                        <small>
                          Pick a date and choose a 12-hour time.
                        </small>

                      </div>

                    </div>


                    <div className="food-invite-date-time-grid food-invite-date-time-grid-v2">

                      <label className="food-invite-date-field">

                        Date

                        <div className="food-invite-date-control">

                          <CalendarDays size={18} />

                          <input
                            type="date"
                            required
                            value={form.invite_date}
                            min={
                              new Date()
                                .toISOString()
                                .slice(
                                  0,
                                  10
                                )
                            }
                            onChange={event =>
                              updateField(
                                "invite_date",
                                event.target.value
                              )
                            }
                            onClick={event =>
                              event.currentTarget
                                .showPicker?.()
                            }
                          />

                        </div>

                      </label>


                      <label className="food-invite-time-field">

                        Time

                        <div className="food-invite-time-control">

                          <div className="food-invite-time-icon">
                            <Clock3 size={18} />
                          </div>


                          <div className="food-invite-time-dropdowns">

                            <select
                              aria-label="Hour"
                              value={
                                String(
                                  Number(
                                    form.invite_hour
                                  ) || 1
                                )
                              }
                              onChange={event =>
                                updateField(
                                  "invite_hour",
                                  event.target.value
                                )
                              }
                            >

                              {
                                Array.from(
                                  {
                                    length:
                                      12,
                                  },
                                  (
                                    _,
                                    index
                                  ) => {
                                    const hour =
                                      String(
                                        index + 1
                                      );

                                    return (
                                      <option
                                        key={hour}
                                        value={hour}
                                      >
                                        {hour}
                                      </option>
                                    );
                                  }
                                )
                              }

                            </select>


                            <span className="food-invite-time-colon">
                              :
                            </span>


                            <select
                              aria-label="Minutes"
                              value={
                                form.invite_minute
                              }
                              onChange={event =>
                                updateField(
                                  "invite_minute",
                                  event.target.value
                                )
                              }
                            >

                              {
                                [
                                  "00",
                                  "15",
                                  "30",
                                  "45",
                                ].map(
                                  minute => (
                                    <option
                                      key={minute}
                                      value={minute}
                                    >
                                      {minute}
                                    </option>
                                  )
                                )
                              }

                            </select>

                          </div>


                          <div className="food-invite-ampm food-invite-ampm-v2">

                            <button
                              type="button"
                              className={
                                form.invite_period ===
                                  "AM"
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                updateField(
                                  "invite_period",
                                  "AM"
                                )
                              }
                            >
                              AM
                            </button>


                            <button
                              type="button"
                              className={
                                form.invite_period ===
                                  "PM"
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                updateField(
                                  "invite_period",
                                  "PM"
                                )
                              }
                            >
                              PM
                            </button>

                          </div>

                        </div>


                        <small className="food-invite-time-preview">
                          Selected time:{" "}
                          {
                            Number(
                              form.invite_hour
                            ) || 1
                          }
                          :
                          {
                            form.invite_minute
                          }{" "}
                          {
                            form.invite_period
                          }
                        </small>

                      </label>

                    </div>

                  </div>


                  {/* =================================================
    COOK TOGETHER
================================================= */}

{
  form.invite_type === "cook_together" && (
    <div className="food-invite-form-section">

      <div className="food-invite-form-section-heading">

        <span>
          05
        </span>

        <div>
          <strong>
            Cooking venue
          </strong>

          <small>
            Choose the place and contribution.
          </small>
        </div>

      </div>


      {/* ============================================
          VENUE TYPE
      ============================================ */}

      <div className="food-invite-venue-selector">

        <button
          type="button"
          className={
            form.cook_venue_type === "home"
              ? "active"
              : ""
          }
          onClick={() =>
            updateField(
              "cook_venue_type",
              "home"
            )
          }
        >
          <Home size={17} />

          Home
        </button>


        <button
          type="button"
          className={
            form.cook_venue_type === "clubhouse"
              ? "active"
              : ""
          }
          onClick={() =>
            updateField(
              "cook_venue_type",
              "clubhouse"
            )
          }
        >
          <UsersRound size={17} />

          Clubhouse
        </button>


        <button
          type="button"
          className={
            form.cook_venue_type === "other"
              ? "active"
              : ""
          }
          onClick={() =>
            updateField(
              "cook_venue_type",
              "other"
            )
          }
        >
          <MapPin size={17} />

          Other Venue
        </button>

      </div>


      {/* ============================================
          KITCHEN CONTRIBUTION
      ============================================ */}

      <div className="food-invite-kitchen-contribution">

        <div className="food-invite-kitchen-copy">

          <div className="food-invite-kitchen-icon">
            ₹
          </div>

          <div>
            <strong>
              Kitchen contribution
            </strong>

            <small>
              Optional contribution per person for ingredients,
              gas or kitchen use.
            </small>
          </div>

        </div>


        <div className="food-invite-kitchen-input">

          <span>
            ₹
          </span>

          <input
            type="number"
            min="0"
            step="1"
            value={
              form.kitchen_contribution
            }
            onChange={event =>
              updateField(
                "kitchen_contribution",
                event.target.value
              )
            }
            placeholder="0"
          />

          <small>
            per person
          </small>

        </div>

      </div>


      {/* ============================================
          AREA
      ============================================ */}

      <label>

        Area / locality

        <input
          type="text"
          value={
            form.location_label
          }
          onChange={event =>
            updateField(
              "location_label",
              event.target.value
            )
          }
          placeholder="Indiranagar, Bengaluru"
        />

      </label>


      {/* ============================================
          ADDRESS
      ============================================ */}

      <label>

        Exact address

        <textarea
          rows="3"
          value={
            form.private_address
          }
          onChange={event =>
            updateField(
              "private_address",
              event.target.value
            )
          }
          placeholder="Apartment, building, street..."
        />

      </label>

    </div>
  )
}
                  {/* =================================================
                      DINE OUT
                  ================================================= */}

                  {
                    form.invite_type ===
                      "dine_out" &&
                    (

                      <div className="food-invite-form-section">

                        <div className="food-invite-form-section-heading">

                          <span>
                            04
                          </span>


                          <div>

                            <strong>
                              Choose where to dine
                            </strong>


                            <small>
                              Choose a FoodKindl partner restaurant.
                            </small>

                          </div>

                        </div>


                        <div className="food-invite-venue-selector">

                          <button
                            type="button"
                            className={
                              form.dine_venue_type ===
                                "restaurant"
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              updateField(
                                "dine_venue_type",
                                "restaurant"
                              )
                            }
                          >

                            <Utensils size={18} />

                            Restaurant

                          </button>


                          <button
                            type="button"
                            className={
                              form.dine_venue_type ===
                                "cafe"
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              updateField(
                                "dine_venue_type",
                                "cafe"
                              )
                            }
                          >

                            <ConciergeBell size={18} />

                            Cafe

                          </button>

                        </div>


                        <label>

                          Selected place

                          <input
                            type="text"
                            value={
                              form.venue_name
                            }
                            onChange={event =>
                              updateField(
                                "venue_name",
                                event.target.value
                              )
                            }
                            placeholder="Choose a recommendation"
                          />

                        </label>


                        <label>

                          Area / locality

                          <input
                            type="text"
                            value={
                              form.location_label
                            }
                            onChange={event =>
                              updateField(
                                "location_label",
                                event.target.value
                              )
                            }
                            placeholder="Koramangala, Bengaluru"
                          />

                        </label>

                      </div>

                    )
                  }


                  {/* =================================================
                      FOOD WALK
                  ================================================= */}

                  {
                    form.invite_type ===
                      "food_walk" &&
                    (

                      <div className="food-invite-form-section food-walk-host-section">

                        <div className="food-invite-form-section-heading">

                          <span>
                            04
                          </span>


                          <div>

                            <strong>
                              Build your Food Walk
                            </strong>


                            <small>
                              Choose 2–5 stops and arrange the route.
                            </small>

                          </div>

                        </div>


                        <FoodWalkPlanner
                          locationLabel={
                            form.location_label
                          }

                          destination={
                            form.food_walk_destination ||
                            ""
                          }

                          cuisine={
                            form.cuisine
                          }

                          stops={
                            form.food_walk_stops
                          }

                          onLocationChange={
                            value =>
                              updateField(
                                "location_label",
                                value
                              )
                          }

                          onDestinationChange={
                            value =>
                              updateField(
                                "food_walk_destination",
                                value
                              )
                          }

                          onCuisineChange={
                            value =>
                              updateField(
                                "cuisine",
                                value
                              )
                          }

                          onStopsChange={
                            value =>
                              updateField(
                                "food_walk_stops",
                                value
                              )
                          }
                        />
                      </div>

                    )
                  }


                  {/* =================================================
                      OPEN / COMMUNITY VISIBILITY
                  ================================================= */}

                  <div className="food-invite-form-section">

                    {/* <div className="food-invite-form-section-heading">

                      <span>
                        06
                      </span>

                      <div>

                        <strong>
                          Who can discover this invite?
                        </strong>

                        <small>
                          Make it public to the FoodKindl community or
                          keep it limited to selected connections.
                        </small>

                      </div>

                    </div> */}

                  </div>


                  {/* =================================================
                      MESSAGE
                  ================================================= */}

                  <div className="food-invite-form-section">

                    <div className="food-invite-form-section-heading">

                      <span>
                        07
                      </span>


                      <div>

                        <strong>
                          Add a message
                        </strong>


                        <small>
                          Make your invitation personal.
                        </small>

                      </div>

                    </div>


                    <textarea
                      rows="4"
                      value={
                        form.description
                      }
                      onChange={event =>
                        updateField(
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Would you like to join me?"
                    />

                  </div>


                  {/* =================================================
                      FOOTER
                  ================================================= */}

                  {
                    error &&
                    (
                      <div className="food-invite-submit-error">
                        {error}
                      </div>
                    )
                  }


                  <div className="food-invite-create-footer">

                    <button
                      type="button"
                      className="food-invite-create-cancel"
                      onClick={closeCreate}
                    >
                      Cancel
                    </button>


                    <button
                      type="button"
                      className="food-invite-submit"
                      disabled={saving}
                      onClick={
                        () =>
                          createInvite()
                      }
                    >

                      <ConciergeBell
                        size={18}
                      />

                      {
                        saving
                          ? "Sending..."
                          : "Send Food Invite"
                      }

                    </button>

                  </div>

                </form>

              </div>


              {/* =================================================
                  RIGHT SIDE — DINE OUT MAP
              ================================================= */}

              {
                form.invite_type ===
                  "dine_out" &&
                (
                  <DineOutMapPanel
                    restaurants={
                      recommendedRestaurants
                    }
                    selectedVenueName={
                      form.venue_name
                    }
                    onSelectRestaurant={
                      restaurant =>
                        selectRestaurant(
                          restaurant
                        )
                    }
                    onOpenRestaurant={
                      restaurant =>
                        openRestaurantDetails(
                          restaurant
                        )
                    }
                    onSuggestPlace={() => {
                      setShowRestaurantSubmission(
                        true
                      );
                    }}
                  />
                )
              }

            </div>

          </div>

        )
      }


      {/* =========================================================
    RESTAURANT DETAIL + BOOKING
========================================================= */}

{
  selectedRestaurant &&
  (

    <div className="food-invite-modal-backdrop">

      <div className="foodkindl-restaurant-detail-modal">


        {/* =================================================
            CLOSE
        ================================================= */}

        <button
          type="button"
          className="foodkindl-restaurant-close"
          onClick={() => {

            setSelectedRestaurant(null);

            setActiveRestaurantImage("");

            setBookingSuccess(null);

          }}
        >

          <X size={20} />

        </button>


        {/* =================================================
            HERO IMAGE
        ================================================= */}

        <div className="foodkindl-restaurant-hero">

          {
            activeRestaurantImage
              ? (

                  <img
                    src={
                      activeRestaurantImage
                    }
                    alt={
                      selectedRestaurant.name
                    }
                  />

                )
              : (

                  <div className="foodkindl-restaurant-image-placeholder">

                    <Utensils size={54} />

                  </div>

                )
          }


          {
            (
              [
                selectedRestaurant.image_url,
                ...(Array.isArray(selectedRestaurant.images)
                  ? selectedRestaurant.images.map(
                      image => image.image_url
                    )
                  : []),
              ]
                .filter(Boolean)
                .filter(
                  (value, index, array) =>
                    array.indexOf(value) === index
                )
                .length > 1
            ) &&
            (

              <div className="foodkindl-restaurant-gallery-strip">

                {
                  [
                    selectedRestaurant.image_url,
                    ...(Array.isArray(selectedRestaurant.images)
                      ? selectedRestaurant.images.map(
                          image => image.image_url
                        )
                      : []),
                  ]
                    .filter(Boolean)
                    .filter(
                      (value, index, array) =>
                        array.indexOf(value) === index
                    )
                    .map(
                      (imageUrl, index) => (

                        <button
                          key={
                            `${imageUrl}-${index}`
                          }
                          type="button"
                          className={
                            activeRestaurantImage === imageUrl
                              ? "foodkindl-restaurant-gallery-thumb active"
                              : "foodkindl-restaurant-gallery-thumb"
                          }
                          onClick={() =>
                            setActiveRestaurantImage(
                              imageUrl
                            )
                          }
                        >

                          <img
                            src={
                              imageUrl
                            }
                            alt={
                              `${selectedRestaurant.name} ${index + 1}`
                            }
                          />

                        </button>

                      )
                    )
                }

              </div>

            )
          }


          <div className="foodkindl-restaurant-hero-overlay" />


          <div className="foodkindl-restaurant-hero-content">

            {
              selectedRestaurant
                .is_foodkindl_partner === true &&
              (

                <span className="foodkindl-restaurant-partner">

                  <Check size={12} />

                  FOODKINDL PARTNER

                </span>

              )
            }


            <h2>
              {selectedRestaurant.name}
            </h2>


            <div className="foodkindl-restaurant-hero-meta">

              {
                selectedRestaurant.rating &&
                (

                  <span className="foodkindl-rating">

                    <Star
                      size={14}
                      fill="currentColor"
                    />

                    {selectedRestaurant.rating}

                  </span>

                )
              }


              {
                selectedRestaurant.cuisine &&
                (

                  <span>
                    {selectedRestaurant.cuisine}
                  </span>

                )
              }


              {
                selectedRestaurant.restaurant_type &&
                (

                  <span>
                    {
                      selectedRestaurant.restaurant_type ===
                        "cafe"
                        ? "Cafe"
                        : "Restaurant"
                    }
                  </span>

                )
              }

            </div>

          </div>

        </div>


        {/* =================================================
            BODY
        ================================================= */}

        <div className="foodkindl-restaurant-detail-body">


          {/* =================================================
              LEFT
          ================================================= */}

          <div className="foodkindl-restaurant-main">


            {/* ABOUT */}

            <section className="foodkindl-restaurant-section">

              <span className="foodkindl-section-label">
                ABOUT
              </span>

              <h3>
                About this place
              </h3>


              <p className="foodkindl-restaurant-description">

                {
                  selectedRestaurant.description ||
                  `${selectedRestaurant.name} is a FoodKindl partner ${
                    selectedRestaurant.restaurant_type ===
                      "cafe"
                      ? "cafe"
                      : "restaurant"
                  }.`
                }

              </p>

            </section>


            {/* =================================================
                QUICK INFO
            ================================================= */}

            <section className="foodkindl-restaurant-info-grid">


              {/* CUISINE */}

              <div className="foodkindl-restaurant-info-card">

                <Utensils size={20} />

                <div>

                  <span>
                    CUISINE
                  </span>

                  <strong>

                    {
                      selectedRestaurant.cuisine ||
                      "Not specified"
                    }

                  </strong>

                </div>

              </div>


              {/* COST */}

              <div className="foodkindl-restaurant-info-card">

                <span className="foodkindl-rupee-icon">
                  ₹
                </span>

                <div>

                  <span>
                    COST FOR TWO
                  </span>

                  <strong>

                    {
                      selectedRestaurant.average_cost_for_two
                        ? `₹${selectedRestaurant.average_cost_for_two}`
                        : selectedRestaurant.price_range ||
                          "Not specified"
                    }

                  </strong>

                </div>

              </div>


              {/* TIMINGS */}

              <div className="foodkindl-restaurant-info-card">

                <Clock3 size={20} />

                <div>

                  <span>
                    OPENING HOURS
                  </span>

                  <strong>

                    {
                      selectedRestaurant.opening_time
                        ? (
                            `${formatTime(
                              selectedRestaurant.opening_time
                            )} – ${
                              formatTime(
                                selectedRestaurant.closing_time
                              ) ||
                              "Closing time unavailable"
                            }`
                          )
                        : "Not specified"
                    }

                  </strong>

                </div>

              </div>


              {/* TYPE */}

              <div className="foodkindl-restaurant-info-card">

                <ConciergeBell size={20} />

                <div>

                  <span>
                    TYPE
                  </span>

                  <strong>

                    {
                      selectedRestaurant.restaurant_type ===
                        "cafe"
                        ? "Cafe"
                        : "Restaurant"
                    }

                  </strong>

                </div>

              </div>

            </section>


            {/* =================================================
                MENU
            ================================================= */}

            <section className="foodkindl-restaurant-section">

              <div className="foodkindl-section-heading-row">

                <div>

                  <span className="foodkindl-section-label">
                    MENU
                  </span>

                  <h3>
                    Popular dishes
                  </h3>

                </div>

              </div>


              {
                Array.isArray(
                  selectedRestaurant.menu_items
                ) &&
                selectedRestaurant.menu_items.length >
                  0
                  ? (

                      <div className="foodkindl-menu-list">

                        {
                          selectedRestaurant.menu_items.map(
                            (
                              menuItem,
                              index
                            ) => (

                              <div
                                key={
                                  menuItem.id ||
                                  index
                                }
                                className="foodkindl-menu-item"
                              >

                                <div className="foodkindl-menu-item-main">

                                  {
                                    menuItem.image_url &&
                                    (

                                      <img
                                        src={
                                          menuItem.image_url
                                        }
                                        alt={
                                          menuItem.name
                                        }
                                      />

                                    )
                                  }


                                  <div>

                                    <div className="foodkindl-menu-name-row">

                                      <strong>
                                        {menuItem.name}
                                      </strong>


                                      {
                                        menuItem.category &&
                                        (
                                          <span className="foodkindl-menu-category">
                                            {
                                              String(menuItem.category)
                                                .replaceAll("_", " ")
                                            }
                                          </span>
                                        )
                                      }


                                      {
                                        menuItem.is_vegetarian ===
                                          true &&
                                        (

                                          <span className="foodkindl-veg-badge">
                                            VEG
                                          </span>

                                        )
                                      }


                                      {
                                        menuItem.is_vegetarian ===
                                          false &&
                                        (

                                          <span className="foodkindl-nonveg-badge">
                                            NON-VEG
                                          </span>

                                        )
                                      }

                                    </div>


                                    {
                                      menuItem.description &&
                                      (

                                        <p>
                                          {menuItem.description}
                                        </p>

                                      )
                                    }

                                  </div>

                                </div>


                                <strong className="foodkindl-menu-price">

                                  {
                                    menuItem.price
                                      ? `₹${menuItem.price}`
                                      : "Price unavailable"
                                  }

                                </strong>

                              </div>

                            )
                          )
                        }

                      </div>

                    )
                  : (

                      <div className="foodkindl-menu-empty">

                        <Utensils size={22} />

                        <div>

                          <strong>
                            Menu coming soon
                          </strong>

                          <span>
                            The restaurant has not added
                            its FoodKindl menu yet.
                          </span>

                        </div>

                      </div>

                    )
              }

            </section>


            {/* =================================================
                ADDRESS
            ================================================= */}

            <section className="foodkindl-restaurant-section">

              <span className="foodkindl-section-label">
                LOCATION
              </span>

              <h3>
                Where you'll meet
              </h3>


              <div className="foodkindl-restaurant-location-card">

                <MapPin size={22} />


                <div>

                  <strong>

                    {
                      [
                        selectedRestaurant.address,
                        selectedRestaurant.locality,
                        selectedRestaurant.city,
                        selectedRestaurant.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                      "Address not available"
                    }

                  </strong>


                  {
                    selectedRestaurant.phone_number &&
                    (

                      <a
                        href={
                          `tel:${selectedRestaurant.phone_number}`
                        }
                      >

                        <Phone size={14} />

                        {
                          selectedRestaurant.phone_number
                        }

                      </a>

                    )
                  }

                </div>

              </div>


              {
                selectedRestaurant.location_url &&
                (

                  <a
                    className="foodkindl-location-button"
                    href={
                      selectedRestaurant.location_url
                    }
                    target="_blank"
                    rel="noreferrer"
                  >

                    <Navigation size={17} />

                    Open location

                  </a>

                )
              }

            </section>


            {/* =================================================
                FACILITIES
            ================================================= */}

            {
              Array.isArray(
                selectedRestaurant.facilities
              ) &&
              selectedRestaurant.facilities.length >
                0 &&
              (

                <section className="foodkindl-restaurant-section">

                  <span className="foodkindl-section-label">
                    FEATURES
                  </span>

                  <h3>
                    Good to know
                  </h3>


                  <div className="foodkindl-facility-list">

                    {
                      selectedRestaurant.facilities.map(
                        (
                          facility,
                          index
                        ) => (

                          <span
                            key={
                              index
                            }
                          >

                            <Check size={13} />

                            {facility}

                          </span>

                        )
                      )
                    }

                  </div>

                </section>

              )
            }

          </div>


          {/* =================================================
              RIGHT BOOKING PANEL
          ================================================= */}

          <aside className="foodkindl-restaurant-booking-panel">


            {/* SELECT RESTAURANT */}

            <button
              type="button"
              className="foodkindl-select-restaurant-button"
              onClick={() =>
                selectRestaurant(
                  selectedRestaurant
                )
              }
            >

              <Check size={17} />

              Select for Food Invite

            </button>


            {
              selectedRestaurant
                .accepts_foodkindl_booking ===
                true &&
              (

                <div className="foodkindl-booking-section">

                  <span className="foodkindl-section-label">
                    BOOK THROUGH FOODKINDL
                  </span>


                  <h3>
                    Reserve your table
                  </h3>


                  <p>
                    Send a table request directly
                    through FoodKindl.
                  </p>


                  {
                    bookingSuccess
                      ? (

                          <div className="foodkindl-booking-success">

                            <div className="foodkindl-booking-success-icon">

                              <Check size={22} />

                            </div>


                            <strong>
                              Request sent
                            </strong>


                            <span>
                              Waiting for restaurant confirmation.
                            </span>

                          </div>

                        )
                      : (

                          <form
                            className="foodkindl-booking-form"
                            onSubmit={
                              bookRestaurant
                            }
                          >


                            {/* DATE */}

                            <label>

                              Date

                              <div className="foodkindl-booking-input">

                                <CalendarDays
                                  size={17}
                                />

                                <input
                                  type="date"
                                  required
                                  value={
                                    bookingForm.booking_date
                                  }
                                  onChange={
                                    event =>
                                      updateBookingField(
                                        "booking_date",
                                        event.target.value
                                      )
                                  }
                                />

                              </div>

                            </label>


                            {/* TIME */}

                            <label>

                              Time

                              <div className="foodkindl-booking-time-row">

                                <select
                                  value={
                                    bookingForm.booking_hour
                                  }
                                  onChange={
                                    event =>
                                      updateBookingField(
                                        "booking_hour",
                                        event.target.value
                                      )
                                  }
                                >

                                  {
                                    Array.from(
                                      {
                                        length: 12,
                                      },
                                      (
                                        _,
                                        index
                                      ) => {

                                        const hour =
                                          String(
                                            index + 1
                                          ).padStart(
                                            2,
                                            "0"
                                          );


                                        return (

                                          <option
                                            key={
                                              hour
                                            }
                                            value={
                                              hour
                                            }
                                          >
                                            {hour}
                                          </option>

                                        );
                                      }
                                    )
                                  }

                                </select>


                                <span>
                                  :
                                </span>


                                <select
                                  value={
                                    bookingForm.booking_minute
                                  }
                                  onChange={
                                    event =>
                                      updateBookingField(
                                        "booking_minute",
                                        event.target.value
                                      )
                                  }
                                >

                                  <option value="00">
                                    00
                                  </option>

                                  <option value="15">
                                    15
                                  </option>

                                  <option value="30">
                                    30
                                  </option>

                                  <option value="45">
                                    45
                                  </option>

                                </select>


                                <button
                                  type="button"
                                  className="foodkindl-period-button"
                                  onClick={() =>
                                    updateBookingField(
                                      "booking_period",
                                      bookingForm.booking_period ===
                                        "AM"
                                        ? "PM"
                                        : "AM"
                                    )
                                  }
                                >

                                  {
                                    bookingForm.booking_period
                                  }

                                </button>

                              </div>

                            </label>


                            {/* GUESTS */}

                            <label>

                              Guests

                              <input
                                type="number"
                                min="1"
                                max="50"
                                value={
                                  bookingForm.guest_count
                                }
                                onChange={
                                  event =>
                                    updateBookingField(
                                      "guest_count",
                                      event.target.value
                                    )
                                }
                              />

                            </label>


                            {/* SPECIAL REQUEST */}

                            <label>

                              Special request

                              <textarea
                                rows="4"
                                value={
                                  bookingForm.special_request
                                }
                                onChange={
                                  event =>
                                    updateBookingField(
                                      "special_request",
                                      event.target.value
                                    )
                                }
                                placeholder="Window seat, child seat, accessibility requirement..."
                              />

                            </label>


                            <button
                              type="submit"
                              className="foodkindl-booking-submit"
                              disabled={
                                bookingSaving
                              }
                            >

                              <CalendarDays size={17} />

                              {
                                bookingSaving
                                  ? "Requesting..."
                                  : "Request Table"
                              }

                            </button>

                          </form>

                        )
                  }

                </div>

              )
            }

          </aside>

        </div>

      </div>

    </div>

  )
}

      {/* =====================================================
          FOOD INVITE DETAILS
      ===================================================== */}

      {
        selectedInvite &&
        !selectedRestaurant &&
        (

          <div className="food-invite-modal-backdrop">

            <div className="food-invite-detail-modal">

              <div className="food-invite-detail-header">

                <div className="food-invite-detail-icon">
                  {
                    getInviteIcon(
                      selectedInvite.invite_type
                    )
                  }
                </div>

                <div>
                  <span>
                    {
                      formatInviteType(
                        selectedInvite.invite_type
                      )
                    }
                  </span>

                  <h2>
                    {
                      selectedInvite.title ||
                      formatInviteType(
                        selectedInvite.invite_type
                      )
                    }
                  </h2>

                  {
                    selectedInvite.invite_type === "food_walk" &&
                    selectedInvite.location_label &&
                    (
                      <div className="food-invite-detail-route-chip">
                        <MapPin size={12} />
                        <span>
                          {selectedInvite.location_label}
                        </span>
                      </div>
                    )
                  }
                </div>

                <button
                  type="button"
                  className="food-invite-detail-close"
                  aria-label="Close Food Invite details"
                  title="Close"
                  onClick={() =>
                    setSelectedInvite(null)
                  }
                  disabled={responding}
                >
                  <X size={20} />
                </button>

              </div>


              <div className="food-invite-detail-body">

                <div className="food-invite-detail-row">
                  <UsersRound size={18} />

                  <div>
                    <span>
                      {
                        selectedInvite.is_creator
                          ? "Created by"
                          : "Invited by"
                      }
                    </span>

                    <strong>
                      {
                        selectedInvite.is_creator
                          ? "You"
                          : selectedInvite.creator_name ||
                            "FoodKindl Member"
                      }
                    </strong>
                  </div>
                </div>


                <div className="food-invite-detail-row">
                  <CalendarDays size={18} />

                  <div>
                    <span>
                      Date & time
                    </span>

                    <strong>
                      {
                        formatDate(
                          selectedInvite.start_at
                        )
                      }
                    </strong>
                  </div>
                </div>


                {
                  selectedInvite.cuisine &&
                  (
                    <div className="food-invite-detail-row">

                      <Utensils size={18} />

                      <div>
                        <span>
                          Cuisine
                        </span>

                        <strong>
                          {
                            String(
                              selectedInvite.cuisine
                            ).replaceAll(
                              "_",
                              " "
                            )
                          }
                        </strong>
                      </div>

                    </div>
                  )
                }


                {
                  selectedInvite.location_label &&
                  (
                    <div className="food-invite-detail-row">

                      <MapPin size={18} />

                      <div>
                        <span>
                          Location
                        </span>

                        <strong>
                          {
                            selectedInvite.location_label
                          }
                        </strong>
                      </div>

                    </div>
                  )
                }


                {
                  selectedInvite.venue_name &&
                  (
                    <div className="food-invite-detail-row">

                      <ConciergeBell size={18} />

                      <div>
                        <span>
                          Venue
                        </span>

                        <strong>
                          {
                            selectedInvite.venue_name
                          }
                        </strong>
                      </div>

                    </div>
                  )
                }


                {
                  selectedInvite.max_participants &&
                  (
                    <div className="food-invite-detail-row">

                      <UsersRound size={18} />

                      <div>
                        <span>
                          Maximum participants
                        </span>

                        <strong>
                          {
                            selectedInvite.max_participants
                          }
                        </strong>
                      </div>

                    </div>
                  )
                }


                {/* =================================================
                    INVITED PEOPLE
                ================================================= */}

                {
                  Array.isArray(
                    selectedInvite.participants
                  ) &&
                  selectedInvite.participants.length >
                    0 &&
                  (
                    <div className="food-invite-detail-people">

                      <div className="food-invite-detail-people-heading">
                        <div>
                          <span className="food-invite-detail-people-label">
                            Invited people
                          </span>

                          <strong className="food-invite-detail-people-count">
                            {
                              selectedInvite.participants.length
                            }
                          </strong>
                        </div>

                        <small>
                          Tap a name to view profile
                        </small>
                      </div>


                      <div className="food-invite-detail-people-list">

                        {
                          selectedInvite.participants.map(
                            (
                              participant,
                              index
                            ) => {

                              const participantName =
                                getParticipantName(
                                  participant
                                );

                              const participantStatus =
                                getParticipantStatus(
                                  participant
                                );

                              const canOpenProfile =
                                Boolean(
                                  participant?.user_id
                                );

                              const statusClass =
                                String(
                                  participant?.status ||
                                  "pending"
                                ).toLowerCase();

                              return (
                                <div
                                  key={
                                    participant?.id ||
                                    participant?.user_id ||
                                    index
                                  }
                                  className="food-invite-detail-person"
                                >

                                  <button
                                    type="button"
                                    className="food-invite-detail-person-profile"
                                    disabled={
                                      !canOpenProfile
                                    }
                                    onClick={() =>
                                      openMemberProfile(
                                        participant
                                      )
                                    }
                                    title={
                                      canOpenProfile
                                        ? `View ${participantName}'s profile`
                                        : participantName
                                    }
                                  >

                                    <span className="food-invite-detail-person-copy">
                                      <strong>
                                        {participantName}
                                      </strong>

                                      {
                                        participant?.user_email &&
                                        (
                                          <small>
                                            {
                                              participant.user_email
                                            }
                                          </small>
                                        )
                                      }

                                      {
                                        canOpenProfile &&
                                        (
                                          <span className="food-invite-detail-person-view">
                                            View profile →
                                          </span>
                                        )
                                      }
                                    </span>

                                  </button>


                                  <span
                                    className={
                                      `food-invite-detail-person-status ${statusClass}`
                                    }
                                  >
                                    {participantStatus}
                                  </span>

                                </div>
                              );
                            }
                          )
                        }

                      </div>

                    </div>
                  )
                }


                {
                  selectedInvite.description &&
                  (
                    <div className="food-invite-detail-message">

                      <span>
                        Message
                      </span>

                      <p>
                        {
                          selectedInvite.description
                        }
                      </p>

                    </div>
                  )
                }


                {
                  selectedInvite.invite_type ===
                    "food_walk" &&
                  Array.isArray(
                    selectedInvite.food_walk_stops
                  ) &&
                  selectedInvite.food_walk_stops.length >
                    0 &&
                  (
                    <div className="food-invite-detail-walk">

                      <span>
                        FOOD WALK STOPS
                      </span>

                      {
                        selectedInvite.food_walk_stops.map(
                          (
                            stop,
                            index
                          ) => {

                            const stopName =
                              typeof stop === "string"
                                ? stop
                                : stop?.name ||
                                  `Stop ${index + 1}`;

                            return (
                              <div
                                key={
                                  `${stopName}-${index}`
                                }
                                className="food-invite-detail-stop"
                              >
                                <div>
                                  {index + 1}
                                </div>

                                <strong>
                                  {stopName}
                                </strong>
                              </div>
                            );
                          }
                        )
                      }

                    </div>
                  )
                }

              </div>


              <div className="food-invite-detail-footer">

                <button
                  type="button"
                  className="food-invite-create-cancel"
                  onClick={() =>
                    setSelectedInvite(null)
                  }
                  disabled={responding}
                >
                  Close
                </button>


                {
                  !selectedInvite.is_creator &&
                  (
                    !selectedInvite.my_participant_status ||
                    selectedInvite.my_participant_status ===
                      "invited" ||
                    selectedInvite.my_participant_status ===
                      "pending"
                  ) &&
                  (
                    <>
                      <button
                        type="button"
                        className="food-invite-decline-button"
                        disabled={responding}
                        onClick={() =>
                          respondToInvite(
                            "declined"
                          )
                        }
                      >
                        {
                          responding
                            ? "Please wait..."
                            : "Decline"
                        }
                      </button>


                      <button
                        type="button"
                        className="food-invite-accept-button"
                        disabled={responding}
                        onClick={() =>
                          respondToInvite(
                            "accepted"
                          )
                        }
                      >
                        <Check size={16} />

                        {
                          responding
                            ? "Accepting..."
                            : "Accept Invite"
                        }
                      </button>
                    </>
                  )
                }


                {
                  !selectedInvite.is_creator &&
                  selectedInvite.my_participant_status ===
                    "accepted" &&
                  (
                    <div className="food-invite-response-status accepted">
                      <Check size={16} />
                      Invite accepted
                    </div>
                  )
                }


                {
                  !selectedInvite.is_creator &&
                  selectedInvite.my_participant_status ===
                    "declined" &&
                  (
                    <div className="food-invite-response-status declined">
                      <X size={16} />
                      Invite declined
                    </div>
                  )
                }

              </div>

            </div>

          </div>

        )
      }


      {/* =====================================================
          RESTAURANT DETAIL LOADING
      ===================================================== */}

      {
        restaurantDetailsLoading &&
        !selectedRestaurant &&
        (
          <div className="food-invite-modal-backdrop">

            <div className="food-invite-restaurant-state">
              Loading restaurant details...
            </div>

          </div>
        )
      }


      {/* =====================================================
          RESTAURANT / CAFE / HOTEL SUBMISSION
      ===================================================== */}

      <RestaurantSubmissionModal
        open={
          showRestaurantSubmission
        }
        onClose={() => {
          setShowRestaurantSubmission(
            false
          );
        }}
        onSubmitted={() => {
          setShowRestaurantSubmission(
            false
          );

          if (
            form.invite_type ===
            "dine_out"
          ) {
            loadRecommendedRestaurants();
          }
        }}
        initialLocation={
          form.location_label || ""
        }
        initialCity=""
        initialType={
          form.dine_venue_type ===
          "cafe"
            ? "cafe"
            : "restaurant"
        }
      />

    </main>
  );
}