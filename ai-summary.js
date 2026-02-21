class AISummary extends AICore {
  constructor(containerSelector, options = {}) {
    super(options);
    this.container = document.querySelector(containerSelector);
    this.defaultHeaders = options.headers || {};
  }

  async start(options = {}) {
    const {
      payload = null,
      method = "POST",
      headers = {},
      callbacks = {},
    } = options;

    this._prepareUI();
    this.thoughtText = "";

    const mergedHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    const bodyTarget = this.container.querySelector(".ai-summary-body");
    const thoughtTarget = this.container.querySelector(".ai-summary-thought");
    const loadingArea = this.container.querySelector(".summary-loading");

    await this._stream(
      { payload, method, headers: mergedHeaders },
      {
        onStart: () => {
          if (callbacks.onStart) callbacks.onStart();
        },
        onThought: (thought) => {
          if (loadingArea) loadingArea.style.display = "none";

          this.thoughtText += thought;
          thoughtTarget.innerText = this.thoughtText;
          thoughtTarget.style.display = "block";
        },
        onChunk: (content, fullText) => {
          if (loadingArea) loadingArea.style.display = "none";

          if (thoughtTarget) {
            thoughtTarget.style.display = "none";
            thoughtTarget.innerText = "";
          }

          bodyTarget.innerHTML = marked.parse(fullText);

          if (callbacks.onChunk) callbacks.onChunk(content, fullText);
        },
        onComplete: (fullText) => {
          if (callbacks.onComplete) callbacks.onComplete(fullText);
        },
        onError: (err) => {
          bodyTarget.innerHTML = `<p style="color:red;">오류 발생: ${err.message}</p>`;
        },
      },
    );
  }

  _prepareUI() {
    this.container.innerHTML = `      
      <div class="ai-summary-body">
        <div class="summary-loading" style="text-align:center; padding:20px;">
          <div class="ai-chat-spinner"></div>
        </div>
        <div class="ai-summary-thought" style="display:none;"></div>
      </div>    
    `;
  }
}
