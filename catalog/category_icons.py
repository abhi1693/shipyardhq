from django.utils.html import format_html
from django.utils.safestring import mark_safe

CATEGORY_ICON_CHOICES = (
    ("bolt", "Bolt"),
    ("code", "Code"),
    ("cloud", "Cloud"),
    ("robot", "Robot"),
    ("chart", "Chart"),
    ("tool", "Tool"),
    ("cursor", "Cursor"),
    ("message", "Message"),
    ("database", "Database"),
    ("shield", "Shield"),
    ("brain", "AI / Brain"),
    ("flask", "Beta / Flask"),
    ("users", "Users / Community"),
    ("devices", "Devices"),
    ("palette", "Palette / Design"),
    ("wrench", "Wrench / DIY"),
    ("school", "School / Education"),
    ("coins", "Coins / Finance"),
    ("gamepad", "Gamepad / Gaming"),
    ("leaf", "Leaf / Green"),
    ("heartbeat", "Heartbeat / Health"),
    ("home", "Home / Living"),
    ("briefcase", "Briefcase / HR"),
    ("wifi", "Wi-Fi / IoT"),
    ("scale", "Scale / Legal"),
    ("megaphone", "Megaphone / Marketing"),
    ("car", "Car / Mobility"),
    ("music", "Music / Audio"),
    ("handheart", "Hand Heart / Impact"),
    ("checklist", "Checklist / Productivity"),
    ("chefhat", "Food & Beverage"),
    ("building", "Building / Real Estate"),
    ("rocket", "Rocket / Startup"),
    ("share", "Share / Social"),
    ("plane", "Plane / Travel"),
    ("video", "Video / Creation"),
    ("hexagon", "Hexagon / Web3"),
    ("target", "Target / Sales"),
    ("map", "Map / Tourism"),
)

CATEGORY_ICON_LABELS = dict(CATEGORY_ICON_CHOICES)


def svg(*parts):
    return "".join(parts)


CATEGORY_ICON_SVG = {
    "bolt": svg(
        '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"></path>',
    ),
    "code": svg(
        '<path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path>',
    ),
    "cloud": svg(
        '<path d="M17.5 19H7a5 5 0 1 1 1.3-9.83A7 7 0 0 1 21 13a4 4 0 0 1-3.5 6Z"></path>',
    ),
    "robot": svg(
        '<rect width="14" height="12" x="5" y="8" rx="2"></rect><path d="M12 8V4"></path><circle ',
        'cx="9" cy="14" r="1"></circle><circle cx="15" cy="14" r="1"></circle><path d="M9 18h6"><',
        "/path>",
    ),
    "chart": svg(
        '<path d="M3 3v18h18"></path><path d="M7 15l4-4 3 3 5-7"></path>',
    ),
    "tool": svg(
        '<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18v3h3l6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-2.8-2.8 2.4-2.4',
        'Z"></path>',
    ),
    "cursor": svg(
        '<path d="m3 3 7.1 17 2.5-7.4L20 10.1 3 3Z"></path>',
    ),
    "message": svg(
        '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"></path>',
    ),
    "database": svg(
        '<ellipse cx="12" cy="5" rx="8" ry="3"></ellipse><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-',
        '3V5"></path><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"></path>',
    ),
    "shield": svg(
        '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path>',
    ),
    "brain": svg(
        '<path d="M9.5 4A3.5 3.5 0 0 0 6 7.5v.4A4.5 4.5 0 0 0 7.5 16H9"></path><path d="M14.5 4A3',
        '.5 3.5 0 0 1 18 7.5v.4A4.5 4.5 0 0 1 16.5 16H15"></path><path d="M9 4v16"></path><path d',
        '="M15 4v16"></path><path d="M9 12h6"></path>',
    ),
    "flask": svg(
        '<path d="M9 3h6"></path><path d="M10 3v6l-5 8a3 3 0 0 0 2.6 4h8.8a3 3 0 0 0 2.6-4l-5-8V3',
        '"></path><path d="M8 14h8"></path>',
    ),
    "users": svg(
        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"><',
        '/circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75">',
        "</path>",
    ),
    "devices": svg(
        '<rect width="13" height="9" x="3" y="4" rx="2"></rect><rect width="7" height="12" x="14"',
        ' y="8" rx="2"></rect><path d="M8 20h8"></path><path d="M10 13v7"></path>',
    ),
    "palette": svg(
        '<path d="M12 22a10 10 0 1 1 10-10 3 3 0 0 1-3 3h-2a2 2 0 0 0-2 2 5 5 0 0 1-5 5Z"></path>',
        '<circle cx="7.5" cy="10.5" r=".5"></circle><circle cx="12" cy="7.5" r=".5"></circle><cir',
        'cle cx="16.5" cy="10.5" r=".5"></circle>',
    ),
    "wrench": svg(
        '<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18v3h3l6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-2.8-2.8 2.4-2.4',
        'Z"></path>',
    ),
    "school": svg(
        '<path d="m22 10-10-5-10 5 10 5 10-5Z"></path><path d="M6 12v5c3 2 9 2 12 0v-5"></path><p',
        'ath d="M22 10v6"></path>',
    ),
    "coins": svg(
        '<circle cx="8" cy="8" r="5"></circle><path d="M13 8c0 2.8-2.2 5-5 5"></path><path d="M16',
        ' 11a5 5 0 1 1-5 8"></path>',
    ),
    "gamepad": svg(
        '<path d="M6 12h4"></path><path d="M8 10v4"></path><path d="M15 13h.01"></path><path d="M',
        '18 11h.01"></path><path d="M4 9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4l1 7a3 3 0 0 1-5 2l-2-2h-4l',
        '-2 2a3 3 0 0 1-5-2l1-7Z"></path>',
    ),
    "leaf": svg(
        '<path d="M5 21c8-1 14-7 16-18-11 0-18 5-18 13 0 2 1 4 2 5Z"></path><path d="M3 21c4-5 8-',
        '8 14-10"></path>',
    ),
    "heartbeat": svg(
        '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7',
        '.6 1-1a5.5 5.5 0 0 0 0-7.8Z"></path><path d="M3.5 12H8l2-3 3 6 2-3h5.5"></path>',
    ),
    "home": svg(
        '<path d="m3 11 9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></',
        "path>",
    ),
    "briefcase": svg(
        '<rect width="20" height="14" x="2" y="7" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2',
        ' 2 0 0 1 2 2v2"></path><path d="M2 13h20"></path>',
    ),
    "wifi": svg(
        '<path d="M5 13a10 10 0 0 1 14 0"></path><path d="M8.5 16.5a5 5 0 0 1 7 0"></path><path d',
        '="M12 20h.01"></path><path d="M2 8a15 15 0 0 1 20 0"></path>',
    ),
    "scale": svg(
        '<path d="M12 3v18"></path><path d="M5 21h14"></path><path d="M3 7h18"></path><path d="m6',
        ' 7-3 7h6L6 7Z"></path><path d="m18 7-3 7h6l-3-7Z"></path>',
    ),
    "megaphone": svg(
        '<path d="M3 11v2a2 2 0 0 0 2 2h2l4 5v-5l9 3V6l-9 3H5a2 2 0 0 0-2 2Z"></path><path d="M7 ',
        '15V9"></path>',
    ),
    "car": svg(
        '<path d="M5 17h14"></path><path d="M5 17v-5l2-5h10l2 5v5"></path><circle cx="7.5" cy="17',
        '.5" r="1.5"></circle><circle cx="16.5" cy="17.5" r="1.5"></circle>',
    ),
    "music": svg(
        '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" c',
        'y="16" r="3"></circle>',
    ),
    "handheart": svg(
        '<path d="M11 12 9.5 10.5a2.1 2.1 0 0 1 3-3L13 8l.5-.5a2.1 2.1 0 0 1 3 3L13 14l-2-2Z"></p',
        'ath><path d="M3 15h4l4 4h6l4-4"></path><path d="M7 15l3-3"></path>',
    ),
    "checklist": svg(
        '<path d="M9 6h11"></path><path d="M9 12h11"></path><path d="M9 18h11"></path><path d="m3',
        ' 6 1 1 2-2"></path><path d="m3 12 1 1 2-2"></path><path d="m3 18 1 1 2-2"></path>',
    ),
    "chefhat": svg(
        '<path d="M6 14a4 4 0 0 1 1-7 5 5 0 0 1 10 0 4 4 0 0 1 1 7"></path><path d="M6 14h12v7H6z',
        '"></path><path d="M9 17h6"></path>',
    ),
    "building": svg(
        '<rect width="14" height="20" x="5" y="2" rx="2"></rect><path d="M9 22v-4h6v4"></path><pa',
        'th d="M9 6h.01"></path><path d="M15 6h.01"></path><path d="M9 10h.01"></path><path d="M1',
        '5 10h.01"></path><path d="M9 14h.01"></path><path d="M15 14h.01"></path>',
    ),
    "rocket": svg(
        '<path d="M4.5 16.5c-1.5 1.2-2 3-2 5 2 0 3.8-.5 5-2"></path><path d="M9 15 4 10l6-6c4-4 9',
        '-2 10-1 1 1 3 6-1 10l-6 6-5-5"></path><path d="M14 7h.01"></path>',
    ),
    "share": svg(
        '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="',
        '18" cy="19" r="3"></circle><path d="m8.6 13.5 6.8 4"></path><path d="m15.4 6.5-6.8 4"></',
        "path>",
    ),
    "plane": svg(
        '<path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4 20-7Z"></path>',
    ),
    "video": svg(
        '<rect width="15" height="12" x="3" y="6" rx="2"></rect><path d="m18 10 4-2v8l-4-2"></pat',
        "h>",
    ),
    "hexagon": svg(
        '<path d="M21 16V8l-9-5-9 5v8l9 5 9-5Z"></path>',
    ),
    "target": svg(
        '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx',
        '="12" cy="12" r="1"></circle>',
    ),
    "map": svg(
        '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"></path><path d="M9 3v15"></path><path d="M',
        '15 6v15"></path>',
    ),
}


def render_category_icon(icon, class_name="category-icon"):
    svg_markup = CATEGORY_ICON_SVG.get(icon)
    if not svg_markup:
        return ""
    return format_html(
        (
            '<svg class="{}" viewBox="0 0 24 24" aria-hidden="true" fill="none" '
            'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
            'stroke-linejoin="round">{}</svg>'
        ),
        class_name,
        mark_safe(svg_markup),
    )
