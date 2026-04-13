function cleanHTML(dirtyHTML) {
  // Step 1 - Script tags hatao (content ke saath)
  dirtyHTML = dirtyHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  // Step 2 - Link tags hatao
  dirtyHTML = dirtyHTML.replace(/<link[^>]*>/gi, "");

  // Step 3 - MS Word garbage tags hatao
  dirtyHTML = dirtyHTML.replace(/<o:p>[\s\S]*?<\/o:p>/gi, "");

  // Step 4 - data-* attributes hatao (style nahi)
  dirtyHTML = dirtyHTML.replace(/\s*data-[a-z-]+="[^"]*"/gi, "");

  // Step 5 - class="MsoNormal" hatao
  dirtyHTML = dirtyHTML.replace(/\s*class="[^"]*"/gi, "");

  // Step 6 - nonce attributes hatao
  dirtyHTML = dirtyHTML.replace(/\s*nonce="[^"]*"/gi, "");

  // Step 7 - align attributes hatao
  dirtyHTML = dirtyHTML.replace(/\s*align="[^"]*"/gi, "");

  // Step 8 - target attributes hatao
  dirtyHTML = dirtyHTML.replace(/\s*target="[^"]*"/gi, "");

  // Step 9 - crossorigin attributes hatao
  dirtyHTML = dirtyHTML.replace(/\s*crossorigin="[^"]*"/gi, "");

  // Step 10 - Extra spaces / blank lines hatao
  dirtyHTML = dirtyHTML.replace(/\n\s*\n/g, "\n");
  dirtyHTML = dirtyHTML.replace(/^\s+|\s+$/g, "");

  // ✅ Style Rakhha Hai - Nahi Hataya

  return dirtyHTML;
}

module.exports = { cleanHTML };
