import {

  useEffect,

  useState,

} from "react";

import {

  ArrowLeft,

  Camera,

  CheckCircle2,

  ChefHat,

  MapPin,

  RefreshCw,

  ShieldCheck,

  UserRound,

  Globe2,

  LockKeyhole,

} from "lucide-react";

import {

  Link,

} from "react-router-dom";

import api from "../api";

import {

  useAuth,

} from "../context/AuthContext";

import "../styles/profile.css";

const initialFiles = {

  profile_image_1: null,

  profile_image_2: null,

  profile_image_3: null,

};

// ============================================================

// FOOD MATCH OPTIONS

// ============================================================

const FOOD_INTEREST_OPTIONS = [

  "Home Cooking",

  "Cooking Together",

  "Dining Out",

  "Food Exploring",

  "Baking",

  "Street Food",

  "Healthy Cooking",

  "Food Photography",

  "Food Videos",

  "Learning Recipes",

  "Hosting Food Gatherings",

  "Potluck",

];

const CUISINE_OPTIONS = [

  "Kerala",

  "South Indian",

  "North Indian",

  "Punjabi",

  "Gujarati",

  "Bengali",

  "Goan",

  "Maharashtrian",

  "Andhra",

  "Tamil",

  "Hyderabadi",

  "Chinese",

  "Italian",

  "Thai",

  "Japanese",

  "Korean",

  "Mexican",

  "Mediterranean",

  "Continental",

];

const CONNECTION_OPTIONS = [

  "Cook Together",

  "Dine Out",

  "Food Gatherings",

  "Potluck",

  "Food Walks",

  "Learn Recipes",

  "Meet New People",

];

// ============================================================

// DIETARY PREFERENCE

// ============================================================

function normalizeDietaryPreference(value) {

  const v = String(value || "").toLowerCase();

  if (["vegetarian", "veg"].includes(v)) return "vegetarian";

  if (["non_vegetarian", "non-vegetarian", "non_veg", "non-veg"].includes(v)) return "non_vegetarian";

  return "other";

}

// ============================================================

// COMMA-SEPARATED FIELD HELPERS

// ============================================================

function stringToArray(

  value

) {

  if (!value) {

    return [];

  }

  if (Array.isArray(value)) {

    return value

      .map(

        (item) =>

          String(item).trim()

      )

      .filter(Boolean);

  }

  return String(value)

    .split(",")

    .map(

      (item) =>

        item.trim()

    )

    .filter(Boolean);

}

function arrayToString(

  values

) {

  return values.join(",");

}

// ============================================================

// NETLIFY BLOB UPLOAD

// ============================================================

async function uploadMediaToNetlify(file, uploadType = "public") {

  if (!file) throw new Error("No photo selected.");

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {

    throw new Error("Profile photos must be JPG, PNG or WebP.");

  }

  if (file.size > 4 * 1024 * 1024) {

    throw new Error("Each profile photo must be smaller than 4 MB.");

  }

  const formData = new FormData();

  formData.append("file", file);

  formData.append("upload_type", uploadType);

  // Must match the actual Netlify Function filename, media-upload.js.

  // Vite's npm run dev does not serve Netlify Functions; use netlify dev.

  const functionOrigin = (import.meta.env.VITE_NETLIFY_FUNCTIONS_ORIGIN || "").replace(/\/+$/, "");

  const endpoint = `${functionOrigin}/.netlify/functions/media-upload`;

  let response;

  try {

    response = await fetch(endpoint, { method: "POST", body: formData });

  } catch (err) {

    throw new Error("Could not reach Netlify media upload. Check your connection and Netlify Dev setup.");

  }

  const responseText = await response.text();

  let data = null;

  try { data = responseText ? JSON.parse(responseText) : null; } catch { /* handle HTML 404 below */ }

  if (!response.ok) {

    console.error("NETLIFY UPLOAD FAILED:", { status: response.status, endpoint, responseText });

    if (response.status === 404) {

      throw new Error(`Photo upload service not found (404) at ${endpoint}. Check Netlify Dev or deploy the function.`);

    }

    throw new Error(data?.error || data?.detail || `Photo upload failed (HTTP ${response.status}).`);

  }

  if (!data?.success || !data?.url || !data?.key) {

    throw new Error(data?.error || "Photo upload response is missing a URL or Blob key.");

  }

  return data;

}

// ============================================================

// PROFILE

// ============================================================

export default function Profile() {

  const {

    user,

    reloadUser,

  } = useAuth();

  const profile =

    user?.profile || {};

  const API_BASE = (import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

  // ==========================================================

  // MEDIA URL

  // ==========================================================

  function getMediaUrl(

    value

  ) {

    if (!value) {

      return "";

    }

    if (

      value.startsWith(

        "http://"

      ) ||

      value.startsWith(

        "https://"

      ) ||

      value.startsWith(

        "blob:"

      )

    ) {

      return value;

    }

    if (

      value.startsWith(

        "/.netlify/"

      )

    ) {

      return (

        `${window.location.origin}${value}`

      );

    }

    return (

      `${API_BASE}${value}`

    );

  }

  // ==========================================================

  // FORM

  // ==========================================================

  const [

    form,

    setForm,

  ] = useState({

    bio:

      profile.bio || "",

    city:

      profile.city || "",

    locality:

      profile.locality || "",

    postcode:

      profile.postcode || "",

    college_workplace:

      profile.college_workplace ||

      "",

    role:

      profile.role || "",

    interests:

      profile.interests || "",

    favorite_cuisines:

      profile.favorite_cuisines ||

      "",

    food_connection_preferences:

      profile.food_connection_preferences ||

      "",

    gender:

      profile.gender || "",

    dietary_preference:

      normalizeDietaryPreference(

        profile.dietary_preference

      ),

    women_only_mode:

      profile.women_only_mode ||

      false,

    profile_visibility:

      profile.profile_visibility ||

      "public",

  });

  const [

    files,

    setFiles,

  ] = useState(

    initialFiles

  );

  const [

    previews,

    setPreviews,

  ] = useState({

    profile_image_1:

      getMediaUrl(

        profile.profile_image_1_url ||

        profile.profile_image_1

      ),

    profile_image_2:

      getMediaUrl(

        profile.profile_image_2_url ||

        profile.profile_image_2

      ),

    profile_image_3:

      getMediaUrl(

        profile.profile_image_3_url ||

        profile.profile_image_3

      ),

  });

  const [

    message,

    setMessage,

  ] = useState("");

  const [

    error,

    setError,

  ] = useState("");

  const [

    submitting,

    setSubmitting,

  ] = useState(false);

  const [

    refreshing,

    setRefreshing,

  ] = useState(false);

  const [

    uploadStatus,

    setUploadStatus,

  ] = useState("");

  // ==========================================================

  // PROFILE STATUS

  // ==========================================================

  const displayName =

    user?.full_name ||

    user?.first_name ||

    "FoodKindl Member";

  // ==========================================================

  // RELOAD FORM

  // ==========================================================

  useEffect(

    () => {

      setForm({

        bio:

          profile.bio || "",

        city:

          profile.city || "",

        locality:

          profile.locality || "",

        postcode:

          profile.postcode || "",

        college_workplace:

          profile.college_workplace ||

          "",

        role:

          profile.role || "",

        interests:

          profile.interests || "",

        favorite_cuisines:

          profile.favorite_cuisines ||

          "",

        food_connection_preferences:

          profile.food_connection_preferences ||

          "",

        gender:

          profile.gender || "",

        dietary_preference:

          normalizeDietaryPreference(

            profile.dietary_preference

          ),

        women_only_mode:

          profile.women_only_mode ||

          false,

        profile_visibility:

          profile.profile_visibility ||

          "public",

      });

      setPreviews({

        profile_image_1:

          getMediaUrl(

            profile.profile_image_1_url ||

            profile.profile_image_1

          ),

        profile_image_2:

          getMediaUrl(

            profile.profile_image_2_url ||

            profile.profile_image_2

          ),

        profile_image_3:

          getMediaUrl(

            profile.profile_image_3_url ||

            profile.profile_image_3

          ),

      });

    },

    [user]

  );

  // ==========================================================

  // FOOD MATCH SELECTION HELPERS

  // ==========================================================

  function toggleFoodOption(

    field,

    option

  ) {

    const currentValues =

      stringToArray(

        form[field]

      );

    const exists =

      currentValues.includes(

        option

      );

    let updatedValues;

    if (exists) {

      updatedValues =

        currentValues.filter(

          (item) =>

            item !== option

        );

    } else {

      updatedValues = [

        ...currentValues,

        option,

      ];

    }

    setForm(

      (

        previousForm

      ) => ({

        ...previousForm,

        [field]:

          arrayToString(

            updatedValues

          ),

      })

    );

  }

  function isFoodOptionSelected(

    field,

    option

  ) {

    return (

      stringToArray(

        form[field]

      ).includes(

        option

      )

    );

  }

  // ==========================================================

  // REFRESH

  // ==========================================================

  async function refreshProfile() {

    if (!reloadUser) {

      return;

    }

    setRefreshing(true);

    setError("");

    setMessage("");

    try {

      await reloadUser();

      setMessage(

        "Profile refreshed."

      );

    } catch (

      refreshError

    ) {

      console.error(

        "PROFILE REFRESH ERROR:",

        refreshError

      );

      setError(

        "Profile could not be refreshed."

      );

    } finally {

      setRefreshing(false);

    }

  }

  // ==========================================================

  // INPUT CHANGE

  // ==========================================================

  function handleInputChange(

    event

  ) {

    const {

      name,

      value,

      type,

      checked,

    } = event.target;

    setForm(

      (

        previousForm

      ) => ({

        ...previousForm,

        [name]:

          type === "checkbox"

            ? checked

            : value,

      })

    );

  }

  // ==========================================================

  // FILE CHANGE

  // ==========================================================

  function handleFileChange(

    event

  ) {

    const {

      name,

      files:

        selectedFiles,

    } = event.target;

    const selectedFile =

      selectedFiles?.[0];

    if (!selectedFile) {

      return;

    }

    setError("");

    setMessage("");

    // ========================================================

    // PROFILE PHOTOS

    // ========================================================

    if (

      name.startsWith(

        "profile_image"

      )

    ) {

      const allowedTypes = [

        "image/jpeg",

        "image/png",

        "image/webp",

      ];

      const extension =

        selectedFile.name

          .split(".")

          .pop()

          ?.toLowerCase();

      const allowedExtensions = [

        "jpg",

        "jpeg",

        "png",

        "webp",

      ];

      if (

        !allowedTypes.includes(

          selectedFile.type

        ) &&

        !allowedExtensions.includes(

          extension

        )

      ) {

        setError(

          "Profile photos must be JPG, PNG or WebP."

        );

        event.target.value =

          "";

        return;

      }

      if (

        selectedFile.size >

        4 * 1024 * 1024

      ) {

        setError(

          "Each profile photo must be smaller than 4 MB."

        );

        event.target.value =

          "";

        return;

      }

    }

    setFiles(

      (

        previousFiles

      ) => ({

        ...previousFiles,

        [name]:

          selectedFile,

      })

    );

    if (

      name.startsWith(

        "profile_image"

      )

    ) {

      const previewUrl =

        URL.createObjectURL(

          selectedFile

        );

      setPreviews(

        (

          previousPreviews

        ) => ({

          ...previousPreviews,

          [name]:

            previewUrl,

        })

      );

    }

  }

  // ==========================================================

  // ERROR MESSAGE

  // ==========================================================

  function getErrorMessage(

    data

  ) {

    if (!data) {

      return (

        "Your profile could not be saved."

      );

    }

    if (

      typeof data ===

      "string"

    ) {

      return data;

    }

    return (

      data

        ?.favorite_cuisines?.[0] ||

      data

        ?.food_connection_preferences?.[0] ||

      data

        ?.interests?.[0] ||

      data

        ?.profile_image_1_url?.[0] ||

      data

        ?.profile_image_2_url?.[0] ||

      data

        ?.profile_image_3_url?.[0] ||

      data

        ?.profile_image_1_blob_key?.[0] ||

      data

        ?.profile_image_2_blob_key?.[0] ||

      data

        ?.profile_image_3_blob_key?.[0] ||

      data

        ?.gender?.[0] ||

      data

        ?.dietary_preference?.[0] ||

      data

        ?.profile_visibility?.[0] ||

      data

        ?.detail ||

      JSON.stringify(

        data

      )

    );

  }

  // ==========================================================

  // SAVE

  // ==========================================================

  async function submit(

    event

  ) {

    event.preventDefault();

    setMessage("");

    setError("");

    setUploadStatus("");

    const dietaryPreference =

      normalizeDietaryPreference(

        form.dietary_preference

      );

  setSubmitting(true);

    try {

      const formData =

        new FormData();

      // ======================================================

      // PROFILE DATA

      // ======================================================

      formData.append(

        "bio",

        form.bio

      );

      formData.append(

        "city",

        form.city

      );

      formData.append(

        "locality",

        form.locality

      );

      formData.append(

        "postcode",

        form.postcode

      );

      formData.append(

        "college_workplace",

        form.college_workplace

      );

      formData.append(

        "role",

        form.role

      );

      // ======================================================

      // FOOD MATCH DATA

      // ======================================================

      formData.append(

        "interests",

        form.interests

      );

      formData.append(

        "favorite_cuisines",

        form.favorite_cuisines

      );

      formData.append(

        "food_connection_preferences",

        form.food_connection_preferences

      );

      formData.append(

        "gender",

        form.gender

      );

      formData.append(

        "dietary_preference",

        dietaryPreference

      );

      formData.append(

        "women_only_mode",

        form.women_only_mode

          ? "true"

          : "false"

      );

      formData.append(

        "profile_visibility",

        form.profile_visibility

      );

      // ======================================================

      // PROFILE PHOTOS

      // ======================================================

      const imageFields = [

        "profile_image_1",

        "profile_image_2",

        "profile_image_3",

      ];

      for (

        const field of

        imageFields

      ) {

        const selectedFile =

          files[field];

        if (!selectedFile) {

          continue;

        }

        setUploadStatus(

          `Uploading ${

            field.replaceAll(

              "_",

              " "

            )

          }...`

        );

        const uploaded =

          await uploadMediaToNetlify(

            selectedFile,

            "public"

          );

        formData.append(

          `${field}_url`,

          uploaded.url

        );

        formData.append(

          `${field}_blob_key`,

          uploaded.key

        );

      }

      // Persist all profile fields and uploaded Blob references in Django.

      setUploadStatus("Saving profile...");

      await api.patch("/auth/profile/", formData);

      setFiles({

        ...initialFiles,

      });

      setUploadStatus("");

      setMessage(

        "Profile saved successfully."

      );

      if (reloadUser) {

        await reloadUser();

      }

    } catch (

      requestError

    ) {

      console.error(

        "PROFILE SAVE FAILED:",

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

            requestError

              ?.response

              ?.data

          )

        );

      }

    } finally {

      setSubmitting(false);

      setUploadStatus("");

    }

  }

  // ==========================================================

  // PAGE

  // ==========================================================

  return (

    <main className="app-page foodkindl-profile-page fk-profile-layout fk-profile-fixed">

      <aside className="fk-profile-sidebar" aria-label="Profile sections">

        <div className="fk-profile-sidebar-brand"><ChefHat size={22} /> FoodKindl</div>

        <p className="fk-profile-sidebar-caption">MY PROFILE</p>

        <a href="#profile-about"><UserRound size={18} /> About You</a>

        <a href="#profile-food"><ChefHat size={18} /> Food Identity</a>

        <a href="#profile-privacy"><LockKeyhole size={18} /> Privacy & Safety</a>

        <a href="#profile-gallery"><Camera size={18} /> My Gallery</a>

        <div className="fk-profile-sidebar-bottom">Meet people through food.</div>

      </aside>

      <div className="fk-profile-main">

      {/* ======================================================

          TOP NAVIGATION

      ====================================================== */}

      <div className="profile-page-actions">

        <Link

          to="/dashboard"

          className="secondary-button"

        >

          <ArrowLeft

            size={18}

          />

          Back to Dashboard

        </Link>

        <button

          type="button"

          className="secondary-button"

          onClick={

            refreshProfile

          }

          disabled={

            refreshing ||

            submitting

          }

        >

          <RefreshCw

            size={18}

            className={

              refreshing

                ? "spin"

                : ""

            }

          />

          {

            refreshing

              ? "Refreshing..."

              : "Refresh"

          }

        </button>

      </div>

      {/* ======================================================

          IDENTITY HERO

      ====================================================== */}

      <section className="profile-identity-hero">

        <div className="profile-identity-avatar">

          {

            previews.profile_image_1

              ? (

                <img

                  src={

                    previews.profile_image_1

                  }

                  alt={

                    displayName

                  }

                />

              )

              : (

                <div className="profile-identity-placeholder">

                  <UserRound

                    size={55}

                    strokeWidth={1.4}

                  />

                </div>

              )

          }

        </div>

        <div className="profile-identity-copy">

          <span className="profile-kicker">

            Your FoodKindl Identity

          </span>

          <h1>

            {displayName}

          </h1>

          <p className="profile-email">

            {user?.email}

          </p>

          <div className="profile-meta-row">

            {

              form.role &&

              (

                <span>

                  {form.role}

                </span>

              )

            }

            {

              form.city &&

              (

                <span>

                  <MapPin

                    size={13}

                  />

                  {form.city}

                </span>

              )

            }

            {

              form.dietary_preference &&

              (

                <span>

                  <ChefHat

                    size={13}

                  />

                  {

                    form

                      .dietary_preference

                      .replaceAll(

                        "_",

                        " "

                      )

                  }

                </span>

              )

            }

          </div>

        </div>

      </section>

      {/* ======================================================

          FORM

      ====================================================== */}

      <form

        className="professional-profile-form"

        onSubmit={

          submit

        }

        encType="multipart/form-data"

      >

        <div className="profile-settings-grid">

          {/* ==================================================

              ABOUT YOU

          ================================================== */}

          <section id="profile-about" className="profile-settings-card">

            <div className="profile-section-heading">

              <span>

                01

              </span>

              <div>

                <h2>

                  About You

                </h2>

                <p>

                  Help the community know

                  who they're connecting with.

                </p>

              </div>

            </div>

            <div className="profile-two-column">

              <label>

                City

                <input

                  type="text"

                  name="city"

                  value={

                    form.city

                  }

                  onChange={

                    handleInputChange

                  }

                  placeholder="Bengaluru"

                />

              </label>

              <label>

                Locality

                <input

                  type="text"

                  name="locality"

                  value={

                    form.locality

                  }

                  onChange={

                    handleInputChange

                  }

                  placeholder="Indiranagar"

                />

              </label>

            </div>

            <div className="profile-two-column">

              <label>

                Postcode

                <input

                  type="text"

                  name="postcode"

                  value={

                    form.postcode

                  }

                  onChange={

                    handleInputChange

                  }

                  placeholder="560038"

                  maxLength={12}

                />

              </label>

              <label>

                College or Workplace

                <input

                  type="text"

                  name="college_workplace"

                  value={

                    form.college_workplace

                  }

                  onChange={

                    handleInputChange

                  }

                  placeholder="Scaler, university..."

                />

              </label>

            </div>

            <label>

              Role

              <input

                type="text"

                name="role"

                value={

                  form.role

                }

                onChange={

                  handleInputChange

                }

                placeholder="Software Engineer, Chef..."

              />

            </label>

            <label>

              Bio

              <textarea

                name="bio"

                value={

                  form.bio

                }

                onChange={

                  handleInputChange

                }

                placeholder="Tell the FoodKindl community about yourself..."

              />

            </label>

          </section>

          {/* ==================================================

              FOOD IDENTITY

          ================================================== */}

          <section id="profile-food" className="profile-settings-card">

            <div className="profile-section-heading">

              <span>

                02

              </span>

              <div>

                <h2>

                  Food Identity

                </h2>

                <p>

                  Help FoodKindl find people

                  who share your food tastes

                  and interests.

                </p>

              </div>

            </div>

            <label>

              Gender

              <select

                name="gender"

                value={

                  form.gender

                }

                onChange={

                  handleInputChange

                }

              >

                <option value="">

                  Select gender

                </option>

                <option value="male">

                  Male

                </option>

                <option value="female">

                  Female

                </option>

                <option value="other">

                  Other

                </option>

                <option value="prefer_not_to_say">

                  Prefer not to say

                </option>

              </select>

            </label>

            <label>

              Dietary Preference

              <select

                name="dietary_preference"

                value={

                  form.dietary_preference

                }

                onChange={

                  handleInputChange

                }

              >

                <option value="non_vegetarian">Non-Veg</option>

                <option value="vegetarian">Veg</option>

                <option value="other">Others</option>

              </select>

            </label>

            {/* ================================================

                FAVOURITE CUISINES

            ================================================ */}

            <div className="food-match-field">

              <div className="food-match-field-heading">

                <strong>

                  Favourite Cuisines

                </strong>

                <span>

                  Select the cuisines you enjoy.

                </span>

              </div>

              <div className="food-option-grid">

                {

                  CUISINE_OPTIONS.map(

                    (

                      option

                    ) => {

                      const selected =

                        isFoodOptionSelected(

                          "favorite_cuisines",

                          option

                        );

                      return (

                        <button

                          key={

                            option

                          }

                          type="button"

                          className={

                            selected

                              ? "food-option selected"

                              : "food-option"

                          }

                          onClick={

                            () =>

                              toggleFoodOption(

                                "favorite_cuisines",

                                option

                              )

                          }

                        >

                          {

                            selected &&

                            (

                              <CheckCircle2

                                size={14}

                              />

                            )

                          }

                          {option}

                        </button>

                      );

                    }

                  )

                }

              </div>

            </div>

            {/* ================================================

                PROFILE PRIVACY

            ================================================ */}

            <div id="profile-privacy" className="profile-privacy-setting">

              <div className="food-match-field-heading">

                <strong>

                  Profile Privacy

                </strong>

                <span>

                  Choose who can see the details on your FoodKindl profile.

                </span>

              </div>

              <div className="profile-privacy-options">

                <button

                  type="button"

                  className={

                    form.profile_visibility === "public"

                      ? "profile-privacy-option selected"

                      : "profile-privacy-option"

                  }

                  onClick={() =>

                    setForm((previousForm) => ({

                      ...previousForm,

                      profile_visibility: "public",

                    }))

                  }

                >

                  <Globe2 size={20} />

                  <span>

                    <strong>Public Profile</strong>

                    <small>

                      FoodKindl members can discover your profile and food interests.

                    </small>

                  </span>

                  <span className="profile-privacy-radio">

                    {form.profile_visibility === "public" ? "✓" : ""}

                  </span>

                </button>

                <button

                  type="button"

                  className={

                    form.profile_visibility === "private"

                      ? "profile-privacy-option selected"

                      : "profile-privacy-option"

                  }

                  onClick={() =>

                    setForm((previousForm) => ({

                      ...previousForm,

                      profile_visibility: "private",

                    }))

                  }

                >

                  <LockKeyhole size={20} />

                  <span>

                    <strong>Private Profile</strong>

                    <small>

                      Only connected members can see your full profile details.

                    </small>

                  </span>

                  <span className="profile-privacy-radio">

                    {form.profile_visibility === "private" ? "✓" : ""}

                  </span>

                </button>

              </div>

              <p className="profile-privacy-note">

                {form.profile_visibility === "private"

                  ? "Your profile is private. People who are not connected with you will see only limited profile information."

                  : "Your profile is public. FoodKindl members can see the profile information you choose to share."}

              </p>

            </div>

            {/* ================================================

                WOMEN ONLY SAFETY

            ================================================ */}

            <label className="profile-safety-option">

              <div className="profile-safety-icon">

                <ShieldCheck

                  size={23}

                />

              </div>

              <div className="profile-safety-copy">

                <strong>

                  Women-Only Preference

                </strong>

                <span>

                  Limit applicable gatherings

                  to female members

                  for added comfort and safety.

                </span>

              </div>

              <input

                type="checkbox"

                name="women_only_mode"

                checked={

                  form.women_only_mode

                }

                onChange={

                  handleInputChange

                }

              />

            </label>

          </section>

        </div>

        {/* ====================================================

            GALLERY

        ==================================================== */}

        <section id="profile-gallery" className="profile-wide-card">

          <div className="profile-section-heading">

            <span>

              03

            </span>

            <div>

              <h2>

                Your FoodKindl Gallery

              </h2>

              <p>

                Add up to three photos that

                help people recognise you.

              </p>

            </div>

          </div>

          <div className="professional-photo-grid">

            {

              [

                "profile_image_1",

                "profile_image_2",

                "profile_image_3",

              ].map(

                (

                  field,

                  index

                ) => (

                  <label

                    key={

                      field

                    }

                    className="professional-photo-card"

                  >

                    <div className="professional-photo-preview">

                      {

                        previews[field]

                          ? (

                            <img

                              src={

                                previews[field]

                              }

                              alt={

                                `Profile ${

                                  index + 1

                                }`

                              }

                            />

                          )

                          : (

                            <div className="professional-photo-placeholder">

                              <Camera

                                size={30}

                              />

                              <span>

                                Add photo

                              </span>

                            </div>

                          )

                      }

                    </div>

                    <div className="photo-upload-label">

                      <Camera

                        size={15}

                      />

                      {

                        index === 0

                          ? "Primary photo"

                          : `Photo ${index + 1}`

                      }

                    </div>

                    <input

                      type="file"

                      name={

                        field

                      }

                      accept="image/jpeg,image/png,image/webp"

                      onChange={

                        handleFileChange

                      }

                    />

                  </label>

                )

              )

            }

          </div>

        </section>

        {/* ====================================================

            STATUS

        ==================================================== */}

        {

          uploadStatus &&

          (

            <div className="profile-status-message">

              <RefreshCw

                size={17}

                className="spin"

              />

              {uploadStatus}

            </div>

          )

        }

        {

          error &&

          (

            <p className="error-message">

              {error}

            </p>

          )

        }

        {

          message &&

          (

            <p className="form-message">

              {message}

            </p>

          )

        }

        {/* ====================================================

            SAVE

        ==================================================== */}

        <div className="profile-save-area">

          <div>

            <strong>

              Keep your profile current

            </strong>

            <span>

              Better food preferences help

              FoodKindl find more relevant

              connections for you.

            </span>

          </div>

          <button

            type="submit"

            className="primary-button profile-save-button"

            disabled={

              submitting

            }

          >

            {

              submitting

                ? "Saving Profile..."

                : "Save Changes"

            }

          </button>

        </div>

      </form>

    </div>

    </main>

  );

}