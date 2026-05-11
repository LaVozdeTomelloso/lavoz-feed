const axios = require("axios");
const cheerio = require("cheerio");
const xml2js = require("xml2js");
const { Feed } = require("feed");

module.exports = async (req, res) => {

  try {

    // RSS ORIGINAL
    const rssResponse = await axios.get(
      "https://lavozdetomelloso.com/rss",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    // PARSEAR XML
    const rssData =
      await xml2js.parseStringPromise(
        rssResponse.data
      );

    const channel =
      rssData.rss.channel[0];

    const items =
      channel.item || [];

    // CREAR FEED
    const feed = new Feed({

      title:
        channel.title[0],

      description:
        channel.description[0],

      id:
        channel.link[0],

      link:
        channel.link[0],

      language: "es",

      favicon:
        "https://lavozdetomelloso.com/favicon.ico",

      updated:
        new Date(),

      generator:
        "La Voz Atom Generator",

      feedLinks: {
        atom:
          "https://lavoz-feed.vercel.app/atom.xml"
      },

      author: {
        name:
          "La Voz de Tomelloso",
        link:
          "https://lavozdetomelloso.com"
      }

    });

    // SOLO ÚLTIMAS 15
    for (
      const item of items.slice(0, 15)
    ) {

      try {

        const link =
          item.link[0];

        // ABRIR NOTICIA
        const response =
          await axios.get(link, {
            headers: {
              "User-Agent":
                "Mozilla/5.0"
            }
          });

        const $ =
          cheerio.load(response.data);

        // TITULAR
        const title =
          $("h1")
            .first()
            .text()
            .trim();

        // SUBTÍTULO
        const subtitle =
          $("h2.subtitulo")
            .first()
            .text()
            .trim();

        // AUTOR
        const author =
          $("span.autor")
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim();

        // IMAGEN PRINCIPAL
        let image =
          $('meta[property="og:image"]')
            .attr("content") || "";

        // FALLBACK
        if (!image) {

          image =
            $("img.img-fluid")
              .first()
              .attr("src") || "";

        }

        // CATEGORÍAS REALES
        let categories = [];

        $('a[href*="/Categoria/"], a[href*="/Seccion/"]')
          .slice(0, 3)
          .each((i, el) => {

            const text =
              $(el)
                .text()
                .replace("|", "")
                .replace(/\s+/g, " ")
                .trim();

            if (
              text &&
              !categories.includes(text)
            ) {

              categories.push(text);

            }

          });

        // RESUMEN LIMPIO
        const summary =
          subtitle ||
          (
            item.description
              ? item.description[0]
              : ""
          );

        // CONTENIDO HTML LIMPIO
        const content = `

          ${
            image
              ? `
                <p>
                  <img
                    src="${image}"
                    alt="${title}"
                  />
                </p>
              `
              : ""
          }

          ${
            subtitle
              ? `
                <p>
                  <strong>
                    ${subtitle}
                  </strong>
                </p>
              `
              : ""
          }

        `;

        // FECHA
        const pubDate =
          item.pubDate
            ? new Date(item.pubDate[0])
            : new Date();

        // ITEM ATOM
        feed.addItem({

          title: title,

          id: link,

          link: link,

          description: summary,

          content: content,

          author: [
            {
              name:
                author || "La Voz"
            }
          ],

          category:
            categories.map(cat => ({
              name: cat
            })),

          date: pubDate

        });

      } catch (err) {

        console.log(
          "Error noticia:",
          err.message
        );

      }

    }

    // DEVOLVER XML
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