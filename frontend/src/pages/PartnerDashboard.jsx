import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Camera,
  Check,
  ChefHat,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Store,
  Trash2,
  Upload,
  Utensils,
  X,
} from "lucide-react";

import api from "../api";


const EMPTY_RESTAURANT = {
  name: "",
  restaurant_type: "restaurant",
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
  outdoor_seating: false,
  wheelchair_accessible: false,
  serves_vegetarian: true,
  serves_non_vegetarian: true,
  accepts_foodkindl_booking: false,
};


const EMPTY_MENU_FORM = {
  name: "",
  description: "",
  category: "main_course",
  food_type: "vegetarian",
  price: "",
  is_popular: false,
  is_available: true,
};


const CATEGORY_OPTIONS = [
  ["starter", "Starter"],
  ["main_course", "Main Course"],
  ["bread", "Bread"],
  ["rice", "Rice"],
  ["dessert", "Dessert"],
  ["beverage", "Beverage"],
  ["snack", "Snack"],
  ["other", "Other"],
];


const FOOD_TYPE_OPTIONS = [
  ["vegetarian", "Vegetarian"],
  ["non_vegetarian", "Non Vegetarian"],
  ["vegan", "Vegan"],
  ["egg", "Egg"],
];


const CUISINE_OPTIONS = [
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
  ["kashmiri", "Kashmiri"],
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
  ["middle_eastern", "Middle Eastern"],
  ["lebanese", "Lebanese"],
  ["biryani", "Biryani"],
  ["seafood", "Seafood"],
  ["street_food", "Street Food"],
  ["fast_food", "Fast Food"],
  ["cafe", "Cafe"],
  ["bakery", "Bakery"],
  ["desserts", "Desserts"],
  ["barbecue", "Barbecue / Grill"],
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["jain", "Jain"],
  ["multi_cuisine", "Multi Cuisine"],
  ["other", "Other"],
];


function getErrorMessage(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return String(data.detail);
  }

  if (data.error) {
    return String(data.error);
  }

  if (data.message) {
    return String(data.message);
  }

  const parts = [];

  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      parts.push(`${key}: ${value.join(", ")}`);
    } else if (value !== null && value !== undefined) {
      parts.push(`${key}: ${String(value)}`);
    }
  });

  return parts.length ? parts.join(" | ") : fallback;
}


function Switch({
  checked,
  onChange,
  label,
}) {
  return (
    <button
      type="button"
      className={`pd-switch-wrap ${checked ? "active" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="pd-switch">
        <span className="pd-switch-knob" />
      </span>

      <span>{label}</span>
    </button>
  );
}


export default function PartnerDashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [restaurantForm, setRestaurantForm] = useState(
    EMPTY_RESTAURANT
  );

  const [menuItems, setMenuItems] = useState([]);
  const [gallery, setGallery] = useState([]);

  const [menuForm, setMenuForm] = useState(
    EMPTY_MENU_FORM
  );

  const [menuImage, setMenuImage] = useState(null);
  const [menuImagePreview, setMenuImagePreview] =
    useState("");

  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingRestaurant, setSavingRestaurant] =
    useState(false);

  const [addingMenu, setAddingMenu] = useState(false);
  const [uploadingCover, setUploadingCover] =
    useState(false);
  const [uploadingGallery, setUploadingGallery] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const menuFileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);
  const galleryFileInputRef = useRef(null);


  // ==========================================================
  // API URLs
  // ==========================================================

  const restaurantId = restaurant?.id;

  const urls = useMemo(() => {
    return {
      restaurants:
        "/partner/restaurants/",

      restaurant:
        restaurantId
          ? `/partner/restaurants/${restaurantId}/`
          : null,

      cover:
        restaurantId
          ? `/partner/restaurants/${restaurantId}/main-photo/`
          : null,

      gallery:
        restaurantId
          ? `/partner/restaurants/${restaurantId}/photos/`
          : null,

      menu:
        restaurantId
          ? `/partner/restaurants/${restaurantId}/menu/`
          : null,
    };
  }, [restaurantId]);


  // ==========================================================
  // ALERTS
  // ==========================================================

  const clearAlerts = () => {
    setMessage("");
    setError("");
  };


  // ==========================================================
  // LOAD RESTAURANT
  // ==========================================================

  const loadRestaurant = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/partner/restaurants/"
      );

      const data = response.data;

      let firstRestaurant = null;

      if (Array.isArray(data)) {
        firstRestaurant = data[0] || null;
      } else if (Array.isArray(data?.results)) {
        firstRestaurant = data.results[0] || null;
      } else if (data?.id) {
        firstRestaurant = data;
      }

      if (!firstRestaurant) {
        setRestaurant(null);
        setRestaurantForm(EMPTY_RESTAURANT);
        setMenuItems([]);
        setGallery([]);
        return;
      }

      setRestaurant(firstRestaurant);

      setRestaurantForm({
        ...EMPTY_RESTAURANT,
        ...firstRestaurant,
      });

      setGallery(
        Array.isArray(firstRestaurant.images)
          ? firstRestaurant.images
          : []
      );

      setMenuItems(
        Array.isArray(firstRestaurant.menu_items)
          ? firstRestaurant.menu_items
          : []
      );

    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Unable to load restaurant."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);


  // ==========================================================
  // LOAD MENU
  // ==========================================================

  const loadMenu = useCallback(async () => {
    if (!restaurantId) {
      return;
    }

    try {
      const response = await api.get(
        `/partner/restaurants/${restaurantId}/menu/`
      );

      const data = response.data;

      if (Array.isArray(data)) {
        setMenuItems(data);
      } else if (Array.isArray(data?.results)) {
        setMenuItems(data.results);
      }
    } catch (err) {
      console.error(
        "Unable to load menu:",
        err
      );
    }
  }, [restaurantId]);


  // ==========================================================
  // LOAD GALLERY
  // ==========================================================

  const loadGallery = useCallback(async () => {
    if (!restaurantId) {
      return;
    }

    try {
      const response = await api.get(
        `/partner/restaurants/${restaurantId}/photos/`
      );

      const data = response.data;

      if (Array.isArray(data)) {
        setGallery(data);
      } else if (Array.isArray(data?.results)) {
        setGallery(data.results);
      }
    } catch (err) {
      console.error(
        "Unable to load gallery:",
        err
      );
    }
  }, [restaurantId]);


  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);


  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    loadMenu();
    loadGallery();
  }, [
    restaurantId,
    loadMenu,
    loadGallery,
  ]);


  // ==========================================================
  // RESTAURANT FORM
  // ==========================================================

  const updateRestaurantField = (
    field,
    value
  ) => {
    setRestaurantForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };


  const saveRestaurant = async (event) => {
    event.preventDefault();

    clearAlerts();

    try {
      setSavingRestaurant(true);

      if (restaurantId) {
        const response = await api.patch(
          urls.restaurant,
          restaurantForm
        );

        setRestaurant(response.data);

        setRestaurantForm({
          ...EMPTY_RESTAURANT,
          ...response.data,
        });

        setMessage(
          "Restaurant details updated."
        );
      } else {
        const response = await api.post(
          urls.restaurants,
          restaurantForm
        );

        setRestaurant(response.data);

        setRestaurantForm({
          ...EMPTY_RESTAURANT,
          ...response.data,
        });

        setMessage(
          "Restaurant created successfully."
        );
      }

    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Unable to save restaurant."
        )
      );
    } finally {
      setSavingRestaurant(false);
    }
  };


  // ==========================================================
  // COVER PHOTO
  // ==========================================================

  const handleCoverSelection = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverImage(file);
    setCoverPreview(
      URL.createObjectURL(file)
    );
  };


  const uploadCoverPhoto = async () => {
    if (!restaurantId || !coverImage) {
      return;
    }

    clearAlerts();

    try {
      setUploadingCover(true);

      const formData = new FormData();

      formData.append(
        "image",
        coverImage
      );

      const response = await api.post(
        urls.cover,
        formData
      );

      setRestaurant((prev) => ({
        ...prev,
        ...response.data,
      }));

      setRestaurantForm((prev) => ({
        ...prev,
        ...response.data,
      }));

      setMessage(
        "Cover photo uploaded successfully."
      );

      setCoverImage(null);

      if (coverPreview) {
        URL.revokeObjectURL(
          coverPreview
        );
      }

      setCoverPreview("");

      if (coverFileInputRef.current) {
        coverFileInputRef.current.value =
          "";
      }

      await loadRestaurant();

    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Cover photo upload failed."
        )
      );
    } finally {
      setUploadingCover(false);
    }
  };


  // ==========================================================
  // GALLERY PHOTOS
  // ==========================================================

  const handleGalleryUpload = async (
    event
  ) => {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    if (
      !restaurantId ||
      selectedFiles.length === 0
    ) {
      return;
    }

    clearAlerts();

    try {
      setUploadingGallery(true);

      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append(
          "images",
          file
        );
      });

      await api.post(
        urls.gallery,
        formData
      );

      setMessage(
        "Gallery photos uploaded successfully."
      );

      await loadGallery();

    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Gallery upload failed."
        )
      );
    } finally {
      setUploadingGallery(false);

      if (
        galleryFileInputRef.current
      ) {
        galleryFileInputRef.current.value =
          "";
      }
    }
  };


  const deleteGalleryImage = async (
    imageId
  ) => {
    if (!restaurantId || !imageId) {
      return;
    }

    if (
      !window.confirm(
        "Remove this restaurant photo?"
      )
    ) {
      return;
    }

    clearAlerts();

    try {
      await api.delete(
        `/partner/restaurants/${restaurantId}/photos/${imageId}/`
      );

      setGallery((prev) =>
        prev.filter(
          (item) => item.id !== imageId
        )
      );

      setMessage(
        "Photo removed."
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to remove photo."
        )
      );
    }
  };


  // ==========================================================
  // MENU FORM
  // ==========================================================

  const updateMenuField = (
    field,
    value
  ) => {
    setMenuForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };


  const handleMenuImageSelection = (
    event
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please select a JPG, PNG or WebP image."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(
        "Dish photo is too large. Maximum size is 10 MB."
      );
      event.target.value = "";
      return;
    }

    clearAlerts();

    if (menuImagePreview) {
      URL.revokeObjectURL(
        menuImagePreview
      );
    }

    setMenuImage(file);

    setMenuImagePreview(
      URL.createObjectURL(file)
    );
  };


  const removeSelectedMenuImage = () => {
    if (menuImagePreview) {
      URL.revokeObjectURL(
        menuImagePreview
      );
    }

    setMenuImage(null);
    setMenuImagePreview("");

    if (menuFileInputRef.current) {
      menuFileInputRef.current.value =
        "";
    }
  };


  // ==========================================================
  // CREATE MENU ITEM + PHOTO
  // ==========================================================

  const handleAddMenuItem = async (event) => {
    event.preventDefault();

    if (!restaurantId) {
      setError(
        "Create your restaurant before adding menu items."
      );
      return;
    }

    if (!menuForm.name.trim()) {
      setError("Please enter the dish name.");
      return;
    }

    if (
      menuForm.price === "" ||
      Number(menuForm.price) < 0
    ) {
      setError("Please enter a valid dish price.");
      return;
    }

    clearAlerts();

    const selectedImage = menuImage;

    try {
      setAddingMenu(true);

      const createResponse = await api.post(
        `/partner/restaurants/${restaurantId}/menu/`,
        {
          name: menuForm.name.trim(),
          description: menuForm.description.trim(),
          category: menuForm.category,
          food_type: menuForm.food_type,
          price: menuForm.price,
          is_popular: menuForm.is_popular,
          is_available: menuForm.is_available,
        }
      );

      const createdItem = createResponse?.data;

      if (!createdItem?.id) {
        throw new Error(
          "Menu item was created but the API did not return its ID."
        );
      }

      if (selectedImage) {
        const photoForm = new FormData();
        photoForm.append("image", selectedImage);

        await api.post(
          `/partner/restaurants/${restaurantId}/menu/${createdItem.id}/photo/`,
          photoForm
        );
      }

      setMenuForm({
        ...EMPTY_MENU_FORM,
      });

      if (menuImagePreview) {
        URL.revokeObjectURL(menuImagePreview);
      }

      setMenuImage(null);
      setMenuImagePreview("");

      if (menuFileInputRef.current) {
        menuFileInputRef.current.value = "";
      }

      setMessage(
        selectedImage
          ? "Menu item and photo added successfully."
          : "Menu item added successfully."
      );

      await loadMenu();
    } catch (err) {
      console.error(
        "MENU ITEM ERROR:",
        err?.response?.status,
        err?.response?.data,
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to add menu item."
        )
      );
    } finally {
      setAddingMenu(false);
    }
  };


  // ==========================================================
  // MENU ITEM DELETE
  // ==========================================================

  const deleteMenuItem = async (
    menuId
  ) => {
    if (!restaurantId || !menuId) {
      return;
    }

    if (
      !window.confirm(
        "Delete this menu item?"
      )
    ) {
      return;
    }

    clearAlerts();

    try {
      await api.delete(
        `/partner/restaurants/${restaurantId}/menu/${menuId}/`
      );

      setMenuItems((prev) =>
        prev.filter(
          (item) => item.id !== menuId
        )
      );

      setMessage(
        "Menu item deleted."
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to delete menu item."
        )
      );
    }
  };


  // ==========================================================
  // CHANGE EXISTING MENU PHOTO
  // ==========================================================

  const replaceMenuPhoto = async (
    menuId,
    file
  ) => {
    if (
      !restaurantId ||
      !menuId ||
      !file
    ) {
      return;
    }

    clearAlerts();

    try {
      const formData =
        new FormData();

      formData.append(
        "image",
        file
      );

      await api.post(
        `/partner/restaurants/${restaurantId}/menu/${menuId}/photo/`,
        formData
      );

      setMessage(
        "Dish photo updated."
      );

      await loadMenu();

    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Dish photo upload failed."
        )
      );
    }
  };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="pd-loading">
        <Loader2
          size={32}
          className="pd-spin"
        />

        <span>
          Loading your restaurant...
        </span>
      </div>
    );
  }


  return (
    <div className="pd-page">

      {/* ==================================================== */}
      {/* HEADER */}
      {/* ==================================================== */}

      <header className="pd-header">
        <div>
          <div className="pd-eyebrow">
            RESTAURANT PARTNER STUDIO
          </div>

          <h1>
            {restaurant?.name ||
              "Build your restaurant"}
          </h1>

          <p>
            Manage your restaurant,
            photos and menu from one
            place.
          </p>
        </div>

        <button
          type="button"
          className="pd-secondary-button"
          onClick={() => {
            loadRestaurant();
            loadMenu();
            loadGallery();
          }}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>


      {/* ==================================================== */}
      {/* ALERTS */}
      {/* ==================================================== */}

      {message && (
        <div className="pd-alert success">
          <Check size={18} />
          <span>{message}</span>

          <button
            type="button"
            onClick={() =>
              setMessage("")
            }
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div className="pd-alert error">
          <X size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            <X size={17} />
          </button>
        </div>
      )}


      {/* ==================================================== */}
      {/* RESTAURANT INFORMATION */}
      {/* ==================================================== */}

      <section className="pd-section">

        <div className="pd-section-title">
          <Store size={22} />

          <div>
            <h2>
              Restaurant details
            </h2>

            <p>
              Keep your restaurant
              information accurate.
            </p>
          </div>
        </div>

        <form
          onSubmit={saveRestaurant}
          className="pd-card"
        >
          <div className="pd-grid two">

            <label>
              Restaurant name
              <input
                value={
                  restaurantForm.name
                }
                onChange={(e) =>
                  updateRestaurantField(
                    "name",
                    e.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Restaurant type
              <select
                value={
                  restaurantForm.restaurant_type
                }
                onChange={(e) =>
                  updateRestaurantField(
                    "restaurant_type",
                    e.target.value
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
            </label>

            <label>
              Cuisine
              <select
                value={
                  restaurantForm.cuisine ||
                  ""
                }
                onChange={(e) =>
                  updateRestaurantField(
                    "cuisine",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select cuisine
                </option>

                {CUISINE_OPTIONS.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Phone
              <input
                value={
                  restaurantForm.phone_number ||
                  ""
                }
                onChange={(e) =>
                  updateRestaurantField(
                    "phone_number",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={
                  restaurantForm.email ||
                  ""
                }
                onChange={(e) =>
                  updateRestaurantField(
                    "email",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Website
              <input
                value={
                  restaurantForm.website ||
                  ""
                }
                onChange={(e) =>
                  updateRestaurantField(
                    "website",
                    e.target.value
                  )
                }
              />
            </label>
          </div>

          <label>
            Description
            <textarea
              rows={4}
              value={
                restaurantForm.description ||
                ""
              }
              onChange={(e) =>
                updateRestaurantField(
                  "description",
                  e.target.value
                )
              }
            />
          </label>


          <div className="pd-subheading">
            <MapPin size={18} />
            Location
          </div>

          <label>
            Address
            <textarea
              rows={3}
              value={
                restaurantForm.address ||
                ""
              }
              onChange={(e) =>
                updateRestaurantField(
                  "address",
                  e.target.value
                )
              }
            />
          </label>

          <div className="pd-grid three">
            <label>
              Locality
              <input
                value={
                  restaurantForm.locality ||
                  ""
                }
                onChange={(e) =>
                  updateRestaurantField(
                    "locality",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              City
              <input
                value={
                  restaurantForm.city ||
                  ""
                }
                onChange={(e) =>
                  updateRestaurantField(
                    "city",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Pincode
              <input
                value={
                  restaurantForm.pincode ||
                  ""
                }
                onChange={(e) =>
                  updateRestaurantField(
                    "pincode",
                    e.target.value
                  )
                }
              />
            </label>
          </div>

          {restaurant && (
            <div className="pd-coordinate-row">
              <span>
                Latitude:{" "}
                {restaurant.latitude ||
                  "Waiting for location"}
              </span>

              <span>
                Longitude:{" "}
                {restaurant.longitude ||
                  "Waiting for location"}
              </span>
            </div>
          )}

          <button
            type="submit"
            className="pd-primary-button"
            disabled={
              savingRestaurant
            }
          >
            {savingRestaurant ? (
              <>
                <Loader2
                  size={17}
                  className="pd-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <Check size={17} />
                Save restaurant
              </>
            )}
          </button>
        </form>
      </section>


      {/* ==================================================== */}
      {/* PHOTOS */}
      {/* ==================================================== */}

      {restaurantId && (
        <section className="pd-section">

          <div className="pd-section-title">
            <ImagePlus size={22} />

            <div>
              <h2>
                Restaurant photos
              </h2>

              <p>
                Show your food,
                ambience and experience.
              </p>
            </div>
          </div>


          {/* COVER */}

          <div className="pd-cover-card">

            <div className="pd-cover-preview">
              {coverPreview ||
              restaurant?.image_url ? (
                <img
                  src={
                    coverPreview ||
                    restaurant.image_url
                  }
                  alt="Restaurant cover"
                />
              ) : (
                <ImagePlus size={46} />
              )}
            </div>

            <div className="pd-cover-content">
              <span className="pd-orange-label">
                COVER PHOTO
              </span>

              <h3>
                Your restaurant’s first
                impression.
              </h3>

              <p>
                Use a clear landscape
                image of your restaurant
                or signature food.
              </p>

              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={
                  handleCoverSelection
                }
              />

              <div className="pd-action-row">

                <button
                  type="button"
                  className="pd-dark-button"
                  onClick={() =>
                    coverFileInputRef.current?.click()
                  }
                >
                  <Upload size={17} />
                  Select cover photo
                </button>

                {coverImage && (
                  <button
                    type="button"
                    className="pd-orange-button"
                    onClick={
                      uploadCoverPhoto
                    }
                    disabled={
                      uploadingCover
                    }
                  >
                    {uploadingCover ? (
                      <Loader2
                        size={17}
                        className="pd-spin"
                      />
                    ) : (
                      <Upload size={17} />
                    )}

                    Upload
                  </button>
                )}

              </div>
            </div>
          </div>


          {/* GALLERY */}

          <div className="pd-gallery-header">
            <div>
              <h3>Gallery</h3>
              <p>
                Add as many restaurant
                photos as you need.
              </p>
            </div>

            <input
              ref={
                galleryFileInputRef
              }
              type="file"
              multiple
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={
                handleGalleryUpload
              }
            />

            <button
              type="button"
              className="pd-orange-button"
              onClick={() =>
                galleryFileInputRef.current?.click()
              }
              disabled={
                uploadingGallery
              }
            >
              {uploadingGallery ? (
                <Loader2
                  size={17}
                  className="pd-spin"
                />
              ) : (
                <ImagePlus size={17} />
              )}

              Add Photos
            </button>
          </div>

          <div className="pd-gallery-grid">

            {gallery.map((image) => (
              <div
                className="pd-gallery-item"
                key={image.id}
              >
                <img
                  src={
                    image.image_url ||
                    image.url
                  }
                  alt={
                    image.caption ||
                    "Restaurant"
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    deleteGalleryImage(
                      image.id
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="pd-add-photo-card"
              onClick={() =>
                galleryFileInputRef.current?.click()
              }
            >
              <Plus size={30} />
              <span>Add photos</span>
            </button>

          </div>
        </section>
      )}


      {/* ==================================================== */}
      {/* MENU */}
      {/* ==================================================== */}

      {restaurantId && (
        <section className="pd-section">

          <div className="pd-section-title">
            <Utensils size={22} />

            <div>
              <h2>Your menu</h2>

              <p>
                Add dishes, prices and
                photos.
              </p>
            </div>
          </div>


          {/* CREATE MENU ITEM */}

          <form
            className="pd-card pd-menu-form"
            onSubmit={
              handleAddMenuItem
            }
          >
            <span className="pd-orange-label">
              ADD DISH
            </span>

            <h3>
              Create a menu item
            </h3>


            <div className="pd-grid two">

              <label>
                Dish name
                <input
                  placeholder="Eg. Masala Dosa"
                  value={
                    menuForm.name
                  }
                  onChange={(e) =>
                    updateMenuField(
                      "name",
                      e.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                Price
                <div className="pd-price-input">
                  <span>₹</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      menuForm.price
                    }
                    onChange={(e) =>
                      updateMenuField(
                        "price",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>
              </label>

              <label>
                Category
                <select
                  value={
                    menuForm.category
                  }
                  onChange={(e) =>
                    updateMenuField(
                      "category",
                      e.target.value
                    )
                  }
                >
                  {CATEGORY_OPTIONS.map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Food type
                <select
                  value={
                    menuForm.food_type
                  }
                  onChange={(e) =>
                    updateMenuField(
                      "food_type",
                      e.target.value
                    )
                  }
                >
                  {FOOD_TYPE_OPTIONS.map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>


            <label>
              Description
              <textarea
                rows={4}
                value={
                  menuForm.description
                }
                onChange={(e) =>
                  updateMenuField(
                    "description",
                    e.target.value
                  )
                }
              />
            </label>


            {/* ============================================== */}
            {/* DISH PHOTO — NEW */}
            {/* ============================================== */}

            <div className="pd-menu-photo-section">

              <label className="pd-menu-photo-label">
                Dish photo
              </label>

              <p className="pd-menu-photo-help">
                Add a photo of this dish.
                JPG, PNG or WebP.
              </p>

              <input
                ref={menuFileInputRef}
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handleMenuImageSelection
                }
              />

              {!menuImagePreview ? (
                <button
                  type="button"
                  className="pd-menu-photo-picker"
                  onClick={() =>
                    menuFileInputRef.current?.click()
                  }
                >
                  <div className="pd-menu-photo-icon">
                    <Camera size={25} />
                  </div>

                  <div>
                    <strong>
                      Upload dish photo
                    </strong>

                    <span>
                      Choose an image from
                      your device
                    </span>
                  </div>

                  <Upload size={20} />
                </button>
              ) : (
                <div className="pd-selected-menu-image">

                  <img
                    src={
                      menuImagePreview
                    }
                    alt="Dish preview"
                  />

                  <div className="pd-selected-menu-image-info">
                    <strong>
                      {menuImage?.name}
                    </strong>

                    <span>
                      Photo ready to
                      upload
                    </span>

                    <div className="pd-action-row">

                      <button
                        type="button"
                        className="pd-secondary-button"
                        onClick={() =>
                          menuFileInputRef.current?.click()
                        }
                      >
                        <Camera size={16} />
                        Change
                      </button>

                      <button
                        type="button"
                        className="pd-danger-text-button"
                        onClick={
                          removeSelectedMenuImage
                        }
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>

                    </div>
                  </div>
                </div>
              )}
            </div>


            <div className="pd-toggle-row">

              <Switch
                label="Popular dish"
                checked={
                  menuForm.is_popular
                }
                onChange={(value) =>
                  updateMenuField(
                    "is_popular",
                    value
                  )
                }
              />

              <Switch
                label="Available"
                checked={
                  menuForm.is_available
                }
                onChange={(value) =>
                  updateMenuField(
                    "is_available",
                    value
                  )
                }
              />

            </div>


            <button
              type="submit"
              className="pd-full-orange-button"
              disabled={addingMenu}
            >
              {addingMenu ? (
                <>
                  <Loader2
                    size={18}
                    className="pd-spin"
                  />

                  Adding dish...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Add menu item
                </>
              )}
            </button>
          </form>


          {/* MENU LIST */}

          <div className="pd-menu-list">

            {menuItems.map((item) => (
              <article
                key={item.id}
                className="pd-menu-item"
              >

                <div className="pd-menu-item-photo">

                  {item.image_url ? (
                    <img
                      src={
                        item.image_url
                      }
                      alt={item.name}
                    />
                  ) : (
                    <ChefHat size={28} />
                  )}

                  <label className="pd-camera-overlay">
                    <Camera size={15} />

                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(
                        event
                      ) => {
                        const file =
                          event.target
                            .files?.[0];

                        if (file) {
                          replaceMenuPhoto(
                            item.id,
                            file
                          );
                        }

                        event.target.value =
                          "";
                      }}
                    />
                  </label>

                </div>

                <div className="pd-menu-item-content">

                  <div className="pd-menu-title-row">
                    <strong>
                      {item.name}
                    </strong>

                    {item.is_popular && (
                      <span className="pd-popular-badge">
                        Popular
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p>
                      {item.description}
                    </p>
                  )}

                  <div className="pd-menu-meta">
                    {
                      CATEGORY_OPTIONS.find(
                        ([value]) =>
                          value ===
                          item.category
                      )?.[1] ||
                      item.category
                    }

                    {" • "}

                    {
                      FOOD_TYPE_OPTIONS.find(
                        ([value]) =>
                          value ===
                          item.food_type
                      )?.[1] ||
                      item.food_type
                    }

                    {" • ₹"}

                    {item.price}
                  </div>
                </div>

                <button
                  type="button"
                  className="pd-delete-button"
                  onClick={() =>
                    deleteMenuItem(
                      item.id
                    )
                  }
                >
                  <Trash2 size={17} />
                </button>

              </article>
            ))}

          </div>
        </section>
      )}


      <style>{`
        .pd-page {
          min-height: 100vh;
          background: #f7f7f3;
          padding: 34px 44px 80px;
          color: #142721;
          box-sizing: border-box;
        }

        .pd-page * {
          box-sizing: border-box;
        }

        .pd-header {
          max-width: 1400px;
          margin: auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 30px;
        }

        .pd-header h1 {
          margin: 5px 0 8px;
          font-size: 38px;
          line-height: 1.1;
        }

        .pd-header p,
        .pd-section-title p,
        .pd-gallery-header p {
          margin: 0;
          color: #6e7773;
        }

        .pd-eyebrow,
        .pd-orange-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.3px;
          color: #f16e3a;
        }

        .pd-section {
          max-width: 1400px;
          margin: 0 auto 42px;
        }

        .pd-section-title {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .pd-section-title h2 {
          margin: 0 0 5px;
          font-size: 26px;
        }

        .pd-card {
          background: #fff;
          border: 1px solid #deded9;
          border-radius: 20px;
          padding: 30px;
        }

        .pd-card h3 {
          margin: 6px 0 28px;
          font-size: 22px;
        }

        .pd-grid {
          display: grid;
          gap: 20px;
        }

        .pd-grid.two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .pd-grid.three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .pd-card label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .pd-card input,
        .pd-card select,
        .pd-card textarea {
          width: 100%;
          border: 1px solid #d9dad5;
          border-radius: 12px;
          padding: 13px 15px;
          font: inherit;
          outline: none;
          background: white;
        }

        .pd-card input:focus,
        .pd-card textarea:focus,
        .pd-card select:focus {
          border-color: #f16e3a;
          box-shadow: 0 0 0 3px rgba(241, 110, 58, 0.1);
        }

        .pd-subheading {
          display: flex;
          gap: 8px;
          font-weight: 700;
          margin: 15px 0;
        }

        .pd-primary-button,
        .pd-dark-button,
        .pd-orange-button,
        .pd-secondary-button,
        .pd-full-orange-button {
          border: none;
          border-radius: 12px;
          min-height: 46px;
          padding: 0 20px;
          display: inline-flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: 700;
        }

        .pd-primary-button,
        .pd-dark-button {
          background: #142721;
          color: #fff;
        }

        .pd-orange-button,
        .pd-full-orange-button {
          background: #f36f3c;
          color: #fff;
        }

        .pd-full-orange-button {
          width: 100%;
          margin-top: 28px;
        }

        .pd-secondary-button {
          background: white;
          border: 1px solid #d9dad5;
          color: #142721;
        }

        .pd-cover-card {
          display: grid;
          grid-template-columns: 45% 55%;
          background: white;
          border: 1px solid #deded9;
          border-radius: 24px;
          overflow: hidden;
        }

        .pd-cover-preview {
          min-height: 330px;
          background: #efede8;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #afa49d;
        }

        .pd-cover-preview img {
          width: 100%;
          height: 100%;
          min-height: 330px;
          object-fit: cover;
        }

        .pd-cover-content {
          padding: 55px;
        }

        .pd-cover-content h3 {
          font-size: 30px;
          margin: 12px 0;
        }

        .pd-cover-content p {
          color: #777;
          margin-bottom: 28px;
        }

        .pd-action-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .pd-gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 32px 0 18px;
        }

        .pd-gallery-header h3 {
          margin: 0 0 5px;
          font-size: 23px;
        }

        .pd-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 18px;
        }

        .pd-gallery-item,
        .pd-add-photo-card {
          height: 210px;
          border-radius: 18px;
          overflow: hidden;
          position: relative;
        }

        .pd-gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pd-gallery-item button {
          position: absolute;
          right: 10px;
          top: 10px;
          border: 0;
          background: rgba(0,0,0,.72);
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          cursor: pointer;
        }

        .pd-add-photo-card {
          border: 1px dashed #c9cbc4;
          background: white;
          color: #6b746f;
          display: flex;
          flex-direction: column;
          gap: 10px;
          justify-content: center;
          align-items: center;
          cursor: pointer;
        }

        .pd-menu-form {
          margin-bottom: 25px;
        }

        .pd-price-input {
          position: relative;
        }

        .pd-price-input span {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          color: #777;
        }

        .pd-price-input input {
          padding-left: 36px;
        }

        /* ============================================= */
        /* NEW MENU IMAGE UPLOAD */
        /* ============================================= */

        .pd-menu-photo-section {
          margin-top: 6px;
          padding-top: 20px;
          border-top: 1px solid #ecece8;
        }

        .pd-menu-photo-label {
          margin-bottom: 4px !important;
          font-size: 14px !important;
        }

        .pd-menu-photo-help {
          color: #7b817e;
          font-size: 13px;
          margin: 0 0 13px;
        }

        .pd-menu-photo-picker {
          width: 100%;
          min-height: 105px;
          border: 1px dashed #c8cbc5;
          background: #fafaf7;
          border-radius: 15px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 14px;
          padding: 17px;
          text-align: left;
          cursor: pointer;
        }

        .pd-menu-photo-picker:hover {
          border-color: #f36f3c;
          background: #fff9f6;
        }

        .pd-menu-photo-picker strong {
          display: block;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .pd-menu-photo-picker span {
          display: block;
          color: #7c827e;
          font-size: 12px;
        }

        .pd-menu-photo-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #e1e2dd;
          color: #f36f3c;
        }

        .pd-selected-menu-image {
          display: flex;
          gap: 18px;
          border: 1px solid #deded9;
          padding: 12px;
          border-radius: 16px;
          max-width: 600px;
        }

        .pd-selected-menu-image img {
          width: 135px;
          height: 105px;
          object-fit: cover;
          border-radius: 12px;
        }

        .pd-selected-menu-image-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          min-width: 0;
        }

        .pd-selected-menu-image-info strong {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pd-selected-menu-image-info > span {
          color: #77807b;
          font-size: 12px;
        }

        .pd-danger-text-button {
          background: transparent;
          border: 0;
          color: #b63d32;
          display: flex;
          gap: 5px;
          align-items: center;
          cursor: pointer;
          font-weight: 600;
        }

        .pd-toggle-row {
          display: flex;
          gap: 15px;
          margin-top: 26px;
        }

        .pd-switch-wrap {
          border: 1px solid #dadbd6;
          background: white;
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          gap: 8px;
          align-items: center;
          cursor: pointer;
        }

        .pd-switch {
          width: 34px;
          height: 20px;
          background: #d9dcd7;
          border-radius: 100px;
          padding: 3px;
          transition: .2s;
        }

        .pd-switch-knob {
          display: block;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          transition: .2s;
        }

        .pd-switch-wrap.active .pd-switch {
          background: #f36f3c;
        }

        .pd-switch-wrap.active .pd-switch-knob {
          transform: translateX(14px);
        }

        .pd-menu-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pd-menu-item {
          background: white;
          border: 1px solid #deded9;
          border-radius: 17px;
          padding: 11px;
          display: grid;
          grid-template-columns: 90px 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .pd-menu-item-photo {
          width: 90px;
          height: 90px;
          border-radius: 13px;
          overflow: hidden;
          background: #f0ede8;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #998f87;
          position: relative;
        }

        .pd-menu-item-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pd-camera-overlay {
          position: absolute;
          right: 4px;
          bottom: 4px;
          background: #26332f;
          color: white;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          margin: 0 !important;
        }

        .pd-menu-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pd-menu-item-content p {
          color: #6f7672;
          font-size: 13px;
          margin: 7px 0;
        }

        .pd-menu-meta {
          color: #8b918e;
          font-size: 13px;
        }

        .pd-popular-badge {
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 100px;
          background: #fff1ea;
          color: #ef6939;
          border: 1px solid #ffd1bd;
        }

        .pd-delete-button {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          border: 1px solid #eee;
          background: white;
          color: #b23c33;
          cursor: pointer;
        }

        .pd-coordinate-row {
          display: flex;
          gap: 20px;
          padding: 12px 14px;
          background: #f6f7f4;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .pd-alert {
          max-width: 1400px;
          margin: 0 auto 20px;
          border-radius: 13px;
          padding: 13px 15px;
          display: flex;
          gap: 9px;
          align-items: center;
        }

        .pd-alert span {
          flex: 1;
        }

        .pd-alert button {
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .pd-alert.success {
          background: #eaf7ed;
          color: #226837;
        }

        .pd-alert.error {
          background: #a92f2b;
          color: white;
        }

        .pd-alert.error button {
          color: white;
        }

        .pd-loading {
          min-height: 70vh;
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: center;
        }

        .pd-spin {
          animation: pd-spin .8s linear infinite;
        }

        @keyframes pd-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 850px) {
          .pd-page {
            padding: 25px 16px 60px;
          }

          .pd-grid.two,
          .pd-grid.three,
          .pd-cover-card {
            grid-template-columns: 1fr;
          }

          .pd-cover-content {
            padding: 30px;
          }

          .pd-header,
          .pd-gallery-header {
            flex-direction: column;
          }

          .pd-menu-item {
            grid-template-columns: 72px 1fr auto;
          }

          .pd-menu-item-photo {
            width: 72px;
            height: 72px;
          }
        }
      `}</style>

    </div>
  );
}