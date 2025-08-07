import * as cheerio from "cheerio";
import {
  ComicData,
  ComicDetails,
  Creator,
  Character,
  Variant,
  Story,
} from "@/types";
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

/**
 * Extracts detailed comic information from a comic page HTML
 * @param htmlString - The HTML string from a comic detail page
 * @returns ComicDetails object with all extracted information
 */
export function extractComicDetails(htmlString: string): ComicDetails {
  const $ = cheerio.load(htmlString);

  // Extract basic information
  const title = $("h1").text().trim();
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
  const id = idMatch ? idMatch[1] : "";

  // Extract description
  const description = $(".listing-description p").text().trim();

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
  const format = formatAndPages.includes("Comic") ? "Comic" : "Unknown";

  // Extract detailed information from the details section
  let coverDate = "";
  let upc = "";
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
      case "Distributor SKU":
        distributorSku = value;
        break;
      case "Final Order Cutoff":
        // Remove icon text (like "event_busy") and keep only the date part
        finalOrderCutoff = value.replace(/^\w+\s+/, "").trim(); // Remove first word (icon) and spaces
        break;
    }
  });

  // Extract creators from Featured Creators section
  const creators: Creator[] = [];
  $("#creators- .row .col-auto").each((_, element) => {
    const $creator = $(element);
    const name = $creator.find(".name a").text().trim();
    const role = $creator.find(".role").text().trim();
    const url = $creator.find(".name a").attr("href") || "";

    if (name) {
      creators.push({ name, role, url });
    }
  });

  // Extract cover artists and production crew
  $("#cover-artists .col-auto, #credits-production .col-auto").each(
    (_, element) => {
      const $creator = $(element);
      const name = $creator.find(".name a").text().trim();
      const role = $creator.find(".role").text().trim();
      const url = $creator.find(".name a").attr("href") || "";

      if (name) {
        creators.push({ name, role, url });
      }
    }
  );

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
        url,
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
      const variantId = variantUrl.match(/variant=(\d+)/)?.[1] || "";

      if (variantTitle && variantUrl) {
        variants.push({
          id: variantId,
          title: variantTitle,
          coverImage: variantImage,
          url: variantUrl,
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
        storyCreators.push({ name, role, url });
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
          url,
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
    seriesUrl,
    creators,
    characters,
    variants,
    stories,
    previousIssueUrl,
    nextIssueUrl,
  };
}
