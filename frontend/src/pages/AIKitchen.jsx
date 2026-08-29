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

import {
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api
  from "../api";

import AIRecipeSearch
  from "../components/AIRecipeSearch";

import GroceryCompareOptions
  from "../components/GroceryCompareOptions";

import "../styles/ai_kitchen.css";


export default function AIKitchen() {

  const navigate =
    useNavigate();


  // =========================================================
  // MODE
  // =========================================================

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "ingredients"
  );


  // =========================================================
  // INGREDIENT INPUT
  // =========================================================

  const [
    ingredientInput,
    setIngredientInput,
  ] = useState("");


  const [
    ingredients,
    setIngredients,
  ] = useState([]);


  // =========================================================
  // GENERATED INGREDIENT RECIPE
  // =========================================================

  const [
    ingredientRecipe,
    setIngredientRecipe,
  ] = useState(null);


  const [
    selectedDish,
    setSelectedDish,
  ] = useState("");


  const [
    generatingIngredientRecipe,
    setGeneratingIngredientRecipe,
  ] = useState(false);


  const [
    ingredientError,
    setIngredientError,
  ] = useState("");



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

  const ingredientSummary =
    useMemo(
      () =>
        ingredients.join(
          ", "
        ),
      [
        ingredients,
      ]
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

  const groceryItems =
    useMemo(
      () => {

        if (!ingredientRecipe) {
          return [];
        }


        const rawItems =
          ingredientRecipe.shopping_list ||
          ingredientRecipe.missing_ingredients ||
          ingredientRecipe.required_ingredients_not_available ||
          ingredientRecipe.optional_ingredients ||
          [];


        function cleanGroceryName(
          rawValue
        ) {

          let value =
            String(
              rawValue ||
              ""
            )
              .trim();


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

          value =
            value.replace(
              /^\s*(?:\d+\s+)?\d*\/?\d+(?:\.\d+)?\s*/i,
              ""
            );


          value =
            value.replace(
              /^\s*(?:tsp|teaspoons?|tbsp|tablespoons?|cups?|cup|ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|g|grams?|kg|kilograms?|oz|ounces?|lb|lbs|pounds?|cloves?|pieces?|pcs?|pinch(?:es)?|bunch(?:es)?|cans?|packets?|packs?)\b\.?\s*/i,
              ""
            );


          // If quantity was written like "2-3 cloves garlic"
          value =
            value.replace(
              /^\s*(?:to\s+)?(?:tsp|teaspoons?|tbsp|tablespoons?|cups?|cup|ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|g|grams?|kg|kilograms?|oz|ounces?|lb|lbs|pounds?|cloves?|pieces?|pcs?|pinch(?:es)?|bunch(?:es)?|cans?|packets?|packs?)\b\.?\s*/i,
              ""
            );


          // Remove cooking preparation notes.
          value =
            value.replace(
              /\s*\([^)]*optional[^)]*\)\s*/gi,
              " "
            );


          value =
            value.replace(
              /\s*\boptional\b\s*/gi,
              " "
            );


          value =
            value.replace(
              /\s*,\s*(?:minced|chopped|finely chopped|sliced|diced|crushed|grated|peeled|ground|to taste|as needed).*$/i,
              ""
            );


          value =
            value.replace(
              /\s+/g,
              " "
            )
              .trim();


          if (!value) {
            return "";
          }


          // Product-style display name.
          return (
            value.charAt(0).toUpperCase() +
            value.slice(1)
          );
        }


        const cleanedItems =
          rawItems
            .map(
              item => {

                const rawName =
                  typeof item ===
                    "string"
                    ? item
                    : (
                        item?.name ||
                        item?.ingredient ||
                        item?.item ||
                        ""
                      );


                return {
                  name:
                    cleanGroceryName(
                      rawName
                    ),

                  // Deliberately do NOT show recipe quantity
                  // in the shopping list.
                  quantity:
                    "",

                  category:
                    typeof item ===
                      "object"
                      ? String(
                          item?.category ||
                          ""
                        ).trim()
                      : "",
                };
              }
            )
            .filter(
              item =>
                item.name
            );


        // Remove duplicate grocery products.
        return cleanedItems.filter(
          (
            item,
            index,
            array
          ) =>

            array.findIndex(
              candidate =>
                candidate.name
                  .toLowerCase() ===
                item.name
                  .toLowerCase()
            ) === index
        );
      },
      [
        ingredientRecipe,
      ]
    );



  // =========================================================
  // ADD INGREDIENT
  // =========================================================

  function addIngredient(
    rawIngredient =
      ingredientInput
  ) {

    const ingredient =
      String(
        rawIngredient || ""
      )
        .trim()
        .replace(
          /\s+/g,
          " "
        );


    if (!ingredient) {
      return;
    }


    const alreadyAdded =
      ingredients.some(
        item =>
          item.toLowerCase() ===
          ingredient.toLowerCase()
      );


    if (alreadyAdded) {

      setIngredientInput(
        ""
      );

      return;
    }


    setIngredients(
      current => [
        ...current,
        ingredient,
      ]
    );


    setIngredientInput(
      ""
    );


    // Ingredient list changed.
    // Clear the previous recommendation.
    setIngredientRecipe(
      null
    );


    setSelectedDish(
      ""
    );

    setIngredientError(
      ""
    );

  }


  // =========================================================
  // REMOVE INGREDIENT
  // =========================================================

  function removeIngredient(
    ingredient
  ) {

    setIngredients(
      current =>
        current.filter(
          item =>
            item !==
            ingredient
        )
    );


    setIngredientRecipe(
      null
    );


    setSelectedDish(
      ""
    );

    setIngredientError(
      ""
    );

  }


  // =========================================================
  // KEYBOARD INPUT
  // =========================================================

  function handleIngredientKeyDown(
    event
  ) {

    if (
      event.key === "Enter"
      ||
      event.key === ","
    ) {

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

    if (
      ingredients.length === 0
    ) {

      setIngredientError(
        "Please add at least one ingredient."
      );

      return;
    }


    setGeneratingIngredientRecipe(
      true
    );

    setIngredientError(
      ""
    );

    setIngredientRecipe(
      null
    );


    setSelectedDish(
      ""
    );


    try {

      const response =
        await api.post(
          "/ai/ingredient-recipe-book/",
          {
            ingredients:
              ingredients,
          },
          {
            timeout:
              300000,
          }
        );


      const recipe =
        response.data?.recipe;


      if (!recipe) {

        setIngredientError(
          "FoodKindl AI did not return a recipe."
        );

        return;
      }


      setSelectedDish(
        response.data
          ?.selected_dish
        ||
        recipe.title
        ||
        ""
      );


      setIngredientRecipe(
        recipe
      );


    } catch (
      requestError
    ) {

      console.error(
        "Ingredient recipe generation error:",
        requestError.response?.data
        ||
        requestError
      );


      if (
        requestError.code ===
        "ECONNABORTED"
      ) {

        setIngredientError(
          "FoodKindl AI is taking longer than expected. Please try again."
        );

        return;
      }


      setIngredientError(
        requestError.response
          ?.data
          ?.detail
        ||
        "FoodKindl AI could not create a recipe from these ingredients."
      );


    } finally {

      setGeneratingIngredientRecipe(
        false
      );

    }

  }


  return (

    <main className="ai-kitchen-page">


      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="ai-kitchen-glow ai-kitchen-glow-one" />

      <div className="ai-kitchen-glow ai-kitchen-glow-two" />


      {/* =====================================================
          TOP BAR
      ====================================================== */}

      <div className="ai-kitchen-topbar">

        <button
          type="button"
          className="ai-kitchen-back-button"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >

          <ArrowLeft size={17} />

          Back to Dashboard

        </button>


        <div className="ai-kitchen-brand-pill">

          <Sparkles size={14} />

          FoodKindl AI

        </div>

      </div>


      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="ai-kitchen-hero">


        <div className="ai-kitchen-hero-copy">

          <div className="ai-kitchen-hero-icon">

            <ChefHat size={28} />

          </div>


          <span className="ai-kitchen-eyebrow">

            YOUR AI COOKING COMPANION

          </span>


          <h1>

            Turn what you have
            into something{" "}

            <span>
              delicious.
            </span>

          </h1>


          <p>

            Add the ingredients already available
            in your kitchen. FoodKindl AI can
            decide what you can cook and create
            the complete recipe for you.

          </p>

        </div>


        {/* ===================================================
            QUICK TIPS
        ==================================================== */}

        <div className="ai-kitchen-tips-card">

          <div className="ai-kitchen-tips-header">

            <Lightbulb size={18} />

            <strong>
              Get better recipe ideas
            </strong>

          </div>


          <div className="ai-kitchen-tip-list">

            <span>

              <Utensils size={14} />

              Add the ingredients you actually
              have at home.

            </span>


            <span>

              <Utensils size={14} />

              FoodKindl AI will choose a suitable
              dish automatically.

            </span>


            <span>

              <Utensils size={14} />

              Pantry basics may be suggested as
              optional additions.

            </span>

          </div>

        </div>

      </section>


      {/* =====================================================
          LANGUAGE NOTE
      ====================================================== */}

      <section className="ai-kitchen-language-card">

        <div className="ai-kitchen-language-icon">

          <Info size={18} />

        </div>


        <div>

          <strong>
            Language support
          </strong>


          <p>

            For now, please use plain English
            ingredient names. Regional-language
            or local ingredient names may not
            always be recognised correctly.

          </p>


          <span>

            Regional language support is
            coming soon.

          </span>

        </div>

      </section>


        {/* =====================================================
    AI DISCLAIMER
====================================================== */}

<section className="ai-kitchen-ai-disclaimer">

  <div className="ai-kitchen-ai-disclaimer-icon">
    <Info size={18} />
  </div>

  <div>

    <strong>
      AI can make mistakes
    </strong>

    <p>
      FoodKindl AI may occasionally provide inaccurate
      ingredient quantities, cooking times or instructions.
      Please review the recipe and use your own judgement
      while cooking.
    </p>

    <span>
      Always check allergies, dietary restrictions and
      food-safety requirements before preparing or
      consuming food.
    </span>

  </div>

</section>

      {/* =====================================================
          AI KITCHEN MODES
      ====================================================== */}

      <section className="ai-kitchen-mode-section">


        <div className="ai-kitchen-mode-header">

          <div>

            <span>

              CHOOSE HOW YOU WANT TO COOK

            </span>


            <h2>

              What can FoodKindl AI
              help you with?

            </h2>

          </div>

        </div>


        {/* ===================================================
            TABS
        ==================================================== */}

        <div className="ai-kitchen-tabs">


          <button
            type="button"
            className={
              activeTab ===
              "ingredients"
                ? (
                  "ai-kitchen-tab "
                  +
                  "ai-kitchen-tab-ingredients "
                  +
                  "active"
                )
                : (
                  "ai-kitchen-tab "
                  +
                  "ai-kitchen-tab-ingredients"
                )
            }
            onClick={() =>
              setActiveTab(
                "ingredients"
              )
            }
          >

            <span className="ai-kitchen-tab-icon">

              <BookOpen size={18} />

            </span>


            <span className="ai-kitchen-tab-copy">

              <small>
                RECOMMENDED
              </small>

              <strong>
                Cook With My Ingredients
              </strong>

              <em>

                Add what you have.
                AI chooses the dish.

              </em>

            </span>


            <Sparkles
              size={15}
              className="ai-kitchen-tab-sparkle"
            />

          </button>


          <button
            type="button"
            className={
              activeTab ===
              "discover"
                ? "ai-kitchen-tab active"
                : "ai-kitchen-tab"
            }
            onClick={() =>
              setActiveTab(
                "discover"
              )
            }
          >

            <span className="ai-kitchen-tab-icon">

              <WandSparkles size={18} />

            </span>


            <span className="ai-kitchen-tab-copy">

              <small>
                RECIPE SEARCH
              </small>

              <strong>
                I Know What I Want
              </strong>

              <em>

                Enter a dish name and
                generate its recipe.

              </em>

            </span>

          </button>

        </div>


        {/* ===================================================
            TAB 1
            COOK WITH MY INGREDIENTS
        ==================================================== */}

        {
          activeTab ===
            "ingredients"
          &&
          (

            <div className="ai-ingredients-workspace">


              <div className="ai-ingredients-heading">

                <div className="ai-ingredients-heading-icon">

                  <ChefHat size={20} />

                </div>


                <div>

                  <span>

                    WHAT'S IN YOUR KITCHEN?

                  </span>


                  <h2>

                    Add your ingredients

                  </h2>


                  <p>

                    Tell FoodKindl what you have.
                    You do not need to decide the
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
                  value={
                    ingredientInput
                  }
                  onChange={
                    event =>
                      setIngredientInput(
                        event.target.value
                      )
                  }
                  onKeyDown={
                    handleIngredientKeyDown
                  }
                  placeholder="e.g. tomato, onion, garlic..."
                />


                <button
                  type="button"
                  onClick={() =>
                    addIngredient()
                  }
                  disabled={
                    !ingredientInput.trim()
                  }
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

              {
                ingredients.length >
                  0
                &&
                (

                  <div className="ai-selected-ingredients">

                    <div className="ai-selected-ingredients-title">

                      <span>

                        YOUR INGREDIENTS

                      </span>


                      <strong>

                        {
                          ingredients.length
                        }

                      </strong>

                    </div>


                    <div className="ai-ingredient-chip-list">

                      {
                        ingredients.map(
                          ingredient => (

                            <span
                              key={
                                ingredient
                              }
                              className="ai-ingredient-chip"
                            >

                              {
                                ingredient
                              }


                              <button
                                type="button"
                                onClick={() =>
                                  removeIngredient(
                                    ingredient
                                  )
                                }
                                aria-label={
                                  `Remove ${ingredient}`
                                }
                              >

                                <X size={11} />

                              </button>

                            </span>

                          )
                        )
                      }

                    </div>

                  </div>

                )
              }


              {/* ===============================================
                  QUICK ADD
              ================================================ */}

              <div className="ai-quick-ingredients">

                <span>
                  QUICK ADD
                </span>


                <div>

                  {
                    quickIngredients.map(
                      ingredient => (

                        <button
                          key={
                            ingredient
                          }
                          type="button"
                          onClick={() =>
                            addIngredient(
                              ingredient
                            )
                          }
                        >

                          <Plus size={11} />

                          {
                            ingredient
                          }

                        </button>

                      )
                    )
                  }

                </div>

              </div>


              {/* ===============================================
                  EXAMPLE
              ================================================ */}

              <div className="ai-ingredient-example">

                <Sparkles size={15} />


                <div>

                  <strong>
                    How it works
                  </strong>


                  <p>

                    Tomato + onion + garlic
                    can become Tomato Curry.
                    Chicken + tomato + onion
                    can become Chicken Curry.

                  </p>

                </div>

              </div>


              {/* ===============================================
                  ERROR
              ================================================ */}

              {
                ingredientError
                &&
                (

                  <div className="ai-ingredient-error">

                    {
                      ingredientError
                    }

                  </div>

                )
              }


              {/* ===============================================
                  CREATE RECIPE BOOK
              ================================================ */}

              <button
                type="button"
                className="ai-create-recipe-book"
                onClick={
                  createRecipeBook
                }
                disabled={
                  ingredients.length ===
                    0
                  ||
                  generatingIngredientRecipe
                }
              >

                <span>

                  {
                    generatingIngredientRecipe
                      ? (
                        <Sparkles size={19} />
                      )
                      : (
                        <BookOpen size={19} />
                      )
                  }

                </span>


                <div>

                  <strong>

                    {
                      generatingIngredientRecipe
                        ? (
                          "FoodKindl AI is deciding what to cook..."
                        )
                        : (
                          "Create My Recipe Book"
                        )
                    }

                  </strong>


                  <small>

                    {
                      generatingIngredientRecipe
                        ? (
                          "Finding the best dish from your ingredients"
                        )
                        : (
                          "No dish name needed — let AI choose for you"
                        )
                    }

                  </small>

                </div>


                <Sparkles size={17} />

              </button>


              {/* ===============================================
                  RESULT
              ================================================ */}

              {
                ingredientRecipe
                &&
                (

                  <div className="ai-generated-recipe-area">


                    <div className="ai-generated-recipe-title">

                      <div>

                        <span>
                          FOODKINDL AI SUGGESTS
                        </span>


                        <h2>

                          {
                            selectedDish
                            ||
                            ingredientRecipe.title
                          }

                        </h2>

                      </div>


                      <BookOpen size={22} />

                    </div>


                    <div className="ai-recipe-prompt-preview">

                      <span>

                        Based on your ingredients

                      </span>


                      <strong>

                        {
                          ingredientSummary
                        }

                      </strong>

                    </div>


                    {
                      ingredientRecipe
                        .match_percentage
                        !== undefined
                      &&
                      (

                        <div className="ai-recipe-match">

                          <CheckCircle2 size={16} />

                          <strong>

                            {
                              ingredientRecipe
                                .match_percentage
                            }
                            % ingredient match

                          </strong>

                        </div>

                      )
                    }


                    {
                      ingredientRecipe.reason
                      &&
                      (

                        <div className="ai-recipe-reason">

                          <Sparkles size={16} />

                          <p>

                            {
                              ingredientRecipe.reason
                            }

                          </p>

                        </div>

                      )
                    }


                    {
                      ingredientRecipe.description
                      &&
                      (

                        <p className="ai-recipe-description">

                          {
                            ingredientRecipe.description
                          }

                        </p>

                      )
                    }


                    <div className="ai-recipe-meta-grid">


                      {
                        ingredientRecipe.prep_time
                        &&
                        (

                          <div>

                            <Clock3 size={15} />

                            <span>
                              Prep
                            </span>

                            <strong>

                              {
                                ingredientRecipe
                                  .prep_time
                              }

                            </strong>

                          </div>

                        )
                      }


                      {
                        ingredientRecipe.cook_time
                        &&
                        (

                          <div>

                            <Clock3 size={15} />

                            <span>
                              Cook
                            </span>

                            <strong>

                              {
                                ingredientRecipe
                                  .cook_time
                              }

                            </strong>

                          </div>

                        )
                      }


                      {
                        ingredientRecipe.servings
                        &&
                        (

                          <div>

                            <Utensils size={15} />

                            <span>
                              Serves
                            </span>

                            <strong>

                              {
                                ingredientRecipe
                                  .servings
                              }

                            </strong>

                          </div>

                        )
                      }

                    </div>


                    {/* =========================================
                        INGREDIENTS USED
                    ========================================== */}

                    {
                      ingredientRecipe
                        .ingredients_used
                        ?.length >
                        0
                      &&
                      (

                        <section className="ai-recipe-book-section">

                          <h3>
                            Ingredients from your kitchen
                          </h3>


                          <div className="ai-recipe-book-list">

                            {
                              ingredientRecipe
                                .ingredients_used
                                .map(
                                  ingredient => (

                                    <div
                                      key={
                                        ingredient
                                      }
                                    >

                                      <CheckCircle2 size={14} />

                                      <span>
                                        {ingredient}
                                      </span>

                                    </div>

                                  )
                                )
                            }

                          </div>

                        </section>

                      )
                    }


                    {/* =========================================
                        OPTIONAL INGREDIENTS
                    ========================================== */}

                    {
                      ingredientRecipe
                        .optional_ingredients
                        ?.length >
                        0
                      &&
                      (

                        <section className="ai-recipe-book-section">

                          <h3>
                            Optional additions
                          </h3>


                          <div className="ai-recipe-book-list optional">

                            {
                              ingredientRecipe
                                .optional_ingredients
                                .map(
                                  (
                                    ingredient,
                                    index
                                  ) => (

                                    <div
                                      key={
                                        `${ingredient}-${index}`
                                      }
                                    >

                                      <Plus size={14} />

                                      <span>
                                        {ingredient}
                                      </span>

                                    </div>

                                  )
                                )
                            }

                          </div>

                        </section>

                      )
                    }


                    {/* =========================================
                        UNUSED INGREDIENTS
                    ========================================== */}

                    {
                      ingredientRecipe
                        .unused_ingredients
                        ?.length >
                        0
                      &&
                      (

                        <section className="ai-recipe-book-section">

                          <h3>
                            Keep aside for another dish
                          </h3>


                          <div className="ai-recipe-book-list muted">

                            {
                              ingredientRecipe
                                .unused_ingredients
                                .map(
                                  ingredient => (

                                    <div
                                      key={
                                        ingredient
                                      }
                                    >

                                      <span>
                                        {ingredient}
                                      </span>

                                    </div>

                                  )
                                )
                            }

                          </div>

                        </section>

                      )
                    }


                    {/* =========================================
                        STEPS
                    ========================================== */}

                    {
                      ingredientRecipe
                        .steps
                        ?.length >
                        0
                      &&
                      (

                        <section className="ai-recipe-book-section">

                          <h3>
                            How to make it
                          </h3>


                          <div className="ai-recipe-step-list">

                            {
                              ingredientRecipe
                                .steps
                                .map(
                                  (
                                    step,
                                    index
                                  ) => (

                                    <div
                                      key={
                                        `${index}-${step}`
                                      }
                                    >

                                      <span>
                                        {index + 1}
                                      </span>

                                      <p>
                                        {step}
                                      </p>

                                    </div>

                                  )
                                )
                            }

                          </div>

                        </section>

                      )
                    }


                    {/* =========================================
                        TIPS
                    ========================================== */}

                    {
                      ingredientRecipe
                        .tips
                        ?.length >
                        0
                      &&
                      (

                        <section className="ai-recipe-book-section">

                          <h3>
                            FoodKindl chef tips
                          </h3>


                          <div className="ai-recipe-tip-list">

                            {
                              ingredientRecipe
                                .tips
                                .map(
                                  (
                                    tip,
                                    index
                                  ) => (

                                    <p
                                      key={
                                        `${index}-${tip}`
                                      }
                                    >

                                      <Lightbulb size={14} />

                                      {tip}

                                    </p>

                                  )
                                )
                            }

                          </div>

                        </section>

                      )
                    }


                    {
                      ingredientRecipe
                        .serving_suggestion
                      &&
                      (

                        <section className="ai-recipe-book-section">

                          <h3>
                            Serving suggestion
                          </h3>

                          <p>
                            {
                              ingredientRecipe
                                .serving_suggestion
                            }
                          </p>

                        </section>

                      )
                    }


                    {
                      ingredientRecipe
                        .food_safety
                      &&
                      (

                        <section className="ai-recipe-book-section">

                          <h3>
                            Food safety
                          </h3>

                          <p>
                            {
                              ingredientRecipe
                                .food_safety
                            }
                          </p>

                        </section>

                      )
                    }


                    {/* =========================================
                        BUY THESE GROCERIES
                    ========================================== */}

                    <GroceryCompareOptions
                      recipeTitle={
                        selectedDish ||
                        ingredientRecipe.title ||
                        ""
                      }
                      groceryItems={
                        groceryItems
                      }
                    />


                  </div>

                )
              }

            </div>

          )
        }


        {/* ===================================================
            TAB 2 — NORMAL DISH SEARCH

            Only this tab contains AIRecipeSearch.
            Therefore the "What would you like to cook?"
            question appears ONLY when the user explicitly
            chooses "I Know What I Want".
        ==================================================== */}

        {
          activeTab ===
            "discover"
          &&
          (

            <div className="ai-kitchen-workspace">


              <div className="ai-kitchen-workspace-header">

                <div>

                  <span>

                    FOODKINDL AI RECIPE STUDIO

                  </span>


                  <h2>

                    Search for a specific dish

                  </h2>

                </div>


                <div className="ai-kitchen-powered">

                  <Sparkles size={14} />

                  AI-powered

                </div>

              </div>


              <div className="ai-kitchen-search-shell">

                <AIRecipeSearch />

              </div>

            </div>

          )
        }

      </section>

    </main>

  );
}
