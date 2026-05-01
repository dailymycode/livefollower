const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_USERNAME = "dailymycode";

app.use(express.static(path.join(__dirname, "public")));

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
  Referer: "https://www.instagram.com/",
  "X-IG-App-ID": "936619743392459",
  "X-Requested-With": "XMLHttpRequest",
};

function parseFollowerCount(html) {
  const patterns = [
    /"edge_followed_by"\s*:\s*\{"count"\s*:\s*(\d+)\}/,
    /"follower_count"\s*:\s*(\d+)/,
    /"followers"\s*:\s*\{"count"\s*:\s*(\d+)\}/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return Number(match[1]);
    }
  }

  // Fallback: meta description often contains follower text.
  const metaMatch = html.match(
    /content="([^"]*(Followers|followers|takipçi|Takipçi)[^"]*)"/
  );
  if (!metaMatch || !metaMatch[1]) {
    return null;
  }

  const text = metaMatch[1];
  const countMatch = text.match(
    /([\d.,]+(?:\s?[kKmMbB])?)\s*(Followers|followers|takipçi|Takipçi)/
  );
  if (!countMatch || !countMatch[1]) {
    return null;
  }

  const raw = countMatch[1].replace(/\s/g, "");
  const suffix = raw.slice(-1).toLowerCase();
  const base = raw.replace(/[kmbKMB]/g, "").replace(/,/g, ".");
  const numeric = Number(base);

  if (Number.isNaN(numeric)) {
    return null;
  }

  if (suffix === "k") {
    return Math.round(numeric * 1_000);
  }
  if (suffix === "m") {
    return Math.round(numeric * 1_000_000);
  }
  if (suffix === "b") {
    return Math.round(numeric * 1_000_000_000);
  }

  return Number(raw.replace(/[.,]/g, ""));
}

app.get("/api/followers", async (req, res) => {
  try {
    const profileApiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${TARGET_USERNAME}`;
    let followerCount = null;
    let source = "instagram.com/web_profile_info";

    try {
      const profileResponse = await axios.get(profileApiUrl, {
        headers: BROWSER_HEADERS,
        timeout: 10000,
      });
      followerCount =
        profileResponse?.data?.data?.user?.edge_followed_by?.count ?? null;
    } catch (apiError) {
      // Fallback to raw profile HTML when the JSON endpoint is blocked.
      source = "instagram.com/profile_html";
    }

    if (followerCount === null) {
      const instagramUrl = `https://www.instagram.com/${TARGET_USERNAME}/`;
      const { data } = await axios.get(instagramUrl, {
        headers: {
          ...BROWSER_HEADERS,
          Accept: "text/html,application/xhtml+xml",
        },
        timeout: 10000,
      });
      followerCount = parseFollowerCount(data);
    }

    if (followerCount === null) {
      return res.status(502).json({
        ok: false,
        message: "Takipci bilgisi Instagram yanitindan parse edilemedi.",
      });
    }

    return res.json({
      ok: true,
      username: TARGET_USERNAME,
      followers: followerCount,
      source,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Instagram verisi alinamadi.",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Live follower app running: http://localhost:${PORT}`);
});
