import { getStore } from "@netlify/blobs";

const STORE_NAME = "foodkindl-homepage-media";

export default async function handler(request) {
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

  const expectedSecret =
    process.env.NETLIFY_VIDEO_UPLOAD_SECRET;

  const receivedSecret =
    request.headers.get(
      "X-FoodKindl-Upload-Secret"
    );

  if (!expectedSecret) {
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
        },
      }
    );
  }

  if (
    !receivedSecret ||
    receivedSecret !== expectedSecret
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unauthorized.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const contentType =
      request.headers.get("content-type") ||
      "video/mp4";

    const cleanContentType =
      contentType
        .split(";")[0]
        .trim()
        .toLowerCase();

    const originalFileName =
      request.headers.get("x-file-name") ||
      "homepage-video.mp4";

    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

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
          error: "Uploaded video is empty.",
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

    let extension =
      originalFileName
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
      !["mp4", "webm", "mov"].includes(
        extension
      )
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

    const blobKey =
      `homepage/videos/${crypto.randomUUID()}.${extension}`;

    const store =
      getStore(STORE_NAME);

    await store.set(
      blobKey,
      videoBlob,
      {
        metadata: {
          contentType:
            cleanContentType,
          originalFileName,
          uploadedAt:
            new Date().toISOString(),
        },
      }
    );

    const origin =
      new URL(request.url).origin;

    // IMPORTANT:
    // This uses the custom route from homepage-video.mjs
    const videoUrl =
      `${origin}/homepage-video?key=${encodeURIComponent(
        blobKey
      )}`;

    return new Response(
      JSON.stringify({
        success: true,
        key: blobKey,
        video_url: videoUrl,
        url: videoUrl,
        file_name:
          originalFileName,
        content_type:
          cleanContentType,
        size: videoBlob.size,
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
        },
      }
    );
  }
}