/* =====================================================
   BLUE SKIN COSMETICS - COMPLETE ENGINE WITH WISHLIST
   ===================================================== */

const CLIENT_WHATSAPP_NUMBER = "919658399991";

// 1. ஆரம்ப நிலை / Backup தயாரிப்புகள் (const-க்கு பதிலா let)
let products = [];

// =====================================================
// 2. SUPABASE-லிருந்து லைவ் டேட்டா எடுக்கும் என்ஜின்
// =====================================================
async function fetchSupabaseProducts() {
    try {
        const client = window.dbClient;
        if (!client) {
            console.warn("Supabase client இன்னும் தயாராகவில்லை.");
            return;
        }

        const { data, error } = await client
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.warn("Supabase fetch error, fallback to initial items:", error);
            return;
        }

        if (data && data.length > 0) {
            products = data.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                subTitle: p.sub_title || p.subtitle || '',
                weight: p.weight || '',
                originalPrice: Number(p.original_price || p.originalPrice || 0),
                discountPercent: Number(p.discount_percent || p.discountPercent || 0),
                stock: p.stock || 10,
                images: p.images && p.images.length > 0 ? p.images : [p.image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600&auto=format&fit=crop'],
                image: (p.images && p.images[0]) ? p.images[0] : (p.image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600&auto=format&fit=crop'),
                desc: p.description || p.desc || '',
                howTo: p.how_to || p.howTo || ''
            }));

            // 👇 மிக முக்கியம்: தயாரிப்புகளைத் திரையில் உடனே ஏற்றுதல்
            if (typeof renderProducts === 'function') {
                renderProducts('all');
            }
        }
    } catch (err) {
        console.error("Fetch Supabase Error:", err);
    }
}

// Realtime Listener: அட்மினில் எடிட் செய்தால் ஷாப்பில் உடனே மாறும்
if (window.dbClient) {
    window.dbClient
        .channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
            fetchSupabaseProducts();
        })
        .subscribe();
}

// பேஜ் திறந்ததும் அழைத்தல்
window.addEventListener('load', () => {
    fetchSupabaseProducts();
});
document.addEventListener('DOMContentLoaded', () => {
    fetchSupabaseProducts();
});
// 4. பேஜ் லோட் ஆனதும் டேட்டாபேஸை அழைக்க
document.addEventListener('DOMContentLoaded', () => {
    fetchSupabaseProducts();
});
function getDiscountedPrice(item) {
    if (!item.discountPercent || item.discountPercent <= 0) return item.originalPrice;
    const discountAmount = Math.round((item.originalPrice * item.discountPercent) / 100);
    return item.originalPrice - discountAmount;
}

const sampleGalleryImages = [
    "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1583241800698-e8ab01830a07?q=80&w=600&auto=format&fit=crop"
];

// LocalStorage Pools
let cart = JSON.parse(localStorage.getItem('blueskin_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('blueskin_wishlist')) || [];
let activeViewingProductId = null;

// Views
const shopMainCatalogView = document.getElementById('shopMainCatalogView');
const productFullPageView = document.getElementById('productFullPageView');

// DOM References
const productsCatalog = document.getElementById('productsCatalog');
const catTrack = document.getElementById('catTrack');
const catScrollLeft = document.getElementById('catScrollLeft');
const catScrollRight = document.getElementById('catScrollRight');
const currentCategoryHeading = document.getElementById('currentCategoryHeading');
const productCounterText = document.getElementById('productCounterText');

// Cart References
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const openCartBtn = document.getElementById('openCartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartCount = document.getElementById('cartCount');
const drawerItemCount = document.getElementById('drawerItemCount');
const cartItemsList = document.getElementById('cartItemsList');
const cartSubTotal = document.getElementById('cartSubTotal');
const cartTotalPrice = document.getElementById('cartTotalPrice');
const cartSuggestionsRow = document.getElementById('cartSuggestionsRow');

// Wishlist References
const wishlistDrawer = document.getElementById('wishlistDrawer');
const wishlistOverlay = document.getElementById('wishlistOverlay');
const openWishlistBtn = document.getElementById('openWishlistBtn');
const closeWishlistBtn = document.getElementById('closeWishlistBtn');
const wishlistCount = document.getElementById('wishlistCount');
const drawerWishlistCount = document.getElementById('drawerWishlistCount');
const wishlistItemsList = document.getElementById('wishlistItemsList');
const headerWishlistIcon = document.getElementById('headerWishlistIcon');

// 1. Horizontal Scroll Controls
if (catScrollLeft && catTrack) {
    catScrollLeft.onclick = function() { catTrack.scrollBy({ left: -250, behavior: 'smooth' }); };
}
if (catScrollRight && catTrack) {
    catScrollRight.onclick = function() { catTrack.scrollBy({ left: 250, behavior: 'smooth' }); };
}

// 2. Category Selection
window.selectCategory = function(catName, clickedElement) {
    document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
    if (clickedElement) clickedElement.classList.add('active');
    renderProducts(catName);
};

if (catTrack) {
    catTrack.addEventListener('click', function(e) {
        const item = e.target.closest('.cat-item');
        if (!item) return;
        selectCategory(item.getAttribute('data-category'), item);
    });
}

function getActiveCategory() {
    const active = document.querySelector('.cat-item.active');
    return active ? active.getAttribute('data-category') : 'all';
}

// 3. Product Card Template with Wishlist Heart
function createProductCardElement(prod) {
    const cartItem = cart.find(i => i.id === prod.id);
    const isWishlisted = wishlist.includes(prod.id);
    const card = document.createElement('div');
    card.className = 'shop-prod-card';

    const finalPrice = getDiscountedPrice(prod);

    const actionHtml = (cartItem && cartItem.qty > 0) ? `
        <div class="card-inline-counter">
            <button class="inline-btn" onclick="updateInCardQty(${prod.id}, -1)">-</button>
            <span class="inline-val">${cartItem.qty}</span>
            <button class="inline-btn" onclick="updateInCardQty(${prod.id}, 1)">+</button>
        </div>
    ` : `
        <button class="btn-card-add" onclick="updateInCardQty(${prod.id}, 1)">
            <i class="fa-solid fa-bag-shopping"></i> Add to Cart
        </button>
    `;

    card.innerHTML = `
        <div>
            <div class="shop-prod-img-box">
                <!-- Floating Wishlist Heart -->
                <button class="card-wishlist-toggle ${isWishlisted ? 'active' : ''}" 
                        onclick="toggleWishlist(${prod.id}, event)" 
                        title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
                    <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>

                <img src="${prod.image}" alt="${prod.name}" onclick="openFullProductPage(${prod.id})">
                <span class="shop-prod-tag">${prod.category}</span>
                <span class="discount-badge-pill">-${prod.discountPercent}% OFF</span>
            </div>
            <div class="shop-prod-info">
                <h3 class="shop-prod-title" onclick="openFullProductPage(${prod.id})">${prod.name}</h3>
                <div class="shop-price-block">
                    <span class="mrp-strikethrough">₹ ${prod.originalPrice.toLocaleString('en-IN')}</span>
                    <span class="discounted-final-price">₹ ${finalPrice.toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>
        <div class="shop-card-actions">
            <button class="btn-card-view" onclick="openFullProductPage(${prod.id})">Details</button>
            <div class="card-action-slot">
                ${actionHtml}
            </div>
        </div>
    `;
    return card;
}

// 4. Render Catalog Grid
window.renderProducts = function(filterCategory = 'all') {
    if (!productsCatalog) return;
    productsCatalog.innerHTML = '';

    const filtered = (filterCategory === 'all')
        ? products
        : products.filter(p => p.category.toLowerCase() === filterCategory.toLowerCase());

    if (currentCategoryHeading) {
        currentCategoryHeading.textContent = (filterCategory === 'all')
            ? 'All Luxury Collections'
            : `${filterCategory.toUpperCase()} Collection`;
    }

    if (productCounterText) {
        productCounterText.textContent = `Showing ${filtered.length} pieces`;
    }

    filtered.forEach(prod => {
        productsCatalog.appendChild(createProductCardElement(prod));
    });
};

// 5. In-Card Quantity Operations
window.updateInCardQty = function(productId, delta) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const finalPrice = getDiscountedPrice(prod);
    let existing = cart.find(i => i.id === productId);

    if (existing) {
        existing.qty += delta;
        if (existing.qty <= 0) cart = cart.filter(i => i.id !== productId);
    } else if (delta > 0) {
        cart.push({ ...prod, price: finalPrice, qty: 1 });
    }

    saveCart();
    renderProducts(getActiveCategory());

    if (activeViewingProductId) {
        updateFullPageActionSlot(activeViewingProductId);
        renderFullPageRecommended(activeViewingProductId);
    }
};

function saveCart() {
    localStorage.setItem('blueskin_cart', JSON.stringify(cart));
    updateCartUI();
}

// 6. WISHLIST ENGINE (Add, Remove, Sync & Drawer)
window.toggleWishlist = function(productId, event) {
    if (event) event.stopPropagation();

    if (wishlist.includes(productId)) {
        wishlist = wishlist.filter(id => id !== productId);
    } else {
        wishlist.push(productId);
    }

    localStorage.setItem('blueskin_wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
    renderProducts(getActiveCategory());

    if (activeViewingProductId === productId) {
        syncFullPageWishlistButton(productId);
    }
};

function updateWishlistUI() {
    if (!wishlistCount) return;
    const count = wishlist.length;
    wishlistCount.textContent = count;
    if (drawerWishlistCount) drawerWishlistCount.textContent = `(${count} items)`;

    if (count > 0) {
        openWishlistBtn.classList.add('has-items');
        headerWishlistIcon.className = "fa-solid fa-heart";
    } else {
        openWishlistBtn.classList.remove('has-items');
        headerWishlistIcon.className = "fa-regular fa-heart";
    }

    if (!wishlistItemsList) return;

    if (count === 0) {
        wishlistItemsList.innerHTML = `
            <div style="text-align: center; padding: 4rem 1rem; color: #94a3b8;">
                <i class="fa-regular fa-heart" style="font-size: 2.8rem; color: rgba(244,63,94,0.3); margin-bottom: 0.8rem;"></i>
                <p style="color: #ffffff; font-weight: 600;">Your Wishlist is Empty</p>
                <span style="font-size: 0.8rem;">Tap the heart on creations you wish to reserve.</span>
            </div>
        `;
    } else {
        wishlistItemsList.innerHTML = '';
        wishlist.forEach(id => {
            const prod = products.find(p => p.id === id);
            if (!prod) return;

            const finalPrice = getDiscountedPrice(prod);
            const row = document.createElement('div');
            row.className = 'wishlist-item-card';
            row.innerHTML = `
                <div class="wishlist-item-thumb">
                    <img src="${prod.image}" alt="${prod.name}">
                </div>
                <div class="wishlist-item-details">
                    <h4 class="wishlist-item-title">${prod.name}</h4>
                    <div class="wishlist-item-price">₹ ${finalPrice.toLocaleString('en-IN')}</div>
                    <button class="btn-move-to-bag" onclick="moveWishlistToCart(${prod.id})">
                        <i class="fa-solid fa-bag-shopping"></i> Move to Bag
                    </button>
                </div>
                <button class="btn-remove-wishlist" onclick="toggleWishlist(${prod.id})" title="Remove">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            wishlistItemsList.appendChild(row);
        });
    }
}

window.moveWishlistToCart = function(productId) {
    updateInCardQty(productId, 1);
    toggleWishlist(productId);
    toggleWishlistDrawer(false);
    toggleCart(true);
};

function toggleWishlistDrawer(show = true) {
    if (show) {
        if (wishlistDrawer) wishlistDrawer.classList.add('active');
        if (wishlistOverlay) wishlistOverlay.classList.add('active');
    } else {
        if (wishlistDrawer) wishlistDrawer.classList.remove('active');
        if (wishlistOverlay) wishlistOverlay.classList.remove('active');
    }
}

if (openWishlistBtn) openWishlistBtn.onclick = function() { toggleWishlistDrawer(true); };
if (closeWishlistBtn) closeWishlistBtn.onclick = function() { toggleWishlistDrawer(false); };
if (wishlistOverlay) wishlistOverlay.onclick = function() { toggleWishlistDrawer(false); };

// 7. Full Page View Logic
window.openFullProductPage = function(productId) {
    const prod = products.find(p => p.id === productId) || products[0];
    activeViewingProductId = prod.id;

    if (shopMainCatalogView) shopMainCatalogView.style.display = 'none';
    if (productFullPageView) productFullPageView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const finalPrice = getDiscountedPrice(prod);
    const savings = prod.originalPrice - finalPrice;

    document.getElementById('fullBreadCategory').textContent = prod.category.toUpperCase();
    document.getElementById('fullBreadTitle').textContent = prod.name;
    document.getElementById('detailCategoryBadge').textContent = `${prod.category.toUpperCase()} COLLECTION`;
    document.getElementById('detailTitle').textContent = prod.name;
    document.getElementById('detailSubTitle').textContent = prod.subTitle;
    document.getElementById('detailOriginalPrice').textContent = `₹ ${prod.originalPrice.toLocaleString('en-IN')}`;
    document.getElementById('detailDiscountPercent').textContent = `${prod.discountPercent}% OFF`;
    document.getElementById('detailPrice').textContent = `₹ ${finalPrice.toLocaleString('en-IN')}`;
    document.getElementById('detailYouSave').textContent = `You Save: ₹ ${savings.toLocaleString('en-IN')}`;
    document.getElementById('detailDescText').textContent = prod.desc;

    const mainImg = document.getElementById('detailMainImg');
    if (mainImg) mainImg.src = prod.image;

    const thumbRow = document.getElementById('thumbGalleryRow');
    if (thumbRow) {
        thumbRow.innerHTML = '';
        const gallery = [prod.image, ...sampleGalleryImages.slice(1, 4)];
        gallery.forEach((imgUrl, idx) => {
            const thumb = document.createElement('div');
            thumb.className = `thumb-item ${idx === 0 ? 'active' : ''}`;
            thumb.innerHTML = `<img src="${imgUrl}" alt="view ${idx + 1}">`;
            thumb.onclick = function() {
                if (mainImg) mainImg.src = imgUrl;
                document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbRow.appendChild(thumb);
        });
    }

    updateFullPageActionSlot(prod.id);
    syncFullPageWishlistButton(prod.id);
    toggleAccordion('accItemDesc');
    renderFullPageRecommended(prod.id);
};

function syncFullPageWishlistButton(productId) {
    const btn = document.getElementById('fullWishlistActionBtn');
    if (!btn) return;
    const isWishlisted = wishlist.includes(productId);

    if (isWishlisted) {
        btn.classList.add('active');
        btn.innerHTML = `<i class="fa-solid fa-heart" style="color: #f43f5e;"></i> In Wishlist`;
    } else {
        btn.classList.remove('active');
        btn.innerHTML = `<i class="fa-regular fa-heart"></i> Add To Wishlist`;
    }
    btn.onclick = function() { toggleWishlist(productId); };
}

function renderFullPageRecommended(currentProdId) {
    const recShelf = document.getElementById('fullPageRecommendedRow');
    if (recShelf) {
        recShelf.innerHTML = '';
        const recs = products.filter(p => p.id !== currentProdId).slice(0, 4);
        recs.forEach(r => {
            recShelf.appendChild(createProductCardElement(r));
        });
    }
}

window.closeFullProductPage = function() {
    activeViewingProductId = null;
    if (productFullPageView) productFullPageView.style.display = 'none';
    if (shopMainCatalogView) shopMainCatalogView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderProducts(getActiveCategory());
};

function updateFullPageActionSlot(productId) {
    const slot = document.getElementById('fullPageActionSlot');
    if (!slot) return;
    const cartItem = cart.find(i => i.id === productId);

    if (cartItem && cartItem.qty > 0) {
        slot.innerHTML = `
            <div class="card-inline-counter" style="min-width: 140px; padding: 0.5rem 1rem;">
                <button class="inline-btn" style="font-size: 1.2rem;" onclick="updateInCardQty(${productId}, -1)">-</button>
                <span class="inline-val" style="font-size: 1rem;">${cartItem.qty} in Bag</span>
                <button class="inline-btn" style="font-size: 1.2rem;" onclick="updateInCardQty(${productId}, 1)">+</button>
            </div>
        `;
    } else {
        slot.innerHTML = `
            <button class="btn-card-add" style="padding: 0.75rem 2rem; font-size: 0.85rem;" onclick="updateInCardQty(${productId}, 1)">
                <i class="fa-solid fa-bag-shopping"></i> Add to Bag
            </button>
        `;
    }
}

// 8. Accordion Toggle
window.toggleAccordion = function(targetId) {
    const allItems = document.querySelectorAll('.accordion-item');
    allItems.forEach(item => {
        const icon = item.querySelector('.acc-icon');
        if (item.id === targetId) {
            if (item.classList.contains('active')) {
                item.classList.remove('active');
                if (icon) icon.innerHTML = '<i class="fa-solid fa-plus"></i>';
            } else {
                item.classList.add('active');
                if (icon) icon.innerHTML = '<i class="fa-solid fa-minus"></i>';
            }
        } else {
            item.classList.remove('active');
            if (icon) icon.innerHTML = '<i class="fa-solid fa-plus"></i>';
        }
    });
};

// 9. Cart UI Management
function updateCartUI() {
    if (!cartCount) return;
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCount.textContent = totalItems;
    if (drawerItemCount) drawerItemCount.textContent = `(${totalItems} items)`;

    let totalAmount = 0;
    if (!cartItemsList) return;

    if (cart.length === 0) {
        cartItemsList.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8;">
                <i class="fa-solid fa-bag-shopping" style="font-size: 2.5rem; color: rgba(245,196,67,0.3); margin-bottom: 0.8rem;"></i>
                <p style="color: #ffffff; font-weight: 600;">Your luxury bag is empty</p>
                <span style="font-size: 0.8rem;">Add signature formulations to review.</span>
            </div>
        `;
    } else {
        cartItemsList.innerHTML = '';
        cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            totalAmount += itemTotal;
            const itemRow = document.createElement('div');
            itemRow.className = 'cart-item-card';
            itemRow.innerHTML = `
                <div class="cart-item-thumb">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <div class="cart-item-price">₹ ${itemTotal.toLocaleString('en-IN')}</div>
                    <div class="cart-qty-counter">
                        <button class="cart-qty-btn" onclick="updateInCardQty(${item.id}, -1)">-</button>
                        <span class="cart-qty-val">${item.qty}</span>
                        <button class="cart-qty-btn" onclick="updateInCardQty(${item.id}, 1)">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="updateInCardQty(${item.id}, -${item.qty})" title="Remove">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            cartItemsList.appendChild(itemRow);
        });
    }

    if (cartSubTotal) cartSubTotal.textContent = `₹ ${totalAmount.toLocaleString('en-IN')}`;
    if (cartTotalPrice) cartTotalPrice.textContent = `₹ ${totalAmount.toLocaleString('en-IN')}`;

    if (cartSuggestionsRow) {
        cartSuggestionsRow.innerHTML = '';
        const suggestions = products.filter(p => !cart.some(c => c.id === p.id)).slice(0, 4);

        suggestions.forEach(s => {
            const finalP = getDiscountedPrice(s);
            const box = document.createElement('div');
            box.className = 'cart-rec-box';
            box.innerHTML = `
                <div>
                    <div class="cart-rec-img">
                        <img src="${s.image}" alt="${s.name}">
                    </div>
                    <h5 class="cart-rec-title">${s.name}</h5>
                    <div class="cart-rec-price">₹ ${finalP.toLocaleString('en-IN')}</div>
                </div>
                <button class="btn-rec-box-add" id="btn-cart-sugg-${s.id}" onclick="addSuggestionToCart(${s.id})">
                    <i class="fa-solid fa-plus"></i> Add
                </button>
            `;
            cartSuggestionsRow.appendChild(box);
        });
    }
}

window.addSuggestionToCart = function(productId) {
    updateInCardQty(productId, 1);
    const btn = document.getElementById(`btn-cart-sugg-${productId}`);
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-check"></i> Added`;
        btn.style.background = "#25d366";
        btn.style.color = "#ffffff";
    }
};

function toggleCart(show = true) {
    if (show) {
        if (cartDrawer) cartDrawer.classList.add('active');
        if (cartOverlay) cartOverlay.classList.add('active');
    } else {
        if (cartDrawer) cartDrawer.classList.remove('active');
        if (cartOverlay) cartOverlay.classList.remove('active');
    }
}

if (openCartBtn) openCartBtn.onclick = function() { toggleCart(true); };
if (closeCartBtn) closeCartBtn.onclick = function() { toggleCart(false); };
if (cartOverlay) cartOverlay.onclick = function() { toggleCart(false); };

// 10. WhatsApp Checkout Logic
window.submitWhatsAppOrder = function() {
    const nameInput = document.getElementById('custName');
    const phoneInput = document.getElementById('custPhone');
    const emailInput = document.getElementById('custEmail');
    const addressInput = document.getElementById('custAddress');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const address = addressInput.value.trim();

    if (!/^[A-Za-z\s]+$/.test(name)) {
        alert("Name must contain alphabets only!");
        nameInput.focus();
        return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Phone must contain exactly 10 digits!");
        phoneInput.focus();
        return;
    }

    if (!email || !address) {
        alert("Please fill all details!");
        return;
    }

    if (cart.length === 0) {
        alert("Your bag is empty!");
        return;
    }

    let itemsText = "";
    let grandTotal = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        grandTotal += itemTotal;
        itemsText += `${index + 1}️⃣ *${item.name}*\n   • *Qty   :* ${item.qty}\n   • *Price :* ₹ ${itemTotal.toLocaleString('en-IN')}\n\n`;
    });

    const now = new Date();
    const orderId = `BS-${Math.floor(100000 + Math.random() * 900000)}`;
    const formattedDate = now.toLocaleDateString('en-IN');
    const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const message = 
`👑 *BLUE SKIN LUXURY BOUTIQUE*
*Official Order Invoice*
────────────────────────
🧾 *Invoice ID :* #${orderId}
📅 *Date & Time :* ${formattedDate}, ${formattedTime}
────────────────────────

👤 *CLIENT INFORMATION*
• *Name     :* ${name}
• *Phone    :* +91 ${phone}
• *Email    :* ${email}
• *Address  :* ${address}

🛍️ *ORDERED CREATIONS*
────────────────────────
${itemsText.trim()}
────────────────────────

💳 *PAYMENT SUMMARY*
• *Subtotal    :* ₹ ${grandTotal.toLocaleString('en-IN')}
• *Shipping    :* FREE (Insured Express)
• *Grand Total :* *₹ ${grandTotal.toLocaleString('en-IN')}*
────────────────────────

✨ *Assurance:* 100% Authentic Handcrafted Formulation
🚚 *Dispatch:* Next Business Day via Priority Courier

_Please reply with payment details to confirm this order. Thank you for choosing Blue Skin._`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${CLIENT_WHATSAPP_NUMBER}?text=${encoded}`, '_blank');
};

// Initial Load
renderProducts('all');
updateCartUI();
updateWishlistUI();
// மொபைல் கார்ட்டில் Step 1 மற்றும் Step 2-ஐ மாற்றும் செயல்முறை
window.showMobileCheckout = function(isCheckout) {
    const drawer = document.getElementById('cartDrawer');
    const scrollBody = document.querySelector('.cart-split-body');
    if (drawer) {
        if (isCheckout) {
            if (typeof cart !== 'undefined' && cart.length === 0) {
                alert("உங்கள் கார்ட் காலியாக உள்ளது. தயவுசெய்து ஏதேனும் ஒரு பொருளைச் சேர்க்கவும்!");
                return;
            }
            drawer.classList.add('show-checkout');
        } else {
            drawer.classList.remove('show-checkout');
        }
        if (scrollBody) {
            scrollBody.scrollTop = 0; // பக்கத்தின் தொடக்கத்திற்கு நகர்த்த
        }
    }
};
// ==========================================================================
// === BLUE SKIN: BULLET-PROOF REFRESH & BACK-BUTTON LOCK CONTROLLER      ===
// ==========================================================================

// 1. கார்ட்டின் திறந்த நிலை & ஸ்கிரீனை பிரவுசரில் லாக் செய்தல்
function saveCartState(stateName) {
    localStorage.setItem('blueskin_cart_screen', stateName); // 'closed', 'step1', 'step2'
}

// 2. படிவத்தில் டைப் செய்யும் விவரங்களை (Draft) உடனுக்குடன் சேமித்தல்
function saveFormDraft() {
    const draft = {
        name: document.getElementById('custName') ? document.getElementById('custName').value : '',
        phone: document.getElementById('custPhone') ? document.getElementById('custPhone').value : '',
        address: document.getElementById('custAddress') ? document.getElementById('custAddress').value : ''
    };
    localStorage.setItem('blueskin_checkout_draft', JSON.stringify(draft));
}

// படிவ விவரங்களை மீண்டும் மீட்டெடுத்தல் (Restore)
function restoreFormDraft() {
    const draft = JSON.parse(localStorage.getItem('blueskin_checkout_draft'));
    if (draft) {
        if (document.getElementById('custName') && draft.name) document.getElementById('custName').value = draft.name;
        if (document.getElementById('custPhone') && draft.phone) document.getElementById('custPhone').value = draft.phone;
        if (document.getElementById('custAddress') && draft.address) document.getElementById('custAddress').value = draft.address;
    }
}

// 3. கார்ட் திறக்கும் முதன்மை செயல்முறை
window.openCart = function(isRestoring = false) {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (!drawer) return;

    drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // பின்னால் இருக்கும் தளம் ஸ்க்ரோல் ஆகாமல் லாக் செய்தல்

    if (!isRestoring) {
        saveCartState('step1');
        history.pushState({ screen: 'cart_step1' }, '');
    }
};

// 4. கார்ட் மூடும் செயல்முறை
window.closeCart = function(isBackNav = false) {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (!drawer) return;

    drawer.classList.remove('active');
    drawer.classList.remove('show-checkout');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = ''; // ஸ்க்ரோலை இயல்பாக்குதல்

    saveCartState('closed');

    // யூசர் க்ளோஸ் பட்டன் அழுத்தினால் ஹிஸ்டரியை சமன் செய்தல்
    if (!isBackNav && window.history.state && window.history.state.screen) {
        window.history.back();
    }
};

// 5. STEP 1 மற்றும் STEP 2-ஐ மாற்றும் கண்ட்ரோலர்
window.showMobileCheckout = function(isCheckout, isRestoring = false) {
    const drawer = document.getElementById('cartDrawer');
    const scrollBody = document.querySelector('.cart-split-body');
    if (!drawer) return;

    if (isCheckout) {
        if (typeof cart !== 'undefined' && cart.length === 0) {
            alert("உங்கள் கார்ட் காலியாக உள்ளது. தயவுசெய்து பொருட்களைச் சேர்க்கவும்!");
            return;
        }
        drawer.classList.add('show-checkout');
        saveCartState('step2');

        if (!isRestoring) {
            history.pushState({ screen: 'cart_step2' }, '');
        }
    } else {
        drawer.classList.remove('show-checkout');
        saveCartState('step1');
    }

    if (scrollBody) {
        scrollBody.scrollTop = 0;
    }
};

// 6. மொபைல் BACK BUTTON / BROWSER BACK அழுத்தும் போது நடக்கும் செயல்முறை
window.addEventListener('popstate', function(event) {
    const drawer = document.getElementById('cartDrawer');
    if (!drawer || !drawer.classList.contains('active')) return;

    const currentScreen = localStorage.getItem('blueskin_cart_screen');

    if (currentScreen === 'step2') {
        // Step 2-ல் இருந்தால் Back அழுத்தும்போது Step 1-க்கு மட்டுமே போகும்
        window.showMobileCheckout(false, true);
    } else if (currentScreen === 'step1') {
        // Step 1-ல் இருந்தால் கார்ட் மட்டும் மூடும்
        window.closeCart(true);
    }
});

// 7. தளம் RELOAD (REFRESH) ஆகும் போது பழைய நிலையை அப்படியே மீட்டெடுத்தல்
document.addEventListener('DOMContentLoaded', function() {
    // படிவ உள்ளீடுகளுக்கு ஆட்டோ-சேவ் லாக் போடுதல்
    ['custName', 'custPhone', 'custAddress'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', saveFormDraft);
        }
    });

    // பழைய படிவ விவரங்களை மீட்டெடுத்தல்
    restoreFormDraft();

    // டாப் கார்ட் பட்டன் மற்றும் க்ளோஸ் பட்டன்களை இணைத்தல்
    const openBtn = document.getElementById('openCartBtn');
    if (openBtn) {
        openBtn.onclick = function() { window.openCart(false); };
    }

    const closeBtn = document.getElementById('closeCartBtn');
    if (closeBtn) {
        closeBtn.onclick = function() { window.closeCart(false); };
    }

    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
        overlay.onclick = function() { window.closeCart(false); };
    }

    // REFRESH ஆவதற்கு முன் இருந்த ஸ்கிரீனை அப்படியே திறத்தல்
    const savedScreen = localStorage.getItem('blueskin_cart_screen');

    if (savedScreen === 'step1') {
        window.openCart(true);
    } else if (savedScreen === 'step2') {
        window.openCart(true);
        window.showMobileCheckout(true, true);
    }
});
// ==========================================================================
// === BLUE SKIN: BULLET-PROOF WHATSAPP CHECKOUT & SUPABASE CLOUD SYNC    ===
// ==========================================================================

window.submitWhatsAppOrder = async function() {
    // 1. உள்ளீட்டுப் புலங்களை எடுத்தல்
    const nameInput = document.getElementById('custName');
    const phoneInput = document.getElementById('custPhone');
    const addressInput = document.getElementById('custAddress');

    if (!nameInput || !phoneInput || !addressInput) {
        alert("படிவப் புலங்கள் கிடைக்கவில்லை. பக்கத்தை ரீலோட் செய்யவும்!");
        return;
    }

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();

    [nameInput, phoneInput, addressInput].forEach(el => el.style.borderColor = 'rgba(245, 196, 67, 0.3)');

    // 2. உள்ளீட்டு விவரங்களைச் சரிபார்த்தல் (Validation)
    if (!name) {
        nameInput.style.borderColor = '#ef4444';
        nameInput.focus();
        alert("தயவுசெய்து உங்கள் பெயரை உள்ளிடவும்!");
        return;
    }

    if (!phone || phone.replace(/[^0-9]/g, '').length < 10) {
        phoneInput.style.borderColor = '#ef4444';
        phoneInput.focus();
        alert("தயவுசெய்து சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்!");
        return;
    }

    if (!address) {
        addressInput.style.borderColor = '#ef4444';
        addressInput.focus();
        alert("தயவுசெய்து முழுமையான டெலிவரி முகவரியை உள்ளிடவும்!");
        return;
    }

    // 3. கார்ட்டில் பொருட்கள் உள்ளதா எனப் பார்த்தல்
    let activeCart = [];
    try {
        activeCart = (typeof cart !== 'undefined' && cart.length > 0) 
            ? cart 
            : JSON.parse(localStorage.getItem('blueskin_cart')) || [];
    } catch(e) {
        activeCart = [];
    }

    if (activeCart.length === 0) {
        alert("உங்கள் கார்ட் காலியாக உள்ளது. தயவுசெய்து பொருட்களைச் சேர்க்கவும்!");
        return;
    }

    // 4. வாட்ஸ்அப் இன்வாய்ஸ் மெசேஜ் தயாரித்தல்
    let orderItemsText = "";
    let grandTotal = 0;

    activeCart.forEach((item, index) => {
        const itemPrice = Number(item.price || item.finalPrice || item.specialPrice || 0);
        const itemQty = Number(item.qty || 1);
        const itemTotal = itemPrice * itemQty;
        grandTotal += itemTotal;
        orderItemsText += `${index + 1}️⃣ *${item.name || item.title}*\n   • *Qty   :* ${itemQty}\n   • *Price :* ₹ ${itemTotal.toLocaleString('en-IN')}\n\n`;
    });

    const orderId = `BS-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const message = 
`👑 *BLUE SKIN LUXURY BOUTIQUE*
*Official Order Invoice*
────────────────────────
🧾 *Order Ref  :* #${orderId}
📅 *Date & Time :* ${dateStr}, ${timeStr}
────────────────────────

👤 *CLIENT INFORMATION*
- *Name    :* ${name}
- *Phone   :* +91 ${phone}
- *Address :* ${address}

🛍️ *ORDERED CREATIONS*
────────────────────────
${orderItemsText.trim()}
────────────────────────

💳 *PAYMENT SUMMARY*
- *Total Value :* ₹ ${grandTotal.toLocaleString('en-IN')}
- *Shipping    :* Complimentary Insured Delivery (FREE)
- *Net Payable :* *₹ ${grandTotal.toLocaleString('en-IN')}*
────────────────────────

✨ *Assurance:* 100% Authentic Handcrafted Formulation
🚚 *Dispatch:* Priority Velvet Dispatch

_தயவுசெய்து இந்த ஆர்டரை உறுதிசெய்து கட்டண விவரங்களை அனுப்பவும். நன்றி!_`;

    const targetNumber = "919658399991";
    const whatsappURL = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;

    // ----------------------------------------------------------------------
    // 5. SUPABASE CLOUD DATABASE-ல் ஆர்டரைப் பதிவு செய்தல் (AWAIT உடனான நேரடி பதிவு)
    // ----------------------------------------------------------------------
    const client = window.dbClient;
    if (client) {
        try {
            const { data, error } = await client.from('orders').insert([
                {
                    id: orderId,
                    customer_name: name,
                    customer_phone: phone,
                    customer_address: address,
                    items_summary: activeCart.map(i => `${i.name || i.title} (x${i.qty || 1})`).join(", "),
                    total_amount: grandTotal,
                    is_paid: false,
                    order_status: 'Pending Verification'
                }
            ]);

            if (error) {
                console.error("Supabase Order DB Error:", error);
            } else {
                console.log("✅ ஆர்டர் Supabase-ல் வெற்றிகரமாக பதிவானது! ID:", orderId);
            }
        } catch (dbErr) {
            console.error("Supabase Connection Error:", dbErr);
        }
    }

    // ----------------------------------------------------------------------
    // 6. ஆட்டோ-ரீசெட் & கார்ட் டிராயரை மூடுதல்
    // ----------------------------------------------------------------------
    cart = [];
    localStorage.removeItem('blueskin_cart');
    localStorage.removeItem('blueskin_checkout_draft');
    localStorage.setItem('blueskin_cart_screen', 'closed');

    nameInput.value = '';
    phoneInput.value = '';
    addressInput.value = '';

    if (typeof updateCartUI === 'function') {
        updateCartUI();
    }
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) cartCountEl.textContent = '0';
    const drawerItemCountEl = document.getElementById('drawerItemCount');
    if (drawerItemCountEl) drawerItemCountEl.textContent = '(0 items)';

    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) {
        drawer.classList.remove('active');
        drawer.classList.remove('show-checkout');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
    document.body.style.overflow = '';

    // 7. ஆர்டர் பதிவான பிறகு வாட்ஸ்அப்பைத் திறத்தல்
    window.location.href = whatsappURL;
};
