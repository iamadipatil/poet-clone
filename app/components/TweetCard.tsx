"use client";

import React from "react";

export interface TweetData {
  id: string;
  text: string;
  created_at: string;
  metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
  entities?: {
    urls?: { url: string; expanded_url: string; display_url: string }[];
    mentions?: { username: string }[];
    hashtags?: { tag: string }[];
  };
  author: {
    name: string;
    username: string;
    profile_image_url: string;
    verified: boolean;
    followers: number;
  };
  media: {
    url?: string;
    preview_image_url?: string;
    type: string;
  }[];
}

interface TweetCardProps {
  tweet: TweetData;
  dark?: boolean;
  showMetrics?: boolean;
}

function proxy(url: string) {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const time = date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const d = date.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric" });
  return `${time} · ${d}`;
}

function renderText(text: string, entities: TweetData["entities"], linkColor: string) {
  let display = text;
  if (entities?.urls) {
    for (const u of entities.urls) display = display.replace(u.url, u.display_url);
  }
  return display.split(/(\s+)/).map((part, i) => {
    if (
      part.startsWith("@") ||
      part.startsWith("#") ||
      part.startsWith("http") ||
      /^[a-z0-9.-]+\.(com|net|org|io|co|app)/i.test(part)
    ) {
      return <span key={i} style={{ color: linkColor }}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function TweetCard({ tweet, dark = false, showMetrics = true }: TweetCardProps) {
  const cardBg    = dark ? "rgba(21, 32, 43, 0.90)"   : "rgba(255, 255, 255, 0.88)";
  const textColor = dark ? "#e7e9ea"                   : "#0d1117";
  const subColor  = dark ? "#6e767d"                   : "#94a3b8";
  const divider   = dark ? "rgba(255,255,255,0.08)"    : "rgba(0,0,0,0.07)";
  const linkColor = dark ? "#60a5fa"                   : "#3b82f6";

  const avatar     = tweet.author.profile_image_url?.replace("_normal", "_bigger");
  const imageMedia = tweet.media.filter((m) => m.type === "photo" && (m.url || m.preview_image_url));

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 20,
        padding: "36px 40px",
        width: "100%",
        maxWidth: 580,
        boxShadow: dark
          ? "0 12px 48px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)"
          : "0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Helvetica, Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Author */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar ? proxy(avatar) : ""}
          alt={tweet.author.name}
          style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: textColor, letterSpacing: "-0.1px" }}>
              {tweet.author.name}
            </span>
            {tweet.author.verified && (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="#1d9bf0">
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C3.13 9.33 2.25 10.57 2.25 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Tweet text */}
      <p
        style={{
          fontSize: 20,
          lineHeight: 1.65,
          color: textColor,
          marginBottom: 22,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          letterSpacing: "-0.1px",
        }}
      >
        {renderText(tweet.text, tweet.entities, linkColor)}
      </p>

      {/* Media */}
      {imageMedia.length > 0 && (
        <div style={{ marginBottom: 20, borderRadius: 12, overflow: "hidden" }}>
          {imageMedia.length === 1 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxy(imageMedia[0].url || imageMedia[0].preview_image_url || "")}
              alt="media"
              style={{ width: "100%", objectFit: "cover", maxHeight: 280, display: "block" }}
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {imageMedia.slice(0, 4).map((m, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={proxy(m.url || m.preview_image_url || "")}
                  alt="media"
                  style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div style={{ fontSize: 14, color: subColor, marginBottom: showMetrics ? 16 : 0 }}>
        {formatTimestamp(tweet.created_at)}
      </div>

      {/* Metrics */}
      {showMetrics && (
        <div
          style={{
            display: "flex",
            gap: 22,
            paddingTop: 14,
            borderTop: `1px solid ${divider}`,
            flexWrap: "wrap",
          }}
        >
          {[
            { count: tweet.metrics.reply_count,   label: "replies"  },
            { count: tweet.metrics.retweet_count, label: "shares"   },
            { count: tweet.metrics.like_count,    label: "likes"    },
          ].map(({ count, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: textColor }}>
                {formatNumber(count)}
              </span>
              <span style={{ fontSize: 14, color: subColor }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
