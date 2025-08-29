import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prepareMetafield } from "../db.server";
import type { VariantImageMap } from "../globals";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Step 1: Authenticate the request
  const { admin, session } = await authenticate.admin(request);

  if (!session) {
    return json({ message: "Unauthorized" }, { status: 401 });
  }

  // Step 2: Parse the request body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { productId, imageMap } = body as { productId: string; imageMap: VariantImageMap };

  if (!productId |

| typeof imageMap!== 'object') {
    return json({ message: "Missing productId or imageMap" }, { status: 400 });
  }

  // Step 3: Prepare the mutation variables
  const metafieldsInput = prepareMetafield(productId, imageMap);

  // Step 4: Define and execute the GraphQL mutation
  const mutation = `
    mutation setMetafield($metafields:!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          key
          namespace
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(mutation, {
      variables: metafieldsInput,
    });

    const data = await response.json();
    const userErrors = data.data?.metafieldsSet?.userErrors;

    if (userErrors && userErrors.length > 0) {
      console.error("GraphQL UserErrors:", userErrors);
      return json({ message: "Error saving metafield", errors: userErrors }, { status: 500 });
    }

    return json({ success: true, metafields: data.data?.metafieldsSet?.metafields });
  } catch (error) {
    // This catches network errors or errors from the graphql client itself
    console.error("Error executing metafieldsSet mutation:", error);
    return json({ message: "An internal server error occurred." }, { status: 500 });
  }
};