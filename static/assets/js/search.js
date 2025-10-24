// /static/assets/js/search.js
(() => {
  const BASE_PATH = new URL(document.baseURI).pathname;     // /Nostalgic-Railway-Blog/
  const PAGEFIND_SRC = new URL('pagefind/pagefind.js', document.baseURI).href;
  const TRIGGER_SEL = '.header-search a, [data-search]';

  let panel, input, results, engine;

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
  function openPanel()  { ensurePanel(); panel.style.display = 'block'; input.value=''; results.innerHTML=''; input.focus(); }
  function closePanel() { if (panel) panel.style.display = 'none'; }

  function loadPagefind() {
    return new Promise((resolve, reject) => {
      if (typeof window.pagefind === 'function') return resolve();
      const s = document.createElement('script');
      s.src = PAGEFIND_SRC;
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error(`pagefind.js not loaded (${PAGEFIND_SRC})`));
      document.head.appendChild(s);
    });
  }

  function bindUI() {
    const trigger = document.querySelector(TRIGGER_SEL);
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        if (panel && panel.style.display === 'block') { closePanel(); return; }
        openPanel();
      });
    }
    document.addEventListener('click', (e)=>{
      if (!panel || panel.style.display !== 'block') return;
      if (!e.target.closest('#pf-panel') && !e.target.closest('.header-search') && !e.target.closest('[data-search]')) {
        closePanel();
      }
    });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closePanel(); });

    let t;
    input.addEventListener('input', ()=>{
      clearTimeout(t);
      t = setTimeout(async () => {
        const q = input.value.trim();
        results.innerHTML = '';
        if (!q) return;
        const res = await engine.search(q);
        if (!res?.results?.length) { results.innerHTML = '<p>該当する結果はありません。</p>'; return; }
        for (const r of res.results) {
          const d = await r.data();
          const a = document.createElement('a');
          a.href = d.url;
          a.textContent = d.meta?.title || d.url;
          a.style.cssText = 'display:block;padding:6px 0;color:#333;text-decoration:none';
          a.onmouseenter = () => a.style.textDecoration = 'underline';
          a.onmouseleave = () => a.style.textDecoration = 'none';
          results.appendChild(a);
        }
      }, 160);
    });
  }

  async function boot() {
    ensurePanel();
    await loadPagefind();                            // ← ここでpagefind.jsを必ず読み込む
    engine = await window.pagefind({ baseUrl: BASE_PATH });  // エンジン生成
    bindUI();                                        // 初期化後にイベント束ね
    console.log('Pagefind ready');
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot().catch(err => console.error('Pagefind 初期化エラー:', err));
  });
})();
