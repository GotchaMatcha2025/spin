# Fran X Gotcha matcha — event spin page

One-time event page (owner, 11 Nov 2026; records in gotcha-hq `knowledge/DECISIONS.md` 11 Nov). Served by GitHub Pages at
https://gotchamatcha2025.github.io/spin/ — **the printed QR opens this exact address: never rename this repo or move the page.**

- `index.html` + `assets/spin.js`: the spin. The server (`gotcha-spin` Cloudflare Worker, private repo `spin-server`) draws every
  prize; this page only turns the wheel to the answer and shows the voucher (QR + code). Phone layout only.
- `rules/`: "how it works" (what GRA's trade-promotion class licence says players must see before they play).
- `v/`: what the voucher QR opens. The staff redemption page replaces it before Sun 15 Nov.
- Testing: open the page from disk (file://) or add `?api=staging` to use the staging server (its own database, always open).
