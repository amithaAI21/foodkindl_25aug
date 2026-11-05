import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ContactRound,
  MapPin,
  Phone,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api";
import "../styles/SOSSafety.css";

export default function SOSSafety() {
  // =====================================================
  // TRUSTED CONTACTS STATE
  // =====================================================

  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState("");

  const [showContactForm, setShowContactForm] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState(null);

  const [contactForm, setContactForm] = useState({
    name: "",
    relationship: "",
    phone_number: "",
  });

  // =====================================================
  // SOS STATE
  // =====================================================

  const [sosActive, setSosActive] = useState(false);
  const [sosId, setSosId] = useState(null);
  const [sosLoading, setSosLoading] = useState(false);

  const [sosMessage, setSosMessage] = useState("");
  const [sosError, setSosError] = useState("");

  const [sosLocation, setSosLocation] = useState(null);

  const [smsSentCount, setSmsSentCount] = useState(0);
  const [smsFailedCount, setSmsFailedCount] = useState(0);

  const [deliveryKnown, setDeliveryKnown] = useState(false);

  const liveWatchIdRef = useRef(null);
  const componentMountedRef = useRef(true);

  // =====================================================
  // STOP LIVE GPS TRACKING
  // =====================================================

  function stopLiveTracking() {
    if (
      liveWatchIdRef.current !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        liveWatchIdRef.current
      );
    }

    liveWatchIdRef.current = null;
  }

  // =====================================================
  // START CONTINUOUS GPS TRACKING
  // =====================================================

  function startLiveTracking(sosEventId) {
    if (!sosEventId || !navigator.geolocation) {
      console.error("GPS is not supported.");
      return;
    }

    stopLiveTracking();

    liveWatchIdRef.current =
      navigator.geolocation.watchPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          if (componentMountedRef.current) {
            setSosLocation(location);
          }

          try {
            await api.post(
              `/safety/sos/${sosEventId}/location/`,
              {
                latitude: location.latitude,
                longitude: location.longitude,
                location_accuracy: location.accuracy,
              }
            );

            console.log(
              "Live GPS location updated:",
              location
            );
          } catch (error) {
            console.error(
              "GPS update failed:",
              error.response?.data || error
            );
          }
        },

        (error) => {
          console.error(
            "Live GPS tracking error:",
            error.message
          );
        },

        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 20000,
        }
      );
  }

  // =====================================================
  // LOAD TRUSTED CONTACTS
  // =====================================================

  async function loadContacts() {
    try {
      setLoadingContacts(true);
      setContactsError("");

      const response = await api.get(
        "/safety/trusted-contacts/"
      );

      const data =
        response.data?.results || response.data;

      if (componentMountedRef.current) {
        setContacts(
          Array.isArray(data) ? data : []
        );
      }
    } catch (requestError) {
      console.error(
        "Unable to load trusted contacts:",
        requestError.response?.data || requestError
      );

      if (componentMountedRef.current) {
        setContactsError(
          requestError.response?.data?.detail ||
            "Unable to load trusted contacts."
        );
      }
    } finally {
      if (componentMountedRef.current) {
        setLoadingContacts(false);
      }
    }
  }

  // =====================================================
  // LOAD ACTIVE SOS
  // =====================================================

  async function loadActiveSOS() {
    try {
      const response = await api.get(
        "/safety/sos/active/"
      );

      if (!componentMountedRef.current) return;

      if (
        response.data?.active === true &&
        response.data?.sos
      ) {
        const sos = response.data.sos;

        setSosActive(true);
        setSosId(sos.id);

        setDeliveryKnown(false);
        setSmsSentCount(0);
        setSmsFailedCount(0);

        if (
          sos.latitude != null &&
          sos.longitude != null
        ) {
          setSosLocation({
            latitude: Number(sos.latitude),
            longitude: Number(sos.longitude),
            accuracy: sos.location_accuracy,
          });
        } else {
          setSosLocation(null);
        }

        if (sos.id) {
          startLiveTracking(sos.id);
        }
      } else {
        stopLiveTracking();

        setSosActive(false);
        setSosId(null);
        setSosLocation(null);
        setDeliveryKnown(false);
      }
    } catch (requestError) {
      console.warn(
        "Unable to load active SOS:",
        requestError.response?.data || requestError
      );
    }
  }

  // =====================================================
  // INITIAL LOAD AND CLEANUP
  // =====================================================

  useEffect(() => {
    componentMountedRef.current = true;

    loadContacts();
    loadActiveSOS();

    return () => {
      componentMountedRef.current = false;
      stopLiveTracking();
    };

    // Initial data loading only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // CONTACT FORM CHANGE
  // =====================================================

  function handleContactChange(event) {
    const { name, value } = event.target;

    setContactForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // =====================================================
  // ADD TRUSTED CONTACT
  // =====================================================

  async function addTrustedContact(event) {
    event.preventDefault();

    setContactsError("");

    if (!contactForm.name.trim()) {
      setContactsError(
        "Please enter the contact name."
      );
      return;
    }

    if (!contactForm.phone_number.trim()) {
      setContactsError(
        "Please enter a phone number."
      );
      return;
    }

    if (contacts.length >= 3) {
      setContactsError(
        "You can add up to 3 trusted contacts."
      );
      return;
    }

    try {
      setSavingContact(true);

      const response = await api.post(
        "/safety/trusted-contacts/",
        {
          name: contactForm.name.trim(),
          relationship: contactForm.relationship.trim(),
          phone_number: contactForm.phone_number.trim(),
        }
      );

      setContacts((current) => [
        ...current,
        response.data,
      ]);

      setContactForm({
        name: "",
        relationship: "",
        phone_number: "",
      });

      setShowContactForm(false);
    } catch (requestError) {
      console.error(
        "Unable to add trusted contact:",
        requestError.response?.data || requestError
      );

      setContactsError(
        requestError.response?.data?.phone_number?.[0] ||
          requestError.response?.data?.detail ||
          "Unable to add trusted contact."
      );
    } finally {
      setSavingContact(false);
    }
  }

  // =====================================================
  // DELETE TRUSTED CONTACT
  // =====================================================

  async function deleteTrustedContact(contact) {
    if (!contact?.id) return;

    const confirmed = window.confirm(
      `Remove ${contact.name} from your trusted contacts?`
    );

    if (!confirmed) return;

    try {
      setDeletingContactId(contact.id);

      await api.delete(
        `/safety/trusted-contacts/${contact.id}/`
      );

      setContacts((current) =>
        current.filter(
          (item) => item.id !== contact.id
        )
      );
    } catch (requestError) {
      console.error(
        "Unable to remove trusted contact:",
        requestError.response?.data || requestError
      );

      setContactsError(
        requestError.response?.data?.detail ||
          "Unable to remove trusted contact."
      );
    } finally {
      setDeletingContactId(null);
    }
  }

  // =====================================================
  // GET BEST AVAILABLE GPS LOCATION
  // =====================================================

  function getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error(
            "GPS is not supported by this browser."
          )
        );
        return;
      }

      let bestPosition = null;
      let watchId = null;
      let timeoutId = null;
      let settled = false;

      const finish = (error = null) => {
        if (settled) return;

        settled = true;

        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }

        if (bestPosition) {
          resolve({
            latitude: bestPosition.coords.latitude,
            longitude: bestPosition.coords.longitude,
            accuracy: bestPosition.coords.accuracy,
          });
        } else {
          reject(
            error ||
              new Error(
                "Unable to obtain your GPS location."
              )
          );
        }
      };

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          // Keep the location with the best accuracy.
          if (
            !bestPosition ||
            position.coords.accuracy <
              bestPosition.coords.accuracy
          ) {
            bestPosition = position;
          }

          // Accept early if accuracy is within 50 metres.
          if (position.coords.accuracy <= 50) {
            finish();
          }
        },

        (error) => {
          console.error("GPS error:", error);

          if (bestPosition) {
            finish();
          } else {
            finish(error);
          }
        },

        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        }
      );

      // Wait up to 12 seconds for a better GPS reading.
      timeoutId = window.setTimeout(() => {
        finish();
      }, 12000);
    });
  }

  // =====================================================
  // ACTIVATE SOS - ONE TAP
  // =====================================================

  async function activateSOS() {
    if (sosLoading || sosActive) {
      return;
    }

    if (contacts.length === 0) {
      setSosError(
        "Please add at least one trusted contact before activating SOS."
      );
      return;
    }

    setSosLoading(true);

    setSosError("");
    setSosMessage("");

    setSmsSentCount(0);
    setSmsFailedCount(0);

    setDeliveryKnown(false);

    let location = null;

    try {
      // STEP 1: GET GPS LOCATION

      try {
        location = await getCurrentLocation();

        setSosLocation(location);
      } catch (locationError) {
        console.warn(
          "Location unavailable:",
          locationError
        );

        setSosLocation(null);
      }

      // STEP 2: SEND SOS REQUEST TO DJANGO

      const response = await api.post(
        "/safety/sos/",
        {
          latitude:
            location?.latitude != null
              ? location.latitude.toFixed(6)
              : null,

          longitude:
            location?.longitude != null
              ? location.longitude.toFixed(6)
              : null,

          location_accuracy:
            location?.accuracy ?? null,
        }
      );

      console.log(
        "SOS backend response:",
        response.data
      );

      // STEP 3: SAVE SOS ID

      const sosData =
        response.data?.sos || response.data;

      const returnedSosId =
        sosData?.id || null;

      setSosId(returnedSosId);

      // A successful API response means the SOS event
      // was created, even if SMS delivery failed.

      setSosActive(true);

      if (returnedSosId) {
        startLiveTracking(returnedSosId);
      }

      // STEP 4: GET SMS DELIVERY RESULT

      const smsSent = Number(
        response.data?.sms_sent ??
          response.data?.sms_started ??
          sosData?.sms_sent ??
          sosData?.sms_started ??
          0
      );

      const smsFailed = Number(
        response.data?.sms_failed ??
          sosData?.sms_failed ??
          0
      );

      setSmsSentCount(smsSent);
      setSmsFailedCount(smsFailed);

      setDeliveryKnown(true);

      // STEP 5: SMS SUCCESS

      if (smsSent > 0) {
        setSosMessage(
          response.data?.detail ||
            "SOS activated. Emergency SMS alerts were sent."
        );

        setSosError("");
        return;
      }

      // STEP 6: SMS FAILED

      setSosMessage("");

      setSosError(
        response.data?.detail ||
          "SOS is active, but SMS delivery may have failed. Contact emergency services if needed."
      );
    } catch (requestError) {
      console.error(
        "SOS activation failed:",
        requestError.response?.status,
        requestError.response?.data || requestError
      );

      setSosActive(false);
      setSosId(null);
      setDeliveryKnown(false);

      stopLiveTracking();

      setSosError(
        requestError.response?.data?.detail ||
          "Unable to activate SOS. Please try again."
      );
    } finally {
      setSosLoading(false);
    }
  }

  // =====================================================
  // MARK SAFE
  // =====================================================

  async function markSafe() {
    if (!sosId) {
      setSosActive(false);
      setDeliveryKnown(false);
      setSosLocation(null);
      stopLiveTracking();
      return;
    }

    try {
      setSosLoading(true);
      setSosError("");

      await api.post(
        `/safety/sos/${sosId}/safe/`
      );

      // Stop sending GPS updates after marking safe.
      stopLiveTracking();

      setSosActive(false);
      setSosId(null);
      setSosLocation(null);

      setSmsSentCount(0);
      setSmsFailedCount(0);

      setDeliveryKnown(false);

      setSosMessage(
        "You have been marked safe."
      );
    } catch (requestError) {
      console.error(
        "Unable to mark safe:",
        requestError.response?.data || requestError
      );

      setSosError(
        requestError.response?.data?.detail ||
          "Unable to update your safety status."
      );
    } finally {
      setSosLoading(false);
    }
  }

  // =====================================================
  // PAGE UI
  // =====================================================

  return (
    <main className="sos-safety-page">

      {/* TOPBAR */}

      <div className="sos-topbar">
        <Link
          to="/connect-dashboard"
          className="sos-back-link"
        >
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* HERO */}

      <section className="sos-hero">
        <div className="sos-hero-pill">
          <ShieldAlert size={16} />
          PERSONAL SAFETY
        </div>

        <h1>
          SOS &amp;{" "}
          <span>Trusted Contacts</span>
        </h1>

        <p>
          Add people you trust. Tap SOS once to send
          an emergency alert and your available location.
        </p>
      </section>

      {/* MAIN LAYOUT */}

      <section className="sos-layout">

        {/* TRUSTED CONTACTS */}

        <article className="sos-panel trusted-contacts-panel">

          <div className="sos-panel-header">
            <div>
              <span className="sos-kicker">
                YOUR SAFETY NETWORK
              </span>

              <h2>Trusted Contacts</h2>

              <p>
                Add up to three people who should
                receive your SOS alerts.
              </p>
            </div>

            <div className="trusted-contact-count">
              {contacts.length}/3
            </div>
          </div>

          {/* CONTACT ERROR */}

          {contactsError && (
            <div className="sos-error-message">
              <AlertTriangle size={16} />
              {contactsError}
            </div>
          )}

          {/* LOADING */}

          {loadingContacts && (
            <div className="trusted-contact-empty">
              Loading trusted contacts...
            </div>
          )}

          {/* EMPTY CONTACTS */}

          {!loadingContacts &&
            contacts.length === 0 && (
              <div className="trusted-contact-empty">
                <ContactRound size={31} />

                <strong>
                  No trusted contacts yet
                </strong>

                <span>
                  Add someone before using SOS.
                </span>
              </div>
            )}

          {/* CONTACT LIST */}

          {!loadingContacts &&
            contacts.length > 0 && (
              <div className="trusted-contact-list">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="trusted-contact-row"
                  >
                    <div className="trusted-contact-icon">
                      <UserRound size={20} />
                    </div>

                    <div className="trusted-contact-info">
                      <strong>
                        {contact.name}
                      </strong>

                      <span>
                        {contact.relationship ||
                          "Trusted contact"}
                      </span>

                      <small>
                        <Phone size={12} />
                        {contact.phone_number}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="trusted-contact-delete"
                      disabled={
                        deletingContactId === contact.id
                      }
                      onClick={() =>
                        deleteTrustedContact(contact)
                      }
                      aria-label={`Remove ${contact.name}`}
                    >
                      {deletingContactId === contact.id
                        ? "..."
                        : <Trash2 size={17} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

          {/* ADD CONTACT BUTTON */}

          {contacts.length < 3 &&
            !showContactForm && (
              <button
                type="button"
                className="add-trusted-contact-button"
                onClick={() =>
                  setShowContactForm(true)
                }
              >
                <Plus size={18} />
                Add Trusted Contact
              </button>
            )}

          {/* CONTACT FORM */}

          {showContactForm && (
            <form
              className="trusted-contact-form"
              onSubmit={addTrustedContact}
            >
              <div className="trusted-contact-form-header">
                <strong>
                  Add Trusted Contact
                </strong>

                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => {
                    setShowContactForm(false);

                    setContactForm({
                      name: "",
                      relationship: "",
                      phone_number: "",
                    });
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <label>
                Name

                <input
                  type="text"
                  name="name"
                  value={contactForm.name}
                  onChange={handleContactChange}
                  placeholder="Full name"
                  required
                />
              </label>

              <label>
                Relationship

                <input
                  type="text"
                  name="relationship"
                  value={contactForm.relationship}
                  onChange={handleContactChange}
                  placeholder="Friend, family..."
                />
              </label>

              <label>
                Phone number

                <input
                  type="tel"
                  name="phone_number"
                  value={contactForm.phone_number}
                  onChange={handleContactChange}
                  placeholder="+91 98765 43210"
                  required
                />
              </label>

              <button
                type="submit"
                className="save-trusted-contact-button"
                disabled={savingContact}
              >
                {savingContact
                  ? "Saving..."
                  : "Save Trusted Contact"}
              </button>
            </form>
          )}
        </article>

        {/* SOS CONTROL */}

        <article
          className={
            sosActive
              ? "sos-panel sos-control-panel active"
              : "sos-panel sos-control-panel"
          }
        >
          <div className="sos-control-top">
            <span className="sos-kicker">
              EMERGENCY CONTROL
            </span>

            <h2>
              {sosActive
                ? "SOS Active"
                : "Tap for SOS"}
            </h2>

            <p>
              {sosActive
                ? deliveryKnown
                  ? "Emergency SMS alerts were processed for your trusted contacts."
                  : "An SOS event is currently active."
                : "Tap once to send an emergency SMS alert and your current location."}
            </p>
          </div>

          {/* ONE-TAP SOS BUTTON */}

          {!sosActive && (
            <button
              type="button"
              className="sos-hold-button"
              onClick={activateSOS}
              disabled={sosLoading}
              aria-label="Activate SOS"
            >
              <ShieldAlert size={44} />

              <strong>
                {sosLoading ? "SENDING..." : "SOS"}
              </strong>

              <small>
                Tap once to activate SOS
              </small>
            </button>
          )}

          {/* ACTIVE SOS */}

          {sosActive && (
            <div className="sos-active-state">
              <div className="sos-active-icon">
                <AlertTriangle size={38} />
              </div>

              <strong>
                SOS Activated
              </strong>

              {/* GPS LOCATION STATUS */}

              {sosLocation ? (
                <div className="sos-location-ready">
                  <MapPin size={15} />

                  <span>
                    Location attached

                    <small>
                      GPS accuracy:{" "}
                      {Number.isFinite(
                        Number(sosLocation.accuracy)
                      )
                        ? `${Math.round(
                            Number(sosLocation.accuracy)
                          )} metres`
                        : "Unknown"}
                    </small>
                  </span>
                </div>
              ) : (
                <div className="sos-location-unavailable">
                  <MapPin size={15} />
                  Location unavailable
                </div>
              )}

              {/* GPS ACCURACY WARNING */}

              {sosLocation &&
                Number(sosLocation.accuracy) > 100 && (
                  <div className="gps-warning">
                    GPS accuracy is low. Move to an open
                    area for a better location reading.
                  </div>
                )}

              {/* SMS DELIVERY STATUS */}

              {deliveryKnown && (
                <div className="sos-sms-result">
                  {smsSentCount > 0
                    ? <CheckCircle2 size={18} />
                    : <AlertTriangle size={18} />}

                  <div>
                    <strong>
                      Alert delivery status
                    </strong>

                    <div className="sos-channel-results">
                      <span
                        className={
                          smsSentCount > 0
                            ? "success"
                            : "failed"
                        }
                      >
                        SMS:{" "}
                        {smsSentCount > 0
                          ? `${smsSentCount} sent`
                          : `${smsFailedCount} failed`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!deliveryKnown && (
                <div className="sos-sms-result">
                  <ShieldCheck size={18} />

                  <div>
                    <strong>
                      SOS remains active
                    </strong>

                    <div className="sos-channel-results">
                      <span>
                        Delivery status was recorded
                        during the original activation.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* I'M SAFE BUTTON */}

              <button
                type="button"
                className="mark-safe-button"
                onClick={markSafe}
                disabled={sosLoading}
              >
                <CheckCircle2 size={18} />

                {sosLoading
                  ? "Updating..."
                  : "I'm Safe"}
              </button>
            </div>
          )}

          {/* SUCCESS MESSAGE */}

          {sosMessage && (
            <div className="sos-success-message">
              <CheckCircle2 size={16} />
              {sosMessage}
            </div>
          )}

          {/* ERROR MESSAGE */}

          {sosError && (
            <div className="sos-error-message">
              <AlertTriangle size={16} />
              {sosError}
            </div>
          )}

          {/* INFORMATION */}

          <div className="sos-info-list">
            <div>
              <ShieldCheck size={16} />

              <span>
                FoodKindl sends emergency SMS alerts
                to your trusted contacts when SOS is activated.
              </span>
            </div>

            <div>
              <MapPin size={16} />

              <span>
                Your current location is included
                when location permission is granted.
              </span>
            </div>

            <div>
              <ShieldCheck size={16} />

              <span>
                If SMS delivery fails, contact your
                trusted contacts or local emergency services.
              </span>
            </div>
          </div>
        </article>
      </section>

      {/* DISCLAIMER */}

      <section className="sos-disclaimer">
        <AlertTriangle size={20} />

        <p>
          FoodKindl does not provide emergency services.
          SOS helps alert people you trust and does not
          replace local emergency services.
        </p>
      </section>
    </main>
  );
}