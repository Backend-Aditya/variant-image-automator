import {
  reactExtension,
  useApi,
  AdminBlock,
  BlockStack,
  Text,
  Spinner,
  Grid,
  Image,
  Select,
  Button,
  InlineStack,
  View,
} from "@shopify/ui-extensions-react/admin";
import { useState, useEffect, useCallback, useMemo } from "react";

const TARGET = "admin.product-details.block.render";

type ProductVariant = {
  id: string;
  title: string;
};

type ProductMediaImage = {
  id: string;
  image: {
    url: string;
  };
  alt: string;
};

type VariantImageMap = {
  [variantId: string]: string;
};

// A map to quickly find which variant an image is assigned to
type ReverseImageMap = {
  [imageId: string]: string; // imageId -> variantId
};

export default reactExtension(TARGET, () => <App />);

function App() {
  const { data, query, network, toast } = useApi(TARGET);
  const productId = data.selected.id;

  const [variants, setVariants] = useState<ProductVariant>();
  const [images, setImages] = useState<ProductMediaImage>();
  // This state holds the explicit assignments made by the user
  const [assignments, setAssignments] = useState<{ [imageId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const = useState(false);

  const GET_PRODUCT_DATA_QUERY = `
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        variants(first: 50) {
          nodes {
            id
            title
          }
        }
        media(first: 50) {
          nodes {
           ... on MediaImage {
              id
              image {
                url
              }
              alt
            }
          }
        }
        metafield(namespace: "variant_media", key: "image_map") {
          id
          value
        }
      }
    }
  `;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await query(GET_PRODUCT_DATA_QUERY, { variables: { id: productId } });
      if (response.errors) throw response.errors;

      const productData = response.data.product;
      setVariants(productData.variants.nodes);
      setImages(productData.media.nodes.filter(node => node.id));

      if (productData.metafield?.value) {
        const savedMap: VariantImageMap = JSON.parse(productData.metafield.value);
        const initialAssignments: { [imageId: string]: string } = {};
        for (const variantId in savedMap) {
          savedMap[variantId].forEach(imageId => {
            initialAssignments[imageId] = variantId;
          });
        }
        setAssignments(initialAssignments);
      } else {
        setAssignments({});
      }
    } catch (error) {
      console.error("Failed to fetch product data:", error);
      toast.show("Error fetching product data.", { isError: true });
    } finally {
      setLoading(false);
    }
  }, [productId, query, toast]);

  useEffect(() => {
    fetchData();
  },);

  // This derived state implements the "magic" grouping logic
  const derivedImageMap = useMemo(() => {
    const newMap: VariantImageMap = {};
    let activeVariantId = "";

    images.forEach(image => {
      if (assignments[image.id]) {
        activeVariantId = assignments[image.id];
      }
      if (activeVariantId) {
        if (!newMap[activeVariantId]) {
          newMap[activeVariantId] =;
        }
        newMap[activeVariantId].push(image.id);
      }
    });
    return newMap;
  }, [images, assignments]);

  const reverseImageMap: ReverseImageMap = useMemo(() => {
    const reverseMap: ReverseImageMap = {};
    for (const variantId in derivedImageMap) {
      derivedImageMap[variantId].forEach(imageId => {
        reverseMap[imageId] = variantId;
      });
    }
    return reverseMap;
  }, [derivedImageMap]);

  const handleAssignmentChange = (imageId: string, variantId: string) => {
    setAssignments(prev => {
      const newAssignments = {...prev };
      if (variantId === "unassigned") {
        delete newAssignments[imageId];
      } else {
        newAssignments[imageId] = variantId;
      }
      return newAssignments;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await network.fetch("/api/save-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          imageMap: derivedImageMap,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message |

| "Failed to save mappings.");
      }
      
      toast.show("Variant images saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.show(error.message |

| "An error occurred while saving.", { isError: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminBlock title="Variant Image Gallery"><BlockStack inlineAlign="center"><Spinner /></BlockStack></AdminBlock>;
  }

  const selectOptions = [
    { label: "Unassigned", value: "unassigned" },
   ...variants.map(v => ({ label: v.title, value: v.id })),
  ];

  return (
    <AdminBlock title="Variant Image Gallery">
      <BlockStack gap="400">
        <Text>Assign an image to a variant. All following images will be automatically grouped with that variant until a new assignment is made.</Text>
        <Grid columns={['auto', 'auto', 'auto', 'auto', 'auto']} gap="400">
          {images.map(image => {
            const assignedVariantId = reverseImageMap[image.id];
            return (
              <View key={image.id} border="base" borderRadius="base" padding="200">
                <BlockStack gap="200">
                  <Image source={image.image.url} alt={image.alt} aspectRatio={1} />
                  <Select
                    label="Assign to variant"
                    labelHidden
                    options={selectOptions}
                    value={assignedVariantId || "unassigned"}
                    onChange={(variantId) => handleAssignmentChange(image.id, variantId)}
                  />
                </BlockStack>
              </View>
            );
          })}
        </Grid>
        <InlineStack align="end">
          <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
        </InlineStack>
      </BlockStack>
    </AdminBlock>
  );
}