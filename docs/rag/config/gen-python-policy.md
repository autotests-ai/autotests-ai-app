---
id: gen-python-policy
domain: config
phase: 4a
adr: 002
tags: [generator, python, config]
---
# Python test generator policy

**id:** `gen-python-policy`

Machine-readable policy for `automator.generator` (Python poller). Human agents use markdown chunks; Python reads `gen-python-policy.json` in this directory.

## Файлы

- `gen-python-policy.json` — locators, tags, i18n, credentials, page defaults
- Runtime: `automator.rag.policy.load_generator_policy(rag_dir)`

## Входы

TestOps steps, case name

## Assert

Generated Java matches `test-taxonomy`, `po-locators`, `test-style-ladder` (generated = `step()` + `[data-testid=…]`)

## Do

- Edit JSON when adding locators or i18n — sync via `sync-rag` from template-project SSOT
- Keep `data-testid` aligned with `templates/vanilla-ui/`

## Don't

- Hardcode locators in `test_java.py` — use policy loader
- Duplicate policy in Python without JSON source
