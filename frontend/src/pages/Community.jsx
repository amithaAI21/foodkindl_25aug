import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  FileText,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Repeat2,
  Share2,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { useAuth } from "../context/AuthContext";
// import AIRecipeSearch from "../components/AIRecipeSearch";

const REACTIONS = [
  { value: "like", label: "Like", emoji: "👍" },
  { value: "love", label: "Love", emoji: "❤️" },
  { value: "haha", label: "Haha", emoji: "😂" },
  { value: "wow", label: "Wow", emoji: "😮" },
  { value: "sad", label: "Sad", emoji: "😢" },
  { value: "angry", label: "Angry", emoji: "😡" },
];



async function uploadMediaToNetlify(file) {

  if (!file) {
    throw new Error("Please select a file.");
  }


  /* ============================================================
     FILE TYPE VALIDATION
  ============================================================ */

  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];


  const allowedVideoTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];


  const isImage =
    allowedImageTypes.includes(
      file.type
    );


  const isVideo =
    allowedVideoTypes.includes(
      file.type
    );


  if (!isImage && !isVideo) {

    throw new Error(
      "Unsupported file type. Use JPG, PNG, WebP, MP4, WebM or MOV."
    );
  }


  /* ============================================================
     FILE SIZE VALIDATION
  ============================================================ */

  const maxImageSize =
    10 * 1024 * 1024;


  const maxVideoSize =
    50 * 1024 * 1024;


  if (
    isImage &&
    file.size > maxImageSize
  ) {

    throw new Error(
      "Image must be smaller than 10 MB."
    );
  }


  if (
    isVideo &&
    file.size > maxVideoSize
  ) {

    throw new Error(
      "Video must be smaller than 50 MB."
    );
  }


  /* ============================================================
     CREATE FORM DATA
  ============================================================ */

  const formData =
    new FormData();


  formData.append(
    "file",
    file
  );


  formData.append(
    "upload_type",
    "public"
  );


  formData.append(
    "media_type",
    isVideo
      ? "video"
      : "image"
  );


  console.log(
    "MEDIA UPLOAD START:",
    {
      name:
        file.name,

      type:
        file.type,

      size:
        file.size,

      sizeMB:
        (
          file.size /
          1024 /
          1024
        ).toFixed(2),

      mediaType:
        isVideo
          ? "video"
          : "image",
    }
  );


  /* ============================================================
     NETLIFY FUNCTION
  ============================================================ */

  let response;


  try {

    response =
      await fetch(
        "/.netlify/functions/media-upload",
        {
          method:
            "POST",

          body:
            formData,
        }
      );

  } catch (networkError) {

    console.error(
      "NETLIFY MEDIA UPLOAD NETWORK ERROR:",
      networkError
    );


    throw new Error(
      "Unable to connect to the FoodKindl media upload service."
    );
  }


  /* ============================================================
     READ RESPONSE
  ============================================================ */

  const responseText =
    await response.text();


  console.log(
    "MEDIA UPLOAD HTTP STATUS:",
    response.status
  );


  console.log(
    "MEDIA UPLOAD RAW RESPONSE:",
    responseText
  );


  let data = null;


  if (responseText) {

    try {

      data =
        JSON.parse(
          responseText
        );

    } catch (parseError) {

      console.error(
        "MEDIA UPLOAD RESPONSE IS NOT JSON:",
        responseText
      );


      throw new Error(
        `Media upload returned an invalid response (${response.status}).`
      );
    }
  }


  /* ============================================================
     HANDLE FUNCTION ERROR
  ============================================================ */

  if (!response.ok) {

    console.error(
      "MEDIA UPLOAD FAILED:",
      {
        status:
          response.status,

        data,

        responseText,
      }
    );


    const errorMessage =
      data?.error ||
      data?.detail ||
      data?.message ||
      `Media upload failed with status ${response.status}.`;


    throw new Error(
      errorMessage
    );
  }


  /* ============================================================
     NORMALISE NETLIFY RESPONSE
  ============================================================ */

  const uploadedUrl =
    data?.url ||
    data?.public_url ||
    data?.publicUrl ||
    data?.download_url ||
    data?.downloadUrl ||
    "";


  const uploadedKey =
    data?.key ||
    data?.blob_key ||
    data?.blobKey ||
    "";


  if (!uploadedKey) {

    console.error(
      "MEDIA UPLOAD MISSING BLOB KEY:",
      data
    );


    throw new Error(
      "The file uploaded, but Netlify did not return a Blob key."
    );
  }


  if (!uploadedUrl) {

    console.error(
      "MEDIA UPLOAD MISSING PUBLIC URL:",
      data
    );


    throw new Error(
      "The file uploaded, but Netlify did not return a public media URL."
    );
  }


  const result = {

    ...data,

    key:
      uploadedKey,

    url:
      uploadedUrl,

    filename:
      data?.filename ||
      file.name,

    contentType:
      data?.contentType ||
      data?.content_type ||
      file.type,

  };


  console.log(
    "MEDIA UPLOAD SUCCESS:",
    result
  );


  return result;
}

const emptyForm = {
  post_type: "post",
  title: "",
  text: "",
  location_name: "",
  latitude: "",
  longitude: "",
};

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [reposts, setReposts] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [locating, setLocating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [openReactionPostId, setOpenReactionPostId] =
    useState(null);

  const [composerOpen, setComposerOpen] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("feed");

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const API_BASE = (
  import.meta.env.VITE_BACKEND_URL ||
  "https://foodkindl-25aug.onrender.com"
).replace(/\/+$/, "");

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

    if (path.startsWith("/.netlify/")) {
      return `${window.location.origin}${path}`;
    }

    return `${API_BASE}${path}`;
  }

  function getAuthorName(author) {
    return (
      author?.full_name ||
      [author?.first_name, author?.last_name]
        .filter(Boolean)
        .join(" ") ||
      author?.email ||
      "FoodKindl Member"
    );
  }

  function getAuthorInitial(author) {
    return getAuthorName(author)
      .charAt(0)
      .toUpperCase();
  }

  function getAuthorImage(
  author
) {
  return getMediaUrl(
    author
      ?.profile
      ?.profile_image_1_url
    ||
    author
      ?.profile
      ?.profile_image_1
  );
}

  function updatePost(postId, updates) {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              ...updates,
            }
          : post
      )
    );

    setMyPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              ...updates,
            }
          : post
      )
    );

    setReposts((currentReposts) =>
      currentReposts.map((repost) => {
        if (
          repost.original_post?.id !== postId
        ) {
          return repost;
        }

        return {
          ...repost,
          original_post: {
            ...repost.original_post,
            ...updates,
          },
        };
      })
    );
  }

  function getErrorMessage(data) {
    if (!data) {
      return "The request could not be completed.";
    }

    if (typeof data === "string") {
      return data;
    }

    const firstValue = Object.values(data)
      .flat()
      .find(Boolean);

    return (
      data?.post_type?.[0] ||
      data?.title?.[0] ||
      data?.text?.[0] ||
      data?.image_url?.[0] ||
      data?.video_url?.[0] ||
      data?.image?.[0] ||
      data?.video?.[0] ||
      data?.location_name?.[0] ||
      data?.reaction_type?.[0] ||
      data?.message?.[0] ||
      data?.non_field_errors?.[0] ||
      data?.detail ||
      firstValue ||
      "The request could not be completed."
    );
  }

  async function loadPosts() {
    try {
      const response = await api.get("/posts/");

      const postList =
        response.data?.results || response.data;

      setPosts(
        Array.isArray(postList)
          ? postList
          : []
      );
    } catch (requestError) {
      console.error(
        "Unable to load posts:",
        requestError.response?.data ||
          requestError
      );

      setError(
        requestError.response?.data?.detail ||
          "Community posts could not be loaded."
      );
    }
  }

  async function loadMyPosts() {
    try {
      const response = await api.get(
        "/posts/my-posts/"
      );

      const postList =
        response.data?.results || response.data;

      setMyPosts(
        Array.isArray(postList)
          ? postList
          : []
      );
    } catch (requestError) {
      console.error(
        "Unable to load my posts:",
        requestError.response?.data ||
          requestError
      );
    }
  }

  async function loadReposts() {
    try {
      const response = await api.get(
        "/posts/reposts/"
      );

      const repostList =
        response.data?.results || response.data;

      setReposts(
        Array.isArray(repostList)
          ? repostList
          : []
      );
    } catch (requestError) {
      console.error(
        "Unable to load reposts:",
        requestError.response?.data ||
          requestError
      );
    }
  }

  async function loadCommunity() {
    setLoading(true);
    setError("");

    await Promise.all([
      loadPosts(),
      loadMyPosts(),
      loadReposts(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    loadCommunity();
  }, []);

  function clearFileInputs() {
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  }

  function resetPublisher() {
    setForm(emptyForm);
    setImage(null);
    setVideo(null);
    setComposerOpen(false);
    clearFileInputs();
  }

  function selectPostType(postType) {
    setForm((previous) => ({
      ...emptyForm,
      location_name: previous.location_name,
      latitude: previous.latitude,
      longitude: previous.longitude,
      post_type: postType,
    }));

    setComposerOpen(true);
    setImage(null);
    setVideo(null);
    setError("");
    setSuccess("");
    clearFileInputs();
  }

  function validateBeforeSubmit() {
    const title = form.title.trim();
    const text = form.text.trim();

    if (
      form.post_type === "article" &&
      !title
    ) {
      return "Please enter an article title.";
    }

    if (
      ["post", "article"].includes(
        form.post_type
      ) &&
      !text
    ) {
      return "Please enter some content.";
    }

    if (
      form.post_type === "image" &&
      !image
    ) {
      return "Please select an image.";
    }

    if (
      form.post_type === "video" &&
      !video
    ) {
      return "Please select a video.";
    }

    return "";
  }

  
  async function createPost(
  event
) {
  event.preventDefault();

  setError("");
  setSuccess("");


  const validationError =
    validateBeforeSubmit();


  if (validationError) {
    setError(
      validationError
    );

    return;
  }


  setPublishing(
    true
  );


  try {
    let uploadedImage =
      null;

    let uploadedVideo =
      null;


    // ========================================================
    // IMAGE -> NETLIFY BLOB
    // ========================================================

    if (image) {
      console.log(
        "Uploading image to Netlify Blob..."
      );


      uploadedImage =
        await uploadMediaToNetlify(
          image
        );


      console.log(
        "IMAGE BLOB UPLOAD SUCCESS:",
        uploadedImage
      );
    }


    // ========================================================
    // VIDEO -> NETLIFY BLOB
    // ========================================================

    if (video) {
      console.log(
        "Uploading video to Netlify Blob..."
      );


      uploadedVideo =
        await uploadMediaToNetlify(
          video
        );


      console.log(
        "VIDEO BLOB UPLOAD SUCCESS:",
        uploadedVideo
      );
    }


    // ========================================================
    // DATA FOR DJANGO
    // ========================================================

    const formData =
      new FormData();


    formData.append(
      "post_type",
      form.post_type
    );


    formData.append(
      "title",
      form.title.trim()
    );


    formData.append(
      "text",
      form.text.trim()
    );


    formData.append(
      "location_name",
      form.location_name.trim()
    );


    if (
      form.latitude
    ) {
      formData.append(
        "latitude",
        form.latitude
      );
    }


    if (
      form.longitude
    ) {
      formData.append(
        "longitude",
        form.longitude
      );
    }


    // ========================================================
    // IMAGE BLOB METADATA
    // ========================================================

    if (uploadedImage) {
      formData.append(
        "image_blob_key",
        uploadedImage.key
      );


      formData.append(
        "image_url",
        uploadedImage.url
      );


      formData.append(
        "image_original_name",
        uploadedImage.filename ||
        image.name
      );


      formData.append(
        "image_content_type",
        uploadedImage.contentType ||
        image.type
      );
    }


    // ========================================================
    // VIDEO BLOB METADATA
    // ========================================================

    if (uploadedVideo) {
      formData.append(
        "video_blob_key",
        uploadedVideo.key
      );


      formData.append(
        "video_url",
        uploadedVideo.url
      );


      formData.append(
        "video_original_name",
        uploadedVideo.filename ||
        video.name
      );


      formData.append(
        "video_content_type",
        uploadedVideo.contentType ||
        video.type
      );
    }


    // ========================================================
    // DEBUG
    // ========================================================

    console.log(
      "SENDING POST TO DJANGO:"
    );


    for (
      const pair of
      formData.entries()
    ) {
      console.log(
        pair[0],
        pair[1]
      );
    }


    // ========================================================
    // SAVE POST METADATA IN DJANGO
    // ========================================================

    const response =
      await api.post(
        "/posts/",
        formData
      );


    console.log(
      "POST SAVE SUCCESS:",
      response.status,
      response.data
    );


    // ========================================================
    // SUCCESS MESSAGE
    // ========================================================

    const publishedType =
      form.post_type ===
      "article"
        ? "Article"

        : form.post_type ===
            "image"
          ? "Image"

          : form.post_type ===
              "video"
            ? "Video"

            : "Post";


    resetPublisher();


    setSuccess(
      `${publishedType} published successfully.`
    );


    await loadCommunity();


  } catch (
    requestError
  ) {
    console.error(
      "Unable to publish content:",
      requestError.response?.data ||
      requestError
    );


    if (
      requestError instanceof Error &&
      !requestError.response
    ) {
      setError(
        requestError.message
      );
    } else {
      setError(
        getErrorMessage(
          requestError.response?.data
        )
      );
    }


  } finally {
    setPublishing(
      false
    );
  }
}

  function addCurrentLocation() {
    setError("");
    setSuccess("");

    if (!navigator.geolocation) {
      setError(
        "Location services are not supported by this browser."
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((previous) => ({
          ...previous,
          latitude: Number(
            position.coords.latitude
          ).toFixed(6),
          longitude: Number(
            position.coords.longitude
          ).toFixed(6),
        }));

        setSuccess(
          "Current location coordinates added."
        );
        setLocating(false);
      },
      () => {
        setError(
          "FoodKindl could not access your location."
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  async function reactToPost(
    event,
    post,
    reactionType
  ) {
    event.preventDefault();
    event.stopPropagation();

    setOpenReactionPostId(null);

    try {
      if (
        post.my_reaction === reactionType
      ) {
        const response = await api.delete(
          `/posts/${post.id}/remove_reaction/`
        );

        updatePost(post.id, {
          my_reaction:
            response.data.my_reaction,
          reaction_count:
            response.data.reaction_count,
          reaction_summary:
            response.data.reaction_summary,
        });

        return;
      }

      const response = await api.post(
        `/posts/${post.id}/react/`,
        {
          reaction_type: reactionType,
        }
      );

      updatePost(post.id, {
        my_reaction:
          response.data.my_reaction,
        reaction_count:
          response.data.reaction_count,
        reaction_summary:
          response.data.reaction_summary,
      });
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError.response?.data
        )
      );
    }
  }

  async function toggleSave(event, post) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const response = await api.post(
        `/posts/${post.id}/toggle_save/`
      );

      updatePost(post.id, {
        saved_by_me:
          response.data.saved,
      });

      setSuccess(
        response.data.saved
          ? "Post saved successfully."
          : "Post removed from saved posts."
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError.response?.data
        )
      );
    }
  }

  async function shareToCommunity(
    event,
    post
  ) {
    event.preventDefault();
    event.stopPropagation();

    const message = window.prompt(
      "Add your thoughts to this repost (optional):",
      ""
    );

    if (message === null) {
      return;
    }

    try {
      const response = await api.post(
        `/posts/${post.id}/share_to_community/`,
        {
          message: message.trim(),
        }
      );

      updatePost(post.id, {
        community_share_count:
          (post.community_share_count || 0) +
          1,
        share_count:
          (post.share_count || 0) + 1,
      });

      setSuccess(
        "Post reposted successfully."
      );

      await loadReposts();

      if (
        response.data?.shared_by?.id ===
        user?.id
      ) {
        await loadMyPosts();
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError.response?.data
        )
      );
    }
  }

  async function shareExternally(
    event,
    post
  ) {
    event.preventDefault();
    event.stopPropagation();

    const shareUrl =
      `${window.location.origin}/community/post/${post.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title:
            post.title ||
            "FoodKindl community post",
          text:
            post.text ||
            "View this FoodKindl post.",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(
          shareUrl
        );

        setSuccess(
          "Post link copied successfully."
        );
      }
    } catch (shareError) {
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

  async function recordUniqueView(post) {
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
      const response = await api.post(
        `/posts/${post.id}/record_view/`
      );

      updatePost(post.id, {
        unique_view_count:
          response.data.unique_view_count,
      });
    } catch (requestError) {
      sessionStorage.removeItem(
        storageKey
      );
    }
  }

  function isGovernmentIdVerified(member) {
    return Boolean(
      member?.profile?.is_verified === true &&
      member?.profile?.verification_status === "approved"
    );
  }

  function openDirectMessage(
    event,
    member
  ) {
    event.preventDefault();
    event.stopPropagation();

    setError("");
    setSuccess("");

    if (!member?.id) {
      setError(
        "This member is unavailable for messaging."
      );
      return;
    }

    if (member.id === user?.id) {
      setError(
        "You cannot message yourself."
      );
      return;
    }

    /*
     * Community itself has NO ID-verification restriction.
     * Verification is required only when private messaging.
     */
    if (!isGovernmentIdVerified(user)) {
      setError(
        "Please complete Government ID verification before messaging members."
      );
      return;
    }

    if (!isGovernmentIdVerified(member)) {
      setError(
        "You can message only Government ID verified members."
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

  function openPost(post) {
    recordUniqueView(post);

    navigate(
      `/community/post/${post.id}`
    );
  }

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

  function formatRelativeTime(dateValue) {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);
    const diffInSeconds = Math.max(
      0,
      Math.floor(
        (Date.now() - date.getTime()) / 1000
      )
    );

    if (diffInSeconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(
      diffInSeconds / 60
    );

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24) {
      return `${hours}h`;
    }

    const days = Math.floor(
      hours / 24
    );

    if (days < 7) {
      return `${days}d`;
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year:
          date.getFullYear() !==
          new Date().getFullYear()
            ? "numeric"
            : undefined,
      }
    );
  }

  function getPostTypeLabel(postType) {
    if (postType === "article") {
      return "Article";
    }

    if (postType === "video") {
      return "Video";
    }

    if (postType === "image") {
      return "Photo";
    }

    return "Post";
  }

  const savedPosts = posts.filter(
    (post) => post.saved_by_me
  );

  const normalFeedItems =
    posts.map((post) => ({
      itemType: "post",
      createdAt: post.created_at,
      post,
    }));

  const repostFeedItems =
    reposts
      .filter(
        (repost) =>
          repost.original_post
      )
      .map((repost) => ({
        itemType: "repost",
        createdAt: repost.created_at,
        repost,
        post:
          repost.original_post,
      }));

  const combinedFeed = [
    ...normalFeedItems,
    ...repostFeedItems,
  ].sort(
    (first, second) =>
      new Date(second.createdAt) -
      new Date(first.createdAt)
  );

  const visibleFeed =
    activeTab === "feed"
      ? combinedFeed
      : activeTab === "saved"
        ? savedPosts.map(
            (post) => ({
              itemType: "post",
              createdAt:
                post.created_at,
              post,
            })
          )
        : myPosts.map(
            (post) => ({
              itemType: "post",
              createdAt:
                post.created_at,
              post,
            })
          );

  function renderFeedCard(item) {
    const isRepost =
      item.itemType === "repost";

    const repost =
      isRepost
        ? item.repost
        : null;

    const post = item.post;

    if (!post) {
      return null;
    }

    const authorName =
      getAuthorName(post.author);

    const authorImage =
      getAuthorImage(post.author);

    return (
      <article
        className="feed-card community-card-link"
        key={
          isRepost
            ? `repost-${repost.id}`
            : `post-${post.id}`
        }
        role="button"
        tabIndex={0}
        onClick={() =>
          openPost(post)
        }
      >
        {isRepost && (
          <div className="repost-header">
            <Repeat2 size={15} />

            <strong>
              {getAuthorName(
                repost.shared_by
              )}
            </strong>

            <span>   reposted this</span>
          </div>
        )}

        {isRepost &&
          repost.message && (
            <div className="repost-message">
              {repost.message}
            </div>
          )}

        <div className="feed-author-row">
          <div className="feed-author">
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

            <div className="feed-author-copy">
              <strong>{authorName}</strong>

              <div className="feed-post-meta">
                <small>
                  {formatRelativeTime(
                    post.created_at
                  )}
                </small>

                <span aria-hidden="true">·</span>

                <span className="post-type-label">
                  {getPostTypeLabel(
                    post.post_type
                  )}
                </span>
              </div>
            </div>
          </div>

          {post.author?.id !==
            user?.id && (
            <button
              type="button"
              className="feed-author-message"
              onClick={(event) =>
                openDirectMessage(
                  event,
                  post.author
                )
              }
            >
              <MessageCircle size={17} />
              Message
            </button>
          )}
        </div>

        {post.location_name && (
          <div className="post-location">
            <MapPin size={15} />
            {post.location_name}
          </div>
        )}

        {post.title && (
          <h2 className="community-card-title">
            {post.title}
          </h2>
        )}

        {post.text && (
          <p className="community-card-text">
            {post.text.length > 500
              ? `${post.text.slice(
                  0,
                  500
                )}...`
              : post.text}
          </p>
        )}

        {(post.image_url || post.image) && (
          <div className="post-media">
            <img
              src={getMediaUrl(
                post.image_url || post.image
              )}
              alt={
                post.title ||
                "FoodKindl community post"
              }
              className="post-image"
              loading="lazy"
            />
          </div>
        )}

        {(post.video_url || post.video) && (
          <div className="post-media">
            <video
              src={getMediaUrl(
                post.video_url || post.video
              )}
              className="post-video"
              controls
              playsInline
              preload="metadata"
              onPlay={() =>
                recordUniqueView(post)
              }
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              Your browser does not
              support video playback.
            </video>
          </div>
        )}

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
            {post.community_share_count ||
              0}
            {" "}reposts
          </span>
        </div>

        <div className="community-interaction-bar">
          <div className="reaction-control">
            <button
              type="button"
              className={
                post.my_reaction
                  ? "interaction-button reacted"
                  : "interaction-button"
              }
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setOpenReactionPostId(
                  openReactionPostId ===
                    post.id
                    ? null
                    : post.id
                );
              }}
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

            {openReactionPostId ===
              post.id && (
              <div
                className="reaction-picker"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
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
                      onClick={(event) =>
                        reactToPost(
                          event,
                          post,
                          reaction.value
                        )
                      }
                    >
                      <span>
                        {
                          reaction.emoji
                        }
                      </span>

                      <small>
                        {
                          reaction.label
                        }
                      </small>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="interaction-button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openPost(post);
            }}
          >
            <MessageCircle size={19} />
            Comment
          </button>

          <button
            type="button"
            className="interaction-button"
            onClick={(event) =>
              shareToCommunity(
                event,
                post
              )
            }
          >
            <Repeat2 size={19} />
            Repost
          </button>

          <button
            type="button"
            className="interaction-button"
            onClick={(event) =>
              shareExternally(
                event,
                post
              )
            }
          >
            <Share2 size={19} />
            Share
          </button>

          <button
            type="button"
            className={
              post.saved_by_me
                ? "interaction-button saved"
                : "interaction-button"
            }
            onClick={(event) =>
              toggleSave(
                event,
                post
              )
            }
          >
            <Bookmark
              size={19}
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
        </div>
      </article>
    );
  }

  return (
    <>
      <style>{`
        .community-page {
          width: min(1240px, calc(100% - 56px));
          max-width: 1240px;
          margin: 0 auto;
          padding: 30px 0 72px;
        }

        .community-desktop-intro {
          margin: 6px 0 22px;
        }

        .community-desktop-intro h1 {
          margin: 6px 0 0;
          font-size: clamp(30px, 2.6vw, 42px);
          line-height: 1.08;
          letter-spacing: -0.035em;
        }

        .community-tabs {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 28px;
          padding: 7px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.018);
        }

        .community-tab {
          min-width: 126px;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          border: 0;
          border-radius: 11px;
          background: transparent;
          color: rgba(255, 255, 255, 0.62);
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }

        .community-tab.active {
          background: linear-gradient(
            135deg,
            rgba(154, 20, 15, 0.96),
            rgba(112, 10, 8, 0.96)
          );
          color: #fff;
        }

        .community-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 68fr)
            minmax(320px, 32fr);
          gap: 28px;
          align-items: start;
          width: 100%;
          max-width: 1240px;
          margin-left: auto;
          margin-right: auto;
        }

        .community-feed-heading {
          margin-bottom: 18px;
        }

        .community-feed-heading h2 {
          max-width: 720px;
          margin: 8px 0 0;
          font-size: 28px;
          line-height: 1.2;
          letter-spacing: -0.025em;
        }

        .feed-list {
          display: grid;
          gap: 18px;
        }

        .feed-card {
          overflow: visible;
          border: 1px solid rgba(255, 126, 72, 0.14);
          border-radius: 20px;
          background:
            linear-gradient(
              180deg,
              rgba(28, 10, 8, 0.96),
              rgba(22, 8, 7, 0.96)
            );
          box-shadow: 0 14px 44px rgba(0, 0, 0, 0.16);
        }

        .feed-card > :not(.post-media):not(.community-interaction-bar) {
          margin-left: 22px;
          margin-right: 22px;
        }

        .feed-author-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding-top: 20px;
        }

        .feed-author {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .feed-author-copy {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .community-avatar,
        .avatar-mini {
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          border-radius: 50%;
        }

        .community-avatar {
          object-fit: cover;
        }

        .avatar-mini {
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 126, 72, 0.24);
          background: rgba(255, 126, 72, 0.12);
          font-weight: 700;
        }

        .feed-post-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(255, 255, 255, 0.48);
          font-size: 12px;
        }

        .post-type-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: inherit;
          text-transform: none;
        }

        .feed-author-message {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 36px;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.66);
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }

        .feed-author-message:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }

        .community-card-title {
          margin-top: 18px;
          margin-bottom: 8px;
          font-size: 25px;
          line-height: 1.22;
          color: #fff;
        }

        .community-card-text {
          margin-top: 8px;
          margin-bottom: 18px;
          color: rgba(255, 255, 255, 0.76);
          font-size: 15px;
          line-height: 1.68;
          white-space: pre-wrap;
        }

        .post-media {
          width: 100%;
          margin-top: 18px;
          overflow: hidden;
          background: #090909;
        }

        .post-image,
        .post-video {
          width: 100%;
          max-height: 560px;
          display: block;
          object-fit: cover;
          background: #090909;
        }

        .community-metrics {
          display: flex;
          flex-wrap: wrap;
          gap: 17px;
          padding-top: 14px;
          padding-bottom: 14px;
          color: rgba(255, 255, 255, 0.46);
          font-size: 12px;
        }

        .community-interaction-bar {
          position: relative;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 4px;
          padding: 9px 12px 11px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
        }

        .interaction-button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 8px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: rgba(255, 255, 255, 0.61);
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }

        .interaction-button:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .interaction-button.reacted,
        .interaction-button.saved {
          color: #ff8b55;
          background: rgba(255, 126, 72, 0.07);
        }

        .reaction-control {
          position: relative;
          min-width: 0;
        }

        .reaction-control > .interaction-button {
          width: 100%;
        }

        .reaction-picker {
          position: absolute;
          left: 0;
          bottom: calc(100% + 10px);
          z-index: 30;
          display: flex;
          gap: 4px;
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          background: #160a08;
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.36);
        }

        .community-publish-sidebar {
          position: sticky;
          top: 90px;
          display: grid;
          gap: 16px;
        }

        .quick-publisher-card {
          padding: 17px;
          border: 1px solid rgba(255, 126, 72, 0.14);
          border-radius: 18px;
          background:
            linear-gradient(
              180deg,
              rgba(28, 10, 8, 0.93),
              rgba(22, 8, 7, 0.93)
            );
        }

        .quick-publisher-top {
          display: grid;
          grid-template-columns: 46px 1fr;
          align-items: center;
          gap: 10px;
        }

        .start-post-button {
          min-height: 44px;
          padding: 10px 15px;
          text-align: left;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.78);
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }

        .quick-publisher-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 4px;
          margin-top: 13px;
        }

        .quick-publisher-actions button {
          min-height: 56px;
          display: grid;
          place-items: center;
          gap: 4px;
          padding: 7px 5px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          font: inherit;
          font-size: 12px;
          cursor: pointer;
        }

        .quick-publisher-actions button:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .community-publisher-sidebar {
          max-height: calc(100vh - 120px);
          overflow-y: auto;
        }

        @media (max-width: 1050px) {
          .community-page {
            width: min(100% - 36px, 820px);
          }

          .community-layout {
            grid-template-columns: 1fr;
          }

          .community-publish-sidebar {
            position: static;
            grid-row: 1;
          }
        }
      `}</style>

      <main className="app-page community-page">
      <div
        className="community-top-actions"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "22px",
        }}
      >
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={loadCommunity}
          disabled={loading}
        >
          <RefreshCw size={18} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="community-desktop-intro">
        <div>
          <div className="eyebrow left">
            FoodKindl Community
          </div>

          <h1>
            See what people are sharing
          </h1>
        </div>
      </div>


{/* <AIRecipeSearch /> */}


<div
  className="community-tabs"
  role="tablist"
>
        <button
          type="button"
          role="tab"
          aria-selected={
            activeTab === "feed"
          }
          className={
            activeTab === "feed"
              ? "community-tab active"
              : "community-tab"
          }
          onClick={() =>
            setActiveTab("feed")
          }
        >
          <MessageSquare size={18} />
          Feed
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            activeTab === "saved"
          }
          className={
            activeTab === "saved"
              ? "community-tab active"
              : "community-tab"
          }
          onClick={() =>
            setActiveTab("saved")
          }
        >
          <Bookmark size={18} />
          Saved
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            activeTab === "my-posts"
          }
          className={
            activeTab === "my-posts"
              ? "community-tab active"
              : "community-tab"
          }
          onClick={() =>
            setActiveTab("my-posts")
          }
        >
          <MessageSquare size={18} />
          My Posts
        </button>
      </div>

      <div className="community-layout">
        <section className="community-main">
          <div className="community-feed-section">
            <div className="community-feed-heading">
              <div>
                <div className="eyebrow left">
                  {activeTab === "saved"
                    ? "Saved"
                    : activeTab ===
                        "my-posts"
                      ? "My Posts"
                      : "Community"}
                </div>

                <h2>
                  {activeTab === "saved"
                    ? "Posts you saved"
                    : activeTab ===
                        "my-posts"
                      ? "Things you shared"
                      : "What's happening in your community"}
                </h2>
              </div>


            </div>

            {loading ? (
              <div className="app-panel">
                Loading posts...
              </div>
            ) : visibleFeed.length ===
              0 ? (
              <div className="app-panel community-empty-state">
                {activeTab === "saved"
                  ? "No saved posts yet."
                  : activeTab ===
                      "my-posts"
                    ? "You haven't shared anything yet."
                    : "Nothing has been shared yet."}
              </div>
            ) : (
              <div className="feed-list">
                {visibleFeed.map(
                  renderFeedCard
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="community-publish-sidebar">
          <div className="quick-publisher-card">
            <div className="quick-publisher-top">
              {getAuthorImage(user) ? (
                <img
                  src={getAuthorImage(
                    user
                  )}
                  alt={getAuthorName(
                    user
                  )}
                  className="community-avatar"
                />
              ) : (
                <div className="avatar-mini">
                  {getAuthorInitial(
                    user
                  )}
                </div>
              )}

              <button
                type="button"
                className="start-post-button"
                onClick={() =>
                  selectPostType(
                    "post"
                  )
                }
              >
                Share something...
              </button>
            </div>

            <div className="quick-publisher-actions">
              <button
                type="button"
                onClick={() =>
                  selectPostType(
                    "image"
                  )
                }
              >
                <ImageIcon size={20} />
                Photo
              </button>

              <button
                type="button"
                onClick={() =>
                  selectPostType(
                    "video"
                  )
                }
              >
                <Video size={20} />
                Video
              </button>

              <button
                type="button"
                onClick={() =>
                  selectPostType(
                    "article"
                  )
                }
              >
                <FileText size={20} />
                Article
              </button>
            </div>
          </div>

          {composerOpen && (
            <form
              className="app-panel community-publisher community-publisher-sidebar"
              onSubmit={createPost}
              encType="multipart/form-data"
            >
              <div className="publisher-modal-heading">
                <div>
                  <strong>
                    {form.post_type ===
                    "article"
                      ? "Write an article"
                      : form.post_type ===
                          "image"
                        ? "Share a photo"
                        : form.post_type ===
                            "video"
                          ? "Share video"
                          : "Share with the community"}
                  </strong>

                  <small>
                    {getAuthorName(
                      user
                    )}
                  </small>
                </div>

                <button
                  type="button"
                  className="publisher-close-button"
                  onClick={() => {
                    setComposerOpen(
                      false
                    );
                    setError("");
                    setSuccess("");
                  }}
                >
                  ×
                </button>
              </div>

              {form.post_type ===
                "article" && (
                <input
                  type="text"
                  placeholder="Article title"
                  value={form.title}
                  maxLength={200}
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        title:
                          event.target
                            .value,
                      })
                    )
                  }
                  required
                />
              )}

              <textarea
                className="community-sidebar-textarea"
                placeholder={
                  form.post_type ===
                  "article"
                    ? "Write your article..."
                    : form.post_type ===
                        "image"
                      ? "Say something about this photo..."
                      : form.post_type ===
                          "video"
                        ? "Say something about this video..."
                        : "What would you like to share?"
                }
                value={form.text}
                maxLength={5000}
                onChange={(event) =>
                  setForm(
                    (previous) => ({
                      ...previous,
                      text:
                        event.target
                          .value,
                    })
                  )
                }
                required={
                  form.post_type ===
                    "post" ||
                  form.post_type ===
                    "article"
                }
              />

              <label className="publisher-location-field">
                Location

                <input
                  type="text"
                  placeholder="Bengaluru, Indiranagar..."
                  value={
                    form.location_name
                  }
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        location_name:
                          event.target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <button
                type="button"
                className="secondary-button publisher-location-button"
                onClick={
                  addCurrentLocation
                }
                disabled={locating}
              >
                <MapPin size={17} />

                {locating
                  ? "Finding Location..."
                  : "Use Current Location"}
              </button>

              {form.latitude &&
                form.longitude && (
                  <p className="location-coordinate-text">
                    Coordinates:{" "}
                    {form.latitude},{" "}
                    {form.longitude}
                  </p>
                )}

              {form.post_type ===
                "image" && (
                <label className="publisher-upload-field">
                  Upload Photo

                  <input
                    ref={
                      imageInputRef
                    }
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(
                      event
                    ) =>
                      setImage(
                        event.target
                          .files?.[0] ||
                          null
                      )
                    }
                    required
                  />
                </label>
              )}

              {form.post_type ===
                "video" && (
                <label className="publisher-upload-field">
                  Upload Video

                  <input
                    ref={
                      videoInputRef
                    }
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(
                      event
                    ) =>
                      setVideo(
                        event.target
                          .files?.[0] ||
                          null
                      )
                    }
                    required
                  />
                </label>
              )}

              {image && (
                <p className="form-message">
                  Selected image:{" "}
                  {image.name}
                </p>
              )}

              {video && (
                <p className="form-message">
                  Selected video:{" "}
                  {video.name}
                </p>
              )}

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

              <button
                type="submit"
                className="primary-button publisher-submit-button"
                disabled={
                  publishing
                }
              >
                {publishing
                  ? "Publishing..."
                  : "Publish"}
              </button>
            </form>
          )}
        </aside>
      </div>
      </main>
    </>
  );
}