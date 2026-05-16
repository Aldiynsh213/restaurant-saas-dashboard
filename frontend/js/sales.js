let salesUser = JSON.parse(localStorage.getItem('user') || 'null');
if (salesUser && !localStorage.getItem('token')) {
  localStorage.removeItem('user');
  salesUser = null;
}
const state = {
  menu: [],
  branches: [],
  cart: JSON.parse(localStorage.getItem('dynsh_cart') || '[]'),
  category: 'all',
  query: ''
};

const catalogGrid = document.getElementById('catalogGrid');
const cartList = document.getElementById('cartList');
const cartTotal = document.getElementById('cartTotal');
const categoryFilter = document.getElementById('categoryFilter');
const categoryChips = document.getElementById('categoryChips');
const menuSearch = document.getElementById('menuSearch');
const branchSelect = document.getElementById('branchSelect');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutButton = document.getElementById('checkoutButton');
const salesMessage = document.getElementById('salesMessage');
const toastEl = document.getElementById('toast');
const salesUserInfo = document.getElementById('salesUserInfo');
const authLink = document.getElementById('authLink');
const dashboardLink = document.getElementById('dashboardLink');
const salesLogoutBtn = document.getElementById('salesLogoutBtn');
const myOrdersSection = document.getElementById('myOrdersSection');
const myOrdersList = document.getElementById('myOrdersList');
const deliveryAddress = document.getElementById('deliveryAddress');
const salesLoading = document.getElementById('salesLoading');
const menuCount = document.getElementById('salesMenuCount');
const categoryCount = document.getElementById('salesCategoryCount');
const branchCount = document.getElementById('salesBranchCount');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatCurrency(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function showToast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.dataset.type = type;
  toastEl.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toastEl.classList.remove('show'), 3200);
}

function setSalesMessage(message, type = 'error') {
  salesMessage.textContent = message;
  salesMessage.dataset.type = type;
}

function showLoading() {
  salesLoading.classList.remove('hidden');
}

function hideLoading() {
  salesLoading.classList.add('hidden');
}

function persistCart() {
  localStorage.setItem('dynsh_cart', JSON.stringify(state.cart));
}

function getDisplayName() {
  if (!salesUser) return '';
  return salesUser.full_name || salesUser.fullName || salesUser.username || 'Akun';
}

function hideElement(el) {
  el.classList.add('hidden');
  el.hidden = true;
  el.style.display = 'none';
}

function showElement(el, display = '') {
  el.classList.remove('hidden');
  el.hidden = false;
  el.style.display = display;
}

function setupIdentity() {
  if (!salesUser) {
    salesUserInfo.textContent = 'Belum masuk';
    authLink.href = './index.html?tab=register';
    showElement(authLink, 'inline-flex');
    hideElement(dashboardLink);
    hideElement(salesLogoutBtn);
    return;
  }

  salesUserInfo.textContent = `${getDisplayName()} · ${salesUser.role}`;
  hideElement(authLink);
  showElement(salesLogoutBtn, 'inline-flex');

  if (salesUser.role === 'owner') {
    showElement(dashboardLink, 'inline-flex');
  } else {
    hideElement(dashboardLink);
  }

  if (salesUser.role === 'customer') {
    if (salesUser.default_address) deliveryAddress.value = salesUser.default_address;
    myOrdersSection.classList.remove('hidden');
  }
}

function categories() {
  return [...new Set(state.menu.map((item) => item.category || 'Lainnya'))].sort();
}

function renderCategories() {
  const rows = categories();
  categoryFilter.innerHTML = '<option value="all">Semua kategori</option>'
    + rows.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');

  categoryChips.innerHTML = ['all', ...rows].map((category) => {
    const label = category === 'all' ? 'Semua' : category;
    return `<button type="button" class="category-chip ${state.category === category ? 'active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(label)}</button>`;
  }).join('');

  categoryFilter.value = state.category;
}

function filteredMenu() {
  const query = state.query.toLowerCase().trim();
  return state.menu.filter((item) => {
    const categoryOk = state.category === 'all' || item.category === state.category;
    const searchable = `${item.name} ${item.category} ${item.description || ''}`.toLowerCase();
    const queryOk = !query || searchable.includes(query);
    return categoryOk && queryOk;
  });
}

function fallbackImage(item) {
  const encoded = encodeURIComponent(`${item.category || 'Menu'} ${item.name || 'DYN SH'}`);
  return `https://source.unsplash.com/900x700/?${encoded},food`;
}

function renderCatalog() {
  const rows = filteredMenu();
  if (!rows.length) {
    catalogGrid.innerHTML = '<div class="empty-state wide">Menu tidak ditemukan. Coba kata kunci atau kategori lain.</div>';
    return;
  }

  catalogGrid.innerHTML = rows.map((item) => {
    const image = item.image_url || item.imageUrl || fallbackImage(item);
    return `
      <article class="menu-card product-card">
        <div class="menu-image-wrap">
          <img class="menu-image" src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='${escapeHtml(fallbackImage(item))}'" />
          <span class="menu-category-badge">${escapeHtml(item.category)}</span>
        </div>
        <div class="menu-card-body">
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description || 'Menu favorit siap dipesan dari outlet kami.')}</p>
          <div class="menu-card-footer">
            <strong>${formatCurrency(item.price)}</strong>
            <button type="button" class="primary-button add-cart-btn" onclick="addToCart('${escapeHtml(item.id)}')">Tambah</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function updateStats() {
  menuCount.textContent = state.menu.length;
  categoryCount.textContent = categories().length;
  branchCount.textContent = state.branches.length;
}

function addToCart(menuId) {
  const menu = state.menu.find((item) => item.id === menuId);
  if (!menu) return;

  const existing = state.cart.find((item) => item.menu_id === menuId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ menu_id: menu.id, name: menu.name, price: menu.price, qty: 1 });
  }

  persistCart();
  renderCart();
  showToast(`${menu.name} ditambahkan ke keranjang.`);
}

function updateCartQty(menuId, direction) {
  const item = state.cart.find((row) => row.menu_id === menuId);
  if (!item) return;
  item.qty += direction;
  if (item.qty <= 0) {
    state.cart = state.cart.filter((row) => row.menu_id !== menuId);
  }
  persistCart();
  renderCart();
}

function renderCart() {
  if (!state.cart.length) {
    cartList.innerHTML = '<div class="empty-state">Keranjang masih kosong.</div>';
    cartTotal.textContent = formatCurrency(0);
    return;
  }

  cartList.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${formatCurrency(item.price)} × ${item.qty}</span>
      </div>
      <div class="qty-control">
        <button type="button" onclick="updateCartQty('${escapeHtml(item.menu_id)}', -1)">−</button>
        <span>${item.qty}</span>
        <button type="button" onclick="updateCartQty('${escapeHtml(item.menu_id)}', 1)">+</button>
      </div>
    </div>
  `).join('');

  const total = state.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  cartTotal.textContent = formatCurrency(total);
}

function renderBranches() {
  branchSelect.innerHTML = state.branches.length
    ? state.branches.map((branch) => `<option value="${escapeHtml(branch.id)}">${escapeHtml(branch.name)} · ${escapeHtml(branch.city)}</option>`).join('')
    : '<option value="">Outlet belum tersedia</option>';
}

function statusLabel(status) {
  const labels = {
    pending: 'Menunggu konfirmasi',
    confirmed: 'Dikonfirmasi',
    preparing: 'Sedang diproses',
    ready: 'Siap diambil/dikirim',
    completed: 'Selesai',
    cancelled: 'Dibatalkan'
  };
  return labels[status] || status;
}

function statusClass(status) {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (['confirmed', 'preparing', 'ready'].includes(status)) return 'warning';
  return 'muted';
}

async function loadMyOrders() {
  if (!salesUser || salesUser.role !== 'customer') return;
  const orders = await apiFetch('/sales/my-orders');
  if (!orders.length) {
    myOrdersList.innerHTML = '<div class="empty-state">Belum ada pesanan.</div>';
    return;
  }

  myOrdersList.innerHTML = orders.map((order) => `
    <article class="order-card">
      <div class="panel-header">
        <div>
          <span>${escapeHtml(order.order_code)}</span>
          <h3>${formatCurrency(order.total_amount)}</h3>
        </div>
        <span class="status ${statusClass(order.status)}">${statusLabel(order.status)}</span>
      </div>
      <p>${escapeHtml(order.items.map((item) => `${item.name} × ${item.qty}`).join(', '))}</p>
      <span>${escapeHtml(order.branch_name)} · ${escapeHtml(order.fulfillment_method)} · ${new Date(order.created_at).toLocaleString('id-ID')}</span>
    </article>
  `).join('');
}

async function bootstrap() {
  showLoading();
  catalogGrid.innerHTML = '<div class="loading-card wide">Memuat menu...</div>';
  try {
    setupIdentity();
    const [menu, branches] = await Promise.all([
      apiFetch('/sales/menu'),
      apiFetch('/sales/branches')
    ]);
    state.menu = menu;
    state.branches = branches;
    renderCategories();
    renderCatalog();
    renderBranches();
    renderCart();
    updateStats();
    await loadMyOrders();
  } catch (err) {
    showToast(err.message || 'Gagal memuat web penjualan.', 'error');
    catalogGrid.innerHTML = `<div class="empty-state wide">${escapeHtml(err.message || 'Gagal memuat katalog.')}</div>`;
  } finally {
    hideLoading();
  }
}

categoryFilter?.addEventListener('change', () => {
  state.category = categoryFilter.value;
  renderCategories();
  renderCatalog();
});

categoryChips?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderCatalog();
});

menuSearch?.addEventListener('input', () => {
  state.query = menuSearch.value;
  renderCatalog();
});

document.getElementById('clearCartBtn')?.addEventListener('click', () => {
  state.cart = [];
  persistCart();
  renderCart();
});

document.getElementById('refreshOrdersBtn')?.addEventListener('click', () => {
  loadMyOrders().catch((err) => showToast(err.message, 'error'));
});

salesLogoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = './sales.html';
});

checkoutForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setSalesMessage('');

  if (!salesUser) {
    setSalesMessage('Silakan masuk atau daftar customer sebelum checkout.');
    window.setTimeout(() => { window.location.href = './index.html?tab=register'; }, 900);
    return;
  }

  if (salesUser.role !== 'customer') {
    setSalesMessage('Checkout online hanya untuk akun customer. Owner atau staff dapat memantau order melalui dashboard.');
    return;
  }

  if (!state.cart.length) {
    setSalesMessage('Keranjang masih kosong.');
    return;
  }

  const formData = Object.fromEntries(new FormData(checkoutForm).entries());
  const payload = {
    ...formData,
    items: state.cart.map((item) => ({ menu_id: item.menu_id, qty: item.qty }))
  };

  checkoutButton.disabled = true;
  checkoutButton.textContent = 'Mengirim...';

  try {
    const data = await apiFetch('/sales/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast(data.message || 'Pesanan berhasil dikirim.');
    state.cart = [];
    persistCart();
    renderCart();
    checkoutForm.reset();
    renderBranches();
    if (salesUser.default_address) deliveryAddress.value = salesUser.default_address;
    await loadMyOrders();
  } catch (err) {
    setSalesMessage(err.message || 'Checkout gagal.');
  } finally {
    checkoutButton.disabled = false;
    checkoutButton.textContent = 'Kirim Pesanan';
  }
});

bootstrap();
