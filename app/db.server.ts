import { PrismaClient } from "@prisma/client";
import type { VariantImageMap } from "./globals";

declare global {
  var prismaGlobal: PrismaClient;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();

export default prisma;

/**
 * Parses the variant image mapping from a product's metafield.
 * @param metafield - The metafield object from the Shopify Admin API response.
 * @returns The parsed VariantImageMap object, or an empty object if parsing fails or metafield is null.
 */
export function parseVariantImageMap(
  metafield: { value: string } | null | undefined
): VariantImageMap {
  if (!metafield?.value) {
    return {};
  }
  try {
    const parsed = JSON.parse(metafield.value);
    // Basic validation to ensure it's an object
    if (typeof parsed === "object" && parsed!== null &&!Array.isArray(parsed)) {
      return parsed as VariantImageMap;
    }
    return {};
  } catch (error) {
    console.error("Failed to parse variant image map metafield:", error);
    return {};
  }
}

/**
 * Prepares the metafields input for the metafieldsSet mutation.
 * @param productId - The GID of the product to update.
 * @param imageMap - The VariantImageMap object to save.
 * @returns The input object for the GraphQL mutation.
 */
export function prepareMetafield(
  productId: string,
  imageMap: VariantImageMap
) {
  return {
    metafields: [],
  };
}
