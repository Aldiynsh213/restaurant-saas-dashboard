(function dynShUi() {
  const root = document.documentElement;
  const storage = window.localStorage;
  const savedTheme = storage.getItem('dynsh_theme') || 'dark';
  const savedLang = storage.getItem('dynsh_lang') || 'id';
  const whatsappNumber = window.DYN_SH_WHATSAPP || '6281234567890';

  const languages = [
    ['id', 'Indonesia'], ['en', 'English'], ['ms', 'Melayu'], ['jv', 'Jawa'], ['su', 'Sunda'], ['ar', 'العربية'], ['zh-CN', '中文简体'], ['zh-TW', '中文繁體'],
    ['ja', '日本語'], ['ko', '한국어'], ['hi', 'हिन्दी'], ['ur', 'اردو'], ['bn', 'বাংলা'], ['th', 'ไทย'], ['vi', 'Tiếng Việt'], ['tl', 'Filipino'],
    ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español'], ['pt', 'Português'], ['it', 'Italiano'], ['nl', 'Nederlands'], ['ru', 'Русский'], ['uk', 'Українська'],
    ['tr', 'Türkçe'], ['fa', 'فارسی'], ['he', 'עברית'], ['sw', 'Kiswahili'], ['am', 'አማርኛ'], ['af', 'Afrikaans'], ['sq', 'Shqip'], ['hy', 'Հայերեն'],
    ['az', 'Azərbaycanca'], ['eu', 'Euskara'], ['be', 'Беларуская'], ['bg', 'Български'], ['ca', 'Català'], ['ceb', 'Cebuano'], ['ny', 'Chichewa'], ['co', 'Corsu'],
    ['hr', 'Hrvatski'], ['cs', 'Čeština'], ['da', 'Dansk'], ['et', 'Eesti'], ['fi', 'Suomi'], ['fy', 'Frysk'], ['gl', 'Galego'], ['ka', 'ქართული'],
    ['el', 'Ελληνικά'], ['gu', 'ગુજરાતી'], ['ht', 'Kreyòl Ayisyen'], ['ha', 'Hausa'], ['haw', 'ʻŌlelo Hawaiʻi'], ['iw', 'עברית'], ['hmn', 'Hmong'], ['hu', 'Magyar'],
    ['is', 'Íslenska'], ['ig', 'Igbo'], ['ga', 'Gaeilge'], ['kn', 'ಕನ್ನಡ'], ['kk', 'Қазақ'], ['km', 'ខ្មែរ'], ['ku', 'Kurdî'], ['ky', 'Кыргызча'],
    ['lo', 'ລາວ'], ['la', 'Latina'], ['lv', 'Latviešu'], ['lt', 'Lietuvių'], ['lb', 'Lëtzebuergesch'], ['mk', 'Македонски'], ['mg', 'Malagasy'], ['ml', 'മലയാളം'],
    ['mt', 'Malti'], ['mi', 'Māori'], ['mr', 'मराठी'], ['mn', 'Монгол'], ['my', 'မြန်မာ'], ['ne', 'नेपाली'], ['no', 'Norsk'], ['ps', 'پښتو'],
    ['pl', 'Polski'], ['pa', 'ਪੰਜਾਬੀ'], ['ro', 'Română'], ['sm', 'Gagana Samoa'], ['gd', 'Gàidhlig'], ['sr', 'Српски'], ['st', 'Sesotho'], ['sn', 'Shona'],
    ['sd', 'سنڌي'], ['si', 'සිංහල'], ['sk', 'Slovenčina'], ['sl', 'Slovenščina'], ['so', 'Soomaali'], ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['tg', 'Тоҷикӣ'],
    ['uz', 'O‘zbek'], ['xh', 'isiXhosa'], ['yi', 'ייִדיש'], ['yo', 'Yorùbá'], ['zu', 'isiZulu']
  ];

  const dictionary = {
    en: {
      'Masuk': 'Sign in',
      'Daftar Customer': 'Create Customer Account',
      'Masuk ke akun': 'Sign in to your account',
      'Gunakan username dan password akun yang sudah terdaftar.': 'Use your registered username and password.',
      'Masukkan username': 'Enter username',
      'Masukkan password': 'Enter password',
      'Buat Akun Customer': 'Create Customer Account',
      'Nama lengkap': 'Full name',
      'Nomor HP': 'Phone number',
      'Alamat pengiriman utama': 'Primary delivery address',
      'Buka web penjualan': 'Open sales website',
      'Dashboard': 'Dashboard',
      'Menu': 'Menu',
      'Orders': 'Orders',
      'Team': 'Team',
      'Web Penjualan': 'Sales Website',
      'Customer Service': 'Customer Service',
      'Logout': 'Logout',
      'Pesan makanan favorit dari DYN SH.': 'Order your favorite DYN SH menu.',
      'Menu Penjualan': 'Sales Menu',
      'Keranjang': 'Cart',
      'Kosongkan': 'Clear',
      'Kirim Pesanan': 'Place Order',
      'Cari menu, kategori, atau deskripsi': 'Search menu, category, or description',
      'Semua kategori': 'All categories',
      'Tema': 'Theme',
      'Bahasa': 'Language'
    },
    id: {}
  };


  function ensureGoogleTranslate() {
    if (window.googleTranslateElementInit) return;
    window.googleTranslateElementInit = function googleTranslateElementInit() {
      if (!window.google || !window.google.translate) return;
      const host = document.createElement('div');
      host.id = 'google_translate_element';
      host.className = 'google-translate-host';
      document.body.appendChild(host);
      new window.google.translate.TranslateElement({
        pageLanguage: 'id',
        autoDisplay: false,
        includedLanguages: languages.map(([code]) => code).join(',')
      }, 'google_translate_element');
    };
    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);
  }

  function triggerGoogleTranslate(lang) {
    if (lang === 'id') return;
    ensureGoogleTranslate();
    let tries = 0;
    const timer = setInterval(() => {
      const combo = document.querySelector('.goog-te-combo');
      if (combo) {
        combo.value = lang;
        combo.dispatchEvent(new Event('change'));
        clearInterval(timer);
      }
      tries += 1;
      if (tries > 20) clearInterval(timer);
    }, 300);
  }

  function applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    root.dataset.theme = next;
    storage.setItem('dynsh_theme', next);
    document.querySelectorAll('[data-theme-label]').forEach((el) => {
      el.textContent = next === 'light' ? 'Light' : 'Dark';
    });
  }

  function translateTextNode(node, lang) {
    if (lang !== 'en') return;
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    if (!trimmed || !dictionary.en[trimmed]) return;
    node.nodeValue = raw.replace(trimmed, dictionary.en[trimmed]);
  }

  function applyLanguage(lang) {
    storage.setItem('dynsh_lang', lang);
    root.lang = lang;
    const isEn = lang === 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (!el.dataset.i18nId) el.dataset.i18nId = el.textContent;
      el.textContent = isEn && dictionary.en[key] ? dictionary.en[key] : el.dataset.i18nId;
    });
    document.querySelectorAll('[placeholder]').forEach((el) => {
      if (!el.dataset.placeholderId) el.dataset.placeholderId = el.placeholder;
      el.placeholder = isEn && dictionary.en[el.dataset.placeholderId] ? dictionary.en[el.dataset.placeholderId] : el.dataset.placeholderId;
    });

    if (lang !== 'id') triggerGoogleTranslate(lang);

    if (isEn) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent || ['SCRIPT', 'STYLE', 'OPTION'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => translateTextNode(node, lang));
    }
  }

  function makeControls() {
    if (document.querySelector('.app-controls')) return;
    const controls = document.createElement('div');
    controls.className = 'app-controls';
    controls.innerHTML = `
      <button type="button" class="theme-toggle" aria-label="Ganti dark/light mode">☾ <span data-theme-label>${savedTheme === 'light' ? 'Light' : 'Dark'}</span></button>
      <label class="language-control" aria-label="Pilih bahasa">
        <span>🌐</span>
        <select id="languageSelect">${languages.map(([code, label]) => `<option value="${code}" ${code === savedLang ? 'selected' : ''}>${label}</option>`).join('')}</select>
      </label>
    `;
    document.body.appendChild(controls);
    controls.querySelector('.theme-toggle').addEventListener('click', () => applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light'));
    controls.querySelector('#languageSelect').addEventListener('change', (event) => {
      applyLanguage(event.target.value);
      showMiniNotice(event.target.value === 'en' ? 'Language changed.' : 'Bahasa disimpan. Untuk bahasa selain Inggris, browser dapat menerjemahkan halaman ini otomatis.');
    });
  }

  function showMiniNotice(message) {
    let notice = document.querySelector('.mini-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'mini-notice';
      document.body.appendChild(notice);
    }
    notice.textContent = message;
    notice.classList.add('show');
    clearTimeout(showMiniNotice.timer);
    showMiniNotice.timer = setTimeout(() => notice.classList.remove('show'), 2600);
  }

  function makeSupportWidget() {
    if (!document.body.classList.contains('sales-page')) return;
    if (document.querySelector('.support-fab')) return;
    const user = JSON.parse(storage.getItem('user') || 'null');
    const widget = document.createElement('aside');
    widget.className = 'support-widget';
    widget.innerHTML = `
      <button type="button" class="support-fab" aria-label="Customer service">💬</button>
      <div class="support-box hidden">
        <div class="support-head">
          <div><strong>Customer Service</strong><span>Butuh bantuan pesanan?</span></div>
          <button type="button" class="support-close">×</button>
        </div>
        <a class="whatsapp-button" target="_blank" rel="noopener" href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Halo DYN SH, saya butuh bantuan pesanan.')}">Chat WhatsApp</a>
        <form id="supportForm" class="support-form">
          <input name="name" placeholder="Nama" value="${user?.full_name ? escapeAttr(user.full_name) : ''}" required />
          <input name="phone" placeholder="Nomor WhatsApp" value="${user?.phone ? escapeAttr(user.phone) : ''}" />
          <textarea name="message" placeholder="Tulis pesan untuk staff outlet" rows="4" required></textarea>
          <button class="primary-button" type="submit">Kirim ke Staff</button>
        </form>
        <p id="supportNote" class="support-note"></p>
      </div>
    `;
    document.body.appendChild(widget);
    const box = widget.querySelector('.support-box');
    widget.querySelector('.support-fab').addEventListener('click', () => box.classList.toggle('hidden'));
    widget.querySelector('.support-close').addEventListener('click', () => box.classList.add('hidden'));
    widget.querySelector('#supportForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const note = widget.querySelector('#supportNote');
      const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
      payload.source = 'sales_web';
      try {
        note.textContent = 'Mengirim pesan...';
        await window.apiFetch('/support/messages', { method: 'POST', body: JSON.stringify(payload) });
        note.textContent = 'Pesan terkirim. Staff akan menindaklanjuti.';
        event.currentTarget.message.value = '';
      } catch (err) {
        note.textContent = err.message || 'Pesan gagal dikirim.';
      }
    });
  }

  function escapeAttr(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }

  applyTheme(savedTheme);
  window.addEventListener('DOMContentLoaded', () => {
    makeControls();
    applyLanguage(savedLang);
    makeSupportWidget();
  });
})();
