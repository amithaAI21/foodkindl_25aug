import {
  ArrowLeft,
  ChefHat,
  Info,
  Lightbulb,
  Sparkles,
  Utensils,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import AIRecipeSearch
  from "../components/AIRecipeSearch";

import "../styles/ai_kitchen.css";


export default function AIKitchen() {

  const navigate =
    useNavigate();


  return (

    <main className="ai-kitchen-page">


      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="ai-kitchen-glow ai-kitchen-glow-one" />

      <div className="ai-kitchen-glow ai-kitchen-glow-two" />


      {/* =====================================================
          TOP BAR
      ====================================================== */}

      <div className="ai-kitchen-topbar">

        <button
          type="button"
          className="ai-kitchen-back-button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <ArrowLeft size={17} />

          Back to Dashboard
        </button>


        <div className="ai-kitchen-brand-pill">

          <Sparkles size={14} />

          FoodKindl AI

        </div>

      </div>


      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="ai-kitchen-hero">


        <div className="ai-kitchen-hero-copy">

          <div className="ai-kitchen-hero-icon">

            <ChefHat size={28} />

          </div>


          <span className="ai-kitchen-eyebrow">
            YOUR AI COOKING COMPANION
          </span>


          <h1>
            Turn what you have
            into something{" "}
            <span>
              delicious.
            </span>
          </h1>


          <p>
            Tell FoodKindl AI what ingredients you have,
            what kind of food you want, or what you are
            in the mood to cook.
          </p>

        </div>


        {/* ===================================================
            QUICK TIPS
        ==================================================== */}

        <div className="ai-kitchen-tips-card">

          <div className="ai-kitchen-tips-header">

            <Lightbulb size={18} />

            <strong>
              Get better recipe ideas
            </strong>

          </div>


          <div className="ai-kitchen-tip-list">

            <span>
              <Utensils size={14} />

              Mention the ingredients you already have.
            </span>


            <span>
              <Utensils size={14} />

              Add preferences like vegetarian, spicy or quick.
            </span>


            <span>
              <Utensils size={14} />

              Use simple ingredient names for better results.
            </span>

          </div>

        </div>

      </section>


      {/* =====================================================
          LANGUAGE NOTE
      ====================================================== */}

      <section className="ai-kitchen-language-card">

        <div className="ai-kitchen-language-icon">

          <Info size={18} />

        </div>


        <div>

          <strong>
            Language support
          </strong>


          <p>
            For now, please use plain English ingredient names.
            Regional-language or local ingredient names may not
            always be recognised correctly.
          </p>


          <span>
            Regional language support is coming soon.
          </span>

        </div>

      </section>


      {/* =====================================================
          AI WORKSPACE
      ====================================================== */}

      <section className="ai-kitchen-workspace">


        <div className="ai-kitchen-workspace-header">

          <div>

            <span>
              FOODKINDL AI RECIPE STUDIO
            </span>

            <h2>
              What would you like to cook?
            </h2>

          </div>


          <div className="ai-kitchen-powered">

            <Sparkles size={14} />

            AI-powered

          </div>

        </div>


        <div className="ai-kitchen-search-shell">

          <AIRecipeSearch />

        </div>

      </section>

    </main>

  );
}