function updateCarousel(currentIndex) {
    const headers = document.querySelectorAll('h1');
    headers.forEach(h => h.classList.remove('selected'));
    const headerIndex = currentIndex + 1; // first h1 is brand/title
    if (headers[headerIndex]) headers[headerIndex].classList.add('selected');

    const tiles = Array.from(document.querySelectorAll('.tile'));
    tiles.forEach(t => t.classList.remove('selected'));
    const target = tiles[currentIndex];
    if (target) target.classList.add('selected');

    const slider = document.querySelector('.tiles');
    const searchbar = document.querySelector('.searchbar');
    if (!slider) return;

    // Compute transform so the target tile is centered in the viewport.
    if (target) {
        const tileRect = target.getBoundingClientRect();
        const viewportCenter = window.innerWidth / 2;

        // Current translateX applied to slider (read from computed transform)
        const style = window.getComputedStyle(slider);
        let currentX = 0;
        try {
            const matrix = new DOMMatrixReadOnly(style.transform);
            currentX = matrix.m41;
        } catch (e) {
            // fallback: parse matrix string
            const m = style.transform.match(/matrix\((.+)\)/);
            if (m) {
                const vals = m[1].split(',');
                currentX = parseFloat(vals[4]);
            }
        }

        const targetCenterOnScreen = tileRect.left + (tileRect.width / 2);
        const delta = targetCenterOnScreen - viewportCenter;
        const newTranslate = currentX - delta;
        slider.style.transform = `translateX(${newTranslate}px)`;
    }

    if (searchbar) searchbar.style.display = (currentIndex === 0) ? 'flex' : 'none';
}

// Ensure asset paths are root-relative so they work on GitHub Pages
function normalizeAssetPath(p) {
    if (!p) return p;
    // leave absolute URLs and data URIs alone
    if (/^(https?:|data:|\/)/.test(p)) return p;
    return '/' + p.replace(/^(\.\/|\/+)+/, '');
}
// Keep carousel position correct on resize
window.addEventListener('resize', () => {
    const tiles = Array.from(document.querySelectorAll('.tile'));
    const selectedIndex = tiles.findIndex(t => t.classList.contains('selected'));
    if (selectedIndex >= 0) updateCarousel(selectedIndex);
});

// --- Games library interactions ---
function initLibraryHandlers() {
    const browseBtn = document.querySelector('.rectangle.eight');
    const libraryOverlay = document.getElementById('libraryOverlay');
    if (!browseBtn || !libraryOverlay) return;

    const closeBtn = libraryOverlay.querySelector('.close-btn');

    const openLibrary = () => {
        libraryOverlay.classList.add('open');
        libraryOverlay.setAttribute('aria-hidden', 'false');
    };
    const closeLibrary = () => {
        libraryOverlay.classList.remove('open');
        libraryOverlay.setAttribute('aria-hidden', 'true');
    };

    browseBtn.addEventListener('click', openLibrary);
    closeBtn.addEventListener('click', closeLibrary);

    libraryOverlay.addEventListener('click', (e) => {
        if (e.target === libraryOverlay) closeLibrary();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLibrary();
    });

    // Game selection: clicking opens the game's page in games/<slug>.html
    const cards = libraryOverlay.querySelectorAll('.game-card');
    const slugify = (s) => s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const title = card.dataset.title || '';
            const slug = slugify(title);
                // determine cover URL from computed style if present
                let coverUrl = null;
                try {
                    const cs = window.getComputedStyle(card);
                    const bg = cs.backgroundImage || '';
                    const m = bg.match(/url\(["']?(.*?)["']?\)/);
                    if (m && m[1] && m[1] !== 'none') coverUrl = m[1];
                } catch (e) { /* ignore */ }

                if (!coverUrl) coverUrl = normalizeAssetPath(`assets/images/games/${slug}.png`);

                // save last-played info (store normalized path)
                try {
                    localStorage.setItem('lastPlayed', JSON.stringify({ title: title, slug: slug, cover: normalizeAssetPath(coverUrl) }));
                } catch (e) { /* ignore storage errors */ }

                // navigate to games/<slug>.html
                window.location.href = `games/${slug}.html`;
        });
    });
}

// Apply last-played game to the main banner on the home tile
function applyLastPlayed() {
    try {
        const raw = localStorage.getItem('lastPlayed');
        if (!raw) return;
        const obj = JSON.parse(raw);
        if (!obj) return;

        const banner = document.querySelector('.tiles .tile .right-side .banner');
        if (!banner) return;

        // set cover if available (normalize stored path)
        if (obj.cover) {
            const coverPath = normalizeAssetPath(obj.cover);
            banner.style.background = `url('${coverPath}') center center / cover no-repeat #1d1d1d`;
        }

        // set title inside banner
        let h = banner.querySelector('h2');
        if (!h) {
            h = document.createElement('h2');
            banner.appendChild(h);
        }
        h.textContent = obj.title || '';

        // make banner clickable to return to last-played game
        banner.classList.add('clickable');
        banner.setAttribute('role', 'button');
        banner.setAttribute('tabindex', '0');
        banner.onclick = () => { window.location.href = `games/${obj.slug || obj.title.toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-')}.html`; };
        banner.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') banner.onclick(); });
    } catch (e) {
        // ignore
    }
}

    // Load cover images for game cards, trying multiple filename variants and extensions
    function applyGameCovers() {
        const cards = document.querySelectorAll('.game-card');
        const slugify = (s) => s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
        const exts = ['png','jpg','jpeg','webp'];
        cards.forEach(card => {
            const titleRaw = card.dataset.title || card.textContent || '';
            const title = String(titleRaw).trim();
            const slug = slugify(title);
            const slugNoHyphen = slug.replace(/-/g, '');
            const compactTitle = title.toLowerCase().replace(/[^\w]/g, '');
            const variants = [slug, slugNoHyphen, compactTitle];

            variants.forEach(v => {
                if (!v) return;
                exts.forEach(ext => {
                    if (card.dataset.coverLoaded) return;
                    const path = normalizeAssetPath(`assets/images/games/${v}.${ext}`);
                    const img = new Image();
                    img.onload = () => {
                        if (!card.dataset.coverLoaded) {
                            card.style.backgroundImage = `url('${path}')`;
                            card.dataset.coverLoaded = 'true';
                        }
                    };
                    img.onerror = () => { /* try next */ };
                    img.src = path;
                });
            });
        });
    }

// Initialize handlers once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initUsername(); initLibraryHandlers(); applyGameCovers(); applyLastPlayed(); });
} else {
    initUsername(); initLibraryHandlers(); applyGameCovers(); applyLastPlayed();
}

// --- Username prompt ---
function initUsername() {
    const stored = localStorage.getItem('xboxUsername');
    const usernameEl = document.getElementById('username');
    const overlay = document.getElementById('usernameOverlay');
    const input = document.getElementById('usernameInput');
    const saveBtn = document.getElementById('usernameSave');

    const applyName = (name) => {
        if (usernameEl) usernameEl.textContent = name;
    };

    if (stored) {
        applyName(stored);
        if (overlay) overlay.setAttribute('aria-hidden', 'true');
        return;
    }

    if (!overlay || !input || !saveBtn) return;
    overlay.setAttribute('aria-hidden', 'false');
    input.focus();

    const save = () => {
        const val = input.value.trim();
        if (!val) return;
        localStorage.setItem('xboxUsername', val);
        applyName(val);
        overlay.setAttribute('aria-hidden', 'true');
    };

    saveBtn.addEventListener('click', save);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}