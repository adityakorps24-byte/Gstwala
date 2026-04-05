"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

type NoticeType =
  | "GSTR-3B vs GSTR-1 mismatch"
  | "Late filing notice"
  | "ITC mismatch";

type GenerateResponse = {
  explanation: string;
  replyDraft: string;
  checklist: string[];
};

function textForCopyChecklist(items: string[]) {
  return items.map((x) => `- ${x}`).join("\n");
}

export default function Home() {
  const [noticeType, setNoticeType] = useState<NoticeType>(
    "GSTR-3B vs GSTR-1 mismatch",
  );
  const [noticeContent, setNoticeContent] = useState("");
  const [userExplanation, setUserExplanation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const [copiedKey, setCopiedKey] = useState<
    "explanation" | "replyDraft" | "checklist" | null
  >(null);

  const canSubmit = useMemo(() => {
    if (!noticeContent.trim()) return false;
    if (!userExplanation.trim()) return false;
    return true;
  }, [noticeContent, userExplanation]);

  async function copyText(key: "explanation" | "replyDraft" | "checklist") {
    if (!result) return;
    const text =
      key === "checklist"
        ? textForCopyChecklist(result.checklist)
        : result[key];

    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1200);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          noticeType,
          noticeContent,
          userExplanation,
        }),
      });

      const data = (await res.json()) as
        | { error: string }
        | GenerateResponse;

      if (!res.ok) {
        if ("error" in data) throw new Error(data.error);
        throw new Error("Request failed.");
      }

      setResult(data as GenerateResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.title}>GST WALA (India)</div>
          <div className={styles.subtitle}>
            Simple explanations and professional reply drafts for GST notices.
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h1 className={styles.h1}>Generate a GST Notice Reply</h1>
          <p className={styles.help}>
            Paste the notice text, add your explanation, and get a simple Hindi +
            English explanation, a reply draft, and a document checklist.
          </p>

          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="noticeType">
                Notice Type
              </label>
              <select
                id="noticeType"
                className={styles.input}
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value as NoticeType)}
              >
                <option value="GSTR-3B vs GSTR-1 mismatch">
                  GSTR-3B vs GSTR-1 mismatch
                </option>
                <option value="Late filing notice">Late filing notice</option>
                <option value="ITC mismatch">ITC mismatch</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="noticeContent">
                Notice Content
              </label>
              <textarea
                id="noticeContent"
                className={styles.textarea}
                placeholder="Paste the GST notice content here…"
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                rows={7}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="userExplanation">
                Your Explanation
              </label>
              <textarea
                id="userExplanation"
                className={styles.textarea}
                placeholder="Explain your situation in simple words…"
                value={userExplanation}
                onChange={(e) => setUserExplanation(e.target.value)}
                rows={6}
              />
            </div>

            <div className={styles.actions}>
              <button
                className={styles.button}
                type="submit"
                disabled={!canSubmit || loading}
              >
                {loading ? (
                  <span className={styles.spinnerWrap}>
                    <span className={styles.spinner} />
                    Generating…
                  </span>
                ) : (
                  "Generate Reply"
                )}
              </button>

              <div className={styles.disclaimer}>
                This is an AI-generated draft. Please verify with a professional
                before submission.
              </div>
            </div>
          </form>

          {error ? <div className={styles.error}>{error}</div> : null}
        </section>

        {result ? (
          <section className={styles.results}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.h2}>1) Explanation (Hindi + English)</h2>
                <button
                  type="button"
                  className={styles.copy}
                  onClick={() => copyText("explanation")}
                >
                  {copiedKey === "explanation" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className={styles.output}>{result.explanation}</pre>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.h2}>2) Reply Draft</h2>
                <button
                  type="button"
                  className={styles.copy}
                  onClick={() => copyText("replyDraft")}
                >
                  {copiedKey === "replyDraft" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className={styles.output}>{result.replyDraft}</pre>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.h2}>3) Document Checklist</h2>
                <button
                  type="button"
                  className={styles.copy}
                  onClick={() => copyText("checklist")}
                >
                  {copiedKey === "checklist" ? "Copied" : "Copy"}
                </button>
              </div>
              <ul className={styles.list}>
                {result.checklist.map((item, idx) => (
                  <li key={`${idx}-${item}`} className={styles.listItem}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          No login. No database. Lightweight.
        </div>
      </footer>
    </div>
  );
}
