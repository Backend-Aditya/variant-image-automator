document.addEventListener('DOMContentLoaded', () => {
  class VariantImageGallery {
    constructor() {
      this.productHandle = this.getProductHandle();
      this.shopDomain = window.Shopify.shop;
      this.imageMap = {};
      this.mediaMap = {};
      this.productImages = document.querySelectorAll('[data-product-media-id]');

      if (!this.productHandle ||!this.shopDomain |

| this.productImages.length === 0) {
        console.log('Variant Gallery: Missing required data. Aborting.');
        return;
      }

      this.fetchData().then(() => {
        this.init();
      });
    }

    getProductHandle() {
      // Assumes a standard Shopify URL structure: /products/some-handle
      const path = window.location.pathname;
      const parts = path.split('/');
      if (parts === 'products' && parts) {
        return parts;
      }
      return null;
    }

    async fetchData() {
      try {
        const url = `/apps/api/public/variant-images/${this.productHandle}?shop=${this.shopDomain}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok.');
        const data = await response.json();
        this.imageMap = data.imageMap |

| {};
        this.mediaMap = data.mediaMap |

| {};
      } catch (error) {
        console.error('Variant Gallery: Failed to fetch image map.', error);
      }
    }

    init() {
      // Listen for the theme's variant change event
      document.addEventListener('variant:change', this.onVariantChange.bind(this));
      
      // Initial gallery update based on the currently selected variant
      const initialVariantId = this.getCurrentVariantId();
      if (initialVariantId) {
        this.updateGallery(`gid://shopify/ProductVariant/${initialVariantId}`);
      }
    }

    onVariantChange(event) {
      const variant = event.detail.variant;
      if (variant) {
        this.updateGallery(variant.id);
      }
    }

    getCurrentVariantId() {
        // Try to find the selected variant from the URL or a form input
        const urlParams = new URLSearchParams(window.location.search);
        let variantId = urlParams.get('variant');
        if (variantId) return variantId;

        const variantInput = document.querySelector('input[name="id"]');
        if (variantInput) return variantInput.value;
        
        return null;
    }

    updateGallery(selectedVariantId) {
      if (Object.keys(this.imageMap).length === 0) {
        // If no map exists, do nothing and let the theme behave normally.
        return;
      }
      
      const visibleImageGids = this.imageMap[selectedVariantId] ||;

      if (visibleImageGids.length === 0) {
        // If the selected variant has no specific images, show all images.
        this.productImages.forEach(imgElement => {
          imgElement.style.display = '';
        });
        return;
      }

      // Create a Set for fast lookups
      const visibleImageUrls = new Set(visibleImageGids.map(gid => this.mediaMap[gid]));

      this.productImages.forEach(imgElement => {
        const mediaId = imgElement.getAttribute('data-product-media-id');
        const imageGid = `gid://shopify/MediaImage/${mediaId}`;
        const imageUrl = this.mediaMap[imageGid];

        if (visibleImageUrls.has(imageUrl)) {
          imgElement.style.display = '';
        } else {
          imgElement.style.display = 'none';
        }
      });
    }
  }

  new VariantImageGallery();
});