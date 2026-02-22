# AI UI sample (Vanilla JS Streaming Handler)

ReadableStream(RS)을 활용해 대화형(Chat)과 요약형(Summary) API를 연동하는 프론트엔드 통신 체계입니다. AICore를 중심으로 설계되어 React가 없는 기존 환경에서도 별도의 제약 없이 실시간 응답을 구현합니다

---

샘플 URL : [https://ai-chat-uxis.vercel.app](https://ai-chat-uxis.vercel.app)

## 설치 및 시작하기

프로젝트에 `ai-core.js`, `ai-chat.js`, `ai-summary.js`, `ai-chat.css`, `ai-summary.css` 파일을 포함시키고, 마크다운 파싱을 위한 `marked.js` 라이브러리를 로드해야 합니다.

### 1. 의존성 및 파일 로드

HTML의 `<head>` 또는 `<body>` 하단에 다음 코드를 추가하세요.

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<link rel="stylesheet" href="./ai-chat.css" />
<link rel="stylesheet" href="./ai-summary.css" />

<script src="./ai-core.js"></script>
<script src="./ai-chat.js"></script>
<script src="./ai-summary.js"></script>
```

### 2. HTML 구조 설정

#### 요약

```html
<section>
  <h2 class="ai-summary-title">AI 요약</h2>
  <div id="summary-box"></div>
</section>
```

#### 채팅

채팅이 표시될 컨테이너와 입력 폼을 작성합니다.

```html
<div id="chat-box"></div>
<form id="chat-form">
  <input type="text" id="chat-input" placeholder="질문을 입력하세요..." />
  <button type="submit">전송</button>
</form>
```

---

## 사용법

### 스트리밍 데이터 구조
AICore는 백엔드에서 **줄바꿈(\n)**으로 구분된 다음과 같은 형식의 데이터(OPENAI 응답 참조함)가 들어온다고 가정하고 설계되었습니다. 구조가 다를 경우 ai-core.js의 파싱 로직을 수정해야 합니다.
```
data: {"choices":[{"delta":{"reasoning_content":"생각 중..."}}]}

data: {"choices":[{"delta":{"content":"안녕하세요 "}}]}

data: {"choices":[{"delta":{"content":"반갑습니다."}}]}

data: [DONE]
```

**ai-core.js**
```js
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

    ...
  }

  ...
}
```
### 📝 AISummary (요약형)

페이지 로딩 후 `start`를 호출해 시작합니다.

```js
const summaryService = new AISummary("#summary-box", {
  endpoint: "/api/summary",
});

// 방법 1: 질문과 함께 요청
summaryService.start({
  // payload 형태는 backend API 요구사항에 맞게 작성 (payload 내부 구조 그대로 Body에 직렬화되어 엔드포인트로 전송)
  payload: {
    model: "gpt-4",
    messages: [{ role: "user", content: "취업규칙 요약해줘" }],
    stream: true,
  },
  callbacks: {
    onStart: () => {},
    onComplete: () => {},
  },
});

// 방법 2: 질문 없이 바로 요청
summaryService.start();
```

### 💬 AIChat (대화형)

`submitQuestion` 옵션 객체 규격을 사용하여 대화를 주고받습니다.

```js
const chatService = new AIChat("#chat-box", {
  endpoint: "/api/chat", // 개발팀 챗봇 API 주소
  headers: {
    "Content-Type": "application/json",
    // 필요한 경우 인증 토큰 등을 추가
    // "Authorization": "Bearer ..."
  },
});

// 전송 이벤트 리스너 예시
document.querySelector("#chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.querySelector("#chat-input");
  const text = input.value.trim();

  if (!text) return;
  input.value = "";

  // API 규격에 맞는 페이로드 전송
  await chatService.submitQuestion({
    // payload 형태는 backend API 요구사항에 맞게 작성 (payload 내부 구조 그대로 Body에 직렬화되어 엔드포인트로 전송)
    payload: {
      model: "gpt-4",
      messages: [{ role: "user", content: text }],
      stream: true,
    },
    callbacks: {
      onStart: () => console.log("질문 시작"),
      onComplete: () => console.log("답변이 완료되었습니다."),
      onError: (err) => alert("오류 발생: " + err.message),
    },
  });
});
```
---

## UI 커스터마이징

디자인 수정은 두 가지 방법으로 가능합니다.

### 1. CSS 변수 수정

`ai-chat.css`, `ai-summary.css` 상단의 `:root` 변수를 수정하여 전체적인 룩앤필을 즉시 변경할 수 있습니다. 모든 변수에는 충돌 방지를 위해 `--ai-chat-`, `--ai-summary-` 접두사가 붙어 있습니다.

### 2. 클래스 직접 수정

세밀한 디자인 제어가 필요한 경우 `ai-chat.css`, `ai-summary.css` 내의 클래스를 직접 수정하세요.
