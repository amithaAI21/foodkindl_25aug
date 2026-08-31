import {
  getStore,
} from "@netlify/blobs";


const PUBLIC_STORE =
  "foodkindl-media";


const GOVERNMENT_ID_STORE =
  "foodkindl-government-ids";


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
   GET EXTENSION
============================================================ */

function getExtension(
  filename
) {

  if (!filename) {
    return "bin";
  }


  const parts =
    filename.split(".");


  if (
    parts.length < 2
  ) {
    return "bin";
  }


  return (
    parts
      .pop()
      ?.toLowerCase()
    ||
    "bin"
  );
}


/* ============================================================
   MAIN HANDLER
============================================================ */

export default async function handler(
  request
) {

  /* ==========================================================
     METHOD
  ========================================================== */

  if (
    request.method !==
    "POST"
  ) {

    return jsonResponse(
      {
        success:
          false,

        error:
          "Method not allowed.",
      },
      405
    );
  }


  try {

    /* ========================================================
       FORM DATA
    ======================================================== */

    const formData =
      await request.formData();


    const file =
      formData.get(
        "file"
      );


    const uploadType =
      String(
        formData.get(
          "upload_type"
        )
        ||
        "public"
      )
        .trim()
        .toLowerCase();


    /* ========================================================
       VALIDATE FILE
    ======================================================== */

    if (
      !file ||
      typeof file ===
        "string"
    ) {

      return jsonResponse(
        {
          success:
            false,

          error:
            "No file selected.",
        },
        400
      );
    }


    const extension =
      getExtension(
        file.name
      );


    console.log(
      "FOODKINDL MEDIA UPLOAD:",
      {
        name:
          file.name,

        type:
          file.type,

        size:
          file.size,

        sizeMB:
          (
            file.size /
            1024 /
            1024
          ).toFixed(2),

        extension,

        uploadType,
      }
    );


    const origin =
      new URL(
        request.url
      ).origin;


    /* ========================================================
       GOVERNMENT ID
    ======================================================== */

    if (
      uploadType ===
      "government_id"
    ) {

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];


      const allowedExtensions = [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "pdf",
      ];


      const validType =
        allowedTypes.includes(
          file.type
        );


      const validExtension =
        allowedExtensions.includes(
          extension
        );


      if (
        !validType &&
        !validExtension
      ) {

        return jsonResponse(
          {
            success:
              false,

            error:
              "Government ID must be JPG, JPEG, PNG, WebP or PDF.",
          },
          400
        );
      }


      /*
       * Keep this small because the whole
       * file passes through a Netlify Function.
       */

      const maxSize =
        4 * 1024 * 1024;


      if (
        file.size >
        maxSize
      ) {

        return jsonResponse(
          {
            success:
              false,

            error:
              "Government ID must be smaller than 4 MB.",
          },
          400
        );
      }


      const contentType =
        file.type
        ||
        (
          extension ===
          "pdf"
            ? "application/pdf"
            : "application/octet-stream"
        );


      const key =
        (
          "government-ids/"
          +
          crypto.randomUUID()
          +
          "."
          +
          extension
        );


      const store =
        getStore(
          GOVERNMENT_ID_STORE
        );


      await store.set(
        key,
        file,
        {
          metadata: {

            originalName:
              file.name,

            contentType,

            size:
              String(
                file.size
              ),

            uploadedAt:
              new Date()
                .toISOString(),

            category:
              "government_id",

            private:
              "true",
          },
        }
      );


      const url =
        (
          `${origin}`
          +
          `/.netlify/functions/government-id`
          +
          `?key=${encodeURIComponent(
            key
          )}`
        );


      return jsonResponse(
        {
          success:
            true,

          private:
            true,

          key,

          url,

          filename:
            file.name,

          contentType,

          size:
            file.size,

          category:
            "government_id",
        }
      );
    }


    /* ========================================================
       PUBLIC MEDIA
    ======================================================== */

    const allowedTypes = [

      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",

      "video/mp4",
      "video/webm",
      "video/quicktime",

      "application/pdf",

    ];


    const allowedExtensions = [

      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",

      "mp4",
      "webm",
      "mov",

      "pdf",

    ];


    const validMimeType =
      allowedTypes.includes(
        file.type
      );


    const validExtension =
      allowedExtensions.includes(
        extension
      );


    if (
      !validMimeType &&
      !validExtension
    ) {

      return jsonResponse(
        {
          success:
            false,

          error:
            "Unsupported file type. Use JPG, JPEG, PNG, WebP, GIF, MP4, WebM, MOV or PDF.",
        },
        400
      );
    }


    /* ========================================================
       DETECT FILE CATEGORY
    ======================================================== */

    const isPdf =
      (
        file.type ===
        "application/pdf"
        ||
        extension ===
        "pdf"
      );


    const isVideo =
      (
        file.type
          ?.startsWith(
            "video/"
          )
        ||
        [
          "mp4",
          "webm",
          "mov",
        ].includes(
          extension
        )
      );


    const isImage =
      (
        file.type
          ?.startsWith(
            "image/"
          )
        ||
        [
          "jpg",
          "jpeg",
          "png",
          "webp",
          "gif",
        ].includes(
          extension
        )
      );


    /* ========================================================
       SIZE LIMIT

       IMPORTANT:
       Netlify may reject large multipart requests
       BEFORE this function is executed.

       Keep uploads deliberately small.
    ======================================================== */

    let maxSize;


    if (
      isVideo
    ) {

      maxSize =
        4 * 1024 * 1024;

    } else {

      maxSize =
        4 * 1024 * 1024;
    }


    if (
      file.size >
      maxSize
    ) {

      return jsonResponse(
        {
          success:
            false,

          error:
            isVideo
              ? "Video must be smaller than 4 MB."
              : isPdf
                ? "PDF must be smaller than 4 MB."
                : "Image must be smaller than 4 MB.",
        },
        400
      );
    }


    /* ========================================================
       FOLDER
    ======================================================== */

    let folder =
      "files";


    if (
      isVideo
    ) {

      folder =
        "videos";

    } else if (
      isImage
    ) {

      folder =
        "images";

    } else if (
      isPdf
    ) {

      folder =
        "documents";
    }


    /* ========================================================
       BLOB KEY
    ======================================================== */

    const key =
      (
        `${folder}/`
        +
        crypto.randomUUID()
        +
        "."
        +
        extension
      );


    /* ========================================================
       CONTENT TYPE
    ======================================================== */

    const contentType =
      file.type
      ||
      (
        isPdf
          ? "application/pdf"
          : "application/octet-stream"
      );


    /* ========================================================
       STORE
    ======================================================== */

    const store =
      getStore(
        PUBLIC_STORE
      );


    await store.set(
      key,
      file,
      {
        metadata: {

          originalName:
            file.name,

          contentType,

          size:
            String(
              file.size
            ),

          uploadedAt:
            new Date()
              .toISOString(),

          category:
            isVideo
              ? "video"
              : isImage
                ? "image"
                : isPdf
                  ? "pdf"
                  : "file",
        },
      }
    );


    /* ========================================================
       PUBLIC MEDIA URL
    ======================================================== */

    const mediaUrl =
      (
        `${origin}`
        +
        `/.netlify/functions/media`
        +
        `?key=${encodeURIComponent(
          key
        )}`
      );


    /* ========================================================
       SUCCESS
    ======================================================== */

    console.log(
      "FOODKINDL MEDIA UPLOAD SUCCESS:",
      {
        key,

        mediaUrl,

        contentType,

        size:
          file.size,
      }
    );


    return jsonResponse(
      {
        success:
          true,

        private:
          false,

        key,

        url:
          mediaUrl,

        filename:
          file.name,

        contentType,

        size:
          file.size,

        category:
          isVideo
            ? "video"
            : isImage
              ? "image"
              : isPdf
                ? "pdf"
                : "file",
      },
      200
    );


  } catch (
    error
  ) {

    console.error(
      "NETLIFY BLOB UPLOAD ERROR:",
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
        success:
          false,

        error:
          error?.message
          ||
          "Unable to upload the selected file.",
      },
      500
    );
  }
}