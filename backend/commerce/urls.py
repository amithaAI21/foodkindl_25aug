from django.urls import path

from .views import (
    GroceryPartnerClickHistoryView,
    GroceryPartnerClickView,
    GroceryPartnerListView,
)


urlpatterns = [

    path(
        "partners/",
        GroceryPartnerListView.as_view(),
        name="grocery-partner-list",
    ),

    path(
        "grocery-click/",
        GroceryPartnerClickView.as_view(),
        name="grocery-partner-click",
    ),

    path(
        "my-clicks/",
        GroceryPartnerClickHistoryView.as_view(),
        name="grocery-partner-click-history",
    ),

]