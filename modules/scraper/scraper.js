const { createScraperPage } = require("./scraper_browser");
const { downloadImages } = require("./image_download");
const { delay } = require("../../utils/utils");
const { cleanHTML } = require("../../utils/cleanHTML");

async function getListingLinks(page) {
  return await page.evaluate(() => {
    const items = document.querySelectorAll("li.s-card");
    const links = [];

    items.forEach((item) => {
      const a = item.querySelector("a.s-card__link");
      if (!a) return;

      let href = a.href || a.getAttribute("href");
      if (!href) return;

      try {
        const url = new URL(href);

        // only product pages
        const match = url.pathname.match(/\/itm\/(\d+)/);
        if (!match) return;

        const id = match[1];

        // 🔥 YOUR REQUIRED FORMAT
        links.push(`https://www.ebay.com/itm/${id}`);
      } catch (e) {}
    });

    return [...new Set(links)];
  });
}

async function getDescription(page) {
  try {
    const iframeHandle = await page.waitForSelector("#desc_ifr", {
      timeout: 15000,
    });

    if (!iframeHandle) return "";

    const frame = await iframeHandle.contentFrame();
    if (!frame) return "";

    await frame.waitForSelector("body", { timeout: 10000 });

    return await frame.evaluate(() => {
      return document.body.innerHTML || "";
    });
  } catch (err) {
    console.log("❌ Description error:", err.message);
    return "";
  }
}

async function isInvalidProductPage(page) {
  try {
    const text = await page.evaluate(() => document.body.innerText);

    return (
      text.includes("We looked everywhere") || text.includes("page is missing")
    );
  } catch {
    return true;
  }
}

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
