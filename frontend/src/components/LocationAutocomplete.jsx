import {
  MapPin,
  Search,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import api from "../api";


export default function LocationAutocomplete({

  value = "",

  placeholder =
    "Search locality, area or city",

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


  const wrapperRef =
    useRef(null);


  /* =========================================================
     SEARCH
  ========================================================= */

  useEffect(
    () => {

      const query =
        value.trim();


      if (
        query.length < 2
      ) {

        setSuggestions(
          []
        );

        setOpen(
          false
        );

        return;
      }


      const timer =
        window.setTimeout(
          async () => {

            try {

              setLoading(
                true
              );


              const response =
                await api.get(
                  "/locations/autocomplete/",
                  {
                    params: {
                      q:
                        query,
                    },
                  }
                );


              const results =
                Array.isArray(
                  response.data?.results
                )
                  ? response.data.results
                  : [];


              setSuggestions(
                results
              );


              setOpen(
                results.length > 0
              );


            } catch (
              error
            ) {

              console.error(
                "Location suggestion error:",
                error
              );


              setSuggestions(
                []
              );


            } finally {

              setLoading(
                false
              );
            }

          },
          350
        );


      return () =>
        window.clearTimeout(
          timer
        );

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
          !wrapperRef.current.contains(
            event.target
          )
        ) {

          setOpen(
            false
          );
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


  function choosePlace(
    place
  ) {

    onChange?.(
      place.name ||
      place.display_name
    );


    onSelect?.(
      place
    );


    setOpen(
      false
    );
  }


  return (

    <div
      ref={wrapperRef}
      className="fk-location-autocomplete"
    >

      <div className="fk-location-input">

        <Search
          size={15}
        />


        <input
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {

            if (
              suggestions.length
            ) {

              setOpen(
                true
              );
            }

          }}
          onChange={
            event =>
              onChange?.(
                event.target.value
              )
          }
        />


        {
          loading &&
          (

            <span className="fk-location-loading">
              Searching...
            </span>

          )
        }

      </div>


      {
        open &&
        (

          <div className="fk-location-suggestions">

            {
              suggestions.map(
                place => (

                  <button
                    key={
                      place.id
                    }
                    type="button"
                    className="fk-location-suggestion"
                    onClick={() =>
                      choosePlace(
                        place
                      )
                    }
                  >

                    <span className="fk-location-pin">

                      <MapPin
                        size={15}
                      />

                    </span>


                    <span>

                      <strong>
                        {
                          place.name ||
                          place.display_name
                        }
                      </strong>


                      <small>
                        {
                          place.display_name
                        }
                      </small>

                    </span>

                  </button>

                )
              )
            }

          </div>

        )
      }

    </div>

  );
}