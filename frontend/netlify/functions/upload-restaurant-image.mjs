import { getStore } from "@netlify/blobs";


// ============================================================
// CONFIGURATION
// ============================================================

const STORE_NAME =
  "foodkindl-restaurant-images";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


// ============================================================
// JSON RESPONSE HELPER
// ============================================================

function jsonResponse(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",
      },
    }
  );
}


// ============================================================
// CLEAN CATEGORY
// ============================================================

function cleanCategory(
  value
) {
  const cleaned =
    String(
      value ||
      "restaurants"
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

function cleanFileName(
  filename
) {
  const cleaned =
    String(
      filename ||
      "image.jpg"
    )
      .toLowerCase()
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      );

  return (
    cleaned ||
    "image.jpg"
  );
}


// ============================================================
// NETLIFY FUNCTION
// ============================================================

export default async (
  request
) => {

  // ==========================================================
  // METHOD
  // ==========================================================

  if (
    request.method !== "POST"
  ) {
    return jsonResponse(
      {
        success: false,

        detail:
          "Method not allowed. Use POST to upload an image.",
      },
      405
    );
  }


  try {

    // ========================================================
    // SECRET CONFIGURATION
    // ========================================================

    const expectedSecret =
      process.env
        .NETLIFY_BLOB_UPLOAD_SECRET;


    if (!expectedSecret) {
      console.error(
        "NETLIFY_BLOB_UPLOAD_SECRET is missing."
      );

      return jsonResponse(
        {
          success: false,

          detail:
            "NETLIFY_BLOB_UPLOAD_SECRET is not configured.",
        },
        500
      );
    }


    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const receivedSecret =
      request.headers.get(
        "x-foodkindl-upload-secret"
      );


    if (
      !receivedSecret ||
      receivedSecret !==
        expectedSecret
    ) {
      return jsonResponse(
        {
          success: false,

          detail:
            "Unauthorized upload.",
        },
        401
      );
    }


    // ========================================================
    // FORM DATA
    // ========================================================

    let formData;

    try {
      formData =
        await request.formData();

    } catch (error) {
      return jsonResponse(
        {
          success: false,

          detail:
            "Invalid multipart form data.",
        },
        400
      );
    }


    const file =
      formData.get(
        "file"
      );


    if (
      !file ||
      typeof file.arrayBuffer
        !== "function"
    ) {
      return jsonResponse(
        {
          success: false,

          detail:
            "No image file was provided.",
        },
        400
      );
    }


    // ========================================================
    // FILE TYPE
    // ========================================================

    const contentType =
      String(
        file.type || ""
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
            "Only JPG, PNG and WebP images are allowed.",
        },
        400
      );
    }


    // ========================================================
    // FILE SIZE
    // ========================================================

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return jsonResponse(
        {
          success: false,

          detail:
            "Image cannot exceed 10 MB.",
        },
        400
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
    // FILE NAME
    // ========================================================

    const safeFileName =
      cleanFileName(
        file.name
      );


    // ========================================================
    // UNIQUE BLOB KEY
    // ========================================================

    const randomPart =
      crypto.randomUUID();


    const key =
      `${category}/` +
      `${Date.now()}-` +
      `${randomPart}-` +
      `${safeFileName}`;


    // ========================================================
    // GET NETLIFY BLOB STORE
    // ========================================================

    const store =
      getStore(
        STORE_NAME
      );


    // ========================================================
    // READ IMAGE
    // ========================================================

    const imageBuffer =
      await file.arrayBuffer();


    // ========================================================
    // SAVE IMAGE
    // ========================================================

    await store.set(
      key,
      imageBuffer,
      {
        metadata: {

          originalName:
            file.name,

          contentType:
            contentType,

          uploadedAt:
            new Date()
              .toISOString(),
        },
      }
    );


    // ========================================================
    // PUBLIC IMAGE URL
    // ========================================================

    const requestUrl =
      new URL(
        request.url
      );


    const origin =
      requestUrl.origin;


    const imageUrl =
      `${origin}` +
      `/.netlify/functions/restaurant-image` +
      `?key=${encodeURIComponent(key)}`;


    // ========================================================
    // SUCCESS
    // ========================================================

    return jsonResponse(
      {
        success: true,

        key:
          key,

        url:
          imageUrl,

        original_name:
          file.name,

        content_type:
          contentType,
      },
      201
    );

  } catch (error) {

    console.error(
      "FoodKindl restaurant image upload error:",
      error
    );


    return jsonResponse(
      {
        success: false,

        detail:
          error?.message ||
          "Unable to upload restaurant image.",
      },
      500
    );
  }
};