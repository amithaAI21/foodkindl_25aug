import {
  ArrowLeft,
  CircleHelp,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import api from "../api";


export default function Contact() {

  const [
    form,
    setForm,
  ] = useState({
    full_name: "",
    email: "",
    phone: "",
    reason: "",
    message: "",
  });


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState("");


  const enquiryTypes = [

    {
      value: "general",
      label: "General enquiry",
    },

    {
      value: "account_support",
      label: "Account support",
    },

    {
      value: "safety",
      label: "Safety concern",
    },

    {
      value: "report",
      label: "Report a user or content",
    },

    {
      value: "partnership",
      label: "Partnership",
    },

    {
      value: "creator",
      label: "Creator collaboration",
    },

    {
      value: "careers",
      label: "Careers",
    },

    {
      value: "media",
      label: "Media enquiry",
    },

  ];


  /* =========================================================
     HANDLE FORM CHANGE
  ========================================================= */

  function handleChange(
    event
  ) {

    const {
      name,
      value,
    } = event.target;


    setForm(
      previous => ({
        ...previous,
        [name]:
          value,
      })
    );


    if (error) {
      setError("");
    }


    if (statusMessage) {
      setStatusMessage("");
    }
  }


  /* =========================================================
     SUBMIT
  ========================================================= */

  async function handleSubmit(
    event
  ) {

    event.preventDefault();


    if (submitting) {
      return;
    }


    setSubmitting(
      true
    );

    setStatusMessage("");

    setError("");


    try {

      await api.post(
        "/website/contact/",
        {
          name:
            form.full_name
              .trim(),

          email:
            form.email
              .trim()
              .toLowerCase(),

          phone:
            form.phone
              .trim(),

          subject:
            form.reason,

          message:
            form.message
              .trim(),
        }
      );


      setStatusMessage(
        "Thanks! We received your message and will get back to you soon."
      );


      setForm({
        full_name: "",
        email: "",
        phone: "",
        reason: "",
        message: "",
      });


    } catch (
      requestError
    ) {

      console.error(
        "CONTACT FORM ERROR:",
        requestError.response?.data ||
        requestError
      );


      setError(
        requestError
          ?.response
          ?.data
          ?.detail
        ||
        "We could not send your message. Please try again."
      );


    } finally {

      setSubmitting(
        false
      );
    }
  }


  /* =========================================================
     PAGE
  ========================================================= */

  return (

    <main className="contact-page">


      {/* =====================================================
          TOP
      ====================================================== */}

      <div className="contact-topbar">

        <Link
          to="/"
          className="contact-back-link"
        >

          <ArrowLeft
            size={18}
          />

          Back to FoodKindl

        </Link>

      </div>


      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="contact-hero">

        <div className="contact-pill">

          <HeartHandshake
            size={16}
          />

          CONTACT US

        </div>


        <h1>
          Contact{" "}
          <span>
            FoodKindl
          </span>
        </h1>


        <p>
          Have a question or need help?
          Send us a message.
        </p>

      </section>


      {/* =====================================================
          CONTACT AREA
      ====================================================== */}

      <section className="contact-layout">


        {/* ===================================================
            CONTACT INFORMATION
        ==================================================== */}

        <div className="contact-information">

          <div className="contact-section-label">
            GET IN TOUCH
          </div>


          <h2>
            We're here to help.
          </h2>


          <div className="contact-info-grid">


            {/* EMAIL */}

            <article className="contact-info-card">

              <div className="contact-info-icon">

                <Mail
                  size={23}
                />

              </div>


              <div>

                <span>
                  Email
                </span>


                <a
                  href="mailto:support@foodkindl.org"
                >
                  <strong>
                    support@foodkindl.org
                  </strong>
                </a>

              </div>

            </article>


            {/* LOCATION */}

            <article className="contact-info-card">

              <div className="contact-info-icon">

                <MapPin
                  size={23}
                />

              </div>


              <div>

                <span>
                  Location
                </span>


                <strong>
                  Bengaluru, India
                </strong>

              </div>

            </article>


            {/* SUPPORT */}

            <article className="contact-info-card">

              <div className="contact-info-icon">

                <CircleHelp
                  size={23}
                />

              </div>


              <div>

                <span>
                  Support
                </span>


                <strong>
                  Usually within 2 business days
                </strong>

              </div>

            </article>

          </div>


          {/* ===============================================
              EMERGENCY
          ================================================ */}

          <div className="contact-emergency-card">

            <ShieldAlert
              size={22}
            />


            <div>

              <strong>
                Emergency?
              </strong>


              <p>
                FoodKindl does not provide
                emergency services.
                Please contact your local
                emergency services if you
                need immediate help.
              </p>

            </div>

          </div>

        </div>


        {/* ===================================================
            CONTACT FORM
        ==================================================== */}

        <div className="contact-form-card">

          <div className="contact-form-heading">

            <span>
              SEND A MESSAGE
            </span>


            <h2>
              How can we help?
            </h2>

          </div>


          <form
            onSubmit={
              handleSubmit
            }
          >


            {/* =============================================
                NAME + EMAIL
            ============================================== */}

            <div className="contact-form-row">


              {/* NAME */}

              <label>

                Full name

                <div className="contact-input-wrap">

                  <UserRound
                    size={18}
                  />


                  <input
                    type="text"
                    name="full_name"
                    value={
                      form.full_name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Your full name"
                    required
                  />

                </div>

              </label>


              {/* EMAIL */}

              <label>

                Email address

                <div className="contact-input-wrap">

                  <Mail
                    size={18}
                  />


                  <input
                    type="email"
                    name="email"
                    value={
                      form.email
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />

                </div>

              </label>

            </div>


            {/* =============================================
                PHONE
            ============================================== */}

            <label>

              Phone number

              <small>
                Optional
              </small>


              <div className="contact-input-wrap">

                <Phone
                  size={18}
                />


                <input
                  type="tel"
                  name="phone"
                  value={
                    form.phone
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="+91 ..."
                  autoComplete="tel"
                />

              </div>

            </label>


            {/* =============================================
                REASON
            ============================================== */}

            <label>

              What can we help with?

              <select
                name="reason"
                value={
                  form.reason
                }
                onChange={
                  handleChange
                }
                required
              >

                <option value="">
                  Select a category
                </option>


                {
                  enquiryTypes.map(
                    item => (

                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>

                    )
                  )
                }

              </select>

            </label>


            {/* =============================================
                MESSAGE
            ============================================== */}

            <label>

              Message

              <textarea
                name="message"
                value={
                  form.message
                }
                onChange={
                  handleChange
                }
                placeholder="Tell us how we can help..."
                rows={6}
                required
              />

            </label>


            {/* =============================================
                ERROR
            ============================================== */}

            {
              error &&
              (

                <p className="contact-error">
                  {error}
                </p>

              )
            }


            {/* =============================================
                SUCCESS
            ============================================== */}

            {
              statusMessage &&
              (

                <p className="contact-success">
                  {statusMessage}
                </p>

              )
            }


            {/* =============================================
                SUBMIT
            ============================================== */}

            <button
              type="submit"
              className="contact-submit-button"
              disabled={
                submitting
              }
            >

              {
                submitting
                  ? (
                    "Sending..."
                  )
                  : (
                    <>
                      Send Message

                      <Send
                        size={18}
                      />
                    </>
                  )
              }

            </button>

          </form>

        </div>

      </section>


      {/* =====================================================
          COMPANY NOTE
      ====================================================== */}

      <div className="contact-company-note">

        <strong>
          FoodKindl
        </strong>

        <span>
          A KnightnKindle Pvt Ltd initiative
        </span>

      </div>

    </main>

  );
}