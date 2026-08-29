import json
import os
import re
import traceback

import requests

from django.contrib.auth.models import User
from django.db.models import F, Prefetch, Q, Sum
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import (
    Connection,
    Conversation,
    DirectMessage,
    FoodListing,
    Invitation,
    Post,
    PostComment,
    PostReaction,
    PostView,
    SavedPost,
    SharedPost,
)
from .permissions import IsOwnerOrReadOnly, IsVerifiedMember
from .serializers import (
    ConnectionSerializer,
    ConversationSerializer,
    DirectMessageSerializer,
    FoodListingSerializer,
    InvitationSerializer,
    MemberSerializer,
    PostCommentSerializer,
    PostSerializer,
    SharedPostSerializer,
)


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer

    permission_classes = [
        permissions.IsAuthenticated,
        IsVerifiedMember,
        IsOwnerOrReadOnly,
    ]

    # JSON is now the preferred format because
    # Netlify Blob uploads return URLs / keys.
    #
    # Multipart/FormParser are retained so older
    # Django-uploaded posts still continue working.
    parser_classes = [
        JSONParser,
        MultiPartParser,
        FormParser,
    ]

    def base_queryset(self):
        return (
            Post.objects
            .select_related(
                "author",
                "author__profile",
            )
            .prefetch_related(
                "reactions",
                "saved_by",
                "unique_views",
                "community_shares",
                Prefetch(
                    "comments",
                    queryset=(
                        PostComment.objects
                        .select_related(
                            "author",
                            "author__profile",
                        )
                    ),
                ),
            )
        )

    def get_queryset(self):
        queryset = (
            self.base_queryset()
            .order_by("-created_at")
        )

        if (
            self.action == "list"
            and self.request.user.is_authenticated
        ):
            queryset = queryset.exclude(
                author=self.request.user
            )

        return queryset

    def perform_create(self, serializer):
        """
        Do NOT upload media here.

        React uploads the file to Netlify Blob first.

        Django receives fields such as:

        image_blob_key
        image_url
        image_original_name
        image_content_type

        video_blob_key
        video_url
        video_original_name
        video_content_type
        """

        serializer.save(
            author=self.request.user
        )

    def perform_update(self, serializer):
        serializer.save()

    @action(
        detail=False,
        methods=["get"],
        url_path="my-posts",
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def my_posts(self, request):
        posts = (
            self.base_queryset()
            .filter(
                author=request.user
            )
            .order_by("-created_at")
        )

        serializer = PostSerializer(
            posts,
            many=True,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="reposts",
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def reposts(self, request):
        reposts = (
            SharedPost.objects
            .select_related(
                "shared_by",
                "shared_by__profile",
                "original_post",
                "original_post__author",
                "original_post__author__profile",
            )
            .prefetch_related(
                "original_post__reactions",
                "original_post__saved_by",
                "original_post__unique_views",
                "original_post__community_shares",
                "original_post__comments",
            )
            .exclude(
                shared_by=request.user
            )
            .order_by("-created_at")
        )

        serializer = SharedPostSerializer(
            reposts,
            many=True,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="user-reposts",
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def user_reposts(
        self,
        request,
    ):
        user_id = (
            request.query_params.get(
                "user_id"
            )
        )

        if not user_id:
            return Response(
                {
                    "user_id":
                        "User ID is required."
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        reposts = (
            SharedPost.objects
            .filter(
                shared_by_id=user_id
            )
            .select_related(
                "shared_by",
                "shared_by__profile",
                "original_post",
                "original_post__author",
                "original_post__author__profile",
            )
            .prefetch_related(
                "original_post__reactions",
                "original_post__saved_by",
                "original_post__unique_views",
                "original_post__community_shares",
                "original_post__comments",
            )
            .order_by("-created_at")
        )

        serializer = SharedPostSerializer(
            reposts,
            many=True,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def react(
        self,
        request,
        pk=None,
    ):
        post = self.get_object()

        reaction_type = (
            request.data.get(
                "reaction_type"
            )
        )

        valid_reactions = {
            "like",
            "love",
            "haha",
            "wow",
            "sad",
            "angry",
        }

        if (
            reaction_type
            not in valid_reactions
        ):
            return Response(
                {
                    "detail":
                        "Invalid reaction type."
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        reaction, _ = (
            PostReaction.objects
            .update_or_create(
                post=post,
                user=request.user,
                defaults={
                    "reaction_type":
                        reaction_type,
                },
            )
        )

        serializer = (
            self.get_serializer(
                post
            )
        )

        return Response(
            {
                "my_reaction":
                    reaction.reaction_type,

                "reaction_count":
                    serializer.data[
                        "reaction_count"
                    ],

                "reaction_summary":
                    serializer.data[
                        "reaction_summary"
                    ],
            }
        )

    @action(
        detail=True,
        methods=["delete"],
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def remove_reaction(
        self,
        request,
        pk=None,
    ):
        post = self.get_object()

        PostReaction.objects.filter(
            post=post,
            user=request.user,
        ).delete()

        serializer = (
            self.get_serializer(post)
        )

        return Response(
            {
                "my_reaction": None,

                "reaction_count":
                    serializer.data[
                        "reaction_count"
                    ],

                "reaction_summary":
                    serializer.data[
                        "reaction_summary"
                    ],
            }
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def toggle_save(
        self,
        request,
        pk=None,
    ):
        post = self.get_object()

        saved_post, created = (
            SavedPost.objects
            .get_or_create(
                post=post,
                user=request.user,
            )
        )

        if not created:
            saved_post.delete()

        return Response(
            {
                "saved": created,
            }
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.AllowAny
        ],
    )
    def record_view(
        self,
        request,
        pk=None,
    ):
        post = self.get_object()

        if request.user.is_authenticated:
            _, created = (
                PostView.objects
                .get_or_create(
                    post=post,
                    user=request.user,
                )
            )

        else:
            if (
                not request
                .session
                .session_key
            ):
                request.session.create()

            session_key = (
                request
                .session
                .session_key
            )

            _, created = (
                PostView.objects
                .get_or_create(
                    post=post,
                    user=None,
                    session_key=session_key,
                )
            )

        return Response(
            {
                "view_recorded":
                    created,

                "unique_view_count":
                    post
                    .unique_views
                    .count(),
            }
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def share_to_community(
        self,
        request,
        pk=None,
    ):
        post = self.get_object()

        message = (
            request.data.get(
                "message",
                "",
            )
            or ""
        ).strip()

        if len(message) > 2000:
            return Response(
                {
                    "message":
                        (
                            "Repost message "
                            "cannot exceed "
                            "2,000 characters."
                        )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        shared_post = (
            SharedPost.objects.create(
                original_post=post,
                shared_by=request.user,
                message=message,
            )
        )

        Post.objects.filter(
            pk=post.pk
        ).update(
            share_count=(
                F("share_count") + 1
            )
        )

        serializer = (
            SharedPostSerializer(
                shared_post,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            serializer.data,
            status=(
                status
                .HTTP_201_CREATED
            ),
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def add_comment(
        self,
        request,
        pk=None,
    ):
        post = self.get_object()

        serializer = (
            PostCommentSerializer(
                data=request.data,
                context={
                    "request": request,
                },
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        comment = serializer.save(
            post=post,
            author=request.user,
        )

        return Response(
            PostCommentSerializer(
                comment,
                context={
                    "request": request,
                },
            ).data,
            status=(
                status
                .HTTP_201_CREATED
            ),
        )

class FoodListingViewSet(
    viewsets.ModelViewSet
):
    serializer_class = (
        FoodListingSerializer
    )

    permission_classes = [
        permissions
        .IsAuthenticatedOrReadOnly,

        IsOwnerOrReadOnly,
    ]

    parser_classes = [
        JSONParser,
        MultiPartParser,
        FormParser,
    ]

    queryset = (
        FoodListing.objects
        .select_related(
            "owner",
            "owner__profile",
            "claimed_by",
            "claimed_by__profile",
        )
        .order_by("-created_at")
    )

    def perform_create(
        self,
        serializer,
    ):
        serializer.save(
            owner=self.request.user
        )

    def perform_update(
        self,
        serializer,
    ):
        serializer.save()

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        """
        Image has already been uploaded
        to Netlify Blob by React.

        Expected optional fields:

        image_blob_key
        image_url
        image_original_name
        image_content_type
        """

        serializer = (
            self.get_serializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        listing = serializer.save(
            owner=request.user
        )

        conversation = (
            Conversation.objects.create(
                conversation_type=(
                    "food_group"
                ),

                title=(
                    f"Food Sharing: "
                    f"{listing.title}"
                ),

                food_listing=listing,

                is_active=True,
            )
        )

        registered_users = (
            User.objects.filter(
                is_active=True,
                is_staff=False,
                is_superuser=False,
            )
        )

        conversation.participants.set(
            registered_users
        )

        conversation_serializer = (
            ConversationSerializer(
                conversation,
                context={
                    "request": request,
                },
            )
        )

        listing_serializer = (
            self.get_serializer(
                listing,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            {
                "listing":
                    listing_serializer.data,

                "group_conversation":
                    conversation_serializer.data,

                "message":
                    (
                        "Food listing "
                        "published and "
                        "group chat created."
                    ),
            },
            status=(
                status
                .HTTP_201_CREATED
            ),
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def claim(
        self,
        request,
        pk=None,
    ):
        listing = self.get_object()

        if (
            listing.owner_id ==
            request.user.id
        ):
            return Response(
                {
                    "detail":
                        (
                            "You cannot reserve "
                            "your own listing."
                        )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if (
            listing.status !=
            "available"
        ):
            return Response(
                {
                    "detail":
                        (
                            "This listing is "
                            "no longer available."
                        )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        listing.status = "reserved"

        listing.claimed_by = (
            request.user
        )

        listing.save(
            update_fields=[
                "status",
                "claimed_by",
            ]
        )

        conversation = getattr(
            listing,
            "group_conversation",
            None,
        )

        if conversation:
            conversation.participants.add(
                request.user
            )

        return Response(
            self.get_serializer(
                listing,
                context={
                    "request": request,
                },
            ).data,
            status=(
                status.HTTP_200_OK
            ),
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
        url_path="group-chat",
    )
    def group_chat(
        self,
        request,
        pk=None,
    ):
        listing = self.get_object()

        if (
            listing.status ==
            "collected"
        ):
            return Response(
                {
                    "detail":
                        (
                            "This group chat "
                            "has expired because "
                            "the food was collected."
                        )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        conversation = getattr(
            listing,
            "group_conversation",
            None,
        )

        if not conversation:
            conversation = (
                Conversation.objects
                .create(
                    conversation_type=(
                        "food_group"
                    ),

                    title=(
                        f"Food Sharing: "
                        f"{listing.title}"
                    ),

                    food_listing=listing,

                    is_active=True,
                )
            )

            conversation.participants.set(
                User.objects.filter(
                    is_active=True,
                    is_staff=False,
                    is_superuser=False,
                )
            )

        if not conversation.is_active:
            return Response(
                {
                    "detail":
                        (
                            "This food group "
                            "chat is closed."
                        )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        conversation.participants.add(
            request.user
        )

        return Response(
            ConversationSerializer(
                conversation,
                context={
                    "request": request,
                },
            ).data,
            status=(
                status.HTTP_200_OK
            ),
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
        url_path="mark-collected",
    )
    def mark_collected(
        self,
        request,
        pk=None,
    ):
        listing = self.get_object()

        if (
            listing.owner_id !=
            request.user.id
        ):
            return Response(
                {
                    "detail":
                        (
                            "Only the listing owner "
                            "can mark the food "
                            "as collected."
                        )
                },
                status=(
                    status
                    .HTTP_403_FORBIDDEN
                ),
            )

        if (
            listing.status !=
            "reserved"
        ):
            return Response(
                {
                    "detail":
                        (
                            "Only a reserved listing "
                            "can be marked as collected."
                        )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if (
            listing.claimed_by_id
            is None
        ):
            return Response(
                {
                    "detail":
                        (
                            "This listing has not "
                            "been reserved by "
                            "another member."
                        )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        listing.status = (
            "collected"
        )

        listing.save(
            update_fields=[
                "status"
            ]
        )

        conversation = getattr(
            listing,
            "group_conversation",
            None,
        )

        if conversation:
            conversation.is_active = (
                False
            )

            conversation.save(
                update_fields=[
                    "is_active",
                    "updated_at",
                ]
            )

        return Response(
            self.get_serializer(
                listing,
                context={
                    "request": request,
                },
            ).data,
            status=(
                status.HTTP_200_OK
            ),
        )

class InvitationViewSet(viewsets.ModelViewSet):
    serializer_class = InvitationSerializer
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            Invitation.objects
            .filter(
                Q(sender=self.request.user)
                | Q(receiver=self.request.user)
            )
            .select_related(
                "sender",
                "sender__profile",
                "receiver",
                "receiver__profile",
            )
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(
            sender=self.request.user
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def respond(self, request, pk=None):
        invitation = self.get_object()

        if invitation.receiver != request.user:
            return Response(
                {
                    "detail": (
                        "Only the invitation receiver "
                        "can respond."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        response_status = request.data.get("status")

        if response_status not in (
            "accepted",
            "declined",
        ):
            return Response(
                {
                    "detail": (
                        "Status must be accepted or declined."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if invitation.status != "pending":
            return Response(
                {
                    "detail": (
                        "This invitation has already "
                        "been responded to."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.status = response_status
        invitation.save(
            update_fields=["status"]
        )

        serializer = self.get_serializer(
            invitation,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def complete(self, request, pk=None):
        invitation = self.get_object()

        if request.user not in (
            invitation.sender,
            invitation.receiver,
        ):
            return Response(
                {
                    "detail": (
                        "You do not have permission to "
                        "complete this invitation."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if invitation.status != "accepted":
            return Response(
                {
                    "detail": (
                        "Only accepted invitations can "
                        "be marked as completed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.status = "completed"
        invitation.save(
            update_fields=["status"]
        )

        serializer = self.get_serializer(
            invitation,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def stats(request):
    active_members = User.objects.filter(
        is_active=True
    ).count()

    meals_shared = Invitation.objects.filter(
        status="completed"
    ).count()

    waste_reduced = (
        FoodListing.objects
        .filter(status="collected")
        .aggregate(total=Sum("quantity_kg"))
        .get("total")
        or 0
    )

    return Response(
        {
            "members": active_members,
            "meals_shared": meals_shared,
            "waste_reduced_kg": float(
                waste_reduced
            ),
        },
        status=status.HTTP_200_OK,
    )


class MemberListView(generics.ListAPIView):
    serializer_class = MemberSerializer

    permission_classes = [
        permissions.IsAuthenticated,
        IsVerifiedMember,
    ]

    def get_queryset(self):
        queryset = (
            User.objects
            .filter(
                is_active=True,

                # Only normal users
                is_staff=False,
                is_superuser=False,
            )
            .exclude(
                pk=self.request.user.pk
            )
            .select_related("profile")
            .order_by(
                "first_name",
                "last_name",
                "email",
            )
        )

        q = (
            self.request
            .query_params
            .get("q", "")
            .strip()
        )

        # No search entered:
        # return all normal FoodKindl members.
        if not q:
            return queryset

        normalized_q = (
            q.lower()
            .strip()
            .replace("-", "_")
            .replace(" ", "_")
        )

        queryset = queryset.filter(
            Q(
                first_name__icontains=q
            )
            |
            Q(
                last_name__icontains=q
            )
            |
            Q(
                email__icontains=q
            )
            |
            Q(
                profile__postcode__icontains=q
            )
            |
            Q(
                profile__city__icontains=q
            )
            |
            Q(
                profile__locality__icontains=q
            )
            |
            Q(
                profile__college_workplace__icontains=q
            )
            |
            Q(
                profile__role__icontains=q
            )
            |
            Q(
                profile__interests__icontains=q
            )
            |
            Q(
                profile__dietary_preference__icontains=normalized_q
            )
        ).distinct()

        return queryset


class MemberDetailView(generics.RetrieveAPIView):
    serializer_class = MemberSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsVerifiedMember,
    ]
    lookup_field = "pk"

    def get_queryset(self):
        return (
            User.objects
            .filter(is_active=True)
            .select_related("profile")
        )


class ConnectionViewSet(viewsets.ModelViewSet):
    serializer_class = ConnectionSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsVerifiedMember,
    ]

    http_method_names = [
        "get",
        "post",
        "delete",
        "head",
        "options",
    ]

    def get_queryset(self):
        return (
            Connection.objects
            .filter(
                Q(sender=self.request.user)
                | Q(receiver=self.request.user)
            )
            .select_related(
                "sender",
                "sender__profile",
                "receiver",
                "receiver__profile",
            )
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save()

    @action(
        detail=False,
        methods=["get"],
    )
    def incoming(self, request):
        connections = self.get_queryset().filter(
            receiver=request.user,
            status="pending",
        )

        serializer = self.get_serializer(
            connections,
            many=True,
        )

        return Response(serializer.data)

    @action(
        detail=False,
        methods=["get"],
    )
    def sent(self, request):
        connections = self.get_queryset().filter(
            sender=request.user,
            status="pending",
        )

        serializer = self.get_serializer(
            connections,
            many=True,
        )

        return Response(serializer.data)

    @action(
        detail=False,
        methods=["get"],
    )
    def accepted(self, request):
        connections = self.get_queryset().filter(
            status="accepted",
        )

        serializer = self.get_serializer(
            connections,
            many=True,
        )

        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
    )
    def accept(self, request, pk=None):
        connection = self.get_object()

        if connection.receiver != request.user:
            return Response(
                {
                    "detail": (
                        "Only the receiver can accept "
                        "this connection request."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if connection.status != "pending":
            return Response(
                {
                    "detail": (
                        "This request is no longer pending."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        connection.status = "accepted"
        connection.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(
                connection
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def decline(self, request, pk=None):
        connection = self.get_object()

        if connection.receiver != request.user:
            return Response(
                {
                    "detail": (
                        "Only the receiver can decline "
                        "this connection request."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if connection.status != "pending":
            return Response(
                {
                    "detail": (
                        "This request is no longer pending."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        connection.status = "declined"
        connection.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(
                connection
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def cancel(self, request, pk=None):
        connection = self.get_object()

        if connection.sender != request.user:
            return Response(
                {
                    "detail": (
                        "Only the sender can cancel "
                        "this request."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if connection.status != "pending":
            return Response(
                {
                    "detail": (
                        "Only pending requests "
                        "can be cancelled."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        connection.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def remove(self, request, pk=None):
        connection = self.get_object()

        if request.user not in (
            connection.sender,
            connection.receiver,
        ):
            return Response(
                {
                    "detail": (
                        "You cannot remove "
                        "this connection."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if connection.status != "accepted":
            return Response(
                {
                    "detail": (
                        "This connection is not active."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        connection.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsVerifiedMember,
    ]

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    def get_queryset(self):
        return (
            Conversation.objects
            .filter(participants=self.request.user)
            .prefetch_related(
                "participants",
                "participants__profile",
                "messages",
                "messages__sender",
                "messages__sender__profile",
            )
            .distinct()
            .order_by("-updated_at")
        )

    def create(self, request, *args, **kwargs):
        member_id = request.data.get("user_id")

        if not member_id:
            return Response(
                {
                    "user_id": [
                        "Select a member to message."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            member_id = int(member_id)
        except (TypeError, ValueError):
            return Response(
                {
                    "user_id": [
                        "Select a valid member."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            other_user = User.objects.get(
                id=member_id,
                is_active=True,
            )
        except User.DoesNotExist:
            return Response(
                {
                    "user_id": [
                        "This member was not found."
                    ]
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if other_user.id == request.user.id:
            return Response(
                {
                    "detail": (
                        "You cannot message yourself."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        required_participant_ids = {
            request.user.id,
            other_user.id,
        }

        candidate_conversations = (
            Conversation.objects
            .filter(
                conversation_type="direct",
                participants=request.user,
            )
            .filter(participants=other_user)
            .prefetch_related(
                "participants",
                "participants__profile",
            )
            .distinct()
            .order_by("-updated_at")
        )

        existing_conversation = None

        for candidate in candidate_conversations:
            participant_ids = set(
                candidate.participants.values_list(
                    "id",
                    flat=True,
                )
            )

            if participant_ids == required_participant_ids:
                existing_conversation = candidate
                break

        if existing_conversation:
            serializer = self.get_serializer(
                existing_conversation,
                context={"request": request},
            )

            return Response(
                serializer.data,
                status=status.HTTP_200_OK,
            )

        conversation = Conversation.objects.create(
            conversation_type="direct",
            title="",
            is_active=True,
        )

        conversation.participants.set(
            [
                request.user,
                other_user,
            ]
        )

        serializer = self.get_serializer(
            conversation,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="messages",
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def messages(self, request, pk=None):
        conversation = self.get_object()

        if request.method == "GET":
            message_queryset = (
                conversation.messages
                .select_related(
                    "sender",
                    "sender__profile",
                )
                .order_by("created_at")
            )

            (
                message_queryset
                .exclude(sender=request.user)
                .filter(is_read=False)
                .update(is_read=True)
            )

            serializer = DirectMessageSerializer(
                message_queryset,
                many=True,
                context={"request": request},
            )

            return Response(
                serializer.data,
                status=status.HTTP_200_OK,
            )

        if not conversation.is_active:
            return Response(
                {
                    "detail": (
                        "This conversation is no longer active."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DirectMessageSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        message = serializer.save(
            conversation=conversation,
            sender=request.user,
        )

        conversation.save(
            update_fields=["updated_at"]
        )

        response_serializer = DirectMessageSerializer(
            message,
            context={"request": request},
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="unread-count",
        permission_classes=[
            permissions.IsAuthenticated,
            IsVerifiedMember,
        ],
    )
    def unread_count(self, request):
        unread_total = (
            DirectMessage.objects
            .filter(
                conversation__participants=request.user,
                is_read=False,
            )
            .exclude(sender=request.user)
            .distinct()
            .count()
        )

        return Response(
            {"unread_count": unread_total},
            status=status.HTTP_200_OK,
        )

# ============================================================
# FOODKINDL AI — INGREDIENT RECIPE BOOK
#
# This endpoint is different from the normal "dish name" recipe
# generator. The user sends ingredients only, for example:
#
#     ["garlic", "tomato", "onion"]
#
# FoodKindl AI decides the best realistic dish first and then
# returns the complete recipe. The user does NOT need to type
# "tomato curry" separately.
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


# ============================================================
# AI HELPERS
# ============================================================


def _normalize_ai_ingredients(value):
    """
    Accept either:
      ["tomato", "onion", "garlic"]

    or:
      "tomato, onion, garlic"

    and return a clean unique list.
    """

    if isinstance(value, str):
        raw_items = value.split(",")

    elif isinstance(value, list):
        raw_items = value

    else:
        return []


    cleaned = []

    seen = set()


    for item in raw_items:

        ingredient = (
            str(item)
            .strip()
        )


        if not ingredient:
            continue


        key = ingredient.lower()


        if key in seen:
            continue


        seen.add(key)

        cleaned.append(
            ingredient
        )


    return cleaned


def _clean_ai_json_text(content):
    """
    Remove Markdown code fences if the provider returns them.
    """

    content = (
        str(content or "")
        .strip()
    )


    if content.startswith("```"):

        content = re.sub(
            r"^```(?:json)?\s*",
            "",
            content,
            flags=re.IGNORECASE,
        )

        content = re.sub(
            r"\s*```$",
            "",
            content,
        )


    return content.strip()


def _get_ai_provider_error(response):
    """
    Try to extract a useful provider error without exposing
    credentials.
    """

    try:

        data = response.json()

        value = (
            data.get("error")
            or data.get("message")
            or data.get("detail")
            or response.text
        )


        if isinstance(
            value,
            dict,
        ):
            return (
                value.get("message")
                or str(value)
            )


        return str(value)


    except Exception:

        return (
            response.text
            or "Unknown AI provider error."
        )


def _build_ingredient_recipe_prompt(
    ingredients,
    dietary_preference="",
    notes="",
):
    """
    The most important part of this feature.

    The AI must choose the dish itself based on the user's
    available ingredients. It must NOT ask the user for a dish.
    """

    ingredient_text = ", ".join(
        ingredients
    )


    dietary_text = (
        dietary_preference.strip()
        if dietary_preference
        else "No special dietary preference provided."
    )


    notes_text = (
        notes.strip()
        if notes
        else "No additional cooking preference provided."
    )


    return f"""
You are FoodKindl AI, an expert practical home-cooking assistant.

The user has ONLY told you the ingredients currently available.

AVAILABLE INGREDIENTS:
{ingredient_text}

DIETARY PREFERENCE:
{dietary_text}

ADDITIONAL NOTES:
{notes_text}

YOUR JOB:

1. Decide the ONE best realistic dish the user can cook mainly
   from the available ingredients.

2. Do NOT ask the user what dish they want.

3. Do NOT require the user to type a recipe name.

4. First choose the dish yourself, then create the complete
   recipe.

5. Prefer dishes that use as many of the supplied ingredients
   as reasonably possible.

6. Do NOT force every ingredient into the dish. If an ingredient
   does not fit, put it in "unused_ingredients".

7. Pantry basics such as salt, water, cooking oil, basic spices,
   chilli powder, turmeric, pepper, cumin, coriander powder,
   mustard seeds, etc. may be suggested as optional additions
   when appropriate.

8. Do not invent major ingredients that completely change the
   dish unless they are clearly marked as optional.

EXAMPLES OF THE DECISION BEHAVIOUR:

garlic + tomato + onion
-> Tomato Curry / Tomato Masala

chicken + tomato + onion + garlic
-> Chicken Curry

egg + tomato + onion
-> Egg Masala / Egg Curry

potato + tomato + onion
-> Potato Curry

paneer + tomato + onion
-> Paneer Masala

The examples are guidance only. Always choose what is most
realistic for the actual ingredients supplied.

Return ONLY valid JSON in exactly this structure:

{{
  "title": "Name of the selected dish",
  "reason": "Why this dish fits the user's ingredients",
  "description": "Short appetising description",
  "cuisine": "Cuisine or style",
  "prep_time": "Example: 10 minutes",
  "cook_time": "Example: 25 minutes",
  "servings": "Example: 2 servings",
  "match_percentage": 90,
  "ingredients_used": [
    "ingredient from the user's list"
  ],
  "unused_ingredients": [
    "ingredient from the user's list that is not needed"
  ],
  "optional_ingredients": [
    "1 tsp salt",
    "1 tbsp cooking oil"
  ],
  "steps": [
    "Step 1",
    "Step 2"
  ],
  "tips": [
    "Useful cooking tip"
  ],
  "serving_suggestion": "How to serve the dish",
  "food_safety": "Relevant food-safety advice"
}}

RULES:

- title must be the dish YOU selected.
- ingredients_used must contain only ingredients supplied by
  the user.
- unused_ingredients must contain only ingredients supplied by
  the user.
- optional_ingredients must clearly represent additions not in
  the user's supplied ingredient list.
- match_percentage must be an integer from 0 to 100.
- provide 4 to 8 practical cooking steps.
- keep the recipe suitable for normal home cooking.
- return JSON only.
""".strip()


def _call_foodkindl_ai(
    prompt,
):
    """
    Send a chat-completion request to Hugging Face.
    """

    if not HF_TOKEN:
        raise RuntimeError(
            "HF_TOKEN is not configured."
        )

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": HF_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are FoodKindl AI. "
                    "Return only valid JSON. "
                    "Do not use Markdown."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.25,
        "max_tokens": 1600,
        "stream": False,
    }

    # ============================================================
    # CALL HUGGING FACE
    # ============================================================

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
            "FoodKindl could not connect to the AI service."
        ) from error

    except requests.RequestException as error:
        raise RuntimeError(
            f"FoodKindl AI request failed: {str(error)}"
        ) from error

    # ============================================================
    # PROVIDER ERROR
    # ============================================================

    if response.status_code >= 400:

        provider_error = _get_ai_provider_error(
            response
        )

        if response.status_code == 401:
            raise RuntimeError(
                "AI authentication failed. Check HF_TOKEN."
            )

        if response.status_code == 403:
            raise RuntimeError(
                (
                    "HF_TOKEN does not have permission "
                    "to use the configured AI provider."
                )
            )

        if response.status_code == 429:
            raise RuntimeError(
                (
                    "FoodKindl AI is temporarily busy "
                    "or your provider quota has been reached. "
                    "Please try again shortly."
                )
            )

        raise RuntimeError(
            f"AI provider error: {provider_error}"
        )

    # ============================================================
    # PARSE HUGGING FACE RESPONSE
    # ============================================================

    try:
        provider_data = response.json()

    except ValueError as error:
        print("\nINVALID HUGGING FACE RESPONSE:")
        print(response.text)

        raise RuntimeError(
            "FoodKindl AI returned an invalid response."
        ) from error

    # ============================================================
    # GET MESSAGE
    # ============================================================

    try:
        message = (
            provider_data["choices"][0]["message"]
        )

    except (
        KeyError,
        IndexError,
        TypeError,
    ) as error:
        print("\nUNEXPECTED FOODKINDL AI RESPONSE:")
        print(provider_data)

        raise RuntimeError(
            "FoodKindl AI returned an unexpected response."
        ) from error

    # ============================================================
    # GET GENERATED CONTENT
    # ============================================================

    content = (
        message.get("content")
        or message.get("reasoning_content")
        or message.get("reasoning")
        or ""
    )

    # Some providers may return content as a structured list.
    if isinstance(content, list):

        text_parts = []

        for item in content:

            if isinstance(item, dict):
                text_value = (
                    item.get("text")
                    or item.get("content")
                    or ""
                )

                if text_value:
                    text_parts.append(
                        str(text_value)
                    )

            elif item:
                text_parts.append(
                    str(item)
                )

        content = "\n".join(
            text_parts
        )

    content = str(
        content or ""
    ).strip()

    # ============================================================
    # DEBUG
    # ============================================================

    print(
        "\n======================================"
    )
    print(
        "FOODKINDL INGREDIENT AI RESPONSE"
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
        "MESSAGE:",
        message,
    )
    print(
        "======================================"
    )

    # ============================================================
    # EMPTY RESPONSE
    # ============================================================

    if not content:

        print(
            "\nFULL PROVIDER RESPONSE:"
        )
        print(
            provider_data
        )

        raise RuntimeError(
            (
                "FoodKindl AI returned empty content. "
                "Please try again or change the configured AI model."
            )
        )

    print(
        "\nRAW FOODKINDL AI OUTPUT:"
    )
    print(
        content
    )

    return content


def _parse_ingredient_recipe(
    content,
    supplied_ingredients,
):
    """
    Validate and normalise the AI JSON so the frontend receives
    a predictable recipe-book object.
    """

    cleaned = (
        _clean_ai_json_text(
            content
        )
    )


    try:

        data = json.loads(
            cleaned
        )


    except json.JSONDecodeError as error:

        raise RuntimeError(
            (
                "FoodKindl AI did not return "
                "valid recipe data."
            )
        ) from error


    if not isinstance(
        data,
        dict,
    ):

        raise RuntimeError(
            (
                "FoodKindl AI returned "
                "an invalid recipe."
            )
        )


    title = (
        str(
            data.get(
                "title",
                "",
            )
        )
        .strip()
    )


    if not title:

        raise RuntimeError(
            (
                "FoodKindl AI did not "
                "choose a dish."
            )
        )


    supplied_map = {
        item.lower():
            item
        for item in supplied_ingredients
    }


    def keep_supplied_only(
        values,
    ):

        if not isinstance(
            values,
            list,
        ):
            return []


        result = []

        seen = set()


        for value in values:

            key = (
                str(value)
                .strip()
                .lower()
            )


            if (
                not key
                or key not in supplied_map
                or key in seen
            ):
                continue


            seen.add(key)

            result.append(
                supplied_map[key]
            )


        return result


    ingredients_used = (
        keep_supplied_only(
            data.get(
                "ingredients_used",
                [],
            )
        )
    )


    unused_ingredients = (
        keep_supplied_only(
            data.get(
                "unused_ingredients",
                [],
            )
        )
    )


    # If the model forgot to classify some supplied ingredients,
    # put them in unused rather than pretending they were used.
    classified = {
        item.lower()
        for item in (
            ingredients_used
            + unused_ingredients
        )
    }


    for ingredient in supplied_ingredients:

        if (
            ingredient.lower()
            not in classified
        ):
            unused_ingredients.append(
                ingredient
            )


    optional_ingredients = (
        data.get(
            "optional_ingredients",
            [],
        )
    )


    if not isinstance(
        optional_ingredients,
        list,
    ):
        optional_ingredients = []


    steps = (
        data.get(
            "steps",
            [],
        )
    )


    if not isinstance(
        steps,
        list,
    ):
        steps = []


    steps = [
        str(step).strip()
        for step in steps
        if str(step).strip()
    ]


    if not steps:

        raise RuntimeError(
            (
                "FoodKindl AI did not "
                "generate cooking steps."
            )
        )


    tips = (
        data.get(
            "tips",
            [],
        )
    )


    if isinstance(
        tips,
        str,
    ):
        tips = [
            tips
        ]


    if not isinstance(
        tips,
        list,
    ):
        tips = []


    tips = [
        str(tip).strip()
        for tip in tips
        if str(tip).strip()
    ]


    try:

        match_percentage = int(
            data.get(
                "match_percentage",
                0,
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        match_percentage = 0


    match_percentage = max(
        0,
        min(
            100,
            match_percentage,
        ),
    )


    # If provider did not give a sensible percentage, calculate
    # one from how many supplied ingredients are used.
    if (
        match_percentage == 0
        and supplied_ingredients
    ):

        match_percentage = round(
            (
                len(
                    ingredients_used
                )
                /
                len(
                    supplied_ingredients
                )
            )
            * 100
        )


    return {
        "title":
            title,

        "reason":
            str(
                data.get(
                    "reason",
                    "",
                )
            ).strip(),

        "description":
            str(
                data.get(
                    "description",
                    "",
                )
            ).strip(),

        "cuisine":
            str(
                data.get(
                    "cuisine",
                    "",
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

        "match_percentage":
            match_percentage,

        "ingredients_used":
            ingredients_used,

        "unused_ingredients":
            unused_ingredients,

        "optional_ingredients": [
            str(item).strip()
            for item in optional_ingredients
            if str(item).strip()
        ],

        "steps":
            steps,

        "tips":
            tips,

        "serving_suggestion":
            str(
                data.get(
                    "serving_suggestion",
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
# INGREDIENT RECIPE BOOK API
#
# POST body:
#
# {
#   "ingredients": ["garlic", "tomato", "onion"],
#   "dietary_preference": "",
#   "notes": ""
# }
#
# Response:
#
# {
#   "ingredients": [...],
#   "recipe": {
#       "title": "Tomato Curry",
#       ...
#   }
# }
# ============================================================


@api_view(["POST"])
@permission_classes([
    permissions.IsAuthenticated,
])
def ai_ingredient_recipe_book(
    request,
):
    """
    Generate a full recipe directly from available ingredients.

    IMPORTANT:
    The user does not provide a dish name. FoodKindl AI chooses
    the dish itself.
    """

    ingredients = (
        _normalize_ai_ingredients(
            request.data.get(
                "ingredients",
                [],
            )
        )
    )


    if not ingredients:

        return Response(
            {
                "detail":
                    (
                        "Please add at least "
                        "one ingredient."
                    )
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )


    if len(ingredients) > 30:

        return Response(
            {
                "detail":
                    (
                        "Please use 30 ingredients "
                        "or fewer."
                    )
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )


    for ingredient in ingredients:

        if len(ingredient) > 80:

            return Response(
                {
                    "detail":
                        (
                            "Each ingredient must be "
                            "80 characters or fewer."
                        )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )


    dietary_preference = (
        str(
            request.data.get(
                "dietary_preference",
                "",
            )
            or ""
        )
        .strip()
    )


    notes = (
        str(
            request.data.get(
                "notes",
                "",
            )
            or ""
        )
        .strip()
    )


    if len(notes) > 500:

        return Response(
            {
                "detail":
                    (
                        "Cooking notes must be "
                        "500 characters or fewer."
                    )
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )


    try:

        prompt = (
            _build_ingredient_recipe_prompt(
                ingredients=ingredients,
                dietary_preference=(
                    dietary_preference
                ),
                notes=notes,
            )
        )


        raw_content = (
            _call_foodkindl_ai(
                prompt
            )
        )


        recipe = (
            _parse_ingredient_recipe(
                raw_content,
                ingredients,
            )
        )


        return Response(
            {
                "mode":
                    "ingredient_recipe_book",

                "ingredients":
                    ingredients,

                "selected_dish":
                    recipe["title"],

                "recipe":
                    recipe,
            },
            status=(
                status.HTTP_200_OK
            ),
        )


    except Exception as error:

        traceback.print_exc()


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
