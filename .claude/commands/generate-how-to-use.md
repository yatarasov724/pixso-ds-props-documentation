Read the clipboard contents using `powershell -command "Get-Clipboard"`, then generate a "How to use" guide for the design system component found in that JSON.

## Steps

1. **Determine input source** — Check the `output/` folder in the project root:
   - First, determine the project root by running: `git rev-parse --show-toplevel`
   - Substitute the result into all `<project-root>` placeholders in the commands below.
   - Run: `powershell -command "Get-ChildItem '<project-root>/output/' -Filter '*.json' | Where-Object { $_.Name -notmatch '_htu\.json$' } | Select-Object -ExpandProperty Name"`
   - If the folder doesn't exist or is empty → read from clipboard: `powershell -command "Get-Clipboard"` — if clipboard content is empty or not valid JSON, stop and ask the user to copy a props JSON from the Pixso plugin first.
   - If one file found → use it: read with `[System.IO.File]::ReadAllText('<project-root>/output/{filename}', [System.Text.Encoding]::UTF8)`
   - If multiple files found → list them and ask the user: «Нашёл компоненты: button, action-button. Для какого генерируем?» — then read the chosen file
   - Parse JSON. Extract: `component`, `props`, `techComponents`, `userContext`. Each element in `props` is an object with at least `designName` (design-side prop name) and `codeName` (code-side name already mapped by the plugin's propsDictionary).

2. **Read uif repo for component context** — resolve path:
   ```
   E:\DEV\uif\packages\kaspersky-hexa-ui\src\{component-name-lowercase}\
   ```
   Name normalization examples: "Button" → `button`, "Action Button" → `action-button`, "Segmented Control" → `segmented-control`.

   If the directory exists, read these files using the Read tool:
   - `types.ts` — TypeScript interfaces, JSDoc comments per prop, union type values
   - Find and read the stories file: look for `*.stories.tsx` in the component directory
   - `__meta__/meta.json` — `usage` and `description` fields (informational context only — do NOT use as the source for `componentDescription`)

   After reading `types.ts`, scan for **nested option/item types** — types referenced as array elements in the main `ComponentProps` (e.g. `options: RadioOption[]`, `options?: CheckboxOption[]`, `items: MenuItemType[]`). For each such nested type found in the same `types.ts`:
   - Extract all its fields with type annotations and JSDoc comments
   - Store as `optionTypeFields` (e.g. `RadioOption → { label, value, disabled, readonly, required, tooltip, description, dependentElement }`)
   - Use in Step 6 alongside the top-level ComponentProps fields for prop matching

   When a type references an **external helper** (e.g. `WithAdditionalContent`, `WithAdditionalContent<T>`, `WithTooltip`, `FormLabelProps`), resolve it: find the helper file in the repo and read it to get the exact field names and types. **Never assume or infer types from helper names** — always read the source. Example: `WithAdditionalContent` adds `description?: string` (not ReactNode) and `dependentElement?: ReactNode`.

   **Rule: component source must be read exhaustively. Guesses and inferences are only permitted when mapping design props to code props where an exact match is absent (Step 6). Types of props must always come from source code, never be assumed.**

   If the directory is not found → continue without uif context: all generated sections get `"source": "suggested"`, skip `propUpdates` and `unmatchedProps`.

   For each name in `techComponents` (if present in the input JSON), also try to read:
   - `E:\DEV\uif\packages\kaspersky-hexa-ui\src\{tech-name-lowercase}\types.ts`
   - `E:\DEV\uif\packages\kaspersky-hexa-ui\src\{tech-name-lowercase}\__meta__\meta.json`

3. **Generate sections** — Produce 4–7 sections total, ordered by source tier. Each section MUST have a `"source"` field:

   **`"source": "user"`** — from `userContext` (if present in input JSON): generate one section per case the designer described. These go first. Do not skip any user-provided case.

   **`"source": "real"`** — from uif types and stories: generate sections based on actual prop combinations that exist in `types.ts` and `*.stories.tsx`. Use only values that actually appear in the types/stories. Examples for Button: dangerFilled mode for destructive actions, loading state, icon variants. Go second.

   **`"source": "suggested"`** — from web research on other design systems (Carbon IBM, MUI, Atlassian, Orbit, Kontur, Gravity UI, Radix UI): extract patterns NOT already covered by real sections. Search these design systems for how they document the component:
   - Carbon IBM (carbondesignsystem.com)
   - Gravity UI (gravity-ui.com)
   - Radix UI (radix-ui.com)
   - Material UI (mui.com)
   - Ant Design (ant.design)
   - Atlassian Design System (atlassian.design)
   - Evergreen (segment.com/docs/evergreen or evergreen.segment.com)
   - Orbit by Kiwi.com (orbit.kiwi)
   - Контур.Гайды (guides.kontur.ru)

   Look for: typical use cases, edge cases, rules, anti-patterns, best practices, accessibility notes. Run web search: `"<component name>" design system usage examples site:carbondesignsystem.com OR site:mui.com OR site:atlassian.design OR site:orbit.kiwi`. Go last.

   Output order in JSON array: user → real → suggested.

4. **Generate ideas** — Same three-tier split, 4–8 ideas total. Each idea MUST have a `"source"` field:
   - `"source": "real"` — rules derivable directly from uif types (e.g. "loading и disabled нельзя одновременно" if both are boolean props in types.ts)
   - `"source": "suggested"` — edge cases, anti-patterns, accessibility rules from web research. Do a targeted web search specifically for edge cases, anti-patterns, accessibility rules, and layout guidelines for this component. Search queries to run:
     - `"<component name>" design system "do not" OR "avoid" OR "don't" site:carbondesignsystem.com OR site:mui.com OR site:ant.design OR site:atlassian.design OR site:orbit.kiwi OR site:guides.kontur.ru`
     - `"<component name>" accessibility guidelines disabled tooltip aria`
     - `"<component name>" "best practices" edge cases layout rules site:atlassian.design OR site:orbit.kiwi OR site:guides.kontur.ru`

   Each idea must have a `title` (2–5 words) and a `description` (2–3 sentences). Include an `example` if a specific prop combination is worth showing.

5. **Generate descriptions:**
   - `componentDescription` — 3–5 sentences in Russian describing the component's purpose and when to use it. Use `types.ts` as ground truth for what modes/sizes/props actually exist — do NOT mention capabilities absent from the types. Do not copy from `meta.json`; write original text grounded in the types.
   - `techDescriptions` — for each name in `techComponents`, write 3–5 sentences in Russian about that tech component's role. Use its `types.ts` if found. If `techComponents` was absent or empty, omit `techDescriptions` from the output.

6. **Build propUpdates and unmatchedProps** (only if uif context was found):

   **propUpdates** — for each prop in the input `props` array:
   - Take the prop's `codeName` (already mapped by the plugin's propsDictionary)
   - Search in this order (stop at first match):
     1. Top-level `ComponentProps` in `types.ts` — exact name, then case-insensitive
     2. **Nested option/item type fields** from `optionTypeFields` (extracted in Step 2) — exact name, then case-insensitive. When matched here, note the origin type in `codeProp`, e.g. `"label (RadioOption): Exclude<ReactNode, null | undefined>"`
   - If case-insensitive search produces multiple candidates across either level, prefer the one whose name matches `codeName` after lowercasing both. If still ambiguous, add to `unmatchedProps` with `reason: 'неоднозначное совпадение в types.ts'`
   - If found at any level: format required props as `"{codeName}: {Type}"` and optional as `"{codeName}?: {Type}"`
   - Add to `propUpdates`: `{ "designName": "{designName}", "codeProp": "{codeName}?: {Type}" }`

   **unmatchedProps — design side** — for each prop where no match was found in `types.ts`:
   - Determine whether you can identify the correct code-side prop despite the name mismatch. Common cases:
     - Renamed by the framework (e.g. `selected` → `checked` in Antd, `indenterminate` → `indeterminate` typo fix)
     - Design bundles multiple code props into one (e.g. `state` covers `disabled` and `readonly`)
     - Prop lives in a helper/wrapper type not directly visible in `types.ts` (e.g. `WithAdditionalContent`)
     - Prop matches a field in a nested option/item type from `optionTypeFields` (e.g. design `value` → `RadioOption.label`)
   - **If you CAN identify the correct code prop**: add it to `propUpdates` with the resolved type: `{ "designName": "{designName}", "codeProp": "{realCodeName}?: {Type}" }`. Still add to `unmatchedProps` with `reason` explaining the rename/mapping.
   - **If you CANNOT identify the correct code prop**: add to `unmatchedProps` only: `{ "designName": "{designName}", "codeName": "{codeName}", "reason": "не найден в types.ts" }`

   **unmatchedProps — code side** — find TypeScript properties in `types.ts` that have no corresponding design prop (no match by codeName in the input `props` array). For each:
   - Extract the JSDoc comment for that property from `types.ts` (the `/** ... */` line above it). If no JSDoc exists, infer a 1-sentence description from the prop name and type.
   - Add: `{ "codeOnly": true, "codeName": "{propName}", "type": "{TypeAnnotation}", "comment": "краткое описание из JSDoc или выведенное из контекста" }`

   If uif context was unavailable (directory not found), omit both `propUpdates` and `unmatchedProps` from output entirely.

   **unmatchedProps section** — if `unmatchedProps` is non-empty, append one final section to the `sections` array (after all other sections):
   - `title`: `"Несопоставленные пропы"`
   - `description`: formatted text listing all unmatched props. Format:
     ```
     Дизайн → нет в коде:
     • {designName} — {reason}

     Код → нет в дизайне:
     • {codeName}: {type} — {comment}
     ```
     Omit a group if it has no entries.
   - `noExample`: `true` — signals the plugin to remove the demo area and display text full-width
   - `source`: `"real"`

   If `unmatchedProps` is empty, do not add this section.

   **Output JSON format — all text in Russian:**
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
    { "designName": "Variant", "codeName": "variant", "reason": "не найден в types.ts" },
    { "codeOnly": true, "codeName": "isPressed", "type": "boolean", "comment": "активное нажатое состояние кнопки" }
  ]
}
```

   The last entry in `sections` when `unmatchedProps` is non-empty:
```json
{
  "title": "Несопоставленные пропы",
  "description": "Дизайн → нет в коде:\n• Variant — не найден в types.ts\n\nКод → нет в дизайне:\n• isPressed: boolean — активное нажатое состояние кнопки",
  "noExample": true,
  "source": "real"
}
```

   For `example`: use the exact `designName` values from the props array in the clipboard JSON. Choose the most visually meaningful variant. Use only props that exist in the clipboard JSON. `example` is optional — omit it if no specific prop combination applies.

   `techDescriptions` is omitted if `techComponents` was absent/empty in input. `propUpdates` and `unmatchedProps` are omitted if uif context was unavailable. All text (titles, descriptions) must be in Russian.

7. **Write results to files and clipboard:**
   - Reuse the project root determined in Step 1 for all `<project-root>` paths below.
   - Ensure `output/` folder exists: `powershell -command "New-Item -ItemType Directory -Force -Path '<project-root>/output' | Out-Null"`
   - Normalize component name to lowercase-hyphenated (e.g. "Action Button" → "action-button")
   - If input was read from clipboard (no file existed), save input JSON:
     - Determine filename: if `<project-root>/output/action-button.json` exists → use `action-button_2.json`, then `action-button_3.json`, etc.
     - Save using the Write tool to `<project-root>/output/{name}.json`
   - Save output JSON: determine filename similarly (if `<project-root>/output/action-button_htu.json` exists → `action-button_htu_2.json`), save using the Write tool to `<project-root>/output/{name}_htu.json`
   - Copy output to clipboard: `powershell -command "[System.IO.File]::ReadAllText('<project-root>/output/{name}_htu.json', [System.Text.Encoding]::UTF8) | Set-Clipboard; Write-Host 'OK'"` — if the command exits without printing `OK`, warn the user that clipboard copy failed but confirm the file was saved to `output/`.
   - If `unmatchedProps` is non-empty, print warning block (omit a section if that category is empty; if there are no unmatched props at all — no warning). Each entry goes on its own line with the relevant hint:
     ```
     ⚠️ Несопоставленные пропы:

     Дизайн → нет в коде:
       • {designName1} — {reason1}
       • {designName2} — {reason2}

     Код → нет в дизайне:
       • {codeOnlyProp1}: {type1} — {comment1}
       • {codeOnlyProp2}: {type2} — {comment2}

     Проверь вручную в плагине после импорта.
     ```
   - Confirm to the user: «JSON скопирован в буфер — нажми «Import How to use» в плагине»
