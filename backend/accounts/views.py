from django.db import transaction
from django.contrib.auth.models import User
from django.apps import apps
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Profile
from .serializers import BlockedMemberSerializer, EmailLoginSerializer, FoodMatchMemberSerializer, ProfileSerializer, RegisterSerializer, UserSerializer
from .utils import users_are_blocked

import logging

from django.conf import settings
from django.core import signing
from django.http import HttpResponse
from django.utils import timezone
from django.utils.html import format_html

from .email_verification import (
    EMAIL_VERIFICATION_SALT,
    send_verification_email,
)

logger = logging.getLogger(__name__)


def users_are_connected(first_user, second_user):
    """

    Return True when an accepted connection exists.



    FoodKindl deployments have used slightly different names for the

    connection model/fields. This helper checks common model and field

    names without weakening privacy when no compatible model is found.

    """
    if not first_user or not second_user:
        return False
    if first_user.id == second_user.id:
        return True
    candidate_models = (('community', 'Connection'), ('community', 'ConnectionRequest'), ('accounts', 'Connection'), ('accounts', 'ConnectionRequest'))
    pair_fields = (('sender', 'receiver'), ('from_user', 'to_user'), ('requester', 'recipient'), ('user', 'connected_user'))
    for app_label, model_name in candidate_models:
        try:
            model = apps.get_model(app_label, model_name)
        except LookupError:
            model = None
        if model is None:
            continue
        field_names = {field.name for field in model._meta.fields}
        for left, right in pair_fields:
            if left not in field_names or right not in field_names:
                continue
            query = Q(**{left: first_user, right: second_user}) | Q(**{left: second_user, right: first_user})
            queryset = model.objects.filter(query)
            if 'status' in field_names:
                queryset = queryset.filter(status__iexact='accepted')
            elif 'is_accepted' in field_names:
                queryset = queryset.filter(is_accepted=True)
            elif 'accepted' in field_names:
                queryset = queryset.filter(accepted=True)
            if queryset.exists():
                return True
    return False

def can_view_full_profile(viewer, owner):
    if not owner:
        return False
    if viewer and viewer.is_authenticated and (viewer.id == owner.id):
        return True
    profile = getattr(owner, 'profile', None)
    if not profile:
        return False
    if profile.profile_visibility == 'public':
        return True
    return users_are_connected(viewer, owner)

def apply_profile_privacy(member_data, viewer, member):
    """Hide private profile details from non-connections."""
    full_access = can_view_full_profile(viewer, member)
    member_data['profile_visibility'] = getattr(member.profile, 'profile_visibility', 'public')
    member_data['is_private'] = member_data['profile_visibility'] == 'private'
    member_data['can_view_full_profile'] = full_access
    if full_access:
        return member_data
    member_data['dietary_preference'] = ''
    member_data['interests'] = ''
    member_data['favorite_cuisines'] = ''
    member_data['food_connection_preferences'] = ''
    return member_data

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
    if isinstance(value, (list, tuple, set)):
        raw_values = value
    else:
        raw_values = str(value).replace(';', ',').split(',')
    normalized_values = set()
    for item in raw_values:
        clean_item = str(item).strip().lower().replace('_', ' ')
        if clean_item:
            normalized_values.add(clean_item)
    return normalized_values

def calculate_common_score(first_value, second_value, maximum_points):
    """

    Calculate similarity using Jaccard similarity.



    Formula:



        common items

        ----------------

        all unique items



    multiplied by maximum_points.

    """
    first_values = normalize_food_values(first_value)
    second_values = normalize_food_values(second_value)
    if not first_values or not second_values:
        return (0, [])
    common_values = first_values.intersection(second_values)
    if not common_values:
        return (0, [])
    combined_values = first_values.union(second_values)
    if not combined_values:
        return (0, [])
    similarity = len(common_values) / len(combined_values)
    points = round(similarity * maximum_points)
    return (points, sorted(common_values))

def get_profile_value(profile, field_name):
    if not profile:
        return ''
    value = getattr(profile, field_name, '')
    if value is None:
        return ''
    return value

def get_profile_text(profile, field_name):
    return str(get_profile_value(profile, field_name)).strip().lower().replace('_', ' ')

def format_food_value(value):
    if not value:
        return ''
    return str(value).replace('_', ' ').strip().title()

def calculate_food_match(current_profile, other_profile):
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
    cuisine_score, common_cuisines = calculate_common_score(get_profile_value(current_profile, 'favorite_cuisines'), get_profile_value(other_profile, 'favorite_cuisines'), 30)
    score += cuisine_score
    if common_cuisines:
        display_values = [format_food_value(value) for value in common_cuisines[:3]]
        reasons.append('Both enjoy ' + ', '.join(display_values))
    interest_score, common_interests = calculate_common_score(get_profile_value(current_profile, 'interests'), get_profile_value(other_profile, 'interests'), 25)
    score += interest_score
    if common_interests:
        display_values = [format_food_value(value) for value in common_interests[:3]]
        reasons.append('Shared interest in ' + ', '.join(display_values))
    connection_score, common_connection_preferences = calculate_common_score(get_profile_value(current_profile, 'food_connection_preferences'), get_profile_value(other_profile, 'food_connection_preferences'), 20)
    score += connection_score
    if common_connection_preferences:
        display_values = [format_food_value(value) for value in common_connection_preferences[:3]]
        reasons.append('Both interested in ' + ', '.join(display_values))
    current_diet = get_profile_text(current_profile, 'dietary_preference')
    other_diet = get_profile_text(other_profile, 'dietary_preference')
    if current_diet and other_diet and (current_diet == other_diet):
        score += 15
        reasons.append('Same dietary preference')
    current_city = get_profile_text(current_profile, 'city')
    other_city = get_profile_text(other_profile, 'city')
    current_locality = get_profile_text(current_profile, 'locality')
    other_locality = get_profile_text(other_profile, 'locality')
    if current_locality and other_locality and (current_locality == other_locality):
        score += 10
        reasons.append('Same locality')
    elif current_city and other_city and (current_city == other_city):
        score += 6
        reasons.append('Same city')
    final_score = max(0, min(round(score), 100))
    return {'score': final_score, 'reasons': reasons[:4], 'common_cuisines': common_cuisines, 'common_interests': common_interests, 'common_connection_preferences': common_connection_preferences}


class RegisterView(generics.CreateAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create user and save phone number.
        with transaction.atomic():
            user = serializer.save()

        profile, _ = Profile.objects.get_or_create(
            user=user
        )

        # Do not expose the full phone number in
        # the unauthenticated registration response.
        response_data = {
            "account_created": True,
            "email_sent": False,
            "phone_verified": profile.is_phone_verified,
        }

        try:
            send_verification_email(user)

        except Exception:
            # Log the complete traceback on the backend.
            # Never expose SMTP credentials to users.
            logger.exception(
                "FoodKindl verification email failed "
                "for user_id=%s",
                user.pk,
            )

            response_data["detail"] = (
                "Your FoodKindl account was created, "
                "but we couldn't send the verification "
                "email. Please use the resend "
                "verification option."
            )

            return Response(
                response_data,
                status=status.HTTP_201_CREATED,
            )

        response_data.update({
            "email_sent": True,
            "detail": (
                "Your FoodKindl account was created. "
                "Please check your inbox to verify "
                "your email address."
            ),
            "user": UserSerializer(
                user,
                context={"request": request},
            ).data,
        })

        return Response(
            response_data,
            status=status.HTTP_201_CREATED,
        )

        

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .models import Profile
from .email_verification import EMAIL_VERIFICATION_SALT


class VerifyEmailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, token):
        frontend_url = settings.FRONTEND_URL.rstrip("/")

        try:
            data = signing.loads(
                token,
                salt=EMAIL_VERIFICATION_SALT,
                max_age=60 * 60 * 24,
            )

            User = get_user_model()

            user = User.objects.get(
                pk=data["user_id"],
                email__iexact=data["email"],
            )

            profile, _ = Profile.objects.get_or_create(
                user=user
            )

            if not profile.email_verified_at:
                profile.email_verified_at = timezone.now()
                profile.save(
                    update_fields=["email_verified_at"]
                )

            return HttpResponseRedirect(
                f"{frontend_url}/login?verified=1"
            )

        except (
            signing.BadSignature,
            signing.SignatureExpired,
            get_user_model().DoesNotExist,
            KeyError,
        ):
            return HttpResponseRedirect(
                f"{frontend_url}/login?verified=0"
            )


class ResendVerificationEmailView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    # Configure this scope in REST_FRAMEWORK, as shown below.
    from rest_framework.throttling import ScopedRateThrottle

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_verification"

    def post(self, request):
        from rest_framework import serializers

        field = serializers.EmailField()
        email = field.run_validation(
            request.data.get("email")
        ).strip().lower()

        user = User.objects.filter(
            email__iexact=email,
            is_active=True,
        ).first()

        if user:
            profile, _ = Profile.objects.get_or_create(user=user)

            if not profile.is_email_verified:
                try:
                    send_verification_email(user)
                except Exception:
                    logger.exception(
                        "Verification email resend failed for user_id=%s",
                        user.pk,
    )

        # Avoid revealing whether an email has an account.
        return Response({
            "detail": (
                "If this email belongs to an account awaiting "
                "verification, a verification link will be sent."
            )
        })
        
                
class EmailLoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EmailLoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        Profile.objects.get_or_create(user=request.user)
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Profile

class SessionContextView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(
            user=request.user
        )

        account_type = profile.account_type or "member"

        if account_type not in {"member", "partner"}:
            account_type = "member"

        if account_type == "partner":
            if profile.preferred_portal != "restaurant":
                profile.preferred_portal = "restaurant"
                profile.save(
                    update_fields=[
                        "preferred_portal",
                        "updated_at",
                    ]
                )
        elif profile.preferred_portal != "member":
            profile.preferred_portal = "member"
            profile.save(
                update_fields=[
                    "preferred_portal",
                    "updated_at",
                ]
            )

        restaurants = []

        try:
            Restaurant = apps.get_model(
                "invites",
                "Restaurant",
            )
        except LookupError:
            Restaurant = None

        if account_type == "partner" and Restaurant is not None:
            field_names = {
                field.name
                for field in Restaurant._meta.get_fields()
            }

            if "owner" in field_names:
                partner_restaurants = (
                    Restaurant.objects
                    .filter(owner=request.user)
                    .order_by("name")
                )

                for restaurant in partner_restaurants:
                    restaurants.append({
                        "restaurant_id": restaurant.id,
                        "restaurant_name": restaurant.name,
                        "is_active": restaurant.is_active,
                        "is_foodkindl_partner": getattr(
                            restaurant,
                            "is_foodkindl_partner",
                            False,
                        ),
                        "accepts_foodkindl_booking": getattr(
                            restaurant,
                            "accepts_foodkindl_booking",
                            False,
                        ),
                    })

        return Response(
            {
                "user_id": request.user.id,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "email": request.user.email,

                # Registered phone number
                "phone_number": profile.phone_number,
                "phone_verified": profile.is_phone_verified,
                "phone_verified_at": profile.phone_verified_at,

                "account_type": account_type,
                "member_profile_enabled": (
                    profile.member_profile_enabled
                ),
                "preferred_portal": profile.preferred_portal,
                "has_restaurant_access": bool(restaurants),
                "restaurants": restaurants,
            },
            status=status.HTTP_200_OK,
        )

class ProfileUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile

    def retrieve(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = self.get_serializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        profile = self.get_object()
        serializer = self.get_serializer(profile, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_profile = serializer.save()
        updated_profile.refresh_from_db()
        request.user.refresh_from_db()
        return Response(UserSerializer(request.user, context={'request': request}).data, status=status.HTTP_200_OK)

class FoodMatchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current_profile, _ = Profile.objects.get_or_create(user=request.user)
        blocked_by_me_ids = set(current_profile.blocked_users.values_list('id', flat=True))
        blocked_me_ids = set(Profile.objects.filter(blocked_users=request.user).values_list('user_id', flat=True))
        excluded_ids = blocked_by_me_ids | blocked_me_ids | {request.user.id}
        members = User.objects.filter(is_active=True, is_staff=False, is_superuser=False, profile__isnull=False, profile__account_type='member', profile__member_profile_enabled=True).exclude(id__in=excluded_ids).select_related('profile').distinct()
        results = []
        for member in members:
            other_profile = getattr(member, 'profile', None)
            if not other_profile:
                continue
            women_only_mode = bool(getattr(current_profile, 'women_only_mode', False))
            if women_only_mode:
                member_gender = str(getattr(other_profile, 'gender', '') or '').strip().lower()
                member_verified = bool(getattr(other_profile, 'is_verified', False))
                if not (member_gender == 'female' and member_verified):
                    continue
            match = calculate_food_match(current_profile, other_profile)
            member_data = FoodMatchMemberSerializer(member, context={'request': request}).data
            member_data = apply_profile_privacy(member_data, request.user, member)
            results.append({**member_data, 'id': member.id, 'user_id': member.id, 'member_id': member.id, 'food_match': match['score'], 'match_score': match['score'], 'match_percentage': match['score'], 'match_reasons': match['reasons'], 'common_cuisines': match['common_cuisines'], 'common_interests': match['common_interests'], 'common_connection_preferences': match['common_connection_preferences']})
        results.sort(key=lambda item: item.get('food_match', 0), reverse=True)
        return Response({'count': len(results), 'results': results}, status=status.HTTP_200_OK)

class FoodKindlPeopleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current_user = request.user
        current_profile, _ = Profile.objects.get_or_create(user=current_user)
        blocked_by_me_ids = set(current_profile.blocked_users.values_list('id', flat=True))
        blocked_me_ids = set(Profile.objects.filter(blocked_users=current_user).values_list('user_id', flat=True))
        excluded_ids = blocked_by_me_ids | blocked_me_ids | {current_user.id}
        members = User.objects.filter(is_active=True, is_staff=False, is_superuser=False, profile__isnull=False, profile__account_type='member', profile__member_profile_enabled=True).exclude(id__in=excluded_ids).select_related('profile').distinct()
        results = []
        for member in members:
            profile = member.profile
            match = calculate_food_match(current_profile, profile)
            full_name = member.get_full_name().strip() or member.username or member.email or f'FoodKindl member {member.id}'
            profile_photo = profile.profile_image_1_url or ''
            if not profile_photo and profile.profile_image_1:
                try:
                    profile_photo = request.build_absolute_uri(profile.profile_image_1.url)
                except Exception:
                    profile_photo = ''
            location_parts = [profile.locality, profile.city]
            location_label = ', '.join([item.strip() for item in location_parts if item and item.strip()])
            results.append({'id': member.id, 'user_id': member.id, 'full_name': full_name, 'username': member.username, 'profile_photo': profile_photo, 'location_label': location_label, 'is_verified': bool(profile.is_verified), 'food_match_percentage': match.get('score', 0)})
        results.sort(key=lambda item: (item.get('food_match_percentage', 0), item.get('is_verified', False)), reverse=True)
        return Response({'count': len(results), 'results': results[:20]}, status=status.HTTP_200_OK)

class BlockedMembersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        blocked_members = profile.blocked_users.select_related('profile').order_by('first_name', 'last_name', 'id')
        serializer = BlockedMemberSerializer(blocked_members, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class BlockMemberView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        if request.user.id == user_id:
            return Response({'detail': 'You cannot block yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            member = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if profile.blocked_users.filter(id=member.id).exists():
            return Response({'detail': 'Member is already blocked.', 'blocked_user_id': member.id}, status=status.HTTP_200_OK)
        profile.blocked_users.add(member)
        return Response({'detail': 'Member blocked successfully.', 'blocked_user_id': member.id}, status=status.HTTP_200_OK)

class UnblockMemberView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        try:
            member = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.blocked_users.remove(member)
        return Response({'detail': 'Member unblocked successfully.', 'blocked_user_id': member.id}, status=status.HTTP_200_OK)

class BlockStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        if request.user.id == user_id:
            return Response({'blocked_by_me': False, 'interaction_blocked': False}, status=status.HTTP_200_OK)
        try:
            member = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        blocked_by_me = profile.blocked_users.filter(id=member.id).exists()
        interaction_blocked = users_are_blocked(request.user, member)
        return Response({'blocked_by_me': blocked_by_me, 'interaction_blocked': interaction_blocked}, status=status.HTTP_200_OK)
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import ForgotPasswordSerializer, ResetPasswordSerializer
User = get_user_model()

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            return Response({'detail': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return Response({'detail': 'If an account exists with that email address, a password reset link has been sent.'}, status=status.HTTP_200_OK)
        try:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8888').rstrip('/')
            reset_url = f'{frontend_url}/reset-password/{uid}/{token}'
            first_name = user.first_name or 'FoodKindl Member'
            subject = 'Reset your FoodKindl password'
            message = f'\n\nHi {first_name},\n\n\n\nWe received a request to reset your FoodKindl password.\n\n\n\nClick the link below to create a new password:\n\n\n\n{reset_url}\n\n\n\nThis link will expire after a limited period.\n\n\n\nIf you did not request a password reset, you can ignore this email.\n\n\n\nRegards,\n\nFoodKindl\n\n'
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
            print('Password reset email sent to:', user.email)
        except Exception as error:
            print('PASSWORD RESET EMAIL ERROR:', repr(error))
            return Response({'detail': 'Unable to send password reset email.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'detail': 'If an account exists with that email address, a password reset link has been sent.'}, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        new_password = serializer.validated_data['password']
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Your password has been reset successfully.'}, status=status.HTTP_200_OK)

class VerificationStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        verified = profile.is_phone_verified
        notification = None if verified else {'show': True, 'type': 'phone_verification_required', 'severity': 'info', 'title': 'Verify your mobile number', 'message': 'Verify your phone through SMS to enable mobile OTP login.', 'primary_action_text': 'Verify phone', 'primary_action_url': '/settings/mobile', 'support_action_text': None, 'support_action_url': None}
        return Response({'verification_method': 'sms_otp', 'verification_status': 'phone_verified' if verified else 'phone_not_verified', 'is_verified': verified, 'phone_verified': verified, 'phone_number_masked': '******' + profile.phone_number[-4:] if profile.phone_number else '', 'phone_verified_at': profile.phone_verified_at, 'notification': notification})
