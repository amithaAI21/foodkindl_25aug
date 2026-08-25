from django.contrib.auth.models import User

from rest_framework import (
    generics,
    permissions,
    status,
)

from rest_framework.parsers import (
    FormParser,
    JSONParser,
    MultiPartParser,
)

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile

from .serializers import (
    BlockedMemberSerializer,
    EmailLoginSerializer,
    FoodMatchMemberSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)

from .utils import (
    users_are_blocked,
)


# ============================================================
# FOOD MATCH HELPERS
# ============================================================

def normalize_food_values(value):
    """
    Convert food-related values into a normalized set.

    Supports:
    - comma-separated strings
    - semicolon-separated strings
    - lists
    - tuples
    - sets
    """

    if value is None:
        return set()

    if isinstance(
        value,
        (
            list,
            tuple,
            set,
        ),
    ):

        raw_values = value

    else:

        raw_values = (
            str(value)
            .replace(";", ",")
            .split(",")
        )

    normalized_values = set()

    for item in raw_values:

        clean_item = (
            str(item)
            .strip()
            .lower()
            .replace("_", " ")
        )

        if clean_item:

            normalized_values.add(
                clean_item
            )

    return normalized_values


# ============================================================
# COMMON SCORE
# ============================================================

def calculate_common_score(
    first_value,
    second_value,
    maximum_points,
):
    """
    Calculate similarity using Jaccard similarity.

    Formula:

        common items
        ----------------
        all unique items

    multiplied by maximum_points.
    """

    first_values = normalize_food_values(
        first_value
    )

    second_values = normalize_food_values(
        second_value
    )

    if (
        not first_values
        or
        not second_values
    ):

        return (
            0,
            [],
        )

    common_values = (
        first_values
        .intersection(
            second_values
        )
    )

    if not common_values:

        return (
            0,
            [],
        )

    combined_values = (
        first_values
        .union(
            second_values
        )
    )

    if not combined_values:

        return (
            0,
            [],
        )

    similarity = (
        len(common_values)
        /
        len(combined_values)
    )

    points = round(
        similarity
        *
        maximum_points
    )

    return (
        points,
        sorted(
            common_values
        ),
    )


# ============================================================
# SAFE PROFILE VALUE
# ============================================================

def get_profile_value(
    profile,
    field_name,
):

    if not profile:
        return ""

    value = getattr(
        profile,
        field_name,
        "",
    )

    if value is None:
        return ""

    return value


# ============================================================
# SAFE PROFILE TEXT
# ============================================================

def get_profile_text(
    profile,
    field_name,
):

    return (
        str(
            get_profile_value(
                profile,
                field_name,
            )
        )
        .strip()
        .lower()
        .replace(
            "_",
            " ",
        )
    )


# ============================================================
# FORMAT VALUE
# ============================================================

def format_food_value(value):

    if not value:
        return ""

    return (
        str(value)
        .replace(
            "_",
            " ",
        )
        .strip()
        .title()
    )


# ============================================================
# CALCULATE FOOD MATCH
# ============================================================

def calculate_food_match(
    current_profile,
    other_profile,
):
    """
    FOODKINDL FOOD MATCH

    Favourite cuisines             30
    Food interests                 25
    Connection preferences         20
    Dietary preference             15
    Location                       10

    TOTAL                         100
    """

    score = 0

    reasons = []

    common_cuisines = []

    common_interests = []

    common_connection_preferences = []


    # ========================================================
    # 1. FAVOURITE CUISINES
    # MAXIMUM 30
    # ========================================================

    (
        cuisine_score,
        common_cuisines,
    ) = calculate_common_score(

        get_profile_value(
            current_profile,
            "favorite_cuisines",
        ),

        get_profile_value(
            other_profile,
            "favorite_cuisines",
        ),

        30,
    )

    score += cuisine_score

    if common_cuisines:

        display_values = [

            format_food_value(
                value
            )

            for value
            in common_cuisines[:3]
        ]

        reasons.append(
            "Both enjoy "
            +
            ", ".join(
                display_values
            )
        )


    # ========================================================
    # 2. FOOD INTERESTS
    # MAXIMUM 25
    # ========================================================

    (
        interest_score,
        common_interests,
    ) = calculate_common_score(

        get_profile_value(
            current_profile,
            "interests",
        ),

        get_profile_value(
            other_profile,
            "interests",
        ),

        25,
    )

    score += interest_score

    if common_interests:

        display_values = [

            format_food_value(
                value
            )

            for value
            in common_interests[:3]
        ]

        reasons.append(
            "Shared interest in "
            +
            ", ".join(
                display_values
            )
        )


    # ========================================================
    # 3. FOOD CONNECTION PREFERENCES
    # MAXIMUM 20
    # ========================================================

    (
        connection_score,
        common_connection_preferences,
    ) = calculate_common_score(

        get_profile_value(
            current_profile,
            "food_connection_preferences",
        ),

        get_profile_value(
            other_profile,
            "food_connection_preferences",
        ),

        20,
    )

    score += connection_score

    if common_connection_preferences:

        display_values = [

            format_food_value(
                value
            )

            for value
            in common_connection_preferences[:3]
        ]

        reasons.append(
            "Both interested in "
            +
            ", ".join(
                display_values
            )
        )


    # ========================================================
    # 4. DIETARY PREFERENCE
    # MAXIMUM 15
    # ========================================================

    current_diet = (
        get_profile_text(
            current_profile,
            "dietary_preference",
        )
    )

    other_diet = (
        get_profile_text(
            other_profile,
            "dietary_preference",
        )
    )

    if (
        current_diet
        and
        other_diet
        and
        current_diet ==
        other_diet
    ):

        score += 15

        reasons.append(
            "Same dietary preference"
        )


    # ========================================================
    # 5. LOCATION
    # MAXIMUM 10
    # ========================================================

    current_city = (
        get_profile_text(
            current_profile,
            "city",
        )
    )

    other_city = (
        get_profile_text(
            other_profile,
            "city",
        )
    )

    current_locality = (
        get_profile_text(
            current_profile,
            "locality",
        )
    )

    other_locality = (
        get_profile_text(
            other_profile,
            "locality",
        )
    )


    # Same locality = 10 points

    if (
        current_locality
        and
        other_locality
        and
        current_locality ==
        other_locality
    ):

        score += 10

        reasons.append(
            "Same locality"
        )


    # Same city = 6 points

    elif (
        current_city
        and
        other_city
        and
        current_city ==
        other_city
    ):

        score += 6

        reasons.append(
            "Same city"
        )


    # ========================================================
    # FINAL SCORE
    # ========================================================

    final_score = max(
        0,
        min(
            round(score),
            100,
        ),
    )

    return {

        "score":
            final_score,

        "reasons":
            reasons[:4],

        "common_cuisines":
            common_cuisines,

        "common_interests":
            common_interests,

        "common_connection_preferences":
            common_connection_preferences,
    }


# ============================================================
# REGISTER
# ============================================================

class RegisterView(
    generics.CreateAPIView
):

    permission_classes = [
        permissions.AllowAny,
    ]

    serializer_class = (
        RegisterSerializer
    )


    def create(
        self,
        request,
        *args,
        **kwargs,
    ):

        serializer = (
            self.get_serializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.save()

        return Response(
            UserSerializer(
                user,
                context={
                    "request":
                        request,
                },
            ).data,

            status=
                status.HTTP_201_CREATED,
        )


# ============================================================
# EMAIL LOGIN
# ============================================================

class EmailLoginView(
    APIView
):

    permission_classes = [
        permissions.AllowAny,
    ]


    def post(
        self,
        request,
    ):

        serializer = (
            EmailLoginSerializer(
                data=request.data,

                context={
                    "request":
                        request,
                },
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        return Response(
            serializer.validated_data,

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# CURRENT USER
# ============================================================

class MeView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def get(
        self,
        request,
    ):

        Profile.objects.get_or_create(
            user=request.user
        )

        serializer = (
            UserSerializer(
                request.user,

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


# ============================================================
# PROFILE UPDATE
# ============================================================

class ProfileUpdateView(
    generics.RetrieveUpdateAPIView
):

    serializer_class = (
        ProfileSerializer
    )

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]


    def get_object(
        self,
    ):

        profile, _ = (
            Profile.objects.get_or_create(
                user=self.request.user
            )
        )

        return profile


    def retrieve(
        self,
        request,
        *args,
        **kwargs,
    ):

        profile = (
            self.get_object()
        )

        serializer = (
            self.get_serializer(
                profile
            )
        )

        return Response(
            serializer.data,

            status=
                status.HTTP_200_OK,
        )


    def update(
        self,
        request,
        *args,
        **kwargs,
    ):

        partial = kwargs.pop(
            "partial",
            False,
        )

        profile = (
            self.get_object()
        )

        serializer = (
            self.get_serializer(
                profile,

                data=request.data,

                partial=partial,
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        updated_profile = (
            serializer.save()
        )

        updated_profile.refresh_from_db()

        request.user.refresh_from_db()

        return Response(
            UserSerializer(
                request.user,

                context={
                    "request":
                        request,
                },
            ).data,

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# FOOD MATCH
# ============================================================

class FoodMatchView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def get(
        self,
        request,
    ):

        # ====================================================
        # CURRENT USER PROFILE
        # ====================================================

        current_profile, _ = (
            Profile.objects.get_or_create(
                user=request.user
            )
        )


        # ====================================================
        # USERS BLOCKED BY CURRENT USER
        # ====================================================

        blocked_by_me_ids = set(

            current_profile
            .blocked_users
            .values_list(
                "id",
                flat=True,
            )
        )


        # ====================================================
        # USERS WHO BLOCKED CURRENT USER
        # ====================================================

        blocked_me_ids = set(

            Profile.objects
            .filter(
                blocked_users=
                    request.user
            )
            .values_list(
                "user_id",
                flat=True,
            )
        )


        # ====================================================
        # EXCLUDED USERS
        # ====================================================

        excluded_ids = (

            blocked_by_me_ids
            |
            blocked_me_ids
            |
            {
                request.user.id
            }
        )


        # ====================================================
        # ACTIVE MEMBERS
        # ====================================================

        members = (

            User.objects

            .filter(
                is_active=True,
                is_staff=False,
                is_superuser=False,
                profile__isnull=False,
            )

            .exclude(
                id__in=
                    excluded_ids,
            )

            .select_related(
                "profile"
            )

            .distinct()
        )


        results = []


        # ====================================================
        # CALCULATE FOOD MATCH
        # ====================================================

        for member in members:

            other_profile = getattr(
                member,
                "profile",
                None,
            )

            if not other_profile:
                continue


            # =================================================
            # WOMEN ONLY MODE
            # =================================================

            women_only_mode = bool(

                getattr(
                    current_profile,
                    "women_only_mode",
                    False,
                )
            )

            if women_only_mode:

                member_gender = (

                    str(
                        getattr(
                            other_profile,
                            "gender",
                            "",
                        )
                        or ""
                    )
                    .strip()
                    .lower()
                )

                member_verified = bool(

                    getattr(
                        other_profile,
                        "is_verified",
                        False,
                    )
                )

                if not (
                    member_gender ==
                    "female"

                    and

                    member_verified
                ):

                    continue


            # =================================================
            # CALCULATE SCORE
            # =================================================

            match = (
                calculate_food_match(
                    current_profile,
                    other_profile,
                )
            )


            # =================================================
            # SERIALIZE MEMBER
            # =================================================

            member_data = (

                FoodMatchMemberSerializer(
                    member,

                    context={
                        "request":
                            request,
                    },
                )

                .data
            )


            # =================================================
            # ADD FOOD MATCH DATA
            # =================================================

            results.append(
                {

                    **member_data,

                    # Explicit IDs are important for Connect.jsx

                    "id":
                        member.id,

                    "user_id":
                        member.id,

                    "member_id":
                        member.id,

                    # Main Food Match value

                    "food_match":
                        match[
                            "score"
                        ],

                    # Fallback aliases

                    "match_score":
                        match[
                            "score"
                        ],

                    "match_percentage":
                        match[
                            "score"
                        ],

                    # Explanation

                    "match_reasons":
                        match[
                            "reasons"
                        ],

                    "common_cuisines":
                        match[
                            "common_cuisines"
                        ],

                    "common_interests":
                        match[
                            "common_interests"
                        ],

                    "common_connection_preferences":
                        match[
                            "common_connection_preferences"
                        ],
                }
            )


        # ====================================================
        # BEST MATCH FIRST
        # ====================================================

        results.sort(

            key=lambda item:
                item.get(
                    "food_match",
                    0,
                ),

            reverse=True,
        )


        # ====================================================
        # RESPONSE
        # ====================================================

        return Response(
            {

                "count":
                    len(
                        results
                    ),

                "results":
                    results,
            },

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# VERIFICATION STATUS
# ============================================================

class VerificationStatusView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def get(
        self,
        request,
    ):

        profile, _ = (
            Profile.objects.get_or_create(
                user=request.user
            )
        )

        government_id_uploaded = bool(
            profile.government_id_blob_key
            or
            profile.government_id_url
            or
            profile.government_id
        )

        return Response(
            {

                "government_id_uploaded":
                    government_id_uploaded,

                "government_id_type":
                    profile.government_id_type,

                "verification_status":
                    profile.verification_status,

                "is_verified":
                    profile.is_verified,

                "rejection_reason":
                    profile.rejection_reason,

                "verified_at":
                    profile.verified_at,
            },

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# BLOCKED MEMBERS
# ============================================================

class BlockedMembersView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def get(
        self,
        request,
    ):

        profile, _ = (
            Profile.objects.get_or_create(
                user=request.user
            )
        )

        blocked_members = (

            profile
            .blocked_users

            .select_related(
                "profile"
            )

            .order_by(
                "first_name",
                "last_name",
                "id",
            )
        )

        serializer = (
            BlockedMemberSerializer(

                blocked_members,

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


# ============================================================
# BLOCK MEMBER
# ============================================================

class BlockMemberView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def post(
        self,
        request,
        user_id,
    ):

        if (
            request.user.id ==
            user_id
        ):

            return Response(
                {
                    "detail":
                        "You cannot block yourself."
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        try:

            member = (
                User.objects.get(
                    id=user_id,
                    is_active=True,
                )
            )

        except User.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Member not found."
                },

                status=
                    status.HTTP_404_NOT_FOUND,
            )

        profile, _ = (
            Profile.objects.get_or_create(
                user=request.user
            )
        )

        if (
            profile
            .blocked_users
            .filter(
                id=member.id
            )
            .exists()
        ):

            return Response(
                {
                    "detail":
                        "Member is already blocked.",

                    "blocked_user_id":
                        member.id,
                },

                status=
                    status.HTTP_200_OK,
            )

        profile.blocked_users.add(
            member
        )

        return Response(
            {
                "detail":
                    "Member blocked successfully.",

                "blocked_user_id":
                    member.id,
            },

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# UNBLOCK MEMBER
# ============================================================

class UnblockMemberView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def post(
        self,
        request,
        user_id,
    ):

        try:

            member = (
                User.objects.get(
                    id=user_id
                )
            )

        except User.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Member not found."
                },

                status=
                    status.HTTP_404_NOT_FOUND,
            )

        profile, _ = (
            Profile.objects.get_or_create(
                user=request.user
            )
        )

        profile.blocked_users.remove(
            member
        )

        return Response(
            {
                "detail":
                    "Member unblocked successfully.",

                "blocked_user_id":
                    member.id,
            },

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# BLOCK STATUS
# ============================================================

class BlockStatusView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def get(
        self,
        request,
        user_id,
    ):

        if (
            request.user.id ==
            user_id
        ):

            return Response(
                {

                    "blocked_by_me":
                        False,

                    "interaction_blocked":
                        False,
                },

                status=
                    status.HTTP_200_OK,
            )

        try:

            member = (
                User.objects.get(
                    id=user_id
                )
            )

        except User.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Member not found."
                },

                status=
                    status.HTTP_404_NOT_FOUND,
            )

        profile, _ = (
            Profile.objects.get_or_create(
                user=request.user
            )
        )

        blocked_by_me = (
            profile
            .blocked_users
            .filter(
                id=member.id
            )
            .exists()
        )

        interaction_blocked = (
            users_are_blocked(
                request.user,
                member,
            )
        )

        return Response(
            {

                "blocked_by_me":
                    blocked_by_me,

                "interaction_blocked":
                    interaction_blocked,
            },

            status=
                status.HTTP_200_OK,
        )
        
#################################################################################
from django.conf import settings

from django.contrib.auth import (
    get_user_model,
)

from django.contrib.auth.tokens import (
    default_token_generator,
)

from django.core.mail import (
    send_mail,
)

from django.utils.encoding import (
    force_bytes,
)

from django.utils.http import (
    urlsafe_base64_encode,
)

from rest_framework import (
    status,
)

from rest_framework.permissions import (
    AllowAny,
)

from rest_framework.response import (
    Response,
)

from rest_framework.views import (
    APIView,
)


from .serializers import (
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)


User = get_user_model()


# ============================================================
# FORGOT PASSWORD
# ============================================================

class ForgotPasswordView(
    APIView
):

    permission_classes = [
        AllowAny,
    ]


    def post(
        self,
        request,
    ):

        email = (
            str(
                request.data.get(
                    "email",
                    "",
                )
            )
            .strip()
            .lower()
        )


        if not email:

            return Response(
                {
                    "detail":
                        "Email address is required."
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        user = (
            User.objects
            .filter(
                email__iexact=email,
                is_active=True,
            )
            .first()
        )


        # ====================================================
        # SECURITY
        #
        # Do not tell the frontend whether the email exists.
        # ====================================================

        if not user:

            return Response(
                {
                    "detail":
                        (
                            "If an account exists with that "
                            "email address, a password reset "
                            "link has been sent."
                        )
                },
                status=
                    status.HTTP_200_OK,
            )


        try:

            # =================================================
            # CREATE RESET TOKEN
            # =================================================

            uid = (
                urlsafe_base64_encode(
                    force_bytes(
                        user.pk
                    )
                )
            )


            token = (
                default_token_generator
                .make_token(
                    user
                )
            )


            frontend_url = (
                getattr(
                    settings,
                    "FRONTEND_URL",
                    "http://localhost:8888",
                )
                .rstrip("/")
            )


            reset_url = (
                f"{frontend_url}"
                f"/reset-password/"
                f"{uid}/"
                f"{token}"
            )


            # =================================================
            # EMAIL
            # =================================================

            first_name = (
                user.first_name
                or
                "FoodKindl Member"
            )


            subject = (
                "Reset your FoodKindl password"
            )


            message = f"""
Hi {first_name},

We received a request to reset your FoodKindl password.

Click the link below to create a new password:

{reset_url}

This link will expire after a limited period.

If you did not request a password reset, you can ignore this email.

Regards,
FoodKindl
"""


            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [
                    user.email
                ],
                fail_silently=False,
            )


            print(
                "Password reset email sent to:",
                user.email
            )


        except Exception as error:

            # =================================================
            # DEVELOPMENT LOG
            #
            # This shows the real problem in runserver terminal.
            # =================================================

            print(
                "PASSWORD RESET EMAIL ERROR:",
                repr(error)
            )


            return Response(
                {
                    "detail":
                        (
                            "Unable to send password "
                            "reset email."
                        )
                },
                status=
                    status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


        return Response(
            {
                "detail":
                    (
                        "If an account exists with that "
                        "email address, a password reset "
                        "link has been sent."
                    )
            },
            status=
                status.HTTP_200_OK,
        )
        
        
# ============================================================
# RESET PASSWORD
# ============================================================

class ResetPasswordView(
    APIView
):

    permission_classes = [
        AllowAny,
    ]


    def post(
        self,
        request,
    ):

        serializer = (
            ResetPasswordSerializer(
                data=request.data
            )
        )


        serializer.is_valid(
            raise_exception=True
        )


        user = (
            serializer
            .validated_data[
                "user"
            ]
        )


        new_password = (
            serializer
            .validated_data[
                "password"
            ]
        )


        user.set_password(
            new_password
        )

        user.save(
            update_fields=[
                "password",
            ]
        )


        return Response(
            {
                "detail":
                    (
                        "Your password has been "
                        "reset successfully."
                    )
            },
            status=
                status.HTTP_200_OK,
        )