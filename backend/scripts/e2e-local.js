#!/usr/bin/env node
/*
  Local end-to-end smoke test for DYN SH SaaS.
  Requirements:
  - MongoDB is running and reachable via MONGODB_URI in backend/.env
  - backend dependencies are installed with npm install

  This script will:
  1. Reset/seed the database
  2. Start the API on E2E_PORT or 3100
  3. Login as owner
  4. Validate seeded menu catalog
  5. Register customer
  6. Create online order
  7. Verify order appears on customer and owner views
  8. Update order status
  9. Validate customer service message inbox
*/

const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const backendDir = path.join(__dirname, '..');
const apiPort = Number(process.env.E2E_PORT || 3100);
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const ownerUsername = String(process.env.SEED_OWNER_USERNAME || 'owner.dynsh');
const ownerPassword = String(process.env.SEED_OWNER_PASSWORD || '');
const testId = Date.now();
let apiProcess;

function logStep(message) {
  console.log(`\n[ E2E ] ${message}`);
}

function fail(message, detail) {
  console.error(`\n[ E2E FAILED ] ${message}`);
  if (detail) console.error(detail);
  process.exitCode = 1;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: backendDir,
      env: { ...process.env, ...options.env },
      stdio: options.stdio || 'inherit',
      shell: false
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${JSON.stringify(command)} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function request(pathname, options = {}) {
  const res = await fetch(`${apiBaseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_err) {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(`${options.method || 'GET'} ${pathname} failed with ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function waitForApi() {
  const started = Date.now();
  let lastError;

  while (Date.now() - started < 20000) {
    try {
      const health = await request('/api/health');
      if (health && health.ok === true && health.database === 'connected') {
        return health;
      }
      lastError = new Error(`Health belum connected: ${JSON.stringify(health)}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError || new Error('API tidak merespons.');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEnv() {
  const missing = [];
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.SEED_OWNER_PASSWORD) missing.push('SEED_OWNER_PASSWORD');

  if (missing.length) {
    throw new Error(`File backend/.env belum lengkap. Isi dulu: ${missing.join(', ')}`);
  }
  if (String(process.env.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET harus minimal 32 karakter.');
  }
  if (!/[a-z]/.test(ownerPassword) || !/[A-Z]/.test(ownerPassword) || !/[0-9]/.test(ownerPassword) || ownerPassword.length < 10) {
    throw new Error('SEED_OWNER_PASSWORD harus kuat: minimal 10 karakter, ada huruf besar, huruf kecil, dan angka.');
  }
}

async function main() {
  assertEnv();

  logStep('Reset dan seed database MongoDB...');
  await run(process.execPath, ['src/seed/seed.js']);

  logStep(`Menjalankan API di ${apiBaseUrl}...`);
  apiProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(apiPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });

  apiProcess.stdout.on('data', (chunk) => process.stdout.write(`[API] ${chunk}`));
  apiProcess.stderr.on('data', (chunk) => process.stderr.write(`[API] ${chunk}`));

  await waitForApi();
  logStep('API health OK dan MongoDB connected.');

  logStep('Login sebagai owner...');
  const ownerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: ownerUsername, password: ownerPassword }
  });
  assert(ownerLogin.token, 'Token owner tidak diterima.');
  assert(ownerLogin.user.role === 'owner', 'Role owner tidak sesuai.');

  logStep('Mengecek katalog sales dan outlet publik...');
  const branches = await request('/api/sales/branches');
  assert(Array.isArray(branches) && branches.length > 0, 'Outlet publik kosong.');
  const branchId = branches[0].id;

  const publicMenu = await request('/api/sales/menu');
  assert(Array.isArray(publicMenu) && publicMenu.length >= 20, 'Seed menu harus berisi minimal 20 produk aktif.');
  assert(publicMenu.every((item) => item.image_url), 'Semua seed menu wajib memiliki foto.');
  const selectedMenu = publicMenu[0];
  const menuId = selectedMenu.id;
  assert(menuId, 'Menu ID tidak diterima.');

  logStep('Owner membuat akun cashier melalui Team API...');
  const cashier = await request('/api/users', {
    method: 'POST',
    token: ownerLogin.token,
    body: {
      full_name: 'Cashier E2E',
      username: `cashier${testId}`,
      role: 'cashier',
      branch_id: branchId,
      password: 'CashierE2E123'
    }
  });
  assert(cashier.user && cashier.user.role === 'cashier', 'Owner gagal membuat akun cashier.');

  logStep('Mendaftarkan akun customer...');
  const customerUsername = `cust${testId}`;
  const customerRegister = await request('/api/auth/register', {
    method: 'POST',
    body: {
      full_name: 'Customer E2E',
      username: customerUsername,
      email: `customer.e2e.${testId}@example.com`,
      phone: `+62812${String(testId).slice(-8)}`,
      address: 'Jl. Pengujian E2E No. 1',
      password: 'CustomerE2E123'
    }
  });
  assert(customerRegister.token, 'Token customer tidak diterima.');
  assert(customerRegister.user.role === 'customer', 'Role customer tidak sesuai.');

  logStep('Customer mengirim pesan customer service...');
  const supportMessage = await request('/api/support/messages', {
    method: 'POST',
    token: customerRegister.token,
    body: {
      name: 'Customer E2E',
      phone: `+62812${String(testId).slice(-8)}`,
      message: 'Butuh bantuan dari E2E test',
      source: 'sales_web'
    }
  });
  assert(supportMessage.data && supportMessage.data.status === 'open', 'Pesan customer service gagal dibuat.');

  logStep('Owner mengecek inbox customer service...');
  const supportInbox = await request('/api/support/messages', { token: ownerLogin.token });
  assert(supportInbox.some((item) => item.id === supportMessage.data.id), 'Pesan customer service tidak muncul di dashboard staff/owner.');

  logStep('Customer checkout order online...');
  const orderResponse = await request('/api/sales/orders', {
    method: 'POST',
    token: customerRegister.token,
    body: {
      branch_id: branchId,
      fulfillment_method: 'pickup',
      payment_method: 'qris',
      notes: 'Pesanan otomatis dari E2E test',
      items: [{ menu_id: menuId, qty: 2 }]
    }
  });
  const order = orderResponse.order;
  assert(order.id, 'Order ID tidak diterima.');
  assert(order.status === 'pending', 'Status awal order online harus pending.');
  assert(order.total_amount === selectedMenu.price * 2, 'Total order tidak sesuai.');

  logStep('Mengecek riwayat order customer...');
  const myOrders = await request('/api/sales/my-orders', { token: customerRegister.token });
  assert(myOrders.some((item) => item.id === order.id), 'Order tidak muncul di riwayat customer.');

  logStep('Mengecek order masuk ke dashboard owner...');
  const ownerOrders = await request('/api/orders', { token: ownerLogin.token });
  assert(ownerOrders.some((item) => item.id === order.id), 'Order online tidak muncul di dashboard owner.');

  logStep('Owner mengubah status order menjadi confirmed...');
  const statusUpdate = await request(`/api/orders/${order.id}/status`, {
    method: 'PATCH',
    token: ownerLogin.token,
    body: { status: 'confirmed' }
  });
  assert(statusUpdate.order.status === 'confirmed', 'Status order gagal berubah ke confirmed.');

  logStep('Mengecek dashboard summary...');
  const summary = await request('/api/dashboard/summary', { token: ownerLogin.token });
  assert(summary.menu.total_menu >= 20, 'Summary menu tidak valid.');
  assert(summary.kpi.pending_orders >= 0, 'Summary KPI tidak valid.');

  console.log('\n[ E2E PASSED ] Semua alur utama berhasil: seed 20 produk, login owner, buat cashier, register customer, checkout, dashboard order, update status, customer service.');
}

main()
  .catch((err) => {
    fail(err.message, err.data ? JSON.stringify(err.data, null, 2) : err.stack);
  })
  .finally(() => {
    if (apiProcess && !apiProcess.killed) {
      apiProcess.kill();
    }
  });
