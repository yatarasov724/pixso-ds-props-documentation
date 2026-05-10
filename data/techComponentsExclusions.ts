/**
 * Список компонентов, которые исключаются из предложения технической документации.
 * Сюда вносятся публичные компоненты библиотеки, которые могут быть вложены
 * в инспектируемый компонент, но документировать их как технические не нужно.
 *
 * Matching: точное совпадение или startsWith без учёта регистра.
 *
 * Источник: KasperskyLab Hexa UI (https://github.com/KasperskyLab/uif)
 */
export const techComponentsExclusions: string[] = [
  // ── Hexa UI components ──────────────────────────────────────────────────────
  
  "accordion",
  "action button",
  "alert",
  "anchor links",
  "badge",
  "breadcrumbs",
  "button",
  "calendar",
  "card",
  "checkbox",
  "chip",
  "divider",
  "dropdown",
  "elevation",
  "focus",
  "help message",
  "indicator",
  "information card",
  "input code viewer",
  "input datetime picker",
  "input multi select",
  "input number",
  "input password",
  "input search",
  "input select",
  "input text",
  "input textarea",
  "label",
  "link",
  "loader",
  "lock group",
  "menu",
  "modal",
  "overlay",
  "page header",
  "pagination",
  "placeholder",
  "popover",
  "progress bar",
  "radio",
  "scrollbar",
  "section message",
  "segmented button",
  "segmented control",
  "sidebar",
  "status card",
  "status",
  "submenu",
  "table",
  "tabs",
  "tag",
  "text",
  "toast",
  "toggle",
  "toolbar",
  "tooltip",
  "tree",
  "upload",
  "wizard",

  // ── Дополнительные общие исключения ─────────────────────────────────────────
  
];
