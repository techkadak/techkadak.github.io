# data/apps.json — format (schema)

```json
{
  "apps": [
    {
      "slug": "organic-maps",                 // URL ka naam: apps/organic-maps.html (sirf a-z, 0-9, -)
      "name": "Organic Maps",
      "category": ["Android Apps", "Open Source/GitHub"],   // in 5 mein se: Android Apps | AI Tools | Open Source/GitHub | Paid ka FREE Jawab | Student Tech
      "what": "1-2 line Hinglish: app kya karta hai",
      "pricing": "Free",                      // Free | Freemium | Paid  (card ka badge)
      "priceNote": "Free (no ads, no IAP)",   // detail line
      "limit": "⚠️ wali line (ya null)",
      "platforms": "Android, iOS",            // ya null
      "replaces": "Google Maps (offline use ke liye)",  // kis paid/popular app ka jawab (ya null)
      "links": [ { "label": "Play Store", "url": "https://play.google.com/..." } ],   // SIRF official links, https
      "icon": "assets/icons/organic-maps.png", // ya null (tab naam ke letters dikhte hain)
      "posts": [ { "type": "instagram-post", "url": "https://www.instagram.com/techkadak/p/...", "title": "..." } ],  // type: instagram-post | instagram-reel | youtube
      "added": "2026-10-31",                  // site pe kab aaya (YYYY-MM-DD) — naye pehle dikhte hain
      "verified": "2026-11-01",               // official page kab check kiya
      "source": "techkadak",                  // techkadak (IG pe aaya) | queue (bot ne queue se daala) | ai (AI mode)
      "aiAdded": false,                       // true = site pe "AI-added" tag
      "affiliate": ""                         // optional affiliate link (khaali = nahi dikhega; dikhega to "affiliate" likha hoga)
    }
  ]
}
```

`data/queue.json` mein `queue` list ke items bilkul isi format mein hote hain (bas `added` nahi chahiye — bot daal deta hai).
Bot roz list ke **pehle 5** items (`config.json` → `daily.perDay`) site pe daalta hai (sabse upar, aaj ki date ke saath) aur queue se hata deta hai. Jo app site pe pehle se hai (slug / naam / package / GitHub repo same) wo skip hota hai.

Optional Android fields (Tech Kadak app ke andar install ke liye; website inhe ignore karti hai):
- `package_name`: Android applicationId, jaise `org.videolan.vlc`
- `apk_source`: `github:owner/repo` (official GitHub release me .apk) ya `fdroid:package` (F-Droid) — sirf official source.

Rules: sirf official links (Play Store, F-Droid, GitHub, app ki apni website). Koi number / rating / user count mat likho jo official page pe na ho.
