/**
 * ============================================================
 * DELICES MEDIAS GROUP — Blog Loader (Decap CMS + GitHub API)
 * Charge les articles JSON depuis le repo GitHub et les rend
 * dynamiquement sans build step.
 * ============================================================
 *
 * CONFIGURATION : Modifier les deux constantes ci-dessous
 * pour pointer vers le vrai dépôt GitHub.
 */

const GITHUB_REPO  = 'VOTRE_USERNAME/VOTRE_REPO'; // ← REMPLACER
const GITHUB_BRANCH = 'main';
const POSTS_DIR    = '_posts';
const BASE_URL     = `https://api.github.com/repos/${GITHUB_REPO}/contents/${POSTS_DIR}?ref=${GITHUB_BRANCH}`;

/* ── État global ── */
let allPosts = [];
let currentFilter = 'Tous';
let currentPage = 1;
const POSTS_PER_PAGE = 9;

/* ── Utilitaires ── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/** Convertit du Markdown basique en HTML */
function markdownToHtml(md) {
  if (!md) return '';
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hup])/gm, '<p>')
    .replace(/<p><\/p>/g, '');
}

/** Formate une date ISO en français */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Génère les étoiles d'un témoignage */
function stars(n = 5) {
  return '★'.repeat(Number(n)) + '☆'.repeat(5 - Number(n));
}

/* ── Fetch posts from GitHub ── */
async function fetchPosts() {
  showSkeleton();

  try {
    // 1. Récupérer la liste des fichiers dans _posts/
    const listRes = await fetch(BASE_URL, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!listRes.ok) throw new Error(`GitHub API: ${listRes.status} — Vérifiez GITHUB_REPO dans blog-loader.js`);
    const files = await listRes.json();

    // 2. Filtrer uniquement les fichiers .json
    const jsonFiles = files.filter(f => f.name.endsWith('.json') && f.type === 'file');
    if (!jsonFiles.length) {
      showEmpty('Aucun article trouvé dans le dépôt.');
      return;
    }

    // 3. Fetch le contenu de chaque fichier en parallèle
    const fetchPromises = jsonFiles.map(async file => {
      const res = await fetch(file.download_url);
      if (!res.ok) return null;
      const post = await res.json();
      post._filename = file.name;
      post._slug = file.name.replace('.json', '');
      return post;
    });

    const results = await Promise.all(fetchPromises);
    allPosts = results
      .filter(p => p && p.published !== false)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    buildFilters();
    renderPosts();

  } catch (err) {
    console.error('Blog loader error:', err);
    showError(err.message);
  }
}

/* ── Build category filter buttons ── */
function buildFilters() {
  const categories = ['Tous', ...new Set(allPosts.map(p => p.category).filter(Boolean))];
  const filterBar = $('blog-filters');
  if (!filterBar) return;

  filterBar.innerHTML = categories.map(cat => `
    <button class="blog-filter ${cat === currentFilter ? 'active' : ''}"
            aria-pressed="${cat === currentFilter}"
            data-category="${cat}">
      ${cat}
    </button>
  `).join('');

  filterBar.querySelectorAll('.blog-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.category;
      currentPage = 1;
      filterBar.querySelectorAll('.blog-filter').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      renderPosts();
    });
  });
}

/* ── Render posts grid ── */
function renderPosts() {
  const grid = $('blog-grid');
  const featured = $('blog-featured');
  const paginationEl = $('blog-pagination');
  if (!grid) return;

  let filtered = currentFilter === 'Tous'
    ? allPosts
    : allPosts.filter(p => p.category === currentFilter);

  // Featured post (premier article à la une, page 1, filtre Tous)
  const featuredPost = currentFilter === 'Tous' && currentPage === 1
    ? filtered.find(p => p.featured) || filtered[0]
    : null;

  const remainingPosts = featuredPost
    ? filtered.filter(p => p._slug !== featuredPost._slug)
    : filtered;

  const totalPages = Math.ceil(remainingPosts.length / POSTS_PER_PAGE);
  const pagePosts = remainingPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  // Render featured
  if (featured) {
    if (featuredPost) {
      featured.style.display = '';
      featured.innerHTML = renderFeaturedCard(featuredPost);
    } else {
      featured.style.display = 'none';
    }
  }

  // Render grid
  if (!pagePosts.length && !featuredPost) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--grey-mid)">
      <i class="fa-solid fa-newspaper" style="font-size:2.5rem;margin-bottom:1rem;display:block"></i>
      Aucun article dans cette catégorie pour l'instant.
    </div>`;
  } else {
    grid.innerHTML = pagePosts.map(post => renderPostCard(post)).join('');

    // Animate cards in
    grid.querySelectorAll('.card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`;
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    });
  }

  // Pagination
  if (paginationEl) {
    renderPagination(paginationEl, totalPages);
  }
}

/* ── Article cards HTML ── */
function renderFeaturedCard(post) {
  const coverImg = post.cover_image
    ? `<img src="${post.cover_image}" alt="${escHtml(post.title)}" loading="lazy">`
    : `<img src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&auto=format&fit=crop" alt="${escHtml(post.title)}" loading="lazy">`;

  return `
    <div class="blog-featured-layout">
      <div class="blog-featured-card card">
        <div class="card-img">${coverImg}</div>
        <div class="card-body">
          <span class="card-tag">${escHtml(post.category || 'Actualités')} · ${formatDate(post.date)}</span>
          <h2 style="font-family:var(--font-display);font-size:clamp(1.4rem,2.5vw,2rem);margin-bottom:0.8rem;line-height:1.2">${escHtml(post.title)}</h2>
          <p>${escHtml(post.excerpt || '')}</p>
          <br>
          <button class="btn btn-gold-outline" style="font-size:0.72rem;padding:0.5rem 1.2rem"
                  onclick="openArticle('${post._slug}')"
                  aria-label="Lire l'article : ${escHtml(post.title)}">
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i> Lire l'article
          </button>
        </div>
      </div>
      <div class="blog-sidebar">
        ${allPosts.filter(p => p._slug !== post._slug).slice(0, 3).map(p => `
          <div class="blog-mini-card" role="article" style="cursor:pointer" onclick="openArticle('${p._slug}')">
            <div class="blog-mini-img">
              <img src="${p.cover_image || 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&auto=format&fit=crop'}"
                   alt="${escHtml(p.title)}" loading="lazy">
            </div>
            <div class="blog-mini-body">
              <span class="card-tag">${escHtml(p.category || '')}</span>
              <h3>${escHtml(p.title)}</h3>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderPostCard(post) {
  const coverImg = post.cover_image
    ? `<img src="${post.cover_image}" alt="${escHtml(post.title)}" loading="lazy">`
    : `<img src="https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&auto=format&fit=crop" alt="${escHtml(post.title)}" loading="lazy">`;

  return `
    <article class="card" role="article" style="cursor:pointer" onclick="openArticle('${post._slug}')"
             aria-label="Article : ${escHtml(post.title)}">
      <div class="card-img">${coverImg}</div>
      <div class="card-body">
        <span class="card-tag">${escHtml(post.category || 'Actualités')} · ${formatDate(post.date)}</span>
        <h3>${escHtml(post.title)}</h3>
        <p>${escHtml(post.excerpt || '')}</p>
        ${post.tags && post.tags.length ? `
          <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.8rem">
            ${post.tags.slice(0, 3).map(t => `<span class="badge badge-gold" style="font-size:0.55rem">${escHtml(t)}</span>`).join('')}
          </div>` : ''}
      </div>
    </article>`;
}

/* ── Pagination ── */
function renderPagination(el, total) {
  if (total <= 1) { el.innerHTML = ''; return; }

  const pages = [];
  for (let i = 1; i <= total; i++) {
    pages.push(`
      <button class="blog-filter ${i === currentPage ? 'active' : ''}"
              aria-label="Page ${i}" aria-current="${i === currentPage ? 'page' : 'false'}"
              onclick="goToPage(${i})">${i}</button>`);
  }

  el.innerHTML = `
    <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-top:3rem">
      <button class="blog-filter" ${currentPage === 1 ? 'disabled' : ''}
              onclick="goToPage(${currentPage - 1})"
              aria-label="Page précédente">
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      ${pages.join('')}
      <button class="blog-filter" ${currentPage === total ? 'disabled' : ''}
              onclick="goToPage(${currentPage + 1})"
              aria-label="Page suivante">
        <i class="fa-solid fa-arrow-right"></i>
      </button>
    </div>`;
}

window.goToPage = function(page) {
  currentPage = page;
  renderPosts();
  const blogSection = document.querySelector('[aria-labelledby="blog-heading"]');
  if (blogSection) blogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* ── Article detail modal ── */
window.openArticle = function(slug) {
  const post = allPosts.find(p => p._slug === slug);
  if (!post) return;

  const modal = document.createElement('div');
  modal.id = 'article-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', post.title);
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9000;
    background:rgba(10,22,40,0.97);
    backdrop-filter:blur(20px);
    overflow-y:auto;
    animation:fadeIn 0.3s ease;
  `;

  const coverHtml = post.cover_image
    ? `<div style="width:100%;max-height:480px;overflow:hidden;border-radius:var(--radius-md);margin-bottom:3rem">
         <img src="${post.cover_image}" alt="${escHtml(post.title)}"
              style="width:100%;height:100%;object-fit:cover">
       </div>`
    : '';

  const tagsHtml = post.tags && post.tags.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:2rem">
         ${post.tags.map(t => `<span class="badge badge-gold">${escHtml(t)}</span>`).join('')}
       </div>`
    : '';

  modal.innerHTML = `
    <div style="max-width:760px;margin:0 auto;padding:6rem 2rem 4rem">
      <button onclick="closeArticle()" aria-label="Fermer l'article"
              style="position:fixed;top:1.5rem;right:1.5rem;
                     background:rgba(255,255,255,0.08);border:1px solid var(--glass-border);
                     color:var(--white);border-radius:50%;width:44px;height:44px;
                     display:flex;align-items:center;justify-content:center;
                     cursor:pointer;font-size:1rem;transition:all 0.3s;z-index:1">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>

      <div style="margin-bottom:2rem">
        <span class="card-tag" style="display:inline-block;margin-bottom:1rem">
          ${escHtml(post.category || 'Actualités')} · ${formatDate(post.date)}
        </span>
        <h1 style="font-family:var(--font-display);font-size:clamp(2rem,4vw,3rem);
                   font-weight:300;line-height:1.1;letter-spacing:-0.02em;margin-bottom:1rem">
          ${escHtml(post.title)}
        </h1>
        <div style="display:flex;align-items:center;gap:1rem">
          <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--grey-mid);
                       letter-spacing:0.15em;text-transform:uppercase">
            <i class="fa-solid fa-user" style="color:var(--gold);margin-right:0.4rem"></i>
            ${escHtml(post.author || 'Delices Medias Group')}
          </span>
        </div>
      </div>

      ${coverHtml}
      ${tagsHtml}

      <div style="font-size:1rem;line-height:1.9;color:var(--grey-light)" class="article-body">
        ${markdownToHtml(post.body || '')}
      </div>

      <div style="margin-top:4rem;padding-top:2rem;border-top:1px solid var(--glass-border);
                  display:flex;gap:1rem;flex-wrap:wrap">
        <a href="https://wa.me/237677685062?text=J'ai%20lu%20votre%20article%20«%20${encodeURIComponent(post.title)}%20»%20et%20je%20voudrais%20en%20savoir%20plus"
           target="_blank" rel="noopener" class="btn btn-primary" style="font-size:0.75rem">
          <i class="fa-brands fa-whatsapp"></i> Partager sur WhatsApp
        </a>
        <button onclick="closeArticle()" class="btn btn-outline" style="font-size:0.75rem">
          <i class="fa-solid fa-arrow-left"></i> Retour aux articles
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Keyboard close
  modal._keyHandler = e => { if (e.key === 'Escape') closeArticle(); };
  document.addEventListener('keydown', modal._keyHandler);
};

window.closeArticle = function() {
  const modal = document.getElementById('article-modal');
  if (modal) {
    document.removeEventListener('keydown', modal._keyHandler);
    modal.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 200);
  }
};

/* ── Skeleton loader ── */
function showSkeleton() {
  const grid = $('blog-grid');
  if (!grid) return;
  const skeletonCard = () => `
    <div style="background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--radius-md);overflow:hidden">
      <div style="height:180px;background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite"></div>
      <div style="padding:1.5rem">
        <div style="height:12px;width:60%;background:var(--glass);border-radius:6px;margin-bottom:0.8rem;animation:shimmer 1.5s infinite"></div>
        <div style="height:18px;width:90%;background:var(--glass);border-radius:6px;margin-bottom:0.5rem;animation:shimmer 1.5s infinite"></div>
        <div style="height:14px;width:80%;background:var(--glass);border-radius:6px;animation:shimmer 1.5s infinite"></div>
      </div>
    </div>`;

  if (!document.getElementById('shimmer-style')) {
    const style = document.createElement('style');
    style.id = 'shimmer-style';
    style.textContent = `
      @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      @keyframes fadeOut { to { opacity:0 } }
      .article-body h1,.article-body h2,.article-body h3 {
        font-family:var(--font-display);color:var(--gold);margin:2rem 0 0.8rem;
      }
      .article-body ul { margin:1rem 0 1rem 1.5rem; }
      .article-body li { margin-bottom:0.4rem; }
      .article-body strong { color:var(--white); }
      .article-body a { color:var(--gold);text-decoration:underline; }
      .blog-featured-layout {
        display:grid;grid-template-columns:1.4fr 1fr;gap:2rem;margin-bottom:4rem;
      }
      .blog-sidebar { display:flex;flex-direction:column;gap:1rem; }
      @media(max-width:768px) { .blog-featured-layout { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  }

  grid.innerHTML = [1, 2, 3].map(skeletonCard).join('');
}

function showEmpty(msg) {
  const grid = $('blog-grid');
  if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--grey-mid)">${msg}</div>`;
}

function showError(msg) {
  const grid = $('blog-grid');
  const featured = $('blog-featured');
  if (featured) featured.innerHTML = '';
  if (grid) grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:4rem">
      <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;color:var(--gold);display:block;margin-bottom:1rem"></i>
      <p style="color:var(--grey-light);font-size:0.9rem;margin-bottom:0.5rem">Impossible de charger les articles.</p>
      <p style="color:var(--grey-mid);font-size:0.75rem;font-family:var(--font-mono)">${escHtml(msg)}</p>
      <br>
      <button class="btn btn-gold-outline" onclick="fetchPosts()" style="font-size:0.75rem">
        <i class="fa-solid fa-rotate-right"></i> Réessayer
      </button>
    </div>`;
}

/** Échappe les caractères HTML */
function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', fetchPosts);
