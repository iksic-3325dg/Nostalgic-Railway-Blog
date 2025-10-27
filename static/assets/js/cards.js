// モジュールで読み込む想定：<script type="module" src="/.../assets/js/cards.js"></script>

const BASE = new URL(document.baseURI);                   // base要素を尊重
const POSTS_URL = new URL('assets/js/posts.json', BASE).href;

async function loadPosts() {
  const res = await fetch(POSTS_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`posts.json fetch error ${res.status}`);
  return await res.json();
}

function buildCard(post) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = post.url;                                     // posts.jsonは絶対/相対どちらでもOK

  const th = document.createElement('div');
  th.className = 'card-thumb';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = post.image;
  img.alt = post.title || '';
  th.appendChild(img);

  const body = document.createElement('div');
  body.className = 'card-body';
  const h = document.createElement('p');
  h.className = 'card-title';
  h.textContent = post.title || '';
  const d = document.createElement('p');
  d.className = 'card-date';
  if (post.date) d.textContent = post.date;

  body.append(h, d);
  a.append(th, body);
  return a;
}

async function mountGrids(){
  const posts = await loadPosts();
  document.querySelectorAll('[data-card-grid]').forEach(gridHost => {
    // コンテナ生成
    const grid = document.createElement('div');
    grid.className = 'card-grid';
    gridHost.replaceWith(grid);

    // 表示件数（未指定なら3）
    const n = Number(gridHost.getAttribute('data-count') || 3);

    // 新しい順で上から n 件
    posts.slice(0, n).forEach(p => grid.appendChild(buildCard(p)));
  });
}

mountGrids().catch(err => console.error('cards:', err));
