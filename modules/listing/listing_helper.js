const { delay } = require("../../utils/utils");

async function selectDropdown(page, selector, text) {
  try {
    // STEP 1: wait + open dropdown
    await page.waitForSelector(selector, { timeout: 15000 });

    await page.click(selector);
    await page.focus(selector);

    // force open
    await page.keyboard.press("ArrowDown");

    await delay(2000, 4000);

    // STEP 2: try selecting option
    const selected = await page.evaluate((text) => {
      const options = document.querySelectorAll("[role='option']");

      for (let opt of options) {
        const label = opt.innerText.trim();

        if (label.startsWith(text)) {
          opt.scrollIntoView({ block: "center" });

          // 🔥 FULL EVENT CHAIN
          opt.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          opt.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          opt.dispatchEvent(new MouseEvent("click", { bubbles: true }));

          return true;
        }
      }

      return false;
    }, text);

    // STEP 3: fallback अगर नहीं मिला
    if (!selected) {
      console.log("⚠️ Fallback typing:", text);

      await page.click(selector, { clickCount: 3 });
      await page.keyboard.type(text);
      await page.keyboard.press("Enter");
    } else {
      console.log("✅ Selected text:", text);
    }

    // STEP 4: confirm value set
    await page.waitForFunction(
      (selector, text) => {
        const input = document.querySelector(selector);
        return input && input.value.includes(text);
      },
      {},
      selector,
      text,
    );

    console.log("🎯 Selected Confirmed:", text);
  } catch (err) {
    console.log("❌ Dropdown error:", err.message);
  }
}

async function handleToggle(page) {
  const toggleSelector = "input[role='switch']";

  await page.waitForSelector(toggleSelector, { timeout: 15000 });

  const isChecked = await page.$eval(toggleSelector, (el) => el.checked);

  if (!isChecked) {
    // click INPUT directly with JS (MOST STABLE)
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) el.click();
    }, toggleSelector);

    // verify state change instead of waiting UI element
    await page.waitForFunction(
      (selector) => document.querySelector(selector)?.checked === true,
      {},
      toggleSelector,
    );

    console.log("🔘 Toggle turned ON");
  } else {
    console.log("✅ Already ON");
  }
}

module.exports = { selectDropdown, handleToggle };
