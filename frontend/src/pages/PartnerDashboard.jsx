import {
  Building2,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  ImagePlus,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Pencil,
  Plus,
  Save,
  Store,
  Trash2,
  Upload,
  Utensils,
  Wifi,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api";

import "../styles/partner-dashboard.css";


const EMPTY_RESTAURANT = {

  name: "",

  restaurant_type:
    "restaurant",

  description: "",

  cuisine: "",

  phone_number: "",
  email: "",
  website: "",

  address: "",
  locality: "",
  city: "",
  pincode: "",

  price_range: "",
  average_cost_for_two: "",

  opening_time: "",
  closing_time: "",

  seating_capacity: "",

  has_parking: false,
  has_wifi: false,

  accepts_cards: true,

  family_friendly: true,

  outdoor_seating:
    false,

  wheelchair_accessible:
    false,

  serves_vegetarian:
    true,

  serves_non_vegetarian:
    true,
};


const EMPTY_MENU_ITEM = {

  name: "",

  description: "",

  category:
    "main_course",

  food_type:
    "vegetarian",

  price: "",

  is_popular:
    false,

  is_available:
    true,
};


const CUISINES = [

  ["south_indian", "South Indian"],
  ["north_indian", "North Indian"],
  ["kerala", "Kerala"],
  ["karnataka", "Karnataka"],
  ["tamil", "Tamil"],
  ["andhra", "Andhra"],
  ["telangana", "Telangana"],
  ["hyderabadi", "Hyderabadi"],
  ["punjabi", "Punjabi"],
  ["bengali", "Bengali"],
  ["rajasthani", "Rajasthani"],
  ["gujarati", "Gujarati"],
  ["maharashtrian", "Maharashtrian"],
  ["goan", "Goan"],

  ["chinese", "Chinese"],
  ["indo_chinese", "Indo-Chinese"],
  ["italian", "Italian"],
  ["continental", "Continental"],
  ["mediterranean", "Mediterranean"],
  ["mexican", "Mexican"],
  ["thai", "Thai"],
  ["japanese", "Japanese"],
  ["korean", "Korean"],
  ["arabian", "Arabian"],

  ["biryani", "Biryani"],
  ["seafood", "Seafood"],
  ["street_food", "Street Food"],
  ["fast_food", "Fast Food"],
  ["cafe", "Cafe"],
  ["bakery", "Bakery"],
  ["desserts", "Desserts"],

  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["jain", "Jain"],

  ["multi_cuisine", "Multi Cuisine"],
  ["other", "Other"],
];


export default function PartnerDashboard() {

  const navigate =
    useNavigate();


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    restaurants,
    setRestaurants,
  ] = useState([]);


  const [
    selectedId,
    setSelectedId,
  ] = useState(null);


  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "overview"
  );


  const [
    form,
    setForm,
  ] = useState(
    EMPTY_RESTAURANT
  );


  const [
    menuForm,
    setMenuForm,
  ] = useState(
    EMPTY_MENU_ITEM
  );


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState("");


  const [
    showCreate,
    setShowCreate,
  ] = useState(false);


  const selectedRestaurant =
    useMemo(
      () =>
        restaurants.find(
          restaurant =>
            restaurant.id ===
            selectedId
        ) ||
        null,

      [
        restaurants,
        selectedId,
      ]
    );


  useEffect(
    () => {

      loadRestaurants();

    },
    []
  );


  useEffect(
    () => {

      if (
        !selectedRestaurant
      ) {
        return;
      }

      setForm({
        ...EMPTY_RESTAURANT,
        ...selectedRestaurant,
      });

    },
    [
      selectedRestaurant,
    ]
  );


  function showSuccess(
    text
  ) {

    setMessage(
      text
    );

    setError("");

    window.setTimeout(
      () => {
        setMessage("");
      },
      3500
    );
  }


  function showError(
    err,
    fallback
  ) {

    console.error(
      err
    );

    const data =
      err?.response?.data;

    const detail =
      data?.detail ||
      fallback;

    setError(
      detail
    );

    setMessage("");
  }


  async function loadRestaurants() {

    setLoading(
      true
    );

    setError("");

    try {

      const response =
        await api.get(
          "/partner/restaurants/"
        );

      const list =
        Array.isArray(
          response.data
        )
          ? response.data
          : [];

      setRestaurants(
        list
      );

      if (
        list.length > 0
      ) {

        setSelectedId(
          previous =>
            previous ||
            list[0].id
        );
      }

    } catch (err) {

      showError(
        err,
        "Unable to load your restaurants."
      );

    } finally {

      setLoading(
        false
      );
    }
  }


  function updateField(
    field,
    value
  ) {

    setForm(
      previous => ({
        ...previous,
        [field]: value,
      })
    );
  }


  function updateMenuField(
    field,
    value
  ) {

    setMenuForm(
      previous => ({
        ...previous,
        [field]: value,
      })
    );
  }


  async function createRestaurant(
    event
  ) {

    event.preventDefault();

    if (
      !form.name.trim()
    ) {

      setError(
        "Restaurant name is required."
      );

      return;
    }

    setSaving(
      true
    );

    try {

      const response =
        await api.post(
          "/partner/restaurants/",
          form
        );

      setRestaurants(
        previous => [
          response.data,
          ...previous,
        ]
      );

      setSelectedId(
        response.data.id
      );

      setShowCreate(
        false
      );

      showSuccess(
        "Restaurant created successfully."
      );

    } catch (err) {

      showError(
        err,
        "Unable to create restaurant."
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  async function saveRestaurant() {

    if (
      !selectedRestaurant
    ) {
      return;
    }

    setSaving(
      true
    );

    try {

      const response =
        await api.patch(

          `/partner/restaurants/${selectedRestaurant.id}/`,

          form
        );

      setRestaurants(
        previous =>
          previous.map(
            restaurant =>
              restaurant.id ===
                response.data.id
                ? response.data
                : restaurant
          )
      );

      showSuccess(
        "Restaurant details saved."
      );

    } catch (err) {

      showError(
        err,
        "Unable to save restaurant."
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  async function uploadMainPhoto(
    event
  ) {

    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (
      !file ||
      !selectedRestaurant
    ) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "Please upload a JPG, PNG or WebP image."
      );
      return;
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      setError(
        "Image must be smaller than 8 MB."
      );
      return;
    }

    const data =
      new FormData();

    data.append(
      "image",
      file,
      file.name
    );

    setSaving(true);
    setError("");

    try {

      console.log(
        "Uploading cover photo:",
        {
          restaurantId:
            selectedRestaurant.id,
          fileName:
            file.name,
          fileType:
            file.type,
          fileSize:
            file.size,
        }
      );

      const response =
        await api.post(
          `/partner/restaurants/${selectedRestaurant.id}/main-photo/`,
          data,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      console.log(
        "PHOTO UPLOAD RESPONSE:",
        response.data
      );

      await loadRestaurants();

      showSuccess(
        "Cover photo uploaded successfully."
      );

    } catch (err) {

      console.error(
        "COVER PHOTO UPLOAD FAILED:",
        {
          status:
            err.response?.status,
          data:
            err.response?.data,
          url:
            err.config?.url,
          message:
            err.message,
        }
      );

      const responseData =
        err.response?.data;

      let uploadError =
        "Photo upload failed.";

      if (
        typeof responseData?.detail ===
        "string"
      ) {
        uploadError =
          responseData.detail;
      } else if (
        Array.isArray(
          responseData?.detail
        )
      ) {
        uploadError =
          responseData.detail[0] ||
          uploadError;
      } else if (
        Array.isArray(
          responseData?.image
        )
      ) {
        uploadError =
          responseData.image[0] ||
          uploadError;
      } else if (
        typeof responseData?.error ===
        "string"
      ) {
        uploadError =
          responseData.error;
      }

      setError(
        uploadError
      );

    } finally {
      setSaving(false);
    }
  }

  async function uploadGalleryPhotos(
    event
  ) {

  const files =
    Array.from(
      event.target.files || []
    );


  event.target.value = "";


  if (
    !files.length ||
    !selectedRestaurant
  ) {

    return;
  }


  const formData =
    new FormData();


  files.forEach(
    file => {

      formData.append(
        "images",
        file,
        file.name
      );
    }
  );


  setSaving(true);
  setError("");


  try {

    await api.post(

      `/partner/restaurants/${selectedRestaurant.id}/photos/`,

      formData,

      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    );


    await loadRestaurants();


    showSuccess(
      `${files.length} photo${
        files.length > 1
          ? "s"
          : ""
      } uploaded.`
    );


  } catch (err) {

    console.error(
      "GALLERY ERROR:",
      err.response?.data ||
      err
    );


    showError(
      err,
      "Gallery upload failed."
    );


  } finally {

    setSaving(false);
  }
}

  async function deletePhoto(
    imageId
  ) {

    if (
      !selectedRestaurant
    ) {
      return;
    }

    try {

      await api.delete(

        `/partner/restaurants/${selectedRestaurant.id}/photos/${imageId}/`

      );

      await loadRestaurants();

      showSuccess(
        "Photo removed."
      );

    } catch (err) {

      showError(
        err,
        "Unable to remove photo."
      );
    }
  }


  async function addMenuItem(
    event
  ) {

    event.preventDefault();

    if (
      !selectedRestaurant
    ) {
      return;
    }

    if (
      !menuForm.name.trim()
    ) {

      setError(
        "Dish name is required."
      );

      return;
    }

    if (
      menuForm.price === "" ||
      menuForm.price === null ||
      Number(menuForm.price) < 0
    ) {

      setError(
        "Please enter a valid dish price."
      );

      return;
    }

    setSaving(
      true
    );

    try {

      await api.post(

        `/partner/restaurants/${selectedRestaurant.id}/menu/`,

        {
          ...menuForm,

          price:
            menuForm.price ||
            null,
        }
      );

      setMenuForm(
        EMPTY_MENU_ITEM
      );

      await loadRestaurants();

      showSuccess(
        "Menu item added."
      );

    } catch (err) {

      showError(
        err,
        "Unable to add menu item."
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  async function deleteMenuItem(
    id
  ) {

    if (
      !selectedRestaurant
    ) {
      return;
    }

    try {

      await api.delete(

        `/partner/restaurants/${selectedRestaurant.id}/menu/${id}/`

      );

      await loadRestaurants();

      showSuccess(
        "Menu item removed."
      );

    } catch (err) {

      showError(
        err,
        "Unable to remove menu item."
      );
    }
  }


  async function uploadMenuPhoto(
  menuId,
  file
) {

  if (
    !file ||
    !selectedRestaurant
  ) {

    return;
  }


  const formData =
    new FormData();


  formData.append(
    "image",
    file,
    file.name
  );


  try {

    await api.post(

      `/partner/restaurants/${selectedRestaurant.id}/menu/${menuId}/photo/`,

      formData,

      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    );


    await loadRestaurants();


    showSuccess(
      "Dish photo uploaded."
    );


  } catch (err) {

    console.error(
      "DISH PHOTO ERROR:",
      err.response?.data ||
      err
    );


    showError(
      err,
      "Dish photo upload failed."
    );
  }
}

  function startNewRestaurant() {

    setForm(
      EMPTY_RESTAURANT
    );

    setShowCreate(
      true
    );

    setActiveTab(
      "restaurant"
    );
  }


  if (
    loading
  ) {

    return (
      <div className="partner-loading">

        <div className="partner-loader" />

        <strong>
          Opening Partner Studio
        </strong>

      </div>
    );
  }


  return (

    <div className="partner-shell">

      {/* SIDEBAR */}

      <aside className="partner-sidebar">

        <button
          type="button"
          className="partner-brand"
          onClick={() =>
            navigate(
              "/partner/dashboard"
            )
          }
        >

          <div className="partner-brand-icon">
            FK
          </div>

          <div>

            <strong>
              FoodKindl
            </strong>

            <span>
              Partner Studio
            </span>

          </div>

        </button>


        <nav>

          <button
            className={
              activeTab ===
              "overview"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "overview"
              )
            }
          >
            <LayoutDashboard size={18} />
            Overview
          </button>


          <button
            className={
              activeTab ===
              "restaurant"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "restaurant"
              )
            }
          >
            <Store size={18} />
            Restaurant
          </button>


          <button
            className={
              activeTab ===
              "photos"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "photos"
              )
            }
          >
            <Camera size={18} />
            Photos
          </button>


          <button
            className={
              activeTab ===
              "menu"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "menu"
              )
            }
          >
            <Utensils size={18} />
            Menu
          </button>

        </nav>


        <button
          className="partner-logout"
          type="button"
          onClick={() => {

            localStorage.removeItem(
              "foodkindl_access"
            );

            localStorage.removeItem(
              "foodkindl_refresh"
            );

            navigate(
              "/login"
            );
          }}
        >
          <LogOut size={17} />
          Sign out
        </button>

      </aside>


      {/* MAIN */}

      <main className="partner-main">

        <header className="partner-topbar">

          <div>

            <span className="partner-eyebrow">
              FOODKINDL FOR RESTAURANTS
            </span>

            <h1>
              Partner Studio
            </h1>

          </div>


          <div className="partner-top-actions">

            {
              restaurants.length >
                0 &&
              (
                <div className="partner-restaurant-switch">

                  <Store size={16} />

                  <select
                    value={
                      selectedId ||
                      ""
                    }
                    onChange={
                      event =>
                        setSelectedId(
                          Number(
                            event.target.value
                          )
                        )
                    }
                  >

                    {
                      restaurants.map(
                        restaurant => (
                          <option
                            key={
                              restaurant.id
                            }
                            value={
                              restaurant.id
                            }
                          >
                            {
                              restaurant.name
                            }
                          </option>
                        )
                      )
                    }

                  </select>

                  <ChevronDown size={15} />

                </div>
              )
            }


            <button
              className="partner-primary"
              type="button"
              onClick={
                startNewRestaurant
              }
            >
              <Plus size={18} />
              Add Restaurant
            </button>

          </div>

        </header>


        {
          message &&
          (
            <div className="partner-toast success">
              <Check size={18} />
              {message}
            </div>
          )
        }


        {
          error &&
          (
            <div className="partner-toast error">
              <X size={18} />
              {error}
            </div>
          )
        }


        {/* EMPTY STATE */}

        {
          restaurants.length ===
            0 &&
          !showCreate &&
          (
            <section className="partner-empty">

              <div className="partner-empty-icon">
                <Building2 size={34} />
              </div>

              <span>
                Welcome to FoodKindl Partner
              </span>

              <h2>
                Bring your restaurant
                to FoodKindl.
              </h2>

              <p>
                Create your restaurant,
                add photos and menus, and
                make it discoverable to
                people connecting through
                food.
              </p>

              <button
                type="button"
                className="partner-primary"
                onClick={
                  startNewRestaurant
                }
              >
                <Plus size={18} />
                Create my restaurant
              </button>

            </section>
          )
        }


        {/* CREATE */}

        {
          showCreate &&
          (
            <RestaurantForm
              title="Create restaurant"
              subtitle="Tell FoodKindl about your place."
              form={form}
              updateField={updateField}
              onSubmit={createRestaurant}
              saving={saving}
              submitText="Create Restaurant"
              onCancel={() =>
                setShowCreate(
                  false
                )
              }
            />
          )
        }


        {
          !showCreate &&
          selectedRestaurant &&
          (
            <>

              {/* OVERVIEW */}

              {
                activeTab ===
                  "overview" &&
                (
                  <Overview
                    restaurant={
                      selectedRestaurant
                    }
                    setActiveTab={
                      setActiveTab
                    }
                  />
                )
              }


              {/* RESTAURANT DETAILS */}

              {
                activeTab ===
                  "restaurant" &&
                (
                  <RestaurantForm
                    title="Restaurant details"
                    subtitle="Keep your information accurate for FoodKindl members."
                    form={form}
                    updateField={
                      updateField
                    }
                    saving={
                      saving
                    }
                    submitText="Save changes"
                    onSubmit={
                      event => {
                        event.preventDefault();
                        saveRestaurant();
                      }
                    }
                  />
                )
              }


              {/* PHOTOS */}

              {
                activeTab ===
                  "photos" &&
                (
                  <PhotosSection
                    restaurant={
                      selectedRestaurant
                    }
                    uploadMainPhoto={
                      uploadMainPhoto
                    }
                    uploadGalleryPhotos={
                      uploadGalleryPhotos
                    }
                    deletePhoto={
                      deletePhoto
                    }
                  />
                )
              }


              {/* MENU */}

              {
                activeTab ===
                  "menu" &&
                (
                  <MenuSection

                    restaurant={
                      selectedRestaurant
                    }

                    menuForm={
                      menuForm
                    }

                    updateMenuField={
                      updateMenuField
                    }

                    addMenuItem={
                      addMenuItem
                    }

                    deleteMenuItem={
                      deleteMenuItem
                    }

                    uploadMenuPhoto={
                      uploadMenuPhoto
                    }

                    saving={
                      saving
                    }
                  />
                )
              }

            </>
          )
        }

      </main>

    </div>
  );
}


/* ============================================================
   OVERVIEW
============================================================ */

function Overview({
  restaurant,
  setActiveTab,
}) {

  return (

    <div className="partner-overview">

      <section className="partner-hero-card">

        <div>

          <span>
            YOUR RESTAURANT
          </span>

          <h2>
            {restaurant.name}
          </h2>

          <p>
            {
              [
                restaurant.locality,
                restaurant.city,
              ]
                .filter(Boolean)
                .join(", ")
              ||
              "Add your location"
            }
          </p>

        </div>


        {
          restaurant.image_url
            ? (
                <img
                  src={
                    restaurant.image_url
                  }
                  alt={
                    restaurant.name
                  }
                />
              )
            : (
                <div className="partner-hero-placeholder">
                  <Store size={36} />
                </div>
              )
        }

      </section>


      <div className="partner-stat-grid">

        <StatCard
          icon={
            <Camera size={21} />
          }
          value={
            restaurant.images
              ?.length ||
            0
          }
          label="Gallery photos"
        />

        <StatCard
          icon={
            <Utensils size={21} />
          }
          value={
            restaurant.menu_items
              ?.length ||
            0
          }
          label="Menu items"
        />

        <StatCard
          icon={
            <MapPin size={21} />
          }
          value={
            restaurant.city ||
            "—"
          }
          label="Location"
        />

        <StatCard
          icon={
            <Clock3 size={21} />
          }
          value={
            restaurant.opening_time
              ? restaurant.opening_time
                  .slice(0, 5)
              : "—"
          }
          label="Opening time"
        />

      </div>


      <section className="partner-next-steps">

        <div>

          <span>
            QUICK SETUP
          </span>

          <h3>
            Make your page stand out.
          </h3>

        </div>


        <button
          onClick={() =>
            setActiveTab(
              "photos"
            )
          }
        >
          <Camera size={20} />

          <div>
            <strong>
              Add restaurant photos
            </strong>

            <span>
              Show people the food,
              ambience and experience.
            </span>
          </div>
        </button>


        <button
          onClick={() =>
            setActiveTab(
              "menu"
            )
          }
        >
          <Utensils size={20} />

          <div>
            <strong>
              Build your menu
            </strong>

            <span>
              Add dishes, prices and
              individual food photos.
            </span>
          </div>
        </button>

      </section>

    </div>
  );
}


function StatCard({
  icon,
  value,
  label,
}) {

  return (
    <article className="partner-stat">

      <div>
        {icon}
      </div>

      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>

    </article>
  );
}


/* ============================================================
   RESTAURANT FORM
============================================================ */

function RestaurantForm({
  title,
  subtitle,
  form,
  updateField,
  onSubmit,
  saving,
  submitText,
  onCancel,
}) {

  return (

    <form
      className="partner-editor"
      onSubmit={
        onSubmit
      }
    >

      <div className="partner-section-heading">

        <div>

          <h2>
            {title}
          </h2>

          <p>
            {subtitle}
          </p>

        </div>

      </div>


      <div className="partner-form-card">

        <h3>
          Basic information
        </h3>


        <div className="partner-grid two">

          <Field
            label="Restaurant name"
          >
            <input
              value={
                form.name ||
                ""
              }
              required
              onChange={
                event =>
                  updateField(
                    "name",
                    event.target.value
                  )
              }
              placeholder="Eg. Malabar Table"
            />
          </Field>


          <Field
            label="Restaurant type"
          >

            <select
              value={
                form.restaurant_type ||
                "restaurant"
              }
              onChange={
                event =>
                  updateField(
                    "restaurant_type",
                    event.target.value
                  )
              }
            >
              <option value="restaurant">
                Restaurant
              </option>

              <option value="cafe">
                Cafe
              </option>

              <option value="hotel">
                Hotel
              </option>
            </select>

          </Field>


          <Field
            label="Cuisine"
          >

            <select
              value={
                form.cuisine ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "cuisine",
                    event.target.value
                  )
              }
            >

              <option value="">
                Choose cuisine
              </option>

              {
                CUISINES.map(
                  (
                    [
                      value,
                      name,
                    ]
                  ) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {name}
                    </option>
                  )
                )
              }

            </select>

          </Field>


          <Field
            label="Price range"
          >

            <select
              value={
                form.price_range ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "price_range",
                    event.target.value
                  )
              }
            >

              <option value="">
                Select
              </option>

              <option value="budget">
                Budget
              </option>

              <option value="moderate">
                Moderate
              </option>

              <option value="premium">
                Premium
              </option>

            </select>

          </Field>

        </div>


        <Field
          label="Tell people about your restaurant"
        >

          <textarea
            rows={5}
            value={
              form.description ||
              ""
            }
            onChange={
              event =>
                updateField(
                  "description",
                  event.target.value
                )
            }
            placeholder="What makes your food or experience special?"
          />

        </Field>

      </div>


      <div className="partner-form-card">

        <h3>
          Contact
        </h3>

        <div className="partner-grid three">

          <Field label="Phone">
            <input
              value={
                form.phone_number ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "phone_number",
                    event.target.value
                  )
              }
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={
                form.email ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "email",
                    event.target.value
                  )
              }
            />
          </Field>

          <Field label="Website">
            <input
              value={
                form.website ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "website",
                    event.target.value
                  )
              }
            />
          </Field>

        </div>

      </div>


      <div className="partner-form-card">

        <h3>
          Location
        </h3>

        <Field
          label="Full address"
        >
          <textarea
            rows={3}
            value={
              form.address ||
              ""
            }
            onChange={
              event =>
                updateField(
                  "address",
                  event.target.value
                )
            }
          />
        </Field>


        <div className="partner-grid three">

          <Field label="Locality">
            <input
              value={
                form.locality ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "locality",
                    event.target.value
                  )
              }
            />
          </Field>

          <Field label="City">
            <input
              value={
                form.city ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "city",
                    event.target.value
                  )
              }
            />
          </Field>

          <Field label="Pincode">
            <input
              value={
                form.pincode ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "pincode",
                    event.target.value
                  )
              }
            />
          </Field>

        </div>

      </div>


      <div className="partner-form-card">

        <h3>
          Restaurant details
        </h3>

        <div className="partner-grid three">

          <Field
            label="Average cost for two"
          >
            <div className="partner-input-icon">
              <IndianRupee size={16} />
              <input
                type="number"
                min="0"
                value={
                  form.average_cost_for_two ||
                  ""
                }
                onChange={
                  event =>
                    updateField(
                      "average_cost_for_two",
                      event.target.value
                    )
                }
              />
            </div>
          </Field>


          <Field
            label="Seating capacity"
          >
            <input
              type="number"
              min="1"
              value={
                form.seating_capacity ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "seating_capacity",
                    event.target.value
                  )
              }
            />
          </Field>

        </div>


        <div className="partner-grid two">

          <Field
            label="Opening time"
          >
            <input
              type="time"
              value={
                form.opening_time
                  ?.slice(
                    0,
                    5
                  ) ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "opening_time",
                    event.target.value
                  )
              }
            />
          </Field>


          <Field
            label="Closing time"
          >
            <input
              type="time"
              value={
                form.closing_time
                  ?.slice(
                    0,
                    5
                  ) ||
                ""
              }
              onChange={
                event =>
                  updateField(
                    "closing_time",
                    event.target.value
                  )
              }
            />
          </Field>

        </div>

      </div>


      <div className="partner-form-card">

        <h3>
          Facilities
        </h3>

        <div className="partner-toggle-grid">

          <Toggle
            label="Parking"
            checked={
              form.has_parking
            }
            onChange={
              value =>
                updateField(
                  "has_parking",
                  value
                )
            }
          />

          <Toggle
            label="Wi-Fi"
            checked={
              form.has_wifi
            }
            onChange={
              value =>
                updateField(
                  "has_wifi",
                  value
                )
            }
          />

          <Toggle
            label="Accepts cards"
            checked={
              form.accepts_cards
            }
            onChange={
              value =>
                updateField(
                  "accepts_cards",
                  value
                )
            }
          />

          <Toggle
            label="Family friendly"
            checked={
              form.family_friendly
            }
            onChange={
              value =>
                updateField(
                  "family_friendly",
                  value
                )
            }
          />

          <Toggle
            label="Outdoor seating"
            checked={
              form.outdoor_seating
            }
            onChange={
              value =>
                updateField(
                  "outdoor_seating",
                  value
                )
            }
          />

          <Toggle
            label="Wheelchair accessible"
            checked={
              form.wheelchair_accessible
            }
            onChange={
              value =>
                updateField(
                  "wheelchair_accessible",
                  value
                )
            }
          />

          <Toggle
            label="Vegetarian"
            checked={
              form.serves_vegetarian
            }
            onChange={
              value =>
                updateField(
                  "serves_vegetarian",
                  value
                )
            }
          />

          <Toggle
            label="Non vegetarian"
            checked={
              form.serves_non_vegetarian
            }
            onChange={
              value =>
                updateField(
                  "serves_non_vegetarian",
                  value
                )
            }
          />

        </div>

      </div>


      <div className="partner-save-bar">

        {
          onCancel &&
          (
            <button
              type="button"
              className="partner-secondary"
              onClick={
                onCancel
              }
            >
              Cancel
            </button>
          )
        }


        <button
          type="submit"
          disabled={
            saving
          }
          className="partner-primary"
        >

          <Save size={18} />

          {
            saving
              ? "Saving..."
              : submitText
          }

        </button>

      </div>

    </form>
  );
}


function Field({
  label,
  children,
}) {

  return (
    <label className="partner-field">

      <span>
        {label}
      </span>

      {children}

    </label>
  );
}


function Toggle({
  label,
  checked,
  onChange,
}) {

  return (

    <label className="partner-toggle">

      <input
        type="checkbox"
        checked={
          Boolean(
            checked
          )
        }
        onChange={
          event =>
            onChange(
              event.target.checked
            )
        }
      />

      <span className="partner-toggle-ui" />

      <strong>
        {label}
      </strong>

    </label>
  );
}


/* ============================================================
   PHOTOS
============================================================ */

function PhotosSection({
  restaurant,
  uploadMainPhoto,
  uploadGalleryPhotos,
  deletePhoto,
}) {

  return (

    <section>

      <div className="partner-section-heading">

        <div>

          <h2>
            Restaurant photos
          </h2>

          <p>
            Show the food, ambience,
            interiors and experience.
          </p>

        </div>

      </div>


      <div className="partner-photo-main-card">

        {
          restaurant.image_url
            ? (
                <img
                  src={
                    restaurant.image_url
                  }
                  alt="Restaurant"
                />
              )
            : (
                <div className="partner-photo-main-empty">
                  <ImagePlus size={34} />
                </div>
              )
        }


        <div>

          <span>
            COVER PHOTO
          </span>

          <h3>
            Your restaurant's first impression.
          </h3>

          <p>
            Use a clear landscape image
            of your restaurant or signature food.
          </p>


          <label className="partner-upload-button">

            <Upload size={17} />

            {
              restaurant.image_url
                ? "Change cover photo"
                : "Upload cover photo"
            }

            <input
              hidden
              type="file"
              accept="image/*"
              onChange={
                uploadMainPhoto
              }
            />

          </label>

        </div>

      </div>


      <div className="partner-gallery-header">

        <div>

          <h3>
            Gallery
          </h3>

          <p>
            Add as many restaurant photos as you need.
          </p>

        </div>


        <label className="partner-primary">

          <ImagePlus size={17} />

          Add Photos

          <input
            hidden
            multiple
            type="file"
            accept="image/*"
            onChange={
              uploadGalleryPhotos
            }
          />

        </label>

      </div>


      <div className="partner-gallery">

        {
          (
            restaurant.images ||
            []
          ).map(
            image => (

              <article
                key={
                  image.id
                }
                className="partner-gallery-item"
              >

                <img
                  src={
                    image.image_url
                  }
                  alt={
                    image.caption ||
                    restaurant.name
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    deletePhoto(
                      image.id
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>

              </article>
            )
          )
        }


        <label className="partner-add-photo-tile">

          <Plus size={27} />

          <span>
            Add photos
          </span>

          <input
            hidden
            multiple
            type="file"
            accept="image/*"
            onChange={
              uploadGalleryPhotos
            }
          />

        </label>

      </div>

    </section>
  );
}


/* ============================================================
   MENU
============================================================ */

function MenuSection({
  restaurant,
  menuForm,
  updateMenuField,
  addMenuItem,
  deleteMenuItem,
  uploadMenuPhoto,
  saving,
}) {

  return (

    <section>

      <div className="partner-section-heading">

        <div>

          <h2>
            Your menu
          </h2>

          <p>
            Add dishes, prices and photos.
          </p>

        </div>

        <span className="partner-menu-count">
          {
            restaurant.menu_items
              ?.length ||
            0
          } items
        </span>

      </div>


      <form
        className="partner-menu-create"
        onSubmit={
          addMenuItem
        }
      >

        <div>

          <span>
            ADD DISH
          </span>

          <h3>
            Create a menu item
          </h3>

        </div>


        <div className="partner-grid two">

          <Field label="Dish name">
            <input
              required
              value={
                menuForm.name
              }
              onChange={
                event =>
                  updateMenuField(
                    "name",
                    event.target.value
                  )
              }
              placeholder="Eg. Masala Dosa"
            />
          </Field>


          <Field label="Price">

            <div className="partner-input-icon">

              <IndianRupee size={16} />

              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={
                  menuForm.price
                }
                onChange={
                  event =>
                    updateMenuField(
                      "price",
                      event.target.value
                    )
                }
              />

            </div>

          </Field>


          <Field label="Category">

            <select
              value={
                menuForm.category
              }
              onChange={
                event =>
                  updateMenuField(
                    "category",
                    event.target.value
                  )
              }
            >
              <option value="starter">
                Starter
              </option>

              <option value="main_course">
                Main Course
              </option>

              <option value="bread">
                Bread
              </option>

              <option value="rice">
                Rice
              </option>

              <option value="dessert">
                Dessert
              </option>

              <option value="beverage">
                Beverage
              </option>

              <option value="snack">
                Snack
              </option>

              <option value="other">
                Other
              </option>

            </select>

          </Field>


          <Field label="Food type">

            <select
              value={
                menuForm.food_type
              }
              onChange={
                event =>
                  updateMenuField(
                    "food_type",
                    event.target.value
                  )
              }
            >
              <option value="vegetarian">
                Vegetarian
              </option>

              <option value="non_vegetarian">
                Non Vegetarian
              </option>

              <option value="vegan">
                Vegan
              </option>

              <option value="egg">
                Egg
              </option>
            </select>

          </Field>

        </div>


        <Field label="Description">

          <textarea
            rows={3}
            value={
              menuForm.description
            }
            onChange={
              event =>
                updateMenuField(
                  "description",
                  event.target.value
                )
            }
          />

        </Field>


        <div className="partner-menu-flags">

          <Toggle
            label="Popular dish"
            checked={
              menuForm.is_popular
            }
            onChange={
              value =>
                updateMenuField(
                  "is_popular",
                  value
                )
            }
          />

          <Toggle
            label="Available"
            checked={
              menuForm.is_available
            }
            onChange={
              value =>
                updateMenuField(
                  "is_available",
                  value
                )
            }
          />

        </div>


        <button
          className="partner-primary"
          disabled={
            saving
          }
          type="submit"
        >

          <Plus size={18} />
          Add menu item

        </button>

      </form>


      <div className="partner-menu-list">

        {
          (
            restaurant.menu_items ||
            []
          ).map(
            item => (

              <article
                className="partner-menu-row"
                key={
                  item.id
                }
              >

                <div className="partner-menu-photo">

                  {
                    item.image_url
                      ? (
                          <img
                            src={
                              item.image_url
                            }
                            alt={
                              item.name
                            }
                          />
                        )
                      : (
                          <Utensils size={22} />
                        )
                  }


                  <label>

                    <Camera size={14} />

                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={
                        event => {

                          const file =
                            event
                              .target
                              .files?.[0];

                          event.target.value =
                            "";

                          uploadMenuPhoto(
                            item.id,
                            file
                          );
                        }
                      }
                    />

                  </label>

                </div>


                <div className="partner-menu-copy">

                  <div>

                    <strong>
                      {item.name}
                    </strong>

                    {
                      item.is_popular &&
                      (
                        <span className="partner-popular">
                          Popular
                        </span>
                      )
                    }

                  </div>

                  <p>
                    {
                      item.description ||
                      "No description added."
                    }
                  </p>

                  <small>
                    {
                      item.category
                        ?.replaceAll(
                          "_",
                          " "
                        )
                    }
                    {" • "}
                    {
                      item.food_type
                        ?.replaceAll(
                          "_",
                          " "
                        )
                    }
                  </small>

                </div>


                <div className="partner-menu-price">

                  <strong>
                    ₹{item.price}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      deleteMenuItem(
                        item.id
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>

                </div>

              </article>
            )
          )
        }

      </div>

    </section>
  );
}