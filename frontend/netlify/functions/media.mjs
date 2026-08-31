import {
  getStore,
} from "@netlify/blobs";


/* ============================================================
   STORE
============================================================ */

const PUBLIC_STORE =
  "foodkindl-media";


/* ============================================================
   JSON RESPONSE
============================================================ */

function jsonResponse(
  body,
  status = 200
) {

  return new Response(
    JSON.stringify(body),
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


/* ============================================================
   MEDIA HANDLER
============================================================ */

export default async function handler(
  request
) {

  /* ==========================================================
     METHOD
  ========================================================== */

  if (
    request.method !== "GET"
  ) {

    return jsonResponse(
      {
        success: false,

        error:
          "Method not allowed.",
      },
      405
    );
  }


  try {

    /* ========================================================
       REQUEST URL
    ======================================================== */

    const requestUrl =
      new URL(
        request.url
      );


    const rawKey =
      requestUrl
        .searchParams
        .get("key");


    /* ========================================================
       VALIDATE KEY
    ======================================================== */

    if (!rawKey) {

      return jsonResponse(
        {
          success: false,

          error:
            "Missing media key.",
        },
        400
      );
    }


    const key =
      String(
        rawKey
      ).trim();


    if (!key) {

      return jsonResponse(
        {
          success: false,

          error:
            "Invalid media key.",
        },
        400
      );
    }


    console.log(
      "FOODKINDL MEDIA REQUEST:",
      {
        key,
      }
    );


    /* ========================================================
       SECURITY
       NEVER SERVE GOVERNMENT IDs HERE
    ======================================================== */

    if (
      key.startsWith(
        "government-ids/"
      )
    ) {

      console.warn(
        "PUBLIC MEDIA ACCESS BLOCKED:",
        key
      );


      return jsonResponse(
        {
          success: false,

          error:
            "Access denied.",
        },
        403
      );
    }


    /*
     * Public upload keys should normally
     * begin with one of these folders.
     */

    const allowedFolders = [
      "images/",
      "videos/",
      "documents/",
      "files/",
    ];


    const validPublicKey =
      allowedFolders.some(
        folder =>
          key.startsWith(
            folder
          )
      );


    if (!validPublicKey) {

      console.warn(
        "INVALID PUBLIC MEDIA KEY:",
        key
      );


      return jsonResponse(
        {
          success: false,

          error:
            "Invalid media key.",
        },
        400
      );
    }


    /* ========================================================
       STORE
    ======================================================== */

    const store =
      getStore(
        PUBLIC_STORE
      );


    /* ========================================================
       LOAD BLOB
    ======================================================== */

    const result =
      await store.getWithMetadata(
        key,
        {
          type:
            "blob",
        }
      );


    /* ========================================================
       NOT FOUND
    ======================================================== */

    if (
      !result ||
      !result.data
    ) {

      console.warn(
        "FOODKINDL MEDIA NOT FOUND:",
        key
      );


      return jsonResponse(
        {
          success: false,

          error:
            "Media not found.",
        },
        404
      );
    }


    /* ========================================================
       CONTENT TYPE
    ======================================================== */

    let contentType =
      result.metadata
        ?.contentType
      ||
      result.metadata
        ?.content_type
      ||
      result.data
        ?.type
      ||
      "";


    /*
     * Fallback based on extension
     * when Blob metadata is unavailable.
     */

    if (!contentType) {

      const extension =
        key
          .split(".")
          .pop()
          ?.toLowerCase();


      const contentTypes = {

        jpg:
          "image/jpeg",

        jpeg:
          "image/jpeg",

        png:
          "image/png",

        webp:
          "image/webp",

        gif:
          "image/gif",

        mp4:
          "video/mp4",

        webm:
          "video/webm",

        mov:
          "video/quicktime",

        pdf:
          "application/pdf",

      };


      contentType =
        contentTypes[
          extension
        ]
        ||
        "application/octet-stream";
    }


    /* ========================================================
       DEBUG
    ======================================================== */

    console.log(
      "FOODKINDL MEDIA SUCCESS:",
      {
        key,

        contentType,

        metadata:
          result.metadata || null,

        size:
          result.data?.size,
      }
    );


    /* ========================================================
       MEDIA RESPONSE
    ======================================================== */

    const headers =
      new Headers();


    headers.set(
      "Content-Type",
      contentType
    );


    headers.set(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=604800"
    );


    headers.set(
      "X-Content-Type-Options",
      "nosniff"
    );


    headers.set(
      "Accept-Ranges",
      "bytes"
    );


    /*
     * Allow media to render inside
     * <img> and <video> elements.
     */

    headers.set(
      "Content-Disposition",
      "inline"
    );


    return new Response(
      result.data,
      {
        status:
          200,

        headers,
      }
    );


  } catch (error) {

    console.error(
      "NETLIFY BLOB READ ERROR:",
      {
        name:
          error?.name,

        message:
          error?.message,

        stack:
          error?.stack,
      }
    );


    return jsonResponse(
      {
        success: false,

        error:
          error?.message ||
          "Unable to load media.",
      },
      500
    );
  }
}