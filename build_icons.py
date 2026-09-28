# build_icons.py — WP2. Renders MICEGO's favicon/app icons from the brand-mark SVG shapes using PIL
# primitives only (no cairosvg, no headless-browser rendering). The source mark is a simple
# rounded-rect + 3 bars + circle (see SVG() in build.py); we redraw those exact shapes at each size.
# Writes, into the current working directory: favicon.ico (16+32), favicon.svg, apple-touch-icon.png
# (180, full-bleed navy, no corner radius), icon-192.png, icon-512.png, site.webmanifest.
import json

_NAVY = '#0F1E3D'
_BARS = [
    (6.5, 9.0, 14.0, 2.6, 1.3, '#FFFFFF'),
    (6.5, 14.7, 11.0, 2.6, 1.3, '#16B5A8'),
    (6.5, 20.4, 8.0, 2.6, 1.3, '#FFC24B'),
]
_CIRCLE = (24.5, 16.0, 2.6, '#FFFFFF')

def _draw(size, rounded=True):
    from PIL import Image, ImageDraw
    scale = size / 32.0
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=max(1, (9 / 32.0) * size), fill=_NAVY)
    else:
        d.rectangle([0, 0, size - 1, size - 1], fill=_NAVY)
    for x, y, w, h, r, fill in _BARS:
        x0, y0, x1, y1 = x * scale, y * scale, (x + w) * scale, (y + h) * scale
        if (x1 - x0) < 2 or (y1 - y0) < 2:
            d.rectangle([x0, y0, x1, y1], fill=fill)
        else:
            d.rounded_rectangle([x0, y0, x1, y1], radius=max(0.5, r * scale), fill=fill)
    cx, cy, cr, cfill = _CIRCLE
    cx, cy, cr = cx * scale, cy * scale, cr * scale
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=cfill)
    return img

def generate_icons():
    icon32 = _draw(32, rounded=True)
    icon192 = _draw(192, rounded=True)
    icon512 = _draw(512, rounded=True)
    touch = _draw(180, rounded=False)

    icon192.save('icon-192.png')
    icon512.save('icon-512.png')
    touch.convert('RGB').save('apple-touch-icon.png')
    icon32.save('favicon.ico', sizes=[(16, 16), (32, 32)])

    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-hidden="true">'
           '<rect width="32" height="32" rx="9" fill="%s"/>' % _NAVY
           + ''.join('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s"/>' % b for b in _BARS)
           + '<circle cx="%s" cy="%s" r="%s" fill="%s"/></svg>' % _CIRCLE)
    open('favicon.svg', 'w', encoding='utf-8').write(svg)

    manifest = {
        'name': 'MICEGO', 'short_name': 'MICEGO',
        'icons': [
            {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
            {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        ],
        'theme_color': '#0F1E3D', 'background_color': '#FFFFFF', 'display': 'browser', 'start_url': '/',
    }
    open('site.webmanifest', 'w', encoding='utf-8').write(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    return ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']

if __name__ == '__main__':
    print('generated:', generate_icons())
