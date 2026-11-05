import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function PublicSOSTracking() {

  const { trackingToken } = useParams();

  const [location, setLocation] = useState(null);
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    let mounted = true;
    let intervalId;

    async function fetchLocation() {

      try {

        const response = await api.get(
          `/safety/sos/track/${trackingToken}/`
        );

        if (!mounted) return;

        if (!response.data.active) {
          setActive(false);
          return;
        }

        setLocation(response.data);
        setError("");

      } catch (err) {

        if (!mounted) return;

        if (err.response?.status === 404) {
          setActive(false);
          return;
        }

        setError("Unable to retrieve the latest location.");

      }
    }

    fetchLocation();

    intervalId = window.setInterval(
      fetchLocation,
      5000
    );

    return () => {

      mounted = false;

      window.clearInterval(intervalId);

    };

  }, [trackingToken]);


  if (!active) {
    return (
      <div>
        <h2>SOS Tracking Ended</h2>
        <p>The user is no longer sharing an active SOS location.</p>
      </div>
    );
  }


  if (error && !location) {
    return <p>{error}</p>;
  }


  if (!location) {
    return <p>Getting latest location...</p>;
  }


  const mapUrl =
    `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;


  return (

    <div style={{ padding: "25px" }}>

      <h1>FoodKindl SOS Tracking</h1>

      <p>
        <strong>Live location:</strong> Active
      </p>

      <p>
        Latitude: {location.latitude}
      </p>

      <p>
        Longitude: {location.longitude}
      </p>

      <p>
        GPS accuracy: {
          location.location_accuracy != null
            ? `${Math.round(location.location_accuracy)} metres`
            : "Unknown"
        }
      </p>

      <p>
        Last updated: {
          location.location_updated_at
            ? new Date(
                location.location_updated_at
              ).toLocaleString()
            : "Waiting for first update"
        }
      </p>

      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        View current location on Google Maps
      </a>

      {error && <p>{error}</p>}

    </div>

  );
}