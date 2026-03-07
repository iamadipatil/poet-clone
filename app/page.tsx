"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import TweetCard, { TweetData } from "./components/TweetCard";

// ─── Gradients ────────────────────────────────────────────────────────────────
interface Gradient { id: string; label: string; css: string; dark?: boolean }

const GRADIENTS: Gradient[] = [
  { id: "sunrise",  label: "Sunrise",      css: "linear-gradient(135deg, #f5a090 0%, #e8a8be 35%, #d0b0e0 65%, #a8c4e8 100%)" },
  { id: "lavender", label: "Lavender",     css: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)" },
  { id: "peach",    label: "Peach",        css: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)" },
  { id: "sky",      label: "Sky",          css: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)" },
  { id: "mint",     label: "Mint",         css: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)" },
  { id: "rose",     label: "Rose",         css: "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)" },
  { id: "lemon",    label: "Lemon",        css: "linear-gradient(135deg, #fefce8 0%, #fef08a 100%)" },
  { id: "lilac",    label: "Lilac",        css: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)" },
  { id: "cotton",   label: "Cotton Candy", css: "linear-gradient(135deg, #fce7f3 0%, #e0f2fe 100%)" },
  { id: "aurora",   label: "Aurora",       css: "linear-gradient(135deg, #cffafe 0%, #c4b5fd 100%)" },
  { id: "ocean",    label: "Ocean",        css: "linear-gradient(135deg, #7dd3fc 0%, #818cf8 100%)" },
  { id: "flame",    label: "Flame",        css: "linear-gradient(135deg, #fda4af 0%, #fb923c 100%)" },
  { id: "midnight", label: "Midnight",     css: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", dark: true },
  { id: "charcoal", label: "Charcoal",     css: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", dark: true },
  { id: "forest",   label: "Forest",       css: "linear-gradient(135deg, #14532d 0%, #052e16 100%)", dark: true },
];

// ─── Sizes ────────────────────────────────────────────────────────────────────
interface Size { id: string; label: string; ratio?: string }
const SIZES: Size[] = [
  { id: "auto", label: "Auto"  },
  { id: "sq",   label: "1 : 1", ratio: "1 / 1"  },
  { id: "p45",  label: "4 : 5", ratio: "4 / 5"  },
  { id: "l169", label: "16 : 9", ratio: "16 / 9" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractTweetId(input: string): string | null {
  const m = input.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
  if (m) return m[1];
  if (/^\d+$/.test(input.trim())) return input.trim();
  return null;
}

type Panel = "color" | "size" | "card" | null;

export default function Home() {
  const [input,       setInput]       = useState("");
  const [tweet,       setTweet]       = useState<TweetData | null>(null);
  const [gradient,    setGradient]    = useState<Gradient>(GRADIENTS[0]);
  const [size,        setSize]        = useState<Size>(SIZES[0]);
  const [darkCard,    setDarkCard]    = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [openPanel,   setOpenPanel]   = useState<Panel>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [downloading, setDownloading] = useState(false);
  const [copied,      setCopied]      = useState(false);

  const cardRef    = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside toolbar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync gradient dark → card dark
  useEffect(() => {
    if (gradient.dark) setDarkCard(true);
    else setDarkCard(false);
  }, [gradient]);

  const fetchTweet = useCallback(async () => {
    const id = extractTweetId(input);
    if (!id) { setError("Please enter a valid tweet URL or ID."); return; }
    setLoading(true); setError(""); setTweet(null);
    try {
      const res  = await fetch(`/api/tweet?id=${id}`);
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to fetch tweet.");
      else         setTweet(data);
    } catch { setError("Network error. Please try again."); }
    finally   { setLoading(false); }
  }, [input]);

  const capture = useCallback(async () => {
    if (!cardRef.current) return null;
    return toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
  }, []);

  const downloadImage = useCallback(async () => {
    setDownloading(true);
    try {
      const url = await capture();
      if (!url) return;
      const a = document.createElement("a");
      a.download = `tweet-${tweet?.id || "card"}.png`;
      a.href = url; a.click();
    } catch (e) { console.error(e); }
    finally { setDownloading(false); }
  }, [capture, tweet]);

  const copyImage = useCallback(async () => {
    try {
      const url = await capture();
      if (!url) return;
      const res  = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { console.error(e); }
  }, [capture]);

  const togglePanel = (p: Panel) => setOpenPanel(prev => prev === p ? null : p);

  // Mat style: fills space or constrains to aspect ratio
  const matStyle: React.CSSProperties = size.ratio
    ? { aspectRatio: size.ratio, height: "100%", maxHeight: "100%", width: "auto", maxWidth: "100%", background: gradient.css, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
    : { flex: 1, alignSelf: "stretch", width: "100%", background: gradient.css, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center" };

  const hasTweet = !!tweet;

  // ── Toolbar button ────────────────────────────────────────────────────────
  const ToolbarBtn = ({
    label, active, onClick, children,
  }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 5, padding: "10px 0", width: 88, background: "none", border: "none", cursor: "pointer",
        borderRadius: 12, transition: "background 0.15s",
        backgroundColor: active ? "#f0f0f5" : "transparent",
      }}
    >
      {children}
      <span style={{ fontSize: 11, color: "#8a8a9a", fontWeight: 500, letterSpacing: "0.01em" }}>
        {label}
      </span>
    </button>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#e8e8ed", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif" }}>

      {/* ── Top bar ── */}
      <header style={{
        height: 56, background: "#ffffff", borderBottom: "1px solid #e5e5ea",
        display: "flex", alignItems: "center", gap: 12, padding: "0 20px",
        flexShrink: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #a78bfa, #ec4899)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="white">
              <path d="M9 4h1.5a.5.5 0 01.5.5v15a.5.5 0 01-.5.5H9a.5.5 0 01-.5-.5v-15A.5.5 0 019 4zm5.5 0H16a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-1.5a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5z" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e", letterSpacing: "-0.3px" }}>poet</span>
        </div>

        {/* Input */}
        <div style={{ flex: 1, display: "flex", gap: 8, maxWidth: 700 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchTweet()}
            placeholder="Paste a tweet URL — https://x.com/user/status/..."
            style={{
              flex: 1, height: 36, borderRadius: 10, border: "1.5px solid #e5e5ea",
              padding: "0 14px", fontSize: 13, color: "#1a1a2e", outline: "none",
              background: "#fafafa",
            }}
          />
          <button
            onClick={fetchTweet}
            disabled={loading || !input.trim()}
            style={{
              height: 36, padding: "0 18px", borderRadius: 10, border: "none",
              background: loading || !input.trim() ? "#e5e5ea" : "#1a1a2e",
              color: loading || !input.trim() ? "#aaa" : "#fff",
              fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            }}
          >
            {loading ? (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ animation: "spin 0.8s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
              </svg>
            ) : "Generate"}
          </button>
        </div>

        {/* Error in top bar */}
        {error && (
          <span style={{ fontSize: 12, color: "#ef4444", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {error}
          </span>
        )}
      </header>

      {/* ── Preview area ── */}
      <main style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "28px 28px 0", overflow: "hidden", minHeight: 0,
      }}>
        {hasTweet ? (
          <div ref={cardRef} style={matStyle}>
            <TweetCard tweet={tweet} dark={darkCard} showMetrics={showMetrics} />
          </div>
        ) : (
          /* Empty state — soft placeholder mat */
          <div style={{
            ...matStyle,
            background: "linear-gradient(135deg, #f5a090 0%, #e8a8be 35%, #d0b0e0 65%, #a8c4e8 100%)",
          }}>
            <div style={{
              background: "rgba(255,255,255,0.88)", borderRadius: 20,
              padding: "36px 40px", maxWidth: 540, width: "100%",
              boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#e5e5ea", flexShrink: 0 }} />
                <div style={{ height: 16, width: 140, background: "#e5e5ea", borderRadius: 8 }} />
              </div>
              <p style={{ fontSize: 18, lineHeight: 1.65, color: "#94a3b8", marginBottom: 20 }}>
                Paste a tweet URL above and click Generate to create a beautiful image.
              </p>
              <div style={{ fontSize: 14, color: "#c4cdd6", marginBottom: 16 }}>Timestamp · Date</div>
              <div style={{ display: "flex", gap: 22, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.07)" }}>
                {["replies", "shares", "likes"].map(l => (
                  <div key={l} style={{ display: "flex", gap: 5 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#c4cdd6" }}>—</span>
                    <span style={{ fontSize: 14, color: "#c4cdd6" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom toolbar area ── */}
      <div style={{ display: "flex", justifyContent: "center", padding: "20px 24px 24px", flexShrink: 0, position: "relative" }}>
        <div ref={toolbarRef} style={{ position: "relative" }}>

          {/* ── Color popover ── */}
          {openPanel === "color" && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)",
              background: "#fff", borderRadius: 18, padding: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
              zIndex: 100, width: 268,
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#8a8a9a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Background</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {GRADIENTS.map(g => (
                  <button
                    key={g.id}
                    title={g.label}
                    onClick={() => { setGradient(g); setOpenPanel(null); }}
                    style={{
                      width: 40, height: 40, borderRadius: "50%", background: g.css, border: "none",
                      cursor: "pointer", padding: 0,
                      outline: gradient.id === g.id ? "2.5px solid #3b9eff" : "2px solid transparent",
                      outlineOffset: 2,
                      transform: gradient.id === g.id ? "scale(1.12)" : "scale(1)",
                      transition: "transform 0.15s, outline 0.1s",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Size popover ── */}
          {openPanel === "size" && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)",
              background: "#fff", borderRadius: 18, padding: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
              zIndex: 100, width: 240,
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#8a8a9a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Canvas Size</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SIZES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSize(s); setOpenPanel(null); }}
                    style={{
                      padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: size.id === s.id ? "#eff6ff" : "#f8f8fc",
                      color: size.id === s.id ? "#3b9eff" : "#4a4a5a",
                      fontSize: 13, fontWeight: size.id === s.id ? 600 : 500,
                      textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    {s.label}
                    {size.id === s.id && (
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#3b9eff" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Card style popover ── */}
          {openPanel === "card" && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)",
              background: "#fff", borderRadius: 18, padding: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
              zIndex: 100, width: 200,
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#8a8a9a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Card Style</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Light card", value: false },
                  { label: "Dark card",  value: true  },
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => { setDarkCard(opt.value); setOpenPanel(null); }}
                    style={{
                      padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: darkCard === opt.value ? "#eff6ff" : "#f8f8fc",
                      color: darkCard === opt.value ? "#3b9eff" : "#4a4a5a",
                      fontSize: 13, fontWeight: darkCard === opt.value ? 600 : 500,
                      textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    {opt.label}
                    {darkCard === opt.value && (
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#3b9eff" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── White pill toolbar ── */}
          <div style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: 0,
            boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          }}>

            {/* Color */}
            <ToolbarBtn label="Color" active={openPanel === "color"} onClick={() => togglePanel("color")}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: gradient.css,
                boxShadow: "inset 0 0 0 1.5px rgba(0,0,0,0.08)",
              }} />
            </ToolbarBtn>

            {/* Card */}
            <ToolbarBtn label="Card" active={openPanel === "card"} onClick={() => togglePanel("card")}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#5a5a6e" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </ToolbarBtn>

            {/* Response */}
            <ToolbarBtn label="Response" active={false} onClick={() => setShowMetrics(v => !v)}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill={showMetrics ? "#5a5a6e" : "none"} stroke="#5a5a6e" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </ToolbarBtn>

            {/* Size */}
            <ToolbarBtn label="Size" active={openPanel === "size"} onClick={() => togglePanel("size")}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#5a5a6e" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4.5" />
                <circle cx="12" cy="12" r="1" fill="#5a5a6e" />
              </svg>
            </ToolbarBtn>

            {/* Separator */}
            <div style={{ width: 1, height: 36, background: "#ebebf0", margin: "0 4px", flexShrink: 0 }} />

            {/* Copy */}
            <ToolbarBtn label="Copy" active={copied} onClick={copyImage}>
              {copied ? (
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#5a5a6e" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </ToolbarBtn>

            {/* Download — blue pill */}
            <button
              onClick={downloadImage}
              disabled={downloading}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 5, padding: "10px 0", width: 92, border: "none", cursor: downloading ? "not-allowed" : "pointer",
                borderRadius: 14, background: "#3b9eff", opacity: downloading ? 0.7 : 1, transition: "opacity 0.15s",
              }}
            >
              {downloading ? (
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span style={{ fontSize: 11, color: "white", fontWeight: 600, letterSpacing: "0.01em" }}>
                {downloading ? "Saving…" : "Download"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #b0b0bc; }
        input:focus { border-color: #3b9eff !important; outline: none; }
      `}</style>
    </div>
  );
}
