// static/assets/js/cards.js
const JSON_URL = new URL('/Nostalgic-Railway-Blog/assets/js/posts.json', location.origin).href;

function cardTemplate(post){
  return `
    <a class="card" href="${post.url}">
      <div class="card-thumb">
        <img loading="lazy" src="${post.image}" alt="${post.title}">
      </div>
      <div class="card-body">
        <h3 class="card-title">${post.title}</h3>
      </div>
    </a>
  `;
}

function mountStylesOnce(){
  if (document.getElementById('card-grid-style')) return;
  const css = `
  .card-grid{
    display:grid; gap:16px;
    grid-template-columns:repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 1024px){
    .card-grid{ grid-template-columns:repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 640px){
    .card-grid{ grid-template-columns:1fr; }
  }
  .card{
    display:block; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;
    background:#fff; text-decoration:none; color:#111; transition:transform .12s ease, box-shadow .12s ease;
  }
  .card:hover{ transform:translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,.08); }
  .card-thumb{ position:relative; aspect-ratio: 16 / 9; background:#f3f4f6; overflow:hidden; }
  .card-thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
  .card-body{ padding:10px 12px; }
  .card-title{ font-size:16px; line-height:1.5; margin:0; font-weight:600; }
  `;
  const style = document.createElement('style');
  style.id = 'card-grid-style';
  style.textContent = css;
  document.head.appendChild(style);
}

// 既存：posts.json を fetch → 最新3件抽出まではそのままでOK

function renderCards(posts) {
  const root = document.querySelector('#cards-root'); // ページ側の描画先
  if (!root) return;

  // セクション（見出し＋カード行）を作る
  const section = document.createElement('section');
  section.className = 'cards-section';

  const h3 = document.createElement('h3');
  h3.className = 'cards-title';
  h3.textContent = '新着記事をピックアップ';

  const row = document.createElement('div');
  row.className = 'cards-row';

  // カードを3件分追加（posts は新しい順にソート済み想定）
  posts.slice(0, 3).forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';

    card.innerHTML = `
      <a href="${p.url}">
        <img src="${p.image}" alt="${p.title}">
        <div class="meta">
          <div class="title">${p.title}</div>
          <div class="date">${p.date}</div>
        </div>
      </a>
    `;
    row.appendChild(card);
  });

  section.appendChild(h3);
  section.appendChild(row);
  root.replaceChildren(section);  // 置き換え
}

// 例：fetch 後に呼ぶ
// renderCards(posts);

async function boot(){
  const holders = document.querySelectorAll('[data-card-grid]');
  if (!holders.length) return;

  mountStylesOnce();

  // JSON取得
  const res = await fetch(JSON_URL, { cache: 'no-store' });
  if (!res.ok) { console.error('cards: JSON fetch error', res.status); return; }
  const posts = await res.json();

  // date降順でソート
  posts.sort((a,b)=> new Date(b.date) - new Date(a.date));

  holders.forEach(holder=>{
    const count = parseInt(holder.dataset.count || '3', 10);
    const list = posts.slice(0, Math.max(1, count));
    holder.innerHTML = `
      <div class="card-grid">
        ${list.map(cardTemplate).join('')}
      </div>
    `;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

