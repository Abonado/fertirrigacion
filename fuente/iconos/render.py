import asyncio
from playwright.async_api import async_playwright
svg=open('iconos/icono-final.svg').read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for n,s in [('icon-512.png',512),('icon-192.png',192),('apple-touch-icon.png',180)]:
            pg=await b.new_page(viewport={'width':s,'height':s})
            await pg.set_content(f'<body style="margin:0">{svg.replace("<svg ",f"<svg width=\"{s}\" height=\"{s}\" style=\"display:block\" ",1)}</body>')
            await pg.screenshot(path='netlify/abonado/'+n,omit_background=False); await pg.close()
        await b.close()
asyncio.run(main())
