# Tech Kadak website — FREE mein khud host karo (GitHub Pages)

Ye poori website tumhari hai. Hosting free, domain free (`tumhara-username.github.io`), aur roz 5 naye apps **apne aap** add hote hain — GitHub ka free bot (Actions) chalata hai. Koi server nahi, koi paisa nahi.

**Kya kya hai:** 3D home page (TECH KADAK letters, app carousel, scroll effects), saare apps ki searchable list, har app ka alag SEO page, sitemap, Privacy / About / Contact / Disclaimer pages, aur daily auto-update bot.

---

## A. Website live karo (10-15 min, ek baar)

> PC/laptop se sabse aasaan hai. Phone se karna ho to Chrome mein github.com kholo aur menu → **Desktop site** on karo.

1. **GitHub account banao (free):** https://github.com/signup → email, password, username daalo → email verify karo.
2. **Naya repository banao:** upar **+** → **New repository**
   - Repository name: `techkadak`
   - **Public** chuno (free Pages ke liye zaroori)
   - **Create repository** dabao.
3. **Files upload karo:**
   - `techkadak-site-free.zip` ko extract (unzip) karo.
   - Repo page pe **uploading an existing file** link dabao.
   - Extract kiye folder ke **andar ki saari files aur folders** (assets, apps, data, scripts, test, docs, src, index.html, config.json …) khinch ke (drag) daal do.
   - Neeche **Commit changes** dabao.
4. **`.github` folder check karo (zaroori!):** ye folder chhupa (hidden) hota hai, kabhi upload nahi hota.
   - Repo mein `.github/workflows/daily.yml` dikh raha hai? Haan → step 5.
   - Nahi → **Add file → Create new file** → naam box mein likho `.github/workflows/daily.yml` → zip wali `daily.yml` file kholo (Notepad), sab copy karke paste karo → **Commit changes**.
5. **Pages on karo:** repo **Settings → Pages** → "Build and deployment" mein **Source: GitHub Actions** chuno.
6. **Bot ko likhne ki permission do:** **Settings → Actions → General** → neeche "Workflow permissions" → **Read and write permissions** → **Save**.
7. **Pehli baar chalao:** **Actions** tab → left mein **Daily app + deploy** → **Run workflow** → hara button.
   - 1-2 minute mein ✅ aa jayega.
8. **Website dekho:** `https://TUMHARA-USERNAME.github.io/techkadak/` 🎉 (Settings → Pages pe bhi link dikhta hai)

Bas! Ab **roz subah 9 baje (IST)** bot 5 naye apps add karega (sabse naye upar) aur site update karega. Tumhe kuch nahi karna.

> Tip: repo ka naam `TUMHARA-USERNAME.github.io` rakhoge to site seedha `https://TUMHARA-USERNAME.github.io/` pe khulegi.

---

## B. Naye apps kaise aate hain

- `data/queue.json` mein verified apps line mein hain → roz 5 jaate hain (`config.json` → `daily.perDay`). Queue mein kitne din bache, bot ke log mein likha aata hai.
- **Khud app daalna:** repo mein `data/queue.json` kholo → ✏️ (edit) → kisi purane item ko copy karke end mein naya likho (format: `docs/SCHEMA.md`) → **Commit**. Sirf official links daalna.
- **Turant site pe daalna:** `data/apps.json` mein sabse upar daal do → Commit → 2 min mein live.

### Optional: AI mode (Gemini — free key, tumhari apni)
Queue khatam hone ke baad AI khud F-Droid ke official data se ek naya free app chunega aur Hinglish mein likhega (site pe "AI-added" tag ke saath; link sirf official).
1. https://aistudio.google.com/apikey kholo → Google se login → **Create API key** → copy.
2. Repo **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `GEMINI_API_KEY`
   - Secret: copy ki hui key → **Add secret**.
3. Ho gaya. (Pehle AI chahiye to `config.json` mein `"mode": "ai-then-queue"` kar do.)
> Key kabhi kisi ko mat bhejna, kisi file mein mat likhna — sirf Secrets mein.

---

## C. Google search mein lao (free)

1. https://search.google.com/search-console kholo → **Add property** → **URL prefix** → apni site ka link daalo (jaise `https://TUMHARA-USERNAME.github.io/techkadak/`).
2. Verify method: **HTML tag** → `content="...."` ke andar wala code copy karo.
3. Repo mein `config.json` edit karo → `"googleSiteVerification": ""` mein woh code paste → **Commit** → 2 min ruk ke Search Console mein **Verify** dabao.
4. Left menu **Sitemaps** → likho `sitemap.xml` → **Submit**.
5. Google ko pages index karne mein kuch din se kuch hafte lag sakte hain. Har app ka alag page hai (jaise "Organic Maps kya hai") — isse search mein aane ke chances badhte hain. Guarantee koi nahi deta.

---

## D. Earning (AdSense) — sach sach

Site AdSense ke liye **ready** hai (ad jagah bani hui hai, Privacy Policy / About / Contact / Disclaimer pages hain). Par:
- AdSense apply karne se pehle site pe achha content + thoda traffic hona chahiye (roz bot naye pages bana raha hai — 1-2 mahine baad try karo).
- AdSense usually **apna domain** maangta hai (`.in` / `.com`). Domain **sasta hai par free nahi** (har saal renew).
- Approval **Google ka decision** hai — pakka nahi.

Jab domain lo:
1. Repo **Settings → Pages → Custom domain** mein domain daalo, domain wali company ki DNS settings mein GitHub ke bataye records lagao (GitHub ka guide: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site).
2. `config.json` mein `"siteUrl": "https://tumhara-domain.in"` likho → Commit.
3. https://adsense.google.com pe apply karo. AdSense jo `ads.txt` line de, use repo mein root pe `ads.txt` naam ki file bana ke daal do.
4. Approve hone ke baad `config.json` → `"ads": { "enabled": true, "adsenseClient": "ca-pub-XXXXXXXX" }` → Commit. Ads apne aap dikhne lagenge.

Extra earning: har app mein `"affiliate"` field hai (khaali = band). Kabhi affiliate link daaloge to site pe "affiliate" likha aayega.

---

## E. Kuch gadbad ho to

- **Actions mein ❌ laal:** us run pe click → error padho. Zyaadatar: step 5 (Source: GitHub Actions) ya step 6 (Read and write) bhool gaye.
- **Bot ruk gaya:** GitHub 60 din bina activity ke schedule band kar deta hai — bot roz commit karta hai to aisa nahi hona chahiye. Hua to Actions tab → workflow → **Enable workflow**.
- **Site purani dikh rahi:** browser refresh / 2-3 min ruko.
- 3D slow lage to bhi chinta nahi — purane phones pe 3D halka chalta hai, aur WebGL na ho to normal design dikhta hai.

Files ka map: `index.html` (home, bot banata hai) · `apps/*.html` (har app ka page, bot banata hai) · `data/apps.json` (saare apps) · `data/queue.json` (aane wale apps) · `config.json` (settings) · `scripts/` (bot ka code) · `assets/` (design, 3D, icons).
