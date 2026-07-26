const axios = require("axios");
const cheerio = require("cheerio");
const xml2js = require("xml2js");

const ATOM_URL = "https://lavoz-feed.vercel.app/atom.xml";
const MAX_NEWS = Number(process.env.NEWS_WINDOW || 20);

const HTTP_HEADERS = {
  headers: {
    "User-Agent": "Mozilla/5.0"
  },
  timeout: 15000
};
function cleanText(text = "") {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractGuid(url = "") {
  const match = url.match(/\/(\d+)\//);
  return match ? match[1] : "";
}

function readingTime(words) {
  return Math.max(1, Math.ceil(words / 200));
}

function limitBody(text = "", max = 4000) {

  if (text.length <= max) {
    return text;
  }

  const cut = text.lastIndexOf(".", max);

  if (cut > 0) {
    return text.substring(0, cut + 1);
  }

  return text.substring(0, max);

}

function normalizeCategory(category = "") {
  return cleanText(category).replace(/\s+/g, " ");
}

function normalizeAuthor(author = "") {
  return cleanText(author);
}

function parseContent(html = "", subtitle = "") {

  const $ = cheerio.load(html);

  const image = $("img").first().attr("src") || "";

  $("img").remove();
  $("figure").remove();
  $("script").remove();
  $("style").remove();
  $("noscript").remove();

  if (subtitle) {
    $("strong").each((_, el) => {
      const txt = cleanText($(el).text());

      if (txt.toLowerCase() === subtitle.toLowerCase()) {
        $(el).closest("p").remove();
      }
    });
  }

  $("p").each((_, el) => {
    if (!cleanText($(el).text())) {
      $(el).remove();
    }
  });

  const body = cleanText($.text());

  const wordCount = body
    .split(/\s+/)
    .filter(Boolean)
    .length;

  return {
    image,
    body,
    wordCount
  };

}

async function loadFeed() {

  const { data } = await axios.get(
    ATOM_URL,
    HTTP_HEADERS
  );

  const parser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: true,
    trim: true
  });

  const xml = await parser.parseStringPromise(data);

  let entries = xml.feed?.entry || [];

  if (!Array.isArray(entries)) {
    entries = [entries];
  }

  return entries.slice(-MAX_NEWS);

}

async function buildNews(entry) {

  const title = cleanText(
    entry.title?._ || entry.title || ""
  );

  const link =
    entry.link?.href ||
    entry.id ||
    "";

  const guid = extractGuid(link);

  const category = cleanText(
    entry.category_text ||
    entry.category ||
    ""
  );

  const summary =
    entry.summary?._ ||
    entry.summary ||
    "";

  const parts = summary.split("|||");

const section = cleanText(parts[0] || "");

let subtitle = "";

if (parts.length > 1) {
  subtitle = cleanText(parts[1]);

  // Si el supuesto subtítulo es demasiado largo,
  // realmente es el cuerpo del artículo.
  if (subtitle.length > 300) {
    subtitle = "";
  }
}

  const parsed = parseContent(html, subtitle);
    const words = parsed.wordCount;

  return {

    guid,

    title,

    subtitle,

    category: normalizeCategory(
      category || section
    ),

    author: normalizeAuthor(
      entry.author?.name ||
      entry.author ||
      ""
    ),

    date: entry.updated,

    link,

    image: parsed.image,

    body: limitBody(parsed.body),

    wordCount: words,

    readingTime: readingTime(words)

  };

}

module.exports = async (req, res) => {

  try {

    const entries = await loadFeed();

    const news = [];

    for (const entry of entries) {
      news.push(
        await buildNews(entry)
      );
    }

    news.sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );

    return res.status(200).json({

      status: "ok",

      generatedAt: new Date().toISOString(),

      count: news.length,

      news

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      status: "error",

      message: error.message

    });

  }

};
