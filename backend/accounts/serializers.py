from django.db.models import Q

from django.conf import settings

from django.contrib.auth import authenticate

from django.contrib.auth.models import User

from django.db import transaction

from rest_framework import serializers

from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile



from django.contrib.auth import get_user_model

from django.contrib.auth.password_validation import validate_password

from django.core.exceptions import ValidationError as DjangoValidationError

from django.utils.encoding import force_str

from django.utils.http import urlsafe_base64_decode

from django.contrib.auth.tokens import default_token_generator

from rest_framework import serializers

User = get_user_model()





class ProfileSerializer(serializers.ModelSerializer):

    phone_verified = serializers.BooleanField(source='is_phone_verified', read_only=True)

    is_verified = serializers.BooleanField(source='is_phone_verified', read_only=True)

    verification_status = serializers.SerializerMethodField()

    blocked_users_count = serializers.SerializerMethodField()



    class Meta:

        model = Profile

        fields = ('bio', 'city', 'locality', 'postcode', 'college_workplace', 'role', 'profile_visibility', 'account_type', 'member_profile_enabled', 'preferred_portal', 'interests', 'favorite_cuisines', 'food_connection_preferences', 'gender', 'dietary_preference', 'women_only_mode', 'blocked_users_count', 'profile_image_1', 'profile_image_2', 'profile_image_3', 'profile_image_1_blob_key', 'profile_image_1_url', 'profile_image_2_blob_key', 'profile_image_2_url', 'profile_image_3_blob_key', 'profile_image_3_url', 'is_verified', 'phone_number', 'phone_verified_at', 'phone_verified', 'verification_status')

        read_only_fields = ('blocked_users_count', 'is_verified', 'phone_number', 'phone_verified_at', 'phone_verified', 'verification_status', 'account_type', 'member_profile_enabled', 'preferred_portal')

        extra_kwargs = {'interests': {'required': False, 'allow_blank': True}, 'favorite_cuisines': {'required': False, 'allow_blank': True}, 'food_connection_preferences': {'required': False, 'allow_blank': True}, 'profile_image_1': {'required': False, 'allow_null': True}, 'profile_image_2': {'required': False, 'allow_null': True}, 'profile_image_3': {'required': False, 'allow_null': True}, 'profile_image_1_blob_key': {'required': False, 'allow_blank': True}, 'profile_image_1_url': {'required': False, 'allow_blank': True}, 'profile_image_2_blob_key': {'required': False, 'allow_blank': True}, 'profile_image_2_url': {'required': False, 'allow_blank': True}, 'profile_image_3_blob_key': {'required': False, 'allow_blank': True}, 'profile_image_3_url': {'required': False, 'allow_blank': True}}



    def get_blocked_users_count(self, obj):

        return obj.blocked_users.count()



    def clean_comma_separated_value(self, value):

        if not value:

            return ''

        values = [item.strip() for item in str(value).replace(';', ',').split(',') if item.strip()]

        unique_values = list(dict.fromkeys(values))

        return ','.join(unique_values)



    def validate_interests(self, value):

        return self.clean_comma_separated_value(value)



    def validate_favorite_cuisines(self, value):

        return self.clean_comma_separated_value(value)



    def validate_food_connection_preferences(self, value):

        return self.clean_comma_separated_value(value)



    def validate_profile_image_1(self, uploaded_file):

        return self.validate_profile_image(uploaded_file)



    def validate_profile_image_2(self, uploaded_file):

        return self.validate_profile_image(uploaded_file)



    def validate_profile_image_3(self, uploaded_file):

        return self.validate_profile_image(uploaded_file)



    def validate_profile_image(self, uploaded_file):

        if not uploaded_file:

            return uploaded_file

        maximum_size = 10 * 1024 * 1024

        if uploaded_file.size > maximum_size:

            raise serializers.ValidationError('Profile image must be smaller than 10 MB.')

        allowed_types = {'image/jpeg', 'image/png', 'image/webp'}

        content_type = getattr(uploaded_file, 'content_type', '')

        if content_type and content_type not in allowed_types:

            raise serializers.ValidationError('Upload a JPG, PNG, or WebP image.')

        return uploaded_file



    def get_verification_status(self, obj):

        return 'phone_verified' if obj.is_phone_verified else 'phone_not_verified'



    def to_representation(self, instance):

        data = super().to_representation(instance)

        request = self.context.get('request')

        if not request or not request.user.is_authenticated or request.user.pk != instance.user_id:

            data.pop('phone_number', None)

            data.pop('phone_verified_at', None)

        return data



    @transaction.atomic

    def update(self, instance, validated_data):

        for field in ('phone_number', 'phone_verified_at', 'is_verified'):

            validated_data.pop(field, None)

        return super().update(instance, validated_data)



class UserSerializer(serializers.ModelSerializer):

    profile = ProfileSerializer(read_only=True)

    full_name = serializers.SerializerMethodField()



    class Meta:

        model = User

        fields = ('id', 'first_name', 'last_name', 'full_name', 'email', 'profile')



    def get_full_name(self, obj):

        return obj.get_full_name().strip() or 'FoodKindl Member'



class FoodMatchMemberSerializer(serializers.ModelSerializer):

    user_id = serializers.IntegerField(source='id', read_only=True)

    member_id = serializers.IntegerField(source='id', read_only=True)

    full_name = serializers.SerializerMethodField()

    profile_image = serializers.SerializerMethodField()

    city = serializers.CharField(source='profile.city', read_only=True)

    locality = serializers.CharField(source='profile.locality', read_only=True)

    dietary_preference = serializers.CharField(source='profile.dietary_preference', read_only=True)

    interests = serializers.CharField(source='profile.interests', read_only=True)

    favorite_cuisines = serializers.CharField(source='profile.favorite_cuisines', read_only=True)

    food_connection_preferences = serializers.CharField(source='profile.food_connection_preferences', read_only=True)

    is_verified = serializers.BooleanField(source='profile.is_phone_verified', read_only=True)

    profile_visibility = serializers.CharField(source='profile.profile_visibility', read_only=True)

    is_private = serializers.SerializerMethodField()

    verification_status = serializers.SerializerMethodField()



    class Meta:

        model = User

        fields = ('id', 'user_id', 'member_id', 'first_name', 'last_name', 'full_name', 'profile_image', 'city', 'locality', 'dietary_preference', 'interests', 'favorite_cuisines', 'food_connection_preferences', 'is_verified', 'verification_status', 'profile_visibility', 'is_private')



    def get_is_private(self, obj):

        profile = getattr(obj, 'profile', None)

        return bool(profile and profile.profile_visibility == 'private')



    def get_full_name(self, obj):

        return obj.get_full_name().strip() or 'FoodKindl Member'



    def get_profile_image(self, obj):

        profile = getattr(obj, 'profile', None)

        if not profile:

            return None

        if profile.profile_image_1_url:

            return profile.profile_image_1_url

        if profile.profile_image_1:

            try:

                image_url = profile.profile_image_1.url

            except ValueError:

                return None

            request = self.context.get('request')

            if request:

                return request.build_absolute_uri(image_url)

            return image_url

        return None



    def get_verification_status(self, obj):

        profile = getattr(obj, 'profile', None)

        return 'phone_verified' if profile and profile.is_phone_verified else 'phone_not_verified'



class BlockedMemberSerializer(serializers.ModelSerializer):

    full_name = serializers.SerializerMethodField()

    profile_image = serializers.SerializerMethodField()



    class Meta:

        model = User

        fields = ('id', 'first_name', 'last_name', 'full_name', 'profile_image')



    def get_full_name(self, obj):

        return obj.get_full_name().strip() or 'FoodKindl Member'



    def get_profile_image(self, obj):

        profile = getattr(obj, 'profile', None)

        if not profile:

            return None

        if profile.profile_image_1_url:

            return profile.profile_image_1_url

        if profile.profile_image_1:

            try:

                image_url = profile.profile_image_1.url

            except ValueError:

                return None

            request = self.context.get('request')

            if request:

                return request.build_absolute_uri(image_url)

            return image_url

        return None



class RegisterSerializer(serializers.ModelSerializer):

    # ========================================================
    # REGISTRATION FIELDS
    # ========================================================

    full_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=150,
        trim_whitespace=True,
    )

    email = serializers.EmailField(
        required=True,
        allow_blank=False,
    )

    phone_number = serializers.CharField(
        required=False,
        write_only=True,
        max_length=15,
        allow_blank=True,
        default="",
    )

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    account_type = serializers.ChoiceField(
        choices=["member", "partner"],
        write_only=True,
        default="member",
    )

    class Meta:
        model = User

        fields = (
            "id",
            "full_name",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "password",
            "account_type",
        )

        read_only_fields = ("id",)

        extra_kwargs = {
            "first_name": {
                "required": False,
                "allow_blank": True,
            },
            "last_name": {
                "required": False,
                "allow_blank": True,
            },
        }

    # ========================================================
    # EMAIL VALIDATION
    # ========================================================

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(
            Q(email__iexact=email) |
            Q(username__iexact=email)
        ).exists():

            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    # ========================================================
    # PHONE VALIDATION
    # ========================================================

    def validate_phone_number(self, value):
        phone = str(value or "").strip()

        # Partners can register without a phone number.
        if not phone:
            return ""

        phone = (
            phone.replace(" ", "")
            .replace("-", "")
            .replace("(", "")
            .replace(")", "")
        )

        if phone.startswith("+91"):
            phone = phone[3:]

        elif len(phone) == 12 and phone.startswith("91"):
            phone = phone[2:]

        import re

        if not re.fullmatch(r"[6-9][0-9]{9}", phone):
            raise serializers.ValidationError(
                "Enter a valid Indian 10-digit mobile number."
            )

        if Profile.objects.filter(
            phone_number=phone
        ).exists():
            raise serializers.ValidationError(
                "This phone number is already registered."
            )

        return phone

    # ========================================================
    # FULL NAME VALIDATION
    # ========================================================

    def validate_full_name(self, value):
        value = " ".join(value.split())

        if value and len(value) > 150:
            raise serializers.ValidationError(
                "Full name is too long."
            )

        return value

    # ========================================================
    # ACCOUNT TYPE VALIDATION
    # ========================================================

    def validate(self, attrs):

        account_type = attrs.get(
            "account_type", "member"
        )

        first_name = (
            attrs.get("first_name") or ""
        ).strip()

        last_name = (
            attrs.get("last_name") or ""
        ).strip()

        full_name = (
            attrs.get("full_name") or ""
        ).strip()

        phone_number = (
            attrs.get("phone_number") or ""
        ).strip()

        # Construct full name for partner registration.
        if not full_name:
            full_name = " ".join(
                filter(None, [first_name, last_name])
            )

        full_name = " ".join(full_name.split())

        if len(full_name) < 2:
            raise serializers.ValidationError({
                "full_name": "Please enter your full name."
            })

        if len(full_name) > 150:
            raise serializers.ValidationError({
                "full_name": "Full name is too long."
            })

        # -----------------------------------------------
        # MEMBER REQUIREMENTS
        # -----------------------------------------------

        if account_type == "member":

            if not phone_number:
                raise serializers.ValidationError({
                    "phone_number":
                        "Phone number is required for members."
                })

        # -----------------------------------------------
        # PARTNER REQUIREMENTS
        # -----------------------------------------------

        elif account_type == "partner":

            if not first_name:
                raise serializers.ValidationError({
                    "first_name": "First name is required."
                })

            if not last_name:
                raise serializers.ValidationError({
                    "last_name": "Last name is required."
                })

            # Phone number is optional for partners.

        # -----------------------------------------------
        # PASSWORD VALIDATION
        # -----------------------------------------------

        name_parts = full_name.split(maxsplit=1)

        candidate = User(
            username=attrs["email"],
            email=attrs["email"],
            first_name=name_parts[0],
            last_name=(
                name_parts[1]
                if len(name_parts) > 1
                else ""
            ),
        )

        try:
            validate_password(
                attrs["password"],
                user=candidate,
            )

        except DjangoValidationError as error:
            raise serializers.ValidationError({
                "password": list(error.messages)
            })

        attrs["full_name"] = full_name
        attrs["phone_number"] = phone_number

        return attrs

    # ========================================================
    # CREATE USER
    # ========================================================

    @transaction.atomic
    def create(self, validated_data):

        full_name = validated_data.pop(
            "full_name"
        ).strip()

        name_parts = full_name.split(maxsplit=1)

        first_name = name_parts[0]

        last_name = (
            name_parts[1]
            if len(name_parts) > 1
            else ""
        )

        account_type = validated_data.pop(
            "account_type", "member"
        )

        password = validated_data.pop("password")

        # Optional for Partner accounts.
        phone_number = validated_data.pop(
            "phone_number", ""
        )

        email = validated_data["email"]

        # -----------------------------------------------
        # CREATE AUTH USER
        # -----------------------------------------------

        user = User(
            username=email,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

        user.set_password(password)
        user.save()

        # -----------------------------------------------
        # CREATE OR GET PROFILE
        # -----------------------------------------------

        profile, _ = Profile.objects.get_or_create(
            user=user
        )

        profile.phone_number = phone_number
        profile.phone_verified_at = None

        # -----------------------------------------------
        # RESTAURANT PARTNER ACCOUNT
        # -----------------------------------------------

        if account_type == "partner":

            profile.account_type = "partner"

            profile.member_profile_enabled = False

            profile.preferred_portal = "restaurant"

        # -----------------------------------------------
        # FOODKINDL MEMBER ACCOUNT
        # -----------------------------------------------

        else:

            profile.account_type = "member"

            profile.member_profile_enabled = True

            profile.preferred_portal = "member"

        # -----------------------------------------------
        # EMAIL VERIFICATION
        # -----------------------------------------------

        profile.email_verified_at = None

        profile.save()

        # Verification email is sent by RegisterView.
        # Registration does not issue JWT tokens.

        return user




class EmailLoginSerializer(serializers.Serializer):

    email = serializers.EmailField(write_only=True)

    password = serializers.CharField(

        write_only=True,

        trim_whitespace=False,

    )



    def validate(self, attrs):

        email = attrs["email"].strip().lower()

        password = attrs["password"]



        try:

            database_user = User.objects.get(email__iexact=email)

        except (User.DoesNotExist, User.MultipleObjectsReturned):

            raise serializers.ValidationError({

                "detail": "Invalid email or password.",

            })



        user = authenticate(

            request=self.context.get("request"),

            username=database_user.get_username(),

            password=password,

        )



        if user is None or not user.is_active:

            raise serializers.ValidationError({

                "detail": "Invalid email or password.",

            })



        profile, _ = Profile.objects.get_or_create(user=user)



        # Check verification only after successful authentication.

        if not profile.is_email_verified:

            raise serializers.ValidationError({

                "detail": "Verify your email before logging in.",

                "code": "email_not_verified",

            })



        refresh = RefreshToken.for_user(user)



        return {

            "refresh": str(refresh),

            "access": str(refresh.access_token),

            "user": UserSerializer(

                user,

                context=self.context,

            ).data,

        }







class ForgotPasswordSerializer(serializers.Serializer):

    email = serializers.EmailField()



    def validate_email(self, value):

        return value.strip().lower()



class ResetPasswordSerializer(serializers.Serializer):

    uid = serializers.CharField()

    token = serializers.CharField()

    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'}, trim_whitespace=False)

    confirm_password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'}, trim_whitespace=False)



    def validate(self, attrs):

        password = attrs.get('password')

        confirm_password = attrs.get('confirm_password')

        if password != confirm_password:

            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})

        try:

            user_id = force_str(urlsafe_base64_decode(attrs['uid']))

            user = User.objects.filter(pk=user_id).first()

        except Exception:

            user = None

        if not user:

            raise serializers.ValidationError({'detail': 'Invalid password reset link.'})

        if not default_token_generator.check_token(user, attrs['token']):

            raise serializers.ValidationError({'detail': 'This password reset link is invalid or has expired.'})

        try:

            validate_password(password, user=user)

        except DjangoValidationError as error:

            raise serializers.ValidationError({'password': list(error.messages)})

        attrs['user'] = user

        return attrs
