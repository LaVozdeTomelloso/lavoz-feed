const axios = require("axios");
const cheerio = require("cheerio");
const xml2js = require("xml2js");
const { Feed } = require("feed");

module.exports = async (req, res) => {

  try {

    // DESCARGAR RSS ORIGINAL
    const rssResponse = await axios.get(
      "https://lavozdetomelloso.com/rss",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        }
      }
    );

    // PARSEAR XML RSS
    const rssData =
      await xml2js.parseStringPromise(
        rssResponse.data
      );

    const channel =
      rssData.rss.channel[0];

    const items =
      channel.item || [];

    // CREAR FEED ATOM
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

      updated: new Date(),

      generator:
        "La Voz Atom Generator",

      feedLinks: {
        atom:
          "https://lavoz-feed.vercel.app/atom.xml"
      },

      author: {
        name:
          "La Voz de Tomelloso"
      }

    });

    // RECORRER RSS
    for (const item of items) {

      try {

        const link =
          item.link[0];

        // ENTRAR EN NOTICIA
        const response =
          await axios.get(link, {
            headers: {
              "User-Agent":
                "Mozilla/5.0"
            }
          });

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

        // CONTENIDO
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
              item.description
                ? item.description[0]
                : ""
            }
          </p>

        `;

        // AÑADIR ITEM
        feed.addItem({

          title:
            item.title
              ? item.title[0]
              : "",

          id: link,

          link: link,

          description:
            subtitle ||
            (
              item.description
                ? item.description[0]
                : ""
            ),

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
              ? new Date(
                  item.pubDate[0]
                )
              : new Date()

        });

      } catch (err) {

        console.log(
          "Error noticia"
        );

      }

    }

    // DEVOLVER ATOM
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