import {
  ArrowRight,
  Bot,
  Check,
  ChefHat,
  Heart,
  MapPin,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  Sparkles,
  UserRound,
  UsersRound,
  Utensils,
  Footprints,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import "../styles/connect_dashboard.css";


export default function ConnectDashboard() {

  const {
    user,
    reloadUser,
  } = useAuth();


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    refreshError,
    setRefreshError,
  ] = useState("");


  // =========================================================
  // VERIFICATION NOTIFICATION DETAILS
  // =========================================================

  const [
    verificationDetails,
    setVerificationDetails,
  ] = useState(null);


  const [
    showVerificationToast,
    setShowVerificationToast,
  ] = useState(false);


  // =========================================================
  // KINDLI — FOODKINDL SUPPORT ASSISTANT
  // =========================================================

  const [
    showKindli,
    setShowKindli,
  ] = useState(false);


  const [
    kindliMessages,
    setKindliMessages,
  ] = useState([]);


  const [
    kindliInput,
    setKindliInput,
  ] = useState("");


  const [
    kindliTyping,
    setKindliTyping,
  ] = useState(false);


  const [
    activeJourneyStep,
    setActiveJourneyStep,
  ] = useState(1);


  // =========================================================
  // OUTLOOK-STYLE HOME TOUR
  // =========================================================

  const [
    showHomeTour,
    setShowHomeTour,
  ] = useState(false);

  const [
    tourStep,
    setTourStep,
  ] = useState(0);

  const [
    tourReady,
    setTourReady,
  ] = useState(false);

  const [
    tourTargetRect,
    setTourTargetRect,
  ] = useState(null);

  const [
    tourCardPosition,
    setTourCardPosition,
  ] = useState({
    top: 150,
    left: 24,
    placement: "center",
  });


  const profile =
    user?.profile || {};


  const API_BASE = (
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000"
  ).replace(
    /\/+$/,
    ""
  );


  // =========================================================
  // PROFILE IMAGE
  // =========================================================

  function getProfileImageUrl(
    imagePath
  ) {

    if (!imagePath) {
      return "";
    }


    if (
      imagePath.startsWith(
        "http://"
      ) ||
      imagePath.startsWith(
        "https://"
      ) ||
      imagePath.startsWith(
        "blob:"
      )
    ) {
      return imagePath;
    }


    if (
      imagePath.startsWith(
        "/.netlify/"
      )
    ) {
      return (
        `${window.location.origin}${imagePath}`
      );
    }


    return (
      `${API_BASE}${imagePath}`
    );
  }


  const profileImage =
    getProfileImageUrl(
      profile.profile_image_1_url ||
      profile.profile_image_1
    );


  // =========================================================
  // MEMBER NAME
  // =========================================================

  const displayName =
    user?.first_name ||
    user?.full_name ||
    user?.email ||
    "FoodKindl Member";


  // =========================================================
  // VERIFICATION
  // =========================================================

  // Use the dedicated verification endpoint as the final source of truth
  // whenever it is available. Fall back to the profile only while the
  // endpoint is loading or unavailable.
  const verificationData =
    verificationDetails ||
    profile;


  const verificationStatus =
    String(
      verificationData?.verification_status ||
      profile.verification_status ||
      "not_submitted"
    )
      .trim()
      .toLowerCase();


  const resolvedVerificationStatus =
    verificationStatus;


  // IMPORTANT: a member is verified only when BOTH values agree.
  // This prevents a stale profile.is_verified=true value from showing
  // “Verified member” after the verification status changes.
  const isVerified =
    verificationData?.is_verified === true &&
    resolvedVerificationStatus === "approved";


  const governmentIdUploaded =
    verificationData?.government_id_uploaded === true ||
    Boolean(
      verificationData?.government_id_blob_key ||
      verificationData?.government_id_url ||
      verificationData?.government_id
    );


  function getVerificationNotification() {

    if (
      verificationData?.is_verified === true &&
      resolvedVerificationStatus === "approved"
    ) {
      return null;
    }


    // Keep the language calm and supportive.
    // Never tell the member that their profile/account was "rejected".
    if (
      resolvedVerificationStatus === "rejected" ||
      resolvedVerificationStatus === "failed" ||
      resolvedVerificationStatus === "needs_attention"
    ) {

      return {
        severity: "attention",
        title: "A little more information is needed",
        message:
          verificationData?.rejection_reason ||
          "We could not complete identity verification with the information provided. Please review your Government ID and submit it again.",
        helper:
          "You can update your document and resubmit it. If anything is unclear, our support option is available to help.",
        primaryActionText: "Review & Resubmit",
        primaryActionUrl: "/profile",
        showSupport: true,
      };
    }


    if (
      governmentIdUploaded ||
      [
        "pending",
        "submitted",
        "under_review",
        "in_review",
      ].includes(
        resolvedVerificationStatus
      )
    ) {

      return {
        severity: "info",
        title: "Identity verification is in progress",
        message:
          "Your Government ID has been submitted successfully. We are reviewing the information and will update your verification status once the review is complete.",
        helper: null,
        primaryActionText: null,
        primaryActionUrl: null,
        showSupport: true,
      };
    }


    return {
      severity: "warning",
      title: "Complete your identity verification",
      message:
        "Please upload a valid Government ID to complete your FoodKindl verification and access verified-member features.",
      helper: null,
      primaryActionText: "Upload Government ID",
      primaryActionUrl: "/profile",
      showSupport: true,
    };
  }


  const verificationNotification =
    getVerificationNotification();


  // =========================================================
  // KINDLI — FOODKINDL SUPPORT ASSISTANT
  // =========================================================

  function getKindliWelcomeMessage() {

    if (isVerified) {
      return (
        `Hi ${displayName}! I'm Kindli, your FoodKindl assistant. ` +
        "Your identity verification is complete. How can I help you?"
      );
    }


    if (
      [
        "rejected",
        "failed",
        "needs_attention",
      ].includes(
        resolvedVerificationStatus
      )
    ) {

      const reviewNote =
        verificationData?.rejection_reason
          ? ` The review note says: "${verificationData.rejection_reason}".`
          : "";

      return (
        `Hi ${displayName}! I'm Kindli, your FoodKindl verification assistant. ` +
        "We need a little more information to complete your verification." +
        reviewNote +
        " I can guide you through what to do next."
      );
    }


    if (
      governmentIdUploaded ||
      [
        "pending",
        "submitted",
        "under_review",
        "in_review",
      ].includes(
        resolvedVerificationStatus
      )
    ) {

      return (
        `Hi ${displayName}! I'm Kindli, your FoodKindl verification assistant. ` +
        "Your Government ID is being reviewed. I can explain the process or help with any questions."
      );
    }


    return (
      `Hi ${displayName}! I'm Kindli, your FoodKindl verification assistant. ` +
      "Your identity verification is not complete yet. I can guide you through uploading your Government ID."
    );
  }


  function openKindli() {

    setShowVerificationToast(false);
    setShowKindli(true);

    setKindliMessages(
      current => {

        if (current.length > 0) {
          return current;
        }

        return [
          {
            id: `kindli-${Date.now()}`,
            role: "assistant",
            text: getKindliWelcomeMessage(),
          },
        ];
      }
    );
  }


  function closeKindli() {
    setShowKindli(false);
  }


  function getKindliReply(question) {

    const normalized =
      String(question || "")
        .trim()
        .toLowerCase();


    if (
      normalized.includes("why") ||
      normalized.includes("reason") ||
      normalized.includes("resubmit") ||
      normalized.includes("wrong")
    ) {

      if (
        verificationData?.rejection_reason
      ) {

        return (
          "We need a little more information before verification can be completed. " +
          `The review note says: "${verificationData.rejection_reason}". ` +
          "Please review your document and submit it again from My Profile."
        );
      }

      return (
        "We could not fully confirm the information submitted. " +
        "Please make sure your Government ID is clear, readable, valid, and matches the details in your FoodKindl profile."
      );
    }


    if (
      normalized.includes("upload") ||
      normalized.includes("submit")
    ) {

      return (
        "Open My Profile, go to the Government ID section, choose your document, upload a clear copy, and submit it for verification."
      );
    }


    if (
      normalized.includes("document") ||
      normalized.includes("id") ||
      normalized.includes("proof")
    ) {

      return (
        "Use one of the Government ID types available in the FoodKindl upload screen. " +
        "Make sure the document is valid, clear, and the details match your profile."
      );
    }


    if (
      normalized.includes("status") ||
      normalized.includes("pending") ||
      normalized.includes("review")
    ) {

      if (isVerified) {
        return "Your FoodKindl identity verification is complete.";
      }

      if (
        governmentIdUploaded &&
        ![
          "rejected",
          "failed",
          "needs_attention",
        ].includes(
          resolvedVerificationStatus
        )
      ) {
        return (
          "Your Government ID is being reviewed. You do not need to upload it again unless FoodKindl asks for more information."
        );
      }

      return (
        "Your verification is not complete yet. I can help you upload or resubmit your Government ID."
      );
    }


    if (
      normalized.includes("support") ||
      normalized.includes("help") ||
      normalized.includes("human") ||
      normalized.includes("person")
    ) {

      return (
        "I can guide you here first. If you still need assistance, please use the Review & Resubmit option or contact FoodKindl support from your profile."
      );
    }


    return (
      "I can help with identity verification, Government ID uploads, resubmission, verification status, and next steps. " +
      "Choose a suggestion below or ask me a question."
    );
  }


  function askKindli(question) {

    const cleanQuestion =
      String(question || "")
        .trim();

    if (!cleanQuestion) {
      return;
    }


    setKindliMessages(
      current => [
        ...current,
        {
          id: `user-${Date.now()}`,
          role: "user",
          text: cleanQuestion,
        },
      ]
    );

    setKindliInput("");
    setKindliTyping(true);


    window.setTimeout(() => {

      setKindliMessages(
        current => [
          ...current,
          {
            id: `kindli-${Date.now()}`,
            role: "assistant",
            text: getKindliReply(
              cleanQuestion
            ),
          },
        ]
      );

      setKindliTyping(false);

    }, 500);
  }


  function handleKindliSubmit(event) {

    event.preventDefault();

    askKindli(
      kindliInput
    );
  }


  // =========================================================
  // REPEATING VERIFICATION TOAST
  //
  // Behaviour:
  // 1. Show immediately when verification is incomplete.
  // 2. Hide after 6.5 seconds.
  // 3. Reappear 3 minutes later.
  // 4. Repeat until verification is approved.
  // =========================================================

  useEffect(() => {

    const shouldShow =
      !isVerified &&
      resolvedVerificationStatus !== "approved";

    if (!shouldShow) {
      setShowVerificationToast(false);
      return undefined;
    }

    let hideTimer = null;
    let reappearTimer = null;
    let cancelled = false;

    const DISPLAY_DURATION = 6500;
    const REAPPEAR_AFTER = 3 * 60 * 1000;

    function showToastCycle() {

      if (cancelled) {
        return;
      }

      setShowVerificationToast(true);

      hideTimer =
        window.setTimeout(() => {

          if (cancelled) {
            return;
          }

          setShowVerificationToast(false);

          reappearTimer =
            window.setTimeout(() => {
              showToastCycle();
            }, REAPPEAR_AFTER);

        }, DISPLAY_DURATION);
    }

    // Show once as soon as the user opens Connect.
    showToastCycle();

    return () => {

      cancelled = true;

      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }

      if (reappearTimer) {
        window.clearTimeout(reappearTimer);
      }

    };

  }, [
    isVerified,
    resolvedVerificationStatus,
    governmentIdUploaded,
    verificationData?.rejection_reason,
  ]);


  // =========================================================
  // REFRESH
  // =========================================================

  async function handleRefresh() {

    if (
      typeof reloadUser !==
      "function"
    ) {
      return;
    }


    try {

      setRefreshing(
        true
      );

      setRefreshError(
        ""
      );


      await reloadUser();

    } catch (error) {

      console.error(
        "Unable to refresh account:",
        error.response?.data ||
        error
      );


      setRefreshError(
        "Unable to refresh your account."
      );

    } finally {

      setRefreshing(
        false
      );

    }
  }


  // =========================================================
  // AUTO SYNC
  // =========================================================

  useEffect(
    () => {

      let cancelled =
        false;


      async function syncUser() {

        if (
          typeof reloadUser !==
          "function"
        ) {
          return;
        }


        try {

          await reloadUser();

        } catch (error) {

          if (!cancelled) {

            console.error(
              "Unable to sync account:",
              error.response?.data ||
              error
            );

          }
        }
      }


      syncUser();


      return () => {

        cancelled = true;

      };

    },
    [
      reloadUser,
    ]
  );


  // =========================================================
  // LOAD VERIFICATION DETAILS
  // =========================================================

  useEffect(
    () => {

      let cancelled =
        false;


      async function loadVerificationDetails() {

        const token =
          localStorage.getItem("access") ||
          localStorage.getItem("access_token") ||
          localStorage.getItem("accessToken") ||
          localStorage.getItem("token");


        if (!token) {
          return;
        }


        try {

          const response =
            await fetch(
              `${API_BASE}/api/accounts/verification-status/`,
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  Accept:
                    "application/json",
                },
              }
            );


          if (!response.ok) {

            console.warn(
              "Verification status request returned:",
              response.status
            );

            return;
          }


          const data =
            await response.json();


          if (!cancelled) {
            setVerificationDetails(
              data
            );
          }

        } catch (error) {

          // The dashboard still uses profile data as a fallback.
          console.warn(
            "Unable to load verification details:",
            error
          );

        }
      }


      // Load once immediately.
      loadVerificationDetails();


      // Re-check verification every 60 seconds while the user
      // remains on this dashboard. This means that once an admin
      // approves the account, the repeating reminder stops without
      // requiring a manual page refresh.
      const verificationPoll =
        window.setInterval(() => {
          loadVerificationDetails();
        }, 60 * 1000);


      return () => {

        cancelled = true;

        window.clearInterval(
          verificationPoll
        );
      };

    },
    [
      API_BASE,
      user?.id,
      profile?.verification_status,
      profile?.is_verified,
    ]
  );


  function goToStep(stepNumber) {

    const safeStep = Math.max(
      1,
      Math.min(
        6,
        Number(stepNumber) || 1
      )
    );

    setActiveJourneyStep(
      safeStep
    );

    /*
     * React needs to render the newly-visible card first.
     * Two animation frames are more reliable here than a fixed
     * timeout, especially because hidden journey cards use
     * visibility / opacity / transforms.
     */
    window.requestAnimationFrame(() => {

      window.requestAnimationFrame(() => {

        const targetStep =
          document.getElementById(
            `connect-journey-step-${safeStep}`
          ) ||
          document.querySelector(
            `.connect-step-0${safeStep}`
          );

        if (!targetStep) {
          console.warn(
            "FoodKindl journey step not found:",
            safeStep
          );
          return;
        }

        const rect =
          targetStep.getBoundingClientRect();

        const absoluteTop =
          window.scrollY +
          rect.top;

        /*
         * Keep the active card comfortably inside the viewport.
         * Using window.scrollTo is more predictable than
         * scrollIntoView with absolutely-positioned journey cards.
         */
        const targetTop =
          Math.max(
            0,
            absoluteTop -
            Math.max(
              90,
              (window.innerHeight - rect.height) / 2
            )
          );

        window.scrollTo({
          top: targetTop,
          behavior: "smooth",
        });

      });

    });
  }


  function goToNextJourneyStep() {

    setActiveJourneyStep(
      currentStep => {

        const nextStep =
          Math.min(
            6,
            currentStep + 1
          );

        window.requestAnimationFrame(() => {

          window.requestAnimationFrame(() => {

            const targetStep =
              document.getElementById(
                `connect-journey-step-${nextStep}`
              );

            if (!targetStep) {
              return;
            }

            const rect =
              targetStep.getBoundingClientRect();

            const targetTop =
              Math.max(
                0,
                window.scrollY +
                rect.top -
                Math.max(
                  90,
                  (
                    window.innerHeight -
                    rect.height
                  ) / 2
                )
              );

            window.scrollTo({
              top: targetTop,
              behavior: "smooth",
            });

          });

        });

        return nextStep;
      }
    );
  }

  // =========================================================
  // HOME TOUR STORAGE
  // =========================================================

  useEffect(
    () => {

      const completed =
        localStorage.getItem(
          "foodkindl_home_tour_completed"
        );

      if (completed !== "true") {
        setShowHomeTour(true);
        setTourStep(0);
      }

      setTourReady(true);

    },
    []
  );


  // =========================================================
  // HOME TOUR STEPS
  //
  // This behaves like the Outlook / Microsoft product tours:
  // the page stays visible, one real UI control is highlighted,
  // and a small guide card explains what to click next.
  // =========================================================

  const homeTourSteps = [
    {
      key: "account",
      eyebrow: "STEP 1",
      title: "Open your account menu",
      description:
        "Click the profile circle in the top-right corner. This menu gives you access to your profile, settings and security options.",
      target: "account",
      actionLabel: "Open profile menu",
    },
    {
      key: "profile",
      eyebrow: "STEP 2",
      title: "Start with My Profile",
      description:
        "Choose My Profile first. Add your photo, location, dietary preference, favourite cuisines, interests and Government ID for verification.",
      target: "profile",
      actionLabel: "Show My Profile",
    },
    {
      key: "settings",
      eyebrow: "STEP 3",
      title: "Then review Settings",
      description:
        "Use Settings to manage your current FoodKindl account and app preferences. You can return here whenever you want to change them.",
      target: "settings",
      actionLabel: "Show Settings",
    },
    {
      key: "security",
      eyebrow: "STEP 4",
      title: "Next, open Security",
      description:
        "Security contains your meetup safety tools. Add a trusted emergency contact before using SOS.",
      target: "security",
      actionLabel: "Show Security",
    },
    {
      key: "sos",
      eyebrow: "STEP 5",
      title: "Set up SOS before a meetup",
      description:
        "Inside Security, add a trusted contact. In an emergency, press and hold the SOS button for 3 seconds to trigger your configured emergency alert flow, including WhatsApp where enabled.",
      target: "security",
      actionLabel: "Got it",
    },
  ];


  function startHomeTour() {
    setTourStep(0);
    setShowHomeTour(true);
  }


  function completeHomeTour() {

    localStorage.setItem(
      "foodkindl_home_tour_completed",
      "true"
    );

    setShowHomeTour(false);
    setTourTargetRect(null);
  }


  function skipHomeTour() {
    completeHomeTour();
  }


  function nextHomeTourStep() {

    if (
      tourStep >=
      homeTourSteps.length - 1
    ) {
      completeHomeTour();
      return;
    }

    setTourStep(
      current =>
        current + 1
    );
  }


  function previousHomeTourStep() {

    setTourStep(
      current =>
        Math.max(
          0,
          current - 1
        )
    );
  }


  // =========================================================
  // FIND REAL NAVBAR ELEMENTS
  //
  // The navbar is outside ConnectDashboard, so the tour finds
  // it from the rendered DOM. Several selectors are supported
  // so this keeps working even if the navbar class names change.
  // =========================================================

  function findVisibleElement(
    selectors
  ) {

    for (
      const selector
      of selectors
    ) {

      const elements =
        Array.from(
          document.querySelectorAll(
            selector
          )
        );

      const visible =
        elements.find(
          element => {

            const rect =
              element.getBoundingClientRect();

            const style =
              window.getComputedStyle(
                element
              );

            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden"
            );
          }
        );

      if (visible) {
        return visible;
      }
    }

    return null;
  }


  function findAccountMenuButton() {

    const directMatch =
      findVisibleElement([
        '[data-tour="account-menu"]',
        '[data-tour="profile-menu"]',
        '[aria-label*="profile" i]',
        '[aria-label*="account" i]',
        '[title*="profile" i]',
        '[title*="account" i]',
        'nav a[href="/profile"]',
        'header a[href="/profile"]',
      ]);

    if (directMatch) {
      return directMatch;
    }


    const navButtons =
      Array.from(
        document.querySelectorAll(
          "nav button, header button"
        )
      ).filter(
        element => {

          const rect =
            element.getBoundingClientRect();

          return (
            rect.width >= 30 &&
            rect.height >= 30 &&
            rect.top < 130 &&
            rect.right >
              window.innerWidth * 0.72
          );
        }
      );


    return (
      navButtons[
        navButtons.length - 1
      ] ||
      null
    );
  }


  function findTourTarget(
    targetName
  ) {

    if (targetName === "account") {
      return findAccountMenuButton();
    }

    if (targetName === "profile") {

      return findVisibleElement([
        '[data-tour="my-profile"]',
        'a[href="/profile"]',
        '[role="menu"] a[href*="/profile"]',
      ]);
    }

    if (targetName === "settings") {

      return findVisibleElement([
        '[data-tour="settings"]',
        'a[href="/settings"]',
        '[role="menu"] a[href*="/settings"]',
      ]);
    }

    if (
      targetName === "security"
    ) {

      return findVisibleElement([
        '[data-tour="security"]',
        'a[href="/security"]',
        '[role="menu"] a[href*="/security"]',
        'a[href*="safety"]',
        'a[href*="security"]',
      ]);
    }

    return null;
  }


  function openAccountMenu() {

    const button =
      findAccountMenuButton();

    if (button) {
      button.click();
    }
  }


  // =========================================================
  // KEEP THE SPOTLIGHT ON THE CURRENT ELEMENT
  // =========================================================

  useEffect(
    () => {

      if (!showHomeTour) {
        return undefined;
      }


      let frameId = null;


      function updateTourPosition() {

        const currentStep =
          homeTourSteps[tourStep];

        let target =
          findTourTarget(
            currentStep.target
          );


        // The dropdown needs to be open before its menu items
        // can be highlighted. Open it automatically from Step 2.
        if (
          currentStep.target !== "account" &&
          !target
        ) {

          openAccountMenu();

          target =
            findTourTarget(
              currentStep.target
            );
        }


        if (!target) {

          setTourTargetRect(null);

          setTourCardPosition({
            top: 150,
            left: Math.max(
              16,
              (
                window.innerWidth -
                Math.min(
                  390,
                  window.innerWidth - 32
                )
              ) / 2
            ),
            placement: "center",
          });

          return;
        }


        const rect =
          target.getBoundingClientRect();

        const padding = 8;

        const highlightedRect = {
          top:
            Math.max(
              8,
              rect.top - padding
            ),
          left:
            Math.max(
              8,
              rect.left - padding
            ),
          width:
            rect.width +
            padding * 2,
          height:
            rect.height +
            padding * 2,
        };


        setTourTargetRect(
          highlightedRect
        );


        const cardWidth =
          Math.min(
            390,
            window.innerWidth - 32
          );

        const estimatedCardHeight =
          260;

        const gap =
          18;


        let top =
          rect.bottom + gap;

        let left =
          rect.right - cardWidth;

        let placement =
          "below";


        if (
          top +
          estimatedCardHeight >
          window.innerHeight - 18
        ) {

          top =
            Math.max(
              18,
              rect.top -
              estimatedCardHeight -
              gap
            );

          placement =
            "above";
        }


        left =
          Math.min(
            window.innerWidth -
              cardWidth -
              16,
            Math.max(
              16,
              left
            )
          );


        setTourCardPosition({
          top,
          left,
          placement,
        });
      }


      function scheduleUpdate() {

        if (frameId) {
          cancelAnimationFrame(
            frameId
          );
        }

        frameId =
          requestAnimationFrame(
            updateTourPosition
          );
      }


      // Give dropdown animations a brief moment to render.
      const firstTimer =
        window.setTimeout(
          scheduleUpdate,
          80
        );


      const secondTimer =
        window.setTimeout(
          scheduleUpdate,
          320
        );


      window.addEventListener(
        "resize",
        scheduleUpdate
      );

      window.addEventListener(
        "scroll",
        scheduleUpdate,
        true
      );


      return () => {

        window.clearTimeout(
          firstTimer
        );

        window.clearTimeout(
          secondTimer
        );

        if (frameId) {
          cancelAnimationFrame(
            frameId
          );
        }

        window.removeEventListener(
          "resize",
          scheduleUpdate
        );

        window.removeEventListener(
          "scroll",
          scheduleUpdate,
          true
        );
      };

    },
    [
      showHomeTour,
      tourStep,
    ]
  );


  // =========================================================
  // JOURNEY PATH PROGRESS
  // =========================================================

  const journeyProgress =
    Math.max(
      0,
      Math.min(
        100,
        (
          (activeJourneyStep - 1) /
          5
        ) * 100
      )
    );


  // =========================================================
  // PAGE
  // =========================================================

  return (

    <main className="connect-journey-page">


      {/* BACKGROUND */}

      <div className="connect-journey-background">
        <span className="connect-orb connect-orb-one" />
        <span className="connect-orb connect-orb-two" />
        <span className="connect-orb connect-orb-three" />
      </div>


      {/* =====================================================
          HEADER
      ====================================================== */}

      <section className="connect-journey-header">

        <div className="connect-journey-header-copy">

          <span className="connect-journey-eyebrow">
            FOODKINDL CONNECT
          </span>


          <h1>
            Welcome,{" "}
            <span>
              {displayName}
            </span>
          </h1>


          <p>
            Discover someone nearby,
            connect, talk, plan a food
            moment and turn a shared meal
            into a meaningful connection.
          </p>


          {
            isVerified
              ? (

                <div className="connect-verified-chip">

                  <Check size={13} />

                  Verified member

                </div>

              )
              : (

                <Link
                  to="/profile"
                  className="connect-verification-chip"
                >

                  {
                    verificationStatus === "pending"
                      ? "ID verification under review"
                      : verificationStatus === "rejected"
                        ? "Review Government ID"
                        : "Complete profile & verification"
                  }

                  <ArrowRight size={13} />

                </Link>

              )
          }

        </div>


        <div className="connect-journey-profile">

          <Link
            to="/profile"
            className="connect-journey-profile-link"
          >

            <div className="connect-journey-avatar">

              {
                profileImage
                  ? (

                    <img
                      src={
                        profileImage
                      }
                      alt={
                        displayName
                      }
                    />

                  )
                  : (

                    <UserRound
                      size={23}
                    />

                  )
              }


              {
                isVerified &&
                (

                  <span className="connect-avatar-check">

                    <Check size={9} />

                  </span>

                )
              }

            </div>


            <div>

              <strong>
                {displayName}
              </strong>

              <span>
                {
                  isVerified
                    ? "Verified member"
                    : verificationStatus === "pending"
                      ? "Government ID under review"
                      : verificationStatus === "rejected"
                        ? "Government ID needs attention"
                        : "Complete profile verification"
                }
              </span>

            </div>

          </Link>


          <button
            type="button"
            className="connect-refresh-button"
            onClick={
              handleRefresh
            }
            disabled={
              refreshing
            }
            title="Refresh profile"
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "connect-refresh-spin"
                  : ""
              }
            />

          </button>

        </div>

      </section>


      {/* =====================================================
          FLOATING VERIFICATION IN-APP NOTIFICATION
      ====================================================== */}

      {
        verificationNotification &&
        showVerificationToast &&
        !showHomeTour &&
        (

          <div
            className={
              `fk-verification-toast ${
                verificationNotification.severity || "warning"
              }`
            }
            role="status"
            aria-live="polite"
          >

            <div className="fk-toast-accent" />


            <div className="fk-toast-icon">
              <ShieldCheck size={20} />
            </div>


            <div className="fk-toast-body">

              <div className="fk-toast-label">
                FOODKINDL SECURITY
              </div>


              <strong className="fk-toast-title">
                {verificationNotification.title}
              </strong>


              <p className="fk-toast-message">
                {verificationNotification.message}
              </p>


              <div className="fk-toast-actions">

                {
                  verificationNotification.primaryActionUrl &&
                  (
                    <Link
                      to={verificationNotification.primaryActionUrl}
                      className="fk-toast-primary"
                    >
                      {verificationNotification.primaryActionText}
                      <ArrowRight size={13} />
                    </Link>
                  )
                }

              </div>

            </div>


            <button
              type="button"
              className="fk-toast-close"
              onClick={() =>
                setShowVerificationToast(false)
              }
              aria-label="Close verification notification"
            >
              <X size={15} />
            </button>


            <div
              className="fk-toast-progress"
              aria-hidden="true"
            >
              <span />
            </div>

          </div>

        )
      }
{/* =====================================================
    KINDLI — FLOATING AI ASSISTANT
====================================================== */}

{
  !showKindli &&
  !showHomeTour &&
  (
    <button
      type="button"
      className="kindli-floating-launcher"
      onClick={openKindli}
      aria-label="Ask Kindli"
      title="Ask Kindli"
    >
      <span className="kindli-floating-glow" />

      <span className="kindli-floating-avatar">
        <Bot size={23} />
      </span>

      <span className="kindli-floating-copy">
        <strong>Kindli</strong>
        <small>Ask me anything</small>
      </span>

      <span className="kindli-floating-online" />
    </button>
  )
}

      {/* =====================================================
          KINDLI — FOODKINDL AI ASSISTANT
      ====================================================== */}

      {
        showKindli &&
        (

          <div
            className="kindli-overlay"
            onMouseDown={
              event => {

                if (
                  event.target ===
                  event.currentTarget
                ) {
                  closeKindli();
                }
              }
            }
          >

            <section
              className="kindli-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Kindli FoodKindl assistant"
            >

              <header className="kindli-header">

                <div className="kindli-brand">

                  <div className="kindli-avatar">
                    <Bot size={21} />
                    <span />
                  </div>


                  <div>

                    <div className="kindli-name-row">

                      <h2>
                        Kindli
                      </h2>

                      <span className="kindli-ai-pill">
                        FOODKINDL AI
                      </span>

                    </div>


                    <p>
                      Verification & account assistant
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  className="kindli-close"
                  onClick={closeKindli}
                  aria-label="Close Kindli"
                >
                  <X size={17} />
                </button>

              </header>


              <div className="kindli-status-strip">

                <ShieldCheck size={14} />

                <span>
                  {
                    isVerified
                      ? "Verification complete"
                      : [
                          "rejected",
                          "failed",
                          "needs_attention",
                        ].includes(
                          resolvedVerificationStatus
                        )
                        ? "Let's complete your verification"
                        : governmentIdUploaded
                          ? "Verification review in progress"
                          : "Verification setup"
                  }
                </span>

              </div>


              <div className="kindli-chat">

                {
                  kindliMessages.map(
                    message => (

                      <div
                        key={message.id}
                        className={
                          `kindli-message ${
                            message.role
                          }`
                        }
                      >

                        {
                          message.role ===
                            "assistant" &&
                          (
                            <div className="kindli-message-avatar">
                              <Sparkles size={13} />
                            </div>
                          )
                        }


                        <div className="kindli-message-bubble">
                          {message.text}
                        </div>

                      </div>

                    )
                  )
                }


                {
                  kindliTyping &&
                  (

                    <div className="kindli-message assistant">

                      <div className="kindli-message-avatar">
                        <Sparkles size={13} />
                      </div>

                      <div className="kindli-typing">
                        <span />
                        <span />
                        <span />
                      </div>

                    </div>

                  )
                }

              </div>


              <div className="kindli-quick-actions">

                {
                  [
                    "Why do I need to resubmit?",
                    "How do I upload again?",
                    "What ID can I use?",
                    "What is my status?",
                  ].map(
                    question => (

                      <button
                        key={question}
                        type="button"
                        onClick={() =>
                          askKindli(question)
                        }
                      >
                        {question}
                      </button>

                    )
                  )
                }

              </div>


              {
                !isVerified &&
                (

                  <div className="kindli-context-actions">

                    <Link
                      to="/profile"
                      className="kindli-profile-action"
                      onClick={closeKindli}
                    >

                      {
                        [
                          "rejected",
                          "failed",
                          "needs_attention",
                        ].includes(
                          resolvedVerificationStatus
                        )
                          ? "Review & Resubmit"
                          : governmentIdUploaded
                            ? "View My Profile"
                            : "Upload Government ID"
                      }

                      <ArrowRight size={14} />

                    </Link>

                  </div>

                )
              }


              <form
                className="kindli-composer"
                onSubmit={
                  handleKindliSubmit
                }
              >

                <input
                  type="text"
                  value={kindliInput}
                  onChange={
                    event =>
                      setKindliInput(
                        event.target.value
                      )
                  }
                  placeholder="Ask Kindli about verification..."
                />


                <button
                  type="submit"
                  disabled={
                    !kindliInput.trim() ||
                    kindliTyping
                  }
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>

              </form>


              <div className="kindli-footer">

                <Sparkles size={11} />

                Kindli helps with FoodKindl verification and account guidance.

              </div>

            </section>

          </div>

        )
      }


      {/* =====================================================
          HOME TOUR REPLAY
      ====================================================== */}

      <div className="connect-tour-replay-wrap">

        <button
          type="button"
          className="connect-tour-replay-button connect-tour-replay-highlight"
          onClick={startHomeTour}
        >
          <Sparkles size={14} />
          Show me around
        </button>

      </div>


      {
        refreshError &&
        (

          <div className="connect-refresh-error">
            {refreshError}
          </div>

        )
      }


      {/* =====================================================
          INTRO
      ====================================================== */}

      <section className="connect-journey-intro">

        <span>
          YOUR FOODKINDL JOURNEY
        </span>


        <h2>
          One connection.
          <br />

          <strong>
            One shared meal.
          </strong>
        </h2>


        <p>
          Tap each location pin to understand
          how FoodKindl Connect works — from
          discovering someone nearby to
          building a real friendship.
        </p>

      </section>


      {/* =====================================================
          ROADMAP
      ====================================================== */}

      <section className="connect-roadmap">
        {/* =====================================================
            FOODKINDL JOURNEY PATH
            Thin progression line — intentionally NOT a road.
        ====================================================== */}

        <div
          className="connect-journey-path-layer"
          aria-hidden="true"
        >

          <svg
            className="connect-journey-line"
            viewBox="0 0 1200 1100"
            preserveAspectRatio="none"
          >

            <path
              className="connect-journey-line-base"
              d="
                M 70 80
                C 210 75, 315 135, 440 210
                C 630 320, 870 220, 930 320
                C 1040 430, 820 470, 610 525
                C 410 580, 255 635, 125 705
                C 245 790, 570 785, 875 850
                C 1010 880, 820 965, 600 1030
              "
            />

            <path
              className="connect-journey-line-progress"
              pathLength="100"
              style={{
                strokeDasharray: 100,
                strokeDashoffset:
                  100 - journeyProgress,
              }}
              d="
                M 70 80
                C 210 75, 315 135, 440 210
                C 630 320, 870 220, 930 320
                C 1040 430, 820 470, 610 525
                C 410 580, 255 635, 125 705
                C 245 790, 570 785, 875 850
                C 1010 880, 820 965, 600 1030
              "
            />

          </svg>


          <div className="connect-journey-start-label">
            <span />
            START
          </div>


          <div
            className={
              `connect-journey-traveler step-${activeJourneyStep}`
            }
          >

            <span className="connect-journey-traveler-shadow" />

            <span className="connect-journey-person">
              <UserRound size={18} />
            </span>

            <span className="connect-journey-traveler-label">
              YOU
            </span>

          </div>


          <div className="connect-journey-finish-marker">
            <Heart
              size={21}
              fill="currentColor"
            />

            <span>
              FRIENDSHIP
            </span>
          </div>

        </div>



        {/* ===================================================
            STEP 01 — MY PROFILE & GOVERNMENT ID

            FoodKindl Connect starts with the member profile.
            The user completes their profile and uploads a
            Government ID for verification before progressing
            through the social journey.
        ==================================================== */}

        <article
          id="connect-journey-step-1"
          className="connect-step connect-step-01"
        >

          <button
            type="button"
            className={
              activeJourneyStep === 1
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(1)
            }
            aria-label="Complete profile and upload Government ID"
          >
            <span>
              01
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 1
                ? "connect-step-card journey-card-visible"
                : "connect-step-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <ShieldCheck size={22} />
            </div>


            <span className="connect-step-label">
              MY PROFILE
            </span>


            <h3>
              Complete your profile
            </h3>


            <p>
              Start by completing your FoodKindl profile.
              Add your photo, location, food preferences
              and interests, then upload a Government ID
              for verification.
            </p>


            {/* -----------------------------------------------
                PROFILE SETUP CHECKLIST
            ------------------------------------------------ */}

            <div className="connect-profile-setup">

              <div className="connect-profile-setup-row">

                <span className="connect-profile-setup-icon">
                  <UserRound size={16} />
                </span>

                <div>
                  <strong>
                    Build your profile
                  </strong>

                  <small>
                    Add your photo, location,
                    cuisines and interests.
                  </small>
                </div>

              </div>


              <div className="connect-profile-setup-row">

                <span className="connect-profile-setup-icon">
                  <Upload size={16} />
                </span>

                <div>
                  <strong>
                    Upload Government ID
                  </strong>

                  <small>
                    Submit your identity proof for
                    FoodKindl admin verification.
                  </small>
                </div>

              </div>

            </div>


            {/* -----------------------------------------------
                VERIFICATION STATUS
            ------------------------------------------------ */}

            <div
              className={
                isVerified
                  ? "connect-profile-verification verified"
                  : verificationStatus === "pending"
                    ? "connect-profile-verification pending"
                    : verificationStatus === "rejected"
                      ? "connect-profile-verification rejected"
                      : "connect-profile-verification"
              }
            >

              {
                isVerified
                  ? (
                    <>
                      <Check size={14} />

                      <span>
                        Government ID verified
                      </span>
                    </>
                  )
                  : verificationStatus === "pending"
                    ? (
                      <>
                        <RefreshCw size={14} />

                        <span>
                          Government ID is under review
                        </span>
                      </>
                    )
                    : verificationStatus === "rejected"
                      ? (
                        <>
                          <ShieldCheck size={14} />

                          <span>
                            Update and resubmit your Government ID
                          </span>
                        </>
                      )
                      : (
                        <>
                          <ShieldCheck size={14} />

                          <span>
                            Government ID not submitted
                          </span>
                        </>
                      )
              }

            </div>


            {/* -----------------------------------------------
                GO TO MY PROFILE

                The actual Government ID upload remains on
                the /profile page. This dashboard only guides
                the user to that first required step.
            ------------------------------------------------ */}

            <Link
              to="/profile"
              className="connect-profile-action"
            >

              {
                isVerified
                  ? (
                    <>
                      <UserRound size={15} />

                      View my profile

                      <ArrowRight size={14} />
                    </>
                  )
                  : (
                    <>
                      <Upload size={15} />

                      Complete profile & upload ID

                      <ArrowRight size={14} />
                    </>
                  )
              }

            </Link>


            <button
              type="button"
              className="journey-next-stop"
              onClick={goToNextJourneyStep}
            >
              Next stop

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            STEP 02 — DISCOVER & CONNECT

            Discover compatible FoodKindl members nearby,
            review the match, and send a connection request.
        ==================================================== */}

        <article
          id="connect-journey-step-2"
          className="connect-step connect-step-02"
        >

          <button
            type="button"
            className={
              activeJourneyStep === 2
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(2)
            }
            aria-label="Discover and connect with people nearby"
          >
            <span>
              02
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 2
                ? "connect-step-card journey-card-visible"
                : "connect-step-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <UsersRound size={22} />
            </div>


            <span className="connect-step-label">
              DISCOVER & CONNECT
            </span>


            <h3>
              Find people you
              may enjoy meeting
            </h3>


            <p>
              Discover nearby FoodKindl members based
              on location, cuisine preferences, dietary
              choices and shared interests. When someone
              feels like a good match, send a connection
              request.
            </p>


            {/* -----------------------------------------------
                EXAMPLE FOOD MATCH
            ------------------------------------------------ */}

            <div className="connect-demo-people">

              <div className="connect-demo-person">

                <span>
                  AM
                </span>

                <div>
                  <strong>
                    Amitha
                  </strong>

                  <small>
                    Bengaluru
                  </small>
                </div>

              </div>


              <div className="connect-match-chip">

                <Sparkles size={11} />

                86% match

              </div>

            </div>


            {/* -----------------------------------------------
                CONNECTION VISUAL
            ------------------------------------------------ */}

            <div className="connect-connection-demo">

              <div className="connect-mini-person">
                A
              </div>

              <div className="connect-mini-connection">

                <span />

                <strong>
                  CONNECT
                </strong>

                <span />

              </div>

              <div className="connect-mini-person">
                M
              </div>

            </div>


            <button
              type="button"
              className="journey-next-stop"
              onClick={goToNextJourneyStep}
            >
              Next stop

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            STEP 03
        ==================================================== */}

        <article
          id="connect-journey-step-3"
          className="connect-step connect-step-03"
        >

          <button
            type="button"
            className={
              activeJourneyStep === 3
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(3)
            }
            aria-label="Start a conversation"
          >
            <span>
              03
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 3
                ? "connect-step-card journey-card-visible"
                : "connect-step-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <MessageCircle size={22} />
            </div>


            <span className="connect-step-label">
              CONVERSATION
            </span>


            <h3>
              Start a conversation
            </h3>


            <p>
              Chat first. Discover common food
              interests, cuisines, places and
              ideas before planning a meet.
            </p>


            <div className="connect-chat-demo">

              <div>
                Love South Indian food?
              </div>

              <div>
                Absolutely! 😊
              </div>

              <div>
                Let's plan something.
              </div>

            </div>


            <button
              type="button"
              className="journey-next-stop"
              onClick={goToNextJourneyStep}
            >
              Next stop

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            STEP 04
        ==================================================== */}

        <article
          id="connect-journey-step-4"
          className="connect-step connect-step-04"
        >

          <button
            type="button"
            className={
              activeJourneyStep === 4
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(4)
            }
            aria-label="Create a Food Invite"
          >
            <span>
              04
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 4
                ? "connect-step-card connect-invite-card journey-card-visible"
                : "connect-step-card connect-invite-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <Send size={22} />
            </div>


            <span className="connect-step-label">
              FOOD INVITE
            </span>


            <h3>
              Create a Food Invite
            </h3>


            <p>
              Turn the conversation into
              a real-world food moment.
            </p>


            <div className="connect-food-branch">

              <div className="connect-food-branch-line" />


              <div className="connect-food-option">

                <span>
                  <ChefHat size={18} />
                </span>

                <strong>
                  Cook Together
                </strong>

                <small>
                  Prepare a meal
                  together.
                </small>

              </div>


              <div className="connect-food-option">

                <span>
                  <Utensils size={18} />
                </span>

                <strong>
                  Dine Out
                </strong>

                <small>
                  Meet at a restaurant
                  or café.
                </small>

              </div>


              <div className="connect-food-option">

                <span>
                  <Footprints size={18} />
                </span>

                <strong>
                  Food Walk
                </strong>

                <small>
                  Explore multiple
                  food stops.
                </small>

              </div>

            </div>


            <button
              type="button"
              className="journey-next-stop"
              onClick={goToNextJourneyStep}
            >
              Next stop

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            STEP 05
        ==================================================== */}

        <article
          id="connect-journey-step-5"
          className="connect-step connect-step-05"
        >

          <button
            type="button"
            className={
              activeJourneyStep === 5
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(5)
            }
            aria-label="Meet over food"
          >
            <span>
              05
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 5
                ? "connect-step-card journey-card-visible"
                : "connect-step-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <Utensils size={22} />
            </div>


            <span className="connect-step-label">
              MEET
            </span>


            <h3>
              Meet over food
            </h3>


            <p>
              Meet at the chosen place,
              cook together, dine out or
              experience the food trail
              you planned.
            </p>


            <div className="connect-meet-visual">

              <span>
                🍜
              </span>

              <span>
                🍛
              </span>

              <span>
                ☕
              </span>

              <span>
                🥘
              </span>

            </div>


            <button
              type="button"
              className="journey-next-stop"
              onClick={goToNextJourneyStep}
            >
              Next stop

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            STEP 06
        ==================================================== */}

        <article
          id="connect-journey-step-6"
          className="connect-step connect-step-06"
        >

          <button
            type="button"
            className={
              activeJourneyStep === 6
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(6)
            }
            aria-label="Share the moment"
          >
            <span>
              06
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 6
                ? "connect-step-card journey-card-visible"
                : "connect-step-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <Heart size={22} />
            </div>


            <span className="connect-step-label">
              SHARE
            </span>


            <h3>
              Share the moment
            </h3>


            <p>
              Share photos, videos,
              recipes and stories from
              the experience with your
              FoodKindl community.
            </p>


            <div className="connect-share-demo">

              <div />
              <div />
              <div />

              <span>

                <Heart
                  size={14}
                  fill="currentColor"
                />

                24

              </span>

            </div>


            <button
              type="button"
              className="journey-next-stop final"
              onClick={() =>
                document
                  .getElementById(
                    "connect-final-destination"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                    block:
                      "center",
                  })
              }
            >
              See destination

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            FINAL DESTINATION
        ==================================================== */}

        <div
          id="connect-final-destination"
          className="connect-journey-final"
        >

          <div className="connect-final-heart">

            <Heart
              size={34}
              fill="currentColor"
            />

          </div>


          <span>
            THE JOURNEY CONTINUES
          </span>


          <h2>
            A connection becomes
            <strong>
              {" "}a friendship.
            </strong>
          </h2>


          <p>
            FoodKindl helps make the
            introduction. What happens
            around the table is yours.
          </p>


          <Link
            to={
              isVerified
                ? "/connect"
                : "/profile"
            }
            className="connect-start-button"
          >

            Start your FoodKindl journey

            <ArrowRight size={18} />

          </Link>

        </div>


      </section>



      {/* =====================================================
          OUTLOOK-STYLE HOME TOUR
      ====================================================== */}

      {
        tourReady &&
        showHomeTour &&
        (

          <div className="connect-guided-tour">

            <div
              className="connect-guided-tour-dim"
              aria-hidden="true"
            />


            {
              tourTargetRect &&
              (

                <div
                  className="connect-guided-tour-spotlight"
                  style={{
                    top:
                      `${tourTargetRect.top}px`,
                    left:
                      `${tourTargetRect.left}px`,
                    width:
                      `${tourTargetRect.width}px`,
                    height:
                      `${tourTargetRect.height}px`,
                  }}
                  aria-hidden="true"
                />

              )
            }


            <section
              className={
                `connect-guided-tour-card ${
                  tourCardPosition.placement
                }`
              }
              style={{
                top:
                  `${tourCardPosition.top}px`,
                left:
                  `${tourCardPosition.left}px`,
              }}
              role="dialog"
              aria-modal="true"
              aria-label="FoodKindl guided tour"
            >

              <div className="connect-guided-tour-head">

                <span>
                  {
                    homeTourSteps[
                      tourStep
                    ].eyebrow
                  }
                </span>

                <button
                  type="button"
                  onClick={skipHomeTour}
                  aria-label="Close tour"
                >
                  ×
                </button>

              </div>


              <div className="connect-guided-tour-progress">

                {
                  homeTourSteps.map(
                    (
                      step,
                      index
                    ) => (

                      <span
                        key={step.key}
                        className={
                          index <= tourStep
                            ? "active"
                            : ""
                        }
                      />

                    )
                  )
                }

              </div>


              <h2>
                {
                  homeTourSteps[
                    tourStep
                  ].title
                }
              </h2>


              <p>
                {
                  homeTourSteps[
                    tourStep
                  ].description
                }
              </p>


              {
                homeTourSteps[
                  tourStep
                ].key === "sos"
                &&
                (

                  <div className="connect-guided-tour-sos">

                    <div>
                      <span>1</span>
                      Add trusted contact
                    </div>

                    <div>
                      <span>2</span>
                      Hold SOS for 3 seconds
                    </div>

                    <div>
                      <span>3</span>
                      Emergency alert / WhatsApp
                    </div>

                  </div>

                )
              }


              <div className="connect-guided-tour-actions">

                <button
                  type="button"
                  className="connect-guided-tour-skip"
                  onClick={skipHomeTour}
                >
                  Skip tour
                </button>


                <div>

                  {
                    tourStep > 0 &&
                    (

                      <button
                        type="button"
                        className="connect-guided-tour-back"
                        onClick={
                          previousHomeTourStep
                        }
                      >
                        Back
                      </button>

                    )
                  }


                  <button
                    type="button"
                    className="connect-guided-tour-next"
                    onClick={
                      () => {

                        if (
                          tourStep === 0
                        ) {
                          openAccountMenu();
                        }

                        nextHomeTourStep();
                      }
                    }
                  >

                    {
                      tourStep ===
                      homeTourSteps.length - 1
                        ? "Finish"
                        : homeTourSteps[
                            tourStep
                          ].actionLabel
                    }

                    <ArrowRight size={14} />

                  </button>

                </div>

              </div>

            </section>

          </div>

        )
      }


    </main>
  );
}