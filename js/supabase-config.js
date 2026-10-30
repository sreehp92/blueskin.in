// ==========================================================================
// === BLUE SKIN: SUPABASE CLIENT INITIALIZATION                          ===
// ==========================================================================

const SUPABASE_URL = "https://xijzftvmvajnboywnmbe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BNT6jfQA2pGyo_rLmU4xvg_jv-_emF9";

// பிரவுசரில் global client ஆக dbClient உருவாக்குதல்
if (typeof supabase !== 'undefined') {
    window.dbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase dbClient வெற்றிகரமாக இணைக்கப்பட்டது!");
} else {
    console.error("❌ Supabase CDN script லோட் ஆகவில்லை! HTML ஃபைலில் CDN ஸ்கிரிப்ட் உள்ளதா எனப் பார்க்கவும்.");
}
