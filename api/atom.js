const axios = require("axios");
const cheerio = require("cheerio");
const { Feed } = require("feed");

module.exports = async (req, res) => {

  try {

    const WEBSITE_URL = "https://lavozdetomelloso.com";

    const response = await axios.get(WEBSITE_URL);

    const $ = cheerio.load(response.data);

    const feed = new Feed({
      title: "La Voz de Tomelloso",
      description: "Noticias de Tomelloso y comarca",
      id: WEBSITE_URL,
      link: WEBSITE_URL,
      language: "es",
      updated: new Date(),
      generator: "La Voz Feed Generator",
      feedLinks: {
        atom: "https://lavoz-feed.vercel.app/atom.xml"
      },
      author: {
        name: "La Voz de Tomelloso"
      }
    });

    $("article, .noticia, .news, .post").each((i, el) => {

  const title =
    $(el).find("#titularN, h1, h2, h3").first().text().trim();

  const subtitle =
    $(el).find(".subtitulo").first().text().trim();

  const author =
    $(el).find(".autor").first().text().trim();

  const links =
    $(el).find("a");

  const relativeLink =
    links.first().attr("href");

  if (!title || !relativeLink) return;

  const link = relativeLink.startsWith("http")
    ? relativeLink
    : WEBSITE_URL + relativeLink;

  let category = "";

  if (links.length > 1) {
    category =
      $(links[1]).text().replace("|", "").trim();
  }

  const content = `
    <p><strong>${subtitle}</strong></p>

    <p>
      <em>
        ${author}
        ${category ? " · " + category : ""}
      </em>
    </p>
  `;

  feed.addItem({

    title: title,

    id: link,

    link: link,

    description: subtitle || title,

    content: content,

    author: [
      {
        name: author || "La Voz de Tomelloso"
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

    res.status(200).send(feed.atom1());

  } catch (error) {

    res.status(500).send(error.message);

  }

};