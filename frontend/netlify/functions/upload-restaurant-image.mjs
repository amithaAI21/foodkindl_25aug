import { getStore } from "@netlify/blobs";


const STORE_NAME =
  "foodkindl-restaurant-images";

const MAX_FILE_SIZE =
  10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


// ============================================================
// JSON RESPONSE
// ============================================================

function jsonResponse(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify({
      ...data,
      function_version:
        "FOODKINDL-DEBUG-2026-08-31-V3",
    }),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-store",

        "Access-Control-Allow-Origin":
          "*",

        "X-FoodKindl-Function-Version":
          "FOODKINDL-DEBUG-2026-08-31-V3",
      },
    }
  );
}

// ============================================================
// CLEAN CATEGORY
// ============================================================

function cleanCategory(value) {
  const cleaned =
    String(
      value || "restaurants"
    )
      .replace(
        /[^a-zA-Z0-9/_-]/g,
        ""
      )
      .replace(
        /\.\./g,
        ""
      )
      .replace(
        /^\/+|\/+$/g,
        ""
      );

  return (
    cleaned ||
    "restaurants"
  );
}


// ============================================================
// CLEAN FILE NAME
// ============================================================

function cleanFileName(filename) {
  const cleaned =
    String(
      filename || "image.jpg"
    )
      .toLowerCase()
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return (
    cleaned ||
    "image.jpg"
  );
}


// ============================================================
// FUNCTION
// ============================================================

export default async (
  request
) => {

  // ==========================================================
  // CORS / OPTIONS
  // ==========================================================

  if (
    request.method ===
    "OPTIONS"
  ) {
    return new Response(
      null,
      {
        status: 204,

        headers: {
          "Access-Control-Allow-Origin":
            "*",

          "Access-Control-Allow-Methods":
            "POST, OPTIONS",

          "Access-Control-Allow-Headers":
            "Content-Type, X-FoodKindl-Upload-Secret",

          "Access-Control-Max-Age":
            "86400",
        },
      }
    );
  }


  // ==========================================================
  // ONLY POST
  // ==========================================================

  if (
    request.method !==
    "POST"
  ) {
    return jsonResponse(
      {
        success: false,

        detail:
          "Method not allowed. Use POST.",
      },
      405
    );
  }


  try {

    // ========================================================
    // SAFE DIAGNOSTICS
    // ========================================================

    console.log(
      "UPLOAD FUNCTION VERSION:",
      "2026-08-31-debug-v1"
    );

    console.log(
      "FUNCTION SITE URL:",
      process.env.URL ||
        "missing"
    );

    console.log(
      "DEPLOY CONTEXT:",
      process.env.CONTEXT ||
        "missing"
    );

    console.log(
      "ENVIRONMENT CHECK:",
      {
        hasBlobSecret:
          Boolean(
            process.env
              .NETLIFY_BLOB_UPLOAD_SECRET
          ),

        hasSiteId:
          Boolean(
            process.env.SITE_ID
          ),

        hasUrl:
          Boolean(
            process.env.URL
          ),

        context:
          process.env.CONTEXT ||
          "missing",
      }
    );


    // ========================================================
    // TEMPORARY DEBUG
    //
    // The upload-secret validation is intentionally disabled.
    //
    // DO NOT leave this disabled in production.
    // ========================================================

    console.warn(
      "DEBUG MODE: Custom upload-secret validation is disabled."
    );


    // ========================================================
    // MULTIPART FORM DATA
    // ========================================================

    let formData;

    try {

      formData =
        await request.formData();

    } catch (error) {

      console.error(
        "Unable to parse multipart form data:",
        error
      );

      return jsonResponse(
        {
          success: false,

          detail:
            "Invalid multipart/form-data request.",
        },
        400
      );
    }


    // ========================================================
    // FILE
    // ========================================================

    const file =
      formData.get(
        "file"
      );


    if (!file) {

      return jsonResponse(
        {
          success: false,

          detail:
            'No file received. Expected multipart field "file".',
        },
        400
      );
    }


    if (
      typeof file !==
        "object" ||
      typeof file.arrayBuffer !==
        "function"
    ) {

      return jsonResponse(
        {
          success: false,

          detail:
            "Invalid uploaded file.",
        },
        400
      );
    }


    // ========================================================
    // CONTENT TYPE
    // ========================================================

    const contentType =
      (
        file.type ||
        "application/octet-stream"
      )
        .split(";")[0]
        .trim()
        .toLowerCase();


    if (
      !ALLOWED_TYPES.includes(
        contentType
      )
    ) {

      return jsonResponse(
        {
          success: false,

          detail:
            "Unsupported image type. Only JPEG, PNG and WebP are allowed.",
        },
        400
      );
    }


    // ========================================================
    // FILE SIZE
    // ========================================================

    if (
      !file.size ||
      file.size <= 0
    ) {

      return jsonResponse(
        {
          success: false,

          detail:
            "Uploaded image is empty.",
        },
        400
      );
    }


    if (
      file.size >
      MAX_FILE_SIZE
    ) {

      return jsonResponse(
        {
          success: false,

          detail:
            "Image is too large. Maximum size is 10 MB.",
        },
        413
      );
    }


    // ========================================================
    // CATEGORY
    // ========================================================

    const category =
      cleanCategory(
        formData.get(
          "category"
        )
      );


    // ========================================================
    // ORIGINAL FILE NAME
    // ========================================================

    const originalName =
      formData.get(
        "original_name"
      ) ||
      file.name ||
      "image.jpg";


    const safeFileName =
      cleanFileName(
        originalName
      );


    // ========================================================
    // UNIQUE BLOB KEY
    // ========================================================

    const uniqueId =
      crypto.randomUUID();


    const key =
      `${category}/` +
      `${Date.now()}-` +
      `${uniqueId}-` +
      `${safeFileName}`;


    console.log(
      "Uploading restaurant image:",
      {
        key,
        category,
        contentType,
        size:
          file.size,
      }
    );


    // ========================================================
    // FILE BUFFER
    // ========================================================

    const arrayBuffer =
      await file.arrayBuffer();


    // ========================================================
    // NETLIFY BLOB STORE
    // ========================================================

    const store =
      getStore(
        STORE_NAME
      );


    console.log(
      "Netlify Blob store created:",
      STORE_NAME
    );


    await store.set(
      key,
      arrayBuffer,
      {
        metadata: {

          originalName:
            String(
              originalName
            ),

          contentType,

          uploadedAt:
            new Date()
              .toISOString(),
        },
      }
    );


    console.log(
      "Blob saved successfully:",
      key
    );


    // ========================================================
    // PUBLIC IMAGE URL
    // ========================================================

    const origin =
      new URL(
        request.url
      ).origin;


    const imageUrl =
      `${origin}` +
      `/.netlify/functions/restaurant-image` +
      `?key=${encodeURIComponent(key)}`;


    console.log(
      "Restaurant image uploaded successfully:",
      {
        key,
        imageUrl,
      }
    );


    // ========================================================
    // SUCCESS
    // ========================================================

    return jsonResponse(
      {
        success: true,

        key,

        url:
          imageUrl,

        original_name:
          String(
            originalName
          ),

        content_type:
          contentType,

        size:
          file.size,

        debug:
          {
            secretVisible:
              Boolean(
                process.env
                  .NETLIFY_BLOB_UPLOAD_SECRET
              ),

            siteUrl:
              process.env.URL ||
              null,

            context:
              process.env.CONTEXT ||
              null,
          },
      },
      201
    );


  } catch (error) {

    console.error(
      "upload-restaurant-image unexpected error:",
      error
    );


    return jsonResponse(
      {
        success: false,

        detail:
          "Restaurant image upload failed.",

        error:
          String(
            error?.message ||
            error
          ),
      },
      500
    );
  }
};