const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!user) {
  window.location.href = './index.html';
}

if (user?.role === 'customer') {
  window.location.href = './sales.html';
}

const state = {
  branches: [],
  menu: []
};

const roleLabel = {
  owner: 'Owner',
  executive: 'Executive',
  manager: 'Manager',
  cashier: 'Cashier'
};

const pageMeta = {
  summary: ['Dashboard', 'Ringkasan pendapatan, transaksi, dan KPI operasional.'],
  menu: ['Menu Management', 'Kelola produk, kategori, harga, dan status menu.'],
  orders: ['Orders', 'Catat transaksi dan pantau riwayat penjualan.'],
  branches: ['Branch KPI', 'Bandingkan performa cabang secara real time.'],
  team: ['Team Management', 'Kelola akun staf tanpa menampilkan password di UI.'],
  support: ['Customer Service', 'Pantau pesan customer dari web penjualan dan tindak lanjuti dengan cepat.']
};

const canManageMenu = ['owner', 'executive', 'manager'].includes(user?.role);
const canManageTeam = user?.role === 'owner';
const canViewBranches = ['owner', 'executive', 'manager'].includes(user?.role);
const canOpenSalesWeb = user?.role === 'owner';

const cardsEl = document.getElementById('cards');
const chartEl = document.getElementById('chartSection');
const tableEl = document.getElementById('tableSection');
const actionEl = document.getElementById('actionSection');
const toastEl = document.getElementById('toast');

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

function setPage(view) {
  const [title, subtitle] = pageMeta[view] || pageMeta.summary;
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = subtitle;
  document.querySelectorAll('#mainNav button[data-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

function showLoading(label = 'Memuat data...') {
  cardsEl.innerHTML = '';
  actionEl.classList.add('hidden');
  actionEl.innerHTML = '';
  chartEl.innerHTML = `<div class="loading-card">${escapeHtml(label)}</div>`;
  tableEl.innerHTML = '';
}

function setCards(items) {
  cardsEl.innerHTML = items.map((item) => `
    <article class="card">
      <p>${escapeHtml(item.label)}</p>
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.note || '')}</span>
    </article>
  `).join('');
}

function setAction(content = '') {
  if (!content) {
    actionEl.classList.add('hidden');
    actionEl.innerHTML = '';
    return;
  }
  actionEl.classList.remove('hidden');
  actionEl.innerHTML = content;
}

function setChart(title, rows) {
  if (!rows.length) {
    chartEl.innerHTML = `<h2>${escapeHtml(title)}</h2><div class="empty-state">Belum ada data untuk ditampilkan.</div>`;
    return;
  }

  const max = Math.max(...rows.map((row) => Number(row.revenue || 0)), 1);
  chartEl.innerHTML = `
    <div class="panel-header">
      <h2>${escapeHtml(title)}</h2>
      <span>${rows.length} data point</span>
    </div>
    <div class="chart-bars">
      ${rows.map((row) => `
        <div class="bar-row">
          <div>${escapeHtml(row.label || row.name)}</div>
          <div class="bar-track"><span class="bar" style="width:${(Number(row.revenue || 0) / max) * 100}%"></span></div>
          <div>${formatCurrency(row.revenue)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function setTable(title, headers, rows, mapper) {
  const body = rows.length
    ? rows.map((row) => `<tr>${mapper(row).map((col) => `<td>${col}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}"><div class="empty-state">Belum ada data.</div></td></tr>`;

  tableEl.innerHTML = `
    <div class="panel-header">
      <h2>${escapeHtml(title)}</h2>
      <span>${rows.length} record</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

async function loadBranches() {
  state.branches = await apiFetch('/branches');
  return state.branches;
}

async function loadMenuData() {
  state.menu = await apiFetch('/menu');
  return state.menu;
}

async function loadSummary() {
  setPage('summary');
  showLoading();

  const data = await apiFetch('/dashboard/summary');
  setAction('');
  setCards([
    { label: 'Total Orders', value: data.sales.total_orders, note: 'Transaksi selesai' },
    { label: 'Total Revenue', value: formatCurrency(data.sales.total_revenue), note: 'Omzet terselesaikan' },
    { label: 'Average Order Value', value: formatCurrency(data.sales.avg_order_value), note: 'Rata-rata transaksi' },
    { label: 'Active Menu', value: data.menu.total_menu, note: 'Produk aktif' }
  ]);

  setChart('Revenue 7 Hari Terakhir', data.dailyRevenue || []);
  setTable('KPI Ringkas', ['Metric', 'Value'], [
    { k: 'Omzet', v: formatCurrency(data.kpi.omzet) },
    { k: 'AOV', v: formatCurrency(data.kpi.aov) },
    { k: 'Transaksi Selesai', v: data.kpi.transaksi_selesai },
    { k: 'Pending Orders', v: data.kpi.pending_orders },
    { k: 'Cabang Aktif', v: data.branches.total_branches }
  ], (row) => [escapeHtml(row.k), escapeHtml(row.v)]);
}

async function loadMenu() {
  setPage('menu');
  showLoading();

  const rows = await loadMenuData();
  const active = rows.filter((row) => row.is_active).length;
  const avgPrice = rows.length ? rows.reduce((sum, row) => sum + Number(row.price || 0), 0) / rows.length : 0;

  setCards([
    { label: 'Total Menu', value: rows.length, note: 'Semua produk' },
    { label: 'Menu Aktif', value: active, note: 'Siap dijual' },
    { label: 'Rata-rata Harga', value: formatCurrency(avgPrice), note: 'Semua kategori' },
    { label: 'Role Aktif', value: roleLabel[user.role] || user.role, note: 'Hak akses saat ini' }
  ]);

  if (canManageMenu) {
    setAction(`
      <div class="panel-header">
        <h2>Tambah Menu</h2>
        <span>Harga dan HPP wajib angka valid</span>
      </div>
      <form id="menuForm" class="form-grid">
        <input name="name" placeholder="Nama menu" required />
        <input name="category" placeholder="Kategori" required />
        <input name="price" type="number" min="0" placeholder="Harga jual" required />
        <input name="cost_price" type="number" min="0" placeholder="HPP" required />
        <input name="description" placeholder="Deskripsi singkat" />
        <input name="image_url" placeholder="URL foto menu" />
        <button type="submit" class="primary-button">Simpan Menu</button>
      </form>
    `);
    document.getElementById('menuForm').addEventListener('submit', submitMenuForm);
  } else {
    setAction('');
  }

  const chartRows = Object.values(rows.reduce((acc, row) => {
    const category = row.category || 'Lainnya';
    acc[category] = acc[category] || { label: category, revenue: 0 };
    acc[category].revenue += Number(row.price || 0);
    return acc;
  }, {}));

  setChart('Nilai Menu per Kategori', chartRows);
  setTable('Daftar Menu', ['Nama', 'Kategori', 'Harga', 'HPP', 'Foto', 'Status', 'Aksi'], rows, (row) => [
    escapeHtml(row.name),
    escapeHtml(row.category),
    escapeHtml(formatCurrency(row.price)),
    escapeHtml(formatCurrency(row.cost_price)),
    row.image_url ? '<span class="status success">Ada</span>' : '<span class="status muted">Kosong</span>',
    `<span class="status ${row.is_active ? 'success' : 'muted'}">${row.is_active ? 'Aktif' : 'Nonaktif'}</span>`,
    canManageMenu ? `<button class="text-button" onclick="toggleMenuStatus('${escapeHtml(row.id)}', ${row.is_active ? 'false' : 'true'})">${row.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>` : '-'
  ]);
}

async function submitMenuForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    await apiFetch('/menu', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast('Menu berhasil disimpan.');
    await loadMenu();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleMenuStatus(id, isActive) {
  try {
    await apiFetch(`/menu/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive })
    });
    showToast('Status menu diperbarui.');
    await loadMenu();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadOrders() {
  setPage('orders');
  showLoading();

  const [orders, menu, branches] = await Promise.all([
    apiFetch('/orders'),
    loadMenuData(),
    loadBranches()
  ]);

  const completed = orders.filter((row) => row.status === 'completed').length;
  const online = orders.filter((row) => row.sales_channel === 'online').length;
  const total = orders.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);

  setCards([
    { label: 'Jumlah Order', value: orders.length, note: 'Maksimal 200 terbaru' },
    { label: 'Completed', value: completed, note: 'Transaksi selesai' },
    { label: 'Total Nilai', value: formatCurrency(total), note: 'Dari daftar tampil' },
    { label: 'Online Orders', value: online, note: 'Masuk dari web penjualan' }
  ]);

  const branchInput = ['owner', 'executive'].includes(user.role) ? `
    <select name="branch_id" required>
      <option value="">Pilih cabang</option>
      ${branches.map((branch) => `<option value="${escapeHtml(branch.id)}">${escapeHtml(branch.name)}</option>`).join('')}
    </select>
  ` : '';

  setAction(`
    <div class="panel-header">
      <h2>Buat Order</h2>
      <span>Order kasir tercatat sebagai transaksi selesai</span>
    </div>
    <form id="orderForm" class="form-grid">
      ${branchInput}
      <select name="menu_id" required>
        <option value="">Pilih menu</option>
        ${menu.filter((item) => item.is_active).map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} - ${formatCurrency(item.price)}</option>`).join('')}
      </select>
      <input name="qty" type="number" min="1" value="1" required />
      <select name="payment_method" required>
        <option value="cash">Cash</option>
        <option value="qris">QRIS</option>
        <option value="debit">Debit</option>
        <option value="transfer">Transfer</option>
      </select>
      <button type="submit" class="primary-button">Simpan Order</button>
    </form>
  `);
  document.getElementById('orderForm').addEventListener('submit', submitOrderForm);

  const chartRows = orders.slice(0, 10).reverse().map((row) => ({ label: row.order_code, revenue: row.total_amount }));
  setChart('Nilai 10 Order Terbaru', chartRows);
  setTable('Daftar Order', ['Code', 'Cabang', 'Channel', 'Customer', 'Status', 'Total', 'Pembayaran', 'Tanggal', 'Aksi'], orders, (row) => [
    escapeHtml(row.order_code),
    escapeHtml(row.branch_name),
    escapeHtml(row.sales_channel === 'online' ? 'Online' : 'POS'),
    escapeHtml(row.customer_name || '-'),
    `<span class="status ${statusClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span>`,
    escapeHtml(formatCurrency(row.total_amount)),
    escapeHtml(row.payment_method),
    escapeHtml(new Date(row.created_at).toLocaleString('id-ID')),
    renderStatusAction(row)
  ]);
}

function statusClass(status) {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (['confirmed', 'preparing', 'ready'].includes(status)) return 'warning';
  return 'muted';
}

function statusLabel(status) {
  const labels = {
    pending: 'Menunggu',
    confirmed: 'Dikonfirmasi',
    preparing: 'Diproses',
    ready: 'Siap',
    completed: 'Selesai',
    cancelled: 'Dibatalkan'
  };
  return labels[status] || status;
}

function renderStatusAction(row) {
  const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  return `
    <select class="inline-select" onchange="updateOrderStatus('${escapeHtml(row.id)}', this.value)">
      ${statuses.map((status) => `<option value="${status}" ${row.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}
    </select>
  `;
}

async function updateOrderStatus(id, status) {
  try {
    await apiFetch(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    showToast('Status order diperbarui.');
    await loadOrders();
  } catch (err) {
    showToast(err.message, 'error');
    await loadOrders();
  }
}

async function submitOrderForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = Object.fromEntries(new FormData(form).entries());
  const payload = {
    payment_method: formData.payment_method,
    branch_id: formData.branch_id,
    items: [{ menu_id: formData.menu_id, qty: Number(formData.qty) }]
  };

  try {
    await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast('Order berhasil dibuat.');
    await loadOrders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadBranchPerformance() {
  setPage('branches');
  showLoading();

  const rows = await apiFetch('/dashboard/branch-performance');
  const best = rows[0];
  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);

  setAction('');
  setCards([
    { label: 'Total Branch', value: rows.length, note: 'Scope akun aktif' },
    { label: 'Best Branch', value: best?.name || '-', note: best?.city || '-' },
    { label: 'Top Revenue', value: formatCurrency(best?.revenue || 0), note: 'Cabang tertinggi' },
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), note: 'Semua cabang tampil' }
  ]);

  setChart('Revenue per Cabang', rows.map((row) => ({ name: row.name, revenue: row.revenue })));
  setTable('Performa Cabang', ['Cabang', 'Kota', 'Orders', 'Revenue'], rows, (row) => [
    escapeHtml(row.name),
    escapeHtml(row.city),
    escapeHtml(row.total_orders),
    escapeHtml(formatCurrency(row.revenue))
  ]);
}

async function loadTeam() {
  setPage('team');
  showLoading();

  const [team, branches] = await Promise.all([
    apiFetch('/users'),
    loadBranches()
  ]);

  const active = team.filter((member) => member.is_active).length;
  const roles = ['executive', 'manager', 'cashier'];

  setCards([
    { label: 'Total User', value: team.length, note: 'Dalam scope akun' },
    { label: 'User Aktif', value: active, note: 'Bisa login' },
    { label: 'Role Anda', value: roleLabel[user.role] || user.role, note: 'Hak akses' },
    { label: 'Cabang Tersedia', value: branches.length, note: 'Untuk staf cabang' }
  ]);

  setAction(`
    <div class="panel-header">
      <h2>Tambah User</h2>
      <span>Password hanya diketik saat pembuatan akun</span>
    </div>
    <form id="teamForm" class="form-grid">
      <input name="full_name" placeholder="Nama lengkap" required />
      <input name="username" placeholder="Username" autocomplete="off" required />
      <select name="role" required>
        ${roles.map((role) => `<option value="${role}">${roleLabel[role]}</option>`).join('')}
      </select>
      <select name="branch_id">
        <option value="">Tanpa cabang</option>
        ${branches.map((branch) => `<option value="${escapeHtml(branch.id)}">${escapeHtml(branch.name)}</option>`).join('')}
      </select>
      <div class="password-field compact">
        <input name="password" id="newUserPassword" type="password" placeholder="Password minimal 10 karakter" autocomplete="new-password" required />
        <button type="button" id="toggleNewUserPassword">Show</button>
      </div>
      <button type="submit" class="primary-button">Buat User</button>
    </form>
  `);
  document.getElementById('teamForm').addEventListener('submit', submitTeamForm);
  document.getElementById('toggleNewUserPassword').addEventListener('click', () => {
    const input = document.getElementById('newUserPassword');
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    document.getElementById('toggleNewUserPassword').textContent = hidden ? 'Hide' : 'Show';
  });

  setChart('Komposisi Role', Object.values(team.reduce((acc, member) => {
    const role = roleLabel[member.role] || member.role;
    acc[role] = acc[role] || { label: role, revenue: 0 };
    acc[role].revenue += 1;
    return acc;
  }, {})));

  setTable('Daftar User', ['Nama', 'Username', 'Role', 'Cabang', 'Status', 'Aksi'], team, (member) => [
    escapeHtml(member.full_name),
    escapeHtml(member.username),
    escapeHtml(roleLabel[member.role] || member.role),
    escapeHtml(member.branch_name),
    `<span class="status ${member.is_active ? 'success' : 'muted'}">${member.is_active ? 'Aktif' : 'Nonaktif'}</span>`,
    `<button class="text-button" onclick="toggleUserStatus('${escapeHtml(member.id)}', ${member.is_active ? 'false' : 'true'})">${member.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>`
  ]);
}

async function submitTeamForm(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

  try {
    await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast('User berhasil dibuat.');
    await loadTeam();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleUserStatus(id, isActive) {
  try {
    await apiFetch(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive })
    });
    showToast('Status user diperbarui.');
    await loadTeam();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadSupport() {
  setPage('support');
  showLoading('Memuat pesan customer service...');

  const messages = await apiFetch('/support/messages');
  const open = messages.filter((row) => row.status === 'open').length;
  const replied = messages.filter((row) => row.status === 'replied').length;
  const closed = messages.filter((row) => row.status === 'closed').length;

  setCards([
    { label: 'Pesan Masuk', value: messages.length, note: '100 pesan terbaru' },
    { label: 'Open', value: open, note: 'Perlu ditindaklanjuti' },
    { label: 'Replied', value: replied, note: 'Sudah dibalas' },
    { label: 'Closed', value: closed, note: 'Selesai' }
  ]);

  setAction(`
    <div class="support-dashboard-head">
      <div>
        <h2>Inbox Customer Service</h2>
        <p>Pesan dari widget web penjualan akan muncul di sini. Staff dapat membalas lewat catatan internal atau menghubungi customer via WhatsApp.</p>
      </div>
      <button type="button" class="primary-button compact-btn" onclick="loadSupport()">Refresh Inbox</button>
    </div>
  `);

  chartEl.innerHTML = `
    <div class="panel-header">
      <h2>Alur layanan</h2>
      <span>Open → Replied → Closed</span>
    </div>
    <div class="service-flow">
      <div><strong>1</strong><span>Customer kirim pesan dari web penjualan</span></div>
      <div><strong>2</strong><span>Staff/owner melihat pesan di dashboard</span></div>
      <div><strong>3</strong><span>Hubungi customer lewat WhatsApp atau isi catatan balasan</span></div>
    </div>
  `;

  setTable('Pesan Customer Service', ['Customer', 'Kontak', 'Pesan', 'Status', 'Masuk', 'Aksi'], messages, (row) => [
    escapeHtml(row.name),
    row.phone ? `<a class="text-link" target="_blank" rel="noopener" href="https://wa.me/${escapeHtml(row.phone).replace(/[^0-9]/g, '')}">${escapeHtml(row.phone)}</a>` : '-',
    `<div class="support-message-cell"><strong>${escapeHtml(row.source || 'sales_web')}</strong><span>${escapeHtml(row.message)}</span>${row.reply ? `<em>Balasan: ${escapeHtml(row.reply)}</em>` : ''}</div>`,
    `<span class="status ${row.status === 'open' ? 'warning' : row.status === 'closed' ? 'muted' : 'success'}">${escapeHtml(row.status)}</span>`,
    escapeHtml(new Date(row.created_at).toLocaleString('id-ID')),
    `<form class="inline-reply-form" onsubmit="replySupportMessage(event, '${escapeHtml(row.id)}')">
      <input name="reply" placeholder="Catatan balasan" value="${escapeHtml(row.reply || '')}" />
      <select name="status">
        ${['open', 'replied', 'closed'].map((status) => `<option value="${status}" ${row.status === status ? 'selected' : ''}>${status}</option>`).join('')}
      </select>
      <button class="text-button" type="submit">Simpan</button>
    </form>`
  ]);
}

async function replySupportMessage(event, id) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    await apiFetch(`/support/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    showToast('Customer service diperbarui.');
    await loadSupport();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = './index.html';
}

function registerNavigation() {
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('salesWebBtn')?.addEventListener('click', () => {
    window.open('./sales.html', '_blank', 'noopener,noreferrer');
  });
  document.getElementById('mainNav').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-view]');
    if (!button) return;

    try {
      if (button.dataset.view === 'summary') await loadSummary();
      if (button.dataset.view === 'menu') await loadMenu();
      if (button.dataset.view === 'orders') await loadOrders();
      if (button.dataset.view === 'branches') await loadBranchPerformance();
      if (button.dataset.view === 'team') await loadTeam();
      if (button.dataset.view === 'support') await loadSupport();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function prepareShell() {
  document.getElementById('roleBadge').textContent = (roleLabel[user.role] || user.role).toUpperCase();
  document.getElementById('welcomeText').textContent = `${user.full_name} · ${user.username}`;

  if (!canViewBranches) {
    document.getElementById('branchBtn').style.display = 'none';
  }

  if (!canManageTeam) {
    document.getElementById('teamBtn').style.display = 'none';
  }

  if (!canOpenSalesWeb) {
    document.getElementById('salesWebBtn').style.display = 'none';
  }
}

prepareShell();
registerNavigation();
loadSummary().catch((err) => showToast(err.message, 'error'));
