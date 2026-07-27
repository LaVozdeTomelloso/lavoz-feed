const axios = require("axios");
const xml2js = require("xml2js");

const ATOM_URL = "https://lavoz-feed.vercel.app/atom.xml";

function extractGuid(url = "") {
  const match = url.match(/\/(\d+)\//);
  return match ? match[1] : "";
}

function stripCdata(value) {
  if (!value) return "";
  return typeof value === "string" ? value.trim() : "";
}

module.exports = async (req, res) => {

  try {

    const response = await axios.get(ATOM_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const atom = await xml2js.parseStringPromise(response.data);

    const entries = atom.feed.entry || [];

    const news = entries.map(entry => ({

      guid: extractGuid(entry.id?.[0] || entry.link?.[0]?.$.href || ""),

      title: stripCdata(entry.title?.[0]?._ || entry.title?.[0]),

      subtitle: stripCdata(entry.summary?.[0]?._ || entry.summary?.[0]),

      date: entry.updated?.[0] || "",

      author: entry.author?.[0]?.name?.[0] || "",

      category: entry.category?.[0] || "",

      link: entry.link?.[0]?.$.href || ""

    }));

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
