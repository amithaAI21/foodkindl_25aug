import { getStore } from "@netlify/blobs";

export default async function handler(request) {
  // ==========================================================
  // ONLY POST
  // ==========================================================

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed. Use POST.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // ==========================================================
  // SECRET
  // IMPORTANT:
  // This now matches Django settings.py / Render
  // ==========================================================

  const expectedSecret =
    process.env.NETLIFY_VIDEO_UPLOAD_SECRET;

  const receivedSecret =
    request.headers.get(
      "X-FoodKindl-Upload-Secret"
    );

  if (!expectedSecret) {
    console.error(
      "NETLIFY_VIDEO_UPLOAD_SECRET is missing from Netlify runtime."
    );

    return new Response(
      JSON.stringify({
        success: false,
        error:
          "NETLIFY_VIDEO_UPLOAD_SECRET is not configured in Netlify.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (
    !receivedSecret ||
    receivedSecret !== expectedSecret
  ) {
    console.error(
      "Homepage video upload secret mismatch."
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: "Unauthorized.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // ==========================================================
  // UPLOAD
  // ==========================================================

  try {
    const contentType =
      request.headers.get("content-type") ||
      "video/mp4";

    const originalFileName =
      request.headers.get("x-file-name") ||
      "homepage-video.mp4";

    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    const cleanContentType =
      contentType
        .split(";")[0]
        .trim()
        .toLowerCase();

    if (
      !allowedTypes.includes(
        cleanContentType
      )
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Only MP4, WebM and MOV videos are allowed.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const videoBlob =
      await request.blob();

    if (
      !videoBlob ||
      videoBlob.size === 0
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Uploaded video is empty.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    // ========================================================
    // FILE EXTENSION
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
      ].includes(extension)
    ) {
      if (
        cleanContentType ===
        "video/webm"
      ) {
        extension = "webm";
      } else if (
        cleanContentType ===
        "video/quicktime"
      ) {
        extension = "mov";
      } else {
        extension = "mp4";
      }
    }

    // ========================================================
    // BLOB KEY
    // ========================================================

    const blobKey =
      `homepage/videos/` +
      `${crypto.randomUUID()}.` +
      `${extension}`;

    const store =
      getStore(
        "foodkindl-homepage-media"
      );

    await store.set(
      blobKey,
      videoBlob,
      {
        metadata: {
          contentType:
            cleanContentType,

          originalFileName,

          uploadedAt:
            new Date()
              .toISOString(),
        },
      }
    );

    // ========================================================
    // PUBLIC VIDEO URL
    // ========================================================

    const origin =
      new URL(
        request.url
      ).origin;

    const videoUrl =
      `${origin}` +
      `/.netlify/functions/homepage-video` +
      `?key=${encodeURIComponent(blobKey)}`;

    console.log(
      "Homepage video uploaded:",
      {
        blobKey,
        videoUrl,
        size: videoBlob.size,
      }
    );

    return new Response(
      JSON.stringify({
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
          cleanContentType,

        size:
          videoBlob.size,
      }),
      {
        status: 201,
        headers: {
          "Content-Type":
            "application/json",

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Homepage video upload failed:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,

        error:
          error?.message ||
          "Video upload failed.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type":
            "application/json",

          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}