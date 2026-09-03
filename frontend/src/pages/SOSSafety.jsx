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

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import api from "../api";


export default function SOSSafety() {

  // =========================================================
  // TRUSTED CONTACTS
  // =========================================================

  const [
    contacts,
    setContacts,
  ] = useState([]);


  const [
    loadingContacts,
    setLoadingContacts,
  ] = useState(true);


  const [
    contactsError,
    setContactsError,
  ] = useState("");


  const [
    showContactForm,
    setShowContactForm,
  ] = useState(false);


  const [
    savingContact,
    setSavingContact,
  ] = useState(false);


  const [
    deletingContactId,
    setDeletingContactId,
  ] = useState(null);


  const [
    contactForm,
    setContactForm,
  ] = useState({
    name: "",
    relationship: "",
    phone_number: "",
  });


  // =========================================================
  // SOS STATE
  // =========================================================

  const [
    sosActive,
    setSosActive,
  ] = useState(false);


  const [
    sosId,
    setSosId,
  ] = useState(null);


  const [
    sosLoading,
    setSosLoading,
  ] = useState(false);


  const [
    sosMessage,
    setSosMessage,
  ] = useState("");


  const [
    sosError,
    setSosError,
  ] = useState("");


  const [
    sosLocation,
    setSosLocation,
  ] = useState(null);


  const [
    holdProgress,
    setHoldProgress,
  ] = useState(0);


  const [
    smsSentCount,
    setSmsSentCount,
  ] = useState(0);


  const [
    whatsappSentCount,
    setWhatsappSentCount,
  ] = useState(0);


  const [
    smsFailedCount,
    setSmsFailedCount,
  ] = useState(0);


  const [
    whatsappFailedCount,
    setWhatsappFailedCount,
  ] = useState(0);


  // =========================================================
  // HOLD TIMER
  // =========================================================

  const holdTimerRef =
    useRef(null);


  const holdIntervalRef =
    useRef(null);


  const holdStartedAtRef =
    useRef(null);


  const HOLD_DURATION =
    3000;


  // =========================================================
  // LOAD TRUSTED CONTACTS
  // =========================================================

  async function loadContacts() {

    try {

      setLoadingContacts(
        true
      );


      setContactsError("");


      const response =
        await api.get(
          "/safety/trusted-contacts/"
        );


      setContacts(
        Array.isArray(
          response.data
        )
          ? response.data
          : []
      );

    } catch (
      requestError
    ) {

      console.error(
        "Unable to load trusted contacts:",
        requestError.response?.data ||
          requestError
      );


      setContactsError(
        requestError
          .response
          ?.data
          ?.detail ||
        "Unable to load trusted contacts."
      );

    } finally {

      setLoadingContacts(
        false
      );

    }
  }


  // =========================================================
  // LOAD ACTIVE SOS
  // =========================================================

  async function loadActiveSOS() {

    try {

      const response =
        await api.get(
          "/safety/sos/active/"
        );


      if (
        response.data?.active === true &&
        response.data?.sos
      ) {

        const sos =
          response.data.sos;


        setSosActive(
          true
        );


        setSosId(
          sos.id
        );


        if (
          sos.latitude != null &&
          sos.longitude != null
        ) {

          setSosLocation({
            latitude:
              Number(
                sos.latitude
              ),

            longitude:
              Number(
                sos.longitude
              ),

            accuracy:
              sos.location_accuracy,
          });

        }

      }

    } catch (
      requestError
    ) {

      console.warn(
        "Unable to load active SOS:",
        requestError.response?.data ||
          requestError
      );

    }
  }


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {

    loadContacts();

    loadActiveSOS();

  }, []);


  // =========================================================
  // CONTACT FORM CHANGE
  // =========================================================

  function handleContactChange(
    event
  ) {

    const {
      name,
      value,
    } = event.target;


    setContactForm(
      (
        current
      ) => ({
        ...current,

        [name]:
          value,
      })
    );
  }


  // =========================================================
  // ADD TRUSTED CONTACT
  // =========================================================

  async function addTrustedContact(
    event
  ) {

    event.preventDefault();


    setContactsError("");


    if (
      !contactForm.name.trim()
    ) {

      setContactsError(
        "Please enter the contact name."
      );

      return;
    }


    if (
      !contactForm
        .phone_number
        .trim()
    ) {

      setContactsError(
        "Please enter a phone number."
      );

      return;
    }


    if (
      contacts.length >= 3
    ) {

      setContactsError(
        "You can add up to 3 trusted contacts."
      );

      return;
    }


    try {

      setSavingContact(
        true
      );


      const response =
        await api.post(
          "/safety/trusted-contacts/",
          {
            name:
              contactForm
                .name
                .trim(),

            relationship:
              contactForm
                .relationship
                .trim(),

            phone_number:
              contactForm
                .phone_number
                .trim(),
          }
        );


      setContacts(
        (
          current
        ) => [
          ...current,
          response.data,
        ]
      );


      setContactForm({
        name: "",
        relationship: "",
        phone_number: "",
      });


      setShowContactForm(
        false
      );

    } catch (
      requestError
    ) {

      console.error(
        "Unable to add trusted contact:",
        requestError.response?.data ||
          requestError
      );


      setContactsError(
        requestError
          .response
          ?.data
          ?.phone_number
          ?.[0] ||

        requestError
          .response
          ?.data
          ?.detail ||

        "Unable to add trusted contact."
      );

    } finally {

      setSavingContact(
        false
      );

    }
  }


  // =========================================================
  // DELETE TRUSTED CONTACT
  // =========================================================

  async function deleteTrustedContact(
    contact
  ) {

    if (!contact?.id) {
      return;
    }


    const confirmed =
      window.confirm(
        `Remove ${contact.name} from your trusted contacts?`
      );


    if (!confirmed) {
      return;
    }


    try {

      setDeletingContactId(
        contact.id
      );


      await api.delete(
        `/safety/trusted-contacts/${contact.id}/`
      );


      setContacts(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.id !==
              contact.id
          )
      );

    } catch (
      requestError
    ) {

      console.error(
        "Unable to remove trusted contact:",
        requestError.response?.data ||
          requestError
      );


      setContactsError(
        requestError
          .response
          ?.data
          ?.detail ||
        "Unable to remove trusted contact."
      );

    } finally {

      setDeletingContactId(
        null
      );

    }
  }


  // =========================================================
  // LOCATION
  // =========================================================

  function getCurrentLocation() {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        if (
          !navigator.geolocation
        ) {

          reject(
            new Error(
              "Location is not supported."
            )
          );

          return;
        }


        navigator.geolocation
          .getCurrentPosition(

            (
              position
            ) => {

              resolve({
                latitude:
                  position
                    .coords
                    .latitude,

                longitude:
                  position
                    .coords
                    .longitude,

                accuracy:
                  position
                    .coords
                    .accuracy,
              });

            },


            (
              error
            ) => {

              reject(
                error
              );

            },


            {
              enableHighAccuracy:
                true,

              timeout:
                10000,

              maximumAge:
                0,
            }

          );

      }
    );
  }


  // =========================================================
  // ACTIVATE SOS
  //
  // IMPORTANT:
  // Django is responsible for actually sending Fast2SMS.
  // =========================================================

  async function activateSOS() {

    if (
      sosLoading ||
      sosActive
    ) {
      return;
    }


    // -------------------------------------------------------
    // Cannot send without a trusted contact.
    // -------------------------------------------------------

    if (
      contacts.length === 0
    ) {

      setSosError(
        "Please add at least one trusted contact before activating SOS."
      );

      return;
    }


    setSosLoading(
      true
    );


    setSosError("");

    setSosMessage("");

    setSmsSentCount(
      0
    );

    setWhatsappSentCount(0);
    setSmsFailedCount(0);
    setWhatsappFailedCount(0);


    let location =
      null;


    try {

      // =====================================================
      // GET CURRENT LOCATION
      // =====================================================

      try {

        location =
          await getCurrentLocation();


        setSosLocation(
          location
        );

      } catch (
        locationError
      ) {

        console.warn(
          "Location unavailable:",
          locationError
        );


        setSosLocation(
          null
        );

      }


      // =====================================================
      // SEND TO DJANGO
      //
      // Django creates one SOS event and automatically attempts
      // both SMS and WhatsApp for every active trusted contact.
      // =====================================================

      const response =
        await api.post(
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
              location?.accuracy ??
              null,
          }
        );


      console.log(
        "SOS backend response:",
        response.data
      );


      // =====================================================
      // SAVE SOS ID
      // =====================================================

      setSosId(
        response.data?.id ||
        null
      );


      setSosActive(
        true
      );


      // =====================================================
      // COMBINED SMS + WHATSAPP RESULT
      // =====================================================

      const smsSent = Number(
        response.data?.sms_sent ??
        response.data?.sms_started ??
        0
      );

      const whatsappSent = Number(
        response.data?.whatsapp_sent ?? 0
      );

      const smsFailed = Number(
        response.data?.sms_failed ?? 0
      );

      const whatsappFailed = Number(
        response.data?.whatsapp_failed ?? 0
      );


      setSmsSentCount(
        smsSent
      );

      setWhatsappSentCount(whatsappSent);
      setSmsFailedCount(smsFailed);
      setWhatsappFailedCount(whatsappFailed);


      if (
        smsSent > 0 || whatsappSent > 0
      ) {

        setSosMessage(
          response.data?.detail ||
          "SOS activated. SMS and WhatsApp alerts were submitted automatically."
        );


        setSosError("");

      } else {

        setSosError(
          response.data?.detail ||
          "SOS was recorded, but neither SMS nor WhatsApp accepted the alert."
        );

      }

    } catch (
      requestError
    ) {

      console.error(
        "SOS activation failed:",
        requestError.response?.status,
        requestError.response?.data ||
          requestError
      );


      setSosActive(false);


      setSosError(
        (
          requestError
            .response
            ?.data
            ?.detail ||
          "Unable to activate SOS. Please try again."
        )
      );

    } finally {

      setSosLoading(
        false
      );


      setHoldProgress(
        0
      );

    }
  }


  // =========================================================
  // START HOLD
  // =========================================================

  function startSOSHold() {

    if (
      sosActive ||
      sosLoading
    ) {
      return;
    }


    clearSOSHold();


    holdStartedAtRef.current =
      Date.now();


    holdIntervalRef.current =
      window.setInterval(
        () => {

          const elapsed =
            Date.now() -
            holdStartedAtRef.current;


          const progress =
            Math.min(
              (
                elapsed /
                HOLD_DURATION
              ) * 100,
              100
            );


          setHoldProgress(
            progress
          );

        },
        50
      );


    holdTimerRef.current =
      window.setTimeout(
        () => {

          clearSOSHold(
            false
          );


          activateSOS();

        },
        HOLD_DURATION
      );
  }


  // =========================================================
  // CLEAR HOLD
  // =========================================================

  function clearSOSHold(
    resetProgress = true
  ) {

    if (
      holdTimerRef.current
    ) {

      window.clearTimeout(
        holdTimerRef.current
      );


      holdTimerRef.current =
        null;

    }


    if (
      holdIntervalRef.current
    ) {

      window.clearInterval(
        holdIntervalRef.current
      );


      holdIntervalRef.current =
        null;

    }


    holdStartedAtRef.current =
      null;


    if (
      resetProgress
    ) {

      setHoldProgress(
        0
      );

    }
  }


  // =========================================================
  // TIMER CLEANUP
  // =========================================================

  useEffect(() => {

    return () => {

      clearSOSHold();

    };

  }, []);


  // =========================================================
  // MARK SAFE
  // =========================================================

  async function markSafe() {

    try {

      setSosLoading(
        true
      );


      setSosError("");


      if (sosId) {

        await api.post(
          `/safety/sos/${sosId}/safe/`
        );

      }


      setSosActive(
        false
      );


      setSosId(
        null
      );


      setSosLocation(
        null
      );


      setSmsSentCount(
        0
      );

      setWhatsappSentCount(0);
      setSmsFailedCount(0);
      setWhatsappFailedCount(0);


      setSosMessage(
        "You have been marked safe."
      );

    } catch (
      requestError
    ) {

      console.error(
        "Unable to mark safe:",
        requestError.response?.data ||
          requestError
      );


      setSosError(
        requestError
          .response
          ?.data
          ?.detail ||
        "Unable to update your safety status."
      );

    } finally {

      setSosLoading(
        false
      );

    }
  }


  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="sos-safety-page">


      {/* =====================================================
          TOP
      ===================================================== */}

      <div className="sos-topbar">

        <Link
          to="/safety-verification"
          className="sos-back-link"
        >

          <ArrowLeft
            size={18}
          />

          Back to Safety &amp; Verification

        </Link>

      </div>


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="sos-hero">

        <div className="sos-hero-pill">

          <ShieldAlert
            size={16}
          />

          PERSONAL SAFETY

        </div>


        <h1>

          SOS &amp;{" "}

          <span>
            Trusted Contacts
          </span>

        </h1>


        <p>
          Add people you trust. Holding SOS
          automatically sends both SMS and WhatsApp
          alerts through FoodKindl.
        </p>

      </section>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <section className="sos-layout">


        {/* ===================================================
            TRUSTED CONTACTS
        =================================================== */}

        <article className="sos-panel trusted-contacts-panel">

          <div className="sos-panel-header">

            <div>

              <span className="sos-kicker">
                YOUR SAFETY NETWORK
              </span>


              <h2>
                Trusted Contacts
              </h2>


              <p>
                Add up to three people who
                should receive your SOS alerts.
              </p>

            </div>


            <div className="trusted-contact-count">

              {contacts.length}/3

            </div>

          </div>


          {/* ERROR */}

          {contactsError && (

            <div className="sos-error-message">

              <AlertTriangle
                size={16}
              />

              {contactsError}

            </div>

          )}


          {/* LOADING */}

          {loadingContacts && (

            <div className="trusted-contact-empty">

              Loading trusted contacts...

            </div>

          )}


          {/* EMPTY */}

          {
            !loadingContacts &&
            contacts.length === 0 &&
            (

              <div className="trusted-contact-empty">

                <ContactRound
                  size={31}
                />


                <strong>
                  No trusted contacts yet
                </strong>


                <span>
                  Add someone before using SOS.
                </span>

              </div>

            )
          }


          {/* CONTACT LIST */}

          {
            !loadingContacts &&
            contacts.length > 0 &&
            (

              <div className="trusted-contact-list">

                {
                  contacts.map(
                    (
                      contact
                    ) => (

                      <div
                        key={
                          contact.id
                        }

                        className="trusted-contact-row"
                      >

                        <div className="trusted-contact-icon">

                          <UserRound
                            size={20}
                          />

                        </div>


                        <div className="trusted-contact-info">

                          <strong>
                            {contact.name}
                          </strong>


                          <span>

                            {
                              contact.relationship ||
                              "Trusted contact"
                            }

                          </span>


                          <small>

                            <Phone
                              size={12}
                            />

                            {contact.phone_number}

                          </small>

                        </div>


                        <button
                          type="button"

                          className="trusted-contact-delete"

                          disabled={
                            deletingContactId ===
                            contact.id
                          }

                          onClick={() =>
                            deleteTrustedContact(
                              contact
                            )
                          }

                          aria-label={
                            `Remove ${contact.name}`
                          }
                        >

                          {
                            deletingContactId ===
                            contact.id
                              ? "..."
                              : (
                                  <Trash2
                                    size={17}
                                  />
                                )
                          }

                        </button>

                      </div>

                    )
                  )
                }

              </div>

            )
          }


          {/* ADD CONTACT BUTTON */}

          {
            contacts.length < 3 &&
            !showContactForm &&
            (

              <button
                type="button"

                className="add-trusted-contact-button"

                onClick={() =>
                  setShowContactForm(
                    true
                  )
                }
              >

                <Plus
                  size={18}
                />

                Add Trusted Contact

              </button>

            )
          }


          {/* ADD CONTACT FORM */}

          {showContactForm && (

            <form
              className="trusted-contact-form"

              onSubmit={
                addTrustedContact
              }
            >

              <div className="trusted-contact-form-header">

                <strong>
                  Add Trusted Contact
                </strong>


                <button
                  type="button"

                  aria-label="Close"

                  onClick={() => {

                    setShowContactForm(
                      false
                    );


                    setContactForm({
                      name: "",
                      relationship: "",
                      phone_number: "",
                    });

                  }}
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              <label>

                Name

                <input
                  type="text"

                  name="name"

                  value={
                    contactForm.name
                  }

                  onChange={
                    handleContactChange
                  }

                  placeholder="Full name"

                  required
                />

              </label>


              <label>

                Relationship

                <input
                  type="text"

                  name="relationship"

                  value={
                    contactForm.relationship
                  }

                  onChange={
                    handleContactChange
                  }

                  placeholder="Wife, husband, friend..."
                />

              </label>


              <label>

                Phone number

                <input
                  type="tel"

                  name="phone_number"

                  value={
                    contactForm.phone_number
                  }

                  onChange={
                    handleContactChange
                  }

                  placeholder="+91 98765 43210"

                  required
                />

              </label>


              <button
                type="submit"

                className="save-trusted-contact-button"

                disabled={
                  savingContact
                }
              >

                {
                  savingContact
                    ? "Saving..."
                    : "Save Trusted Contact"
                }

              </button>

            </form>

          )}

        </article>


        {/* ===================================================
            SOS
        =================================================== */}

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

              {
                sosActive
                  ? "SOS Active"
                  : "Hold for SOS"
              }

            </h2>


            <p>

              {
                sosActive
                  ? (
                      "SMS and WhatsApp were attempted automatically."
                    )
                  : (
                      "Hold for three seconds to send SMS and WhatsApp alerts."
                    )
              }

            </p>

          </div>


          {/* =================================================
              SOS BUTTON
          ================================================= */}

          {!sosActive && (

            <button
              type="button"

              className="sos-hold-button"

              onMouseDown={
                startSOSHold
              }

              onMouseUp={() =>
                clearSOSHold()
              }

              onMouseLeave={() =>
                clearSOSHold()
              }

              onTouchStart={
                startSOSHold
              }

              onTouchEnd={() =>
                clearSOSHold()
              }

              onTouchCancel={() =>
                clearSOSHold()
              }

              disabled={
                sosLoading
              }
            >

              <span
                className="sos-progress-ring"

                style={{
                  "--sos-progress":
                    `${holdProgress}%`,
                }}
              />


              <ShieldAlert
                size={44}
              />


              <strong>

                {
                  sosLoading
                    ? "SENDING..."
                    : "SOS"
                }

              </strong>


              <small>
                Hold for 3 seconds
              </small>

            </button>

          )}


          {/* =================================================
              ACTIVE SOS
          ================================================= */}

          {sosActive && (

            <div className="sos-active-state">

              <div className="sos-active-icon">

                <AlertTriangle
                  size={38}
                />

              </div>


              <strong>
                SOS Activated
              </strong>


              {
                sosLocation
                  ? (

                      <div className="sos-location-ready">

                        <MapPin
                          size={15}
                        />

                        Location attached

                      </div>

                    )
                  : (

                      <div className="sos-location-unavailable">

                        <MapPin
                          size={15}
                        />

                        Location unavailable

                      </div>

                    )
              }


              <div className="sos-sms-result">

                    <CheckCircle2
                      size={18}
                    />

                    <div>

                      <strong>
                        Automatic alert delivery
                      </strong>

                      <span>
                        SMS: {smsSentCount} sent
                        {smsFailedCount > 0
                          ? `, ${smsFailedCount} failed`
                          : ""}
                        {" • "}
                        WhatsApp: {whatsappSentCount} sent
                        {whatsappFailedCount > 0
                          ? `, ${whatsappFailedCount} failed`
                          : ""}
                      </span>

                    </div>

              </div>


              {/* =============================================
                  I'M SAFE
              ============================================= */}

              <button
                type="button"

                className="mark-safe-button"

                onClick={
                  markSafe
                }

                disabled={
                  sosLoading
                }
              >

                <CheckCircle2
                  size={18}
                />

                {
                  sosLoading
                    ? "Updating..."
                    : "I'm Safe"
                }

              </button>

            </div>

          )}


          {/* =================================================
              SUCCESS
          ================================================= */}

          {sosMessage && (

            <div className="sos-success-message">

              <CheckCircle2
                size={16}
              />

              {sosMessage}

            </div>

          )}


          {/* =================================================
              ERROR
          ================================================= */}

          {sosError && (

            <div className="sos-error-message">

              <AlertTriangle
                size={16}
              />

              {sosError}

            </div>

          )}


          {/* =================================================
              INFO
          ================================================= */}

          <div className="sos-info-list">

            <div>

              <ShieldCheck
                size={16}
              />

              <span>
                FoodKindl sends the SOS request
                once. The backend automatically submits
                both SMS and WhatsApp alerts.
              </span>

            </div>


            <div>

              <MapPin
                size={16}
              />

              <span>
                Your current location is included
                when location permission is granted.
              </span>

            </div>


            <div>

              <ShieldCheck
                size={16}
              />

              <span>
                You do not need to select a contact or
                choose an alert channel manually.
              </span>

            </div>

          </div>

        </article>

      </section>


      {/* =====================================================
          DISCLAIMER
      ===================================================== */}

      <section className="sos-disclaimer">

        <AlertTriangle
          size={20}
        />


        <p>
          FoodKindl does not provide emergency
          services. SOS helps alert people you
          trust and does not replace local
          emergency services.
        </p>

      </section>

    </main>
  );
}
