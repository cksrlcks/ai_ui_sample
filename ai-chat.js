class AIChat extends AICore {
  constructor(containerSelector, options = {}) {
    super(options);
    this.container = document.querySelector(containerSelector);
    this.defaultHeaders = options.headers || {};
    this.fullTextContent = "";
  }

  async submitQuestion(options = {}) {
    const {
      payload = null,
      method = "POST",
      headers = {},
      callbacks = {},
    } = options;

    this.fullTextContent = "";

    const mergedHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    if(!payload || !payload.messages) {
      console.error("Payload는 messages 필드를 포함해야 합니다.");
      return;
    }

    const messages = payload.messages;
    const lastUserMsg = messages[messages.length - 1].content;
    this._addMessageToUI("user", lastUserMsg);

    const responseTarget = this._addMessageToUI("assistant", "");

    await this._stream(
      { payload, method, headers: mergedHeaders },
      {
        onStart: () => {
          if (callbacks.onStart) callbacks.onStart();
        },
        onChunk: (content, fullText) => {
          responseTarget.innerHTML = marked.parse(fullText);
          this.container.scrollTop = this.container.scrollHeight;
          if (callbacks.onChunk) callbacks.onChunk(content, fullText);
        },
        onComplete: (fullText) => {
          if (callbacks.onComplete) callbacks.onComplete(fullText);
        },
        onError: (err) => {
          if (callbacks.onError) callbacks.onError(err);
        },
      },
    );
  }

  _addMessageToUI(role, text) {
    const div = document.createElement("div");
    div.className = `message ${role}`;
    const content = document.createElement("div");
    content.className = "content";

    if (role === "assistant" && !text) {
      content.innerHTML = '<div class="ai-chat-spinner"></div>';
    } else {
      content.innerHTML = marked.parse(text);
    }

    div.innerHTML = `<div class="avatar ${role}">${role === "user" ? "나" : "AI"}</div>`;
    div.appendChild(content);
    this.container.appendChild(div);

    return content;
  }
}
