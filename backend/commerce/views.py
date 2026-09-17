import base64
import json
import mimetypes
import os
import re
import shutil
import subprocess
import tempfile
import traceback
from pathlib import Path

import requests
from django.http import FileResponse
from huggingface_hub import InferenceClient

from rest_framework import (
    permissions,
    status,
)

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser


# ============================================================
# CONFIGURATION
# ============================================================

HF_TOKEN = os.environ.get(
    "HF_TOKEN",
    "",
).strip()


HF_MODEL = os.environ.get(
    "FOODKINDL_AI_MODEL",
    "openai/gpt-oss-20b",
).strip()


HF_API_URL = (
    "https://router.huggingface.co/v1/chat/completions"
)


HF_VISION_MODEL = os.environ.get(
    "FOODKINDL_VISION_MODEL",
    "Qwen/Qwen2.5-VL-7B-Instruct",
).strip()


# ============================================================
# NORMALIZE LIST
# ============================================================

def normalize_list(value):

    if not isinstance(
        value,
        list,
    ):
        return []

    return [
        str(item).strip()
        for item in value
        if str(item).strip()
    ]


# ============================================================
# CLEAN AI JSON
# ============================================================

def clean_json_response(text):

    text = str(
        text or ""
    ).strip()

    if not text:
        return ""

    # Remove opening Markdown fence
    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Remove closing Markdown fence
    text = re.sub(
        r"\s*```$",
        "",
        text,
    )

    text = text.strip()

    # Extract JSON object
    start = text.find("{")
    end = text.rfind("}")

    if (
        start != -1
        and end != -1
        and end > start
    ):
        text = text[
            start:end + 1
        ]

    return text.strip()


# ============================================================
# PROVIDER ERROR
# ============================================================

def get_provider_error(response):

    try:
        data = response.json()

    except ValueError:
        return (
            response.text
            or
            "Unknown Hugging Face error."
        )

    error_value = (
        data.get("error")
        or data.get("message")
        or data.get("detail")
    )

    if isinstance(
        error_value,
        dict,
    ):

        message = (
            error_value.get(
                "message"
            )
            or str(error_value)
        )

    else:

        message = str(
            error_value
            or response.text
            or "Unknown Hugging Face error."
        )

    failed_generation = (
        data.get(
            "failed_generation"
        )
    )

    if failed_generation:

        print(
            "\nFAILED GENERATION:"
        )

        print(
            failed_generation
        )

    return message


# ============================================================
# SYSTEM PROMPT
# ============================================================

def build_system_prompt():

    return """
You are FoodKindl AI, a practical home-cooking assistant.

Create accurate, realistic and practical home-cooking recipes.

Always create the exact dish requested by the user.

Do not replace the requested dish with another dish.

Return only one valid JSON object.

Do not use Markdown.

Do not add explanations before or after the JSON.

The JSON must contain exactly these keys:

description
prep_time
cook_time
servings
ingredients
steps
tips
food_safety

ingredients must be a JSON array of strings.

steps must be a JSON array of strings.

All other values must be strings.

Use double quotes for all JSON keys and string values.

Do not use trailing commas.

Make sure the JSON is complete before finishing.
""".strip()


# ============================================================
# USER PROMPT
# ============================================================

def build_user_prompt(
    dish_name,
):

    return f"""
Create a realistic home-cooking recipe for exactly:

{dish_name}

Return only this JSON structure:

{{
  "description": "Short description of the dish",
  "prep_time": "15 minutes",
  "cook_time": "30 minutes",
  "servings": "4",
  "ingredients": [
    "Ingredient with quantity"
  ],
  "steps": [
    "Cooking instruction"
  ],
  "tips": "One useful cooking tip",
  "food_safety": "One relevant food safety tip"
}}

Requirements:

- Keep the dish exactly "{dish_name}".
- Use ingredients appropriate for the requested cuisine or regional style.
- Include realistic quantities.
- Provide 6 to 15 ingredients.
- Provide 4 to 10 concise cooking steps.
- Keep the instructions practical for home cooking.
- Include one useful cooking tip.
- Include one relevant food-safety tip.
- Return valid JSON only.
""".strip()


# ============================================================
# CALL HUGGING FACE
# ============================================================

def generate_ai_text(
    dish_name,
):

    if not HF_TOKEN:

        raise RuntimeError(
            "HF_TOKEN is not configured."
        )

    headers = {
        "Authorization":
            f"Bearer {HF_TOKEN}",

        "Content-Type":
            "application/json",
    }

    payload = {
        "model":
            HF_MODEL,

        "messages": [
            {
                "role":
                    "system",

                "content":
                    build_system_prompt(),
            },
            {
                "role":
                    "user",

                "content":
                    build_user_prompt(
                        dish_name
                    ),
            },
        ],

        "temperature":
            0.2,

        "max_tokens":
            2000,

        "stream":
            False,
    }


    # ========================================================
    # SEND REQUEST
    # ========================================================

    try:

        response = requests.post(
            HF_API_URL,
            headers=headers,
            json=payload,
            timeout=120,
        )

    except requests.Timeout as error:

        raise RuntimeError(
            "FoodKindl AI request timed out."
        ) from error

    except requests.ConnectionError as error:

        raise RuntimeError(
            (
                "FoodKindl could not connect "
                "to Hugging Face."
            )
        ) from error

    except requests.RequestException as error:

        raise RuntimeError(
            (
                "FoodKindl AI request failed: "
                f"{str(error)}"
            )
        ) from error


    # ========================================================
    # STATUS DEBUG
    # ========================================================

    print(
        "\n======================================"
    )

    print(
        "HUGGING FACE RESPONSE"
    )

    print(
        "STATUS:",
        response.status_code,
    )

    print(
        "MODEL:",
        HF_MODEL,
    )

    print(
        "======================================"
    )


    # ========================================================
    # PROVIDER ERRORS
    # ========================================================

    if response.status_code >= 400:

        print(
            "\nHUGGING FACE ERROR BODY:"
        )

        print(
            response.text
        )

        provider_error = (
            get_provider_error(
                response
            )
        )

        if response.status_code == 400:

            raise RuntimeError(
                (
                    "Hugging Face rejected "
                    "the request: "
                    f"{provider_error}"
                )
            )

        if response.status_code == 401:

            raise RuntimeError(
                (
                    "Hugging Face authentication "
                    "failed. Check HF_TOKEN."
                )
            )

        if response.status_code == 403:

            raise RuntimeError(
                (
                    "HF_TOKEN does not have permission "
                    "to use Inference Providers."
                )
            )

        if response.status_code == 404:

            raise RuntimeError(
                (
                    f"The model '{HF_MODEL}' "
                    "is not available."
                )
            )

        if response.status_code == 429:

            raise RuntimeError(
                (
                    "Hugging Face rate limit reached. "
                    "Try again shortly."
                )
            )

        raise RuntimeError(
            (
                "Hugging Face error: "
                f"{provider_error}"
            )
        )


    # ========================================================
    # PARSE PROVIDER RESPONSE
    # ========================================================

    try:

        provider_data = (
            response.json()
        )

    except ValueError as error:

        print(
            "\nINVALID HUGGING FACE RESPONSE:"
        )

        print(
            response.text
        )

        raise RuntimeError(
            (
                "Hugging Face returned "
                "an invalid response."
            )
        ) from error


    # ========================================================
    # DEBUG FULL RESPONSE
    # ========================================================

    print(
        "\nFULL HF RESPONSE:"
    )

    print(
        provider_data
    )


    # ========================================================
    # GET MESSAGE
    # ========================================================

    try:

        message = (
            provider_data[
                "choices"
            ][0][
                "message"
            ]
        )

    except (
        KeyError,
        IndexError,
        TypeError,
    ) as error:

        print(
            "\nUNEXPECTED HF RESPONSE:"
        )

        print(
            provider_data
        )

        raise RuntimeError(
            (
                "Hugging Face returned "
                "an unexpected response."
            )
        ) from error


    # ========================================================
    # GET CONTENT
    #
    # GPT-OSS providers may return final output in different
    # message fields.
    # ========================================================

    content = (
        message.get("content")
        or message.get("reasoning_content")
        or message.get("reasoning")
        or ""
    )

    content = str(
        content
    ).strip()


    # ========================================================
    # EMPTY CONTENT
    # ========================================================

    if not content:

        print(
            "\nEMPTY HF MESSAGE:"
        )

        print(
            message
        )

        print(
            "\nFULL HF RESPONSE:"
        )

        print(
            provider_data
        )

        raise RuntimeError(
            (
                "Hugging Face returned empty content. "
                "Try again or use another model."
            )
        )


    # ========================================================
    # RAW OUTPUT
    # ========================================================

    print(
        "\nRAW AI RESPONSE:"
    )

    print(
        content
    )

    return content


# ============================================================
# PARSE RECIPE JSON
# ============================================================

def parse_recipe_json(
    content,
):

    cleaned = (
        clean_json_response(
            content
        )
    )

    print(
        "\nCLEANED AI RESPONSE:"
    )

    print(
        cleaned
    )

    if not cleaned:

        raise RuntimeError(
            "AI returned an empty recipe."
        )

    try:

        data = json.loads(
            cleaned
        )

    except json.JSONDecodeError as error:

        print(
            "\nINVALID RECIPE JSON:"
        )

        print(
            cleaned
        )

        print(
            "\nJSON ERROR:"
        )

        print(
            str(error)
        )

        raise RuntimeError(
            (
                "The AI returned an invalid "
                "recipe format. Please try again."
            )
        ) from error

    if not isinstance(
        data,
        dict,
    ):

        raise RuntimeError(
            (
                "The AI returned an invalid "
                "recipe object."
            )
        )

    return data


# ============================================================
# GENERATE RECIPE
# ============================================================

def generate_recipe(
    dish_name,
):

    clean_dish = str(
        dish_name
    ).strip()

    if not clean_dish:

        raise RuntimeError(
            "Dish name is required."
        )

    raw_response = (
        generate_ai_text(
            clean_dish
        )
    )

    data = (
        parse_recipe_json(
            raw_response
        )
    )


    # ========================================================
    # INGREDIENTS
    # ========================================================

    ingredients = normalize_list(
        data.get(
            "ingredients",
            [],
        )
    )


    # ========================================================
    # STEPS
    # ========================================================

    steps = normalize_list(
        data.get(
            "steps",
            [],
        )
    )


    # ========================================================
    # VALIDATE
    # ========================================================

    if not ingredients:

        raise RuntimeError(
            (
                "AI did not generate "
                "ingredients."
            )
        )

    if not steps:

        raise RuntimeError(
            (
                "AI did not generate "
                "cooking steps."
            )
        )


    # ========================================================
    # LIMITS
    # ========================================================

    ingredients = (
        ingredients[:20]
    )

    steps = (
        steps[:12]
    )


    # ========================================================
    # TITLE
    # ========================================================

    title = (
        clean_dish.title()
    )


    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {
        "title":
            title,

        "description":
            str(
                data.get(
                    "description",
                    (
                        f"A FoodKindl recipe "
                        f"for {title}."
                    ),
                )
            ).strip(),

        "prep_time":
            str(
                data.get(
                    "prep_time",
                    "",
                )
            ).strip(),

        "cook_time":
            str(
                data.get(
                    "cook_time",
                    "",
                )
            ).strip(),

        "servings":
            str(
                data.get(
                    "servings",
                    "",
                )
            ).strip(),

        "ingredients":
            ingredients,

        "steps":
            steps,

        "tips":
            str(
                data.get(
                    "tips",
                    "",
                )
            ).strip(),

        "food_safety":
            str(
                data.get(
                    "food_safety",
                    "",
                )
            ).strip(),
    }


# ============================================================
# API VIEW
# ============================================================

class AIRecipeGenerateView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def post(
        self,
        request,
    ):

        query = str(
            request.data.get(
                "query",
                "",
            )
        ).strip()


        # ====================================================
        # VALIDATE
        # ====================================================

        if not query:

            return Response(
                {
                    "detail":
                        (
                            "Please enter "
                            "a dish name."
                        )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )


        if len(query) > 100:

            return Response(
                {
                    "detail":
                        (
                            "Dish name must be "
                            "100 characters or fewer."
                        )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )


        # ====================================================
        # GENERATE
        # ====================================================

        try:

            print(
                "\n======================================"
            )

            print(
                "FOODKINDL AI REQUEST"
            )

            print(
                "Dish:",
                query,
            )

            print(
                "Model:",
                HF_MODEL,
            )

            print(
                "HF token configured:",
                bool(HF_TOKEN),
            )

            print(
                "======================================"
            )


            recipe = generate_recipe(
                query
            )


            print(
                "\nRECIPE GENERATED SUCCESSFULLY:"
            )

            print(
                recipe["title"]
            )


            return Response(
                {
                    "query":
                        query,

                    "recipe":
                        recipe,
                },
                status=(
                    status.HTTP_200_OK
                ),
            )


        # ====================================================
        # ERROR
        # ====================================================

        except Exception as error:

            traceback.print_exc()

            print(
                "\nRECIPE GENERATION ERROR:"
            )

            print(
                repr(error)
            )

            return Response(
                {
                    "detail":
                        str(error),

                    "error_type":
                        type(
                            error
                        ).__name__,
                },
                status=(
                    status
                    .HTTP_500_INTERNAL_SERVER_ERROR
                ),
            )

# ============================================================
# GENERIC CHAT COMPLETION
# ============================================================

def call_hf_chat(
    messages,
    model=None,
    max_tokens=5000,
    temperature=0.25,
):

    if not HF_TOKEN:
        raise RuntimeError(
            "HF_TOKEN is not configured."
        )

    response = requests.post(
        HF_API_URL,
        headers={
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/json",
        },
        json={
            "model": model or HF_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        },
        timeout=180,
    )

    if response.status_code >= 400:
        raise RuntimeError(
            get_provider_error(response)
        )

    try:
        message = response.json()[
            "choices"
        ][0]["message"]
    except (
        ValueError,
        KeyError,
        IndexError,
        TypeError,
    ) as error:
        raise RuntimeError(
            "The AI provider returned an unexpected response."
        ) from error

    content = (
        message.get("content")
        or message.get("reasoning_content")
        or message.get("reasoning")
        or ""
    )

    if not str(content).strip():
        raise RuntimeError(
            "The AI provider returned empty content."
        )

    return str(content).strip()


# ============================================================
# INGREDIENT-BASED RECIPE SUGGESTIONS
# ============================================================

def build_ingredient_recipe_prompt(
    ingredients,
):

    ingredient_text = ", ".join(
        ingredients
    )

    return f"""
The user currently has these ingredients:

{ingredient_text}

Suggest exactly three practical home-cooking recipes:

1. Best Match — uses the highest number of available ingredients.
2. Quick & Easy — has the shortest realistic total cooking time.
3. Healthier Choice — uses a balanced, nutritious preparation method.

Return one valid JSON object only, without Markdown:

{{
  "recipes": [
    {{
      "suggestion_type": "best_match",
      "suggestion_label": "BEST MATCH",
      "title": "Dish name",
      "description": "Short description",
      "reason": "Why this recipe suits the available ingredients",
      "match_percentage": 90,
      "prep_time": "10 minutes",
      "cook_time": "20 minutes",
      "total_time": "30 minutes",
      "servings": "2",
      "ingredients_used": ["Ingredient already available"],
      "missing_ingredients": ["Required missing ingredient"],
      "optional_ingredients": ["Optional ingredient"],
      "unused_ingredients": ["Available ingredient not used"],
      "steps": ["Clear cooking instruction"],
      "tips": ["Useful cooking tip"],
      "serving_suggestion": "Short serving suggestion",
      "food_safety": "Relevant safety advice"
    }}
  ]
}}

Requirements:

- Return exactly three complete recipe objects.
- Use only realistic dishes and cooking methods.
- Never list an available ingredient as missing.
- missing_ingredients must contain only required items.
- optional_ingredients must never be treated as required purchases.
- Give 4 to 10 concise steps for every recipe.
- Keep match_percentage between 0 and 100.
- Use valid JSON with double quotes and no trailing commas.
""".strip()


def normalize_recipe_suggestion(
    recipe,
    available_ingredients,
):

    if not isinstance(recipe, dict):
        return None

    title = str(
        recipe.get("title") or ""
    ).strip()

    steps = normalize_list(
        recipe.get("steps")
    )[:12]

    if not title or not steps:
        return None

    available_lookup = {
        item.casefold()
        for item in available_ingredients
    }

    ingredients_used = normalize_list(
        recipe.get("ingredients_used")
    )

    missing_ingredients = [
        item
        for item in normalize_list(
            recipe.get("missing_ingredients")
        )
        if item.casefold() not in available_lookup
    ]

    try:
        match_percentage = int(
            recipe.get("match_percentage", 0)
        )
    except (TypeError, ValueError):
        match_percentage = 0

    return {
        "suggestion_type": str(
            recipe.get("suggestion_type") or "meal_idea"
        ).strip(),
        "suggestion_label": str(
            recipe.get("suggestion_label") or "MEAL IDEA"
        ).strip(),
        "title": title,
        "description": str(
            recipe.get("description") or ""
        ).strip(),
        "reason": str(
            recipe.get("reason") or ""
        ).strip(),
        "match_percentage": max(
            0,
            min(100, match_percentage),
        ),
        "prep_time": str(
            recipe.get("prep_time") or ""
        ).strip(),
        "cook_time": str(
            recipe.get("cook_time") or ""
        ).strip(),
        "total_time": str(
            recipe.get("total_time") or ""
        ).strip(),
        "servings": str(
            recipe.get("servings") or ""
        ).strip(),
        "ingredients_used": ingredients_used,
        "missing_ingredients": missing_ingredients,
        "shopping_list": missing_ingredients,
        "optional_ingredients": normalize_list(
            recipe.get("optional_ingredients")
        ),
        "unused_ingredients": normalize_list(
            recipe.get("unused_ingredients")
        ),
        "steps": steps,
        "tips": normalize_list(
            recipe.get("tips")
        ),
        "serving_suggestion": str(
            recipe.get("serving_suggestion") or ""
        ).strip(),
        "food_safety": str(
            recipe.get("food_safety") or ""
        ).strip(),
    }


class AIIngredientRecipeBookView(APIView):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def post(self, request):

        ingredients = normalize_list(
            request.data.get("ingredients")
        )

        ingredients = list(
            dict.fromkeys(ingredients)
        )[:30]

        if not ingredients:
            return Response(
                {
                    "detail": "Please add at least one ingredient."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            content = call_hf_chat(
                [
                    {
                        "role": "system",
                        "content": (
                            "You are FoodKindl AI, a practical home-cooking "
                            "assistant. Return valid JSON only."
                        ),
                    },
                    {
                        "role": "user",
                        "content": build_ingredient_recipe_prompt(
                            ingredients
                        ),
                    },
                ],
                max_tokens=6500,
                temperature=0.35,
            )

            parsed = parse_recipe_json(
                content
            )

            raw_recipes = parsed.get(
                "recipes",
                [],
            )

            recipes = [
                normalized
                for normalized in (
                    normalize_recipe_suggestion(
                        recipe,
                        ingredients,
                    )
                    for recipe in raw_recipes
                )
                if normalized
            ][:3]

            if not recipes:
                raise RuntimeError(
                    "FoodKindl AI did not return usable meal suggestions."
                )

            return Response(
                {
                    "ingredients": ingredients,
                    "recipes": recipes,
                    # Backward compatibility for older frontends.
                    "recipe": recipes[0],
                    "selected_dish": recipes[0]["title"],
                },
                status=status.HTTP_200_OK,
            )

        except Exception as error:
            traceback.print_exc()
            return Response(
                {
                    "detail": str(error),
                    "error_type": type(error).__name__,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ============================================================
# PHOTO / VIDEO INGREDIENT IDENTIFICATION
# ============================================================

def media_file_to_data_url(
    uploaded_file,
):

    content_type = (
        uploaded_file.content_type
        or mimetypes.guess_type(
            uploaded_file.name
        )[0]
        or "application/octet-stream"
    )

    encoded = base64.b64encode(
        uploaded_file.read()
    ).decode("ascii")

    uploaded_file.seek(0)

    return (
        f"data:{content_type};base64,{encoded}"
    )


def extract_video_frame_data_urls(
    uploaded_file,
):

    ffmpeg_path = shutil.which("ffmpeg")

    if not ffmpeg_path:
        raise RuntimeError(
            "Video scanning requires ffmpeg on the server."
        )

    suffix = Path(
        uploaded_file.name
    ).suffix or ".mp4"

    with tempfile.TemporaryDirectory(
        prefix="foodkindl_scan_"
    ) as temporary_directory:

        input_path = Path(
            temporary_directory
        ) / f"input{suffix}"

        input_path.write_bytes(
            uploaded_file.read()
        )

        output_pattern = str(
            Path(temporary_directory) / "frame_%02d.jpg"
        )

        subprocess.run(
            [
                ffmpeg_path,
                "-y",
                "-i",
                str(input_path),
                "-vf",
                "fps=1/3,scale='min(1280,iw)':-2",
                "-frames:v",
                "4",
                output_pattern,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=60,
        )

        data_urls = []

        for frame_path in sorted(
            Path(temporary_directory).glob("frame_*.jpg")
        ):
            encoded = base64.b64encode(
                frame_path.read_bytes()
            ).decode("ascii")
            data_urls.append(
                f"data:image/jpeg;base64,{encoded}"
            )

        return data_urls


class AIIdentifyIngredientsView(APIView):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def post(self, request):

        uploaded_files = request.FILES.getlist(
            "media"
        )[:5]

        if not uploaded_files:
            return Response(
                {
                    "detail": "Please upload at least one photo or video."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        image_data_urls = []

        try:
            for uploaded_file in uploaded_files:

                if uploaded_file.size > 20 * 1024 * 1024:
                    return Response(
                        {
                            "detail": (
                                f"{uploaded_file.name} is larger than 20 MB."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                content_type = (
                    uploaded_file.content_type or ""
                )

                if content_type.startswith("image/"):
                    image_data_urls.append(
                        media_file_to_data_url(
                            uploaded_file
                        )
                    )
                elif content_type.startswith("video/"):
                    image_data_urls.extend(
                        extract_video_frame_data_urls(
                            uploaded_file
                        )
                    )
                else:
                    return Response(
                        {
                            "detail": (
                                f"Unsupported file type: {uploaded_file.name}"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if not image_data_urls:
                raise RuntimeError(
                    "No usable image frames were found."
                )

            content = [
                {
                    "type": "text",
                    "text": (
                        "Identify only visible food ingredients in these "
                        "kitchen images. Do not guess hidden items. Return "
                        "one JSON object only in this exact form: "
                        '{"ingredients":["ingredient name"]}'
                    ),
                }
            ]

            content.extend(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": data_url
                    },
                }
                for data_url in image_data_urls[:8]
            )

            ai_content = call_hf_chat(
                [
                    {
                        "role": "user",
                        "content": content,
                    }
                ],
                model=HF_VISION_MODEL,
                max_tokens=900,
                temperature=0.1,
            )

            parsed = parse_recipe_json(
                ai_content
            )

            ingredients = list(
                dict.fromkeys(
                    normalize_list(
                        parsed.get("ingredients")
                    )
                )
            )[:40]

            return Response(
                {
                    "ingredients": ingredients,
                    "media_count": len(uploaded_files),
                    "frame_count": len(image_data_urls),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as error:
            traceback.print_exc()
            return Response(
                {
                    "detail": str(error),
                    "error_type": type(error).__name__,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ============================================================
# FOODKINDL AI — 30 SECOND COOKING VIDEO
#
# IMPORTANT:
# Hugging Face text-to-video exposes num_frames, but the public
# task API does not expose a universal "duration=30" setting.
# To create a reliable ~30 second cooking video, FoodKindl
# generates SIX short AI clips (one cooking scene each), trims
# each scene to 5 seconds, and joins them with ffmpeg.
#
# Final target:
#   6 scenes x 5 seconds = ~30 seconds
#
# This endpoint returns the final MP4 directly.
# ============================================================


HF_VIDEO_MODEL = os.environ.get(
    "FOODKINDL_VIDEO_MODEL",
    "Wan-AI/Wan2.2-TI2V-5B",
).strip()


HF_VIDEO_PROVIDER = os.environ.get(
    "FOODKINDL_VIDEO_PROVIDER",
    "fal-ai",
).strip()


VIDEO_SCENE_SECONDS = 5

VIDEO_SCENE_COUNT = 6

VIDEO_TOTAL_SECONDS = (
    VIDEO_SCENE_SECONDS
    * VIDEO_SCENE_COUNT
)


def _video_safe_text(
    value,
    max_length=700,
):
    """
    Keep recipe values safe and reasonably short for prompts.
    """

    value = str(
        value or ""
    ).strip()

    return value[:max_length]


def _video_normalize_list(
    value,
    limit=20,
):
    """
    Normalise frontend recipe arrays.
    """

    if not isinstance(
        value,
        list,
    ):
        return []

    cleaned = []

    for item in value[:limit]:

        text = _video_safe_text(
            item,
            300,
        )

        if text:
            cleaned.append(
                text
            )

    return cleaned


def _build_video_scene_prompts(
    recipe,
):
    """
    Build six visual scenes from the already-generated recipe.

    The video model should VISUALISE the recipe.
    It must not invent a different dish.
    """

    title = _video_safe_text(
        recipe.get(
            "title"
        ),
        120,
    )

    if not title:
        raise RuntimeError(
            "Recipe title is required for video generation."
        )


    ingredients = (
        _video_normalize_list(
            recipe.get(
                "ingredients_used"
            )
            or recipe.get(
                "ingredients"
            )
            or [],
            limit=15,
        )
    )


    optional_ingredients = (
        _video_normalize_list(
            recipe.get(
                "optional_ingredients"
            )
            or [],
            limit=10,
        )
    )


    steps = (
        _video_normalize_list(
            recipe.get(
                "steps"
            )
            or [],
            limit=12,
        )
    )


    ingredient_text = (
        ", ".join(
            ingredients
        )
        or title
    )


    optional_text = (
        ", ".join(
            optional_ingredients
        )
    )


    # Divide the actual cooking instructions across the
    # preparation / cooking / finishing scenes.
    step_1 = (
        steps[0]
        if len(steps) > 0
        else (
            f"Prepare the ingredients for {title}."
        )
    )

    step_2 = (
        steps[1]
        if len(steps) > 1
        else (
            f"Begin cooking {title} in a pan."
        )
    )

    middle_steps = (
        " ".join(
            steps[2:5]
        )
        if len(steps) > 2
        else (
            f"Cook the ingredients together for {title}."
        )
    )

    finishing_steps = (
        " ".join(
            steps[5:]
        )
        if len(steps) > 5
        else (
            f"Finish cooking {title} until ready."
        )
    )


    common_style = (
        "Professional realistic food cinematography, "
        "warm home kitchen, natural ingredients, "
        "close-up cooking shots, appetising texture, "
        "realistic hands only when needed, smooth camera motion, "
        "no text, no subtitles, no logos, no watermark, "
        "no deformed utensils, no extra fingers, "
        "consistent dish and kitchen across scenes. "
    )


    prompts = [

        (
            common_style
            +
            f"Scene 1 of a cooking video for {title}. "
            f"Beautiful overhead presentation of the ingredients: "
            f"{ingredient_text}. "
            f"{('Optional pantry items: ' + optional_text + '. ') if optional_text else ''}"
            "Ingredients neatly arranged on a dark kitchen counter, "
            "cinematic establishing shot."
        ),

        (
            common_style
            +
            f"Scene 2 for {title}. "
            f"Food preparation step: {step_1} "
            "Close-up of fresh ingredients being prepared correctly, "
            "natural kitchen movement, realistic food textures."
        ),

        (
            common_style
            +
            f"Scene 3 for {title}. "
            f"Early cooking step: {step_2} "
            "Close-up pan shot, ingredients sizzling, steam visible, "
            "realistic cooking action."
        ),

        (
            common_style
            +
            f"Scene 4 for {title}. "
            f"Main cooking process: {middle_steps} "
            "Ingredients combining naturally in the pan, "
            "rich colour and texture developing, cinematic close-up."
        ),

        (
            common_style
            +
            f"Scene 5 for {title}. "
            f"Finishing process: {finishing_steps} "
            "Dish simmering and finishing, realistic steam, "
            "gentle stirring, appetising consistency."
        ),

        (
            common_style
            +
            f"Scene 6 final reveal of {title}. "
            "The completed dish plated beautifully and realistically, "
            "warm restaurant-quality food photography, slow cinematic "
            "push-in, garnish appropriate to the dish, no text."
        ),

    ]


    return prompts


def _require_ffmpeg():
    """
    A 30 second compiled video requires ffmpeg for trimming and
    concatenating the AI-generated scene clips.
    """

    ffmpeg_path = shutil.which(
        "ffmpeg"
    )

    if not ffmpeg_path:

        raise RuntimeError(
            (
                "ffmpeg is not installed on the backend. "
                "Install ffmpeg before using 30-second video generation."
            )
        )

    return ffmpeg_path


def _generate_video_clip(
    prompt,
    output_path,
    seed,
):
    """
    Generate one AI video scene using Hugging Face
    Inference Providers.

    Hugging Face returns video bytes for text_to_video.
    """

    if not HF_TOKEN:

        raise RuntimeError(
            "HF_TOKEN is not configured."
        )


    client = InferenceClient(
        provider=HF_VIDEO_PROVIDER,
        api_key=HF_TOKEN,
    )


    try:

        video_bytes = (
            client.text_to_video(
                prompt,
                model=HF_VIDEO_MODEL,

                # A moderate frame count keeps each generated clip
                # short enough to render and later trim to 5 sec.
                # Provider/model support can vary.
                num_frames=121,

                guidance_scale=5.0,

                num_inference_steps=30,

                seed=seed,
            )
        )


    except Exception as error:

        raise RuntimeError(
            (
                "AI video scene generation failed: "
                f"{str(error)}"
            )
        ) from error


    if not video_bytes:

        raise RuntimeError(
            "AI video provider returned an empty clip."
        )


    Path(
        output_path
    ).write_bytes(
        video_bytes
    )


def _trim_scene_to_five_seconds(
    ffmpeg_path,
    source_path,
    output_path,
):
    """
    Convert each generated video into a standard MP4 scene
    exactly five seconds long.

    tpad clones the final frame when the generated source is
    shorter than five seconds. The final trim keeps each scene
    at five seconds.
    """

    command = [
        ffmpeg_path,
        "-y",

        "-i",
        str(source_path),

        "-vf",
        (
            "scale=720:1280:"
            "force_original_aspect_ratio=decrease,"
            "pad=720:1280:(ow-iw)/2:(oh-ih)/2,"
            "fps=24,"
            f"tpad=stop_mode=clone:stop_duration={VIDEO_SCENE_SECONDS}"
        ),

        "-t",
        str(
            VIDEO_SCENE_SECONDS
        ),

        "-an",

        "-c:v",
        "libx264",

        "-preset",
        "veryfast",

        "-crf",
        "23",

        "-pix_fmt",
        "yuv420p",

        "-movflags",
        "+faststart",

        str(output_path),
    ]


    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


    if result.returncode != 0:

        print(
            "\nFFMPEG TRIM ERROR:"
        )

        print(
            result.stderr
        )

        raise RuntimeError(
            "FoodKindl could not prepare an AI video scene."
        )


def _concat_video_scenes(
    ffmpeg_path,
    scene_paths,
    output_path,
):
    """
    Join the six 5-second scenes into one ~30 second MP4.
    """

    concat_file = (
        Path(output_path)
        .with_suffix(
            ".txt"
        )
    )


    concat_lines = []

    for scene_path in scene_paths:

        escaped = (
            str(
                Path(
                    scene_path
                ).resolve()
            )
            .replace(
                "'",
                "'\\''",
            )
        )

        concat_lines.append(
            f"file '{escaped}'"
        )


    concat_file.write_text(
        "\n".join(
            concat_lines
        ),
        encoding="utf-8",
    )


    command = [
        ffmpeg_path,
        "-y",

        "-f",
        "concat",

        "-safe",
        "0",

        "-i",
        str(concat_file),

        "-c",
        "copy",

        "-movflags",
        "+faststart",

        str(output_path),
    ]


    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


    if result.returncode != 0:

        print(
            "\nFFMPEG CONCAT ERROR:"
        )

        print(
            result.stderr
        )

        raise RuntimeError(
            "FoodKindl could not combine the AI video scenes."
        )


def generate_30_second_recipe_video(
    recipe,
):
    """
    Create the final ~30-second vertical cooking video.

    Returns:
        (temporary_directory, final_video_path)

    The caller must keep the TemporaryDirectory alive until
    Django finishes streaming the FileResponse.
    """

    ffmpeg_path = (
        _require_ffmpeg()
    )


    prompts = (
        _build_video_scene_prompts(
            recipe
        )
    )


    temp_directory = (
        tempfile.TemporaryDirectory(
            prefix="foodkindl_recipe_video_"
        )
    )


    temp_path = Path(
        temp_directory.name
    )


    processed_scene_paths = []


    try:

        for index, prompt in enumerate(
            prompts,
            start=1,
        ):

            print(
                (
                    f"\nGenerating FoodKindl video "
                    f"scene {index}/{VIDEO_SCENE_COUNT}"
                )
            )


            raw_scene_path = (
                temp_path
                /
                f"scene_{index}_raw.mp4"
            )


            processed_scene_path = (
                temp_path
                /
                f"scene_{index}.mp4"
            )


            _generate_video_clip(
                prompt=prompt,
                output_path=raw_scene_path,
                seed=(
                    4200
                    +
                    index
                ),
            )


            _trim_scene_to_five_seconds(
                ffmpeg_path=ffmpeg_path,
                source_path=raw_scene_path,
                output_path=processed_scene_path,
            )


            processed_scene_paths.append(
                processed_scene_path
            )


        final_path = (
            temp_path
            /
            "foodkindl_recipe_video.mp4"
        )


        _concat_video_scenes(
            ffmpeg_path=ffmpeg_path,
            scene_paths=processed_scene_paths,
            output_path=final_path,
        )


        if (
            not final_path.exists()
            or final_path.stat().st_size == 0
        ):

            raise RuntimeError(
                "The final AI cooking video is empty."
            )


        return (
            temp_directory,
            final_path,
        )


    except Exception:

        temp_directory.cleanup()

        raise


class AIRecipeVideoGenerateView(
    APIView
):
    """
    POST /ai/recipe-video/

    The frontend sends the recipe that FoodKindl AI has already
    generated. This endpoint turns that recipe into six visual
    cooking scenes and combines them into one ~30-second MP4.
    """

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def post(
        self,
        request,
    ):

        recipe = (
            request.data.get(
                "recipe"
            )
        )


        if not isinstance(
            recipe,
            dict,
        ):

            return Response(
                {
                    "detail":
                        (
                            "A generated recipe object "
                            "is required."
                        )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )


        title = _video_safe_text(
            recipe.get(
                "title"
            ),
            120,
        )


        if not title:

            return Response(
                {
                    "detail":
                        "Recipe title is required."
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )


        try:

            print(
                "\n======================================"
            )

            print(
                "FOODKINDL 30 SECOND VIDEO REQUEST"
            )

            print(
                "Recipe:",
                title,
            )

            print(
                "Video model:",
                HF_VIDEO_MODEL,
            )

            print(
                "Provider:",
                HF_VIDEO_PROVIDER,
            )

            print(
                "======================================"
            )


            (
                temp_directory,
                final_path,
            ) = (
                generate_30_second_recipe_video(
                    recipe
                )
            )


            file_handle = open(
                final_path,
                "rb",
            )


            response = FileResponse(
                file_handle,
                content_type="video/mp4",
                as_attachment=False,
                filename=(
                    "foodkindl-ai-cooking-video.mp4"
                ),
            )


            response[
                "Content-Length"
            ] = (
                final_path.stat().st_size
            )


            response[
                "X-FoodKindl-Video-Duration"
            ] = str(
                VIDEO_TOTAL_SECONDS
            )


            # Keep the temp directory referenced for as long as
            # the streaming response exists.
            response._foodkindl_temp_directory = (
                temp_directory
            )


            original_close = (
                response.close
            )


            def close_with_cleanup():

                try:
                    original_close()

                finally:
                    temp_directory.cleanup()


            response.close = (
                close_with_cleanup
            )


            return response


        except Exception as error:

            traceback.print_exc()

            print(
                "\nVIDEO GENERATION ERROR:"
            )

            print(
                repr(error)
            )


            return Response(
                {
                    "detail":
                        str(error),

                    "error_type":
                        type(
                            error
                        ).__name__,
                },
                status=(
                    status
                    .HTTP_500_INTERNAL_SERVER_ERROR
                ),
            )
