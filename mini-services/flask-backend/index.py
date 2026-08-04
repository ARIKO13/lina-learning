"""Flask backend for ARUSHIKO STT — Gemini proxy, Web Scraping + AI, PDF generation (3 methods)."""

import os
import json
import re
import hashlib
import requests
from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from bs4 import BeautifulSoup
from datetime import datetime
from io import BytesIO

app = Flask(__name__)
CORS(app, origins=["*"])

PORT = 3030


# ─── Gemini API Proxy ───────────────────────────────────────────────

def call_gemini(api_key: str, contents: list, system_instruction: str = None) -> dict:
    """Call Gemini API and return the response text."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    body: dict = {"contents": contents}
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    resp = requests.post(url, json=body, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        return "[AI tidak memberikan respons]"


@app.route("/api/gemini/chat", methods=["POST"])
def gemini_chat():
    """Proxy Gemini API — pure chat without scraping."""
    try:
        data = request.json
        api_key = data.get("apiKey") or os.environ.get("GEMINI_API_KEY", "")
        messages = data.get("messages", [])
        system_prompt = data.get("systemPrompt")

        if not api_key:
            return jsonify({"error": "Gemini API key diperlukan"}), 400
        if not messages:
            return jsonify({"error": "Pesan tidak boleh kosong"}), 400

        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        text = call_gemini(api_key, contents, system_prompt)
        return jsonify({"text": text, "provider": "gemini-via-flask"})
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        return jsonify({"error": f"Gemini API error: {e.response.text[:200] if e.response else str(e)}"}), status
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Web Scraping ────────────────────────────────────────────────────

def scrape_url(url: str) -> dict:
    """Scrape a URL and return title + cleaned text content."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    resp = requests.get(url, headers=headers, timeout=15, verify=False)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove scripts, styles, nav, footer, ads
    for tag in soup.find_all(["script", "style", "nav", "footer", "header", "aside", "iframe", "noscript"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else url

    # Try to find main content
    main = soup.find("main") or soup.find("article") or soup.find(class_=re.compile(r"content|article|post|entry", re.I))
    if main:
        text = main.get_text(separator=" ", strip=True)
    else:
        text = soup.body.get_text(separator=" ", strip=True) if soup.body else ""

    # Clean up
    text = re.sub(r"\s+", " ", text).strip()
    # Truncate to avoid token overflow
    max_chars = 8000
    if len(text) > max_chars:
        text = text[:max_chars] + "\n\n[...konten dipotong karena terlalu panjang...]"

    return {"url": url, "title": title, "text": text, "charCount": len(text)}


def extract_urls_from_query(query: str) -> list[str]:
    """Extract URLs from user query if they pasted one."""
    url_pattern = r"https?://[\w\-._~:/?#\[\]@!$&'()*+,;=%]+"
    return list(set(re.findall(url_pattern, query)))


def search_and_scrape(query: str, max_results: int = 3) -> list[dict]:
    """Use a simple search approach: extract URLs from query or use DuckDuckGo lite."""
    results = []

    # If user pasted URLs directly, scrape those
    urls = extract_urls_from_query(query)
    if urls:
        for url in urls[:max_results]:
            try:
                result = scrape_url(url)
                results.append(result)
            except Exception as e:
                results.append({"url": url, "title": url, "text": f"[Gagal scrape: {str(e)}]", "charCount": 0})
        return results

    # Otherwise use DuckDuckGo HTML search
    try:
        search_url = "https://html.duckduckgo.com/html/"
        params = {"q": query}
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        resp = requests.post(search_url, data=params, headers=headers, timeout=10)
        soup = BeautifulSoup(resp.text, "html.parser")

        links = []
        for a in soup.find_all("a", class_="result__a", href=True):
            href = a["href"]
            # DuckDuckGo wraps URLs
            if "uddg=" in href:
                from urllib.parse import parse_qs, unquote
                parsed = parse_qs(href)
                if "uddg" in parsed:
                    links.append(unquote(parsed["uddg"][0]))
            else:
                links.append(href)

        for link in links[:max_results]:
            try:
                result = scrape_url(link)
                results.append(result)
            except Exception:
                continue
    except Exception as e:
        results.append({"url": "", "title": "Search Error", "text": f"Gagal mencari: {str(e)}", "charCount": 0})

    return results


@app.route("/api/scrape-and-ask", methods=["POST"])
def scrape_and_ask():
    """Web scrape + AI combined endpoint. Scrape URLs or search, then ask AI with context."""
    try:
        data = request.json
        api_key = data.get("apiKey") or os.environ.get("GEMINI_API_KEY", "")
        query = data.get("query", "")
        system_prompt = data.get("systemPrompt", "Kamu adalah asisten AI yang menjawab berdasarkan konten web yang di-scrape. Jelaskan dengan bahasa yang jelas dan terstruktur.")

        if not api_key:
            return jsonify({"error": "Gemini API key diperlukan"}), 400
        if not query.strip():
            return jsonify({"error": "Query tidak boleh kosong"}), 400

        # Step 1: Scrape
        scraped = search_and_scrape(query)

        # Step 2: Build context
        context_parts = []
        for i, s in enumerate(scraped):
            if s.get("text") and s["text"].startswith("[Gagal"):
                continue
            context_parts.append(f"--- Sumber {i+1}: {s['title']} ({s['url']}) ---\n{s['text']}")

        if not context_parts:
            # No scrape results, just ask AI directly
            contents = [{"role": "user", "parts": [{"text": query}]}]
            text = call_gemini(api_key, contents, system_prompt)
            return jsonify({
                "text": text,
                "sources": [],
                "scrapeCount": 0,
                "provider": "gemini-direct-no-scrape",
            })

        context = "\n\n".join(context_parts)
        combined_prompt = f"Konten web yang di-scrape:\n\n{context}\n\n---\n\nPertanyaan user: {query}\n\nBerdasarkan konten web di atas, jawab pertanyaan tersebut. Jika konten tidak cukup, kamu bisa menambahkan pengetahuan umum. Berikan jawaban yang terstruktur dan informatif."

        # Step 3: Ask AI with scraped context
        contents = [{"role": "user", "parts": [{"text": combined_prompt}]}]
        text = call_gemini(api_key, contents, system_prompt)

        return jsonify({
            "text": text,
            "sources": [{"title": s["title"], "url": s["url"]} for s in scraped if not s["text"].startswith("[Gagal")],
            "scrapeCount": len(scraped),
            "provider": "gemini+scrape",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── PDF Generation ─────────────────────────────────────────────────

# Shared HTML template helper
def build_pdf_html(transcript: str, title: str = None, style: str = "full") -> str:
    """Build HTML for PDF generation. style='full' for Puppeteer, 'simple' for WeasyPrint."""
    if not title:
        # Generate title from first line or first 60 chars
        first_line = transcript.strip().split("\n")[0][:60]
        title = first_line or "Modul Pembelajaran"

    # Split transcript into paragraphs
    paragraphs = [p.strip() for p in transcript.strip().split("\n") if p.strip()]

    # Group into sections (every ~5 paragraphs)
    sections = []
    for i in range(0, len(paragraphs), 5):
        sections.append({
            "title": f"Bagian {len(sections)+1}",
            "content": paragraphs[i:i+5],
        })
    if not sections:
        sections = [{"title": "Bagian 1", "content": ["(Konten kosong)"]}]

    now = datetime.now().strftime("%d %B %Y")
    total_paras = len(paragraphs)
    total_chars = len(transcript)

    if style == "simple":
        # WeasyPrint-compatible (no flex, no custom fonts, simple CSS)
        sections_html = ""
        for i, sec in enumerate(sections):
            paras_html = "".join(f"<p style='margin: 6px 0; line-height: 1.6; text-align: justify;'>{p}</p>" for p in sec["content"])
            sections_html += f"""
            <div style='page-break-before: always; margin-top: 20px;' {'id="section-1"' if i == 0 else ''}>
              <h2 style='color: #059669; border-bottom: 2px solid #d1fae5; padding-bottom: 6px; margin-bottom: 12px; font-size: 16px;'>{sec['title']}</h2>
              {paras_html}
            </div>"""

        return f"""<!DOCTYPE html>
<html lang='id'>
<head>
  <meta charset='UTF-8'>
  <title>{title}</title>
  <style>
    @page {{ size: A4; margin: 2cm 2.5cm; }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: sans-serif; font-size: 11pt; color: #1f2937; line-height: 1.6; }}
    .cover {{ text-align: center; padding-top: 120px; page-break-after: always; }}
    .cover h1 {{ font-size: 28pt; color: #059669; margin-bottom: 12px; }}
    .cover .subtitle {{ font-size: 14pt; color: #6b7280; margin-bottom: 30px; }}
    .cover .meta {{ font-size: 10pt; color: #9ca3af; margin-top: 40px; }}
    .toc {{ page-break-after: always; }}
    .toc h2 {{ color: #059669; margin-bottom: 16px; font-size: 16pt; }}
    .toc-item {{ display: block; padding: 6px 0; border-bottom: 1px dotted #d1d5db; color: #374151; text-decoration: none; font-size: 11pt; }}
    .footer-text {{ text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 20px; }}
  </style>
</head>
<body>
  <div class='cover'>
    <h1>{title}</h1>
    <p class='subtitle'>Modul Pembelajaran dari Transkrip</p>
    <p class='meta'>Tanggal: {now}<br>Total: {total_paras} paragraf, {total_chars} karakter<br>Dibuat dengan ARUSHIKO STT</p>
  </div>
  <div class='toc'>
    <h2>Daftar Isi</h2>
    {''.join(f"<a class='toc-item'>{s['title']}</a>" for s in sections)}
  </div>
  {sections_html}
  <p class='footer-text'>Dibuat otomatis oleh ARUSHIKO STT &mdash; {now}</p>
</body>
</html>"""

    else:
        # Full CSS for Playwright/Puppeteer
        sections_html = ""
        for sec in sections:
            paras_html = "".join(f"<p>{p}</p>" for p in sec["content"])
            sections_html += f"""
            <section class='content-section'>
              <h2 class='section-title'>{sec['title']}</h2>
              <div class='section-body'>{paras_html}</div>
            </section>"""

        toc_items = "".join(f"<li class='toc-item'>{s['title']}</li>" for s in sections)

        return f"""<!DOCTYPE html>
<html lang='id'>
<head>
  <meta charset='UTF-8'>
  <title>{title}</title>
  <link rel='preconnect' href='https://fonts.googleapis.com'>
  <link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400&display=swap' rel='stylesheet'>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400&display=swap');

    @page {{ size: A4; margin: 0; }}

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}

    body {{
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 11pt;
      color: #1f2937;
      line-height: 1.7;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    /* ── Cover Page ── */
    .cover-page {{
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 30%, #ffffff 70%, #f5f3ff 100%);
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }}
    .cover-page::before {{
      content: '';
      position: absolute;
      top: -50%; right: -30%;
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%);
      border-radius: 50%;
    }}
    .cover-badge {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #059669;
      color: white;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 10pt;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 24px;
    }}
    .cover-title {{
      font-size: 32pt;
      font-weight: 800;
      color: #064e3b;
      line-height: 1.2;
      max-width: 500px;
      margin-bottom: 12px;
    }}
    .cover-subtitle {{
      font-size: 13pt;
      color: #6b7280;
      margin-bottom: 40px;
    }}
    .cover-meta {{
      font-size: 9pt;
      color: #9ca3af;
      line-height: 1.8;
    }}
    .cover-meta strong {{ color: #6b7280; }}

    /* ── TOC ── */
    .toc-page {{
      padding: 60px 70px;
      page-break-after: always;
    }}
    .toc-page h2 {{
      font-size: 18pt;
      font-weight: 700;
      color: #059669;
      margin-bottom: 24px;
      padding-bottom: 8px;
      border-bottom: 3px solid #059669;
    }}
    .toc-list {{ list-style: none; padding: 0; }}
    .toc-item {{
      padding: 10px 0;
      border-bottom: 1px dotted #d1d5db;
      font-size: 11pt;
      color: #374151;
      display: flex;
      justify-content: space-between;
    }}
    .toc-item::before {{ content: ''; display: none; }}

    /* ── Content ── */
    .content-page {{
      padding: 50px 70px;
    }}
    .content-section {{
      margin-bottom: 30px;
      page-break-inside: avoid;
    }}
    .section-title {{
      font-size: 14pt;
      font-weight: 700;
      color: #059669;
      margin-bottom: 14px;
      padding-left: 12px;
      border-left: 4px solid #059669;
    }}
    .section-body p {{
      margin-bottom: 10px;
      text-align: justify;
      color: #374151;
    }}

    /* ── Footer ── */
    .page-footer {{
      position: fixed;
      bottom: 0; left: 0; right: 0;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
      padding: 10px 0;
      border-top: 1px solid #f3f4f6;
    }}
    .page-footer .page-num::after {{
      content: counter(page);
    }}

    /* ── Code blocks ── */
    code, pre {{
      font-family: 'JetBrains Mono', monospace;
      background: #f3f4f6;
      border-radius: 6px;
      font-size: 9pt;
    }}
    pre {{ padding: 12px; overflow-x: auto; margin: 10px 0; }}
  </style>
</head>
<body>
  <!-- Cover -->
  <div class='cover-page'>
    <div class='cover-badge'>&#9889; ARUSHIKO STT</div>
    <h1 class='cover-title'>{title}</h1>
    <p class='cover-subtitle'>Modul Pembelajaran dari Transkrip</p>
    <div class='cover-meta'>
      <strong>Tanggal:</strong> {now}<br>
      <strong>Total:</strong> {total_paras} paragraf &middot; {total_chars} karakter<br>
      <strong>Bagian:</strong> {len(sections)} section<br><br>
      Dibuat otomatis oleh ARUSHIKO STT
    </div>
  </div>

  <!-- TOC -->
  <div class='toc-page'>
    <h2>Daftar Isi</h2>
    <ul class='toc-list'>{toc_items}</ul>
  </div>

  <!-- Content -->
  <div class='content-page'>
    {sections_html}
  </div>

  <!-- Footer -->
  <div class='page-footer'>
    ARUSHIKO STT &mdash; {now} &mdash; Halaman <span class='page-num'></span>
  </div>
</body>
</html>"""


def build_jspdf_data(transcript: str, title: str = None) -> dict:
    """Build structured JSON data for jsPDF browser-side generation."""
    if not title:
        first_line = transcript.strip().split("\n")[0][:60]
        title = first_line or "Modul Pembelajaran"

    paragraphs = [p.strip() for p in transcript.strip().split("\n") if p.strip()]
    sections = []
    for i in range(0, len(paragraphs), 5):
        sections.append({
            "title": f"Bagian {len(sections)+1}",
            "paragraphs": paragraphs[i:i+5],
        })
    if not sections:
        sections = [{"title": "Bagian 1", "paragraphs": ["(Konten kosong)"]}]

    return {
        "title": title,
        "subtitle": "Modul Pembelajaran dari Transkrip",
        "date": datetime.now().strftime("%d %B %Y"),
        "totalParagraphs": len(paragraphs),
        "totalChars": len(transcript),
        "sections": sections,
        "branding": "ARUSHIKO STT",
    }


# Method 1: Playwright (Puppeteer equivalent) — Best quality
@app.route("/api/pdf/playwright", methods=["POST"])
def pdf_playwright():
    """Generate PDF using Playwright (Puppeteer equivalent) — best quality."""
    try:
        data = request.json
        transcript = data.get("transcript", "")
        title = data.get("title")

        if not transcript.strip():
            return jsonify({"error": "Transkrip kosong"}), 400

        html_content = build_pdf_html(transcript, title, style="full")

        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_content(html_content, wait_until="networkidle")
            pdf_bytes = page.pdf(
                format="A4",
                print_background=True,
                margin={{"top": "0", "bottom": "0", "left": "0", "right": "0"}},
                display_header_footer=False,
            )
            browser.close()

        buf = BytesIO(pdf_bytes)
        filename = (title or "modul").replace(" ", "_").lower()[:50]
        return send_file(
            buf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{filename}.pdf",
        )
    except Exception as e:
        return jsonify({"error": f"Playwright PDF error: {str(e)}"}), 500


# Method 2: WeasyPrint — Lightweight, no Chromium
@app.route("/api/pdf/weasyprint", methods=["POST"])
def pdf_weasyprint():
    """Generate PDF using WeasyPrint — lightweight, no Chromium needed."""
    try:
        data = request.json
        transcript = data.get("transcript", "")
        title = data.get("title")

        if not transcript.strip():
            return jsonify({"error": "Transkrip kosong"}), 400

        html_content = build_pdf_html(transcript, title, style="simple")

        from weasyprint import HTML

        pdf_bytes = HTML(string=html_content).write_pdf()
        buf = BytesIO(pdf_bytes)
        filename = (title or "modul").replace(" ", "_").lower()[:50]
        return send_file(
            buf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{filename}.pdf",
        )
    except Exception as e:
        return jsonify({"error": f"WeasyPrint PDF error: {str(e)}"}), 500


# Method 3: jsPDF JSON — browser-side generation
@app.route("/api/pdf/jspdf-data", methods=["POST"])
def pdf_jspdf_data():
    """Return structured JSON for jsPDF to generate PDF in browser."""
    try:
        data = request.json
        transcript = data.get("transcript", "")
        title = data.get("title")

        if not transcript.strip():
            return jsonify({"error": "Transkrip kosong"}), 400

        jspdf_data = build_jspdf_data(transcript, title)
        return jsonify(jspdf_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Health check
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "flask-backend", "port": PORT})


if __name__ == "__main__":
    print(f"[Flask Backend] Starting on port {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=True, use_reloader=True)
