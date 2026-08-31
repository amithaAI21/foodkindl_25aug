import { getStore } from "@netlify/blobs";


// ============================================================
// CONFIG
// ============================================================

const STORE_NAME =
  "foodkindl-homepage-media";

const MAX_FILE_SIZE =
  150 * 1024 * 1024; // 150 MB

const ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
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
          "application/json",

        "Cache-Control":
          "no-store",
      },
    }
  );
}


// ============================================================
// NETLIFY FUNCTION
// ============================================================

export default async function handler(
  request
) {

  // ==========================================================
  // ONLY POST IS ALLOWED
  // ==========================================================

  if (
    request.method !== "POST"
  ) {
    return jsonResponse(
      {
        success: false,
        error:
          "Method not allowed. Use POST.",
      },
      405
    );
  }


  // ==========================================================
  // READ SECRET FROM NETLIFY
  // ==========================================================

  const expectedSecret =
    process.env
      .NETLIFY_VIDEO_UPLOAD_SECRET;


  // ==========================================================
  // READ SECRET SENT BY DJANGO
  // ==========================================================

  const receivedSecret =
    request.headers.get(
      "X-FoodKindl-Upload-Secret"
    );


  // ==========================================================
  // CHECK NETLIFY CONFIGURATION
  // ==========================================================

  if (!expectedSecret) {

    console.error(
      "NETLIFY_VIDEO_UPLOAD_SECRET is missing."
    );

    return jsonResponse(
      {
        success: false,

        error:
          (
            "NETLIFY_VIDEO_UPLOAD_SECRET "
            +
            "is not configured in the "
            +
            "Netlify Function runtime."
          ),
      },
      500
    );
  }


  // ==========================================================
  // VERIFY DJANGO SECRET
  // ==========================================================

  if (
    !receivedSecret ||
    receivedSecret !==
      expectedSecret
  ) {

    console.error(
      "Homepage video secret mismatch."
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unauthorized upload request.",
      },
      401
    );
  }


  try {

    // ========================================================
    // GET CONTENT TYPE
    // ========================================================

    const rawContentType =
      request.headers.get(
        "content-type"
      )
      ||
      "video/mp4";


    const contentType =
      rawContentType
        .split(";")[0]
        .trim()
        .toLowerCase();


    // ========================================================
    // VALIDATE VIDEO TYPE
    // ========================================================

    if (
      !ALLOWED_TYPES.includes(
        contentType
      )
    ) {

      return jsonResponse(
        {
          success: false,

          error:
            (
              "Unsupported video type. "
              +
              "Only MP4, WebM and MOV "
              +
              "videos are allowed."
            ),
        },
        400
      );
    }


    // ========================================================
    // ORIGINAL FILE NAME
    // ========================================================

    const originalFileName =
      request.headers.get(
        "x-file-name"
      )
      ||
      "homepage-video.mp4";


    // ========================================================
    // READ VIDEO BODY
    // ========================================================

    const videoBlob =
      await request.blob();


    // ========================================================
    // CHECK EMPTY FILE
    // ========================================================

    if (
      !videoBlob ||
      videoBlob.size === 0
    ) {

      return jsonResponse(
        {
          success: false,

          error:
            "Uploaded video is empty.",
        },
        400
      );
    }


    // ========================================================
    // CHECK FILE SIZE
    // ========================================================

    if (
      videoBlob.size >
      MAX_FILE_SIZE
    ) {

      return jsonResponse(
        {
          success: false,

          error:
            (
              "Video is too large. "
              +
              "Maximum allowed size "
              +
              "is 150 MB."
            ),
        },
        413
      );
    }


    // ========================================================
    // DETERMINE FILE EXTENSION
    // ========================================================

    let extension =
      originalFileName
        .split(".")
        .pop()
        ?.toLowerCase();


    if (
      ![
        "mp4",
        "webm",
        "mov",
      ].includes(
        extension
      )
    ) {

      if (
        contentType ===
        "video/webm"
      ) {

        extension =
          "webm";

      } else if (
        contentType ===
        "video/quicktime"
      ) {

        extension =
          "mov";

      } else {

        extension =
          "mp4";
      }
    }


    // ========================================================
    // CREATE UNIQUE BLOB KEY
    // ========================================================

    const blobKey =
      (
        "homepage/videos/"
        +
        crypto.randomUUID()
        +
        "."
        +
        extension
      );


    // ========================================================
    // GET NETLIFY BLOB STORE
    // ========================================================

    const store =
      getStore(
        STORE_NAME
      );


    // ========================================================
    // UPLOAD VIDEO
    // ========================================================

    await store.set(
      blobKey,
      videoBlob,
      {
        metadata: {

          contentType:
            contentType,

          originalFileName:
            originalFileName,

          uploadedAt:
            new Date()
              .toISOString(),
        },
      }
    );


    // ========================================================
    // NETLIFY SITE ORIGIN
    // ========================================================

    const origin =
      new URL(
        request.url
      ).origin;


    // ========================================================
    // PUBLIC VIDEO URL
    //
    // homepage-video.mjs will serve this file.
    // ========================================================

    const videoUrl =
      (
        `${origin}`
        +
        "/homepage-video"
        +
        `?key=${encodeURIComponent(
          blobKey
        )}`
      );


    // ========================================================
    // SUCCESS LOG
    // ========================================================

    console.log(
      "Homepage video uploaded successfully",
      {
        key:
          blobKey,

        file:
          originalFileName,

        size:
          videoBlob.size,

        contentType:
          contentType,

        url:
          videoUrl,
      }
    );


    // ========================================================
    // RETURN DATA TO DJANGO
    // ========================================================

    return jsonResponse(
      {
        success: true,

        key:
          blobKey,

        url:
          videoUrl,

        video_url:
          videoUrl,

        file_name:
          originalFileName,

        content_type:
          contentType,

        size:
          videoBlob.size,
      },
      201
    );


  } catch (error) {

    // ========================================================
    // NETLIFY BLOB ERROR
    // ========================================================

    console.error(
      "Homepage video upload failed:",
      error
    );


    return jsonResponse(
      {
        success: false,

        error:
          (
            error?.message
            ||
            "Homepage video upload failed."
          ),
      },
      500
    );
  }
}