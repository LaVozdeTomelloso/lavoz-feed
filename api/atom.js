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
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    // PARSEAR RSS XML
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

 // ÚLTIMAS 15 NOTICIAS
for (
  const item of items
    .slice(0, 15)
    .reverse()
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

        // TITULAR REAL
        const title =
          $("#titularN")
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim();

        // SUBTÍTULO
        const subtitle =
          $("h2.subtitulo")
            .first()
            .text()
            .replace(/\s+/g, " ")
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

        // FALLBACK IMAGEN
        if (!image) {

          image =
            $("img.img-fluid")
              .first()
              .attr("src") || "";

        }

        // SOLO LA CATEGORÍA REAL
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

        // CONTENIDO REAL DEL ARTÍCULO
        let articleContent = "";

        $("p").each((i, el) => {

          const text =
            $(el)
              .text()
              .replace(/\s+/g, " ")
              .trim();

          // FILTRAR BASURA
          if (

            text.length > 80 &&

            !text.includes("Publicidad") &&

            !text.includes("Relacionados") &&

            !text.includes("WhatsApp") &&

            !text.includes("Facebook") &&

            !text.includes("Twitter") &&

            !text.includes("Telegram")

          ) {

            articleContent += `
              <p>${text}</p>
            `;

          }

        });

        // RESUMEN
const rawSummary =
  subtitle ||
  (
    item.description
      ? item.description[0]
      : ""
  );

const summary =
  `${category || "Noticias"}|||${rawSummary}`;
        // CONTENIDO FINAL
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

          ${articleContent}

        `;

        // FECHA
        const pubDate =
          item.pubDate
            ? new Date(item.pubDate[0])
            : new Date();

        // AÑADIR ITEM AL FEED
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
            category
              ? [{ name: category }]
              : [],

          date: pubDate

        });

      } catch (err) {

        console.log(
          "Error noticia:",
          err.message
        );

      }

    }

    // GENERAR XML ATOM
    let atomXml =
      feed.atom1();

    // CONVERTIR CATEGORÍAS PARA MAKE
    atomXml = atomXml.replace(

      /<category[^>]*label="([^"]+)"[^>]*\/>/g,

      "<category>$1</category><category_text>$1</category_text>"

    );

    // DEVOLVER XML
    res.setHeader(
      "Content-Type",
      "application/atom+xml; charset=utf-8"
    );

    res
      .status(200)
      .send(atomXml);

  } catch (error) {

    res
      .status(500)
      .send(error.message);

  }

};
