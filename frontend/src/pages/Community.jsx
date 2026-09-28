import { useEffect, useRef, useState } from "react";

import {
  ArrowRight,
  Bookmark,
  ChefHat,
  FileText,
  Flame,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Repeat2,
  Search,
  Send,
  Share2,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import api from "../api";
import { useAuth } from "../context/AuthContext";

import "../styles/Community.css";


/* ============================================================
   REACTIONS
============================================================ */

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


const TRENDING_TOPICS = [
  {
    id: "biryani",
    label: "#Biryani",
    keywords: [
      "biryani",
      "biriyani",
      "hyderabadi biryani",
      "chicken biryani",
      "mutton biryani",
    ],
  },
  {
    id: "home-cooking",
    label: "#HomeCooking",
    keywords: [
      "home cooking",
      "homecooking",
      "home cooked",
      "home-cooked",
      "homemade",
      "home made",
      "recipe",
      "cooked at home",
    ],
  },
  {
    id: "food-walk",
    label: "#FoodWalk",
    keywords: [
      "food walk",
      "foodwalk",
      "food trail",
      "foodtrail",
      "food walking",
    ],
  },
  {
    id: "cafe-hopping",
    label: "#CafeHopping",
    keywords: [
      "cafe",
      "café",
      "coffee",
      "cafe hopping",
      "café hopping",
      "cafehopping",
    ],
  },
  {
    id: "healthy-eats",
    label: "#HealthyEats",
    keywords: [
      "healthy",
      "healthy eats",
      "healthyeats",
      "salad",
      "protein",
      "low calorie",
      "nutrition",
    ],
  },
  {
    id: "desserts",
    label: "#Desserts",
    keywords: [
      "dessert",
      "desserts",
      "cake",
      "ice cream",
      "icecream",
      "sweet",
      "chocolate",
      "pastry",
      "brownie",
    ],
  },
  {
    id: "south-indian",
    label: "#SouthIndian",
    keywords: [
      "south indian",
      "southindian",
      "dosa",
      "idli",
      "vada",
      "sambar",
      "appam",
      "puttu",
      "pongal",
    ],
  },
  {
    id: "street-food",
    label: "#StreetFood",
    keywords: [
      "street food",
      "streetfood",
      "chaat",
      "pani puri",
      "panipuri",
      "vada pav",
      "momos",
      "roll",
      "street eats",
    ],
  },
];

/* ============================================================
   NETLIFY MEDIA UPLOAD
============================================================ */

async function uploadMediaToNetlify(file) {
  if (!file) {
    throw new Error("Please select a file.");
  }

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
    allowedImageTypes.includes(file.type);

  const isVideo =
    allowedVideoTypes.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error(
      "Unsupported file type. Use JPG, PNG, WebP, MP4, WebM or MOV."
    );
  }

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
      name: file.name,
      type: file.type,
      size: file.size,
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

  let response;

  try {
    response =
      await fetch(
        "/.netlify/functions/media-upload",
        {
          method: "POST",
          body: formData,
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


/* ============================================================
   EMPTY FORM
============================================================ */

const emptyForm = {
  post_type: "post",
  title: "",
  text: "",
  location_name: "",
  latitude: "",
  longitude: "",
};


/* ============================================================
   COMMUNITY
============================================================ */

export default function Community({
  embedded = false,
}) {
  const PageTag =
    embedded
      ? "div"
      : "main";

  const { user } =
    useAuth();

  const navigate =
    useNavigate();


  /* ==========================================================
     STATE
  ========================================================== */

  const [posts, setPosts] =
    useState([]);

  const [myPosts, setMyPosts] =
    useState([]);

  const [reposts, setReposts] =
    useState([]);

  const [form, setForm] =
    useState(emptyForm);

  const [image, setImage] =
    useState(null);

  const [video, setVideo] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [publishing, setPublishing] =
    useState(false);

  const [locating, setLocating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    openReactionPostId,
    setOpenReactionPostId,
  ] = useState(null);

  const [
    composerOpen,
    setComposerOpen,
  ] = useState(false);

  const [
    activeTab,
    setActiveTab,
  ] = useState("feed");

  const [
    selectedTrendingTopic,
    setSelectedTrendingTopic,
  ] = useState(null);

  const imageInputRef =
    useRef(null);

  const videoInputRef =
    useRef(null);


  /* ==========================================================
     MEDIA HELPERS
  ========================================================== */

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

    if (
      path.startsWith("/.netlify/")
    ) {
      return `${window.location.origin}${path}`;
    }

    return `${API_BASE}${path}`;
  }


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
    return getAuthorName(author)
      .charAt(0)
      .toUpperCase();
  }


  function getAuthorImage(author) {
    return getMediaUrl(
      author
        ?.profile
        ?.profile_image_1_url ||

      author
        ?.profile
        ?.profile_image_1
    );
  }


  /* ==========================================================
     UPDATE POST EVERYWHERE
  ========================================================== */

  function updatePost(
    postId,
    updates
  ) {
    setPosts(
      (currentPosts) =>
        currentPosts.map(
          (post) =>
            post.id === postId
              ? {
                  ...post,
                  ...updates,
                }
              : post
        )
    );

    setMyPosts(
      (currentPosts) =>
        currentPosts.map(
          (post) =>
            post.id === postId
              ? {
                  ...post,
                  ...updates,
                }
              : post
        )
    );

    setReposts(
      (currentReposts) =>
        currentReposts.map(
          (repost) => {
            if (
              repost
                .original_post
                ?.id !== postId
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
          }
        )
    );
  }


  /* ==========================================================
     ERROR PARSER
  ========================================================== */

  function getErrorMessage(data) {
    if (!data) {
      return "The request could not be completed.";
    }

    if (
      typeof data === "string"
    ) {
      return data;
    }

    const firstValue =
      Object.values(data)
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


  /* ==========================================================
     LOAD POSTS
  ========================================================== */

  async function loadPosts() {
    try {
      const response =
        await api.get(
          "/posts/"
        );

      const postList =
        response.data?.results ||
        response.data;

      setPosts(
        Array.isArray(postList)
          ? postList
          : []
      );
    } catch (requestError) {
      console.error(
        "Unable to load posts:",
        requestError
          .response
          ?.data ||
          requestError
      );

      setError(
        requestError
          .response
          ?.data
          ?.detail ||
          "Community posts could not be loaded."
      );
    }
  }


  async function loadMyPosts() {
    try {
      const response =
        await api.get(
          "/posts/my-posts/"
        );

      const postList =
        response.data?.results ||
        response.data;

      setMyPosts(
        Array.isArray(postList)
          ? postList
          : []
      );
    } catch (requestError) {
      console.error(
        "Unable to load my posts:",
        requestError
          .response
          ?.data ||
          requestError
      );
    }
  }


  async function loadReposts() {
    try {
      const response =
        await api.get(
          "/posts/reposts/"
        );

      const repostList =
        response.data?.results ||
        response.data;

      setReposts(
        Array.isArray(
          repostList
        )
          ? repostList
          : []
      );
    } catch (requestError) {
      console.error(
        "Unable to load reposts:",
        requestError
          .response
          ?.data ||
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


  /* ==========================================================
     PUBLISHER HELPERS
  ========================================================== */

  function clearFileInputs() {
    if (
      imageInputRef.current
    ) {
      imageInputRef.current.value =
        "";
    }

    if (
      videoInputRef.current
    ) {
      videoInputRef.current.value =
        "";
    }
  }


  function resetPublisher() {
    setForm(emptyForm);

    setImage(null);
    setVideo(null);

    setComposerOpen(false);

    clearFileInputs();
  }


  function selectPostType(
    postType
  ) {
    setForm(
      (previous) => ({
        ...emptyForm,

        location_name:
          previous.location_name,

        latitude:
          previous.latitude,

        longitude:
          previous.longitude,

        post_type:
          postType,
      })
    );

    setComposerOpen(true);

    setImage(null);
    setVideo(null);

    setError("");
    setSuccess("");

    clearFileInputs();
  }


  function validateBeforeSubmit() {
    const title =
      form.title.trim();

    const text =
      form.text.trim();

    if (
      form.post_type ===
        "article" &&
      !title
    ) {
      return "Please enter an article title.";
    }

    if (
      [
        "post",
        "article",
      ].includes(
        form.post_type
      ) &&
      !text
    ) {
      return "Please enter some content.";
    }

    if (
      form.post_type ===
        "image" &&
      !image
    ) {
      return "Please select an image.";
    }

    if (
      form.post_type ===
        "video" &&
      !video
    ) {
      return "Please select a video.";
    }

    return "";
  }


  /* ==========================================================
     CREATE POST
  ========================================================== */

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

    setPublishing(true);

    try {
      let uploadedImage =
        null;

      let uploadedVideo =
        null;

      if (image) {
        console.log(
          "Uploading image to Netlify Blob..."
        );

        uploadedImage =
          await uploadMediaToNetlify(
            image
          );
      }

      if (video) {
        console.log(
          "Uploading video to Netlify Blob..."
        );

        uploadedVideo =
          await uploadMediaToNetlify(
            video
          );
      }

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

      if (form.latitude) {
        formData.append(
          "latitude",
          form.latitude
        );
      }

      if (form.longitude) {
        formData.append(
          "longitude",
          form.longitude
        );
      }

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
    } catch (requestError) {
      console.error(
        "Unable to publish content:",
        requestError
          .response
          ?.data ||
          requestError
      );

      if (
        requestError instanceof
          Error &&
        !requestError.response
      ) {
        setError(
          requestError.message
        );
      } else {
        setError(
          getErrorMessage(
            requestError
              .response
              ?.data
          )
        );
      }
    } finally {
      setPublishing(false);
    }
  }


  /* ==========================================================
     LOCATION
  ========================================================== */

  function addCurrentLocation() {
    setError("");
    setSuccess("");

    if (
      !navigator.geolocation
    ) {
      setError(
        "Location services are not supported by this browser."
      );

      return;
    }

    setLocating(true);

    navigator.geolocation
      .getCurrentPosition(
        (position) => {
          setForm(
            (previous) => ({
              ...previous,

              latitude:
                Number(
                  position
                    .coords
                    .latitude
                ).toFixed(6),

              longitude:
                Number(
                  position
                    .coords
                    .longitude
                ).toFixed(6),
            })
          );

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
          enableHighAccuracy:
            true,

          timeout: 10000,
        }
      );
  }


  /* ==========================================================
     REACTIONS
  ========================================================== */

  async function reactToPost(
    event,
    post,
    reactionType
  ) {
    event.preventDefault();
    event.stopPropagation();

    setOpenReactionPostId(
      null
    );

    try {
      if (
        post.my_reaction ===
        reactionType
      ) {
        const response =
          await api.delete(
            `/posts/${post.id}/remove_reaction/`
          );

        updatePost(
          post.id,
          {
            my_reaction:
              response.data
                .my_reaction,

            reaction_count:
              response.data
                .reaction_count,

            reaction_summary:
              response.data
                .reaction_summary,
          }
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

      updatePost(
        post.id,
        {
          my_reaction:
            response.data
              .my_reaction,

          reaction_count:
            response.data
              .reaction_count,

          reaction_summary:
            response.data
              .reaction_summary,
        }
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  /* ==========================================================
     SAVE
  ========================================================== */

  async function toggleSave(
    event,
    post
  ) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const response =
        await api.post(
          `/posts/${post.id}/toggle_save/`
        );

      updatePost(
        post.id,
        {
          saved_by_me:
            response.data.saved,
        }
      );

      setSuccess(
        response.data.saved
          ? "Post saved successfully."
          : "Post removed from saved posts."
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  /* ==========================================================
     REPOST
  ========================================================== */

  async function shareToCommunity(
    event,
    post
  ) {
    event.preventDefault();
    event.stopPropagation();

    const message =
      window.prompt(
        "Add your thoughts to this repost (optional):",
        ""
      );

    if (message === null) {
      return;
    }

    try {
      const response =
        await api.post(
          `/posts/${post.id}/share_to_community/`,
          {
            message:
              message.trim(),
          }
        );

      updatePost(
        post.id,
        {
          community_share_count:
            (
              post.community_share_count ||
              0
            ) + 1,

          share_count:
            (
              post.share_count ||
              0
            ) + 1,
        }
      );

      setSuccess(
        "Post reposted successfully."
      );

      await loadReposts();

      if (
        response.data
          ?.shared_by
          ?.id === user?.id
      ) {
        await loadMyPosts();
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  /* ==========================================================
     EXTERNAL SHARE
  ========================================================== */

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


  /* ==========================================================
     UNIQUE VIEW
  ========================================================== */

  async function recordUniqueView(
    post
  ) {
    const storageKey =
      `foodkindl-view-${post.id}`;

    if (
      sessionStorage
        .getItem(
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

      updatePost(
        post.id,
        {
          unique_view_count:
            response.data
              .unique_view_count,
        }
      );
    } catch (requestError) {
      sessionStorage
        .removeItem(
          storageKey
        );
    }
  }


  /* ==========================================================
     MESSAGE
  ========================================================== */

  function isGovernmentIdVerified(
    member
  ) {
    return Boolean(
      member
        ?.profile
        ?.is_verified ===
        true &&

      member
        ?.profile
        ?.verification_status ===
        "approved"
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

    if (
      member.id ===
      user?.id
    ) {
      setError(
        "You cannot message yourself."
      );

      return;
    }

    if (
      !isGovernmentIdVerified(
        user
      )
    ) {
      setError(
        "Please complete Government ID verification before messaging members."
      );

      return;
    }

    if (
      !isGovernmentIdVerified(
        member
      )
    ) {
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


  /* ==========================================================
     OPEN POST
  ========================================================== */

  function openPost(post) {
    recordUniqueView(post);

    navigate(
      `/community/post/${post.id}`
    );
  }


  /* ==========================================================
     DISPLAY HELPERS
  ========================================================== */

  function getReactionEmoji(
    reactionType
  ) {
    return (
      REACTIONS.find(
        (reaction) =>
          reaction.value ===
          reactionType
      )?.emoji ||
      "♡"
    );
  }


  function getReactionLabel(
    reactionType
  ) {
    if (!reactionType) {
      return "Love";
    }

    return (
      REACTIONS.find(
        (reaction) =>
          reaction.value ===
          reactionType
      )?.label ||
      "React"
    );
  }


  function formatRelativeTime(
    dateValue
  ) {
    if (!dateValue) {
      return "";
    }

    const date =
      new Date(
        dateValue
      );

    const diffInSeconds =
      Math.max(
        0,
        Math.floor(
          (
            Date.now() -
            date.getTime()
          ) /
            1000
        )
      );

    if (
      diffInSeconds < 60
    ) {
      return "Just now";
    }

    const minutes =
      Math.floor(
        diffInSeconds / 60
      );

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours =
      Math.floor(
        minutes / 60
      );

    if (hours < 24) {
      return `${hours}h`;
    }

    const days =
      Math.floor(
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


  function getPostTypeLabel(
    postType
  ) {
    if (
      postType ===
      "article"
    ) {
      return "Article";
    }

    if (
      postType ===
      "video"
    ) {
      return "Video";
    }

    if (
      postType ===
      "image"
    ) {
      return "Photo";
    }

    return "Post";
  }


  /* ==========================================================
     FEED DATA
  ========================================================== */

  const savedPosts =
    posts.filter(
      (post) =>
        post.saved_by_me
    );


  const normalFeedItems =
    posts.map(
      (post) => ({
        itemType: "post",

        createdAt:
          post.created_at,

        post,
      })
    );


  const repostFeedItems =
    reposts
      .filter(
        (repost) =>
          repost.original_post
      )
      .map(
        (repost) => ({
          itemType:
            "repost",

          createdAt:
            repost.created_at,

          repost,

          post:
            repost.original_post,
        })
      );


  const combinedFeed = [
    ...normalFeedItems,
    ...repostFeedItems,
  ].sort(
    (first, second) =>
      new Date(
        second.createdAt
      ) -
      new Date(
        first.createdAt
      )
  );


  const baseVisibleFeed =
    activeTab === "feed"
      ? combinedFeed
      : activeTab === "saved"
        ? savedPosts.map((post) => ({
            itemType: "post",
            createdAt: post.created_at,
            post,
          }))
        : myPosts.map((post) => ({
            itemType: "post",
            createdAt: post.created_at,
            post,
          }));

  const visibleFeed = selectedTrendingTopic
    ? baseVisibleFeed.filter((item) => {
        const post = item?.post;

        if (!post) {
          return false;
        }

        const searchableText = [
          post.title,
          post.text,
          post.location_name,
          post.post_type,
          getAuthorName(post.author),
          Array.isArray(post.tags)
            ? post.tags.join(" ")
            : post.tags || "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return selectedTrendingTopic.keywords.some((keyword) =>
          searchableText.includes(keyword.toLowerCase())
        );
      })
    : baseVisibleFeed;


  /* ==========================================================
     POST CARD
  ========================================================== */

  function renderFeedCard(
    item
  ) {
    const isRepost =
      item.itemType ===
      "repost";

    const repost =
      isRepost
        ? item.repost
        : null;

    const post =
      item.post;

    if (!post) {
      return null;
    }

    const authorName =
      getAuthorName(
        post.author
      );

    const authorImage =
      getAuthorImage(
        post.author
      );

    return (
      <article
        className="fk-feed-card"
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
          <div className="fk-repost-header">
            <Repeat2
              size={15}
            />

            <strong>
              {getAuthorName(
                repost.shared_by
              )}
            </strong>

            <span>
              reposted this
            </span>
          </div>
        )}


        {isRepost &&
          repost.message && (
            <div className="fk-repost-message">
              {repost.message}
            </div>
          )}


        <header className="fk-post-author-row">

          <div className="fk-post-author">

            <div className="fk-avatar-shell">

              {authorImage ? (
                <img
                  src={
                    authorImage
                  }
                  alt={
                    authorName
                  }
                  className="fk-avatar"
                />
              ) : (
                <div className="fk-avatar fk-avatar-fallback">
                  {getAuthorInitial(
                    post.author
                  )}
                </div>
              )}

              {isGovernmentIdVerified(
                post.author
              ) && (
                <span
                  className="fk-verified-dot"
                  title="Verified member"
                >
                  ✓
                </span>
              )}

            </div>


            <div className="fk-author-copy">

              <strong>
                {authorName}
              </strong>

              <div className="fk-post-meta">

                <span>
                  {formatRelativeTime(
                    post.created_at
                  )}
                </span>

                <i>•</i>

                <span>
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
              className="fk-message-button"
              onClick={
                (event) =>
                  openDirectMessage(
                    event,
                    post.author
                  )
              }
            >
              <MessageCircle
                size={17}
              />

              <span>
                Message
              </span>
            </button>

          )}

        </header>


        {post.location_name && (
          <div className="fk-post-location">
            <MapPin
              size={14}
            />

            <span>
              {
                post.location_name
              }
            </span>
          </div>
        )}


        {post.title && (
          <h2 className="fk-post-title">
            {post.title}
          </h2>
        )}


        {post.text && (
          <p className="fk-post-text">

            {post.text.length >
            500
              ? `${post.text.slice(
                  0,
                  500
                )}...`
              : post.text}

          </p>
        )}


        {(post.image_url ||
          post.image) && (

          <div className="fk-post-media">

            <img
              src={getMediaUrl(
                post.image_url ||
                  post.image
              )}
              alt={
                post.title ||
                "FoodKindl community post"
              }
              className="fk-post-image"
              loading="lazy"
            />

            <div className="fk-media-overlay" />

          </div>
        )}


        {(post.video_url ||
          post.video) && (

          <div className="fk-post-media">

            <video
              src={getMediaUrl(
                post.video_url ||
                  post.video
              )}
              className="fk-post-video"
              controls
              playsInline
              preload="metadata"
              onPlay={() =>
                recordUniqueView(
                  post
                )
              }
              onClick={
                (event) =>
                  event.stopPropagation()
              }
            >
              Your browser does
              not support video
              playback.
            </video>

          </div>
        )}


        <div className="fk-post-stats">

          <span>
            <Heart
              size={16}
            />
            {
              post.reaction_count ||
              0
            }
          </span>

          <span>
            <MessageCircle
              size={16}
            />
            {
              post.comment_count ||
              0
            }
          </span>

          <span>
            <span className="fk-eye-symbol">
              ◉
            </span>

            {
              post.unique_view_count ||
              0
            }
          </span>

          <span>
            <Repeat2
              size={16}
            />

            {
              post.community_share_count ||
              0
            }
          </span>

        </div>


        <div className="fk-interaction-bar">

          <div className="fk-reaction-control">

            <button
              type="button"
              className={
                post.my_reaction
                  ? "fk-action-button fk-action-love active"
                  : "fk-action-button fk-action-love"
              }
              onClick={
                (event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setOpenReactionPostId(
                    openReactionPostId ===
                      post.id
                      ? null
                      : post.id
                  );
                }
              }
            >

              <span className="fk-action-emoji">
                {getReactionEmoji(
                  post.my_reaction
                )}
              </span>

              <span>
                {getReactionLabel(
                  post.my_reaction
                )}
              </span>

            </button>


            {openReactionPostId ===
              post.id && (

              <div
                className="fk-reaction-picker"
                onClick={
                  (event) =>
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
                          ? "fk-reaction-option selected"
                          : "fk-reaction-option"
                      }
                      onClick={
                        (event) =>
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
            className="fk-action-button"
            onClick={
              (event) => {
                event.preventDefault();
                event.stopPropagation();

                openPost(post);
              }
            }
          >
            <MessageCircle
              size={20}
            />
            Comment
          </button>


          <button
            type="button"
            className="fk-action-button"
            onClick={
              (event) =>
                shareToCommunity(
                  event,
                  post
                )
            }
          >
            <Repeat2
              size={20}
            />
            Repost
          </button>


          <button
            type="button"
            className="fk-action-button"
            onClick={
              (event) =>
                shareExternally(
                  event,
                  post
                )
            }
          >
            <Share2
              size={20}
            />
            Share
          </button>


          <button
            type="button"
            className={
              post.saved_by_me
                ? "fk-action-button fk-save-action active"
                : "fk-action-button fk-save-action"
            }
            onClick={
              (event) =>
                toggleSave(
                  event,
                  post
                )
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

        </div>

      </article>
    );
  }


  /* ==========================================================
     JSX
  ========================================================== */

  return (

    <PageTag
      className={
        embedded
          ? "community-page community-page-embedded"
          : "app-page community-page"
      }
    >

      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="fk-community-hero">

        <div className="fk-hero-glow fk-hero-glow-one" />
        <div className="fk-hero-glow fk-hero-glow-two" />


        <div className="fk-hero-copy">

          <div className="fk-hero-label">
            <span>
              <Sparkles
                size={14}
              />
            </span>

            FOODKINDL COMMUNITY
          </div>


          <h1>
            Food tastes better
            <br />

            when stories are{" "}

            <em>
              shared.
            </em>
          </h1>


          <p>
            Discover real food stories,
            hidden gems, home-cooked
            moments and the people behind
            them.
          </p>


          {/* <div className="fk-hero-actions"> */}

            {/* <button
              type="button"
              className="fk-hero-primary"
              onClick={() =>
                selectPostType(
                  "post"
                )
              }
            >
              Share your story

              <ArrowRight
                size={18}
              />
            </button>


            <button
              type="button"
              className="fk-hero-secondary"
              onClick={() =>
                navigate(
                  "/discover"
                )
              }
            >
              <Users
                size={18}
              />

              Discover people
            </button> */}
{/*  */}
          {/* </div> */}


        
        </div>


        <div
          className="fk-hero-visual"
          aria-hidden="true"
        >

          <div className="fk-hero-orbit fk-orbit-one" />
          <div className="fk-hero-orbit fk-orbit-two" />

          <div className="fk-food-visual-card">

            <div className="fk-food-bowl">
              🍲
            </div>

            <div className="fk-food-card-copy">

              <span>
                TODAY'S MOOD
              </span>

              <strong>
                Good food.
                <br />
                Better company.
              </strong>

            </div>

          </div>


          <div className="fk-floating-card fk-floating-card-top">

            <span className="fk-floating-icon">
              🔥
            </span>

            <div>
              <small>
                TRENDING
              </small>

              <strong>
                #Biryani
              </strong>
            </div>

          </div>


          <div className="fk-floating-card fk-floating-card-bottom">

            <span className="fk-floating-icon">
              🍜
            </span>

            <div>
              <small>
                DISCOVER
              </small>

              <strong>
                Food stories nearby
              </strong>
            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          COMMUNITY TOOLBAR
      ====================================================== */}

      <section className="fk-community-toolbar">

        <nav
          className="fk-community-tabs"
          role="tablist"
          aria-label="Community posts"
        >

          <button
            type="button"
            role="tab"
            aria-selected={
              activeTab ===
              "feed"
            }
            className={
              activeTab ===
              "feed"
                ? "fk-community-tab active"
                : "fk-community-tab"
            }
            onClick={() =>
              setActiveTab(
                "feed"
              )
            }
          >
            <MessageSquare
              size={18}
            />
            Feed
          </button>


          <button
            type="button"
            role="tab"
            aria-selected={
              activeTab ===
              "saved"
            }
            className={
              activeTab ===
              "saved"
                ? "fk-community-tab active"
                : "fk-community-tab"
            }
            onClick={() =>
              setActiveTab(
                "saved"
              )
            }
          >
            <Bookmark
              size={18}
            />
            Saved
          </button>


          <button
            type="button"
            role="tab"
            aria-selected={
              activeTab ===
              "my-posts"
            }
            className={
              activeTab ===
              "my-posts"
                ? "fk-community-tab active"
                : "fk-community-tab"
            }
            onClick={() =>
              setActiveTab(
                "my-posts"
              )
            }
          >
            <Users
              size={18}
            />
            My Posts
          </button>

        </nav>


        <div className="fk-toolbar-search">

          <Search
            size={17}
          />

          <span>
            Discover food stories
          </span>

        </div>

      </section>


      {/* ======================================================
          STATUS
      ====================================================== */}

      {(error ||
        success) && (

        <div className="fk-status-area">

          {error && (
            <div className="fk-alert fk-alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="fk-alert fk-alert-success">
              {success}
            </div>
          )}

        </div>

      )}


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <section className="fk-community-content">

        {/* ====================================================
            LEFT
        ==================================================== */}

        <div className="fk-feed-column">

          <div className="fk-feed-heading">

            <div>

              <span>
                COMMUNITY FEED
              </span>

              <h2>
                What's cooking?
              </h2>

            </div>


            <div className="fk-feed-heading-badge">

              <Flame
                size={16}
              />

              Fresh stories

            </div>

          </div>


          {loading ? (

            <div className="fk-empty-state">

              <RefreshCw
                size={23}
                className="fk-loading-icon"
              />

              <strong>
                Loading your food community...
              </strong>

            </div>

          ) : visibleFeed.length ===
            0 ? (

            <div className="fk-empty-state">

              <ChefHat
                size={35}
              />

              <strong>
                {selectedTrendingTopic
                  ? `No ${selectedTrendingTopic.label} stories yet.`
                  : activeTab === "saved"
                    ? "No saved stories yet."
                    : activeTab === "my-posts"
                      ? "You haven't shared anything yet."
                      : "Nothing has been shared yet."}
              </strong>

              <span>
                FoodKindl gets better when
                someone shares the first
                story.
              </span>

              {activeTab !==
                "saved" && (

                <button
                  type="button"
                  onClick={() =>
                    selectPostType(
                      "post"
                    )
                  }
                >
                  Create a post
                </button>

              )}

            </div>

          ) : (

            <div className="fk-feed-list">
              {visibleFeed.map(
                renderFeedCard
              )}
            </div>

          )}

        </div>


        {/* ====================================================
            RIGHT
        ==================================================== */}

        <aside className="fk-community-sidebar">

          {/* ==================================================
              CREATE POST
          ================================================== */}

          <section className="fk-create-card">

            <div className="fk-create-user-row">

              <div className="fk-avatar-shell">

                {getAuthorImage(
                  user
                ) ? (

                  <img
                    src={getAuthorImage(
                      user
                    )}
                    alt={getAuthorName(
                      user
                    )}
                    className="fk-avatar"
                  />

                ) : (

                  <div className="fk-avatar fk-avatar-fallback">
                    {getAuthorInitial(
                      user
                    )}
                  </div>

                )}

                {isGovernmentIdVerified(
                  user
                ) && (
                  <span className="fk-verified-dot">
                    ✓
                  </span>
                )}

              </div>


              <div>

                <small>
                  SHARE WITH THE COMMUNITY
                </small>

                <strong>
                  Create a post
                </strong>

              </div>

            </div>


            <button
              type="button"
              className="fk-start-post"
              onClick={() =>
                selectPostType(
                  "post"
                )
              }
            >

              Share your food story,
              experience or recipe...

            </button>


            <div className="fk-quick-actions">

              <button
                type="button"
                onClick={() =>
                  selectPostType(
                    "image"
                  )
                }
              >
                <ImageIcon
                  size={20}
                />
                <span>
                  Photo
                </span>
              </button>


              <button
                type="button"
                onClick={() =>
                  selectPostType(
                    "video"
                  )
                }
              >
                <Video
                  size={20}
                />
                <span>
                  Video
                </span>
              </button>


              <button
                type="button"
                onClick={() =>
                  selectPostType(
                    "article"
                  )
                }
              >
                <FileText
                  size={20}
                />
                <span>
                  Article
                </span>
              </button>


              <button
                type="button"
                className="fk-quick-post"
                onClick={() =>
                  selectPostType(
                    "post"
                  )
                }
              >
                <Send
                  size={19}
                />

                <span>
                  Post
                </span>
              </button>

            </div>

          </section>


          {/* ==================================================
              COMPOSER
          ================================================== */}

          {composerOpen && (

            <form
              className="fk-composer"
              onSubmit={
                createPost
              }
              encType="multipart/form-data"
            >

              <div className="fk-composer-heading">

                <div>

                  <small>
                    FOODKINDL
                  </small>

                  <strong>

                    {form.post_type ===
                    "article"
                      ? "Write an article"

                      : form.post_type ===
                          "image"
                        ? "Share a photo"

                        : form.post_type ===
                            "video"
                          ? "Share a video"

                          : "Create a post"}

                  </strong>

                </div>


                <button
                  type="button"
                  className="fk-composer-close"
                  onClick={() => {
                    setComposerOpen(
                      false
                    );

                    setError("");
                    setSuccess("");
                  }}
                  aria-label="Close composer"
                >
                  ×
                </button>

              </div>


              {form.post_type ===
                "article" && (

                <input
                  type="text"
                  className="fk-composer-input"
                  placeholder="Give your story a title..."
                  value={
                    form.title
                  }
                  maxLength={
                    200
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          title:
                            event
                              .target
                              .value,
                        })
                      )
                  }
                  required
                />

              )}


              <textarea
                className="fk-composer-textarea"
                placeholder={
                  form.post_type ===
                  "article"
                    ? "Write your food story..."

                    : form.post_type ===
                        "image"
                      ? "Tell us about this photo..."

                      : form.post_type ===
                          "video"
                        ? "Tell us about this video..."

                        : "What's your food story today?"
                }
                value={
                  form.text
                }
                maxLength={
                  5000
                }
                onChange={
                  (event) =>
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,

                        text:
                          event
                            .target
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


              <label className="fk-field">

                <span>
                  <MapPin
                    size={15}
                  />
                  Location
                </span>

                <input
                  type="text"
                  placeholder="Bengaluru, Indiranagar..."
                  value={
                    form.location_name
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          location_name:
                            event
                              .target
                              .value,
                        })
                      )
                  }
                />

              </label>


              <button
                type="button"
                className="fk-location-button"
                onClick={
                  addCurrentLocation
                }
                disabled={
                  locating
                }
              >
                <MapPin
                  size={16}
                />

                {locating
                  ? "Finding location..."
                  : "Use current location"}
              </button>


              {form.latitude &&
                form.longitude && (

                <p className="fk-coordinate-text">
                  Coordinates:{" "}
                  {form.latitude},{" "}
                  {form.longitude}
                </p>

              )}


              {form.post_type ===
                "image" && (

                <label className="fk-upload-field">

                  <span>
                    Upload Photo
                  </span>

                  <input
                    ref={
                      imageInputRef
                    }
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      (event) =>
                        setImage(
                          event
                            .target
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

                <label className="fk-upload-field">

                  <span>
                    Upload Video
                  </span>

                  <input
                    ref={
                      videoInputRef
                    }
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={
                      (event) =>
                        setVideo(
                          event
                            .target
                            .files?.[0] ||
                            null
                        )
                    }
                    required
                  />

                </label>

              )}


              {image && (

                <p className="fk-selected-file">
                  Selected image:{" "}
                  {image.name}
                </p>

              )}


              {video && (

                <p className="fk-selected-file">
                  Selected video:{" "}
                  {video.name}
                </p>

              )}


              <button
                type="submit"
                className="fk-publish-button"
                disabled={
                  publishing
                }
              >

                {publishing
                  ? "Publishing..."
                  : "Share with FoodKindl"}

                {!publishing && (
                  <ArrowRight
                    size={18}
                  />
                )}

              </button>

            </form>

          )}


          {/* ==================================================
              TRENDING
          ================================================== */}

          <section className="fk-side-card fk-trending-card">

            <div className="fk-side-heading">

              <div>

                <span className="fk-side-heading-icon">
                  <Flame
                    size={17}
                  />
                </span>

                <strong>
                  Trending bites
                </strong>

              </div>

              <span className="fk-see-all">
                Explore
              </span>

            </div>


            <p className="fk-side-description">
              See what the FoodKindl
              community is talking about
              today.
            </p>


            <div className="fk-topic-chips">
              {TRENDING_TOPICS.map((topic) => {
                const isActive =
                  selectedTrendingTopic?.id === topic.id;

                return (
                  <button
                    type="button"
                    key={topic.id}
                    className={
                      isActive
                        ? "fk-topic-chip active"
                        : "fk-topic-chip"
                    }
                    aria-pressed={isActive}
                    onClick={() => {
                      setActiveTab("feed");
                      setError("");
                      setSuccess("");
                      setSelectedTrendingTopic(
                        isActive ? null : topic
                      );
                    }}
                  >
                    {topic.label}
                  </button>
                );
              })}
            </div>

            {selectedTrendingTopic && (
              <div className="fk-trending-selected">
                <span>
                  Showing {selectedTrendingTopic.label}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedTrendingTopic(null)
                  }
                >
                  Clear
                </button>
              </div>
            )}

          </section>


        </aside>

      </section>

    </PageTag>
  );
}