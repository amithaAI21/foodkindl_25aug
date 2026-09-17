import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, Check, ChefHat, Clock3, Film, HeartPulse, ImagePlus,
  LoaderCircle, Play, Plus, ScanLine, ShoppingBasket, Sparkles,
  Trash2, Video, WandSparkles, X,
} from "lucide-react";

import api from "../api";
import "../styles/ai_kitchen_simple.css";


const HEALTH_MODES = [
  { id: "classic", label: "Classic" },
  { id: "healthy", label: "Healthy" },
  { id: "super_healthy", label: "Super healthy" },
];

const RETAILERS = ["Zepto", "Blinkit", "Instamart", "Amazon", "Local vendors"];

const makeItem = (name) => ({
  id: `${name}-${Date.now()}-${Math.random()}`,
  name: String(name).trim().toLowerCase(),
});


export default function AIKitchen() {
  const photoInput = useRef(null);
  const videoInput = useRef(null);
  const [entryMode, setEntryMode] = useState("ask");
  const [healthMode, setHealthMode] = useState("healthy");
  const [query, setQuery] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [annotatedImage, setAnnotatedImage] = useState("");
  const [video, setVideo] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [creatorVideos, setCreatorVideos] = useState([]);
  const [shopping, setShopping] = useState([]);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const ingredientNames = useMemo(
    () => ingredients.map((item) => item.name),
    [ingredients]
  );

  const addIngredient = () => {
    const name = ingredientInput.trim().toLowerCase();
    if (!name || ingredientNames.includes(name)) return;
    setIngredients((current) => [...current, makeItem(name)]);
    setIngredientInput("");
  };

  const choosePhoto = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) return setError("Photo must be 10 MB or smaller.");
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(selected);
    setPhotoPreview(URL.createObjectURL(selected));
    setAnnotatedImage("");
    setError("");
  };

  const chooseVideo = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.size > 50 * 1024 * 1024) return setError("Video must be 50 MB or smaller.");
    setVideo(selected);
    setError("");
  };

  const scanPhoto = async () => {
    if (!photo) return setError("Add a kitchen photo first.");
    const body = new FormData();
    body.append("image", photo);
    body.append("confidence", "0.30");
    setWorking("scan");
    setError("");
    try {
      const { data } = await api.post("/ai/detect-ingredients/", body);
      setAnnotatedImage(data.annotated_image || "");
      setIngredients(
        (data.ingredient_names || []).map(makeItem)
      );
      if (!data.ingredient_names?.length) {
        setError("Nothing recognised. Add the ingredients manually.");
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Photo scanning failed.");
    } finally {
      setWorking("");
    }
  };

  const findRecipes = async () => {
    if (entryMode === "ask" && !query.trim()) return setError("Enter the recipe you want.");
    if (entryMode === "have" && !ingredientNames.length && !photo && !video) {
      return setError("Add a photo, video or ingredient first.");
    }
    const body = new FormData();
    body.append("request_type", entryMode);
    body.append("recipe_query", query.trim());
    body.append("health_mode", healthMode);
    body.append("ingredients", JSON.stringify(ingredientNames));
    if (photo) body.append("photo", photo);
    if (video) body.append("video", video);

    setWorking("recipes");
    setError("");
    try {
      const { data } = await api.post("/ai/recipe-suggestions/", body);
      const suggestions = data.recipes || data.suggestions || [];
      setRecipes(suggestions);
      setSelectedRecipe(suggestions[0] || null);
      setCreatorVideos(data.creator_videos || []);
      setShopping(data.shopping_list || data.missing_ingredients || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not create recipe suggestions.");
    } finally {
      setWorking("");
    }
  };

  const selectRecipe = async (recipe) => {
    setSelectedRecipe(recipe);
    setShopping(recipe.missing_ingredients || []);
    try {
      const { data } = await api.get("/ai/recipe-videos/", {
        params: { recipe_id: recipe.id, title: recipe.title, health_mode: healthMode },
      });
      setCreatorVideos(data.videos || []);
    } catch {
      setCreatorVideos(recipe.creator_videos || []);
    }
  };

  const generateAiVideo = async () => {
    if (!selectedRecipe) return;
    setWorking("video");
    setError("");
    try {
      const { data } = await api.post("/ai/generate-recipe-video/", {
        recipe_id: selectedRecipe.id,
        recipe_title: selectedRecipe.title,
        health_mode: healthMode,
        ingredients: ingredientNames,
        duration_seconds: 60,
      });
      setSelectedRecipe((current) => ({ ...current, ai_video: data.video || data }));
    } catch (requestError) {
      setError(requestError.response?.data?.error || "AI video generation could not be started.");
    } finally {
      setWorking("");
    }
  };

  return (
    <main className="fk-ai-simple">
      <header className="fk-ai-simple__hero">
        <small>FOODKINDL AI KITCHEN</small>
        <h1>What would you like to <span>cook?</span></h1>
        <p>Ask for any recipe, or show us the ingredients you already have.</p>
      </header>

      <section className="fk-ai-simple__entry" aria-label="Choose how to start">
        <button className={entryMode === "ask" ? "active" : ""} type="button" onClick={() => setEntryMode("ask")}>
          <ChefHat size={22} /><strong>Ask for a recipe</strong><span>Chilli chicken, sushi, veg momo…</span>
        </button>
        <button className={entryMode === "have" ? "active" : ""} type="button" onClick={() => setEntryMode("have")}>
          <ScanLine size={22} /><strong>Show what I have</strong><span>Add photos, video or ingredients</span>
        </button>
      </section>

      <section className="fk-ai-simple__workspace">
        <div className="fk-ai-simple__modes">
          <span>Choose your style</span>
          <div>{HEALTH_MODES.map((mode) => (
            <button className={healthMode === mode.id ? "active" : ""} key={mode.id} type="button" onClick={() => setHealthMode(mode.id)}>
              {mode.id !== "classic" && <HeartPulse size={14} />}{mode.label}
            </button>
          ))}</div>
        </div>

        {entryMode === "ask" ? (
          <div className="fk-ai-simple__ask">
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && findRecipes()} placeholder="What do you want to cook?" />
            <button type="button" onClick={findRecipes}><Sparkles size={18} /> Find recipes</button>
          </div>
        ) : (
          <div className="fk-ai-simple__have">
            <input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choosePhoto} />
            <input ref={videoInput} hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={chooseVideo} />
            <div className="fk-ai-simple__media-actions">
              <button type="button" onClick={() => photoInput.current?.click()}><ImagePlus size={19} /> Add photos</button>
              <button type="button" onClick={() => videoInput.current?.click()}><Video size={19} /> Add video</button>
            </div>

            {(photoPreview || video) && (
              <div className="fk-ai-simple__media-preview">
                {photoPreview && <div><img src={annotatedImage || photoPreview} alt="Ingredients selected for scanning" /><button type="button" onClick={() => { setPhoto(null); setPhotoPreview(""); setAnnotatedImage(""); }}><Trash2 size={15} /> Remove</button></div>}
                {video && <div className="fk-ai-simple__video-file"><Film size={23} /><span>{video.name}</span><button type="button" aria-label="Remove video" onClick={() => setVideo(null)}><X size={15} /></button></div>}
              </div>
            )}

            {photo && !annotatedImage && (
              <button className="fk-ai-simple__scan" type="button" onClick={scanPhoto} disabled={working === "scan"}>
                {working === "scan" ? <><LoaderCircle className="fk-spin" size={17} /> Scanning…</> : <><Camera size={17} /> Scan photo</>}
              </button>
            )}

            <div className="fk-ai-simple__ingredient-input">
              <input value={ingredientInput} onChange={(event) => setIngredientInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addIngredient()} placeholder="Type anything we missed" />
              <button type="button" onClick={addIngredient}><Plus size={17} /> Add</button>
            </div>

            {!!ingredients.length && <div className="fk-ai-simple__chips">{ingredients.map((item) => (
              <span key={item.id}>{item.name}<button type="button" aria-label={`Remove ${item.name}`} onClick={() => setIngredients((current) => current.filter((candidate) => candidate.id !== item.id))}><X size={12} /></button></span>
            ))}</div>}

            <button className="fk-ai-simple__primary" type="button" onClick={findRecipes} disabled={working === "recipes"}>
              {working === "recipes" ? <><LoaderCircle className="fk-spin" size={18} /> Finding recipes…</> : <><Sparkles size={18} /> Suggest recipes</>}
            </button>
          </div>
        )}

        {error && <p className="fk-ai-simple__error" role="alert">{error}</p>}
      </section>

      {!!recipes.length && (
        <section className="fk-ai-simple__results">
          <div className="fk-ai-simple__section-head"><div><small>CHOOSE ONE</small><h2>Made for you</h2></div><span>{HEALTH_MODES.find((mode) => mode.id === healthMode)?.label}</span></div>
          <div className="fk-ai-simple__recipes">{recipes.slice(0, 3).map((recipe, index) => (
            <button className={selectedRecipe?.id === recipe.id ? "active" : ""} key={recipe.id || recipe.title} type="button" onClick={() => selectRecipe(recipe)}>
              <small>{recipe.badge || (index === 0 ? "BEST MATCH" : index === 1 ? "QUICK" : "TRY SOMETHING NEW")}</small>
              <strong>{recipe.title}</strong>
              <p>{recipe.summary || recipe.description}</p>
              <span><Clock3 size={14} /> {recipe.cooking_time || recipe.time || "30 min"}</span>
            </button>
          ))}</div>
        </section>
      )}

      {selectedRecipe && (
        <section className="fk-ai-simple__after">
          <article>
            <div className="fk-ai-simple__section-head"><div><small>WATCH & COOK</small><h2>See how it’s made</h2></div></div>
            <div className="fk-ai-simple__creator-list">
              {creatorVideos.length ? creatorVideos.slice(0, 2).map((item) => (
                <a href={item.url} key={item.id || item.url} target="_blank" rel="noreferrer"><span><Play size={17} /></span><div><strong>{item.title}</strong><small>Creator video · {item.creator_name || "FoodKindl Creator"} · {item.duration || "60 sec"}</small></div><em>CREATOR</em></a>
              )) : <p>No matching creator video yet.</p>}
              {selectedRecipe.ai_video?.url ? (
                <a href={selectedRecipe.ai_video.url} target="_blank" rel="noreferrer"><span><Play size={17} /></span><div><strong>Personalised AI cooking guide</strong><small>Made for your ingredients and selected mode</small></div><em>AI GUIDE</em></a>
              ) : (
                <button type="button" onClick={generateAiVideo} disabled={working === "video"}><WandSparkles size={18} /> {working === "video" ? "Generating…" : "Generate personalised AI video"}</button>
              )}
            </div>
          </article>

          <article>
            <div className="fk-ai-simple__section-head"><div><small>COMPLETE YOUR RECIPE</small><h2>{shopping.length ? `${shopping.length} items missing` : "You’re ready to cook"}</h2></div></div>
            {shopping.length ? <div className="fk-ai-simple__shopping">{shopping.map((rawItem) => {
              const item = typeof rawItem === "string" ? { name: rawItem } : rawItem;
              return <div key={item.name}><span><ShoppingBasket size={16} /><strong>{item.name}</strong></span><div>{RETAILERS.slice(0, 3).map((retailer) => <a key={retailer} href={item.links?.[retailer.toLowerCase()] || `https://www.google.com/search?q=${encodeURIComponent(`${retailer} buy ${item.name}`)}`} target="_blank" rel="noreferrer">{retailer}</a>)}</div></div>;
            })}</div> : <div className="fk-ai-simple__ready"><Check size={22} /><p>You already have the required ingredients.</p></div>}
          </article>
        </section>
      )}
    </main>
  );
}

