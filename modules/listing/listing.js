const {
  loadProducts,
  saveProducts,
  updateProduct,
} = require("../../config/db");
const {
  delay,
  detectCaptcha,
  randomBehavior,
  think,
  retry,
  safeGoto,
  safeWaitFor,
  safeEvaluate,
  fullScroll,
} = require("../../utils/utils");
const { createListingPage } = require("./listing_browser");
const path = require("path");
const {
  selectDropdown,
  handleToggle,
  setRichTextDescription,
} = require("./listing_helper");

async function listingProduct(listing_url) {
  const page = await createListingPage();
  let products = await loadProducts();

  try {
    // await retry(
    //   () =>
    //     page.gotoSlow(
    //       "https://www.ebay.com/lstng?draftId=5210966075812&mode=SellLikeItem",
    //     ),
    //   3,
    //   "Go to Research tab",
    // );
    await retry(() => page.gotoSlow(listing_url), 3, "Go to Research tab");
  } catch (e) {
    console.log("Failed to goto research tab", e);
  }
  await detectCaptcha(page);
  await fullScroll(page);
  await randomBehavior(page);

  const inputSelector = "input.textbox__control";
  await safeWaitFor(page, inputSelector, 15000);
  await detectCaptcha(page);

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    try {
      //     // ❌ skip already listed
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

      await safeEvaluate(page, () => {
        const input = document.querySelector("input.textbox__control");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      await delay(1000, 2000);
      // // ✅ search
      await page.keyboard.press("Enter");

      await delay(4000, 6000);

      // ⏳ wait table load
      await safeWaitFor(page, ".static-table__table-content", 15000);
      await detectCaptcha(page);
      await randomBehavior(page); // human like action

      console.log("📊 Table loaded");

      // // ✅ get first Sell Similar link
      const sellSimilarLink = await safeEvaluate(page, () => {
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

      await retry(() => page.gotoSlow(sellSimilarLink), 3, "Open Sell Similar");
      await detectCaptcha(page);

      // 🔥 Scroll fully so all lazy-loaded elements render
      await fullScroll(page);

      await think(4000, 6000);

      const fileInput = await safeWaitFor(page, "input[type='file']", 15000);
      await randomBehavior(page);

      const imagesPath = path.join(__dirname, "../../images");

      const imageFiles = product.images.map((img) =>
        path.join(imagesPath, img),
      );

      await fileInput.uploadFile(...imageFiles);

      console.log("📸 Images uploaded");

      await delay(4000, 8000);

      await safeWaitFor(page, ".condition-recommendation-value", 15000);
      await retry(
        () => page.click(".condition-recommendation-value"),
        3,
        "Click condition",
      );

      console.log("✅ Condition set to NEW");

      await delay(2000, 4000);

      // checkbox selector
      const htmlCheckbox = "input[name='descriptionEditorMode']";

      // wait
      await safeWaitFor(page, htmlCheckbox, 15000);
      await detectCaptcha(page);
      await randomBehavior(page);

      await delay(2000, 4000);

      await setRichTextDescription(page, product.description);

      await delay(2000, 4000);

      const numericPrice = parseFloat(product.price.replace(/[^\d.]/g, "")) | 0;

      const priceSelector = "input[name='price']";

      await safeWaitFor(page, priceSelector, 15000);
      await randomBehavior(page);

      await retry(
        () => page.click(priceSelector, { clickCount: 3 }),
        3,
        "click price selector",
      );
      await page.keyboard.press("Backspace");

      await page.type(priceSelector, String(numericPrice), { delay: 50 });

      console.log("💰 Price inserted");

      await delay(2000, 4000);

      const qtySelector = "input[name='quantity']";

      await safeWaitFor(page, qtySelector, 15000);
      await randomBehavior(page);

      // clear default value (1)
      await page.click(qtySelector, { clickCount: 3 });
      await page.keyboard.press("Backspace");

      // type 5
      await page.type(qtySelector, "5", { delay: 50 });

      console.log("📦 Quantity set to 5");

      await delay(4000, 8000);

      const comboInput = "input[name='shippingPolicyId']";

      const optionText = numericPrice < 60 ? "60 se kam" : "61 se jada";

      await selectDropdown(page, comboInput, optionText);

      await delay(4000, 8000);

      await handleToggle(page);

      await delay(4000, 8000);

      const saveBtn = "button[aria-label='Save for later']";

      await safeWaitFor(page, saveBtn, 15000);
      await detectCaptcha(page);

      await retry(() => page.click(saveBtn), 3, "click save button");

      console.log("💾 Saved in draft");

      product.listed = true;

      await updateProduct(product);

      await delay(2000, 5000);

      await retry(
        () => page.gotoSlow(listing_url),
        3,
        "Go to Research tab again",
      );

      await detectCaptcha(page);

      // 🔥 Scroll fully so all lazy-loaded elements render
      await fullScroll(page);

      await think(4000, 6000);

      continue;
    } catch (err) {
      console.log(`❌ Error in listing ${product.title}:`, err.message);
      await think(2000, 4000);
    }
  }
}

module.exports = { listingProduct };
