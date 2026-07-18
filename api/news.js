const axios = require("axios");
const cheerio = require("cheerio");
const xml2js = require("xml2js");

module.exports = async (req, res) => {

  try {

    const after = String(req.query.after || "").trim();

    const rssResponse = await axios.get(
      "https://lavozdetomelloso.com/rss",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    const rssData =
      await xml2js.parseStringPromise(
        rssResponse.data
      );

    const channel =
      rssData.rss.channel[0];

    const items =
      channel.item || [];

let pending =
  [...items]
    .reverse();

    if (after) {

      const index =
        pending.findIndex(item => {

          let guid = "";

          if (item.guid) {

            if (typeof item.guid[0] === "string") {

              guid = item.guid[0];

            } else if (item.guid[0]._) {

              guid = item.guid[0]._;

            }

          }

          return guid === after;

        });

      if (index >= 0) {

        pending =
          pending.slice(index + 1);

      } else {

        return res.status(409).json({

          status: "desynchronized",

          message: "The requested GUID is no longer present in the RSS feed.",

          requestedGuid: after,

          firstGuid:
            items.length
              ? (typeof items[items.length - 1].guid[0] === "string"
                  ? items[items.length - 1].guid[0]
                  : items[items.length - 1].guid[0]._)
              : null,

          lastGuid:
            items.length
              ? (typeof items[0].guid[0] === "string"
                  ? items[0].guid[0]
                  : items[0].guid[0]._)
              : null,

          feedItems: items.length

        });

      }

    } else {

      pending =
        pending.slice(-1);

    }

    const news = [];
        for (const item of pending) {

      try {

        let guid = "";

        if (item.guid) {

          if (typeof item.guid[0] === "string") {

            guid = item.guid[0];

          } else if (item.guid[0]._) {

            guid = item.guid[0]._;

          }

        }

        const link =
          item.link[0];

        const response =
          await axios.get(link, {
            headers: {
              "User-Agent":
                "Mozilla/5.0"
            }
          });

        const $ =
          cheerio.load(response.data);

        const title =
          $("#titularN")
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim();

        const subtitle =
          $("h2.subtitulo")
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim();

        const author =
          $("span.autor")
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim();

        let image =
          $('meta[property="og:image"]')
            .attr("content") || "";

        if (!image) {

          image =
            $("img.img-fluid")
              .first()
              .attr("src") || "";

        }
                let category = "";

        const categoryElement =
          $('div.d-flex.justify-content-center a[href*="/Categoria/"]')
            .first();

        if (categoryElement.length) {

          category =
            categoryElement
              .text()
              .replace(/\s+/g, " ")
              .trim();

        }

        let articleContent = "";

        $("p").each((i, el) => {

          const text =
            $(el)
              .text()
              .replace(/\s+/g, " ")
              .trim();

          if (

            text.length > 80 &&

            !text.includes("Publicidad") &&

            !text.includes("Relacionados") &&

            !text.includes("WhatsApp") &&

            !text.includes("Facebook") &&

            !text.includes("Twitter") &&

            !text.includes("Telegram")

          ) {

            articleContent += text + "\n\n";

          }

        });

        articleContent =
          articleContent.trim();
                const rawSummary =
          subtitle ||
          (
            item.description
              ? item.description[0]
              : ""
          );

        const summary =
          rawSummary
            .replace(/\s+/g, " ")
            .trim();

        const pubDate =
          item.pubDate
            ? item.pubDate[0]
            : new Date().toISOString();
        const pubDateLocal =
  new Date(pubDate).toLocaleString("sv-SE", {
    timeZone: "Europe/Madrid"
  });
        if (!title || !articleContent) {

          console.log(
            "Noticia descartada:",
            link
          );

          continue;

        }
const wordCount =
  articleContent
    .replace(/<[^>]+>/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .length;

const readingTime =
  Math.max(
    1,
    Math.ceil(wordCount / 200)
  );
        news.push({

  guid,

  link,

  title,

  subtitle,

  author,

  category,

  image,

  summary,

  content: articleContent,

  wordCount,

  readingTime,

  pubDate,
pubDateLocal

});
      } catch (err) {

        console.log(

          "Error noticia:",

          err.message

        );

      }

    }
        news.sort((a, b) =>

      new Date(a.pubDate) -
      new Date(b.pubDate)

    );

    const lastGuid =

      news.length

        ? news[news.length - 1].guid

        : after;

    res.setHeader(

      "Content-Type",

      "application/json; charset=utf-8"

    );

    res.status(200).json({

      status: "ok",

      generatedAt:
        new Date().toISOString(),

      count:
        news.length,

      firstGuid:
        items.length
          ? (typeof items[items.length - 1].guid[0] === "string"
              ? items[items.length - 1].guid[0]
              : items[items.length - 1].guid[0]._)
          : null,

      lastGuid,

      feedItems:
        items.length,

      news

    });

  } catch (error) {

    res.status(500).json({

      error: true,

      message: error.message

    });

  }

};
