import {
  Building2,
  Check,
  Coffee,
  Hotel,
  ImagePlus,
  LocateFixed,
  MapPin,
  Store,
  X,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import api from "../api";

import "../styles/restaurant_submission.css";


const CUISINE_CHOICES = [
  ["", "Select cuisine"],
  ["south_indian", "South Indian"],
  ["north_indian", "North Indian"],
  ["kerala", "Kerala"],
  ["karnataka", "Karnataka"],
  ["tamil", "Tamil"],
  ["andhra", "Andhra"],
  ["telangana", "Telangana"],
  ["hyderabadi", "Hyderabadi"],
  ["punjabi", "Punjabi"],
  ["bengali", "Bengali"],
  ["rajasthani", "Rajasthani"],
  ["gujarati", "Gujarati"],
  ["maharashtrian", "Maharashtrian"],
  ["goan", "Goan"],
  ["kashmiri", "Kashmiri"],
  ["chinese", "Chinese"],
  ["indo_chinese", "Indo-Chinese"],
  ["italian", "Italian"],
  ["continental", "Continental"],
  ["mediterranean", "Mediterranean"],
  ["mexican", "Mexican"],
  ["thai", "Thai"],
  ["japanese", "Japanese"],
  ["korean", "Korean"],
  ["arabian", "Arabian"],
  ["middle_eastern", "Middle Eastern"],
  ["lebanese", "Lebanese"],
  ["biryani", "Biryani"],
  ["seafood", "Seafood"],
  ["street_food", "Street Food"],
  ["fast_food", "Fast Food"],
  ["cafe", "Cafe"],
  ["bakery", "Bakery"],
  ["desserts", "Desserts"],
  ["barbecue", "Barbecue / Grill"],
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["jain", "Jain"],
  ["multi_cuisine", "Multi Cuisine"],
  ["other", "Other"],
];


const PRICE_RANGE_CHOICES = [
  ["", "Not sure"],
  ["budget", "Budget"],
  ["moderate", "Moderate"],
  ["premium", "Premium"],
];


function createDefaultForm(initial = {}) {
  return {
    name: "",
    restaurant_type: "restaurant",
    description: "",
    cuisine: "",
    phone_number: "",
    email: "",
    website: "",
    address: "",
    locality: "",
    city: "",
    pincode: "",
    latitude: "",
    longitude: "",
    price_range: "",
    average_cost_for_two: "",
    opening_time: "",
    closing_time: "",
    has_parking: false,
    has_wifi: false,
    accepts_cards: true,
    family_friendly: true,
    outdoor_seating: false,
    wheelchair_accessible: false,
    serves_vegetarian: true,
    serves_non_vegetarian: true,
    image_url: "",
    ...initial,
  };
}


export default function RestaurantSubmissionModal({
  open,
  onClose,
  onSubmitted,
  initialLocation = "",
  initialCity = "",
  initialType = "restaurant",
}) {
  const [form, setForm] = useState(
    createDefaultForm({
      locality: initialLocation || "",
      city: initialCity || "",
      restaurant_type: initialType || "restaurant",
    })
  );

  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] =
    useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const typeMeta = useMemo(
    () => {
      if (form.restaurant_type === "cafe") {
        return {
          label: "Cafe",
          icon: Coffee,
        };
      }

      if (form.restaurant_type === "hotel") {
        return {
          label: "Hotel",
          icon: Hotel,
        };
      }

      return {
        label: "Restaurant",
        icon: Store,
      };
    },
    [form.restaurant_type]
  );

  const TypeIcon = typeMeta.icon;

  if (!open) {
    return null;
  }


  function updateField(field, value) {
    setForm(previous => ({
      ...previous,
      [field]: value,
    }));
  }


  function resetAndClose() {
    setError("");
    setSuccess("");

    setForm(
      createDefaultForm({
        locality: initialLocation || "",
        city: initialCity || "",
        restaurant_type:
          initialType || "restaurant",
      })
    );

    onClose?.();
  }


  function useCurrentLocation() {
    setError("");

    if (!navigator.geolocation) {
      setError(
        "Location is not supported by this browser."
      );

      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      position => {
        updateField(
          "latitude",
          Number(
            position.coords.latitude
          ).toFixed(6)
        );

        updateField(
          "longitude",
          Number(
            position.coords.longitude
          ).toFixed(6)
        );

        setGettingLocation(false);
      },
      () => {
        setGettingLocation(false);

        setError(
          "FoodKindl could not access your current location."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }


  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError(
        "Please enter the place name."
      );

      return;
    }

    if (!form.city.trim()) {
      setError(
        "Please enter the city."
      );

      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),

        restaurant_type:
          form.restaurant_type,

        description:
          form.description.trim(),

        cuisine:
          form.cuisine,

        phone_number:
          form.phone_number.trim(),

        email:
          form.email.trim(),

        website:
          form.website.trim(),

        address:
          form.address.trim(),

        locality:
          form.locality.trim(),

        city:
          form.city.trim(),

        pincode:
          form.pincode.trim(),

        latitude:
          form.latitude !== ""
            ? Number(form.latitude)
            : null,

        longitude:
          form.longitude !== ""
            ? Number(form.longitude)
            : null,

        price_range:
          form.price_range,

        average_cost_for_two:
          form.average_cost_for_two !== ""
            ? Number(
                form.average_cost_for_two
              )
            : null,

        opening_time:
          form.opening_time || null,

        closing_time:
          form.closing_time || null,

        has_parking:
          form.has_parking,

        has_wifi:
          form.has_wifi,

        accepts_cards:
          form.accepts_cards,

        family_friendly:
          form.family_friendly,

        outdoor_seating:
          form.outdoor_seating,

        wheelchair_accessible:
          form.wheelchair_accessible,

        serves_vegetarian:
          form.serves_vegetarian,

        serves_non_vegetarian:
          form.serves_non_vegetarian,

        image_url:
          form.image_url.trim(),
      };

      const response =
        await api.post(
          "/restaurant-submissions/",
          payload
        );

      setSuccess(
        "Submitted for FoodKindl review. It will appear in places after admin approval."
      );

      onSubmitted?.(
        response.data
      );

      setForm(
        createDefaultForm({
          locality:
            initialLocation || "",
          city:
            initialCity || "",
          restaurant_type:
            initialType || "restaurant",
        })
      );

    } catch (requestError) {
      console.error(
        "Restaurant submission error:",
        requestError.response?.data ||
          requestError
      );

      const data =
        requestError.response?.data;

      let message =
        "Unable to submit this place.";

      if (
        typeof data === "string"
      ) {
        message = data;
      } else if (
        data?.detail
      ) {
        message = data.detail;
      } else if (
        data &&
        typeof data === "object"
      ) {
        const firstKey =
          Object.keys(data)[0];

        const firstValue =
          firstKey
            ? data[firstKey]
            : null;

        if (
          Array.isArray(firstValue)
        ) {
          message =
            firstValue[0];
        } else if (
          typeof firstValue ===
          "string"
        ) {
          message =
            firstValue;
        }
      }

      setError(message);

    } finally {
      setSaving(false);
    }
  }


  return (
    <div
      className="restaurant-submission-backdrop"
      onMouseDown={
        event => {
          if (
            event.target ===
            event.currentTarget
          ) {
            resetAndClose();
          }
        }
      }
    >

      <section
        className="restaurant-submission-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Suggest a place"
      >

        <header className="restaurant-submission-header">

          <div className="restaurant-submission-header-mark">
            <Building2 size={21} />
          </div>

          <div className="restaurant-submission-header-copy">

            <span>
              COMMUNITY PLACE
            </span>

            <h2>
              Suggest a place
            </h2>

            <p>
              Add a restaurant, cafe or hotel that
              FoodKindl is missing. The place is sent
              to admin for review before it becomes public.
            </p>

          </div>

          <button
            type="button"
            className="restaurant-submission-close"
            onClick={
              resetAndClose
            }
            aria-label="Close suggest place"
          >
            <X size={18} />
          </button>

        </header>


        <form
          className="restaurant-submission-form"
          onSubmit={
            handleSubmit
          }
        >

          {/* ==================================================
              01 TYPE
          =================================================== */}

          <section className="restaurant-submission-section">

            <div className="restaurant-submission-section-head">

              <span>
                01
              </span>

              <div>
                <strong>
                  Place type
                </strong>

                <small>
                  What kind of place are you adding?
                </small>
              </div>

            </div>


            <div className="restaurant-submission-type-grid">

              <button
                type="button"
                className={
                  form.restaurant_type ===
                    "restaurant"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  updateField(
                    "restaurant_type",
                    "restaurant"
                  )
                }
              >
                <Store size={17} />
                Restaurant
              </button>

              <button
                type="button"
                className={
                  form.restaurant_type ===
                    "cafe"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  updateField(
                    "restaurant_type",
                    "cafe"
                  )
                }
              >
                <Coffee size={17} />
                Cafe
              </button>

              <button
                type="button"
                className={
                  form.restaurant_type ===
                    "hotel"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  updateField(
                    "restaurant_type",
                    "hotel"
                  )
                }
              >
                <Hotel size={17} />
                Hotel
              </button>

            </div>

          </section>


          {/* ==================================================
              02 BASIC INFORMATION
          =================================================== */}

          <section className="restaurant-submission-section">

            <div className="restaurant-submission-section-head">

              <span>
                02
              </span>

              <div>
                <strong>
                  About the place
                </strong>

                <small>
                  Add the details you know.
                </small>
              </div>

            </div>


            <div className="restaurant-submission-grid">

              <label className="wide">
                <span>
                  Place name *
                </span>

                <div className="restaurant-submission-input-icon">
                  <TypeIcon size={15} />

                  <input
                    type="text"
                    value={
                      form.name
                    }
                    onChange={
                      event =>
                        updateField(
                          "name",
                          event.target.value
                        )
                    }
                    placeholder={`${typeMeta.label} name`}
                  />
                </div>
              </label>


              <label>
                <span>
                  Cuisine
                </span>

                <select
                  value={
                    form.cuisine
                  }
                  onChange={
                    event =>
                      updateField(
                        "cuisine",
                        event.target.value
                      )
                  }
                >
                  {
                    CUISINE_CHOICES.map(
                      (
                        [
                          value,
                          label,
                        ]
                      ) => (
                        <option
                          key={
                            value ||
                            "blank"
                          }
                          value={
                            value
                          }
                        >
                          {label}
                        </option>
                      )
                    )
                  }
                </select>
              </label>


              <label>
                <span>
                  Price range
                </span>

                <select
                  value={
                    form.price_range
                  }
                  onChange={
                    event =>
                      updateField(
                        "price_range",
                        event.target.value
                      )
                  }
                >
                  {
                    PRICE_RANGE_CHOICES.map(
                      (
                        [
                          value,
                          label,
                        ]
                      ) => (
                        <option
                          key={
                            value ||
                            "blank"
                          }
                          value={
                            value
                          }
                        >
                          {label}
                        </option>
                      )
                    )
                  }
                </select>
              </label>


              <label className="wide">
                <span>
                  Description
                </span>

                <textarea
                  rows="3"
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
                  placeholder="What is this place known for?"
                />
              </label>

            </div>

          </section>


          {/* ==================================================
              03 LOCATION
          =================================================== */}

          <section className="restaurant-submission-section">

            <div className="restaurant-submission-section-head">

              <span>
                03
              </span>

              <div>
                <strong>
                  Location
                </strong>

                <small>
                  Accurate location helps Food Walk find it.
                </small>
              </div>

            </div>


            <div className="restaurant-submission-grid">

              <label>
                <span>
                  Locality
                </span>

                <input
                  type="text"
                  value={
                    form.locality
                  }
                  onChange={
                    event =>
                      updateField(
                        "locality",
                        event.target.value
                      )
                  }
                  placeholder="Indiranagar"
                />
              </label>


              <label>
                <span>
                  City *
                </span>

                <input
                  type="text"
                  value={
                    form.city
                  }
                  onChange={
                    event =>
                      updateField(
                        "city",
                        event.target.value
                      )
                  }
                  placeholder="Bengaluru"
                />
              </label>


              <label className="wide">
                <span>
                  Full address
                </span>

                <textarea
                  rows="2"
                  value={
                    form.address
                  }
                  onChange={
                    event =>
                      updateField(
                        "address",
                        event.target.value
                      )
                  }
                  placeholder="Building, road, landmark..."
                />
              </label>


              <label>
                <span>
                  Pincode
                </span>

                <input
                  type="text"
                  value={
                    form.pincode
                  }
                  onChange={
                    event =>
                      updateField(
                        "pincode",
                        event.target.value
                      )
                  }
                  placeholder="560038"
                />
              </label>


              <div className="restaurant-submission-location-action">

                <button
                  type="button"
                  onClick={
                    useCurrentLocation
                  }
                  disabled={
                    gettingLocation
                  }
                >
                  <LocateFixed size={15} />

                  {
                    gettingLocation
                      ? "Locating..."
                      : "Use my location"
                  }
                </button>

                {
                  form.latitude &&
                  form.longitude &&
                  (
                    <small>
                      <MapPin size={11} />
                      {form.latitude},{" "}
                      {form.longitude}
                    </small>
                  )
                }

              </div>

            </div>

          </section>


          {/* ==================================================
              04 CONTACT / TIMING
          =================================================== */}

          <section className="restaurant-submission-section">

            <div className="restaurant-submission-section-head">

              <span>
                04
              </span>

              <div>
                <strong>
                  Contact & timing
                </strong>

                <small>
                  Optional information.
                </small>
              </div>

            </div>


            <div className="restaurant-submission-grid">

              <label>
                <span>
                  Phone
                </span>

                <input
                  type="text"
                  value={
                    form.phone_number
                  }
                  onChange={
                    event =>
                      updateField(
                        "phone_number",
                        event.target.value
                      )
                  }
                  placeholder="+91..."
                />
              </label>


              <label>
                <span>
                  Email
                </span>

                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={
                    event =>
                      updateField(
                        "email",
                        event.target.value
                      )
                  }
                  placeholder="place@example.com"
                />
              </label>


              <label className="wide">
                <span>
                  Website
                </span>

                <input
                  type="url"
                  value={
                    form.website
                  }
                  onChange={
                    event =>
                      updateField(
                        "website",
                        event.target.value
                      )
                  }
                  placeholder="https://..."
                />
              </label>


              <label>
                <span>
                  Opening time
                </span>

                <input
                  type="time"
                  value={
                    form.opening_time
                  }
                  onChange={
                    event =>
                      updateField(
                        "opening_time",
                        event.target.value
                      )
                  }
                />
              </label>


              <label>
                <span>
                  Closing time
                </span>

                <input
                  type="time"
                  value={
                    form.closing_time
                  }
                  onChange={
                    event =>
                      updateField(
                        "closing_time",
                        event.target.value
                      )
                  }
                />
              </label>


              <label className="wide">
                <span>
                  Average cost for two
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    form.average_cost_for_two
                  }
                  onChange={
                    event =>
                      updateField(
                        "average_cost_for_two",
                        event.target.value
                      )
                  }
                  placeholder="800"
                />
              </label>

            </div>

          </section>


          {/* ==================================================
              05 FACILITIES
          =================================================== */}

          <section className="restaurant-submission-section">

            <div className="restaurant-submission-section-head">

              <span>
                05
              </span>

              <div>
                <strong>
                  Facilities
                </strong>

                <small>
                  Select only what you know.
                </small>
              </div>

            </div>


            <div className="restaurant-submission-check-grid">

              {
                [
                  [
                    "has_parking",
                    "Parking",
                  ],
                  [
                    "has_wifi",
                    "Wi-Fi",
                  ],
                  [
                    "accepts_cards",
                    "Cards accepted",
                  ],
                  [
                    "family_friendly",
                    "Family friendly",
                  ],
                  [
                    "outdoor_seating",
                    "Outdoor seating",
                  ],
                  [
                    "wheelchair_accessible",
                    "Wheelchair access",
                  ],
                  [
                    "serves_vegetarian",
                    "Vegetarian",
                  ],
                  [
                    "serves_non_vegetarian",
                    "Non-vegetarian",
                  ],
                ].map(
                  (
                    [
                      field,
                      label,
                    ]
                  ) => (
                    <label
                      key={
                        field
                      }
                      className="restaurant-submission-check"
                    >
                      <input
                        type="checkbox"
                        checked={
                          Boolean(
                            form[field]
                          )
                        }
                        onChange={
                          event =>
                            updateField(
                              field,
                              event.target.checked
                            )
                        }
                      />

                      <span>
                        <Check size={11} />
                      </span>

                      {label}
                    </label>
                  )
                )
              }

            </div>

          </section>


          {/* ==================================================
              06 IMAGE
          =================================================== */}

          <section className="restaurant-submission-section">

            <div className="restaurant-submission-section-head">

              <span>
                06
              </span>

              <div>
                <strong>
                  Place image
                </strong>

                <small>
                  Add a public image URL for now.
                </small>
              </div>

            </div>


            <label className="restaurant-submission-image-field">

              <ImagePlus size={16} />

              <input
                type="url"
                value={
                  form.image_url
                }
                onChange={
                  event =>
                    updateField(
                      "image_url",
                      event.target.value
                    )
                }
                placeholder="https://..."
              />

            </label>


            {
              form.image_url &&
              (
                <div className="restaurant-submission-image-preview">
                  <img
                    src={
                      form.image_url
                    }
                    alt="Place preview"
                    onError={
                      event => {
                        event.currentTarget.style.display =
                          "none";
                      }
                    }
                  />
                </div>
              )
            }

          </section>


          {
            error &&
            (
              <div className="restaurant-submission-message error">
                {error}
              </div>
            )
          }


          {
            success &&
            (
              <div className="restaurant-submission-message success">
                <Check size={15} />
                {success}
              </div>
            )
          }


          <footer className="restaurant-submission-footer">

            <p>
              FoodKindl admin reviews the submission before
              it is added to the main restaurant database.
            </p>

            <div>

              <button
                type="button"
                className="restaurant-submission-cancel"
                onClick={
                  resetAndClose
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="restaurant-submission-submit"
                disabled={
                  saving
                }
              >
                {
                  saving
                    ? "Submitting..."
                    : "Submit for review"
                }
              </button>

            </div>

          </footer>

        </form>

      </section>

    </div>
  );
}