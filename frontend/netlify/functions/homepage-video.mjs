import {
  getStore,
} from "@netlify/blobs";


export default async function handler(
  request
) {

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

      return new Response(
        "Video key is required.",
        {
          status: 400,
        }
      );
    }


    // Security:
    // Only homepage video keys
    // are accessible here.

    if (
      !key.startsWith(
        "homepage/"
      )
    ) {

      return new Response(
        "Invalid video key.",
        {
          status: 403,
        }
      );
    }


    const store =
      getStore(
        "foodkindl-homepage-media"
      );


    const result =
      await store.getWithMetadata(
        key,
        {
          type: "blob",
        }
      );


    if (!result) {

      return new Response(
        "Video not found.",
        {
          status: 404,
        }
      );
    }


    const contentType =
      result.metadata
        ?.contentType ||
      "video/mp4";


    return new Response(
      result.data,
      {
        status: 200,

        headers: {

          "Content-Type":
            contentType,

          "Cache-Control":
            "public, max-age=3600",

        },
      }
    );

  } catch (error) {

    console.error(
      "Homepage video error:",
      error
    );


    return new Response(
      "Unable to load video.",
      {
        status: 500,
      }
    );
  }
}


export const config = {

  path:
    "/homepage-video",

};