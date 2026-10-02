document.addEventListener("DOMContentLoaded", function () {

    // ================= DARK MODE =================

    const themeToggle = document.getElementById("themeToggle");

    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark-mode");

        if (themeToggle) {
            themeToggle.textContent = "☀️ Light Mode";
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener("click", function () {

            document.body.classList.toggle("dark-mode");

            const isDark =
                document.body.classList.contains("dark-mode");

            localStorage.setItem("darkMode", isDark);

            themeToggle.textContent =
                isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
        });
    }


    // ================= FILE SELECTION =================

    const fileInput = document.getElementById("fileInput");
    const fileName = document.getElementById("fileName");

    if (fileInput) {
        fileInput.addEventListener("change", function () {

            if (fileInput.files.length > 0) {
                fileName.textContent =
                    "📎 " + fileInput.files[0].name;
            } else {
                fileName.textContent = "";
            }
        });
    }


    // ================= ESCAPE HTML =================

    function escapeHtml(text) {

        const div = document.createElement("div");

        div.textContent = text;

        return div.innerHTML;
    }


    // ================= FORMAT AI RESPONSE =================

    function formatAIResponse(text) {

        let html = escapeHtml(text);

        // Code blocks
        html = html.replace(
            /```(?:[a-zA-Z0-9_+-]+)?\n?([\s\S]*?)```/g,
            function (match, code) {

                return `
                    <pre class="code-block"><code>${code.trim()}</code></pre>
                `;
            }
        );

        // Headings
        html = html.replace(
            /^### (.*)$/gm,
            "<h4>$1</h4>"
        );

        html = html.replace(
            /^## (.*)$/gm,
            "<h3>$1</h3>"
        );

        html = html.replace(
            /^# (.*)$/gm,
            "<h2>$1</h2>"
        );

        // Bold
        html = html.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

        // Italic
        html = html.replace(
            /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
            "<em>$1</em>"
        );

        // Inline code
        html = html.replace(
            /`([^`\n]+)`/g,
            '<code class="inline-code">$1</code>'
        );

        // Bullet lists
        html = html.replace(
            /^[•*-]\s+(.*)$/gm,
            '<div class="ai-list-item">• $1</div>'
        );

        // Numbered lists
        html = html.replace(
            /^\d+\.\s+(.*)$/gm,
            '<div class="ai-list-item">$1</div>'
        );

        // Horizontal line
        html = html.replace(
            /^---$/gm,
            "<hr>"
        );

        // Line breaks
        html = html.replace(
            /\n/g,
            "<br>"
        );

        return html;
    }


    // ================= FORMAT OLD AI RESPONSES =================

    document
        .querySelectorAll(".message.ai .message-content")
        .forEach(function (element) {

            const text = element.textContent;

            if (text.trim()) {
                element.innerHTML =
                    formatAIResponse(text);
            }
        });


    // ================= CHAT ELEMENTS =================

    const chatForm =
        document.getElementById("chatForm");

    const messageInput =
        document.getElementById("messageInput");

    const messages =
        document.getElementById("messages");

    const chatIdInput =
        document.getElementById("chatId");


    // ================= SEND MESSAGE =================

    if (chatForm) {

        chatForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const message =
                    messageInput.value.trim();

                const hasFile =
                    fileInput &&
                    fileInput.files.length > 0;


                if (!message && !hasFile) {
                    return;
                }


                const formData =
                    new FormData();


                formData.append(
                    "message",
                    message
                );


                if (hasFile) {

                    formData.append(
                        "file",
                        fileInput.files[0]
                    );
                }


                if (
                    chatIdInput &&
                    chatIdInput.value
                ) {

                    formData.append(
                        "chat_id",
                        chatIdInput.value
                    );
                }


                const csrfToken =
                    document.querySelector(
                        "[name=csrfmiddlewaretoken]"
                    ).value;


                // ================= USER MESSAGE =================

                let displayMessage =
                    message;


                if (hasFile) {

                    if (displayMessage) {

                        displayMessage +=
                            "\n📎 " +
                            fileInput.files[0].name;

                    } else {

                        displayMessage =
                            "📎 " +
                            fileInput.files[0].name;
                    }
                }


                const userMessage =
                    document.createElement("div");

                userMessage.className =
                    "message user";


                userMessage.innerHTML = `
                    <div class="message-content">
                        ${escapeHtml(displayMessage)}
                    </div>
                `;


                messages.appendChild(
                    userMessage
                );


                // Clear input

                messageInput.value = "";


                if (fileInput) {
                    fileInput.value = "";
                }


                if (fileName) {
                    fileName.textContent = "";
                }


                messages.scrollTop =
                    messages.scrollHeight;


                // ================= THINKING =================

                const loadingMessage =
                    document.createElement("div");

                loadingMessage.className =
                    "message ai";


                loadingMessage.innerHTML = `
                    <div class="message-content">
                        Thinking...
                    </div>
                `;


                messages.appendChild(
                    loadingMessage
                );


                messages.scrollTop =
                    messages.scrollHeight;


                try {

                    const response =
                        await fetch(
                            "/send-message/",
                            {
                                method: "POST",

                                headers: {
                                    "X-CSRFToken":
                                        csrfToken
                                },

                                body: formData
                            }
                        );


                    const data =
                        await response.json();


                    loadingMessage.remove();


                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            "Something went wrong."
                        );
                    }


                    // ================= AI MESSAGE =================

                    const aiMessage =
                        document.createElement("div");

                    aiMessage.className =
                        "message ai";


                    aiMessage.dataset.messageId =
                        data.message_id || "";


                    const content =
                        document.createElement("div");

                    content.className =
                        "message-content";


                    content.innerHTML =
                        formatAIResponse(
                            data.response
                        );


                    aiMessage.appendChild(
                        content
                    );


                    // ================= ACTION BUTTONS =================

                    const actions =
                        document.createElement("div");

                    actions.className =
                        "message-actions";


                    actions.innerHTML = `
                        <button
                            type="button"
                            class="copy-btn"
                            title="Copy response"
                            aria-label="Copy response"
                        >
                            📋
                        </button>

                        <button
                            type="button"
                            class="regenerate-btn"
                            data-message-id="${data.message_id || ""}"
                            title="Regenerate response"
                            aria-label="Regenerate response"
                        >
                            🔄
                        </button>
                    `;


                    aiMessage.appendChild(
                        actions
                    );


                    messages.appendChild(
                        aiMessage
                    );


                    // Update chat ID

                    if (chatIdInput) {

                        chatIdInput.value =
                            data.chat_id;
                    }


                    messages.scrollTop =
                        messages.scrollHeight;


                    if (data.chat_title) {

                        document.title =
                            data.chat_title +
                            " - AI Chatbot";
                    }


                } catch (error) {

                    loadingMessage.remove();


                    const errorMessage =
                        document.createElement("div");

                    errorMessage.className =
                        "message ai";


                    errorMessage.innerHTML = `
                        <div class="message-content">
                            ❌ ${escapeHtml(error.message)}
                        </div>
                    `;


                    messages.appendChild(
                        errorMessage
                    );


                    messages.scrollTop =
                        messages.scrollHeight;
                }
            }
        );
    }


    // ================= COPY RESPONSE =================

    document.addEventListener(
        "click",
        async function (event) {

            const copyButton =
                event.target.closest(".copy-btn");


            if (!copyButton) {
                return;
            }


            const messageElement =
                copyButton.closest(".message");


            if (!messageElement) {
                return;
            }


            const content =
                messageElement.querySelector(
                    ".message-content"
                );


            if (!content) {
                return;
            }


            const text =
                content.innerText.trim();


            try {

                await navigator.clipboard.writeText(
                    text
                );


                const oldText =
                    copyButton.textContent;


                copyButton.textContent =
                    "✓";


                setTimeout(
                    function () {

                        copyButton.textContent =
                            oldText;

                    },
                    1500
                );


            } catch (error) {

                alert(
                    "Unable to copy the response."
                );
            }
        }
    );


    // ================= REGENERATE RESPONSE =================

    document.addEventListener(
        "click",
        async function (event) {

            const regenerateButton =
                event.target.closest(
                    ".regenerate-btn"
                );


            if (!regenerateButton) {
                return;
            }


            const messageId =
                regenerateButton.dataset.messageId;


            if (!messageId) {

                alert(
                    "Regenerate is not available for this response."
                );

                return;
            }


            const csrfToken =
                document.querySelector(
                    "[name=csrfmiddlewaretoken]"
                ).value;


            const oldText =
                regenerateButton.textContent;


            regenerateButton.disabled =
                true;


            regenerateButton.textContent =
                "⏳";


            const formData =
                new FormData();


            formData.append(
                "message_id",
                messageId
            );


            try {

                const response =
                    await fetch(
                        "/regenerate-message/",
                        {
                            method: "POST",

                            headers: {
                                "X-CSRFToken":
                                    csrfToken
                            },

                            body: formData
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Regeneration failed."
                    );
                }


                const messageElement =
                    regenerateButton.closest(
                        ".message"
                    );


                const content =
                    messageElement.querySelector(
                        ".message-content"
                    );


                content.innerHTML =
                    formatAIResponse(
                        data.response
                    );


                regenerateButton.disabled =
                    false;


                regenerateButton.textContent =
                    oldText;


            } catch (error) {

                regenerateButton.disabled =
                    false;


                regenerateButton.textContent =
                    oldText;


                alert(
                    error.message
                );
            }
        }
    );


    // ================= DELETE CHAT =================

    document.addEventListener(
        "click",
        async function (event) {

            const deleteButton =
                event.target.closest(
                    ".delete-chat-btn"
                );


            if (!deleteButton) {
                return;
            }


            const chatId =
                deleteButton.dataset.chatId;


            if (!confirm(
                "Are you sure you want to delete this chat?"
            )) {
                return;
            }


            const csrfToken =
                document.querySelector(
                    "[name=csrfmiddlewaretoken]"
                );


            if (!csrfToken) {

                alert(
                    "CSRF token not found."
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        `/delete-chat/${chatId}/`,
                        {
                            method: "POST",

                            headers: {
                                "X-CSRFToken":
                                    csrfToken.value
                            }
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Unable to delete chat."
                    );
                }


                const chatItem =
                    deleteButton.closest(
                        ".chat-history-item"
                    );


                if (chatItem) {
                    chatItem.remove();
                }


                const currentChatId =
                    chatIdInput ?
                    chatIdInput.value :
                    "";


                if (
                    currentChatId &&
                    String(currentChatId) ===
                    String(chatId)
                ) {

                    window.location.href =
                        "/chat/";
                }


            } catch (error) {

                alert(
                    error.message
                );
            }
        }
    );

});