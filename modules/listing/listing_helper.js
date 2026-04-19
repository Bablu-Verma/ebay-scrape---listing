const cheerio = require("cheerio");

const {
  delay,
  safeWaitFor,
  detectCaptcha,
  randomBehavior,
  retry,
} = require("../../utils/utils");

async function selectShippingPolicy(page, numericPrice) {
  const selector = "input[name='shippingPolicyId']";

  try {
    const optionText = Number(numericPrice) < 60 ? "60 se kam" : "61 se jada";

    await page.waitForSelector(selector, { visible: true });

    // ✅ force open dropdown
    await page.click(selector);

    // optional: ensure aria-expanded true
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && el.getAttribute("aria-expanded") === "true";
      },
      {},
      selector,
    );

    // ✅ directly click option (no waitForSelector needed)
    const clicked = await page.evaluate((text) => {
      const options = Array.from(
        document.querySelectorAll("div[role='option']"),
      );

      const match = options.find((opt) =>
        opt.innerText.trim().toLowerCase().startsWith(text.toLowerCase()),
      );

      if (match) {
        match.click();
        return true;
      }
      return false;
    }, optionText);

    if (!clicked) throw new Error("Option not found");

    console.log("✅ Dropdown selected:", optionText);
  } catch (err) {
    console.log("❌ Dropdown error:", err.message);
  }
}

async function handleToggle(page) {
  try {
    // ✅ General toggle ka input selector (FIRST one)
    const inputSelector = ".fai-program-wrapper:first-child .switch__control";

    await page.waitForSelector(inputSelector, { visible: true });

    // ✅ Check if already ON
    const isChecked = await page.evaluate((sel) => {
      return document.querySelector(sel)?.checked;
    }, inputSelector);

    if (isChecked) {
      console.log("✅ General Toggle already ON — skipping");
      return;
    }

    console.log("⚡ Turning ON General toggle...");

    // 🔥 Click the input directly
    await page.evaluate((sel) => {
      document.querySelector(sel)?.click();
    }, inputSelector);

    // ⏳ Wait for UI update
    await new Promise((r) => setTimeout(r, 2000));

    // 🔁 Re-check
    const nowChecked = await page.evaluate((sel) => {
      return document.querySelector(sel)?.checked;
    }, inputSelector);

    if (nowChecked) {
      console.log("✅ General Toggle ON SUCCESS");
      return;
    }

    // ⚠️ Fallback: click the visual button
    console.log("⚠️ Direct click failed, trying button...");
    await page.evaluate(() => {
      document
        .querySelector(".fai-program-wrapper:first-child .switch__button")
        ?.click();
    });

    await delay(2000, 4000);

    const finalCheck = await page.evaluate((sel) => {
      return document.querySelector(sel)?.checked;
    }, inputSelector);

    if (finalCheck) {
      console.log("✅ General Toggle ON (via fallback)");
    } else {
      throw new Error("General Toggle ON nahi hua");
    }
  } catch (err) {
    console.log("❌ Toggle error:", err.message);
  }
}

function enhanceDescription(description) {
  if (!description) return "";

  // 'false' isliye taki cheerio extra <html><body> tags add na kare
  const $ = cheerio.load(description, null, false);

  $("*").each((i, el) => {
    const text = $(el).text().toUpperCase();

    if (text.includes("WELCOME")) {
      const hasChildWithWelcome =
        $(el)
          .children()
          .filter((_, child) => {
            return $(child).text().toUpperCase().includes("WELCOME");
          }).length > 0;

      if (!hasChildWithWelcome) {
        $(el).html(`Welcome to ${process.env.BRAND_NAME || "somya selese"}`);
      }
    }
  });

  return $.html();
}

async function setRichTextDescription(page, html) {
  const htmlCheckbox = "input[name='descriptionEditorMode']";

  html = enhanceDescription(html);

  // === Step 1: Wait for checkbox ===
  await safeWaitFor(page, htmlCheckbox, 15000);
  await detectCaptcha(page);
  await randomBehavior(page);

  // === Step 2: Enable HTML mode ===
  const isChecked = await retry(
    () => page.$eval(htmlCheckbox, (el) => el.checked),
    3,
    "check eval",
  );

  if (!isChecked) {
    await page.click(htmlCheckbox);
    console.log("✅ HTML mode ON");
  }

  await delay(2000, 4000);

  // === Step 3: Wait for textarea to be visible (HTML mode mein textarea visible hoti hai) ===
  const textareaSelector = 'textarea[name="description"]';
  await safeWaitFor(page, textareaSelector, 10000);

  // === Step 4: Textarea mein directly HTML inject karo (React-safe way) ===
  await page.evaluate((content) => {
    const textarea = document.querySelector('textarea[name="description"]');
    if (!textarea) throw new Error("❌ Description textarea not found");

    // React ka native setter use karo
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    ).set;

    nativeSetter.call(textarea, content);

    // React/eBay framework ko notify karo
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    textarea.dispatchEvent(new Event("blur", { bubbles: true }));

    console.log("✅ Textarea updated with length:", textarea.value.length);
  }, html);

  await delay(1000, 2000);

  // === Step 5: Extra insurance - keyboard se bhi ek space type karo ===
  const textarea = await page.$(textareaSelector);
  if (textarea) {
    await textarea.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" ");
    await page.keyboard.press("Backspace");
  }

  await delay(1000, 2000);

  // === Step 6: HTML mode OFF karo (visual mode mein wapas jao) ===
  // Ye toggle eBay ke internal parser ko trigger karta hai
  const isStillChecked = await retry(
    () => page.$eval(htmlCheckbox, (el) => el.checked),
    3,
    "re-check eval",
  );

  if (isStillChecked) {
    await page.click(htmlCheckbox);
    console.log("✅ HTML mode OFF - sync triggered");
  }

  await delay(2000, 4000);

  // === Step 7: Verify - iframe mein content aaya ya nahi ===
  try {
    await page.waitForSelector("#se-rte-frame__summary", { timeout: 5000 });
    const frameHandle = await page.$("#se-rte-frame__summary");
    const frame = await frameHandle.contentFrame();

    if (frame) {
      const bodyContent = await frame.evaluate(() => document.body.innerHTML);
      if (bodyContent && bodyContent.trim().length > 0) {
        console.log("✅ Description verified in iframe ✔");
      } else {
        console.warn(
          "⚠️ Iframe body empty after toggle - description may not have synced",
        );
      }
    }
  } catch (e) {
    console.warn("⚠️ Iframe verify skip:", e.message);
  }

  console.log("✅ Description set & synced");
}

module.exports = {
  selectShippingPolicy,
  enhanceDescription,
  handleToggle,
  setRichTextDescription,
};
