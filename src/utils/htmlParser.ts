import * as cheerio from "cheerio";
import {
  ComicData,
  ComicDetails,
  Creator,
  Character,
  Variant,
  Story,
} from "@/types";
import { extractTitlePath } from "./getApiUrl";
import { parseComicDate } from "./dateUtils";
import { parseComicPrice } from "./parsingUtils";
import { LOGC_URL } from "@/config/constants";

/**
 * Converts a relative URL to an absolute URL by prefixing with LOGC base URL
 * @param url - The relative or absolute URL
 * @returns Complete absolute URL
 */
function makeAbsoluteUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url; // Already absolute
  return `${LOGC_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

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
    const url = $item.find(".title a").attr("href") || "";

    // Extract title and handle variant names
    const $titleLink = $item.find(".title a");
    let title = $titleLink.clone().children().remove().end().text().trim(); // Get text without variant span
    const variantName = $titleLink.find(".variant-name").text().trim();

    // Format title with variant name using en-dash if variant exists
    if (variantName) {
      title = `${title} \u2013 ${variantName}`;
    }

    const comic: ComicData = {
      id: parseInt($item.attr("data-comic") || "0"),
      title,
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
      url: makeAbsoluteUrl(url),
      pulls: parseInt($item.attr("data-pulls") || "0"),
      community: parseInt($item.attr("data-community") || "0"),
      titlePath: extractTitlePath(url),
    };

    // Add variant-specific fields if this is a variant
    const parentId = $item.attr("data-parent");
    if (parentId && parentId !== "0") {
      comic.parentId = parseInt(parentId, 10);
      comic.variantId = parseInt($item.attr("data-comic") || "0", 10);
      if (variantName) {
        comic.variantName = variantName;
      }
    }

    comics.push(comic);
  });

  return comics;
}

/**
 * Extracts detailed comic information from a comic page HTML
 * @param htmlString - The HTML string from a comic detail page
 * @returns ComicDetails object with all extracted information
 */
export function extractComicDetails(htmlString: string): ComicDetails {
  const $ = cheerio.load(htmlString);

  // Extract basic information
  const h1Titles: string[] = [];
  $("h1").each((_, el) => {
    const mainTitle = $(el).contents().not("small").text().trim();
    const smallText = $(el).find("small").text().trim();
    h1Titles.push(smallText ? `${mainTitle} \u2013 ${smallText}` : mainTitle);
  });
  const title = h1Titles.join(" \u2013 ");
  const publisher = $(".header-intro a").first().text().trim();
  const releaseDateText = $(".header-intro a").last().text().trim();

  // Parse release date into proper Date object
  const releaseDate = parseComicDate(releaseDateText);

  // Extract issue number from title (assuming format like "Title #6")
  const issueMatch = title.match(/#(\d+)/);
  const issueNumber = issueMatch ? issueMatch[1] : "";

  // Extract ID from URL or meta tags
  const canonicalUrl = $('link[rel="canonical"]').attr("href") || "";
  const idMatch = canonicalUrl.match(/comic\/(\d+)\//);
  const id = idMatch ? parseInt(idMatch[1]) : 0;

  // Extract description
  const descriptionParts: string[] = [];
  $(".listing-description p").each((_, element) => {
    const text = $(element).text().trim();
    if (text) {
      descriptionParts.push(text);
    }
  });
  const description = descriptionParts.join("\n");

  // Extract cover image
  const coverImage =
    $(".cover-art img").attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    "";

  // Extract rating information
  const ratingText = $(".rating-avg").text().trim();
  const rating = parseFloat(ratingText) || 0;
  const ratingCount =
    parseInt($(".text-capitalize strong").text().replace(/,/g, "")) || 0;
  const ratingDescription = $(".comic-score .text .color1")
    .first()
    .text()
    .trim();

  // Extract stats
  const pulls =
    parseInt(
      $(".cg-icon-pull").parent().find("span").text().replace(/,/g, "")
    ) || 0;
  const collected =
    parseInt(
      $(".cg-icon-collect").parent().find("span").text().replace(/,/g, "")
    ) || 0;
  const read =
    parseInt(
      $(".cg-icon-readlist").parent().find("span").text().replace(/,/g, "")
    ) || 0;
  const wanted =
    parseInt(
      $(".cg-icon-wishlist").parent().find("span").text().replace(/,/g, "")
    ) || 0;

  // Extract additional details
  const formatAndPages = $(".listing-content .row.mt-1 .col").text().trim();
  const pages = parseInt(formatAndPages.match(/(\d+) pages/)?.[1] || "0");
  const priceMatch = formatAndPages.match(/\$(\d+\.?\d*)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
  const format = formatAndPages.split(/\s*·\s*/)[0]?.trim() || "Unknown";

  // Extract detailed information from the details section
  let coverDate = "";
  let upc: string | null = null;
  let isbn: string | null = null;
  let distributorSku = "";
  let finalOrderCutoff = "";

  $(".details-addtl-block").each((_, element) => {
    const $block = $(element);
    const name = $block.find(".name").text().trim();
    const value = $block.find(".value").text().trim();

    switch (name) {
      case "Cover Date":
        coverDate = value;
        break;
      case "UPC":
        upc = value;
        break;
      case "ISBN":
        isbn = value;
        break;
      case "Distributor SKU":
        distributorSku = value;
        break;
      case "Final Order Cutoff":
        // Remove icon text (like "event_busy") and keep only the date part
        finalOrderCutoff = value.replace(/^\w+\s+/, "").trim(); // Remove first word (icon) and spaces
        break;
    }
  });

  // Extract creators from all root-level creator sections (e.g. #creators-*, not just #creators-)
  const creators: Creator[] = [];
  $("[id^='creators-'] .row .col-auto").each((_, element) => {
    const $creator = $(element);
    const name = $creator.find(".name a").text().trim();
    const role = $creator.find(".role").text().trim();
    const url = $creator.find(".name a").attr("href") || "";
    if (name) {
      creators.push({ name, role, url: makeAbsoluteUrl(url), type: "creator" });
    }
  });

  // Extract cover artists
  $("#cover-artists .col-auto").each((_, element) => {
    const $creator = $(element);
    const name = $creator.find(".name a").text().trim();
    const role = $creator.find(".role").text().trim();
    const url = $creator.find(".name a").attr("href") || "";
    if (name) {
      creators.push({ name, role, url: makeAbsoluteUrl(url), type: "cover" });
    }
  });

  // Extract production crew
  $("#credits-production .col-auto").each((_, element) => {
    const $creator = $(element);
    const name = $creator.find(".name a").text().trim();
    const role = $creator.find(".role").text().trim();
    const url = $creator.find(".name a").attr("href") || "";
    if (name) {
      creators.push({
        name,
        role,
        url: makeAbsoluteUrl(url),
        type: "production",
      });
    }
  });

  // Remove duplicate creators (same name, role, url, type)
  const uniqueCreators: Creator[] = [];
  const seen = new Set<string>();
  for (const c of creators) {
    const key = `${c.name}|${c.role}|${c.url}|${c.type}`;
    if (!seen.has(key)) {
      uniqueCreators.push(c);
      seen.add(key);
    }
  }

  // Extract featured characters
  const characters: Character[] = [];
  $("#characters- .col-auto").each((_, element) => {
    const $character = $(element);
    const name = $character.find(".name a").text().trim();
    const realName = $character.find(".real-name").text().trim();
    const url = $character.find(".name a").attr("href") || "";
    const type = $character.find(".character-type").text().trim();

    if (name) {
      characters.push({
        name,
        realName: realName || undefined,
        url: makeAbsoluteUrl(url),
        type: type || undefined,
      });
    }
  });

  // Extract variant covers
  const variants: Variant[] = [];
  $(".variant-cover-list details").each((_, detailsElement) => {
    const $details = $(detailsElement);
    const category = $details.find("summary").text().trim();

    $details.find(".col-lg-4").each((_, variantElement) => {
      const $variant = $(variantElement);
      const variantTitle = $variant.find("a").attr("title") || "";
      const variantUrl = $variant.find("a").attr("href") || "";
      const variantImage =
        $variant.find("img").attr("data-src") ||
        $variant.find("img").attr("src") ||
        "";
      const variantId = parseInt(variantUrl.match(/variant=(\d+)/)?.[1] || "0");

      if (variantTitle && variantUrl) {
        variants.push({
          id: variantId,
          title: variantTitle,
          coverImage: variantImage,
          url: makeAbsoluteUrl(variantUrl),
          category,
        });
      }
    });
  });

  // Extract stories
  const stories: Story[] = [];
  $(".story-item").each((_, storyElement) => {
    const $story = $(storyElement);
    const storyTitle = $story.find(".story-title").text().trim();
    const storyInfo = $story.find(".copy-really-small").first().text().trim();

    // Parse story type and pages
    const typeMatch = storyInfo.match(/(Story|Front Matter|Back Matter)/);
    const storyType = typeMatch ? typeMatch[1] : "Unknown";
    const pagesMatch = storyInfo.match(/(\d+) pages?/);
    const storyPages = pagesMatch ? parseInt(pagesMatch[1]) : undefined;

    // Extract story creators
    const storyCreators: Creator[] = [];
    $story.find("[id*='creators-'] .col-auto").each((_, creatorElement) => {
      const $creator = $(creatorElement);
      const name = $creator.find(".name a").text().trim();
      const role = $creator.find(".role").text().trim();
      const url = $creator.find(".name a").attr("href") || "";

      if (name) {
        storyCreators.push({
          name,
          role,
          url: makeAbsoluteUrl(url),
          type: "creator",
        });
      }
    });

    // Extract story characters
    const storyCharacters: Character[] = [];
    $story.find("[id*='characters-'] .col-auto").each((_, characterElement) => {
      const $character = $(characterElement);
      const name = $character.find(".name a").text().trim();
      const realName = $character.find(".real-name").text().trim();
      const url = $character.find(".name a").attr("href") || "";
      const type = $character.find(".character-type").text().trim();

      if (name) {
        storyCharacters.push({
          name,
          realName: realName || undefined,
          url: makeAbsoluteUrl(url),
          type: type || undefined,
        });
      }
    });

    if (storyTitle) {
      stories.push({
        title: storyTitle,
        type: storyType,
        pages: storyPages,
        creators: storyCreators,
        characters: storyCharacters,
      });
    }
  });

  // Extract navigation URLs
  const previousIssueUrl =
    $(".series-pagination .prev").attr("href") || undefined;
  const nextIssueUrl = $(".series-pagination .next").attr("href") || undefined;
  const seriesUrl = $(".series-pagination .series").attr("href") || "";

  return {
    id,
    title,
    issueNumber,
    publisher,
    description,
    coverDate,
    releaseDate,
    pages,
    price,
    format,
    upc,
    isbn,
    distributorSku,
    finalOrderCutoff,
    coverImage,
    url: canonicalUrl,
    rating,
    ratingCount,
    ratingText: ratingDescription,
    pulls,
    collected,
    read,
    wanted,
    seriesUrl: makeAbsoluteUrl(seriesUrl),
    creators: uniqueCreators,
    characters,
    variants,
    stories,
    previousIssueUrl: previousIssueUrl
      ? makeAbsoluteUrl(previousIssueUrl)
      : undefined,
    nextIssueUrl: nextIssueUrl ? makeAbsoluteUrl(nextIssueUrl) : undefined,
  };
}
