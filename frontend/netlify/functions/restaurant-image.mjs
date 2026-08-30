import { getStore } from "@netlify/blobs";

const STORE_NAME = "foodkindl-restaurant-images";

export default async (request) => {
  try {
    const url = new URL(request.url);

    const key = url.searchParams.get("key");

    if (!key) {
      return new Response(
        "Image key is required.",
        {
          status: 400,
        }
      );
    }

    const store = getStore(STORE_NAME);

    const entry = await store.getWithMetadata(
      key,
      {
        type: "arrayBuffer",
      }
    );

    if (!entry) {
      return new Response(
        "Image not found.",
        {
          status: 404,
        }
      );
    }

    const contentType =
      entry.metadata?.contentType ||
      "image/jpeg";

    return new Response(
      entry.data,
      {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control":
            "public, max-age=31536000, immutable",
          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "Restaurant image error:",
      error
    );

    return new Response(
      "Unable to load image.",
      {
        status: 500,
      }
    );
  }
};