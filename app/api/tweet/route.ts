import { NextRequest, NextResponse } from "next/server";

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tweetId = searchParams.get("id");

  if (!tweetId) {
    return NextResponse.json({ error: "Tweet ID is required" }, { status: 400 });
  }

  if (!TWITTER_BEARER_TOKEN) {
    return NextResponse.json({ error: "Twitter Bearer Token not configured" }, { status: 500 });
  }

  const url = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=created_at,public_metrics,entities,attachments&expansions=author_id,attachments.media_keys&user.fields=name,username,profile_image_url,verified,public_metrics&media.fields=url,preview_image_url,type,width,height`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json(
      { error: error.detail || "Failed to fetch tweet" },
      { status: response.status }
    );
  }

  const data = await response.json();

  const tweet = data.data;
  const author = data.includes?.users?.[0];
  const media = data.includes?.media;

  return NextResponse.json({
    id: tweet.id,
    text: tweet.text,
    created_at: tweet.created_at,
    metrics: tweet.public_metrics,
    entities: tweet.entities,
    author: {
      name: author?.name,
      username: author?.username,
      profile_image_url: author?.profile_image_url,
      verified: author?.verified,
      followers: author?.public_metrics?.followers_count,
    },
    media: media || [],
  });
}
