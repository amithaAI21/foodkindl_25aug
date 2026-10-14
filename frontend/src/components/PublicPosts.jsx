
import { useEffect, useState } from "react";
import {
  Globe2,
  Heart,
  MessageCircle,
  RefreshCw,
  ArrowRight,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api";
import "../styles/public_posts.css";

const API_BASE = (
  import.meta.env.VITE_BACKEND_URL ||
  "https://foodkindl-25aug.onrender.com"
).replace(/\/+$/, "");

function getMediaUrl(path) {
  if (!path) return "";

  if (/^(https?:|blob:)/i.test(path)) return path;

  if (path.startsWith("/.netlify/")) {
    return `${window.location.origin}${path}`;
  }

  return `${API_BASE}/${path.replace(/^\/+/, "")}`;
}

function getAuthorName(author) {
  const fullName = [
    author?.first_name,
    author?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    author?.full_name ||
    author?.profile?.full_name ||
    fullName ||
    author?.username ||
    "FoodKindl Member"
  );
}

function getAuthorImage(author) {
  return getMediaUrl(
    author?.profile?.profile_image_1_url ||
    author?.profile?.profile_image_1 ||
    author?.profile_image_1_url ||
    author?.profile_image_1 ||
    ""
  );
}

function getPostDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PublicPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  
async function loadPosts() {
  setLoading(true);
  setError("");

  try {
    const response = await api.get("/posts/");

    const data =
      response.data?.results ?? response.data;

    const postList = Array.isArray(data)
      ? data
      : [];

    const latestPosts = postList
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
      )
      .slice(0, 6);

    setPosts(latestPosts);
  } catch (err) {
    console.error("Public posts error:", err);
    setError("Unable to load food stories.");
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <section className="cd-public-posts">
      <div className="cd-public-posts-header">
        <div>
          <span className="cd-posts-eyebrow">
            FOOD STORIES & COMMUNITY
          </span>

          <h2>Food Stories</h2>

          <p>
            Discover food experiences shared
            by FoodKindl members.
          </p>
        </div>

        <Link
          to="/discover"
          className="cd-posts-view-all"
        >
          View all
          <ArrowRight size={16} />
        </Link>
      </div>

      {error && (
        <div className="cd-post-error">
          {error}
          <button onClick={loadPosts}>
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="cd-post-loading">
          <RefreshCw
            size={22}
            className="cd-post-spinner"
          />
          Loading food stories...
        </div>
      ) : posts.length === 0 ? (
        <div className="cd-post-empty">
          <ImageIcon size={30} />

          <h3>No public food stories yet</h3>

          <p>
            Public posts shared by FoodKindl
            members will appear here.
          </p>
        </div>
      ) : (
        <div className="cd-public-feed">
          {posts.map((post) => {
            const author = post.author || {};
            const authorName = getAuthorName(author);
            const authorImage = getAuthorImage(author);
            const image = getMediaUrl(
              post.image_url || post.image
            );
            const video = getMediaUrl(
              post.video_url || post.video
            );

            return (
              <article
                className="cd-public-feed-card"
                key={post.id}
              >
                <div className="cd-feed-author">
                  {authorImage ? (
                    <img
                      src={authorImage}
                      alt={authorName}
                      className="cd-feed-avatar"
                    />
                  ) : (
                    <div className="cd-feed-avatar-fallback">
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="cd-feed-author-info">
                    <strong>{authorName}</strong>

                    <span>
                      {getPostDate(post.created_at)}
                      <Globe2 size={12} />
                      Public
                    </span>
                  </div>
                </div>

                {post.location_name && (
                  <div className="cd-feed-location">
                    <MapPin size={13} />
                    {post.location_name}
                  </div>
                )}

                {post.title && (
                  <h3 className="cd-feed-title">
                    {post.title}
                  </h3>
                )}

                {post.text && (
                  <p className="cd-feed-text">
                    {post.text}
                  </p>
                )}

                {image && (
                  <img
                    src={image}
                    alt={post.title || "Food experience"}
                    className="cd-feed-image"
                    loading="lazy"
                  />
                )}

                {video && (
                  <video
                    src={video}
                    controls
                    playsInline
                    preload="metadata"
                    className="cd-feed-image"
                  />
                )}

                <div className="cd-feed-footer">
                  <div className="cd-feed-counts">
                    <span>
                      <Heart size={16} />
                      {post.reaction_count || 0}
                    </span>

                    <span>
                      <MessageCircle size={16} />
                      {post.comment_count || 0}
                    </span>
                  </div>

                  <Link
                    to={`/community/post/${post.id}`}
                    className="cd-feed-details"
                  >
                    View post
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
