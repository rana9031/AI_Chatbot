from django.urls import path
from . import views

urlpatterns = [
    path("",views.chat_view, name="home"),
    path("register/", views.register_view, name="register"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),

    path("chat/", views.chat_view, name="chat"),

    path("new-chat/", views.new_chat_view, name="new_chat"),

    path(
        "chat/<int:chat_id>/",
        views.open_chat_view,
        name="open_chat"
    ),

    path(
        "delete-chat/<int:chat_id>/",
        views.delete_chat_view,
        name="delete_chat"
    ),

    path(
        "send-message/",
        views.send_message_view,
        name="send_message"
    ),

    path(
    "regenerate-message/",
    views.regenerate_message_view,
    name="regenerate_message"

    ),
]