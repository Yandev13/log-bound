import base64, html, os, re, subprocess, sys, tempfile

# Set MMDC to the mmdc command and MMDC_PUPPETEER to a puppeteer config file to render Mermaid blocks.
MMDC = os.environ.get('MMDC')
MMDC_PUPPETEER = os.environ.get('MMDC_PUPPETEER')

def mermaid_img(src):
    if not MMDC:
        return '<p>[Mermaid diagram: render it and insert it here]</p>'
    tmp = tempfile.mkdtemp()
    mmd, png = os.path.join(tmp, 'd.mmd'), os.path.join(tmp, 'd.png')
    open(mmd, 'w', encoding='utf-8').write(src)
    cmd = [MMDC, '-i', mmd, '-o', png, '-b', 'white', '-w', '1400', '-s', '2']
    if MMDC_PUPPETEER:
        cmd += ['-p', MMDC_PUPPETEER]
    subprocess.run(cmd, check=True, shell=True, capture_output=True)
    data = base64.b64encode(open(png, 'rb').read()).decode()
    return f'<p style="text-align:center"><img src="data:image/png;base64,{data}" width="620"></p>'

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'`(.+?)`', r'\1', t)
    return t

def convert(md, shift=0):
    out, lines, i = [], md.splitlines(), 0
    while i < len(lines):
        l = lines[i]
        if l.startswith('```'):
            lang, block = l[3:].strip(), []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                block.append(lines[i]); i += 1
            i += 1
            if lang == 'mermaid':
                out.append(mermaid_img('\n'.join(block)))
            else:
                out.append('<pre style="font-family:Consolas;font-size:9pt">' + html.escape('\n'.join(block)) + '</pre>')
            continue
        m = re.match(r'^(#+)\s+(.*)', l)
        if m:
            n = min(len(m.group(1)) + shift, 6)
            out.append(f'<h{n}>{inline(m.group(2))}</h{n}>'); i += 1; continue
        if l.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', c) for c in cells):
                    rows.append(cells)
                i += 1
            t = ['<table border="1" cellpadding="3" style="border-collapse:collapse;font-size:9pt">']
            for k, r in enumerate(rows):
                tag = 'th' if k == 0 else 'td'
                bg = ' style="background:#D9E2F3"' if k == 0 else ''
                t.append('<tr>' + ''.join(f'<{tag}{bg}>{inline(c)}</{tag}>' for c in r) + '</tr>')
            out.append(''.join(t) + '</table>'); continue
        if re.match(r'^\s*[-*] ', l):
            items = []
            while i < len(lines) and re.match(r'^\s*[-*] ', lines[i]):
                items.append('<li>' + inline(re.sub(r'^\s*[-*] ', '', lines[i])) + '</li>'); i += 1
            out.append('<ul>' + ''.join(items) + '</ul>'); continue
        if l.strip():
            out.append(f'<p>{inline(l)}</p>')
        i += 1
    return '\n'.join(out)

if __name__ == '__main__':
    # Usage: md2html.py out.html <title or -> <intro> src.md [src.md ...]
    # With title "-", the H1 of each source stays H1. Else the sources move down one heading level.
    dst, title, intro, *srcs = sys.argv[1:]
    body = [] if title == '-' else [f'<h1>{html.escape(title)}</h1>', f'<p><i>{html.escape(intro)}</i></p>']
    for s in srcs:
        body.append(convert(open(s, encoding='utf-8').read(), shift=0 if title == '-' else 1))
    open(dst, 'w', encoding='utf-8').write('<html><head><meta charset="utf-8"></head><body style="font-family:Arial">' + '\n'.join(body) + '</body></html>')
