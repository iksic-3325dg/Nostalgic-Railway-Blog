// ===== Pagefind ESM ローダー（形に依存しない） =====
const BASE = '/Nostalgic-Railway-Blog/';
const PAGEFIND_JS = new URL(`${BASE}pagefind/pagefind.js`, location.origin).href;

async function loadPagefind() {
  // 1) 本体パスの健全性チェック
  const head = await fetch(PAGEFIND_JS, { method: 'HEAD' });
  if (!head.ok) throw new Error(`pagefind.js not found: ${PAGEFIND_JS} (${head.status})`);

  // 2) 動的 import（さまざまな形に対応）
  const mod = await import(PAGEFIND_JS);

  const cand = [
    typeof mod === 'function' ? mod : null,
    typeof mod?.default === 'function' ? mod.default : null,
    typeof mod?.pagefind === 'function' ? mod.pagefind : null,
    typeof mod?.default?.pagefind === 'function' ? mod.default.pagefind : null,
    typeof mod?.init === 'function' ? mod.init : null,
  ].find(Boolean);

  if (!cand) {
    console.error('Loaded pagefind module keys:', Object.keys(mod || {}));
    throw new Error('Pagefind factory function not found in module');
  }
  // 3) エンジン生成（GitHub Pages のサブディレクトリに合わせる）
  return await cand({ baseUrl: BASE });
}
// ================================================

// 共有変数
let trigger, panel, input, results, engine;

// パネル生成（1回だけ）
function ensurePanel(){
  if (document.getElementById('pf-panel')) return;
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

function openPanel(){
  ensurePanel();
  panel.style.display = 'block';
  input.value = '';
  results.innerHTML = '';
  input.focus();
}
function closePanel(){
  if (panel) panel.style.display = 'none';
}

async function boot(){
  // ←←← ここを loadPagefind() に変更（唯一の変更点）
  engine = await loadPagefind();

  // 既存の虫眼鏡（PaperMod の右端アイコン）
  trigger = document.querySelector('.header-search a');

  // トグル
  if (trigger){
    trigger.addEventListener('click', (e)=>{
      e.preventDefault();
      (panel && panel.style.display === 'block') ? closePanel() : openPanel();
    });
  }

  // 外側クリック/Escで閉じる
  document.addEventListener('click', (e)=>{
    if (!panel || panel.style.display !== 'block') return;
    if (!e.target.closest('#pf-panel') && !e.target.closest('.header-search')) closePanel();
  });
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closePanel(); });

  // 入力→検索（デバウンス）
  let t;
  input.addEventListener('input', ()=>{
    clearTimeout(t);
    t = setTimeout(async ()=>{
      const q = input.value.trim();
      results.innerHTML = '';
      if (!q) return;

      const res = await engine.search(q);
      if (!res?.results?.length){
        results.innerHTML = '<p>該当する結果はありません。</p>';
        return;
      }
      for (const r of res.results){
        const d = await r.data();
        const a = document.createElement('a');
        a.href = d.url;
        a.textContent = d.meta?.title || d.url;
        a.style.cssText = 'display:block;padding:6px 0;color:#333;text-decoration:none;';
        a.onmouseenter = ()=> a.style.textDecoration = 'underline';
        a.onmouseleave = ()=> a.style.textDecoration = 'none';
        results.appendChild(a);
      }
    }, 160);
  });

  console.log('✅ Pagefind ready (ESM, base=', BASE, ')');
}

boot().catch(err => console.error('❌ Pagefind 初期化エラー:', err));
