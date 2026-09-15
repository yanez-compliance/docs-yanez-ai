# Yanez Docs

Source for <https://docs.yanez.ai>: the YID partner integration docs and the Yanez
Pulse agent authorization docs, built with MkDocs Material.

## Local preview

```zsh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/mkdocs serve
```

The site is served at `http://127.0.0.1:8000`.

## Check before you push

```zsh
.venv/bin/mkdocs build --strict
python3 scripts/check_urls.py
```

`check_urls.py` confirms that every URL from the old partner docs site, and every
target of the old Pulse site's redirect stub, still resolves.

## Structure

```text
docs/
  index.md            home: product chooser
  concepts/           shared by both products
  yid/                YID partner integration
  pulse/              Pulse agent authorization
  changelog/          blog, tagged by surface
  llms.txt            agent reference, maintained by hand
overrides/main.html   page toolbar (Copy page, Open in Claude or ChatGPT)
```

Pulse SDKs, CLI, MCP server, skill, examples, and the OpenAPI contract live in
[yanez-agent-authorization](https://github.com/yanez-compliance/yanez-agent-authorization).
When the Pulse API changes there, update the pages under `docs/pulse/` here.

## Publishing

This repository is public. Examples use sandbox values, placeholder credentials,
and public URLs only. Don't publish internal hosts.

Pushing to `main` builds with `--strict` and deploys to GitHub Pages.
