import { getStore } from "@netlify/blobs";

const STORE_NAME = "foodkindl-homepage-media";

const MAX_FILE_SIZE =
  5 * 1024 * 1024; // 5 MB for testing

const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);


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


export default async function handler(
  request
) {

  // ==========================================================
  // METHOD
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
  // SECRET
  // ==========================================================

  const expectedSecret =
    process.env
      .NETLIFY_VIDEO_UPLOAD_SECRET;


  const receivedSecret =
    request.headers.get(
      "X-FoodKindl-Upload-Secret"
    );


  if (!expectedSecret) {

    console.error(
      "NETLIFY_VIDEO_UPLOAD_SECRET missing."
    );


    return jsonResponse(
      {
        success: false,

        error:
          "NETLIFY_VIDEO_UPLOAD_SECRET is not configured in the Netlify Function runtime.",
      },
      500
    );
  }


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
          "Unauthorized.",
      },
      401
    );
  }


  // ==========================================================
  // CONTENT LENGTH
  // ==========================================================

  const contentLengthHeader =
    request.headers.get(
      "content-length"
    );


  if (contentLengthHeader) {

    const contentLength =
      Number(
        contentLengthHeader
      );


    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAX_FILE_SIZE
    ) {

      return jsonResponse(
        {
          success: false,

          error:
            "Video is too large. Maximum test upload size is 5 MB.",
        },
        413
      );
    }
  }


  // ==========================================================
  // CONTENT TYPE
  // ==========================================================

  const rawContentType =
    request.headers.get(
      "content-type"
    ) ||
    "video/mp4";


  const contentType =
    rawContentType
      .split(";")[0]
      .trim()
      .toLowerCase();


  if (
    !ALLOWED_TYPES.has(
      contentType
    )
  ) {

    return jsonResponse(
      {
        success: false,

        error:
          "Only MP4, WebM and MOV videos are allowed.",
      },
      400
    );
  }


  // ==========================================================
  // ORIGINAL FILE NAME
  // ==========================================================

  const originalFileName =
    request.headers.get(
      "x-file-name"
    ) ||
    "homepage-video.mp4";


  try {

    // ========================================================
    // READ BODY
    // ========================================================

    const videoBlob =
      await request.blob();


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


    if (
      videoBlob.size >
      MAX_FILE_SIZE
    ) {

      return jsonResponse(
        {
          success: false,

          error:
            "Video is too large. Maximum test upload size is 5 MB.",
        },
        413
      );
    }


    // ========================================================
    // EXTENSION
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
    // BLOB KEY
    // ========================================================

    const blobKey =
      `homepage/videos/` +
      `${crypto.randomUUID()}.` +
      `${extension}`;


    console.log(
      "Uploading homepage video:",
      {
        blobKey,
        size:
          videoBlob.size,
        contentType,
      }
    );


    // ========================================================
    // NETLIFY BLOB
    // ========================================================

    const store =
      getStore(
        STORE_NAME
      );


    await store.set(
      blobKey,
      videoBlob,
      {
        metadata: {

          contentType,

          originalFileName,

          uploadedAt:
            new Date()
              .toISOString(),

        },
      }
    );


    // ========================================================
    // PUBLIC URL
    // ========================================================

    const origin =
      new URL(
        request.url
      ).origin;


    const videoUrl =
      `${origin}/homepage-video` +
      `?key=${encodeURIComponent(
        blobKey
      )}`;


    console.log(
      "Homepage video uploaded successfully:",
      {
        blobKey,
        videoUrl,
      }
    );


    // ========================================================
    // SUCCESS
    // ========================================================

    return jsonResponse(
      {
        success: true,

        key:
          blobKey,

        video_url:
          videoUrl,

        url:
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

    console.error(
      "Homepage video upload failed:",
      error
    );


    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Video upload failed.",
      },
      500
    );
  }
}