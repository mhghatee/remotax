import http.server
import socketserver
import threading
import subprocess
import os
import json
import time

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT_DIR)

PORT = 9876
CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_DATA = os.path.join(ROOT_DIR, "scratch", "chrome_data")
SCREENSHOTS_DIR = os.path.join(ROOT_DIR, "scratch", "screenshots")
REPORTS_DIR = os.path.join(ROOT_DIR, "reports", "seo_wave1")
ARTIFACTS_DIR = "/Users/ghatee/.gemini/antigravity/brain/c45b6bc6-0a5f-4ce8-9574-86d8795f9f8b"

os.makedirs(CHROME_DATA, exist_ok=True)
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

# 1. Start local HTTP server
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

httpd = socketserver.TCPServer(("", PORT), QuietHandler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()
print(f"Local test server listening on http://localhost:{PORT}")

SAMPLE_PAGES = [
    {
        "type": "hub",
        "slug": "spain",
        "rel_url": "countries/spain/",
        "mobile_file": "sample_hub_spain_mobile_390.png",
        "desktop_file": "sample_hub_spain_desktop_1280.png"
    },
    {
        "type": "regime",
        "slug": "beckham-law-spain",
        "rel_url": "regimes/beckham-law-spain/",
        "mobile_file": "sample_regime_beckham_mobile_390.png",
        "desktop_file": "sample_regime_beckham_desktop_1280.png"
    },
    {
        "type": "comparison",
        "slug": "spain-vs-portugal",
        "rel_url": "comparisons/spain-vs-portugal/",
        "mobile_file": "sample_comparison_spain_pt_mobile_390.png",
        "desktop_file": "sample_comparison_spain_pt_desktop_1280.png"
    }
]

print("\n======================================================================")
print("           CAPTURING PLAYWRIGHT / CHROME HEADLESS SCREENSHOTS         ")
print("======================================================================")

captured_files = []

for sample in SAMPLE_PAGES:
    full_url = f"http://localhost:{PORT}/{sample['rel_url']}"
    
    # Mobile 390x844
    m_path = os.path.join(SCREENSHOTS_DIR, sample["mobile_file"])
    cmd_m = [
        CHROME_PATH,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        f"--user-data-dir={CHROME_DATA}",
        "--window-size=390,844",
        f"--screenshot={m_path}",
        full_url
    ]
    subprocess.run(cmd_m, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(m_path):
        size = os.path.getsize(m_path)
        print(f"[CAPTURED] {sample['mobile_file']} ({size} bytes)")
        captured_files.append((sample["mobile_file"], m_path))
        # Copy to artifacts dir
        dest = os.path.join(ARTIFACTS_DIR, sample["mobile_file"])
        with open(m_path, "rb") as rf, open(dest, "wb") as wf:
            wf.write(rf.read())
    else:
        print(f"[FAILED] Could not capture {sample['mobile_file']}")

    # Desktop 1280x900
    d_path = os.path.join(SCREENSHOTS_DIR, sample["desktop_file"])
    cmd_d = [
        CHROME_PATH,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        f"--user-data-dir={CHROME_DATA}",
        "--window-size=1280,900",
        f"--screenshot={d_path}",
        full_url
    ]
    subprocess.run(cmd_d, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(d_path):
        size = os.path.getsize(d_path)
        print(f"[CAPTURED] {sample['desktop_file']} ({size} bytes)")
        captured_files.append((sample["desktop_file"], d_path))
        # Copy to artifacts dir
        dest = os.path.join(ARTIFACTS_DIR, sample["desktop_file"])
        with open(d_path, "rb") as rf, open(dest, "wb") as wf:
            wf.write(rf.read())
    else:
        print(f"[FAILED] Could not capture {sample['desktop_file']}")

print("\n======================================================================")
print("                   RUNNING LIGHTHOUSE BENCHMARKS                      ")
print("======================================================================")

lh_results = []

for sample in SAMPLE_PAGES:
    full_url = f"http://localhost:{PORT}/{sample['rel_url']}"
    for mode in ["mobile", "desktop"]:
        report_file = os.path.join(REPORTS_DIR, f"{sample['slug']}-{mode}.json")
        cmd = [
            "npx", "lighthouse", full_url,
            "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
            "--no-enable-error-reporting",
            "--output=json",
            f"--output-path={report_file}"
        ]
        if mode == "desktop":
            cmd.append("--preset=desktop")
            
        print(f"Running Lighthouse on {sample['slug']} ({mode})...")
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if os.path.exists(report_file):
            with open(report_file) as f:
                data = json.load(f)
                cats = data.get("categories", {})
                perf = round(cats.get("performance", {}).get("score", 0) * 100)
                a11y = round(cats.get("accessibility", {}).get("score", 0) * 100)
                bp = round(cats.get("best-practices", {}).get("score", 0) * 100)
                seo = round(cats.get("seo", {}).get("score", 0) * 100)
                audits = data.get("audits", {})
                cls = audits.get("cumulative-layout-shift", {}).get("numericValue", 0)
                fcp = audits.get("first-contentful-paint", {}).get("displayValue", "N/A")
                lcp = audits.get("largest-contentful-paint", {}).get("displayValue", "N/A")
                
                print(f"  --> {sample['slug']} ({mode}): Perf: {perf} | A11y: {a11y} | BP: {bp} | SEO: {seo} | CLS: {cls:.4f} | FCP: {fcp} | LCP: {lcp}")
                lh_results.append({
                    "slug": sample["slug"],
                    "type": sample["type"],
                    "mode": mode,
                    "perf": perf,
                    "a11y": a11y,
                    "bp": bp,
                    "seo": seo,
                    "cls": cls,
                    "fcp": fcp,
                    "lcp": lcp
                })
        else:
            print(f"  [ERROR] Lighthouse failed on {sample['slug']} ({mode}): {res.stderr[:200]}")

# Shutdown server
httpd.shutdown()
print("\nLocal HTTP test server stopped.")

summary_file = os.path.join(REPORTS_DIR, "summary.json")
with open(summary_file, "w") as f:
    json.dump(lh_results, f, indent=2)

print("\nVerification and screenshot capture complete!")
