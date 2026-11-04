// ==========================================================================
// === BLUE SKIN: 100% REALTIME CATALOG (ZERO DUMMY DATA)                 ===
// ==========================================================================

// 1. அசல் தயாரிப்புகள் மட்டுமே இருக்கும் பட்டியல் (No Dummy Data)
let products = [];

// 2. அட்மின் லோக்கல் மெமரியிலிருந்து உங்கள் 5 அசல் தயாரிப்புகளை உடனே எடுத்தல் (0ms Instant Load)
function loadAdminMasterProducts() {
    try {
        const localMaster = localStorage.getItem("BLUESKIN_PRODUCT_MASTER_DATA");
        if (localMaster) {
            const parsed = JSON.parse(localMaster);
            if (Array.isArray(parsed) && parsed.length > 0) {
                products = parsed.map(p => ({
                    id: p.id,
                    name: p.title || p.name,
                    category: p.category || '',
                    subTitle: p.subtitle || p.subTitle || '',
                    weight: p.weight || '',
                    originalPrice: Number(p.mrp || p.original_price || p.originalPrice || 0),
                    discountPercent: Number(p.discount || p.discount_percent || 0),
                    image: p.imgUrl || (p.images && p.images[0]) || p.image || '',
                    desc: p.desc || p.description || ''
                }));
                renderProducts(getActiveCategory());
            }
        }
    } catch(e) {
        console.warn("Local storage product read error:", e);
    }
}

// 3. சுபாபேஸ் கிளவுடிலிருந்து நேரலைத் தயாரிப்புகளை எடுத்தல்
async function fetchSupabaseProducts() {
    const client = window.dbClient;
    if (!client) {
        setTimeout(fetchSupabaseProducts, 400);
        return;
    }

    try {
        const { data, error } = await client
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (!error && data && data.length > 0) {
            products = data.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category || '',
                subTitle: p.sub_title || p.subtitle || '',
                weight: p.weight || '',
                originalPrice: Number(p.original_price || p.mrp || 0),
                discountPercent: Number(p.discount_percent || 0),
                image: (p.images && p.images[0]) ? p.images[0] : (p.image || ''),
                desc: p.description || ''
            }));

            renderProducts(getActiveCategory());
        }
    } catch(err) {
        console.error("Fetch Supabase Error:", err);
    }
}

// அட்மினில் தயாரிப்பு மாறினால் தானாக அப்டேட் ஆகும் Realtime Listener
if (window.dbClient) {
    window.dbClient
        .channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
            fetchSupabaseProducts();
        })
        .subscribe();
}

// பேஜ் திறந்ததும் அட்மின் தயாரிப்புகளை ஏற்றுதல்
loadAdminMasterProducts();
window.addEventListener('load', fetchSupabaseProducts);
document.addEventListener('DOMContentLoaded', () => {
    loadAdminMasterProducts();
    fetchSupabaseProducts();
});

function getDiscountedPrice(item) {
    if (!item) return 0;
    const orig = Number(item.originalPrice || item.mrp || item.price || 0);
    const disc = Number(item.discountPercent || item.discount || 0);
    if (!disc || disc <= 0) return orig;
    const discountAmount = Math.round((orig * disc) / 100);
    return orig - discountAmount;
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

// 2. Category Selection (கேட்டகிரி பில் கிளிக்)
window.selectCategory = function(catName, clickedElement) {
    document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
    if (clickedElement) {
        clickedElement.classList.add('active');
    } else {
        const match = document.querySelector(`.cat-item[data-category="${catName}"]`);
        if (match) match.classList.add('active');
    }
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
    const cartItem = cart.find(i => String(i.id) === String(prod.id));
    const isWishlisted = wishlist.includes(prod.id);
    const card = document.createElement('div');
    card.className = 'shop-prod-card';

    const finalPrice = getDiscountedPrice(prod);
    const hasDiscount = Number(prod.discountPercent) > 0;

    const actionHtml = (cartItem && cartItem.qty > 0) ? `
        <div class="card-inline-counter">
            <button class="inline-btn" type="button" onclick="updateInCardQty('${prod.id}', -1)">-</button>
            <span class="inline-val">${cartItem.qty}</span>
            <button class="inline-btn" type="button" onclick="updateInCardQty('${prod.id}', 1)">+</button>
        </div>
    ` : `
        <button class="btn-card-add" type="button" onclick="updateInCardQty('${prod.id}', 1)">
            <i class="fa-solid fa-bag-shopping"></i> Add to Cart
        </button>
    `;

    card.innerHTML = `
        <div>
            <div class="shop-prod-img-box">
                <!-- Floating Wishlist Heart -->
                <button class="card-wishlist-toggle ${isWishlisted ? 'active' : ''}" 
                        onclick="toggleWishlist('${prod.id}', event)" 
                        title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
                    <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>

                <img src="${prod.image}" alt="${prod.name}" onclick="openFullProductPage('${prod.id}')">
                <span class="shop-prod-tag">${prod.category}</span>
                ${hasDiscount ? `<span class="discount-badge-pill">-${prod.discountPercent}% OFF</span>` : ''}
            </div>
            <div class="shop-prod-info">
                <h3 class="shop-prod-title" onclick="openFullProductPage('${prod.id}')">${prod.name}</h3>
                <div class="shop-price-block">
                    ${hasDiscount ? `<span class="mrp-strikethrough">₹ ${Number(prod.originalPrice).toLocaleString('en-IN')}</span>` : ''}
                    <span class="discounted-final-price">₹ ${finalPrice.toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>
        <div class="shop-card-actions">
            <button class="btn-card-view" type="button" onclick="openFullProductPage('${prod.id}')">Details</button>
            <div class="card-action-slot">
                ${actionHtml}
            </div>
        </div>
    `;
    return card;
}

// 4. Render Catalog Grid (கேட்டகிரி பொருந்தக்கூடிய தன்மையுடன்)
window.renderProducts = function(filterCategory = 'all') {
    const catalog = document.getElementById('productsCatalog');
    if (!catalog) return;
    catalog.innerHTML = '';

    const targetCat = (filterCategory || 'all').toLowerCase().trim();

    // 'face' என்று கிளிக் செய்தால் 'Face Products'-ம், 'all' என்றால் அனைத்தும் வரும்
    const filtered = (targetCat === 'all')
        ? products
        : products.filter(p => {
            const pCat = (p.category || '').toLowerCase().trim();
            return pCat.includes(targetCat) || targetCat.includes(pCat);
        });

    if (currentCategoryHeading) {
        currentCategoryHeading.textContent = (targetCat === 'all')
            ? 'All Luxury Collections'
            : `${targetCat.toUpperCase()} Collection`;
    }

    if (productCounterText) {
        productCounterText.textContent = `Showing ${filtered.length} pieces`;
    }

    if (filtered.length === 0) {
        catalog.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #94a3b8; font-size: 0.9rem;">இந்தத் தொகுப்பில் தயாரிப்புகள் எதுவும் இல்லை.</div>`;
        return;
    }

    filtered.forEach(prod => {
        catalog.appendChild(createProductCardElement(prod));
    });
};


// 5. In-Card Quantity Operations (ID Type-Mismatch Fix)
window.updateInCardQty = function(productId, delta) {
    if (!products || products.length === 0) return;

    // String & Number இரண்டையும் ஏற்கும் வகையிலான தேடல்
    const prod = products.find(p => String(p.id) === String(productId));
    if (!prod) return;

    const finalPrice = getDiscountedPrice(prod);
    let existing = cart.find(i => String(i.id) === String(productId));

    if (existing) {
        existing.qty += delta;
        if (existing.qty <= 0) {
            cart = cart.filter(i => String(i.id) !== String(productId));
        }
    } else if (delta > 0) {
        cart.push({
            id: prod.id,
            name: prod.name,
            category: prod.category,
            price: finalPrice,
            originalPrice: prod.originalPrice,
            image: prod.image,
            qty: 1
        });
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

    const strId = String(productId);
    if (wishlist.some(id => String(id) === strId)) {
        wishlist = wishlist.filter(id => String(id) !== strId);
    } else {
        wishlist.push(productId);
    }

    localStorage.setItem('blueskin_wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
    renderProducts(getActiveCategory());

    if (activeViewingProductId && String(activeViewingProductId) === strId) {
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
            const prod = products.find(p => String(p.id) === String(id));
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
                    <button class="btn-move-to-bag" onclick="moveWishlistToCart('${prod.id}')">
                        <i class="fa-solid fa-bag-shopping"></i> Move to Bag
                    </button>
                </div>
                <button class="btn-remove-wishlist" onclick="toggleWishlist('${prod.id}')" title="Remove">
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

// 7. Full Page View Logic (Safe Rendering & Clean Mobile Support)
window.openFullProductPage = function(productId) {
    const prod = products.find(p => String(p.id) === String(productId)) || products[0];
    if (!prod) return;

    activeViewingProductId = prod.id;

    if (shopMainCatalogView) shopMainCatalogView.style.display = 'none';
    if (productFullPageView) productFullPageView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const finalPrice = getDiscountedPrice(prod);
    const origPrice = Number(prod.originalPrice || 0);
    const savings = Math.max(0, origPrice - finalPrice);
    const catName = (prod.category || 'Luxury').toUpperCase();

    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setTxt('fullBreadCategory', catName);
    setTxt('fullBreadTitle', prod.name);
    setTxt('detailCategoryBadge', `${catName} COLLECTION`);
    setTxt('detailTitle', prod.name);
    setTxt('detailSubTitle', prod.subTitle || '');
    setTxt('detailOriginalPrice', `₹ ${origPrice.toLocaleString('en-IN')}`);
    setTxt('detailDiscountPercent', `${prod.discountPercent || 0}% OFF`);
    setTxt('detailPrice', `₹ ${finalPrice.toLocaleString('en-IN')}`);
    setTxt('detailYouSave', `You Save: ₹ ${savings.toLocaleString('en-IN')}`);
    setTxt('detailDescText', prod.desc || 'Handcrafted luxury formulation.');

    const mainImg = document.getElementById('detailMainImg');
    if (mainImg) mainImg.src = prod.image;

    const thumbRow = document.getElementById('thumbGalleryRow');
    if (thumbRow) {
        thumbRow.innerHTML = '';
        const gallery = [prod.image, ...(Array.isArray(prod.images) && prod.images.length > 1 ? prod.images.slice(1, 4) : sampleGalleryImages.slice(1, 4))];
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
    if (typeof toggleAccordion === 'function') {
        toggleAccordion('accItemDesc');
    }
    renderFullPageRecommended(prod.id);
};

function syncFullPageWishlistButton(productId) {
    const btn = document.getElementById('fullWishlistActionBtn');
    if (!btn) return;
    const isWishlisted = wishlist.some(id => String(id) === String(productId));

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
        const recs = products.filter(p => String(p.id) !== String(currentProdId)).slice(0, 4);
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
    const cartItem = cart.find(i => String(i.id) === String(productId));

    if (cartItem && cartItem.qty > 0) {
        slot.innerHTML = `
            <div class="card-inline-counter" style="min-width: 140px; padding: 0.5rem 1rem;">
                <button class="inline-btn" style="font-size: 1.2rem;" onclick="updateInCardQty('${productId}', -1)">-</button>
                <span class="inline-val" style="font-size: 1rem;">${cartItem.qty} in Bag</span>
                <button class="inline-btn" style="font-size: 1.2rem;" onclick="updateInCardQty('${productId}', 1)">+</button>
            </div>
        `;
    } else {
        slot.innerHTML = `
            <button class="btn-card-add" style="padding: 0.75rem 2rem; font-size: 0.85rem;" onclick="updateInCardQty('${productId}', 1)">
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
// === 2. WHATSAPP ORDER, INSTANT CART CLEAR & REDIRECT TO HOME           ===
// ==========================================================================
window.submitWhatsAppOrder = function() {
    const nameInput = document.getElementById('custName');
    const phoneInput = document.getElementById('custPhone');
    const addressInput = document.getElementById('custAddress');

    if (!nameInput || !phoneInput || !addressInput) {
        alert("Form inputs not found. Please refresh the page.");
        return;
    }

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();

    if (!name) {
        alert("Please enter your name.");
        nameInput.focus();
        return;
    }

    if (!phone || phone.replace(/[^0-9]/g, '').length < 10) {
        alert("Please enter a valid 10-digit phone number.");
        phoneInput.focus();
        return;
    }

    if (!address) {
        alert("Please enter your complete delivery address.");
        addressInput.focus();
        return;
    }

    let activeCart = [];
    try {
        activeCart = (typeof cart !== 'undefined' && cart.length > 0) 
            ? cart 
            : JSON.parse(localStorage.getItem('blueskin_cart')) || [];
    } catch(e) {
        activeCart = [];
    }

    if (activeCart.length === 0) {
        alert("Your shopping bag is currently empty.");
        return;
    }

    let orderItemsText = "";
    let grandTotal = 0;

    activeCart.forEach((item, index) => {
        const itemPrice = Number(item.price || item.finalPrice || item.originalPrice || 0);
        const itemQty = Number(item.qty || 1);
        const itemTotal = itemPrice * itemQty;
        grandTotal += itemTotal;
        orderItemsText += `${index + 1}️⃣ *${item.name || item.title}*\n   • Qty   : ${itemQty}\n   • Price : ₹ ${itemTotal.toLocaleString('en-IN')}\n\n`;
    });

    const subTotal = grandTotal;
    let promoLine = "";
    let finalPayable = subTotal;

    if (typeof appliedPromoDiscount !== 'undefined' && appliedPromoDiscount > 0 && typeof appliedPromoCode !== 'undefined' && appliedPromoCode) {
        finalPayable = Math.max(0, subTotal - appliedPromoDiscount);
        promoLine = `- *Promo Code   :* ${appliedPromoCode} (-₹ ${appliedPromoDiscount.toLocaleString('en-IN')})\n`;
    }

    const orderId = `BS-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const message = 
`👑 *BLUE SKIN LUXURY BOUTIQUE*
*Official Order Invoice*
────────────────────────
🧾 *Order Ref   :* #${orderId}
📅 *Date & Time :* ${dateStr}, ${timeStr}
────────────────────────

👤 *CLIENT INFORMATION*
- *Name     :* ${name}
- *Phone    :* +91 ${phone}
- *Address  :* ${address}

🛍️ *ORDERED CREATIONS*
────────────────────────
${orderItemsText.trim()}
────────────────────────

💳 *PAYMENT SUMMARY*
- *Bag Value   :* ₹ ${subTotal.toLocaleString('en-IN')}
${promoLine}- *Shipping    :* Complimentary Insured Delivery (FREE)
- *Net Payable :* *₹ ${finalPayable.toLocaleString('en-IN')}*
────────────────────────

✨ *Assurance:* 100% Authentic Handcrafted Formulation
🚚 *Dispatch:* Priority Velvet Dispatch

_Please confirm my order and share payment instructions. Thank you!_`;

    const targetNumber = "919658399991";
    const whatsappURL = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;

    // 1. சுபாபேஸ் கிளவுடில் ஆர்டரைச் சேமித்தல்
    const client = window.dbClient;
    if (client) {
        client.from('orders').insert([
            {
                id: orderId,
                customer_name: name,
                customer_phone: phone,
                customer_address: address,
                items_summary: activeCart.map(i => `${i.name || i.title} (x${i.qty || 1})`).join(", "),
                total_amount: finalPayable,
                is_paid: false,
                order_status: 'Pending Verification'
            }
        ]).then(() => {
            console.log("Order cloud sync complete");
        }).catch(err => {
            console.error("Order sync error:", err);
        });

        // கூப்பன் கவுன்ட்டரை கிளவுடில் கூட்டுதல்
        if (typeof appliedPromoCode !== 'undefined' && appliedPromoCode) {
            try {
                let coupons = JSON.parse(localStorage.getItem("BLUESKIN_MARKETING_COUPONS_DATA")) || [];
                const targetCoupon = coupons.find(c => (c.code || '').toUpperCase() === appliedPromoCode.toUpperCase());
                if (targetCoupon) {
                    targetCoupon.quotaUsed = (Number(targetCoupon.quotaUsed) || 0) + 1;
                    localStorage.setItem("BLUESKIN_MARKETING_COUPONS_DATA", JSON.stringify(coupons));
                    client.from('site_content').upsert({
                        key: 'marketing_coupons',
                        value: JSON.stringify(coupons),
                        updated_at: new Date()
                    }).then(() => {}).catch(() => {});
                }
            } catch(e) {}
        }
    }

    // 2. கார்ட் முழுமையாக காலி செய்யப்படுகிறது (Clear Cart)
    cart = [];
    localStorage.removeItem('blueskin_cart');
    localStorage.removeItem('blueskin_checkout_draft');
    localStorage.setItem('blueskin_cart_screen', 'closed');
    appliedPromoCode = "";
    appliedPromoDiscount = 0;

    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) cartCountEl.textContent = '0';
    const drawerItemCountEl = document.getElementById('drawerItemCount');
    if (drawerItemCountEl) drawerItemCountEl.textContent = '(0 items)';

    // 3. புதிய டேபில் வாட்ஸ்அப் திறந்து, தற்போதைய பக்கம் நேரடியாக ஹோம் பேஜிற்குத் திரும்புகிறது
    window.open(whatsappURL, '_blank');
    window.location.href = 'index.html';
};

// ==========================================================================
// === CATEGORY CLICK & CATALOG INITIALIZATION (DESKTOP + MOBILE)         ===
// ==========================================================================
function bindCategoryAndCatalogEvents() {
    const track = document.getElementById('catTrack');
    if (track) {
        track.addEventListener('click', function(e) {
            const item = e.target.closest('.cat-item');
            if (!item) return;
            const category = item.getAttribute('data-category') || 'all';
            if (typeof selectCategory === 'function') {
                selectCategory(category, item);
            }
        });
    }

    // Direct event listener for all category pills
    document.querySelectorAll('.cat-item').forEach(el => {
        el.onclick = function() {
            const category = this.getAttribute('data-category') || 'all';
            if (typeof selectCategory === 'function') {
                selectCategory(category, this);
            }
        };
    });

    // Initial render
    if (typeof loadAdminMasterProducts === 'function') {
        loadAdminMasterProducts();
    }
    if (typeof fetchSupabaseProducts === 'function') {
        fetchSupabaseProducts();
    }
}

document.addEventListener('DOMContentLoaded', bindCategoryAndCatalogEvents);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bindCategoryAndCatalogEvents();
}

// ==========================================================================
// === தயாரிப்புகளை உடனடியாகத் திரையில் ஏற்றும் உத்தரவாதம் (FAILSAFE RENDER) ===
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. உள்ளூர் அல்லது டீஃபால்ட் தயாரிப்புகளை உடனடியாக ரெண்டர் செய்தல் (0ms Delay)
    if (typeof renderProducts === 'function' && typeof products !== 'undefined' && products.length > 0) {
        renderProducts('all');
    }

    // 2. சுபாபேஸ் கிளவுட் தயாரிப்புகளை எடுத்து மீண்டும் ரெண்டர் செய்தல்
    if (typeof fetchSupabaseProducts === 'function') {
        fetchSupabaseProducts();
    }
});

// ==========================================================================
// === 7. வாட்ஸ்அப் ஆர்டர் & இன்வாய்ஸ் பதிவு ஃபங்ஷன்                       ===
// ==========================================================================
window.submitWhatsAppOrder = function() {
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

    if (!name || !phone || phone.length < 10 || !address) {
        alert("தயவுசெய்து உங்கள் பெயர், 10 இலக்க போன் எண், முகவரியைச் சரியாக உள்ளிடவும்!");
        return;
    }

    let activeCart = [];
    try {
        activeCart = (typeof cart !== 'undefined' && cart.length > 0) 
            ? cart 
            : JSON.parse(localStorage.getItem('blueskin_cart')) || [];
    } catch(e) {
        activeCart = [];
    }

    if (activeCart.length === 0) {
        alert("உங்கள் கார்ட் காலியாக உள்ளது!");
        return;
    }

    let grandTotal = 0;
    activeCart.forEach(item => {
        const itemPrice = Number(item.price || item.finalPrice || item.originalPrice || 0);
        const itemQty = Number(item.qty || 1);
        grandTotal += (itemPrice * itemQty);
    });

    const finalPayable = (typeof appliedPromoDiscount !== 'undefined' && appliedPromoDiscount > 0) 
        ? Math.max(0, grandTotal - appliedPromoDiscount) 
        : grandTotal;

    const orderId = `BS-${Math.floor(100000 + Math.random() * 900000)}`;

    // ----------------------------------------------------------------------
    // 5. SUPABASE CLOUD DATABASE-ல் ஆர்டரைப் பதிவு செய்தல் (Zero SyntaxError)
    // ----------------------------------------------------------------------
    const client = window.dbClient;
    if (client) {
        client.from('orders').insert([
            {
                id: orderId,
                customer_name: name,
                customer_phone: phone,
                customer_address: address,
                items_summary: activeCart.map(i => `${i.name || i.title} (x${i.qty || 1})`).join(", "),
                total_amount: finalPayable,
                is_paid: false,
                order_status: 'Pending Verification'
            }
        ]).then(() => {
            console.log("✅ ஆர்டர் Supabase-ல் வெற்றிகரமாக பதிவானது! ID:", orderId);
        }).catch(err => {
            console.error("Supabase Order DB Error:", err);
        });
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
    const targetNumber = "919658399991";
    const whatsappMsg = `👑 *BLUE SKIN LUXURY BOUTIQUE*\n🧾 Order Ref: #${orderId}\nName: ${name}\nTotal: ₹${finalPayable.toLocaleString('en-IN')}`;
    const whatsappURL = `https://wa.me/${targetNumber}?text=${encodeURIComponent(whatsappMsg)}`;
    window.location.href = whatsappURL;
};
// =====================================================
// FRONT PAGE AUTO 3-2-1 FLASH POP-UP TRIGGER
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
    let config = null;

    // 1. உள்ளூர் சேமிப்பகம் அல்லது Supabase-லிருந்து அமைப்புகளை எடுத்தல்
    try {
        const localCfg = localStorage.getItem("BLUESKIN_FLASH_MODAL_CONFIG");
        if (localCfg) config = JSON.parse(localCfg);
    } catch(e) {}

    // கிளவுட் கிளையண்ட் இருந்தால் நேரடியாக எடுத்தல்
    if (window.dbClient) {
        try {
            const { data } = await window.dbClient.from('site_content').select('value').eq('key', 'flash_modal_config').single();
            if (data && data.value) {
                config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
            }
        } catch(err) {}
    }

    if (!config || config.state !== 'ACTIVE') return;

    // 2. குறிப்பிட்ட விநாடிகளுக்குப் பின் பாப்-அப் திறத்தல்
    const delayTime = parseInt(config.delay) || 2000;

    setTimeout(() => {
        // ஏற்கெனவே மூடப்பட்டிருந்தால் மீண்டும் காட்டாதிருக்க (Session Check)
        if (sessionStorage.getItem('blueskin_flash_seen')) return;

        const modal = document.getElementById('frontFlashModal');
        const ring = document.getElementById('frontCountdownRing');
        const card = document.getElementById('frontFlashCard');
        const num = document.getElementById('frontCountdownNum');

        if (!modal) return;

        // தகவல்களை நிரப்புதல்
        document.getElementById('frontFlashEyebrow').textContent = config.eyebrow || 'EXCLUSIVE PRIVILEGE';
        document.getElementById('frontFlashHeadline').textContent = config.headline || 'LUXURY STORE OFFER';
        document.getElementById('frontFlashDesc').textContent = config.desc || '';
        document.getElementById('frontFlashCode').textContent = config.code || 'BLUESKIN10';
        document.getElementById('frontFlashBtnLink').textContent = config.btnText || 'Shop Collection';
        document.getElementById('frontFlashBtnLink').href = config.targetUrl || 'shop.html';

        modal.style.display = 'flex';
        ring.style.display = 'flex';
        card.style.display = 'none';

        let count = 3;
        num.textContent = count;

        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                num.textContent = count;
            } else {
                clearInterval(timer);
                ring.style.display = 'none';
                card.style.display = 'block';
            }
        }, 850);

    }, delayTime);
});

window.closeFrontFlashModal = function() {
    const modal = document.getElementById('frontFlashModal');
    if (modal) modal.style.display = 'none';
    sessionStorage.setItem('blueskin_flash_seen', 'true');
};

window.copyFrontFlashCode = function() {
    const code = document.getElementById('frontFlashCode')?.textContent || '';
    if (code) {
        navigator.clipboard.writeText(code).then(() => {
            alert(`🎉 கூப்பன் கோடு '${code}' காப்பி செய்யப்பட்டது! செக்-அவுட்டில் பயன்படுத்தலாம்.`);
        });
    }
};

// ==========================================================================
// === 1. PROMO CODE ENGINE (100% ENGLISH LUXURY NOTICES)                 ===
// ==========================================================================
let appliedPromoCode = "";
let appliedPromoDiscount = 0;

window.applyCheckoutPromoCode = async function() {
    const input = document.getElementById('checkoutCouponInput');
    const notice = document.getElementById('couponAppliedNotice');
    const discRow = document.getElementById('couponDiscountRow');
    const discValEl = document.getElementById('couponDiscountVal');

    if (!input || !notice) return;

    const code = input.value.trim().toUpperCase();
    if (!code) {
        notice.style.display = "block";
        notice.style.color = "#ef4444";
        notice.textContent = "Please enter a promo code.";
        return;
    }

    let coupons = [];
    try {
        const local = localStorage.getItem("BLUESKIN_MARKETING_COUPONS_DATA");
        if (local) coupons = JSON.parse(local);
    } catch(e) {}

    if (window.dbClient) {
        try {
            const { data } = await window.dbClient.from('site_content').select('value').eq('key', 'marketing_coupons').single();
            if (data && data.value) {
                coupons = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
            }
        } catch(err) {}
    }

    const found = coupons.find(c => (c.code || '').toUpperCase() === code && c.status === "ACTIVE");

    if (!found) {
        appliedPromoCode = "";
        appliedPromoDiscount = 0;
        if (discRow) discRow.style.display = "none";
        notice.style.display = "block";
        notice.style.color = "#ef4444";
        notice.textContent = "Invalid or expired promo code.";
        recalculateCartTotalWithDiscount();
        return;
    }

    let currentCart = [];
    try {
        currentCart = (typeof cart !== 'undefined' && cart.length > 0) ? cart : JSON.parse(localStorage.getItem('blueskin_cart')) || [];
    } catch(e) { currentCart = []; }

    const bagSubTotal = currentCart.reduce((sum, item) => {
        const p = Number(item.price || item.finalPrice || item.originalPrice || 0);
        const q = Number(item.qty || 1);
        return sum + (p * q);
    }, 0);

    if (bagSubTotal === 0) {
        notice.style.display = "block";
        notice.style.color = "#ef4444";
        notice.textContent = "Please add items to your bag before applying promo code.";
        return;
    }

    if (found.minSpend && bagSubTotal < Number(found.minSpend)) {
        appliedPromoCode = "";
        appliedPromoDiscount = 0;
        if (discRow) discRow.style.display = "none";
        notice.style.display = "block";
        notice.style.color = "#f59e0b";
        notice.textContent = `Minimum order spend of ₹${Number(found.minSpend).toLocaleString('en-IN')} required for this code.`;
        recalculateCartTotalWithDiscount();
        return;
    }

    let discount = 0;
    if (found.type === "PERCENTAGE") {
        discount = Math.round((bagSubTotal * Number(found.value || 0)) / 100);
        if (found.maxCap && Number(found.maxCap) > 0 && discount > Number(found.maxCap)) {
            discount = Number(found.maxCap);
        }
    } else if (found.type === "FLAT") {
        discount = Number(found.value || 0);
    }

    appliedPromoCode = code;
    appliedPromoDiscount = discount;

    if (discRow && discValEl) {
        discRow.style.display = "flex";
        discValEl.textContent = `-₹${discount.toLocaleString('en-IN')}`;
    }

    notice.style.display = "block";
    notice.style.color = "#22c55e";
    notice.textContent = `Promo code '${code}' applied successfully! Savings: ₹${discount.toLocaleString('en-IN')}`;

    recalculateCartTotalWithDiscount();
};

function recalculateCartTotalWithDiscount() {
    let currentCart = [];
    try {
        currentCart = (typeof cart !== 'undefined' && cart.length > 0) ? cart : JSON.parse(localStorage.getItem('blueskin_cart')) || [];
    } catch(e) { currentCart = []; }

    const bagSubTotal = currentCart.reduce((sum, item) => {
        const p = Number(item.price || item.finalPrice || item.originalPrice || 0);
        const q = Number(item.qty || 1);
        return sum + (p * q);
    }, 0);

    const payable = Math.max(0, bagSubTotal - (appliedPromoDiscount || 0));
    const totalEl = document.getElementById('cartTotalPrice');
    if (totalEl) totalEl.textContent = `₹${payable.toLocaleString('en-IN')}`;
}

// ==========================================================================
// === 2. வாட்ஸ்அப் ஆர்டர் & கிளவுட் பதிவு (ZERO SYNTAX ERROR)              ===
// ==========================================================================
window.submitWhatsAppOrder = function() {
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

    if (!name || !phone || phone.length < 10 || !address) {
        alert("தயவுசெய்து உங்கள் பெயர், 10 இலக்க போன் எண், முகவரியைச் சரியாக உள்ளிடவும்!");
        return;
    }

    let activeCart = [];
    try {
        activeCart = (typeof cart !== 'undefined' && cart.length > 0) ? cart : JSON.parse(localStorage.getItem('blueskin_cart')) || [];
    } catch(e) { activeCart = []; }

    if (activeCart.length === 0) {
        alert("உங்கள் கார்ட் காலியாக உள்ளது!");
        return;
    }

    let orderItemsText = "";
    let grandTotal = 0;

    activeCart.forEach((item, index) => {
        const itemPrice = Number(item.price || item.finalPrice || item.originalPrice || 0);
        const itemQty = Number(item.qty || 1);
        const itemTotal = itemPrice * itemQty;
        grandTotal += itemTotal;
        orderItemsText += `${index + 1}️⃣ *${item.name || item.title}*\n   • *Qty   :* ${itemQty}\n   • *Price :* ₹ ${itemTotal.toLocaleString('en-IN')}\n\n`;
    });

    const subTotal = grandTotal;
    let promoLine = "";
    let finalPayable = subTotal;

    if (appliedPromoDiscount > 0 && appliedPromoCode) {
        finalPayable = Math.max(0, subTotal - appliedPromoDiscount);
        promoLine = `- *Promo Code   :* ${appliedPromoCode} (-₹ ${appliedPromoDiscount.toLocaleString('en-IN')})\n`;
    }

    const orderId = `BS-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const message = 
`👑 *BLUE SKIN LUXURY BOUTIQUE*
*Official Order Invoice*
────────────────────────
🧾 *Order Ref   :* #${orderId}
📅 *Date & Time :* ${dateStr}, ${timeStr}
────────────────────────

👤 *CLIENT INFORMATION*
- *Name     :* ${name}
- *Phone    :* +91 ${phone}
- *Address  :* ${address}

🛍️ *ORDERED CREATIONS*
────────────────────────
${orderItemsText.trim()}
────────────────────────

💳 *PAYMENT SUMMARY*
- *Bag Value   :* ₹ ${subTotal.toLocaleString('en-IN')}
${promoLine}- *Shipping    :* Complimentary Insured Delivery (FREE)
- *Net Payable :* *₹ ${finalPayable.toLocaleString('en-IN')}*
────────────────────────

✨ *Assurance:* 100% Authentic Handcrafted Formulation
🚚 *Dispatch:* Priority Velvet Dispatch

_தயவுசெய்து இந்த ஆர்டரை உறுதிசெய்து கட்டண விவரங்களை அனுப்பவும். நன்றி!_`;

    // 1. ஆர்டரை Supabase-ல் பதிவு செய்தல் (.then() முறை - எரர் வராது)
    if (window.dbClient) {
        window.dbClient.from('orders').insert([{
            id: orderId,
            customer_name: name,
            customer_phone: phone,
            customer_address: address,
            items_summary: orderItemsText.trim(),
            total_amount: finalPayable,
            is_paid: false,
            order_status: 'Pending Verification'
        }]).then(() => {
            console.log("Order cloud sync success");
        }).catch(err => {
            console.error("Order sync error:", err);
        });

        // கூப்பன் கவுன்ட்டரை +1 கூட்டுதல்
        if (appliedPromoCode) {
            let coupons = JSON.parse(localStorage.getItem("BLUESKIN_MARKETING_COUPONS_DATA")) || [];
            const targetCoupon = coupons.find(c => (c.code || '').toUpperCase() === appliedPromoCode.toUpperCase());
            if (targetCoupon) {
                targetCoupon.quotaUsed = (Number(targetCoupon.quotaUsed) || 0) + 1;
                localStorage.setItem("BLUESKIN_MARKETING_COUPONS_DATA", JSON.stringify(coupons));
                window.dbClient.from('site_content').upsert({
                    key: 'marketing_coupons',
                    value: JSON.stringify(coupons),
                    updated_at: new Date()
                }).then(() => {}).catch(() => {});
            }
        }
    }

    // 2. வாட்ஸ்அப் திறத்தல்
    const targetNumber = "919658399991";
    const whatsappURL = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
};
