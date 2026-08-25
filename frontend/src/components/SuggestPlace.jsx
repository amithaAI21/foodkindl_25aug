import {
  Building2,
  Coffee,
  Hotel,
  MapPin,
  Plus,
  Store,
  Upload,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import api from "../api";

import "../styles/suggest_place.css";


const CUISINE_CHOICES = [
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


function createInitialForm() {
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
  };
}


export default function SuggestPlace() {
  const [form, setForm] = useState(
    createInitialForm()
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");


  function updateField(
    field,
    value
  ) {
    setForm(
      current => ({
        ...current,
        [field]: value,
      })
    );
  }


  const selectedType = useMemo(
    () => {
      if (
        form.restaurant_type ===
        "cafe"
      ) {
        return {
          label: "Cafe",
          icon: Coffee,
        };
      }

      if (
        form.restaurant_type ===
        "hotel"
      ) {
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
    [
      form.restaurant_type,
    ]
  );


  const SelectedTypeIcon =
    selectedType.icon;


  function useCurrentLocation() {
    setError("");

    if (
      !navigator.geolocation
    ) {
      setError(
        "Location is not supported on this device."
      );

      return;
    }


    navigator.geolocation.getCurrentPosition(
      position => {
        updateField(
          "latitude",
          position.coords.latitude
            .toFixed(6)
        );

        updateField(
          "longitude",
          position.coords.longitude
            .toFixed(6)
        );
      },

      () => {
        setError(
          "Unable to get your location."
        );
      }
    );
  }


  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setMessage("");
    setError("");


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
      setSubmitting(true);

      const payload = {
        ...form,

        name:
          form.name.trim(),

        description:
          form.description.trim(),

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
          form.latitude
            ? Number(
                form.latitude
              )
            : null,

        longitude:
          form.longitude
            ? Number(
                form.longitude
              )
            : null,

        average_cost_for_two:
          form.average_cost_for_two
            ? Number(
                form.average_cost_for_two
              )
            : null,

        opening_time:
          form.opening_time ||
          null,

        closing_time:
          form.closing_time ||
          null,
      };


      await api.post(
        "/restaurant-submissions/",
        payload
      );


      setMessage(
        "Place submitted. FoodKindl will review it before it appears publicly."
      );

      setForm(
        createInitialForm()
      );

    } catch (submitError) {
      console.error(
        "Unable to submit place:",
        submitError.response?.data ||
          submitError
      );

      setError(
        submitError.response?.data
          ?.detail ||
        "Unable to submit this place."
      );

    } finally {
      setSubmitting(false);
    }
  }


  return (
    <main className="suggest-place-page">

      {/* =====================================================
          INTRO
      ====================================================== */}

      <section className="suggest-place-intro">

        <div className="suggest-place-intro-icon">
          <Building2 size={24} />
        </div>

        <div>
          <span>
            COMMUNITY PLACES
          </span>

          <h1>
            Can't find a place?
          </h1>

          <p>
            Suggest a restaurant, cafe or hotel.
            FoodKindl will review it before adding it
            to the main places database.
          </p>
        </div>

      </section>


      {/* =====================================================
          FORM
      ====================================================== */}

      <form
        className="suggest-place-form"
        onSubmit={
          handleSubmit
        }
      >

        {/* TYPE */}

        <section className="suggest-place-section">

          <div className="suggest-place-section-heading">

            <span>
              01
            </span>

            <div>
              <strong>
                What type of place?
              </strong>

              <small>
                Select one.
              </small>
            </div>

          </div>


          <div className="suggest-place-type-grid">

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
              <Store size={19} />

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
              <Coffee size={19} />

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
              <Hotel size={19} />

              Hotel
            </button>

          </div>

        </section>


        {/* BASIC */}

        <section className="suggest-place-section">

          <div className="suggest-place-section-heading">

            <span>
              02
            </span>

            <div>
              <strong>
                Place information
              </strong>

              <small>
                Tell us what you know.
              </small>
            </div>

          </div>


          <div className="suggest-place-grid">

            <label className="suggest-place-full">

              Place name *

              <div className="suggest-place-input-icon">

                <SelectedTypeIcon
                  size={16}
                />

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
                  placeholder={
                    `${selectedType.label} name`
                  }
                />

              </div>

            </label>


            <label>

              Cuisine

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

                <option value="">
                  Select cuisine
                </option>

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
                          value
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

              Price range

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

                <option value="">
                  Not sure
                </option>

                <option value="budget">
                  Budget
                </option>

                <option value="moderate">
                  Moderate
                </option>

                <option value="premium">
                  Premium
                </option>

              </select>

            </label>


            <label className="suggest-place-full">

              Short description

              <textarea
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
                placeholder="Anything useful about this place..."
              />

            </label>

          </div>

        </section>


        {/* LOCATION */}

        <section className="suggest-place-section">

          <div className="suggest-place-section-heading">

            <span>
              03
            </span>

            <div>
              <strong>
                Location
              </strong>

              <small>
                Help us locate the place.
              </small>
            </div>

          </div>


          <div className="suggest-place-grid">

            <label>

              Locality

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

              City *

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


            <label className="suggest-place-full">

              Full address

              <textarea
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
                placeholder="Building, road, area..."
              />

            </label>


            <label>

              Pincode

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


            <div className="suggest-place-location-action">

              <button
                type="button"
                onClick={
                  useCurrentLocation
                }
              >
                <MapPin size={16} />

                Use current location
              </button>

              {
                form.latitude &&
                form.longitude &&
                (
                  <small>
                    {
                      form.latitude
                    }
                    ,{" "}
                    {
                      form.longitude
                    }
                  </small>
                )
              }

            </div>

          </div>

        </section>


        {/* CONTACT */}

        <section className="suggest-place-section">

          <div className="suggest-place-section-heading">

            <span>
              04
            </span>

            <div>
              <strong>
                Contact & timing
              </strong>

              <small>
                Optional.
              </small>
            </div>

          </div>


          <div className="suggest-place-grid">

            <label>

              Phone number

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
              />

            </label>


            <label>

              Website

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
              />

            </label>


            <label>

              Opening time

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

              Closing time

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


            <label>

              Average cost for two

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


        {/* FACILITIES */}

        <section className="suggest-place-section">

          <div className="suggest-place-section-heading">

            <span>
              05
            </span>

            <div>
              <strong>
                Facilities
              </strong>

              <small>
                Select what you know.
              </small>
            </div>

          </div>


          <div className="suggest-place-check-grid">

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
                  "Card payments",
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
                  "Wheelchair accessible",
                ],
                [
                  "serves_vegetarian",
                  "Vegetarian options",
                ],
                [
                  "serves_non_vegetarian",
                  "Non-vegetarian options",
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
                    className="suggest-place-check"
                  >

                    <input
                      type="checkbox"
                      checked={
                        form[
                          field
                        ]
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
                      {label}
                    </span>

                  </label>

                )
              )
            }

          </div>

        </section>


        {/* IMAGE */}

        <section className="suggest-place-section">

          <div className="suggest-place-section-heading">

            <span>
              06
            </span>

            <div>
              <strong>
                Photo
              </strong>

              <small>
                Optional.
              </small>
            </div>

          </div>


          <label>

            Image URL

            <div className="suggest-place-input-icon">

              <Upload size={16} />

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

            </div>

          </label>

        </section>


        {
          error &&
          (
            <p className="suggest-place-error">
              {error}
            </p>
          )
        }


        {
          message &&
          (
            <p className="suggest-place-success">
              {message}
            </p>
          )
        }


        <div className="suggest-place-footer">

          <p>
            Submitted places are reviewed before
            appearing on FoodKindl.
          </p>


          <button
            type="submit"
            disabled={
              submitting
            }
          >

            <Plus size={17} />

            {
              submitting
                ? "Submitting..."
                : "Suggest this place"
            }

          </button>

        </div>

      </form>

    </main>
  );
}