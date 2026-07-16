const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeArticle(link) {

  const response = await axios.get(link, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  const $ = cheerio.load(response.data);

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

      articleContent += `<p>${text}</p>`;

    }

  });

  return {

    title,

    subtitle,

    author: author || "La Voz",

    image,

    category,

    content: articleContent

  };

}

module.exports = {
  scrapeArticle
};
