import {
  ArrowRight,
  Coffee,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Utensils,
} from "lucide-react";

import "../styles/dineout_unique.css";


export default function DineOutInvite({
  form,
  updateField,
  cuisineOptions = [],
  restaurantsLoading = false,
  onSearchRestaurants,
}) {

  const cityReady =
    Boolean(
      String(
        form.city ||
        ""
      ).trim()
    );


  const cravingReady =
    Boolean(
      String(
        form.food_query ||
        ""
      ).trim()
    );


  function runDiscovery(
    event
  ) {

    event?.preventDefault?.();


    if (
      !cityReady
    ) {
      return;
    }


    if (
      typeof onSearchRestaurants ===
      "function"
    ) {

      onSearchRestaurants();

    }

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

    runDiscovery(
      event
    );

  }


  function chooseVenueType(
    type
  ) {

    updateField(
      "dine_venue_type",
      type
    );


    if (
      cityReady
    ) {

      window.setTimeout(
        () => {
          onSearchRestaurants?.();
        },
        0
      );

    }

  }


  return (
    <>

      {/* =====================================================
          DINE OUT DISCOVERY
      ====================================================== */}

      <section className="fk-dineout-discovery">

        {/* ---------------------------------------------------
            TOP IDENTITY STRIP
        ---------------------------------------------------- */}

        <div className="fk-dineout-discovery-head">

          <div className="fk-dineout-discovery-symbol">
            <Sparkles size={18} />
          </div>


          <div className="fk-dineout-discovery-copy">

            <span className="fk-dineout-eyebrow">
              DINE SIGNAL
            </span>

            <h3>
              Tell FoodKindl what you're craving.
            </h3>

            <p>
              We’ll turn your craving and city into places worth
              showing up for.
            </p>

          </div>


          <div
            className={
              cityReady
                ? "fk-dineout-status ready"
                : "fk-dineout-status"
            }
          >
            <span />

            {
              cityReady
                ? "City locked"
                : "Add city"
            }
          </div>

        </div>


        {/* ---------------------------------------------------
            INVITE TITLE
        ---------------------------------------------------- */}

        <label className="fk-dineout-field fk-dineout-title-field">

          <span className="fk-dineout-field-label">
            Invite title
          </span>

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
            placeholder="Saturday dinner"
          />

        </label>


        {/* ---------------------------------------------------
            CRAVING + CITY
        ---------------------------------------------------- */}

        <div className="fk-dineout-signal-grid">

          <label className="fk-dineout-signal-card">

            <div className="fk-dineout-signal-icon">
              <Utensils size={18} />
            </div>


            <div className="fk-dineout-signal-content">

              <span className="fk-dineout-field-label">
                What are you craving?
              </span>

              <small>
                Dish, food, restaurant or cuisine
              </small>

              <input
                type="text"
                value={
                  form.food_query ||
                  ""
                }
                onChange={event =>
                  updateField(
                    "food_query",
                    event.target.value
                  )
                }
                onKeyDown={
                  handleEnter
                }
                placeholder="Masala dosa, chocolate, ramen..."
              />

            </div>


            <span
              className={
                cravingReady
                  ? "fk-dineout-signal-dot active"
                  : "fk-dineout-signal-dot"
              }
            />

          </label>


          <label className="fk-dineout-signal-card">

            <div className="fk-dineout-signal-icon">
              <MapPin size={18} />
            </div>


            <div className="fk-dineout-signal-content">

              <span className="fk-dineout-field-label">
                Which city?
              </span>

              <small>
                This controls which places appear on the map
              </small>

              <input
                type="text"
                required
                value={
                  form.city ||
                  ""
                }
                onChange={event =>
                  updateField(
                    "city",
                    event.target.value
                  )
                }
                onKeyDown={
                  handleEnter
                }
                placeholder="Bengaluru, Kalaburagi, Mysuru..."
              />

            </div>


            <span
              className={
                cityReady
                  ? "fk-dineout-signal-dot active"
                  : "fk-dineout-signal-dot"
              }
            />

          </label>

        </div>


        {/* ---------------------------------------------------
            CUISINE LENS
        ---------------------------------------------------- */}

        <div className="fk-dineout-lens-row">

          <div className="fk-dineout-lens-copy">

            <span>
              Cuisine lens
            </span>

            <small>
              Optional — use it to sharpen the match.
            </small>

          </div>


          <select
            className="fk-dineout-lens-select"
            value={
              form.cuisine
            }
            onChange={event =>
              updateField(
                "cuisine",
                event.target.value
              )
            }
            onKeyDown={
              handleEnter
            }
          >

            {
              cuisineOptions.map(
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
                    {option.label}
                  </option>
                )
              )
            }

          </select>

        </div>


        {/* ---------------------------------------------------
            VENUE MODE
        ---------------------------------------------------- */}

        <div className="fk-dineout-venue-mode">

          <div className="fk-dineout-mode-heading">

            <span>
              Place mood
            </span>

            <small>
              Restaurant or café — switch anytime.
            </small>

          </div>


          <div className="fk-dineout-mode-switch">

            <button
              type="button"
              className={
                form.dine_venue_type ===
                  "restaurant"
                  ? "active"
                  : ""
              }
              onClick={() =>
                chooseVenueType(
                  "restaurant"
                )
              }
            >
              <Utensils size={16} />

              <span>
                Restaurant
              </span>
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
                chooseVenueType(
                  "cafe"
                )
              }
            >
              <Coffee size={16} />

              <span>
                Café
              </span>
            </button>

          </div>

        </div>


        {/* ---------------------------------------------------
            DISCOVER ACTION
        ---------------------------------------------------- */}

        <button
          type="button"
          className="fk-dineout-discover-button"
          disabled={
            restaurantsLoading ||
            !cityReady
          }
          onClick={
            runDiscovery
          }
        >

          <span className="fk-dineout-discover-icon">

            {
              restaurantsLoading
                ? (
                    <Navigation
                      size={18}
                    />
                  )
                : (
                    <Search
                      size={18}
                    />
                  )
            }

          </span>


          <span className="fk-dineout-discover-copy">

            <strong>

              {
                restaurantsLoading
                  ? "Scanning the city..."
                  : "Reveal my food map"
              }

            </strong>

            <small>

              {
                cityReady
                  ? (
                      cravingReady
                        ? `Find ${form.food_query} around ${form.city}`
                        : `Explore places around ${form.city}`
                    )
                  : "Add a city to start discovery"
              }

            </small>

          </span>


          <ArrowRight
            size={18}
          />

        </button>


        <div className="fk-dineout-enter-hint">
          Press Enter from the craving or city field to search instantly.
        </div>

      </section>


      {/* =====================================================
          SELECTED PLACE
      ====================================================== */}

      <section className="fk-dineout-place-dock">

        <div className="fk-dineout-place-dock-head">

          <div>

            <span className="fk-dineout-eyebrow">
              YOUR PICK
            </span>

            <h4>
              Pin the place to your invite
            </h4>

          </div>


          <div className="fk-dineout-place-dock-marker">
            <MapPin size={17} />
          </div>

        </div>


        <div className="fk-dineout-place-fields">

          <label>

            <span>
              Selected place
            </span>

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
              placeholder="Choose a marker on the map"
            />

          </label>


          <label>

            <span>
              Area / locality
            </span>

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
              onKeyDown={
                handleEnter
              }
              placeholder="Optional — e.g. Indiranagar"
            />

          </label>

        </div>

      </section>

    </>
  );
}
