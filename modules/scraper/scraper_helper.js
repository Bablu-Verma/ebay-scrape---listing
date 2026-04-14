const fs = require("fs");
const path = require("path");
const axios = require("axios");

// async function downloadImages(imageUrls, productId) {
//   const folderPath = path.join(process.cwd(), "images");

//   if (!fs.existsSync(folderPath)) {
//     fs.mkdirSync(folderPath, { recursive: true });
//   }

//   const savedImages = [];

//   for (let i = 0; i < imageUrls.length; i++) {
//     try {
//       const url = imageUrls[i];

//       // ✅ unique name
//       const fileName = `${productId}_${i + 1}.jpg`;
//       const filePath = path.join(folderPath, fileName);

//       const response = await axios({
//         url,
//         method: "GET",
//         responseType: "stream",
//       });

//       const writer = fs.createWriteStream(filePath);

//       response.data.pipe(writer);

//       await new Promise((resolve, reject) => {
//         writer.on("finish", resolve);
//         writer.on("error", reject);
//       });

//       savedImages.push(fileName); // 👈 sirf name store karo
//     } catch (err) {
//       console.log("❌ Image download failed:", err.message);
//     }
//   }

//   return savedImages;
// }

function toHighQuality(url) {
  if (!url) return url;

  return url
    .replace("s-l140", "s-l1600")
    .replace("s-l96", "s-l1600")
    .replace("s-l300", "s-l1600")
    .replace("s-l500", "s-l1600");
}

async function downloadImages(imageUrls, productId) {
  const folderPath = path.join(process.cwd(), "images");

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const savedImages = [];

  for (let i = 0; i < imageUrls.length; i++) {
    try {
      let url = imageUrls[i];

      // 🔥 convert to HD
      url = toHighQuality(url);

      const fileName = `${productId}_${i + 1}.jpg`;
      const filePath = path.join(folderPath, fileName);

      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      savedImages.push(fileName);
    } catch (err) {
      console.log("❌ Image download failed:", err.message);
    }
  }

  return savedImages;
}

async function getListingLinks(page) {
  return await page.evaluate(() => {
    const items = document.querySelectorAll("li.s-card");
    const links = [];

    items.forEach((item) => {
      const a = item.querySelector("a.s-card__link");
      if (!a) return;

      let href = a.href || a.getAttribute("href");
      if (!href) return;

      try {
        const url = new URL(href);

        // only product pages
        const match = url.pathname.match(/\/itm\/(\d+)/);
        if (!match) return;

        const id = match[1];

        // 🔥 YOUR REQUIRED FORMAT
        links.push(`https://www.ebay.com/itm/${id}`);
      } catch (e) {}
    });

    return [...new Set(links)];
  });
}

async function getDescription(page) {
  try {
    const iframeHandle = await page.waitForSelector("#desc_ifr", {
      timeout: 15000,
    });

    if (!iframeHandle) return "";

    const frame = await iframeHandle.contentFrame();
    if (!frame) return "";

    await frame.waitForSelector("body", { timeout: 10000 });

    return await frame.evaluate(() => {
      return document.body.innerHTML || "";
    });
  } catch (err) {
    console.log("❌ Description error:", err.message);
    return "";
  }
}

async function isInvalidProductPage(page) {
  try {
    const text = await page.evaluate(() => document.body.innerText);

    return (
      text.includes("We looked everywhere") || text.includes("page is missing")
    );
  } catch {
    return true;
  }
}

module.exports = {
  downloadImages,
  getListingLinks,
  getDescription,
  isInvalidProductPage,
};
