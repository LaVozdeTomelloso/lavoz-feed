
const axios = require("axios");
const cheerio = require("cheerio");
const xml2js = require("xml2js");

module.exports = async (req, res) => {
  try {
    const after = req.query.after || "";

    const rssResponse = await axios.get("https://lavozdetomelloso.com/rss", {
      headers: {"User-Agent":"Mozilla/5.0"}
    });

    const rssData = await xml2js.parseStringPromise(rssResponse.data);
    const items = rssData.rss.channel[0].item || [];

    const out = [];

    for (const item of items) {
      const link = item.link[0];
      if (after && link === after) break;

      try {
        const response = await axios.get(link,{headers:{"User-Agent":"Mozilla/5.0"}});
        const $ = cheerio.load(response.data);

        const title = $("#titularN").first().text().replace(/\s+/g," ").trim();
        const subtitle = $("h2.subtitulo").first().text().replace(/\s+/g," ").trim();
        const author = $("span.autor").first().text().replace(/\s+/g," ").trim();

        let image = $('meta[property="og:image"]').attr("content") || $("img.img-fluid").first().attr("src") || "";

        let category="";
        const categoryElement=$('div.d-flex.justify-content-center a[href*="/Categoria/"]').first();
        if(categoryElement.length){
          category=categoryElement.text().replace(/\s+/g," ").trim();
        }

        out.push({
          title,
          resumen: subtitle || (item.description ? item.description[0] : ""),
          author,
          category,
          image,
          link,
          date: item.pubDate ? item.pubDate[0] : ""
        });
      } catch(e){}
    }

    res.setHeader("Content-Type","application/json; charset=utf-8");
    res.status(200).json(out);
  } catch(err){
    res.status(500).json({error:err.message});
  }
};
