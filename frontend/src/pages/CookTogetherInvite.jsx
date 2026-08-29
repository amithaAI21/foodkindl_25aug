import {
  Home,
  MapPin,
  UsersRound,
} from "lucide-react";


export default function CookTogetherInvite({
  form,
  updateField,
}) {

  return (
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

    </div>
  );
}
