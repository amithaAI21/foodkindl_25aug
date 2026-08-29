from django.shortcuts import get_object_or_404

from rest_framework.permissions import (
    IsAuthenticated,
)

from rest_framework.response import (
    Response,
)

from rest_framework.views import (
    APIView,
)

from rest_framework import status

from .models import (
    GroceryPartner,
    GroceryPartnerClick,
)

from .serializers import (
    GroceryPartnerSerializer,
    GroceryPartnerClickSerializer,
)


class GroceryPartnerListView(APIView):
    """
    Returns active grocery partners.

    GET:
    /api/commerce/partners/
    """

    permission_classes = [
        IsAuthenticated
    ]


    def get(
        self,
        request
    ):

        partners = (
            GroceryPartner.objects
            .filter(
                is_active=True
            )
            .order_by(
                "name"
            )
        )

        serializer = (
            GroceryPartnerSerializer(
                partners,
                many=True
            )
        )

        return Response(
            serializer.data
        )


class GroceryPartnerClickView(APIView):
    """
    Creates a tracking record when the user
    chooses Blinkit / Instamart / Amazon.

    POST:
    /api/commerce/grocery-click/
    """

    permission_classes = [
        IsAuthenticated
    ]


    def post(
        self,
        request
    ):

        partner_slug = (
            request.data.get(
                "partner"
            )
        )

        recipe_title = (
            request.data.get(
                "recipe_title",
                ""
            )
        )

        grocery_items = (
            request.data.get(
                "grocery_items",
                []
            )
        )


        if not partner_slug:

            return Response(
                {
                    "detail":
                        "Partner is required."
                },
                status=status
                    .HTTP_400_BAD_REQUEST
            )


        partner = get_object_or_404(
            GroceryPartner,
            slug=partner_slug,
            is_active=True,
        )


        click = (
            GroceryPartnerClick.objects
            .create(
                user=request.user,
                partner=partner,
                recipe_title=recipe_title,
                grocery_items=grocery_items,
            )
        )


        return Response(
            {
                "tracking_code":
                    click.tracking_code,

                "partner":
                    partner.slug,

                "partner_name":
                    partner.name,

                "redirect_url":
                    partner.base_url,
            },
            status=status
                .HTTP_201_CREATED
        )


class GroceryPartnerClickHistoryView(
    APIView
):
    """
    Shows current user's grocery partner clicks.

    GET:
    /api/commerce/my-clicks/
    """

    permission_classes = [
        IsAuthenticated
    ]


    def get(
        self,
        request
    ):

        clicks = (
            GroceryPartnerClick.objects
            .filter(
                user=request.user
            )
            .select_related(
                "partner"
            )
            .order_by(
                "-clicked_at"
            )
        )

        serializer = (
            GroceryPartnerClickSerializer(
                clicks,
                many=True
            )
        )

        return Response(
            serializer.data
        )