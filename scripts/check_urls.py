"""Check that every URL from the two old doc sites resolves in the built site.

Run from the repo root after `mkdocs build --strict`:

    python3 scripts/check_urls.py
"""

import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"

# Every page URL the old docs.yanez.ai site served. Each must be a page, or a
# redirect to a page.
OLD_DOCS_YANEZ_AI = [
    "",
    "quickstart/",
    "overview/",
    "onboarding/",
    "concepts/",
    "authentication/",
    "deep-link-signing/",
    "callback/",
    "api/backend-api/",
    "api/errors/",
    "platforms/web/",
    "platforms/android/",
    "platforms/ios/",
    "testing/",
    "privacy-security/",
    "production-checklist/",
    "glossary/",
    "changelog/",
    "download/",
    "support/",
]

# Where the redirect stub on the old Pulse github.io site sends visitors.
PULSE_STUB_TARGETS = [
    "pulse/",
    "pulse/ai-agents/",
    "pulse/integration-options/",
    "pulse/http-quickstart/",
    "pulse/faq/",
    "pulse/showcase/",
    "pulse/terms/",
    "pulse/receipts/",
    "pulse/user-signed-approvals/",
    "pulse/action-enforcement/",
    "llms.txt",
]

# mkdocs-redirects writes: <meta http-equiv="refresh" content="0; url=../yid/quickstart/">
REFRESH = re.compile(r'http-equiv="refresh" content="0; url=([^"]+)"')


def resolve(url_path):
    """Return the built file that serves url_path, following one redirect, or None."""
    built = SITE / url_path
    if not url_path.endswith(".txt"):
        built = built / "index.html"
    if not built.is_file():
        return None
    match = REFRESH.search(built.read_text(encoding="utf-8"))
    if not match:
        return built
    target = (built.parent / match.group(1) / "index.html").resolve()
    return target if target.is_file() else None


def main():
    if not SITE.is_dir():
        sys.exit("site not found. Run `mkdocs build --strict` first.")
    urls = OLD_DOCS_YANEZ_AI + PULSE_STUB_TARGETS
    missing = [path for path in urls if resolve(path) is None]
    for path in missing:
        print(f"MISSING /{path}")
    if missing:
        sys.exit(1)
    print(f"OK: {len(urls)} URLs resolve")


if __name__ == "__main__":
    main()
