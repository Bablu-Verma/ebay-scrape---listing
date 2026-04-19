const express = require("express");
const { scrapeWithPagination } = require("./modules/scraper/scraper");
const { loadProducts } = require("./config/db");
const { listingProduct } = require("./modules/listing/listing");
const path = require("path");
require("dotenv").config();

const { enhanceDescription } = require("./modules/listing/listing_helper");

const app = express();

app.use(express.json());

const listing = false;
const scrape = true;

// (async () => {
//   let product = await loadProducts();
//   try {
//     const data = await enhanceDescription(product[0].description);
//     console.log(data);
//   } catch (err) {
//     console.log(err);
//   }
// })();

if (scrape) {
  let page = 5;
  let url =
    "https://www.ebay.com/sch/i.html?_fss=1&LH_SpecificSeller=1&_saslop=1&_ipg=240&_sasl=autonation7&_fcid=1";
  (async () => {
    try {
      await scrapeWithPagination(url, page);
    } catch (err) {
      console.log(err);
    }
  })();
}

if (listing) {
  let url = "https://www.ebay.com/sh/research?marketplace=EBAY-US&tabName=SOLD";
  (async () => {
    try {
      await listingProduct(url);
    } catch (err) {
      console.log(err);
    }
  })();
}

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
