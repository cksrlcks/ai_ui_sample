class AICore {
  constructor(options = {}) {
    this.endpoint = options.endpoint || "/api/chat";
    this.defaultHeaders = { 
      "Content-Type": "application/json", 
      ...options.headers 
    };
    this.controller = null;
    this.decoder = new TextDecoder();
  }

  async _stream({ payload = null, method = "POST", headers = {} } = {}, callbacks = {}) {
    this.abort();
    this.controller = new AbortController();
    let fullText = "";

    try {
      if (callbacks.onStart) callbacks.onStart();

      // fetch 옵션 구성
      const fetchOptions = {
        method: method.toUpperCase(),
        headers: { ...this.defaultHeaders, ...headers },
        signal: this.controller.signal,
      };

      // GET이 아니고 데이터가 있을 때만 body 추가
      if (fetchOptions.method !== "GET" && payload) {
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(this.endpoint, fetchOptions);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = this.decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const msg = line.replace(/^data: /, "").trim();
          if (!msg || msg === "[DONE]") continue;

          try {
            const parsed = JSON.parse(msg);
            const delta = parsed.choices[0]?.delta;
            if (!delta) continue;

            const thought = delta.reasoning_content || "";
            const content = delta.content || "";

            if (thought && callbacks.onThought) {
              callbacks.onThought(thought);
            }

            if (content) {
              fullText += content;
              if (callbacks.onChunk) callbacks.onChunk(content, fullText);
            }
          } catch (e) {
            // JSON 파싱 실패 시 무시하고 계속 진행
          }
        }
      }
      if (callbacks.onComplete) callbacks.onComplete(fullText);
    } catch (err) {
      if (err.name !== "AbortError" && callbacks.onError)
        callbacks.onError(err);
    }
  }

  abort() {
    if (this.controller) this.controller.abort();
  }
}