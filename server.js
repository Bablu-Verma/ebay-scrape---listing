const { scrapeWithPagination } = require("./modules/scraper/scraper");
const { save } = require("./config/db");
const { listingProduct } = require("./modules/listing/listing");

(async () => {
  const sellerUrl =
    "https://www.ebay.com/sch/i.html?store_name=saumya15&_ssn=saumya-15&_pgn=1&_oac=1&_fcid=1";

  console.log("🔍 Scraping...");

  const list = listingProduct();

  console.log(list);

  // const products = await scrapeWithPagination(sellerUrl, 1);

  // save(products);
  // console.log("products", products);
})();
