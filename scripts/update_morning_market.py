#!/usr/bin/env python3
import json, re, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "morning-market.json"
TZ = ZoneInfo("Asia/Jakarta")

QUERIES = [
    "saham Indonesia BEI emiten when:1d",
    "rights issue dividen RUPS emiten Indonesia when:2d",
    "MSCI Indonesia IHSG saham when:2d",
    "minyak emas batubara CPO rupiah Wall Street saham Indonesia when:1d",
]

NAME_TO_TICKER = {
    "bank rakyat indonesia":"BBRI", "bank mandiri":"BMRI",
    "bank central asia":"BBCA", "bank negara indonesia":"BBNI",
    "telkom indonesia":"TLKM", "goto gojek tokopedia":"GOTO",
    "gojek tokopedia":"GOTO", "merdeka copper gold":"MDKA",
    "bumi resources minerals":"BRMS", "bumi resources":"BUMI",
    "medco energi":"MEDC", "energi mega persada":"ENRG",
    "elnusa":"ELSA", "perusahaan gas negara":"PGAS",
    "aneka tambang":"ANTM", "vale indonesia":"INCO",
    "krakatau steel":"KRAS", "jababeka":"KIJA",
    "surya semesta internusa":"SSIA", "barito renewables":"BREN",
    "barito pacific":"BRPT", "chandra asri":"TPIA",
    "essa industries":"ESSA",
}

BLACKLIST = {
    "IHSG","BEI","IDX","RUPS","HMETD","MSCI","WIB","CEO","CFO","IPO",
    "ETF","USD","WTI","CPO","LNG","ESG","PMI","PDB","NEWS"
}

DAYS = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"]
MONTHS = ["Januari","Februari","Maret","April","Mei","Juni",
          "Juli","Agustus","September","Oktober","November","Desember"]

def fetch(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent":"Mozilla/5.0 TaktikSahamAutoMorning/1.0"}
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()

def rss_url(q):
    q = urllib.parse.quote(q)
    return f"https://news.google.com/rss/search?q={q}&hl=id&gl=ID&ceid=ID:id"

def parse_date(v):
    try:
        d = parsedate_to_datetime(v)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone(TZ)
    except Exception:
        return datetime.now(TZ)

def detect_tickers(title):
    found = []
    for x in re.findall(r"\b[A-Z]{4}\b", title):
        if x not in BLACKLIST and x not in found:
            found.append(x)
    low = title.lower()
    for name, ticker in NAME_TO_TICKER.items():
        if name in low and ticker not in found:
            found.append(ticker)
    return found[:6]

def category(title):
    x = title.lower()
    if any(k in x for k in ("rights issue","hmetd","rups","rupslb","dividen","buyback","stock split","mesop","merger","akuisisi")):
        return "corporate-action", "Corporate Action", "bg-ihsg"
    if any(k in x for k in ("laba","pendapatan","revenue","profit","ebitda","kinerja","kuartal","semester")):
        return "earnings", "Kinerja Emiten", "bg-china"
    if any(k in x for k in ("minyak","oil","emas","gold","batubara","coal","cpo","nikel","gas","lng","komoditas")):
        return "sector", "Sektor & Komoditas", "bg-hormuz"
    return "macro", "Makro & Market", "bg-usjobs"

def impact(cat):
    if cat == "corporate-action":
        return "🟡 Corporate action masuk radar. Periksa detail keterbukaan informasi dan price action."
    if cat == "earnings":
        return "🟡 Perhatikan perubahan laba, margin, dan respons harga setelah laporan kinerja."
    if cat == "sector":
        return "🟡 Sentimen sektor/komoditas perlu dikonfirmasi pada emiten terkait."
    return "🟡 Headline market-wide. Konfirmasi dampaknya terhadap IHSG dan sektor terkait."

def collect():
    now = datetime.now(TZ)
    raw = []

    for q in QUERIES:
        try:
            root = ET.fromstring(fetch(rss_url(q)))
            for item in root.findall(".//item"):
                title = (item.findtext("title") or "").strip()
                if not title:
                    continue
                pub = parse_date(item.findtext("pubDate") or "")
                if pub < now - timedelta(hours=60):
                    continue

                cat, label, bg = category(title)
                raw.append({
                    "title": title,
                    "source": (item.findtext("source") or "Google News").strip(),
                    "url": (item.findtext("link") or "").strip(),
                    "published": pub,
                    "tickers": detect_tickers(title),
                    "category": cat,
                    "categoryLabel": label,
                    "bgClass": bg,
                })
        except Exception as e:
            print("Feed error:", q, e)

    # Deduplicate
    dedup = {}
    for a in raw:
        key = re.sub(r"[^a-z0-9]+","",a["title"].lower())[:180]
        if key not in dedup or a["published"] > dedup[key]["published"]:
            dedup[key] = a

    arr = list(dedup.values())
    arr.sort(key=lambda x: (bool(x["tickers"]), x["published"]), reverse=True)
    return arr[:12]

def main():
    now = datetime.now(TZ)
    articles = collect()

    if not articles:
        print("Tidak ada artikel baru. File lama dipertahankan.")
        return

    news = []
    ticker_count = {}

    for i, a in enumerate(articles[:9]):
        for t in a["tickers"]:
            ticker_count[t] = ticker_count.get(t, 0) + 1

        tickers = " • ".join(a["tickers"]) if a["tickers"] else (
            "IHSG" if a["category"] == "macro" else "Market / Sector"
        )

        news.append({
            "title": a["title"],
            "bgClass": a["bgClass"],
            "category": a["category"],
            "categoryLabel": a["categoryLabel"],
            "tickers": tickers,
            "summary": f"Headline terbaru dari {a['source']}: {a['title']}",
            "impact": impact(a["category"]),
            "source": a["source"],
            "time": a["published"].strftime("%d %b %Y • %H:%M WIB"),
            "featured": i == 0,
            "url": a["url"],
        })

    top = [x[0] for x in sorted(
        ticker_count.items(),
        key=lambda z: (z[1], z[0]),
        reverse=True
    )[:8]]

    recs = []
    for ticker in top[:4]:
        matching = next(
            (a for a in articles if ticker in a["tickers"]),
            None
        )
        if not matching:
            continue
        recs.append({
            "ticker": ticker,
            "company": "Auto Detected",
            "status": "wait",
            "statusLabel": "Auto News Catalyst",
            "planStatus": "AUTO DRAFT — News Only",
            "timeframe": "Watchlist",
            "entry": "Tunggu konfirmasi teknikal",
            "entryNum": None,
            "tp": "—",
            "tpNum": None,
            "cl": "Sesuaikan setelah entry",
            "clNum": None,
            "riskLabel": "Review manual",
            "whyNow": matching["title"],
            "reasons": [
                f"📰 {matching['title']}",
                f"🏷️ Sumber: {matching['source']}",
                "📊 Auto Draft belum membuat level BUY tanpa konfirmasi teknikal.",
                "⚠️ Periksa chart, likuiditas, dan risiko sebelum transaksi."
            ],
            "updated": now.strftime("%d %b %Y • %H:%M WIB") + " • AUTO DRAFT",
            "autoDraft": True,
            "priceFeed": False
        })

    display_date = f"{DAYS[now.weekday()]}, {now.day} {MONTHS[now.month-1]} {now.year}"

    payload = {
        "version": 1,
        "date": now.strftime("%Y-%m-%d"),
        "display_date": display_date,
        "generated_at": now.isoformat(),
        "generated_at_wib": now.strftime("%d %b %Y • %H:%M WIB"),
        "headline": articles[0]["title"],
        "summary": f"{len(news)} berita terseleksi otomatis dari headline terbaru pasar Indonesia.",
        "focus_label": "Selective / News Driven",
        "focus_text": (
            " • ".join(top[:6]) + " menjadi ticker yang paling sering terdeteksi pada headline terbaru."
            if top else
            "Fokus pada headline market-wide dan konfirmasi dengan price action."
        ),
        "top_tickers": top,
        "price_feed": False,
        "news": news,
        "recommendations": recs,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Updated {OUT}: {len(news)} news, {len(recs)} auto drafts")

if __name__ == "__main__":
    main()
