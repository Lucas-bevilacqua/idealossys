"""Standalone helper — imported by tools.py"""
import re


def validate_and_fix_html(html: str, **_kwargs) -> str:
    """Apply deterministic Python-based fixes for common HTML issues. No Gemini call."""
    fixes = []

    # ── 1. Inject id="hamburger" ──────────────────────────────────────────────
    if 'id="hamburger"' not in html and "id='hamburger'" not in html:
        # Try common class patterns first
        for pat, rep in [
            (r'(<button)([^>]*class="[^"]*(?:hamburger|menu-btn|nav-toggle|burger)[^"]*")',
             r'<button id="hamburger"\2'),
        ]:
            if re.search(pat, html):
                html = re.sub(pat, rep, html, count=1)
                fixes.append("id=hamburger")
                break
        else:
            # Fallback: first button inside <nav>
            html = re.sub(
                r'(<nav[^>]*>.*?)(<button)',
                r'\1<button id="hamburger"',
                html, count=1, flags=re.DOTALL,
            )
            fixes.append("id=hamburger(nav-fallback)")

    # ── 2. Inject id="navLinks" ───────────────────────────────────────────────
    if 'id="navLinks"' not in html and "id='navLinks'" not in html:
        for pat, rep in [
            (r'(<ul)([^>]*class="[^"]*(?:nav-links|nav-items|navbar-nav|nav-menu|nav-list)[^"]*")',
             r'<ul id="navLinks"\2'),
            (r'(<nav[^>]*>\s*<ul)(\s)', r'<nav>\n<ul id="navLinks"\2'),
        ]:
            if re.search(pat, html):
                html = re.sub(pat, rep, html, count=1)
                fixes.append("id=navLinks")
                break

    # ── 3. Inject id="leadForm" ───────────────────────────────────────────────
    if 'id="leadForm"' not in html and "id='leadForm'" not in html:
        html = re.sub(r'(<form)(\s+(?!id)[^>]*>|>)', r'<form id="leadForm"\2', html, count=1)
        fixes.append("id=leadForm")

    # ── 4. Fix hero padding for fixed 72px navbar ─────────────────────────────
    if not re.search(r'calc\(72px', html):
        def _fix_hero(m):
            block = m.group(0)
            if 'padding-top' in block:
                block = re.sub(r'padding-top\s*:[^;]+;', 'padding-top: calc(72px + 4rem);', block)
            elif 'padding:' in block:
                block = re.sub(r'padding\s*:[^;]+;', 'padding: calc(72px + 4rem) 2rem 5rem;', block)
            else:
                block = block.rstrip('}') + '\n  padding-top: calc(72px + 4rem);\n}'
            return block
        html = re.sub(r'\.hero\s*\{[^}]+\}', _fix_hero, html, count=1)
        fixes.append("hero-padding")

    # ── 5. Inject @media 768px block ─────────────────────────────────────────
    if "@media (max-width: 768px)" not in html and "@media(max-width:768px)" not in html:
        mobile_css = (
            "\n    @media (max-width: 768px) {\n"
            "      #hamburger { display: block !important; cursor: pointer; background: none;"
            " border: none; color: inherit; font-size: 1.5rem; }\n"
            "      #navLinks { display: none; flex-direction: column; position: absolute;"
            " top: 100%; left: 0; right: 0; background: rgba(7,7,14,0.97);"
            " padding: 1.5rem; gap: 1rem; z-index: 999; }\n"
            "      #navLinks.open { display: flex; }\n"
            "      .hero { padding: calc(72px + 2rem) 1.5rem 4rem !important; }\n"
            "      h1 { font-size: clamp(2rem, 8vw, 3.2rem) !important; }\n"
            "      .grid-2, .grid-3 { grid-template-columns: 1fr !important; }\n"
            "      .about-photo, .case-visual { height: 280px !important; }\n"
            "      .hero-btns { flex-direction: column; }\n"
            "    }"
        )
        html = html.replace('</style>', mobile_css + '\n  </style>', 1)
        fixes.append("@media-768px")

    # ── 6. Protect <img> tags from showing broken-image icon ─────────────────
    # Add onerror handler that hides the element if the image fails to load.
    # Also remove clearly broken URLs (placeholder.com, picsum, empty src, blob:).
    def _fix_img(m: re.Match) -> str:
        tag = m.group(0)
        # Remove known placeholder/broken domains
        if re.search(r'src=["\'](?:https?://(?:via\.placeholder|placeholder|picsum|lorempixel|dummyimage|fakeimg)[^"\']*|blob:[^"\']*|data:)["\']', tag):
            # Replace src with empty and hide — background-color fallback handles display
            tag = re.sub(r'src=["\'][^"\']*["\']', 'src="" style="display:none"', tag)
            fixes.append("broken-img-hidden")
        # Add onerror to every remaining img that doesn't already have one
        if 'onerror' not in tag:
            tag = tag.rstrip('/>').rstrip() + ' onerror="this.style.visibility=\'hidden\';this.style.width=\'0\';this.style.height=\'0\'">'
            fixes.append("img-onerror")
        return tag
    html = re.sub(r'<img\b[^>]*>', _fix_img, html)

    # ── 7. Inject button base CSS ─────────────────────────────────────────────
    btn_css = (
        "\n    /* ── Button base fix (deterministic) ── */\n"
        "    .btn, .cta-btn, .hero-btn, .btn-primary, .btn-secondary,\n"
        "    button[type=submit], a.btn, a[class*='btn'], button[class*='btn'] {\n"
        "      display: inline-flex !important;\n"
        "      align-items: center !important;\n"
        "      justify-content: center !important;\n"
        "      gap: 0.5rem;\n"
        "      padding: 0.875rem 2rem !important;\n"
        "      border-radius: var(--radius-pill, 50px);\n"
        "      font-weight: 600;\n"
        "      white-space: nowrap;\n"
        "      cursor: pointer;\n"
        "      text-decoration: none;\n"
        "      transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;\n"
        "    }\n"
        "    .btn:hover, .cta-btn:hover, .btn-primary:hover, .btn-secondary:hover,\n"
        "    button[type=submit]:hover, a.btn:hover, a[class*='btn']:hover, button[class*='btn']:hover {\n"
        "      transform: translateY(-2px);\n"
        "    }\n"
    )
    if "Button base fix" not in html:
        html = html.replace('</style>', btn_css + '  </style>', 1)
        fixes.append("btn-base-css")

    if fixes:
        print(f"[VALIDATE] Python fixes applied: {', '.join(fixes)}")
    else:
        print("[VALIDATE] HTML passed all checks")
    return html
