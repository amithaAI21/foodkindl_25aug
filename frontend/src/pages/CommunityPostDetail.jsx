import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Bookmark,
  Eye,
  MapPin,
  MessageCircle,
  RefreshCw,
  Repeat2,
  Share2,
} from "lucide-react";

import {
  Link,
  useParams,
} from "react-router-dom";

import api from "../api";
import { useAuth } from "../context/AuthContext";
import "../styles/community_post_detail.css";


const REACTIONS = [
  {
    value: "like",
    label: "Like",
    emoji: "👍",
  },
  {
    value: "love",
    label: "Love",
    emoji: "❤️",
  },
  {
    value: "haha",
    label: "Haha",
    emoji: "😂",
  },
  {
    value: "wow",
    label: "Wow",
    emoji: "😮",
  },
  {
    value: "sad",
    label: "Sad",
    emoji: "😢",
  },
  {
    value: "angry",
    label: "Angry",
    emoji: "😡",
  },
];


export default function CommunityPostDetail() {
  const { postId } = useParams();
  const { user } = useAuth();

  const [post, setPost] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    commentText,
    setCommentText,
  ] = useState("");

  const [
    commenting,
    setCommenting,
  ] = useState(false);

  const [
    openReactions,
    setOpenReactions,
  ] = useState(false);


  const API_BASE =
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000";


  // =========================================================
  // MEDIA URL
  // =========================================================

  function getMediaUrl(path) {
    if (!path) {
      return "";
    }

    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("blob:")
    ) {
      return path;
    }

    if (
      path.startsWith("/.netlify/")
    ) {
      return (
        `${window.location.origin}${path}`
      );
    }

    return `${API_BASE}${path}`;
  }


  // =========================================================
  // AUTHOR
  // =========================================================

  function getAuthorName(author) {
    return (
      author?.full_name ||

      [
        author?.first_name,
        author?.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||

      author?.email ||

      "FoodKindl Member"
    );
  }


  function getAuthorInitial(author) {
    return (
      getAuthorName(author)
        .charAt(0)
        .toUpperCase()
    );
  }


  // =========================================================
  // PROFILE IMAGE
  // =========================================================

  function getAuthorImage(author) {
    const imagePath =
      author
        ?.profile
        ?.profile_image_1_url
      ||
      author
        ?.profile
        ?.profile_image_1;

    return getMediaUrl(
      imagePath
    );
  }


  // =========================================================
  // POST IMAGE
  // =========================================================

  function getPostImage(currentPost) {
    const imagePath =
      currentPost?.image_url ||
      currentPost?.image;

    return getMediaUrl(
      imagePath
    );
  }


  // =========================================================
  // POST VIDEO
  // =========================================================

  function getPostVideo(currentPost) {
    const videoPath =
      currentPost?.video_url ||
      currentPost?.video;

    return getMediaUrl(
      videoPath
    );
  }


  // =========================================================
  // REACTION
  // =========================================================

  function getReactionEmoji(
    reactionType
  ) {
    return (
      REACTIONS.find(
        (reaction) =>
          reaction.value ===
          reactionType
      )?.emoji || "👍"
    );
  }


  // =========================================================
  // ERROR MESSAGE
  // =========================================================

  function getErrorMessage(data) {
    if (!data) {
      return (
        "The request could not be completed."
      );
    }

    if (
      typeof data === "string"
    ) {
      return data;
    }

    return (
      data?.reaction_type?.[0] ||
      data?.text?.[0] ||
      data?.message?.[0] ||
      data?.non_field_errors?.[0] ||
      data?.detail ||
      "The request could not be completed."
    );
  }


  // =========================================================
  // PRIVATE MESSAGE
  // =========================================================

  function openDirectMessage(member) {
    setError("");
    setSuccess("");

    if (!member?.id) {
      setError(
        "This member is unavailable for messaging."
      );

      return;
    }

    if (
      member.id === user?.id
    ) {
      setError(
        "You cannot message yourself."
      );

      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        "foodkindl:open-chat",
        {
          detail: {
            member,
          },
        }
      )
    );
  }


  // =========================================================
  // LOAD POST
  // =========================================================

  const loadPost = useCallback(
    async ({
      showFullLoader = false,
    } = {}) => {

      if (!postId) {
        return;
      }

      if (showFullLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");
      setSuccess("");

      try {
        const response =
          await api.get(
            `/posts/${postId}/`
          );

        setPost(
          response.data
        );

      } catch (
        requestError
      ) {
        console.error(
          "Post detail error:",
          requestError.response?.status,
          requestError.response?.data ||
            requestError
        );

        if (
          requestError
            .response
            ?.status === 404
        ) {
          setError(
            "This post was not found."
          );

        } else if (
          requestError
            .response
            ?.status === 401
        ) {
          setError(
            "Please log in again to view this post."
          );

        } else {
          setError(
            "This post could not be loaded."
          );
        }

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [postId]
  );


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadPost({
      showFullLoader: true,
    });
  }, [loadPost]);


  // =========================================================
  // REFRESH BUTTON
  // =========================================================

  async function refreshPost() {
    await loadPost({
      showFullLoader: false,
    });
  }


  // =========================================================
  // RECORD UNIQUE VIEW
  // =========================================================

  useEffect(() => {
    async function recordUniqueView() {
      if (!post?.id) {
        return;
      }

      const storageKey =
        `foodkindl-view-${post.id}`;

      if (
        sessionStorage.getItem(
          storageKey
        )
      ) {
        return;
      }

      sessionStorage.setItem(
        storageKey,
        "true"
      );

      try {
        const response =
          await api.post(
            `/posts/${post.id}/record_view/`
          );

        setPost(
          (currentPost) => ({
            ...currentPost,

            unique_view_count:
              response
                .data
                .unique_view_count,
          })
        );

      } catch (
        requestError
      ) {
        sessionStorage.removeItem(
          storageKey
        );

        console.error(
          "Unable to record view:",
          requestError.response?.data ||
            requestError
        );
      }
    }

    recordUniqueView();

  }, [post?.id]);


  // =========================================================
  // REACT
  // =========================================================

  async function reactToPost(
    reactionType
  ) {
    setError("");
    setSuccess("");
    setOpenReactions(false);

    try {
      if (
        post.my_reaction ===
        reactionType
      ) {
        const response =
          await api.delete(
            `/posts/${post.id}/remove_reaction/`
          );

        setPost(
          (currentPost) => ({
            ...currentPost,

            my_reaction:
              response
                .data
                .my_reaction,

            reaction_count:
              response
                .data
                .reaction_count,

            reaction_summary:
              response
                .data
                .reaction_summary,
          })
        );

        return;
      }

      const response =
        await api.post(
          `/posts/${post.id}/react/`,
          {
            reaction_type:
              reactionType,
          }
        );

      setPost(
        (currentPost) => ({
          ...currentPost,

          my_reaction:
            response
              .data
              .my_reaction,

          reaction_count:
            response
              .data
              .reaction_count,

          reaction_summary:
            response
              .data
              .reaction_summary,
        })
      );

    } catch (
      requestError
    ) {
      console.error(
        "Unable to react:",
        requestError.response?.data ||
          requestError
      );

      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  // =========================================================
  // SAVE
  // =========================================================

  async function toggleSave() {
    setError("");
    setSuccess("");

    try {
      const response =
        await api.post(
          `/posts/${post.id}/toggle_save/`
        );

      setPost(
        (currentPost) => ({
          ...currentPost,

          saved_by_me:
            response.data.saved,
        })
      );

      setSuccess(
        response.data.saved
          ? "Post saved."
          : "Removed from saved posts."
      );

    } catch (
      requestError
    ) {
      console.error(
        "Unable to save post:",
        requestError.response?.data ||
          requestError
      );

      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  // =========================================================
  // COMMENT
  // =========================================================

  async function addComment(event) {
    event.preventDefault();

    const cleanComment =
      commentText.trim();

    if (!cleanComment) {
      return;
    }

    setCommenting(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await api.post(
          `/posts/${post.id}/add_comment/`,
          {
            text:
              cleanComment,
          }
        );

      setPost(
        (currentPost) => ({
          ...currentPost,

          comments: [
            ...(
              currentPost.comments ||
              []
            ),

            response.data,
          ],

          comment_count:
            (
              currentPost
                .comment_count ||
              0
            ) + 1,
        })
      );

      setCommentText("");

      setSuccess(
        "Comment posted."
      );

    } catch (
      requestError
    ) {
      console.error(
        "Unable to post comment:",
        requestError.response?.data ||
          requestError
      );

      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );

    } finally {
      setCommenting(false);
    }
  }


  // =========================================================
  // SHARE TO COMMUNITY
  // =========================================================

  async function shareToCommunity() {
    const message =
      window.prompt(
        "Add a note to your repost (optional):",
        ""
      );

    if (
      message === null
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.post(
        `/posts/${post.id}/share_to_community/`,
        {
          message:
            message.trim(),
        }
      );

      setPost(
        (currentPost) => ({
          ...currentPost,

          share_count:
            (
              currentPost
                .share_count ||
              0
            ) + 1,

          community_share_count:
            (
              currentPost
                .community_share_count ||
              0
            ) + 1,
        })
      );

      setSuccess(
        "Shared to FoodKindl Community."
      );

    } catch (
      requestError
    ) {
      console.error(
        "Unable to share to community:",
        requestError.response?.data ||
          requestError
      );

      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  // =========================================================
  // EXTERNAL SHARE
  // =========================================================

  async function shareExternally() {
    const shareUrl =
      window.location.href;

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            post.title ||
            "FoodKindl community post",

          text:
            post.text ||
            "View this FoodKindl post.",

          url:
            shareUrl,
        });

      } else {
        await navigator
          .clipboard
          .writeText(
            shareUrl
          );

        setSuccess(
          "Post link copied."
        );
      }

    } catch (
      shareError
    ) {
      if (
        shareError?.name !==
        "AbortError"
      ) {
        console.error(
          "Unable to share:",
          shareError
        );
      }
    }
  }


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="app-page community-detail-status-page">
        Loading post...
      </main>
    );
  }


  // =========================================================
  // ERROR WITHOUT POST
  // =========================================================

  if (
    error &&
    !post
  ) {
    return (
      <main className="app-page community-detail-status-page">

        <p className="error-message">
          {error}
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/community"
            className="secondary-button"
          >
            <ArrowLeft size={18} />
            Back to Community
          </Link>

          <button
            type="button"
            className="secondary-button"
            onClick={refreshPost}
            disabled={refreshing}
          >
            <RefreshCw size={18} />

            {refreshing
              ? "Refreshing..."
              : "Try Again"}
          </button>
        </div>

      </main>
    );
  }


  // =========================================================
  // POST NOT FOUND
  // =========================================================

  if (!post) {
    return (
      <main className="app-page community-detail-status-page">

        <p className="error-message">
          Post not found.
        </p>

        <Link
          to="/community"
          className="secondary-button"
        >
          <ArrowLeft size={18} />
          Back to Community
        </Link>

      </main>
    );
  }


  // =========================================================
  // DISPLAY DATA
  // =========================================================

  const authorName =
    getAuthorName(
      post.author
    );

  const authorImage =
    getAuthorImage(
      post.author
    );

  const postImage =
    getPostImage(
      post
    );

  const postVideo =
    getPostVideo(
      post
    );

  const authorProfilePath =
    post.author?.id
      ? `/connect/member/${post.author.id}`
      : "/connect";


  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="community-detail-page">

      <article className="community-detail-card">

        {/* =================================================
            BACK + REFRESH
        ================================================= */}

        <div className="community-detail-topbar">

          <Link
            to="/community"
            className="secondary-button"
          >
            <ArrowLeft size={18} />

            Back to Community
          </Link>


          <button
            type="button"
            className="secondary-button"
            onClick={refreshPost}
            disabled={refreshing}
          >
            <RefreshCw size={18} />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>


        {/* =================================================
            AUTHOR
        ================================================= */}

        <div className="post-author-row">

          <Link
            to={authorProfilePath}
            className="feed-author clickable-author"
            aria-label={
              `View ${authorName}'s profile`
            }
          >

            {authorImage ? (
              <img
                src={authorImage}
                alt={authorName}
                className="community-avatar"
              />
            ) : (
              <div className="avatar-mini">
                {getAuthorInitial(
                  post.author
                )}
              </div>
            )}


            <div>

              <strong>
                {authorName}
              </strong>

              <small>
                {new Date(
                  post.created_at
                ).toLocaleString()}
              </small>

              <span className="view-profile-label">
                View profile
              </span>

            </div>

          </Link>


          {post.author?.id !==
            user?.id && (

            <button
              type="button"
              className="secondary-button author-message-button"
              onClick={() =>
                openDirectMessage(
                  post.author
                )
              }
            >
              <MessageCircle
                size={18}
              />

              Message
            </button>
          )}

        </div>


        {/* =================================================
            LOCATION
        ================================================= */}

        {post.location_name && (
          <div className="post-location">

            <MapPin size={16} />

            {post.location_name}

          </div>
        )}


        {/* =================================================
            TITLE
        ================================================= */}

        {post.title && (
          <h1>
            {post.title}
          </h1>
        )}


        {/* =================================================
            TEXT
        ================================================= */}

        {post.text && (
          <div className="community-full-text">
            {post.text}
          </div>
        )}


        {/* =================================================
            IMAGE
        ================================================= */}

        {postImage && (
          <img
            src={postImage}
            alt={
              post.title ||
              "Community content"
            }
            className="community-full-media"
            loading="lazy"
            onError={(event) => {
              console.error(
                "Community image failed to load:",
                postImage
              );

              event.currentTarget.style.display =
                "none";
            }}
          />
        )}


        {/* =================================================
            VIDEO
        ================================================= */}

        {postVideo && (
          <video
            className="community-full-media"
            controls
            playsInline
            preload="metadata"
            onError={() => {
              console.error(
                "Community video failed to load:",
                postVideo
              );
            }}
          >

            <source
              src={postVideo}
              type={
                post.video_content_type ||
                undefined
              }
            />

            Your browser does not support
            video playback.

          </video>
        )}


        {/* =================================================
            METRICS
        ================================================= */}

        <div className="community-metrics">

          <span>
            {post.reaction_count || 0}
            {" "}reactions
          </span>

          <span>
            {post.comment_count || 0}
            {" "}comments
          </span>

          <span>
            {post.unique_view_count || 0}
            {" "}views
          </span>

          <span>
            {
              post.community_share_count ||
              0
            }
            {" "}reposts
          </span>

        </div>


        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="community-detail-actions">

          <div className="reaction-control">

            <button
              type="button"
              className={
                post.my_reaction
                  ? "interaction-button reacted"
                  : "interaction-button"
              }
              onClick={() =>
                setOpenReactions(
                  (current) =>
                    !current
                )
              }
            >

              <span>
                {getReactionEmoji(
                  post.my_reaction
                )}
              </span>

              {post.my_reaction
                ? post.my_reaction
                : "React"}

            </button>


            {openReactions && (

              <div className="reaction-picker">

                {REACTIONS.map(
                  (reaction) => (

                    <button
                      type="button"
                      key={
                        reaction.value
                      }
                      title={
                        reaction.label
                      }
                      className={
                        post.my_reaction ===
                        reaction.value
                          ? "reaction-option selected"
                          : "reaction-option"
                      }
                      onClick={() =>
                        reactToPost(
                          reaction.value
                        )
                      }
                    >

                      <span>
                        {reaction.emoji}
                      </span>

                      <small>
                        {reaction.label}
                      </small>

                    </button>

                  )
                )}

              </div>
            )}

          </div>


          {post.author?.id !==
            user?.id && (

            <button
              type="button"
              className="interaction-button"
              onClick={() =>
                openDirectMessage(
                  post.author
                )
              }
            >

              <MessageCircle
                size={20}
              />

              Message

            </button>
          )}


          <span className="interaction-stat">

            <MessageCircle
              size={20}
            />

            {post.comment_count || 0}

          </span>


          <span className="interaction-stat">

            <Eye size={20} />

            {
              post.unique_view_count ||
              0
            }

          </span>


          <button
            type="button"
            className={
              post.saved_by_me
                ? "interaction-button saved"
                : "interaction-button"
            }
            onClick={
              toggleSave
            }
          >

            <Bookmark
              size={20}
              fill={
                post.saved_by_me
                  ? "currentColor"
                  : "none"
              }
            />

            {post.saved_by_me
              ? "Saved"
              : "Save"}

          </button>


          <button
            type="button"
            className="interaction-button"
            onClick={
              shareToCommunity
            }
          >

            <Repeat2
              size={20}
            />

            Repost

          </button>


          <button
            type="button"
            className="interaction-button"
            onClick={
              shareExternally
            }
          >

            <Share2
              size={20}
            />

            Share

          </button>

        </div>


        {/* =================================================
            MESSAGES
        ================================================= */}

        {error && (
          <p className="error-message">
            {error}
          </p>
        )}


        {success && (
          <p className="form-message">
            {success}
          </p>
        )}


        {/* =================================================
            COMMENTS
        ================================================= */}

        <section className="community-comments">

          <h2>
            Comments
          </h2>


          <form
            className="comment-form"
            onSubmit={
              addComment
            }
          >

            <textarea
              value={
                commentText
              }
              onChange={(event) =>
                setCommentText(
                  event.target.value
                )
              }
              placeholder="Write a comment..."
              maxLength={1000}
              required
            />


            <button
              type="submit"
              className="primary-button"
              disabled={
                commenting ||
                !commentText.trim()
              }
            >

              {commenting
                ? "Posting..."
                : "Post Comment"}

            </button>

          </form>


          <div className="comment-list">

            {(post.comments || [])
              .length === 0 ? (

              <p className="comment-empty">
                No comments yet.
              </p>

            ) : (

              post.comments.map(
                (comment) => {

                  const commentAuthorName =
                    getAuthorName(
                      comment.author
                    );


                  const commentAuthorImage =
                    getAuthorImage(
                      comment.author
                    );


                  const commentProfilePath =
                    comment.author?.id
                      ? `/connect/member/${comment.author.id}`
                      : "/connect";


                  return (

                    <article
                      className="comment-card"
                      key={
                        comment.id
                      }
                    >

                      <Link
                        to={
                          commentProfilePath
                        }
                        className="comment-author-link"
                        aria-label={
                          `View ${commentAuthorName}'s profile`
                        }
                      >

                        {commentAuthorImage ? (

                          <img
                            src={
                              commentAuthorImage
                            }
                            alt={
                              commentAuthorName
                            }
                            className="community-avatar"
                          />

                        ) : (

                          <div className="avatar-mini">

                            {getAuthorInitial(
                              comment.author
                            )}

                          </div>
                        )}

                      </Link>


                      <div className="comment-content">

                        <div className="comment-heading-row">

                          <Link
                            to={
                              commentProfilePath
                            }
                            className="comment-author-name"
                          >

                            <strong>
                              {commentAuthorName}
                            </strong>

                          </Link>


                          {comment.author?.id !==
                            user?.id && (

                            <button
                              type="button"
                              className="comment-message-button"
                              onClick={() =>
                                openDirectMessage(
                                  comment.author
                                )
                              }
                            >

                              <MessageCircle
                                size={15}
                              />

                              Message

                            </button>
                          )}

                        </div>


                        <small>
                          {new Date(
                            comment.created_at
                          ).toLocaleString()}
                        </small>


                        <p>
                          {comment.text}
                        </p>

                      </div>

                    </article>
                  );
                }
              )
            )}

          </div>

        </section>

      </article>

    </main>
  );
}