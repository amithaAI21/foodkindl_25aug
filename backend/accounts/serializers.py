from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile


# ============================================================
# PROFILE SERIALIZER
# ============================================================

class ProfileSerializer(
    serializers.ModelSerializer
):

    government_id_uploaded = (
        serializers.SerializerMethodField()
    )

    blocked_users_count = (
        serializers.SerializerMethodField()
    )


    class Meta:

        model = Profile

        fields = (

            # =================================================
            # PROFILE
            # =================================================

            "bio",
            "city",
            "locality",
            "postcode",
            "college_workplace",
            "role",
            "profile_visibility",

            # =================================================
            # ACCOUNT EXPERIENCE
            # =================================================

            "account_type",
            "member_profile_enabled",
            "preferred_portal",

            # =================================================
            # FOOD MATCH
            # =================================================

            "interests",
            "favorite_cuisines",
            "food_connection_preferences",

            "gender",
            "dietary_preference",
            "women_only_mode",

            # =================================================
            # SAFETY
            # =================================================

            "blocked_users_count",

            # =================================================
            # LEGACY PROFILE PHOTOS
            # =================================================

            "profile_image_1",
            "profile_image_2",
            "profile_image_3",

            # =================================================
            # NETLIFY PROFILE PHOTOS
            # =================================================

            "profile_image_1_blob_key",
            "profile_image_1_url",

            "profile_image_2_blob_key",
            "profile_image_2_url",

            "profile_image_3_blob_key",
            "profile_image_3_url",

            # =================================================
            # LEGACY GOVERNMENT ID
            # =================================================

            "government_id",

            # =================================================
            # NETLIFY GOVERNMENT ID
            # =================================================

            "government_id_blob_key",
            "government_id_url",
            "government_id_original_name",
            "government_id_content_type",

            "government_id_uploaded",
            "government_id_type",

            # =================================================
            # VERIFICATION
            # =================================================

            "verification_status",
            "is_verified",
            "verified_at",
            "rejection_reason",
        )


        read_only_fields = (

            "government_id_uploaded",

            "blocked_users_count",

            "verification_status",

            "is_verified",

            "verified_at",

            "rejection_reason",
        )


        extra_kwargs = {

            # =================================================
            # FOOD MATCH
            # =================================================

            "interests": {
                "required":
                    False,

                "allow_blank":
                    True,
            },

            "favorite_cuisines": {
                "required":
                    False,

                "allow_blank":
                    True,
            },

            "food_connection_preferences": {
                "required":
                    False,

                "allow_blank":
                    True,
            },

            # =================================================
            # LEGACY PHOTOS
            # =================================================

            "profile_image_1": {
                "required":
                    False,

                "allow_null":
                    True,
            },

            "profile_image_2": {
                "required":
                    False,

                "allow_null":
                    True,
            },

            "profile_image_3": {
                "required":
                    False,

                "allow_null":
                    True,
            },

            # =================================================
            # NETLIFY PHOTOS
            # =================================================

            "profile_image_1_blob_key": {
                "required":
                    False,

                "allow_blank":
                    True,
            },

            "profile_image_1_url": {
                "required":
                    False,

                "allow_blank":
                    True,
            },

            "profile_image_2_blob_key": {
                "required":
                    False,

                "allow_blank":
                    True,
            },

            "profile_image_2_url": {
                "required":
                    False,

                "allow_blank":
                    True,
            },

            "profile_image_3_blob_key": {
                "required":
                    False,

                "allow_blank":
                    True,
            },

            "profile_image_3_url": {
                "required":
                    False,

                "allow_blank":
                    True,
            },

            # =================================================
            # GOVERNMENT ID
            # =================================================

            "government_id": {
                "write_only":
                    True,

                "required":
                    False,

                "allow_null":
                    True,
            },

            "government_id_blob_key": {
                "write_only":
                    True,

                "required":
                    False,

                "allow_blank":
                    True,
            },

            "government_id_url": {
                "write_only":
                    True,

                "required":
                    False,

                "allow_blank":
                    True,
            },

            "government_id_original_name": {
                "write_only":
                    True,

                "required":
                    False,

                "allow_blank":
                    True,
            },

            "government_id_content_type": {
                "write_only":
                    True,

                "required":
                    False,

                "allow_blank":
                    True,
            },

            "government_id_type": {
                "required":
                    False,

                "allow_blank":
                    True,
            },
        }


    # ========================================================
    # BLOCKED COUNT
    # ========================================================

    def get_blocked_users_count(
        self,
        obj,
    ):

        return (
            obj.blocked_users.count()
        )


    # ========================================================
    # GOVERNMENT ID UPLOADED
    # ========================================================

    def get_government_id_uploaded(
        self,
        obj,
    ):

        return bool(
            obj.government_id_blob_key
            or
            obj.government_id_url
            or
            obj.government_id
        )


    # ========================================================
    # CLEAN FOOD MATCH VALUES
    # ========================================================

    def clean_comma_separated_value(
        self,
        value,
    ):

        if not value:
            return ""

        values = [

            item
            .strip()

            for item
            in (
                str(value)
                .replace(
                    ";",
                    ",",
                )
                .split(",")
            )

            if item.strip()
        ]

        unique_values = list(
            dict.fromkeys(
                values
            )
        )

        return ",".join(
            unique_values
        )


    def validate_interests(
        self,
        value,
    ):

        return (
            self.clean_comma_separated_value(
                value
            )
        )


    def validate_favorite_cuisines(
        self,
        value,
    ):

        return (
            self.clean_comma_separated_value(
                value
            )
        )


    def validate_food_connection_preferences(
        self,
        value,
    ):

        return (
            self.clean_comma_separated_value(
                value
            )
        )


    # ========================================================
    # PROFILE IMAGE VALIDATION
    # ========================================================

    def validate_profile_image_1(
        self,
        uploaded_file,
    ):

        return (
            self.validate_profile_image(
                uploaded_file
            )
        )


    def validate_profile_image_2(
        self,
        uploaded_file,
    ):

        return (
            self.validate_profile_image(
                uploaded_file
            )
        )


    def validate_profile_image_3(
        self,
        uploaded_file,
    ):

        return (
            self.validate_profile_image(
                uploaded_file
            )
        )


    def validate_profile_image(
        self,
        uploaded_file,
    ):

        if not uploaded_file:
            return uploaded_file

        maximum_size = (
            10
            *
            1024
            *
            1024
        )

        if (
            uploaded_file.size >
            maximum_size
        ):

            raise serializers.ValidationError(
                "Profile image must be smaller than 10 MB."
            )

        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
        }

        content_type = getattr(
            uploaded_file,
            "content_type",
            "",
        )

        if (
            content_type
            and
            content_type not in
            allowed_types
        ):

            raise serializers.ValidationError(
                "Upload a JPG, PNG, or WebP image."
            )

        return uploaded_file


    # ========================================================
    # GOVERNMENT ID FILE
    # ========================================================

    def validate_government_id(
        self,
        uploaded_file,
    ):

        if not uploaded_file:
            return uploaded_file

        maximum_size = (
            5
            *
            1024
            *
            1024
        )

        if (
            uploaded_file.size >
            maximum_size
        ):

            raise serializers.ValidationError(
                "Government ID must be smaller than 5 MB."
            )

        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        }

        content_type = getattr(
            uploaded_file,
            "content_type",
            "",
        )

        if (
            content_type
            and
            content_type not in
            allowed_types
        ):

            raise serializers.ValidationError(
                "Upload a JPG, PNG, WebP, or PDF document."
            )

        return uploaded_file


    # ========================================================
    # GOVERNMENT ID URL
    # ========================================================

    def validate_government_id_url(
        self,
        value,
    ):

        value = (
            value.strip()
            if value
            else ""
        )

        if not value:
            return ""

        if settings.DEBUG:

            allowed_local_prefixes = (
                "http://localhost:",
                "http://127.0.0.1:",
                "https://localhost:",
                "https://127.0.0.1:",
            )

            if value.startswith(
                allowed_local_prefixes
            ):

                return value

            if value.startswith(
                "https://"
            ):

                return value

            raise serializers.ValidationError(
                (
                    "During development, Government ID URL "
                    "must use localhost or HTTPS."
                )
            )

        if not value.startswith(
            "https://"
        ):

            raise serializers.ValidationError(
                (
                    "Government ID URL must use HTTPS "
                    "in production."
                )
            )

        return value


    # ========================================================
    # GENERAL VALIDATION
    # ========================================================

    def validate(
        self,
        attrs,
    ):

        government_id = (
            attrs.get(
                "government_id"
            )
        )

        government_id_blob_key = (
            attrs.get(
                "government_id_blob_key"
            )
        )

        government_id_url = (
            attrs.get(
                "government_id_url"
            )
        )

        government_id_type = (
            attrs.get(
                "government_id_type"
            )
        )

        if (
            not government_id_type
            and
            self.instance
        ):

            government_id_type = (
                self.instance
                .government_id_type
            )

        if (
            government_id
            or
            government_id_blob_key
            or
            government_id_url
        ):

            if not government_id_type:

                raise serializers.ValidationError(
                    {
                        "government_id_type":
                            (
                                "Select the type "
                                "of Government ID."
                            )
                    }
                )

        return attrs


    # ========================================================
    # UPDATE PROFILE
    # ========================================================

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):

        new_government_id = (
            validated_data.get(
                "government_id"
            )
        )

        new_government_blob = (
            validated_data.get(
                "government_id_blob_key"
            )
        )

        new_government_url = (
            validated_data.get(
                "government_id_url"
            )
        )

        for (
            field,
            value,
        ) in validated_data.items():

            setattr(
                instance,
                field,
                value,
            )

        if (
            new_government_id
            or
            new_government_blob
            or
            new_government_url
        ):

            instance.verification_status = (
                "pending"
            )

            instance.is_verified = False

            instance.verified_by = None

            instance.verified_at = None

            instance.rejection_reason = ""

        instance.save()

        return instance


# ============================================================
# USER SERIALIZER
# ============================================================

class UserSerializer(
    serializers.ModelSerializer
):

    profile = (
        ProfileSerializer(
            read_only=True
        )
    )

    full_name = (
        serializers.SerializerMethodField()
    )


    class Meta:

        model = User

        fields = (
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "profile",
        )


    def get_full_name(
        self,
        obj,
    ):

        return (
            obj.get_full_name().strip()
            or
            obj.email
            or
            "FoodKindl Member"
        )


# ============================================================
# FOOD MATCH MEMBER SERIALIZER
# ============================================================

class FoodMatchMemberSerializer(
    serializers.ModelSerializer
):

    user_id = (
        serializers.IntegerField(
            source="id",
            read_only=True,
        )
    )

    member_id = (
        serializers.IntegerField(
            source="id",
            read_only=True,
        )
    )

    full_name = (
        serializers.SerializerMethodField()
    )

    profile_image = (
        serializers.SerializerMethodField()
    )

    city = (
        serializers.CharField(
            source=
                "profile.city",
            read_only=True,
        )
    )

    locality = (
        serializers.CharField(
            source=
                "profile.locality",
            read_only=True,
        )
    )

    dietary_preference = (
        serializers.CharField(
            source=
                "profile.dietary_preference",
            read_only=True,
        )
    )

    interests = (
        serializers.CharField(
            source=
                "profile.interests",
            read_only=True,
        )
    )

    favorite_cuisines = (
        serializers.CharField(
            source=
                "profile.favorite_cuisines",
            read_only=True,
        )
    )

    food_connection_preferences = (
        serializers.CharField(
            source=
                "profile.food_connection_preferences",
            read_only=True,
        )
    )

    is_verified = (
        serializers.BooleanField(
            source=
                "profile.is_verified",
            read_only=True,
        )
    )

    profile_visibility = serializers.CharField(
        source="profile.profile_visibility",
        read_only=True,
    )

    is_private = serializers.SerializerMethodField()


    verification_status = (
        serializers.CharField(
            source=
                "profile.verification_status",
            read_only=True,
        )
    )


    class Meta:

        model = User

        fields = (

            "id",

            # Explicit IDs for frontend matching

            "user_id",
            "member_id",

            "first_name",
            "last_name",
            "full_name",

            "profile_image",

            "city",
            "locality",

            "dietary_preference",

            "interests",

            "favorite_cuisines",

            "food_connection_preferences",

            "is_verified",

            "verification_status",

            "profile_visibility",
            "is_private",
        )


    def get_is_private(self, obj):
        profile = getattr(obj, "profile", None)
        return bool(
            profile
            and profile.profile_visibility == "private"
        )


    def get_full_name(
        self,
        obj,
    ):

        return (
            obj.get_full_name().strip()
            or
            obj.email
            or
            "FoodKindl Member"
        )


    def get_profile_image(
        self,
        obj,
    ):

        profile = getattr(
            obj,
            "profile",
            None,
        )

        if not profile:
            return None


        # ====================================================
        # NETLIFY IMAGE FIRST
        # ====================================================

        if (
            profile
            .profile_image_1_url
        ):

            return (
                profile
                .profile_image_1_url
            )


        # ====================================================
        # LEGACY DJANGO IMAGE
        # ====================================================

        if (
            profile
            .profile_image_1
        ):

            try:

                image_url = (
                    profile
                    .profile_image_1
                    .url
                )

            except ValueError:

                return None

            request = (
                self.context.get(
                    "request"
                )
            )

            if request:

                return (
                    request
                    .build_absolute_uri(
                        image_url
                    )
                )

            return image_url

        return None


# ============================================================
# BLOCKED MEMBER SERIALIZER
# ============================================================

class BlockedMemberSerializer(
    serializers.ModelSerializer
):

    full_name = (
        serializers.SerializerMethodField()
    )

    profile_image = (
        serializers.SerializerMethodField()
    )


    class Meta:

        model = User

        fields = (
            "id",
            "first_name",
            "last_name",
            "full_name",
            "profile_image",
        )


    def get_full_name(
        self,
        obj,
    ):

        return (
            obj.get_full_name().strip()
            or
            obj.email
            or
            "FoodKindl Member"
        )


    def get_profile_image(
        self,
        obj,
    ):

        profile = getattr(
            obj,
            "profile",
            None,
        )

        if not profile:
            return None

        if (
            profile
            .profile_image_1_url
        ):

            return (
                profile
                .profile_image_1_url
            )

        if (
            profile
            .profile_image_1
        ):

            try:

                image_url = (
                    profile
                    .profile_image_1
                    .url
                )

            except ValueError:

                return None

            request = (
                self.context.get(
                    "request"
                )
            )

            if request:

                return (
                    request
                    .build_absolute_uri(
                        image_url
                    )
                )

            return image_url

        return None


# ============================================================
# REGISTER SERIALIZER
# ============================================================

class RegisterSerializer(
    serializers.ModelSerializer
):

    password = serializers.CharField(
        write_only=True,
        min_length=6,
        trim_whitespace=False,
    )

    account_type = serializers.ChoiceField(
        choices=[
            "member",
            "partner",
        ],
        write_only=True,
        default="member",
    )


    class Meta:

        model = User

        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "password",
            "account_type",
        )

        read_only_fields = (
            "id",
        )


    def validate_email(
        self,
        value,
    ):

        email = (
            value
            .strip()
            .lower()
        )


        if (
            User.objects
            .filter(
                email__iexact=email
            )
            .exists()
        ):

            raise serializers.ValidationError(
                "An account with this email already exists."
            )


        return email


    @transaction.atomic
    def create(
        self,
        validated_data,
    ):

        account_type = (
            validated_data.pop(
                "account_type",
                "member",
            )
        )


        password = (
            validated_data.pop(
                "password"
            )
        )


        email = (
            validated_data[
                "email"
            ]
            .strip()
            .lower()
        )


        user = User(

            username=
                email,

            email=
                email,

            first_name=(
                validated_data.get(
                    "first_name",
                    "",
                ).strip()
            ),

            last_name=(
                validated_data.get(
                    "last_name",
                    "",
                ).strip()
            ),
        )


        user.set_password(
            password
        )

        user.save()


        profile, _ = (
            Profile.objects
            .get_or_create(
                user=user
            )
        )


        if (
            account_type ==
            "partner"
        ):

            profile.account_type = (
                "partner"
            )

            profile.member_profile_enabled = (
                False
            )

            profile.preferred_portal = (
                "restaurant"
            )

        else:

            profile.account_type = (
                "member"
            )

            profile.member_profile_enabled = (
                True
            )

            profile.preferred_portal = (
                "member"
            )


        profile.save()


        return user

# ============================================================
# LOGIN SERIALIZER
# ============================================================

class EmailLoginSerializer(
    serializers.Serializer
):

    email = (
        serializers.EmailField(
            write_only=True
        )
    )

    password = (
        serializers.CharField(
            write_only=True,
            trim_whitespace=False,
        )
    )


    def validate(
        self,
        attrs,
    ):

        email = (
            attrs[
                "email"
            ]
            .strip()
            .lower()
        )

        password = (
            attrs[
                "password"
            ]
        )

        try:

            database_user = (
                User.objects.get(
                    email__iexact=
                        email
                )
            )

        except User.DoesNotExist:

            raise serializers.ValidationError(
                {
                    "detail":
                        (
                            "Invalid email "
                            "or password."
                        )
                }
            )

        user = authenticate(

            request=(
                self.context.get(
                    "request"
                )
            ),

            username=(
                database_user
                .username
            ),

            password=
                password,
        )

        if user is None:

            raise serializers.ValidationError(
                {
                    "detail":
                        (
                            "Invalid email "
                            "or password."
                        )
                }
            )

        if not user.is_active:

            raise serializers.ValidationError(
                {
                    "detail":
                        "This account is disabled."
                }
            )

        Profile.objects.get_or_create(
            user=user
        )

        refresh = (
            RefreshToken.for_user(
                user
            )
        )

        return {

            "refresh":
                str(
                    refresh
                ),

            "access":
                str(
                    refresh
                    .access_token
                ),

            "user":
                UserSerializer(
                    user,

                    context=
                        self.context,
                ).data,
        }
        
#####################################################
from django.contrib.auth import (
    get_user_model,
)

from django.contrib.auth.password_validation import (
    validate_password,
)

from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)

from django.utils.encoding import (
    force_str,
)

from django.utils.http import (
    urlsafe_base64_decode,
)

from django.contrib.auth.tokens import (
    default_token_generator,
)

from rest_framework import serializers


User = get_user_model()


# ============================================================
# FORGOT PASSWORD — EMAIL
# ============================================================

class ForgotPasswordSerializer(
    serializers.Serializer
):

    email = serializers.EmailField()


    def validate_email(
        self,
        value,
    ):

        return (
            value
            .strip()
            .lower()
        )


# ============================================================
# RESET PASSWORD
# ============================================================

class ResetPasswordSerializer(
    serializers.Serializer
):

    uid = serializers.CharField()

    token = serializers.CharField()

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={
            "input_type":
                "password",
        },
    )

    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={
            "input_type":
                "password",
        },
    )


    def validate(
        self,
        attrs,
    ):

        password = attrs.get(
            "password"
        )

        confirm_password = attrs.get(
            "confirm_password"
        )


        # ----------------------------------------------------
        # PASSWORDS MUST MATCH
        # ----------------------------------------------------

        if (
            password
            !=
            confirm_password
        ):

            raise serializers.ValidationError(
                {
                    "confirm_password":
                        "Passwords do not match."
                }
            )


        # ----------------------------------------------------
        # DECODE USER ID
        # ----------------------------------------------------

        try:

            user_id = force_str(
                urlsafe_base64_decode(
                    attrs["uid"]
                )
            )

            user = (
                User.objects
                .filter(
                    pk=user_id
                )
                .first()
            )

        except Exception:

            user = None


        if not user:

            raise serializers.ValidationError(
                {
                    "detail":
                        "Invalid password reset link."
                }
            )


        # ----------------------------------------------------
        # CHECK TOKEN
        # ----------------------------------------------------

        if not (
            default_token_generator
            .check_token(
                user,
                attrs["token"],
            )
        ):

            raise serializers.ValidationError(
                {
                    "detail":
                        (
                            "This password reset link "
                            "is invalid or has expired."
                        )
                }
            )


        # ----------------------------------------------------
        # DJANGO PASSWORD VALIDATION
        # ----------------------------------------------------

        try:

            validate_password(
                password,
                user=user,
            )

        except DjangoValidationError as error:

            raise serializers.ValidationError(
                {
                    "password":
                        list(
                            error.messages
                        )
                }
            )


        attrs["user"] = user

        return attrs