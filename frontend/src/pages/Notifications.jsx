import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  Utensils,
  UsersRound,
  X,
} from "lucide-react";

import api from "../api";
import "../styles/Notifications.css";

const COOK_TOGETHER_ENDPOINT = "/cook-togethers/";
const DINE_OUT_ENDPOINT = "/dineout/dine-outs/";

/* =========================================================
   API HELPERS
========================================================= */

function extractResults(response) {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

function getDateValue(event) {
  if (event?.starts_at) {
    const date = new Date(event.starts_at);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (!event?.event_date) {
    return null;
  }

  const date = new Date(
    `${event.event_date}T${
      event.start_time || "00:00:00"
    }`
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getTimeLabel(event) {
  const date = getDateValue(event);

  if (!date) {
    return "Time not specified";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getFullDateLabel(event) {
  const date = getDateValue(event);

  if (!date) {
    return "Date not specified";
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function dateKey(date) {
  if (!date) return "";

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================================
   NORMALIZE COOK TOGETHER
========================================================= */

function normalizeCookTogether(invite) {
  return {
    ...invite,

    calendar_type: "cook_together",

    unique_key: `cook-${invite.id}`,

    type_label: "Cook Together",

    type_icon: "🍳",

    details_route:
      `/food-invites/${invite.id}`,

    title:
      invite.title ||
      invite.dish ||
      "Cook Together",

    location:
      invite.location_name ||
      invite.exact_address ||
      "Location not specified",

    attendees:
      Number(
        invite.approved_guest_count ||
        invite.accepted_guests ||
        0
      ),

    eventDate: getDateValue(invite),
  };
}

/* =========================================================
   NORMALIZE DINE OUT
========================================================= */

function normalizeDineOut(invite) {
  return {
    ...invite,

    calendar_type: "dine_out",

    unique_key: `dine-${invite.id}`,

    type_label: "Dine Out",

    type_icon: "🍽️",

    details_route:
      `/dine-out/${invite.id}`,

    title:
      invite.title ||
      invite.restaurant_name ||
      "Dine Out",

    location:
      invite.restaurant_address ||
      invite.restaurant_name ||
      "Location not specified",

    attendees:
      Number(
        invite.accepted_guests ||
        invite.approved_guest_count ||
        0
      ),

    eventDate: getDateValue(invite),
  };
}

/* =========================================================
   CALENDAR HELPERS
========================================================= */

function buildCalendarDays(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay =
    new Date(year, month, 1);

  const lastDay =
    new Date(year, month + 1, 0);

  const startOffset =
    firstDay.getDay();

  const totalDays =
    lastDay.getDate();

  const previousMonthLastDay =
    new Date(year, month, 0)
      .getDate();

  const cells = [];

  /* Previous month */

  for (
    let i = startOffset - 1;
    i >= 0;
    i--
  ) {
    const day =
      previousMonthLastDay - i;

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    cells.push({
      date,
      currentMonth: false,
    });
  }

  /* Current month */

  for (
    let day = 1;
    day <= totalDays;
    day++
  ) {
    cells.push({
      date:
        new Date(
          year,
          month,
          day
        ),

      currentMonth: true,
    });
  }

  /* Next month */

  let nextDay = 1;

  while (cells.length < 42) {
    cells.push({
      date:
        new Date(
          year,
          month + 1,
          nextDay
        ),

      currentMonth: false,
    });

    nextDay++;
  }

  return cells;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Notifications() {
  const navigate = useNavigate();

  const today = useMemo(
    () => new Date(),
    []
  );

  const [
    currentMonth,
    setCurrentMonth,
  ] = useState(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );

  const [
    events,
    setEvents,
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
    selectedEvent,
    setSelectedEvent,
  ] = useState(null);

  /* =======================================================
     LOAD APPROVED EVENTS
  ======================================================= */

  const loadCalendarEvents =
    useCallback(async () => {

      setLoading(true);
      setError("");

      try {
        /*
         * COOK TOGETHER
         *
         * Your FoodInvites.jsx already uses:
         * my-invitations/?status=approved
         */

        const requests = [
          {
            type: "cook-approved",
            request: api.get(
              `${COOK_TOGETHER_ENDPOINT}` +
              "my-invitations/?status=approved"
            ),
          },

          /*
           * Include events created by the
           * logged-in user as well.
           */

          {
            type: "cook-hosted",
            request: api.get(
              `${COOK_TOGETHER_ENDPOINT}` +
              "created-by-me/"
            ),
          },

          /*
           * DINE OUT
           *
           * Your current FoodInvites page
           * already uses the main endpoint.
           */

          {
            type: "dine",
            request: api.get(
              DINE_OUT_ENDPOINT
            ),
          },
        ];

        const results =
          await Promise.allSettled(
            requests.map(
              item => item.request
            )
          );

        let calendarEvents = [];

        results.forEach(
          (result, index) => {

            if (
              result.status !==
              "fulfilled"
            ) {
              console.error(
                "CALENDAR REQUEST FAILED:",
                requests[index].type,
                result.reason
              );

              return;
            }

            const rows =
              extractResults(
                result.value
              );

            if (
              requests[index].type ===
                "cook-approved" ||
              requests[index].type ===
                "cook-hosted"
            ) {
              calendarEvents.push(
                ...rows.map(
                  normalizeCookTogether
                )
              );

              return;
            }

            /*
             * DINE OUT:
             *
             * Only display:
             * - events hosted by the user
             * - events the user accepted/joined
             *
             * Do NOT show every public Dine Out.
             */

            const approvedDineOuts =
              rows.filter(invite => {

                const isHost =
                  Boolean(
                    invite.is_host
                  );

                const response =
                  String(
                    invite.my_response_status ||
                    ""
                  ).toLowerCase();

                return (
                  isHost ||
                  response === "accepted"
                );
              });

            calendarEvents.push(
              ...approvedDineOuts.map(
                normalizeDineOut
              )
            );
          }
        );

        /*
         * Remove duplicates.
         */

        calendarEvents =
          Array.from(
            new Map(
              calendarEvents.map(
                event => [
                  event.unique_key,
                  event,
                ]
              )
            ).values()
          );

        /*
         * Events without dates cannot
         * be positioned on a calendar.
         */

        calendarEvents =
          calendarEvents.filter(
            event =>
              event.eventDate
          );

        /*
         * Sort by date.
         */

        calendarEvents.sort(
          (a, b) =>
            a.eventDate.getTime() -
            b.eventDate.getTime()
        );

        setEvents(
          calendarEvents
        );

      } catch (requestError) {

        console.error(
          "FOODKINDL CALENDAR ERROR:",
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.detail ||
          "Unable to load your FoodKindl calendar."
        );

      } finally {

        setLoading(false);

      }

    }, []);

  useEffect(() => {
    loadCalendarEvents();
  }, [loadCalendarEvents]);

  /*
   * Refresh when user returns to page.
   *
   * Useful after accepting an invite.
   */

  useEffect(() => {

    function refreshCalendar() {
      loadCalendarEvents();
    }

    window.addEventListener(
      "focus",
      refreshCalendar
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshCalendar
      );
    };

  }, [loadCalendarEvents]);

  /* =======================================================
     CALENDAR
  ======================================================= */

  const calendarDays =
    useMemo(
      () =>
        buildCalendarDays(
          currentMonth
        ),
      [currentMonth]
    );

  const eventsByDate =
    useMemo(() => {

      const map = {};

      events.forEach(event => {

        const key =
          dateKey(
            event.eventDate
          );

        if (!map[key]) {
          map[key] = [];
        }

        map[key].push(event);
      });

      return map;

    }, [events]);

  const upcomingEvents =
    useMemo(() => {

      const now =
        Date.now();

      return events
        .filter(
          event =>
            event.eventDate
              .getTime() >= now
        )
        .slice(0, 5);

    }, [events]);

  const monthLabel =
    new Intl.DateTimeFormat(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    ).format(currentMonth);

  function previousMonth() {

    setCurrentMonth(
      current =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1
        )
    );

  }

  function nextMonth() {

    setCurrentMonth(
      current =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1
        )
    );

  }

  function goToday() {

    setCurrentMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

  }

  return (
    <main className="fk-calendar-page">

      {/* HEADER */}

      <section className="fk-calendar-header">

        <div>

          <span className="fk-calendar-eyebrow">
            FOODKINDL PLANNER
          </span>

          <h1>
            Your Food Calendar
          </h1>

          <p>
            Accepted food experiences
            automatically appear here.
          </p>

        </div>

        <button
          type="button"
          className="fk-refresh"
          onClick={
            loadCalendarEvents
          }
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "spinning"
                : ""
            }
          />

          Refresh
        </button>

      </section>

      {error && (
        <div className="fk-calendar-error">
          {error}
        </div>
      )}

      <section className="fk-calendar-layout">

        {/* ===============================================
            MAIN CALENDAR
        =============================================== */}

        <div className="fk-calendar-card">

          <div className="fk-calendar-toolbar">

            <div className="fk-calendar-nav">

              <button
                type="button"
                onClick={
                  previousMonth
                }
                aria-label="Previous month"
              >
                <ChevronLeft
                  size={20}
                />
              </button>

              <button
                type="button"
                onClick={
                  nextMonth
                }
                aria-label="Next month"
              >
                <ChevronRight
                  size={20}
                />
              </button>

              <button
                type="button"
                className="fk-today-button"
                onClick={goToday}
              >
                Today
              </button>

            </div>

            <h2>
              {monthLabel}
            </h2>

            <div className="fk-event-legend">

              <span>
                <i className="cook" />
                Cook Together
              </span>

              <span>
                <i className="dine" />
                Dine Out
              </span>

            </div>

          </div>

          {/* WEEK DAYS */}

          <div className="fk-weekdays">

            {[
              "SUN",
              "MON",
              "TUE",
              "WED",
              "THU",
              "FRI",
              "SAT",
            ].map(day => (
              <div key={day}>
                {day}
              </div>
            ))}

          </div>

          {/* DAYS */}

          <div className="fk-calendar-grid">

            {calendarDays.map(
              (
                calendarDay,
                index
              ) => {

                const key =
                  dateKey(
                    calendarDay.date
                  );

                const dayEvents =
                  eventsByDate[key] ||
                  [];

                const isToday =
                  key ===
                  dateKey(today);

                return (
                  <div
                    key={
                      `${key}-${index}`
                    }
                    className={[
                      "fk-calendar-day",

                      !calendarDay
                        .currentMonth
                        ? "outside"
                        : "",

                      isToday
                        ? "today"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >

                    <div className="fk-day-number">

                      <span>
                        {
                          calendarDay
                            .date
                            .getDate()
                        }
                      </span>

                    </div>

                    <div className="fk-day-events">

                      {dayEvents
                        .slice(0, 3)
                        .map(event => (

                          <button
                            type="button"
                            key={
                              event.unique_key
                            }
                            className={
                              `fk-calendar-event ${
                                event.calendar_type
                              }`
                            }
                            onClick={() =>
                              setSelectedEvent(
                                event
                              )
                            }
                          >

                            <span className="fk-event-time">
                              {
                                getTimeLabel(
                                  event
                                )
                              }
                            </span>

                            <span className="fk-event-title">
                              {
                                event.title
                              }
                            </span>

                          </button>

                        ))}

                      {dayEvents.length >
                        3 && (
                        <button
                          type="button"
                          className="fk-more-events"
                        >
                          +
                          {
                            dayEvents.length -
                            3
                          }{" "}
                          more
                        </button>
                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>

          {loading && (
            <div className="fk-calendar-loading">
              Loading your food
              experiences...
            </div>
          )}

        </div>

        {/* ===============================================
            UPCOMING PANEL
        =============================================== */}

        <aside className="fk-upcoming-panel">

          <div className="fk-upcoming-heading">

            <div className="fk-upcoming-icon">
              <CalendarDays
                size={19}
              />
            </div>

            <div>
              <h3>
                Upcoming
              </h3>

              <p>
                Your next food moments
              </p>
            </div>

          </div>

          <div className="fk-upcoming-list">

            {!loading &&
              upcomingEvents.length ===
                0 && (

                <div className="fk-no-events">

                  <CalendarDays
                    size={32}
                  />

                  <strong>
                    Nothing planned yet
                  </strong>

                  <p>
                    Accepted invitations
                    will appear here.
                  </p>

                </div>

              )}

            {upcomingEvents.map(
              event => (

                <button
                  type="button"
                  key={
                    event.unique_key
                  }
                  className="fk-upcoming-event"
                  onClick={() =>
                    setSelectedEvent(
                      event
                    )
                  }
                >

                  <div
                    className={
                      `fk-upcoming-type ${
                        event.calendar_type
                      }`
                    }
                  >
                    {event.type_icon}
                  </div>

                  <div className="fk-upcoming-copy">

                    <span>
                      {
                        new Intl
                          .DateTimeFormat(
                            "en-IN",
                            {
                              day:
                                "numeric",
                              month:
                                "short",
                            }
                          )
                          .format(
                            event.eventDate
                          )
                      }
                    </span>

                    <strong>
                      {event.title}
                    </strong>

                    <small>
                      {
                        getTimeLabel(
                          event
                        )
                      }
                    </small>

                  </div>

                  <ChevronRight
                    size={17}
                  />

                </button>

              )
            )}

          </div>

          <button
            type="button"
            className="fk-view-invites"
            onClick={() =>
              navigate(
                "/food-invites"
              )
            }
          >
            <Utensils size={17} />

            View Food Invites
          </button>

        </aside>

      </section>

      {/* ===============================================
          EVENT MODAL
      =============================================== */}

      {selectedEvent && (

        <div
          className="fk-event-modal-backdrop"
          onClick={() =>
            setSelectedEvent(null)
          }
        >

          <article
            className="fk-event-modal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="fk-modal-close"
              onClick={() =>
                setSelectedEvent(
                  null
                )
              }
            >
              <X size={20} />
            </button>

            <div
              className={
                `fk-modal-icon ${
                  selectedEvent
                    .calendar_type
                }`
              }
            >
              {
                selectedEvent
                  .type_icon
              }
            </div>

            <span className="fk-modal-type">
              {
                selectedEvent
                  .type_label
              }
            </span>

            <h2>
              {
                selectedEvent
                  .title
              }
            </h2>

            <div className="fk-modal-details">

              <div>
                <CalendarDays
                  size={18}
                />

                <span>
                  {
                    getFullDateLabel(
                      selectedEvent
                    )
                  }
                </span>
              </div>

              <div>
                <MapPin
                  size={18}
                />

                <span>
                  {
                    selectedEvent
                      .location
                  }
                </span>
              </div>

              <div>
                <UsersRound
                  size={18}
                />

                <span>
                  {
                    selectedEvent
                      .attendees
                  }{" "}
                  confirmed
                </span>
              </div>

              <div>
                <Clock3
                  size={18}
                />

                <span>
                  {
                    getTimeLabel(
                      selectedEvent
                    )
                  }
                </span>
              </div>

            </div>

            <button
              type="button"
              className="fk-open-event"
              onClick={() =>
                navigate(
                  selectedEvent
                    .details_route
                )
              }
            >
              View event details

              <ChevronRight
                size={18}
              />
            </button>

          </article>

        </div>

      )}

    </main>
  );
}