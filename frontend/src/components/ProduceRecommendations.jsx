import {
  Apple,
  Carrot,
  Check,
  Flame,
  Leaf,
  MapPin,
  Plus,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";

import { useMemo, useState } from "react";
import api from "../api";
import "../styles/produce_recommendations.css";

const CATEGORY_TABS = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "vegetable", label: "Vegetables", icon: Carrot },
  { id: "fruit", label: "Fruits", icon: Apple },
  { id: "spice", label: "Spices", icon: Flame },
];

const PURPOSES = [
  { value: "complete_recipe", label: "Complete my recipe" },
  { value: "healthier", label: "Make it healthier" },
  { value: "seasonal", label: "Discover seasonal produce" },
  { value: "use_soon", label: "Use ingredients before they spoil" },
];

const SHOPPING_PLATFORMS = [
  {
    name: "Amazon Fresh",
    url: query => `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
  },
  {
    name: "Zepto",
    url: query => `https://www.zeptonow.com/search?query=${encodeURIComponent(query)}`,
  },
  {
    name: "Blinkit",
    url: query => `https://blinkit.com/s/?q=${encodeURIComponent(query)}`,
  },
  {
    name: "Swiggy Instamart",
    url: query => `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(query)}`,
  },
];

export default function ProduceRecommendations({
  recipeTitle = "",
  availableIngredients = [],
  location = "Bengaluru",
  onBasketChange,
}) {
  const [purpose, setPurpose] = useState("complete_recipe");
  const [activeCategory, setActiveCategory] = useState("all");
  const [recommendations, setRecommendations] = useState([]);
  const [basket, setBasket] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const visibleRecommendations = useMemo(
    () => recommendations.filter(item =>
      activeCategory === "all" || item.category === activeCategory
    ),
    [activeCategory, recommendations]
  );

  const basketQuery = basket.map(item => item.name).join(" ");

  async function loadRecommendations() {
    if (!recipeTitle && availableIngredients.length === 0) {
      setError("Choose a recipe or add ingredients first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        "/ai/produce-recommendations/",
        {
          recipe_title: recipeTitle,
          available_ingredients: availableIngredients,
          purpose,
          location,
        },
        { timeout: 180000 }
      );

      const items = Array.isArray(response.data?.recommendations)
        ? response.data.recommendations
        : [];

      setRecommendations(items);
      setBasket([]);

      if (!items.length) {
        setError("No suitable recommendations were found. Try another purpose.");
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
        "Kindli couldn’t load recommendations. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleBasket(item) {
    setBasket(current => {
      const exists = current.some(product => product.name === item.name);
      const next = exists
        ? current.filter(product => product.name !== item.name)
        : [...current, item];

      onBasketChange?.(next);
      return next;
    });
  }

  return (
    <section className="fk-produce-recs">
      <header className="fk-produce-recs__header">
        <div>
          <span>SMART INGREDIENT RECOMMENDATIONS</span>
          <h2>Complete your meal with Kindli</h2>
          <p>
            Discover required ingredients, healthier additions, seasonal produce
            and useful substitutes based on what you already have.
          </p>
        </div>

        <div className="fk-produce-recs__location">
          <MapPin size={14} />
          {location}
        </div>
      </header>

      <div className="fk-produce-recs__controls">
        <label>
          <span>What should Kindli help with?</span>
          <select value={purpose} onChange={event => setPurpose(event.target.value)}>
            {PURPOSES.map(item => (
              <option value={item.value} key={item.value}>{item.label}</option>
            ))}
          </select>
        </label>

        <button type="button" onClick={loadRecommendations} disabled={loading}>
          {loading ? <RefreshCw size={16} /> : <Sparkles size={16} />}
          {loading ? "Finding recommendations…" : "Get recommendations"}
        </button>
      </div>

      {recommendations.length > 0 && (
        <div className="fk-produce-recs__tabs" role="tablist" aria-label="Ingredient category">
          {CATEGORY_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === tab.id}
                className={activeCategory === tab.id ? "active" : ""}
                onClick={() => setActiveCategory(tab.id)}
                key={tab.id}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {error && <div className="fk-produce-recs__error" role="alert">{error}</div>}

      {loading && (
        <div className="fk-produce-recs__loading" aria-live="polite">
          <span />
          Kindli is checking your recipe, season and available ingredients…
        </div>
      )}

      {!loading && visibleRecommendations.length > 0 && (
        <div className="fk-produce-recs__grid">
          {visibleRecommendations.map(item => {
            const selected = basket.some(product => product.name === item.name);
            return (
              <article className={`fk-produce-card ${item.priority === "required" ? "required" : ""}`} key={`${item.category}-${item.name}`}>
                <div className="fk-produce-card__visual">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} />
                  ) : item.category === "fruit" ? (
                    <Apple size={30} />
                  ) : item.category === "spice" ? (
                    <Flame size={30} />
                  ) : (
                    <Carrot size={30} />
                  )}
                  <span>{item.category}</span>
                </div>

                <div className="fk-produce-card__body">
                  <div className="fk-produce-card__topline">
                    <small>{item.label || item.priority}</small>
                    {item.in_season && <em><Leaf size={11} /> In season</em>}
                  </div>

                  <h3>{item.name}</h3>
                  {item.quantity && <strong>{item.quantity}</strong>}
                  <p>{item.reason}</p>

                  {item.substitute_for && (
                    <div className="fk-produce-card__substitute">
                      Substitute for <b>{item.substitute_for}</b>
                    </div>
                  )}

                  <button type="button" onClick={() => toggleBasket(item)} className={selected ? "selected" : ""}>
                    {selected ? <Check size={15} /> : <Plus size={15} />}
                    {selected ? "Added" : "Add to basket"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {basket.length > 0 && (
        <aside className="fk-produce-basket">
          <div className="fk-produce-basket__head">
            <div>
              <span>COMPLETE YOUR BASKET</span>
              <h3>{basket.length} selected item{basket.length === 1 ? "" : "s"}</h3>
            </div>
            <ShoppingCart size={22} />
          </div>

          <div className="fk-produce-basket__items">
            {basket.map(item => (
              <span key={item.name}>
                {item.name}
                <button type="button" aria-label={`Remove ${item.name}`} onClick={() => toggleBasket(item)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <p>Search your selected products. Prices and availability are confirmed on the retailer’s website.</p>

          <div className="fk-produce-basket__stores">
            {SHOPPING_PLATFORMS.map(platform => (
              <a href={platform.url(basketQuery)} target="_blank" rel="noreferrer" key={platform.name}>
                Search on {platform.name}
              </a>
            ))}
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(`vegetable shops near ${location}`)}`} target="_blank" rel="noreferrer">
              <MapPin size={13} /> Find local vendors
            </a>
          </div>
        </aside>
      )}
    </section>
  );
}