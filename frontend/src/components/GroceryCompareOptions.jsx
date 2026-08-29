import {
  CheckCircle2,
  ExternalLink,
  ShoppingCart,
  Store,
  X,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import api from "../api";

import "../styles/grocery_compare_options.css";


export default function GroceryCompareOptions({
  recipeTitle = "",
  groceryItems = [],
}) {

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);


  const [
    checkedItems,
    setCheckedItems,
  ] = useState({});


  const [
    openingPartner,
    setOpeningPartner,
  ] = useState("");


  // =========================================================
  // CLEAN SHOPPING QUERY
  // =========================================================

  const shoppingQuery =
    useMemo(
      () => {

        return groceryItems
          .map(
            item => {

              if (
                typeof item === "string"
              ) {
                return item;
              }

              return (
                item?.name ||
                ""
              );

            }
          )
          .filter(Boolean)
          .join(" ");

      },
      [
        groceryItems,
      ]
    );


  // =========================================================
  // GROCERY PARTNERS
  // IMPORTANT:
  // key must match Django GroceryPartner slug
  // =========================================================

  const partners = [

    {
      key:
        "blinkit",

      name:
        "Blinkit",

      description:
        "Quick grocery delivery",

      shortName:
        "B",

      className:
        "blinkit",
    },

    {
      key:
        "swiggy-instamart",

      name:
        "Swiggy Instamart",

      description:
        "Groceries and essentials",

      shortName:
        "S",

      className:
        "swiggy",
    },

    {
      key:
        "amazon",

      name:
        "Amazon",

      description:
        "Shop grocery products",

      shortName:
        "A",

      className:
        "amazon",
    },

  ];


  // =========================================================
  // SELECT / UNSELECT GROCERY ITEM
  // =========================================================

  function toggleItem(
    index
  ) {

    setCheckedItems(
      current => ({
        ...current,

        [index]:
          !current[index],
      })
    );

  }


  // =========================================================
  // GET GROCERY NAME
  // =========================================================

  function getGroceryName(
    item
  ) {

    if (
      typeof item === "string"
    ) {
      return item;
    }

    return (
      item?.name ||
      ""
    );

  }


  // =========================================================
  // GET GROCERY CATEGORY
  // =========================================================

  function getGroceryCategory(
    item
  ) {

    if (
      typeof item === "string"
    ) {
      return "";
    }

    return (
      item?.category ||
      ""
    );

  }


  // =========================================================
  // BUILD SHOPPING LIST FOR BACKEND
  // =========================================================

  function getShoppingList() {

    return groceryItems
      .map(
        item =>
          getGroceryName(
            item
          )
      )
      .filter(Boolean);

  }


  // =========================================================
  // PARTNER CLICK
  //
  // Flow:
  //
  // User clicks Blinkit
  //       ↓
  // POST /commerce/grocery-click/
  //       ↓
  // Django creates:
  // FK-BLINKIT-XXXXXXXXXX
  //       ↓
  // Django returns redirect_url
  //       ↓
  // Open Blinkit
  // =========================================================

  async function openPartner(
    partner
  ) {

    if (
      openingPartner
    ) {
      return;
    }


    try {

      setOpeningPartner(
        partner.key
      );


      const response =
        await api.post(
          "/commerce/grocery-click/",
          {

            partner:
              partner.key,

            recipe_title:
              recipeTitle,

            grocery_items:
              getShoppingList(),

          }
        );


      const trackingCode =
        response.data
          ?.tracking_code;


      const redirectUrl =
        response.data
          ?.redirect_url;


      console.log(
        "FoodKindl Grocery Tracking:",
        {
          partner:
            partner.name,

          trackingCode,

          redirectUrl,
        }
      );


      if (
        !redirectUrl
      ) {

        console.error(
          "FoodKindl: No redirect URL received."
        );

        return;
      }


      window.open(
        redirectUrl,
        "_blank",
        "noopener,noreferrer"
      );


    } catch (
      error
    ) {

      console.error(
        "FoodKindl grocery tracking error:",
        error.response?.data ||
        error.message ||
        error
      );


      /*
        IMPORTANT:

        We intentionally do NOT directly open
        Blinkit / Swiggy / Amazon here.

        Why?

        Because if tracking fails, sending the
        user directly to the partner means
        FoodKindl loses the click attribution.

        Once your production API is stable,
        you can choose whether you want a
        fallback redirect.
      */

    } finally {

      setOpeningPartner("");

    }

  }


  // =========================================================
  // EMPTY STATE
  // =========================================================

  if (
    !Array.isArray(
      groceryItems
    )
    ||
    groceryItems.length === 0
  ) {

    return null;

  }


  // =========================================================
  // SELECTED COUNT
  // =========================================================

  const selectedCount =
    Object.values(
      checkedItems
    )
      .filter(Boolean)
      .length;


  // =========================================================
  // UI
  // =========================================================

  return (

    <section
      className="grocery-compare-shell"
    >

      {/* =====================================================
          BUY THESE GROCERIES CARD
      ====================================================== */}

      <div
        className="grocery-compare-intro"
      >

        <div
          className="grocery-compare-icon"
        >

          <ShoppingCart
            size={22}
          />

        </div>


        <div
          className="grocery-compare-copy"
        >

          <span>
            MISSING INGREDIENTS
          </span>


          <h3>
            Buy These Groceries
          </h3>


          <p>

            FoodKindl found
            {" "}

            <strong>
              {groceryItems.length}
            </strong>

            {" "}

            {
              groceryItems.length === 1
                ? "grocery item"
                : "grocery items"
            }

            {" "}

            you may need for
            {" "}

            <strong>

              {
                recipeTitle ||
                "this recipe"
              }

            </strong>

            .

          </p>

        </div>


        <button
          type="button"
          className="grocery-compare-open"
          onClick={() =>
            setIsOpen(true)
          }
        >

          <Store
            size={16}
          />

          Compare Grocery Options

        </button>

      </div>


      {/* =====================================================
          GROCERY COMPARISON PANEL
      ====================================================== */}

      {
        isOpen &&
        (

          <div
            className="grocery-compare-panel"
          >

            {/* ===============================================
                HEADER
            ================================================ */}

            <div
              className="grocery-compare-head"
            >

              <div>

                <span>
                  FOODKINDL SHOPPING LIST
                </span>


                <h3>

                  Groceries for
                  {" "}

                  {
                    recipeTitle ||
                    "your recipe"
                  }

                </h3>

              </div>


              <button
                type="button"
                className="grocery-compare-close"
                onClick={() =>
                  setIsOpen(false)
                }
                aria-label="Close grocery comparison"
              >

                <X
                  size={16}
                />

              </button>

            </div>


            {/* ===============================================
                SHOPPING LIST
            ================================================ */}

            <div
              className="grocery-compare-list"
            >

              {
                groceryItems.map(
                  (
                    item,
                    index
                  ) => {

                    const itemName =
                      getGroceryName(
                        item
                      );


                    const itemCategory =
                      getGroceryCategory(
                        item
                      );


                    return (

                      <button
                        key={
                          `${itemName}-${index}`
                        }
                        type="button"
                        className={
                          checkedItems[index]
                            ? "grocery-compare-item checked"
                            : "grocery-compare-item"
                        }
                        onClick={() =>
                          toggleItem(
                            index
                          )
                        }
                      >

                        <span
                          className="grocery-item-check"
                        >

                          {
                            checkedItems[index]
                              ? (
                                  <CheckCircle2
                                    size={16}
                                  />
                                )
                              : (
                                  <span />
                                )
                          }

                        </span>


                        <span
                          className="grocery-item-name"
                        >

                          {itemName}

                        </span>


                        {
                          itemCategory &&
                          (

                            <small>
                              {itemCategory}
                            </small>

                          )
                        }

                      </button>

                    );

                  }
                )
              }

            </div>


            {/* ===============================================
                SELECTED COUNT
            ================================================ */}

            <div
              className="grocery-compare-selection"
            >

              <ShoppingCart
                size={14}
              />


              <span>

                {selectedCount}
                {" "}
                of
                {" "}
                {groceryItems.length}
                {" "}
                selected

              </span>

            </div>


            {/* ===============================================
                PARTNER SECTION HEADER
            ================================================ */}

            <div
              className="grocery-partner-heading"
            >

              <span>
                COMPARE GROCERY OPTIONS
              </span>


              <h4>
                Choose where you want to shop
              </h4>


              <p>
                Prices, availability and delivery times
                are shown on the partner website or app.
              </p>

            </div>


            {/* ===============================================
                PARTNER CARDS
            ================================================ */}

            <div
              className="grocery-partner-grid"
            >

              {
                partners.map(
                  partner => {

                    const isOpening =
                      openingPartner ===
                      partner.key;


                    return (

                      <button
                        key={
                          partner.key
                        }
                        type="button"
                        className={
                          `grocery-partner-card ${partner.className}`
                        }
                        disabled={
                          Boolean(
                            openingPartner
                          )
                        }
                        onClick={() =>
                          openPartner(
                            partner
                          )
                        }
                      >

                        {/* Partner icon */}

                        <div
                          className="grocery-partner-logo"
                        >

                          {
                            partner.shortName
                          }

                        </div>


                        {/* Partner name */}

                        <div
                          className="grocery-partner-copy"
                        >

                          <strong>

                            {
                              isOpening
                                ? "Opening..."
                                : partner.name
                            }

                          </strong>


                          <span>

                            {
                              isOpening
                                ? "Creating FoodKindl tracking..."
                                : partner.description
                            }

                          </span>

                        </div>


                        <ExternalLink
                          size={15}
                        />

                      </button>

                    );

                  }
                )
              }

            </div>


            {/* ===============================================
                DISCLOSURE
            ================================================ */}

            <div
              className="grocery-compare-note"
            >

              FoodKindl may use tracked partner links
              where an affiliate or commercial
              partnership is available.

            </div>

          </div>

        )
      }

    </section>

  );
}