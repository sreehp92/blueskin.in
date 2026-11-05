// ==========================================================================
// === BLUE SKIN: 100% ADMIN & SUPABASE CLOUD LIVE SYNC (MASTER ENGINE)   ===
// ==========================================================================

let products = [];
let cart = JSON.parse(localStorage.getItem('blueskin_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('blueskin_wishlist')) || [];
let activeViewingProductId = null;
let appliedPromoCode = "";
let appliedPromoDiscount = 0;
let isSyncingProducts = false;

const sampleGalleryImages = [
    "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1583241800698-e8ab01830a07?q=80&w=600&auto=format&fit=crop"
];

// 1. அட்மின் & சுபாபேஸ் ஃபீல்டுகளைச் சமன் செய்யும் செயல்முறை (Data Normalizer)
function normalizeProduct(raw) {
    const origPrice = Number(raw.original_price || raw.originalPrice || raw.mrp || raw.price || 0);
    const discPercent = Number(raw.discount_percent || raw.discountPercent || raw.discount || 0);
    
    let img = '';
    if (raw.images && Array.isArray(raw.images) && raw.images.length > 0 && raw.images[0]) {
        img = raw.images[0];
    } else if (raw.image) {
        img = raw.image;
    } else if (raw.imgUrl) {
        img = raw.imgUrl;
    }

    return {
        id: String(raw.id),
        name: raw.name || raw.title || 'Artisanal Creation',
        category: raw.category || 'Luxury',
        subTitle: raw.sub_title || raw.subTitle || raw.subtitle || '',
        weight: raw.weight || '',
        originalPrice: origPrice,
        discountPercent: discPercent,
        image: img,
        desc: raw.description || raw.desc || 'Handcrafted luxury formulation.',
        visibility: raw.visibility || 'LIVE'
    };
}

// 2. தள்ளுபடி விலை கணக்கீடு (Discount Price)
function getDiscountedPrice(item) {
    if (!item) return 0;
    const orig = Number(item.originalPrice || item.mrp || item.price || 0);
    const disc = Number(item.discountPercent || item.discount || 0);
    if (disc <= 0) return orig;
    return Math.round(orig - ((orig * disc) / 100));
}

// 3. கார்ட்டில் உள்ள பொருளின் சரியான விலையைத் தானாகச் சரிசெய்தல் (Self-Healing)
function getItemValidPrice(item) {
    if (!item) return 0;
    let p = Number(item.price || item.finalPrice || item.specialPrice || 0);
    if (p > 0) return p;

    if (Array.isArray(products) && products.length > 0) {
        const master = products.find(prod => String(prod.id) === String(item.id));
        if (master) {
            const masterOrig = Number(master.originalPrice || 0);
            const masterDisc = Number(master.discountPercent || 0);
            if (masterOrig > 0) {
                return (masterDisc > 0) ? Math.round(masterOrig - ((masterOrig * masterDisc) / 100)) : masterOrig;
            }
        }
    }

    let orig = Number(item.originalPrice || item.mrp || 0);
    let disc = Number(item.discountPercent || item.discount || 0);
    return (orig > 0 && disc > 0) ? Math.round(orig - ((orig * disc) / 100)) : orig;
}

// 4. தயாரிப்பு அட்டை டெம்ப்ளேட் (Product Card)
function createProductCardElement(prod) {
    let currentCart = [];
    try {
        currentCart = (typeof cart !== 'undefined' && cart.length > 0) 
            ? cart 
            : JSON.parse(localStorage.getItem('blueskin_cart')) || [];
    } catch(e) { currentCart = []; }

    const strId = String(prod.id);
    const cartItem = currentCart.find(i => String(i.id) === strId);
    const isWishlisted = (typeof wishlist !== 'undefined') && wishlist.some(id => String(id) === strId);

    const card = document.createElement('div');
    card.className = 'shop-prod-card';

    const finalPrice = getDiscountedPrice(prod);
    const hasDiscount = Number(prod.discountPercent) > 0;

    const actionHtml = (cartItem && cartItem.qty > 0) ? `
        <div class="card-inline-counter">
            <button type="button" class="inline-btn" onclick="updateInCardQty('${prod.id}', -1)">-</button>
            <span class="inline-val">${cartItem.qty}</span>
            <button type="button" class="inline-btn" onclick="updateInCardQty('${prod.id}', 1)">+</button>
        </div>
    ` : `
        <button type="button" class="btn-card-add" onclick="updateInCardQty('${prod.id}', 1)">
            <i class="fa-solid fa-bag-shopping"></i> Add to Cart
        </button>
    `;

    card.innerHTML = `
        <div>
            <div class="shop-prod-img-box">
                <button type="button" class="card-wishlist-toggle ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist('${prod.id}', event)" title="Wishlist">
                    <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
                <img src="${prod.image}" alt="${prod.name}" onclick="openFullProductPage('${prod.id}')" loading="lazy">
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
            <button type="button" class="btn-card-view" onclick="openFullProductPage('${prod.id}')">Details</button>
            <div class="card-action-slot" id="slot-main-${prod.id}">
                ${actionHtml}
            </div>
        </div>
    `;
    return card;
}

// 5. கேட்டகிரி வாரியாகத் தயாரிப்புகளைத் திரையிடல் (Catalog Render Engine)
window.renderProducts = function(filterCategory = 'all') {
    const catalog = document.getElementById('productsCatalog');
    if (!catalog) return;

    catalog.innerHTML = '';
    const targetCat = (filterCategory || 'all').toLowerCase().trim();

    const filtered = (targetCat === 'all')
        ? products
        : products.filter(p => {
            const pCat = (p.category || '').toLowerCase().trim();
            if (targetCat === 'face') return pCat.includes('face');
            if (targetCat === 'eye') return pCat.includes('eye');
            if (targetCat === 'lip') return pCat.includes('lip');
            if (targetCat === 'skin') return pCat.includes('skin');
            if (targetCat === 'tools') return pCat.includes('tool');
            return pCat.includes(targetCat) || targetCat.includes(pCat);
        });

    const headingEl = document.getElementById('currentCategoryHeading');
    const counterEl = document.getElementById('productCounterText');

    if (headingEl) {
        headingEl.textContent = (targetCat === 'all') ? 'All Luxury Collections' : `${targetCat.toUpperCase()} Collection`;
    }
    if (counterEl) {
        counterEl.textContent = `Showing ${filtered.length} bespoke creations`;
    }

    if (filtered.length === 0) {
        catalog.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; color: #94a3b8;">
                <i class="fa-solid fa-box-open" style="font-size: 2.2rem; color: rgba(245,196,67,0.4); margin-bottom: 0.8rem; display: block;"></i>
                <p style="color: #ffffff; font-weight: 600; margin-bottom: 0.3rem;">No products available in this category</p>
                <span style="font-size: 0.8rem;">Products added from the Admin Panel will appear here.</span>
            </div>
        `;
        return;
    }

    filtered.forEach(prod => {
        catalog.appendChild(createProductCardElement(prod));
    });
};

// 6. கேட்டகிரி தேர்வு செயல்முறை (Select Category Pill)
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

function getActiveCategory() {
    const active = document.querySelector('.cat-item.active');
    return active ? (active.getAttribute('data-category') || 'all') : 'all';
}

// 7. SINGLE MASTER SYNC: அட்மின் லோக்கல் ஸ்டோரேஜ் & சுபாபேஸ் கிளவுட் தயாரிப்புகள் சின்க்
async function syncAdminProducts() {
    if (isSyncingProducts) return;
    isSyncingProducts = true;

    // A. அட்மின் லோக்கல் ஸ்டோரேஜில் உள்ள தயாரிப்புகளை உடனடியாக எடுத்தல் (0ms Load)
    try {
        const local = localStorage.getItem("BLUESKIN_PRODUCT_MASTER_DATA");
        if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
                products = parsed.map(normalizeProduct);
                renderProducts(getActiveCategory());
            }
        }
    } catch(e) {
        console.warn("Local storage product read error:", e);
    }

    // B. சுபாபேஸ் கிளவுடிலிருந்து நேரலைத் தயாரிப்புகளை எடுத்தல்
    try {
        const client = window.dbClient;
        if (client) {
            const { data, error } = await client
                .from('products')
                .select('*')
                .order('id', { ascending: true });

            if (!error && data && data.length > 0) {
                products = data.map(normalizeProduct);
                renderProducts(getActiveCategory());
                if (typeof updateCartUI === 'function') updateCartUI();
            }
        }
    } catch (err) {
        console.error("Supabase Sync Error:", err);
    } finally {
        isSyncingProducts = false;
    }
}

// 8. பிராண்ட் லோகோ படம் சின்க் (Admin CMS Logo Image -> Shop Header)
function syncShopBrandLogo() {
    const logoImg = document.getElementById('shopBrandLogoImg') || document.querySelector('.nav-left-brand img') || document.querySelector('.brand-logo-img');
    const fallbackEmblem = document.getElementById('shopBrandLogoFallback') || document.querySelector('.nav-left-brand .brand-emblem');
    const brandContainer = document.querySelector('.nav-left-brand .logo');

    let logoUrl = "";

    try {
        const localCMS = localStorage.getItem('BLUESKIN_PORTFOLIO_CMS_DATA');
        if (localCMS) {
            const parsed = JSON.parse(localCMS);
            if (parsed && parsed.brandLogoImg) {
                logoUrl = parsed.brandLogoImg.trim();
            }
        }
    } catch(e) {}

    if (logoUrl) {
        if (logoImg) {
            logoImg.src = logoUrl;
            logoImg.style.display = 'inline-block';
        }
        if (fallbackEmblem) fallbackEmblem.style.display = 'none';
        if (brandContainer) brandContainer.classList.add('has-logo-img');
    }

    if (window.dbClient) {
        window.dbClient
            .from('site_content')
            .select('value')
            .eq('key', 'portfolio_cms')
            .single()
            .then(({ data, error }) => {
                if (!error && data && data.value) {
                    const cms = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                    if (cms && cms.brandLogoImg && cms.brandLogoImg.trim() !== '') {
                        if (logoImg) {
                            logoImg.src = cms.brandLogoImg.trim();
                            logoImg.style.display = 'inline-block';
                        }
                        if (fallbackEmblem) fallbackEmblem.style.display = 'none';
                        if (brandContainer) brandContainer.classList.add('has-logo-img');
                    }
                }
            })
            .catch(() => {});
    }
}

// 9. கார்ட்டில் தயாரிப்பு எண்ணிக்கை மாற்றம் (In-Card Quantity Operations)
window.updateInCardQty = function(productId, delta) {
    if (!products || products.length === 0) return;

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

// 10. விருப்பப் பட்டியல் மேலாண்மை (Wishlist Engine)
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
    const wishlistCount = document.getElementById('wishlistCount');
    const drawerWishlistCount = document.getElementById('drawerWishlistCount');
    const openWishlistBtn = document.getElementById('openWishlistBtn');
    const headerWishlistIcon = document.getElementById('headerWishlistIcon');
    const wishlistItemsList = document.getElementById('wishlistItemsList');

    if (!wishlistCount) return;
    const count = wishlist.length;
    wishlistCount.textContent = count;
    if (drawerWishlistCount) drawerWishlistCount.textContent = `(${count} items)`;

    if (count > 0) {
        if (openWishlistBtn) openWishlistBtn.classList.add('has-items');
        if (headerWishlistIcon) headerWishlistIcon.className = "fa-solid fa-heart";
    } else {
        if (openWishlistBtn) openWishlistBtn.classList.remove('has-items');
        if (headerWishlistIcon) headerWishlistIcon.className = "fa-regular fa-heart";
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
    const wishlistDrawer = document.getElementById('wishlistDrawer');
    const wishlistOverlay = document.getElementById('wishlistOverlay');
    if (show) {
        if (wishlistDrawer) wishlistDrawer.classList.add('active');
        if (wishlistOverlay) wishlistOverlay.classList.add('active');
    } else {
        if (wishlistDrawer) wishlistDrawer.classList.remove('active');
        if (wishlistOverlay) wishlistOverlay.classList.remove('active');
    }
}

const openWishlistBtn = document.getElementById('openWishlistBtn');
const closeWishlistBtn = document.getElementById('closeWishlistBtn');
const wishlistOverlay = document.getElementById('wishlistOverlay');

if (openWishlistBtn) openWishlistBtn.onclick = function() { toggleWishlistDrawer(true); };
if (closeWishlistBtn) closeWishlistBtn.onclick = function() { toggleWishlistDrawer(false); };
if (wishlistOverlay) wishlistOverlay.onclick = function() { toggleWishlistDrawer(false); };

// 11. முழு தயாரிப்புப் பக்கப் பார்வை (Full Product Page View)
window.openFullProductPage = function(productId) {
    const prod = products.find(p => String(p.id) === String(productId)) || products[0];
    if (!prod) return;

    activeViewingProductId = prod.id;
    const shopMainCatalogView = document.getElementById('shopMainCatalogView');
    const productFullPageView = document.getElementById('productFullPageView');

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
        const gallery = [prod.image, sampleGalleryImages[1], sampleGalleryImages[2]];
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
    const shopMainCatalogView = document.getElementById('shopMainCatalogView');
    const productFullPageView = document.getElementById('productFullPageView');

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

// 12. Accordion Toggle
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

// 13. கார்ட் UI மற்றும் Recommended For You தயாரிப்புகள் (Cart UI Engine)
function updateCartUI() {
    let currentCart = [];
    try {
        currentCart = (typeof cart !== 'undefined' && cart.length > 0) 
            ? cart 
            : JSON.parse(localStorage.getItem('blueskin_cart')) || [];
        cart = currentCart;
    } catch(e) { currentCart = []; }

    let subTotal = 0;
    let totalItems = 0;

    const list = document.getElementById('cartItemsList');

    if (currentCart.length === 0) {
        if (list) {
            list.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8;">
                    <i class="fa-solid fa-bag-shopping" style="font-size: 2.5rem; color: rgba(245,196,67,0.3); margin-bottom: 0.8rem;"></i>
                    <p style="color: #ffffff; font-weight: 600;">Your luxury bag is empty</p>
                    <span style="font-size: 0.8rem;">Add signature formulations to review.</span>
                </div>
            `;
        }
    } else {
        if (list) list.innerHTML = '';
        currentCart.forEach(item => {
            const validPrice = getItemValidPrice(item);
            item.price = validPrice;

            const itemQty = Number(item.qty || 1);
            const itemTotal = validPrice * itemQty;
            subTotal += itemTotal;
            totalItems += itemQty;

            if (list) {
                const itemRow = document.createElement('div');
                itemRow.className = 'cart-item-card';
                itemRow.innerHTML = `
                    <div class="cart-item-thumb">
                        <img src="${item.image || ''}" alt="${item.name || ''}">
                    </div>
                    <div class="cart-item-details" style="flex:1;">
                        <h4 class="cart-item-title">${item.name || item.title || 'Artisanal Product'}</h4>
                        <div class="cart-item-price">₹ ${itemTotal.toLocaleString('en-IN')}</div>
                        <div class="cart-qty-counter">
                            <button type="button" class="cart-qty-btn" onclick="updateInCardQty('${item.id}', -1)">-</button>
                            <span class="cart-qty-val">${itemQty}</span>
                            <button type="button" class="cart-qty-btn" onclick="updateInCardQty('${item.id}', 1)">+</button>
                        </div>
                    </div>
                    <button type="button" class="cart-item-remove" onclick="updateInCardQty('${item.id}', -${itemQty})" title="Remove">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                `;
                list.appendChild(itemRow);
            }
        });
    }

    localStorage.setItem('blueskin_cart', JSON.stringify(currentCart));

    const badge1 = document.getElementById('cartCount');
    const badge2 = document.getElementById('drawerItemCount');
    if (badge1) badge1.textContent = totalItems;
    if (badge2) badge2.textContent = `(${totalItems} items)`;

    const subEl = document.getElementById('cartSubTotal');
    const totEl = document.getElementById('cartTotalPrice');
    const step1TotEl = document.getElementById('step1TotalDisplay');

    const formattedSub = `₹ ${subTotal.toLocaleString('en-IN')}`;
    if (subEl) subEl.textContent = formattedSub;
    if (step1TotEl) step1TotEl.textContent = formattedSub;

    const finalPayable = (typeof appliedPromoDiscount !== 'undefined' && appliedPromoDiscount > 0) 
        ? Math.max(0, subTotal - appliedPromoDiscount) 
        : subTotal;

    if (totEl) totEl.textContent = `₹ ${finalPayable.toLocaleString('en-IN')}`;

    renderCartSuggestions();
}

function renderCartSuggestions() {
    const sugRow = document.getElementById('cartSuggestionsRow');
    if (!sugRow || !products || products.length === 0) return;

    let currentCart = [];
    try {
        currentCart = (typeof cart !== 'undefined' && cart.length > 0) ? cart : JSON.parse(localStorage.getItem('blueskin_cart')) || [];
    } catch(e) { currentCart = []; }

    const cartIds = currentCart.map(c => String(c.id));
    const suggestions = products.filter(p => !cartIds.includes(String(p.id))).slice(0, 4);

    if (suggestions.length === 0) {
        sugRow.innerHTML = '';
        return;
    }

    sugRow.innerHTML = '';
    suggestions.forEach(s => {
        const finalP = getItemValidPrice(s);
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
            <button type="button" class="btn-rec-box-add" id="btn-cart-sugg-${s.id}" onclick="addSuggestionToCart('${s.id}')">
                <i class="fa-solid fa-plus"></i> Add
            </button>
        `;
        sugRow.appendChild(box);
    });
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
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    if (show) {
        if (cartDrawer) cartDrawer.classList.add('active');
        if (cartOverlay) cartOverlay.classList.add('active');
        updateCartUI();
    } else {
        if (cartDrawer) cartDrawer.classList.remove('active');
        if (cartOverlay) cartOverlay.classList.remove('active');
    }
}

const openCartBtn = document.getElementById('openCartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartOverlay = document.getElementById('cartOverlay');

if (openCartBtn) openCartBtn.onclick = function() { toggleCart(true); };
if (closeCartBtn) closeCartBtn.onclick = function() { toggleCart(false); };
if (cartOverlay) cartOverlay.onclick = function() { toggleCart(false); };

// 14. கூப்பன் குறியீடு சரிபார்த்தல் (Promo Code Engine)
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
        updateCartUI();
        return;
    }

    let currentCart = (typeof cart !== 'undefined' && cart.length > 0) ? cart : JSON.parse(localStorage.getItem('blueskin_cart')) || [];
    const bagSubTotal = currentCart.reduce((sum, item) => sum + (getItemValidPrice(item) * Number(item.qty || 1)), 0);

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
        updateCartUI();
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

    updateCartUI();
};

// 15. வாட்ஸ்அப் ஆர்டர் & இன்வாய்ஸ் & கார்ட் 0 ஆகி ஹோம் பேஜ் திரும்புதல் (WhatsApp Checkout Engine)
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
        alert("Please enter a valid 10-digit mobile number.");
        phoneInput.focus();
        return;
    }

    if (!address) {
        alert("Please enter your complete delivery address.");
        addressInput.focus();
        return;
    }

    let activeCart = (typeof cart !== 'undefined' && cart.length > 0) 
        ? cart 
        : JSON.parse(localStorage.getItem('blueskin_cart')) || [];

    if (activeCart.length === 0) {
        alert("Your shopping bag is currently empty.");
        return;
    }

    let orderItemsText = "";
    let grandTotal = 0;

    activeCart.forEach((item, index) => {
        const itemPrice = getItemValidPrice(item);
        const itemQty = Number(item.qty || 1);
        const itemTotal = itemPrice * itemQty;
        grandTotal += itemTotal;
        orderItemsText += `${index + 1}️⃣ *${item.name || item.title}*\n   • Qty   : ${itemQty}\n   • Price : ₹ ${itemTotal.toLocaleString('en-IN')}\n\n`;
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
🧾 *Invoice ID :* #${orderId}
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

_Please reply with payment details to confirm this order. Thank you for choosing Blue Skin._`;

    const targetNumber = "919658399991";
    const whatsappURL = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;

    // A. சுபாபேஸ் கிளவுடில் ஆர்டரைச் சேமித்தல்
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

        if (appliedPromoCode) {
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

    // B. கார்ட் மெமரி முழுமையாக 0 ஆகுதல்
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

    updateCartUI();

    // C. வாட்ஸ்அப் திறந்து, உடனடியாக முகப்புப் பக்கத்திற்குத் திரும்புதல்
    window.open(whatsappURL, '_blank');
    window.location.replace('index.html');
};

// 16. மொபைல் செக்-அவுட் வழிசெலுத்தல் & ஹிஸ்டரி லாக் (Step 1 & Step 2 Controller)
window.showMobileCheckout = function(isCheckout) {
    const drawer = document.getElementById('cartDrawer');
    const scrollBody = document.querySelector('.cart-split-body');
    if (drawer) {
        if (isCheckout) {
            if (typeof cart !== 'undefined' && cart.length === 0) {
                alert("Your shopping bag is empty. Please add an item to proceed!");
                return;
            }
            drawer.classList.add('show-checkout');
            localStorage.setItem('blueskin_cart_screen', 'step2');
        } else {
            drawer.classList.remove('show-checkout');
            localStorage.setItem('blueskin_cart_screen', 'step1');
        }
        if (scrollBody) {
            scrollBody.scrollTop = 0;
        }
    }
};

// 17. தொடக்க நிகழ்வு இணைப்புகள் & ஒற்றை சின்க் கால் (Unified Page Initialization)
function initializeAllCatalogInteractions() {
    document.querySelectorAll('.cat-item').forEach(item => {
        item.onclick = function(e) {
            e.preventDefault();
            const cat = this.getAttribute('data-category') || 'all';
            selectCategory(cat, this);
        };
    });

    const catTrack = document.getElementById('catTrack');
    if (catTrack) {
        catTrack.onclick = function(e) {
            const item = e.target.closest('.cat-item');
            if (!item) return;
            const cat = item.getAttribute('data-category') || 'all';
            selectCategory(cat, item);
        };
    }

    const catScrollLeft = document.getElementById('catScrollLeft');
    const catScrollRight = document.getElementById('catScrollRight');
    if (catScrollLeft && catTrack) {
        catScrollLeft.onclick = function() { catTrack.scrollBy({ left: -250, behavior: 'smooth' }); };
    }
    if (catScrollRight && catTrack) {
        catScrollRight.onclick = function() { catTrack.scrollBy({ left: 250, behavior: 'smooth' }); };
    }

    // படிவ உள்ளீடுகளை ஆட்டோ-சேவ் செய்தல்
    ['custName', 'custPhone', 'custAddress'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                const draft = {
                    name: document.getElementById('custName')?.value || '',
                    phone: document.getElementById('custPhone')?.value || '',
                    address: document.getElementById('custAddress')?.value || ''
                };
                localStorage.setItem('blueskin_checkout_draft', JSON.stringify(draft));
            });
        }
    });

    // பழைய படிவ விவரங்களை மீட்டெடுத்தல்
    try {
        const draft = JSON.parse(localStorage.getItem('blueskin_checkout_draft'));
        if (draft) {
            if (document.getElementById('custName') && draft.name) document.getElementById('custName').value = draft.name;
            if (document.getElementById('custPhone') && draft.phone) document.getElementById('custPhone').value = draft.phone;
            if (document.getElementById('custAddress') && draft.address) document.getElementById('custAddress').value = draft.address;
        }
    } catch(e) {}

    // அட்மின் & கிளவுட் தயாரிப்புகள் மற்றும் லோகோவை ஒரே ஒரு முறை சின்க் செய்தல்
    syncAdminProducts();
    syncShopBrandLogo();
    updateCartUI();
    updateWishlistUI();

    // சுபாபேஸ் ரியல்டைம் லிசனர்: அட்மினில் தயாரிப்பு மாறினால் மட்டும் புதுப்பிக்கும்
    if (window.dbClient) {
        window.dbClient
            .channel('public:products_live_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
                syncAdminProducts();
            })
            .subscribe();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllCatalogInteractions);
} else {
    initializeAllCatalogInteractions();
}
