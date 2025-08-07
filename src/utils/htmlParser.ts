import * as cheerio from "cheerio";
import { ComicData } from "@/types";
import { parseComicDate } from "./dateUtils";
import { parseComicPrice } from "./parsingUtils";

/**
 * Parses the HTML list content from the LOGC API response
 * @param htmlString - The raw HTML string from the API response
 * @returns Clean, formatted HTML string
 */
export function parseHtml(htmlString: string): string {
  if (!htmlString || typeof htmlString !== "string") {
    return "";
  }

  // Clean up escaped characters and normalize whitespace
  let cleanHtml = htmlString
    // Remove \r\n escape sequences
    .replace(/\\r\\n/g, "\n")
    // Remove actual \r\n characters
    .replace(/\r\n/g, "\n")
    // Replace multiple consecutive newlines with single newline
    .replace(/\n{2,}/g, "\n")
    // Replace multiple consecutive spaces with single space
    .replace(/[ ]{2,}/g, " ")
    // Trim whitespace from the beginning and end
    .trim();

  // Additional cleanup for common HTML issues
  cleanHtml = cleanHtml
    // Fix any double-encoded entities
    .replace(/&amp;/g, "&")
    // Normalize quotes
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Fix any spacing around HTML tags
    .replace(/>\s+</g, "><")
    // Ensure proper spacing after closing tags
    .replace(/>(\S)/g, "> $1");

  return cleanHtml;
}

/**
 * Extracts comic data from the parsed HTML
 * @param htmlString - The HTML string containing comic list
 * @returns Array of comic data objects
 */
export function extractComicData(htmlString: string): ComicData[] {
  const cleanHtml = parseHtml(htmlString);
  const $ = cheerio.load(cleanHtml);
  const comics: ComicData[] = [];

  $("#comic-list-issues li.issue").each((_, element) => {
    const $item = $(element);

    const comic: ComicData = {
      id: $item.attr("data-comic") || "",
      title: $item.find(".title a").text().trim(),
      publisher: $item.find(".publisher").text().trim(),
      date: parseComicDate($item.find(".date").text().trim()),
      price: parseComicPrice(
        $item
          .find(".price")
          .text()
          .replace(/\s*·\s*/, "")
          .trim()
      ),
      coverImage:
        $item.find(".cover img").attr("data-src") ||
        $item.find(".cover img").attr("src") ||
        "",
      url: $item.find(".title a").attr("href") || "",
      pulls: parseInt($item.attr("data-pulls") || "0"),
      community: parseInt($item.attr("data-community") || "0"),
    };

    comics.push(comic);
  });

  return comics;
}
