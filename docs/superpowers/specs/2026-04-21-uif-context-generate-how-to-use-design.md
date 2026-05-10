# Design: uif context for /generate-how-to-use

**Date:** 2026-04-21  
**Status:** Approved

## Goal

Improve `/generate-how-to-use` skill by reading the local `E:\DEV\uif` design system repo as additional context. Generated sections and descriptions must be grounded in real component code, not invented from scratch. Unmatched props are surfaced for manual review.

---

## Output folder

Instead of relying solely on clipboard, input and output JSONs are saved to `output/` in the plugin root.

- Plugin saves inspection result to `output/{component-name}.json` (e.g. `output/button.json`)
- Files are never overwritten — if `button.json` exists, save as `button_2.json` (or with timestamp)
- Skill reads from `output/` on startup:
  - If one input file found → use it automatically
  - If multiple found → ask: *«Нашёл компоненты: button, action-button, alert. Для какого генерируем?»*
  - If folder empty → fallback to clipboard
- Skill saves generated result to `output/{component-name}_htu.json`
- Clipboard is still filled for «Import How to use» in the plugin (unchanged)

---

## uif file reading (Approach B)

Component name from JSON (e.g. `"button"`) → lowercase → path:
```
E:\DEV\uif\packages\kaspersky-hexa-ui\src\{name}\
```

Three files are read:
- `types.ts` — TypeScript interfaces, JSDoc per prop, union types with valid values
- `*.stories.tsx` — `args` (defaults) and `argTypes` (option lists per prop)
- `__meta__/meta.json` — `usage` and `description` fields (informational, not used as componentDescription source)

If the directory is not found → skill continues without uif context (fallback to current behavior).

---

## Three-tier sections and ideas

All sections and ideas carry a `"source"` field:

| source | origin | plugin rendering |
|--------|--------|-----------------|
| `"user"` | designer's `userContext` | first, no marking |
| `"real"` | generated from actual uif props/types | second, no marking |
| `"suggested"` | web research (other design systems) | last, gray background |

Order in output JSON: user → real → suggested.

---

## JSON output format

```json
{
  "component": "button",
  "componentDescription": "3–5 предложений — назначение компонента на основе реальных типов из uif.",
  "techDescriptions": {
    "Icon": "3–5 предложений о роли технического компонента."
  },
  "sections": [
    {
      "title": "Деструктивное действие",
      "description": "Используй mode dangerFilled для необратимых действий.",
      "example": { "Mode": "dangerFilled" },
      "source": "real"
    },
    {
      "title": "Кнопка в форме",
      "description": "Общепринятая практика из других дизайн-систем.",
      "example": { "Mode": "primary" },
      "source": "suggested"
    }
  ],
  "ideas": [
    {
      "title": "Не используй tertiary как основной",
      "description": "Антипаттерн из документации Carbon.",
      "source": "suggested"
    }
  ],
  "propUpdates": [
    { "designName": "Mode", "codeProp": "mode: ButtonMode" },
    { "designName": "Size", "codeProp": "size?: ButtonSize" }
  ],
  "unmatchedProps": [
    { "designName": "Variant", "codeName": "variant", "reason": "не найден в types.ts" }
  ]
}
```

- `propUpdates` — design props successfully matched to uif code props
- `unmatchedProps` — design props where no logical match was found in uif; Item Dev text is NOT updated for these (kept from propsDictionary)
- Skill prints a warning at the end of its response listing unmatched props

---

## Plugin changes

### `main.ts` — save output path
- On «Сгенерировать How to use»: save JSON to `output/{component-name}.json` instead of `_tmp_how_to_use.json`
- Never overwrite existing files

### Import How to use — two new steps
1. Read `propUpdates` → update Item Dev text in prop blocks across all doc frames
2. If `unmatchedProps` is non-empty → show intermediate screen instead of going directly to props table

### New intermediate screen — «Несопоставленные пропы»

Shown only when `unmatchedProps` is non-empty after import.

Contents:
- **«Дизайн → нет в коде»** list: design props with no uif match
- **«Код → нет в дизайне»** list: uif props with no design counterpart (derived by skill, included in JSON)
- **«Скопировать список»** button — copies both lists as plain text to clipboard
- **«Готово»** button — navigates to main props table screen

---

## Skill step-by-step (updated)

1. Determine which input file to use (output folder or clipboard)
2. Parse JSON: extract `component`, `props`, `techComponents`, `userContext`
3. Resolve uif path, read `types.ts` + `*.stories.tsx` + `__meta__/meta.json`
4. Web research (Carbon, MUI, Atlassian, etc.) — same as current, focus on edge cases and suggested patterns
5. Generate sections:
   - user-source: from `userContext`
   - real-source: based on actual props/values from uif
   - suggested-source: from web research
6. Generate ideas (same three-tier split)
7. Generate `componentDescription` using uif types as context (no invented capabilities)
8. Generate `techDescriptions` if `techComponents` present
9. Build `propUpdates`: logical match between designName → codeName (dictionary) → uif types.ts
10. Build `unmatchedProps`: design props with no uif match + uif props with no design counterpart
11. Save result to `output/{component-name}_htu.json`
12. Copy to clipboard
13. Print unmatched props warning if any
14. Confirm: *«JSON скопирован в буфер — нажми «Import How to use» в плагине»*

---

## Out of scope (future)

- Left section examples from stories data
- Writing component descriptions back to storybook meta.json
- Auto-updating propsDictionary from uif types
