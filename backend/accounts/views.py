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
    Convert comma-separated food values into
    a clean lowercase set.

    Example:
    "Kerala, South Indian, Chinese"

    becomes:

    {
        "kerala",
        "south indian",
        "chinese",
    }
    """

    if not value:
        return set()

    if isinstance(
        value,
        (
            list,
            tuple,
            set,
        ),
    ):

        values = value

    else:

        values = str(value).split(",")

    return {
        str(item)
        .strip()
        .lower()

        for item in values

        if str(item).strip()
    }


def calculate_common_score(
    first_value,
    second_value,
    maximum_points,
):
    """
    Compare two comma-separated fields
    and calculate similarity points.

    Uses Jaccard similarity:

    common items / total unique items
    """

    first = normalize_food_values(
        first_value
    )

    second = normalize_food_values(
        second_value
    )

    if not first or not second:

        return (
            0,
            [],
        )

    common = first.intersection(
        second
    )

    if not common:

        return (
            0,
            [],
        )

    combined = first.union(
        second
    )

    similarity = (
        len(common)
        /
        len(combined)
    )

    points = round(
        similarity
        *
        maximum_points
    )

    return (
        points,
        sorted(common),
    )


def format_food_value(value):
    """
    Display saved lowercase comparison values
    nicely in match reasons.
    """

    return str(value).title()


def calculate_food_match(
    current_profile,
    other_profile,
):
    """
    FoodKindl Food Match calculation.

    Favourite cuisines:       30
    Food interests:           25
    Connection preferences:   20
    Dietary preference:       15
    Location:                 10

    Total:                   100
    """

    score = 0
    reasons = []

    common_cuisines = []
    common_interests = []
    common_connections = []


    # ========================================================
    # 1. FAVOURITE CUISINES
    # MAXIMUM 30 POINTS
    # ========================================================

    (
        cuisine_score,
        common_cuisines,
    ) = calculate_common_score(

        current_profile
        .favorite_cuisines,

        other_profile
        .favorite_cuisines,

        30,
    )

    score += cuisine_score

    if common_cuisines:

        display_cuisines = [
            format_food_value(
                cuisine
            )
            for cuisine
            in common_cuisines[:3]
        ]

        reasons.append(
            "Both enjoy "
            +
            ", ".join(
                display_cuisines
            )
        )


    # ========================================================
    # 2. FOOD INTERESTS
    # MAXIMUM 25 POINTS
    # ========================================================

    (
        interest_score,
        common_interests,
    ) = calculate_common_score(

        current_profile
        .interests,

        other_profile
        .interests,

        25,
    )

    score += interest_score

    if common_interests:

        display_interests = [
            format_food_value(
                interest
            )
            for interest
            in common_interests[:3]
        ]

        reasons.append(
            "Shared interest in "
            +
            ", ".join(
                display_interests
            )
        )


    # ========================================================
    # 3. FOOD CONNECTION PREFERENCES
    # MAXIMUM 20 POINTS
    # ========================================================

    (
        connection_score,
        common_connections,
    ) = calculate_common_score(

        current_profile
        .food_connection_preferences,

        other_profile
        .food_connection_preferences,

        20,
    )

    score += connection_score

    if common_connections:

        display_connections = [
            format_food_value(
                connection
            )
            for connection
            in common_connections[:2]
        ]

        reasons.append(
            "Both interested in "
            +
            ", ".join(
                display_connections
            )
        )


    # ========================================================
    # 4. DIETARY PREFERENCE
    # MAXIMUM 15 POINTS
    # ========================================================

    current_diet = (
        current_profile
        .dietary_preference
        or ""
    ).strip().lower()

    other_diet = (
        other_profile
        .dietary_preference
        or ""
    ).strip().lower()

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
    # MAXIMUM 10 POINTS
    #
    # Currently using locality / city because
    # Profile does not contain latitude/longitude.
    # ========================================================

    current_city = (
        current_profile.city
        or ""
    ).strip().lower()

    other_city = (
        other_profile.city
        or ""
    ).strip().lower()

    current_locality = (
        current_profile.locality
        or ""
    ).strip().lower()

    other_locality = (
        other_profile.locality
        or ""
    ).strip().lower()

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
    # FINAL RESULT
    # ========================================================

    return {

        "score":
            min(
                round(score),
                100,
            ),

        "reasons":
            reasons[:4],

        "common_cuisines":
            common_cuisines,

        "common_interests":
            common_interests,

        "common_connection_preferences":
            common_connections,
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

        user = (
            serializer.save()
        )

        return Response(

            UserSerializer(
                user,
                context={
                    "request": request,
                },
            ).data,

            status=(
                status.HTTP_201_CREATED
            ),
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
                    "request": request,
                },
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        return Response(

            serializer.validated_data,

            status=(
                status.HTTP_200_OK
            ),
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
                    "request": request,
                },
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
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
            status=status.HTTP_200_OK,
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
                    "request": request,
                },
            ).data,

            status=status.HTTP_200_OK,
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
                blocked_users=request.user
            )
            .values_list(
                "user_id",
                flat=True,
            )
        )


        # ====================================================
        # USERS TO EXCLUDE
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
        # FIND ACTIVE MEMBERS
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
        id__in=excluded_ids,
    )

    .select_related(
        "profile"
    )
)


        results = []


        # ====================================================
        # CALCULATE MATCH FOR EACH MEMBER
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
            # WOMEN-ONLY PREFERENCE
            #
            # If current user enables this preference,
            # only verified female members are returned.
            # =================================================

            if (
                current_profile
                .women_only_mode
            ):

                if not (
                    other_profile.gender ==
                    "female"
                    and
                    other_profile.is_verified
                ):

                    continue


            match = (
                calculate_food_match(
                    current_profile,
                    other_profile,
                )
            )


            member_data = (
                FoodMatchMemberSerializer(

                    member,

                    context={
                        "request": request,
                    },
                ).data
            )


            results.append(
                {

                    **member_data,

                    "food_match":
                        match["score"],

                    "match_reasons":
                        match["reasons"],

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
        # BEST FOOD MATCH FIRST
        # ====================================================

        results.sort(
            key=lambda item:
                item["food_match"],
            reverse=True,
        )


        return Response(
            {

                "count":
                    len(results),

                "results":
                    results,
            },

            status=status.HTTP_200_OK,
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
            or profile.government_id_url
            or profile.government_id
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

            status=status.HTTP_200_OK,
        )


# ============================================================
# BLOCKED MEMBERS LIST
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
                    "request": request,
                },
            )
        )

        return Response(

            serializer.data,

            status=status.HTTP_200_OK,
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

        # ====================================================
        # CANNOT BLOCK YOURSELF
        # ====================================================

        if (
            request.user.id ==
            user_id
        ):

            return Response(
                {
                    "detail":
                        "You cannot block yourself."
                },

                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )


        # ====================================================
        # FIND MEMBER
        # ====================================================

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

                status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )


        profile, _ = (
            Profile.objects.get_or_create(
                user=request.user
            )
        )


        # ====================================================
        # ALREADY BLOCKED
        # ====================================================

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

                status=status.HTTP_200_OK,
            )


        # ====================================================
        # BLOCK
        # ====================================================

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

            status=status.HTTP_200_OK,
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

                status=(
                    status.HTTP_404_NOT_FOUND
                ),
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

            status=status.HTTP_200_OK,
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

        # ====================================================
        # OWN PROFILE
        # ====================================================

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

                status=status.HTTP_200_OK,
            )


        # ====================================================
        # FIND MEMBER
        # ====================================================

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

                status=(
                    status.HTTP_404_NOT_FOUND
                ),
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

            status=status.HTTP_200_OK,
        )