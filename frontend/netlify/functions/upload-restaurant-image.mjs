import { getStore } from "@netlify/blobs";

const STORE_NAME = "foodkindl-restaurant-images";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanCategory(value) {
  const cleaned = String(value || "restaurants")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\.\./g, "")
    .replace(/^\/+|\/+$/g, "");

  return cleaned || "restaurants";
}

function cleanFileName(filename) {
  const cleaned = String(filename || "image.jpg")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

  return cleaned || "image.jpg";
}

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        detail: "Method not allowed. Use POST to upload an image.",
      },
      405
    );
  }

  try {
    // Do NOT print the actual secret.
    console.log(
      "UPLOAD FUNCTION VERSION:",
      "2026-08-30-v3"
    );

    console.log(
      "BLOB SECRET EXISTS:",
      Boolean(process.env.NETLIFY_BLOB_UPLOAD_SECRET)
    );

    const expectedSecret =
      process.env.NETLIFY_BLOB_UPLOAD_SECRET;

    if (!expectedSecret) {
      console.error(
        "NETLIFY_BLOB_UPLOAD_SECRET is missing in Netlify Function runtime."
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

    const receivedSecret =
      request.headers.get("x-foodkindl-upload-secret");

    if (
      !receivedSecret ||
      receivedSecret !== expectedSecret
    ) {
      return jsonResponse(
        {
          success: false,
          detail: "Unauthorized upload.",
        },
        401
      );
    }

    let formData;

    try {
      formData = await request.formData();
    } catch (error) {
      console.error("FORM DATA ERROR:", error);

      return jsonResponse(
        {
          success: false,
          detail: "Invalid multipart form data.",
        },
        400
      );
    }

    const file = formData.get("file");

    if (
      !file ||
      typeof file.arrayBuffer !== "function"
    ) {
      return jsonResponse(
        {
          success: false,
          detail: "No image file was provided.",
        },
        400
      );
    }

    const contentType = String(file.type || "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!ALLOWED_TYPES.includes(contentType)) {
      return jsonResponse(
        {
          success: false,
          detail:
            "Only JPG, PNG and WebP images are allowed.",
        },
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        {
          success: false,
          detail: "Image cannot exceed 10 MB.",
        },
        400
      );
    }

    const category = cleanCategory(
      formData.get("category")
    );

    const originalName =
      formData.get("original_name") ||
      file.name ||
      "image.jpg";

    const safeFileName = cleanFileName(file.name);

    const key =
      `${category}/` +
      `${Date.now()}-` +
      `${crypto.randomUUID()}-` +
      `${safeFileName}`;

    const store = getStore(STORE_NAME);

    const imageBuffer = await file.arrayBuffer();

    await store.set(key, imageBuffer, {
      metadata: {
        originalName: String(originalName),
        contentType,
        uploadedAt: new Date().toISOString(),
      },
    });

    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;

    const imageUrl =
      `${origin}/.netlify/functions/restaurant-image` +
      `?key=${encodeURIComponent(key)}`;

    return jsonResponse(
      {
        success: true,
        key,
        url: imageUrl,
        original_name: String(originalName),
        content_type: contentType,
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