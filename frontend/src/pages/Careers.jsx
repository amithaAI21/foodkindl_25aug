import {
  ArrowLeft,
  BriefcaseBusiness,
  Code2,
  HeartHandshake,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";


export default function Careers() {

  const workAreas = [

    {
      icon:
        <Code2 size={28} />,

      title:
        "Technology",

      text:
        "Build simple and reliable products that help people connect through food.",
    },

    {
      icon:
        <Sparkles size={28} />,

      title:
        "Product",

      text:
        "Design useful and easy experiences across FoodKindl Connect, AI Kitchen and future products.",
    },

    {
      icon:
        <Users size={28} />,

      title:
        "Community",

      text:
        "Help build welcoming local communities where people feel comfortable taking part.",
    },

    {
      icon:
        <Megaphone size={28} />,

      title:
        "Marketing & Creators",

      text:
        "Help tell the FoodKindl story, work with creators and grow the community.",
    },

    {
      icon:
        <ShieldCheck size={28} />,

      title:
        "Trust & Safety",

      text:
        "Help make FoodKindl safer and more respectful for everyone.",
    },

    {
      icon:
        <BriefcaseBusiness size={28} />,

      title:
        "Operations",

      text:
        "Support partnerships, community operations and day-to-day business activities.",
    },

  ];


  return (

    <main className="careers-page">


      {/* =====================================================
          TOP NAVIGATION
      ====================================================== */}

      <div className="careers-topbar">

        <Link
          to="/"
          className="careers-back-link"
        >

          <ArrowLeft size={18} />

          Back to FoodKindl

        </Link>

      </div>


      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="careers-hero">

        <div className="careers-pill">

          <HeartHandshake size={16} />

          BUILD WITH US

        </div>


        <h1>
          Help us bring people
          closer through{" "}
          <span>
            food.
          </span>
        </h1>


        <p>
          FoodKindl is building a community where
          people can meet, cook, dine and connect
          through shared food experiences.
        </p>

      </section>


      {/* =====================================================
          WHY FOODKINDL
      ====================================================== */}

      <section className="careers-mission">

        <div className="careers-section-number">
          01
        </div>


        <div>

          <span className="careers-kicker">
            WHY FOODKINDL
          </span>


          <h2>
            Work on something
            people can experience
            in real life.
          </h2>

        </div>


        <p>
          We are looking for people who care about
          technology, food and community.
          Our goal is simple: build products that help
          people discover each other, spend time together
          and create meaningful connections.
        </p>

      </section>


      {/* =====================================================
          WORK AREAS
      ====================================================== */}

      <section className="careers-work-section">

        <div className="careers-section-header">

          <span>
            Where you can contribute
          </span>


          <h2>
            Different skills.
            <br />
            One shared goal.
          </h2>

        </div>


        <div className="careers-grid">

          {
            workAreas.map(
              (
                area,
                index
              ) => (

                <article
                  className="careers-card"
                  key={
                    area.title
                  }
                >

                  <span className="careers-card-number">

                    {
                      String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )
                    }

                  </span>


                  <div className="careers-card-icon">

                    {area.icon}

                  </div>


                  <h3>
                    {area.title}
                  </h3>


                  <p>
                    {area.text}
                  </p>

                </article>

              )
            )
          }

        </div>

      </section>


      {/* =====================================================
          OPENINGS
      ====================================================== */}

      <section className="careers-openings">

        <div className="careers-openings-copy">

          <span className="careers-kicker">
            CURRENT OPENINGS
          </span>


          <h2>
            No open roles right now.
          </h2>


          <p>
            We are not hiring for any specific roles
            at the moment.
            You can still share your profile with us
            for future opportunities.
          </p>

        </div>


        <div className="careers-interest-card">

          <div className="careers-interest-icon">

            <BriefcaseBusiness size={30} />

          </div>


          <h3>
            Want to work with FoodKindl?
          </h3>


          <p>
            Send us a short introduction,
            tell us what kind of work you are interested in,
            and share your LinkedIn profile,
            portfolio or resume.
          </p>


          <a
            href="mailto:support@foodkindl.org"
            className="careers-primary-button"
          >
            support@foodkindl.org
          </a>

        </div>

      </section>


      {/* =====================================================
          VALUES
      ====================================================== */}

      <section className="careers-values">

        <div>

          <span className="careers-kicker">
            HOW WE WORK
          </span>


          <h2>
            Simple.
            Thoughtful.
            Human-first.
          </h2>

        </div>


        <div className="careers-values-list">


          <div>

            <strong>
              Think about people first
            </strong>


            <p>
              Build around real user needs
              and keep things simple.
            </p>

          </div>


          <div>

            <strong>
              Build trust
            </strong>


            <p>
              Treat safety, privacy and respect
              as important parts of the product.
            </p>

          </div>


          <div>

            <strong>
              Keep learning
            </strong>


            <p>
              Listen to members, creators,
              partners and the wider community.
            </p>

          </div>


          <div>

            <strong>
              Care about the details
            </strong>


            <p>
              Build experiences that are useful,
              clear and easy to use.
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          COMPANY
      ====================================================== */}

      <section className="careers-company-note">

        <strong>
          FoodKindl
        </strong>


        <p>
          FoodKindl is a product and community
          initiative of KnightnKindle Pvt Ltd.
        </p>

      </section>

    </main>

  );
}