const {
  delay,
  safeWaitFor,
  detectCaptcha,
  randomBehavior,
  retry,
} = require("../../utils/utils");

async function selectDropdown(page, selector, text) {
  try {
    await page.waitForSelector(selector, { visible: true });

    // click input
    await page.click(selector, { clickCount: 3 });

    // clear + type
    await page.keyboard.press("Backspace");
    await page.keyboard.type(text, { delay: 100 });

    // wait for suggestions
    await delay(2000, 4000);

    // select first match
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    // confirm
    await page.waitForFunction(
      (selector, text) => {
        const el = document.querySelector(selector);
        return el && el.value.toLowerCase().includes(text.toLowerCase());
      },
      {},
      selector,
      text,
    );

    console.log("✅ Dropdown selected:", text);
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

async function setRichTextDescription(page, html) {
  const htmlCheckbox = "input[name='descriptionEditorMode']";

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

module.exports = { selectDropdown, handleToggle, setRichTextDescription };
