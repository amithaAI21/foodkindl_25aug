import React, { useEffect, useRef } from "react";
import "../styles/RestaurantDashboard.css";
import api from "../api";

const safeUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;
const pick = (r, ...keys) => keys.map((key) => r?.[key]).find((value) => value !== undefined && value !== null && value !== "");
const asText = (value) => typeof value === "string" ? value : value?.text || "";
const serviceStatus = (value) => value === true || value === "yes" ? "Available" : value === false || value === "no" ? "Not available" : "Not provided";

export function RestaurantSummary({ restaurant: r }) {
  if (!r) return null;
  const rating = pick(r, "rating");
  const count = pick(r, "review_count", "userRatingCount", "user_ratings_total");
  const numericRating = rating == null ? NaN : Number(rating);
  const hours = r.currentOpeningHours || r.current_opening_hours;
  const open = pick(r, "open_now") ?? hours?.openNow;
  const price = pick(r, "price_label", "priceLevel", "price_level");
  const prices = { PRICE_LEVEL_INEXPENSIVE: "₹", PRICE_LEVEL_MODERATE: "₹₹", PRICE_LEVEL_EXPENSIVE: "₹₹₹", PRICE_LEVEL_VERY_EXPENSIVE: "₹₹₹₹", PRICE_LEVEL_FREE: "Free" };
  const priceText = typeof price === "number" ? "₹".repeat(Math.max(1, Math.min(4, price))) : prices[price] || price;
  return <div className="fk-rating-row">
    <span>{Number.isFinite(numericRating) ? `★ ${numericRating.toFixed(1)}` : "Rating unavailable"}{count != null ? ` · ${Number(count).toLocaleString()} ratings` : ""}</span>
    {typeof open === "boolean" && <span className={open ? "fk-open" : "fk-closed"}>{open ? "Open now" : "Closed now"}</span>}
    {priceText && <span>{priceText}</span>}
  </div>;
}

export function RestaurantPhoto({ restaurant: r, className = "" }) {
  const photo = (r?.photos || []).find((p) => safeUrl(p.url || p.photo_url));
  const rawUrl = r?.photo_url || r?.image_url || photo?.url || photo?.photo_url;
  const base = new URL(api.defaults.baseURL || "/api/", window.location.origin);
  const url = rawUrl && (safeUrl(rawUrl) || (rawUrl.startsWith("/") ? new URL(rawUrl, base.origin).toString() : null));
  return <figure className={`fk-photo ${className}`}>
    {url ? <img src={url} alt={`${r?.name || "Restaurant"} restaurant`} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
      : <div><span aria-hidden="true">🍽</span><small>Restaurant photo unavailable</small></div>}
    {(r?.photo_attributions || photo?.authorAttributions || []).map((a, i) => <figcaption key={i}>{safeUrl(a.uri) ? <a href={a.uri} target="_blank" rel="noreferrer">{a.displayName}</a> : a.displayName}</figcaption>)}
  </figure>;
}

export default function RestaurantDashboard({ restaurant: r, onClose, onChoose, onNavigate }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!r) return undefined;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previous?.focus?.(); };
  }, [r]);
  if (!r) return null;
  const phone = pick(r, "phone", "nationalPhoneNumber", "internationalPhoneNumber");
  const website = safeUrl(pick(r, "website", "websiteUri"));
  const hours = r.currentOpeningHours || r.regularOpeningHours || r.opening_hours;
  const days = Array.isArray(hours) ? hours : hours?.weekdayDescriptions || [];
  const services = [["Dine-in", pick(r,"dineIn","dine_in")],["Takeaway",pick(r,"takeout","takeaway")],["Delivery",r.delivery],["Wheelchair access",pick(r,"wheelchair","wheelchair_accessible")],["Wi-Fi",pick(r,"internet_access","wifi")]];
  const reviews = Array.isArray(r.reviews) ? r.reviews : [];
  const handleKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose?.(); }
    if (e.key !== "Tab") return;
    const nodes = [...ref.current.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')];
    if (!nodes.length) return;
    if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes[nodes.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === nodes[nodes.length - 1]) { e.preventDefault(); nodes[0].focus(); }
  };
  return <div className="fk-dashboard-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
    <article ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="fk-detail-title" className="fk-dashboard" onKeyDown={handleKeyDown}>
      <header className="fk-detail-header"><span>FOODKINDL / DINE OUT</span><button type="button" onClick={onClose} aria-label="Close restaurant details">✕</button></header>
      <div className="fk-detail-hero"><RestaurantPhoto restaurant={r}/><div>
        <span className="fk-kicker">FIND YOUR NEXT SHARED TABLE</span>
        <h2 id="fk-detail-title">{r.name}</h2><p>{r.category || r.amenity || "Restaurant"}</p>
        <RestaurantSummary restaurant={r}/><p>{r.address || r.formattedAddress || r.location_label || "Address not provided"}</p>
        <div className="fk-detail-actions">
          <button type="button" className="fk-plan" onClick={() => onChoose?.(r)}>Plan a Dine Out</button>
          <button type="button" onClick={() => onNavigate?.(r)}>Get directions ↗</button>
          {phone && <a href={`tel:${String(phone).replace(/[^+\d]/g, "")}`}>Call restaurant</a>}
          {website && <a href={website} target="_blank" rel="noreferrer">Website ↗</a>}
        </div>
      </div></div>
      <div className="fk-detail-grid">
        <section><h3>Opening hours</h3>{days.length ? <ul className="fk-hours">{days.map((day,i) => <li key={i}>{day}</li>)}</ul> : <p>{typeof hours === "string" && hours ? hours : "Opening hours not provided"}</p>}</section>
        <section><h3>Contact & location</h3><p>{phone || "Phone not provided"}</p><p>{r.address || r.formattedAddress || "Address not provided"}</p><small>Confirm timings and prices directly with the restaurant.</small></section>
        <section><h3>Facilities & services</h3><dl>{services.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{serviceStatus(value)}</dd></div>)}</dl></section>
        <section><h3>Food options</h3><dl><div><dt>Vegetarian options</dt><dd>{serviceStatus(pick(r,"servesVegetarianFood","diet_vegetarian"))}</dd></div></dl></section>
      </div>
      <section className="fk-reviews"><h3>What diners say</h3>
        {reviews.length ? reviews.map((review, i) => <article key={review.name || i}>
          <strong>{review.authorAttribution?.displayName || review.author_name || "Reviewer"}</strong>
          <span>{review.rating != null ? ` ★ ${review.rating}` : ""} {review.relativePublishTimeDescription || ""}</span>
          <p>{asText(review.text) || asText(review.originalText)}</p>
        </article>) : <p>Individual reviews are not available for this listing. The rating above is shown when supplied by the provider.</p>}
      </section>
      <footer>{r.source === "google" && <p>Listing provided by Google Maps</p>}{(r.attributions || []).map((a,i) => <p key={i}>{safeUrl(a.providerUri) ? <a href={a.providerUri} target="_blank" rel="noreferrer">{a.provider}</a> : a.provider}</p>)}</footer>
    </article>
  </div>;
}
