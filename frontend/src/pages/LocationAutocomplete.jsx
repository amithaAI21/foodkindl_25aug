import {
  Loader2,
  MapPin,
  Search,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "../api";


const MAX_RESULTS = 8;


/* =========================================================
   HELPERS
========================================================= */

function text(value) {
  return String(
    value || ""
  ).trim();
}


function getPlaceName(place) {
  return (
    text(place?.name) ||
    text(place?.locality) ||
    text(place?.area) ||
    text(place?.display_name) ||
    "Unnamed location"
  );
}


function getDisplayName(place) {
  return (
    text(place?.display_name) ||
    [
      place?.name,
      place?.city,
      place?.state,
      place?.country,
    ]
      .filter(Boolean)
      .join(", ")
  );
}


function getLatitude(place) {
  const value =
    place?.latitude ??
    place?.lat ??
    place?.properties?.lat;

  const latitude =
    Number(value);

  return Number.isFinite(latitude)
    ? latitude
    : null;
}


function getLongitude(place) {
  const value =
    place?.longitude ??
    place?.lon ??
    place?.lng ??
    place?.properties?.lon;

  const longitude =
    Number(value);

  return Number.isFinite(longitude)
    ? longitude
    : null;
}


function makePlaceId(
  place,
  index
) {
  return (
    place?.id ||
    place?.place_id ||
    place?.osm_id ||
    `${getLatitude(place)}-${getLongitude(place)}-${index}`
  );
}


function removeDuplicates(
  places
) {
  const seen =
    new Set();

  return places.filter(
    place => {
      const latitude =
        getLatitude(place);

      const longitude =
        getLongitude(place);

      const key = [
        getPlaceName(place)
          .toLowerCase(),
        latitude,
        longitude,
      ].join("|");

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}


function locationPriority(
  place,
  query
) {
  const displayName =
    getDisplayName(place)
      .toLowerCase();

  const placeName =
    getPlaceName(place)
      .toLowerCase();

  const normalizedQuery =
    query.toLowerCase();

  let score = 0;

  if (
    placeName ===
    normalizedQuery
  ) {
    score += 100;
  }

  if (
    placeName.startsWith(
      normalizedQuery
    )
  ) {
    score += 50;
  }

  if (
    displayName.includes(
      "bengaluru"
    ) ||
    displayName.includes(
      "bangalore"
    )
  ) {
    score += 30;
  }

  if (
    displayName.includes(
      "karnataka"
    )
  ) {
    score += 20;
  }

  if (
    displayName.includes(
      "india"
    )
  ) {
    score += 10;
  }

  return score;
}


/* =========================================================
   COMPONENT
========================================================= */

export default function LocationAutocomplete({
  value = "",
  placeholder =
    "Search area, neighbourhood, landmark or city",
  onChange,
  onSelect,
}) {
  const [
    suggestions,
    setSuggestions,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    searched,
    setSearched,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const wrapperRef =
    useRef(null);

  const inputRef =
    useRef(null);


  const hasValue =
    Boolean(
      text(value)
    );


  const visibleSuggestions =
    useMemo(
      () =>
        suggestions.slice(
          0,
          MAX_RESULTS
        ),
      [
        suggestions,
      ]
    );


  /* =========================================================
     SEARCH
  ========================================================= */

  useEffect(
    () => {
      const query =
        text(value);

      if (
        query.length < 2
      ) {
        setSuggestions([]);
        setOpen(false);
        setSearched(false);
        setError("");
        setLoading(false);

        return undefined;
      }


      const controller =
        new AbortController();


      const timer =
        window.setTimeout(
          async () => {
            setLoading(true);
            setError("");
            setSearched(false);

            try {
              const response =
                await api.get(
                  "/locations/autocomplete/",
                  {
                    params: {
                      q: query,

                      /*
                       * Backend should use this value
                       * to return more suggestions.
                       */
                      limit:
                        MAX_RESULTS,

                      /*
                       * These parameters can be ignored
                       * safely if the backend does not
                       * support them yet.
                       */
                      country:
                        "in",

                      preferred_city:
                        "Bengaluru",

                      include:
                        "locality,neighbourhood,suburb,landmark,station,city",
                    },

                    signal:
                      controller.signal,
                  }
                );


              const responseData =
                response?.data;


              const results =
                Array.isArray(
                  responseData
                )
                  ? responseData
                  : Array.isArray(
                      responseData?.results
                    )
                  ? responseData.results
                  : Array.isArray(
                      responseData?.data
                    )
                  ? responseData.data
                  : [];


              const cleanedResults =
                removeDuplicates(
                  results
                )
                  .filter(
                    place =>
                      getLatitude(place) !==
                        null &&
                      getLongitude(place) !==
                        null
                  )
                  .sort(
                    (
                      first,
                      second
                    ) =>
                      locationPriority(
                        second,
                        query
                      ) -
                      locationPriority(
                        first,
                        query
                      )
                  )
                  .slice(
                    0,
                    MAX_RESULTS
                  );


              setSuggestions(
                cleanedResults
              );

              setOpen(true);

              setSearched(true);
            } catch (
              requestError
            ) {
              if (
                requestError?.name ===
                  "CanceledError" ||
                requestError?.code ===
                  "ERR_CANCELED"
              ) {
                return;
              }

              console.error(
                "Location suggestion error:",
                requestError
              );

              setSuggestions([]);

              setOpen(true);

              setSearched(true);

              setError(
                "Unable to search locations. Please try again."
              );
            } finally {
              if (
                !controller
                  .signal
                  .aborted
              ) {
                setLoading(false);
              }
            }
          },
          450
        );


      return () => {
        window.clearTimeout(
          timer
        );

        controller.abort();
      };
    },
    [
      value,
    ]
  );


  /* =========================================================
     OUTSIDE CLICK
  ========================================================= */

  useEffect(
    () => {
      function handleOutside(
        event
      ) {
        if (
          wrapperRef.current &&
          !wrapperRef
            .current
            .contains(
              event.target
            )
        ) {
          setOpen(false);
        }
      }


      document.addEventListener(
        "mousedown",
        handleOutside
      );


      return () => {
        document.removeEventListener(
          "mousedown",
          handleOutside
        );
      };
    },
    []
  );


  /* =========================================================
     SELECT LOCATION
  ========================================================= */

  function choosePlace(
    place
  ) {
    const normalizedPlace = {
      ...place,

      id:
        place?.id ||
        place?.place_id ||
        place?.osm_id,

      name:
        getPlaceName(
          place
        ),

      display_name:
        getDisplayName(
          place
        ),

      latitude:
        getLatitude(
          place
        ),

      longitude:
        getLongitude(
          place
        ),
    };


    /*
     * Use the short place name inside the input.
     */
    onChange?.(
      normalizedPlace.name
    );


    /*
     * Send the complete selected place,
     * including latitude and longitude,
     * back to the parent component.
     */
    onSelect?.(
      normalizedPlace
    );


    setSuggestions([]);

    setOpen(false);

    setSearched(false);
  }


  /* =========================================================
     CLEAR
  ========================================================= */

  function clearLocation() {
    onChange?.("");

    onSelect?.(null);

    setSuggestions([]);

    setOpen(false);

    setSearched(false);

    setError("");

    window.setTimeout(
      () =>
        inputRef
          .current
          ?.focus(),
      0
    );
  }


  /* =========================================================
     KEYBOARD
  ========================================================= */

  function handleKeyDown(
    event
  ) {
    if (
      event.key ===
        "Escape"
    ) {
      setOpen(false);
    }


    if (
      event.key ===
        "Enter" &&
      visibleSuggestions.length ===
        1
    ) {
      event.preventDefault();

      choosePlace(
        visibleSuggestions[0]
      );
    }
  }


  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      ref={wrapperRef}
      className="fk-location-autocomplete"
    >

      <div
        className={
          `fk-location-input ${
            open
              ? "active"
              : ""
          }`
        }
      >

        <Search
          size={19}
          aria-hidden="true"
        />


        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          aria-label="Search location"
          aria-expanded={open}
          onKeyDown={
            handleKeyDown
          }
          onFocus={() => {
            if (
              suggestions.length >
                0 ||
              searched
            ) {
              setOpen(true);
            }
          }}
          onChange={
            event => {
              onChange?.(
                event
                  .target
                  .value
              );
            }
          }
        />


        {loading && (
          <Loader2
            size={18}
            className="fk-location-loading"
            aria-label="Searching"
          />
        )}


        {!loading &&
          hasValue && (
            <button
              type="button"
              className="fk-location-clear"
              aria-label="Clear location"
              onClick={
                clearLocation
              }
            >
              <X size={17} />
            </button>
          )}

      </div>


      {open && (
        <div
          className="fk-location-suggestions"
          role="listbox"
        >

          {loading && (
            <div className="fk-location-message">
              <Loader2
                size={17}
                className="fk-location-loading"
              />

              Searching places near you…
            </div>
          )}


          {!loading &&
            error && (
              <div className="fk-location-message is-error">
                {error}
              </div>
            )}


          {!loading &&
            !error &&
            searched &&
            visibleSuggestions.length ===
              0 && (
              <div className="fk-location-message">
                No places found for
                “{value}”. Try adding the
                city, for example
                “Indiranagar, Bengaluru”.
              </div>
            )}


          {!loading &&
            visibleSuggestions.map(
              (
                place,
                index
              ) => {
                const placeName =
                  getPlaceName(
                    place
                  );

                const displayName =
                  getDisplayName(
                    place
                  );

                return (
                  <button
                    key={makePlaceId(
                      place,
                      index
                    )}
                    type="button"
                    role="option"
                    className="fk-location-suggestion"
                    onClick={() =>
                      choosePlace(
                        place
                      )
                    }
                  >

                    <span className="fk-location-suggestion-icon">
                      <MapPin
                        size={17}
                      />
                    </span>


                    <span className="fk-location-suggestion-copy">

                      <strong>
                        {placeName}
                      </strong>


                      {displayName &&
                        displayName !==
                          placeName && (
                          <small>
                            {displayName}
                          </small>
                        )}

                    </span>

                  </button>
                );
              }
            )}

        </div>
      )}

    </div>
  );
}