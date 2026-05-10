# uif Context for /generate-how-to-use — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `/generate-how-to-use` skill to read local `E:\DEV\uif` repo for accurate prop types and real-grounded section generation; add `output/` folder for persistent JSON storage; surface unmatched props in plugin UI.

**Architecture:** Three changes in parallel tracks: (1) skill markdown rewrite with uif reading + new JSON format, (2) `main.ts` import handler extended with `propUpdates` + `unmatchedProps`, (3) new plugin UI screen. All three communicate through the shared JSON format (`propUpdates`, `unmatchedProps`, `source` fields).

**Tech Stack:** Markdown skill (Claude Code), TypeScript (Pixso plugin main.ts), vanilla JS + HTML (plugin UI), PowerShell (clipboard/file ops)

---

## File Map

| File | Change |
|------|--------|
| `.claude/commands/generate-how-to-use.md` | Full rewrite: output/ folder, uif reading, three-tier sections, propUpdates, unmatchedProps |
| `main.ts` | `importHowToUse()`: handle `propUpdates` + suggested gray + send `unmatchedProps` in message |
| `ui/ui.html` | Add `panel-htu-unmatched` HTML |
| `ui/index.js` | Add panel to PANELS, handle `generation-finished` with unmatchedProps, copy button logic |

---

## Task 1: Update skill — output folder + file I/O

**File:** `.claude/commands/generate-how-to-use.md`

This task replaces Steps 1 and 7 of the skill. No code to test — verify manually by running the skill after Task 2.

- [ ] **Step 1: Replace Step 1 of skill (input resolution)**

Replace the current Step 1 with:

```markdown
1. **Determine input source** — Check the `output/` folder in the project root:
   - Run: `powershell -command "Get-ChildItem 'E:\DEV\pixso-ds-props-inspector\output\' -Filter '*.json' | Where-Object { $_.Name -notmatch '_htu\.json$' } | Select-Object -ExpandProperty Name"`
   - If the folder doesn't exist or is empty → read from clipboard: `powershell -command "Get-Clipboard"`
   - If one file found → use it: `[System.IO.File]::ReadAllText('E:\DEV\pixso-ds-props-inspector\output\{filename}', [System.Text.Encoding]::UTF8)`
   - If multiple files found → list them and ask: «Нашёл компоненты: button, action-button. Для какого генерируем?» — then read the chosen file
   - Parse JSON. Extract: `component`, `props`, `techComponents`, `userContext`
```

- [ ] **Step 2: Replace Step 7 of skill (file output)**

Replace the current Step 7 with:

```markdown
7. **Write results to files and clipboard:**
   - Determine project root: `git rev-parse --show-toplevel`
   - Ensure `output/` folder exists: `powershell -command "New-Item -ItemType Directory -Force -Path 'E:\DEV\pixso-ds-props-inspector\output' | Out-Null"`
   - If input was read from clipboard (no file existed), save input JSON:
     - Normalize component name to lowercase-hyphenated (e.g. "Action Button" → "action-button")
     - Determine filename: if `output/action-button.json` exists → use `action-button_2.json`, then `action-button_3.json`, etc.
     - Save: Write tool to `E:\DEV\pixso-ds-props-inspector\output\{name}.json`
   - Save output JSON to `E:\DEV\pixso-ds-props-inspector\output\{name}_htu.json` (same numbering if needed)
   - Copy output to clipboard: `powershell -command "[System.IO.File]::ReadAllText('E:\DEV\pixso-ds-props-inspector\output\{name}_htu.json', [System.Text.Encoding]::UTF8) | Set-Clipboard; Write-Host 'OK'"`
   - If `unmatchedProps` is non-empty, print warning block:
     ```
     ⚠️ Не удалось найти соответствие в uif для пропов: {designName1}, {designName2}
     Проверь вручную в плагине после импорта.
     ```
   - Confirm: «JSON скопирован в буфер — нажми «Import How to use» в плагине»
```

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/generate-how-to-use.md
git commit -m "feat: skill — output/ folder, file I/O for input and output JSONs"
```

---

## Task 2: Update skill — uif reading, three-tier sections, propUpdates

**File:** `.claude/commands/generate-how-to-use.md`

This is the main logic rewrite. Replaces Steps 2–6.

- [ ] **Step 1: Add uif reading step (new Step 2)**

Insert after the input parsing step:

```markdown
2. **Read uif repo for component context** — resolve path:
   ```
   E:\DEV\uif\packages\kaspersky-hexa-ui\src\{component-name-lowercase}\
   ```
   Examples: "Button" → `button`, "Action Button" → `action-button`, "Segmented Control" → `segmented-control`

   If the directory exists, read these files (use Read tool):
   - `types.ts` — TypeScript interfaces, JSDoc comments per prop, union type values
   - `*.stories.tsx` — `args` (default values) and `argTypes` (option lists per prop)
   - `__meta__/meta.json` — `usage` and `description` fields (informational context only)

   If directory not found → continue without uif context (all sections become `"suggested"`, skip `propUpdates`).

   For each name in `techComponents` (if present), also try to read:
   - `E:\DEV\uif\packages\kaspersky-hexa-ui\src\{tech-name-lowercase}\types.ts`
   - `E:\DEV\uif\packages\kaspersky-hexa-ui\src\{tech-name-lowercase}\__meta__\meta.json`
```

- [ ] **Step 2: Rewrite section generation step (Step 3 becomes Step 3+4+5)**

Replace current Steps 3–5 with:

```markdown
3. **Generate sections** — Produce 4–7 sections ordered by source tier. Each section has a `"source"` field:

   **user** (from `userContext`): If `userContext` was present, generate one section per case/sentence the designer wrote. These go first. Mark all as `"source": "user"`.

   **real** (from uif props): Based on `types.ts` and `*.stories.tsx`, generate sections for the most meaningful prop combinations. E.g. for Button: dangerFilled mode, loading state, icon variants. Use only values that actually exist in the types. Mark as `"source": "real"`.

   **suggested** (from web research): Run the same web searches as before (Carbon, MUI, Atlassian, Orbit, Kontur, etc.). Extract patterns NOT already covered by real sections. Mark as `"source": "suggested"`.

   Output order: user → real → suggested.

4. **Generate ideas** — Same three-tier split. 4–8 ideas. Edge cases, anti-patterns, accessibility.
   - `"source": "real"` — rules derivable from actual uif types (e.g. "loading и disabled нельзя одновременно если в types.ts оба boolean")
   - `"source": "suggested"` — from web research

5. **Generate descriptions:**
   - `componentDescription` — 3–5 sentences in Russian. Use uif `types.ts` as ground truth for what modes/sizes/props exist. Do not mention capabilities not present in the types.
   - `techDescriptions` — same approach, using tech component's types.ts if found.
```

- [ ] **Step 3: Add propUpdates and unmatchedProps building (new Step 6)**

```markdown
6. **Build propUpdates and unmatchedProps:**

   For each prop in the clipboard `props` array:
   - Take `codeName` (already mapped by propsDictionary in the plugin)
   - Search `types.ts` for a property with that exact name (case-sensitive first, then case-insensitive)
   - If found: extract TypeScript type annotation. Format as `"{codeName}: {Type}"` or `"{codeName}?: {Type}"` depending on whether it's optional
   - Add to `propUpdates`: `{ "designName": "{designName}", "codeProp": "{codeName}: {Type}" }`
   - If not found: add to `unmatchedProps`: `{ "designName": "{designName}", "codeName": "{codeName}", "reason": "не найден в types.ts" }`

   Additionally, find code props in `types.ts` that have no corresponding design prop (no match in clipboard `props` by codeName). Add these to `unmatchedProps` as:
   `{ "codeOnly": true, "codeName": "{propName}", "type": "{TypeAnnotation}" }`

   If uif context was unavailable, omit both `propUpdates` and `unmatchedProps` from output.
```

- [ ] **Step 4: Update JSON format documentation in skill**

Update the example JSON block in the skill to match the new format:

```json
{
  "component": "button",
  "componentDescription": "...",
  "techDescriptions": { "Icon": "..." },
  "sections": [
    { "title": "...", "description": "...", "example": { "Mode": "dangerFilled" }, "source": "real" },
    { "title": "...", "description": "...", "source": "suggested" }
  ],
  "ideas": [
    { "title": "...", "description": "...", "source": "suggested" }
  ],
  "propUpdates": [
    { "designName": "Mode", "codeProp": "mode: ButtonMode" },
    { "designName": "Size", "codeProp": "size?: ButtonSize" }
  ],
  "unmatchedProps": [
    { "designName": "Variant", "codeName": "variant", "reason": "не найден в types.ts" },
    { "codeOnly": true, "codeName": "isPressed", "type": "boolean" }
  ]
}
```

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/generate-how-to-use.md
git commit -m "feat: skill — uif reading, three-tier sections, propUpdates, unmatchedProps"
```

---

## Task 3: main.ts — handle propUpdates + suggested gray background

**File:** `main.ts`, function `importHowToUse` (line ~1729)

No unit tests possible (plugin runs in Pixso sandbox). Verify manually in Pixso after Task 5.

- [ ] **Step 1: Add propUpdates handling inside importHowToUse**

After the `techDescriptions` block (around line 1868), add:

```typescript
// Apply propUpdates: update item/dev text in all doc frames
if (data.propUpdates && Array.isArray(data.propUpdates)) {
  const docFrameNames = [
    `Doc / ${componentName}`,
    ...(data.techDescriptions ? Object.keys(data.techDescriptions).map(t => `Doc / ${t}`) : [])
  ];

  for (const docFrameName of docFrameNames) {
    const docFrame = pixso.currentPage.children.find(
      (n: any) => n.name === docFrameName && n.type === "FRAME"
    ) as any;
    if (!docFrame) continue;

    const bodyFrame = findNodeByName(docFrame, "bodyFrame");
    if (!bodyFrame) continue;
    const innerDocFrame = findNodeByName(bodyFrame, "doc frame");
    const container = innerDocFrame || bodyFrame;

    for (const update of data.propUpdates) {
      const blockName = `prop / ${update.designName}`;
      const propBlock = (container.children || []).find(
        (n: any) => n.name === blockName
      );
      if (!propBlock) continue;

      const devContainer = findNodeByName(propBlock, "item/dev");
      if (!devContainer) continue;
      const textNode = findNodeByName(devContainer, "text");
      if (!textNode || textNode.type !== "TEXT") continue;
      await loadTextNodeFontSafe(textNode);
      textNode.characters = update.codeProp;
    }
  }
}
```

- [ ] **Step 2: Fix gray background to use source field for sections**

In the sections loop (around line 1773), change from always-no-fill to source-based fill:

```typescript
// After: bodyFrame.appendChild(block, false);
// Add:
if (section.source === "suggested") {
  block.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.96 } }];
}
```

- [ ] **Step 3: Fix gray background for ideas to use source field**

In the ideas loop (around line 1817), change from always-gray to source-based:

```typescript
// Replace:
//   block.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.96 } }];
// With:
if (idea.source === "suggested" || !idea.source) {
  // backwards-compatible: ideas without source field keep gray background
  block.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.96 } }];
}
```

- [ ] **Step 4: Send unmatchedProps in generation-finished message**

In the `onmessage` handler (around line 2200), change `import-how-to-use` case:

```typescript
if (msg.type === "import-how-to-use") {
  await importHowToUse(msg.data);
  const unmatchedProps = msg.data?.unmatchedProps ?? [];
  pixso.ui.postMessage({ type: "generation-finished", unmatchedProps });
  return;
}
```

- [ ] **Step 5: Commit**

```bash
git add main.ts
git commit -m "feat: importHowToUse — propUpdates, source-based gray, unmatchedProps in message"
```

---

## Task 4: Plugin UI — unmatched props screen

**Files:** `ui/ui.html`, `ui/index.js`

- [ ] **Step 1: Add panel HTML to ui.html**

After the `panel-htu-import` closing `</div>` (around line 617), add:

```html
<!-- HOW-TO-USE UNMATCHED PROPS -->
<div id="panel-htu-unmatched" class="panel">
  <div class="panel-content">
    <div class="component-header">
      <div class="component-name">Несопоставленные пропы</div>
    </div>
    <p class="panel-descriptor">Агент не нашёл соответствие для этих пропов. Проверь вручную.</p>

    <div id="unmatchedDesignList" style="margin-top:16px">
      <div class="component-name" style="font-size:12px;margin-bottom:6px">Дизайн → нет в коде</div>
      <div id="unmatchedDesignItems"></div>
    </div>

    <div id="unmatchedCodeList" style="margin-top:16px">
      <div class="component-name" style="font-size:12px;margin-bottom:6px">Код → нет в дизайне</div>
      <div id="unmatchedCodeItems"></div>
    </div>
  </div>
  <div class="footer">
    <button id="unmatchedCopyBtn">Скопировать список</button>
    <button id="unmatchedDoneBtn" class="primary">Готово</button>
  </div>
</div>
```

- [ ] **Step 2: Add panel to PANELS array and wire up buttons in ui/index.js**

At the top of `ui/index.js` (line 2), add `'htu-unmatched'` to PANELS:

```javascript
const PANELS = ['idle', 'table', 'tech-components', 'confirm', 'htu-prompt', 'htu-context', 'htu-import', 'htu-unmatched', 'loading'];
```

After the `htuCancelBtn.onclick` line (around line 240), add button wiring:

```javascript
// ─── Unmatched props screen ───────────────────────────────────────────────────
const unmatchedDoneBtn = document.getElementById('unmatchedDoneBtn');
const unmatchedCopyBtn = document.getElementById('unmatchedCopyBtn');

unmatchedDoneBtn.onclick = () => showPanel('table');

unmatchedCopyBtn.onclick = async () => {
  const designItems = document.getElementById('unmatchedDesignItems').innerText;
  const codeItems = document.getElementById('unmatchedCodeItems').innerText;
  const text = `Дизайн → нет в коде:\n${designItems}\n\nКод → нет в дизайне:\n${codeItems}`;
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};
```

- [ ] **Step 3: Handle generation-finished with unmatchedProps in ui/index.js**

Find the `generation-finished` handler (around line 331) and replace it:

```javascript
if (msg.type === 'generation-finished') {
  if (pendingAction === 'full-doc') {
    showPanel('htu-prompt');
  } else if (pendingAction === 'how-to-use') {
    const unmatched = msg.unmatchedProps || [];
    if (unmatched.length > 0) {
      // Populate lists
      const designItems = document.getElementById('unmatchedDesignItems');
      const codeItems = document.getElementById('unmatchedCodeItems');

      const designOnly = unmatched.filter(u => !u.codeOnly);
      const codeOnly = unmatched.filter(u => u.codeOnly);

      designItems.innerHTML = designOnly.length
        ? designOnly.map(u => `<div style="padding:2px 0">• ${u.designName} <span style="color:#888">(codeName: ${u.codeName})</span></div>`).join('')
        : '<div style="color:#888">—</div>';

      codeItems.innerHTML = codeOnly.length
        ? codeOnly.map(u => `<div style="padding:2px 0">• ${u.codeName}: <span style="color:#888">${u.type}</span></div>`).join('')
        : '<div style="color:#888">—</div>';

      showPanel('htu-unmatched');
    } else {
      showPanel('table');
    }
  } else {
    showPanel('table');
  }
  pendingAction = null;
  return;
}
```

- [ ] **Step 4: Commit**

```bash
git add ui/ui.html ui/index.js
git commit -m "feat: add htu-unmatched screen for surfacing unmatched props after import"
```

---

## Task 5: Create output/ folder and update .gitignore

- [ ] **Step 1: Create output/ folder with .gitkeep**

```bash
mkdir -p output
touch output/.gitkeep
```

- [ ] **Step 2: Add output/ JSON files to .gitignore**

Open `.gitignore` and add:

```
output/*.json
```

(Keep `output/.gitkeep` tracked so the folder is committed.)

- [ ] **Step 3: Commit**

```bash
git add output/.gitkeep .gitignore
git commit -m "chore: add output/ folder for persistent JSON storage"
```

---

## Verification checklist (manual, in Pixso)

After all tasks:

- [ ] First run: skill reads from clipboard, saves input to `output/button.json` and output to `output/button_htu.json`
- [ ] Second run: skill finds `output/button.json`, uses it automatically (no clipboard needed)
- [ ] Multiple files in output/ → skill asks which component
- [ ] Skill reads `E:\DEV\uif\packages\kaspersky-hexa-ui\src\button\types.ts` and generates `propUpdates`
- [ ] After import: Item Dev in prop blocks shows `mode: ButtonMode` (not just `mode`)
- [ ] Sections with `source: "suggested"` have gray background; `source: "real"` have no fill
- [ ] After import with unmatchedProps: plugin shows unmatched screen with two lists
- [ ] «Скопировать список» puts both lists as text in clipboard
- [ ] «Готово» goes to props table
- [ ] Component with no uif directory: skill completes without error, no propUpdates in output
- [ ] Skill output saved to `output/button_htu.json`
