/* ============ Atoll Cellar — data + engine ============ */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = iso(new Date());
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const toUTC = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtD = s => { const d = parseD(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtDL = s => { const d = parseD(s); return `${WDAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const lastDayPrevMonth = s => { const [y, m] = s.split('-').map(Number); return iso(new Date(y, m - 1, 0)); };
const r2 = n => Math.round(n * 100) / 100;
function money(n, dp) {
  if (n == null || !isFinite(n)) return '–';
  if (dp == null) dp = Math.abs(n) < 100 && Math.round(n) !== n ? 2 : 0;
  const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return (n < 0 ? '−$' : '$') + s;
}
const pct = (n, dp = 1) => (n == null || !isFinite(n)) ? '–' : n.toFixed(dp) + '%';
const nf = (n, dp = 0) => (n == null || !isFinite(n)) ? '–' : n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const qf = n => Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function poisson(l, rnd) { if (l <= 0) return 0; const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; }

const TYPES = [
  { id: 'sparkling', label: 'Champagne & Sparkling', short: 'Sparkling' },
  { id: 'white', label: 'White', short: 'White' },
  { id: 'rose', label: 'Rosé', short: 'Rosé' },
  { id: 'red', label: 'Red', short: 'Red' },
  { id: 'sweet', label: 'Sweet & Fortified', short: 'Sweet' },
];
const TYPE = Object.fromEntries(TYPES.map(t => [t.id, t]));
const PAIRINGS = ['Aperitif', 'Seafood', 'Lobster', 'Grilled fish', 'Sushi & sashimi', 'Curry', 'Spicy food', 'Poultry', 'Red meat', 'Pasta', 'Cheese', 'Dessert', 'Vegetarian'];
const LOSS_TYPES = [
  { id: 'breakage', label: 'Breakage' },
  { id: 'comp', label: 'Guest comp' },
  { id: 'staff', label: 'Staff tasting & training' },
  { id: 'spoiled', label: 'Spoiled or corked' },
  { id: 'wastage', label: 'Open-bottle wastage' },
];
const LOSS = Object.fromEntries(LOSS_TYPES.map(t => [t.id, t]));
const KIND = {
  bar: { bottles: 0.5, glasses: 1.7, type: { sparkling: 1.4, white: 1.0, rose: 1.4, red: 0.5, sweet: 0.3 } },
  restaurant: { bottles: 1.3, glasses: 0.8, type: { sparkling: 0.8, white: 1.2, rose: 0.8, red: 1.4, sweet: 1.2 } },
  villa: { bottles: 0.5, glasses: 0, type: { sparkling: 1.8, white: 0.8, rose: 1.0, red: 0.8, sweet: 0.4 } },
  teppan: { bottles: 0.6, glasses: 0.5, type: { sparkling: 1.0, white: 1.3, rose: 0.6, red: 0.9, sweet: 0.3 } },
  other: { bottles: 1.0, glasses: 1.0, type: { sparkling: 1.0, white: 1.0, rose: 1.0, red: 1.0, sweet: 1.0 } },
};
const KIND_LABEL = { restaurant: 'Restaurant', bar: 'Bar or lounge', villa: 'In-villa dining', teppan: 'Speciality restaurant', other: 'Other outlet' };

/* Wine seed. cost = landed cost per bottle (USD). price / gprice = menu price before 10% SC + T-GST.
   pop = bottles/day across a property, gpop = glasses/day. sS / sL = opening stock at each sample resort. */
const SEED_WINES = [
  { id: 'w01', pos: 1, name: 'Brut Impérial', producer: 'Moët & Chandon', vintage: 'NV', type: 'sparkling', country: 'France', region: 'Champagne', grapes: ['Pinot Noir', 'Chardonnay', 'Pinot Meunier'], ml: 750, cost: 52, price: 210, gprice: 38, pour: 150, supplier: 'local', caseSize: 6, par: 24, body: 3, acid: 4, sweet: 1, pair: ['Aperitif', 'Seafood', 'Sushi & sashimi'], note: 'Green apple, brioche and white peach with a fine, lively mousse.', sell: 'The best-known Champagne in the world. A safe, celebratory first glass at sunset.', pick: false, pop: 1.1, gpop: 7, sS: 16, sL: 22 },
  { id: 'w02', pos: 2, name: 'Yellow Label Brut', producer: 'Veuve Clicquot', vintage: 'NV', type: 'sparkling', country: 'France', region: 'Champagne', grapes: ['Pinot Noir', 'Chardonnay', 'Pinot Meunier'], ml: 750, cost: 58, price: 230, gprice: 0, pour: 150, supplier: 'local', caseSize: 6, par: 18, body: 4, acid: 4, sweet: 1, pair: ['Aperitif', 'Lobster', 'Poultry'], note: 'Rich and toasty, with ripe pear, vanilla and a creamy, persistent finish.', sell: 'Fuller than Moët because of the Pinot Noir. Offer it to guests who like a rounder Champagne.', pick: false, pop: 0.6, gpop: 0, sS: 30, sL: 18 },
  { id: 'w03', pos: 3, name: 'Blanc de Blancs', producer: 'Ruinart', vintage: 'NV', type: 'sparkling', country: 'France', region: 'Champagne', grapes: ['Chardonnay'], ml: 750, cost: 95, price: 380, gprice: 0, pour: 150, supplier: 'sg', caseSize: 6, par: 12, body: 3, acid: 5, sweet: 1, pair: ['Sushi & sashimi', 'Seafood', 'Aperitif'], note: 'Pure citrus, white flowers and chalky freshness. Elegant and precise.', sell: '100% Chardonnay from the oldest Champagne house. The natural upgrade for Moët drinkers who love freshness.', pick: true, pop: 0.3, gpop: 0, sS: 14, sL: 9 },
  { id: 'w04', pos: 4, name: 'Dom Pérignon', producer: 'Moët & Chandon', vintage: '2015', type: 'sparkling', country: 'France', region: 'Champagne', grapes: ['Chardonnay', 'Pinot Noir'], ml: 750, cost: 240, price: 950, gprice: 0, pour: 150, supplier: 'eu', caseSize: 6, par: 6, body: 4, acid: 4, sweet: 1, pair: ['Lobster', 'Sushi & sashimi', 'Poultry'], note: 'Toasted almond, candied citrus and smoky mineral depth. Long and layered.', sell: 'Only made in the best years. Suggest it for anniversaries, proposals and sandbank dinners.', pick: true, pop: 0.1, gpop: 0, sS: 3, sL: 7 },
  { id: 'w05', pos: 5, name: 'Crede Prosecco Superiore', producer: 'Bisol', vintage: '2023', type: 'sparkling', country: 'Italy', region: 'Valdobbiadene', grapes: ['Glera'], ml: 750, cost: 16, price: 85, gprice: 18, pour: 150, supplier: 'sg', caseSize: 12, par: 24, body: 2, acid: 3, sweet: 2, pair: ['Aperitif', 'Seafood', 'Vegetarian'], note: 'Crisp pear, apple blossom and a soft, light bubble.', sell: 'Light and easy for pool days. Good value when a guest wants bubbles without Champagne prices.', pick: false, pop: 0.4, gpop: 9, sS: 60, sL: 44 },
  { id: 'w06', pos: 6, name: 'Cuvée Rosé', producer: 'Laurent-Perrier', vintage: 'NV', type: 'sparkling', country: 'France', region: 'Champagne', grapes: ['Pinot Noir'], ml: 750, cost: 90, price: 360, gprice: 0, pour: 150, supplier: 'local', caseSize: 6, par: 12, body: 3, acid: 4, sweet: 1, pair: ['Grilled fish', 'Poultry', 'Dessert'], note: 'Wild strawberry, raspberry and red cherry. Fresh and fine.', sell: 'The iconic pink Champagne, made from 100% Pinot Noir. A favourite with honeymooners.', pick: false, pop: 0.25, gpop: 0, sS: 0, sL: 6 },
  { id: 'w07', pos: 7, name: 'Sauvignon Blanc', producer: 'Cloudy Bay', vintage: '2024', type: 'white', country: 'New Zealand', region: 'Marlborough', grapes: ['Sauvignon Blanc'], ml: 750, cost: 28, price: 125, gprice: 24, pour: 150, supplier: 'local', caseSize: 12, par: 24, body: 2, acid: 5, sweet: 1, pair: ['Seafood', 'Grilled fish', 'Vegetarian'], note: 'Passion fruit, lime zest and fresh-cut grass. Vibrant and zesty.', sell: 'The Sauvignon Blanc guests ask for by name. Great with the reef fish of the day.', pick: false, pop: 0.9, gpop: 8, sS: 40, sL: 28 },
  { id: 'w08', pos: 8, name: 'Sancerre Blanc', producer: 'Domaine Vacheron', vintage: '2023', type: 'white', country: 'France', region: 'Loire Valley', grapes: ['Sauvignon Blanc'], ml: 750, cost: 34, price: 150, gprice: 0, pour: 150, supplier: 'eu', caseSize: 12, par: 12, body: 2, acid: 5, sweet: 1, pair: ['Seafood', 'Cheese', 'Grilled fish'], note: 'Flinty minerality, citrus and white currant. Dry and precise.', sell: 'For guests who find New Zealand Sauvignon too loud. Mineral, elegant and organically farmed.', pick: true, pop: 0.3, gpop: 0, sS: 20, sL: 14 },
  { id: 'w09', pos: 9, name: 'Pouilly-Fumé', producer: 'Pascal Jolivet', vintage: '2023', type: 'white', country: 'France', region: 'Loire Valley', grapes: ['Sauvignon Blanc'], ml: 750, cost: 30, price: 135, gprice: 0, pour: 150, supplier: 'sg', caseSize: 12, par: 12, body: 2, acid: 5, sweet: 1, pair: ['Seafood', 'Sushi & sashimi', 'Vegetarian'], note: 'Grapefruit, gooseberry and a smoky, stony finish.', sell: 'Loire Sauvignon with a touch of smoke. Beautiful with sashimi.', pick: false, pop: 0.2, gpop: 0, sS: 18, sL: 10 },
  { id: 'w10', pos: 10, name: 'Chablis Premier Cru Montmains', producer: 'William Fèvre', vintage: '2022', type: 'white', country: 'France', region: 'Burgundy', grapes: ['Chardonnay'], ml: 750, cost: 42, price: 180, gprice: 0, pour: 150, supplier: 'eu', caseSize: 6, par: 12, body: 3, acid: 5, sweet: 1, pair: ['Lobster', 'Seafood', 'Sushi & sashimi'], note: 'Oyster shell, lemon and green apple with a long, saline finish.', sell: 'Unoaked Chardonnay with real mineral tension. The classic partner for shellfish.', pick: false, pop: 0.35, gpop: 0, sS: 22, sL: 12 },
  { id: 'w11', pos: 11, name: 'Meursault', producer: 'Louis Jadot', vintage: '2021', type: 'white', country: 'France', region: 'Burgundy', grapes: ['Chardonnay'], ml: 750, cost: 70, price: 240, gprice: 0, pour: 150, supplier: 'eu', caseSize: 6, par: 6, body: 4, acid: 3, sweet: 1, pair: ['Lobster', 'Poultry', 'Cheese'], note: 'Hazelnut, butter and ripe yellow fruit with toasty oak.', sell: 'Rich, creamy white Burgundy. Suggest it with butter-poached lobster.', pick: false, pop: 0.15, gpop: 0, sS: 9, sL: 6 },
  { id: 'w12', pos: 12, name: 'Wehlener Sonnenuhr Riesling Kabinett', producer: 'Dr. Loosen', vintage: '2022', type: 'white', country: 'Germany', region: 'Mosel', grapes: ['Riesling'], ml: 750, cost: 24, price: 110, gprice: 0, pour: 150, supplier: 'sg', caseSize: 12, par: 12, body: 1, acid: 5, sweet: 3, pair: ['Curry', 'Spicy food', 'Sushi & sashimi'], note: 'Lime, green apple and slate, with gentle sweetness and bright acidity.', sell: 'Off-dry and low in alcohol. The best friend of Maldivian curries and spicy dishes.', pick: true, pop: 0.25, gpop: 0, sS: 16, sL: 20 },
  { id: 'w13', pos: 13, name: 'Pinot Grigio', producer: 'Santa Margherita', vintage: '2023', type: 'white', country: 'Italy', region: 'Alto Adige', grapes: ['Pinot Grigio'], ml: 750, cost: 16, price: 80, gprice: 16, pour: 150, supplier: 'local', caseSize: 12, par: 24, body: 2, acid: 3, sweet: 1, pair: ['Seafood', 'Pasta', 'Vegetarian'], note: 'Delicate pear, citrus and almond. Clean and refreshing.', sell: 'Easy, familiar and light. A good choice for lunch by the pool.', pick: false, pop: 0.4, gpop: 6, sS: 48, sL: 36 },
  { id: 'w14', pos: 14, name: 'Estate Chardonnay', producer: 'Kumeu River', vintage: '2022', type: 'white', country: 'New Zealand', region: 'Auckland', grapes: ['Chardonnay'], ml: 750, cost: 32, price: 140, gprice: 0, pour: 150, supplier: 'sg', caseSize: 12, par: 12, body: 3, acid: 4, sweet: 1, pair: ['Poultry', 'Grilled fish', 'Lobster'], note: 'White peach, grapefruit and subtle oak, with a creamy texture.', sell: 'Burgundy style at a friendlier price. A smart alternative to Meursault.', pick: false, pop: 0.2, gpop: 0, sS: 15, sL: 10 },
  { id: 'w15', pos: 15, name: 'Soave Classico', producer: 'Pieropan', vintage: '2023', type: 'white', country: 'Italy', region: 'Veneto', grapes: ['Garganega'], ml: 750, cost: 15, price: 75, gprice: 0, pour: 150, supplier: 'sg', caseSize: 12, par: 12, body: 2, acid: 3, sweet: 1, pair: ['Seafood', 'Pasta', 'Vegetarian'], note: 'Almond blossom, pear and a hint of salt.', sell: 'A great-value Italian white for groups. Crisp and gentle.', pick: false, pop: 0.15, gpop: 0, sS: 24, sL: 18 },
  { id: 'w16', pos: 16, name: 'Albariño', producer: 'Pazo de Señoráns', vintage: '2023', type: 'white', country: 'Spain', region: 'Rías Baixas', grapes: ['Albariño'], ml: 750, cost: 22, price: 100, gprice: 20, pour: 150, supplier: 'sg', caseSize: 12, par: 18, body: 2, acid: 4, sweet: 1, pair: ['Seafood', 'Grilled fish', 'Sushi & sashimi'], note: 'Peach, lemon peel and sea breeze. Juicy and saline.', sell: 'Made for island food. Suggest it with grilled reef fish or ceviche.', pick: true, pop: 0.3, gpop: 5, sS: 30, sL: 20 },
  { id: 'w32', pos: 32, name: 'Côtes du Rhône Blanc', producer: 'E. Guigal', vintage: '2022', type: 'white', country: 'France', region: 'Rhône Valley', grapes: ['Viognier', 'Roussanne', 'Marsanne'], ml: 750, cost: 13, price: 65, gprice: 14, pour: 150, supplier: 'local', caseSize: 12, par: 24, body: 3, acid: 3, sweet: 1, pair: ['Poultry', 'Curry', 'Vegetarian'], note: 'Apricot, white flowers and honeysuckle. Round and fresh.', sell: 'Our house white. Aromatic and smooth, and easy with curry.', pick: false, pop: 0.2, gpop: 7, sS: 44, sL: 32 },
  { id: 'w17', pos: 17, name: 'Whispering Angel', producer: "Château d'Esclans", vintage: '2024', type: 'rose', country: 'France', region: 'Provence', grapes: ['Grenache', 'Cinsault', 'Rolle'], ml: 750, cost: 20, price: 105, gprice: 21, pour: 150, supplier: 'local', caseSize: 12, par: 24, body: 2, acid: 3, sweet: 1, pair: ['Aperitif', 'Seafood', 'Vegetarian'], note: 'Strawberry, peach and citrus with a dry, silky finish.', sell: 'The resort bestseller. Pale, dry and made for sunsets.', pick: false, pop: 0.8, gpop: 9, sS: 36, sL: 30 },
  { id: 'w18', pos: 18, name: 'Rosé', producer: 'Miraval', vintage: '2024', type: 'rose', country: 'France', region: 'Provence', grapes: ['Cinsault', 'Grenache', 'Syrah', 'Rolle'], ml: 750, cost: 22, price: 110, gprice: 0, pour: 150, supplier: 'local', caseSize: 12, par: 12, body: 2, acid: 3, sweet: 1, pair: ['Aperitif', 'Grilled fish', 'Vegetarian'], note: 'Red berries, citrus and white flowers. Fresh and elegant.', sell: 'Well known and photogenic. An easy second rosé to offer.', pick: false, pop: 0.35, gpop: 0, sS: 20, sL: 16 },
  { id: 'w19', pos: 19, name: 'Clos Mireille Rosé', producer: 'Domaines Ott', vintage: '2023', type: 'rose', country: 'France', region: 'Provence', grapes: ['Grenache', 'Cinsault'], ml: 750, cost: 38, price: 130, gprice: 0, pour: 150, supplier: 'eu', caseSize: 6, par: 6, body: 3, acid: 3, sweet: 1, pair: ['Lobster', 'Grilled fish', 'Poultry'], note: 'Apricot, orange peel and spice. Rich for a rosé.', sell: 'A gastronomic rosé for guests who want something special with seafood.', pick: false, pop: 0.02, gpop: 0, sS: 26, sL: 8 },
  { id: 'w20', pos: 20, name: 'Bannockburn Pinot Noir', producer: 'Felton Road', vintage: '2022', type: 'red', country: 'New Zealand', region: 'Central Otago', grapes: ['Pinot Noir'], ml: 750, cost: 48, price: 165, gprice: 0, pour: 150, supplier: 'sg', caseSize: 12, par: 12, body: 3, acid: 4, sweet: 1, pair: ['Grilled fish', 'Poultry', 'Red meat'], note: 'Dark cherry, plum and spice with silky tannins.', sell: 'A red that works with fish. Serve it slightly chilled.', pick: true, pop: 0.25, gpop: 0, sS: 14, sL: 10 },
  { id: 'w21', pos: 21, name: 'Chambolle-Musigny', producer: 'Joseph Drouhin', vintage: '2020', type: 'red', country: 'France', region: 'Burgundy', grapes: ['Pinot Noir'], ml: 750, cost: 75, price: 310, gprice: 0, pour: 150, supplier: 'eu', caseSize: 6, par: 6, body: 3, acid: 4, sweet: 1, pair: ['Poultry', 'Red meat', 'Cheese'], note: 'Raspberry, rose petal and forest floor. Fine and perfumed.', sell: 'Silky, perfumed red Burgundy. The step up for guests who enjoy Felton Road.', pick: false, pop: 0.05, gpop: 0, sS: 12, sL: 6 },
  { id: 'w22', pos: 22, name: 'Château Lynch-Bages', producer: 'Château Lynch-Bages', vintage: '2016', type: 'red', country: 'France', region: 'Bordeaux', grapes: ['Cabernet Sauvignon', 'Merlot'], ml: 750, cost: 150, price: 620, gprice: 0, pour: 150, supplier: 'eu', caseSize: 6, par: 6, body: 5, acid: 4, sweet: 1, pair: ['Red meat', 'Cheese'], note: 'Cassis, cedar and graphite with firm, polished tannins.', sell: 'A benchmark Pauillac from a great vintage. Ideal with the wagyu.', pick: true, pop: 0.08, gpop: 0, sS: 10, sL: 6 },
  { id: 'w23', pos: 23, name: 'Château Margaux', producer: 'Château Margaux', vintage: '2012', type: 'red', country: 'France', region: 'Bordeaux', grapes: ['Cabernet Sauvignon', 'Merlot'], ml: 750, cost: 520, price: 1900, gprice: 0, pour: 150, supplier: 'eu', caseSize: 6, par: 3, body: 4, acid: 4, sweet: 1, pair: ['Red meat', 'Cheese'], note: 'Violets, blackcurrant and cedar. Refined, layered and long.', sell: 'First Growth Bordeaux. Offer it for milestone celebrations and private dining.', pick: false, pop: 0, gpop: 0, sS: 6, sL: 2 },
  { id: 'w24', pos: 24, name: 'Bin 389 Cabernet Shiraz', producer: 'Penfolds', vintage: '2021', type: 'red', country: 'Australia', region: 'South Australia', grapes: ['Cabernet Sauvignon', 'Shiraz'], ml: 750, cost: 45, price: 190, gprice: 0, pour: 150, supplier: 'local', caseSize: 6, par: 12, body: 5, acid: 3, sweet: 1, pair: ['Red meat', 'Spicy food'], note: 'Blackberry, mocha and spice with generous, ripe tannins.', sell: "Known as 'Baby Grange'. Big and generous for steak lovers.", pick: false, pop: 0.35, gpop: 0, sS: 18, sL: 16 },
  { id: 'w25', pos: 25, name: 'Alta Malbec', producer: 'Catena', vintage: '2020', type: 'red', country: 'Argentina', region: 'Mendoza', grapes: ['Malbec'], ml: 750, cost: 38, price: 165, gprice: 0, pour: 150, supplier: 'sg', caseSize: 6, par: 12, body: 5, acid: 3, sweet: 1, pair: ['Red meat', 'Spicy food'], note: 'Blueberry, violet and dark chocolate. Plush and deep.', sell: 'High-altitude Malbec. The perfect match for grill night.', pick: false, pop: 0.2, gpop: 0, sS: 14, sL: 12 },
  { id: 'w26', pos: 26, name: 'Tignanello', producer: 'Antinori', vintage: '2020', type: 'red', country: 'Italy', region: 'Tuscany', grapes: ['Sangiovese', 'Cabernet Sauvignon', 'Cabernet Franc'], ml: 750, cost: 110, price: 450, gprice: 0, pour: 150, supplier: 'sg', caseSize: 6, par: 6, body: 4, acid: 4, sweet: 1, pair: ['Red meat', 'Pasta', 'Cheese'], note: 'Black cherry, tobacco and herbs with vibrant structure.', sell: 'The original Super Tuscan. Suggest it with the truffle pasta or the lamb.', pick: true, pop: 0.12, gpop: 0, sS: 9, sL: 8 },
  { id: 'w27', pos: 27, name: 'Barolo', producer: 'Fontanafredda', vintage: '2019', type: 'red', country: 'Italy', region: 'Piedmont', grapes: ['Nebbiolo'], ml: 750, cost: 36, price: 160, gprice: 0, pour: 150, supplier: 'sg', caseSize: 6, par: 6, body: 4, acid: 5, sweet: 1, pair: ['Red meat', 'Pasta', 'Cheese'], note: 'Rose, tar and red cherry with firm tannins.', sell: 'A classic Barolo at an approachable price.', pick: false, pop: 0.08, gpop: 0, sS: 12, sL: 6 },
  { id: 'w28', pos: 28, name: 'Reserva', producer: 'Muga', vintage: '2019', type: 'red', country: 'Spain', region: 'Rioja', grapes: ['Tempranillo', 'Garnacha'], ml: 750, cost: 22, price: 100, gprice: 20, pour: 150, supplier: 'sg', caseSize: 12, par: 18, body: 4, acid: 3, sweet: 1, pair: ['Red meat', 'Poultry', 'Cheese'], note: 'Red fruit, vanilla and sweet spice from oak ageing.', sell: 'Smooth and generous. A crowd-pleasing red by the glass.', pick: false, pop: 0.25, gpop: 5, sS: 30, sL: 24 },
  { id: 'w29', pos: 29, name: 'Max Reserva Cabernet Sauvignon', producer: 'Errázuriz', vintage: '2021', type: 'red', country: 'Chile', region: 'Aconcagua', grapes: ['Cabernet Sauvignon'], ml: 750, cost: 14, price: 70, gprice: 15, pour: 150, supplier: 'local', caseSize: 12, par: 24, body: 4, acid: 3, sweet: 1, pair: ['Red meat', 'Spicy food'], note: 'Blackcurrant, mint and cocoa. Ripe and round.', sell: 'Reliable, fruity Cabernet at an easy price.', pick: false, pop: 0.2, gpop: 5, sS: 34, sL: 30 },
  { id: 'w30', pos: 30, name: 'Opus One', producer: 'Opus One Winery', vintage: '2019', type: 'red', country: 'USA', region: 'Napa Valley', grapes: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc'], ml: 750, cost: 380, price: 1450, gprice: 0, pour: 150, supplier: 'sg', caseSize: 6, par: 3, body: 5, acid: 3, sweet: 1, pair: ['Red meat', 'Cheese'], note: 'Cassis, dark plum and fine oak. Opulent and polished.', sell: 'The most famous name in Napa. A favourite with American and Asian guests.', pick: false, pop: 0.03, gpop: 0, sS: 5, sL: 3 },
  { id: 'w31', pos: 31, name: 'Côtes du Rhône Rouge', producer: 'E. Guigal', vintage: '2020', type: 'red', country: 'France', region: 'Rhône Valley', grapes: ['Syrah', 'Grenache', 'Mourvèdre'], ml: 750, cost: 13, price: 65, gprice: 14, pour: 150, supplier: 'local', caseSize: 12, par: 24, body: 3, acid: 3, sweet: 1, pair: ['Red meat', 'Poultry', 'Curry'], note: 'Red berries, pepper and herbs. Juicy and easy.', sell: 'Our house red. Soft, peppery and food-friendly.', pick: false, pop: 0.2, gpop: 7, sS: 42, sL: 36 },
  { id: 'w33', pos: 33, name: 'Château Suduiraut (375 ml)', producer: 'Château Suduiraut', vintage: '2016', type: 'sweet', country: 'France', region: 'Sauternes', grapes: ['Sémillon', 'Sauvignon Blanc'], ml: 375, cost: 38, price: 150, gprice: 0, pour: 75, supplier: 'eu', caseSize: 12, par: 6, body: 4, acid: 3, sweet: 5, pair: ['Dessert', 'Cheese'], note: 'Honey, apricot and saffron with fresh acidity.', sell: 'A half bottle of classic Sauternes. Offer it with the cheese trolley or crème brûlée.', pick: false, pop: 0.03, gpop: 0, sS: 18, sL: 8 },
  { id: 'w34', pos: 34, name: '20 Year Old Tawny Port', producer: "Taylor's", vintage: 'NV', type: 'sweet', country: 'Portugal', region: 'Douro', grapes: ['Touriga Nacional', 'Touriga Franca'], ml: 750, cost: 48, price: 220, gprice: 22, pour: 75, supplier: 'sg', caseSize: 6, par: 6, body: 4, acid: 3, sweet: 5, pair: ['Dessert', 'Cheese'], note: 'Walnut, caramel, dried fig and orange peel.', sell: 'Ends dinner with a flourish. Suggest it with the chocolate desserts.', pick: false, pop: 0.03, gpop: 2, sS: 8, sL: 6 },
];

const SEED_SUPPLIERS = [
  { id: 'local', name: 'Malé distributor', lead: 7 },
  { id: 'sg', name: 'Singapore consolidator', lead: 28 },
  { id: 'eu', name: 'Direct import (Europe)', lead: 60 },
];
const SEED_PROPS = [
  { id: 'sbb', name: 'Sandbank Bay Resort', atoll: 'Baa Atoll', scale: 1, locs: [
    { id: 's-cel', name: 'Central Cellar', kind: 'cellar' },
    { id: 's-bar', name: 'Sunset Bar', kind: 'bar' },
    { id: 's-lag', name: 'Lagoon Restaurant', kind: 'restaurant' },
    { id: 's-ivd', name: 'In-Villa Dining', kind: 'villa' } ] },
  { id: 'lcr', name: 'Lagoon Crest Retreat', atoll: 'South Malé Atoll', scale: 0.75, locs: [
    { id: 'l-cel', name: 'Central Cellar', kind: 'cellar' },
    { id: 'l-res', name: 'Main Restaurant', kind: 'restaurant' },
    { id: 'l-pool', name: 'Pool Bar', kind: 'bar' },
    { id: 'l-tep', name: 'Teppanyaki', kind: 'teppan' } ] },
];
const DEFAULT_SETTINGS = {
  sc: 10, gst: 17, cosBottle: 25, cosGlass: 22, band: 3, rounding: 5, priceMode: 'flat',
  bands: [{ upto: 20, cos: 20 }, { upto: 60, cos: 25 }, { upto: 150, cos: 28 }, { upto: null, cos: 33 }],
  safetyDays: 14, cycleDays: 30, autoHide: true,
  shelf: { sparkling: 1, white: 3, rose: 3, red: 3, sweet: 28 },
};

const gpb = w => w && w.gprice ? Math.max(1, Math.floor(w.ml / w.pour)) : 0;

function buildDemo() {
  const rnd = mulberry32(20260928);
  const clone = o => JSON.parse(JSON.stringify(o));
  const wines = SEED_WINES.map(w => { const { sS, sL, ...rest } = clone(w); return rest; });
  const st = { v: 2, built: TODAY, seq: 100, settings: clone(DEFAULT_SETTINGS), suppliers: clone(SEED_SUPPLIERS), props: clone(SEED_PROPS),
    wines, stock: {}, open: {}, sales: [], postings: {}, losses: [], transfers: [], counts: [], pos: [], quiz: [] };
  const seedStock = Object.fromEntries(SEED_WINES.map(w => [w.id, { sbb: w.sS, lcr: w.sL }]));
  st.props.forEach(p => p.locs.forEach((l, i) => { st.stock[l.id] = {}; st.open[l.id] = {}; l.created = addDays(TODAY, -400); if (l.kind === 'cellar') l.main = i === 0; else { l.prices = {}; } }));
  // opening stock: small pars at outlets, the rest in the central cellar
  for (const p of st.props) for (const w of wines) {
    const T = seedStock[w.id][p.id]; let left = T;
    for (const l of p.locs.filter(l => l.kind !== 'cellar')) {
      const k = KIND[l.kind];
      let q = Math.round(T * 0.1 * k.type[w.type] * (k.bottles + (w.gprice ? k.glasses * 0.6 : 0)));
      q = Math.max(0, Math.min(q, 10, left));
      st.stock[l.id][w.id] = q; left -= q;
    }
    st.stock[p.locs[0].id][w.id] = left;
  }
  // 60 days of posted sales history. Sunset Bar over-pours (~170 ml instead of 150 ml).
  const effPour = { 's-bar': 1.13 }; const rem = {};
  for (let d = -60; d <= -1; d++) {
    const date = addDays(TODAY, d);
    const occ = 0.8 + 0.12 * ((d + 60) / 60) + 0.25 * rnd();
    for (const p of st.props) for (const l of p.locs) {
      if (l.kind === 'cellar') continue;
      if (l.id === 's-ivd' && d === -1) continue; // yesterday's in-villa sales not posted yet
      (st.postings[l.id] ||= []).push(date);
      const k = KIND[l.kind];
      for (const w of wines) {
        const tf = k.type[w.type];
        const b = poisson(w.pop * p.scale * k.bottles * tf * occ / 2.2, rnd);
        const g = w.gprice ? poisson(w.gpop * p.scale * k.glasses * tf * occ / 2.5, rnd) : 0;
        if (!b && !g) continue;
        let opened = 0;
        if (g) {
          const need = w.pour * (effPour[l.id] || 1.02) / w.ml; const key = l.id + '|' + w.id; let r = rem[key] ?? 0;
          for (let i = 0; i < g; i++) { if (r < need - 1e-9) { opened++; r = 1; } r -= need; }
          rem[key] = r;
        }
        const gp = gpb(w);
        st.sales.push([date, l.id, w.id, b, g, opened, r2(b * w.price + g * w.gprice), r2(b * w.cost + (g ? g * w.cost / gp : 0))]);
      }
    }
  }
  // open by-the-glass bottles at outlets that pour by the glass
  for (const p of st.props) for (const l of p.locs) {
    const k = KIND[l.kind]; if (!k || !k.glasses) continue;
    for (const w of wines) {
      if (!w.gprice || k.type[w.type] < 0.6) continue;
      const gp = gpb(w);
      st.open[l.id][w.id] = { pours: 1 + Math.floor(rnd() * (gp - 1)), opened: addDays(TODAY, -Math.floor(rnd() * 3)) };
    }
  }
  st.open['s-bar'].w01 = { pours: 2, opened: addDays(TODAY, -2) };
  st.open['l-pool'].w05 = { pours: 3, opened: addDays(TODAY, -2) };
  st.open['s-lag'].w28 = { pours: 1, opened: addDays(TODAY, -4) };
  // losses & comps (last 30 days)
  const W = Object.fromEntries(wines.map(w => [w.id, w]));
  const L = (d, loc, wid, qty, unit, type, note, by, credit) => {
    const w = W[wid]; const cost = unit === 'glass' ? qty * w.cost / gpb(w) : qty * w.cost;
    st.losses.push({ id: 'L' + (st.seq++), date: addDays(TODAY, d), loc, wid, qty, unit, type, note, by, cost: r2(cost), credit: credit || null });
  };
  L(-27, 's-bar', 'w17', 1, 'bottle', 'breakage', 'Dropped during service', 'Bar supervisor');
  L(-24, 's-lag', 'w02', 1, 'bottle', 'comp', 'Honeymoon welcome, GM approved', 'Restaurant manager');
  L(-22, 's-lag', 'w22', 1, 'bottle', 'spoiled', 'Corked, returned by guest', 'Head sommelier', 'pending');
  L(-19, 'l-res', 'w28', 1, 'bottle', 'staff', 'Team training on Rioja', 'Head sommelier');
  L(-17, 's-ivd', 'w01', 2, 'bottle', 'comp', 'Service recovery, villa AC fault', 'F&B director');
  L(-15, 'l-pool', 'w05', 1, 'bottle', 'breakage', 'Broken in ice bin', 'Bar supervisor');
  L(-12, 's-bar', 'w16', 1, 'bottle', 'staff', 'New listing tasting for bar team', 'Head sommelier');
  L(-10, 'l-res', 'w21', 1, 'bottle', 'spoiled', 'Corked', 'Wine captain', 'claimed');
  L(-8, 's-bar', 'w01', 3, 'glass', 'wastage', 'Flat after 2 days open', 'Bar supervisor');
  L(-6, 's-ivd', 'w01', 1, 'bottle', 'breakage', 'Broken in buggy on the way to villa', 'IVD captain');
  L(-5, 'l-res', 'w07', 2, 'glass', 'comp', 'Apology for slow service', 'Restaurant manager');
  L(-3, 'l-pool', 'w13', 2, 'glass', 'wastage', 'Oxidised, open 4 days', 'Bar supervisor');
  L(-2, 's-lag', 'w20', 1, 'bottle', 'staff', 'Pre-shift pairing training', 'Head sommelier');
  // past month-end stock counts
  const m1 = lastDayPrevMonth(TODAY), m2 = lastDayPrevMonth(m1);
  for (const p of st.props) for (const l of p.locs) {
    const dates = l.id === 'l-tep' ? [m2] : [m2, m1];
    for (const date of dates) {
      const have = wines.filter(w => (st.stock[l.id][w.id] || 0) > 0);
      const lines = [];
      for (const w of have) {
        const x = rnd(); if (x > 0.14) continue;
        const sys = (st.stock[l.id][w.id] || 0) + Math.floor(rnd() * 4);
        const delta = x < 0.02 ? 1 : (x < 0.1 ? -1 : -0.5);
        lines.push([w.id, sys, sys + delta]);
      }
      const varCost = r2(lines.reduce((a, [wid, s, c]) => a + (c - s) * W[wid].cost, 0));
      st.counts.push({ id: 'C' + (st.seq++), date, loc: l.id, n: have.length, lines, varCost, varB: lines.reduce((a, [, s, c]) => a + c - s, 0), by: 'Cost controller' });
    }
  }
  // transfers + purchase orders
  const T = (d, from, to, wid, qty) => st.transfers.push({ id: 'T' + (st.seq++), date: addDays(TODAY, d), from, to, wid, qty });
  T(-6, 's-cel', 's-bar', 'w17', 6); T(-5, 's-cel', 's-lag', 'w07', 6); T(-3, 'l-cel', 'l-pool', 'w05', 6); T(-2, 's-cel', 's-bar', 'w01', 6); T(-1, 's-cel', 's-ivd', 'w02', 3);
  st.pos.push({ id: 'P' + (st.seq++), no: 'PO-2417', date: addDays(TODAY, -10), supplier: 'sg', prop: 'sbb', lines: [['w03', 12], ['w16', 12]], status: 'sent', eta: addDays(TODAY, 18) });
  st.pos.push({ id: 'P' + (st.seq++), no: 'PO-2398', date: addDays(TODAY, -21), supplier: 'local', prop: 'lcr', lines: [['w17', 24], ['w13', 24]], status: 'received', eta: addDays(TODAY, -14), received: addDays(TODAY, -14) });
  // outlet wine lists: what each outlet actually carries (stock or sales there)
  for (const p of st.props) for (const l of p.locs) {
    if (l.kind === 'cellar') continue;
    const sold = new Set(st.sales.filter(r => r[1] === l.id).map(r => r[2]));
    l.list = wines.filter(w => sold.has(w.id) || (st.stock[l.id][w.id] || 0) > 0).map(w => w.id);
  }
  st.props[0].locs.find(l => l.id === 's-bar').prices = { w01: { b: 225, g: 42 } };
  st.quiz = [
    { name: 'Aishath, Sunset Bar', score: 9, total: 10, date: addDays(TODAY, -4) },
    { name: 'Ibrahim, Lagoon Restaurant', score: 8, total: 10, date: addDays(TODAY, -6) },
    { name: 'Maria, In-Villa Dining', score: 6, total: 10, date: addDays(TODAY, -9) },
    { name: 'Hassan, Pool Bar', score: 7, total: 10, date: addDays(TODAY, -11) },
  ];
  return st;
}

/* ============ state ============ */
let S = null, WM = {}, LM = {};
let UI = { route: 'dashboard', prop: '', outlet: 'all' };
function reindex() {
  WM = Object.fromEntries(S.wines.map(w => [w.id, w]));
  LM = {};
  S.props.forEach(p => {
    (p.oldLocs || []).forEach(l => { LM[l.id] = { ...l, prop: p.id, removed: true }; });
    p.locs.forEach(l => { LM[l.id] = { ...l, prop: p.id }; });
  });
  if (!S.props.some(p => p.id === UI.prop)) UI.prop = S.props[0] ? S.props[0].id : '';
}
// ids are random so that several devices can add records at the same time without clashing
const rid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const uid = rid;
function normalizeState(st) {
  st.v = 2; st.seq ||= 1;
  st.settings = { ...DEFAULT_SETTINGS, ...(st.settings || {}), shelf: { ...DEFAULT_SETTINGS.shelf, ...((st.settings || {}).shelf || {}) } };
  for (const k of ['suppliers', 'props', 'wines', 'sales', 'losses', 'transfers', 'counts', 'pos', 'quiz']) if (!Array.isArray(st[k])) st[k] = [];
  for (const k of ['stock', 'open', 'postings']) if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = {};
  for (const p of st.props) {
    p.locs ||= [];
    if (!p.locs.some(l => l.kind === 'cellar' && l.main)) { const c = p.locs.find(l => l.kind === 'cellar'); if (c) c.main = true; }
    for (const l of p.locs) { st.stock[l.id] ||= {}; st.open[l.id] ||= {}; if (l.kind !== 'cellar') l.prices ||= {}; }
  }
  return st;
}
/* ============ lookups & maths ============ */
const P = id => S.props.find(p => p.id === id);
const curP = () => P(UI.prop);
const salesLocs = pid => P(pid).locs.filter(l => l.kind !== 'cellar');
const glassOK = l => !!l && l.kind !== 'cellar' && (l.glass != null ? !!l.glass : !!(KIND[l.kind] && KIND[l.kind].glasses > 0));
const glassLocs = pid => P(pid).locs.filter(glassOK);
const cellarOf = pid => P(pid).locs.find(l => l.kind === 'cellar' && l.main) || P(pid).locs.find(l => l.kind === 'cellar');
// the real location object inside S (LM holds copies)
const LO = id => { for (const p of S.props) { const l = p.locs.find(x => x.id === id); if (l) return l; } return null; };
// outlet wine lists. An outlet without a list (older data) carries every wine.
function onList(loc, wid) { const l = LM[loc]; if (!l || l.kind === 'cellar' || !l.list) return true; return l.list.includes(wid); }
function addToList(loc, wids) { const l = LO(loc); if (!l || l.kind === 'cellar') return 0; if (!l.list) l.list = S.wines.map(w => w.id); let n = 0; for (const id of wids) if (WM[id] && !l.list.includes(id)) { l.list.push(id); n++; } return n; }
// outlet price overrides fall back to the standard price on the wine
function priceAt(loc, w) {
  const l = LM[loc]; const o = l && l.prices && l.prices[w.id];
  const b = o && o.b != null && o.b > 0 ? o.b : w.price;
  const g = w.gprice ? (o && o.g != null && o.g > 0 ? o.g : w.gprice) : 0;
  return { b, g, own: !!(o && ((o.b != null && o.b !== w.price) || (o.g != null && o.g !== w.gprice))) };
}
// POS item numbers: set per wine, or the default 1000 + n (bottle) and 2000 + n (glass)
const codeB = w => (w.posB ? String(w.posB) : (w.pos > 0 && w.pos < 1000 ? String(1000 + w.pos) : ''));
const codeG = w => (w.gprice ? (w.posG ? String(w.posG) : (w.pos > 0 && w.pos < 1000 ? String(2000 + w.pos) : '')) : '');
const nextPos = () => Math.max(0, ...S.wines.map(x => x.pos || 0)) + 1;
// a location only counts for "not posted" or "not counted" checks after it was set up
const since = l => (l && l.created) || '0000-00-00';
const locName = id => LM[id] ? LM[id].name : id;
const supplier = id => S.suppliers.find(s => s.id === id) || S.suppliers[0];
const sealed = (loc, wid) => (S.stock[loc] && S.stock[loc][wid]) || 0;
const openB = (loc, wid) => S.open[loc] && S.open[loc][wid];
function eqAt(loc, wid) { const w = WM[wid]; const o = openB(loc, wid); const g = gpb(w); return sealed(loc, wid) + (o && g ? o.pours / g : 0); }
const propEq = (pid, wid) => P(pid).locs.reduce((a, l) => a + eqAt(l.id, wid), 0);
const cpg = w => gpb(w) ? w.cost / gpb(w) : 0;
const cosB = w => w.price ? w.cost / w.price * 100 : null;
const cosG = w => w.gprice ? cpg(w) / w.gprice * 100 : null;
const guestPrice = n => n * (1 + S.settings.sc / 100) * (1 + S.settings.gst / 100);
const wLabel = w => `${w.producer} ${w.name}`.replace(/^(Château [^ ]+(?: [^ ]+)?) \1/, '$1');
function wName(w) { return w.producer === w.name || w.name.startsWith(w.producer) ? w.name : `${w.producer} ${w.name}`; }
const locSet = (pid, outlet) => new Set(outlet && outlet !== 'all' ? [outlet] : P(pid).locs.map(l => l.id));
const D30 = () => addDays(TODAY, -29);

function agg(from, to, locs) {
  const A = { rev: 0, cost: 0, b: 0, g: 0, opened: 0, byWine: {}, byLoc: {}, byDay: {} };
  for (const r of S.sales) {
    const [d, loc, wid, b, g, op, rev, cost] = r;
    if (d < from || d > to) continue;
    if (locs && !locs.has(loc)) continue;
    A.rev += rev; A.cost += cost; A.b += b; A.g += g; A.opened += op;
    const x = A.byWine[wid] ||= { rev: 0, cost: 0, b: 0, g: 0, opened: 0, last: '' };
    x.rev += rev; x.cost += cost; x.b += b; x.g += g; x.opened += op; if (d > x.last) x.last = d;
    const y = A.byLoc[loc] ||= { rev: 0, cost: 0, b: 0, g: 0, opened: 0 };
    y.rev += rev; y.cost += cost; y.b += b; y.g += g; y.opened += op;
    const z = A.byDay[d] ||= { rev: 0, cost: 0 }; z.rev += rev; z.cost += cost;
  }
  return A;
}
function lossesIn(from, to, locs) { return S.losses.filter(l => l.date >= from && l.date <= to && (!locs || locs.has(l.loc))); }
function lastSold(pid, wid) { const ls = locSet(pid); let m = ''; for (const r of S.sales) if (r[2] === wid && ls.has(r[1]) && (r[3] || r[4]) && r[0] > m) m = r[0]; return m; }

/* stock movements */
function consumeGlasses(loc, wid, g, date) {
  // returns bottles opened; takes sealed bottles as needed
  const w = WM[wid]; const gp = gpb(w); let opened = 0;
  S.open[loc] ||= {}; S.stock[loc] ||= {};
  let o = S.open[loc][wid];
  for (let i = 0; i < g; i++) {
    if (!o || o.pours <= 0) { opened++; o = S.open[loc][wid] = { pours: gp, opened: date }; }
    o.pours--;
  }
  if (o && o.pours <= 0) delete S.open[loc][wid];
  return opened;
}
function pullFromCellar(loc, wid, need, date) {
  const pid = LM[loc].prop; const cel = cellarOf(pid).id; if (cel === loc) return 0;
  const have = sealed(loc, wid); const short = need - have; if (short <= 0) return 0;
  const avail = Math.max(0, sealed(cel, wid)); const q = Math.min(short, avail); if (q <= 0) return 0;
  S.stock[cel][wid] = sealed(cel, wid) - q; S.stock[loc][wid] = sealed(loc, wid) + q;
  S.transfers.push({ id: uid('T'), date, from: cel, to: loc, wid, qty: q, auto: true });
  return q;
}
function postSales(date, loc, lines, autoPull) {
  const out = { b: 0, g: 0, rev: 0, cost: 0, pulled: 0, negative: [] };
  S.stock[loc] ||= {};
  for (const { wid, b, g } of lines) {
    const w = WM[wid]; if (!w || (!b && !g)) continue;
    // work out bottles needed for glasses before touching stock
    const o = openB(loc, wid); const gp = gpb(w);
    let poursLeft = o ? o.pours : 0, needOpen = 0;
    for (let i = 0; i < (g || 0); i++) { if (poursLeft <= 0) { needOpen++; poursLeft = gp; } poursLeft--; }
    const need = (b || 0) + needOpen;
    if (autoPull) out.pulled += pullFromCellar(loc, wid, need, date);
    const opened = g ? consumeGlasses(loc, wid, g, date) : 0;
    S.stock[loc][wid] = sealed(loc, wid) - (b || 0) - opened;
    if (S.stock[loc][wid] < 0) out.negative.push(wid);
    const pr = priceAt(loc, w); const rev = (b || 0) * pr.b + (g || 0) * pr.g; const cost = (b || 0) * w.cost + (g || 0) * cpg(w);
    S.sales.push([date, loc, wid, b || 0, g || 0, opened, r2(rev), r2(cost), rid('s')]);
    out.b += b || 0; out.g += g || 0; out.rev += rev; out.cost += cost;
  }
  S.postings[loc] ||= []; if (!S.postings[loc].includes(date)) S.postings[loc].push(date);
  return out;
}
function isPosted(loc, date) { return (S.postings[loc] || []).includes(date); }

/* reorder maths */
function reorderRows(pid) {
  const A = agg(D30(), TODAY, locSet(pid));
  const onOrder = {};
  S.pos.filter(po => po.prop === pid && po.status === 'sent').forEach(po => po.lines.forEach(([wid, q]) => onOrder[wid] = (onOrder[wid] || 0) + q));
  return S.wines.map(w => {
    const sup = supplier(w.supplier); const x = A.byWine[w.id] || { b: 0, g: 0 };
    const used = x.b + (gpb(w) ? x.g / gpb(w) : 0); const avg = used / 30;
    const stock = propEq(pid, w.id); const oo = onOrder[w.id] || 0;
    const cover = avg > 0 ? stock / avg : Infinity;
    const rp = Math.max(w.par, Math.ceil(avg * (sup.lead + S.settings.safetyDays)));
    const target = rp + Math.ceil(avg * S.settings.cycleDays);
    const posn = stock + oo; let status;
    if (stock < 0.05 && oo === 0) status = 'out';
    else if (avg > 0 && cover < sup.lead && oo === 0) status = 'urgent';
    else if (posn < rp) status = 'order';
    else if (posn < rp * 1.25) status = 'soon';
    else if ((avg > 0 && cover > 180) || (avg === 0 && stock > w.par * 1.5)) status = 'over';
    else status = 'ok';
    let qty = 0;
    if (['out', 'urgent', 'order', 'soon'].includes(status)) { const raw = Math.max(0, target - posn); qty = Math.ceil(raw / w.caseSize) * w.caseSize; if (!qty && status !== 'soon') qty = w.caseSize; }
    return { w, sup, avg, stock, oo, cover, rp, target, status, qty };
  });
}
const RSTAT = {
  out: ['Out of stock', 'bad', 0], urgent: ['Runs out before delivery', 'bad', 1], order: ['Order now', 'warn', 2],
  soon: ['Order soon', 'info', 3], ok: ['Healthy', 'good', 4], over: ['Overstocked', 'plain', 5],
};

/* pricing maths */
function targetCos(w, kind) {
  const st = S.settings;
  if (kind === 'glass') return st.cosGlass;
  if (st.priceMode === 'sliding') { for (const b of st.bands) if (b.upto == null || w.cost <= b.upto) return b.cos; }
  return st.cosBottle;
}
const roundUp = (p, r) => Math.ceil(p / r - 1e-9) * r;
const sugBottle = w => roundUp(w.cost / (targetCos(w, 'bottle') / 100), S.settings.rounding);
const sugGlass = w => w.gprice ? roundUp(cpg(w) / (S.settings.cosGlass / 100), 1) : 0;
function priceFlag(cos, target) { const b = S.settings.band; if (cos > target + b) return ['Margin leak', 'bad']; if (cos < target - b) return ['Priced high', 'info']; return ['On target', 'good']; }

/* open-bottle freshness */
function freshness(w, o) {
  const age = diffDays(o.opened, TODAY); const life = S.settings.shelf[w.type] ?? 3;
  if (age > life) return { age, life, lbl: 'Past shelf life', cls: 'bad' };
  if (age === life) return { age, life, lbl: 'Use today', cls: 'warn' };
  return { age, life, lbl: 'Fresh', cls: 'good' };
}
function openList(pid, outlet) {
  const rows = [];
  for (const l of P(pid).locs) {
    if (outlet && outlet !== 'all' && l.id !== outlet) continue;
    for (const [wid, o] of Object.entries(S.open[l.id] || {})) { const w = WM[wid]; if (!w) continue; rows.push({ loc: l.id, w, o, f: freshness(w, o) }); }
  }
  return rows;
}
function yieldRows(pid) {
  const A = agg(D30(), TODAY, locSet(pid)); const rows = [];
  const byKey = {};
  for (const r of S.sales) {
    if (r[0] < D30() || !LM[r[1]] || LM[r[1]].prop !== pid || !r[4]) continue;
    const k = r[1] + '|' + r[2]; const x = byKey[k] ||= { loc: r[1], wid: r[2], g: 0, opened: 0 }; x.g += r[4]; x.opened += r[5];
  }
  for (const x of Object.values(byKey)) {
    const w = WM[x.wid]; if (!w || !gpb(w) || x.opened < 2) continue;
    const actual = x.g / x.opened; const std = gpb(w); const y = actual / std * 100;
    const lost = Math.max(0, x.opened - x.g / std) * w.cost;
    rows.push({ ...x, w, actual, std, y, lost });
  }
  void A;
  return rows;
}
function yieldByLoc(pid) {
  const out = {};
  for (const r of yieldRows(pid)) { const o = out[r.loc] ||= { g: 0, opened: 0, eqStd: 0, lost: 0 }; o.g += r.g; o.opened += r.opened; o.eqStd += r.g / r.std; o.lost += r.lost; }
  for (const o of Object.values(out)) o.y = o.opened ? o.eqStd / o.opened * 100 : 100;
  return out;
}

/* attention list (dashboard, badges, group) */
function attention(pid) {
  const items = []; const y = addDays(TODAY, -1);
  for (const l of salesLocs(pid)) if (since(l) <= y && !isPosted(l.id, y)) items.push({ sev: 'bad', t: `${l.name}: sales for ${fmtD(y)} not posted`, s: 'Stock and margins are out of date until the day is posted.', act: 'go-sales', arg: l.id, btn: 'Post sales' });
  const rr = reorderRows(pid);
  const urgent = rr.filter(r => r.status === 'urgent'), order = rr.filter(r => r.status === 'order'), out = rr.filter(r => r.status === 'out');
  if (urgent.length) items.push({ sev: 'bad', t: `${urgent.length} wine${urgent.length > 1 ? 's' : ''} will run out before a delivery can arrive`, s: urgent.slice(0, 3).map(r => `${wName(r.w)} (${Math.round(r.cover)} days left, ${r.sup.lead}-day lead time)`).join(' · '), act: 'go', arg: 'reorder', btn: 'Reorder' });
  if (order.length) items.push({ sev: 'warn', t: `${order.length} wine${order.length > 1 ? 's are' : ' is'} below the reorder point`, s: order.slice(0, 3).map(r => wName(r.w)).join(' · '), act: 'go', arg: 'reorder', btn: 'Review' });
  if (out.length) items.push({ sev: 'warn', t: `${out.map(r => wName(r.w)).join(', ')} ${out.length > 1 ? 'are' : 'is'} out of stock`, s: S.settings.autoHide ? 'Hidden from the guest wine list automatically.' : 'Shown as sold out on the guest wine list.', act: 'go', arg: 'reorder', btn: 'Reorder' });
  const stale = openList(pid).filter(x => x.f.cls === 'bad');
  if (stale.length) items.push({ sev: 'warn', t: `${stale.length} open bottle${stale.length > 1 ? 's are' : ' is'} past shelf life`, s: stale.slice(0, 3).map(x => `${wName(x.w)} at ${locName(x.loc)}, open ${x.f.age} days`).join(' · '), act: 'go', arg: 'glass', btn: 'Check' });
  const yl = yieldByLoc(pid);
  for (const [loc, o] of Object.entries(yl)) if (o.y < 93) items.push({ sev: 'warn', t: `${locName(loc)} is getting ${nf(o.y, 0)}% of the expected glasses per bottle`, s: `Likely over-pouring. About ${money(o.lost)} of wine lost in the last 30 days.`, act: 'go', arg: 'glass', btn: 'See pours' });
  const dead = S.wines.filter(w => propEq(pid, w.id) > 0.5 && listedLong(w) && !lastSoldWithin(pid, w.id, 60));
  if (dead.length) { const v = dead.reduce((a, w) => a + propEq(pid, w.id) * w.cost, 0); items.push({ sev: 'info', t: `${dead.length} wine${dead.length > 1 ? 's have' : ' has'} not sold in 60 days`, s: `${money(v)} tied up at cost: ${dead.map(wName).join(', ')}`, act: 'go-report', arg: 'slow', btn: 'Dead stock' }); }
  for (const l of P(pid).locs) { const c = lastCount(l.id); const age = c ? diffDays(c.date, TODAY) : diffDays(since(l), TODAY); if (age > 35) items.push({ sev: 'warn', t: `${l.name} has not been counted since ${c ? fmtD(c.date) : 'opening'}`, s: 'Month-end count is overdue. Variance cannot be checked.', act: 'go-count', arg: l.id, btn: 'Count' }); }
  const pend = S.losses.filter(x => x.credit === 'pending' && LM[x.loc] && LM[x.loc].prop === pid);
  if (pend.length) items.push({ sev: 'info', t: `${pend.length} corked bottle${pend.length > 1 ? 's' : ''} waiting for supplier credit`, s: `${money(pend.reduce((a, x) => a + x.cost, 0))} to claim back.`, act: 'go', arg: 'losses', btn: 'Claim' });
  const rank = { bad: 0, warn: 1, info: 2 };
  return items.sort((a, b) => rank[a.sev] - rank[b.sev]);
}
// a wine only counts as dead stock once it has been on the list for 60 days
const listedLong = w => !w.added || diffDays(w.added, TODAY) >= 60;
function lastSoldWithin(pid, wid, days) { const d = lastSold(pid, wid); return d && diffDays(d, TODAY) <= days; }
function lastCount(loc) { let c = null; for (const x of S.counts) if (x.loc === loc && (!c || x.date > c.date)) c = x; return c; }

/* step-up suggestion for guests and training */
function available(w, pid) { return propEq(pid, w.id) > 0.05; }
function stepUp(w, pid, loc) {
  let best = null, bs = -1e9; const pr = x => loc ? priceAt(loc, x).b : x.price;
  for (const x of S.wines) {
    if (x.id === w.id || x.type !== w.type || !available(x, pid) || (loc && !onList(loc, x.id))) continue;
    const ratio = pr(x) / pr(w); if (ratio < 1.15 || ratio > 2.7) continue;
    let s = 0; if (x.grapes.some(g => w.grapes.includes(g))) s += 3; if (x.region === w.region) s += 2; if (x.country === w.country) s += 1;
    s -= Math.abs(ratio - 1.6);
    if (s > bs) { bs = s; best = x; }
  }
  return best;
}

