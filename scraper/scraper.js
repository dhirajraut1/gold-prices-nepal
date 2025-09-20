import axios from "axios";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { adToBs } from "@sbmdkl/nepali-date-converter";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
  Connection: "keep-alive",
};

async function scrapeGoldPrice() {
  const url = "https://www.fenegosida.org/";
  try {
    const { data } = await axios.get(url, { headers });
    const dom = new JSDOM(data);
    const document = dom.window.document;
    const goldPrices = [];

    document
      .querySelectorAll("#header-rate .rate-gold.post")
      .forEach((element) => {
        const goldType =
          element.querySelector("p")?.childNodes[0]?.textContent?.trim() ?? "";
        const price = element.querySelector("b")?.textContent?.trim() ?? "";
        const per = element.querySelector("span")?.textContent?.trim() ?? "";

        if (goldType && price && per.includes("per 1 tola")) {
          goldPrices.push({
            type: goldType,
            price: price,
            date: new Date(),
          });
        }
      });

    document
      .querySelectorAll("#header-rate .rate-silver.post")
      .forEach((element) => {
        const silverType =
          element.querySelector("p")?.childNodes[0]?.textContent?.trim() ?? "";
        const price = element.querySelector("b")?.textContent?.trim() ?? "";
        const per = element.querySelector("span")?.textContent?.trim() ?? "";

        if (silverType && price && per.includes("per 1 tola")) {
          goldPrices.push({
            type: silverType,
            price: price,
            date: new Date(),
          });
        }
      });

    return goldPrices;
  } catch (error) {
    console.error("Error scraping data:", error);
    throw error;
  }
}

async function main() {
  const goldPrice = await scrapeGoldPrice();

  const fineGoldObj = goldPrice.find(
    (item) => item.type === "FINE GOLD (9999)"
  );
  const silverObj = goldPrice.find((item) => item.type === "SILVER");
  const fineGold = fineGoldObj ? parseInt(fineGoldObj.price, 10) : 0;
  const silver = silverObj ? parseInt(silverObj.price, 10) : 0;

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
  const filePath = join(__dirname, "../gold_silver_prices.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

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
console.log("Entry for today already exists.");
