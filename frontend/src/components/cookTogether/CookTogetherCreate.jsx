import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import heroImage from "../../assets/cook-together-hero.png";

import {
  publishCookTogether,
  saveCookTogether,
  searchFoodKindlMembers,
} from "./cookTogetherApi";

import "./CookTogetherCreate.css";


const initialForm = {
  title: "",
  dish: "",
  description: "",

  event_date: "",
  start_time: "",

  location_name: "",
  exact_address: "",

  visibility: "public",

  verified_only: true,
  women_only: false,
  host_approval_required: false,

  maximum_guests: 6,
  dietary_notes: "",

  invited_member_ids: [],
  invited_member_names: [],

  agreed: false,
};


const dishSuggestions = [
  "Pasta night",
  "Comfort food",
  "Something healthy",
  "Use what I have",
  "Surprise me",
];


function getMemberName(member) {
  return (
    member?.full_name ||
    [
      member?.first_name,
      member?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    member?.email ||
    "FoodKindl member"
  );
}


function isVerifiedMember(member) {
  return (
    member?.profile?.is_verified === true ||
    member?.profile?.verification_status ===
      "approved"
  );
}


function formatPreviewDate(
  eventDate,
  startTime
) {
  if (
    !eventDate ||
    !startTime
  ) {
    return "Date and time to be set";
  }

  try {
    const value =
      `${eventDate}T${startTime}`;

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return `${eventDate} at ${startTime}`;
  }
}


export default function CookTogetherCreate({
  currentUser,
  onClose,
  onPublished,
  onOpenAiKitchen,
}) {
  const [
    form,
    setForm,
  ] = useState(initialForm);

  const [
    openSection,
    setOpenSection,
  ] = useState("food");

  const [
    inviteId,
    setInviteId,
  ] = useState(null);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    publishedInvite,
    setPublishedInvite,
  ] = useState(null);


  const title = useMemo(
    () =>
      form.title ||
      `${
        form.dish ||
        "Cook Together"
      } gathering`,
    [
      form.title,
      form.dish,
    ]
  );


  function update(
    name,
    value
  ) {
    setForm(
      current => ({
        ...current,
        [name]: value,
      })
    );

    setError("");
  }


  function toggleSection(
    section
  ) {
    setOpenSection(
      current =>
        current === section
          ? ""
          : section
    );

    setError("");
  }


  function validateForPublish() {
    if (!form.dish.trim()) {
      setOpenSection("food");

      setError(
        "Please add what you would like to cook."
      );

      return false;
    }

    if (
      !form.event_date ||
      !form.start_time ||
      !form.location_name.trim()
    ) {
      setOpenSection("place");

      setError(
        "Please add the date, time and location."
      );

      return false;
    }

    if (!form.exact_address.trim()) {
      setOpenSection("place");

      setError(
        "Please add the exact address for invited members."
      );

      return false;
    }

    if (!form.agreed) {
      setError(
        "Please agree to the FoodKindl Community Guidelines."
      );

      return false;
    }

    return true;
  }


  async function persist(
    publish = false
  ) {
    if (
      publish &&
      !validateForPublish()
    ) {
      return false;
    }

    setBusy(true);
    setError("");

    try {
      const payload = {
        title,

        dish:
          form.dish.trim(),

        description:
          form.description.trim(),

        event_date:
          form.event_date ||
          null,

        start_time:
          form.start_time ||
          null,

        location_name:
          form.location_name.trim(),

        exact_address:
          form.exact_address.trim(),

        visibility:
          "public",

        verified_only:
          form.verified_only,

        women_only:
          form.women_only,

        host_approval_required:
          false,

        maximum_guests:
          Number(
            form.maximum_guests
          ) || 1,

        dietary_notes:
          form.dietary_notes.trim(),

        invited_member_ids:
          form.invited_member_ids,
      };

      const saved =
        await saveCookTogether(
          payload,
          inviteId
        );

      setInviteId(
        saved.id
      );

      if (publish) {
        const published =
          await publishCookTogether(
            saved.id
          );

        setPublishedInvite(
          published
        );
      }

      return true;
    } catch (
      requestError
    ) {
      setError(
        requestError?.message ||
        "Could not save this Cook Together."
      );

      return false;
    } finally {
      setBusy(false);
    }
  }


  function handleCancel() {
    if (onClose) {
      onClose();
      return;
    }

    window.history.back();
  }


  function handlePublishedDone() {
    onPublished?.(
      publishedInvite
    );

    if (onClose) {
      onClose();
      return;
    }

    window.location.assign(
      "/food-invites"
    );
  }


  if (publishedInvite) {
    return (
      <main className="ct-new-page">

        <section className="ct-published">

          <span className="ct-published__icon">
            ✓
          </span>

          <span className="ct-kicker">
            COOK TOGETHER PUBLISHED
          </span>

          <h1>
            Your invite is live.
          </h1>

          <p>
            The people you selected will see this
            invitation under their Pending invites.
          </p>

          <button
            type="button"
            className="ct-primary-button"
            onClick={
              handlePublishedDone
            }
          >
            Done
          </button>

        </section>

      </main>
    );
  }


  return (
    <main className="ct-new-page">

      <header className="ct-new-heading">

        <span className="ct-kicker">
          COOK TOGETHER
        </span>

        <h1>
          Plan a meal together
        </h1>

        <p>
          Real food. Real people.
          A happier table.
        </p>

      </header>


      <div className="ct-new-layout">

        <section className="ct-accordion-column">

          <FoodSection
            form={form}
            update={update}
            isOpen={
              openSection ===
              "food"
            }
            toggle={() =>
              toggleSection(
                "food"
              )
            }
            openNext={() =>
              setOpenSection(
                "place"
              )
            }
            onOpenAiKitchen={
              onOpenAiKitchen
            }
          />


          <PlaceSection
            form={form}
            update={update}
            isOpen={
              openSection ===
              "place"
            }
            toggle={() =>
              toggleSection(
                "place"
              )
            }
            openNext={() =>
              setOpenSection(
                "guests"
              )
            }
          />


          <GuestSection
            form={form}
            update={update}
            isOpen={
              openSection ===
              "guests"
            }
            toggle={() =>
              toggleSection(
                "guests"
              )
            }
          />


          <label className="ct-guidelines">

            <input
              type="checkbox"
              checked={
                form.agreed
              }
              onChange={event =>
                update(
                  "agreed",
                  event.target.checked
                )
              }
            />

            <span>
              I agree to the{" "}

              <a
                href="/community-guidelines"
                target="_blank"
                rel="noreferrer"
              >
                FoodKindl Community Guidelines
              </a>
            </span>

          </label>


          {error && (
            <div
              className="ct-error"
              role="alert"
            >
              {error}
            </div>
          )}


          <div className="ct-bottom-actions">

            <button
              type="button"
              className="ct-text-button"
              onClick={
                handleCancel
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="ct-secondary-button"
              disabled={busy}
              onClick={() =>
                persist(false)
              }
            >
              {busy
                ? "Saving..."
                : "Save draft"}
            </button>

          </div>

        </section>


        <LivePreview
          form={form}
          currentUser={
            currentUser
          }
          busy={busy}
          onPublish={() =>
            persist(true)
          }
        />

      </div>

    </main>
  );
}


function AccordionHeader({
  number,
  title,
  description,
  isOpen,
  onClick,
}) {
  return (
    <button
      type="button"
      className="ct-accordion-header"
      aria-expanded={
        isOpen
      }
      onClick={onClick}
    >

      <span className="ct-step-number">
        {number}
      </span>

      <span className="ct-accordion-copy">

        <strong>
          {title}
        </strong>

        <small>
          {description}
        </small>

      </span>

      <span className="ct-chevron">
        {isOpen
          ? "⌃"
          : "⌄"}
      </span>

    </button>
  );
}


function FoodSection({
  form,
  update,
  isOpen,
  toggle,
  openNext,
  onOpenAiKitchen,
}) {
  function openAiKitchen() {
    if (onOpenAiKitchen) {
      onOpenAiKitchen({
        dish:
          form.dish,
      });

      return;
    }

    const query =
      form.dish
        ? `?dish=${encodeURIComponent(
            form.dish
          )}`
        : "";

    window.location.assign(
      `/ai-kitchen${query}`
    );
  }


  return (
    <article
      className={
        isOpen
          ? "ct-accordion is-open"
          : "ct-accordion"
      }
    >

      <AccordionHeader
        number="1"
        title="What are you cooking?"
        description="Share your idea, a dish, or a few ingredients. Get inspiration from AI or go with your own."
        isOpen={isOpen}
        onClick={toggle}
      />


      {isOpen && (
        <div className="ct-accordion-body">

          <div className="ct-dish-entry">

            <input
              type="text"
              value={
                form.dish
              }
              placeholder="e.g. Homemade pasta, a cozy curry, or something seasonal..."
              onChange={event =>
                update(
                  "dish",
                  event.target.value
                )
              }
            />

            <button
              type="button"
              className="ct-ai-button"
              onClick={
                openAiKitchen
              }
            >
              ✦ Ask AI Kitchen
            </button>

          </div>


          <div className="ct-suggestion-list">

            {dishSuggestions.map(
              suggestion => (
                <button
                  type="button"
                  key={
                    suggestion
                  }
                  className={
                    form.dish ===
                    suggestion
                      ? "is-selected"
                      : ""
                  }
                  onClick={() =>
                    update(
                      "dish",
                      suggestion
                    )
                  }
                >
                  {suggestion}
                </button>
              )
            )}

          </div>


          <label className="ct-field">

            <span>
              Add a short description
            </span>

            <textarea
              value={
                form.description
              }
              placeholder="Tell people what makes this meal special..."
              onChange={event =>
                update(
                  "description",
                  event.target.value
                )
              }
            />

          </label>


          <button
            type="button"
            className="ct-section-next"
            onClick={
              openNext
            }
          >
            Choose date and place →
          </button>

        </div>
      )}

    </article>
  );
}


function PlaceSection({
  form,
  update,
  isOpen,
  toggle,
  openNext,
}) {
  const minimumDate =
    new Date()
      .toISOString()
      .split("T")[0];


  return (
    <article
      className={
        isOpen
          ? "ct-accordion is-open"
          : "ct-accordion"
      }
    >

      <AccordionHeader
        number="2"
        title="When and where?"
        description="Pick a date, time and setting — at home or nearby."
        isOpen={isOpen}
        onClick={toggle}
      />


      {isOpen && (
        <div className="ct-accordion-body">

          <div className="ct-two-fields">

            <label className="ct-field">

              <span>
                Date *
              </span>

              <input
                type="date"
                min={
                  minimumDate
                }
                value={
                  form.event_date
                }
                onClick={event =>
                  event.currentTarget
                    .showPicker?.()
                }
                onChange={event =>
                  update(
                    "event_date",
                    event.target.value
                  )
                }
              />

            </label>


            <label className="ct-field">

              <span>
                Time *
              </span>

              <input
                type="time"
                value={
                  form.start_time
                }
                onClick={event =>
                  event.currentTarget
                    .showPicker?.()
                }
                onChange={event =>
                  update(
                    "start_time",
                    event.target.value
                  )
                }
              />

            </label>

          </div>


          <label className="ct-field">

            <span>
              Area or venue *
            </span>

            <input
              type="text"
              value={
                form.location_name
              }
              placeholder="Indiranagar, Bengaluru"
              onChange={event =>
                update(
                  "location_name",
                  event.target.value
                )
              }
            />

          </label>


          <label className="ct-field">

            <span>
              Exact address *
            </span>

            <textarea
              value={
                form.exact_address
              }
              placeholder="House, apartment, clubhouse or venue details"
              onChange={event =>
                update(
                  "exact_address",
                  event.target.value
                )
              }
            />

          </label>


          <div className="ct-location-note">
            📍 The exact address is shown only to
            people directly invited by you.
          </div>


          <button
            type="button"
            className="ct-section-next"
            onClick={
              openNext
            }
          >
            Choose guests →
          </button>

        </div>
      )}

    </article>
  );
}


function GuestSection({
  form,
  update,
  isOpen,
  toggle,
}) {
  const [
    members,
    setMembers,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    memberError,
    setMemberError,
  ] = useState("");


  useEffect(
    () => {
      if (!isOpen) {
        return undefined;
      }

      let active =
        true;

      const timer =
        setTimeout(
          async () => {
            setLoading(true);
            setMemberError("");

            try {
              const results =
                await searchFoodKindlMembers(
                  search
                );

              if (active) {
                setMembers(
                  Array.isArray(
                    results
                  )
                    ? results
                    : []
                );
              }
            } catch (
              requestError
            ) {
              if (active) {
                setMemberError(
                  requestError?.message ||
                  "Could not load FoodKindl members."
                );
              }
            } finally {
              if (active) {
                setLoading(false);
              }
            }
          },
          300
        );

      return () => {
        active = false;

        clearTimeout(
          timer
        );
      };
    },
    [
      search,
      isOpen,
    ]
  );


  function isSelected(
    memberId
  ) {
    return (
      form
        .invited_member_ids
        .includes(
          Number(
            memberId
          )
        )
    );
  }


  function toggleMember(
    member
  ) {
    const memberId =
      Number(
        member.id
      );

    const memberName =
      getMemberName(
        member
      );

    if (
      isSelected(
        memberId
      )
    ) {
      update(
        "invited_member_ids",
        form
          .invited_member_ids
          .filter(
            id =>
              id !==
              memberId
          )
      );

      update(
        "invited_member_names",
        form
          .invited_member_names
          .filter(
            name =>
              name !==
              memberName
          )
      );

      return;
    }

    if (
      form
        .invited_member_ids
        .length >=
      form.maximum_guests
    ) {
      setMemberError(
        `You can invite up to ${form.maximum_guests} people.`
      );

      return;
    }

    update(
      "invited_member_ids",
      [
        ...form
          .invited_member_ids,
        memberId,
      ]
    );

    update(
      "invited_member_names",
      [
        ...form
          .invited_member_names,
        memberName,
      ]
    );

    setMemberError("");
  }


  function decreaseGuests() {
    const minimum =
      Math.max(
        1,
        form
          .invited_member_ids
          .length
      );

    update(
      "maximum_guests",
      Math.max(
        minimum,
        form.maximum_guests -
          1
      )
    );
  }


  return (
    <article
      className={
        isOpen
          ? "ct-accordion is-open"
          : "ct-accordion"
      }
    >

      <AccordionHeader
        number="3"
        title="Who would you like to join?"
        description="Invite friends, your community, or meet new food lovers."
        isOpen={isOpen}
        onClick={toggle}
      />


      {isOpen && (
        <div className="ct-accordion-body">

          <div className="ct-guest-summary">

            <div>

              <strong>
                Invite FoodKindl members
              </strong>

              <small>
                Directly invited members can see
                the exact location before accepting.
              </small>

            </div>

            <span>
              {
                form
                  .invited_member_ids
                  .length
              }
              /
              {
                form
                  .maximum_guests
              }
            </span>

          </div>


          <input
            type="search"
            className="ct-member-search"
            value={search}
            placeholder="Search members by name"
            onChange={event =>
              setSearch(
                event.target.value
              )
            }
          />


          {form
            .invited_member_names
            .length > 0 && (
            <div className="ct-selected-members">

              {form
                .invited_member_names
                .map(
                  name => (
                    <span
                      key={
                        name
                      }
                    >
                      {name}
                    </span>
                  )
                )}

            </div>
          )}


          <div className="ct-member-list">

            {loading && (
              <p className="ct-member-message">
                Loading members...
              </p>
            )}


            {!loading &&
              memberError && (
              <p className="ct-member-error">
                {memberError}
              </p>
            )}


            {!loading &&
              !memberError &&
              members.length ===
                0 && (
              <p className="ct-member-message">
                No members found.
              </p>
            )}


            {!loading &&
              members.map(
                member => {
                  const selected =
                    isSelected(
                      member.id
                    );

                  const name =
                    getMemberName(
                      member
                    );

                  return (
                    <button
                      type="button"
                      key={
                        member.id
                      }
                      className={
                        selected
                          ? "ct-member is-selected"
                          : "ct-member"
                      }
                      onClick={() =>
                        toggleMember(
                          member
                        )
                      }
                    >

                      <span className="ct-member-avatar">
                        {name
                          .charAt(0)
                          .toUpperCase()}
                      </span>

                      <span className="ct-member-info">

                        <strong>
                          {name}
                        </strong>

                        <small>
                          {isVerifiedMember(
                            member
                          )
                            ? "✓ Verified profile"
                            : member.email ||
                              ""}
                        </small>

                      </span>

                      <span className="ct-member-toggle">
                        {selected
                          ? "✓"
                          : "+"}
                      </span>

                    </button>
                  );
                }
              )}

          </div>


          <div className="ct-guest-settings">

            <label className="ct-counter">

              <span>
                Maximum guests
              </span>

              <div>

                <button
                  type="button"
                  onClick={
                    decreaseGuests
                  }
                >
                  −
                </button>

                <strong>
                  {
                    form
                      .maximum_guests
                  }
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    update(
                      "maximum_guests",
                      Math.min(
                        20,
                        form.maximum_guests +
                          1
                      )
                    )
                  }
                >
                  +
                </button>

              </div>

            </label>


            <Switch
              label="Verified profiles only"
              checked={
                form.verified_only
              }
              onChange={value =>
                update(
                  "verified_only",
                  value
                )
              }
            />


            <Switch
              label="Women-only gathering"
              checked={
                form.women_only
              }
              onChange={value =>
                update(
                  "women_only",
                  value
                )
              }
            />

          </div>


          <label className="ct-field">

            <span>
              Dietary preferences or allergies
            </span>

            <input
              type="text"
              value={
                form.dietary_notes
              }
              placeholder="Add anything guests should know"
              onChange={event =>
                update(
                  "dietary_notes",
                  event.target.value
                )
              }
            />

          </label>

        </div>
      )}

    </article>
  );
}


function Switch({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="ct-switch">

      <span>
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={event =>
          onChange(
            event.target.checked
          )
        }
      />

      <i />

    </label>
  );
}


function LivePreview({
  form,
  currentUser,
  busy,
  onPublish,
}) {
  const hostName =
    currentUser?.full_name ||
    currentUser?.name ||
    currentUser?.first_name ||
    "You";

  const hostInitial =
    hostName
      .charAt(0)
      .toUpperCase();


  return (
    <aside className="ct-preview-card">

      <div className="ct-preview-heading">

        <h2>
          Preview
        </h2>

        <span>
          ◉
        </span>

      </div>


      <div
        className="ct-preview-image"
        style={{
          backgroundImage:
            `linear-gradient(
              to bottom,
              rgba(10, 3, 1, 0.04),
              rgba(10, 3, 1, 0.2)
            ), url(${heroImage})`,
        }}
      >

        <div className="ct-preview-quote">
          Good food<br />
          brings<br />
          people<br />
          together ♡
        </div>

      </div>


      <div className="ct-preview-host">

        <div className="ct-preview-avatar">
          {hostInitial}
        </div>

        <div>

          <small>
            Hosted by
          </small>

          <strong>
            {hostName}
          </strong>

          <p>
            🧡 Good food, brighter days
          </p>

        </div>

      </div>


      <div className="ct-preview-details">

        <p>
          <span>👥</span>

          Up to {
            form.maximum_guests
          } people
        </p>

        <p>
          <span>🌱</span>

          {
            form.dish ||
            "Simple food. Good company."
          }
        </p>

        <p>
          <span>🗓️</span>

          {
            formatPreviewDate(
              form.event_date,
              form.start_time
            )
          }
        </p>

        <p>
          <span>⌂</span>

          {
            form.location_name ||
            "Location to be set"
          }
        </p>

      </div>


      <button
        type="button"
        className="ct-primary-button ct-publish-button"
        disabled={busy}
        onClick={
          onPublish
        }
      >
        {busy
          ? "Publishing..."
          : "Publish invite"}
      </button>


      <small className="ct-preview-help">
        You can edit anything before publishing.
      </small>

    </aside>
  );
}