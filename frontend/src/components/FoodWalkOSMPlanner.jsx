import React, { useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api"; // your axios instance with auth if needed

// Fix Leaflet icon default paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png",
});

export default function FoodWalkOSMPlanner() {
  const [start, setStart] = useState("Indiranagar, Bangalore");
  const [end, setEnd] = useState("Whitefield, Bangalore");
  const [route, setRoute] = useState(null);
  const [places, setPlaces] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function planRoute() {
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/foodwalk/plan-route-osm/", { start, end });
      setRoute(response.data.route);
      setPlaces(response.data.places);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Network or authorization error. Please login."
      );
    } finally {
      setLoading(false);
    }
  }

  // Convert GeoJSON coordinate pairs from [lng, lat] to [lat, lng] for Leaflet
  const routeCoords = route?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];

  return (
    <div style={{ display: "flex", height: "90vh", fontFamily: "Arial, sans-serif" }}>
      {/* Sidebar controls */}
      <aside
        style={{
          width: 320,
          backgroundColor: "#121212",
          color: "white",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <h2>Food Walk Planner</h2>

        <label>
          Start:
          <input
            type="text"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              marginBottom: 12,
              padding: 6,
              borderRadius: 4,
              border: "none",
            }}
          />
        </label>

        <label>
          End:
          <input
            type="text"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              marginBottom: 12,
              padding: 6,
              borderRadius: 4,
              border: "none",
            }}
          />
        </label>

        <button
          onClick={planRoute}
          disabled={loading}
          style={{
            padding: 10,
            backgroundColor: "#fff",
            color: "#000",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            borderRadius: 6,
            border: "none",
            marginTop: "auto",
          }}
          aria-label="Plan route"
        >
          {loading ? "Planning Route..." : "Plan Route"}
        </button>

        {error && (
          <p style={{ color: "#ff4d4d", marginTop: 12, fontWeight: "bold" }}>{error}</p>
        )}
      </aside>

      {/* Map display */}
      <main style={{ flexGrow: 1 }}>
        <MapContainer
          center={[12.9716, 77.5946]} // Start centered on Bangalore
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          aria-label="Map showing food walk route and places"
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route polyline */}
          {routeCoords.length > 0 && (
            <Polyline positions={routeCoords} color="orange" weight={6} />
          )}

          {/* Place markers */}
          {places.map((place) => (
            <Marker
              key={`${place.osm_type}-${place.id}`}
              position={[place.latitude, place.longitude]}
              title={place.name || "Unnamed place"}
            >
              <Popup>
                <strong>{place.name || "Unnamed"}</strong>
                <br />
                Type: {place.amenity || "Unknown"}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </main>
    </div>
  );
}
