import {

  ArrowLeft,

  BookOpen,

  CheckCircle2,

  ChefHat,

  Clock3,

  Info,

  Lightbulb,

  Plus,

  Sparkles,

  Utensils,

  WandSparkles,

  X,

} from "lucide-react";

import { useMemo, useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../api";

import AIRecipeSearch from "../components/AIRecipeSearch";

import GroceryCompareOptions from "../components/GroceryCompareOptions";

import "../styles/ai_kitchen.css";
import "../styles/ai_kitchen_simple.css";

export default function AIKitchen() {

  const navigate = useNavigate();

  // =========================================================

  // MODE

  // =========================================================

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("mode");
  function openMode(mode) {
    setSearchParams({ mode });
  }
  function goBack() {
    if (activeTab) setSearchParams({});
    else navigate("/dashboard");
  }

  // =========================================================

  // INGREDIENT INPUT

  // =========================================================

  const [ingredientInput, setIngredientInput] = useState("");

  const [ingredients, setIngredients] = useState([]);

  // =========================================================

  // GENERATED INGREDIENT RECIPE

  // =========================================================

  const [ingredientRecipe, setIngredientRecipe] = useState(null);

  const [selectedDish, setSelectedDish] = useState("");

  const [generatingIngredientRecipe, setGeneratingIngredientRecipe] =

    useState(false);

  const [ingredientError, setIngredientError] = useState("");

  // =========================================================

  // QUICK INGREDIENTS

  // =========================================================

  const quickIngredients = [

    "Chicken",

    "Tomato",

    "Onion",

    "Garlic",

    "Egg",

    "Potato",

    "Rice",

    "Paneer",

    "Milk",

  ];

  // =========================================================

  // INGREDIENT SUMMARY

  // =========================================================

  const ingredientSummary = useMemo(

    () => ingredients.join(", "),

    [ingredients],

  );

  // =========================================================

  // SHOPPING LIST

  //

  // Preferred backend fields:

  // 1. shopping_list

  // 2. missing_ingredients

  // 3. required_ingredients_not_available

  //

  // Fallback:

  // optional_ingredients

  // =========================================================

  const groceryItems = useMemo(() => {

    if (!ingredientRecipe) {

      return [];

    }

    const rawItems =

      ingredientRecipe.shopping_list ||

      ingredientRecipe.missing_ingredients ||

      ingredientRecipe.required_ingredients_not_available ||

      ingredientRecipe.optional_ingredients ||

      [];

    function cleanGroceryName(rawValue) {

      let value = String(rawValue || "").trim();

      // -----------------------------------------------------

      // REMOVE COMMON RECIPE QUANTITIES / UNITS

      //

      // Examples:

      // "1 tbsp olive oil"          -> "olive oil"

      // "1 tsp salt"                -> "salt"

      // "1/2 tsp black pepper"      -> "black pepper"

      // "1 clove garlic, minced"    -> "garlic"

      // "1 tsp paprika (optional)"  -> "paprika"

      // -----------------------------------------------------

      value = value.replace(/^\s*\d+(?:\s*[-/]\s*\d+)?(?:\.\d+)?\s*/i, "");
      value = value.replace(
        /^(?:to\s+)?(?:tsp|teaspoons?|tbsp|tablespoons?|cups?|ml|millilit(?:er|re)s?|lit(?:er|re)s?|g|grams?|kg|kilograms?|oz|ounces?|lb|lbs|pounds?|cloves?|pieces?|pcs?|pinch(?:es)?|bunch(?:es)?|cans?|packets?|packs?)\b\.?\s*/i,
        "",
      );
      value = value.replace(/\s*\([^)]*optional[^)]*\)\s*/gi, " ");
      value = value.replace(/\s*\boptional\b\s*/gi, " ");
      value = value.replace(
        /\s*,\s*(?:minced|chopped|finely chopped|sliced|diced|crushed|grated|peeled|ground|to taste|as needed).*$/i,
        "",
      );

      value = value.replace(/\s+/g, " ").trim();

      if (!value) {

        return "";

      }

      // Product-style display name.

      return value.charAt(0).toUpperCase() + value.slice(1);

    }

    const cleanedItems = rawItems

      .map((item) => {

        const rawName =

          typeof item === "string"

            ? item

            : item?.name || item?.ingredient || item?.item || "";

        return {

          name: cleanGroceryName(rawName),

          // Deliberately do NOT show recipe quantity

          // in the shopping list.

          quantity: "",

          category:

            typeof item === "object" ? String(item?.category || "").trim() : "",

        };

      })

      .filter((item) => item.name);

    // Remove duplicate grocery products.

    return cleanedItems.filter(

      (item, index, array) =>

        array.findIndex(

          (candidate) =>

            candidate.name.toLowerCase() === item.name.toLowerCase(),

        ) === index,

    );

  }, [ingredientRecipe]);

  // =========================================================

  // ADD INGREDIENT

  // =========================================================

  function addIngredient(rawIngredient = ingredientInput) {

    const ingredient = String(rawIngredient || "")

      .trim()

      .replace(/\s+/g, " ");

    if (!ingredient) {

      return;

    }

    const alreadyAdded = ingredients.some(

      (item) => item.toLowerCase() === ingredient.toLowerCase(),

    );

    if (alreadyAdded) {

      setIngredientInput("");

      return;

    }

    setIngredients((current) => [...current, ingredient]);

    setIngredientInput("");

    // Ingredient list changed.

    // Clear the previous recommendation.

    setIngredientRecipe(null);

    setSelectedDish("");

    setIngredientError("");

  }

  // =========================================================

  // REMOVE INGREDIENT

  // =========================================================

  function removeIngredient(ingredient) {

    setIngredients((current) => current.filter((item) => item !== ingredient));

    setIngredientRecipe(null);

    setSelectedDish("");

    setIngredientError("");

  }

  // =========================================================

  // KEYBOARD INPUT

  // =========================================================

  function handleIngredientKeyDown(event) {

    if (event.key === "Enter" || event.key === ",") {

      event.preventDefault();

      addIngredient();

    }

  }

  // =========================================================

  // AI — GENERATE DIRECTLY FROM INGREDIENTS

  //

  // IMPORTANT:

  // This does NOT open AIRecipeSearch.

  // This does NOT ask "What would you like to cook?"

  //

  // Example:

  // Tomato + Onion + Garlic

  //          ↓

  // FoodKindl AI decides "Tomato Curry"

  //          ↓

  // Full recipe is returned.

  // =========================================================

  async function createRecipeBook() {

    if (ingredients.length === 0) {

      setIngredientError("Please add at least one ingredient.");

      return;

    }

    setGeneratingIngredientRecipe(true);

    setIngredientError("");

    setIngredientRecipe(null);

    setSelectedDish("");

    try {

      const response = await api.post(

        "/ai/ingredient-recipe-book/",

        {

          ingredients: ingredients,

        },

        {

          timeout: 300000,

        },

      );

      const recipe = response.data?.recipe;

      if (!recipe) {

        setIngredientError("FoodKindl AI did not return a recipe.");

        return;

      }

      setSelectedDish(response.data?.selected_dish || recipe.title || "");

      setIngredientRecipe(recipe);

    } catch (requestError) {

      console.error(

        "Ingredient recipe generation error:",

        requestError.response?.data || requestError,

      );

      if (requestError.code === "ECONNABORTED") {

        setIngredientError(

          "FoodKindl AI is taking longer than expected. Please try again.",

        );

        return;

      }

      setIngredientError(

        requestError.response?.data?.detail ||

          "FoodKindl AI could not create a recipe from these ingredients.",

      );

    } finally {

      setGeneratingIngredientRecipe(false);

    }

  }

  return (
    <main className="ai-kitchen-page ai-kitchen-simple">
      <div className="ai-simple-wrap">
        <header className="ai-simple-topbar">
          <button type="button" onClick={goBack} className="ai-simple-back">
            <ArrowLeft size={18} /> {activeTab ? "Choose another option" : "Dashboard"}
          </button>
          
        </header>

        {!activeTab && (
          <section className="ai-simple-home" aria-label="Choose how to cook">
            <span className="ai-simple-eyebrow">MAKE SOMETHING GOOD</span>
            <h1>What would you like to cook?</h1>
            <p>Choose one way to start. You can switch at any time.</p>
            <div className="ai-simple-choices">
              <button type="button" className="ai-simple-choice" onClick={() => openMode("ingredients")}>
                <span className="ai-simple-choice-icon"><Utensils size={27} /></span>
                <strong>Cook with what I have</strong>
                <span>Add ingredients from your kitchen and get a recipe you can make.</span>
                <b>Use my ingredients →</b>
              </button>
              <button type="button" className="ai-simple-choice" onClick={() => openMode("discover")}>
                <span className="ai-simple-choice-icon"><BookOpen size={27} /></span>
                <strong>Search any recipe</strong>
                <span>Enter a dish you want to make and get its recipe.</span>
                <b>Search for a dish →</b>
              </button>
            </div>
          </section>
        )}

        {activeTab === "ingredients" && (
          <section className="ai-simple-flow">
            <div className="ai-editorial-stage">
              <div className="ai-editorial-form">
                <div className="ai-simple-heading">
                  <span className="ai-simple-eyebrow">COOK WITH WHAT I HAVE</span>
                  <h1>What’s cooking today?</h1>
                  <p>Add ingredients you have. We’ll create a recipe for you.</p>
                </div>

          <div className="ai-ingredients-workspace">

            <div className="ai-ingredients-heading">

              <div className="ai-ingredients-heading-icon">

                <ChefHat size={20} />

              </div>

              <div>

                <span>WHAT'S IN YOUR KITCHEN?</span>

                <h2>Add your ingredients</h2>

                <p>

                  Tell FoodKindl what you have. You do not need to decide the

                  dish — the AI will do that.

                </p>

              </div>

            </div>

            {/* ===============================================

                  INGREDIENT INPUT

              ================================================ */}

            <div className="ai-ingredient-input-shell">

              <input

                type="text"

                value={ingredientInput}

                onChange={(event) => setIngredientInput(event.target.value)}

                onKeyDown={handleIngredientKeyDown}

                placeholder="e.g. tomato, onion, garlic..."

              />

              <button

                type="button"

                onClick={() => addIngredient()}

                disabled={!ingredientInput.trim()}

              >

                <Plus size={16} />

                Add

              </button>

            </div>

            <small className="ai-ingredient-input-help">

              Press Enter after each ingredient.

            </small>

            {/* ===============================================

                  SELECTED INGREDIENTS

              ================================================ */}

            {ingredients.length > 0 && (

              <div className="ai-selected-ingredients">

                <div className="ai-selected-ingredients-title">

                  <span>YOUR INGREDIENTS</span>

                  <strong>{ingredients.length}</strong>

                </div>

                <div className="ai-ingredient-chip-list">

                  {ingredients.map((ingredient) => (

                    <span key={ingredient} className="ai-ingredient-chip">

                      {ingredient}

                      <button

                        type="button"

                        onClick={() => removeIngredient(ingredient)}

                        aria-label={`Remove ${ingredient}`}

                      >

                        <X size={11} />

                      </button>

                    </span>

                  ))}

                </div>

              </div>

            )}

            {/* ===============================================

                  QUICK ADD

              ================================================ */}

            <div className="ai-quick-ingredients">

              <span>QUICK ADD</span>

              <div>

                {quickIngredients.map((ingredient) => (

                  <button

                    key={ingredient}

                    type="button"

                    onClick={() => addIngredient(ingredient)}

                  >

                    <Plus size={11} />

                    {ingredient}

                  </button>

                ))}

              </div>

            </div>

            {/* ===============================================

                  EXAMPLE

              ================================================ */}

            {ingredientError && (

              <div className="ai-ingredient-error">{ingredientError}</div>

            )}

            {/* ===============================================

                  CREATE RECIPE BOOK

              ================================================ */}

            <button

              type="button"

              className="ai-create-recipe-book"

              onClick={createRecipeBook}

              disabled={ingredients.length === 0 || generatingIngredientRecipe}

            >

              <span>

                {generatingIngredientRecipe ? (

                  <Sparkles size={19} />

                ) : (

                  <BookOpen size={19} />

                )}

              </span>

              <div>

                <strong>

                  {generatingIngredientRecipe

                    ? "FoodKindl AI is deciding what to cook..."

                    : "Find a recipe"}

                </strong>

                <small>

                  {generatingIngredientRecipe

                    ? "Finding the best dish from your ingredients"

                    : "No dish name needed — let AI choose for you"}

                </small>

              </div>

              <Sparkles size={17} />

            </button>

          </div>
              </div>
              
            </div>
            <div className="ai-editorial-results">
            {/* ===============================================

                  RESULT

              ================================================ */}

            {ingredientRecipe && (

              <div className="ai-generated-recipe-area">

                <div className="ai-generated-recipe-title">

                  <div>

                    <span>FOODKINDL AI SUGGESTS</span>

                    <h2>{selectedDish || ingredientRecipe.title}</h2>

                  </div>

                  <BookOpen size={22} />

                </div>

                <div className="ai-recipe-prompt-preview">

                  <span>Based on your ingredients</span>

                  <strong>{ingredientSummary}</strong>

                </div>

                {ingredientRecipe.match_percentage !== undefined && (

                  <div className="ai-recipe-match">

                    <CheckCircle2 size={16} />

                    <strong>

                      {ingredientRecipe.match_percentage}% ingredient match

                    </strong>

                  </div>

                )}

                {ingredientRecipe.reason && (

                  <div className="ai-recipe-reason">

                    <Sparkles size={16} />

                    <p>{ingredientRecipe.reason}</p>

                  </div>

                )}

                {ingredientRecipe.description && (

                  <p className="ai-recipe-description">

                    {ingredientRecipe.description}

                  </p>

                )}

                <div className="ai-recipe-meta-grid">

                  {ingredientRecipe.prep_time && (

                    <div>

                      <Clock3 size={15} />

                      <span>Prep</span>

                      <strong>{ingredientRecipe.prep_time}</strong>

                    </div>

                  )}

                  {ingredientRecipe.cook_time && (

                    <div>

                      <Clock3 size={15} />

                      <span>Cook</span>

                      <strong>{ingredientRecipe.cook_time}</strong>

                    </div>

                  )}

                  {ingredientRecipe.servings && (

                    <div>

                      <Utensils size={15} />

                      <span>Serves</span>

                      <strong>{ingredientRecipe.servings}</strong>

                    </div>

                  )}

                </div>

                {/* =========================================

                        INGREDIENTS USED

                    ========================================== */}

                {ingredientRecipe.ingredients_used?.length > 0 && (

                  <section className="ai-recipe-book-section">

                    <h3>Ingredients from your kitchen</h3>

                    <div className="ai-recipe-book-list">

                      {ingredientRecipe.ingredients_used.map((ingredient) => (

                        <div key={ingredient}>

                          <CheckCircle2 size={14} />

                          <span>{ingredient}</span>

                        </div>

                      ))}

                    </div>

                  </section>

                )}

                {/* =========================================

                        OPTIONAL INGREDIENTS

                    ========================================== */}

                {ingredientRecipe.optional_ingredients?.length > 0 && (

                  <section className="ai-recipe-book-section">

                    <h3>Optional additions</h3>

                    <div className="ai-recipe-book-list optional">

                      {ingredientRecipe.optional_ingredients.map(

                        (ingredient, index) => (

                          <div key={`${ingredient}-${index}`}>

                            <Plus size={14} />

                            <span>{ingredient}</span>

                          </div>

                        ),

                      )}

                    </div>

                  </section>

                )}

                {/* =========================================

                        UNUSED INGREDIENTS

                    ========================================== */}

                {ingredientRecipe.unused_ingredients?.length > 0 && (

                  <section className="ai-recipe-book-section">

                    <h3>Keep aside for another dish</h3>

                    <div className="ai-recipe-book-list muted">

                      {ingredientRecipe.unused_ingredients.map((ingredient) => (

                        <div key={ingredient}>

                          <span>{ingredient}</span>

                        </div>

                      ))}

                    </div>

                  </section>

                )}

                {/* =========================================

                        STEPS

                    ========================================== */}

                {ingredientRecipe.steps?.length > 0 && (

                  <section className="ai-recipe-book-section">

                    <h3>How to make it</h3>

                    <div className="ai-recipe-step-list">

                      {ingredientRecipe.steps.map((step, index) => {

                        const cleanStep = String(step || "")

                          .replace(/^\s*(?:step\s*)?\d+\s*[.)\-:]\s*/i, "")

                          .trim();

                        return (

                          <div key={`${index}-${cleanStep}`}>

                            <p>{cleanStep}</p>

                          </div>

                        );

                      })}

                    </div>

                  </section>

                )}

                {/* =========================================

                        TIPS

                    ========================================== */}

                {ingredientRecipe.tips?.length > 0 && (

                  <section className="ai-recipe-book-section">

                    <h3>FoodKindl chef tips</h3>

                    <div className="ai-recipe-tip-list">

                      {ingredientRecipe.tips.map((tip, index) => (

                        <p key={`${index}-${tip}`}>

                          <Lightbulb size={14} />

                          {tip}

                        </p>

                      ))}

                    </div>

                  </section>

                )}

                {ingredientRecipe.serving_suggestion && (

                  <section className="ai-recipe-book-section">

                    <h3>Serving suggestion</h3>

                    <p>{ingredientRecipe.serving_suggestion}</p>

                  </section>

                )}

                {ingredientRecipe.food_safety && (

                  <section className="ai-recipe-book-section">

                    <h3>Food safety</h3>

                    <p>{ingredientRecipe.food_safety}</p>

                  </section>

                )}

                {/* =========================================

                        BUY THESE GROCERIES

                    ========================================== */}

                <GroceryCompareOptions

                  recipeTitle={selectedDish || ingredientRecipe.title || ""}

                  groceryItems={groceryItems}

                />

              </div>

            )}

            </div>
          </section>
        )}

        {activeTab === "discover" && (
          <section className="ai-simple-flow">
            <div className="ai-editorial-stage">
              <div className="ai-editorial-form">
                <div className="ai-simple-heading">
                  <span className="ai-simple-eyebrow">SEARCH ANY RECIPE</span>
                  <h1>Have a dish in mind?</h1>
                  <p>Search for a dish and get ingredients and cooking steps.</p>
                </div>
                <AIRecipeSearch />
              </div>
             
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
