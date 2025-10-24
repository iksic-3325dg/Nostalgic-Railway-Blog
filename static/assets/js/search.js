// ---- Pagefind (グローバル関数版) 安定ローダー ----
const BASE = '/Nostalgic-Railway-Blog/';   // サブディレクトリ公開のベース

let engine = null;
let panel = null, input = null, results = null;

function ensurePanel() {
  if (panel) return;
  panel = document.createElement('div');
  panel.id = 'pf-panel';
  panel.style.cssText = `
    position:fixed; right:12px; top:72px; z-index:9999;
    width:320px; max-width:calc(100vw - 24px);
    background:#fff; border-radius:12px; box-shadow:0 10px 28px rgba(0,0,0,.18);
    padding:12px; display:none;
  `;
  panel.innerHTML = `
    <input id="pf-input" type="text" placeholder="サイト内検索…" 
           style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:8px;outline:none;">
    <div id="pf-results" style="margin-top:10px;max-height:60vh;overflow:auto;"></div>
  `;
  document.body.appendChild(panel);
  input   = document.getElementById('pf-input');
  results = document.getElementById('pf-results');
}

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

// window.pagefind が出現するまで待つ（最大 10 秒）
function waitForPagefind(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function tick() {
      if (typeof window.pagefind === 'function') return resolve(window.pagefind);
      if (Date.now() - t0 > timeoutMs) return reject(new Error('pagefind.js not loaded'));
      setTimeout(tick, 100);
    })();
  });
}

async function boot() {
  // 1) pagefind 本体の出現待ち
  const create = await waitForPagefind();

  // 2) エンジン作成（public/pagefind のインデックスを読む）
  engine = await create({ baseUrl: BASE });
  console.log('✅ Pagefind ready');

  // 3) UI の紐付け（虫眼鏡）
  const trigger = document.querySelector('.header-search a');
  if (trigger) {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (panel && panel.style.display === 'block') closePanel();
      else openPanel();
    });
  }

  // 4) 外側クリック / Esc で閉じる
  document.addEventListener('click', (e) => {
    if (!panel || panel.style.display !== 'block') return;
    if (!e.target.closest('#pf-panel') && !e.target.closest('.header-search')) closePanel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // 5) 入力→検索（デバウンス）
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = input.value.trim();
      results.innerHTML = '';
      if (!q || !engine) return;

      try {
        const res = await engine.search(q);
        if (!res?.results?.length) {
          results.innerHTML = '<p>該当する結果はありません。</p>';
          return;
        }
        for (const r of res.results) {
          const d = await r.data();
          const a = document.createElement('a');
          a.href = d.url;
          a.textContent = d.meta?.title || d.url;
          a.style.cssText = 'display:block;padding:6px 0;color:#333;text-decoration:none;';
          a.onmouseenter = () => (a.style.textDecoration = 'underline');
          a.onmouseleave = () => (a.style.textDecoration = 'none');
          results.appendChild(a);
        }
      } catch (err) {
        console.error('検索エラー:', err);
      }
    }, 160);
  });
}

// DOM 準備後に起動
window.addEventListener('DOMContentLoaded', () => {
  try { boot().catch(err => console.error('Pagefind 初期化エラー:', err)); }
  catch (e) { console.error('Pagefind 初期化エラー:', e); }
});
