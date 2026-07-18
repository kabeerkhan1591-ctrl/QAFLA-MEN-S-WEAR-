'use strict';

// ===== SUPABASE CONFIG =====
// REPLACE THESE WITH YOUR ACTUAL KEYS FROM SUPABASE DASHBOARD
const SUPABASE_URL = 'https://rckdhxbviixzhfnldavx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2RoeGJ2aWl4emhmbmxkYXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTYxNDEsImV4cCI6MjA5OTk3MjE0MX0.WCzQkYiWDpsZkdz_L3K6wvqWNOtHEAhl5iickefbEas';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const GOOGLE_CLIENT_ID = '1080648523537-980us9f34h8g3gf0o7omvu4qhl48h7f9.apps.googleusercontent.com';
const FACEBOOK_APP_ID  = '1234567890';
const IMG = (id, w = 900) => `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;
const IMG_HERO  = IMG('1542272604-787c3835535d', 2000);
const IMG_STORE  = IMG('1441986300917-64674bd600d8', 1200);
const LIFE = ['1445205170230-053b83016050','1544441893-675973e31985','1489987707025-afc232f7ea0f','1556905055-8f358a7a47b2','1516762689617-e1cffcef479d','1591047139829-d91aecb6caea','1542272604-787c3835535d','1509316785289-025f5b846b35'];

const DEFAULT_CHART = [
  { size: 'S',   chest: '38', length: '27', sleeve: '7.5' },
  { size: 'M',   chest: '40', length: '28', sleeve: '8'   },
  { size: 'L',   chest: '42', length: '29', sleeve: '8.5' },
  { size: 'XL',  chest: '44', length: '30', sleeve: '9'   },
  { size: 'XXL', chest: '46', length: '31', sleeve: '9.5' },
];
const CARE = 'Machine wash cold, inside out · Tumble dry low · Warm iron if needed · Do not bleach';

const WHATSAPP_GROUP_LINK = '';
const EASYPAISA_NUMBER = '0332 0463476';
const JAZZCASH_NUMBER  = '0332 0463476';
const BANK_DETAILS = { bank:'Add your bank name', title:'Add your account title', account:'Add your account / IBAN number' };

const K = {
  cart: 'qafla_cart_v3',
  wish: 'qafla_wish_v3',
  admin: 'qafla_admin_v3',
  lock: 'qafla_admin_lock_v1',
  pass: 'qafla_admin_pass_v1',
  session: 'qafla_session_v1',
  customers: 'qafla_customers_v1',
};

const store = {
  get(k, f){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch(e){ return f; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
};

const state = {
  products: [],
  cart: store.get(K.cart, []),
  wish: store.get(K.wish, []),
  orders: [],
  subs: [],
  filters: { q:'', cat:'All', size:'All', sort:'featured' },
  modal: null,
  pm: { size:null, qty:1, img:0 },
  admin: { authed: store.get(K.admin, false), tab:'products', editing:null, ...store.get(K.lock, { attempts:0, lockUntil:0 }), reset:{ step:null, otp:null, otpSentAt:0, otpTries:0, err:'', showPass:false } },
  auth: { session: store.get(K.session, null), view:'signin', err:'', showPass:false },
  checkout: { method:'cod' },
};

// ===== SUPABASE DATA FUNCTIONS =====

async function loadProducts(){
  const { data, error } = await supabase.from('products').select('*').order('id');
  if (error){ console.error('loadProducts error:', error); toast('Could not load products -- check connection'); return; }
  state.products = data.map(p => ({
    id: p.id,
    title: p.title,
    sub: p.sub,
    desc: p.description,
    cat: p.category,
    fabric: p.fabric,
    care: p.care,
    price: p.price,
    compareAt: p.compare_at_price || 0,
    colorway: { name: p.color_name, hex: p.color_hex },
    img: p.images && p.images.length ? p.images[0] : '',
    imgs: p.images || [],
    isNew: p.is_new,
    featured: p.featured,
    sizes: p.sizes || {},
    chart: p.size_chart || DEFAULT_CHART,
  }));
}

async function loadOrders(){
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error){ console.error('loadOrders error:', error); return; }
  state.orders = data.map(o => ({
    id: o.id,
    date: new Date(o.created_at).toLocaleString('en-PK', { dateStyle:'medium', timeStyle:'short' }),
    customer: { name: o.customer_name, phone: o.customer_phone, address: o.customer_address, city: o.customer_city, notes: o.customer_notes || '' },
    items: o.items,
    total: o.total,
    payment: { method: o.payment_method, label: o.payment_label, ref: o.payment_ref || '', status: o.payment_status },
  }));
}

async function loadSubs(){
  const { data, error } = await supabase.from('subscribers').select('*').order('created_at', { ascending: false });
  if (error){ console.error('loadSubs error:', error); return; }
  state.subs = data.map(s => ({
    phone: s.phone,
    date: new Date(s.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
  }));
}

async function saveProductToSupabase(product){
  const payload = {
    id: product.id,
    title: product.title,
    sub: product.sub,
    description: product.desc,
    category: product.cat,
    fabric: product.fabric,
    care: product.care,
    price: product.price,
    compare_at_price: product.compareAt || 0,
    color_name: product.colorway.name,
    color_hex: product.colorway.hex,
    images: product.imgs,
    is_new: product.isNew,
    featured: product.featured,
    sizes: product.sizes,
    size_chart: product.chart,
  };
  const { error } = await supabase.from('products').upsert(payload);
  if (error){ console.error('saveProduct error:', error); toast('Save failed -- check connection'); return false; }
  return true;
}

async function deleteProductFromSupabase(id){
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error){ console.error('deleteProduct error:', error); toast('Delete failed'); return false; }
  return true;
}

async function saveOrderToSupabase(order){
  const { error } = await supabase.from('orders').insert({
    id: order.id,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    customer_address: order.customer.address,
    customer_city: order.customer.city,
    customer_notes: order.customer.notes,
    total: order.total,
    payment_method: order.payment.method,
    payment_label: order.payment.label,
    payment_ref: order.payment.ref,
    payment_status: order.payment.status,
    items: order.items,
  });
  if (error){ console.error('saveOrder error:', error); return false; }
  return true;
}

async function saveSubscriberToSupabase(phone){
  const { error } = await supabase.from('subscribers').insert({ phone });
  if (error && error.code !== '23505'){ console.error('saveSubscriber error:', error); return false; }
  return true;
}

// ===== HELPERS =====

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => 'Rs. ' + Number(n || 0).toLocaleString('en-US');
const prodImgs = p => (p.imgs && p.imgs.length ? p.imgs : [p.img]).map(id => isFullImgUrl(id) ? id : IMG(id));
const isFullImgUrl = s => /^(https?:|data:)/i.test(String(s || ''));
const totalStock = p => Object.values(p.sizes || {}).reduce((a,b) => a + Number(b || 0), 0);
const inStockSizes = p => Object.entries(p.sizes || {}).filter(([,n]) => Number(n) > 0).map(([s]) => s);
const cartCount = () => state.cart.reduce((a,i) => a + i.qty, 0);
const cartTotal = () => state.cart.reduce((a,i) => { const p = findProduct(i.id); return a + (p ? p.price * i.qty : 0); }, 0);
const findProduct = id => state.products.find(p => p.id === id);

function toast(msg){
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  $('#toast-wrap').appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

function addToCart(id, size, qty){
  const p = findProduct(id); if (!p) return;
  const line = state.cart.find(i => i.id === id && i.size === size);
  const have = line ? line.qty : 0;
  if (have + qty > Number(p.sizes[size] || 0)) { toast('Only ' + p.sizes[size] + ' left in size ' + size); return; }
  if (line) line.qty += qty; else state.cart.push({ id, size, qty });
  persistCart(); renderDrawer();
  const cc = $('#cart-count'); cc.classList.add('pop'); setTimeout(() => cc.classList.remove('pop'), 220);
  toast(p.title + ' · ' + size + ' added to bag');
}

function toggleWish(id, btn){
  const i = state.wish.indexOf(id);
  if (i > -1) { state.wish.splice(i,1); btn && btn.classList.remove('on'); toast('Removed from wishlist'); }
  else { state.wish.push(id); btn && btn.classList.add('on'); toast('Saved to wishlist'); }
  persistWish();
}

function updateCartCount(){
  const n = cartCount();
  $('#cart-count').textContent = n;
  $('#drawer-count').textContent = n ? '· ' + n + ' item' + (n>1?'s':'') : '';
}

function persistCart(){ store.set(K.cart, state.cart); updateCartCount(); }
function persistWish(){ store.set(K.wish, state.wish); }

function cardHTML(p, delay = 0){
  const imgs = prodImgs(p);
  const stock = totalStock(p);
  const onSale = p.compareAt && p.compareAt > p.price;
  const wished = state.wish.includes(p.id);
  return `
  <article class="card rv ${delay ? 'rv-d' + Math.min(delay,4) : ''}" data-action="open-product" data-id="${esc(p.id)}">
    <div class="card-media">
      <img src="${imgs[0]}" alt="${esc(p.title)}" loading="lazy" onerror="this.src='${IMG(p.img || LIFE[0])}'" />
      <div class="card-tint" style="background:${esc(p.colorway.hex)}"></div>
      <div class="card-badges">
        ${stock === 0 ? '<span class="badge badge--out">SOLD OUT</span>' : ''}
        ${onSale && stock > 0 ? '<span class="badge badge--sale">SALE</span>' : ''}
        ${p.isNew ? '<span class="badge badge--new">NEW</span>' : ''}
      </div>
      <button class="wish ${wished ? 'on' : ''}" data-action="wish" data-id="${esc(p.id)}" aria-label="Wishlist">
        <svg viewBox="0 0 24 24"><path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6.3a5 5 0 1 1 7.5 6.3Z"/></svg>
      </button>
      <div class="card-quick">Quick view</div>
    </div>
    <div class="card-info">
      <div class="card-code">${esc(p.id)} · ${esc(p.cat).toUpperCase()}</div>
      <h3 class="card-title">${esc(p.title)}</h3>
      <div class="card-sub">${esc(p.sub)}</div>
      <div class="card-row">
        <span class="price">${fmt(p.price)}</span>
        ${onSale ? `<span class="price-old">${fmt(p.compareAt)}</span>` : ''}
      </div>
      <div class="card-swatches"><span class="dot" style="background:${esc(p.colorway.hex)}"></span></div>
    </div>
  </article>`;
}

function secHead(wp, title, sub, link){
  return `<div class="sec-head">
    <div class="rv">
      <div class="wp">${esc(wp)}</div>
      <h2 class="sec-title">${title}</h2>
      ${sub ? `<p class="sec-sub">${esc(sub)}</p>` : ''}
    </div>
    ${link ? `<a class="link-arrow rv rv-d1" href="${link.href}">${esc(link.label)} →</a>` : ''}
  </div>`;
}

function renderHome(){
  const news = state.products.filter(p => p.isNew).slice(0, 4);
  const feats = state.products.filter(p => p.featured).slice(0, 4);
  const stripItems = ['PREMIUM COMBED COTTON','STITCHED IN PAKISTAN','قافلة','CASH ON DELIVERY','NEW DROPS EVERY MONTH'];
  const strip = stripItems.map(s => `<span>${s}<i>✦</i></span>`).join('');
  return `
  <section class="hero">
    <div class="hero-bg"><img id="hero-img" src="${IMG_HERO}" alt="Man wearing a premium black crew-neck tee, studio portrait" /></div>
    <div class="hero-scrim"></div>
    <div class="hero-inner">
      <div class="hero-eyebrow rv">QAFLA MEN'S WEAR · HYDERABAD, SINDH</div>
      <h1 class="rv rv-d1">Dress for the <em>journey</em>, not the destination.</h1>
      <p class="rv rv-d2">Premium tees, polos and casual shirts -- cut from honest cotton, finished by hand, and priced fairly in rupees. قافلة means caravan: we dress the men who keep moving.</p>
      <div class="hero-cta rv rv-d3">
        <a class="btn btn--solid" href="#/shop">Shop the collection</a>
        <a class="btn btn--ghost" href="#/#visit">Visit the store</a>
      </div>
    </div>
    <div class="hero-meta">
      <span><b>SHOP 02</b> · SHAHEEN ARCADE</span>
      <span><b>+92 315 3755007</b> · CALL OR WHATSAPP</span>
      <span>OPEN DAILY · 11 AM - 10 PM</span>
    </div>
  </section>

  <div class="strip" aria-hidden="true"><div class="strip-track">${strip}${strip}</div></div>

  <section class="section">
    <div class="wrap">
      ${secHead('WAYPOINT 01 · FRESH OFF THE CARAVAN', 'New <em>arrivals</em>', 'The latest pieces to reach the shop -- restocked weekly, gone quickly.', {href:'#/shop', label:'Shop all'})}
      <div class="grid">${news.map((p,i) => cardHTML(p, i)).join('')}</div>
    </div>
  </section>

  <section class="section section--accent">
    <div class="wrap">
      ${secHead('WAYPOINT 02 · TRIED & TRAVELLED', 'Customer <em>favourites</em>', 'The pieces Hyderabad keeps coming back for.', {href:'#/shop', label:'Shop all'})}
      <div class="grid">${feats.map((p,i) => cardHTML(p, i)).join('')}</div>
    </div>
  </section>

  <section class="section section--deep">
    <div class="wrap">
      ${secHead('WAYPOINT 03 · WORD OF MOUTH', 'What the <em>caravan</em> says')}
      <div class="rev-grid">
        ${REVIEWS.map((r,i) => `
        <div class="rev-card rv ${i ? 'rv-d' + i : ''}">
          <div class="rev-stars">${'★'.repeat(r.stars)}</div>
          <p>${esc(r.text)}</p>
          <div class="rev-who"><span class="rev-av">${esc(r.init)}</span><div><b>${esc(r.who)}</b><span>${esc(r.where)}</span></div></div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" id="visit">
    <div class="wrap">
      ${secHead('WAYPOINT 04 · COME SAY SALAAM', 'Visit the <em>store</em>')}
      <div class="visit-grid">
        <div class="visit-card rv">
          <h3>Shaheen Arcade, Latifabad</h3>
          <div class="visit-line">
            <svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span><b>Shop No. 02, Shaheen Arcade</b><br />Latifabad Unit No. 8, Hyderabad, Sindh, Pakistan</span>
          </div>
          <div class="visit-line">
            <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.9 2.2Z"/></svg>
            <span><b>+92 315 3755007</b><br />Call or WhatsApp -- the owner picks up himself</span>
          </div>
          <div class="visit-line">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span><b>Open daily</b> · 11:00 AM - 10:00 PM</span>
          </div>
          <div class="visit-cta">
            <a class="btn btn--clay" href="https://www.google.com/maps/search/?api=1&query=Shaheen+Arcade+Latifabad+Unit+8+Hyderabad+Sindh" target="_blank" rel="noopener">Visit now</a>
            <a class="btn btn--ghost" href="tel:+923153755007" style="border-color:rgba(251,244,234,.4);color:var(--on-accent)">Call the store</a>
          </div>
        </div>
        <div class="visit-photo rv rv-d2">
          <img src="${IMG_STORE}" alt="Inside the Qafla store -- rails of menswear" loading="lazy" />
          <span class="tag">SHOP 02 · SHAHEEN ARCADE</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="news rv">
        <h3>Join the caravan.</h3>
        <p>Add your WhatsApp number and tap join -- you'll be added to our group for first dibs on new arrivals and subscriber-only sale prices. No spam, promise.</p>
        <form class="news-form" data-action="join-whatsapp">
          <input type="tel" name="phone" required placeholder="Your WhatsApp number" aria-label="WhatsApp number" />
          <button class="btn btn--solid" type="submit">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="margin-right:.4rem;vertical-align:-3px"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>
            Join WhatsApp Group
          </button>
        </form>
      </div>
    </div>
  </section>`;
}

function filteredProducts(){
  const f = state.filters;
  let list = state.products.filter(p => {
    const q = f.q.trim().toLowerCase();
    const hitQ = !q || (p.title + ' ' + p.sub + ' ' + p.cat + ' ' + p.id).toLowerCase().includes(q);
    const hitC = f.cat === 'All' || p.cat === f.cat;
    const hitS = f.size === 'All' || Number((p.sizes || {})[f.size] || 0) > 0;
    return hitQ && hitC && hitS;
  });
  if (f.sort === 'low')  list = [...list].sort((a,b) => a.price - b.price);
  if (f.sort === 'high') list = [...list].sort((a,b) => b.price - a.price);
  if (f.sort === 'sale') list = [...list].sort((a,b) => ((b.compareAt||0) > b.price) - ((a.compareAt||0) > a.price));
  if (f.sort === 'featured') list = [...list].sort((a,b) => (b.featured - a.featured) || (b.isNew - a.isNew));
  return list;
}

function renderShop(){
  const f = state.filters;
  const cats = ['All', ...new Set(state.products.map(p => p.cat))];
  const sizes = ['All','S','M','L','XL','XXL'];
  const list = filteredProducts();
  return `
  <section class="page-hero">
    <div class="wrap">
      <div class="wp">THE FULL MANIFEST</div>
      <h2 class="sec-title">The <em>collection</em></h2>
      <p class="sec-sub">Every piece currently on the rail at Shaheen Arcade -- ${state.products.length} styles and counting.</p>
    </div>
  </section>
  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="toolbar">
        <label class="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input id="shop-search" type="search" placeholder="Search tees, polos, shirts..." value="${esc(f.q)}" />
        </label>
        <div class="chips" id="cat-chips">
          ${cats.map(c => `<button class="chip ${f.cat === c ? 'on' : ''}" data-action="f-cat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
        <div class="chips">
          ${sizes.map(s => `<button class="chip ${f.size === s ? 'on' : ''}" data-action="f-size" data-v="${esc(s)}">${esc(s)}</button>`).join('')}
        </div>
        <select class="sortsel" id="shop-sort" aria-label="Sort products">
          <option value="featured" ${f.sort==='featured'?'selected':''}>Sort: Featured</option>
          <option value="sale" ${f.sort==='sale'?'selected':''}>Sort: On sale first</option>
          <option value="low" ${f.sort==='low'?'selected':''}>Price: Low to high</option>
          <option value="high" ${f.sort==='high'?'selected':''}>Price: High to low</option>
        </select>
      </div>
      <div class="result-note">${list.length} OF ${state.products.length} STYLES</div>
      <div id="shop-results">
      ${list.length ? `<div class="grid">${list.map((p,i) => cardHTML(p, i % 4)).join('')}</div>`
        : `<div class="empty"><span class="serif">The caravan hasn't brought that yet.</span>Try a different search or filter -- or call <b>+92 315 3755007</b> and we'll source it for you.</div>`}
      </div>
    </div>
  </section>`;
}

const REVIEWS = [
  { stars:5, text:'"Bought the Shaheen polo last month -- the fabric still looks brand new after a dozen washes. Best menswear in Latifabad, easily."', who:'Ahmed R.', where:'Latifabad, Hyderabad', init:'AR' },
  { stars:5, text:'"Ordered three tees on WhatsApp, delivered next day. The Qafilah signature tee is worth every rupee -- the embroidery is proper work."', who:'Bilal S.', where:'Saddar, Hyderabad', init:'BS' },
  { stars:5, text:'"Finally a local brand with real quality. The oversized fit is exactly right and the colours are even better in person."', who:'Hamza K.', where:'Qasimabad, Hyderabad', init:'HK' },
];

const BLOG_POSTS = [
  { tag:'STYLE NOTES', title:'How to build a five-tee rotation that actually works', date:'12 Jul 2026',
    body:'A good week starts with fewer decisions, not more. Here is how we would build a five-tee week from the Qafla rail -- one heavyweight crew, one stripe, one oversized, one polo, one that surprises you.' },
  { tag:'FROM THE SHOP', title:'Why we weigh our cotton in GSM, not adjectives', date:'02 Jul 2026',
    body:'"Soft" and "premium" mean nothing on a label. Grams per square metre tell you exactly what you are paying for -- and why a 220 GSM tee outlasts a 160 GSM one, wash after wash.' },
  { tag:'CARE GUIDE', title:'The three-minute wash routine that keeps colour true', date:'19 Jun 2026',
    body:'Cold water, inside out, low tumble. That is the whole secret. A short walkthrough of the habits that keep our garment-dyed pieces looking new for years, not months.' },
  { tag:'CARAVAN STORIES', title:'Why we named the shop after a caravan', date:'05 Jun 2026',
    body:'قافلة -- Qafla -- means caravan: a group that moves together, trading and travelling. A short note on the name, the neighbourhood, and the philosophy behind Shop 02.' },
];

const FAQS = [
  { q:'Do you deliver outside Hyderabad?', a:'Yes -- we ship across Pakistan with cash on delivery available nationwide. Orders placed in Hyderabad are usually delivered same-day or next-day; other cities typically take 2-5 working days.' },
  { q:'What sizes do you stock?', a:'Most styles run S to XXL. Each product page shows live stock per size and a size chart with chest, length and sleeve measurements -- tap "Size chart" on any product to check before you order.' },
  { q:'Can I pay online, or is it cash only?', a:'We accept Cash on Delivery, bank transfer, EasyPaisa and JazzCash. Bank and wallet details are shared at checkout once you place your order.' },
  { q:'What is your exchange policy?', a:'We offer size exchanges within 3 days of delivery, provided the item is unworn, unwashed and has its original tags attached. Call or WhatsApp us on +92 315 3755007 to arrange a swap.' },
  { q:'Are refunds available?', a:'We primarily offer exchanges rather than cash refunds. See our Refund Policy page for the full details on eligibility and how to start a request.' },
  { q:'How do I know if a size will fit me?', a:'Every product includes a detailed size chart under "Size chart". If you are between sizes, call us on +92 315 3755007 -- we know our fits well and are happy to advise before you order.' },
  { q:'Can I visit and try things on in person?', a:'Of course -- we would love to see you. The store is at Shop No. 02, Shaheen Arcade, Latifabad Unit No. 8, Hyderabad, open daily 11:00 AM - 10:00 PM.' },
];

function infoHead(wp, title, sub){
  return `<section class="page-hero"><div class="wrap">
    <div class="wp">${esc(wp)}</div>
    <h2 class="sec-title">${title}</h2>
    ${sub ? `<p class="sec-sub">${esc(sub)}</p>` : ''}
  </div></section>`;
}

function renderInfoPage(slug){
  if (slug === 'blog'){
    return `
    ${infoHead('THE JOURNAL', 'From the <em>shop</em>', 'Notes on fabric, fit and the caravan behind Qafla.')}
    <section class="section" style="padding-top:0"><div class="wrap info-wrap" style="max-width:1000px">
      <div class="blog-grid">
        ${BLOG_POSTS.map(p => `
        <article class="blog-card">
          <div class="wp">${esc(p.tag)} · ${esc(p.date)}</div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.body)}</p>
        </article>`).join('')}
      </div>
    </div></section>`;
  }

  if (slug === 'faqs'){
    return `
    ${infoHead('BEFORE YOU ASK', 'Frequently asked <em>questions</em>', 'Everything we get asked most -- ordering, sizing, delivery and care.')}
    <section class="section" style="padding-top:0"><div class="wrap info-wrap">
      <div class="faq-list">
        ${FAQS.map((f,i) => `
        <div class="faq-item${i===0?' open':''}">
          <button class="faq-q" data-action="faq-toggle" type="button">
            ${esc(f.q)}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <div class="faq-a"><p>${esc(f.a)}</p></div>
        </div>`).join('')}
      </div>
      <p style="margin-top:1.8rem;font-size:.9rem;color:var(--ink-dim)">Still have a question? Call or WhatsApp <b>+92 315 3755007</b> and we'll help directly.</p>
    </div></section>`;
  }

  if (slug === 'about'){
    return `
    ${infoHead('OUR STORY', 'About <em>Qafla</em>', "قافلة -- the caravan that doesn't stop moving.")}
    <section class="section" style="padding-top:0"><div class="wrap info-wrap">
      <div class="prose">
        <p>Qafla Men's Wear opened its doors at Shaheen Arcade, Latifabad Unit No. 8, with a simple idea: menswear cut from honest cotton, priced fairly, and built to travel well through everyday life in Hyderabad.</p>
        <h3>Why "Qafla"</h3>
        <p>قافلة means caravan -- a group of traders who move together, carrying goods across long distances. We chose the name because that is exactly what good clothing should do: keep moving with you, wash after wash, season after season, without losing its shape or its colour.</p>
        <h3>What we make</h3>
        <p>Every tee, polo and shirt on our rail is chosen or made for weight, hand-feel and stitching -- combed and carded cottons weighing between 180 and 260 GSM, taped seams, and colours that are woven or garment-dyed rather than simply printed on.</p>
        <h3>Visit us</h3>
        <p>We are a real shop with a real address -- Shop No. 02, Shaheen Arcade, Latifabad Unit No. 8, Hyderabad, Sindh -- open daily from 11:00 AM to 10:00 PM. The owner answers the phone himself.</p>
      </div>
    </div></section>`;
  }

  if (slug === 'contact'){
    return `
    ${infoHead('GET IN TOUCH', 'Contact <em>us</em>', "Questions about an order, a size, or just want to say salaam? We're a call away.")}
    <section class="section" style="padding-top:0"><div class="wrap info-wrap">
      <div class="contact-grid">
        <div class="contact-card">
          <h4>Visit the store</h4>
          <div class="contact-line">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span><b>Shop No. 02, Shaheen Arcade</b><br />Latifabad Unit No. 8, Hyderabad, Sindh, Pakistan</span>
          </div>
          <div class="contact-line">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span><b>Open daily</b> · 11:00 AM - 10:00 PM</span>
          </div>
          <a class="btn btn--clay" href="https://www.google.com/maps/search/?api=1&query=Shaheen+Arcade+Latifabad+Unit+8+Hyderabad+Sindh" target="_blank" rel="noopener">Get directions</a>
        </div>
        <div class="contact-card">
          <h4>Call or message</h4>
          <div class="contact-line">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.9 2.2Z"/></svg>
            <span><b>+92 315 3755007</b><br />The owner picks up himself</span>
          </div>
          <div class="contact-line">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>
            <span><b>WhatsApp us</b><br />Fastest way to reach us for orders and sizing</span>
          </div>
          <a class="btn btn--solid" href="https://wa.me/923153755007" target="_blank" rel="noopener">WhatsApp now</a>
        </div>
      </div>
    </div></section>`;
  }

  if (slug === 'refund-policy'){
    return `
    ${infoHead('POLICIES', 'Refund <em>policy</em>')}
    <section class="section" style="padding-top:0"><div class="wrap info-wrap">
      <span class="info-updated">Last updated · July 2026</span>
      <div class="prose">
        <p>We want every Qafla piece you own to fit and feel right. If something isn't working out, here's how returns and exchanges work.</p>
        <h3>Exchanges</h3>
        <p>We accept size exchanges within <strong>3 days of delivery</strong>, provided the item is unworn, unwashed, and returned with its original tags attached. Contact us on WhatsApp or call <strong>+92 315 3755007</strong> to arrange a pickup or drop-off at the store.</p>
        <h3>Refunds</h3>
        <p>Because most orders are paid via Cash on Delivery, we generally offer store credit or a size exchange rather than a cash refund. Refunds to bank, EasyPaisa or JazzCash accounts are considered case-by-case for items that arrive damaged or incorrect.</p>
        <h3>Non-returnable items</h3>
        <ul>
          <li>Items marked as final sale at checkout</li>
          <li>Worn, washed or altered garments</li>
          <li>Items without their original tags</li>
        </ul>
        <h3>Damaged or incorrect items</h3>
        <p>If your order arrives damaged or you receive the wrong item, contact us within 48 hours of delivery with a photo and your order details, and we'll sort it out at no extra cost to you.</p>
      </div>
    </div></section>`;
  }

  if (slug === 'privacy-policy'){
    return `
    ${infoHead('POLICIES', 'Privacy <em>policy</em>')}
    <section class="section" style="padding-top:0"><div class="wrap info-wrap">
      <span class="info-updated">Last updated · July 2026</span>
      <div class="prose">
        <p>This policy explains what information Qafla Men's Wear collects when you shop with us, and how we use it.</p>
        <h3>What we collect</h3>
        <p>When you place an order or join our WhatsApp list, we collect your name, phone number, delivery address, and the details of what you've ordered. We do not collect payment card information -- Cash on Delivery, bank transfer, EasyPaisa and JazzCash payments are handled directly between you and the relevant service.</p>
        <h3>How we use it</h3>
        <ul>
          <li>To process, pack and deliver your order</li>
          <li>To contact you about your order status by phone or WhatsApp</li>
          <li>To send occasional updates on new arrivals and offers, only if you've opted in</li>
        </ul>
        <h3>Sharing</h3>
        <p>We share your delivery details only with the courier fulfilling your order. We do not sell or rent your information to third parties.</p>
        <h3>Your choices</h3>
        <p>You can ask to be removed from our WhatsApp list, or request that we delete your order history, at any time by calling or messaging <strong>+92 315 3755007</strong>.</p>
      </div>
    </div></section>`;
  }

  if (slug === 'shipping-policy'){
    return `
    ${infoHead('POLICIES', 'Shipping <em>policy</em>')}
    <section class="section" style="padding-top:0"><div class="wrap info-wrap">
      <span class="info-updated">Last updated · July 2026</span>
      <div class="prose">
        <p>We ship across Pakistan and hand-deliver locally in Hyderabad. Here's what to expect after you order.</p>
        <h3>Delivery times</h3>
        <ul>
          <li><strong>Hyderabad city:</strong> same-day or next-day delivery on most orders</li>
          <li><strong>Rest of Sindh:</strong> 1-3 working days</li>
          <li><strong>Rest of Pakistan:</strong> 2-5 working days via our courier partners</li>
        </ul>
        <h3>Delivery charges</h3>
        <p>Delivery fees are calculated by location and shown at checkout before you confirm your order. We occasionally run free-delivery promotions -- watch the top banner and our WhatsApp group for these.</p>
        <h3>Cash on Delivery</h3>
        <p>Cash on Delivery is available nationwide. Please have the exact amount ready for the courier where possible.</p>
        <h3>Tracking your order</h3>
        <p>Once your order ships, we'll message you the courier and tracking details on WhatsApp. For any delivery questions, call <strong>+92 315 3755007</strong>.</p>
      </div>
    </div></section>`;
  }

  if (slug === 'terms-of-service'){
    return `
    ${infoHead('POLICIES', 'Terms of <em>service</em>')}
    <section class="section" style="padding-top:0"><div class="wrap info-wrap">
      <span class="info-updated">Last updated · July 2026</span>
      <div class="prose">
        <p>By ordering from Qafla Men's Wear, either in-store or through this website, you agree to the following terms.</p>
        <h3>Orders and pricing</h3>
        <p>All prices are listed in Pakistani Rupees (PKR) and include applicable taxes unless stated otherwise. We reserve the right to correct pricing errors and to limit order quantities on any item.</p>
        <h3>Product availability</h3>
        <p>Stock levels shown on the site are updated regularly but are not guaranteed in real time. If an item you've ordered is out of stock, we'll contact you to offer an alternative, a size swap, or a full refund of any advance paid.</p>
        <h3>Payment</h3>
        <p>We accept Cash on Delivery, bank transfer, EasyPaisa and JazzCash. Orders paid by bank or wallet transfer are confirmed once payment is received.</p>
        <h3>Use of this site</h3>
        <p>Product photography, text and the Qafla name and logo are the property of Qafla Men's Wear and may not be reproduced without permission.</p>
        <h3>Contact</h3>
        <p>Questions about these terms can be directed to <strong>+92 315 3755007</strong> or in person at Shop No. 02, Shaheen Arcade, Latifabad Unit No. 8, Hyderabad.</p>
      </div>
    </div></section>`;
  }

  return infoHead('', 'Page not found');
}

function renderDrawer(){
  const body = $('#drawer-body'), foot = $('#drawer-foot');
  updateCartCount();
  if (!state.cart.length){
    body.innerHTML = `<div class="drawer-empty"><span class="serif">Your bag is empty.</span>The caravan waits -- go pick something.<br /><br /><a class="link-arrow" href="#/shop" data-action="close-cart-link">Browse the collection →</a></div>`;
    foot.innerHTML = '';
    return;
  }
  body.innerHTML = state.cart.map((i, idx) => {
    const p = findProduct(i.id); if (!p) return '';
    return `<div class="cart-item">
      <img src="${prodImgs(p)[0]}" alt="${esc(p.title)}" />
      <div class="ci-info">
        <div class="ci-title">${esc(p.title)}</div>
        <div class="ci-meta">${esc(p.id)} · SIZE ${esc(i.size)}</div>
        <div class="ci-row">
          <div class="qty">
            <button data-action="qty" data-idx="${idx}" data-d="-1" aria-label="Decrease">−</button>
            <span>${i.qty}</span>
            <button data-action="qty" data-idx="${idx}" data-d="1" aria-label="Increase">+</button>
          </div>
          <span class="ci-price">${fmt(p.price * i.qty)}</span>
        </div>
      </div>
      <button class="ci-remove" data-action="remove" data-idx="${idx}" aria-label="Remove item">
        <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`;
  }).join('');
  foot.innerHTML = `
    <div class="df-row total"><span>Subtotal</span><span>${fmt(cartTotal())}</span></div>
    <button class="btn btn--solid wfull" data-action="checkout">Checkout</button>
    <div class="df-note">Free delivery in Hyderabad · Nationwide COD available</div>`;
}

function openModal(html, narrow){
  const box = $('#modal-box');
  box.className = 'modal' + (narrow ? ' modal--narrow' : '');
  box.innerHTML = `<button class="modal-x" data-action="close-modal" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>` + html;
  $('#modal-scrim').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeModal(){
  $('#modal-scrim').classList.remove('show');
  document.body.style.overflow = '';
  state.modal = null;
}

const AUTH_ICONS = {
  google: `<svg viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.4l6.5-6.5C35.3 2.5 30 0 24 0 14.6 0 6.5 5.4 2.5 13.2l7.6 5.9C12 13 17.5 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.6H24v9h12.6c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7C43.6 37.6 46.5 31.6 46.5 24.5Z"/><path fill="#FBBC05" d="M10.1 19.1a14.5 14.5 0 0 0 0 9.8l-7.6 5.9a24 24 0 0 1 0-21.6l7.6 5.9Z"/><path fill="#34A853" d="M24 48c6 0 11.3-2 15-5.4l-7.3-5.7c-2 1.4-4.6 2.2-7.7 2.2-6.5 0-12-4.4-14-10.3l-7.6 5.9C6.5 42.6 14.6 48 24 48Z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2"><path d="M24 12.07C24 5.4 18.6 0 12 0S0 5.4 0 12.07c0 6 4.4 11 10.1 11.9v-8.4H7v-3.5h3.1V9.4c0-3.1 1.8-4.8 4.6-4.8 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 1-2 1.9v2.3h3.4l-.5 3.5h-2.9V24C19.6 23.1 24 18 24 12.07Z"/></svg>`,
};

function renderAuthModal(){
  const a = state.auth;
  if (a.session){
    const initials = a.session.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
    return `
    <div class="auth-wrap">
      <div class="auth-avatar">${a.session.avatar ? `<img src="${esc(a.session.avatar)}" alt="" />` : esc(initials)}</div>
      <h3>Hi, ${esc(a.session.name.split(' ')[0])}</h3>
      <p>Signed in with ${esc(a.session.provider === 'email' ? 'email' : a.session.provider)} as <b>${esc(a.session.email)}</b>.</p>
      <a class="btn btn--ghost-dark wfull" href="#/shop">Continue shopping</a>
      <button class="btn btn--clay wfull" data-action="auth-signout" style="margin-top:.7rem">Sign out</button>
    </div>`;
  }

  const isUp = a.view === 'signup';
  const err = a.err ? `<div class="err">${gateIcon('warn')}<span>${esc(a.err)}</span></div>` : '';
  return `
  <div class="auth-wrap">
    ${gateIcon('lock')}
    <h3>${isUp ? 'Create your account' : 'Sign in'}</h3>
    <p>${isUp ? 'Save your details for faster checkout next time.' : 'Sign in to check out faster and track your orders.'}</p>
    <div class="auth-social">
      <button class="oauth-btn oauth-btn--google" data-action="auth-google" type="button">${AUTH_ICONS.google}Continue with Google</button>
      <button class="oauth-btn oauth-btn--facebook" data-action="auth-facebook" type="button">${AUTH_ICONS.facebook}Continue with Facebook</button>
    </div>
    <div class="auth-divider"><span>or continue with email</span></div>
    <form data-action="${isUp ? 'auth-signup' : 'auth-signin'}" class="gate-form-col">
      ${isUp ? `<input type="text" id="auth-name" placeholder="Full name" autocomplete="name" required />` : ''}
      <input type="email" id="auth-email" placeholder="Email address" autocomplete="email" required />
      <div class="pass-field">
        <input type="${a.showPass ? 'text' : 'password'}" id="auth-pass" placeholder="Password" autocomplete="${isUp ? 'new-password' : 'current-password'}" minlength="4" required />
        <button type="button" class="pass-eye" data-action="auth-toggle-pass" aria-label="Show password">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
      ${isUp ? `<input type="${a.showPass ? 'text' : 'password'}" id="auth-pass2" placeholder="Confirm password" autocomplete="new-password" minlength="4" required />` : ''}
      <button class="btn btn--solid" type="submit">${isUp ? 'Create account' : 'Sign in'}</button>
    </form>
    ${err}
    <a class="gate-link" href="#" data-action="auth-switch">${isUp ? 'Already have an account? Sign in' : "New here? Create an account"}</a>
    ${!isUp ? `<a class="gate-link" href="https://wa.me/923153755007?text=${encodeURIComponent("Hi, I'm having trouble signing in to my Qafla account")}" target="_blank" rel="noopener" style="display:block;margin-top:.4rem">Trouble signing in? Message us on WhatsApp</a>` : ''}
  </div>`;
}

function openAuthModal(){
  state.auth.view = 'signin'; state.auth.err = ''; state.auth.showPass = false;
  state.modal = { type:'auth' };
  openModal(renderAuthModal(), true);
}

function refreshAuthModal(){ openModal(renderAuthModal(), true); }

function completeSocialSignIn({ name, email, provider, avatar }){
  if (!email){ toast('Could not read an email from ' + provider + ' -- try email sign-in instead'); return; }
  let list = getCustomers();
  let cust = findCustomer(email);
  if (!cust){
    cust = { id:'C-' + Date.now().toString(36), name: name || email.split('@')[0], email, provider, avatar: avatar || '', joined: new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) };
    list.unshift(cust); saveCustomers(list);
  }
  state.auth.session = { name: cust.name, email: cust.email, provider: cust.provider, avatar: cust.avatar || '' };
  persistSession();
  toast('Welcome, ' + cust.name.split(' ')[0] + '!');
  closeModal();
  updateAccountUI();
}

function decodeJwt(token){
  try {
    const base = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const json = decodeURIComponent(atob(base).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2,'0')).join(''));
    return JSON.parse(json);
  } catch(e){ return null; }
}

function ensureGoogleSDK(cb){
  if (window.google && window.google.accounts && window.google.accounts.id) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
  s.onload = cb; s.onerror = () => toast('Could not load Google sign-in -- check your connection');
  document.head.appendChild(s);
}

function googleSignIn(){
  if (!GOOGLE_CLIENT_ID){ toast('Google sign-in needs a Client ID -- add GOOGLE_CLIENT_ID in script.js'); return; }
  ensureGoogleSDK(() => {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: resp => {
        const payload = decodeJwt(resp.credential);
        if (!payload){ toast('Google sign-in failed -- please try again'); return; }
        completeSocialSignIn({ name: payload.name, email: payload.email, provider:'google', avatar: payload.picture });
      },
    });
    window.google.accounts.id.prompt();
  });
}

function ensureFacebookSDK(cb){
  if (window.FB){ cb(); return; }
  window.fbAsyncInit = function(){
    window.FB.init({ appId: FACEBOOK_APP_ID, cookie:true, xfbml:false, version:'v19.0' });
    cb();
  };
  const s = document.createElement('script');
  s.src = 'https://connect.facebook.net/en_US/sdk.js'; s.async = true; s.defer = true;
  s.onerror = () => toast('Could not load Facebook sign-in -- check your connection');
  document.head.appendChild(s);
}

function facebookSignIn(){
  if (!FACEBOOK_APP_ID){ toast('Facebook sign-in needs an App ID -- add FACEBOOK_APP_ID in script.js'); return; }
  ensureFacebookSDK(() => {
    window.FB.login(resp => {
      if (resp.authResponse){
        window.FB.api('/me', { fields:'name,email,picture' }, data => {
          completeSocialSignIn({ name: data.name, email: data.email || '', provider:'facebook', avatar: data.picture && data.picture.data && data.picture.data.url });
        });
      } else {
        toast('Facebook sign-in was cancelled');
      }
    }, { scope:'public_profile,email' });
  });
}

function updateAccountUI(){
  const btn = $('#nav-account'); if (!btn) return;
  const s = state.auth.session;
  if (s){
    const initials = s.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
    btn.classList.add('has-session');
    btn.innerHTML = s.avatar ? `<img src="${esc(s.avatar)}" alt="" />` : `<span>${esc(initials)}</span>`;
    btn.setAttribute('aria-label', 'Account -- ' + s.name);
  } else {
    btn.classList.remove('has-session');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.6-3.6 4.6-5.5 7.5-5.5s5.9 1.9 7.5 5.5"/></svg>`;
    btn.setAttribute('aria-label', 'Sign in');
  }
}

function openProduct(id, imgIdx = 0){
  const p = findProduct(id); if (!p) return;
  state.modal = { type:'product', id };
  state.pm = { size:null, qty:1, img:imgIdx };
  renderProductModal(p);
}

function renderProductModal(p){
  const imgs = prodImgs(p);
  const cur = Math.min(state.pm.img, imgs.length - 1);
  const onSale = p.compareAt && p.compareAt > p.price;
  const save = onSale ? Math.round((1 - p.price / p.compareAt) * 100) : 0;
  const stock = totalStock(p);
  openModal(`
  <div class="pm">
    <div class="pm-gallery">
      <div class="pm-main">
        <img src="${imgs[cur]}" alt="${esc(p.title)}" />
        <div class="pm-tint" style="background:${esc(p.colorway.hex)}"></div>
      </div>
      <div class="pm-thumbs">
        ${imgs.map((u,i) => `<img src="${u}" class="${i === cur ? 'on' : ''}" data-action="pm-thumb" data-i="${i}" alt="View ${i+1}" />`).join('')}
      </div>
    </div>
    <div class="pm-info">
      <div class="pm-code">${esc(p.id)} · ${esc(p.cat).toUpperCase()} · ${esc(p.colorway.name).toUpperCase()}</div>
      <h3 class="pm-title">${esc(p.title)}</h3>
      <div class="pm-sub">${esc(p.sub)}</div>
      <div class="pm-price">
        <span class="price">${fmt(p.price)}</span>
        ${onSale ? `<span class="price-old">${fmt(p.compareAt)}</span><span class="save">SAVE ${save}%</span>` : ''}
      </div>
      <p class="pm-desc">${esc(p.desc)}</p>
      <div class="pm-sec">
        <div class="pm-label"><span>Colourway</span></div>
        <div class="colorway"><span class="dot" style="background:${esc(p.colorway.hex)}"></span>${esc(p.colorway.name)}</div>
      </div>
      <div class="pm-sec">
        <div class="pm-label"><span>Select size</span><span class="chart-link" data-action="open-chart" data-id="${esc(p.id)}">Size chart</span></div>
        <div class="sizes">
          ${Object.entries(p.sizes).map(([s,n]) => n > 0
            ? `<button class="size ${state.pm.size === s ? 'on' : ''}" data-action="pm-size" data-v="${esc(s)}">${esc(s)}${n <= 3 ? `<small>${n} left</small>` : ''}</button>`
            : `<button class="size" disabled>${esc(s)}<small>sold out</small></button>`).join('')}
        </div>
      </div>
      <div class="pm-actions">
        <div class="qty" style="border-radius:99px">
          <button data-action="pm-qty" data-d="-1">−</button><span>${state.pm.qty}</span><button data-action="pm-qty" data-d="1">+</button>
        </div>
        <button class="btn ${stock ? 'btn--solid' : 'btn--ghost-dark'}" data-action="pm-add" ${stock ? '' : 'disabled'}>${stock ? 'Add to bag' : 'Sold out'}</button>
      </div>
      <div class="pm-meta">
        <div><b>Fabric</b><span>${esc(p.fabric)}</span></div>
        <div><b>Care</b><span>${esc(p.care)}</span></div>
        <div><b>Delivery</b><span>Cash on delivery · free in Hyderabad</span></div>
      </div>
    </div>
  </div>`);
}

function openChart(id){
  const p = findProduct(id); if (!p) return;
  openModal(`
  <div class="chart-box">
    <h3>Size chart</h3>
    <p>${esc(p.title)} · measurements in inches, garment laid flat. Between sizes? We recommend sizing up.</p>
    <table class="chart-table">
      <thead><tr><th>Size</th><th>Chest</th><th>Length</th><th>Sleeve</th></tr></thead>
      <tbody>${(p.chart || DEFAULT_CHART).map(r => `<tr><td><b>${esc(r.size)}</b></td><td>${esc(r.chest)}"</td><td>${esc(r.length)}"</td><td>${esc(r.sleeve)}"</td></tr>`).join('')}</tbody>
    </table>
    <p class="chart-note">Still unsure? WhatsApp <b>+92 315 3755007</b> with your height and usual fit -- we'll tell you exactly what to take.</p>
  </div>`, true);
}

const PAY_ICONS = {
  cash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 8v0M18 16v0"/></svg>`,
  bank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 10.5 12 4l9 6.5"/><path d="M5 10.5V19M9.5 10.5V19M14.5 10.5V19M19 10.5V19"/><path d="M3 19h18"/></svg>`,
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 10h19"/></svg>`,
};
const PAY_METHODS = [
  { id:'cod', label:'Cash on delivery', sub:'Pay when it arrives', icon:'cash' },
  { id:'easypaisa', label:'EasyPaisa', sub:'Mobile wallet transfer', brand:'easypaisa' },
  { id:'jazzcash', label:'JazzCash', sub:'Mobile wallet transfer', brand:'jazzcash' },
  { id:'bank', label:'Bank transfer', sub:'Direct to our account', icon:'bank' },
  { id:'card', label:'Debit / credit card', sub:'Coming soon', icon:'card', disabled:true },
];
function needsRef(method){ return method === 'easypaisa' || method === 'jazzcash' || method === 'bank'; }

function payMethodPanel(method){
  if (method === 'cod'){
    return `<div class="pay-info"><p>Pay in cash when your order reaches your door. We'll call to confirm before we dispatch it.</p></div>`;
  }
  if (method === 'easypaisa' || method === 'jazzcash'){
    const num = method === 'easypaisa' ? EASYPAISA_NUMBER : JAZZCASH_NUMBER;
    const name = method === 'easypaisa' ? 'EasyPaisa' : 'JazzCash';
    const brandMark = method === 'easypaisa' ? 'easy<b>paisa</b>' : '<b>Jazz</b>Cash';
    const amount = fmt(cartTotal());
    return `
    <div class="pay-info">
      <span class="pay-brand pay-brand--${method} pay-brand--lg">${brandMark}</span>
      <p>Send <b>${amount}</b> to our ${name} account below, then enter the transaction ID (or the number you sent from) so we can confirm it.</p>
      <div class="pay-num">
        <span class="mono">${esc(num)}</span>
        <button type="button" class="mini-btn" data-action="copy-pay-num" data-num="${esc(num.replace(/\s/g,''))}">Copy number</button>
      </div>
      <div class="pay-num">
        <span class="mono">${amount}</span>
        <button type="button" class="mini-btn" data-action="copy-pay-num" data-num="${esc(String(cartTotal()))}">Copy amount</button>
      </div>
      <div class="field">
        <label>${name} transaction ID / sender number *</label>
        <input name="paymentRef" required placeholder="e.g. TXN12345678 or 03XX XXXXXXX" />
      </div>
    </div>`;
  }
  if (method === 'bank'){
    const placeholder = BANK_DETAILS.account.startsWith('Add your');
    if (placeholder){
      return `<div class="pay-info">
        <p>Bank transfer details aren't set up on the site yet -- message us on WhatsApp and we'll send you the account details directly.</p>
        <a class="btn btn--ghost-dark wfull" href="https://wa.me/923153755007?text=${encodeURIComponent('Hi, I want to pay by bank transfer for my order -- please send account details.')}" target="_blank" rel="noopener">Ask on WhatsApp</a>
        <div class="field" style="margin-top:1rem"><label>Bank reference (once you have it) *</label><input name="paymentRef" required placeholder="Transaction reference" /></div>
      </div>`;
    }
    return `
    <div class="pay-info">
      <p>Transfer the total amount to the account below, then enter your transfer reference so we can confirm it.</p>
      <div class="pay-bank">
        <div><span>Bank</span><b>${esc(BANK_DETAILS.bank)}</b></div>
        <div><span>Account title</span><b>${esc(BANK_DETAILS.title)}</b></div>
        <div><span>Account / IBAN</span><b class="mono">${esc(BANK_DETAILS.account)}</b></div>
      </div>
      <div class="field"><label>Transfer reference *</label><input name="paymentRef" required placeholder="Bank reference / last 4 digits" /></div>
    </div>`;
  }
  return '';
}

function payMethodsGrid(active){
  return `<div class="pay-grid">
    ${PAY_METHODS.map(m => `
    <button type="button" class="pay-card ${active === m.id ? 'on' : ''} ${m.disabled ? 'disabled' : ''}" data-action="${m.disabled ? 'pay-soon' : 'co-method'}" data-v="${m.id}">
      ${m.brand ? `<span class="pay-brand pay-brand--${m.brand}">${m.brand === 'easypaisa' ? 'easy<b>paisa</b>' : '<b>Jazz</b>Cash'}</span>` : `<span class="pay-icon">${PAY_ICONS[m.icon]}</span>`}
      <span class="pay-text"><b>${esc(m.label)}</b><small>${esc(m.sub)}</small></span>
      ${m.disabled ? `<span class="pay-soon-tag">Soon</span>` : ''}
    </button>`).join('')}
  </div>
  <div class="pay-network-badges">
    <span class="card-chip card-chip--visa">VISA</span>
    <span class="card-chip card-chip--mc"><i></i><i></i></span>
    <span class="card-chip card-chip--upay">UnionPay</span>
  </div>`;
}

function renderCheckoutModal(){
  const method = state.checkout.method;
  return `
  <div class="co">
    <h3>Checkout</h3>
    <p class="co-sub">Choose how you'd like to pay -- we'll confirm your order right after.</p>
    <form data-action="place-order">
      <div class="co-grid">
        <div class="field"><label>Full name *</label><input name="name" required placeholder="e.g. Ali Raza" /></div>
        <div class="field"><label>Phone *</label><input name="phone" required placeholder="03XX XXXXXXX" pattern="[0-9+\-\s]{10,15}" /></div>
        <div class="field field--full"><label>Delivery address *</label><textarea name="address" required placeholder="House, street, area"></textarea></div>
        <div class="field"><label>City *</label><input name="city" required placeholder="Hyderabad" value="Hyderabad" /></div>
        <div class="field"><label>Order notes</label><input name="notes" placeholder="Optional" /></div>
      </div>
      <div class="co-pay">
        <label class="co-pay-label">Payment method</label>
        ${payMethodsGrid(method)}
        <input type="hidden" name="payment" value="${esc(method)}" />
        ${payMethodPanel(method)}
      </div>
      <div class="co-summary">
        ${state.cart.map(i => { const p = findProduct(i.id); return `<div class="row"><span>${esc(p.title)} · ${esc(i.size)} × ${i.qty}</span><span>${fmt(p.price * i.qty)}</span></div>`; }).join('')}
        <div class="row"><span>Delivery</span><span>FREE (Hyderabad)</span></div>
        <div class="row total"><span>Total</span><span>${fmt(cartTotal())}</span></div>
      </div>
      <button class="btn btn--solid wfull" type="submit">Place order · ${fmt(cartTotal())}</button>
    </form>
  </div>`;
}

function openCheckout(){
  if (!state.cart.length) return;
  state.modal = { type:'checkout' };
  state.checkout = { method:'cod' };
  openModal(renderCheckoutModal(), true);
}

async function placeOrder(fd){
  console.log('=== PLACE ORDER STARTED ===');
  const method = fd.get('payment') || 'cod';
  const payLabel = (PAY_METHODS.find(m => m.id === method) || {}).label || 'Cash on delivery';
  const order = {
    id: 'QO-' + String(Date.now()).slice(-6),
    date: new Date().toLocaleString('en-PK', { dateStyle:'medium', timeStyle:'short' }),
    customer: { name: fd.get('name'), phone: fd.get('phone'), address: fd.get('address'), city: fd.get('city'), notes: fd.get('notes') || '' },
    items: state.cart.map(i => { const p = findProduct(i.id); return { id:i.id, title:p.title, size:i.size, qty:i.qty, price:p.price }; }),
    total: cartTotal(),
    payment: { method, label: payLabel, ref: fd.get('paymentRef') || '', status: method === 'cod' ? 'Pay on delivery' : 'Pending verification' },
  };

  console.log('Order object:', order);

  // Update stock locally first
  order.items.forEach(it => { const p = findProduct(it.id); if (p) p.sizes[it.size] = Math.max(0, Number(p.sizes[it.size]) - it.qty); });

  // Save to Supabase
  console.log('Saving to Supabase...');
  try {
    const saved = await saveOrderToSupabase(order);
    console.log('Supabase save result:', saved);
    if (saved) {
      console.log('Order saved to Supabase, updating stock...');
      // Also update product stock in Supabase
      for (const it of order.items) {
        const p = findProduct(it.id);
        if (p) {
          const { error } = await supabase.from('products').update({ sizes: p.sizes }).eq('id', p.id);
          if (error) console.error('Stock update error for', p.id, error);
        }
      }
      console.log('Stock updated');
    } else {
      console.error('Failed to save order to Supabase');
      toast('Order saved locally but cloud sync failed');
    }
  } catch (err) {
    console.error('Supabase error:', err);
    toast('Cloud save failed -- order saved locally');
  }

  state.orders.unshift(order);
  state.cart = [];
  persistCart(); renderDrawer();

  const payCopy = method === 'cod'
    ? `We'll call <b>${esc(order.customer.phone)}</b> shortly to confirm, then dispatch. Pay in cash when it arrives.`
    : `We're verifying your ${esc(payLabel)} payment (ref: <b>${esc(order.payment.ref)}</b>) -- you'll get a confirmation call on <b>${esc(order.customer.phone)}</b> shortly.`;
  const ownerMsgLines = [
    `New order ${order.id}`,
    `${order.customer.name} · ${order.customer.phone}`,
    `${order.customer.address}, ${order.customer.city}`,
    ``,
    ...order.items.map(it => `${it.title} (${it.size}) x${it.qty} -- ${fmt(it.price * it.qty)}`),
    ``,
    `Total: ${fmt(order.total)}`,
    `Payment: ${payLabel}${order.payment.ref ? ' -- ref: ' + order.payment.ref : ''}`,
    order.customer.notes ? `Notes: ${order.customer.notes}` : '',
  ].filter(Boolean).join('\n');
  const ownerWaUrl = `https://wa.me/923153755007?text=${encodeURIComponent(ownerMsgLines)}`;
  openModal(`
  <div class="co-success">
    <div class="seal-big">✓</div>
    <h3>Shukriya, ${esc(order.customer.name.split(' ')[0])}!</h3>
    <p>Your order is with us. ${payCopy}</p>
    <div class="order-id">ORDER ${order.id} · ${fmt(order.total)}</div><br />
    ${method !== 'cod' ? `<a class="btn btn--solid wfull" href="${ownerWaUrl}" target="_blank" rel="noopener" style="margin-bottom:.6rem">Send payment proof on WhatsApp</a>` : ''}
    <button class="btn ${method !== 'cod' ? 'btn--ghost-dark' : 'btn--solid'} wfull" data-action="close-modal">Continue shopping</button>
  </div>`, true);
  state.modal = { type:'success' };
  renderRoute(false);
  if (method !== 'cod'){
    const w = window.open(ownerWaUrl, '_blank', 'noopener');
    if (!w) { /* popup blocked */ }
  }
  console.log('=== PLACE ORDER COMPLETE ===');
}

let ADMIN_PASS = store.get(K.pass, 'Pakistan110');
const RECOVERY_PHONE = '0330 2741348';
const RECOVERY_WA = '923302741348';
const OTP_RESEND_MS = 45 * 1000;
const CATS = ['Tees','Oversized','Polos','Henleys','Shirts'];
const SIZES = ['S','M','L','XL','XXL'];

function maskPhone(p){
  const total = (p.match(/\d/g) || []).length;
  let seen = 0;
  return p.replace(/\d/g, d => { seen++; return seen > total - 3 ? d : '•'; });
}

function nextId(){
  const max = state.products.reduce((m,p) => { const n = /^QF-(\d+)$/.exec(p.id); return n ? Math.max(m, +n[1]) : m; }, 0);
  return 'QF-' + String(max + 1).padStart(2,'0');
}

function renderAdmin(){
  if (!state.admin.authed){
    const now = Date.now();
    if (state.admin.lockUntil && now < state.admin.lockUntil){
      return `<section class="admin-wrap"><div class="wrap">
        <div class="gate rv in">
          <span class="gate-icon gate-icon--warn">${GATE_ICONS.warn}</span>
          <h3>Owner's room locked</h3>
          <p>Too many wrong passcodes. For security, please wait before trying again.</p>
          <div class="lock-count mono" id="lock-count" data-until="${state.admin.lockUntil}">${fmtCountdown(state.admin.lockUntil - now)}</div>
        </div>
      </div></section>`;
    }
    return `<section class="admin-wrap"><div class="wrap">
      <div class="gate rv in">
        <span class="brand-seal">Q</span>
        ${renderGateBody()}
      </div>
    </div></section>`;
  }
  const tab = state.admin.tab;
  return `<section class="admin-wrap"><div class="wrap">
    <div class="admin-head">
      <div><div class="wp">OWNER'S ROOM</div><h2 class="sec-title">Admin <em>panel</em></h2></div>
      <div class="admin-tabs">
        <button class="atab ${tab==='products'?'on':''}" data-action="admin-tab" data-v="products">Products</button>
        <button class="atab ${tab==='form'?'on':''}" data-action="admin-new">＋ Add product</button>
        <button class="atab ${tab==='orders'?'on':''}" data-action="admin-tab" data-v="orders">Orders (${state.orders.length})</button>
        <button class="atab ${tab==='subs'?'on':''}" data-action="admin-tab" data-v="subs">WhatsApp subs (${state.subs.length})</button>
        <button class="atab" data-action="admin-logout">Log out</button>
      </div>
    </div>
    <div class="admin-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg> Catalogue, orders and subscribers are now synced to Supabase cloud. For staff logins, connect this panel to Supabase Auth.</div>
    ${tab === 'products' ? adminProducts() : tab === 'orders' ? adminOrders() : tab === 'subs' ? adminSubs() : adminForm()}
  </div></section>`;
}

const GATE_ICONS = {
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4.5" y="10.5" width="15" height="10" rx="2.4"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.2" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3 4.5 5.8v5.4c0 5 3.3 8.6 7.5 9.8 4.2-1.2 7.5-4.8 7.5-9.8V5.8L12 3Z"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L4 20l1.1-4.4A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/></svg>`,
  key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="8" cy="15" r="4"/><path d="M11 12 19 4M16 5.5 18 7.5M19 4v3.5h-3.5"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5 9.5 17 19 7"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>`,
};
function gateIcon(name){ return `<span class="gate-icon">${GATE_ICONS[name]}</span>`; }

function gateSteps(active){
  const steps = ['confirm','otp','newpass'];
  const i = steps.indexOf(active);
  return `<div class="gate-steps">${steps.map((s, idx) => `<span class="gs-dot ${idx < i ? 'done' : ''} ${idx === i ? 'on' : ''}"></span>`).join('')}</div>`;
}

function renderGateBody(){
  const r = state.admin.reset;
  const err = r.err ? `<div class="err">${gateIcon('warn')}<span>${esc(r.err)}</span></div>` : '';

  if (!r.step){
    return `
      ${gateIcon('lock')}
      <h3>Owner's room</h3>
      <p>Enter the admin passcode to manage products, stock and orders.</p>
      <form data-action="admin-login" class="gate-form-col">
        <div class="pass-field">
          <input type="${state.admin.reset.showPass ? 'text' : 'password'}" id="gate-pass" placeholder="Passcode" autocomplete="off" />
          <button type="button" class="pass-eye" data-action="gate-toggle-pass" aria-label="Show passcode">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <button class="btn btn--solid" type="submit">Enter the room</button>
      </form>
      <div class="err" id="gate-err"></div>
      <a class="gate-link" href="#" data-action="reset-forgot">Forgot passcode?</a>`;
  }

  if (r.step === 'confirm'){
    return `
      ${gateIcon('shield')}
      ${gateSteps('confirm')}
      <h3>Recover access</h3>
      <p>We'll message a one-time code to the WhatsApp number on file for this store:</p>
      <p class="gate-recovery-num mono">${esc(maskPhone(RECOVERY_PHONE))}</p>
      <form data-action="reset-send-otp" class="gate-form-col">
        <button class="btn btn--solid" type="submit">${gateIcon('chat')}Send code on WhatsApp</button>
      </form>
      ${err}
      <a class="gate-link" href="#" data-action="reset-cancel">Back to login</a>`;
  }

  if (r.step === 'otp'){
    const now = Date.now();
    const cooldown = Math.max(0, r.otpSentAt + OTP_RESEND_MS - now);
    return `
      ${gateIcon('chat')}
      ${gateSteps('otp')}
      <h3>Enter the code</h3>
      <p>We opened WhatsApp with your 6-digit code addressed to <b>${esc(maskPhone(RECOVERY_PHONE))}</b>. Hit send in WhatsApp, then copy the code back here.</p>
      <form data-action="reset-verify-otp" class="gate-form-col">
        <input type="text" class="otp-input mono" id="reset-otp-input" placeholder="• • • • • •" inputmode="numeric" maxlength="6" autocomplete="off" />
        <button class="btn btn--solid" type="submit">Verify code</button>
      </form>
      ${err}
      <div class="gate-resend" id="gate-resend" data-cooldown="${r.otpSentAt + OTP_RESEND_MS}">
        ${cooldown > 0
          ? `Didn't get it? Resend in <span class="mono" id="resend-count">${fmtCountdown(cooldown)}</span>`
          : `<a href="#" data-action="reset-send-otp">Resend the code on WhatsApp</a>`}
      </div>
      <a class="gate-link" href="#" data-action="reset-cancel">Back to login</a>`;
  }

  if (r.step === 'newpass'){
    return `
      ${gateIcon('key')}
      ${gateSteps('newpass')}
      <h3>Set a new passcode</h3>
      <p>Code verified. Choose a fresh passcode for the owner's room.</p>
      <form data-action="reset-set-pass" class="gate-form-col">
        <input type="password" id="reset-pass1" placeholder="New passcode" autocomplete="off" />
        <input type="password" id="reset-pass2" placeholder="Confirm new passcode" autocomplete="off" />
        <button class="btn btn--solid" type="submit">Save passcode</button>
      </form>
      ${err}
      <a class="gate-link" href="#" data-action="reset-cancel">Back to login</a>`;
  }

  if (r.step === 'done'){
    return `
      <span class="gate-icon gate-icon--ok">${GATE_ICONS.check}</span>
      <h3>Passcode updated</h3>
      <p>Your owner's room is secured with the new passcode. Log in below to continue.</p>
      <a class="btn btn--solid" href="#" data-action="reset-cancel">Back to login</a>`;
  }
}

function adminProducts(){
  const low = state.products.filter(p => { const t = totalStock(p); return t > 0 && t <= 8; }).length;
  const out = state.products.filter(p => totalStock(p) === 0).length;
  return `
  <div class="stat-grid">
    <div class="stat"><div class="n">${state.products.length}</div><div class="l">Products live</div></div>
    <div class="stat"><div class="n warn">${low}</div><div class="l">Low stock</div></div>
    <div class="stat"><div class="n warn">${out}</div><div class="l">Sold out</div></div>
    <div class="stat"><div class="n">${state.orders.length}</div><div class="l">Orders received</div></div>
    <div class="stat"><div class="n">${state.subs.length}</div><div class="l">WhatsApp subs</div></div>
  </div>
  <div class="table-wrap"><table class="atable">
    <thead><tr><th></th><th>Code</th><th>Product</th><th>Price (PKR)</th><th>Stock</th><th>Flags</th><th>Actions</th></tr></thead>
    <tbody>
      ${state.products.map(p => { const t = totalStock(p); return `<tr>
        <td><img src="${prodImgs(p)[0]}" alt="" /></td>
        <td class="c">${esc(p.id)}</td>
        <td><div class="t">${esc(p.title)}</div><div class="c">${esc(p.cat)} · ${esc(p.colorway.name)}</div></td>
        <td class="c">${fmt(p.price)}${p.compareAt > p.price ? ` <s style="color:var(--ink-dim)">${fmt(p.compareAt)}</s>` : ''}</td>
        <td><span class="stock-pill ${t <= 8 ? 'low' : ''}">${t} pcs</span></td>
        <td class="c">${[p.featured && 'FEATURED', p.isNew && 'NEW', p.compareAt > p.price && 'SALE'].filter(Boolean).join(' · ') || '--'}</td>
        <td><div class="row-actions">
          <button class="mini-btn" data-action="admin-edit" data-id="${esc(p.id)}">Edit</button>
          <button class="mini-btn danger" data-action="admin-del" data-id="${esc(p.id)}">Delete</button>
        </div></td>
      </tr>`; }).join('')}
    </tbody>
  </table></div>
  <div class="form-actions"><button class="btn btn--ghost-dark" data-action="admin-reset">Reset demo catalogue</button></div>`;
}

function adminOrders(){
  if (!state.orders.length) return `<div class="empty"><span class="serif">No orders yet.</span>Orders placed through the storefront checkout will appear here.</div>`;
  return state.orders.map(o => {
    const pay = o.payment || { label:'Cash on delivery', status:'Pay on delivery', ref:'' };
    return `
    <div class="order-card">
      <div class="oh">
        <span class="oid">${esc(o.id)}</span>
        <span class="pay-chip ${pay.status === 'Pending verification' ? 'pending' : ''}">${esc(pay.label)}${pay.ref ? ' · ' + esc(pay.ref) : ''} -- ${esc(pay.status)}</span>
        <span class="od">${esc(o.date)}</span>
      </div>
      <div class="items">
        <b>${esc(o.customer.name)}</b> · ${esc(o.customer.phone)} · ${esc(o.customer.address)}, ${esc(o.customer.city)}
        ${o.customer.notes ? `<br />Note: ${esc(o.customer.notes)}` : ''}<br />
        ${o.items.map(i => `${esc(i.title)} (${esc(i.size)}) × ${i.qty}`).join(' · ')}
      </div>
      <div class="tot">Total ${fmt(o.total)}</div>
    </div>`;
  }).join('') +
  `<div class="form-actions"><button class="btn btn--ghost-dark" data-action="orders-clear">Clear all orders</button></div>`;
}

function adminSubs(){
  if (!state.subs.length) return `<div class="empty"><span class="serif">No subscribers yet.</span>Phone numbers submitted through the "Join WhatsApp Group" form will appear here.</div>`;
  return `
  <div class="table-wrap"><table class="atable">
    <thead><tr><th>#</th><th>Phone number</th><th>Submitted</th></tr></thead>
    <tbody>
      ${state.subs.map((s,i) => `<tr>
        <td class="c">${state.subs.length - i}</td>
        <td class="t">${esc(s.phone)}</td>
        <td class="c">${esc(s.date)}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>
  <div class="form-actions">
    <button class="btn btn--ghost-dark" data-action="subs-copy">Copy all numbers</button>
    <button class="btn btn--ghost-dark" data-action="subs-clear">Clear all subscribers</button>
  </div>`;
}

function adminForm(){
  const p = state.admin.editing ? findProduct(state.admin.editing) : null;
  const v = (val) => esc(val ?? '');
  const imgs = p ? (p.imgs && p.imgs.length ? p.imgs : [p.img]).join('\n') : '';
  const chart = (p && p.chart && p.chart.length ? p.chart : DEFAULT_CHART).map(r => ({...r}));
  return `
  <form class="aform" data-action="admin-save">
    <h3>${p ? 'Edit -- ' + esc(p.title) : 'Add a new product'}</h3>
    <input type="hidden" name="pid" value="${p ? esc(p.id) : ''}" />
    <div class="fgrid">
      <div class="field"><label>Title *</label><input name="title" required value="${v(p && p.title)}" placeholder="e.g. Nomad Crew Tee" /></div>
      <div class="field"><label>Subtitle</label><input name="sub" value="${v(p && p.sub)}" placeholder="e.g. Heavyweight everyday crew" /></div>
      <div class="field field--full"><label>Description *</label><textarea name="desc" required placeholder="Fabric, fit and feel -- sell the story.">${v(p && p.desc)}</textarea></div>
      <div class="field"><label>Category</label><select name="cat">${CATS.map(c => `<option ${p && p.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Fabric</label><input name="fabric" value="${v(p && p.fabric)}" placeholder="100% combed cotton · 220 GSM" /></div>
      <div class="field field--full"><label>Care instructions</label><input name="care" value="${v(p && p.care) || CARE}" /></div>
      <div class="field"><label>Price (PKR) *</label><input name="price" required inputmode="numeric" value="${p ? p.price : ''}" placeholder="2450" /></div>
      <div class="field"><label>Compare-at price (PKR) -- 0 for none</label><input name="compareAt" inputmode="numeric" value="${p ? p.compareAt || 0 : 0}" /></div>
      <div class="fsec"><h4>Colourway</h4>
        <div class="color-row">
          <div class="field" style="flex:1"><label>Colour name</label><input name="cname" value="${v(p && p.colorway.name)}" placeholder="e.g. Qafla Maroon" /></div>
          <div class="field"><label>Swatch</label><input type="color" name="chex" value="${p ? esc(p.colorway.hex) : '#C9A99A'}" /></div>
        </div>
      </div>
      <div class="fsec"><h4>Product images *</h4>
        <div class="img-upload-row">
          <label class="btn btn--ghost-dark img-upload-btn" for="img-file-input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4M12 4 7 9M12 4l5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>
            Upload from device
          </label>
          <input type="file" id="img-file-input" accept="image/*" multiple style="display:none" />
          <span class="img-upload-hint">Pick photos from your gallery or camera -- or paste image URLs below, one per line</span>
        </div>
        <div class="field"><textarea name="images" id="images-textarea" required placeholder="1521572163474-6864f9cf17ab&#10;https://images.unsplash.com/photo-...">${v(imgs)}</textarea></div>
        <div class="img-upload-busy" id="img-upload-busy" hidden>Processing image...</div>
        <div class="img-thumbs" id="img-thumbs"></div>
      </div>
      <div class="fsec"><h4>Stock per size</h4>
        <div class="stock-grid">
          ${SIZES.map(s => `<div class="field"><label>${s}</label><input name="sz_${s}" inputmode="numeric" value="${p ? Number(p.sizes[s] || 0) : 10}" /></div>`).join('')}
        </div>
      </div>
      <div class="fsec"><h4>Size chart (inches)</h4>
        <table class="chart-edit"><thead><tr><th>Size</th><th>Chest</th><th>Length</th><th>Sleeve</th><th></th></tr></thead>
        <tbody id="chart-edit">
          ${chart.map(r => `<tr data-row>
            <td><input name="c_size" value="${esc(r.size)}" /></td>
            <td><input name="c_chest" value="${esc(r.chest)}" /></td>
            <td><input name="c_length" value="${esc(r.length)}" /></td>
            <td><input name="c_sleeve" value="${esc(r.sleeve)}" /></td>
            <td><button type="button" class="mini-btn danger" data-action="chart-del">✕</button></td>
          </tr>`).join('')}
        </tbody></table>
        <button type="button" class="mini-btn" data-action="chart-add">＋ Add row</button>
      </div>
      <div class="fsec"><h4>Flags</h4>
        <label class="check-line"><input type="checkbox" name="featured" ${p && p.featured ? 'checked' : ''} /> Featured (Customer favourites)</label>
        <label class="check-line"><input type="checkbox" name="isNew" ${!p || p.isNew ? 'checked' : ''} /> New arrival</label>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn--solid" type="submit">${p ? 'Save changes' : 'Add product'}</button>
      <button class="btn btn--ghost-dark" type="button" data-action="admin-cancel">Cancel</button>
    </div>
  </form>`;
}

function resolveAdminImgSrc(line){
  return isFullImgUrl(line) ? line : IMG(line);
}

function refreshImgThumbsUI(){
  const box = $('#img-thumbs'), ta = $('#images-textarea');
  if (!box || !ta) return;
  const lines = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
  box.innerHTML = lines.map((line, i) => `
    <div class="img-thumb">
      <img src="${esc(resolveAdminImgSrc(line))}" alt="" onerror="this.style.opacity=.25" />
      ${i === 0 ? '<span class="cover-tag">COVER</span>' : ''}
      <button type="button" class="rm" data-action="img-remove" data-i="${i}" aria-label="Remove image">✕</button>
    </div>`).join('');
}

function compressImageFile(file){
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith('image/')){ reject(new Error('Not an image')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        const max = 1200;
        let { width, height } = img;
        if (width > max || height > max){
          const scale = max / Math.max(width, height);
          width = Math.round(width * scale); height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleImgFileUpload(files){
  const ta = $('#images-textarea'), busy = $('#img-upload-busy');
  if (!ta || !files || !files.length) return;
  if (busy) busy.hidden = false;
  const added = [];
  for (const file of files){
    try { added.push(await compressImageFile(file)); }
    catch(e){ toast(`Couldn't add ${file.name || 'that photo'} -- try another`); }
  }
  if (added.length){
    const existing = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
    ta.value = existing.concat(added).join('\n');
    toast(added.length > 1 ? `${added.length} photos added` : 'Photo added');
  }
  if (busy) busy.hidden = true;
  refreshImgThumbsUI();
}

async function saveProduct(f){
  const fd = new FormData(f);
  const price = parseInt(String(fd.get('price')).replace(/[^\d]/g,''), 10);
  const compareAt = parseInt(String(fd.get('compareAt')).replace(/[^\d]/g,''), 10) || 0;
  if (!price || price <= 0){ toast('Enter a valid price in PKR'); return; }
  const imgLines = String(fd.get('images') || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (!imgLines.length){ toast('Add at least one image'); return; }
  const sizes = {}; SIZES.forEach(s => sizes[s] = Math.max(0, parseInt(String(fd.get('sz_' + s)).replace(/[^\d]/g,''), 10) || 0));
  const chart = $$('#chart-edit tr[data-row]').map(tr => ({
    size: tr.querySelector('[name=c_size]').value.trim(),
    chest: tr.querySelector('[name=c_chest]').value.trim(),
    length: tr.querySelector('[name=c_length]').value.trim(),
    sleeve: tr.querySelector('[name=c_sleeve]').value.trim(),
  })).filter(r => r.size);
  const pid = String(fd.get('pid') || '');
  const old = pid ? findProduct(pid) : null;
  const prod = {
    id: pid || nextId(),
    title: String(fd.get('title')).trim(),
    sub: String(fd.get('sub') || '').trim(),
    desc: String(fd.get('desc')).trim(),
    cat: String(fd.get('cat')),
    fabric: String(fd.get('fabric') || '').trim() || '100% cotton',
    care: String(fd.get('care') || CARE).trim(),
    price, compareAt,
    colorway: { name: String(fd.get('cname') || 'Standard').trim() || 'Standard', hex: String(fd.get('chex') || '#C9A99A') },
    img: imgLines[0], imgs: imgLines,
    isNew: !!fd.get('isNew'), featured: !!fd.get('featured'),
    sizes, chart: chart.length ? chart : DEFAULT_CHART.map(r => ({...r})),
  };

  // Save to Supabase
  const saved = await saveProductToSupabase(prod);
  if (!saved) return;

  if (old) Object.assign(old, prod); else state.products.unshift(prod);
  state.admin.tab = 'products'; state.admin.editing = null;
  toast(old ? 'Product updated' : 'Product added to the shop');
  renderRoute(false);
}

const INFO_ROUTES = ['blog','faqs','about','contact','refund-policy','privacy-policy','shipping-policy','terms-of-service'];
function currentRoute(){
  const h = location.hash || '#/';
  if (h.startsWith('#/admin')) return 'admin';
  if (h.startsWith('#/shop')) return 'shop';
  for (const slug of INFO_ROUTES){ if (h.startsWith('#/' + slug)) return slug; }
  return 'home';
}

let revealObserver = null;
function initReveals(){
  if (revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting){ en.target.classList.add('in'); revealObserver.unobserve(en.target); } });
  }, { threshold: .12 });
  $$('.rv').forEach(el => revealObserver.observe(el));
}

function fmtCountdown(ms){
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
let lockTimer = null;
function initLockCountdown(){
  if (lockTimer){ clearInterval(lockTimer); lockTimer = null; }
  const el = $('#lock-count'); if (!el) return;
  const until = +el.dataset.until;
  lockTimer = setInterval(() => {
    const remain = until - Date.now();
    if (remain <= 0){
      clearInterval(lockTimer); lockTimer = null;
      state.admin.lockUntil = 0; state.admin.attempts = 0; persistLoginLock();
      renderRoute(false);
    } else {
      el.textContent = fmtCountdown(remain);
    }
  }, 250);
}

let resendTimer = null;
function initResendCountdown(){
  if (resendTimer){ clearInterval(resendTimer); resendTimer = null; }
  const wrap = $('#gate-resend'); if (!wrap) return;
  const until = +wrap.dataset.cooldown;
  resendTimer = setInterval(() => {
    const remain = until - Date.now();
    const cEl = $('#resend-count');
    if (remain <= 0){
      clearInterval(resendTimer); resendTimer = null;
      if (state.admin.reset.step === 'otp') renderRoute(false);
    } else if (cEl){
      cEl.textContent = fmtCountdown(remain);
    }
  }, 250);
}

function renderRoute(scroll = true){
  const r = currentRoute();
  const view = $('#view');
  if (r === 'home') view.innerHTML = renderHome();
  else if (r === 'shop') view.innerHTML = renderShop();
  else if (INFO_ROUTES.includes(r)) view.innerHTML = renderInfoPage(r);
  else view.innerHTML = renderAdmin();

  $$('#nav-links a').forEach(a => {
    const k = a.dataset.navlink;
    a.classList.toggle('active', (r === 'home' && k === 'home') || (r === 'shop' && k === 'shop'));
  });
  $('#nav-links').classList.remove('open');

  const anchor = (/^#\/(#.+)$/.exec(location.hash) || [])[1];
  if (anchor){
    setTimeout(() => { const el = $(anchor); el && el.scrollIntoView({ behavior:'smooth' }); }, 60);
  } else if (scroll){
    window.scrollTo({ top: 0 });
  }
  initReveals();
  initLockCountdown();
  initResendCountdown();
  refreshImgThumbsUI();
}

function refreshShopResults(){
  const box = $('#shop-results'); if (!box) return;
  const list = filteredProducts();
  box.innerHTML = list.length
    ? `<div class="grid">${list.map((p,i) => cardHTML(p, i % 4)).join('')}</div>`
    : `<div class="empty"><span class="serif">The caravan hasn't brought that yet.</span>Try a different search or filter -- or call <b>+92 315 3755007</b> and we'll source it for you.</div>`;
  const note = $('.result-note'); if (note) note.textContent = `${list.length} OF ${state.products.length} STYLES`;
  $$('#cat-chips .chip, [data-action="f-size"]').forEach(ch => {
    const isCat = ch.dataset.action === 'f-cat';
    ch.classList.toggle('on', (isCat ? state.filters.cat : state.filters.size) === ch.dataset.v);
  });
  initReveals();
}

// ===== EVENT LISTENERS =====

document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = t.dataset.action, id = t.dataset.id;
  if (t.tagName === 'A' && t.getAttribute('href') === '#') e.preventDefault();

  if (a === 'open-product') openProduct(id);
  else if (a === 'wish'){ toggleWish(id, t); }
  else if (a === 'pm-thumb'){ state.pm.img = +t.dataset.i; renderProductModal(findProduct(state.modal.id)); }
  else if (a === 'pm-size'){ state.pm.size = t.dataset.v; renderProductModal(findProduct(state.modal.id)); }
  else if (a === 'pm-qty'){ state.pm.qty = Math.min(10, Math.max(1, state.pm.qty + (+t.dataset.d))); renderProductModal(findProduct(state.modal.id)); }
  else if (a === 'pm-add'){
    if (!state.pm.size){ toast('Select a size first'); return; }
    addToCart(state.modal.id, state.pm.size, state.pm.qty);
    closeModal(); openCart();
  }
  else if (a === 'open-chart') openChart(id);
  else if (a === 'close-modal') closeModal();
  else if (a === 'qty'){
    const i = +t.dataset.idx, line = state.cart[i], p = findProduct(line.id);
    const max = Number((p.sizes || {})[line.size] || 0);
    line.qty += (+t.dataset.d);
    if (line.qty < 1) line.qty = 1;
    if (line.qty > max){ line.qty = Math.max(1, max); toast('Only ' + max + ' available in ' + line.size); }
    persistCart(); renderDrawer();
  }
  else if (a === 'remove'){ state.cart.splice(+t.dataset.idx, 1); persistCart(); renderDrawer(); }
  else if (a === 'checkout'){ closeCart(); openCheckout(); }
  else if (a === 'close-cart-link') closeCart();
  else if (a === 'faq-toggle'){ t.closest('.faq-item').classList.toggle('open'); }
  else if (a === 'f-cat'){ state.filters.cat = t.dataset.v; refreshShopResults(); }
  else if (a === 'f-size'){ state.filters.size = t.dataset.v; refreshShopResults(); }
  else if (a === 'admin-tab'){ state.admin.tab = t.dataset.v; state.admin.editing = null; renderRoute(false); }
  else if (a === 'admin-new'){ state.admin.tab = 'form'; state.admin.editing = null; renderRoute(false); }
  else if (a === 'admin-edit'){ state.admin.tab = 'form'; state.admin.editing = id; renderRoute(false); }
  else if (a === 'admin-del'){
    const p = findProduct(id);
    if (confirm('Delete "' + (p ? p.title : id) + '" from the shop?')){
      deleteProductFromSupabase(id).then(ok => {
        if (ok) {
          state.products = state.products.filter(x => x.id !== id);
          toast('Product deleted'); renderRoute(false);
        }
      });
    }
  }
  else if (a === 'admin-cancel'){ state.admin.tab = 'products'; state.admin.editing = null; renderRoute(false); }
  else if (a === 'admin-reset'){
    if (confirm('Restore the original 14-product demo catalogue? Your added products will be replaced.')){
      // This would need to re-seed from Supabase or a backup
      toast('Demo restore -- re-seed from Supabase SQL');
    }
  }
  else if (a === 'admin-logout'){ state.admin.authed = false; store.set(K.admin, false); renderRoute(false); }
  else if (a === 'reset-forgot'){ state.admin.reset = { step:'confirm', otp:null, otpSentAt:0, otpTries:0, err:'', showPass:false }; renderRoute(false); }
  else if (a === 'reset-cancel'){ state.admin.reset = { step:null, otp:null, otpSentAt:0, otpTries:0, err:'', showPass:false }; renderRoute(false); }
  else if (a === 'orders-clear'){
    if (confirm('Clear all saved orders?')){ state.orders = []; renderRoute(false); }
  }
  else if (a === 'subs-clear'){
    if (confirm('Clear all saved WhatsApp subscribers?')){ state.subs = []; renderRoute(false); }
  }
  else if (a === 'subs-copy'){
    const list = state.subs.map(s => s.phone).join('\n');
    navigator.clipboard && navigator.clipboard.writeText(list).then(
      () => toast('Copied ' + state.subs.length + ' number(s)'),
      () => toast('Could not copy -- select the table manually')
    );
  }
  else if (a === 'chart-add'){
    $('#chart-edit').insertAdjacentHTML('beforeend', `<tr data-row>
      <td><input name="c_size" placeholder="3XL" /></td><td><input name="c_chest" placeholder="48" /></td>
      <td><input name="c_length" placeholder="32" /></td><td><input name="c_sleeve" placeholder="10" /></td>
      <td><button type="button" class="mini-btn danger" data-action="chart-del">✕</button></td></tr>`);
  }
  else if (a === 'chart-del'){ t.closest('tr').remove(); }
  else if (a === 'img-remove'){
    const ta = $('#images-textarea'); if (!ta) return;
    const lines = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
    lines.splice(+t.dataset.i, 1);
    ta.value = lines.join('\n');
    refreshImgThumbsUI();
  }
  else if (a === 'co-method'){
    state.checkout.method = t.dataset.v;
    openModal(renderCheckoutModal(), true);
  }
  else if (a === 'pay-soon'){ toast('Card payments are coming soon -- try EasyPaisa, JazzCash or cash for now'); }
  else if (a === 'copy-pay-num'){
    const num = t.dataset.num;
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(num).then(() => toast('Copied')).catch(() => toast(num));
    } else { toast(num); }
  }
  else if (a === 'auth-switch'){
    state.auth.view = state.auth.view === 'signup' ? 'signin' : 'signup';
    state.auth.err = ''; refreshAuthModal();
  }
  else if (a === 'auth-toggle-pass'){
    state.auth.showPass = !state.auth.showPass;
    refreshAuthModal();
  }
  else if (a === 'auth-google') googleSignIn();
  else if (a === 'auth-facebook') facebookSignIn();
  else if (a === 'auth-signout'){
    state.auth.session = null; persistSession(); updateAccountUI();
    toast('Signed out'); closeModal();
  }
  else if (a === 'gate-toggle-pass'){
    state.admin.reset.showPass = !state.admin.reset.showPass;
    renderRoute(false);
    setTimeout(() => { const el = $('#gate-pass'); if (el) el.focus(); }, 0);
  }
  else if (a === 'reset-send-otp'){
    const now = Date.now();
    const r = state.admin.reset;
    if (r.otpSentAt && now < r.otpSentAt + OTP_RESEND_MS && r.step === 'otp'){ renderRoute(false); return; }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const msg = `Qafla Men's Wear -- your owner's room recovery code is ${otp}. Do not share this code with anyone.`;
    const waUrl = `https://wa.me/${RECOVERY_WA}?text=${encodeURIComponent(msg)}`;
    const win = window.open(waUrl, '_blank', 'noopener');
    state.admin.reset = { step:'otp', otp, otpSentAt: now, otpTries:0, err:'', showPass:false };
    toast(win ? 'WhatsApp opened with your code -- hit send' : 'Pop-up blocked -- allow pop-ups, then resend');
    renderRoute(false);
  }
});

document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-action]'); if (!f) return;
  e.preventDefault();
  const a = f.dataset.action;
  if (a === 'place-order') placeOrder(new FormData(f));
  else if (a === 'auth-signin'){
    const email = $('#auth-email').value.trim();
    const pass = $('#auth-pass').value;
    const cust = findCustomer(email);
    if (!cust || cust.provider !== 'email' || cust.pass !== pass){
      state.auth.err = 'Email or password is incorrect.'; refreshAuthModal(); return;
    }
    state.auth.session = { name: cust.name, email: cust.email, provider:'email', avatar:'' };
    persistSession(); toast('Welcome back, ' + cust.name.split(' ')[0] + '!'); closeModal(); updateAccountUI();
  }
  else if (a === 'auth-signup'){
    const name = $('#auth-name').value.trim();
    const email = $('#auth-email').value.trim();
    const pass = $('#auth-pass').value, pass2 = $('#auth-pass2').value;
    if (findCustomer(email)){ state.auth.err = 'An account with that email already exists -- sign in instead.'; refreshAuthModal(); return; }
    if (pass !== pass2){ state.auth.err = 'Passwords do not match.'; refreshAuthModal(); return; }
    if (pass.length < 4){ state.auth.err = 'Password must be at least 4 characters.'; refreshAuthModal(); return; }
    const cust = { id:'C-' + Date.now().toString(36), name, email, pass, provider:'email', avatar:'', joined: new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) };
    const list = getCustomers(); list.unshift(cust); saveCustomers(list);
    state.auth.session = { name: cust.name, email: cust.email, provider:'email', avatar:'' };
    persistSession(); toast('Account created -- welcome, ' + name.split(' ')[0] + '!'); closeModal(); updateAccountUI();
  }
  else if (a === 'join-whatsapp'){
    const phone = f.querySelector('[name=phone]').value.trim();
    if (!phone) return;

    // Save to Supabase
    const saved = await saveSubscriberToSupabase(phone);
    if (saved || (await supabase.from('subscribers').select('phone').eq('phone', phone).single()).data) {
      state.subs.unshift({ phone, date: new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) });
    }

    f.reset();
    if (WHATSAPP_GROUP_LINK){
      toast('Saved! Opening WhatsApp...');
      window.open(WHATSAPP_GROUP_LINK, '_blank', 'noopener');
    } else {
      toast('Got your number -- we'll add you as soon as the group link is live');
    }
  }
  else if (a === 'admin-login'){
    const now = Date.now();
    if (state.admin.lockUntil && now < state.admin.lockUntil){ renderRoute(false); return; }
    const pass = $('#gate-pass').value.trim();
    if (pass === ADMIN_PASS){
      state.admin.authed = true; state.admin.attempts = 0; state.admin.lockUntil = 0;
      store.set(K.admin, true); persistLoginLock();
      toast('Welcome back, boss'); renderRoute(false);
    } else {
      state.admin.attempts += 1;
      if (state.admin.attempts >= MAX_LOGIN_ATTEMPTS){
        state.admin.lockUntil = now + LOGIN_LOCK_MS;
        state.admin.attempts = 0;
        persistLoginLock();
        renderRoute(false);
      } else {
        persistLoginLock();
        const left = MAX_LOGIN_ATTEMPTS - state.admin.attempts;
        $('#gate-err').textContent = `Wrong passcode -- ${left} attempt${left === 1 ? '' : 's'} left before a 1:30 lockout.`;
      }
    }
  }
  else if (a === 'admin-save') saveProduct(f);
  else if (a === 'reset-send-otp'){
    const now = Date.now();
    const r = state.admin.reset;
    if (r.otpSentAt && now < r.otpSentAt + OTP_RESEND_MS && r.step === 'otp'){ renderRoute(false); return; }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const msg = `Qafla Men's Wear -- your owner's room recovery code is ${otp}. Do not share this code with anyone.`;
    const waUrl = `https://wa.me/${RECOVERY_WA}?text=${encodeURIComponent(msg)}`;
    const win = window.open(waUrl, '_blank', 'noopener');
    state.admin.reset = { step:'otp', otp, otpSentAt: now, otpTries:0, err:'', showPass:false };
    toast(win ? 'WhatsApp opened with your code -- hit send' : 'Pop-up blocked -- allow pop-ups, then resend');
    renderRoute(false);
  }
  else if (a === 'reset-verify-otp'){
    const val = $('#reset-otp-input').value.trim();
    const r = state.admin.reset;
    if (val && val === r.otp){
      state.admin.reset = { step:'newpass', otp:null, otpSentAt:0, otpTries:0, err:'', showPass:false };
      renderRoute(false);
    } else {
      r.otpTries = (r.otpTries || 0) + 1;
      r.err = r.otpTries >= 5 ? 'Too many wrong codes -- request a fresh one.' : 'That code doesn\'t match -- double-check WhatsApp and try again.';
      renderRoute(false);
    }
  }
  else if (a === 'reset-set-pass'){
    const p1 = $('#reset-pass1').value, p2 = $('#reset-pass2').value;
    if (!p1 || p1.length < 4){
      state.admin.reset.err = 'Passcode must be at least 4 characters.'; renderRoute(false); return;
    }
    if (p1 !== p2){
      state.admin.reset.err = 'Passcodes do not match.'; renderRoute(false); return;
    }
    ADMIN_PASS = p1;
    store.set(K.pass, ADMIN_PASS);
    state.admin.reset = { step:'done', otp:null, otpSentAt:0, otpTries:0, err:'', showPass:false };
    toast('Passcode updated -- log in with your new passcode');
    renderRoute(false);
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'shop-search'){ state.filters.q = e.target.value; refreshShopResults(); }
  if (e.target.id === 'images-textarea'){ refreshImgThumbsUI(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'shop-sort'){ state.filters.sort = e.target.value; refreshShopResults(); }
  if (e.target.id === 'img-file-input'){
    handleImgFileUpload(e.target.files);
    e.target.value = '';
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){ closeModal(); closeCart(); }
});

function openCart(){ renderDrawer(); $('#cart-drawer').classList.add('show'); $('#scrim').classList.add('show'); }
function closeCart(){ $('#cart-drawer').classList.remove('show'); $('#scrim').classList.remove('show'); }

$('#nav-cart').addEventListener('click', openCart);
$('#nav-account').addEventListener('click', openAuthModal);
$('#drawer-close').addEventListener('click', closeCart);
$('#scrim').addEventListener('click', closeCart);
$('#modal-scrim').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
$('#nav-burger').addEventListener('click', () => $('#nav-links').classList.toggle('open'));
$('#nav-links').addEventListener('click', e => { if (e.target.tagName === 'A') $('#nav-links').classList.remove('open'); });
$('#nav-search').addEventListener('click', () => {
  if (currentRoute() !== 'shop') location.hash = '#/shop';
  setTimeout(() => { const s = $('#shop-search'); s && s.focus(); }, 120);
});

window.addEventListener('hashchange', () => renderRoute());
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  $('#nav').classList.toggle('scrolled', y > 8);
  $('#nav').classList.toggle('nav-hidden', y > 70);
  lastScrollY = y;
  const hi = $('#hero-img');
  if (hi) hi.style.transform = 'translateY(' + Math.min(y * .18, 120) + 'px)';
}, { passive: true });

// ===== CUSTOMER ACCOUNT FUNCTIONS =====

function getCustomers(){ return store.get(K.customers, []); }
function saveCustomers(list){ store.set(K.customers, list); }
function findCustomer(email){ return getCustomers().find(c => c.email.toLowerCase() === String(email).toLowerCase()); }
function persistSession(){ store.set(K.session, state.auth.session); }
function persistLoginLock(){ store.set(K.lock, { attempts: state.admin.attempts, lockUntil: state.admin.lockUntil }); }

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 90 * 1000;

// ===== INITIALIZATION =====

async function init(){
  await loadProducts();
  await loadOrders();
  await loadSubs();
  renderRoute();
  updateCartCount();
  updateAccountUI();
  renderDrawer();
}

init();
