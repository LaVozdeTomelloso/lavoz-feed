const axios = require("axios");
const cheerio = require("cheerio");
const xml2js = require("xml2js");

module.exports = async (req, res) => {

  try {

    const after = String(req.query.after || "").trim();

    // ============================
    // DESCARGAR RSS
    // ============================

    const rssResponse = await axios.get(
      "https://lavozdetomelloso.com/rss",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        },
        timeout: 15000
      }
    );

    // ============================
    // PARSEAR RSS
    // ============================

    const rssData = await xml2js.parseStringPromise(
      rssResponse.data
    );

    const channel = rssData.rss.channel[0];

    const items = channel.item || [];

    // ============================
    // ÚLTIMAS 15 NOTICIAS
    // ORDEN ANTIGUO -> NUEVO
    // ============================

    let pending = items
      .slice(0, 15)
      .reverse();

    // ============================
    // FILTRAR POR GUID
    // ============================

    if (after) {

      const index = pending.findIndex(item => {

        let guid = "";

        if (item.guid) {

          if (typeof item.guid[0] === "string") {

            guid = item.guid[0];

          } else if (item.guid[0]._ ) {

            guid = item.guid[0]._;

          }

        }

        return guid === after;

      });

      if (index >= 0) {

        pending = pending.slice(index + 1);

      } else {

        pending = [];

      }

    } else {

      pending = pending.slice(-1);

    }

    const news = [];

    // ============================
    // RECORRER NOTICIAS
    // ============================

    for (const item of pending) {

      try {

        let guid = "";

        if (item.guid) {

          if (typeof item.guid[0] === "string") {

            guid = item.guid[0];

          } else if (item.guid[0]._ ) {

            guid = item.guid[0]._;

          }

        }

        const link =
          item.link
            ? item.link[0]
            : "";

        // ============================
        // DESCARGAR NOTICIA
        // ============================

        const response = await axios.get(
          link,
          {
            headers: {
              "User-Agent": "Mozilla/5.0"
            },
            timeout: 15000
          }
        );

        const $ = cheerio.load(response.data);

        // ============================
        // FUNCIONES AUXILIARES
        // ============================

        const cleanText = (text = "") =>
          text.replace(/\s+/g, " ").trim();

        const firstText = (...selectors) => {

          for (const selector of selectors) {

            const value =
              cleanText(
                $(selector)
                  .first()
                  .text()
              );

            if (value) return value;

          }

          return "";

        };

        const firstAttr = (attr, ...selectors) => {

          for (const selector of selectors) {

            const value =
              $(selector)
                .first()
                .attr(attr);

            if (value) return value.trim();

          }

          return "";

        };        
        // ============================
        // TITULAR
        // ============================

        const title =
          firstText(
            "#titularN",
            "h1"
          ) ||
          firstAttr(
            "content",
            'meta[property="og:title"]'
          );

        // ============================
        // SUBTÍTULO
        // ============================

        const subtitle =
          firstText(
            "h2.subtitulo",
            ".subtitulo",
            "h2"
          );

        // ============================
        // AUTOR
        // ============================

        const author =
          firstText(
            "span.autor",
            ".autor",
            ".nombre-autor"
          );

        // ============================
        // IMAGEN
        // ============================

        let image =
          firstAttr(
            "content",
            'meta[property="og:image"]'
          );

        if (!image) {

          image =
            firstAttr(
              "src",
              ".img-titular img",
              "img.img-fluid",
              "article img"
            );

        }

        if (image && image.startsWith("/")) {

          image =
            "https://lavozdetomelloso.com" +
            image;

        }

        // ============================
        // CATEGORÍA
        // ============================

        const category =
          firstText(
            'a[href*="/Categoria/"]',
            ".categoria",
            ".category"
          );

        // ============================
        // CUERPO DE LA NOTICIA
        // ============================

        const article =
          $(".text-noticia")
            .first()
            .clone();

        article
          .find("script,style,iframe")
          .remove();

        article
          .find("img")
          .remove();

        article
          .find("figure")
          .remove();

        article
          .find(".publicidad")
          .remove();

        article
          .find(".ads")
          .remove();

        let htmlContent =
          article.html() || "";

        let textContent = "";

        article.find("p").each((i, el) => {

          const text =
            cleanText(
              $(el).text()
            );

          if (text.length < 25) {

            return;

          }

          if (

            text.includes("Publicidad") ||

            text.includes("Relacionados") ||

            text.includes("WhatsApp") ||

            text.includes("Facebook") ||

            text.includes("Twitter") ||

            text.includes("Telegram")

          ) {

            return;

          }

          textContent +=
            text + "\n\n";

        });

        textContent =
          textContent.trim();

        // ============================
        // FECHA
        // ============================

        const pubDate =
          item.pubDate
            ? item.pubDate[0]
            : (
                item["a10:updated"]
                  ? item["a10:updated"][0]
                  : ""
              );

        // ============================
        // RESUMEN
        // ============================

        let summary = "";

        if (subtitle) {

          summary = subtitle;

        } else {

          summary =
            cleanText(
              textContent.substring(0, 220)
            );

          if (summary.length === 220) {

            summary += "...";

          }

        }

        // Si no hay contenido útil,
        // descartamos la noticia

        if (!title || !textContent) {

          console.log(
            "Noticia descartada:",
            link
          );

          continue;

        }
                // ============================
        // AÑADIR AL ARRAY
        // ============================

        news.push({

          guid,

          link,

          title,

          subtitle,

          author,

          category,

          image,

          summary,

          content: textContent,

          html: htmlContent,

          pubDate

        });

      } catch (err) {

        console.error(

          "Error procesando noticia:",

          item.link
            ? item.link[0]
            : "",

          err.message

        );

      }

    }

    // ============================
    // ORDENAR POR FECHA
    // ============================

    news.sort((a, b) => {

      return new Date(a.pubDate) - new Date(b.pubDate);

    });

    // ============================
    // ÚLTIMO GUID DEVUELTO
    // ============================

    const lastGuid =

      news.length > 0

        ? news[news.length - 1].guid

        : after;

    // ============================
    // RESPUESTA JSON
    // ============================

    res.setHeader(

      "Content-Type",

      "application/json; charset=utf-8"

    );

    res.status(200).json({

      generatedAt: new Date().toISOString(),

      count: news.length,

      lastGuid,

      news

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({

      error: true,

      message: err.message

    });

  }

};
