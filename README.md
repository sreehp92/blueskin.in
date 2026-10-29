👑 Blue Skin — Luxury Boutique & Omnichannel Operations Suite

An ultra-luxury e-commerce storefront, responsive 2-step mobile checkout drawer, and dual-PIN enterprise operations cockpit engineered for Blue Skin Cosmetics & Luxury Creations.

📌 Project Overview

Blue Skin is a bespoke, full-featured web application designed for high-end luxury cosmetics and artisanal collections. The platform features tailored, device-specific architectures:

Desktop Experience: An immersive split-screen layout showcasing high-definition catalog items alongside a dedicated, side-by-side real-time concierge checkout interface.

Mobile Experience: A zero-blur, solid royal navy cart drawer featuring a structured 2-step checkout flow, a locked 2×2 recommendation shelf, and hardware back-button/refresh state locking.

Enterprise Admin Cockpit: A dual-PIN authenticated command center (Super Admin & Store Desk) featuring formulation CRUD, category taxonomy management, dynamic thermal label printing, and automated WhatsApp order dispatch notifications.

🛠️ Technology Stack & Design System

Layer

Specifications

Core Architecture

Semantic HTML5, Vanilla JavaScript (Modern ES6+), Modern Modular CSS3

Typography

Cinzel (Headings & Luxury Accents), Poppins (Body Copy & UI Elements)

Color Palette

Royal Deep Navy (#08162d), Radiant Gold (#f5c443), Indigo Accent (#0d2244)

Iconography & Media

FontAwesome 6 Pro CDN, Curated High-Resolution Visuals

State & Persistence

Browser localStorage (Real-Time State Sync), HTML5 History API (pushState / popstate)

Messaging Gateway

WhatsApp Direct Deep-Link API (https://wa.me/)

📂 Project Directory Structure

blueskin-luxury/
│
├── index.html              # Brand landing page, hero section, portfolio gallery & heritage story
├── shop.html               # Luxury catalog, category filters, and 2-step mobile cart drawer
├── admin.html              # Dual-PIN operations cockpit, order tracking & dispatch console
│
├── css/
│   ├── style.css           # Global desktop master stylesheet, design tokens & base components
│   ├── shop-mobile.css     # Mobile catalog grid, touch navigation & header action bar
│   └── cart-mobile.css     # Mobile cart drawer, 2x2 grid, sticky CTAs & zero-blur styling
│
├── js/
│   ├── shop.js             # Catalog rendering, cart state persistence, 2-step navigation & checkout
│   └── admin.js            # PIN gate authentication, order management, formulation CRUD & label studio
│
└── README.md               # Master technical documentation and setup guide


💎 Core Modules & Architectural Features

1. Storefront & Bespoke Catalog (shop.html / js/shop.js)

Aspect-Ratio Category Slider: Dynamic category filtering (All, Face, Eye, Lip, Skin, Tools) using calibrated 29:53 thumbnail ratios.

Interactive Product Cards: Live discount calculations, in-card quantity counters ([-] 1 [+]), and instant bag updates without page reloads.

Detailed Product Modal: Multi-angle carousel preview, ingredient formulation breakdowns, and application guidance.

2. Zero-Blur 2-Step Mobile Cart Drawer (css/cart-mobile.css)

Zero GPU Blur Glitch: Completely removes mobile backdrop rendering glitches by replacing backdrop-filter with an opaque, solid royal navy background (#08162d).

Two-Step Checkout Flow:

Step 1 (Luxury Bag): Compact cart item rows with 52px square thumbnails, 1:1 circular control buttons, a fixed 2×2 recommendation grid (cartSuggestionsRow), and a sticky "Proceed to Checkout" button.

Step 2 (Concierge Checkout): A "Back to Items" navigation toggle, transparent invoice summary (Bag Value, Free Insured Shipping, Grand Total), and delivery address form fields.

Fine-Tuned Edge Margins: Calibrated 7px (~2mm) side margins providing an edge-to-edge luxury aesthetic without clipping against mobile viewport borders.

3. State Persistence & Hardware Navigation Lock

Refresh Resistance: Retains cart items, open drawer states, and partial form inputs across page refreshes via localStorage keys (blueskin_cart_screen and blueskin_checkout_draft).

History API Synchronization (popstate): Prevents accidental browser exits when tapping the native mobile hardware back button:


$$\text{Step 2 (Checkout Form)} \xrightarrow{\text{Back}} \text{Step 1 (Bag View)} \xrightarrow{\text{Back}} \text{Cart Closed (Catalog)}$$

Automated Order Reset: Tapping "Complete Order on WhatsApp" wipes the cart, clears cached form drafts, resets drawer state, and returns the customer smoothly to the storefront catalog.

4. Enterprise Admin Cockpit (admin.html / js/admin.js)

Dual-PIN Role-Based Access:

Super Admin (9658): Full system access — Product formulation CRUD, category taxonomy editing, live storefront CMS text editor, gateway configuration, and CSV/PDF export.

Store Desk (1111): Operational access — Real-time order verification, dispatch queue, courier AWB tracking assignment, and thermal label generation.

Automated Thermal Shipping Labels: Dynamic real-time preview containing sender return address, recipient information, barcode identifiers, and fragility warnings.

One-Click WhatsApp Dispatch Updates: Pre-formatted, branded luxury status notifications (Payment Received, Packed, Dispatched) routed directly to client contact numbers.

⚙️ Configuration & Environment Parameters

Key configuration values can be adjusted directly within the respective script files:

Parameter

Location

Default Value

Description

CLIENT_WHATSAPP_NUMBER

js/shop.js

919658399991

Primary WhatsApp recipient number for incoming customer orders

SUPER_ADMIN_PIN

js/admin.js

9658

Master access PIN for full administrative privileges

STORE_DESK_PIN

js/admin.js

1111

Restricted access PIN for fulfillment and packaging desk

blueskin_products

localStorage

Seed Array (8 Items)

Master product formulation data key

blueskin_orders

localStorage

Seed Array

Consignment and verified order records key

🚀 Setup & Local Development

1. Clone the Repository

git clone https://github.com/your-username/blueskin-luxury.git
cd blueskin-luxury


2. Run Locally

Using VS Code: Right-click index.html or shop.html and select Open with Live Server.

Using Python:

python -m http.server 8000


Open your browser and navigate to http://localhost:8000.

3. Production Deployment

Because this project runs entirely on static files, it can be deployed with zero build configuration to platforms such as Vercel, Netlify, or GitHub Pages.

📜 Quality Assurance Checklist

[x] Desktop split-screen layout integrity verified across multiple viewport widths.

[x] Mobile GPU blur issues eliminated using solid #08162d surface layers.

[x] Action icons, quantity steppers, and close buttons locked to exact 1:1 aspect-ratio circles.

[x] Fixed 2×2 recommendation shelf validated without horizontal jitter or overflow.

[x] In-app back navigation and refresh persistence fully functional via History API.

[x] WhatsApp order formatting, automatic cart flush, and storefront redirect verified.

© 2026 Blue Skin Luxury Cosmetics. Mastercrafted by Elite Engineering.Corepulse.in
