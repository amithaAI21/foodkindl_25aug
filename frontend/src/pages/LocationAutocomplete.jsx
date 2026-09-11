import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Loader2,
  MapPin,
  Search,
  X,
} from "lucide-react";

import api from "../api";


/* ============================================================
   HELPERS
============================================================ */

function cleanText(value) {
  return String(
    value || ""
  ).trim();
}


function normalizePlace(
  place,
  index = 0
) {

  if (!place) {
    return null;
  }


  /*
   * Already-normalized response from Django
   */
  if (
    place.latitude !== undefined &&
    place.longitude !== undefined
  ) {

    return {
      id:
        place.id ||
        `place-${index}`,

      name:
        place.name ||
        place.display_name ||
        "",

      display_name:
        place.display_name ||
        place.name ||
        "",

      locality:
        place.locality ||
        "",

      county:
        place.county ||
        "",

      region:
        place.region ||
        "",

      country:
        place.country ||
        "",

      latitude:
        Number(
          place.latitude
        ),

      longitude:
        Number(
          place.longitude
        ),
    };

  }


  /*
   * GeoJSON/OpenRouteService style response
   */
  const properties =
    place.properties ||
    {};


  const coordinates =
    place.geometry
      ?.coordinates ||
    [];


  if (
    coordinates.length <
    2
  ) {
    return null;
  }


  const longitude =
    Number(
      coordinates[0]
    );


  const latitude =
    Number(
      coordinates[1]
    );


  if (
    !Number.isFinite(
      latitude
    )
    ||
    !Number.isFinite(
      longitude
    )
  ) {
    return null;
  }


  const displayName =
    properties.label ||
    properties.name ||
    "";


  if (!displayName) {
    return null;
  }


  return {
    id:
      properties.id ||
      `place-${index}-${latitude}-${longitude}`,

    name:
      properties.name ||
      displayName,

    display_name:
      displayName,

    locality:
      properties.locality ||
      properties.localadmin ||
      "",

    county:
      properties.county ||
      "",

    region:
      properties.region ||
      properties.region_a ||
      "",

    country:
      properties.country ||
      "",

    latitude,

    longitude,
  };

}


/* ============================================================
   COMPONENT
============================================================ */

export default function LocationAutocomplete({

  value = "",

  placeholder =
    "Search location",

  onChange,

  onSelect,

}) {

  const [
    searchText,
    setSearchText,
  ] = useState(
    value || ""
  );


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
    error,
    setError,
  ] = useState("");


  const abortRef =
    useRef(null);


  const skipSearchRef =
    useRef(false);


  const blurTimerRef =
    useRef(null);


  /* ============================================================
     SYNC VALUE FROM PARENT
  ============================================================ */

  useEffect(
    () => {

      const parentValue =
        String(
          value || ""
        );


      if (
        parentValue !==
        searchText
      ) {

        setSearchText(
          parentValue
        );

      }

    },
    [
      value,
      searchText,
    ]
  );


  /* ============================================================
     AUTOCOMPLETE SEARCH
  ============================================================ */

  useEffect(
    () => {

      const query =
        cleanText(
          searchText
        );


      /*
       * Do not immediately search again
       * after the user selected a suggestion.
       */
      if (
        skipSearchRef.current
      ) {

        skipSearchRef.current =
          false;

        return;

      }


      if (
        query.length <
        2
      ) {

        setSuggestions(
          []
        );

        setOpen(
          false
        );

        setError(
          ""
        );

        setLoading(
          false
        );

        return;

      }


      const timer =
        window.setTimeout(
          async () => {

            /*
             * Cancel previous request.
             */
            if (
              abortRef.current
            ) {

              abortRef.current.abort();

            }


            const controller =
              new AbortController();


            abortRef.current =
              controller;


            try {

              setLoading(
                true
              );

              setError(
                ""
              );


              const response =
                await api.get(
                  "/locations/autocomplete/",
                  {
                    params: {
                      q: query,
                    },

                    signal:
                      controller.signal,
                  }
                );

              console.log(
                "LOCATION AUTOCOMPLETE RESPONSE:",
                response?.data
              );


              /*
               * Supports:
               *
               * {
               *   results: [...]
               * }
               *
               * OR
               *
               * {
               *   features: [...]
               * }
               */

              const rawResults =
                Array.isArray(
                  response
                    ?.data
                    ?.results
                )
                  ? response
                      .data
                      .results

                  : Array.isArray(
                      response
                        ?.data
                        ?.features
                    )
                    ? response
                        .data
                        .features

                    : [];


              const nextSuggestions =
                rawResults
                  .map(
                    normalizePlace
                  )
                  .filter(
                    Boolean
                  )
                  .filter(
                    place =>
                      place.display_name
                  )
                  .slice(
                    0,
                    20
                  );


              setSuggestions(
                nextSuggestions
              );


              setOpen(
                true
              );


              if (
                nextSuggestions.length ===
                0
              ) {

                console.warn(
                  "NO AUTOCOMPLETE RESULTS FOR:",
                  query
                );

                setError(
                  `No places found for "${query}".`
                );

              } else {

                console.log(
                  "LOCATION AUTOCOMPLETE SUGGESTIONS:",
                  nextSuggestions
                );

              }


            } catch (
              requestError
            ) {

              /*
               * Ignore cancelled requests.
               */
              if (
                requestError?.name ===
                  "CanceledError"
                ||
                requestError?.code ===
                  "ERR_CANCELED"
              ) {

                return;

              }


              console.error(
                "Location autocomplete error:",
                requestError
                  ?.response
                  ?.data
                ||
                requestError
              );


              setSuggestions(
                []
              );


              setOpen(
                false
              );


              const backendMessage =
                requestError
                  ?.response
                  ?.data
                  ?.detail

                ||

                requestError
                  ?.response
                  ?.data
                  ?.error;


              if (
                requestError
                  ?.response
                  ?.status ===
                401
              ) {

                setError(
                  "Please log in again to search locations."
                );

              } else if (
                requestError
                  ?.response
                  ?.status ===
                404
              ) {

                setError(
                  "Location search endpoint was not found."
                );

              } else if (
                requestError
                  ?.response
                  ?.status ===
                503
              ) {

                setError(
                  backendMessage ||
                  "Location search service is temporarily unavailable."
                );

              } else {

                setError(
                  backendMessage ||
                  "Unable to search locations."
                );

              }


            } finally {

              if (
                !controller
                  .signal
                  .aborted
              ) {

                setLoading(
                  false
                );

              }

            }

          },
          300
        );


      return () => {

        window.clearTimeout(
          timer
        );

      };

    },
    [
      searchText,
    ]
  );


  /* ============================================================
     CLEANUP
  ============================================================ */

  useEffect(
    () => {

      return () => {

        if (
          abortRef.current
        ) {

          abortRef.current.abort();

        }


        if (
          blurTimerRef.current
        ) {

          window.clearTimeout(
            blurTimerRef.current
          );

        }

      };

    },
    []
  );


  /* ============================================================
     INPUT CHANGE
  ============================================================ */

  function handleChange(
    event
  ) {

    const nextValue =
      event.target.value;


    setSearchText(
      nextValue
    );


    onChange?.(
      nextValue
    );


    setError(
      ""
    );


    if (
      nextValue
        .trim()
        .length >=
      2
    ) {

      setOpen(
        true
      );

    } else {

      setSuggestions(
        []
      );

      setOpen(
        false
      );

    }

  }


  /* ============================================================
     SELECT PLACE
  ============================================================ */

  function selectPlace(
    place
  ) {

    if (!place) {
      return;
    }


    const label =
      place.display_name ||
      place.name ||
      "";


    /*
     * Prevent another API request
     * caused by updating searchText.
     */
    skipSearchRef.current =
      true;


    setSearchText(
      label
    );


    setSuggestions(
      []
    );


    setOpen(
      false
    );


    setError(
      ""
    );


    onChange?.(
      label
    );


    onSelect?.({
      ...place,

      latitude:
        Number(
          place.latitude
        ),

      longitude:
        Number(
          place.longitude
        ),
    });

  }


  /* ============================================================
     CLEAR
  ============================================================ */

  function clearLocation(
    event
  ) {

    event.preventDefault();
    event.stopPropagation();


    if (
      abortRef.current
    ) {

      abortRef.current.abort();

    }


    setSearchText(
      ""
    );


    setSuggestions(
      []
    );


    setOpen(
      false
    );


    setError(
      ""
    );


    onChange?.(
      ""
    );

  }


  /* ============================================================
     FOCUS
  ============================================================ */

  function handleFocus() {

    if (
      suggestions.length >
      0
    ) {

      setOpen(
        true
      );

    }

  }


  /* ============================================================
     BLUR
  ============================================================ */

  function handleBlur() {

    /*
     * Delay closing so a suggestion
     * can still receive its click.
     */
    blurTimerRef.current =
      window.setTimeout(
        () => {

          setOpen(
            false
          );

        },
        180
      );

  }


  /* ============================================================
     KEYBOARD
  ============================================================ */

  function handleKeyDown(
    event
  ) {

    if (
      event.key ===
      "Escape"
    ) {

      setOpen(
        false
      );

    }

  }


  /* ============================================================
     RENDER
  ============================================================ */

  return (

    <div
      className="fk-location-autocomplete"
    >


      <div
        className={
          open
            ? "fk-location-input active"
            : "fk-location-input"
        }
      >

        <Search
          size={17}
        />


        <input
          type="text"
          value={
            searchText
          }
          placeholder={
            placeholder
          }
          autoComplete="off"
          spellCheck="false"
          onChange={
            handleChange
          }
          onFocus={
            handleFocus
          }
          onBlur={
            handleBlur
          }
          onKeyDown={
            handleKeyDown
          }
          aria-autocomplete="list"
          aria-expanded={
            open
          }
        />


        {
          loading
            ? (

              <Loader2
                size={16}
                className="fk-location-loading"
              />

            )
            : searchText
              ? (

                <button
                  type="button"
                  className="fk-location-clear"
                  onMouseDown={
                    event =>
                      event.preventDefault()
                  }
                  onClick={
                    clearLocation
                  }
                  aria-label="Clear location"
                >

                  <X
                    size={15}
                  />

                </button>

              )
              : null
        }

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {
        error &&
        (

          <small
            className="fk-location-error"
          >
            {
              error
            }
          </small>

        )
      }


      {/* ======================================================
          SUGGESTIONS
      ====================================================== */}

      {
        open &&
        suggestions.length >
        0 &&
        (

          <div
            className="fk-location-suggestions"
            role="listbox"
          >

            {
              suggestions.map(
                (
                  place,
                  index
                ) => {

                  const secondaryText =
                    [
                      place.locality,
                      place.county,
                      place.region,
                      place.country,
                    ]
                      .filter(
                        Boolean
                      )
                      .filter(
                        (
                          item,
                          itemIndex,
                          items
                        ) =>
                          items.indexOf(
                            item
                          ) ===
                          itemIndex
                      )
                      .join(
                        ", "
                      );


                  return (

                    <button
                      type="button"
                      role="option"
                      className="fk-location-suggestion"
                      key={
                        place.id ||
                        `${place.display_name}-${index}`
                      }
                      onMouseDown={
                        event => {

                          /*
                           * Prevent blur before
                           * onClick executes.
                           */
                          event.preventDefault();

                        }
                      }
                      onClick={() =>
                        selectPlace(
                          place
                        )
                      }
                    >

                      <span
                        className="fk-location-suggestion-icon"
                      >

                        <MapPin
                          size={17}
                        />

                      </span>


                      <span
                        className="fk-location-suggestion-copy"
                      >

                        <strong>
                          {
                            place.name ||
                            place.display_name
                          }
                        </strong>


                        {
                          secondaryText &&
                          (

                            <small>
                              {
                                secondaryText
                              }
                            </small>

                          )
                        }


                        <span className="fk-location-full-label">
                          {
                            place.display_name
                          }
                        </span>

                      </span>

                    </button>

                  );

                }
              )
            }

          </div>

        )
      }

    </div>

  );

}