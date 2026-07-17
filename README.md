# Qafla Men's Wear

Premium menswear e-commerce site for **Qafla Men's Wear**, based in Hyderabad, Sindh, Pakistan. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no build step.

🔗 **Live site:** _add your GitHub Pages URL here once deployed_

---

## Features

- Product catalog with categories, sizes, colorways, and size charts
- Shopping cart with quantity controls and persistent storage
- Checkout with multiple payment options:
  - Cash on Delivery
  - EasyPaisa (manual transfer + reference confirmation)
  - JazzCash (manual transfer + reference confirmation)
  - Bank transfer
  - Card payments (UI in place, gateway integration pending)
- Google and Facebook sign-in (OAuth)
- WhatsApp integration for order notifications and customer support
- Lightweight admin panel — manage products, stock, and view orders
- Fully responsive, mobile-first design

---

## Tech Stack

- **HTML5 / CSS3** — no CSS framework, custom design system
- **Vanilla JavaScript** — no React/Vue, single `script.js` file with a simple client-side router
- **Google Identity Services** — for Google Sign-In
- **Facebook SDK for JavaScript** — for Facebook Login
- **Browser localStorage** — cart, orders, and product data persistence (no backend/database)

---

## Project Structure

```
.
├── index.html      # Markup, header/footer, modal/drawer shells
├── index.css       # All styling
├── script.js       # App logic: routing, cart, checkout, admin, auth
└── README.md
```

---

## Local Development

This is a static site — no build tools or package installs required. Just serve the folder over HTTP (opening `index.html` directly via `file://` will break Google/Facebook sign-in).

**Using VS Code Live Server:**
Right-click `index.html` → "Open with Live Server"

**Using Python:**
```bash
python3 -m http.server 5500
```

**Using Node:**
```bash
npx serve -l 5500
```

Then open `http://localhost:5500` in your browser.

---

## Configuration

Before deploying, open `script.js` and set the following near the top of the file:

```js
const GOOGLE_CLIENT_ID = '';   // from console.cloud.google.com/apis/credentials
const FACEBOOK_APP_ID  = '';   // from developers.facebook.com/apps

const EASYPAISA_NUMBER = '';   // your EasyPaisa receiving number
const JAZZCASH_NUMBER  = '';   // your JazzCash receiving number
```

### Google Sign-In setup
1. Create an OAuth Client ID at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (type: Web application).
2. Add your site's origin (e.g. `https://yourusername.github.io`) under **Authorized JavaScript origins** — no path or trailing slash.
3. Paste the Client ID into `GOOGLE_CLIENT_ID`.

### Facebook Login setup
1. Create an app at [Facebook Developers](https://developers.facebook.com/apps) and add the **Facebook Login** product.
2. Add your domain under **App Domains** and your page URL under **Valid OAuth Redirect URIs**.
3. Paste the App ID into `FACEBOOK_APP_ID`.

---

## Deployment (GitHub Pages)

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**, choose your branch and root folder.
4. Your site will be live at `https://yourusername.github.io/your-repo-name/`.
5. Update the Google/Facebook OAuth origin settings to match this URL.

---

## Contact

- **Store:** Shop No. 02, Shaheen Arcade, Latifabad Unit No. 8, Hyderabad, Sindh, Pakistan
- **Phone / WhatsApp:** +92 315 3755007
- **Hours:** Open daily, 11:00 AM – 10:00 PM

---

## License

All rights reserved © 2026 Qafla Men's Wear.
