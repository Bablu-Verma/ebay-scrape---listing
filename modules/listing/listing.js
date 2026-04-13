const { loadJson, save } = require("../../config/db");
const { delay } = require("../../utils/utils");
const { createListingPage } = require("./listing_browser");
const path = require("path");

async function listingProduct() {
  const page = await createListingPage();
  let products = await loadJson();

  await page.gotoSlow(
    "https://www.ebay.com/sh/research?marketplace=EBAY-US&tabName=SOLD",
  );
  // await page.gotoSlow(
  //   "https://www.ebay.com/lstng?draftId=5205629150910&mode=SellLikeItem",
  // );

  const inputSelector = "input.textbox__control";
  await page.waitForSelector(inputSelector, { timeout: 15000 });

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // ❌ skip already listed
    if (product.listed === true) {
      console.log(`⏭️ Skipping (already listed): ${product.title}`);
      continue;
    }

    console.log(`🚀 Listing: ${product.title}`);

    // ✅ clear input
    await page.click(inputSelector, { clickCount: 3 });
    await page.keyboard.press("Backspace");

    // ✅ type title
    await page.type(inputSelector, product.title, { delay: 50 });

    await page.evaluate(() => {
      const input = document.querySelector("input.textbox__control");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await delay(1000, 2000);
    // // ✅ search
    await page.keyboard.press("Enter");

    await delay(4000, 6000);

    // ⏳ wait table load
    await page.waitForSelector(".static-table__table-content", {
      timeout: 15000,
    });

    console.log("📊 Table loaded");

    // // ✅ get first Sell Similar link
    const sellSimilarLink = await page.evaluate(() => {
      const firstRow = document.querySelector(".research-table-row");
      if (!firstRow) return null;

      const link = firstRow.querySelector("a[href*='SellLikeItem']");
      return link ? link.href : null;
    });

    if (!sellSimilarLink) {
      console.log("❌ No Sell Similar link found");
      continue;
    }
    await delay(4000, 6000);

    console.log("🔗 Opening Sell Similar:", sellSimilarLink);

    // ✅ open listing page

    await page.gotoSlow(sellSimilarLink);

    await delay(6000, 8000);

    const fileInput = await page.waitForSelector("input[type='file']", {
      timeout: 15000,
    });

    const imagesPath = path.join(__dirname, "../../images");

    const imageFiles = product.images.map((img) => path.join(imagesPath, img));

    await fileInput.uploadFile(...imageFiles);

    console.log("📸 Images uploaded");

    await delay(4000, 8000);

    await page.click(".condition-recommendation-value");

    console.log("✅ Condition set to NEW");

    await delay(2000, 4000);

    // checkbox selector
    const htmlCheckbox = "input[name='descriptionEditorMode']";

    // wait
    await page.waitForSelector(htmlCheckbox, { timeout: 15000 });

    // check if already checked
    const isChecked = await page.$eval(htmlCheckbox, (el) => el.checked);

    if (!isChecked) {
      await page.click(htmlCheckbox);
      console.log("✅ HTML mode ON");
    }

    await delay(2000, 4000);

    const frameHandle = await page.waitForSelector("#se-rte-frame__summary", {
      timeout: 15000,
    });

    const frame = await frameHandle.contentFrame();

    await frame.evaluate((html) => {
      document.body.innerHTML = html;
    }, product.description);

    console.log("✅ Description inserted inside iframe");

    await delay(2000, 4000);

    await page.click(htmlCheckbox);

    const numericPrice = parseFloat(product.price.replace(/[^\d.]/g, "")) | 0;

    await delay(2000, 4000);
    const priceSelector = "input[name='price']";

    await page.waitForSelector(priceSelector, { timeout: 15000 });

    await page.click(priceSelector, { clickCount: 3 });
    await page.keyboard.press("Backspace");

    await page.type(priceSelector, String(numericPrice), { delay: 50 });

    console.log("💰 Price inserted");

    await delay(2000, 4000);

    const qtySelector = "input[name='quantity']";

    await page.waitForSelector(qtySelector, { timeout: 15000 });

    // clear default value (1)
    await page.click(qtySelector, { clickCount: 3 });
    await page.keyboard.press("Backspace");

    // type 5
    await page.type(qtySelector, "5", { delay: 50 });

    console.log("📦 Quantity set to 5");

    await delay(2000, 4000);

    const toggleSelector = "input[role='switch']";

    await page.waitForSelector(toggleSelector, { timeout: 15000 });

    // check current state
    const istoggleChecked = await page.$eval(
      toggleSelector,
      (el) => el.checked,
    );

    if (!istoggleChecked) {
      await page.click(toggleSelector);
      console.log("🔘 Toggle turned ON");
    } else {
      console.log("✅ Already ON");
    }

    await delay(4000, 8000);

    const comboInput = "input[name='shippingPolicyId']";

    // open dropdown
    await page.waitForSelector(comboInput);
    await page.click(comboInput);
    await page.keyboard.press("ArrowDown");

    await delay(2000, 3000);

    // decide text
    const optionText = numericPrice < 60 ? "60 se kam" : "61 se jada";

    // select option (REAL FIX)
    const selected = await page.evaluate((text) => {
      const options = document.querySelectorAll("[role='option']");

      for (let opt of options) {
        const label = opt.innerText.trim();

        if (label.startsWith(text)) {
          opt.scrollIntoView({ block: "center" });

          // 🔥 REAL FIX (mousedown required)
          opt.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

          return true;
        }
      }

      return false;
    }, optionText);

    // fallback
    if (!selected) {
      console.log("⚠️ fallback typing...");

      await page.click(comboInput, { clickCount: 3 });
      await page.keyboard.type(optionText);
      await page.keyboard.press("Enter");

      console.log("🚚 Selected via fallback:", optionText);
    } else {
      console.log("🚚 Selected:", optionText);
    }
    await delay(4000, 8000);

    const saveBtn = "button[aria-label='Save for later']";

    await page.waitForSelector(saveBtn, { timeout: 15000 });

    await page.click(saveBtn);

    console.log("💾 Saved in draft");
  }
}

module.exports = { listingProduct };
