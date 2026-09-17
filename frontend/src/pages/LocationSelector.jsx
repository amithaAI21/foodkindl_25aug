import React from "react";
import { MapPin, CheckCircle2 } from "lucide-react";

// LocationSelector: improved location input with stylish UI/UX
export default function LocationSelector({
  city,
  onCityChange,
  onUseCurrentLocation,
  locationSelected,
}) {
  return (
    <section className="location-selector-card" aria-label="Location selection">
      <label className="location-input-label">
        <MapPin size={18} className="location-icon" aria-hidden="true" />

        <input
          type="text"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder="Try Indiranagar, Koramangala, Nagasandra..."
          className="location-input"
          aria-describedby="locationHelp"
          aria-autocomplete="list"
          aria-controls="locationSuggestions"
          aria-expanded="false"
          role="combobox"
        />
      </label>

      <button
        type="button"
        className="current-location-button"
        onClick={onUseCurrentLocation}
        aria-label="Use my current location"
      >
        <MapPin size={16} className="button-icon" aria-hidden="true" />
        Use my current location
      </button>

      {locationSelected && (
        <div
          className="location-confirmed-badge"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <CheckCircle2 size={20} className="check-icon" aria-hidden="true" />
          <span>Location selected. Searching around this area.</span>
        </div>
      )}
    </section>
  );
}
