const axios = require("axios");
const cheerio = require("cheerio");
const Parser = require("rss-parser");
const { Feed } = require("feed");

const parser = new Parser();

module.exports = async (req, res) => {

  try {

    // RSS ORIGINAL
    const rss =
      await parser.parseURL(
        "https://lavozdetomelloso.com/rss"
      );

    // CREAR FEED ATOM
    const feed = new Feed({

      title:
        rss.title || "La Voz de Tomelloso",

      description:
        rss.description ||
        "Noticias de Tomelloso y comarca",

      id:
        rss.link ||
        "https://lavozdetomelloso.com",

      link:
        rss.link ||
        "https://lavozdetomelloso.com",

      language: "es",

      updated: new Date(),

      generator:
        "La Voz Atom Generator",

      feedLinks: {
        atom:
          "https://lavoz-feed.vercel.app/atom.xml"
      },

      author: {
        name: "La Voz de Tomelloso"
      }

    });

    // RECORRER ITEMS RSS
    for (const item of rss.items) {

      try {

        // ABRIR NOTICIA
        const response =
          await axios.get(item.link);

        const $ =
          cheerio.load(response.data);

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
            .trim();

        // IMAGEN
        const image =
          $("img.img-fluid")
            .first()
            .attr("src");

        // CATEGORÍAS
        let categories = [];

        $("a.titulonegro").each((i, el) => {

          const text =
            $(el)
              .text()
              .replace("|", "")
              .trim();

          if (text) {

            categories.push({
              name: text
            });

          }

        });

        // CONTENIDO HTML
        const content = `

          ${
            image
              ? `<p><img src="${image}" /></p>`
              : ""
          }

          ${
            subtitle
              ? `<p><strong>${subtitle}</strong></p>`
              : ""
          }

          <p>
            ${
              item.contentSnippet ||
              item.content ||
              ""
            }
          </p>

        `;

        // AÑADIR ITEM AL FEED
        feed.addItem({

          title:
            item.title || "",

          id:
            item.link || "",

          link:
            item.link || "",

          description:
            subtitle ||
            item.contentSnippet ||
            "",

          content: content,

          author: [
            {
              name:
                author || "La Voz"
            }
          ],

          category: categories,

          date:
            item.pubDate
              ? new Date(item.pubDate)
              : new Date()

        });

      } catch (err) {

        console.log(
          "Error noticia:",
          item.link
        );

      }

    }

    // DEVOLVER XML ATOM
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