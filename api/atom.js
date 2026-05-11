const axios = require("axios");
const cheerio = require("cheerio");
const { Feed } = require("feed");

module.exports = async (req, res) => {

  try {

    const WEBSITE_URL =
      "https://lavozdetomelloso.com";

    const response =
      await axios.get(WEBSITE_URL);

    const $ =
      cheerio.load(response.data);

    const feed = new Feed({

      title: "La Voz de Tomelloso",

      description:
        "Noticias de Tomelloso y comarca",

      id: WEBSITE_URL,

      link: WEBSITE_URL,

      language: "es",

      updated: new Date(),

      generator:
        "La Voz Feed Generator",

      feedLinks: {
        atom:
          "https://lavoz-feed.vercel.app/atom.xml"
      },

      author: {
        name: "La Voz de Tomelloso"
      }

    });

    $("#importante .row.mb-1").each((i, el) => {

      const title =
        $(el)
          .find("h4 a")
          .first()
          .text()
          .trim();

      const relativeLink =
        $(el)
          .find("h4 a")
          .first()
          .attr("href");

      if (!title || !relativeLink) return;

      const link =
        WEBSITE_URL + relativeLink;

      const summary =
        $(el)
          .find(".articulo-entradilla span")
          .first()
          .text()
          .trim();

      const author =
        $(el)
          .find(".autor")
          .first()
          .text()
          .trim();

      const date =
        $(el)
          .find(".hora")
          .first()
          .text()
          .replace("|", "")
          .trim();

      const image =
        $(el)
          .find("img")
          .first()
          .attr("src");

      let category = "";

      $(el)
        .find(".titulonegro")
        .each((j, cat) => {

          const text =
            $(cat)
              .text()
              .replace("|", "")
              .trim();

          if (
            text &&
            text !== "Tomelloso"
          ) {
            category = text;
          }

        });

      const content = `
        <img src="${image}" />

        <p>
          <strong>${summary}</strong>
        </p>

        <p>
          <em>
            ${author}
            ${date ? " · " + date : ""}
            ${category ? " · " + category : ""}
          </em>
        </p>
      `;

      feed.addItem({

        title: title,

        id: link,

        link: link,

        description:
          summary || title,

        content: content,

        author: [
          {
            name:
              author || "La Voz"
          }
        ],

        category: category
          ? [{ name: category }]
          : [],

        date: new Date()

      });

    });

    res.setHeader(
      "Content-Type",
      "application/atom+xml; charset=utf-8"
    );

    res
      .status(200)
      .send(feed.atom1());

  } catch (error) {

    res
      .status(500)
      .send(error.message);

  }

};