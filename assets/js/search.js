// static/assets/js/search.js
// ---- Pagefind ローダ（ESM / IIFE どちらでもOK） ----
const BASE   = new URL(document.baseURI).pathname;                 // 例: "/Nostalgic-Railway-Blog/"
const PF_SRC = new URL('pagefind/pagefind.js', document.baseURI).href;

async function createEngine() {
  // 1) すでに IIFE 版が window に居る？
  if (typeof window.pagefind === 'function') {
    return await window.pagefind({ baseUrl: BASE });
  }

  // 2) ESM を import（v1 形式に対応）
  const mod = await import(PF_SRC);

  // v1：名前付きエクスポート { init, search }
  if (typeof mod?.init === 'function' && typeof mod?.search === 'function') {
    await mod.init({ baseUrl: BASE });               // インデックス読込
    return { search: mod.search };                    // 使い勝手を既存に合わせる
  }

  // 旧来：default or named pagefind(factory)
  const factory =
    typeof mod?.default  === 'function' ? mod.default  :
    typeof mod?.pagefind === 'function' ? mod.pagefind : null;

  if (!factory) {
    console.error('Loaded keys:', Object.keys(mod || {}));
    throw new Error('pagefind factory not found in module');
  }
  return await factory({ baseUrl: BASE });
}


// ---- フローティングUI（ヘッダーを崩さない）----
// ※ ここから下を置き換え

// UI を必ず用意して参照を返す（undefined防止）
function getUI() {
  let panel = document.getElementById('pf-panel');
  if (!panel) {
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
  }
  const input   = panel.querySelector('#pf-input');
  const results = panel.querySelector('#pf-results');
  return { panel, input, results };
}

function openPanel(ui) {
  ui.panel.style.display = 'block';
  ui.input.value = '';
  ui.results.innerHTML = '';
  ui.input.focus();
}
function closePanel(ui) {
  ui.panel.style.display = 'none';
}
function togglePanel(ui) {
  (ui.panel.style.display === 'block') ? closePanel(ui) : openPanel(ui);
}

async function boot(){
  // 1) Pagefind 本体の確実なロード
  const engine = await createEngine();
  console.log('✅ Pagefind ready');

  // 2) UI 参照（必ず存在）
  const ui = getUI();
  if (!ui.input || !ui.results) {
    console.error('pf-input / pf-results が見つかりません');
    return;
  }

  // 3) 虫眼鏡トリガ（存在するページだけ）
  const trigger = document.querySelector('.header-search a,[data-search]');
  if (trigger) {
    trigger.addEventListener('click', (e)=>{
      e.preventDefault();           // ← これで「ホームへ飛ぶ」挙動を防止
      togglePanel(ui);
    });
  } else {
    console.warn('検索トリガー(.header-search a / [data-search])が見つかりません');
  }

  // 4) 外側クリック / Esc で閉じる
  document.addEventListener('click', (e)=>{
    if (ui.panel.style.display !== 'block') return;
    if (!e.target.closest('#pf-panel') && !e.target.closest('.header-search') && !e.target.closest('[data-search]')) {
      closePanel(ui);
    }
  });
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape' && ui.panel.style.display === 'block') closePanel(ui);
  });

  // 5) 入力→検索（デバウンス）
  let t;
  ui.input.addEventListener('input', ()=>{
    clearTimeout(t);
    t = setTimeout(async ()=>{
      const q = ui.input.value.trim();
      ui.results.innerHTML = '';
      if (!q) return;

      const res = await engine.search(q);
      if (!res?.results?.length){
        ui.results.innerHTML = '<p>該当する結果はありません。</p>';
        return;
      }
      for (const r of res.results){
        const d = await r.data();
        const a = document.createElement('a');
        a.href = d.url;
        a.textContent = d.meta?.title || d.url;
        a.style.cssText = 'display:block;padding:6px 0;color:#333;text-decoration:none';
        a.onmouseenter = ()=> a.style.textDecoration = 'underline';
        a.onmouseleave = ()=> a.style.textDecoration = 'none';
        ui.results.appendChild(a);
      }
    }, 160);
  });
}

boot().catch(err => console.error('❌ Pagefind 初期化エラー:', err));
// ---- 置き換えここまで
