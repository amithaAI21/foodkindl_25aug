import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  BellRing,
  HeartHandshake,
  LockKeyhole,
  MessageSquareWarning,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
  Utensils,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";


export default function SafetyCentre() {

  const safetyFeatures = [
    {
      icon: <UserCheck size={28} />,
      title: "Verified Profiles",
      text:
        "Selected FoodKindl features can require identity verification before members participate in private gatherings or certain connection experiences.",
    },

    {
      icon: <ShieldCheck size={28} />,
      title: "Women-Only Preference",
      text:
        "Hosts can limit applicable gatherings to verified female community members for added comfort and safety.",
    },

    {
      icon: <Ban size={28} />,
      title: "Blocking & Reporting",
      text:
        "Members can report inappropriate behaviour, unsafe content, suspicious accounts or uncomfortable interactions and block users where supported.",
    },

    {
      icon: <BellRing size={28} />,
      title: "SOS Safety Layer",
      text:
        "FoodKindl plans to introduce an emergency-support feature that can help users quickly alert trusted contacts during an active gathering.",
      comingSoon: true,
    },
  ];


  return (
    <main className="safety-centre-page">

      {/* =====================================================
          TOP
      ===================================================== */}

      <div className="safety-centre-topbar">

        <Link
          to="/"
          className="safety-centre-back-link"
        >
          <ArrowLeft size={18} />
          Back to FoodKindl
        </Link>

      </div>


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="safety-centre-hero">

        <div className="safety-centre-pill">
          <ShieldCheck size={16} />
          SAFETY CENTRE
        </div>

        <h1>
          Safer connections.
          <span> Shared responsibility.</span>
        </h1>

        <p>
          FoodKindl brings people together through food.
          Our safety approach combines identity checks,
          community standards, reporting tools and practical
          guidance for online and in-person interactions.
        </p>

      </section>


      {/* =====================================================
          IMPORTANT NOTICE
      ===================================================== */}

      <section className="safety-centre-important">

        <AlertTriangle size={27} />

        <div>

          <strong>
            Verification does not guarantee safety
          </strong>

          <p>
            Identity verification may help reduce fake or
            misleading profiles, but it does not guarantee
            another member's behaviour or the complete safety
            of any gathering. Always use your own judgement
            when interacting with people online or in person.
          </p>

        </div>

      </section>


      {/* =====================================================
          SAFETY FEATURES
      ===================================================== */}

      <section className="safety-centre-section">

        <div className="safety-centre-section-header">

          <span>
            01 · SAFETY FEATURES
          </span>

          <h2>
            Tools designed to support trust
          </h2>

          <p>
            Safety is built through multiple layers rather
            than a single feature.
          </p>

        </div>


        <div className="safety-centre-feature-grid">

          {safetyFeatures.map(
            (
              feature,
              index
            ) => (

              <article
                className={
                  feature.comingSoon
                    ? "safety-centre-card coming-soon"
                    : "safety-centre-card"
                }
                key={feature.title}
              >

                <span className="safety-centre-number">
                  {String(index + 1).padStart(2, "0")}
                </span>

                {
                  feature.comingSoon &&
                  (
                    <span className="safety-centre-coming">
                    </span>
                  )
                }

                <div className="safety-centre-icon">
                  {feature.icon}
                </div>

                <h3>
                  {feature.title}
                </h3>

                <p>
                  {feature.text}
                </p>

              </article>

            )
          )}

        </div>

      </section>


      {/* =====================================================
          IDENTITY VERIFICATION
      ===================================================== */}

      <section className="safety-centre-split">

        <div>

          <span className="safety-centre-kicker">
            02 · IDENTITY VERIFICATION
          </span>

          <h2>
            What a verified profile means
          </h2>

          <p>
            A verified-profile indicator means that FoodKindl
            has completed the verification process required
            for that account or feature.
          </p>

        </div>


        <div className="safety-centre-detail-card">

          <div className="safety-detail-row">

            <BadgeCheck size={21} />

            <div>
              <strong>
                Identity information
              </strong>

              <p>
                Users may be asked to provide Government-issued
                identification and other account-verification
                information.
              </p>
            </div>

          </div>


          <div className="safety-detail-row">

            <LockKeyhole size={21} />

            <div>
              <strong>
                Verification documents remain private
              </strong>

              <p>
                Government-ID documents should never appear
                publicly on member profiles or posts.
              </p>
            </div>

          </div>


          <div className="safety-detail-row">

            <Smartphone size={21} />

            <div>
              <strong>
                Mobile verification
              </strong>

              <p>
                Phone or mobile verification may also be used
                as an additional account-security measure.
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          BEFORE MEETING
      ===================================================== */}

      <section className="safety-centre-section">

        <div className="safety-centre-section-header">

          <span>
            03 · BEFORE YOU MEET
          </span>

          <h2>
            Take a few precautions first
          </h2>

        </div>


        <div className="safety-checklist">

          <div>
            <BadgeCheck size={20} />

            <p>
              Review the other member's profile and gathering
              details before accepting an invite.
            </p>
          </div>


          <div>
            <BadgeCheck size={20} />

            <p>
              For a first gathering, consider meeting in a
              public, shared or familiar place.
            </p>
          </div>


          <div>
            <BadgeCheck size={20} />

            <p>
              Tell a trusted friend or family member where
              you are going and who you are meeting.
            </p>
          </div>


          <div>
            <BadgeCheck size={20} />

            <p>
              Do not feel pressured to share your home address,
              phone number or other private information.
            </p>
          </div>


          <div>
            <BadgeCheck size={20} />

            <p>
              If you feel uncomfortable at any point, leave the
              situation and report the concern to FoodKindl.
            </p>
          </div>


          <div>
            <BadgeCheck size={20} />

            <p>
              Use your own transport plan where possible so
              you can leave independently.
            </p>
          </div>

        </div>

      </section>


      {/* =====================================================
          HOSTS AND GUESTS
      ===================================================== */}

      <section className="safety-host-guest">

        <div className="safety-centre-section-header">

          <span>
            04 · HOSTS & GUESTS
          </span>

          <h2>
            Respect makes gatherings safer
          </h2>

        </div>


        <div className="safety-host-grid">

          <article>

            <div className="safety-centre-icon">
              <Users size={28} />
            </div>

            <h3>
              For Hosts
            </h3>

            <p>
              Clearly communicate the date, venue, expected
              group size, food plans and any gathering-specific
              rules before members attend.
            </p>

            <p>
              Do not pressure guests to share private details
              or participate in anything they are not comfortable
              with.
            </p>

          </article>


          <article>

            <div className="safety-centre-icon">
              <HeartHandshake size={28} />
            </div>

            <h3>
              For Guests
            </h3>

            <p>
              Respect the host's home, venue, boundaries,
              dietary requirements and gathering conditions.
            </p>

            <p>
              If plans materially change from what was agreed,
              you are free to leave or decline to participate.
            </p>

          </article>

        </div>

      </section>


      {/* =====================================================
          FOOD SAFETY
      ===================================================== */}

      <section className="safety-food-section">

        <div>

          <span className="safety-centre-kicker">
            05 · FOOD & ALLERGY SAFETY
          </span>

          <h2>
            Ask before you eat
          </h2>

          <p>
            Members should communicate dietary preferences,
            allergies and important food restrictions before
            a meal whenever possible.
          </p>

        </div>


        <div className="safety-food-card">

          <Utensils size={29} />

          <h3>
            Important food-safety guidance
          </h3>

          <ul>
            <li>
              Hosts should accurately describe known ingredients.
            </li>

            <li>
              Guests with allergies should confirm ingredients
              before consuming food.
            </li>

            <li>
              Cross-contamination may occur in home or shared
              kitchens.
            </li>

            <li>
              When unsure about an ingredient or preparation
              method, do not consume the food.
            </li>

            <li>
              Follow appropriate hygiene, storage and cooking
              practices.
            </li>
          </ul>

        </div>

      </section>


      {/* =====================================================
          PRIVACY SAFETY
      ===================================================== */}

      <section className="safety-private-info">

        <LockKeyhole size={29} />

        <div>

          <span>
            PROTECT YOUR PRIVATE INFORMATION
          </span>

          <h2>
            Keep sensitive information off public profiles
          </h2>

          <p>
            Never publicly post your Aadhaar number,
            Government-ID number, full home address, financial
            information, passwords or other sensitive personal
            information.
          </p>

          <p>
            Think carefully before sharing your personal phone
            number or exact home location with another member.
          </p>

        </div>

      </section>


      {/* =====================================================
          REPORTING
      ===================================================== */}

      <section className="safety-reporting-section">

        <div>

          <span className="safety-centre-kicker">
            06 · REPORTING A CONCERN
          </span>

          <h2>
            Tell us when something feels wrong
          </h2>

          <p>
            You can report behaviour, content, messages,
            profiles or gatherings that appear unsafe,
            abusive, misleading or inconsistent with
            FoodKindl's Community Guidelines.
          </p>

        </div>


        <div className="safety-report-card">

          <MessageSquareWarning size={31} />

          <h3>
            Contact the Safety Team
          </h3>

          <p>
            Include as much relevant information as possible,
            such as the account, post, message or gathering
            involved and a description of what happened.
          </p>

          <Link
            to="/contact"
            className="safety-contact-button"
          >
            Report a safety concern
          </Link>

        </div>

      </section>


      {/* =====================================================
          REVIEW PROCESS
      ===================================================== */}

      <section className="safety-centre-section">

        <div className="safety-centre-section-header">

          <span>
            07 · HOW REPORTS ARE REVIEWED
          </span>

          <h2>
            What happens after you report
          </h2>

        </div>


        <div className="safety-review-grid">

          <article>
            <strong>
              01
            </strong>

            <h3>
              Report received
            </h3>

            <p>
              FoodKindl receives the information you provide
              through the available reporting or support channel.
            </p>
          </article>


          <article>
            <strong>
              02
            </strong>

            <h3>
              Review
            </h3>

            <p>
              Available account, content and contextual
              information may be reviewed to understand
              the reported concern.
            </p>
          </article>


          <article>
            <strong>
              03
            </strong>

            <h3>
              Action
            </h3>

            <p>
              Depending on the circumstances, actions may
              include warnings, content removal, restrictions,
              suspension or account termination.
            </p>
          </article>

        </div>

      </section>


      {/* =====================================================
          EMERGENCY
      ===================================================== */}

      <section className="safety-emergency">

        <AlertTriangle size={31} />

        <div>

          <strong>
            FoodKindl is not an emergency service
          </strong>

          <p>
            If you or another person is in immediate danger,
            contact your local emergency services or appropriate
            authorities. Do not rely on FoodKindl reporting
            tools for urgent emergency assistance.
          </p>

        </div>

      </section>


      {/* =====================================================
          FOOTNOTE
      ===================================================== */}

      <div className="safety-centre-footer-note">

        <p>
          FoodKindl may update its safety tools and guidance
          as new features and community experiences are introduced.
        </p>

        <span>
          © 2026 KnightnKindle Pvt Ltd.
        </span>

      </div>

    </main>
  );
}