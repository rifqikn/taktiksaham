#!/usr/bin/env python3
"""
TAKTIKSAHAM Auto Morning Market
- Fetches recent Indonesian stock-market headlines from RSS search feeds.
- Builds data/morning-market.json.
- Optional: if EODHD_API_TOKEN exists, adds a simple technical filter to Auto Drafts.
- No secret is ever written into the website or JSON output.
"""
from __future__ import annotations

import os, re, json, math, html as html_lib, urllib.parse, urllib.request
from pathlib import Path
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from email.utils import parsedate_to_datetime
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "morning-market.json"
TZ = ZoneInfo("Asia/Jakarta")

RSS_QUERIES = [
    "saham Indonesia BEI emiten when:1d",
    "rights issue dividen RUPS emiten Indonesia when:2d",
    "MSCI Indonesia saham IHSG when:2d",
    "harga minyak emas batubara CPO rupiah Wall Street saham Indonesia when:1d",
]

NAME_TO_TICKER = {
    "bank rakyat indonesia":"BBRI","bank mandiri":"BMRI","bank central asia":"BBCA",
    "bank negara indonesia":"BBNI","telkom indonesia":"TLKM","goto gojek tokopedia":"GOTO",
    "gojek tokopedia":"GOTO","adaro minerals":"ADMR","alamtri resources":"ADRO",
    "merdeka copper gold":"MDKA","bumi resources minerals":"BRMS","bumi resources":"BUMI",
    "medco energi":"MEDC","energi mega persada":"ENRG","elnusa":"ELSA",
    "perusahaan gas negara":"PGAS","vale indonesia":"INCO","aneka tambang":"ANTM",
    "harum energy":"HRUM","timah":"TINS","indah kiat":"INKP","pabrik kertas tjiwi kimia":"TKIM",
    "xl axiata":"EXCL","xlsmart":"EXCL","indosat":"ISAT","mitratel":"MTEL",
    "krakatau steel":"KRAS","puradelta lestari":"DMAS","jababeka":"KIJA",
    "surya semesta internusa":"SSIA","barito renewables":"BREN","barito pacific":"BRPT",
    "chandra asri":"TPIA","ammonia":"ESSA","essa industries":"ESSA",
}

BLACKLIST = {
    "IHSG","BEI","IDX","RUPS","HMETD","MSCI","WIB","CEO","CFO","IPO","ETF","BI","AS","RI",
    "USD","WTI","CPO","LNG","ESG","PMI","PDB","THE","WITH","FROM","THIS","THAT","NEWS",
}

POSITIVE = (
    "naik","melonjak","menguat","tumbuh","laba naik","laba melonjak","kontrak",
    "dividen","buyback","ekspansi","akuisisi","menang tender","target naik","surplus",
    "realisasi naik","produksi naik","pendapatan naik","rekor","upgrade"
)
NEGATIVE = (
    "turun","anjlok","melemah","rugi","suspensi","default","gagal bayar","tekanan",
    "penurunan laba","laba turun","downgrade","dilusi","koreksi tajam","PHK","pailit"
)

def clean(s: str) -> str:
    return re.sub(r"\s+", " ", html_lib.unescape(s or "")).strip()

def rss_url(query: str) -> str:
    q = urllib.parse.quote(query)
    return f"https://news.google.com/rss/search?q={q}&hl=id&gl=ID&ceid=ID:id"

def fetch_url(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent":"Mozilla/5.0 TaktikSahamMorningBot/1.0"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def parse_pubdate(value: str) -> datetime:
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(TZ)
    except Exception:
        return datetime.now(TZ)

def normalize_title(title: str) -> str:
    # Google News titles often end with " - Source"
    return clean(title)

def detect_tickers(title: str) -> list[str]:
    found = []
    for x in re.findall(r"\b[A-Z]{4}\b", title):
        if x not in BLACKLIST and x not in found:
            found.append(x)
    low = title.lower()
    for name, ticker in NAME_TO_TICKER.items():
        if name in low and ticker not in found:
            found.append(ticker)
    return found[:6]

def categorize(title: str) -> tuple[str,str,str]:
    x = title.lower()
    if any(k in x for k in ("rights issue","hmetd","rups","rupslb","dividen","buyback","stock split","mesop","merger","akuisisi")):
        return "corporate-action","Corporate Action","bg-ihsg"
    if any(k in x for k in ("laba","pendapatan","revenue","profit","ebitda","kinerja","kuartal","semester")):
        return "earnings","Kinerja Emiten","bg-china"
    if any(k in x for k in ("minyak","oil","emas","gold","batubara","coal","cpo","nikel","nickel","lng","gas","komoditas")):
        return "sector","Sektor & Komoditas","bg-hormuz"
    return "macro","Makro & Market","bg-usjobs"

def sentiment(title: str) -> int:
    x=title.lower()
    pos=sum(1 for k in POSITIVE if k in x)
    neg=sum(1 for k in NEGATIVE if k in x)
    return 1 if pos>neg else -1 if neg>pos else 0

def article_score(a: dict, now: datetime) -> int:
    title=a["title"].lower()
    s=0
    if a["tickers"]: s += 5
    if a["category"]=="corporate-action": s += 4
    if a["category"]=="earnings": s += 3
    if any(k in title for k in ("saham","emiten","ihsg","bei","idx")): s += 2
    age=(now-a["published"]).total_seconds()/3600
    if age <= 12: s += 4
    elif age <= 24: s += 2
    elif age <= 48: s += 1
    s += abs(a["sentiment"])
    return s

def fetch_articles(now: datetime) -> list[dict]:
    raw=[]
    errors=[]
    for q in RSS_QUERIES:
        try:
            root=ET.fromstring(fetch_url(rss_url(q)))
            for item in root.findall(".//item"):
                title=normalize_title(item.findtext("title") or "")
                if not title: continue
                source=clean(item.findtext("source") or "Google News")
                link=clean(item.findtext("link") or "")
                published=parse_pubdate(item.findtext("pubDate") or "")
                if published < now-timedelta(hours=60):
                    continue
                cat, cat_label, bg=categorize(title)
                raw.append({
                    "title":title,"source":source,"url":link,"published":published,
                    "tickers":detect_tickers(title),"category":cat,"categoryLabel":cat_label,
                    "bgClass":bg,"sentiment":sentiment(title),
                })
        except Exception as e:
            errors.append(f"{q}: {e}")

    dedup={}
    for a in raw:
        key=re.sub(r"[^a-z0-9]+","",a["title"].lower())[:180]
        if key not in dedup or a["published"]>dedup[key]["published"]:
            dedup[key]=a
    arr=list(dedup.values())
    for a in arr:
        a["score"]=article_score(a,now)
    arr.sort(key=lambda x:(x["score"],x["published"]), reverse=True)
    return arr[:18]

def impact_text(a: dict) -> str:
    if a["sentiment"]>0:
        return "🟢 Headline cenderung positif. Konfirmasi dampaknya pada harga, volume, dan keterbukaan informasi."
    if a["sentiment"]<0:
        return "🔴 Headline membawa risiko negatif. Waspadai volatilitas dan jangan hanya mengandalkan judul berita."
    if a["category"]=="corporate-action":
        return "🟡 Corporate action perlu dipantau karena dampaknya bisa berbeda tergantung detail dan price action."
    return "🟡 Masuk radar monitoring. Baca sumber asli dan konfirmasi dengan kondisi pasar."

def to_public_news(a: dict, featured=False) -> dict:
    tickers=" • ".join(a["tickers"]) if a["tickers"] else ("IHSG" if a["category"]=="macro" else "Market / Sector")
    summary=f"Headline terbaru dari {a['source']}: {a['title']}"
    return {
        "title":a["title"],"bgClass":a["bgClass"],"category":a["category"],
        "categoryLabel":a["categoryLabel"],"tickers":tickers,
        "summary":summary[:340],"impact":impact_text(a),"source":a["source"],
        "time":a["published"].strftime("%d %b %Y • %H:%M WIB"),
        "featured":featured,"url":a["url"]
    }

def rsi14(closes: list[float]) -> float|None:
    if len(closes)<15:return None
    gains=[];losses=[]
    for a,b in zip(closes[-15:-1],closes[-14:]):
        d=b-a;gains.append(max(d,0));losses.append(max(-d,0))
    ag=sum(gains)/14; al=sum(losses)/14
    if al==0:return 100.0
    rs=ag/al
    return 100-(100/(1+rs))

def atr14(rows: list[dict]) -> float|None:
    if len(rows)<15:return None
    trs=[]
    prev=float(rows[-15]["close"])
    for r in rows[-14:]:
        h=float(r["high"]);l=float(r["low"]);c=float(r["close"])
        trs.append(max(h-l,abs(h-prev),abs(l-prev)));prev=c
    return sum(trs)/len(trs) if trs else None

def fmt_price(v: float|None) -> str:
    if v is None:return "—"
    # Approximate IDX price display; round to nearest integer for draft only.
    return f"{int(round(v)):,}".replace(",", ".")

def eodhd_rows(ticker: str, token: str, now: datetime) -> list[dict]:
    frm=(now.date()-timedelta(days=140)).isoformat()
    to=now.date().isoformat()
    url=f"https://eodhd.com/api/eod/{ticker}.JK?api_token={urllib.parse.quote(token)}&fmt=json&period=d&order=a&from={frm}&to={to}"
    data=json.loads(fetch_url(url,25).decode("utf-8"))
    return data if isinstance(data,list) else []

def technical_draft(ticker: str, rows: list[dict]) -> dict|None:
    if len(rows)<55:return None
    closes=[float(r["close"]) for r in rows if r.get("close") not in (None,"")]
    if len(closes)<55:return None
    close=closes[-1]; sma20=sum(closes[-20:])/20; sma50=sum(closes[-50:])/50
    rsi=rsi14(closes); atr=atr14(rows)
    high20=max(float(r["high"]) for r in rows[-20:])
    trend=close>sma20>sma50
    breakout=close>=high20*0.985
    if trend and rsi is not None and 42<=rsi<=72:
        status="buy"; label="Auto Technical Candidate"; plan="AUTO DRAFT — Trend"
        low=close-(atr*.35 if atr else close*.01); high=close+(atr*.15 if atr else close*.005)
        entry=f"{fmt_price(low)}–{fmt_price(high)}"
        tp=fmt_price(close+(atr*2 if atr else close*.05))
        cl=fmt_price(close-(atr*1.15 if atr else close*.035))
    else:
        status="wait"; label="Wait Confirmation"; plan="AUTO DRAFT — Breakout"
        entry=f"Break > {fmt_price(high20)}"
        tp=fmt_price(high20+(atr*1.7 if atr else high20*.04))
        cl="Review setelah breakout"
    return {
        "status":status,"statusLabel":label,"planStatus":plan,"entry":entry,
        "entryNum":round(close,4),"tp":tp,"tpNum":None,"cl":cl,"clNum":None,
        "riskLabel":"Auto Draft","technical":{
            "close":close,"sma20":sma20,"sma50":sma50,"rsi14":rsi,
            "high20":high20,"atr14":atr,"trend":trend,"nearBreakout":breakout
        }
    }

def build_recommendations(articles: list[dict], token: str|None, now: datetime) -> list[dict]:
    grouped={}
    for a in articles:
        for t in a["tickers"]:
            grouped.setdefault(t,[]).append(a)
    ranked=[]
    for t,items in grouped.items():
        sc=sum(x["score"]+(2 if x["sentiment"]>0 else -1 if x["sentiment"]<0 else 0) for x in items)
        ranked.append((sc,t,items))
    ranked.sort(reverse=True)

    out=[]
    for _,ticker,items in ranked[:5]:
        top=items[0]
        tech=None
        if token:
            try:
                tech=technical_draft(ticker,eodhd_rows(ticker,token,now))
            except Exception:
                tech=None
        if tech:
            item={
                "ticker":ticker,"company":"Auto Detected","timeframe":"Swing / Watchlist",
                **tech,
                "whyNow":f"{top['title']} Selain katalis berita, price feed EODHD dipakai sebagai filter teknikal draft.",
                "reasons":[
                    f"📰 {top['title']}",
                    f"🏷️ Sumber: {top['source']}",
                    f"📊 Close {fmt_price(tech['technical']['close'])} • RSI14 {tech['technical']['rsi14']:.1f}" if tech["technical"]["rsi14"] is not None else "📊 Filter teknikal aktif",
                    "⚠️ Auto Draft: tetap konfirmasi likuiditas, chart, dan risiko sebelum transaksi."
                ],
                "updated":now.strftime("%d %b %Y • %H:%M WIB")+" • AUTO DRAFT",
                "autoDraft":True,"priceFeed":True
            }
        else:
            item={
                "ticker":ticker,"company":"Auto Detected","status":"wait",
                "statusLabel":"Auto News Catalyst","planStatus":"AUTO DRAFT — News Only","timeframe":"Watchlist",
                "entry":"Tunggu konfirmasi teknikal","entryNum":None,"tp":"—","tpNum":None,
                "cl":"Sesuaikan setelah entry","clNum":None,"riskLabel":"Review manual",
                "whyNow":top["title"],
                "reasons":[
                    f"📰 {top['title']}",
                    f"🏷️ Sumber: {top['source']}",
                    "📊 Price feed belum aktif; sistem tidak membuat level BUY otomatis.",
                    "⚠️ Buka tab Technical dan konfirmasi price action sebelum mengambil keputusan."
                ],
                "updated":now.strftime("%d %b %Y • %H:%M WIB")+" • AUTO DRAFT",
                "autoDraft":True,"priceFeed":False
            }
        out.append(item)
    return out[:4]

def main():
    now=datetime.now(TZ)
    articles=fetch_articles(now)
    if not articles:
        print("Tidak ada artikel baru. File sebelumnya dipertahankan.")
        return

    public=[to_public_news(a,i==0) for i,a in enumerate(articles[:9])]
    tick_counts={}
    for a in articles:
        for t in a["tickers"]:
            tick_counts[t]=tick_counts.get(t,0)+1
    top_tickers=[x[0] for x in sorted(tick_counts.items(),key=lambda z:(z[1],z[0]),reverse=True)[:8]]

    cat_counts={}
    for a in articles[:12]:
        cat_counts[a["categoryLabel"]]=cat_counts.get(a["categoryLabel"],0)+1
    focus_label=max(cat_counts,key=cat_counts.get) if cat_counts else "Selective"

    token=os.getenv("EODHD_API_TOKEN","").strip() or None
    recs=build_recommendations(articles,token,now)

    headline=articles[0]["title"]
    focus_text=(" • ".join(top_tickers[:6])+" menjadi ticker yang paling sering terdeteksi pada headline terbaru."
                if top_tickers else "Fokus pada headline market-wide dan konfirmasi dengan price action.")

    payload={
        "version":1,
        "date":now.strftime("%Y-%m-%d"),
        "display_date":now.strftime("%A, %d %B %Y"),
        "generated_at":now.isoformat(),
        "generated_at_wib":now.strftime("%d %b %Y • %H:%M WIB"),
        "headline":headline,
        "summary":f"{len(public)} berita terseleksi otomatis dari feed terbaru. Sistem menyimpan data terakhir sehingga halaman tetap terisi jika feed berikutnya gagal.",
        "focus_label":focus_label,
        "focus_text":focus_text,
        "top_tickers":top_tickers,
        "price_feed":bool(token),
        "news":public,
        "recommendations":recs,
    }
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Updated {OUT} — {len(public)} news, {len(recs)} drafts, price_feed={bool(token)}")

if __name__=="__main__":
    main()
