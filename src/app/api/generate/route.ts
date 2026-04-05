import OpenAI from "openai";

type NoticeType =
  | "GSTR-3B vs GSTR-1 mismatch"
  | "Late filing notice"
  | "ITC mismatch";

type GenerateRequestBody = {
  noticeType: NoticeType;
  noticeContent: string;
  userExplanation: string;
};

type GenerateResponse = {
  explanation: string;
  replyDraft: string;
  checklist: string[];
};

function buildPrompt(input: GenerateRequestBody) {
  return `You are a GST expert in India.

A small business owner received this GST notice:
${input.noticeContent}

Notice type:
${input.noticeType}

Their explanation:
${input.userExplanation}

Tasks:
1. Explain the notice in very simple Hindi and English.
2. Draft a professional reply addressed to the GST officer.
3. Keep proper format: subject, reference, body, closing.
4. Suggest a checklist of documents to attach.

Keep it practical, legally safe, and easy to understand.

Return STRICT JSON with this shape:
{
  "explanation": "...",
  "replyDraft": "...",
  "checklist": ["...", "..."]
}
Do not include markdown fences.`;
}

function validateBody(body: unknown): GenerateRequestBody {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const b = body as Partial<GenerateRequestBody>;

  const allowed: NoticeType[] = [
    "GSTR-3B vs GSTR-1 mismatch",
    "Late filing notice",
    "ITC mismatch",
  ];

  if (!b.noticeType || !allowed.includes(b.noticeType as NoticeType)) {
    throw new Error("Invalid notice type.");
  }

  if (!b.noticeContent || typeof b.noticeContent !== "string") {
    throw new Error("Notice content is required.");
  }

  if (!b.userExplanation || typeof b.userExplanation !== "string") {
    throw new Error("User explanation is required.");
  }

  return {
    noticeType: b.noticeType as NoticeType,
    noticeContent: b.noticeContent,
    userExplanation: b.userExplanation,
  };
}

function normalizeModelJson(raw: string): GenerateResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI returned an invalid response.");
  }

  const p = parsed as Partial<GenerateResponse>;

  if (typeof p.explanation !== "string") {
    throw new Error("AI response missing explanation.");
  }

  if (typeof p.replyDraft !== "string") {
    throw new Error("AI response missing replyDraft.");
  }

  const checklist = Array.isArray(p.checklist)
    ? p.checklist.filter((x) => typeof x === "string" && x.trim().length > 0)
    : [];

  return {
    explanation: p.explanation.trim(),
    replyDraft: p.replyDraft.trim(),
    checklist,
  };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY. Set it in .env.local." },
        { status: 500 },
      );
    }

    const body = validateBody(await req.json());

    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: buildPrompt(body),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return Response.json(
        { error: "No content returned from AI." },
        { status: 502 },
      );
    }

    const normalized = normalizeModelJson(content);

    return Response.json(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return Response.json({ error: message }, { status: 400 });
  }
}
