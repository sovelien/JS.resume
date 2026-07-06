/* ============================================================
   Loader — timing flags
   loaderStart: timestamp captured the moment the script runs,
   used to compute how long the loader has already been visible.
   loaderDone: flips to true only after the loader is fully gone;
   guards the DevTools overlay so it never appears during loading.
   ============================================================ */
var loaderStart = Date.now();
var loaderDone  = false;

/* ============================================================
   Document Ready
   Entry point — runs getQuote() once the DOM is fully parsed.
   ============================================================ */
$(document).ready(function () {
    getQuote();
    initCustomCursor();
    initScrollSpy();
});

/* ============================================================
   Scroll Spy — active nav underline
   Watches each section referenced by a #topNav link and marks
   the matching link "active" once its section crosses the
   middle band of the viewport (IntersectionObserver rootMargin
   shrinks the trigger area to a thin strip around center), so
   the animated underline (see resume.css) tracks whichever
   section is currently in view.
   ============================================================ */
function initScrollSpy() {
    var navLinks = document.querySelectorAll('#topNav .nav-link.JS-scroll-trigger');
    if (!navLinks.length || !('IntersectionObserver' in window)) return;

    var linkByHash = {};
    var sections = [];
    navLinks.forEach(function (link) {
        var hash = link.getAttribute('href');
        var section = hash && document.querySelector(hash);
        if (section) {
            linkByHash[hash] = link;
            sections.push(section);
        }
    });
    if (!sections.length) return;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            navLinks.forEach(function (l) { l.classList.remove('active'); });
            linkByHash['#' + entry.target.id].classList.add('active');
        });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });
}

/* ============================================================
   Custom Cursor — "terminal caret"
   Desktop (any-pointer: fine): a blinking text-caret glued to the
   real pointer, trailed by a small monospace command tag. The tag
   idles on a bare "❯" prompt and swaps in an element's
   [data-cursor-text] hint on hover — the cursor itself is the
   hover-info affordance, not a separate tooltip system.
   Touch: no fake cursor — a cornflower ripple pulses at each tap.
   ============================================================ */
var CURSOR_IDLE_PROMPT = '❯';

function initCustomCursor() {
    /* any-pointer (not just the primary pointer) so hybrid touch+mouse
       laptops still get the fine-pointer cursor when a mouse is present */
    var hasFinePointer = window.matchMedia('(any-pointer: fine)').matches;
    var reduceMotion   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Touch ripple runs on any device with a touchscreen, independent of
       whether a fine pointer is also available */
    document.addEventListener('touchstart', function (e) {
        var t = e.touches[0];
        if (!t) return;
        spawnTapRipple(t.clientX, t.clientY);
    }, { passive: true });

    if (!hasFinePointer) return;

    document.body.classList.add('custom-cursor');

    var caret = document.createElement('div');
    var tag   = document.createElement('div');
    caret.id = 'cursor-caret';
    tag.id   = 'cursor-tag';
    tag.textContent = CURSOR_IDLE_PROMPT;
    document.body.appendChild(caret);
    document.body.appendChild(tag);

    var mouseX = -100, mouseY = -100;
    var tagX   = -100, tagY   = -100;

    document.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        caret.style.transform = 'translate(-50%, -50%) translate(' + mouseX + 'px,' + mouseY + 'px)';
        caret.classList.add('visible');
        tag.classList.add('visible');
    });

    document.addEventListener('mouseleave', function () {
        caret.classList.remove('visible');
        tag.classList.remove('visible');
    });

    document.addEventListener('mousedown', function () {
        caret.classList.add('click');
        tag.classList.add('click');
    });

    document.addEventListener('mouseup', function () {
        caret.classList.remove('click');
        tag.classList.remove('click');
    });

    /* Tag eases behind the pointer instead of snapping to it, unless the
       user prefers reduced motion, in which case it tracks directly */
    (function trackTag() {
        var tagWidth = tag.offsetWidth || 0;
        var nearRightEdge = mouseX + 18 + tagWidth > window.innerWidth - 10;
        var targetX = nearRightEdge ? mouseX - tagWidth - 18 : mouseX + 18;
        var targetY = mouseY + 22;
        if (reduceMotion) {
            tagX = targetX;
            tagY = targetY;
        } else {
            tagX += (targetX - tagX) * 0.2;
            tagY += (targetY - tagY) * 0.2;
        }
        tag.style.transform = 'translate(' + tagX + 'px,' + tagY + 'px)';
        requestAnimationFrame(trackTag);
    })();

    var hoverSelector = 'a, button, .img-pop, .img-pop-hobbies-and-links, input, [role="button"]';
    var popSelector   = '.img-pop, .img-pop-hobbies-and-links';

    /* Tool-icon popups still carry their message in a CSS ::before
       (content: '...'), so lift that same string into the cursor tag
       instead of duplicating it in markup as a data-cursor-text attr */
    function getPopText(el) {
        var content = window.getComputedStyle(el, '::before').content;
        if (!content || content === 'none' || content === 'normal') return null;
        return content.replace(/^["']|["']$/g, '');
    }

    /* Discoverability hint — nudges desktop visitors to hover things,
       then gets out of the way as soon as they find one or after a while */
    var hint = document.getElementById('cursor-hint');
    var hintShowTimer, hintHideTimer;
    if (hint) {
        hintShowTimer = setTimeout(function () { hint.classList.add('show'); }, 1200);
        hintHideTimer = setTimeout(dismissHint, 8000);
    }
    function dismissHint() {
        if (!hint) return;
        clearTimeout(hintShowTimer);
        clearTimeout(hintHideTimer);
        hint.classList.remove('show');
    }

    document.addEventListener('mouseover', function (e) {
        var infoEl = e.target.closest && e.target.closest('[data-cursor-text]');
        if (infoEl) {
            tag.textContent = CURSOR_IDLE_PROMPT + ' ' + infoEl.getAttribute('data-cursor-text');
            tag.classList.add('active');
            caret.classList.add('active');
            dismissHint();
            return;
        }
        var popEl = e.target.closest && e.target.closest(popSelector);
        if (popEl) {
            var text = getPopText(popEl);
            if (text) {
                tag.textContent = CURSOR_IDLE_PROMPT + ' ' + text;
                tag.classList.add('active');
                caret.classList.add('active', 'hover');
                dismissHint();
                return;
            }
        }
        if (e.target.closest && e.target.closest(hoverSelector)) {
            caret.classList.add('hover');
        }
    });

    document.addEventListener('mouseout', function (e) {
        if (e.target.closest && (e.target.closest('[data-cursor-text]') || e.target.closest(popSelector))) {
            tag.textContent = CURSOR_IDLE_PROMPT;
            tag.classList.remove('active');
            caret.classList.remove('active');
        }
        if (e.target.closest && e.target.closest(hoverSelector)) {
            caret.classList.remove('hover');
        }
    });
}

function spawnTapRipple(x, y) {
    var ripple = document.createElement('div');
    ripple.className = 'tap-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top  = y + 'px';
    document.body.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 600);
}

/* ============================================================
   Variables
   ============================================================ */
const btnCssSwitcher   = document.querySelector('#css-switcher');
const pageUpBottom     = document.querySelector('#page-up');
const scrollProgressBar = document.getElementById('scroll-progress-bar');

/* ============================================================
   Scroll listener
   Fires scrollFunction() on every scroll event.
   ============================================================ */
window.onscroll = function () { scrollFunction(); };
window.addEventListener('resize', updateScrollProgress);
window.addEventListener('load', updateScrollProgress);

/* ============================================================
   Scroll Progress Bar
   Fills a thin bar fixed to the top of the page based on how
   much of the document has been scrolled (0% at the top,
   100% at the bottom).
   ============================================================ */
function updateScrollProgress() {
    var scrollTop    = document.documentElement.scrollTop || document.body.scrollTop;
    var scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var progress     = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    scrollProgressBar.style.width = progress + '%';
}

/* ============================================================
   Dark Mode — toggle handler
   Tracks odd/even clicks on the CSS switcher button:
     odd  click → revert to light mode
     even click → switch to dark (inverted) mode
   ============================================================ */
function invertCSS() {
    var clicks = $(this).data('clicks');
    if (clicks) {
        revert(); /* odd click  → light mode */
    } else {
        invert(); /* even click → dark mode  */
    }
    $(this).data('clicks', !clicks);
}

$(btnCssSwitcher).click(invertCSS);

/* ============================================================
   Dark Mode — invert()
   Injects a <style> tag that applies a CSS invert filter to
   the entire page. The profile image is double-inverted so it
   keeps its original colours in dark mode.
   ============================================================ */
function invert() {
    const css = `
        html {
            -webkit-filter: invert(100%);
            -moz-filter:    invert(100%);
            -o-filter:      invert(100%);
            -ms-filter:     invert(100%);
        }
        .img-profile,
        .img-profile-mobile {
            -webkit-filter: invert(100%);
            -moz-filter:    invert(100%);
            -o-filter:      invert(100%);
            -ms-filter:     invert(100%);
        }
    `;
    const style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }
    document.head.appendChild(style);
}

/* ============================================================
   Dark Mode — revert()
   Injects a <style> tag that removes the invert filter,
   restoring the default light mode colours.
   ============================================================ */
function revert() {
    const xss = `
        html {
            -webkit-filter: invert(0%);
            -moz-filter:    invert(0%);
            -o-filter:      invert(0%);
            -ms-filter:     invert(0%);
        }
        .img-profile,
        .img-profile-mobile {
            -webkit-filter: invert(0%);
            -moz-filter:    invert(0%);
            -o-filter:      invert(0%);
            -ms-filter:     invert(0%);
        }
    `;
    const style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet) {
        style.styleSheet.cssText = xss;
    } else {
        style.appendChild(document.createTextNode(xss));
    }
    document.head.appendChild(style);
}

/* ============================================================
   Scroll — show / hide "back to top" button
   Button appears after scrolling 500 px down and hides again
   when the user scrolls back near the top.
   ============================================================ */
function scrollFunction() {
    if (document.body.scrollTop > 500 || document.documentElement.scrollTop > 490) {
        pageUpBottom.style.display = 'block';
    } else {
        pageUpBottom.style.display = 'none';
    }
    updateScrollProgress();
}

/* ============================================================
   Back to Top — button click
   Smoothly animates the page back to the #page-top anchor
   over 750 ms when the arrow button is clicked.
   ============================================================ */
$('#page-top-btn').click(function () {
    $('html, body').animate({
        scrollTop: $('#page-top').offset().top
    }, 750);
    return false;
});

/* ============================================================
   Smooth Scroll — internal anchor links
   Intercepts clicks on every <a> that is NOT opening a new tab
   and animates the scroll to the target section over 750 ms.
   ============================================================ */
$('a').click(function () {
    if ($(this).attr('target') !== '_blank') {
        $('html, body').animate({
            scrollTop: $($(this).attr('href')).offset().top
        }, 750);
        return false;
    }
});

/* ============================================================
   Loader
   Guarantees the spinner is visible for at least 800 ms even
   on cached / instant loads. Once the minimum time has passed:
     1. The .hidden class is added → CSS fade-out begins (600 ms).
     2. After 650 ms display:none removes it from the layout.
     3. loaderDone is set to true so the DevTools guard lifts.
   ============================================================ */
window.addEventListener('load', function () {
    var loader = document.getElementById('loader');
    var wait   = Math.max(0, 800 - (Date.now() - loaderStart));

    setTimeout(function () {
        loader.classList.add('hidden');                             /* start CSS fade-out */
        setTimeout(function () {
            loader.style.display = 'none';                         /* remove from layout */
            loaderDone = true;                                     /* lift DevTools guard */
        }, 650);
    }, wait);
});

/* ============================================================
   Right-Click & Drag Prevention
   contextmenu: suppresses the browser's right-click context menu.
   dragstart:   prevents images and text from being dragged out.
   ============================================================ */
document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
document.addEventListener('dragstart',   function (e) { e.preventDefault(); });

/* ============================================================
   Content Protection — selection, copy, cut, print
   selectstart: blocks text selection on desktop.
   copy/cut:    clears clipboard and cancels the event so no
                text escapes even if selection somehow occurs.
   keydown:     blocks Ctrl/Cmd+U (view-source), Ctrl/Cmd+S
                (save page), Ctrl/Cmd+P (print).
   beforeprint: fires when the user triggers print via browser
                menu; replaces body content with a warning so
                the printed/PDF output is blank.
   ============================================================ */
document.addEventListener('selectstart', function (e) { e.preventDefault(); });

document.addEventListener('copy', function (e) {
    e.clipboardData.setData('text/plain', '');
    e.preventDefault();
});

document.addEventListener('cut', function (e) {
    e.clipboardData.setData('text/plain', '');
    e.preventDefault();
});

document.addEventListener('keydown', function (e) {
    var ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && (e.key === 'u' || e.key === 'U' ||
                 e.key === 's' || e.key === 'S' ||
                 e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
    }
});

window.addEventListener('beforeprint', function () {
    document.body.innerHTML = '<h2 style="text-align:center;margin-top:40px">Printing is disabled.</h2>';
});

/* ============================================================
   DevTools Detection — funny terminal overlay
   Strategy:
     A) setInterval (every 500 ms) — detects docked DevTools by
        comparing the DELTA of outerWidth/Height vs innerWidth/Height
        against a baseline captured on page load. Using a delta (not
        an absolute value) accounts for Firefox/Safari having larger
        browser toolbars than Chrome, preventing cross-browser false
        positives. A delta > 160 px signals a DevTools panel opened.
        Also auto-dismisses the overlay when DevTools closes.
     B) console probe — a regex whose .toString is overridden;
        Chrome DevTools calls it when rendering the logged object,
        betraying that the console panel is open. Chrome-only but
        complements Strategy A for the undocked-window case.

   Guards:
     • loaderDone — overlay never appears while the loader is up.
     • Mobile early-return — outerHeight vs innerHeight is always
       large on mobile (address bar, status bar) causing false
       positives; DevTools is not accessible on mobile anyway.

   The overlay is a fake terminal popup injected into <body>;
   it disappears automatically once DevTools is closed.
   ============================================================ */
(function () {

    /* ----------------------------------------------------------
       Mobile guard — exit immediately on touch devices.
       The window size heuristic is unreliable on mobile because
       the browser's own UI (address bar, etc.) creates a large
       outerHeight vs innerHeight gap that mimics a DevTools panel.
       ---------------------------------------------------------- */
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    var caught    = false;  /* true while the overlay is visible      */
    var threshold = 160;    /* extra px that signals a new docked panel */

    /* ----------------------------------------------------------
       Baseline capture — snapshot the browser chrome sizes at
       load time (menu bar, bookmarks bar, OS chrome, etc.).
       Only INCREASES beyond this baseline trigger detection, so
       Firefox and Safari with tall toolbars behave correctly.
       ---------------------------------------------------------- */
    var baseWidthDiff  = window.outerWidth  - window.innerWidth;
    var baseHeightDiff = window.outerHeight - window.innerHeight;

    /* ----------------------------------------------------------
       busted() — builds and injects the terminal overlay.
       Guards:
         caught     → prevents duplicate overlays.
         loaderDone → ensures the loader has fully exited first.
       ---------------------------------------------------------- */
    function busted() {
        if (caught || !loaderDone) return;
        caught = true;

        /* Generate a random-looking (fake) local IP for the joke */
        var ip = '192.168.' + Math.floor(Math.random() * 255) +
                 '.'        + Math.floor(Math.random() * 255);

        /* Build the overlay element */
        var el  = document.createElement('div');
        el.id   = 'devtools-overlay';
        el.innerHTML =
            '<div class="dt-terminal">' +

                /* ---- macOS-style window chrome ---- */
                '<div class="dt-bar">' +
                    '<div class="dt-dot dt-r"></div>' +
                    '<div class="dt-dot dt-y"></div>' +
                    '<div class="dt-dot dt-g"></div>' +
                    '<span class="dt-lbl">bash — 80×24</span>' +
                '</div>' +

                /* ---- ASCII art title ---- */
                '<pre class="dt-ascii">' +
                    ' ██████╗██╗   ██╗███████╗███████╗██████╗ \n' +
                    '██╔══██╗██║   ██║██╔═════╝██╔═════╝██╔══██╗\n' +
                    '██████╔╝██║   ██║█████╗  █████╗  ██║  ██║\n' +
                    '██╔══██╗██║   ██║██╔══╝ ██╔══╝  ██║  ██║\n' +
                    '██████╔╝╚██████╔╝███████╗███████╗██████╔╝\n' +
                    '╚═════╝  ╚═════╝ ╚══════╝╚══════╝╚═════╝' +
                '</pre>' +

                /* ---- Fake terminal output ---- */
                '<div class="dt-line"><span class="dt-pr">$ </span>sudo curiosity-detector --scan</div>' +
                '<div class="dt-line dt-ok">&#10004; Nosy developer detected</div>' +
                '<div class="dt-line"><span class="dt-pr">$ </span>trace --ip --location --employer</div>' +
                '<div class="dt-line">Scanning... <span class="dt-warn">IP: ' + ip + '</span></div>' +
                '<div class="dt-line dt-warn">&#9888; Uploading your browser history to the cloud &#9729;&#65039;</div>' +
                '<div class="dt-line dt-warn">&#9888; Adding you to the &quot;suspicious people&quot; list...</div>' +
                '<div class="dt-line dt-warn">&#9888; Alerting João... &#128242;</div>' +
                '<div class="dt-line">&nbsp;</div>' +
                '<div class="dt-line dt-ok">Just kidding. &#128516;</div>' +
                '<div class="dt-line">Nothing to see here. Close DevTools to dismiss.</div>' +
                '<div class="dt-line">&nbsp;</div>' +
                '<div class="dt-line"><span class="dt-pr">$ </span><span class="dt-cursor"></span></div>' +

            '</div>';

        document.body.appendChild(el);
    }

    /* ----------------------------------------------------------
       Strategy A — window size polling (docked DevTools)
       Compares current diff against the captured baseline so that
       pre-existing browser chrome is never counted as DevTools.
       Runs every 500 ms, skips while the loader is still visible,
       and removes the overlay automatically when DevTools closes.
       ---------------------------------------------------------- */
    setInterval(function () {
        if (!loaderDone) return;

        var open = (window.outerWidth  - window.innerWidth  - baseWidthDiff)  > threshold ||
                   (window.outerHeight - window.innerHeight - baseHeightDiff) > threshold;

        if (open && !caught) {
            busted();                                               /* DevTools just opened */
        } else if (!open && caught) {
            var el = document.getElementById('devtools-overlay');
            if (el) el.remove();                                   /* DevTools just closed */
            caught = false;
        }
    }, 500);

    /* ----------------------------------------------------------
       Strategy B — console probe (Chrome only)
       Chrome calls .toString() on the logged object when the
       console panel renders it, exposing that DevTools is open.
       Complements Strategy A for the undocked-window case where
       window dimensions do not change.
       ---------------------------------------------------------- */
    var probe      = /./;
    probe.toString = function () { busted(); };
    console.log('%cHi there! 👋', 'color:cornflowerblue;font-size:16px;font-weight:bold;', probe);

})();

/* ============================================================
   Random Quote
   Picks a random motivational quote from a preset list and
   injects it into the #innerHtmlBlockquote element on load.
   ============================================================ */
function getQuote() {

    /* Shuffle seed — not cryptographic, just for display order */
    let randNums = [0, 2, 3, 1, 4];

    /* Quote and source arrays */
    quotes  = new Array(5);
    sources = new Array(5);

    quotes[0]  = "You don't need to be better than anyone else; you just need to be better than you used to be.";
    sources[0] = 'Wayne Dyer';

    quotes[1]  = "Don't go through life, grow through life.";
    sources[1] = 'Eric Butterworth';

    quotes[2]  = 'If there is no struggle, there is no progress.';
    sources[2] = 'Frederick Douglass';

    quotes[3]  = 'Change is inevitable. Growth is optional.';
    sources[3] = 'John C. Maxwell';

    quotes[4]  = 'When we stop growing, we stop living and start existing.';
    sources[4] = 'Warren Wiersbe';

    /* Pick a random index then render the quote */
    var i = Math.floor(Math.random() * quotes.length);
    setInterval(function () {
        randNums = randNums.splice(i, 1);
    }, 25);

    document.getElementById('innerHtmlBlockquote').innerHTML =
        '<h4>'                                   + quotes[randNums[i]]  + '</h4>' +
        "<footer class='blockquote-footer'>"     + sources[randNums[i]] + '</footer>';
}
