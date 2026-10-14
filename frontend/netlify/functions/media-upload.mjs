
import { getStore } from "@netlify/blobs";

const STORE_NAME = "foodkindl-media";

// Keep files under Netlify's effective upload limit.
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const MAX_VIDEO_SIZE = 4 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": { extension: "jpg", kind: "image" },
  "image/png": { extension: "png", kind: "image" },
  "image/webp": { extension: "webp", kind: "image" },

  "video/mp4": { extension: "mp4", kind: "video" },
  "video/webm": { extension: "webm", kind: "video" },
  "video/quicktime": { extension: "mov", kind: "video" },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed" },
      405
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return jsonResponse(
        { success: false, error: "No file selected" },
        400
      );
    }

    const fileConfig = ALLOWED_TYPES[file.type];

    if (!fileConfig) {
      return jsonResponse(
        {
          success: false,
          error:
            "Only JPG, PNG, WebP, MP4, WebM and MOV files are allowed",
        },
        400
      );
    }

    const isVideo = fileConfig.kind === "video";

    const maxSize = isVideo
      ? MAX_VIDEO_SIZE
      : MAX_IMAGE_SIZE;

    if (file.size === 0 || file.size > maxSize) {
      return jsonResponse(
        {
          success: false,
          error: isVideo
            ? "Video must be smaller than 4 MB"
            : "Photo must be smaller than 4 MB",
        },
        400
      );
    }

    const folder = isVideo ? "videos" : "images";

    const key =
      `${folder}/${crypto.randomUUID()}.` +
      fileConfig.extension;

    const store = getStore(STORE_NAME);

    await store.set(key, file, {
      metadata: {
        contentType: file.type,
        mediaType: fileConfig.kind,
        uploadedAt: new Date().toISOString(),
      },
    });

    const origin = new URL(request.url).origin;

    const url =
      `${origin}/.netlify/functions/media` +
      `?key=${encodeURIComponent(key)}`;

    return jsonResponse({
      success: true,
      key,
      url,
      filename: file.name,
      contentType: file.type,
      mediaType: fileConfig.kind,
      size: file.size,
    });
  } catch (error) {
    console.error("FoodKindl media upload error:", error);

    return jsonResponse(
      {
        success: false,
        error: "Media upload failed. Check Netlify logs.",
      },
      500
    );
  }
}
