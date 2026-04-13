// utils.js

// ─────────────────────────────────────────────
//  DELAY (human-like random wait)
// ─────────────────────────────────────────────
function delay(min = 3000, max = 8000) {
  const time = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((res) => setTimeout(res, time));
}

// ─────────────────────────────────────────────
//  CAPTCHA DETECTION (LIGHTWEIGHT)
// ─────────────────────────────────────────────
async function detectCaptcha(page) {
  try {
    const hasIframe = await page.$('iframe[src*="captcha"]');
    const hasRecaptcha = await page.$(".g-recaptcha");
    const hasHcaptcha = await page.$("[data-hcaptcha-sitekey]");

    if (hasIframe || hasRecaptcha || hasHcaptcha) {
      console.log("🚨 CAPTCHA DETECTED — solve manually!");
      process.stdout.write("\x07");

      await page.bringToFront();

      // wait for user solve
      await delay(15000, 30000);

      return true;
    }

    return false;
  } catch (err) {
    console.log("⚠️ detectCaptcha error:", err.message);
    return false;
  }
}

// ─────────────────────────────────────────────
//  HUMAN MOUSE (SAFE)
// ─────────────────────────────────────────────
async function humanMouse(page) {
  try {
    const viewport = page.viewport();
    if (!viewport) return;

    const { width, height } = viewport;

    const moves = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < moves; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;

      await page.mouse.move(x, y, {
        steps: 10 + Math.floor(Math.random() * 15),
      });

      await delay(300, 1000);
    }

    // ❌ Removed random click (unsafe)
  } catch (err) {
    console.log("⚠️ humanMouse error:", err.message);
  }
}

// ─────────────────────────────────────────────
//  HUMAN SCROLL (SAFE + CONTROLLED)
// ─────────────────────────────────────────────
async function humanScroll(page) {
  try {
    const scrolls = 5 + Math.floor(Math.random() * 5);

    for (let i = 0; i < scrolls; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, 150 + Math.random() * 200);
      });

      await delay(300, 800);
    }
  } catch (err) {
    console.log("⚠️ Scroll error:", err.message);
  }
}

// ─────────────────────────────────────────────
//  SCROLL UP
// ─────────────────────────────────────────────
async function humanScrollUp(page) {
  try {
    const scrolls = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < scrolls; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, -(100 + Math.random() * 150));
      });

      await delay(300, 700);
    }
  } catch (err) {
    console.log("⚠️ ScrollUp error:", err.message);
  }
}

// ─────────────────────────────────────────────
//  THINK (pause)
// ─────────────────────────────────────────────
async function think(min = 2000, max = 5000) {
  await delay(min, max);
}

// ─────────────────────────────────────────────
//  RANDOM BEHAVIOR
// ─────────────────────────────────────────────
async function randomBehavior(page) {
  const actions = [
    async () => {
      console.log("🖱️ mouse movement");
      await humanMouse(page);
    },
    async () => {
      console.log("📜 scroll down");
      await humanScroll(page);
    },
    async () => {
      console.log("⬆️ scroll up");
      await humanScrollUp(page);
    },
    async () => {
      console.log("💭 thinking");
      await think();
    },
  ];

  const times = 1 + Math.floor(Math.random() * 2);

  for (let i = 0; i < times; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    await action();
    await delay(500, 1500);
  }
}

// ─────────────────────────────────────────────
//  RETRY (IMPROVED)
// ─────────────────────────────────────────────
async function retry(fn, retries = 3, label = "operation") {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const backoff = Math.min(1500 * Math.pow(2, i), 15000);
      const jitter = Math.random() * 1000;

      console.log(
        `⚠️ [${label}] Retry ${i + 1}/${retries} — wait ${Math.round(
          (backoff + jitter) / 1000,
        )}s`,
      );

      await delay(backoff, backoff + jitter);
    }
  }

  throw new Error(`❌ [${label}] failed after ${retries} retries`);
}

// ─────────────────────────────────────────────
//  SAFE EVALUATE
// ─────────────────────────────────────────────
async function safeEvaluate(page, fn, retries = 3) {
  return await retry(() => page.evaluate(fn), retries, "evaluate");
}

// ─────────────────────────────────────────────
//  SAFE GOTO
// ─────────────────────────────────────────────
async function safeGoto(page, url, options = {}) {
  const defaults = {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  };

  return await retry(
    () => page.goto(url, { ...defaults, ...options }),
    3,
    `goto → ${url}`,
  );
}

// ─────────────────────────────────────────────
//  SAFE WAIT FOR SELECTOR
// ─────────────────────────────────────────────
async function safeWaitFor(page, selector, timeout = 15000) {
  return await retry(
    () => page.waitForSelector(selector, { timeout }),
    2,
    `waitFor(${selector})`,
  );
}

// ─────────────────────────────────────────────
//  PAGE HEALTH CHECK
// ─────────────────────────────────────────────
async function isPageAlive(page) {
  try {
    await page.evaluate(() => document.title);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  delay,
  detectCaptcha,
  humanMouse,
  humanScroll,
  humanScrollUp,
  think,
  randomBehavior,
  retry,
  safeEvaluate,
  safeGoto,
  safeWaitFor,
  isPageAlive,
};
