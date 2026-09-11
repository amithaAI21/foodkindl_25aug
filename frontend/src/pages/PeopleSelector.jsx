import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api";

const PEOPLE_ENDPOINT =
  "/auth/people/";

function normalizePerson(raw) {
  const fullName =
    raw?.full_name ||
    `${raw?.first_name || ""} ${
      raw?.last_name || ""
    }`.trim() ||
    raw?.username ||
    raw?.email ||
    "FoodKindl member";

  return {
    id:
      raw?.id ??
      raw?.user_id ??
      raw?.pk,

    name:
      fullName,

    username:
      raw?.username || "",

    email:
      raw?.email || "",

    photo:
      raw?.profile_photo ||
      raw?.profile_image ||
      raw?.avatar ||
      raw?.photo_url ||
      "",

    location:
      raw?.location_label ||
      raw?.city ||
      raw?.locality ||
      "",

    verified:
      Boolean(
        raw?.is_verified ??
        raw?.verified ??
        false
      ),

    foodMatch:
      raw?.food_match_percentage ??
      raw?.match_percentage ??
      raw?.food_match ??
      null,
  };
}

function extractPeople(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.users)) {
    return data.users;
  }

  if (Array.isArray(data?.people)) {
    return data.people;
  }

  if (Array.isArray(data?.members)) {
    return data.members;
  }

  return [];
}

export default function PeopleSelector({
  selectedIds = [],
  onChange,
  maxSelections = null,
  label = "Invite FoodKindl members",
  helperText =
    "Add people here. The invite is sent when you click Create Dine Out.",
}) {
  const [
    people,
    setPeople,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const safeSelectedIds =
    useMemo(
      () =>
        Array.isArray(selectedIds)
          ? selectedIds
          : [],
      [selectedIds]
    );

  const selectedIdSet =
    useMemo(
      () =>
        new Set(
          safeSelectedIds.map(
            (id) =>
              String(id)
          )
        ),
      [safeSelectedIds]
    );

  const selectedPeople =
    useMemo(
      () =>
        people.filter(
          (person) =>
            selectedIdSet.has(
              String(person.id)
            )
        ),
      [
        people,
        selectedIdSet,
      ]
    );

  const visiblePeople =
    useMemo(
      () => {
        const query =
          String(search || "")
            .trim()
            .toLowerCase();

        if (!query) {
          return people;
        }

        return people.filter(
          (person) => {
            const text = [
              person.name,
              person.username,
              person.email,
              person.location,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return text.includes(
              query
            );
          }
        );
      },
      [
        people,
        search,
      ]
    );

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadPeople() {
        setLoading(true);
        setError("");

        try {
          /*
           * api should already attach your JWT token.
           * This request only loads eligible FoodKindl members.
           */
          const response =
            await api.get(
              PEOPLE_ENDPOINT
            );

          const rawPeople =
            extractPeople(
              response?.data
            );

          const normalized =
            rawPeople
              .map(
                normalizePerson
              )
              .filter(
                (person) =>
                  person.id !==
                    null &&
                  person.id !==
                    undefined
              );

          if (!cancelled) {
            setPeople(
              normalized
            );
          }

        } catch (
          requestError
        ) {
          console.error(
            "FOODKINDL PEOPLE LOAD ERROR:",
            requestError?.response
              ?.status,
            requestError?.response
              ?.data,
            requestError
          );

          if (cancelled) {
            return;
          }

          if (
            requestError?.response
              ?.status === 401
          ) {
            setError(
              "Your login session has expired. Please log in again."
            );
            return;
          }

          setError(
            requestError?.response
              ?.data?.detail ||
            requestError?.response
              ?.data?.error ||
            "Unable to load FoodKindl members."
          );

        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      loadPeople();

      return () => {
        cancelled = true;
      };
    },
    []
  );

  function addPerson(
    person
  ) {
    if (
      person?.id === null ||
      person?.id === undefined
    ) {
      return;
    }

    const id =
      Number(person.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      setError(
        "This member has an invalid user ID."
      );
      return;
    }

    if (
      selectedIdSet.has(
        String(id)
      )
    ) {
      return;
    }

    const limit =
      Number(
        maxSelections
      );

    if (
      Number.isFinite(limit) &&
      limit > 0 &&
      safeSelectedIds.length >=
        limit
    ) {
      setError(
        `You can invite up to ${limit} people.`
      );
      return;
    }

    /*
     * IMPORTANT:
     * This adds the member ID to the Dine Out form.
     * The actual server invitation is sent when the
     * parent DineOut form is submitted.
     */
    onChange?.([
      ...safeSelectedIds,
      id,
    ]);

    setError("");
  }

  function removePerson(
    id
  ) {
    onChange?.(
      safeSelectedIds.filter(
        (selectedId) =>
          String(selectedId) !==
          String(id)
      )
    );

    setError("");
  }

  return (
    <section className="people-selector">

      <div className="people-selector-header">
        <div>

          <div className="people-selector-label">
            {label}
          </div>

          <p className="people-selector-helper">
            {helperText}
          </p>

        </div>

        {maxSelections !==
          null &&
          maxSelections !==
            undefined && (
          <span className="people-selector-count">
            {
              safeSelectedIds.length
            }
            /
            {
              maxSelections
            }
          </span>
        )}

      </div>


      {/* SELECTED RECIPIENTS */}

      {selectedPeople.length >
        0 && (
        <div className="people-selected-list">

          {selectedPeople.map(
            (person) => (
              <div
                key={
                  person.id
                }
                className="people-selected-chip"
              >

                {person.photo ? (
                  <img
                    src={
                      person.photo
                    }
                    alt={
                      person.name
                    }
                  />
                ) : (
                  <div className="people-avatar-fallback">
                    {person.name
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "F"}
                  </div>
                )}

                <span>
                  {person.name}
                </span>

                <button
                  type="button"
                  aria-label={
                    `Remove ${person.name}`
                  }
                  onClick={() =>
                    removePerson(
                      person.id
                    )
                  }
                >
                  ×
                </button>

              </div>
            )
          )}

        </div>
      )}


      <div
        style={{
          marginTop: 16,
          marginBottom: 10,
          fontWeight: 900,
          color: "#fff3df",
        }}
      >
        FoodKindl members
      </div>


      <input
        type="text"
        value={
          search
        }
        onChange={
          (event) =>
            setSearch(
              event.target.value
            )
        }
        placeholder=
          "Search FoodKindl members..."
        style={{
          width: "100%",
          marginBottom: 12,
        }}
      />


      {loading && (
        <div className="people-result-message">
          Loading FoodKindl members...
        </div>
      )}


      {error && (
        <div className="people-result-error">
          {error}
        </div>
      )}


      {!loading &&
        !error &&
        people.length ===
          0 && (
        <div className="people-result-message">
          No FoodKindl members available.
        </div>
      )}


      {!loading &&
        visiblePeople.length >
          0 && (
        <div className="people-members-grid">

          {visiblePeople.map(
            (person) => {

              const selected =
                selectedIdSet.has(
                  String(
                    person.id
                  )
                );

              const limit =
                Number(
                  maxSelections
                );

              const limitReached =
                Number.isFinite(
                  limit
                ) &&
                limit > 0 &&
                safeSelectedIds
                  .length >=
                  limit;

              return (
                <article
                  key={
                    person.id
                  }
                  className={
                    `people-member-card ${
                      selected
                        ? "selected"
                        : ""
                    }`
                  }
                >

                  <div className="people-member-avatar">

                    {person.photo ? (
                      <img
                        src={
                          person.photo
                        }
                        alt={
                          person.name
                        }
                      />
                    ) : (
                      <div className="people-avatar-fallback">
                        {person.name
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          "F"}
                      </div>
                    )}

                  </div>


                  <div className="people-member-info">

                    <div className="people-result-name">

                      {
                        person.name
                      }

                      {person.verified && (
                        <span
                          title="Verified profile"
                        >
                          ✓
                        </span>
                      )}

                    </div>


                    <div className="people-result-meta">

                      {person.location && (
                        <span>
                          📍{" "}
                          {
                            person.location
                          }
                        </span>
                      )}

                      {person.foodMatch !==
                        null &&
                        person.foodMatch !==
                          undefined && (
                        <span>
                          Food Match{" "}
                          {
                            person.foodMatch
                          }
                          %
                        </span>
                      )}

                    </div>

                  </div>


                  <button
                    type="button"
                    className={
                      selected
                        ? "fi-secondary"
                        : "fi-primary"
                    }
                    disabled={
                      selected ||
                      (
                        !selected &&
                        limitReached
                      )
                    }
                    onClick={() =>
                      addPerson(
                        person
                      )
                    }
                  >
                    {
                      selected
                        ? "Added ✓"
                        : limitReached
                          ? "Limit reached"
                          : "Add to invite"
                    }
                  </button>

                </article>
              );
            }
          )}

        </div>
      )}


      {selectedPeople.length >
        0 && (
        <div
          className=
            "people-result-message"
          style={{
            marginTop: 12,
          }}
        >
          {
            selectedPeople.length
          }{" "}
          {
            selectedPeople.length ===
              1
              ? "person"
              : "people"
          }{" "}
          added. Click{" "}
          <strong>
            Create Dine Out
          </strong>{" "}
          to send the invitation.
        </div>
      )}

    </section>
  );
}
