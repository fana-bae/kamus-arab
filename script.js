(() => {
  'use strict';

  // === CONFIGURATION ===
  // GANTI LINK DI BAWAH INI dengan link 'Publish to Web' CSV kamu
  const SHEET_CSV_URL = 'PASTE_LINK_CSV_KAMU_DI_SINI';

  // === DOM Elements ===
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');
  const resultsGrid = document.getElementById('results-grid');
  const noResults = document.getElementById('no-results');
  const searchStats = document.getElementById('search-stats');
  const themeToggle = document.getElementById('theme-toggle');

  // === State ===
  let searchQuery = '';
  let dictionaryData = []; // Data akan diisi dari CSV

  // === CSV Parser ===
  function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
      // Regex untuk menangani koma di dalam tanda kutip (jika ada)
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const obj = {};
      headers.forEach((header, i) => {
        let val = values[i] || "";
        obj[header] = val.replace(/^"|"$/g, '').trim();
      });
      return obj;
    });
  }

  // === Fetch Data ===
  async function loadData() {
    resultsGrid.innerHTML = '<div class="loading-state">Memuat data dari Spreadsheet...</div>';

    try {
      // Jika URL masih placeholder, gunakan data dari data.js sebagai fallback
      if (SHEET_CSV_URL === 'PASTE_LINK_CSV_KAMU_DI_SINI') {
        console.log('Menggunakan data lokal (data.js)');
        dictionaryData = typeof DICTIONARY !== 'undefined' ? DICTIONARY : [];
      } else {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        dictionaryData = parseCSV(csvText);
        console.log('Data berhasil dimuat dari Google Sheets');
      }
      renderResults();
    } catch (error) {
      console.error('Gagal memuat data:', error);
      resultsGrid.innerHTML = '<div class="error-state">Gagal memuat data. Pastikan link CSV benar.</div>';
      // Fallback ke data lokal jika ada
      if (typeof DICTIONARY !== 'undefined') {
        dictionaryData = DICTIONARY;
        renderResults();
      }
    }
  }

  // === Theme ===
  function initTheme() {
    const saved = localStorage.getItem('kamus-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('kamus-theme', isDark ? 'light' : 'dark');
  });

  // === Search ===
  function normalize(str) {
    if (!str) return '';
    return str.toLowerCase()
      // Hapus tashkeel / harakat Arab (HANYA harakat, bukan huruf)
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '')
      // Samakan variasi Alef (أ إ آ ٱ → ا)
      .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
      // Samakan Ta Marbuta ke Ha (ة → ه)
      .replace(/\u0629/g, '\u0647')
      // Samakan Alef Maqsura ke Ya (ى → ي)
      .replace(/\u0649/g, '\u064A')
      // Hapus tatweel / kashida (ـ)
      .replace(/\u0640/g, '')
      // Normalisasi transliterasi latin
      .replace(/[āàáâ]/g, 'a')
      .replace(/[ūùúû]/g, 'u')
      .replace(/[īìíî]/g, 'i')
      .replace(/[ṣṡ]/g, 's')
      .replace(/[ṭ]/g, 't')
      .replace(/[ḥ]/g, 'h')
      .replace(/[ḍ]/g, 'd')
      .replace(/[ẓż]/g, 'z')
      .replace(/[ṇ]/g, 'n')
      .trim();
  }

  function filterWords() {
    return dictionaryData.filter(word => {
      if (!searchQuery) return true;
      const q = normalize(searchQuery);

      if ((word.ar && normalize(word.ar).includes(q)) ||
        (word.tr && normalize(word.tr).includes(q)) ||
        (word.id && normalize(word.id).includes(q)) ||
        (word.en && normalize(word.en).includes(q))) return true;

      if (word.madhi && normalize(word.madhi).includes(q)) return true;
      if (word.mudhore && normalize(word.mudhore).includes(q)) return true;
      if (word.masdar && normalize(word.masdar).includes(q)) return true;

      return false;
    });
  }

  // === Render Cards ===
  function createCard(word, index) {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.style.animationDelay = `${index * 0.04}s`;

    const isVerb = !!word.madhi;
    let html = '';

    if (isVerb) {
      html += `
      <div class="verb-tasrif">
        <div class="tasrif-item">
          <span class="tasrif-arabic">${word.madhi}</span>
        </div>
        <div class="tasrif-separator">—</div>
        <div class="tasrif-item">
          <span class="tasrif-arabic">${word.mudhore}</span>
        </div>
        <div class="tasrif-separator">—</div>
        <div class="tasrif-item">
          <span class="tasrif-arabic">${word.masdar}</span>
        </div>
      </div>
      <div class="card-transliteration">${word.tr}</div>
      <div class="card-divider"></div>
      <div class="card-multi-lang">
        <div class="lang-item"><span class="lang-flag">🇮🇩</span> ${word.id}</div>
        ${word.en ? `<div class="lang-item"><span class="lang-flag">🇬🇧</span> ${word.en}</div>` : ''}
      </div>`;
    } else {
      html += `
      <div class="card-arabic">${word.ar}</div>
      <div class="card-transliteration">${word.tr}</div>
      <div class="card-divider"></div>
      <div class="card-multi-lang">
        <div class="lang-item"><span class="lang-flag">🇮🇩</span> ${word.id}</div>
        ${word.en ? `<div class="lang-item"><span class="lang-flag">🇬🇧</span> ${word.en}</div>` : ''}
      </div>`;
    }

    if (word.ex_ar) {
      html += `
      <div class="card-example">
        <div class="card-example-ar">${word.ex_ar}</div>
        <div class="ex-multi-lang">
          <div>${word.ex_id}</div>
          ${word.ex_en ? `<div class="ex-en">${word.ex_en}</div>` : ''}
        </div>
      </div>`;
    }

    card.innerHTML = html;
    return card;
  }

  function renderResults() {
    const filtered = filterWords();
    resultsGrid.innerHTML = '';

    if (filtered.length === 0) {
      noResults.classList.remove('hidden');
      searchStats.textContent = '';
    } else {
      noResults.classList.add('hidden');
      filtered.forEach((word, i) => {
        resultsGrid.appendChild(createCard(word, i));
      });
      searchStats.textContent = searchQuery
        ? `${filtered.length} kata ditemukan`
        : `Menampilkan ${filtered.length} kosa kata`;
    }
  }

  // === Event Listeners ===
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    clearBtn.classList.toggle('hidden', !searchQuery);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderResults, 150);
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearBtn.classList.add('hidden');
    searchInput.focus();
    renderResults();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') searchInput.blur();
  });

  // === Init ===
  initTheme();
  loadData();
})();
