/**
 * Parses a price string from the LOGC API into a number
 * @param priceString - Price string like "$4.99" or "$0.00"
 * @returns Price as number, or 0 if parsing fails
 */
export function parseComicPrice(priceString: string): number {
  if (!priceString || priceString.trim() === "") {
    return 0;
  }

  // Remove currency symbols, spaces, and other non-numeric characters except decimal point
  const cleanPriceString = priceString.replace(/[^\d.]/g, "");

  const parsedPrice = parseFloat(cleanPriceString);

  // If parsing fails, return 0
  if (isNaN(parsedPrice)) {
    return 0;
  }

  return parsedPrice;
}
