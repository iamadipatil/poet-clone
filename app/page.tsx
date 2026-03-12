"use client";

import { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import TweetCard, { TweetData } from "./components/TweetCard";

const GRADIENTS = [
  { name: "Peach",    value: "linear-gradient(135deg, #fde68a 0%, #fca5a5 50%, #f9a8d4 100%)", accent: "#9b3f48" },
  { name: "Midnight", value: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)", accent: "#2c3e7a" },
  { name: "Slate",    value: "linear-gradient(135deg, #334155 0%, #1e293b 50%, #0f172a 100%)", accent: "#1a252f" },
];

const FORMAT_OPTIONS = [
  { id: "card",    label: "Card",    sub: "Free size",   exportW: null,  exportH: null  },
  { id: "twitter", label: "Twitter", sub: "1200 × 675",  exportW: 1200,  exportH: 675   },
  { id: "story",   label: "Story",   sub: "1080 × 1920", exportW: 1080,  exportH: 1920  },
] as const;

type ExportFormat = typeof FORMAT_OPTIONS[number]["id"];

const LORA = "var(--font-lora), Georgia, serif";
const HIGHLIGHT_COLOR = "#fef9c3";

function renderHighlighted(text: string) {
  const parts = text.split(/(==[^=]+?==)/g);
  return parts.map((part, i) => {
    if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
      return (
        <mark key={i} style={{ background: HIGHLIGHT_COLOR, borderRadius: 4, padding: "1px 3px", fontStyle: "inherit", color: "inherit" }}>
          {part.slice(2, -2)}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

type Mode = "text" | "tweet";

export default function Home() {
  const [mode, setMode]               = useState<Mode>("text");
  const [text, setText]               = useState("");
  const [tweetUrl, setTweetUrl]       = useState("");
  const [tweet, setTweet]             = useState<TweetData | null>(null);
  const [gradient, setGradient]       = useState(GRADIENTS[0]);
  const [source, setSource]           = useState("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("card");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [exporting, setExporting]     = useState(false);
  const [copied, setCopied]           = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchTweet = async () => {
    if (!tweetUrl.trim()) return;
    setLoading(true);
    setError("");
    setTweet(null);
    try {
      const match = tweetUrl.match(/status\/(\d+)/);
      const id = match ? match[1] : tweetUrl.trim();
      const res = await fetch(`/api/tweet?id=${id}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch tweet");
      setTweet(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch tweet");
    } finally {
      setLoading(false);
    }
  };

  const getDataUrl = useCallback(async () => {
    if (!canvasRef.current) return null;
    const fmt = FORMAT_OPTIONS.find((f) => f.id === exportFormat)!;
    if (fmt.exportW && fmt.exportH) {
      const padding = exportFormat === "story" ? "140px 100px" : "56px 48px";
      return toPng(canvasRef.current, {
        width: fmt.exportW,
        height: fmt.exportH,
        pixelRatio: 1,
        cacheBust: true,
        style: { borderRadius: "0px", padding },
      });
    }
    return toPng(canvasRef.current, { pixelRatio: 3, cacheBust: true });
  }, [exportFormat]);

  const download = useCallback(async () => {
    setExporting(true);
    try {
      const url = await getDataUrl();
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.download = `bss-${exportFormat}-${Date.now()}.png`;
      a.click();
    } finally {
      setExporting(false);
    }
  }, [getDataUrl, exportFormat]);

  const copyImage = useCallback(async () => {
    setExporting(true);
    try {
      const url = await getDataUrl();
      if (!url) return;
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setExporting(false);
    }
  }, [getDataUrl]);

  const hasContent = mode === "text" ? text.trim().length > 0 : tweet !== null;

  // Canvas styles per format
  const canvasStyle: React.CSSProperties =
    exportFormat === "story"
      ? { height: 540, width: "auto", aspectRatio: "1080/1920", borderRadius: 20, flexShrink: 0 }
      : exportFormat === "twitter"
      ? { width: "100%", aspectRatio: "1200/675", borderRadius: 20 }
      : { width: "100%", borderRadius: 24 };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f0f5",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "18px 32px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <span style={{ fontFamily: LORA, fontWeight: 700, fontSize: 24, letterSpacing: "-0.3px", fontStyle: "italic" }}>
          Beautiful Screen Shot
        </span>
      </header>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          padding: "32px 24px",
          gap: 32,
          boxSizing: "border-box",
        }}
      >
        {/* ── Left panel ── */}
        <aside style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: "#e2e2e8", borderRadius: 12, padding: 4 }}>
            {(["text", "tweet"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer",
                  background: mode === m ? "#fff" : "transparent",
                  fontWeight: mode === m ? 700 : 500,
                  color: mode === m ? "#111" : "#666",
                  fontSize: 14, transition: "all 0.15s",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                }}
              >
                {m === "text" ? "Text" : "Tweet"}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {mode === "text" ? "Your Text" : "Tweet URL"}
            </label>

            {mode === "text" ? (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={"Type your text here…\n\nWrap words in ==double equals== to highlight them."}
                  rows={7}
                  style={{
                    padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d1d8",
                    fontSize: 15, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit",
                    outline: "none", background: "#fff", boxSizing: "border-box", width: "100%", color: "#111",
                  }}
                />
                <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
                  Tip: wrap words in <code style={{ background: "#f0f0f5", padding: "1px 4px", borderRadius: 4 }}>{`==like this==`}</code> to highlight them.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Source / Attribution
                  </label>
                  <input
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. Marcus Aurelius, Meditations"
                    style={{
                      padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d1d8",
                      fontSize: 14, outline: "none", background: "#fff", color: "#111",
                      fontFamily: "inherit", boxSizing: "border-box", width: "100%",
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={tweetUrl}
                    onChange={(e) => setTweetUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchTweet()}
                    placeholder="https://x.com/user/status/…"
                    style={{
                      flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid #d1d1d8",
                      fontSize: 14, outline: "none", background: "#fff", color: "#111", boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={fetchTweet}
                    disabled={loading || !tweetUrl.trim()}
                    style={{
                      padding: "11px 16px", borderRadius: 10, border: "none",
                      cursor: loading || !tweetUrl.trim() ? "not-allowed" : "pointer",
                      background: "#111", color: "#fff", fontWeight: 600, fontSize: 14,
                      opacity: loading || !tweetUrl.trim() ? 0.5 : 1, whiteSpace: "nowrap",
                    }}
                  >
                    {loading ? "…" : "Fetch"}
                  </button>
                </div>
                {error && <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{error}</p>}
              </>
            )}
          </div>

          {/* Gradient picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Background
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {GRADIENTS.map((g) => (
                <button
                  key={g.name}
                  onClick={() => setGradient(g)}
                  title={g.name}
                  style={{
                    width: 36, height: 36, borderRadius: 9, background: g.value,
                    border: gradient.name === g.name ? "3px solid #111" : "3px solid transparent",
                    cursor: "pointer", transition: "border 0.1s", outline: "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Export format */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Export Format
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setExportFormat(f.id)}
                  style={{
                    flex: 1, padding: "10px 4px", borderRadius: 10,
                    border: exportFormat === f.id ? "2px solid #111" : "1.5px solid #d1d1d8",
                    cursor: "pointer",
                    background: exportFormat === f.id ? "#111" : "#fff",
                    color: exportFormat === f.id ? "#fff" : "#111",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{f.label}</span>
                  <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 400 }}>{f.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          {hasContent && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <button
                onClick={download}
                disabled={exporting}
                style={{
                  padding: "13px", borderRadius: 10, border: "none",
                  cursor: exporting ? "not-allowed" : "pointer",
                  background: "#111", color: "#fff", fontWeight: 700, fontSize: 15,
                  opacity: exporting ? 0.6 : 1,
                }}
              >
                {exporting ? "Saving…" : "Download PNG"}
              </button>
              <button
                onClick={copyImage}
                disabled={exporting}
                style={{
                  padding: "12px", borderRadius: 10, border: "1.5px solid #d1d1d8",
                  cursor: exporting ? "not-allowed" : "pointer",
                  background: "#fff", color: "#111", fontWeight: 600, fontSize: 15,
                  opacity: exporting ? 0.6 : 1,
                }}
              >
                {copied ? "Copied!" : "Copy Image"}
              </button>
            </div>
          )}
        </aside>

        {/* ── Preview ── */}
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 480,
            overflow: "hidden",
          }}
        >
          {hasContent ? (
            <div
              ref={canvasRef}
              style={{
                background: gradient.value,
                padding: "56px 48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                ...canvasStyle,
              }}
            >
              {mode === "text" ? (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "32px 36px",
                    width: "100%",
                    maxWidth: 560,
                    boxShadow: "0 8px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
                    boxSizing: "border-box",
                  }}
                >
                  <p
                    style={{
                      margin: 0, fontSize: 20, lineHeight: 1.75, color: "#111",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      fontFamily: LORA, fontStyle: "italic",
                    }}
                  >
                    {renderHighlighted(text)}
                  </p>
                  {source.trim() && (
                    <div
                      style={{
                        marginTop: 20, paddingTop: 16,
                        borderTop: `1.5px solid ${gradient.accent}22`,
                        display: "flex", justifyContent: "flex-end",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: LORA, fontStyle: "italic", fontSize: 14,
                          color: gradient.accent, letterSpacing: "0.01em", opacity: 0.85,
                        }}
                      >
                        — {source.trim()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                tweet && <TweetCard tweet={tweet} dark={false} showMetrics={false} />
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#aaa", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth={1.5}>
                <rect x={3} y={3} width={18} height={18} rx={3} />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <p style={{ fontSize: 15, margin: 0 }}>
                {mode === "text" ? "Enter text to preview your card" : "Paste a tweet URL to preview"}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
