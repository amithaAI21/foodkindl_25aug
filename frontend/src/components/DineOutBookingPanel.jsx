
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../api";

const BOOKING_API_PREFIX = "";

const styles = {
  panel: {
    padding: 20,
    marginTop: 20,
    border: "1px solid #b8a39b",
    borderRadius: 12,
  },
  message: {
    marginTop: 16,
    padding: 16,
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 10,
  },
  button: {
    padding: "12px 20px",
    marginTop: 14,
    borderRadius: 8,
    border: "none",
    background: "#ff7948",
    color: "#1c0d08",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    marginTop: 14,
    color: "#ffab8e",
  },
};

function apiErrorMessage(error, fallback) {
  const status = error.response?.status;
  const data = error.response?.data;

  if (status === 401) {
    return "Your session expired. Please log in again.";
  }

  if (status === 403) {
    return "Only the invitation host can request a table.";
  }

  if (status === 404) {
    return "Booking API or invitation not found.";
  }

  if (status >= 500) {
    return "Booking server error. Check the Django terminal.";
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail.join(" ");
  }

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, value]) => {
        const text = Array.isArray(value)
          ? value.join(", ")
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);

        return `${field}: ${text}`;
      })
      .join(" | ");
  }

  if (!error.response) {
    return "Cannot connect to Django.";
  }

  return fallback;
}

/* ==========================================================
   WALK-IN INFORMATION
========================================================== */

function WalkInMessage() {
  return (
    <div style={styles.message}>
      <h4 style={{ color: "#76dfaa" }}>
        Walk-ins Welcome
      </h4>

      <p>
        This restaurant welcomes walk-in guests.
        You may visit with your FoodKindl Dine Out group.
      </p>

      <p>
        <strong>Important:</strong> No table has been
        reserved for your group. Seating depends on
        availability when you arrive.
      </p>

      <p>
        We recommend contacting the restaurant
        before travelling, especially for larger groups.
      </p>
    </div>
  );
}

/* ==========================================================
   BOOKING STATUS
========================================================== */

function BookingStatus({
  booking,
  allowsWalkIns,
}) {
  const bookingStatus = booking.status;

  return (
    <div style={styles.message}>
      <h4>Restaurant Booking Status</h4>

      <p>
        Booking reference:{" "}
        <strong>
          {booking.booking_reference}
        </strong>
      </p>

      <p>
        Diners:{" "}
        <strong>
          {booking.guest_count}
        </strong>
      </p>

      {bookingStatus === "pending" && (
        <>
          <h4 style={{ color: "#ffbd75" }}>
            Waiting for Restaurant Confirmation
          </h4>
          <p>
            Your table request has been sent to the
            restaurant. Your reservation is not yet confirmed.
          </p>
        </>
      )}

      {bookingStatus === "confirmed" && (
        <>
          <h4 style={{ color: "#76dfaa" }}>
            Table Confirmed
          </h4>
          <p>
            The restaurant has confirmed your table
            for {booking.guest_count} people.
          </p>
        </>
      )}

      {bookingStatus === "rejected" && (
        <>
          <h4 style={{ color: "#ffab8e" }}>
            Reservation Declined
          </h4>

          <p>
            The restaurant could not confirm your
            table booking request.
          </p>

          {allowsWalkIns ? (
            <WalkInMessage />
          ) : (
            <p>
              Walk-in availability has not been
              confirmed. Please contact the restaurant
              or choose another venue.
            </p>
          )}
        </>
      )}

      {bookingStatus === "cancelled" && (
        <>
          <h4>Booking Cancelled</h4>
          <p>
            Your reservation is cancelled.
            No table is held for this booking.
          </p>

          {allowsWalkIns && <WalkInMessage />}
        </>
      )}

      {bookingStatus === "completed" && (
        <p>This restaurant booking has been completed.</p>
      )}
    </div>
  );
}

/* ==========================================================
   MAIN COMPONENT
========================================================== */

export default function DineOutBookingPanel({
  dineOutId,
  acceptedGuests = 0,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const acceptedCount = Math.max(
    0,
    Number(acceptedGuests) || 0
  );

  const eligibilityUrl =
    `${BOOKING_API_PREFIX}/table-bookings/eligibility/` +
    `${dineOutId}/`;

  const bookingsUrl =
    `${BOOKING_API_PREFIX}/table-bookings/`;

  /* ========================================================
     LOAD BOOKING ELIGIBILITY
  ======================================================== */

  const refresh = useCallback(async () => {
    if (!dineOutId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(eligibilityUrl);
      setData(response.data);
    } catch (err) {
      console.error("BOOKING ELIGIBILITY ERROR:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });

      setData(null);
      setError(
        apiErrorMessage(
          err,
          "Unable to check booking eligibility."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [dineOutId, eligibilityUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh, acceptedCount]);

  /* ========================================================
     REQUEST TABLE
  ======================================================== */

  async function requestBooking() {
    if (
      sending ||
      loading ||
      !data?.can_book ||
      data?.booking
    ) {
      return;
    }

    setSending(true);
    setError("");

    try {
      await api.post(bookingsUrl, {
        dine_out_id: dineOutId,
        special_request: notes.trim(),
      });

      setNotes("");
      await refresh();
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "Unable to request a table."
        )
      );
    } finally {
      setSending(false);
    }
  }

  if (!dineOutId) {
    return null;
  }

  const serverCount = Number(data?.accepted_guests);

  const displayedAcceptedCount =
    data && Number.isFinite(serverCount)
      ? serverCount
      : acceptedCount;

  const totalDiners = displayedAcceptedCount + 1;

  const existingBooking = data?.booking || null;

  // Only explicitly true means the restaurant
  // confirmed it accepts walk-ins.
  const allowsWalkIns = data?.allows_walk_ins === true;

  const canBook =
    data?.can_book === true &&
    displayedAcceptedCount >= 1 &&
    !existingBooking;

  return (
    <section
      className="dineout-booking-panel"
      style={styles.panel}
    >
      <h3>FoodKindl Partner — Table Booking</h3>

      <p>
        Accepted guests:{" "}
        <strong>{displayedAcceptedCount}</strong>
      </p>

      <p>
        Total diners including host:{" "}
        <strong>{totalDiners}</strong>
      </p>

      {loading ? (
        <p role="status">
          Checking booking eligibility...
        </p>
      ) : existingBooking ? (
        <BookingStatus
          booking={existingBooking}
          allowsWalkIns={allowsWalkIns}
        />
      ) : canBook ? (
        <div style={styles.message}>
          <h4>Ready to Request a Table</h4>

          <p>
            Restaurant:{" "}
            <strong>{data.restaurant_name}</strong>
          </p>

          <p>
            Date:{" "}
            <strong>{data.booking_date}</strong>
          </p>

          <p>
            Time:{" "}
            <strong>{data.booking_time}</strong>
          </p>

          <p>
            Party size:{" "}
            <strong>{data.guest_count} people</strong>
          </p>

          <label
            htmlFor="foodkindl-table-notes"
            style={{ display: "block", marginTop: 16 }}
          >
            Special request (optional)
          </label>

          <textarea
            id="foodkindl-table-notes"
            value={notes}
            maxLength={2000}
            rows={3}
            placeholder="Window seat, birthday celebration..."
            onChange={(event) =>
              setNotes(event.target.value)
            }
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              marginTop: 8,
              borderRadius: 8,
            }}
          />

          <button
            type="button"
            style={styles.button}
            disabled={sending}
            onClick={requestBooking}
          >
            {sending
              ? "Sending request..."
              : `Book a Table for ${data.guest_count} People`}
          </button>

          <p>
            <small>
              Your table is reserved only after
              the restaurant confirms.
            </small>
          </p>
        </div>
      ) : !error ? (
        <div style={styles.message}>
          {displayedAcceptedCount === 0 ? (
            <p>
              Waiting for at least one guest to
              accept the invitation.
            </p>
          ) : (
            <p>
              {typeof data?.detail === "string"
                ? data.detail
                : "Table booking is unavailable."}
            </p>
          )}

          {allowsWalkIns && (
            <WalkInMessage />
          )}
        </div>
      ) : null}

      {error && (
        <p role="alert" style={styles.error}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={refresh}
        disabled={loading || sending}
        style={{
          ...styles.button,
          background: "#f5f5f5",
          color: "#20110c",
        }}
      >
        {loading
          ? "Checking..."
          : "Refresh Booking Status"}
      </button>
    </section>
  );
}
