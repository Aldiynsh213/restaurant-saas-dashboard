const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
const registerPasswordInput = document.getElementById('registerPassword');
const authMessage = document.getElementById('authMessage');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const loginHeader = document.getElementById('loginHeader');
const registerHeader = document.getElementById('registerHeader');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const brandTitle = document.getElementById('brandTitle');
const brandText = document.getElementById('brandText');
const brandBenefits = document.getElementById('brandBenefits');
const loginLoading = document.getElementById('loginLoading');
const loginLoadingTitle = document.getElementById('loginLoadingTitle');
const loginLoadingText = document.getElementById('loginLoadingText');
let loginInteracted = false;

const loginBrand = {
  title: 'Satu sistem untuk outlet dan penjualan online.',
  text: 'Masuk sebagai owner atau staff untuk mengelola operasional. Customer dapat mendaftar untuk melakukan pemesanan.',
  benefits: ['Akses staff dan customer terpisah', 'Order online langsung masuk dashboard owner', 'Kontrol menu, cabang, status pesanan, dan akun bisnis']
};

const registerBrand = {
  title: 'Buat akun pemesanan customer.',
  text: 'Isi data kontak agar pesanan online dapat diproses outlet dengan cepat.',
  benefits: ['Riwayat pesanan tersimpan', 'Alamat delivery dapat digunakan saat checkout', 'Status pesanan dapat dipantau dari web penjualan']
};

function setMessage(message, type = 'error') {
  authMessage.textContent = message;
  authMessage.dataset.type = type;
}

function setBrand(copy) {
  brandTitle.textContent = copy.title;
  brandText.textContent = copy.text;
  brandBenefits.innerHTML = copy.benefits.map((item) => `<li>${item}</li>`).join('');
}

function setAuthTab(tab) {
  const isRegister = tab === 'register';
  document.body.classList.toggle('register-mode', isRegister);
  loginForm.classList.toggle('hidden', isRegister);
  loginHeader.classList.toggle('hidden', isRegister);
  registerForm.classList.toggle('hidden', !isRegister);
  registerHeader.classList.toggle('hidden', !isRegister);
  loginTab.classList.toggle('active', !isRegister);
  registerTab.classList.toggle('active', isRegister);
  setBrand(isRegister ? registerBrand : loginBrand);
  setMessage('');
}

function destinationByRole(user) {
  return user.role === 'customer' ? './sales.html' : './dashboard.html';
}

function showLoginLoading(user, message = 'Menyiapkan halaman akun...') {
  loginLoadingTitle.textContent = user.role === 'customer' ? 'Akun customer siap' : 'Masuk berhasil';
  loginLoadingText.textContent = message;
  loginLoading.classList.remove('hidden');
}

function redirectByRole(user) {
  showLoginLoading(user);
  window.setTimeout(() => {
    window.location.href = destinationByRole(user);
  }, 850);
}

function togglePasswordInput(input, button) {
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  button.textContent = isHidden ? 'Hide' : 'Show';
  button.setAttribute('aria-label', isHidden ? 'Sembunyikan password' : 'Tampilkan password');
  input.focus();
}

function clearLoginFields() {
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
  loginInteracted = false;
}

window.addEventListener('DOMContentLoaded', () => {
  clearLoginFields();
  window.setTimeout(clearLoginFields, 150);
  window.setTimeout(clearLoginFields, 700);
});

window.addEventListener('pageshow', () => {
  clearLoginFields();
  if (registerPasswordInput) registerPasswordInput.value = '';
});

loginTab?.addEventListener('click', () => setAuthTab('login'));
registerTab?.addEventListener('click', () => setAuthTab('register'));
togglePassword?.addEventListener('click', () => togglePasswordInput(passwordInput, togglePassword));
toggleRegisterPassword?.addEventListener('click', () => togglePasswordInput(registerPasswordInput, toggleRegisterPassword));
[usernameInput, passwordInput].forEach((input) => input?.addEventListener('input', () => { loginInteracted = true; }));

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('');

  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!username || !password) {
    setMessage('Username dan password wajib diisi.');
    return;
  }

  if (!loginInteracted) {
    clearLoginFields();
    setMessage('Untuk keamanan, ketik ulang username dan password secara manual.');
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = 'Memproses...';

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    redirectByRole(data.user);
  } catch (err) {
    setMessage(err.message || 'Login gagal.');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Masuk';
    passwordInput.value = '';
  }
});

registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('');

  const payload = Object.fromEntries(new FormData(registerForm).entries());
  payload.username = String(payload.username || '').trim().toLowerCase();

  registerButton.disabled = true;
  registerButton.textContent = 'Membuat akun...';

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setMessage('Akun customer berhasil dibuat.', 'success');
    showLoginLoading(data.user, 'Membuka web penjualan...');
    window.setTimeout(() => {
      window.location.href = './sales.html';
    }, 850);
  } catch (err) {
    setMessage(err.message || 'Pendaftaran gagal.');
  } finally {
    registerButton.disabled = false;
    registerButton.textContent = 'Buat Akun Customer';
    registerPasswordInput.value = '';
  }
});

const initialTab = new URLSearchParams(window.location.search).get('tab');
setAuthTab(initialTab === 'register' ? 'register' : 'login');
