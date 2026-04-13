const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function downloadImages(imageUrls, productId) {
  const folderPath = path.join(process.cwd(), "images");

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const savedImages = [];

  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const url = imageUrls[i];

      // ✅ unique name
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

      savedImages.push(fileName); // 👈 sirf name store karo
    } catch (err) {
      console.log("❌ Image download failed:", err.message);
    }
  }

  return savedImages;
}

module.exports = { downloadImages };
