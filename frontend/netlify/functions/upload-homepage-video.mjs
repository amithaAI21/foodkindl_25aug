import { getStore } from "@netlify/blobs";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const expectedSecret =
    process.env.FOODKINDL_VIDEO_UPLOAD_SECRET;

  const receivedSecret =
    request.headers.get(
      "X-FoodKindl-Upload-Secret"
    );

  if (
    !expectedSecret ||
    receivedSecret !== expectedSecret
  ) {
    return new Response(
      JSON.stringify({
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

    const originalFileName =
      request.headers.get("x-file-name") ||
      "homepage-video.mp4";

    const videoBlob =
      await request.blob();

    const extension =
      originalFileName
        .split(".")
        .pop()
        ?.toLowerCase() || "mp4";

    const blobKey =
      `homepage/videos/${crypto.randomUUID()}.${extension}`;

    const store = getStore(
      "foodkindl-homepage-media"
    );

    await store.set(
      blobKey,
      videoBlob,
      {
        metadata: {
          contentType,
          originalFileName,
          uploadedAt:
            new Date().toISOString(),
        },
      }
    );

    const origin =
      new URL(request.url).origin;

    const videoUrl =
      `${origin}/.netlify/functions/homepage-video` +
      `?key=${encodeURIComponent(blobKey)}`;

    return new Response(
      JSON.stringify({
        success: true,
        key: blobKey,
        video_url: videoUrl,
        file_name: originalFileName,
        size: videoBlob.size,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
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
        error:
          error?.message ||
          "Video upload failed.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};