# URL-driven catalog filters

`src/lib/url-filters.ts` is the single source of truth for the catalog query string. All state lives in the URL so links are shareable and browser back/forward works.

| Param | Meaning | Default (omitted) |
| --- | --- | --- |
| `q` | Title/author search | empty |
| `lang` | Language name, or `all` to override the browser-language default | browser language |
| `cat` | Category | none |
| `fmt` | Format | none |
| `avail` | `readable` or `external` | `all` |
| `lic` | License string from the catalog | none |
| `sort` | `title` or `new` | `title` |
| `page` | 1-based page number | `1` |

The catalog reads the query with `useSearchParams()` and writes it with `history.pushState`/`replaceState`; typing in the search field uses `replaceState` so each keystroke does not pollute history. `popstate` resynchronizes the controlled inputs. Defaults are omitted from the URL; choosing "All languages" writes the explicit `lang=all` because the default is the visitor's browser language.

`npm run smoke` checks that filtered catalog URLs render under the GitHub Pages base path.
