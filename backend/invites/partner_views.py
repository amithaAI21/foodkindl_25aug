from decimal import (
    Decimal,
    InvalidOperation,
)

from django.shortcuts import (
    get_object_or_404,
)

from rest_framework import (
    permissions,
    status,
)

from rest_framework.parsers import (
    FormParser,
    JSONParser,
    MultiPartParser,
)

from rest_framework.response import (
    Response,
)

from rest_framework.views import (
    APIView,
)

from accounts.models import (
    Profile,
)

from .models import (
    Restaurant,
    RestaurantImage,
    RestaurantMenuItem,
)

from .netlify_blob import (
    upload_image_to_netlify,
)

from .partner_serializers import (
    PartnerMenuItemSerializer,
    PartnerRestaurantImageSerializer,
    PartnerRestaurantSerializer,
)


# ============================================================
# IMAGE SETTINGS
# ============================================================

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}


MAX_IMAGE_SIZE = (
    8 * 1024 * 1024
)


# ============================================================
# PARTNER CHECK
# ============================================================

def get_partner_profile(
    user,
):

    profile, _ = (
        Profile.objects
        .get_or_create(
            user=user
        )
    )


    return profile


def ensure_partner(
    user,
):

    if (
        not user
        or
        not user.is_authenticated
    ):

        return False


    profile = (
        get_partner_profile(
            user
        )
    )


    return (
        profile.account_type
        ==
        "partner"
    )


def partner_required_response():

    return Response(
        {
            "detail":
                "Partner account required."
        },
        status=
            status.HTTP_403_FORBIDDEN,
    )


# ============================================================
# GET OWNED RESTAURANT
# ============================================================

def get_owned_restaurant(
    user,
    restaurant_id,
):

    return get_object_or_404(

        Restaurant.objects
        .prefetch_related(
            "images",
            "menu_items",
        ),

        id=
            restaurant_id,

        owner=
            user,
    )


# ============================================================
# IMAGE VALIDATION
# ============================================================

def validate_uploaded_image(
    uploaded_file,
):

    if not uploaded_file:

        return (
            False,
            "Please select an image."
        )


    content_type = (
        getattr(
            uploaded_file,
            "content_type",
            "",
        )
        or
        ""
    ).lower()


    if (
        content_type
        not in
        ALLOWED_IMAGE_TYPES
    ):

        return (
            False,
            (
                "Only JPG, PNG and WebP "
                "images are allowed."
            )
        )


    if (
        uploaded_file.size
        >
        MAX_IMAGE_SIZE
    ):

        return (
            False,
            "Image must be smaller than 8 MB."
        )


    return (
        True,
        ""
    )


# ============================================================
# UPLOAD TO NETLIFY
# ============================================================

def upload_to_netlify(
    uploaded_file,
    category,
):

    result = (
        upload_image_to_netlify(

            uploaded_file=
                uploaded_file,

            category=
                category,
        )
    )


    if not isinstance(
        result,
        dict,
    ):

        raise ValueError(
            "Invalid response from image storage."
        )


    image_url = (
        result.get(
            "url",
            "",
        )
        or
        ""
    )


    if not image_url:

        raise ValueError(
            (
                "Image storage did not "
                "return an image URL."
            )
        )


    return {
        "key":
            (
                result.get(
                    "key",
                    "",
                )
                or
                ""
            ),

        "url":
            image_url,
    }


# ============================================================
# PARTNER RESTAURANT LIST + CREATE
# ============================================================

class PartnerRestaurantListCreateView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    parser_classes = [
        JSONParser,
        MultiPartParser,
        FormParser,
    ]


    # --------------------------------------------------------
    # GET
    # --------------------------------------------------------

    def get(
        self,
        request,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        restaurants = (

            Restaurant.objects

            .filter(
                owner=
                    request.user
            )

            .prefetch_related(
                "images",
                "menu_items",
            )

            .order_by(
                "-created_at"
            )
        )


        serializer = (
            PartnerRestaurantSerializer(
                restaurants,
                many=True,
                context={
                    "request":
                        request,
                },
            )
        )


        return Response(
            serializer.data,
            status=
                status.HTTP_200_OK,
        )


    # --------------------------------------------------------
    # CREATE
    # --------------------------------------------------------

    def post(
        self,
        request,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        serializer = (
            PartnerRestaurantSerializer(
                data=
                    request.data,

                context={
                    "request":
                        request,
                },
            )
        )


        serializer.is_valid(
            raise_exception=True
        )


        restaurant = (
            serializer.save(

                owner=
                    request.user,

                is_active=
                    True,
            )
        )


        output = (
            PartnerRestaurantSerializer(
                restaurant,
                context={
                    "request":
                        request,
                },
            )
        )


        return Response(
            output.data,
            status=
                status.HTTP_201_CREATED,
        )


# ============================================================
# RESTAURANT DETAIL
# ============================================================

class PartnerRestaurantDetailView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    parser_classes = [
        JSONParser,
        MultiPartParser,
        FormParser,
    ]


    def get(
        self,
        request,
        restaurant_id,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        restaurant = (
            get_owned_restaurant(
                request.user,
                restaurant_id,
            )
        )


        serializer = (
            PartnerRestaurantSerializer(
                restaurant,
                context={
                    "request":
                        request,
                },
            )
        )


        return Response(
            serializer.data
        )


    # --------------------------------------------------------
    # UPDATE
    # --------------------------------------------------------

    def patch(
        self,
        request,
        restaurant_id,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        restaurant = (
            get_owned_restaurant(
                request.user,
                restaurant_id,
            )
        )


        serializer = (
            PartnerRestaurantSerializer(

                restaurant,

                data=
                    request.data,

                partial=True,

                context={
                    "request":
                        request,
                },
            )
        )


        serializer.is_valid(
            raise_exception=True
        )


        restaurant = (
            serializer.save()
        )


        output = (
            PartnerRestaurantSerializer(
                restaurant,
                context={
                    "request":
                        request,
                },
            )
        )


        return Response(
            output.data
        )


# ============================================================
# MAIN RESTAURANT PHOTO
# ============================================================

class PartnerRestaurantMainPhotoView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    parser_classes = [
        MultiPartParser,
        FormParser,
    ]


    def post(
        self,
        request,
        restaurant_id,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        restaurant = (
            get_owned_restaurant(
                request.user,
                restaurant_id,
            )
        )


        uploaded_file = (
            request.FILES.get(
                "image"
            )
        )


        valid, error_message = (
            validate_uploaded_image(
                uploaded_file
            )
        )


        if not valid:

            return Response(
                {
                    "detail":
                        error_message
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        try:

            upload_result = (
                upload_to_netlify(

                    uploaded_file=
                        uploaded_file,

                    category=
                        "restaurants/main",
                )
            )


        except Exception as exc:

            print(
                "MAIN PHOTO UPLOAD ERROR:",
                repr(exc),
            )


            return Response(
                {
                    "detail":
                        (
                            "Photo upload failed. "
                            f"{str(exc)}"
                        )
                },
                status=
                    status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


        restaurant.image_blob_key = (
            upload_result[
                "key"
            ]
        )


        restaurant.image_url = (
            upload_result[
                "url"
            ]
        )


        restaurant.image_original_name = (
            uploaded_file.name
        )


        restaurant.image_content_type = (
            getattr(
                uploaded_file,
                "content_type",
                "",
            )
            or
            ""
        )


        restaurant.save(
            update_fields=[
                "image_blob_key",
                "image_url",
                "image_original_name",
                "image_content_type",
                "updated_at",
            ]
        )


        output = (
            PartnerRestaurantSerializer(
                restaurant,
                context={
                    "request":
                        request,
                },
            )
        )


        return Response(
            output.data,
            status=
                status.HTTP_200_OK,
        )


# ============================================================
# ADD MULTIPLE GALLERY PHOTOS
# ============================================================

class PartnerRestaurantPhotosView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    parser_classes = [
        MultiPartParser,
        FormParser,
    ]


    def post(
        self,
        request,
        restaurant_id,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        restaurant = (
            get_owned_restaurant(
                request.user,
                restaurant_id,
            )
        )


        uploaded_files = (
            request.FILES.getlist(
                "images"
            )
        )


        # ----------------------------------------------------
        # Also support one image called "image"
        # ----------------------------------------------------

        if not uploaded_files:

            single_file = (
                request.FILES.get(
                    "image"
                )
            )


            if single_file:

                uploaded_files = [
                    single_file
                ]


        if not uploaded_files:

            return Response(
                {
                    "detail":
                        (
                            "Please select at least "
                            "one image."
                        )
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        created_images = []


        current_count = (
            RestaurantImage.objects
            .filter(
                restaurant=
                    restaurant
            )
            .count()
        )


        for index, uploaded_file in enumerate(
            uploaded_files
        ):

            valid, error_message = (
                validate_uploaded_image(
                    uploaded_file
                )
            )


            if not valid:

                return Response(
                    {
                        "detail":
                            (
                                f"{uploaded_file.name}: "
                                f"{error_message}"
                            )
                    },
                    status=
                        status.HTTP_400_BAD_REQUEST,
                )


            try:

                upload_result = (
                    upload_to_netlify(

                        uploaded_file=
                            uploaded_file,

                        category=
                            "restaurants/gallery",
                    )
                )


            except Exception as exc:

                print(
                    "GALLERY PHOTO ERROR:",
                    repr(exc),
                )


                return Response(
                    {
                        "detail":
                            (
                                "Gallery upload failed. "
                                f"{str(exc)}"
                            )
                    },
                    status=
                        status.HTTP_500_INTERNAL_SERVER_ERROR,
                )


            image = (
                RestaurantImage.objects
                .create(

                    restaurant=
                        restaurant,

                    image_blob_key=
                        upload_result[
                            "key"
                        ],

                    image_url=
                        upload_result[
                            "url"
                        ],

                    image_original_name=
                        uploaded_file.name,

                    image_content_type=
                        (
                            getattr(
                                uploaded_file,
                                "content_type",
                                "",
                            )
                            or
                            ""
                        ),

                    caption=
                        "",

                    sort_order=
                        current_count
                        +
                        index,

                    is_active=
                        True,
                )
            )


            created_images.append(
                image
            )


        serializer = (
            PartnerRestaurantImageSerializer(

                created_images,

                many=True,

                context={
                    "request":
                        request,
                },
            )
        )


        return Response(
            serializer.data,
            status=
                status.HTTP_201_CREATED,
        )


# ============================================================
# DELETE GALLERY PHOTO
# ============================================================

class PartnerRestaurantPhotoDeleteView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def delete(
        self,
        request,
        restaurant_id,
        image_id,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        image = get_object_or_404(

            RestaurantImage,

            id=
                image_id,

            restaurant_id=
                restaurant_id,

            restaurant__owner=
                request.user,
        )


        image.delete()


        return Response(
            status=
                status.HTTP_204_NO_CONTENT
        )


# ============================================================
# MENU LIST + CREATE
# ============================================================

class PartnerMenuListCreateView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    parser_classes = [
        JSONParser,
        MultiPartParser,
        FormParser,
    ]


    # --------------------------------------------------------
    # GET MENU
    # --------------------------------------------------------

    def get(
        self,
        request,
        restaurant_id,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        restaurant = (
            get_owned_restaurant(
                request.user,
                restaurant_id,
            )
        )


        items = (

            restaurant
            .menu_items

            .all()

            .order_by(
                "sort_order",
                "category",
                "name",
            )
        )


        serializer = (
            PartnerMenuItemSerializer(
                items,
                many=True,
            )
        )


        return Response(
            serializer.data
        )


    # --------------------------------------------------------
    # CREATE MENU ITEM
    # --------------------------------------------------------

    def post(
        self,
        request,
        restaurant_id,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        restaurant = (
            get_owned_restaurant(
                request.user,
                restaurant_id,
            )
        )


        name = (
            str(
                request.data.get(
                    "name",
                    "",
                )
            )
            .strip()
        )


        if not name:

            return Response(
                {
                    "name": [
                        "Dish name is required."
                    ]
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        raw_price = (
            request.data.get(
                "price"
            )
        )


        if raw_price in (
            "",
            None,
        ):

            return Response(
                {
                    "price": [
                        "Price is required."
                    ]
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        try:

            price = Decimal(
                str(
                    raw_price
                )
            )


        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ):

            return Response(
                {
                    "price": [
                        "Enter a valid price."
                    ]
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        data = {
            "name":
                name,

            "description":
                request.data.get(
                    "description",
                    "",
                ),

            "category":
                request.data.get(
                    "category",
                    "main_course",
                ),

            "food_type":
                request.data.get(
                    "food_type",
                    "vegetarian",
                ),

            "price":
                str(
                    price
                ),

            "is_popular":
                request.data.get(
                    "is_popular",
                    False,
                ),

            "is_available":
                request.data.get(
                    "is_available",
                    True,
                ),

            "sort_order":
                request.data.get(
                    "sort_order",
                    0,
                )
                or
                0,
        }


        serializer = (
            PartnerMenuItemSerializer(
                data=data
            )
        )


        serializer.is_valid(
            raise_exception=True
        )


        item = (
            serializer.save(
                restaurant=
                    restaurant
            )
        )


        output = (
            PartnerMenuItemSerializer(
                item
            )
        )


        return Response(
            output.data,
            status=
                status.HTTP_201_CREATED,
        )


# ============================================================
# MENU ITEM UPDATE / DELETE
# ============================================================

class PartnerMenuDetailView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    parser_classes = [
        JSONParser,
        FormParser,
    ]


    def get_item(
        self,
        request,
        restaurant_id,
        menu_id,
    ):

        return get_object_or_404(

            RestaurantMenuItem,

            id=
                menu_id,

            restaurant_id=
                restaurant_id,

            restaurant__owner=
                request.user,
        )


    # --------------------------------------------------------
    # PATCH MENU
    # --------------------------------------------------------

    def patch(
        self,
        request,
        restaurant_id,
        menu_id,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        item = (
            self.get_item(
                request,
                restaurant_id,
                menu_id,
            )
        )


        serializer = (
            PartnerMenuItemSerializer(

                item,

                data=
                    request.data,

                partial=True,
            )
        )


        serializer.is_valid(
            raise_exception=True
        )


        serializer.save()


        return Response(
            serializer.data
        )


    # --------------------------------------------------------
    # DELETE MENU
    # --------------------------------------------------------

    def delete(
        self,
        request,
        restaurant_id,
        menu_id,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        item = (
            self.get_item(
                request,
                restaurant_id,
                menu_id,
            )
        )


        item.delete()


        return Response(
            status=
                status.HTTP_204_NO_CONTENT
        )


# ============================================================
# MENU ITEM PHOTO
# ============================================================

class PartnerMenuPhotoView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    parser_classes = [
        MultiPartParser,
        FormParser,
    ]


    def post(
        self,
        request,
        restaurant_id,
        menu_id,
    ):

        if not ensure_partner(
            request.user
        ):

            return (
                partner_required_response()
            )


        item = get_object_or_404(

            RestaurantMenuItem,

            id=
                menu_id,

            restaurant_id=
                restaurant_id,

            restaurant__owner=
                request.user,
        )


        uploaded_file = (
            request.FILES.get(
                "image"
            )
        )


        valid, error_message = (
            validate_uploaded_image(
                uploaded_file
            )
        )


        if not valid:

            return Response(
                {
                    "detail":
                        error_message
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        try:

            upload_result = (
                upload_to_netlify(

                    uploaded_file=
                        uploaded_file,

                    category=
                        "restaurants/menu",
                )
            )


        except Exception as exc:

            print(
                "MENU PHOTO ERROR:",
                repr(exc),
            )


            return Response(
                {
                    "detail":
                        (
                            "Dish photo upload failed. "
                            f"{str(exc)}"
                        )
                },
                status=
                    status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


        item.image_blob_key = (
            upload_result[
                "key"
            ]
        )


        item.image_url = (
            upload_result[
                "url"
            ]
        )


        item.image_original_name = (
            uploaded_file.name
        )


        item.image_content_type = (
            getattr(
                uploaded_file,
                "content_type",
                "",
            )
            or
            ""
        )


        item.save(
            update_fields=[
                "image_blob_key",
                "image_url",
                "image_original_name",
                "image_content_type",
                "updated_at",
            ]
        )


        return Response(
            PartnerMenuItemSerializer(
                item
            ).data,
            status=
                status.HTTP_200_OK,
        )