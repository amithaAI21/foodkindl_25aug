import {
  Bike,
  Car,
  Coffee,
  Footprints,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Utensils,
} from "lucide-react";

import FoodWalkPlanner from "./FoodWalkPlanner";

import "../styles/food_walk_invite.css";


const FOOD_MOODS = [
  {
    value: "street_food",
    label: "Street food",
    icon: Utensils,
  },
  {
    value: "coffee",
    label: "Coffee",
    icon: Coffee,
  },
  {
    value: "local_favourites",
    label: "Local favourites",
    icon: Sparkles,
  },
  {
    value: "desserts",
    label: "Desserts",
    icon: Utensils,
  },
];


export default function FoodWalkInvite({
  form,
  updateField,
}) {

  const travelMode =
    form.food_walk_travel_mode ||
    "walk";


  const routeReady =
    Boolean(
      String(
        form.location_label ||
        ""
      ).trim()
    ) &&
    Boolean(
      String(
        form.food_walk_destination ||
        ""
      ).trim()
    );


  function setTravelMode(
    mode
  ) {

    updateField(
      "food_walk_travel_mode",
      mode
    );

  }


  function selectMood(
    value
  ) {

    const isActive =
      form.food_walk_query ===
      value;


    updateField(
      "food_walk_query",
      isActive
        ? ""
        : value
    );


    updateField(
      "cuisine",
      isActive
        ? ""
        : value
    );

  }


  return (
    <section className="fk-foodwalk">

      <div className="fk-foodwalk-intro">

        <div className="fk-foodwalk-intro-icon">

          <Footprints
            size={21}
          />

        </div>


        <div className="fk-foodwalk-intro-copy">

          <span className="fk-foodwalk-eyebrow">
            FOOD TRAIL
          </span>

          <h3>
            Turn the journey into the experience.
          </h3>

          <p>
            Tell FoodKindl where you're starting and where you're going.
            Then discover food stops that make the route worth taking.
          </p>

        </div>


        <div
          className={
            routeReady
              ? "fk-foodwalk-ready ready"
              : "fk-foodwalk-ready"
          }
        >
          <span />

          {
            routeReady
              ? "Route ready"
              : "Build route"
          }
        </div>

      </div>


      <label className="fk-foodwalk-title">

        <span>
          Invite title
        </span>

        <input
          type="text"
          value={form.title}
          onChange={event =>
            updateField(
              "title",
              event.target.value
            )
          }
          placeholder="Sunday morning food trail"
        />

      </label>


      <div className="fk-foodwalk-journey">

        <div className="fk-foodwalk-journey-line">
          <span className="start" />
          <span className="path" />
          <span className="finish" />
        </div>


        <div className="fk-foodwalk-journey-fields">

          <label className="fk-foodwalk-point-card">

            <div className="fk-foodwalk-point-icon start">

              <Navigation
                size={17}
              />

            </div>


            <div className="fk-foodwalk-point-copy">

              <span>
                Start
              </span>

              <small>
                Current location, neighbourhood or landmark
              </small>

              <input
                type="text"
                value={
                  form.location_label ||
                  ""
                }
                onChange={event =>
                  updateField(
                    "location_label",
                    event.target.value
                  )
                }
                placeholder="e.g. Nagasandra"
              />

            </div>

          </label>


          <label className="fk-foodwalk-point-card">

            <div className="fk-foodwalk-point-icon finish">

              <MapPin
                size={17}
              />

            </div>


            <div className="fk-foodwalk-point-copy">

              <span>
                Destination
              </span>

              <small>
                Where the food trail should end
              </small>

              <input
                type="text"
                value={
                  form.food_walk_destination ||
                  ""
                }
                onChange={event =>
                  updateField(
                    "food_walk_destination",
                    event.target.value
                  )
                }
                placeholder="e.g. Majestic"
              />

            </div>

          </label>

        </div>

      </div>

      <div className="fk-foodwalk-food-signal">

        <div className="fk-foodwalk-section-copy">

          <strong>
            What should this trail taste like?
          </strong>

          <small>
            Choose a mood or type something more specific.
          </small>

        </div>


        <div className="fk-foodwalk-moods">

          {
            FOOD_MOODS.map(
              mood => {

                const Icon =
                  mood.icon;


                return (
                  <button
                    type="button"
                    key={mood.value}
                    className={
                      form.food_walk_query ===
                        mood.value
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      selectMood(
                        mood.value
                      )
                    }
                  >
                    <Icon size={14} />
                    {mood.label}
                  </button>
                );

              }
            )
          }

        </div>


        <label className="fk-foodwalk-search">

          <Search
            size={16}
          />

          <input
            type="text"
            value={
              form.cuisine ||
              ""
            }
            onChange={event => {

              updateField(
                "cuisine",
                event.target.value
              );

              updateField(
                "food_walk_query",
                event.target.value
              );

            }}
            placeholder="Dosa, chai, seafood, bakery, local breakfast..."
          />

        </label>

      </div>


      <div className="fk-foodwalk-discovery">

        <div className="fk-foodwalk-discovery-head">

          <div>

            <span className="fk-foodwalk-eyebrow">
              ROUTE DISCOVERY
            </span>

            <h4>
              Build the food trail
            </h4>

            <p>
              Add 2–5 places. You can reorder or remove them before sending the invite.
            </p>

          </div>


          <div className="fk-foodwalk-route-pill">

            <Footprints
              size={14}
            />

            {
              travelMode ===
                "walk"
                ? "Walking trail"
                : travelMode ===
                    "bike"
                  ? "Bike trail"
                  : "Drive trail"
            }

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
          travelMode={
            travelMode
          }
          foodQuery={
            form.food_walk_query ||
            form.cuisine ||
            ""
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
            value => {

              updateField(
                "cuisine",
                value
              );

              updateField(
                "food_walk_query",
                value
              );

            }
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

    </section>
  );
}
