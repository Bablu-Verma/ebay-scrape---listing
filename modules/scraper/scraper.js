const { createScraperPage } = require("./scraper_browser");
const {
  downloadImages,
  getDescription,
  getListingLinks,
  isInvalidProductPage,
} = require("./scraper_helper");
const { delay } = require("../../utils/utils");
const { cleanHTML } = require("../../utils/cleanHTML");

async function extractProductDetails(page) {
  await page.waitForSelector("body", { timeout: 10000 }).catch(() => {});

  const desc = await getDescription(page);

  const data = await page.evaluate(() => {
    // TITLE
    const title =
      document.querySelector("h1.x-item-title__mainTitle span")?.innerText ||
      document.querySelector("#itemTitle")?.innerText ||
      "";

    // PRICE
    const price =
      document.querySelector(".x-price-primary")?.innerText ||
      document.querySelector("#prcIsum")?.innerText ||
      "";

    let images = [];

    document.querySelectorAll(".ux-image-grid img").forEach((img) => {
      if (img?.src) images.push(img.src);
    });

    if (images.length === 0) {
      const mainImg = document.querySelector("#icImg")?.src;
      if (mainImg) images.push(mainImg);
    }

    images = [...new Set(images)];

    const specifics = {};

    document.querySelectorAll(".ux-labels-values").forEach((row) => {
      const key = row.querySelector(
        ".ux-labels-values__labels span",
      )?.innerText;

      const value = row.querySelector(
        ".ux-labels-values__values span",
      )?.innerText;

      if (key && value) {
        specifics[key.trim()] = value.trim();
      }
    });

    return {
      title,
      price,
      images,
      specifics,
    };
  });

  const productId =
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30) +
    "-" +
    Date.now();

  const downloadedImages = await downloadImages(data.images, productId);

  let description = cleanHTML(desc);

  return {
    ...data,
    images: downloadedImages,
    listed: false,
    description,
  };
}

async function scrapePage(url) {
  const page = await createScraperPage();
  const results = [];

  try {
    await page.gotoSlow(url);

    const links = await getListingLinks(page);

    console.log("🔗 Total links:", links.length);

    for (let i = 0; i < links.length; i++) {
      console.log(`➡️ Product ${i + 1}`);
      if (i === 2) break;

      try {
        const link = links[i];

        await page.gotoSlow(link);

        console.log("🌐 Opening:", link);

        // ❌ INVALID PAGE CHECK
        const isInvalid = await isInvalidProductPage(page);
        if (isInvalid) {
          console.log("❌ Invalid product — skipping");
          continue;
        }

        // ✅ extract data
        const product_det = await extractProductDetails(page);

        // console.log("📦 Title:", product_det);

        results.push(product_det);

        await delay(2000, 4000);
      } catch (err) {
        console.log("⚠️ Product failed:", err.message);
      }
    }

    return results;
  } finally {
    await page.safeClose();
  }
}

async function scrapeWithPagination(baseUrl, maxPages = 1) {
  let allData = [];

  for (let i = 1; i <= maxPages; i++) {
    const url = i === 1 ? baseUrl : `${baseUrl}&_pgn=${i}`;

    console.log(`\n📄 PAGE ${i}`);

    const data = await scrapePage(url);

    allData.push(...data);

    console.log(`📊 Total: ${allData.length}`);

    // ✅ delay between pages
    await delay(8000, 15000);
  }

  return allData;
}

module.exports = { scrapeWithPagination };
