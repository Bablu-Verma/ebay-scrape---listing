const statusDiv = document.getElementById("status");

// 🔁 TAB SWITCH
function showTab(tab) {
  document.getElementById("scrapeSection").classList.add("hidden");
  document.getElementById("listSection").classList.add("hidden");

  document
    .getElementById("scrapeTab")
    .classList.remove("border-blue-600", "text-blue-600");
  document
    .getElementById("listTab")
    .classList.remove("border-blue-600", "text-blue-600");

  if (tab === "scrape") {
    document.getElementById("scrapeSection").classList.remove("hidden");
    document
      .getElementById("scrapeTab")
      .classList.add("border-blue-600", "text-blue-600");
  } else {
    document.getElementById("listSection").classList.remove("hidden");
    document
      .getElementById("listTab")
      .classList.add("border-blue-600", "text-blue-600");
  }
}

function setStatus(msg) {
  statusDiv.innerHTML = msg;
}

// 🔍 SCRAPE
async function startScrape() {
  const url = document.getElementById("scrapeUrl").value;
  const page = document.getElementById("page").value;

  if (!url || !page) {
    alert("URL and Page required");
    return;
  }

  setStatus("⏳ Scraping started...");

  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, page: Number(page) }),
  });

  const data = await res.json();
  pollStatus(data.jobId);
}

// 📦 LIST
async function startListing() {
  const url = document.getElementById("listUrl").value;

  if (!url) {
    alert("URL required");
    return;
  }

  setStatus("⏳ Listing started...");

  const res = await fetch("/api/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  pollStatus(data.jobId);
}

// 🔄 STATUS
function pollStatus(jobId) {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/status/${jobId}`);
    const data = await res.json();

    if (data.status === "processing") {
      setStatus("⏳ Processing...");
    }

    if (data.status === "completed") {
      setStatus("✅ Completed");
      clearInterval(interval);
    }

    if (data.status === "failed") {
      setStatus("❌ Failed: " + data.error);
      clearInterval(interval);
    }
  }, 2000);
}

async function loadProducts() {
  const res = await fetch("/api/products");
  const data = await res.json();

  console.log(data);

  document.getElementById("productsList").innerHTML =
    "📦 Products: " + data.count;
}
