document.addEventListener("DOMContentLoaded", () => {
  let currentConversationId = null;
  let activeModel = "Gemini 3.8 Flash (Medium)";
  let availableModels = [
    "Gemini 3.8 Flash (Medium)",
    "Gemini 3.8 Flash (High)",
    "Gemini 3.8 Flash (Low)",
    "Gemini 4 Argon (Medium)",
    "Gemini 4 Argon (High)",
    "Claude Sonnet 5.5 (Medium)",
    "Claude Sonnet 5.5 (High)",
    "Claude Opus 5.5 (Medium)",
    "Claude Opus 5.5 (High)",
    "GPT-OSS 120B (Medium)"
  ];

  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const topSidebarToggle = document.getElementById("topSidebarToggle");
  const newChatBtn = document.getElementById("newChatBtn");
  const chatsList = document.getElementById("chatsList");
  const viewWelcome = document.getElementById("viewWelcome");
  const viewChat = document.getElementById("viewChat");
  const chatMessages = document.getElementById("chatMessages");
  const currentChatTitle = document.getElementById("currentChatTitle");
  const greetingText = document.getElementById("greetingText");
  const activeModelLabel = document.getElementById("activeModelLabel");
  const modelSelectorBadge = document.getElementById("modelSelectorBadge");
  const modelDropdownMenu = document.getElementById("modelDropdownMenu");
  const welcomePromptInput = document.getElementById("welcomePromptInput");
  const chatPromptInput = document.getElementById("chatPromptInput");
  const welcomeSendBtn = document.getElementById("welcomeSendBtn");
  const chatSendBtn = document.getElementById("chatSendBtn");
  const windowCloseBtn = document.getElementById("windowCloseBtn");

  function updateGreeting() {
    const hour = new Date().getHours();
    let timeGreeting = "Good afternoon";
    if (hour < 12) {
      timeGreeting = "Good morning";
    } else if (hour >= 18) {
      timeGreeting = "Good evening";
    }
    if (greetingText) {
      greetingText.textContent = `${timeGreeting}, axk`;
    }
  }
  updateGreeting();

  function toggleSidebar() {
    sidebar.classList.toggle("collapsed");
  }
  if (sidebarToggle) sidebarToggle.addEventListener("click", toggleSidebar);
  if (topSidebarToggle) topSidebarToggle.addEventListener("click", toggleSidebar);

  if (windowCloseBtn) {
    windowCloseBtn.addEventListener("click", () => {
      window.close();
    });
  }

  function renderModelDropdown() {
    if (!modelDropdownMenu) return;
    modelDropdownMenu.innerHTML = "";
    availableModels.forEach(modelName => {
      const opt = document.createElement("div");
      opt.className = "model-option";
      if (modelName === activeModel) {
        opt.classList.add("selected");
      }
      opt.textContent = modelName;
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        selectModel(modelName);
      });
      modelDropdownMenu.appendChild(opt);
    });
  }

  function selectModel(modelName) {
    activeModel = modelName;
    if (activeModelLabel) activeModelLabel.textContent = activeModel;
    if (modelDropdownMenu) modelDropdownMenu.style.display = "none";
    renderModelDropdown();
  }

  if (modelSelectorBadge && modelDropdownMenu) {
    modelSelectorBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = modelDropdownMenu.style.display === "flex";
      modelDropdownMenu.style.display = isVisible ? "none" : "flex";
      renderModelDropdown();
    });

    document.addEventListener("click", (e) => {
      if (!modelSelectorBadge.contains(e.target) && !modelDropdownMenu.contains(e.target)) {
        modelDropdownMenu.style.display = "none";
      }
    });
  }

  async function loadStatus() {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models)) {
          availableModels = data.models;
        }
        if (data.model) {
          activeModel = data.model;
          if (activeModelLabel) activeModelLabel.textContent = activeModel;
        }
        renderModelDropdown();
      }
    } catch (e) {}
  }
  loadStatus();

  async function loadConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const list = await res.json();
      chatsList.innerHTML = "";
      list.forEach(item => {
        const div = document.createElement("div");
        div.className = "chat-item";
        div.title = item.title;
        div.dataset.id = item.id;
        if (item.id === currentConversationId) {
          div.classList.add("active");
        }

        const dot = document.createElement("span");
        dot.className = "chat-dot";

        const text = document.createElement("span");
        text.className = "chat-text";
        text.textContent = item.title || "Untitled chat";

        div.appendChild(dot);
        div.appendChild(text);

        div.addEventListener("click", () => {
          loadConversation(item.id, item.title);
        });
        chatsList.appendChild(div);
      });
    } catch (e) {}
  }
  loadConversations();

  async function loadConversation(id, title) {
    currentConversationId = id;
    if (currentChatTitle) currentChatTitle.textContent = title || "Conversation";

    document.querySelectorAll(".chat-item").forEach(el => {
      el.classList.toggle("active", el.dataset.id === id);
    });

    viewWelcome.style.display = "none";
    viewChat.style.display = "flex";
    chatMessages.innerHTML = "<div class='loading-indicator'>Loading conversation...</div>";

    try {
      const res = await fetch(`/api/conversation/${id}`);
      if (!res.ok) {
        chatMessages.innerHTML = "<div class='error-msg'>Unable to load conversation.</div>";
        return;
      }
      const messages = await res.json();
      chatMessages.innerHTML = "";
      messages.forEach(msg => {
        appendMessage(msg.role, msg.content, msg.tools);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (e) {
      chatMessages.innerHTML = "<div class='error-msg'>Connection error.</div>";
    }
  }

  function appendMessage(role, content, tools) {
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${role}`;

    if (role === "assistant") {
      const header = document.createElement("div");
      header.className = "assistant-header";
      header.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 100 100" fill="none">
          <path d="M50 0L53.5 35L85 15L65 46.5L100 50L65 53.5L85 85L53.5 65L50 100L46.5 65L15 85L35 53.5L0 50L35 46.5L15 15L46.5 35Z" fill="#D97757"/>
        </svg>
        <span>Antigravity · ${activeModel}</span>
      `;
      bubble.appendChild(header);
    }

    if (tools && tools.length) {
      tools.forEach(t => {
        const card = document.createElement("div");
        card.className = "tool-card";
        card.textContent = `Tool: ${t.name} ${t.summary ? "— " + t.summary : ""}`;
        bubble.appendChild(card);
      });
    }

    const body = document.createElement("div");
    body.className = "assistant-content";
    body.innerHTML = formatMarkdown(content);
    bubble.appendChild(body);

    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return body;
  }

  function formatMarkdown(text) {
    if (!text) return "";
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    escaped = escaped.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (m, lang, code) => {
      return `<pre><code class="lang-${lang}">${code}</code></pre>`;
    });

    escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    escaped = escaped.replace(/\n/g, "<br>");
    return escaped;
  }

  function startNewChat() {
    currentConversationId = null;
    if (currentChatTitle) currentChatTitle.textContent = "";
    document.querySelectorAll(".chat-item").forEach(el => el.classList.remove("active"));
    viewChat.style.display = "none";
    viewWelcome.style.display = "flex";
    if (welcomePromptInput) {
      welcomePromptInput.value = "";
      welcomePromptInput.focus();
    }
  }
  if (newChatBtn) newChatBtn.addEventListener("click", startNewChat);

  async function sendPrompt(text) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    viewWelcome.style.display = "none";
    viewChat.style.display = "flex";

    appendMessage("user", cleanText);

    const assistantBody = appendMessage("assistant", "Thinking...");

    if (welcomePromptInput) welcomePromptInput.value = "";
    if (chatPromptInput) chatPromptInput.value = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanText,
          model: activeModel,
          conversation_id: currentConversationId
        })
      });

      if (!res.ok) {
        assistantBody.textContent = "Failed to communicate with Antigravity.";
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let hasStarted = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith(":")) {
            continue;
          }
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.status === "starting") {
                continue;
              }
              if (parsed.text) {
                if (!hasStarted) {
                  hasStarted = true;
                  assistantBody.innerHTML = "";
                }
                accumulated += parsed.text;
                assistantBody.innerHTML = formatMarkdown(accumulated);
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
              if (parsed.error) {
                accumulated += "\n[Error: " + parsed.error + "]";
                assistantBody.innerHTML = formatMarkdown(accumulated);
              }
            } catch (e) {}
          }
        }
      }
      loadConversations();
    } catch (e) {
      assistantBody.textContent = "Error executing request: " + e.message;
    }
  }

  if (welcomeSendBtn && welcomePromptInput) {
    welcomeSendBtn.addEventListener("click", () => {
      sendPrompt(welcomePromptInput.value);
    });
    welcomePromptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendPrompt(welcomePromptInput.value);
      }
    });
  }

  if (chatSendBtn && chatPromptInput) {
    chatSendBtn.addEventListener("click", () => {
      sendPrompt(chatPromptInput.value);
    });
    chatPromptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendPrompt(chatPromptInput.value);
      }
    });
  }

  document.querySelectorAll(".pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt;
      if (prompt) {
        if (welcomePromptInput) welcomePromptInput.value = prompt;
        sendPrompt(prompt);
      }
    });
  });
});
