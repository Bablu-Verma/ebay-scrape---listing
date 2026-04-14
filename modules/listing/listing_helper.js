const { delay } = require("../../utils/utils");

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

module.exports = { selectDropdown, handleToggle };
