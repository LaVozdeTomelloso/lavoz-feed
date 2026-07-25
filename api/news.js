const axios = require("axios");
const cheerio = require("cheerio");
const xml2js = require("xml2js");

const ATOM_URL = "https://lavoz-feed.vercel.app/atom.xml";
const MAX_NEWS = Number(process.env.NEWS_WINDOW || 30);

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

function htmlToText(html = "") {
  const $ = cheerio.load(html);

  $("img").remove();

  return cleanText($.text());
}

function readingTime(words) {
  return Math.max(1, Math.ceil(words / 200));
}

function extractGuid(url = "") {
  const match = url.match(/\/(\d+)\//);
  return match ? match[1] : "";
}

function extractImage(html = "") {
  const $ = cheerio.load(html);
  return $("img").first().attr("src") || "";
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
async function loadFeed() {

  const { data } = await axios.get(ATOM_URL, HTTP_HEADERS);

  const parser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: true,
    trim: true
  });

  const xml = await parser.parseStringPromise(data);

  const entries = xml.feed.entry || [];

  return Array.isArray(entries)
    ? entries.slice(0, MAX_NEWS)
    : [entries];

}

async function buildNews(entry) {

  const title = cleanText(entry.title?._ || entry.title || "");

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

  const subtitle = cleanText(parts.slice(1).join("|||"));

  const html =
    entry.content?._ ||
    entry.content ||
    "";

  const image = extractImage(html);

  const body = htmlToText(html);
 
  const words = body
    .split(/\s+/)
    .filter(Boolean)
    .length;

  return {

    guid,

    title,

    subtitle,

category: normalizeCategory(category || section),
    author: normalizeAuthor(
  entry.author?.name ||
  entry.author ||
  ""
),

    date: entry.updated,

    link,

    image,

    body: limitBody(body),

    wordCount: words,

    readingTime: readingTime(words)

  };

}
module.exports = async (req, res) => {

  try {

    const entries = await loadFeed();

    const news = [];

    for (const entry of entries) {
      news.push(await buildNews(entry));
    }

    news.sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date)
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
function htmlToText(html = "", subtitle = "") {

  const $ = cheerio.load(html);

  $("img").remove();

  $("figure").remove();

  $("script").remove();

  $("style").remove();

  $("noscript").remove();

  $("strong").each((i, el) => {

    const txt = cleanText($(el).text());

    if (
      subtitle &&
      txt.toLowerCase() === subtitle.toLowerCase()
    ) {
      $(el).closest("p").remove();
    }

  });

  $("p").each((i, el) => {

    const txt = cleanText($(el).text());

    if (!txt) {
      $(el).remove();
    }

  });

  return cleanText($.text());

}
function normalizeCategory(category = "") {

  return cleanText(category)
    .replace(/\s+/g, " ");

}

function normalizeAuthor(author = "") {

  return cleanText(author);

}
