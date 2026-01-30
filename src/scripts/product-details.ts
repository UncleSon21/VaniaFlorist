import { fetchProductById } from "./db";
import { qs, qsa, getParam, formatPrice } from "./utils";
import { addToCart, loadCart } from "./cart";

/**
 * Updates the cart count badge in the navbar
 */
function updateCartCount() {
  const cart = loadCart();
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  
  const cartCountEl = qs<HTMLElement>(".cart-count");
  if (cartCountEl) {
    cartCountEl.textContent = String(totalItems);
  }
}

async function main() {
  // Initialize cart count on page load
  updateCartCount();
  
  // Listen for cart changes
  document.addEventListener("cart:changed", updateCartCount);
  const id = getParam("id");
  if (!id) {
    location.replace("shop.html");
    return;
  }

  try {
    const p = await fetchProductById(id);
    
    // Update page title
    document.title = `${p.name} - Vaniaflorsit`;
    
    // Set product title and description
    const titleEl = qs<HTMLElement>(".product-title");
    if (titleEl) titleEl.textContent = p.name.toUpperCase();
    
    const subtitleEl = qs<HTMLElement>(".product-subtitle");
    if (subtitleEl) {
      subtitleEl.textContent = p.description || "A beautiful flower arrangement";
    }

    // Set main product image
    if (p.images && p.images.length > 0) {
      const mainImg = qs<HTMLImageElement>("#p-image");
      if (mainImg) {
        mainImg.src = p.images[0];
        mainImg.style.display = "block";
        mainImg.alt = p.name;
        
        mainImg.onload = () => {
          const placeholder = qs(".image-placeholder");
          if (placeholder) placeholder.style.display = "none";
        };
        
        mainImg.onerror = () => {
          console.warn("Failed to load product image:", p.images[0]);
        };
      }
      
      // Update thumbnails if you have multiple images
      const thumbnailContainer = qs(".thumbnail-images");
      if (thumbnailContainer && p.images.length > 1) {
        thumbnailContainer.innerHTML = p.images.slice(0, 4).map((img, idx) => 
          `<div class="thumbnail ${idx === 0 ? 'active' : ''}" data-index="${idx}">
            <img src="${img}" alt="${p.name} ${idx + 1}" style="width:100%; height:100%; object-fit:cover;">
          </div>`
        ).join("");
      }
    }

    // Populate size/variant options from database
    const sizeWrap = qs<HTMLElement>(".size-options");
    if (sizeWrap && p.variants && p.variants.length > 0) {
      sizeWrap.innerHTML = p.variants.map((v: any, i: number) => `
        <label class="size-option">
          <input type="radio" name="size" value="${v.code}" data-price="${v.priceCents / 100}" ${i === 0 ? "checked" : ""}>
          <div class="size-box">
            <span class="price">${formatPrice(v.priceCents / 100)}</span>
            <span class="label">${v.name}</span>
          </div>
        </label>
      `).join("");

      // Add change listener for size options
      sizeWrap.addEventListener("change", updateCartSummary);
    }

    // Presentation options listener
    const presentationWrap = qs<HTMLElement>(".presentation-options");
    if (presentationWrap) {
      presentationWrap.addEventListener("change", updateCartSummary);
    }

    // Populate add-ons from database
    if (p.addOns && p.addOns.length > 0) {
      const addonGrid = qs<HTMLElement>('.addon-grid[data-category="chocolates"]');
      if (addonGrid) {
        addonGrid.innerHTML = p.addOns.map((a: any) => `
          <div class="addon-item">
            ${a.image ? `<img src="${a.image}" alt="${a.name}" />` : ''}
            <div class="addon-placeholder" style="${a.image ? 'display:none' : ''}">🎁</div>
            <h4>${a.name}</h4>
            <p class="addon-price">${formatPrice(a.priceCents / 100)}</p>
            <button class="add-addon" data-id="${a.id}" data-name="${a.name}" data-price-cents="${a.priceCents}">Add</button>
          </div>
        `).join("");
      }
    } else {
      // Show message if no add-ons available
      const addonGrid = qs<HTMLElement>('.addon-grid[data-category="chocolates"]');
      if (addonGrid) {
        addonGrid.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">No add-ons available for this product.</p>';
      }
    }

    // Handle add-on button clicks
    const addonContainer = qs<HTMLElement>(".addons-section");
    if (addonContainer) {
      addonContainer.addEventListener("click", (e) => {
        const btn = (e.target as HTMLElement).closest(".add-addon") as HTMLButtonElement;
        if (!btn) return;
        
        const isAdded = btn.classList.contains("added");
        btn.classList.toggle("added");
        btn.textContent = isAdded ? "Add" : "Added ✓";
        
        updateCartSummary();
      });
    }

    // Quantity input
    const qtyInput = qs<HTMLInputElement>("#qty");
    if (qtyInput) {
      qtyInput.addEventListener("change", () => {
        if (parseInt(qtyInput.value) < 1) qtyInput.value = "1";
        updateCartSummary();
      });
      qtyInput.addEventListener("input", () => {
        if (parseInt(qtyInput.value) < 1) qtyInput.value = "1";
        updateCartSummary();
      });
    }

    // Update cart summary in sidebar
    function updateCartSummary() {
      const variantCode = qs<HTMLInputElement>('input[name="size"]:checked')?.value || p.variants[0].code;
      const variant = p.variants.find((v: any) => v.code === variantCode);
      if (!variant) return;

      const qty = Math.max(1, parseInt(qtyInput?.value || "1", 10));
      let subtotalCents = variant.priceCents;

      // Build summary items HTML
      let summaryHTML = `
        <div class="summary-item" id="main-product">
          <span>${p.name} (${variant.name})</span>
          <span>${formatPrice(variant.priceCents / 100)}</span>
        </div>
      `;

      // Add presentation option if vase selected
      const vaseOption = qs<HTMLInputElement>('input[name="presentation"][value="vase"]:checked');
      if (vaseOption) {
        const vasePrice = parseFloat(vaseOption.dataset.price || "30");
        subtotalCents += vasePrice * 100;
        summaryHTML += `
          <div class="summary-item">
            <span>In Vase</span>
            <span>${formatPrice(vasePrice)}</span>
          </div>
        `;
      }

      // Add selected add-ons
      qsa<HTMLButtonElement>(".add-addon.added").forEach(btn => {
        const addonPriceCents = Number(btn.dataset.priceCents || "0");
        const addonName = btn.dataset.name || "Add-on";
        subtotalCents += addonPriceCents;
        summaryHTML += `
          <div class="summary-item">
            <span>${addonName}</span>
            <span>${formatPrice(addonPriceCents / 100)}</span>
          </div>
        `;
      });

      // Update summary items
      const summaryItems = qs<HTMLElement>(".summary-items");
      if (summaryItems) {
        summaryItems.innerHTML = summaryHTML;
      }

      // Calculate and display total (with quantity)
      const totalCents = subtotalCents * qty;
      const totalElement = qs<HTMLElement>("#total-price");
      if (totalElement) {
        totalElement.textContent = formatPrice(totalCents / 100);
      }
    }

    // Delivery date enforcement for perishable products
    function enforceDeliveryRules() {
      const input = qs<HTMLInputElement>("#delivery-date");
      if (!input) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let minDate = new Date(today);
      
      // Handle artificial flowers with lead time
      if (p.material === "artificial" && p.leadTimeDays) {
        minDate.setDate(minDate.getDate() + p.leadTimeDays);
      }
      
      // Handle perishable flowers
      if (p.perishable?.earliestDaysAhead) {
        minDate.setDate(minDate.getDate() + p.perishable.earliestDaysAhead);
      }
      
      // Set minimum date
      input.min = minDate.toISOString().split("T")[0];
      
      // Set default value to minimum date
      if (!input.value) {
        input.value = input.min;
      }
      
      // Check for blackout days
      input.addEventListener("change", () => {
        if (!input.value) return;
        
        const selectedDate = new Date(input.value + "T00:00:00");
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
        
        if (p.perishable?.blackoutWeekdays?.includes(dayOfWeek)) {
          alert("Sorry, we don't deliver fresh flowers on this day of the week. Please choose another date.");
          input.value = input.min;
        }
        
        // Check if date is in the past or before minimum
        if (selectedDate < minDate) {
          alert(`Please select a date on or after ${minDate.toLocaleDateString()}`);
          input.value = input.min;
        }
      });
    }

    // Initialize
    updateCartSummary();
    enforceDeliveryRules();

    // Add to cart functionality
    const addBtn = qs<HTMLButtonElement>(".btn-add-cart");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const variantCode = qs<HTMLInputElement>('input[name="size"]:checked')?.value || p.variants[0].code;
        const addOnIds = qsa<HTMLButtonElement>(".add-addon.added")
          .map(b => String(b.dataset.id))
          .filter(Boolean);
        const qty = Math.max(1, parseInt(qtyInput?.value || "1", 10));
        
        addToCart({ 
          productId: p.id, 
          variantId: variantCode, 
          addOnIds, 
          qty 
        });
        
        const originalText = addBtn.textContent;
        addBtn.textContent = "ADDED ✓";
        addBtn.style.backgroundColor = "#4CAF50";
        
        setTimeout(() => {
          addBtn.textContent = originalText;
          addBtn.style.backgroundColor = "";
        }, 1500);
      });
    }

    // Buy now functionality
    const buyNowBtn = qs<HTMLButtonElement>(".btn-buy-now");
    if (buyNowBtn) {
      buyNowBtn.addEventListener("click", () => {
        const variantCode = qs<HTMLInputElement>('input[name="size"]:checked')?.value || p.variants[0].code;
        const addOnIds = qsa<HTMLButtonElement>(".add-addon.added")
          .map(b => String(b.dataset.id))
          .filter(Boolean);
        const qty = Math.max(1, parseInt(qtyInput?.value || "1", 10));
        
        addToCart({ 
          productId: p.id, 
          variantId: variantCode, 
          addOnIds, 
          qty 
        });
        
        // Redirect to checkout
        location.href = "checkout.html";
      });
    }

    // Tab functionality
    const tabButtons = qsa<HTMLButtonElement>(".tab-button");
    const tabContents = qsa<HTMLElement>(".tab-content");
    
    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const tabName = btn.dataset.tab;
        
        tabButtons.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));
        
        btn.classList.add("active");
        const targetContent = qs<HTMLElement>(`.tab-content[data-tab="${tabName}"]`);
        if (targetContent) targetContent.classList.add("active");
      });
    });

    // Add-on category switching
    const categoryButtons = qsa<HTMLButtonElement>(".addon-category");
    const addonGrids = qsa<HTMLElement>(".addon-grid");
    
    categoryButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const category = btn.dataset.category;
        
        categoryButtons.forEach(b => b.classList.remove("active"));
        addonGrids.forEach(g => g.classList.remove("active"));
        
        btn.classList.add("active");
        const targetGrid = qs<HTMLElement>(`.addon-grid[data-category="${category}"]`);
        if (targetGrid) targetGrid.classList.add("active");
      });
    });

    // Thumbnail click handler (if you have multiple images)
    const thumbnails = qsa<HTMLElement>(".thumbnail");
    thumbnails.forEach(thumb => {
      thumb.addEventListener("click", () => {
        const index = parseInt(thumb.dataset.index || "0");
        const mainImg = qs<HTMLImageElement>("#p-image");
        
        if (mainImg && p.images[index]) {
          mainImg.src = p.images[index];
          
          thumbnails.forEach(t => t.classList.remove("active"));
          thumb.classList.add("active");
        }
      });
    });

  } catch (error) {
    console.error("Error loading product:", error);
    alert("Failed to load product details. Please try again.");
    location.replace("shop.html");
  }
}

main().catch(console.error);