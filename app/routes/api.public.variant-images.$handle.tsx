import { LoaderFunctionArgs, json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { handle } = params;

  if (!handle) {
    return json({ error: "Product handle is required" }, { status: 400 });
  }

  const { storefront } = await unauthenticated.storefront(
    // The shop domain is needed for unauthenticated requests
    new URL(request.url).searchParams.get("shop") |

| ""
  );

  const query = `
    query getProductMetafield($handle: String!) {
      product(handle: $handle) {
        metafield(namespace: "variant_media", key: "image_map") {
          value
        }
        # Also fetch media to map GIDs to something usable by the theme
        media(first: 50) {
          nodes {
           ... on MediaImage {
              id
              previewImage {
                url
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await storefront.graphql(query, {
      variables: { handle },
    });
    const data = await response.json();

    if (data.errors) {
      console.error("Storefront API errors:", data.errors);
      return json({ error: "Failed to fetch product data" }, { status: 500 });
    }

    const metafieldValue = data.data?.product?.metafield?.value;
    const imageMap = metafieldValue? JSON.parse(metafieldValue) : {};
    
    // Create a map of Image GID -> Image URL for easier lookup on the client
    const mediaMap = data.data?.product?.media?.nodes.reduce((acc, media) => {
      if (media.id && media.previewImage?.url) {
        acc[media.id] = media.previewImage.url;
      }
      return acc;
    }, {});

    return json({ imageMap, mediaMap }, {
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow cross-origin requests
      }
    });

  } catch (error) {
    console.error("Error fetching from Storefront API:", error);
    return json({ error: "An internal server error occurred" }, { status: 500 });
  }
};