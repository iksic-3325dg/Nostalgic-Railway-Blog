/* ===== Pagefind floating search (vanilla JS) =====
   - 既存の .header-search a（虫眼鏡）をトグルに利用
   - パネルは画面右上に固定表示（ヘッダーを崩さない）
   - Pagefind の index は /<リポジトリ名>/pagefind/ にある前提
   - window.pagefind が無ければ自動で pagefind.js を読み込む
   ------------------------------------------------- */

(function () {
  'use strict';

  // --- 設定 ---
  // GitHub Pages のサブディレクトリ公開に対応
  var BASE_PATH = new URL(document.baseURI).pathname; // 例: /Nostalgic-Railway-Blog/
  // pagefind.js の URL（BASE_PATH を使って絶対パス化）
  var PAGEFIND_JS_URL = new URL('pagefind/pagefind.js', document.baseURI).href;

  // --- ユーティリティ ---
  function $(sel, root) { return (root || document).querySelector(sel); }
  function create(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments, self = this;
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  // --- スタイルを注入（1回だけ） ---
  function injectStylesOnce() {
    if ($('#pf-style')) return;
    var css = '' +
      '#pf-panel{position:fixed;z-index:9999;top:72px;right:12px;width:320px;max-width:calc(100vw - 24px);' +
      'background:#fff;border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,.18);padding:12px;display:none}' +
      '#pf-panel input{width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:8px;outline:none}' +
      '#pf-results{margin-top:10px;max-height:60vh;overflow:auto}' +
      '#pf-results a{display:block;padding:6px 0;color:#333;text-decoration:none}' +
      '#pf-results a:hover{text-decoration:underline}';
    var style = create('style', { id: 'pf-style' });
    style.textContent = css;
    document.head.appendChild(style);
  }

  // --- 検索パネルを用意（重複作成しない） ---
  function ensurePanel() {
    var panel = $('#pf-panel');
    if (panel) return panel;

    panel = create('div', { id: 'pf-panel', role: 'dialog', 'aria-label': 'サイト内検索' });
    panel.innerHTML =
      '<input id="pf-input" type="text" placeholder="サイト内検索…">' +
      '<div id="pf-results" aria-live="polite"></div>';
    document.body.appendChild(panel);
    return panel;
  }

  function openPanel() {
    var p = ensurePanel();
    p.style.display = 'block';
    $('#pf-input').focus();
  }
  function closePanel() {
    var p = $('#pf-panel');
    if (p) p.style.display = 'none';
  }

  // --- pagefind.js を（必要なら）動的ロード ---
  function loadPagefindIfNeeded(cb) {
    if (typeof window.pagefind === 'function') return cb();
    // 既に読み込み中なら onload を待つ
    if ($('#pf-loader')) {
      $('#pf-loader').addEventListener('load', function () { cb(); });
      $('#pf-loader').addEventListener('error', function () {
        console.error('pagefind.js の読み込みに失敗しました:', PAGEFIND_JS_URL);
      });
      return;
    }
    var s = create('script', { id: 'pf-loader', src: PAGEFIND_JS_URL, defer: '' });
    s.onload = cb;
    s.onerror = function () {
      console.error('pagefind.js の読み込みに失敗しました:', PAGEFIND_JS_URL);
    };
    document.head.appendChild(s);
  }

  // --- メイン初期化 ---
  document.addEventListener('DOMContentLoaded', function () {
    injectStylesOnce();
    ensurePanel();

    var trigger = $('.header-search a'); // 既存の虫眼鏡
    if (!trigger) {
      console.warn('検索トリガー(.header-search a)が見つかりませんでした。');
      return;
    }

    var engine = null; // Pagefind エンジン

    // トグル（クリックで開閉。レイアウトは動かさない）
    trigger.addEventListener('click', function (e) {
      e.preventDefault();

      // まだ pagefind を生成していなければ初期化
      if (!engine) {
        loadPagefindIfNeeded(async function () {
          if (typeof window.pagefind !== 'function') return; // 読み込み失敗
          try {
            engine = await window.pagefind({ baseUrl: BASE_PATH });
            openPanel();
          } catch (err) {
            console.error('Pagefind 初期化に失敗:', err);
          }
        });
      } else {
        var p = $('#pf-panel');
        if (p.style.display === 'block') { closePanel(); }
        else { openPanel(); }
      }
    });

    // 外側クリック / Esc で閉じる
    document.addEventListener('click', function (e) {
      var p = $('#pf-panel');
      if (!p || p.style.display !== 'block') return;
      if (!e.target.closest('#pf-panel') && !e.target.closest('.header-search')) closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    // 入力→検索（デバウンス）
    var onInput = debounce(async function () {
      var input = $('#pf-input');
      var list = $('#pf-results');
      if (!input || !list) return;
      var q = input.value.trim();
      list.innerHTML = '';
      if (!q) return;

      // エンジン準備がまだならロードしてから実行
      if (!engine) {
        loadPagefindIfNeeded(async function () {
          if (typeof window.pagefind !== 'function') return;
          try {
            engine = await window.pagefind({ baseUrl: BASE_PATH });
            runSearch(engine, q, list);
          } catch (err) {
            console.error('Pagefind 初期化に失敗:', err);
          }
        });
      } else {
        runSearch(engine, q, list);
      }
    }, 160);

    document.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'pf-input') onInput();
    });
  });

  // --- 検索実行と結果描画 ---
  async function runSearch(engine, q, listEl) {
    try {
      var res = await engine.search(q);
      if (!res || !res.results || !res.results.length) {
        listEl.innerHTML = '<p>該当する結果はありません。</p>';
        return;
      }
      for (var i = 0; i < res.results.length; i++) {
        var r = res.results[i];
        var data = await r.data();
        var a = create('a');
        a.href = data.url;
        a.textContent = (data.meta && data.meta.title) ? data.meta.title : data.url;
        listEl.appendChild(a);
      }
    } catch (err) {
      console.error('検索エラー:', err);
      listEl.innerHTML = '<p>検索中にエラーが発生しました。</p>';
    }
  }
})();
