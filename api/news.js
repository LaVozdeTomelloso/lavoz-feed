const axios = require("axios");
const cheerio = require("cheerio");
const xml2js = require("xml2js");

module.exports = async (req, res) => {

  try {

    const after =
      String(req.query.after || "").trim();

    // DESCARGAR RSS ORIGINAL

    const rssResponse =
      await axios.get(
        "https://lavozdetomelloso.com/rss",
        {
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        }
      );

    // PARSEAR RSS

    const rssData =
      await xml2js.parseStringPromise(
        rssResponse.data
      );

    const channel =
      rssData.rss.channel[0];

    const items =
      channel.item || [];

    // NOS QUEDAMOS CON LAS 15 ÚLTIMAS
    // EN ORDEN ANTIGUO -> NUEVO

    let pending =
      items
        .slice(0, 15)
        .reverse();

    // SI RECIBIMOS after,
// ELIMINAMOS TODAS LAS YA PROCESADAS

if (after) {

  const index =
    pending.findIndex(item =>

      String(
        item.guid
          ? item.guid[0]
          : ""
      ) === after

    );

  if (index >= 0) {

    // Solo devolvemos las posteriores
    pending =
      pending.slice(index + 1);

  } else {

    // El GUID ya no está en el RSS.
    // Mejor no publicar nada
    // que republicar noticias.
    pending = [];

  }

} else {

  // Sin parámetro "after"
  // devolvemos únicamente la noticia más reciente
  pending =
    pending.slice(-1);

}

    const news = [];

    for (const item of pending) {

      try {

        const guid =
          item.guid
            ? String(item.guid[0])
            : "";

        const link =
          item.link[0];

        // ABRIR LA NOTICIA

        const response =
          await axios.get(
            link,
            {
              headers: {
                "User-Agent":
                  "Mozilla/5.0"
              }
            }
          );

        const $ =
          cheerio.load(response.data);

        // TITULAR

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

        // IMAGEN

        let image =
          $('meta[property="og:image"]')
            .attr("content") || "";

        if (!image) {

          image =
            $("img.img-fluid")
              .first()
              .attr("src") || "";

        }

        // CATEGORÍA

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

        // CONTENIDO
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

            articleContent +=
              `<p>${text}</p>`;

          }

        });
                // FECHA

        const pubDate =
          item.pubDate
            ? item.pubDate[0]
            : "";

        // RESUMEN

        const summary =
          subtitle ||
          (
            item.description
              ? item.description[0]
              : ""
          );

        // AÑADIR AL ARRAY

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

          pubDate

        });

      } catch (err) {

        console.log(

          "Error noticia:",

          item.link
            ? item.link[0]
            : "",

          err.message

        );

      }

    }

    // DEVOLVER JSON

    res.setHeader(

      "Content-Type",

      "application/json; charset=utf-8"

    );

    res
      .status(200)
      .json(news);

  } catch (err) {

    console.error(err);

    res
      .status(500)
      .json({

        error: err.message

      });

  }

};
