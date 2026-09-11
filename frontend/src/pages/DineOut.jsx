import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  Users,
  Utensils,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api";

import PeopleSelector from "./PeopleSelector";

import LocationAutocomplete from "./LocationAutocomplete";

import DineOutInvite from "./DineOutInvite";

import DineOutRestaurantMap from "../components/DineOutRestaurantMap";

import "../styles/FoodInvites.css";
import "../styles/dineout_unique.css";


const INVITES_ENDPOINT =
  "/food-invites/";

const RESTAURANT_SEARCH_ENDPOINT =
  "/restaurants/recommendations/";


// ============================================================
// INITIAL FORM
// ============================================================

const INITIAL_FORM = {
  title: "",

  description: "",

  // ----------------------------------------------------------
  // LOCATION SEARCH
  // ----------------------------------------------------------

  city: "",

  search_latitude: null,

  search_longitude: null,

  // ----------------------------------------------------------
  // RESTAURANT DISCOVERY
  // ----------------------------------------------------------

  food_query: "",

  cuisine: "",

  dine_venue_type: "",

  // ----------------------------------------------------------
  // SELECTED RESTAURANT
  // ----------------------------------------------------------

  venue_name: "",

  restaurant_name: "",

  restaurant_address: "",

  location_label: "",

  latitude: null,

  longitude: null,

  // ----------------------------------------------------------
  // INVITE
  // ----------------------------------------------------------

  start_date: "",
  start_hour: "07",
  start_minute: "00",
  start_ampm: "PM",

  end_date: "",
  end_hour: "09",
  end_minute: "00",
  end_ampm: "PM",

  max_participants: 4,

  budget_level: "₹₹",

  dietary_notes: "",

  booking_status:
    "not_booked",

  table_notes: "",

  verified_only: false,

  women_only: false,

  recipients: [],
};


// ============================================================
// ERROR HELPER
// ============================================================

function readError(
  error,
  fallback =
    "Something went wrong."
) {
  const data =
    error?.response?.data;


  if (
    typeof data?.detail ===
    "string"
  ) {
    return data.detail;
  }


  if (
    typeof data?.error ===
    "string"
  ) {
    return data.error;
  }


  if (
    typeof data?.message ===
    "string"
  ) {
    return data.message;
  }


  if (
    data &&
    typeof data ===
      "object"
  ) {

    const first =
      Object.entries(
        data
      )[0];


    if (first) {

      const [
        key,
        value,
      ] = first;


      if (
        Array.isArray(
          value
        )
      ) {
        return `${key}: ${value.join(
          ", "
        )}`;
      }


      return `${key}: ${String(
        value
      )}`;
    }
  }


  if (
    error?.message ===
    "Network Error"
  ) {
    return (
      "Unable to connect to " +
      "the FoodKindl server."
    );
  }


  return fallback;
}


// ============================================================
// DATE / TIME HELPERS
// ============================================================

function buildDateTime(
  date,
  hour,
  minute,
  ampm
) {
  if (!date) {
    return null;
  }

  let hour24 =
    Number(hour);

  const minuteNumber =
    Number(minute);

  if (
    !Number.isFinite(hour24) ||
    hour24 < 1 ||
    hour24 > 12 ||
    !Number.isFinite(minuteNumber) ||
    minuteNumber < 0 ||
    minuteNumber > 59
  ) {
    return null;
  }

  if (
    ampm === "AM" &&
    hour24 === 12
  ) {
    hour24 = 0;
  }

  if (
    ampm === "PM" &&
    hour24 !== 12
  ) {
    hour24 += 12;
  }

  const formattedHour =
    String(hour24)
      .padStart(2, "0");

  const formattedMinute =
    String(minuteNumber)
      .padStart(2, "0");

  const value =
    `${date}T${formattedHour}:${formattedMinute}:00`;

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}


// ============================================================
// DINE OUT
// ============================================================

export default function DineOut() {

  const navigate =
    useNavigate();


  // =========================================================
  // FORM
  // =========================================================

  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM
  );


  // =========================================================
  // PROFILE
  // =========================================================

  const [
    profile,
    setProfile,
  ] = useState(null);


  // =========================================================
  // RESTAURANT RESULTS
  // =========================================================

  const [
    restaurants,
    setRestaurants,
  ] = useState([]);


  const [
    restaurantsLoading,
    setRestaurantsLoading,
  ] = useState(false);


  const [
    restaurantsError,
    setRestaurantsError,
  ] = useState("");


  const [
    restaurantSearchDone,
    setRestaurantSearchDone,
  ] = useState(false);


  // =========================================================
  // SELECTED RESTAURANT
  // =========================================================

  const [
    selectedRestaurant,
    setSelectedRestaurant,
  ] = useState(null);


  // =========================================================
  // SAVE
  // =========================================================

  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    message,
    setMessage,
  ] = useState("");


  // =========================================================
  // LOAD PROFILE
  // =========================================================

  useEffect(
    () => {

      let cancelled =
        false;


      async function loadProfile() {

        try {

          const response =
            await api.get(
              "/accounts/profile/"
            );


          if (
            !cancelled
          ) {

            setProfile(
              response?.data ||
              null
            );

          }

        } catch (
          profileError
        ) {

          /*
           * Restaurant discovery must still
           * work even if profile retrieval
           * fails.
           */

          console.warn(
            "DINE OUT PROFILE LOAD ERROR:",
            profileError?.response
              ?.status,
            profileError?.response
              ?.data
          );

        }

      }


      loadProfile();


      return () => {

        cancelled = true;

      };

    },
    []
  );


  // =========================================================
  // UPDATE FIELD
  // =========================================================

  function updateField(
    field,
    value
  ) {

    setForm(
      previous => ({
        ...previous,

        [field]:
          value,
      })
    );


    if (error) {
      setError("");
    }


    if (message) {
      setMessage("");
    }

  }


  // =========================================================
  // PROFILE PREFERENCE
  // =========================================================

  const dietaryPreference =
    useMemo(
      () => {

        return String(
          profile
            ?.dietary_preference ||

          profile
            ?.dietary_preferences ||

          ""
        ).trim();

      },
      [
        profile,
      ]
    );


  const preferredCuisine =
    useMemo(
      () => {

        if (
          Array.isArray(
            profile
              ?.preferred_cuisines
          )
        ) {

          return (
            profile
              .preferred_cuisines[0] ||
            ""
          );

        }


        return String(
          profile
            ?.cuisine ||

          profile
            ?.preferred_cuisine ||

          ""
        ).trim();

      },
      [
        profile,
      ]
    );


  // =========================================================
  // LOCATION TEXT CHANGE
  // =========================================================

  function handleLocationChange(
    value
  ) {

    setForm(
      previous => ({
        ...previous,

        city:
          value,

        /*
         * User changed the text.
         * Old coordinates can no longer
         * be trusted until they select
         * another autocomplete result.
         */

        search_latitude:
          null,

        search_longitude:
          null,

        venue_name: "",

        restaurant_name: "",

        restaurant_address: "",

        location_label: "",

        latitude: null,

        longitude: null,
      })
    );


    setSelectedRestaurant(
      null
    );


    setRestaurants(
      []
    );


    setRestaurantsError(
      ""
    );


    setRestaurantSearchDone(
      false
    );

  }


  // =========================================================
  // LOCATION SELECTED FROM AUTOCOMPLETE
  // =========================================================

  async function handleLocationSelect(
    place
  ) {

    if (!place) {
      return;
    }


    const latitude =
      Number(
        place.latitude
      );


    const longitude =
      Number(
        place.longitude
      );


    if (
      !Number.isFinite(
        latitude
      ) ||
      !Number.isFinite(
        longitude
      )
    ) {

      setRestaurantsError(
        "The selected location does not contain valid coordinates."
      );

      return;

    }


    const locationLabel =
      place.display_name ||
      place.name ||
      "";


    setForm(
      previous => ({
        ...previous,

        city:
          locationLabel,

        search_latitude:
          latitude,

        search_longitude:
          longitude,

        venue_name: "",

        restaurant_name: "",

        restaurant_address: "",

        location_label: "",

        latitude: null,

        longitude: null,
      })
    );


    setSelectedRestaurant(
      null
    );


    setRestaurantsError(
      ""
    );


    /*
     * Do not automatically load every restaurant.
     * The user first chooses cuisine / food / place type,
     * then FoodKindl sends a focused recommendation request.
     */

    setRestaurants([]);

    setRestaurantSearchDone(
      false
    );

  }


  // =========================================================
  // CURRENT LOCATION
  // =========================================================

  function useCurrentLocation() {

    setRestaurantsError(
      ""
    );


    if (
      !navigator.geolocation
    ) {

      setRestaurantsError(
        "Your browser does not support location access."
      );

      return;

    }


    navigator.geolocation
      .getCurrentPosition(

        async position => {

          const latitude =
            Number(
              position.coords
                .latitude
            );


          const longitude =
            Number(
              position.coords
                .longitude
            );


          setForm(
            previous => ({
              ...previous,

              city:
                "Current location",

              search_latitude:
                latitude,

              search_longitude:
                longitude,

              venue_name: "",

              restaurant_name: "",

              restaurant_address: "",

              location_label: "",

              latitude: null,

              longitude: null,
            })
          );


          setSelectedRestaurant(
            null
          );


          setRestaurants([]);

          setRestaurantSearchDone(
            false
          );

        },


        geoError => {

          console.error(
            "GEOLOCATION ERROR:",
            geoError
          );


          if (
            geoError.code ===
            geoError.PERMISSION_DENIED
          ) {

            setRestaurantsError(
              "Location permission was denied. Search an area instead."
            );

            return;

          }


          setRestaurantsError(
            "FoodKindl could not detect your current location."
          );

        },


        {
          enableHighAccuracy:
            true,

          timeout:
            12000,

          maximumAge:
            60000,
        }

      );

  }


  // =========================================================
  // SEARCH RESTAURANTS
  // =========================================================

  async function searchRestaurants(
  explicitLatitude,
  explicitLongitude,
  overrides = {}
) {
  const latitude =
    Number(
      explicitLatitude ??
      form.search_latitude
    );

  const longitude =
    Number(
      explicitLongitude ??
      form.search_longitude
    );

  console.log(
    "DINE OUT SEARCH COORDINATES:",
    {
      latitude,
      longitude,
      city: form.city,
    }
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    setRestaurantsError(
      "Please select a location from the suggestions."
    );

    return;
  }

  setRestaurantsLoading(true);
  setRestaurantsError("");
  setRestaurantSearchDone(true);

  try {
    const params = {
      latitude,
      longitude,

      query:
        String(
          overrides.food_query ??
          form.food_query ??
          ""
        ).trim(),

      cuisine:
        String(
          overrides.cuisine ??
          form.cuisine ??
          ""
        ).trim(),

      radius_km: 4,
      limit: 12,
      smart_match: true,
    };

    const venueType =
      String(
        overrides.dine_venue_type ??
        form.dine_venue_type ??
        ""
      ).trim();

    if (venueType) {
      params.type =
        venueType;
    }

    if (dietaryPreference) {
      params.dietary_preference =
        dietaryPreference;
    }

    console.log(
      "DINE OUT REQUEST PARAMS:",
      params
    );

    const response =
      await api.get(
        "/restaurants/recommendations/",
        {
          params,
        }
      );

    console.log(
      "DINE OUT RESPONSE:",
      response?.data
    );

    const results =
      response?.data?.results;

    setRestaurants(
      Array.isArray(results)
        ? results
        : []
    );

  } catch (requestError) {
    console.error(
      "DINE OUT SEARCH FAILED",
      {
        status:
          requestError?.response
            ?.status,

        data:
          requestError?.response
            ?.data,

        message:
          requestError?.message,

        url:
          requestError?.config
            ?.url,

        params:
          requestError?.config
            ?.params,
      }
    );

    setRestaurants([]);

    const backendData =
      requestError?.response
        ?.data;

    let message =
      "Unable to find restaurants around this location.";

    if (
      typeof backendData?.detail ===
      "string"
    ) {
      message =
        backendData.detail;
    } else if (
      typeof backendData?.error ===
      "string"
    ) {
      message =
        backendData.error;
    } else if (
      typeof backendData
        ?.technical_detail ===
      "string"
    ) {
      message =
        backendData
          .technical_detail;
    } else if (
      requestError?.message
    ) {
      message =
        requestError.message;
    }

    setRestaurantsError(
      message
    );

  } finally {
    setRestaurantsLoading(false);
  }
}


  // =========================================================
  // SEARCH AFTER FOOD / FILTER CHANGE
  // =========================================================

  async function handleRestaurantSearch(
    overrides = {}
  ) {

    await searchRestaurants(
      form.search_latitude,
      form.search_longitude,
      overrides
    );

  }


  // =========================================================
  // VENUE TYPE
  // =========================================================

  async function handleVenueTypeChange(
    type
  ) {

    updateField(
      "dine_venue_type",
      type
    );


    if (
      Number.isFinite(
        Number(
          form.search_latitude
        )
      ) &&
      Number.isFinite(
        Number(
          form.search_longitude
        )
      )
    ) {

      await searchRestaurants(
        form.search_latitude,
        form.search_longitude,
        {
          dine_venue_type:
            type,
        }
      );

    }

  }


  // =========================================================
  // SELECT RESTAURANT
  // =========================================================

  function selectRestaurant(
    restaurant
  ) {

    if (!restaurant) {
      return;
    }


    const latitude =
      Number(
        restaurant.latitude
      );


    const longitude =
      Number(
        restaurant.longitude
      );


    const address =
      String(
        restaurant.address ||

        restaurant.locality ||

        restaurant.city ||

        ""
      ).trim();


    setSelectedRestaurant(
      restaurant
    );


    setForm(
      previous => ({
        ...previous,

        venue_name:
          restaurant.name ||
          "",

        restaurant_name:
          restaurant.name ||
          "",

        restaurant_address:
          address,

        location_label:
          restaurant.locality ||
          restaurant.city ||
          address,

        latitude:
          Number.isFinite(
            latitude
          )
            ? latitude
            : null,

        longitude:
          Number.isFinite(
            longitude
          )
            ? longitude
            : null,

        cuisine:
          restaurant.main_cuisine ||
          restaurant.cuisine ||
          previous.cuisine,

        dine_venue_type:
          restaurant.restaurant_type ||
          previous.dine_venue_type ||
          "restaurant",
      })
    );


    setMessage(
      `${restaurant.name} selected.`
    );


    setError(
      ""
    );

  }


  // =========================================================
  // VALIDATION
  // =========================================================

  function validateForm() {

    if (
      !String(
        form.title
      ).trim()
    ) {

      throw new Error(
        "Please enter an invite title."
      );

    }


    if (
      !String(
        form.venue_name
      ).trim()
    ) {

      throw new Error(
        "Please choose a restaurant, café, hotel or bakery from the recommendations."
      );

    }


    if (
      !form.start_date
    ) {

      throw new Error(
        "Please choose the start date."
      );

    }


    const startDate =
      buildDateTime(
        form.start_date,
        form.start_hour,
        form.start_minute,
        form.start_ampm
      );


    if (!startDate) {

      throw new Error(
        "Please select a valid start date and time."
      );

    }


    if (
      startDate.getTime() <
      Date.now() - 60000
    ) {

      throw new Error(
        "Dine Out cannot start in the past."
      );

    }


    if (
      form.end_date
    ) {

      const endDate =
        buildDateTime(
          form.end_date,
          form.end_hour,
          form.end_minute,
          form.end_ampm
        );


      if (!endDate) {

        throw new Error(
          "Please select a valid end date and time."
        );

      }


      if (
        endDate <=
        startDate
      ) {

        throw new Error(
          "End time must be after the start time."
        );

      }

    }


    const participantLimit =
      Number(
        form.max_participants
      );


    if (
      !Number.isFinite(
        participantLimit
      ) ||
      participantLimit < 2
    ) {

      throw new Error(
        "Maximum participants must be at least 2."
      );

    }


    if (
      form.recipients.length ===
      0
    ) {

      throw new Error(
        "Please invite at least one person."
      );

    }


    if (
      form.recipients.length >
      participantLimit - 1
    ) {

      throw new Error(
        `You can invite a maximum of ${
          participantLimit - 1
        } people.`
      );

    }

  }


  // =========================================================
  // SUBMIT
  // =========================================================

  async function submit(
    event
  ) {

    event.preventDefault();


    if (saving) {
      return;
    }


    setSaving(
      true
    );


    setError(
      ""
    );


    try {

      validateForm();


      const startDate =
        buildDateTime(
          form.start_date,
          form.start_hour,
          form.start_minute,
          form.start_ampm
        );


      const endDate =
        form.end_date
          ? buildDateTime(
              form.end_date,
              form.end_hour,
              form.end_minute,
              form.end_ampm
            )
          : null;


      const latitude =
        Number(
          form.latitude
        );


      const longitude =
        Number(
          form.longitude
        );


      const payload = {

        invite_type:
          "dine_out",


        title:
          form.title.trim(),


        description:
          form.description.trim(),


        cuisine:
          String(
            form.cuisine ||
            ""
          ).trim(),


        dine_venue_type:
          String(
            form.dine_venue_type ||
            selectedRestaurant
              ?.restaurant_type ||
            "restaurant"
          ).trim(),


        start_at:
          startDate.toISOString(),


        end_at:
          endDate
            ? endDate.toISOString()
            : null,


        // ---------------------------------------------------
        // ONLY THE CHOSEN PLACE BECOMES PART OF THE INVITE
        // ---------------------------------------------------

        venue_name:
          form.venue_name.trim(),


        location_label:
          String(
            form.location_label ||
            form.restaurant_address ||
            ""
          ).trim(),


        private_address:
          String(
            form.restaurant_address ||
            ""
          ).trim(),


        latitude:
          Number.isFinite(
            latitude
          )
            ? latitude
            : null,


        longitude:
          Number.isFinite(
            longitude
          )
            ? longitude
            : null,


        max_participants:
          Number(
            form.max_participants
          ),


        recipient_user_ids:
          form.recipients
            .map(Number)
            .filter(Boolean),


        verified_only:
          Boolean(
            form.verified_only
          ),


        women_only:
          Boolean(
            form.women_only
          ),


        restaurant_name:
          form.venue_name.trim(),


        restaurant_address:
          String(
            form.restaurant_address ||
            ""
          ).trim(),


        budget_level:
          form.budget_level,


        dietary_notes:
          String(
            form.dietary_notes ||
            ""
          ).trim(),


        booking_status:
          form.booking_status,


        table_notes:
          String(
            form.table_notes ||
            ""
          ).trim(),
      };


      /*
       * Restaurant discovery never POSTs
       * anything.
       *
       * This POST creates only the
       * Food Invite.
       */

      console.log(
        "DINE OUT INVITE PAYLOAD:",
        payload
      );

      const response =
        await api.post(
          INVITES_ENDPOINT,
          payload
        );

      console.log(
        "DINE OUT INVITE CREATED:",
        response?.data
      );


      navigate(
        "/food-invites",
        {
          replace: true,
        }
      );


    } catch (
      requestError
    ) {

      if (
        !requestError
          ?.response &&
        requestError
          ?.message
      ) {

        setError(
          requestError.message
        );

      } else {

        setError(
          readError(
            requestError,
            "Unable to create Dine Out invite."
          )
        );

      }


    } finally {

      setSaving(
        false
      );

    }

  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <main className="fi-page fk-dineout-page">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="fi-hero">

        <div>

          <span className="fi-eyebrow">
            🍽️ DINE OUT
          </span>


          <h1>
            Find a place.
            Meet over food.
          </h1>


          <p>
            Search an area,
            discover restaurants
            and cafés matched to
            your food preferences,
            choose a place and
            invite people.
          </p>

        </div>


        <button
          type="button"
          className="fi-secondary"
          onClick={() =>
            navigate(
              "/food-invites"
            )
          }
        >
          ← Food Invites
        </button>

      </section>


      {/* =====================================================
          LOCATION
      ====================================================== */}

      <section className="fk-dineout-location-panel">

  <div className="fk-dineout-location-layout">

    {/* =================================================
        LEFT SIDE
    ================================================== */}

    <div className="fk-dineout-location-main">

      <div className="fk-dineout-location-heading">

        <div>

          <span className="fi-eyebrow">
            FIND AN AREA
          </span>

          <h2>
            Where do you want to dine?
          </h2>

          <p>
            Start with an area,
            neighbourhood,
            landmark or city.
          </p>

        </div>

      </div>


      {/* =================================================
          LOCATION AUTOCOMPLETE
      ================================================== */}

      <LocationAutocomplete
        value={
          form.city
        }

        placeholder=
          "Try Indiranagar, Koramangala, Nagasandra..."

        onChange={
          handleLocationChange
        }

        onSelect={
          handleLocationSelect
        }
      />


      {/* =================================================
          CURRENT LOCATION
      ================================================== */}

      <button
        type="button"
        className="fk-dineout-current-location"
        onClick={
          useCurrentLocation
        }
      >

        <MapPin
          size={16}
        />

        Use my current location

      </button>


      {/* =================================================
          LOCATION SELECTED
      ================================================== */}

      {form.search_latitude &&
        form.search_longitude && (

        <div className="fk-location-selected">

          <CheckCircle2
            size={17}
          />

          <span>
            Location selected.
            FoodKindl is searching
            places around this area.
          </span>

        </div>

      )}

    </div>


    {/* =================================================
        RIGHT SIDE IMAGE
    ================================================== */}

    <div className="fk-dineout-location-art">

      <img
        src="/images/vidan.png"
        alt="Explore great food near you"
      />

    </div>

  </div>

</section>


      {/* =====================================================
          FOOD / RESTAURANT DISCOVERY
      ====================================================== */}

      <DineOutInvite

        form={
          form
        }

        updateField={
          updateField
        }

        restaurants={
          restaurants
        }

        restaurantsLoading={
          restaurantsLoading
        }

        restaurantsError={
          restaurantsError
        }

        onSearchRestaurants={
          handleRestaurantSearch
        }

        onSelectRestaurant={
          selectRestaurant
        }

        selectedRestaurant={
          selectedRestaurant
        }

        userPreferences={
          profile || {}
        }

        restaurantSearchDone={
          restaurantSearchDone
        }

        onVenueTypeChange={
          handleVenueTypeChange
        }

        hideLocationSearch={
          true
        }

      />


      {/* =====================================================
          MAP
      ====================================================== */}

      {Number.isFinite(
        Number(
          form.search_latitude
        )
      ) &&
        Number.isFinite(
          Number(
            form.search_longitude
          )
        ) && (

        <section className="fk-dineout-map-section">

          <div className="fk-dineout-map-heading">

            <div>

              <span className="fi-eyebrow">
                FOOD MAP
              </span>


              <h2>
                Explore places
                around{" "}
                {
                  form.city
                }
              </h2>

            </div>


            <MapPin
              size={22}
            />

          </div>


          <DineOutRestaurantMap

            restaurants={
              restaurants
            }

            centerLatitude={
              form
                .search_latitude
            }

            centerLongitude={
              form
                .search_longitude
            }

            selectedRestaurant={
              selectedRestaurant
            }

            onSelectRestaurant={
              selectRestaurant
            }

          />

        </section>

      )}


      {/* =====================================================
          SELECTED PLACE
      ====================================================== */}

      {selectedRestaurant && (

        <section className="fi-create-card">

          <div className="fi-form-heading">

            <div>

              <span className="fi-eyebrow">
                YOUR DINE OUT PLACE
              </span>


              <h2>
                {
                  selectedRestaurant
                    .name
                }
              </h2>

            </div>


            <CheckCircle2
              size={26}
            />

          </div>


          <div className="fi-grid">

            <div className="fi-field">

              <span>
                Place type
              </span>

              <strong>
                {
                  selectedRestaurant
                    .primary_type_label ||
                  selectedRestaurant
                    .primary_type ||
                  selectedRestaurant
                    .restaurant_type ||
                  "Restaurant"
                }
              </strong>

            </div>


            <div className="fi-field">

              <span>
                Main cuisine
              </span>

              <strong>
                {
                  selectedRestaurant
                    .main_cuisine ||
                  selectedRestaurant
                    .cuisine ||
                  "Not specified"
                }
              </strong>

            </div>


            <div className="fi-field">

              <span>
                Rating
              </span>

              <strong>
                {
                  selectedRestaurant.rating
                    ? `★ ${selectedRestaurant.rating}`
                    : "Not available"
                }
              </strong>

            </div>


            <div className="fi-field">

              <span>
                Reviews
              </span>

              <strong>
                {
                  selectedRestaurant.review_count
                    ? Number(
                        selectedRestaurant.review_count
                      ).toLocaleString()
                    : "Not available"
                }
              </strong>

            </div>


            <div className="fi-field fi-span-2">

              <span>
                Address
              </span>

              <strong>
                {
                  selectedRestaurant
                    .address ||

                  selectedRestaurant
                    .locality ||

                  form.city
                }
              </strong>

            </div>


            {selectedRestaurant
              .phone && (

              <div className="fi-field">

                <span>
                  Phone
                </span>

                <strong>
                  {
                    selectedRestaurant
                      .phone
                  }
                </strong>

              </div>

            )}


            {selectedRestaurant
              .opening_hours && (

              <div className="fi-field">

                <span>
                  Opening hours
                </span>

                <strong>
                  {
                    selectedRestaurant
                      .opening_hours
                  }
                </strong>

              </div>

            )}


            {selectedRestaurant
              .website && (

              <div className="fi-field fi-span-2">

                <span>
                  Website
                </span>

                <a
                  href={
                    selectedRestaurant
                      .website
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {
                    selectedRestaurant
                      .website
                  }
                </a>

              </div>

            )}


            {selectedRestaurant
              .recommendation_reason && (

              <div className="fi-field fi-span-2">

                <span>
                  Why this place?
                </span>

                <strong>
                  {
                    selectedRestaurant
                      .recommendation_reason
                  }
                </strong>

              </div>

            )}

          </div>

        </section>

      )}


      {/* =====================================================
          INVITE FORM
      ====================================================== */}

      <form
        className="fi-create-card"
        onSubmit={
          submit
        }
      >

        <div className="fi-form-heading">

          <div>

            <span className="fi-eyebrow">
              CREATE DINE OUT
            </span>


            <h2>
              Plan the meetup
            </h2>

          </div>


          <Utensils
            size={23}
          />

        </div>


        <div className="fi-grid">


          {/* TITLE */}

          <label className="fi-field fi-span-2">

            <span>
              Invite title *
            </span>


            <input
              required

              value={
                form.title
              }

              onChange={
                event =>
                  updateField(
                    "title",
                    event.target.value
                  )
              }

              placeholder=
                "Friday dinner at Indiranagar"
            />

          </label>


          {/* DESCRIPTION */}

          <label className="fi-field fi-span-2">

            <span>
              Description
            </span>


            <textarea
              rows={4}

              value={
                form.description
              }

              onChange={
                event =>
                  updateField(
                    "description",
                    event.target.value
                  )
              }

              placeholder=
                "What kind of Dine Out are you planning?"
            />

          </label>


          {/* SELECTED PLACE */}

          <div className="fi-field fi-span-2">

            <span>
              <MapPin
                size={15}
              />

              Selected restaurant
            </span>


            <strong>
              {
                form.venue_name ||
                "Choose a place from the recommendations above"
              }
            </strong>

          </div>


          {/* START DATE + TIME */}

          <div className="fi-field">

            <span>
              <CalendarDays
                size={15}
              />

              Starts *
            </span>


            <div className="fk-date-time-field">

              <div className="fk-date-picker-field">

                <CalendarDays
                  size={16}
                />

                <input
                  required
                  type="date"

                  value={
                    form.start_date
                  }

                  onChange={
                    event =>
                      updateField(
                        "start_date",
                        event.target.value
                      )
                  }
                />

              </div>


              <div className="fk-time-picker-field">

                <Clock3
                  size={16}
                />

                <select
                  aria-label="Start hour"

                  value={
                    form.start_hour
                  }

                  onChange={
                    event =>
                      updateField(
                        "start_hour",
                        event.target.value
                      )
                  }
                >

                  {Array.from(
                    {
                      length: 12,
                    },
                    (_, index) => {

                      const value =
                        String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        );

                      return (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
                        >
                          {index + 1}
                        </option>
                      );

                    }
                  )}

                </select>


                <span className="fk-time-colon">
                  :
                </span>


                <select
                  aria-label="Start minutes"

                  value={
                    form.start_minute
                  }

                  onChange={
                    event =>
                      updateField(
                        "start_minute",
                        event.target.value
                      )
                  }
                >

                  {[
                    "00",
                    "15",
                    "30",
                    "45",
                  ].map(
                    minute => (
                      <option
                        key={
                          minute
                        }
                        value={
                          minute
                        }
                      >
                        {minute}
                      </option>
                    )
                  )}

                </select>


                <select
                  aria-label="Start AM or PM"
                  className="fk-ampm-select"

                  value={
                    form.start_ampm
                  }

                  onChange={
                    event =>
                      updateField(
                        "start_ampm",
                        event.target.value
                      )
                  }
                >

                  <option value="AM">
                    AM
                  </option>

                  <option value="PM">
                    PM
                  </option>

                </select>

              </div>

            </div>

          </div>


          {/* END DATE + TIME */}

          <div className="fi-field">

            <span>
              <Clock3
                size={15}
              />

              Ends
            </span>


            <div className="fk-date-time-field">

              <div className="fk-date-picker-field">

                <CalendarDays
                  size={16}
                />

                <input
                  type="date"

                  value={
                    form.end_date
                  }

                  onChange={
                    event =>
                      updateField(
                        "end_date",
                        event.target.value
                      )
                  }
                />

              </div>


              <div className="fk-time-picker-field">

                <Clock3
                  size={16}
                />

                <select
                  aria-label="End hour"

                  value={
                    form.end_hour
                  }

                  onChange={
                    event =>
                      updateField(
                        "end_hour",
                        event.target.value
                      )
                  }
                >

                  {Array.from(
                    {
                      length: 12,
                    },
                    (_, index) => {

                      const value =
                        String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        );

                      return (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
                        >
                          {index + 1}
                        </option>
                      );

                    }
                  )}

                </select>


                <span className="fk-time-colon">
                  :
                </span>


                <select
                  aria-label="End minutes"

                  value={
                    form.end_minute
                  }

                  onChange={
                    event =>
                      updateField(
                        "end_minute",
                        event.target.value
                      )
                  }
                >

                  {[
                    "00",
                    "15",
                    "30",
                    "45",
                  ].map(
                    minute => (
                      <option
                        key={
                          minute
                        }
                        value={
                          minute
                        }
                      >
                        {minute}
                      </option>
                    )
                  )}

                </select>


                <select
                  aria-label="End AM or PM"
                  className="fk-ampm-select"

                  value={
                    form.end_ampm
                  }

                  onChange={
                    event =>
                      updateField(
                        "end_ampm",
                        event.target.value
                      )
                  }
                >

                  <option value="AM">
                    AM
                  </option>

                  <option value="PM">
                    PM
                  </option>

                </select>

              </div>

            </div>

          </div>


          {/* MAX PEOPLE */}

          <label className="fi-field">

            <span>
              <Users
                size={15}
              />

              Maximum
              participants
            </span>


            <input
              type="number"

              min="2"

              max="100"

              value={
                form.max_participants
              }

              onChange={
                event =>
                  updateField(
                    "max_participants",
                    event.target.value
                  )
              }
            />

          </label>


          {/* BUDGET */}

          <label className="fi-field">

            <span>
              Budget
            </span>


            <select
              value={
                form.budget_level
              }

              onChange={
                event =>
                  updateField(
                    "budget_level",
                    event.target.value
                  )
              }
            >

              <option value="₹">
                ₹ Budget
              </option>


              <option value="₹₹">
                ₹₹ Moderate
              </option>


              <option value="₹₹₹">
                ₹₹₹ Premium
              </option>

            </select>

          </label>


          {/* BOOKING */}

          <label className="fi-field">

            <span>
              Booking status
            </span>


            <select
              value={
                form.booking_status
              }

              onChange={
                event =>
                  updateField(
                    "booking_status",
                    event.target.value
                  )
              }
            >

              <option value="not_booked">
                Not booked yet
              </option>


              <option value="planned">
                Planning to book
              </option>


              <option value="booked">
                Table booked
              </option>


              <option value="walk_in">
                Walk-in
              </option>

            </select>

          </label>


          {/* DIET */}

          <label className="fi-field fi-span-2">

            <span>
              Dietary notes
            </span>


            <textarea
              rows={3}

              value={
                form.dietary_notes
              }

              onChange={
                event =>
                  updateField(
                    "dietary_notes",
                    event.target.value
                  )
              }

              placeholder=
                "Vegetarian, vegan, allergies, halal..."
            />

          </label>


          {/* TABLE NOTES */}

          <label className="fi-field fi-span-2">

            <span>
              Meetup / table
              notes
            </span>


            <textarea
              rows={3}

              value={
                form.table_notes
              }

              onChange={
                event =>
                  updateField(
                    "table_notes",
                    event.target.value
                  )
              }

              placeholder=
                "Meet near entrance, reservation under my name..."
            />

          </label>


          {/* PEOPLE */}

          <div className="fi-span-2">

            <PeopleSelector

              selectedIds={
                form.recipients
              }

              onChange={
                ids =>
                  updateField(
                    "recipients",
                    ids
                  )
              }

              maxSelections={
                Math.max(
                  Number(
                    form.max_participants
                  ) - 1,
                  1
                )
              }

            />

          </div>

        </div>


        {/* =================================================
            OPTIONS
        ================================================== */}

        <div className="fi-options">

          <label>

            <input
              type="checkbox"

              checked={
                form.verified_only
              }

              onChange={
                event =>
                  updateField(
                    "verified_only",
                    event.target.checked
                  )
              }
            />

            Verified profiles
            only

          </label>


          <label>

            <input
              type="checkbox"

              checked={
                form.women_only
              }

              onChange={
                event =>
                  updateField(
                    "women_only",
                    event.target.checked
                  )
              }
            />

            Women-only invite

          </label>

        </div>


        {/* =================================================
            MESSAGES
        ================================================== */}

        {message && (

          <div className="fi-alert fi-success">
            {message}
          </div>

        )}


        {error && (

          <div className="fi-alert fi-error">
            {error}
          </div>

        )}


        {/* =================================================
            ACTIONS
        ================================================== */}

        <div className="fi-form-actions">

          <button
            type="button"

            className="fi-secondary"

            onClick={() =>
              navigate(
                "/food-invites"
              )
            }
          >
            Cancel
          </button>


          <button
            type="submit"

            className="fi-primary"

            disabled={
              saving ||
              !form.venue_name
            }
          >

            {
              saving
                ? "Creating..."
                : "Create Dine Out"
            }

          </button>

        </div>

      </form>

    </main>

  );

}