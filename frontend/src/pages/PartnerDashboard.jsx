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
  Settings,
  LogOut,
  Store,
  Trash2,
  Upload,
  Utensils,
  X,
} from "lucide-react";

import api from "../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


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

  if (!data) return error?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return String(data.detail);
  if (data.error) return String(data.error);
  if (data.message) return String(data.message);

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

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`fk-switch-wrap ${checked ? "active" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="fk-switch">
        <span className="fk-switch-knob" />
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("restaurant");

  const [restaurant, setRestaurant] = useState(null);
  const [restaurantForm, setRestaurantForm] = useState(EMPTY_RESTAURANT);
  const [menuItems, setMenuItems] = useState([]);
  const [gallery, setGallery] = useState([]);

  const [menuForm, setMenuForm] = useState(EMPTY_MENU_FORM);
  const [menuImage, setMenuImage] = useState(null);
  const [menuImagePreview, setMenuImagePreview] = useState("");

  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingRestaurant, setSavingRestaurant] = useState(false);
  const [addingMenu, setAddingMenu] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const menuFileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);
  const galleryFileInputRef = useRef(null);

  const restaurantId =
    restaurant?.id ??
    restaurant?.pk ??
    restaurant?.restaurant_id ??
    null;

  const urls = useMemo(
    () => ({
      restaurants: "/partner/restaurants/",
      restaurant: restaurantId
        ? `/partner/restaurants/${restaurantId}/`
        : null,
      cover: restaurantId
        ? `/partner/restaurants/${restaurantId}/main-photo/`
        : null,
      gallery: restaurantId
        ? `/partner/restaurants/${restaurantId}/photos/`
        : null,
      menu: restaurantId
        ? `/partner/restaurants/${restaurantId}/menu/`
        : null,
    }),
    [restaurantId]
  );

  const clearAlerts = () => {
    setMessage("");
    setError("");
  };

  const loadRestaurant = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/partner/restaurants/");
      const data = response.data;

      let firstRestaurant = null;

      if (Array.isArray(data)) {
        firstRestaurant = data[0] || null;
      } else if (Array.isArray(data?.results)) {
        firstRestaurant = data.results[0] || null;
      } else if (data?.restaurant) {
        firstRestaurant = data.restaurant;
      } else if (data?.id || data?.pk || data?.restaurant_id) {
        firstRestaurant = data;
      }

      if (!firstRestaurant) {
        setRestaurant(null);
        setRestaurantForm(EMPTY_RESTAURANT);
        setMenuItems([]);
        setGallery([]);
        setActiveTab("restaurant");
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
      console.error("LOAD RESTAURANT ERROR:", err);
      setError(getErrorMessage(err, "Unable to load restaurant."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMenu = useCallback(async () => {
    if (!restaurantId) return;

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
      console.error("Unable to load menu:", err);
    }
  }, [restaurantId]);

  const loadGallery = useCallback(async () => {
    if (!restaurantId) return;

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
      console.error("Unable to load gallery:", err);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  useEffect(() => {
    if (!restaurantId) return;
    loadMenu();
    loadGallery();
  }, [restaurantId, loadMenu, loadGallery]);

  const updateRestaurantField = (field, value) => {
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

      const response = restaurantId
        ? await api.patch(urls.restaurant, restaurantForm)
        : await api.post(urls.restaurants, restaurantForm);

      const saved = response.data;

      setRestaurant(saved);
      setRestaurantForm({
        ...EMPTY_RESTAURANT,
        ...saved,
      });

      setMessage(
        restaurantId
          ? "Restaurant details updated."
          : "Restaurant created successfully."
      );
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Unable to save restaurant."));
    } finally {
      setSavingRestaurant(false);
    }
  };

  const handleCoverSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (coverPreview) URL.revokeObjectURL(coverPreview);

    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const uploadCoverPhoto = async () => {
    if (!restaurantId || !coverImage) return;

    clearAlerts();

    try {
      setUploadingCover(true);

      const formData = new FormData();
      formData.append("image", coverImage);

      await api.post(urls.cover, formData);

      setMessage("Cover photo uploaded successfully.");
      setCoverImage(null);

      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPreview("");

      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = "";
      }

      await loadRestaurant();
      await loadGallery();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Cover photo upload failed."));
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGalleryUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!restaurantId || selectedFiles.length === 0) return;

    clearAlerts();

    try {
      setUploadingGallery(true);

      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      await api.post(urls.gallery, formData);

      setMessage("Gallery photos uploaded successfully.");
      await loadGallery();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Gallery upload failed."));
    } finally {
      setUploadingGallery(false);

      if (galleryFileInputRef.current) {
        galleryFileInputRef.current.value = "";
      }
    }
  };

  const deleteGalleryImage = async (imageId) => {
    if (!restaurantId || !imageId) return;

    if (!window.confirm("Remove this restaurant photo?")) return;

    clearAlerts();

    try {
      await api.delete(
        `/partner/restaurants/${restaurantId}/photos/${imageId}/`
      );

      setGallery((prev) =>
        prev.filter((item) => item.id !== imageId)
      );

      setMessage("Photo removed.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to remove photo."));
    }
  };

  const updateMenuField = (field, value) => {
    setMenuForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMenuImageSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Dish photo is too large. Maximum size is 10 MB.");
      event.target.value = "";
      return;
    }

    clearAlerts();

    if (menuImagePreview) {
      URL.revokeObjectURL(menuImagePreview);
    }

    setMenuImage(file);
    setMenuImagePreview(URL.createObjectURL(file));
  };

  const removeSelectedMenuImage = () => {
    if (menuImagePreview) {
      URL.revokeObjectURL(menuImagePreview);
    }

    setMenuImage(null);
    setMenuImagePreview("");

    if (menuFileInputRef.current) {
      menuFileInputRef.current.value = "";
    }
  };

  const handleAddMenuItem = async (event) => {
    event.preventDefault();

    if (!restaurantId) {
      setError("Create your restaurant before adding menu items.");
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

      setMenuForm({ ...EMPTY_MENU_FORM });
      removeSelectedMenuImage();

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

      setError(getErrorMessage(err, "Unable to add menu item."));
    } finally {
      setAddingMenu(false);
    }
  };

  const deleteMenuItem = async (menuId) => {
    if (!restaurantId || !menuId) return;
    if (!window.confirm("Delete this menu item?")) return;

    clearAlerts();

    try {
      await api.delete(
        `/partner/restaurants/${restaurantId}/menu/${menuId}/`
      );

      setMenuItems((prev) =>
        prev.filter((item) => item.id !== menuId)
      );

      setMessage("Menu item deleted.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete menu item."));
    }
  };

  const replaceMenuPhoto = async (menuId, file) => {
    if (!restaurantId || !menuId || !file) return;

    clearAlerts();

    try {
      const formData = new FormData();
      formData.append("image", file);

      await api.post(
        `/partner/restaurants/${restaurantId}/menu/${menuId}/photo/`,
        formData
      );

      setMessage("Dish photo updated.");
      await loadMenu();
    } catch (err) {
      setError(getErrorMessage(err, "Dish photo upload failed."));
    }
  };

  const openTab = (tab) => {
    if (
      (tab === "photos" || tab === "menu" || tab === "settings") &&
      !restaurantId
    ) {
      setError("Save your restaurant first.");
      return;
    }

    clearAlerts();
    setActiveTab(tab);
  };

  const handlePartnerLogout = async () => {
    try {
      await logout?.();
    } catch (logoutError) {
      console.error("PARTNER LOGOUT ERROR:", logoutError);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="fk-loading">
        <Loader2 size={30} className="fk-spin" />
        <span>Loading restaurant studio...</span>
      </div>
    );
  }

  return (
    <div className="fk-studio">
      <aside className="fk-sidebar">
        <div className="fk-sidebar-top">
          <button
            type="button"
            className={`fk-nav-item ${
              activeTab === "restaurant" ? "active" : ""
            }`}
            onClick={() => openTab("restaurant")}
          >
            <Store size={20} />
            <span>Restaurant</span>
          </button>

          <button
            type="button"
            className={`fk-nav-item ${
              activeTab === "photos" ? "active" : ""
            } ${!restaurantId ? "disabled" : ""}`}
            onClick={() => openTab("photos")}
          >
            <Camera size={20} />
            <span>Photos</span>
          </button>

          <button
            type="button"
            className={`fk-nav-item ${
              activeTab === "menu" ? "active" : ""
            } ${!restaurantId ? "disabled" : ""}`}
            onClick={() => openTab("menu")}
          >
            <Utensils size={20} />
            <span>Menu</span>
          </button>
        </div>

        <div className="fk-sidebar-bottom">
          <button
            type="button"
            className={`fk-nav-item ${
              activeTab === "settings" ? "active" : ""
            } ${!restaurantId ? "disabled" : ""}`}
            onClick={() => openTab("settings")}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>

          <button
            type="button"
            className="fk-nav-item fk-logout-item"
            onClick={handlePartnerLogout}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="fk-main">
        {message && (
          <div className="fk-toast success">
            <Check size={18} />
            <span>{message}</span>
            <button type="button" onClick={() => setMessage("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div className="fk-toast error">
            <X size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {activeTab === "restaurant" && (
          <section className="fk-page-section">
            <div className="fk-page-heading">
              <h1>Restaurant details</h1>
              <p>Keep your restaurant information accurate.</p>
            </div>

            <form className="fk-card" onSubmit={saveRestaurant}>
              <div className="fk-grid two">
                <label>
                  Restaurant name
                  <input
                    value={restaurantForm.name}
                    onChange={(e) =>
                      updateRestaurantField("name", e.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Restaurant type
                  <select
                    value={restaurantForm.restaurant_type}
                    onChange={(e) =>
                      updateRestaurantField(
                        "restaurant_type",
                        e.target.value
                      )
                    }
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="cafe">Cafe</option>
                    <option value="hotel">Hotel</option>
                  </select>
                </label>

                <label>
                  Cuisine
                  <select
                    value={restaurantForm.cuisine || ""}
                    onChange={(e) =>
                      updateRestaurantField("cuisine", e.target.value)
                    }
                  >
                    <option value="">Select cuisine</option>
                    {CUISINE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Phone
                  <input
                    value={restaurantForm.phone_number || ""}
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
                    value={restaurantForm.email || ""}
                    onChange={(e) =>
                      updateRestaurantField("email", e.target.value)
                    }
                  />
                </label>

                <label>
                  Website
                  <input
                    value={restaurantForm.website || ""}
                    onChange={(e) =>
                      updateRestaurantField("website", e.target.value)
                    }
                  />
                </label>
              </div>

              <label>
                Description
                <textarea
                  rows={4}
                  value={restaurantForm.description || ""}
                  onChange={(e) =>
                    updateRestaurantField(
                      "description",
                      e.target.value
                    )
                  }
                />
              </label>

              <div className="fk-subheading">
                <MapPin size={18} />
                <span>Location</span>
              </div>

              <label>
                Address
                <textarea
                  rows={3}
                  value={restaurantForm.address || ""}
                  onChange={(e) =>
                    updateRestaurantField("address", e.target.value)
                  }
                />
              </label>

              <div className="fk-grid three">
                <label>
                  Locality
                  <input
                    value={restaurantForm.locality || ""}
                    onChange={(e) =>
                      updateRestaurantField("locality", e.target.value)
                    }
                  />
                </label>

                <label>
                  City
                  <input
                    value={restaurantForm.city || ""}
                    onChange={(e) =>
                      updateRestaurantField("city", e.target.value)
                    }
                  />
                </label>

                <label>
                  Pincode
                  <input
                    value={restaurantForm.pincode || ""}
                    onChange={(e) =>
                      updateRestaurantField("pincode", e.target.value)
                    }
                  />
                </label>
              </div>

              {restaurant && (
                <div className="fk-coordinates">
                  <span>
                    Latitude:{" "}
                    {restaurant.latitude || "Waiting for location"}
                  </span>
                  <span>
                    Longitude:{" "}
                    {restaurant.longitude || "Waiting for location"}
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="fk-save-btn"
                disabled={savingRestaurant}
              >
                {savingRestaurant ? (
                  <>
                    <Loader2 size={17} className="fk-spin" />
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
        )}

        {activeTab === "photos" && restaurantId && (
          <section className="fk-page-section">
            <div className="fk-page-heading">
              <h1>Restaurant photos</h1>
              <p>Show the food, ambience, interiors and experience.</p>
            </div>

            <div className="fk-cover-card">
              <div className="fk-cover-preview">
                {coverPreview || restaurant?.image_url ? (
                  <img
                    src={coverPreview || restaurant.image_url}
                    alt="Restaurant cover"
                  />
                ) : (
                  <ImagePlus size={48} />
                )}
              </div>

              <div className="fk-cover-copy">
                <span className="fk-kicker">COVER PHOTO</span>
                <h2>Your restaurant’s first impression.</h2>
                <p>
                  Use a clear landscape image of your restaurant or
                  signature food.
                </p>

                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={handleCoverSelection}
                />

                {!coverImage ? (
                  <button
                    type="button"
                    className="fk-dark-btn"
                    onClick={() =>
                      coverFileInputRef.current?.click()
                    }
                  >
                    <Upload size={18} />
                    Upload cover photo
                  </button>
                ) : (
                  <div className="fk-row">
                    <button
                      type="button"
                      className="fk-dark-btn"
                      onClick={() =>
                        coverFileInputRef.current?.click()
                      }
                    >
                      <Camera size={18} />
                      Change
                    </button>

                    <button
                      type="button"
                      className="fk-orange-btn"
                      onClick={uploadCoverPhoto}
                      disabled={uploadingCover}
                    >
                      {uploadingCover ? (
                        <Loader2 size={18} className="fk-spin" />
                      ) : (
                        <Upload size={18} />
                      )}
                      Save cover
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="fk-gallery-head">
              <div>
                <h2>Gallery</h2>
                <p>Add as many restaurant photos as you need.</p>
              </div>

              <input
                ref={galleryFileInputRef}
                type="file"
                multiple
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={handleGalleryUpload}
              />

              <button
                type="button"
                className="fk-orange-btn"
                onClick={() =>
                  galleryFileInputRef.current?.click()
                }
                disabled={uploadingGallery}
              >
                {uploadingGallery ? (
                  <Loader2 size={18} className="fk-spin" />
                ) : (
                  <ImagePlus size={18} />
                )}
                Add Photos
              </button>
            </div>

            <div className="fk-gallery-grid">
              {gallery.map((image) => (
                <div className="fk-gallery-photo" key={image.id}>
                  <img
                    src={image.image_url || image.url}
                    alt={image.caption || "Restaurant"}
                  />
                  <button
                    type="button"
                    onClick={() => deleteGalleryImage(image.id)}
                    aria-label="Delete photo"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="fk-add-photo"
                onClick={() =>
                  galleryFileInputRef.current?.click()
                }
              >
                <Plus size={34} />
                <span>Add photos</span>
              </button>
            </div>
          </section>
        )}

        {activeTab === "menu" && restaurantId && (
          <section className="fk-page-section">
            <div className="fk-page-heading">
              <h1>Your menu</h1>
              <p>Add dishes, prices and photos.</p>
            </div>

            <form className="fk-card fk-menu-form" onSubmit={handleAddMenuItem}>
              <span className="fk-kicker">ADD DISH</span>
              <h2>Create a menu item</h2>

              <div className="fk-grid two">
                <label>
                  Dish name
                  <input
                    placeholder="Eg. Masala Dosa"
                    value={menuForm.name}
                    onChange={(e) =>
                      updateMenuField("name", e.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Price
                  <div className="fk-price">
                    <span>₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={menuForm.price}
                      onChange={(e) =>
                        updateMenuField("price", e.target.value)
                      }
                      required
                    />
                  </div>
                </label>

                <label>
                  Category
                  <select
                    value={menuForm.category}
                    onChange={(e) =>
                      updateMenuField("category", e.target.value)
                    }
                  >
                    {CATEGORY_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Food type
                  <select
                    value={menuForm.food_type}
                    onChange={(e) =>
                      updateMenuField("food_type", e.target.value)
                    }
                  >
                    {FOOD_TYPE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Description
                <textarea
                  rows={4}
                  value={menuForm.description}
                  onChange={(e) =>
                    updateMenuField("description", e.target.value)
                  }
                />
              </label>

              <div className="fk-menu-photo-block">
                <div>
                  <strong>Dish photo</strong>
                  <p>JPG, PNG or WebP. Maximum 10 MB.</p>
                </div>

                <input
                  ref={menuFileInputRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleMenuImageSelection}
                />

                {!menuImagePreview ? (
                  <button
                    type="button"
                    className="fk-menu-photo-picker"
                    onClick={() =>
                      menuFileInputRef.current?.click()
                    }
                  >
                    <div className="fk-photo-icon">
                      <Camera size={23} />
                    </div>

                    <div>
                      <strong>Upload dish photo</strong>
                      <span>Choose an image from your device</span>
                    </div>

                    <Upload size={20} />
                  </button>
                ) : (
                  <div className="fk-selected-photo">
                    <img src={menuImagePreview} alt="Dish preview" />

                    <div>
                      <strong>{menuImage?.name}</strong>
                      <span>Photo ready to upload</span>

                      <div className="fk-row">
                        <button
                          type="button"
                          className="fk-light-btn"
                          onClick={() =>
                            menuFileInputRef.current?.click()
                          }
                        >
                          <Camera size={16} />
                          Change
                        </button>

                        <button
                          type="button"
                          className="fk-remove-btn"
                          onClick={removeSelectedMenuImage}
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="fk-toggle-row">
                <Switch
                  label="Popular dish"
                  checked={menuForm.is_popular}
                  onChange={(value) =>
                    updateMenuField("is_popular", value)
                  }
                />

                <Switch
                  label="Available"
                  checked={menuForm.is_available}
                  onChange={(value) =>
                    updateMenuField("is_available", value)
                  }
                />
              </div>

              <button
                type="submit"
                className="fk-full-orange"
                disabled={addingMenu}
              >
                {addingMenu ? (
                  <>
                    <Loader2 size={18} className="fk-spin" />
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

            <div className="fk-menu-list">
              {menuItems.map((item) => (
                <article key={item.id} className="fk-menu-item">
                  <div className="fk-menu-thumb">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} />
                    ) : (
                      <ChefHat size={28} />
                    )}

                    <label className="fk-camera-over">
                      <Camera size={15} />
                      <input
                        type="file"
                        hidden
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            replaceMenuPhoto(item.id, file);
                          }
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <div className="fk-menu-copy">
                    <div className="fk-menu-name">
                      <strong>{item.name}</strong>
                      {item.is_popular && (
                        <span>Popular</span>
                      )}
                    </div>

                    {item.description && <p>{item.description}</p>}

                    <small>
                      {CATEGORY_OPTIONS.find(
                        ([value]) => value === item.category
                      )?.[1] || item.category}
                      {" • "}
                      {FOOD_TYPE_OPTIONS.find(
                        ([value]) => value === item.food_type
                      )?.[1] || item.food_type}
                      {" • ₹"}
                      {item.price}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="fk-trash"
                    onClick={() => deleteMenuItem(item.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "settings" && restaurantId && (
          <section className="fk-page-section">
            <div className="fk-page-heading">
              <h1>Partner settings</h1>
              <p>Manage restaurant preferences and your partner session.</p>
            </div>

            <form className="fk-card fk-settings-card" onSubmit={saveRestaurant}>
              <div className="fk-settings-account">
                <span className="fk-kicker">PARTNER ACCOUNT</span>
                <h2>{restaurant?.name || "Restaurant partner"}</h2>
                <p>
                  Signed in as{" "}
                  <strong>
                    {user?.email ||
                      user?.username ||
                      "Restaurant partner"}
                  </strong>
                </p>
              </div>

              <div className="fk-settings-divider" />

              <div className="fk-settings-row">
                <div>
                  <strong>FoodKindl bookings</strong>
                  <p>
                    Allow FoodKindl members to request bookings at this
                    restaurant.
                  </p>
                </div>

                <Switch
                  label={
                    restaurantForm.accepts_foodkindl_booking
                      ? "Enabled"
                      : "Disabled"
                  }
                  checked={Boolean(
                    restaurantForm.accepts_foodkindl_booking
                  )}
                  onChange={(value) =>
                    updateRestaurantField(
                      "accepts_foodkindl_booking",
                      value
                    )
                  }
                />
              </div>

              <div className="fk-settings-actions">
                <button
                  type="submit"
                  className="fk-save-btn"
                  disabled={savingRestaurant}
                >
                  {savingRestaurant ? (
                    <>
                      <Loader2 size={17} className="fk-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      Save settings
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="fk-settings-logout"
                  onClick={handlePartnerLogout}
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      <style>{`
        .fk-studio {
          min-height: calc(100vh - 90px);
          display: grid;
          grid-template-columns: 258px minmax(0, 1fr);
          background: #f7f7f3;
          color: #0f1f1a;
        }

        .fk-studio * {
          box-sizing: border-box;
        }

        .fk-sidebar {
          background: #122720;
          padding: 22px 14px;
          min-height: calc(100vh - 90px);
          position: sticky;
          top: 0;
          align-self: start;
          display: flex;
          flex-direction: column;
        }

        .fk-sidebar-top {
          display: flex;
          flex-direction: column;
        }

        .fk-sidebar-bottom {
          margin-top: auto;
          padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,.08);
        }

        .fk-nav-item {
          width: 100%;
          border: 0;
          color: #dce6e1;
          background: transparent;
          min-height: 50px;
          border-radius: 13px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          gap: 13px;
          font-size: 15px;
          font-weight: 650;
          cursor: pointer;
          margin-bottom: 4px;
          text-align: left;
          position: relative;
        }

        .fk-nav-item:hover {
          background: rgba(255,255,255,.06);
        }

        .fk-nav-item.active {
          background: #273b34;
          color: #fff;
        }

        .fk-nav-item.active::before {
          content: "";
          position: absolute;
          left: 0;
          top: 7px;
          bottom: 7px;
          width: 4px;
          border-radius: 0 6px 6px 0;
          background: #f36d3b;
        }

        .fk-nav-item.disabled {
          opacity: .45;
        }

        .fk-logout-item {
          color: #ff9b86;
        }

        .fk-logout-item:hover {
          background: rgba(255, 99, 71, .09);
          color: #fff;
        }

        .fk-main {
          min-width: 0;
          padding: 0 4.1vw 70px;
          position: relative;
        }

        .fk-page-section {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          padding-top: 0;
        }

        .fk-page-heading {
          padding: 0 0 22px;
        }

        .fk-page-heading h1 {
          margin: 0 0 8px;
          font-size: clamp(28px, 2.1vw, 36px);
          letter-spacing: -1.2px;
          line-height: 1.08;
        }

        .fk-page-heading p,
        .fk-gallery-head p {
          margin: 0;
          color: #737b77;
          font-size: 15px;
        }

        .fk-card {
          background: #fff;
          border: 1px solid #deded9;
          border-radius: 20px;
          padding: 30px;
        }

        .fk-card h2 {
          margin: 6px 0 28px;
          font-size: 21px;
        }

        .fk-kicker {
          color: #f36d3b;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .fk-grid {
          display: grid;
          gap: 18px;
        }

        .fk-grid.two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .fk-grid.three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .fk-card label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .fk-card input,
        .fk-card select,
        .fk-card textarea {
          width: 100%;
          border: 1px solid #d6d8d3;
          border-radius: 12px;
          padding: 13px 15px;
          outline: 0;
          background: #fff;
          font: inherit;
          color: #15241f;
        }

        .fk-card input:focus,
        .fk-card select:focus,
        .fk-card textarea:focus {
          border-color: #f36d3b;
          box-shadow: 0 0 0 3px rgba(243,109,59,.1);
        }

        .fk-subheading {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 10px 0 15px;
          font-weight: 700;
        }

        .fk-coordinates {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          padding: 12px 14px;
          border-radius: 10px;
          background: #f4f5f2;
          color: #606965;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .fk-save-btn,
        .fk-dark-btn,
        .fk-orange-btn,
        .fk-light-btn,
        .fk-full-orange {
          border: 0;
          border-radius: 12px;
          min-height: 48px;
          padding: 0 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 750;
          cursor: pointer;
        }

        .fk-save-btn,
        .fk-dark-btn {
          background: #122720;
          color: #fff;
        }

        .fk-orange-btn,
        .fk-full-orange {
          background: #f36d3b;
          color: #fff;
          box-shadow: 0 12px 26px rgba(243,109,59,.16);
        }

        .fk-light-btn {
          background: #fff;
          border: 1px solid #d9dad5;
          color: #122720;
        }

        .fk-cover-card {
          border: 1px solid #deded9;
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 45% 55%;
          min-height: 310px;
        }

        .fk-cover-preview {
          background: #efede8;
          color: #aa9e96;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 310px;
        }

        .fk-cover-preview img {
          width: 100%;
          height: 100%;
          min-height: 310px;
          object-fit: cover;
        }

        .fk-cover-copy {
          padding: 68px 50px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
        }

        .fk-cover-copy h2 {
          margin: 12px 0 14px;
          font-size: clamp(26px, 2vw, 34px);
          letter-spacing: -.7px;
        }

        .fk-cover-copy p {
          margin: 0 0 26px;
          color: #777f7b;
          font-size: 15px;
        }

        .fk-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .fk-gallery-head {
          margin: 35px 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .fk-gallery-head h2 {
          margin: 0 0 5px;
          font-size: 25px;
        }

        .fk-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 18px;
        }

        .fk-gallery-photo,
        .fk-add-photo {
          height: 210px;
          border-radius: 18px;
          overflow: hidden;
          position: relative;
        }

        .fk-gallery-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .fk-gallery-photo > button {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 50%;
          background: rgba(16,30,25,.82);
          color: #fff;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .fk-add-photo {
          border: 1px dashed #c8cbc5;
          background: #fff;
          color: #68716d;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 10px;
          cursor: pointer;
          font-size: 16px;
        }

        .fk-menu-form {
          margin-bottom: 26px;
        }

        .fk-price {
          position: relative;
        }

        .fk-price > span {
          position: absolute;
          top: 50%;
          left: 15px;
          transform: translateY(-50%);
          color: #6e7772;
          z-index: 2;
        }

        .fk-price input {
          padding-left: 36px;
        }

        .fk-menu-photo-block {
          border-top: 1px solid #ecece8;
          padding-top: 18px;
        }

        .fk-menu-photo-block > div:first-child > p {
          margin: 4px 0 12px;
          color: #7a817d;
          font-size: 13px;
        }

        .fk-menu-photo-picker {
          width: 100%;
          min-height: 104px;
          border: 1px dashed #c8cbc5;
          border-radius: 15px;
          background: #fafaf7;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 14px;
          align-items: center;
          padding: 16px;
          cursor: pointer;
          text-align: left;
          color: #15241f;
        }

        .fk-menu-photo-picker div:nth-child(2) {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .fk-menu-photo-picker span {
          color: #7a817d;
          font-size: 12px;
        }

        .fk-photo-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid #e1e2dd;
          display: grid;
          place-items: center;
          color: #f36d3b;
        }

        .fk-selected-photo {
          max-width: 630px;
          border: 1px solid #deded9;
          border-radius: 16px;
          padding: 12px;
          display: flex;
          gap: 15px;
        }

        .fk-selected-photo img {
          width: 135px;
          height: 105px;
          object-fit: cover;
          border-radius: 12px;
        }

        .fk-selected-photo > div {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 7px;
        }

        .fk-selected-photo > div > span {
          color: #78807c;
          font-size: 12px;
        }

        .fk-remove-btn {
          border: 0;
          background: transparent;
          color: #b53d32;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          font-weight: 650;
        }

        .fk-toggle-row {
          display: flex;
          gap: 13px;
          margin-top: 26px;
        }

        .fk-switch-wrap {
          border: 1px solid #dadbd6;
          background: #fff;
          border-radius: 12px;
          min-height: 48px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 650;
          cursor: pointer;
        }

        .fk-switch {
          width: 34px;
          height: 20px;
          border-radius: 999px;
          padding: 3px;
          background: #d7dad5;
        }

        .fk-switch-knob {
          display: block;
          width: 14px;
          height: 14px;
          background: #fff;
          border-radius: 50%;
          transition: transform .2s ease;
        }

        .fk-switch-wrap.active .fk-switch {
          background: #f36d3b;
        }

        .fk-switch-wrap.active .fk-switch-knob {
          transform: translateX(14px);
        }

        .fk-full-orange {
          width: 100%;
          margin-top: 28px;
        }

        .fk-menu-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .fk-menu-item {
          background: #fff;
          border: 1px solid #deded9;
          border-radius: 17px;
          padding: 11px;
          display: grid;
          grid-template-columns: 90px minmax(0,1fr) auto;
          gap: 16px;
          align-items: center;
        }

        .fk-menu-thumb {
          width: 90px;
          height: 90px;
          border-radius: 13px;
          overflow: hidden;
          background: #f0ede8;
          color: #988f87;
          display: grid;
          place-items: center;
          position: relative;
        }

        .fk-menu-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .fk-camera-over {
          position: absolute;
          right: 4px;
          bottom: 4px;
          width: 31px;
          height: 31px;
          border-radius: 8px;
          background: #27352f;
          color: #fff;
          display: grid;
          place-items: center;
          cursor: pointer;
          margin: 0 !important;
        }

        .fk-menu-copy p {
          color: #6e7672;
          margin: 7px 0;
          font-size: 13px;
        }

        .fk-menu-copy small {
          color: #8b918e;
          font-size: 13px;
        }

        .fk-menu-name {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fk-menu-name > span {
          color: #ee6938;
          background: #fff1ea;
          border: 1px solid #ffd1bd;
          border-radius: 999px;
          padding: 3px 8px;
          font-size: 10px;
        }

        .fk-trash {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          border: 1px solid #eee;
          background: #fff;
          color: #b53c33;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .fk-settings-card {
          max-width: 820px;
        }

        .fk-settings-account h2 {
          margin: 8px 0 6px;
        }

        .fk-settings-account p {
          margin: 0;
          color: #747c78;
          font-size: 14px;
        }

        .fk-settings-divider {
          height: 1px;
          background: #ecece8;
          margin: 28px 0;
        }

        .fk-settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .fk-settings-row > div:first-child strong {
          display: block;
          font-size: 16px;
        }

        .fk-settings-row > div:first-child p {
          max-width: 540px;
          margin: 6px 0 0;
          color: #747c78;
          font-size: 13px;
          line-height: 1.55;
        }

        .fk-settings-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #ecece8;
        }

        .fk-settings-logout {
          min-height: 48px;
          padding: 0 20px;
          border: 1px solid #e7c7c1;
          border-radius: 12px;
          background: #fff;
          color: #a8382f;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 750;
          cursor: pointer;
        }

        .fk-settings-logout:hover {
          background: #fff6f4;
        }

        .fk-toast {
          position: fixed;
          left: 0;
          right: 18px;
          bottom: 0;
          z-index: 9999;
          min-height: 48px;
          padding: 11px 16px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }

        .fk-toast span {
          flex: 1;
        }

        .fk-toast button {
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .fk-toast.error {
          background: #aa2f2b;
        }

        .fk-toast.success {
          background: #1f6a43;
        }

        .fk-loading {
          min-height: 70vh;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .fk-spin {
          animation: fk-spin .8s linear infinite;
        }

        @keyframes fk-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .fk-studio {
            grid-template-columns: 1fr;
          }

          .fk-sidebar {
            position: static;
            min-height: auto;
            display: flex;
            flex-direction: row;
            gap: 7px;
            padding: 10px;
            overflow-x: auto;
          }

          .fk-sidebar-top,
          .fk-sidebar-bottom {
            display: flex;
            flex-direction: row;
            gap: 7px;
          }

          .fk-sidebar-bottom {
            margin-top: 0;
            padding-top: 0;
            border-top: 0;
          }

          .fk-nav-item {
            min-width: 150px;
            margin: 0;
          }

          .fk-settings-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .fk-main {
            padding: 24px 16px 60px;
          }

          .fk-cover-card,
          .fk-grid.two,
          .fk-grid.three {
            grid-template-columns: 1fr;
          }

          .fk-cover-copy {
            padding: 30px;
          }

          .fk-gallery-head {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
