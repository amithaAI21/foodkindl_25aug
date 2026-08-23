import {
  ArrowLeft,
  Info,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import AIRecipeSearch
  from "../components/AIRecipeSearch";


export default function AIKitchen() {

  const navigate =
    useNavigate();


  return (

    <main
      className="app-page ai-kitchen-page"
    >

      {/* =====================================================
          BACK BUTTON
      ====================================================== */}

      <div
        style={{
          marginBottom: "20px",
        }}
      >

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            navigate("/dashboard")
          }
        >

          <ArrowLeft
            size={18}
          />

          Back to Dashboard

        </button>

      </div>


      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <section
        className="ai-kitchen-page-header"
      >

        <div
          className="eyebrow left"
        >
          FoodKindl AI
        </div>


        <h1>
          AI Kitchen
        </h1>


        <p>
          Discover recipes,
          ingredients, cooking
          instructions and helpful
          food tips with FoodKindl AI.
        </p>

      </section>


      {/* =====================================================
          LANGUAGE ALERT
      ====================================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          marginTop: "16px",
          marginBottom: "20px",
          padding: "12px 14px",
          border:
            "1px solid rgba(255, 170, 70, 0.30)",
          borderRadius: "10px",
          background:
            "rgba(255, 170, 70, 0.08)",
          fontSize: "13px",
          lineHeight: "1.5",
        }}
        role="alert"
      >

        <Info
          size={18}
          style={{
            flexShrink: 0,
            marginTop: "1px",
          }}
        />


        <div>

          <strong>
            Language Note:
          </strong>

          {" "}

          Please use plain English
          ingredient names for now.
          Regional-language or local
          ingredient names may not
          always be recognised.

          {" "}

          <strong>
            Regional language support
            is coming soon.
          </strong>

        </div>

      </div>


      {/* =====================================================
          AI RECIPE SEARCH
      ====================================================== */}

      <AIRecipeSearch />

    </main>

  );
}