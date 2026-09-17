async function planRoute(event) {
  event?.preventDefault();

  setError("");
  setWarning("");

  if (!start.trim() || !end.trim()) {
    setError(
      "Please enter both the starting point and destination."
    );
    return;
  }

  setLoading(true);
  setHasPlanned(false);
  setSelectedStops([]);

  try {
    const response = await api.post(
      "/foodwalk/plan-route-osm/",
      {
        start: start.trim(),
        end: end.trim(),
      }
    );

    const data = response.data || {};

    const receivedPlaces = Array.isArray(data.places)
      ? data.places
      : Array.isArray(data.restaurants)
        ? data.restaurants
        : [];

    setRoute(data.route || null);
    setPlaces(receivedPlaces);

    setRouteInfo({
      distanceKm: data.distance_km,
      durationMinutes: data.duration_minutes,
      start: data.start,
      end: data.end,
    });

    const routeDistance = Number(data.distance_km);

    if (data.warning) {
      setWarning(data.warning);
    } else if (
      Number.isFinite(routeDistance) &&
      routeDistance > MAX_WALK_DISTANCE_KM
    ) {
      const walkDistanceMessage =
        `This route is ${routeDistance} km. Food Walks are best for nearby ` +
        `plans under ${MAX_WALK_DISTANCE_KM} km—try a closer destination.`;

      setWarning(walkDistanceMessage);
      window.alert(walkDistanceMessage);
    }

    setHasPlanned(true);

    console.log("Food Walk response:", data);
    console.log(
      "Food places received:",
      receivedPlaces.length
    );
  } catch (requestError) {
    setRoute(null);
    setPlaces([]);
    setRouteInfo(null);

    setError(
      requestError.response?.data?.error ||
        "The route could not be created. Please try again."
    );
  } finally {
    setLoading(false);
  }
}