# /add-export-docs

Добавляет в плагин кнопку «Export docs» которая читает выделенные doc-фреймы Pixso и скачивает ZIP-архив с JSON-файлами для генератора сайта документации (`uif`-проект).

---

## Контекст

Плагин уже умеет генерировать doc-фреймы в Pixso. Теперь нужна обратная операция: читать готовые (валидированные дизайнером) фреймы и экспортировать из них JSON.

### Структура фреймов

**`How to use / {ComponentName}`** (например `How to use / dropdown`):
- Содержит `bodyFrame`
- В `bodyFrame` блоки с именами `section / {title}` и `idea / {title}`
- В каждом блоке:
  - `title` — TEXT-узел (через `findNodeByName(block, "title")`)
  - `item/info` — контейнер, внутри которого TEXT-узел с именем `"text"` содержит описание
  - **Важно:** читать через `findNodeByName(container, "text")`, а НЕ первый попавшийся TEXT-узел. Первый TEXT-узел в контейнере — это лейбл `"info"` (подпись), у него `characters = "info"`. Нужный узел называется `"text"`.

**`Doc / {ComponentName}`** (например `Doc / dropdown` или `Doc / dropdown item`):
- Содержит `bodyFrame`
  - `bodyFrame` → `navigation` (необязательно) + `"doc frame"` (внутренний фрейм)
  - `"doc frame"` → `section / purpose` + `prop / {designName}` (по одному на каждый проп)
- В блоке `section / purpose` — TEXT-узел с `name === "descriptionText"` (создаётся `fillPurposeBlock`)
- Блоки `prop / {designName}` — имя блока содержит дизайн-имя пропа (включая эмодзи-префиксы: `prop / ✏️ title`, `prop / 🔄 children`)

### Как определить главный компонент и технические

При экспорте используются ВСЕ `Doc / *` фреймы со СТРАНИЦЫ (не только выделение), которые начинаются с имени главного компонента.

- Имя главного компонента — из `How to use / *` в выделении: `"How to use / dropdown"` → `"dropdown"`
- Если в выделении нет `How to use / *` — берём самый короткий `Doc / *` из выделения
- `Doc / dropdown` — главный (его `descriptionText` → `componentDescription`)
- `Doc / dropdown item`, `Doc / dropdown item tree` — технические (находятся на странице автоматически)

---

## Выходные JSON-файлы

**`dropdown-overview.json`** (из Doc-фреймов):
```json
{
  "component": "dropdown",
  "frameType": "overview",
  "componentDescription": "...",
  "techDescriptions": {
    "dropdown item": "...",
    "dropdown item tree": "..."
  }
}
```

**`dropdown-how-to-use.json`** (из How to use фрейма):
```json
{
  "component": "dropdown",
  "frameType": "how-to-use",
  "sections": [
    { "title": "Одиночный выбор из списка", "description": "реальный текст из item/info → text" }
  ]
}
```

**`dropdown-props.json`** (из инспектора для главного компонента):
```json
{
  "component": "dropdown",
  "frameType": "props",
  "props": [
    {
      "designName": "variant",
      "codeName": "variant",
      "type": "enum",
      "description": "Функциональный тип компонента...",
      "values": ["singleChoice", "multipleChoice", "treeSingleChoice", "treeMultipleChoice", "withSubitems", "loading"],
      "default": null
    }
  ]
}
```

**`dropdown-item-props.json`**, **`dropdown-item-tree-props.json`** — для техкомпонентов (список дизайн-имён пропов из Doc-фрейма):
```json
{
  "component": "dropdown item",
  "frameType": "props",
  "propNames": ["variant", "state", "disabled", "✏️ title", "🔄 elementBefore", "closable"]
}
```

### ZIP-структура

```
dropdown.zip
  dropdown/
    dropdown-overview.json
    dropdown-how-to-use.json
    dropdown-props.json
    dropdown-item-props.json        (если есть техкомпоненты)
    dropdown-item-tree-props.json   (если есть техкомпоненты)
```

---

## Что нужно реализовать

### 1. Исправить readTextFromContainer (баг!)

Текущая реализация `readTextFromContainer` берёт первый попавшийся TEXT-узел рекурсивно. Это неверно — первый TEXT-узел в `item/info` это лейбл `"info"` с `characters = "info"`.

`setTextInNamedContainer` пишет в узел с именем `"text"` внутри контейнера. Читать нужно также:

```ts
function readTextFromContainer(parent: any, containerName: string): string {
  const container = findNodeByName(parent, containerName);
  if (!container) return "";
  // Ищем узел "text" — именно туда пишет setTextInNamedContainer
  const textNode = findNodeByName(container, "text");
  if (textNode && textNode.type === "TEXT") return textNode.characters || "";
  return "";
}
```

### 2. Добавить JSZip в ui/ui.html

Получи минифицированный JSZip через WebFetch: `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js`

Добавь содержимое inline в `ui/ui.html` перед закрывающим `</body>`:
```html
<script>
/* JSZip v3.10.1 minified */
...содержимое jszip.min.js...
</script>
```

### 3. Добавить кнопку в ui/ui.html

В панели `panel-table` (рядом с `copyJsonBtn`, `getKeyBtn`) добавить:
```html
<button id="exportDocsBtn">Export docs</button>
```

### 4. Обработчики в ui/index.js

Добавить получение элемента рядом с другими кнопками:
```js
const exportDocsBtn = document.getElementById('exportDocsBtn');
```

Добавить onclick:
```js
exportDocsBtn.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'export-docs' } }, '*');
};
```

Добавить в `window.onmessage`:
```js
if (msg.type === 'export-docs-result') {
  await downloadDocsZip(msg.component, msg.files);
  return;
}
```

Добавить функцию:
```js
async function downloadDocsZip(component, files) {
  // files: Array<{ filename: string, content: object }>
  if (!files || files.length === 0) {
    alert('Не найдено подходящих фреймов в выделении.\nВыдели фреймы "Doc / ..." и/или "How to use / ..." и попробуй снова.');
    return;
  }

  const zip = new JSZip();
  const folder = zip.folder(component);

  for (const file of files) {
    folder.file(file.filename, JSON.stringify(file.content, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${component}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 5. Добавить обработчик и функции в main.ts

В обработчик `pixso.ui.onmessage` добавить:
```ts
if (msg.type === "export-docs") {
  await exportDocs();
  return;
}
```

Добавить функции перед `pixso.ui.onmessage`:

```ts
async function exportDocs() {
  const selection = pixso.currentPage.selection as any[];

  if (!selection || selection.length === 0) {
    pixso.notify("Выдели фреймы документации для экспорта");
    return;
  }

  const howToUseFrame = selection.find((n: any) =>
    n.type === "FRAME" && /^How to use \/ /i.test(n.name)
  );

  const selectedDocFrames = selection.filter((n: any) =>
    n.type === "FRAME" && /^Doc \/ /i.test(n.name)
  );

  if (!howToUseFrame && selectedDocFrames.length === 0) {
    pixso.notify('Не найдено фреймов "Doc / ..." или "How to use / ..."');
    return;
  }

  // Определяем имя главного компонента
  let componentName: string;
  if (howToUseFrame) {
    componentName = howToUseFrame.name.replace(/^How to use \/ /i, "").trim();
  } else {
    const sorted = [...selectedDocFrames].sort((a: any, b: any) => a.name.length - b.name.length);
    componentName = sorted[0].name.replace(/^Doc \/ /i, "").trim();
  }

  // Ищем ВСЕ Doc-фреймы на странице, имя которых начинается с componentName
  const allPageDocFrames = (pixso.currentPage.children as any[]).filter((n: any) =>
    n.type === "FRAME" &&
    /^Doc \/ /i.test(n.name) &&
    n.name.replace(/^Doc \/ /i, "").trim().toLowerCase().startsWith(componentName.toLowerCase())
  );

  const files: Array<{ filename: string; content: object }> = [];

  // overview.json — из Doc-фреймов
  if (allPageDocFrames.length > 0) {
    const mainDocFrame = allPageDocFrames.find((n: any) =>
      n.name.replace(/^Doc \/ /i, "").trim().toLowerCase() === componentName.toLowerCase()
    ) ?? [...allPageDocFrames].sort((a: any, b: any) => a.name.length - b.name.length)[0];

    const techDocFrames = allPageDocFrames.filter((n: any) => n !== mainDocFrame);

    const componentDescription = readDescriptionText(mainDocFrame);
    const techDescriptions: Record<string, string> = {};

    for (const techFrame of techDocFrames) {
      const techName = techFrame.name.replace(/^Doc \/ /i, "").trim();
      const desc = readDescriptionText(techFrame);
      if (desc) techDescriptions[techName] = desc;
    }

    files.push({
      filename: `${componentName}-overview.json`,
      content: {
        component: componentName,
        frameType: "overview",
        componentDescription: componentDescription || "",
        ...(Object.keys(techDescriptions).length > 0 ? { techDescriptions } : {})
      }
    });

    // props.json для техкомпонентов — список дизайн-имён пропов из Doc-фрейма
    for (const techFrame of techDocFrames) {
      const techName = techFrame.name.replace(/^Doc \/ /i, "").trim();
      const techSlug = techName.toLowerCase().replace(/\s+/g, "-");
      const propNames = readPropNamesFromDocFrame(techFrame);
      if (propNames.length > 0) {
        files.push({
          filename: `${techSlug}-props.json`,
          content: {
            component: techName,
            frameType: "props",
            propNames
          }
        });
      }
    }
  }

  // how-to-use.json — из How to use фрейма
  if (howToUseFrame) {
    const sections = readHowToUseSections(howToUseFrame);
    files.push({
      filename: `${componentName}-how-to-use.json`,
      content: { component: componentName, frameType: "how-to-use", sections }
    });
  }

  // props.json — из lastInspectResult (если есть и совпадает главный компонент)
  if (lastInspectResult) {
    const inspectedName = (lastInspectResult.component || "").toLowerCase();
    if (inspectedName === componentName.toLowerCase()) {
      files.push({
        filename: `${componentName}-props.json`,
        content: buildPropsJson(componentName, lastInspectResult)
      });
    }
  }

  const fileCount = files.length;
  pixso.notify(`Экспортировано: ${componentName}.zip (${fileCount} ${fileCount === 1 ? "файл" : "файла"})`);

  pixso.ui.postMessage({
    type: "export-docs-result",
    component: componentName,
    files
  });
}

function buildPropsJson(componentName: string, inspectResult: InspectResult): object {
  const props = (inspectResult.props || []).map((p: NormalizedProp) => ({
    designName: p.designName || p.name,
    codeName: p.codeName || p.name,
    type: p.devType || p.designType || "unknown",
    description: p.description || "",
    values: p.values ?? null,
    default: p.defaultValue ?? null
  }));

  return {
    component: componentName,
    frameType: "props",
    props
  };
}

function readDescriptionText(docFrame: any): string {
  const bodyFrame = findNodeByName(docFrame, "bodyFrame");
  if (!bodyFrame) return "";
  const purposeBlock = findNodeByName(bodyFrame, "section / purpose");
  if (!purposeBlock) return "";
  const descNode = findNodeByName(purposeBlock, "descriptionText");
  if (descNode && descNode.type === "TEXT") return descNode.characters || "";
  return "";
}

function readPropNamesFromDocFrame(docFrame: any): string[] {
  const bodyFrame = findNodeByName(docFrame, "bodyFrame");
  if (!bodyFrame) return [];

  // Пропы лежат в "doc frame" (вложен в bodyFrame), названы "prop / {designName}"
  const innerDocFrame = findNodeByName(bodyFrame, "doc frame");
  const container = innerDocFrame || bodyFrame;

  const propNames: string[] = [];
  for (const child of (container.children || [])) {
    if (typeof child.name === "string" && child.name.startsWith("prop /")) {
      const propName = child.name.replace(/^prop \/ /i, "").trim();
      if (propName) propNames.push(propName);
    }
  }
  return propNames;
}

function readHowToUseSections(frame: any): Array<{ title: string; description: string }> {
  const bodyFrame = findNodeByName(frame, "bodyFrame");
  if (!bodyFrame) return [];

  const sections: Array<{ title: string; description: string }> = [];

  for (const child of (bodyFrame.children || [])) {
    if (
      typeof child.name === "string" &&
      (child.name.startsWith("section /") || child.name.startsWith("idea /"))
    ) {
      const titleNode =
        findNodeByName(child, "title") ||
        findNodeByName(child, "Header") ||
        findNodeByName(child, "text");
      const title = (titleNode?.type === "TEXT" ? titleNode.characters : "") || "";
      const description = readTextFromContainer(child, "item/info");
      sections.push({ title, description });
    }
  }

  return sections;
}

function readTextFromContainer(parent: any, containerName: string): string {
  const container = findNodeByName(parent, containerName);
  if (!container) return "";
  // Ищем узел "text" — именно туда пишет setTextInNamedContainer
  const textNode = findNodeByName(container, "text");
  if (textNode && textNode.type === "TEXT") return textNode.characters || "";
  return "";
}
```

---

## Примечание по пропам техкомпонентов

`propNames` читаются из блоков `prop / *` внутри `"doc frame"` (который лежит в `bodyFrame`).  
Имя пропа — это часть имени блока после `"prop / "`, например `prop / ✏️ title` → `✏️ title`.

Для **главного компонента** пропы берутся из `lastInspectResult` (нужен предварительный inspect).  
Для **техкомпонентов** пропы (только имена) берутся автоматически из Doc-фреймов на странице.

---

## Правила

- `findNodeByName`, `InspectResult`, `NormalizedProp` уже есть в `main.ts` — не дублировать
- Не ломать существующий функционал
- После изменений запустить `npm run build` и убедиться что сборка проходит без ошибок
