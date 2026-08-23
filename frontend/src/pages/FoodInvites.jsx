import {
  useEffect,
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

import api from "../api";

import {
  useAuth,
} from "../context/AuthContext";

import "../styles/food_invites.css";

import FoodWalkPlanner from "./FoodWalkPlanner";


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
    booking_hour: "07",
    booking_minute: "00",
    booking_period: "PM",

    guest_count: 2,

    special_request: "",
  };
}


// ============================================================
// COMPONENT
// ============================================================

export default function FoodInvites() {

  const {
    user,
  } = useAuth();


  const [
    invites,
    setInvites,
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
          "07",

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
        !Array.isArray(
          form.recipient_user_ids
        )
        ||
        form.recipient_user_ids.length ===
        0
      ) {

        throw new Error(
          "Please select at least one FoodKindl connection."
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


      await loadInvites();


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

  async function respondToInvite(
    responseValue
  ) {

    if (!selectedInvite?.id) {
      return;
    }


    try {

      setResponding(true);

      setError("");


      const response =
        await api.post(
          `/food-invites/${selectedInvite.id}/respond/`,
          {
            response:
              responseValue,
          }
        );


      if (response.data?.invite) {

        setSelectedInvite(
          response.data.invite
        );
      }


      setMessage(
        responseValue ===
          "accepted"
          ? "Food Invite accepted."
          : "Food Invite declined."
      );


      await loadInvites();

    } catch (requestError) {

      setError(
        getApiErrorMessage(
          requestError,
          "Unable to respond to Food Invite."
        )
      );

    } finally {

      setResponding(false);
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

                    <span>
                      CREATE
                    </span>


                    <h2>
                      New Food Invite
                    </h2>


                    <p>
                      Plan a food moment and invite people
                      from your FoodKindl connections.
                    </p>

                  </div>


                  <button
                    type="button"
                    onClick={
                      closeCreate
                    }
                  >

                    <X size={20} />

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
                      WHEN
                  ================================================= */}

                  <div className="food-invite-form-section">

                    <div className="food-invite-form-section-heading">

                      <span>
                        03
                      </span>


                      <div>

                        <strong>
                          When?
                        </strong>


                        <small>
                          Choose date and time.
                        </small>

                      </div>

                    </div>


                    <div className="food-invite-date-time-grid">

                      <label>

                        Date

                        <div className="food-invite-input-with-icon">

                          <CalendarDays
                            size={18}
                          />


                          <input
                            type="date"
                            required
                            value={
                              form.invite_date
                            }
                            onChange={event =>
                              updateField(
                                "invite_date",
                                event.target.value
                              )
                            }
                          />

                        </div>

                      </label>


                      <label>

                        Time

                        <div className="food-invite-time-selector">

                          <Clock3
                            size={18}
                          />


                          <select
                            value={
                              form.invite_hour
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
                                  length: 12,
                                },
                                (_, index) => {

                                  const hour =
                                    String(
                                      index + 1
                                    ).padStart(
                                      2,
                                      "0"
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


                          <strong>
                            :
                          </strong>


                          <select
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


                          <div className="food-invite-ampm">

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

                      </label>

                    </div>

                  </div>


                  {/* =================================================
                      COOK TOGETHER
                  ================================================= */}

                  {
                    form.invite_type ===
                      "cook_together" &&
                    (

                      <div className="food-invite-form-section">

                        <div className="food-invite-form-section-heading">

                          <span>
                            04
                          </span>


                          <div>

                            <strong>
                              Cooking venue
                            </strong>


                            <small>
                              Where will you cook together?
                            </small>

                          </div>

                        </div>


                        <div className="food-invite-venue-selector">

                          <button
                            type="button"
                            className={
                              form.cook_venue_type ===
                                "home"
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
                              form.cook_venue_type ===
                                "clubhouse"
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
                              form.cook_venue_type ===
                                "other"
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


                        <label>

                          Kitchen contribution

                          <input
                            type="number"
                            min="0"
                            value={
                              form.kitchen_contribution
                            }
                            onChange={event =>
                              updateField(
                                "kitchen_contribution",
                                event.target.value
                              )
                            }
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
                      PEOPLE
                  ================================================= */}

                  <div className="food-invite-form-section">

                    <div className="food-invite-form-section-heading">

                      <span>
                        05
                      </span>


                      <div>

                        <strong>
                          Invite people
                        </strong>


                        <small>
                          Select your FoodKindl connections.
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
                      MESSAGE
                  ================================================= */}

                  <div className="food-invite-form-section">

                    <div className="food-invite-form-section-heading">

                      <span>
                        06
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
                  RESTAURANT RECOMMENDATIONS
              ================================================= */}

              {
                form.invite_type ===
                  "dine_out" &&
                (

                  <aside className="food-invite-restaurant-sidebar">

                    <div className="food-invite-restaurant-sidebar-header">

                      <span>
                        FOODKINDL PARTNERS
                      </span>


                      <h2>
                        Recommended places
                      </h2>


                      <p>
                        Showing active FoodKindl partner
                        restaurants that accept FoodKindl bookings.
                      </p>

                    </div>


                    {
                      restaurantsLoading
                        ? (
                            <div className="food-invite-restaurant-state">

                              Finding partner restaurants...

                            </div>
                          )
                        : recommendedRestaurants.length > 0
                          ? (
                              <div className="food-invite-restaurant-list">

                                {
                                  recommendedRestaurants.map(
                                    restaurant => (

                                      <RestaurantCard
                                        key={
                                          restaurant.id
                                        }
                                        restaurant={
                                          restaurant
                                        }
                                      />

                                    )
                                  )
                                }

                              </div>
                            )
                          : (
                              <div className="food-invite-restaurant-state">

                                <Utensils
                                  size={28}
                                />


                                <strong>
                                  No partner restaurants found
                                </strong>


                                <span>
                                  Try changing restaurant type,
                                  cuisine or locality.
                                </span>

                              </div>
                            )
                    }

                  </aside>

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

    </main>
  );
}