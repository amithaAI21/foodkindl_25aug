import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, ShoppingCart, X } from "lucide-react";
import "../styles/grocery_amazon_now.css";

const STORES = [
  { id: "blinkit", label: "Blinkit", description: "Quick grocery delivery", url: "https://blinkit.com/", initial: "B" },
  { id: "instamart", label: "Swiggy Instamart", description: "Groceries and essentials", url: "https://www.swiggy.com/instamart", initial: "S" },
  { id: "amazon", label: "Amazon Now", description: "Choose Now in the Amazon app, where available", initial: "A" },
];

const AMAZON_HOME = "https://www.amazon.in/";

function approvedAmazonLink() {
  const raw = String(import.meta.env.VITE_AMAZON_NOW_AFFILIATE_URL || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    const allowed = hostname === "amzn.to" || hostname === "amazon.in" || hostname.endsWith(".amazon.in");
    return parsed.protocol === "https:" && allowed ? parsed.href : null;
  } catch {
    return null;
  }
}

export default function GroceryCompareOptions({ recipeTitle = "", groceryItems = [] }) {
  const items = useMemo(() => (Array.isArray(groceryItems) ? groceryItems : [])
    .map((item) => ({ name: String(typeof item === "string" ? item : item?.name || "").trim() }))
    .filter((item) => item.name), [groceryItems]);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState([]);
  useEffect(() => { setSelected([]); }, [items]);
  const affiliate = approvedAmazonLink();
  const amazonUrl = affiliate || AMAZON_HOME;
  const selectedNames = items.filter(item => selected.includes(item.name)).map(item => item.name);

  function toggle(name) {
    setSelected(previous => previous.includes(name)
      ? previous.filter(value => value !== name)
      : [...previous, name]);
  }

  async function copyList() {
    const text = selectedNames.join("\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be unavailable; list remains visible for manual use.
    }
  }

  if (!items.length) return null;

  return (
    <section className="fk-grocery-now" aria-label="Buy missing ingredients">
      <div className="fk-grocery-now-header">
        <div className="fk-grocery-now-header-text">
          <span className="fk-grocery-now-kicker">MISSING INGREDIENTS</span>
          <h3>Buy These Groceries</h3>
          <p>FoodKindl found {items.length} grocery {items.length === 1 ? "item" : "items"} you may need{recipeTitle ? ` for ${recipeTitle}` : ""}.</p>
        </div>
        <button type="button" className="fk-grocery-now-toggle" onClick={() => setExpanded(value => !value)}>
          <ShoppingCart size={16} /> {expanded ? "Hide Grocery Options" : "Compare Grocery Options"}
        </button>
      </div>

      {expanded && (
        <div className="fk-grocery-now-body">
          <div className="fk-grocery-now-shopping-header">
            <div>
              <span className="fk-grocery-now-kicker">FOODKINDL SHOPPING LIST</span>
              <h4>Groceries{recipeTitle ? ` for ${recipeTitle}` : ""}</h4>
            </div>
            <button type="button" className="fk-grocery-now-close" aria-label="Close grocery options" onClick={() => setExpanded(false)}><X size={16} /></button>
          </div>
          <div className="fk-grocery-now-items">
            {items.map((item) => (
              <label key={item.name} className="fk-grocery-now-item">
                <input type="checkbox" checked={selected.includes(item.name)} onChange={() => toggle(item.name)} />
                <span>{item.name}</span>
              </label>
            ))}
          </div>
          <div className="fk-grocery-now-count">
            <Check size={15} /> {selected.length} of {items.length} selected
            {selected.length > 0 && <button type="button" onClick={copyList}>Copy selected ingredients</button>}
          </div>
          <div className="fk-grocery-now-stores-title">
            <span className="fk-grocery-now-kicker">COMPARE GROCERY OPTIONS</span>
            <h4>Choose where you want to shop</h4>
            <p>Availability, price and delivery time are confirmed by each provider.</p>
          </div>
          <div className="fk-grocery-now-stores">
            {STORES.map(store => (
              <a key={store.id} className={`fk-grocery-now-store fk-grocery-now-${store.id}`}
                 href={store.id === "amazon" ? amazonUrl : store.url}
                 target="_blank" rel={store.id === "amazon" ? "noopener noreferrer sponsored" : "noopener noreferrer"}>
                <span className="fk-grocery-now-store-icon">{store.initial}</span>
                <span className="fk-grocery-now-store-copy"><strong>{store.label}</strong><small>{store.description}</small></span>
                <ExternalLink size={16} />
              </a>
            ))}
          </div>
          <p className="fk-grocery-now-note">
            Amazon Now availability is location-specific. Open Amazon and select the Now lightning icon if available.
            {affiliate ? " Amazon link configured; qualifying commissions are subject to Amazon's terms, including Amazon Now eligibility." : " No verified Amazon affiliate link configured: this opens Amazon without affiliate tracking."}
          </p>
          <p className="fk-grocery-now-disclosure">As an Amazon Associate I earn from qualifying purchases.</p>
          <p className="fk-grocery-now-note">Selected items are not added automatically to any store's cart.</p>
        </div>
      )}
    </section>
  );
}
