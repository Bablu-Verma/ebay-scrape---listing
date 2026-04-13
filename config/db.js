const fs = require("fs");

function save(newData) {
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

function loadJson() {
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

module.exports = { save, loadJson };
