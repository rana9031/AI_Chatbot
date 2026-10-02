from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import Chat, Message
from .ai_service import get_ai_response


def register_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        email = request.POST.get("email")
        password = request.POST.get("password")

        if User.objects.filter(username=username).exists():
            return render(request, "chatbot/register.html", {
                "error": "Username already exists."
            })

        if User.objects.filter(email=email).exists():
            return render(request, "chatbot/register.html", {
                "error": "Email already exists."
            })

        User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        return redirect("login")

    return render(request, "chatbot/register.html")


def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(
            request,
            username=username,
            password=password
        )

        if user is not None:
            login(request, user)
            return redirect("chat")

        return render(request, "chatbot/login.html", {
            "error": "Invalid username or password."
        })

    return render(request, "chatbot/login.html")


def logout_view(request):
    logout(request)
    return redirect("login")


def chat_view(request):
    if not request.user.is_authenticated:
        return redirect("login")

    chats = Chat.objects.filter(
        user=request.user
    ).order_by("-created_at")

    return render(request, "chatbot/index.html", {
        "chats": chats
    })


def new_chat_view(request):
    if not request.user.is_authenticated:
        return redirect("login")

    chat = Chat.objects.create(
        user=request.user,
        title="New Chat"
    )

    return redirect("open_chat", chat_id=chat.id)


def open_chat_view(request, chat_id):
    if not request.user.is_authenticated:
        return redirect("login")

    chat = get_object_or_404(
        Chat,
        id=chat_id,
        user=request.user
    )

    chats = Chat.objects.filter(
        user=request.user
    ).order_by("-created_at")

    messages = chat.messages.order_by("created_at")

    return render(request, "chatbot/index.html", {
        "chats": chats,
        "current_chat": chat,
        "messages": messages
    })


@require_POST
def delete_chat_view(request, chat_id):
    if not request.user.is_authenticated:
        return JsonResponse({
            "error": "Please login first."
        }, status=401)

    chat = get_object_or_404(
        Chat,
        id=chat_id,
        user=request.user
    )

    chat.delete()

    return JsonResponse({
        "success": True
    })


@require_POST
def send_message_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({
            "error": "Please login first."
        }, status=401)

    message = request.POST.get("message", "").strip()
    uploaded_file = request.FILES.get("file")
    chat_id = request.POST.get("chat_id")

    if not message and not uploaded_file:
        return JsonResponse({
            "error": "Message or file is required."
        }, status=400)

    try:

        if chat_id:
            chat = get_object_or_404(
                Chat,
                id=chat_id,
                user=request.user
            )
        else:
            chat = Chat.objects.create(
                user=request.user,
                title="New Chat"
            )

        user_message = message

        if uploaded_file:
            if user_message:
                user_message += "\n📎 " + uploaded_file.name
            else:
                user_message = "📎 " + uploaded_file.name

        Message.objects.create(
            chat=chat,
            sender="user",
            message=user_message
        )

        ai_response = get_ai_response(
            message,
            uploaded_file
        )

        ai_message = Message.objects.create(
            chat=chat,
            sender="ai",
            message=str(ai_response)
        )

        if chat.title == "New Chat":

            if message:
                chat.title = message[:40]

            elif uploaded_file:
                chat.title = uploaded_file.name[:40]

            chat.save()

        return JsonResponse({
            "response": str(ai_response),
            "chat_id": chat.id,
            "chat_title": chat.title,
            "message_id": ai_message.id
        })

    except Exception as e:

        print("AI ERROR:", repr(e))

        return JsonResponse({
            "error": str(e)
        }, status=500)


@require_POST
def regenerate_message_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({
            "error": "Please login first."
        }, status=401)

    message_id = request.POST.get("message_id")

    try:

        ai_message = get_object_or_404(
            Message,
            id=message_id,
            sender="ai",
            chat__user=request.user
        )

        # Find the user message immediately before this AI response
        previous_user_message = Message.objects.filter(
            chat=ai_message.chat,
            sender="user",
            created_at__lt=ai_message.created_at
        ).order_by("-created_at").first()

        if not previous_user_message:
            return JsonResponse({
                "error": "Previous user message not found."
            }, status=400)

        user_text = previous_user_message.message

        # Remove file name marker if present
        if user_text.startswith("📎 "):
            user_text = ""

        elif "\n📎 " in user_text:
            user_text = user_text.split("\n📎 ")[0]

        if not user_text:
            return JsonResponse({
                "error": "Regenerate is not available for this file response."
            }, status=400)

        new_response = get_ai_response(user_text)

        ai_message.message = str(new_response)
        ai_message.save()

        return JsonResponse({
            "success": True,
            "response": str(new_response)
        })

    except Exception as e:

        print("REGENERATE ERROR:", repr(e))

        return JsonResponse({
            "error": str(e)
        }, status=500)