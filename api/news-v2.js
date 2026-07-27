const axios = require("axios");
const xml2js = require("xml2js");

const RSS_URL = "https://lavozdetomelloso.com/rss";

function extractGuid(url = "") {
  const match = url.match(/\/(\d+)\//);
  return match ? match[1] : "";
}

module.exports = async (req, res) => {
  try {
    const rssResponse = await axios.get(RSS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const rssData = await xml2js.parseStringPromise(rssResponse.data);

    const items = rssData.rss.channel[0].item || [];
    console.log(items[0]);

    const news = items
      .slice(0, 15)
      .reverse()
      .map(item => {
        const link = item.link?.[0] || "";

        return {
          guid: extractGuid(link),
          title: item.title?.[0] || "",
          date: item.pubDate?.[0] || "",
          link
        };
      });

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
