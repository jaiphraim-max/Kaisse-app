/* ===========================================================
   APP — logique principale de Kaisse
=========================================================== */

const state = {
  view: 'caisse',
  products: [],
  categories: [],
  tables: [],
  sales: [],
  zClosures: [],
  settings: {
    shopName: 'Mon Restobar', currency: 'Ar', cashierPin: '1234', adminPin: '9999',
    accentColor: '#C9622A', textColor: '#F2E9DC', theme: 'dark',
    productNameColor: '#F2E9DC', payButtonColor: '#C9622A',
    nif: '', stat: '', phone: '', address: '', thankYouMessage: 'Merci de votre visite ! Au plaisir de vous revoir.',
    sideOptions: ['Riz', 'Frites', 'Légumes', 'Salade'],
    sauceOptions: ['Poivre', 'Roquefort', 'Champignons', 'Sans sauce'],
    kitchenPrinterEnabled: false, kitchenPrinterType: 'none', kitchenPrinterName: '', kitchenPrinterWidth: '80',
    receiptPrinterEnabled: false, receiptPrinterType: 'none', receiptPrinterName: '', receiptPrinterWidth: '80',
    invoicePrinterEnabled: false, invoicePrinterType: 'none', invoicePrinterName: '', invoicePrinterWidth: 'A4',
  },
  activeCategory: 'all',
  ticket: [],          // { productId, name, price, qty }
  ticketContext: null, // null = vente directe | { tableId, tableName }
  selectedPayMethod: 'especes',
  unlockedAdmin: false,
};

const mainArea = document.getElementById('mainArea');

/* ---------- Formatage ---------- */
function fmt(n) {
  return Math.round(n).toLocaleString('fr-FR') + ' ' + state.settings.currency;
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2200);
}

/* ---------- Réseau (en ligne / hors ligne) ---------- */
async function checkRealConnectivity() {
  // navigator.onLine ne teste que le Wi-Fi/données actives, pas une vraie connexion internet.
  // On fait donc une petite requête réelle avec un délai court pour vérifier.
  if (!navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    await fetch('https://www.gstatic.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return true;
  } catch (e) {
    return false;
  }
}

async function updateNetStatus() {
  // Ne rien faire si l'app est encore verrouillée : évite toute interférence avec le clavier du code PIN
  if (document.getElementById('lockScreen')) return;
  const badge = document.getElementById('netStatus');
  if (!badge) return;
  const label = badge.querySelector('.net-label');
  const isOnline = await checkRealConnectivity();
  if (isOnline) {
    badge.classList.remove('net-offline');
    badge.classList.add('net-online');
    label.textContent = 'En ligne';
  } else {
    badge.classList.remove('net-online');
    badge.classList.add('net-offline');
    label.textContent = 'Hors ligne';
  }
  return isOnline;
}
window.addEventListener('online', updateNetStatus);
window.addEventListener('offline', updateNetStatus);
// Revérifie périodiquement, car navigator.onLine seul peut mentir sur la vraie connectivité
setInterval(updateNetStatus, 15000);

/* ---------- Chargement des données ---------- */
async function loadAll() {
  state.products = await Store.getAll('products');
  state.categories = await Store.getAll('categories');
  state.tables = await Store.getAll('tables');
  state.sales = await Store.getAll('sales');
  state.zClosures = await Store.getAll('zClosures');
  const shopName = await Store.get('settings', 'shopName');
  const currency = await Store.get('settings', 'currency');
  const cashierPin = await Store.get('settings', 'cashierPin');
  const adminPin = await Store.get('settings', 'adminPin');
  const accentColor = await Store.get('settings', 'accentColor');
  const textColor = await Store.get('settings', 'textColor');
  const theme = await Store.get('settings', 'theme');
  const nif = await Store.get('settings', 'nif');
  const stat = await Store.get('settings', 'stat');
  const phone = await Store.get('settings', 'phone');
  const address = await Store.get('settings', 'address');
  const thankYouMessage = await Store.get('settings', 'thankYouMessage');
  const productNameColor = await Store.get('settings', 'productNameColor');
  const payButtonColor = await Store.get('settings', 'payButtonColor');
  const sideOptions = await Store.get('settings', 'sideOptions');
  const sauceOptions = await Store.get('settings', 'sauceOptions');
  const kitchenPrinterEnabled = await Store.get('settings', 'kitchenPrinterEnabled');
  const kitchenPrinterType = await Store.get('settings', 'kitchenPrinterType');
  const kitchenPrinterName = await Store.get('settings', 'kitchenPrinterName');
  const kitchenPrinterWidth = await Store.get('settings', 'kitchenPrinterWidth');
  const receiptPrinterEnabled = await Store.get('settings', 'receiptPrinterEnabled');
  const receiptPrinterType = await Store.get('settings', 'receiptPrinterType');
  const receiptPrinterName = await Store.get('settings', 'receiptPrinterName');
  const receiptPrinterWidth = await Store.get('settings', 'receiptPrinterWidth');
  const invoicePrinterEnabled = await Store.get('settings', 'invoicePrinterEnabled');
  const invoicePrinterType = await Store.get('settings', 'invoicePrinterType');
  const invoicePrinterName = await Store.get('settings', 'invoicePrinterName');
  const invoicePrinterWidth = await Store.get('settings', 'invoicePrinterWidth');
  if (shopName) state.settings.shopName = shopName.value;
  if (currency) state.settings.currency = currency.value;
  if (cashierPin) state.settings.cashierPin = cashierPin.value;
  if (adminPin) state.settings.adminPin = adminPin.value;
  if (accentColor) state.settings.accentColor = accentColor.value;
  if (textColor) state.settings.textColor = textColor.value;
  if (theme) state.settings.theme = theme.value;
  if (nif) state.settings.nif = nif.value;
  if (stat) state.settings.stat = stat.value;
  if (phone) state.settings.phone = phone.value;
  if (address) state.settings.address = address.value;
  if (thankYouMessage) state.settings.thankYouMessage = thankYouMessage.value;
  if (productNameColor) state.settings.productNameColor = productNameColor.value;
  if (payButtonColor) state.settings.payButtonColor = payButtonColor.value;
  if (sideOptions) state.settings.sideOptions = sideOptions.value;
  if (sauceOptions) state.settings.sauceOptions = sauceOptions.value;
  if (kitchenPrinterEnabled) state.settings.kitchenPrinterEnabled = kitchenPrinterEnabled.value;
  if (kitchenPrinterType) state.settings.kitchenPrinterType = kitchenPrinterType.value;
  if (kitchenPrinterName) state.settings.kitchenPrinterName = kitchenPrinterName.value;
  if (kitchenPrinterWidth) state.settings.kitchenPrinterWidth = kitchenPrinterWidth.value;
  if (receiptPrinterEnabled) state.settings.receiptPrinterEnabled = receiptPrinterEnabled.value;
  if (receiptPrinterType) state.settings.receiptPrinterType = receiptPrinterType.value;
  if (receiptPrinterName) state.settings.receiptPrinterName = receiptPrinterName.value;
  if (receiptPrinterWidth) state.settings.receiptPrinterWidth = receiptPrinterWidth.value;
  if (invoicePrinterEnabled) state.settings.invoicePrinterEnabled = invoicePrinterEnabled.value;
  if (invoicePrinterType) state.settings.invoicePrinterType = invoicePrinterType.value;
  if (invoicePrinterName) state.settings.invoicePrinterName = invoicePrinterName.value;
  if (invoicePrinterWidth) state.settings.invoicePrinterWidth = invoicePrinterWidth.value;
  applyTheme();
}

function applyTheme() {
  document.documentElement.style.setProperty('--accent', state.settings.accentColor);
  document.documentElement.style.setProperty('--product-name-color', state.settings.productNameColor);
  document.documentElement.style.setProperty('--pay-button-color', state.settings.payButtonColor);
  document.body.classList.toggle('theme-light', state.settings.theme === 'light');
  document.body.classList.toggle('theme-dark', state.settings.theme !== 'light');
  if (state.settings.theme === 'light') {
    document.documentElement.style.removeProperty('--text');
  } else {
    document.documentElement.style.setProperty('--text', state.settings.textColor);
  }
}

/* ---------- Navigation ---------- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

const ADMIN_VIEWS = ['stock', 'rapports', 'parametres'];

function switchView(view) {
  if (ADMIN_VIEWS.includes(view) && !state.unlockedAdmin) {
    askAdminPin(() => {
      state.unlockedAdmin = true;
      switchView(view);
    });
    return;
  }
  state.view = view;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  render();
}

function askAdminPin(onSuccess) {
  showModal(`
    <h3>Code administrateur</h3>
    <p style="color:var(--text-dim); font-size:13px; margin-bottom:10px;">Cette section est réservée au gérant.</p>
    <div class="form-group">
      <input type="tel" id="adminPinInput" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="Code PIN admin" maxlength="8" class="input-note">
    </div>
    <p id="adminPinError" style="color:var(--danger); font-size:12.5px; display:none;">Code incorrect.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="modalCancel">Annuler</button>
      <button class="btn btn-primary" id="modalConfirmPin">Déverrouiller</button>
    </div>
  `);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  const input = document.getElementById('adminPinInput');
  input.style.cssText = '-webkit-text-security: disc; text-security: disc;';
  input.addEventListener('click', () => input.focus());
  setTimeout(() => input.focus(), 100);
  const tryUnlock = () => {
    if (input.value === state.settings.adminPin) {
      closeModal();
      onSuccess();
    } else {
      document.getElementById('adminPinError').style.display = 'block';
      input.value = '';
    }
  };
  document.getElementById('modalConfirmPin').addEventListener('click', tryUnlock);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
}

function render() {
  const tplId = 'tpl-' + state.view;
  const tpl = document.getElementById(tplId);
  mainArea.innerHTML = '';
  mainArea.appendChild(tpl.content.cloneNode(true));

  if (state.view === 'caisse') renderCaisse();
  if (state.view === 'salle') renderSalle();
  if (state.view === 'stock') renderStock();
  if (state.view === 'rapports') renderRapports();
  if (state.view === 'parametres') renderParametres();
}

/* ===========================================================
   VUE CAISSE
=========================================================== */
function renderCaisse() {
  renderCatChips();
  renderProductGrid();
  renderTicket();

  document.getElementById('ticketTitle').textContent =
    state.ticketContext ? 'Table ' + state.ticketContext.tableName : 'Vente directe';

  document.getElementById('clearTicket').addEventListener('click', () => {
    state.ticket = [];
    renderTicket();
  });

  document.getElementById('btnHold').addEventListener('click', holdTicket);
  document.getElementById('btnPay').addEventListener('click', openPaymentModal);
  document.getElementById('btnSendKitchen').addEventListener('click', sendToKitchen);
}

function renderCatChips() {
  const chips = document.getElementById('catChips');
  const all = [{ id: 'all', name: 'Tout' }, ...state.categories];
  chips.innerHTML = '';
  all.forEach(c => {
    const chip = document.createElement('button');
    chip.className = 'cat-chip' + (state.activeCategory === c.id ? ' active' : '');
    chip.textContent = c.name;
    chip.addEventListener('click', () => {
      state.activeCategory = c.id;
      renderCatChips();
      renderProductGrid();
    });
    chips.appendChild(chip);
  });
}

function renderProductGrid() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  const list = state.products.filter(p =>
    state.activeCategory === 'all' || p.category === state.activeCategory
  );
  if (list.length === 0) {
    grid.innerHTML = '<p class="empty-state">Aucun produit dans cette catégorie.</p>';
    return;
  }
  list.forEach(p => {
    const card = document.createElement('button');
    card.className = 'product-card' + (p.stock <= 0 ? ' out' : '');
    card.disabled = p.stock <= 0;
    const lowClass = p.stock <= p.lowStockAt ? ' low' : '';
    card.innerHTML = `
      <div class="p-name">${escapeHtml(p.name)}</div>
      <div>
        <div class="p-price">${fmt(p.price)}</div>
        <div class="p-stock${lowClass}">${p.stock <= 0 ? 'Rupture' : p.stock + ' en stock'}</div>
      </div>
    `;
    card.addEventListener('click', () => addToTicket(p));
    grid.appendChild(card);
  });
}

const COOKING_OPTIONS = ['Bleue', 'Saignante', 'Rosée', 'À point', 'Bien cuit'];

function addToTicket(product) {
  if (product.category === 'cat-plats' || product.category === 'cat-pizza') {
    openDishOptionsModal(product);
    return;
  }
  addLineToTicket(product, null);
}

function addLineToTicket(product, options) {
  // Une ligne distincte par combinaison produit + options
  const optionsKey = options ? JSON.stringify(options) : '';
  const line = state.ticket.find(l => l.productId === product.id && (l.optionsKey || '') === optionsKey);
  const totalQtyForProduct = state.ticket
    .filter(l => l.productId === product.id)
    .reduce((sum, l) => sum + l.qty, 0);
  if (totalQtyForProduct + 1 > product.stock) {
    toast('Stock insuffisant');
    return;
  }
  if (line) {
    line.qty += 1;
  } else {
    state.ticket.push({
      lineId: uid(),
      productId: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
      options: options || null,
      optionsKey,
    });
  }
  renderTicket();
}

function openDishOptionsModal(product) {
  const isRedMeat = !!product.isRedMeat;
  showModal(`
    <h3>${escapeHtml(product.name)}</h3>
    <p style="color:var(--text-dim); font-size:12.5px; margin-bottom:14px;">Précisez la commande du client (facultatif)</p>

    ${isRedMeat ? `
    <div class="option-group">
      <label class="option-label">Cuisson</label>
      <div class="option-chips" id="cookingChips">
        ${COOKING_OPTIONS.map(o => `<button type="button" class="option-chip" data-value="${o}">${o}</button>`).join('')}
      </div>
      <input type="text" id="cookingNote" class="input-note" placeholder="Autre précision de cuisson...">
    </div>

    <div class="option-group">
      <label class="option-label">Sauce</label>
      <div class="option-chips" id="sauceChips">
        ${state.settings.sauceOptions.map(o => `<button type="button" class="option-chip" data-value="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}
      </div>
      <input type="text" id="sauceNote" class="input-note" placeholder="Autre sauce...">
    </div>
    ` : ''}

    <div class="option-group">
      <label class="option-label">Accompagnements <span style="font-weight:400; text-transform:none;">(jusqu'à 2)</span></label>
      <div class="option-chips" id="sideChips">
        ${state.settings.sideOptions.map(o => `<button type="button" class="option-chip" data-value="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}
      </div>
      <input type="text" id="sideNote" class="input-note" placeholder="Autre accompagnement...">
    </div>

    <div class="modal-actions">
      <button class="btn btn-secondary" id="modalCancel">Annuler</button>
      <button class="btn btn-primary" id="modalAddDish">Ajouter au ticket</button>
    </div>
  `);

  const selected = { cooking: null, sauce: null, sides: [] };

  if (isRedMeat) {
    wireSingleChipGroup('cookingChips', (val) => { selected.cooking = val; });
    wireSingleChipGroup('sauceChips', (val) => { selected.sauce = val; });
  }

  // Accompagnements : sélection multiple, max 2
  const sideContainer = document.getElementById('sideChips');
  sideContainer.querySelectorAll('.option-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const value = chip.dataset.value;
      const isActive = chip.classList.contains('selected');
      if (isActive) {
        chip.classList.remove('selected');
        selected.sides = selected.sides.filter(v => v !== value);
      } else {
        if (selected.sides.length >= 2) {
          toast('Maximum 2 accompagnements');
          return;
        }
        chip.classList.add('selected');
        selected.sides.push(value);
      }
    });
  });

  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalAddDish').addEventListener('click', () => {
    const cookingNote = isRedMeat ? document.getElementById('cookingNote').value.trim() : '';
    const sauceNote = isRedMeat ? document.getElementById('sauceNote').value.trim() : '';
    const sideNote = document.getElementById('sideNote').value.trim();

    const cooking = isRedMeat ? [selected.cooking, cookingNote].filter(Boolean).join(' — ') : '';
    const sauce = isRedMeat ? [selected.sauce, sauceNote].filter(Boolean).join(' — ') : '';
    const sidesList = [...selected.sides];
    if (sideNote) sidesList.push(sideNote);
    const side = sidesList.join(' + ');

    const options = (cooking || sauce || side) ? { cooking, sauce, side } : null;
    closeModal();
    addLineToTicket(product, options);
  });
}

function wireSingleChipGroup(containerId, onSelect) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.option-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const isActive = chip.classList.contains('selected');
      container.querySelectorAll('.option-chip').forEach(c => c.classList.remove('selected'));
      if (!isActive) {
        chip.classList.add('selected');
        onSelect(chip.dataset.value);
      } else {
        onSelect(null);
      }
    });
  });
}

function formatOptions(options) {
  if (!options) return '';
  const parts = [];
  if (options.cooking) parts.push('Cuisson: ' + options.cooking);
  if (options.sauce) parts.push('Sauce: ' + options.sauce);
  if (options.side) parts.push('Avec: ' + options.side);
  return parts.join(' · ');
}

function changeQty(lineId, delta) {
  const line = state.ticket.find(l => l.lineId === lineId);
  if (!line) return;
  const product = state.products.find(p => p.id === line.productId);
  const newQty = line.qty + delta;
  const otherLinesQty = state.ticket
    .filter(l => l.productId === line.productId && l.lineId !== lineId)
    .reduce((sum, l) => sum + l.qty, 0);
  if (newQty <= 0) {
    state.ticket = state.ticket.filter(l => l.lineId !== lineId);
  } else if (product && (otherLinesQty + newQty) > product.stock) {
    toast('Stock insuffisant');
    return;
  } else {
    line.qty = newQty;
  }
  renderTicket();
}

function renderTicket() {
  const linesEl = document.getElementById('ticketLines');
  if (state.ticket.length === 0) {
    linesEl.innerHTML = '<p class="ticket-empty">Aucun article. Touchez un produit pour l\'ajouter.</p>';
  } else {
    linesEl.innerHTML = '';
    state.ticket.forEach(l => {
      const row = document.createElement('div');
      row.className = 'ticket-line';
      const optionsHtml = formatOptions(l.options);
      row.innerHTML = `
        <div class="tl-info">
          <div class="tl-name">${escapeHtml(l.name)}</div>
          <div class="tl-price">${fmt(l.price)} / unité</div>
          ${optionsHtml ? `<div class="tl-options">${escapeHtml(optionsHtml)}</div>` : ''}
        </div>
        <div class="tl-qty">
          <button data-action="minus">−</button>
          <span>${l.qty}</span>
          <button data-action="plus">+</button>
        </div>
        <div class="tl-total">${fmt(l.price * l.qty)}</div>
      `;
      row.querySelector('[data-action="minus"]').addEventListener('click', () => changeQty(l.lineId, -1));
      row.querySelector('[data-action="plus"]').addEventListener('click', () => changeQty(l.lineId, 1));
      linesEl.appendChild(row);
    });
  }
  const total = state.ticket.reduce((sum, l) => sum + l.price * l.qty, 0);
  document.getElementById('sumSubtotal').textContent = fmt(total);
  document.getElementById('sumTotal').textContent = fmt(total);

  const payBtn = document.getElementById('btnPay');
  if (payBtn) payBtn.disabled = state.ticket.length === 0;
}

function sendToKitchen() {
  if (state.ticket.length === 0) {
    toast('Le ticket est vide');
    return;
  }
  const now = new Date();
  const kitchenItems = state.ticket.filter(l => {
    const product = state.products.find(p => p.id === l.productId);
    return product && (product.category === 'cat-plats' || product.category === 'cat-pizza');
  });

  if (kitchenItems.length === 0) {
    toast('Aucun plat à envoyer en cuisine dans ce ticket');
    return;
  }

  showModal(`
    <h3>Bon de cuisine</h3>
    <div class="receipt-box">
      <div style="text-align:center; margin-bottom:8px;">
        <strong style="font-size:16px;">${state.ticketContext ? 'TABLE ' + escapeHtml(state.ticketContext.tableName) : 'VENTE DIRECTE'}</strong><br>
        <span style="font-size:12px;">${now.toLocaleString('fr-FR')}</span>
      </div>
      <hr>
      ${kitchenItems.map(l => `
        <div style="margin-bottom:8px;">
          <div style="font-weight:700; font-size:15px;">${l.qty}× ${escapeHtml(l.name)}</div>
          ${formatOptions(l.options) ? `<div style="font-size:12.5px; color:var(--text-dim); padding-left:8px;">${escapeHtml(formatOptions(l.options))}</div>` : ''}
        </div>
      `).join('')}
    </div>
    ${!state.settings.kitchenPrinterEnabled ? `<p class="settings-hint" style="margin-top:10px;">Aucune imprimante cuisine configurée. Ce bon reste affiché à l'écran — montrez-le en cuisine ou notez-le à la main.</p>` : ''}
    <div class="modal-actions">
      <button class="btn btn-primary" id="modalCloseKitchen" style="width:100%;">Fermer</button>
    </div>
  `);
  document.getElementById('modalCloseKitchen').addEventListener('click', closeModal);
  toast('Bon de cuisine généré');
}

function holdTicket() {
  if (state.ticket.length === 0) {
    toast('Le ticket est vide');
    return;
  }
  if (!state.ticketContext) {
    toast('Sélectionnez une table pour mettre en attente');
    return;
  }
  const table = state.tables.find(t => t.id === state.ticketContext.tableId);
  if (table) {
    table.status = 'occupied';
    table.order = [...state.ticket];
    table.openedAt = table.openedAt || new Date().toISOString();
    Store.put('tables', table);
  }
  toast('Commande enregistrée sur ' + state.ticketContext.tableName);
  state.ticket = [];
  state.ticketContext = null;
  switchView('salle');
}

/* ---------- Paiement ---------- */
function openPaymentModal() {
  if (state.ticket.length === 0) return;
  const total = state.ticket.reduce((sum, l) => sum + l.price * l.qty, 0);
  state.selectedPayMethod = 'especes';

  showModal(`
    <h3>Encaissement</h3>
    <div class="receipt-box">
      ${state.ticket.map(l => `
        <div class="r-line"><span>${l.qty}× ${escapeHtml(l.name)}</span><span>${fmt(l.price * l.qty)}</span></div>
        ${formatOptions(l.options) ? `<div class="r-options">${escapeHtml(formatOptions(l.options))}</div>` : ''}
      `).join('')}
      <hr>
      <div class="r-line"><strong>Total</strong><strong>${fmt(total)}</strong></div>
    </div>
    <div class="pay-methods" id="payMethods">
      <button class="pay-method selected" data-method="especes">Espèces</button>
      <button class="pay-method" data-method="mobile_money">Mobile Money</button>
      <button class="pay-method" data-method="carte">Carte</button>
      <button class="pay-method" data-method="credit">Crédit client</button>
    </div>
    <div class="form-group" id="cashGivenGroup">
      <label>Montant donné par le client</label>
      <input type="number" id="cashGivenInput" inputmode="numeric" placeholder="${Math.round(total)}">
      <div id="changeDueRow" class="change-due-row hidden">
        <span>Monnaie à rendre</span>
        <span id="changeDueAmount">0 Ar</span>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="modalCancel">Annuler</button>
      <button class="btn btn-primary" id="modalConfirmPay">Confirmer — ${fmt(total)}</button>
    </div>
  `);

  document.querySelectorAll('#payMethods .pay-method').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#payMethods .pay-method').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedPayMethod = btn.dataset.method;
      document.getElementById('cashGivenGroup').style.display = state.selectedPayMethod === 'especes' ? 'block' : 'none';
    });
  });

  const cashInput = document.getElementById('cashGivenInput');
  cashInput.addEventListener('input', () => {
    const given = parseFloat(cashInput.value) || 0;
    const change = given - total;
    const row = document.getElementById('changeDueRow');
    if (given > 0) {
      row.classList.remove('hidden');
      document.getElementById('changeDueAmount').textContent = fmt(Math.max(0, change));
      document.getElementById('changeDueAmount').style.color = change < 0 ? 'var(--danger)' : 'var(--success)';
      if (change < 0) {
        document.getElementById('changeDueRow').querySelector('span').textContent = 'Il manque';
        document.getElementById('changeDueAmount').textContent = fmt(Math.abs(change));
      } else {
        document.getElementById('changeDueRow').querySelector('span').textContent = 'Monnaie à rendre';
      }
    } else {
      row.classList.add('hidden');
    }
  });

  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalConfirmPay').addEventListener('click', confirmPayment);
}

async function confirmPayment() {
  const total = state.ticket.reduce((sum, l) => sum + l.price * l.qty, 0);
  const cashInput = document.getElementById('cashGivenInput');
  const cashGiven = state.selectedPayMethod === 'especes' && cashInput && cashInput.value
    ? parseFloat(cashInput.value) : null;
  const changeDue = cashGiven !== null ? Math.max(0, cashGiven - total) : null;

  const sale = {
    id: uid(),
    lines: [...state.ticket],
    total,
    paymentMethod: state.selectedPayMethod,
    cashGiven,
    changeDue,
    context: state.ticketContext ? state.ticketContext.tableName : 'Vente directe',
    createdAt: new Date().toISOString(),
    synced: navigator.onLine,
  };

  // Décrémenter le stock
  for (const line of sale.lines) {
    const product = state.products.find(p => p.id === line.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - line.qty);
      await Store.put('products', product);
    }
  }

  await Store.put('sales', sale);
  state.sales.push(sale);

  // Libérer la table si applicable
  if (state.ticketContext) {
    const table = state.tables.find(t => t.id === state.ticketContext.tableId);
    if (table) {
      table.status = 'free';
      table.order = [];
      table.openedAt = null;
      await Store.put('tables', table);
    }
  }

  updateSyncBadge();
  closeModal();
  showFinalReceipt(sale);
  state.ticket = [];
  state.ticketContext = null;
  switchView('caisse');
}

function showFinalReceipt(sale) {
  const s = state.settings;
  showModal(`
    <h3>Vente encaissée</h3>
    <div class="receipt-box">
      <div style="text-align:center; margin-bottom:8px;">
        <strong style="font-size:15px;">${escapeHtml(s.shopName)}</strong><br>
        ${s.address ? escapeHtml(s.address) + '<br>' : ''}
        ${s.phone ? 'Tél: ' + escapeHtml(s.phone) + '<br>' : ''}
        ${s.nif ? 'NIF: ' + escapeHtml(s.nif) + ' ' : ''}${s.stat ? 'STAT: ' + escapeHtml(s.stat) : ''}
      </div>
      <hr>
      <div class="r-line"><span>Date</span><span>${new Date(sale.createdAt).toLocaleString('fr-FR')}</span></div>
      <div class="r-line"><span>Ticket</span><span>#${sale.id.slice(-6).toUpperCase()}</span></div>
      <hr>
      ${sale.lines.map(l => `
        <div class="r-line"><span>${l.qty}× ${escapeHtml(l.name)}</span><span>${fmt(l.price * l.qty)}</span></div>
        ${formatOptions(l.options) ? `<div class="r-options">${escapeHtml(formatOptions(l.options))}</div>` : ''}
      `).join('')}
      <hr>
      <div class="r-line"><strong>Total</strong><strong>${fmt(sale.total)}</strong></div>
      <div class="r-line"><span>Paiement</span><span>${paymentLabel(sale.paymentMethod)}</span></div>
      ${sale.cashGiven !== null ? `
        <div class="r-line"><span>Montant reçu</span><span>${fmt(sale.cashGiven)}</span></div>
        <div class="r-line"><strong>Monnaie rendue</strong><strong>${fmt(sale.changeDue)}</strong></div>
      ` : ''}
      <hr>
      <div style="text-align:center; font-size:12px; margin-top:6px;">${escapeHtml(s.thankYouMessage)}</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="modalShowInvoice">Facture formelle</button>
      <button class="btn btn-primary" id="modalCloseReceipt">Fermer</button>
    </div>
  `);
  document.getElementById('modalShowInvoice').addEventListener('click', () => showFormalInvoice(sale));
  document.getElementById('modalCloseReceipt').addEventListener('click', closeModal);
}

function showFormalInvoice(sale) {
  const s = state.settings;
  const invoiceNumber = 'FACT-' + sale.id.slice(-8).toUpperCase();
  showModal(`
    <h3>Facture</h3>
    <div class="receipt-box">
      <div style="text-align:center; margin-bottom:10px;">
        <strong style="font-size:16px;">${escapeHtml(s.shopName)}</strong><br>
        ${s.address ? escapeHtml(s.address) + '<br>' : ''}
        ${s.phone ? 'Tél: ' + escapeHtml(s.phone) + '<br>' : ''}
        ${s.nif ? 'NIF: ' + escapeHtml(s.nif) + '<br>' : ''}${s.stat ? 'STAT: ' + escapeHtml(s.stat) : ''}
      </div>
      <hr>
      <div class="r-line"><span>N° Facture</span><span>${escapeHtml(invoiceNumber)}</span></div>
      <div class="r-line"><span>Date</span><span>${new Date(sale.createdAt).toLocaleString('fr-FR')}</span></div>
      <div class="r-line"><span>Référence vente</span><span>#${sale.id.slice(-6).toUpperCase()}</span></div>
      <hr>
      <div style="font-weight:700; margin-bottom:4px;">Désignation</div>
      ${sale.lines.map(l => `
        <div class="r-line"><span>${l.qty}× ${escapeHtml(l.name)}</span><span>${fmt(l.price * l.qty)}</span></div>
        ${formatOptions(l.options) ? `<div class="r-options">${escapeHtml(formatOptions(l.options))}</div>` : ''}
      `).join('')}
      <hr>
      <div class="r-line"><span>Sous-total HT</span><span>${fmt(sale.total)}</span></div>
      <div class="r-line"><span>TVA</span><span>Non applicable</span></div>
      <div class="r-line"><strong>Total TTC</strong><strong>${fmt(sale.total)}</strong></div>
      <div class="r-line"><span>Mode de paiement</span><span>${paymentLabel(sale.paymentMethod)}</span></div>
      <hr>
      <div style="text-align:center; font-size:11px; color:var(--text-dim);">Facture générée électroniquement — ${escapeHtml(s.shopName)}</div>
    </div>
    <p class="settings-hint">${state.settings.invoicePrinterEnabled ? 'Envoi vers l\'imprimante facture configurée.' : 'Aucune imprimante facture configurée : ce document reste affiché à l\'écran. Vous pouvez faire une capture d\'écran pour le client.'}</p>
    <div class="modal-actions">
      <button class="btn btn-primary" id="modalCloseInvoice" style="width:100%;">Fermer</button>
    </div>
  `);
  document.getElementById('modalCloseInvoice').addEventListener('click', closeModal);
}

function updateSyncBadge() {
  const pending = state.sales.filter(s => !s.synced).length;
  const badge = document.getElementById('syncBadge');
  if (!badge) return;
  if (pending > 0) {
    badge.classList.remove('hidden');
    document.getElementById('syncCount').textContent = pending;
  } else {
    badge.classList.add('hidden');
  }
}

document.getElementById('syncBadge').addEventListener('click', showSyncInfo);
document.getElementById('lockAppBtn').addEventListener('click', () => {
  state.unlockedAdmin = false;
  showLockScreen();
});

function showSyncInfo() {
  const pending = state.sales.filter(s => !s.synced);
  const total = pending.reduce((sum, s) => sum + s.total, 0);
  showModal(`
    <h3>Ventes en attente</h3>
    <p style="color:var(--text-dim); font-size:12.5px; margin-bottom:14px;">
      Kaisse fonctionne sans serveur central : chaque vente reste stockée sur cet appareil. Ce badge indique les ventes enregistrées pendant une coupure réseau, marquées ici comme "à vérifier" une fois la connexion revenue — à des fins de suivi, sans transfert automatique vers l'extérieur.
    </p>
    <div class="receipt-box">
      <div class="r-line"><span>Ventes à vérifier</span><span>${pending.length}</span></div>
      <div class="r-line"><strong>Total</strong><strong>${fmt(total)}</strong></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="modalCancel">Fermer</button>
      <button class="btn btn-primary" id="modalMarkSynced">Marquer comme vérifiées</button>
    </div>
  `);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalMarkSynced').addEventListener('click', async () => {
    for (const s of pending) {
      s.synced = true;
      await Store.put('sales', s);
    }
    updateSyncBadge();
    closeModal();
    toast('Ventes marquées comme vérifiées');
  });
}

/* Simule la synchronisation dès que la connexion revient */
window.addEventListener('online', async () => {
  const unsynced = state.sales.filter(s => !s.synced);
  if (unsynced.length === 0) return;
  for (const s of unsynced) {
    s.synced = true;
    await Store.put('sales', s);
  }
  updateSyncBadge();
  toast(unsynced.length + ' vente(s) synchronisée(s)');
});

/* ===========================================================
   VUE SALLE
=========================================================== */
function renderSalle() {
  const grid = document.getElementById('tableGrid');
  grid.innerHTML = '';
  state.tables.forEach(t => {
    const card = document.createElement('button');
    card.className = 'table-card ' + t.status;
    const total = (t.order || []).reduce((s, l) => s + l.price * l.qty, 0);
    const statusLabel = t.status === 'free' ? 'Libre' : t.status === 'occupied' ? 'Occupée' : 'Addition';
    card.innerHTML = `
      <div class="t-name">${escapeHtml(t.name)}</div>
      <div class="t-status">${statusLabel}</div>
      ${total > 0 ? `<div class="t-amount">${fmt(total)}</div>` : ''}
    `;
    card.addEventListener('click', () => openTable(t));
    grid.appendChild(card);
  });

  document.getElementById('btnAddTable').addEventListener('click', addTableModal);
}

function openTable(table) {
  state.ticketContext = { tableId: table.id, tableName: table.name };
  state.ticket = [...(table.order || [])];
  switchView('caisse');
}

function addTableModal() {
  showModal(`
    <h3>Nouvelle table</h3>
    <div class="form-group">
      <label>Nom de la table</label>
      <input type="text" id="newTableName" placeholder="Ex: T9, Terrasse 1...">
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="modalCancel">Annuler</button>
      <button class="btn btn-primary" id="modalConfirmTable">Ajouter</button>
    </div>
  `);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalConfirmTable').addEventListener('click', async () => {
    const name = document.getElementById('newTableName').value.trim();
    if (!name) { toast('Nom requis'); return; }
    const table = { id: 'table-' + uid(), name, status: 'free', order: [], openedAt: null };
    await Store.put('tables', table);
    state.tables.push(table);
    closeModal();
    renderSalle();
  });
}

/* ===========================================================
   VUE STOCK
=========================================================== */
function renderStock() {
  const list = document.getElementById('stockList');
  list.innerHTML = '';
  if (state.products.length === 0) {
    list.innerHTML = '<p class="empty-state">Aucun produit.</p>';
  }
  state.products.forEach(p => {
    const cat = state.categories.find(c => c.id === p.category);
    const item = document.createElement('div');
    item.className = 'stock-item';
    const lowClass = p.stock <= p.lowStockAt ? ' low' : '';
    item.innerHTML = `
      <div class="si-info">
        <div class="si-name">${escapeHtml(p.name)}</div>
        <div class="si-cat">${cat ? escapeHtml(cat.name) : '—'}</div>
      </div>
      <div class="si-price">${fmt(p.price)}</div>
      <div class="si-qty${lowClass}">${p.stock}</div>
    `;
    item.addEventListener('click', () => editProductModal(p));
    list.appendChild(item);
  });

  document.getElementById('btnAddProduct').addEventListener('click', () => editProductModal(null));
}

function editProductModal(product) {
  const isEdit = !!product;
  const catOptions = state.categories.map(c =>
    `<option value="${c.id}" ${product && product.category === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');

  showModal(`
    <h3>${isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h3>
    <div class="form-group">
      <label>Nom</label>
      <input type="text" id="pName" value="${isEdit ? escapeHtml(product.name) : ''}" placeholder="Ex: Coca-Cola 33cl">
    </div>
    <div class="form-group">
      <label>Catégorie</label>
      <select id="pCategory">${catOptions}</select>
    </div>
    <div class="form-group">
      <label>Prix de vente (${state.settings.currency})</label>
      <input type="number" id="pPrice" value="${isEdit ? product.price : ''}" placeholder="0" inputmode="numeric">
    </div>
    <div class="form-group">
      <label>Quantité en stock</label>
      <input type="number" id="pStock" value="${isEdit ? product.stock : ''}" placeholder="0" inputmode="numeric">
    </div>
    <div class="form-group">
      <label>Seuil de stock bas</label>
      <input type="number" id="pLowStock" value="${isEdit ? product.lowStockAt : 5}" inputmode="numeric">
    </div>
    <div class="form-group form-check-group">
      <label class="check-label">
        <input type="checkbox" id="pIsRedMeat" ${isEdit && product.isRedMeat ? 'checked' : ''}>
        <span>Viande rouge (propose choix de cuisson à la vente)</span>
      </label>
    </div>
    <div class="modal-actions">
      ${isEdit ? '<button class="btn btn-danger-outline" id="modalDelete">Supprimer</button>' : ''}
      <button class="btn btn-secondary" id="modalCancel">Annuler</button>
      <button class="btn btn-primary" id="modalSaveProduct">Enregistrer</button>
    </div>
  `);

  document.getElementById('modalCancel').addEventListener('click', closeModal);
  if (isEdit) {
    document.getElementById('modalDelete').addEventListener('click', async () => {
      await Store.delete('products', product.id);
      state.products = state.products.filter(p => p.id !== product.id);
      closeModal();
      renderStock();
    });
  }
  document.getElementById('modalSaveProduct').addEventListener('click', async () => {
    const name = document.getElementById('pName').value.trim();
    const category = document.getElementById('pCategory').value;
    const price = parseFloat(document.getElementById('pPrice').value) || 0;
    const stock = parseInt(document.getElementById('pStock').value) || 0;
    const lowStockAt = parseInt(document.getElementById('pLowStock').value) || 0;
    const isRedMeat = document.getElementById('pIsRedMeat').checked;
    if (!name || price <= 0) { toast('Nom et prix requis'); return; }

    const data = isEdit
      ? { ...product, name, category, price, stock, lowStockAt, isRedMeat }
      : { id: uid(), name, category, price, stock, lowStockAt, isRedMeat };

    await Store.put('products', data);
    if (isEdit) {
      const idx = state.products.findIndex(p => p.id === data.id);
      state.products[idx] = data;
    } else {
      state.products.push(data);
    }
    closeModal();
    renderStock();
  });
}

/* ===========================================================
   VUE RAPPORTS
=========================================================== */
function renderRapports() {
  const today = new Date().toDateString();
  const todaySales = state.sales.filter(s => new Date(s.createdAt).toDateString() === today);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const totalTickets = todaySales.length;
  const avgTicket = totalTickets > 0 ? todayTotal / totalTickets : 0;
  const lowStockCount = state.products.filter(p => p.stock <= p.lowStockAt).length;

  document.getElementById('reportCards').innerHTML = `
    <div class="report-card">
      <div class="rc-label">Ventes du jour</div>
      <div class="rc-value">${fmt(todayTotal)}</div>
    </div>
    <div class="report-card">
      <div class="rc-label">Tickets du jour</div>
      <div class="rc-value">${totalTickets}</div>
    </div>
    <div class="report-card">
      <div class="rc-label">Panier moyen</div>
      <div class="rc-value">${fmt(avgTicket)}</div>
    </div>
    <div class="report-card">
      <div class="rc-label">Stock bas</div>
      <div class="rc-value">${lowStockCount}</div>
    </div>
  `;

  renderWeekChart();
  renderMonthSummary();

  // Meilleures ventes (toutes périodes confondues)
  const salesByProduct = {};
  state.sales.forEach(s => {
    s.lines.forEach(l => {
      salesByProduct[l.name] = (salesByProduct[l.name] || 0) + l.qty;
    });
  });
  const top = Object.entries(salesByProduct).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topEl = document.getElementById('topProducts');
  topEl.innerHTML = top.length === 0
    ? '<p class="empty-state">Aucune vente enregistrée pour le moment.</p>'
    : top.map(([name, qty]) => `
        <div class="top-row"><span>${escapeHtml(name)}</span><span>${qty} vendus</span></div>
      `).join('');

  // Historique récent
  const recent = [...state.sales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15);
  const histEl = document.getElementById('salesHistory');
  histEl.innerHTML = recent.length === 0
    ? '<p class="empty-state">Aucune vente enregistrée pour le moment.</p>'
    : recent.map(s => `
        <div class="hist-row">
          <div>
            <div>${escapeHtml(s.context)}</div>
            <div class="h-meta">${new Date(s.createdAt).toLocaleString('fr-FR')} · ${paymentLabel(s.paymentMethod)}</div>
          </div>
          <strong>${fmt(s.total)}</strong>
        </div>
      `).join('');

  document.getElementById('btnShowX').addEventListener('click', showXReport);
  document.getElementById('btnShowZ').addEventListener('click', confirmZClosure);
  document.getElementById('btnMonthlyReportA4').addEventListener('click', showMonthlyReportA4);

  // Historique des clôtures Z
  const zHistEl = document.getElementById('zHistory');
  const zList = [...state.zClosures].sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));
  zHistEl.innerHTML = zList.length === 0
    ? '<p class="empty-state">Aucune clôture effectuée pour le moment.</p>'
    : zList.map(z => `
        <button type="button" class="hist-row hist-row-clickable" data-zid="${z.id}">
          <div>
            <div>Clôture #${z.number}</div>
            <div class="h-meta">${new Date(z.closedAt).toLocaleString('fr-FR')} · ${z.ticketCount} tickets</div>
          </div>
          <strong>${fmt(z.total)}</strong>
        </button>
      `).join('');
  zHistEl.querySelectorAll('.hist-row-clickable').forEach(row => {
    row.addEventListener('click', () => {
      const closure = state.zClosures.find(z => z.id === row.dataset.zid);
      if (closure) showZReceipt(closure);
    });
  });

  document.getElementById('btnExportBackup').addEventListener('click', exportBackup);
}

function renderWeekChart() {
  const container = document.getElementById('weekChart');
  if (!container) return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const dayTotals = days.map(d => {
    const dateStr = d.toDateString();
    const total = state.sales
      .filter(s => new Date(s.createdAt).toDateString() === dateStr)
      .reduce((sum, s) => sum + s.total, 0);
    return { date: d, total };
  });

  const maxTotal = Math.max(...dayTotals.map(d => d.total), 1);
  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  container.innerHTML = `
    <div class="bar-chart">
      ${dayTotals.map(d => {
        const heightPct = Math.max(4, Math.round((d.total / maxTotal) * 100));
        const isToday = d.date.toDateString() === new Date().toDateString();
        return `
          <div class="bar-col">
            <div class="bar-value">${d.total > 0 ? fmt(d.total) : ''}</div>
            <div class="bar-track">
              <div class="bar-fill${isToday ? ' bar-today' : ''}" style="height:${heightPct}%"></div>
            </div>
            <div class="bar-label">${dayLabels[d.date.getDay()]}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderMonthSummary() {
  const container = document.getElementById('monthCards');
  if (!container) return;

  const now = new Date();
  const monthSales = state.sales.filter(s => {
    const d = new Date(s.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);
  const monthCount = monthSales.length;
  const avgPerDay = now.getDate() > 0 ? monthTotal / now.getDate() : 0;
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  container.innerHTML = `
    <div class="report-card">
      <div class="rc-label">${monthNames[now.getMonth()]}</div>
      <div class="rc-value">${fmt(monthTotal)}</div>
    </div>
    <div class="report-card">
      <div class="rc-label">Tickets du mois</div>
      <div class="rc-value">${monthCount}</div>
    </div>
    <div class="report-card">
      <div class="rc-label">Moyenne / jour</div>
      <div class="rc-value">${fmt(avgPerDay)}</div>
    </div>
  `;
}

function computeMonthlyReportData() {
  const now = new Date();
  const monthSales = state.sales.filter(s => {
    const d = new Date(s.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const monthLabel = monthNames[now.getMonth()] + ' ' + now.getFullYear();

  const total = monthSales.reduce((sum, s) => sum + s.total, 0);
  const count = monthSales.length;
  const avgTicket = count > 0 ? total / count : 0;
  const avgPerDay = now.getDate() > 0 ? total / now.getDate() : 0;

  const byMethod = {};
  monthSales.forEach(s => { byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.total; });

  const byProduct = {};
  monthSales.forEach(s => s.lines.forEach(l => {
    byProduct[l.name] = (byProduct[l.name] || { qty: 0, total: 0 });
    byProduct[l.name].qty += l.qty;
    byProduct[l.name].total += l.price * l.qty;
  }));
  const topProducts = Object.entries(byProduct).sort((a, b) => b[1].total - a[1].total).slice(0, 10);

  return { now, monthLabel, total, count, avgTicket, avgPerDay, byMethod, topProducts };
}

function showMonthlyReportA4() {
  const { now, monthLabel, total, count, avgTicket, avgPerDay, byMethod, topProducts } = computeMonthlyReportData();

  const s = state.settings;
  showModal(`
    <h3>Bilan mensuel — A4</h3>
    <div class="a4-preview">
      <div class="a4-header">
        <strong>${escapeHtml(s.shopName)}</strong>
        ${s.address ? `<div>${escapeHtml(s.address)}</div>` : ''}
        ${s.nif ? `<div>NIF: ${escapeHtml(s.nif)}${s.stat ? ' — STAT: ' + escapeHtml(s.stat) : ''}</div>` : ''}
        <div class="a4-title">Bilan du mois — ${escapeHtml(monthLabel)}</div>
      </div>

      <div class="a4-section">
        <div class="a4-row"><span>Chiffre d'affaires total</span><strong>${fmt(total)}</strong></div>
        <div class="a4-row"><span>Nombre de tickets</span><span>${count}</span></div>
        <div class="a4-row"><span>Panier moyen</span><span>${fmt(avgTicket)}</span></div>
        <div class="a4-row"><span>Moyenne par jour</span><span>${fmt(avgPerDay)}</span></div>
      </div>

      <div class="a4-section">
        <div class="a4-subtitle">Répartition par moyen de paiement</div>
        ${Object.entries(byMethod).length === 0 ? '<div class="a4-row"><span>Aucune vente ce mois-ci</span></div>' :
          Object.entries(byMethod).map(([m, amt]) => `<div class="a4-row"><span>${paymentLabel(m)}</span><span>${fmt(amt)}</span></div>`).join('')}
      </div>

      <div class="a4-section">
        <div class="a4-subtitle">Meilleures ventes du mois</div>
        ${topProducts.length === 0 ? '<div class="a4-row"><span>Aucune vente ce mois-ci</span></div>' :
          topProducts.map(([name, d]) => `<div class="a4-row"><span>${escapeHtml(name)}</span><span>${d.qty} vendus — ${fmt(d.total)}</span></div>`).join('')}
      </div>

      <div class="a4-footer">Document généré le ${now.toLocaleString('fr-FR')} — Kaisse</div>
    </div>
    <p class="settings-hint" id="a4PdfHint">Le téléchargement PDF nécessite une connexion internet au moment de la génération.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="modalDownloadA4Pdf">Télécharger PDF</button>
      <button class="btn btn-primary" id="modalCloseA4">Fermer</button>
    </div>
  `);
  document.getElementById('modalDownloadA4Pdf').addEventListener('click', downloadMonthlyReportPdf);
  document.getElementById('modalCloseA4').addEventListener('click', closeModal);
}

let jsPdfLoadPromise = null;
function loadJsPdf() {
  if (window.jspdf) return Promise.resolve();
  if (jsPdfLoadPromise) return jsPdfLoadPromise;
  jsPdfLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('load-failed'));
    document.head.appendChild(script);
  });
  return jsPdfLoadPromise;
}

async function downloadMonthlyReportPdf() {
  const btn = document.getElementById('modalDownloadA4Pdf');
  const hint = document.getElementById('a4PdfHint');
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Génération...';

  try {
    await loadJsPdf();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = originalLabel;
    toast('Connexion requise pour générer le PDF');
    return;
  }

  const { now, monthLabel, total, count, avgTicket, avgPerDay, byMethod, topProducts } = computeMonthlyReportData();
  const s = state.settings;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const marginX = 20;
  let y = 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(s.shopName, pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90);
  const metaParts = [s.address, s.phone ? 'Tél: ' + s.phone : '', s.nif ? 'NIF: ' + s.nif : ''].filter(Boolean);
  if (metaParts.length) {
    doc.text(metaParts.join(' — '), pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  doc.setDrawColor(26, 26, 26);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(201, 98, 42);
  doc.text('Bilan du mois — ' + monthLabel, pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setTextColor(26, 26, 26);
  doc.setFontSize(11);
  const kpiRows = [
    ["Chiffre d'affaires total", fmt(total)],
    ['Nombre de tickets', String(count)],
    ['Panier moyen', fmt(avgTicket)],
    ['Moyenne par jour', fmt(avgPerDay)],
  ];
  kpiRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, marginX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, pageWidth - marginX, y, { align: 'right' });
    y += 7;
  });
  y += 6;

  function sectionTitle(title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, marginX, y);
    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 7;
    doc.setFontSize(10.5);
  }

  sectionTitle('Répartition par moyen de paiement');
  const methodEntries = Object.entries(byMethod);
  if (methodEntries.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Aucune vente ce mois-ci', marginX, y);
    y += 6;
  } else {
    methodEntries.forEach(([m, amt]) => {
      doc.setFont('helvetica', 'normal');
      doc.text(paymentLabel(m), marginX, y);
      doc.text(fmt(amt), pageWidth - marginX, y, { align: 'right' });
      y += 6;
    });
  }
  y += 6;

  sectionTitle('Meilleures ventes du mois');
  if (topProducts.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Aucune vente ce mois-ci', marginX, y);
    y += 6;
  } else {
    topProducts.forEach(([name, d]) => {
      if (y > 270) { doc.addPage(); y = 22; }
      doc.setFont('helvetica', 'normal');
      doc.text(name, marginX, y);
      doc.text(`${d.qty} vendus — ${fmt(d.total)}`, pageWidth - marginX, y, { align: 'right' });
      y += 6;
    });
  }

  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Document généré le ' + now.toLocaleString('fr-FR') + ' — Kaisse', pageWidth / 2, 287, { align: 'center' });

  const monthSlug = monthLabel.toLowerCase().replace(/\s+/g, '-').replace(/[éè]/g, 'e');
  doc.save(`bilan-${monthSlug}.pdf`);

  btn.disabled = false;
  btn.textContent = originalLabel;
  toast('PDF téléchargé');
}

function getUnclosedSales() {
  return state.sales.filter(s => !s.zClosureId);
}

async function exportBackup() {
  const backup = {
    exportedAt: new Date().toISOString(),
    app: 'Kaisse',
    version: 1,
    products: state.products,
    categories: state.categories,
    tables: state.tables,
    sales: state.sales,
    zClosures: state.zClosures,
    settings: state.settings,
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kaisse-sauvegarde-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Sauvegarde téléchargée');
}

function buildReportSummary(sales) {
  const total = sales.reduce((sum, s) => sum + s.total, 0);
  const byMethod = {};
  sales.forEach(s => {
    byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.total;
  });
  return { total, count: sales.length, byMethod };
}

function showXReport() {
  const sales = getUnclosedSales();
  const summary = buildReportSummary(sales);
  showModal(`
    <h3>Rapport X</h3>
    <p style="color:var(--text-dim); font-size:12.5px; margin-bottom:14px;">Bilan en cours depuis la dernière clôture Z. Rien n'est modifié : vous pouvez consulter ce rapport à tout moment.</p>
    <div class="receipt-box">
      <div class="r-line"><span>Généré le</span><span>${new Date().toLocaleString('fr-FR')}</span></div>
      <hr>
      <div class="r-line"><span>Nombre de tickets</span><span>${summary.count}</span></div>
      ${Object.entries(summary.byMethod).map(([method, amt]) => `
        <div class="r-line"><span>${paymentLabel(method)}</span><span>${fmt(amt)}</span></div>
      `).join('')}
      <hr>
      <div class="r-line"><strong>Total</strong><strong>${fmt(summary.total)}</strong></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="modalCloseX" style="width:100%;">Fermer</button>
    </div>
  `);
  document.getElementById('modalCloseX').addEventListener('click', closeModal);
}

function confirmZClosure() {
  const sales = getUnclosedSales();
  if (sales.length === 0) {
    toast('Aucune vente à clôturer');
    return;
  }
  const summary = buildReportSummary(sales);
  showModal(`
    <h3>Confirmer la clôture Z</h3>
    <p style="color:var(--text-dim); font-size:12.5px; margin-bottom:14px;">Cette action fige définitivement le bilan ci-dessous et remet le compteur à zéro. Elle est <strong>irréversible</strong>.</p>
    <div class="receipt-box">
      <div class="r-line"><span>Nombre de tickets</span><span>${summary.count}</span></div>
      ${Object.entries(summary.byMethod).map(([method, amt]) => `
        <div class="r-line"><span>${paymentLabel(method)}</span><span>${fmt(amt)}</span></div>
      `).join('')}
      <hr>
      <div class="r-line"><strong>Total à clôturer</strong><strong>${fmt(summary.total)}</strong></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="modalCancel">Annuler</button>
      <button class="btn btn-primary" id="modalConfirmZ" style="background:var(--danger); color:#fff;">Confirmer la clôture</button>
    </div>
  `);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalConfirmZ').addEventListener('click', async () => {
    const zNumber = state.zClosures.length + 1;
    const closure = {
      id: uid(),
      number: zNumber,
      closedAt: new Date().toISOString(),
      total: summary.total,
      ticketCount: summary.count,
      byMethod: summary.byMethod,
    };
    await Store.put('zClosures', closure);
    state.zClosures.push(closure);

    for (const s of sales) {
      s.zClosureId = closure.id;
      await Store.put('sales', s);
    }

    closeModal();
    showZReceipt(closure);
    renderRapports();
  });
}

function showZReceipt(closure) {
  const s = state.settings;
  showModal(`
    <h3>Clôture Z #${closure.number}</h3>
    <div class="receipt-box">
      <div style="text-align:center; margin-bottom:8px;">
        <strong style="font-size:15px;">${escapeHtml(s.shopName)}</strong><br>
        ${s.address ? escapeHtml(s.address) + '<br>' : ''}
        ${s.nif ? 'NIF: ' + escapeHtml(s.nif) + ' ' : ''}${s.stat ? 'STAT: ' + escapeHtml(s.stat) : ''}
      </div>
      <hr>
      <div class="r-line"><span>Date de clôture</span><span>${new Date(closure.closedAt).toLocaleString('fr-FR')}</span></div>
      <div class="r-line"><span>Nombre de tickets</span><span>${closure.ticketCount}</span></div>
      <hr>
      ${Object.entries(closure.byMethod).map(([method, amt]) => `
        <div class="r-line"><span>${paymentLabel(method)}</span><span>${fmt(amt)}</span></div>
      `).join('')}
      <hr>
      <div class="r-line"><strong>Total clôturé</strong><strong>${fmt(closure.total)}</strong></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="modalCloseZ" style="width:100%;">Fermer</button>
    </div>
  `);
  document.getElementById('modalCloseZ').addEventListener('click', closeModal);
}

function paymentLabel(m) {
  return { especes: 'Espèces', mobile_money: 'Mobile Money', carte: 'Carte', credit: 'Crédit' }[m] || m;
}

/* ===========================================================
   VUE PARAMÈTRES
=========================================================== */
function renderParametres() {
  document.getElementById('settingShopName').value = state.settings.shopName;
  document.getElementById('settingCurrency').value = state.settings.currency;
  document.getElementById('settingTheme').value = state.settings.theme;
  document.getElementById('settingAccentColor').value = state.settings.accentColor;
  document.getElementById('settingProductNameColor').value = state.settings.productNameColor;
  document.getElementById('settingPayButtonColor').value = state.settings.payButtonColor;
  document.getElementById('settingTextColor').value = state.settings.textColor;
  document.getElementById('textColorRow').style.display = state.settings.theme === 'light' ? 'none' : 'flex';

  document.getElementById('settingTheme').addEventListener('change', async (e) => {
    state.settings.theme = e.target.value;
    await Store.put('settings', { key: 'theme', value: e.target.value });
    applyTheme();
    renderParametres();
    toast('Thème mis à jour');
  });

  document.getElementById('settingAccentColor').addEventListener('input', async (e) => {
    state.settings.accentColor = e.target.value;
    applyTheme();
  });
  document.getElementById('settingAccentColor').addEventListener('change', async (e) => {
    await Store.put('settings', { key: 'accentColor', value: e.target.value });
    toast('Couleur d\'accent mise à jour');
  });
  document.getElementById('settingProductNameColor').addEventListener('input', async (e) => {
    state.settings.productNameColor = e.target.value;
    applyTheme();
  });
  document.getElementById('settingProductNameColor').addEventListener('change', async (e) => {
    await Store.put('settings', { key: 'productNameColor', value: e.target.value });
    toast('Couleur des noms de produits mise à jour');
  });
  document.getElementById('settingPayButtonColor').addEventListener('input', async (e) => {
    state.settings.payButtonColor = e.target.value;
    applyTheme();
  });
  document.getElementById('settingPayButtonColor').addEventListener('change', async (e) => {
    await Store.put('settings', { key: 'payButtonColor', value: e.target.value });
    toast('Couleur du bouton Encaisser mise à jour');
  });
  document.getElementById('settingTextColor').addEventListener('input', async (e) => {
    state.settings.textColor = e.target.value;
    applyTheme();
  });
  document.getElementById('settingTextColor').addEventListener('change', async (e) => {
    await Store.put('settings', { key: 'textColor', value: e.target.value });
    toast('Couleur du texte mise à jour');
  });

  document.getElementById('btnEditPrinters').addEventListener('click', openPrinterSettingsModal);
  document.getElementById('btnEditCategories').addEventListener('click', openCategoriesModal);
  document.getElementById('btnEditSides').addEventListener('click', openSideOptionsModal);
  document.getElementById('btnEditSauces').addEventListener('click', openSauceOptionsModal);

  document.getElementById('btnEditReceiptInfo').addEventListener('click', () => {
    showModal(`
      <h3>Informations du ticket</h3>
      <div class="form-group">
        <label>NIF</label>
        <input type="text" id="fNif" value="${escapeHtml(state.settings.nif)}" placeholder="Ex: 1234567890">
      </div>
      <div class="form-group">
        <label>STAT</label>
        <input type="text" id="fStat" value="${escapeHtml(state.settings.stat)}" placeholder="Ex: 12345 11 2024 0 12345">
      </div>
      <div class="form-group">
        <label>Téléphone / Contact</label>
        <input type="text" id="fPhone" value="${escapeHtml(state.settings.phone)}" placeholder="Ex: 034 00 000 00">
      </div>
      <div class="form-group">
        <label>Adresse</label>
        <input type="text" id="fAddress" value="${escapeHtml(state.settings.address)}" placeholder="Ex: Lot II A, Antananarivo">
      </div>
      <div class="form-group">
        <label>Message de remerciement</label>
        <input type="text" id="fThanks" value="${escapeHtml(state.settings.thankYouMessage)}" placeholder="Merci de votre visite !">
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modalCancel">Annuler</button>
        <button class="btn btn-primary" id="modalSaveReceiptInfo">Enregistrer</button>
      </div>
    `);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalSaveReceiptInfo').addEventListener('click', async () => {
      state.settings.nif = document.getElementById('fNif').value.trim();
      state.settings.stat = document.getElementById('fStat').value.trim();
      state.settings.phone = document.getElementById('fPhone').value.trim();
      state.settings.address = document.getElementById('fAddress').value.trim();
      state.settings.thankYouMessage = document.getElementById('fThanks').value.trim();
      await Store.put('settings', { key: 'nif', value: state.settings.nif });
      await Store.put('settings', { key: 'stat', value: state.settings.stat });
      await Store.put('settings', { key: 'phone', value: state.settings.phone });
      await Store.put('settings', { key: 'address', value: state.settings.address });
      await Store.put('settings', { key: 'thankYouMessage', value: state.settings.thankYouMessage });
      closeModal();
      toast('Informations du ticket mises à jour');
    });
  });

  document.getElementById('settingShopName').addEventListener('change', async (e) => {
    state.settings.shopName = e.target.value;
    await Store.put('settings', { key: 'shopName', value: e.target.value });
    toast('Nom mis à jour');
  });
  document.getElementById('settingCurrency').addEventListener('change', async (e) => {
    state.settings.currency = e.target.value;
    await Store.put('settings', { key: 'currency', value: e.target.value });
    toast('Devise mise à jour');
    render();
  });
  document.getElementById('btnChangePins').addEventListener('click', () => {
    showModal(`
      <h3>Codes d'accès</h3>
      <div class="form-group">
        <label>Code caisse (donné aux employés)</label>
        <input type="text" id="newCashierPin" inputmode="numeric" maxlength="8" value="${state.settings.cashierPin}">
      </div>
      <div class="form-group">
        <label>Code admin (gérant uniquement)</label>
        <input type="text" id="newAdminPin" inputmode="numeric" maxlength="8" value="${state.settings.adminPin}">
      </div>
      <p style="color:var(--text-dim); font-size:12px;">Conservez ces codes en lieu sûr. Le code caisse donne accès à la Caisse et à la Salle. Le code admin donne accès à tout, y compris ce réglage.</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modalCancel">Annuler</button>
        <button class="btn btn-primary" id="modalSavePins">Enregistrer</button>
      </div>
    `);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalSavePins').addEventListener('click', async () => {
      const cashierPin = document.getElementById('newCashierPin').value.trim();
      const adminPin = document.getElementById('newAdminPin').value.trim();
      if (!cashierPin || !adminPin) { toast('Les deux codes sont requis'); return; }
      state.settings.cashierPin = cashierPin;
      state.settings.adminPin = adminPin;
      await Store.put('settings', { key: 'cashierPin', value: cashierPin });
      await Store.put('settings', { key: 'adminPin', value: adminPin });
      closeModal();
      toast('Codes mis à jour');
    });
  });

  document.getElementById('btnViewZHistory').addEventListener('click', openZHistoryModal);

  document.getElementById('btnResetData').addEventListener('click', () => {
    showModal(`
      <h3>Réinitialiser toutes les données ?</h3>
      <p style="color:var(--text-dim); font-size:13.5px;">Cette action supprimera définitivement tous les produits, ventes, tables et réglages stockés sur cet appareil. Cette action est irréversible.</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modalCancel">Annuler</button>
        <button class="btn btn-primary" style="background:var(--danger); color:#fff;" id="modalConfirmReset">Réinitialiser</button>
      </div>
    `);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalConfirmReset').addEventListener('click', async () => {
      for (const store of ['products', 'categories', 'tables', 'sales', 'zClosures', 'settings']) {
        await Store.clear(store);
      }
      await seedIfEmpty();
      await loadAll();
      closeModal();
      toast('Données réinitialisées');
      switchView('caisse');
    });
  });
}

/* ===========================================================
   MODALE GÉNÉRIQUE
=========================================================== */
function openPrinterSettingsModal() {
  renderPrinterSettingsContent();
}

const PRINTER_DEFS = [
  { key: 'receipt', label: 'Imprimante caisse (reçus)', checkLabel: "Activer l'impression des reçus", paperKind: 'thermal' },
  { key: 'kitchen', label: 'Imprimante cuisine (bons de commande)', checkLabel: "Activer l'impression des bons de cuisine", paperKind: 'thermal' },
  { key: 'invoice', label: 'Imprimante facture formelle', checkLabel: "Activer l'impression des factures formelles", paperKind: 'standard' },
];

function printerBlockHtml(def, s) {
  const k = def.key;
  const widthField = def.paperKind === 'standard' ? `
      <div class="form-group">
        <label>Format de papier</label>
        <select id="${k}PrinterWidth">
          <option value="A4" ${s[k + 'PrinterWidth'] === 'A4' ? 'selected' : ''}>A4</option>
          <option value="A5" ${s[k + 'PrinterWidth'] === 'A5' ? 'selected' : ''}>A5</option>
        </select>
      </div>` : `
      <div class="form-group">
        <label>Largeur du papier thermique</label>
        <select id="${k}PrinterWidth">
          <option value="50" ${s[k + 'PrinterWidth'] === '50' ? 'selected' : ''}>50 mm</option>
          <option value="58" ${s[k + 'PrinterWidth'] === '58' ? 'selected' : ''}>58 mm</option>
          <option value="80" ${s[k + 'PrinterWidth'] === '80' ? 'selected' : ''}>80 mm</option>
        </select>
      </div>`;
  return `
    <div class="option-group">
      <label class="option-label">${escapeHtml(def.label)}</label>
      <div class="form-check-group" style="margin-top:0; margin-bottom:10px;">
        <label class="check-label">
          <input type="checkbox" id="${k}PrinterEnabled" ${s[k + 'PrinterEnabled'] ? 'checked' : ''}>
          <span>${escapeHtml(def.checkLabel)}</span>
        </label>
      </div>
      <div class="form-group">
        <label>Type de connexion</label>
        <select id="${k}PrinterType">
          <option value="none" ${s[k + 'PrinterType'] === 'none' ? 'selected' : ''}>Non configurée</option>
          <option value="bluetooth" ${s[k + 'PrinterType'] === 'bluetooth' ? 'selected' : ''}>Bluetooth</option>
          <option value="wifi" ${s[k + 'PrinterType'] === 'wifi' ? 'selected' : ''}>Wi-Fi / Réseau</option>
          <option value="usb" ${s[k + 'PrinterType'] === 'usb' ? 'selected' : ''}>USB</option>
        </select>
      </div>
      ${widthField}
      <div class="form-group">
        <label>Nom / référence de l'imprimante</label>
        <input type="text" id="${k}PrinterName" value="${escapeHtml(s[k + 'PrinterName'])}" placeholder="Ex: Epson TM-T20">
      </div>
    </div>
  `;
}

function renderPrinterSettingsContent() {
  const s = state.settings;
  showModal(`
    <h3>Imprimantes</h3>
    <p style="color:var(--text-dim); font-size:12.5px; margin-bottom:16px;">Configurez ici vos imprimantes quand vous en aurez. Sans imprimante connectée, les tickets et bons de cuisine restent affichés à l'écran.</p>

    ${PRINTER_DEFS.map(def => printerBlockHtml(def, s)).join('')}

    <p class="settings-hint">La connexion physique à une imprimante Bluetooth/Wi-Fi nécessite un matériel compatible ; ce réglage prépare la configuration mais l'appairage se fera lors du branchement réel de l'appareil. La facture formelle se génère depuis l'écran d'encaissement pour les clients qui en font la demande.</p>

    <div class="modal-actions">
      <button class="btn btn-secondary" id="modalCancel">Annuler</button>
      <button class="btn btn-primary" id="modalSavePrinters">Enregistrer</button>
    </div>
  `);

  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalSavePrinters').addEventListener('click', async () => {
    for (const def of PRINTER_DEFS) {
      const k = def.key;
      state.settings[k + 'PrinterEnabled'] = document.getElementById(k + 'PrinterEnabled').checked;
      state.settings[k + 'PrinterType'] = document.getElementById(k + 'PrinterType').value;
      state.settings[k + 'PrinterWidth'] = document.getElementById(k + 'PrinterWidth').value;
      state.settings[k + 'PrinterName'] = document.getElementById(k + 'PrinterName').value.trim();

      await Store.put('settings', { key: k + 'PrinterEnabled', value: state.settings[k + 'PrinterEnabled'] });
      await Store.put('settings', { key: k + 'PrinterType', value: state.settings[k + 'PrinterType'] });
      await Store.put('settings', { key: k + 'PrinterWidth', value: state.settings[k + 'PrinterWidth'] });
      await Store.put('settings', { key: k + 'PrinterName', value: state.settings[k + 'PrinterName'] });
    }

    closeModal();
    toast('Réglages imprimantes enregistrés');
  });
}

function openZHistoryModal() {
  const zList = [...state.zClosures].sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));
  const grandTotal = zList.reduce((sum, z) => sum + z.total, 0);

  showModal(`
    <h3>Historique des fermetures de caisse</h3>
    <div class="receipt-box" style="margin-bottom:14px;">
      <div class="r-line"><span>Nombre de clôtures</span><span>${zList.length}</span></div>
      <div class="r-line"><strong>Total cumulé</strong><strong>${fmt(grandTotal)}</strong></div>
    </div>
    <div class="side-options-list" id="zFullHistoryList">
      ${zList.length === 0
        ? '<p class="empty-state">Aucune clôture effectuée pour le moment.</p>'
        : zList.map(z => `
            <button type="button" class="hist-row hist-row-clickable" data-zid="${z.id}">
              <div>
                <div>Clôture #${z.number}</div>
                <div class="h-meta">${new Date(z.closedAt).toLocaleString('fr-FR')} · ${z.ticketCount} tickets</div>
              </div>
              <strong>${fmt(z.total)}</strong>
            </button>
          `).join('')
      }
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="modalCloseZHistory" style="width:100%;">Fermer</button>
    </div>
  `);

  document.querySelectorAll('#zFullHistoryList .hist-row-clickable').forEach(row => {
    row.addEventListener('click', () => {
      const closure = state.zClosures.find(z => z.id === row.dataset.zid);
      if (closure) showZReceipt(closure);
    });
  });

  document.getElementById('modalCloseZHistory').addEventListener('click', closeModal);
}

function openCategoriesModal() {
  renderCategoriesModalContent();
}

function renderCategoriesModalContent() {
  showModal(`
    <h3>Catégories de produits</h3>
    <p style="color:var(--text-dim); font-size:12.5px; margin-bottom:14px;">Ces catégories organisent vos produits dans la Caisse et le Stock.</p>
    <div class="side-options-list" id="categoriesList">
      ${state.categories.map((c) => {
        const count = state.products.filter(p => p.category === c.id).length;
        return `
          <div class="side-option-row">
            <span>${escapeHtml(c.name)}${count > 0 ? ` <span style="color:var(--text-dim); font-size:11.5px;">(${count} produit${count > 1 ? 's' : ''})</span>` : ''}</span>
            <button type="button" class="icon-btn category-remove-btn" data-id="${c.id}" title="Supprimer">
              <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        `;
      }).join('') || '<p class="empty-state">Aucune catégorie pour l\'instant.</p>'}
    </div>
    <div class="form-group" style="margin-top:12px;">
      <label>Ajouter une catégorie</label>
      <div style="display:flex; gap:8px;">
        <input type="text" id="newCategoryInput" placeholder="Ex: Pizza, Snacks...">
        <button class="btn btn-sm btn-outline" id="addCategoryBtn" style="flex-shrink:0;">Ajouter</button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="modalCloseCategories" style="width:100%;">Fermer</button>
    </div>
  `);

  document.querySelectorAll('.category-remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const count = state.products.filter(p => p.category === id).length;
      if (count > 0) {
        toast(`Impossible : ${count} produit(s) utilisent encore cette catégorie`);
        return;
      }
      await Store.delete('categories', id);
      state.categories = state.categories.filter(c => c.id !== id);
      renderCategoriesModalContent();
    });
  });

  document.getElementById('addCategoryBtn').addEventListener('click', async () => {
    const input = document.getElementById('newCategoryInput');
    const name = input.value.trim();
    if (!name) return;
    if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast('Cette catégorie existe déjà');
      return;
    }
    const category = { id: 'cat-' + uid(), name };
    await Store.put('categories', category);
    state.categories.push(category);
    renderCategoriesModalContent();
  });

  document.getElementById('modalCloseCategories').addEventListener('click', () => {
    closeModal();
    if (state.view === 'caisse') render();
    if (state.view === 'stock') render();
  });
}

function openSideOptionsModal() {
  renderOptionListModal({
    settingsKey: 'sideOptions',
    title: 'Accompagnements',
    description: 'Ces choix sont proposés à la vente de chaque plat.',
    placeholder: 'Ex: Purée, Haricots verts...',
    emptyLabel: 'Aucun accompagnement pour l\'instant.',
    addLabel: 'Ajouter un accompagnement',
  });
}

function openSauceOptionsModal() {
  renderOptionListModal({
    settingsKey: 'sauceOptions',
    title: 'Sauces',
    description: 'Ces choix sont proposés à la vente des viandes rouges.',
    placeholder: 'Ex: Bordelaise, Moutarde...',
    emptyLabel: 'Aucune sauce pour l\'instant.',
    addLabel: 'Ajouter une sauce',
  });
}

function renderOptionListModal(config) {
  const { settingsKey, title, description, placeholder, emptyLabel, addLabel } = config;
  const list = state.settings[settingsKey];

  showModal(`
    <h3>${escapeHtml(title)}</h3>
    <p style="color:var(--text-dim); font-size:12.5px; margin-bottom:14px;">${escapeHtml(description)}</p>
    <div class="side-options-list" id="optionsList">
      ${list.map((o, i) => `
        <div class="side-option-row">
          <span>${escapeHtml(o)}</span>
          <button type="button" class="icon-btn option-remove-btn" data-index="${i}" title="Supprimer">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      `).join('') || `<p class="empty-state">${escapeHtml(emptyLabel)}</p>`}
    </div>
    <div class="form-group" style="margin-top:12px;">
      <label>${escapeHtml(addLabel)}</label>
      <div style="display:flex; gap:8px;">
        <input type="text" id="newOptionInput" placeholder="${escapeHtml(placeholder)}">
        <button class="btn btn-sm btn-outline" id="addOptionBtn" style="flex-shrink:0;">Ajouter</button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="modalCloseOptions" style="width:100%;">Fermer</button>
    </div>
  `);

  document.querySelectorAll('.option-remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.index);
      state.settings[settingsKey].splice(idx, 1);
      await Store.put('settings', { key: settingsKey, value: state.settings[settingsKey] });
      renderOptionListModal(config);
    });
  });

  document.getElementById('addOptionBtn').addEventListener('click', async () => {
    const input = document.getElementById('newOptionInput');
    const value = input.value.trim();
    if (!value) return;
    if (state.settings[settingsKey].includes(value)) { toast('Déjà dans la liste'); return; }
    state.settings[settingsKey].push(value);
    await Store.put('settings', { key: settingsKey, value: state.settings[settingsKey] });
    renderOptionListModal(config);
  });

  document.getElementById('modalCloseOptions').addEventListener('click', closeModal);
}

function showModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModal();
});

/* ---------- Utilitaire ---------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ===========================================================
   INITIALISATION
=========================================================== */
function showLockScreen() {
  document.getElementById('app').classList.add('hidden');
  const lock = document.createElement('div');
  lock.id = 'lockScreen';
  lock.className = 'lock-screen';
  lock.innerHTML = `
    <div class="lock-box">
      <div class="brand-mark" style="width:52px;height:52px;font-size:30px;margin:0 auto 16px;">K</div>
      <h2 style="text-align:center; margin-bottom:4px;">Kaisse</h2>
      <p style="text-align:center; color:var(--text-dim); font-size:13px; margin-bottom:20px;">Entrez le code caisse pour continuer</p>
      <input type="tel" id="lockPinInput" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="Code PIN" maxlength="8" class="lock-input">
      <p id="lockPinError" style="color:var(--danger); font-size:12.5px; text-align:center; display:none; margin-top:8px;">Code incorrect.</p>
      <button class="btn btn-primary" id="lockUnlockBtn" style="width:100%; margin-top:16px;">Déverrouiller</button>
    </div>
  `;
  document.body.appendChild(lock);

  const input = document.getElementById('lockPinInput');
  input.addEventListener('click', () => input.focus());
  setTimeout(() => input.focus(), 100);
  const tryUnlock = () => {
    if (input.value === state.settings.cashierPin || input.value === state.settings.adminPin) {
      if (input.value === state.settings.adminPin) state.unlockedAdmin = true;
      lock.remove();
      document.getElementById('app').classList.remove('hidden');
      render();
    } else {
      document.getElementById('lockPinError').style.display = 'block';
      input.value = '';
    }
  };
  document.getElementById('lockUnlockBtn').addEventListener('click', tryUnlock);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
}

(async function init() {
  await seedIfEmpty();
  await loadAll();
  showLockScreen();
  updateNetStatus();
  updateSyncBadge();
})();
