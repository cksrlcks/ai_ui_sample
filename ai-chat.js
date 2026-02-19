class StreamHandler {
  constructor(container, options = {}) {
    this.container = document.querySelector(container);

    this.options = {
      endpoint: options.endpoint || "/api/chat",
      method: options.method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      onStart: options.onStart || (() => {}),
      onChunk: options.onChunk || (() => {}),
      onComplete: options.onComplete || (() => {}),
      onError: options.onError || ((err) => console.error(err)),
    };

    this.controller = null;
    this.decoder = new TextDecoder();
    this.currentResponseTarget = null;
    this.isLoading = false;
    this.form = document.querySelector(options.formSelector || "#chat-form");
    this.submitBtn = this.form?.querySelector("button[type='submit']");
  }

  setLoading(loading) {
    this.isLoading = loading;

    if (this.submitBtn) {
      this.submitBtn.disabled = loading;
      this.submitBtn.textContent = loading ? "답변 중..." : "전송";
    }
  }

  async submitQuestion(bodyPayload, customOptions = {}) {
    this.abort();
    this.controller = new AbortController();

    // 옵션 병합
    const requestOptions = { ...this.options, ...customOptions };

    try {
      this.setLoading(true);
      this.fullTextContent = "";

      if (requestOptions.onStart) requestOptions.onStart();

      // 1. 사용자 메시지 렌더링 (즉시 삽입)
      const userMessage =
        bodyPayload.messages[bodyPayload.messages.length - 1].content;
      this.addMessageToUI("user", userMessage);

      // 2. AI 응답용 빈 컨테이너 생성
      this.currentResponseTarget = this.addMessageToUI("assistant", "");

      // 3. API 호출
      const response = await fetch(requestOptions.endpoint, {
        method: "POST",
        headers: requestOptions.headers,
        body: JSON.stringify(bodyPayload),
        signal: this.controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const rawChunk = this.decoder.decode(value, { stream: true });
        this.parseAndRender(rawChunk, requestOptions.onChunk);
      }

      if (requestOptions.onComplete) requestOptions.onComplete();
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn("요청이 중단되었습니다.");
      } else {
        if (requestOptions.onError) requestOptions.onError(error);
        this.currentResponseTarget.textContent =
          "에러가 발생했습니다: " + error.message;
      }
    } finally {
      this.setLoading(false);
      this.controller = null;
    }
  }

  addMessageToUI(role, text = "") {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;

    const avatar = document.createElement("div");
    avatar.className = `avatar ${role}`;
    avatar.textContent = role === "user" ? "나" : "AI";

    const content = document.createElement("div");

    if (role === "assistant" && text === "") {
      // AI 응답일 경우 스피너 먼저 삽입
      const spinner = document.createElement("div");
      spinner.className = "ai-chat-spinner";
      content.appendChild(spinner);
    } else {
      content.textContent = text;
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    this.container.appendChild(messageDiv);

    this.container.scrollTop = this.container.scrollHeight;

    return content;
  }

  // openai 규격에 맞게 parse & render하도록 해둠 (커스텀 해야할수도 있음)
  parseAndRender(rawChunk, onChunkCallback) {
    const lines = rawChunk.split("\n");
    for (const line of lines) {
      const message = line.replace(/^data: /, "").trim();
      if (!message || message === "[DONE]") continue;

      try {
        const parsed = JSON.parse(message);
        const content = parsed.choices[0]?.delta?.content || "";
        if (content) {
          this.fullTextContent += content;

          this.currentResponseTarget.innerHTML = marked.parse(
            this.fullTextContent,
          );

          this.container.scrollTop = this.container.scrollHeight;
          if (onChunkCallback) onChunkCallback(content);
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  clearContainer() {
    if (this.container) this.container.textContent = "";
  }

  abort() {
    if (this.controller) {
      this.controller.abort();
    }
  }
}
