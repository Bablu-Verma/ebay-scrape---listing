// browser.js

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

const {
  delay,
  safeGoto,
  detectCaptcha,
  humanMouse,
  humanScroll,
  randomBehavior,
  retry,
  safeEvaluate,
  isPageAlive,
  think,
} = require("../../utils/utils");

puppeteer.use(StealthPlugin());

let browser = null;
let browserLaunchCount = 0;

async function getBrowser() {
  if (browser) {
    try {
      await browser.pages();
      return browser;
    } catch {
      console.log("🔄 Browser crashed — resetting...");
      browser = null;
    }
  }

  browserLaunchCount++;
  console.log(`🚀 Initializing browser (#${browserLaunchCount})`);

  try {
    browser = await puppeteer.connect({
      browserURL: "http://localhost:9333",
      defaultViewport: null,
    });

    console.log("✅ Connected to existing Chrome");

    browser.on("disconnected", () => {
      console.log("⚠️ Browser disconnected");
      browser = null;
    });

    return browser;
  } catch (err) {
    console.error("❌ Browser init failed:", err.message);
    browser = null;
    throw err;
  }
}

async function createListingPage() {
  const b = await getBrowser();

  const pages = await b.pages();

  let page = pages.find(
    (p) =>
      p.url() !== "about:blank" &&
      !p.url().startsWith("chrome://") &&
      !p.url().includes("extensions"),
  );

  if (!page) {
    page = await b.newPage();
  }

  await page.bringToFront();

  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });

  await page.setDefaultNavigationTimeout(60000);
  await page.setDefaultTimeout(60000);

  page.gotoSlow = async (url, options = {}) => {
    console.log(`🌐 Navigating → ${url}`);

    await delay(2000, 5000);
    await safeGoto(page, url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
      ...options,
    });

    console.log("⏳ Page loaded");

    // 📖 Reading delay
    await delay(3000, 6000);

    // 🤖 CAPTCHA detection
    // await detectCaptcha(page);

    // 🖱️ Human behavior simulation
    await humanMouse(page);
    await delay(1000, 3000);

    await humanScroll(page);
    await delay(2000, 4000);

    // 🎲 Random extra action
    if (Math.random() < 0.3) {
      await randomBehavior(page);
    }

    console.log("✅ Navigation complete\n");
  };

  page.safeClose = async () => {
    try {
      if (!page.isClosed()) {
        await page.close();
        console.log("📄 Page closed");
      }
    } catch (err) {
      console.log("⚠️ Page close issue:", err.message);
    }
  };

  page.isAlive = async () => {
    try {
      return await isPageAlive(page);
    } catch {
      return false;
    }
  };

  return page;
}

module.exports = { createListingPage };
