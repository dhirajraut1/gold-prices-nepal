import axios from "axios";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { adToBs } from "@sbmdkl/nepali-date-converter";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "application/json",
  Connection: "keep-alive",
};

async function fetchGoldPrice() {
  const url = "https://api.fenegosida.org/api/website/v1/Dashboard/today";
  try {
    const { data } = await axios.get(url, { headers });
    
    // Map the API response to a consistent format similar to the previous scraper
    const prices = data.map((item) => ({
      type: item.rateType,
      price: item.baseRatePerGram,
      date: new Date(item.todayDate),
    }));

    return prices;
  } catch (error) {
    console.error("Error fetching data from API:", error);
    throw error;
  }
}

async function main() {
  const prices = await fetchGoldPrice();

  // Match based on the API's rateType for 1 tola rates.
  // Includes fallback to English strings just in case the API occasionally returns them.
  // "सुन" = Gold, "चाँदी" = Silver, "१ तोला" = 1 Tola
  const fineGoldObj = prices.find(
    (item) => 
      item.type === "FINE GOLD (9999)" || 
      (item.type.includes("सुन") && item.type.includes("१ तोला"))
  );
  
  const silverObj = prices.find(
    (item) => 
      item.type === "SILVER" || 
      (item.type.includes("चाँदी") && item.type.includes("१ तोला"))
  );

  // Use Math.round to safely handle potential floating point numbers from the API
  const fineGold = fineGoldObj ? Math.round(fineGoldObj.price) : 0;
  const silver = silverObj ? Math.round(silverObj.price) : 0;

  const today = fineGoldObj?.date ? new Date(fineGoldObj.date) : new Date();
  const ad = today.toISOString().slice(0, 10);

  const bsDate = adToBs(ad);
  const bs =
    typeof bsDate === "object" && bsDate.year
      ? `${bsDate.year}-${String(bsDate.month).padStart(2, "0")}-${String(
          bsDate.day
        ).padStart(2, "0")}`
      : bsDate?.toString?.() ?? "";

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const filePath = join(__dirname, "gold_silver_prices.json");

  // Ensure the file exists before reading to prevent crashes on first run
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }

  const fileData = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(fileData || "[]");

  const exists = data.some((entry) => entry.ad === ad);

  if (!exists) {
    data.push({ ad, bs, fineGold, silver });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log("Added new entry:", { ad, bs, fineGold, silver });
  } else {
    console.log("Entry for today already exists.");
  }
}

main();