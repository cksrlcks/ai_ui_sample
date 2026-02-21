// api/summary.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const systemPrompt =
    "당신은 문서 요약 전문가입니다.해당하는 정보를 요약하세요.";
  const userPrompt =
    "일반적인 회사의 취업규칙에 대해서 알려줘, 3문장으로 간략하게 요약해줘";

  try {
    // --- 1. 가짜 추론(Reasoning) 문구 쪼개서 보내기 ---
    const reasoningSteps = [
      "취업규칙 관련 법규를 분석하는 중입니다...",
      "\n근로기준법 제93조 및 관련 판례를 검토하고 있습니다...",
      "\n핵심 요약 문장을 생성하기 위한 구조를 설계 중입니다...",
    ];

    for (const step of reasoningSteps) {
      const words = step.split(" ");
      for (const word of words) {
        const thoughtData = {
          choices: [{ delta: { reasoning_content: word + " " } }],
        };
        res.write(`data: ${JSON.stringify(thoughtData)}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
