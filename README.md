# Personal Cookbook

A responsive book-style cookbook: public reading, table of contents, search, page navigation, and an owner recipe editor. Nutrition entries represent the exact ingredient weights used; calories, protein and carbs are summed per recipe and divided by servings. No fat field and no browser-only recipe storage.

## Deployment

1. GitHub Pages serves `index.html` from the repository root. Its public connection URLs are embedded in the page; `config.js` also retains them as a setup reference. `Index.html` is the Apps Script editor source.
2. In a new Google Apps Script project, add `Code.gs` and the `Index.html` HTML file. Run `setupCookbook` once as the owner. It creates a private Google Sheet and stores its ID and owner identity in Script Properties. Do not put credentials in the repository.
3. Create a public web-app deployment executing as the owner with access Anyone. Its normal URL serves only the public recipe feed. All mutation functions require the active Google user to match the owner. Never replace this check with effective-user identity.
4. Create a separate owner web-app deployment with access Only myself. Use its URL plus `?mode=edit` for the editor. Keep the Sheet private.
5. Set `feedUrl` to the public deployment URL and `editorUrl` to the owner URL with `?mode=edit` in the configuration embedded in `index.html` and in `config.js`. These URLs are public addresses, not passwords.
6. Enable GitHub Pages from the root of the main branch.

Before launch: verify anonymous reading; reject anonymous/non-owner calls to saveRecipe; save and reload a recipe as owner; check a two-serving recipe with multiple ingredient rows; confirm the same saved recipe on phone and computer. Google authorization must be completed by the owner. Setup and deployment are not complete merely because these files exist.

## Source references

- https://developers.google.com/apps-script/reference/base/session
- https://developers.google.com/apps-script/guides/content

The public JSONP feed intentionally contains only public recipe data. Nutrition is manually entered, not inferred from ingredient names. Prep/cook times are minutes. Blank optional main protein and seasonings are allowed. Recipe name, servings, ingredients and instructions are required. Ingredient nutrition values can explicitly be zero.
