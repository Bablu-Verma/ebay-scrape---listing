const express = require("express");
const { scrapeWithPagination } = require("./modules/scraper/scraper");
const { loadProducts } = require("./config/db");
const { listingProduct } = require("./modules/listing/listing");
const path = require("path");

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/scrape", async (req, res) => {
  const { url, page } = req.body;

  if (!url || !page) {
    return res.status(400).json({ error: "url and page required" });
  }

  // 🔥 background task
  (async () => {
    try {
      await scrapeWithPagination(url, page);
    } catch (err) {
      console.log(err);
    }
  })();

  // ✅ instant response
  res.json({
    success: true,
    message: "Scraping started",
  });
});

app.post("/api/list", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url required" });
  }

  (async () => {
    try {
      await listingProduct(url);
    } catch (err) {
      console.log(err);
    }
  })();

  res.json({
    success: true,
    message: "Listing started",
  });
});

app.get("/api/products", (req, res) => {
  try {
    const products = loadProducts();

    res.json({
      success: true,
      count: products.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
