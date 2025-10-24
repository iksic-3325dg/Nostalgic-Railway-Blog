// ===== 設定 =====
const BASE = '/Nostalgic-Railway-Blog/';
const PAGEFIND_JS = new URL(`${BASE}pagefind/pagefind.js`, location.origin).href;

// ===== 状態変数 =====
let panel, input, results, trigger, engine;

// ===== パネル生成（1回だけ） =====
function ensurePanel() {
  if (document.getElementById('pf-panel')) {
    panel   = document.getElementById('pf-panel');
    input   = document.getElementById('pf-input');
    results = document.getElementById('pf-results');
    return;
  }
  panel = document.createElement('div');
  panel.id = 'pf-panel';
  panel.style.cssText = `
    position:fixed; right:12px; top:72px; z-index:9999;
    width:320px; max-width:calc(100vw - 24px);
    background:#fff; border-radius:12px; box-shadow:0 10px 28px rgba(0,0,0,.18);
    padding:12px; display:none;
  `;
  panel.innerHTML = `
    <input id="pf-input" type="text" placeholder="サイト内検索…" style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:8px;outline:none;">
    <div id="pf-results" style="margin-top:10px;max-height:60vh;overflow:auto;"></div>
  `;
  document.body.appendChild(panel);
  input   = document.getElementById('pf-input');
  results = document.getElementById('pf-results');
}

// ===== 開閉 =====
function openPanel() {
  ensurePanel();
  panel.style.display = 'block';
  input.value = '';
  results.innerHTML = '';
  input.focus();
}
function closePanel() {
  if (panel) panel.style.display = 'none';
}

// ===== Pagefind を ESM として動的 import =====
async function loadPagefind() {
  // 404/パス間違いの早期検出
  const head = await fetch(PAGEFIND_JS, { method: 'HEAD' });
  if (!head.ok) throw new Error(`pagefind.js not found: ${PAGEFIND_JS} (${head.status})`);

  const mod = await import(PAGEFIND_JS);

  // どのキーにファクトリが居ても拾う
  const create =
    (typeof mod === 'function' && mod) ||
    (typeof mod?.default === 'function' && mod.default) ||
    (typeof mod?.pagefind === 'function' && mod.pagefind) ||
    (typeof mod?.default?.pagefind === 'function' && mod.default.pagefind) ||
    (typeof mod?.init === 'function' && mod.init);

  if (!create) throw new Error('Pagefind factory function not found in module');

  return await create({ baseUrl: BASE });
}

// ===== 起動 =====
async function boot() {
  // 1) UI要素を必ず作ってから参照
  ensurePanel();

  // 2) 既存の虫眼鏡（PaperModのヘッダー）
  trigger = document.querySelector('.header-search a');
  if (!trigger) {
    console.warn('⚠️ .header-search a が見つかりません');
    return; // ここで終了（ヘッダーが無いページ）
  }

  // 3) Pagefind 読み込み
  engine = await loadPagefind();

  // 4) トグル
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    (panel && panel.style.display === 'block') ? closePanel() : openPanel();
  });

  // 5) 外側クリック / Esc
  document.addEventListener('click', (e) => {
    if (panel?.style.display !== 'block') return;
    if (!e.target.closest('#pf-panel') && !e.target.closest('.header-search')) closePanel();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

  // 6) 入力→検索（デバウンス）
  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      const q = input.value.trim();
      results.innerHTML = '';
      if (!q) return;

      const r = await engine.search(q);
      if (!r?.results?.length) {
        results.innerHTML = '<p>該当する結果はありません。</p>';
        return;
      }
      for (const hit of r.results) {
        const d = await hit.data();
        const a = document.createElement('a');
        a.href = d.url;
        a.textContent = d.meta?.title || d.url;
        a.style.cssText = 'display:block;padding:6px 0;color:#333;text-decoration:none;';
        a.onmouseenter = () => a.style.textDecoration = 'underline';
        a.onmouseleave = () => a.style.textDecoration = 'none';
        results.appendChild(a);
      }
    }, 160);
  });

  console.log('✅ Pagefind ready');
}

boot().catch(err => console.error('❌ Pagefind 初期化エラー:', err));
