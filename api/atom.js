const axios = require("axios");
const cheerio = require("cheerio");
const Parser = require("rss-parser");
const { Feed } = require("feed");

const parser = new Parser();

module.exports = async (req, res) => {

  try {

    // LEER RSS ORIGINAL
    const rss =
      await parser.parseURL(
        "https://lavozdetomelloso.com/rss"
      );

    // CREAR FEED ATOM
    const feed = new Feed({

      title: rss.title,

      description: rss.description,

      id: rss.link,

      link: rss.link,

      language: "es",

      updated: new Date(),

      generator:
        "La Voz Atom Generator",

      feedLinks: {
        atom:
          "https://lavoz-feed.vercel.app/atom.xml"
      }

    });

    // RECORRER NOTICIAS RSS
    for (const item of rss.items) {

      try {

        // ENTRAR EN LA NOTICIA
        const response =
          await axios.get(item.link);

        const $ =
          cheerio.load(response.data);

        // EXTRAER CAMPOS
        const subtitle =
          $("h2.subtitulo")
            .first()
            .text()
            .trim();

        const author =
          $(".autor")
            .first()
            .text()
            .trim();

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

        // CREAR ITEM ATOM
        feed.addItem({

          title: item.title,

          id: item.link,

          link: item.link,

          description:
            subtitle ||
            item.contentSnippet,

          content:
            item.contentSnippet,

          author: [
            {
              name:
                author || "La Voz"
            }
          ],

          category: categories,

          date: new Date(item.pubDate)

        });

      } catch (err) {

        console.log(
          "Error noticia:",
          item.link
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