import { getStore } from "@netlify/blobs";


const STORE_NAME =
  "foodkindl-restaurant-images";


function textResponse(
  message,
  status
) {
  return new Response(
    message,
    {
      status,
      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",

        "Access-Control-Allow-Origin":
          "*",

        "Cache-Control":
          "no-store",
      },
    }
  );
}


export default async (
  request
) => {

  // ==========================================================
  // CORS
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
            "GET, HEAD, OPTIONS",

          "Access-Control-Allow-Headers":
            "Content-Type",
        },
      }
    );
  }


  // ==========================================================
  // ONLY GET / HEAD
  // ==========================================================

  if (
    request.method !== "GET" &&
    request.method !== "HEAD"
  ) {
    return textResponse(
      "Method not allowed.",
      405
    );
  }


  try {

    const url =
      new URL(
        request.url
      );


    const key =
      url.searchParams.get(
        "key"
      );


    if (!key) {
      return textResponse(
        "Image key is required.",
        400
      );
    }


    const store =
      getStore(
        STORE_NAME
      );


    const entry =
      await store.getWithMetadata(
        key,
        {
          type:
            "arrayBuffer",
        }
      );


    if (!entry) {
      return textResponse(
        "Image not found.",
        404
      );
    }


    const contentType =
      entry.metadata
        ?.contentType ||
      "image/jpeg";


    const headers = {
      "Content-Type":
        contentType,

      "Cache-Control":
        "public, max-age=31536000, immutable",

      "X-Content-Type-Options":
        "nosniff",

      "Access-Control-Allow-Origin":
        "*",
    };


    // HEAD should return headers only
    if (
      request.method ===
      "HEAD"
    ) {
      return new Response(
        null,
        {
          status: 200,
          headers,
        }
      );
    }


    return new Response(
      entry.data,
      {
        status: 200,
        headers,
      }
    );


  } catch (error) {

    console.error(
      "Restaurant image error:",
      error
    );


    return textResponse(
      "Unable to load image.",
      500
    );
  }
};