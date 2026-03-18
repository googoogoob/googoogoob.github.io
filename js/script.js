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
    const discordButton = document.getElementById('discordButton');
    if (discordButton) discordButton.style.display = (currentIndex === 0) ? 'block' : 'none';
}

// Ensure asset paths are root-relative so they work on GitHub Pages
function normalizeAssetPath(p) {
    if (!p) return p;
    // leave absolute URLs and data URIs alone
    if (/^(https?:|data:|\/)/.test(p)) return p;
    return '/' + p.replace(/^(\.\/|\/+)+/, '');
}
// Create a centered overlay showing the cover image and spinner, then navigate
function createLaunchOverlay(coverUrl, delayMs, href) {
    const normalized = normalizeAssetPath(coverUrl || '');
    const overlay = document.createElement('div');
    overlay.className = 'launch-overlay';

    // cover image shown while iframe loads
    const img = document.createElement('img');
    img.className = 'launch-image';
    img.alt = '';
    img.src = normalized || '';
    overlay.appendChild(img);

    // spinner on top of cover
    const spinnerWrap = document.createElement('div');
    spinnerWrap.className = 'launch-spinner';
    spinnerWrap.innerHTML = '<div class="spinner" aria-hidden="true"></div>';
    overlay.appendChild(spinnerWrap);

    // iframe (hidden until loaded)
    const iframe = document.createElement('iframe');
    iframe.className = 'launch-iframe';
    iframe.src = href;
    iframe.setAttribute('allowfullscreen','');
    iframe.setAttribute('allow','storage-access-by-user-activation');
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    overlay.appendChild(iframe);

    // Request storage access for better IndexedDB support
    if (document.requestStorageAccess) {
        document.requestStorageAccess().catch(err => {
            // Storage access denied, but continue anyway
            console.log('Storage access request status:', err);
        });
    }

    // in-game menu (opens with Shift+Tab) — hidden by default
    const menu = document.createElement('div');
    menu.className = 'in-game-menu';
    menu.innerHTML = `
        <div class="menu-box" role="dialog" aria-modal="true">
            <button class="menu-btn continue">Continue</button>
            <button class="menu-btn exit">Exit to Menu</button>
        </div>
    `;
    menu.style.display = 'none';
    overlay.appendChild(menu);

    document.body.appendChild(overlay);

    // Hide the Discord button while in-game (overlay active)
    const discordButton = document.getElementById('discordButton');
    if (discordButton) discordButton.style.display = 'none';

    // show overlay and animate cover → final size
    window.requestAnimationFrame(() => overlay.classList.add('visible'));

    // ensure spinner remains at least this long (ms) so it doesn't flash away
    const minSpinnerMs = 900;
    const shownAt = Date.now();

    // when iframe loads, fade it in and remove spinner/cover after min duration
    iframe.addEventListener('load', () => {
        const elapsed = Date.now() - shownAt;
        const removeNow = () => {
            iframe.style.transition = 'opacity 220ms ease-in';
            iframe.style.opacity = '1';
            // fade out spinner and cover
            if (spinnerWrap && spinnerWrap.parentNode) spinnerWrap.parentNode.removeChild(spinnerWrap);
            if (img && img.parentNode) img.parentNode.removeChild(img);
            // allow interactions with iframe
            overlay.style.pointerEvents = 'auto';
        };
        if (elapsed >= minSpinnerMs) removeNow(); else setTimeout(removeNow, minSpinnerMs - elapsed);
    });

    // fallback: if iframe doesn't fire load within a longer timeout, still show it
    setTimeout(() => {
        if (iframe && iframe.style.opacity === '0') {
            try { iframe.style.opacity = '1'; } catch (e) {}
            if (spinnerWrap && spinnerWrap.parentNode) spinnerWrap.parentNode.removeChild(spinnerWrap);
            if (img && img.parentNode) img.parentNode.removeChild(img);
            overlay.style.pointerEvents = 'auto';
        }
    }, Math.max(delayMs || 1500, 3000));

    // functions to show/hide menu (used from parent or injected iframe listener)
    const showMenu = () => {
        if (menu.style.display === 'none') {
            menu.style.display = 'flex';
            menu.classList.add('show');
            const btn = menu.querySelector('.menu-btn.continue');
            try { btn.focus(); } catch (e) {}
        }
    };
    const hideMenu = () => {
        if (menu.style.display !== 'none') {
            menu.style.display = 'none';
            menu.classList.remove('show');
        }
    };

    // keyboard/menu handling for the overlay (Shift+Tab to open menu)
    const keyHandler = (e) => {
        // Shift+Tab opens the menu
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            showMenu();
            return;
        }
        // Esc closes the menu if open
        if (e.key === 'Escape' && menu.style.display !== 'none') {
            hideMenu();
        }
    };
    document.addEventListener('keydown', keyHandler);

    // menu button actions
    const btnContinue = menu.querySelector('.menu-btn.continue');
    const btnExit = menu.querySelector('.menu-btn.exit');
    btnContinue.addEventListener('click', () => { hideMenu(); });
    btnExit.addEventListener('click', () => {
        // play exit animation then remove overlay and return to home
        overlay.classList.add('exiting');
        // prevent further menu interactions
        try { overlay.style.pointerEvents = 'none'; } catch (e) {}
        try {
            // trigger iframe fade/scale (iframe is in scope)
            iframe.style.transition = 'opacity 320ms ease, transform 380ms ease';
            iframe.style.transform = 'scale(0.96)';
            iframe.style.opacity = '0';
        } catch (e) {}
        const cleanup = () => {
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            try { document.removeEventListener('keydown', keyHandler); } catch (e) {}
            try { updateCarousel(0); } catch (e) {}
        };
        // wait for animation to finish then cleanup
        setTimeout(cleanup, 480);
    });

    // when overlay is removed by other means, ensure we remove the key handler
    // try to attach a key listener inside the iframe (allows games to trigger Shift+Tab)
    let iframeKeyHandler = null;
    const attachIframeKeyListener = () => {
        try {
            iframeKeyHandler = (e) => {
                if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    showMenu();
                }
            };
            // attach to iframe's window and document if same-origin
            if (iframe && iframe.contentWindow) iframe.contentWindow.addEventListener('keydown', iframeKeyHandler);
            if (iframe && iframe.contentDocument && iframe.contentDocument.defaultView) iframe.contentDocument.defaultView.addEventListener('keydown', iframeKeyHandler);
        } catch (e) {
            // cross-origin iframe — cannot attach; fallback requires cooperation from game via postMessage
            iframeKeyHandler = null;
        }
    };
    // attach when iframe is ready
    iframe.addEventListener('load', () => attachIframeKeyListener());

    const observer = new MutationObserver(() => {
        if (!document.body.contains(overlay)) {
            try { document.removeEventListener('keydown', keyHandler); } catch (e) {}
            try {
                if (iframeKeyHandler && iframe && iframe.contentWindow) iframe.contentWindow.removeEventListener('keydown', iframeKeyHandler);
            } catch (e) {}
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
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
        card.addEventListener('click', (e) => {
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

                // Show centered overlay with the cover image + spinner, then navigate
                if (card.dataset.launching !== '1') {
                    card.dataset.launching = '1';
                    createLaunchOverlay(coverUrl, 700, `games/${slug}.html`);
                }
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

        // make banner clickable to return to last-played game with an animated launch
        banner.classList.add('clickable');
        banner.setAttribute('role', 'button');
        banner.setAttribute('tabindex', '0');
        const targetSlug = (obj.slug || obj.title.toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-'));
        const navigateToGame = () => { window.location.href = `games/${targetSlug}.html`; };

        const launchAndNavigate = (e) => {
            // prevent double-activation
            if (banner.dataset.launching === '1') return;
            banner.dataset.launching = '1';
            // compute cover url (use stored or from computed style)
            let coverUrl = (obj.cover) ? normalizeAssetPath(obj.cover) : null;
            try {
                if (!coverUrl) {
                    const cs = window.getComputedStyle(banner);
                    const bg = cs.backgroundImage || '';
                    const m = bg.match(/url\(["']?(.*?)["']?\)/);
                    if (m && m[1] && m[1] !== 'none') coverUrl = m[1];
                }
            } catch (e) { /* ignore */ }
            createLaunchOverlay(coverUrl, 800, `games/${targetSlug}.html`);
        };

        banner.addEventListener('click', launchAndNavigate);
        banner.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') launchAndNavigate(); });
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
    document.addEventListener('DOMContentLoaded', () => { initUsername(); initProfile(); initLibraryHandlers(); applyGameCovers(); applyLastPlayed(); initPowerOffHandler(); });
} else {
    initUsername(); initProfile(); initLibraryHandlers(); applyGameCovers(); applyLastPlayed(); initPowerOffHandler();
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

// --- Profile Settings ---
function showProfileSettings() {
    const overlay = document.getElementById('profileOverlay');
    const usernameInput = document.getElementById('profileUsernameInput');
    const saveBtn = document.getElementById('profileSave');

    if (!overlay || !usernameInput || !saveBtn) return;

    // Pre-fill current username
    const currentUsername = localStorage.getItem('xboxUsername') || '';
    usernameInput.value = currentUsername;

    overlay.setAttribute('aria-hidden', 'false');
    usernameInput.focus();

    const save = () => {
        const usernameVal = usernameInput.value.trim();
        const fileInput = document.getElementById('profilePictureInput');
        let profilePicData = null;

        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                profilePicData = e.target.result;
                localStorage.setItem('xboxProfilePic', profilePicData);
                updateProfileDisplay(usernameVal, profilePicData);
                overlay.setAttribute('aria-hidden', 'true');
            };
            reader.readAsDataURL(file);
            return; // Wait for file to load
        }

        // No new picture, just update username
        if (usernameVal) {
            localStorage.setItem('xboxUsername', usernameVal);
            updateProfileDisplay(usernameVal, localStorage.getItem('xboxProfilePic'));
        }
        overlay.setAttribute('aria-hidden', 'true');
    };

    saveBtn.addEventListener('click', save);
    usernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}

function closeProfileSettings() {
    const overlay = document.getElementById('profileOverlay');
    if (overlay) overlay.setAttribute('aria-hidden', 'true');
}

function updateProfileDisplay(username, profilePicData) {
    const usernameEl = document.getElementById('username');
    const profileImg = document.querySelector('.user img');

    if (usernameEl && username) usernameEl.textContent = username;
    if (profileImg && profilePicData) profileImg.src = profilePicData;
}

// Initialize profile picture on load
function initProfile() {
    const storedPic = localStorage.getItem('xboxProfilePic');
    const profileImg = document.querySelector('.user img');
    if (storedPic && profileImg) {
        profileImg.src = storedPic;
    }
}

// Navigate to off.html when powering off, and allow keyboard activation
function powerOff() {
    // Use a relative path to work both when served and when opened via file://
    try { console.log('powerOff() called'); } catch (e) {}
    window.location.href = 'off.html';
}

function initPowerOffHandler() {
    const powerTile = document.querySelector('.square.eight');
    if (!powerTile) return;
    powerTile.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            powerOff();
        }
    });
    // Also add a programmatic click handler in case inline handlers are blocked
    powerTile.addEventListener('click', (e) => { powerOff(); });
}



// Ensure the function is available on the global `window` for inline handlers
try { window.powerOff = powerOff; window.initPowerOffHandler = initPowerOffHandler; window.showProfileSettings = showProfileSettings; window.closeProfileSettings = closeProfileSettings; } catch (e) {}

