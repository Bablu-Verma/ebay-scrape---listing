const express = require("express");
const { scrapeWithPagination } = require("./modules/scraper/scraper");
const { save, loadJson } = require("./config/db");
const { listingProduct } = require("./modules/listing/listing");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/scrape", async (req, res) => {
  const { url, page } = req.body;

  let jobs = {};

  if (!url || !page) {
    return res.status(400).json({ error: "url and page required" });
  }

  const jobId = Date.now().toString();

  // create job
  jobs[jobId] = {
    status: "processing",
    type: "scrape",
    progress: 0,
  };

  // 🔥 background task
  (async () => {
    try {
      const products = await scrapeWithPagination(url, page);

      await save(products);

      jobs[jobId].status = "completed";
      jobs[jobId].resultCount = products.length;
    } catch (err) {
      jobs[jobId].status = "failed";
      jobs[jobId].error = err.message;
    }
  })();

  // ✅ instant response
  res.json({
    success: true,
    message: "Scraping started",
    jobId,
  });
});

app.post("/api/list", async (req, res) => {
  const { url } = req.body;

  let jobs = {};

  if (!url) {
    return res.status(400).json({ error: "url required" });
  }

  const jobId = Date.now().toString();

  jobs[jobId] = {
    status: "processing",
    type: "listing",
  };

  (async () => {
    try {
      const result = await listingProduct(url);

      jobs[jobId].status = "completed";
      jobs[jobId].result = result;
    } catch (err) {
      jobs[jobId].status = "failed";
      jobs[jobId].error = err.message;
    }
  })();

  res.json({
    success: true,
    message: "Listing started",
    jobId,
  });
});

app.get("/api/products", (req, res) => {
  try {
    const products = loadJson();

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
