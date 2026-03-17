`soul.md` is **EXTREMELY IMPORTANT**. Always read and follow it first.

When the user asks you to create a pull request and does not explicitly say otherwise, create it as a draft pull request by default.

Always send a normal user-visible response in chat. Never rely on task completion UI alone to communicate that work is done.

Do not run Playwright end-to-end tests as part of routine local validation. The pull request pipeline should provide that coverage unless the user explicitly asks for a Playwright run.

Theme and colour rules:
- Keep the theme as a single source of truth in `app/styles/theme.css`.
- Expose theme tokens to the app through Tailwind in `app/globals.css`.
- Prefer Tailwind utility classes such as `bg-*`, `text-*`, and `border-*` throughout the app.
- Do not introduce inline colour styles in components when a Tailwind theme token can be used instead.
- Before creating new React UI, check the shared component library in `app/components/` and reuse or extend an existing component when it fits.
- When a route file starts mixing rendering with page-specific queries or loaders, extract that data logic into a nearby module such as `data.ts` and keep the page focused on composition.
