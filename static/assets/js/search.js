// /static/assets/js/search.js  （HTML から type="module" で読み込む）

const BASE = '/Nostalgic-Railway-Blog/';                // 公開サブディレクトリ
const PAGEFIND_JS = new URL(`${BASE}pagefind/pagefind.js`, location.origin).href;

// UI 要素（あなたのHTMLに合わせてクラス／IDを使う）
const trigger = document.querySelector('.header-search a'); // 虫眼鏡リンク
let panel, input, results, engine;

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
  // ESM 版 pagefind を動的 import
  const { default: createPagefind } = await import(PAGEFIND_JS);
  engine = await createPagefind({ baseUrl: BASE });

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

  console.log('✅ Pagefind ready (ESM)');
}

boot().catch(err => console.error('❌ Pagefind 初期化エラー:', err));
