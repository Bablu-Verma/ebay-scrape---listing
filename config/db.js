const fs = require("fs");

function saveProducts(newData) {
  let existing = [];

  if (fs.existsSync("products.json")) {
    existing = JSON.parse(fs.readFileSync("products.json"));
  }

  const existingTitles = new Set(
    existing.map((item) => item.title?.toLowerCase().trim()),
  );

  const filteredNewData = newData.filter((item) => {
    const title = item.title?.toLowerCase().trim();

    if (!title) return false;

    if (existingTitles.has(title)) {
      return false;
    }

    existingTitles.add(title);
    return true;
  });

  const finalData = [...existing, ...filteredNewData];

  fs.writeFileSync("products.json", JSON.stringify(finalData, null, 2));

  console.log(`✅ Added ${filteredNewData.length} new items`);
  console.log(`📦 Total items: ${finalData.length}`);
}

function loadProducts() {
  try {
    if (!fs.existsSync("products.json")) return [];

    const data = fs.readFileSync("products.json", "utf-8").trim();

    if (!data) {
      fs.writeFileSync("products.json", "[]");
      return [];
    }

    return JSON.parse(data);
  } catch (err) {
    fs.writeFileSync("products.json", "[]"); // reset
    return [];
  }
}

function updateProduct(updatedItem) {
  let existing = [];

  if (fs.existsSync("products.json")) {
    existing = JSON.parse(fs.readFileSync("products.json"));
  }

  const updatedTitle = updatedItem.title?.toLowerCase().trim();

  const updatedData = existing.map((item) => {
    const title = item.title?.toLowerCase().trim();

    if (title === updatedTitle) {
      return { ...item, ...updatedItem };
    }

    return item;
  });

  fs.writeFileSync("products.json", JSON.stringify(updatedData, null, 2));

  console.log(`♻️ Updated: ${updatedItem.title}`);
}

module.exports = { saveProducts, loadProducts, updateProduct };
