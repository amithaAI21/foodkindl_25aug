
import { useState } from "react";

import {
  ArrowLeft,
  UsersRound,
  MessageCircle,
} from "lucide-react";

import { Link } from "react-router-dom";

import Community from "./Community";
import Connect from "./Connect";

import "../styles/Discover.css";

export default function Discover() {
  const [activeSection, setActiveSection] = useState("community");

  return (
    <main className="discover-page">

      {/* =================================
          HEADER
      ================================= */}

      <section className="discover-header">
        <div className="discover-header-inner">

          {/* BACK TO DASHBOARD */}

          <Link
            to="/connect-dashboard"
            className="discover-back-link"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "22px",
              color: "inherit",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </Link>

          {/* PAGE HEADING */}

          <span className="discover-eyebrow">
            FOODKINDL DISCOVER
          </span>

          <h1>
            Discover your food community
          </h1>

          <p>
            Share food stories, discover people
            nearby and build meaningful connections
            through food.
          </p>

        </div>
      </section>

      {/* =================================
          COMMUNITY / CONNECT TABS
      ================================= */}

      <div className="discover-switch-wrapper">
        <div className="discover-switch">

          {/* COMMUNITY TAB */}

          <button
            type="button"
            className={
              activeSection === "community"
                ? "discover-switch-button active"
                : "discover-switch-button"
            }
            onClick={() => setActiveSection("community")}
          >
            <MessageCircle size={20} />
            <span>Community</span>
          </button>

          {/* CONNECT TAB */}

          <button
            type="button"
            className={
              activeSection === "connect"
                ? "discover-switch-button active"
                : "discover-switch-button"
            }
            onClick={() => setActiveSection("connect")}
          >
            <UsersRound size={20} />
            <span>Connect</span>
          </button>

        </div>
      </div>

      {/* =================================
          CONTENT
      ================================= */}

      <section className="discover-content">

        {activeSection === "community" && (
          <Community embedded />
        )}

        {activeSection === "connect" && (
          <Connect embedded />
        )}

      </section>

    </main>
  );
}
