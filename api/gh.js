// Vercel serverless proxy for the GitHub REST API.
// vercel.json rewrites /api/gh/<path>?<query> to /api/gh?path=<path>&<query>.
// Adds a server-side token (GITHUB_TOKEN env var) so every visitor shares the
// authenticated 5,000 requests/hour limit. The token is never sent to the
// browser. Read-only: only GET requests to the public endpoints DevMind uses.
const ALLOWED = ["repos/", "search/", "users/", "user", "rate_limit"];
const FORWARD_HEADERS = ["x-ratelimit-remaining", "x-ratelimit-limit", "x-ratelimit-reset", "content-type"];

function upstreamQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    (Array.isArray(value) ? value : [value]).forEach((item) => search.append(key, item));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Only GET requests are proxied." });
    return;
  }
  const { path: rawPath = "", ...rest } = req.query || {};
  const path = String(Array.isArray(rawPath) ? rawPath.join("/") : rawPath).replace(/^\/+/, "");
  if (!ALLOWED.some((prefix) => path === prefix || path.startsWith(prefix))) {
    res.status(403).json({ message: "This GitHub path is not permitted." });
    return;
  }
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "DevMind-AI" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const upstream = await fetch(`https://api.github.com/${path}${upstreamQuery(rest)}`, { headers });
    const body = await upstream.text();
    FORWARD_HEADERS.forEach((name) => {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    });
    res.status(upstream.status).send(body);
  } catch {
    res.status(502).json({ message: "Could not reach GitHub. Try again shortly." });
  }
};
