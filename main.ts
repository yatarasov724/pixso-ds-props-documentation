import { propsDictionary } from "./data/propsDictionary";
import { techComponentsExclusions } from "./data/techComponentsExclusions";
import { propSynonyms } from "./data/propSynonyms";

const COMPONENT_KEY_CONTENT_BLOCK = "8bb51a4f746fb998f6523b6f89c04e597becbcf5";
const COMPONENT_KEY_DOC_HEADER     = "49967266e8fbba936b4a912914c13cf9489c48f7";
const COMPONENT_KEY_DOC_NAVIGATION = "8a65e5fafe88b6af52ad98fbd61328d6a2b5a9a3";
const COMPONENT_KEY_STATUS_NAV     = "f655783c1ad8308b15390a496fc689b576c69a0d";
const COMPONENT_KEY_DOC_LAYOUT     = "1e2dbb8226da6142285fefddd43c4c062aed6579";

pixso.showUI(__html__, { width: 720, height: 560 });

type NormalizedProp = {
  rawVariantOptions: string[] | null;
  rawPixsoName: string;
  pixsoName: string;
  name: string;
  designName: string;
  codeName: string;
  designType: string;
  devType: string;
  description: string;
  category: string;
  values: string[] | null;
  defaultValue: any;
  status: string;
  suggestedName: string | null;
  dictionaryIndex: number | null;
};

type InspectResult = {
  component: string | null;
  type: string | null;
  description: string;
  props: NormalizedProp[];
  validation: {
    total: number;
    ok: number;
    review: number;
    wrongCase: number;
    unknown: number;
  };
};

let lastInspectResult: InspectResult | null = null;
let lastInspectedNode: any = null;

let variantIndexCache = new Map<any, any[]>();
let defaultPropsCache: Record<string, any> | null = null;
let variantResolverCache = new Map<any, Map<string, any>>();

const loadedFonts = new Set<string>();

function cleanPropName(name: string): string {
  return String(name).split("#")[0].trim();
}

function normalizePixsoName(name: string): string {
  const cleaned = cleanPropName(name);
  if (cleaned.startsWith(" ")) {
    return cleaned.replace(" ", "").trim();
  }
  return cleaned;
}

function matchesDictionaryByPixsoType(dict: any, propData: any): boolean {
  const designType = String(propData?.type || "").toUpperCase();
  const category = String(dict?.category || "").toLowerCase();
  const devType = String(dict?.type || "").toLowerCase();

  // Все slot-похожие пропы в Pixso
  if (
    designType === "INSTANCE_SWAP" ||
    designType === "TEXT" ||
    designType === "VARIANT"
  ) {
    return category === "slot" || devType === "reactnode";
  }

  // Все visibility-похожие пропы в Pixso
  if (designType === "BOOLEAN") {
    return category === "visibility" || devType === "boolean";
  }

  return true;
}

function getAltDictionaryKey(name: string): string | null {
  if (!name) return null;

  const first = name.charAt(0);
  const upperFirst = first.toUpperCase() + name.slice(1);

  if (upperFirst !== name) return upperFirst;

  const lowerFirst = first.toLowerCase() + name.slice(1);
  if (lowerFirst !== name) return lowerFirst;

  return null;
}

function getDictionaryVariants() {
  return Object.entries(propsDictionary).flatMap(([key, value]) => {
    const item = value as any;

    if (item?.variants) {
      return Object.entries(item.variants).map(([variantKey, variantValue]) => ({
        dictKey: key,
        variantKey,
        item: variantValue,
      }));
    }

    return [
      {
        dictKey: key,
        variantKey: null,
        item,
      },
    ];
  });
}

function stripSeparators(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, "");
}

function findDictionaryEntry(pixsoName: string, normalizedName: string, propData: any) {
  const lowerPixso = pixsoName.toLowerCase();
  const lowerNormalized = normalizedName.toLowerCase();
  const strippedPixso = stripSeparators(pixsoName);
  const allEntries = getDictionaryVariants();
  const dictionaryKeys = Object.keys(propsDictionary);

  const matchedCandidates = allEntries.filter(({ dictKey, item }) => {
    return (
      String(dictKey).toLowerCase() === lowerPixso ||
      String(dictKey).toLowerCase() === lowerNormalized ||
      String(item.designName).toLowerCase() === lowerPixso ||
      String(item.designName).toLowerCase() === lowerNormalized ||
      String(item.codeName).toLowerCase() === lowerPixso ||
      String(item.codeName).toLowerCase() === lowerNormalized ||
      // пробелы/дефисы/подчёркивания: "element before" → "elementbefore"
      stripSeparators(String(dictKey)) === strippedPixso ||
      stripSeparators(String(item.designName)) === strippedPixso ||
      stripSeparators(String(item.codeName)) === strippedPixso
    );
  });

  const matched =
    matchedCandidates.find(({ item }) =>
      matchesDictionaryByPixsoType(item, propData)
    ) || matchedCandidates[0];

  if (!matched) {
    // Synonym lookup: ищем по таблице синонимов → REVIEW
    for (const { dictKey, item } of allEntries) {
      const syns = propSynonyms[dictKey];
      if (!syns) continue;
      const hit = syns.some(s => {
        const sl = s.toLowerCase();
        return sl === lowerPixso || sl === lowerNormalized || stripSeparators(s) === strippedPixso;
      });
      if (hit && matchesDictionaryByPixsoType(item, propData)) {
        const dictionaryIndex = dictionaryKeys.indexOf(dictKey);
        return { dict: item, status: "REVIEW", suggestedName: item.designName, dictionaryIndex };
      }
    }
    return null;
  }

  const { dictKey, item } = matched;
  const dictionaryIndex = dictionaryKeys.indexOf(dictKey);

  if (pixsoName === item.designName) {
    return {
      dict: item,
      status: "OK",
      suggestedName: item.designName,
      dictionaryIndex,
    };
  }

  if (pixsoName.toLowerCase() === String(item.designName).toLowerCase()) {
    return {
      dict: item,
      status: "WRONG_CASE",
      suggestedName: item.designName,
      dictionaryIndex,
    };
  }

  return {
    dict: item,
    status: "REVIEW",
    suggestedName: item.designName,
    dictionaryIndex,
  };
}

function hasSlotIcon(rawPixsoName: string): boolean {
  return String(rawPixsoName).trim().startsWith("🔄");
}

function getNameTypeConsistencyStatus(rawPixsoName: string, propData: any) {
  const withIcon = hasSlotIcon(rawPixsoName);
  const designType = String(propData?.type || "").toUpperCase();

  if (withIcon && designType !== "INSTANCE_SWAP") {
    return {
      status: "REVIEW",
      reason: "Slot prop with icon must use INSTANCE_SWAP",
    };
  }

  if (!withIcon && designType === "INSTANCE_SWAP") {
    return {
      status: "REVIEW",
      reason: "INSTANCE_SWAP prop must have slot icon",
    };
  }

  return null;
}

function getPropValues(propData: any): string[] | null {
  const designType = String(propData?.type || "").toUpperCase();
  const options = propData?.variantOptions;

  // 1. VARIANT с true/false → boolean
  if (Array.isArray(options) && options.length) {
    const normalized = options.map((v: any) => String(v).toLowerCase());

    const isBooleanLike =
      normalized.length === 2 &&
      normalized.includes("true") &&
      normalized.includes("false");

    if (isBooleanLike) {
      return ["boolean"];
    }

    return options.map((v: any) => String(v));
  }

  // 2. Чистые типы
  if (designType === "BOOLEAN") {
    return ["boolean"];
  }

  if (designType === "TEXT") {
    return ["string"];
  }

  if (designType === "INSTANCE_SWAP") {
    return ["swap instance"];
  }

  return null;
}

function normalizeProp(propName: string, propData: any): NormalizedProp {
  const rawPixsoName = String(propName);
  const pixsoName = cleanPropName(propName);
  const normalizedName = normalizePixsoName(pixsoName);
  const match = findDictionaryEntry(pixsoName, normalizedName, propData);
  const dict = match?.dict;
  const consistencyIssue = getNameTypeConsistencyStatus(rawPixsoName, propData);

  return {
    rawPixsoName,
    pixsoName,
    name: normalizedName,
    designName: dict?.designName || normalizedName,
    codeName: dict?.codeName || normalizedName,
    designType: propData?.type || "UNKNOWN",
    devType: dict?.type || "",
    description: dict?.description || "",
    category: dict?.category || "",
    values: getPropValues(propData),
    rawVariantOptions: Array.isArray(propData?.variantOptions)
    ? propData.variantOptions.map((v: any) => String(v))
    : null,
    defaultValue:
      propData?.defaultValue !== undefined ? propData.defaultValue : null,
    status: consistencyIssue?.status || match?.status || "UNKNOWN",
    suggestedName: match?.suggestedName || null,
    dictionaryIndex: match?.dictionaryIndex ?? null,
  };
}

function getPropSortWeight(prop: NormalizedProp): number {
  const designType = String(prop.designType || "").toUpperCase();

  if (prop.values && prop.values.length && !isBooleanLikeProp(prop)) return 1;
  if (isBooleanLikeProp(prop)) return 2;
  if (designType === "TEXT") return 3;
  if (designType === "INSTANCE_SWAP") return 4;

  return 99;
}

function inspectNode(node: any): InspectResult {
  const propDefinitions = node.componentPropertyDefinitions || {};

  const props = Object.entries(propDefinitions)
    .map(([name, data]) => normalizeProp(name, data))
    .sort((a, b) => {
      const aIndex = a.dictionaryIndex ?? Number.MAX_SAFE_INTEGER;
      const bIndex = b.dictionaryIndex ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });

  const validation = {
    total: props.length,
    ok: props.filter((p) => p.status === "OK").length,
    review: props.filter((p) => p.status === "REVIEW").length,
    wrongCase: props.filter((p) => p.status === "WRONG_CASE").length,
    unknown: props.filter((p) => p.status === "UNKNOWN").length,
  };

  return {
    component: node.name || null,
    type: node.type || null,
    description: node.description || "",
    props,
    validation,
  };
}

function inspectSelectedNode() {
  const selection = pixso.currentPage.selection;

  if (!selection.length) {
    pixso.notify("Выберите компонент");
    pixso.ui.postMessage({
      type: "result",
      data: { error: "Ничего не выбрано" },
    });
    return;
  }

  let node = selection[0] as any;
  if (node.type === "INSTANCE" && node.mainComponent) {
    const main = node.mainComponent;
    node = main.parent?.type === "COMPONENT_SET" ? main.parent : main;
  }
  lastInspectedNode = node;
  lastInspectResult = inspectNode(node);

  defaultPropsCache = lastInspectResult.props.reduce((acc, p) => {
    acc[p.pixsoName] = p.defaultValue;
    return acc;
  }, {} as Record<string, any>);

  pixso.ui.postMessage({
    type: "result",
    data: lastInspectResult,
  });
}

async function loadTextNodeFontSafe(node: TextNode) {
  try {
    const fontKey = JSON.stringify(node.fontName);

    if (loadedFonts.has(fontKey)) {
      return;
    }

    await pixso.loadFontAsync(node.fontName as FontName);
    loadedFonts.add(fontKey);
  } catch (e) {
    console.log("Font load error", e);
  }
}

function findNodeByName(root: any, name: string): any | null {
  if (!root) return null;
  if (root.name === name) return root;

  const children = root.children;
  if (!children || !Array.isArray(children)) return null;

  for (const child of children) {
    const found = findNodeByName(child, name);
    if (found) return found;
  }

  return null;
}

function getCachedVariants(sourceNode: any): any[] {
  if (!sourceNode || sourceNode.type !== "COMPONENT_SET") return [];

  if (variantIndexCache.has(sourceNode)) {
    return variantIndexCache.get(sourceNode) || [];
  }

  const variants = Array.isArray(sourceNode.children) ? sourceNode.children : [];
  variantIndexCache.set(sourceNode, variants);

  return variants;
}

function buildVariantResolverKey(props: Record<string, any>) {
  return Object.entries(props)
    .filter(([, value]) => value !== null && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value).toLowerCase()}`)
    .join("|");
}

function getVariantResolver(sourceNode: any) {
  if (!sourceNode || sourceNode.type !== "COMPONENT_SET") return null;

  if (variantResolverCache.has(sourceNode)) {
    return variantResolverCache.get(sourceNode);
  }

  const resolver = new Map<string, any>();
  const variants = getCachedVariants(sourceNode);

  for (const variant of variants) {
    const name = String(variant.name || "");
    const parts = name.split(",");

    const props: Record<string, any> = {};

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (!key || value === undefined) continue;
      props[key.trim()] = value.trim().toLowerCase();
    }

    const key = buildVariantResolverKey(props);
    resolver.set(key, variant);
  }

  variantResolverCache.set(sourceNode, resolver);
  return resolver;
}

type StyledTextPayload = {
  text: string;
  boldRanges?: Array<{ start: number; end: number }>;
};

const loadedBoldFonts = new Set<string>();

async function setTextInNamedContainer(
  root: any,
  containerName: string,
  payload: string | StyledTextPayload
) {
  const container = findNodeByName(root, containerName);
  if (!container) return;

  const textNode = findNodeByName(container, "text") as TextNode | null;
  if (!textNode) return;

  await loadTextNodeFontSafe(textNode);

  const value =
    typeof payload === "string"
      ? { text: payload, boldRanges: [] }
      : payload;

  textNode.characters = value.text || "";

  if (!value.boldRanges?.length) return;

  const currentFont = textNode.fontName as FontName;
  const boldFont: FontName = {
    family: currentFont.family,
    style: "Bold",
  };

  try {
    const boldKey = JSON.stringify(boldFont);

    if (!loadedBoldFonts.has(boldKey)) {
      await pixso.loadFontAsync(boldFont);
      loadedBoldFonts.add(boldKey);
    }

    for (const range of value.boldRanges) {
      if (range.start < range.end) {
        textNode.setRangeFontName(range.start, range.end, boldFont);
      }
    }
  } catch (e) {
    console.log("Bold font load error", e);
  }
}

function isBooleanLikeProp(prop: NormalizedProp): boolean {
  const designType = String(prop.designType || "").toUpperCase();
  const devType = String(prop.devType || "").toLowerCase();

  if (designType === "BOOLEAN") return true;
  if (devType === "boolean") return true;

  if (prop.rawVariantOptions && prop.rawVariantOptions.length === 2) {
    const normalized = prop.rawVariantOptions
      .map((v) => String(v).toLowerCase())
      .sort();

    return normalized[0] === "false" && normalized[1] === "true";
  }

  return false;
}

function getDesignTypeLabel(prop: NormalizedProp): string {
  const type = String(prop.designType || "").toUpperCase();

  if (isBooleanLikeProp(prop)) return "[boolean]";
  if (type === "TEXT") return "[string]";
  if (type === "INSTANCE_SWAP") return "[swap instance]";

  if (prop.values && prop.values.length) {
    return `[${prop.values.join(", ")}]`;
  }

  return "[string]";
}

function buildDesignText(prop: NormalizedProp): StyledTextPayload {
  const propName = prop.designName || prop.name;
  const typeLabel = getDesignTypeLabel(prop);
  const descriptor = prop.description || "";

  const head = `${propName} ${typeLabel}`;
  const text = descriptor ? `${head}: ${descriptor}` : head;

  return {
    text,
    boldRanges: [
      { start: 0, end: propName.length },
      { start: propName.length + 1, end: head.length },
    ],
  };
}

function buildDevText(prop: NormalizedProp): StyledTextPayload {
  const propName = prop.codeName || prop.name;
  const designType = String(prop.designType || "").toUpperCase();
  const devType = String(prop.devType || "").trim();

  let typeLabel = "";

  // 1. Главный источник истины для dev — словарь
  if (devType) {
    const normalizedDevType = devType.toLowerCase();

    if (normalizedDevType === "string") {
      typeLabel = "[string]";
    } else if (normalizedDevType === "boolean") {
      typeLabel = "[boolean]";
    } else if (normalizedDevType === "reactnode") {
      typeLabel = "[ReactNode]";
    } else {
      typeLabel = `[${devType}]`;
    }
  }
  // 2. Fallback только если в словаре типа нет
  else if (isBooleanLikeProp(prop)) {
    typeLabel = "";
  } else if (prop.values && prop.values.length) {
    typeLabel = `[${prop.values.join(", ")}]`;
  } else if (designType === "INSTANCE_SWAP") {
    typeLabel = "[ReactNode]";
  } else if (designType === "TEXT") {
    typeLabel = "[string]";
  }

  const head = typeLabel ? `${propName} ${typeLabel}` : propName;

  return {
    text: head,
    boldRanges: typeLabel
      ? [
          { start: 0, end: propName.length },
          { start: propName.length + 1, end: head.length },
        ]
      : [{ start: 0, end: propName.length }],
  };
}

function buildCodePropPayload(codeProp: string): StyledTextPayload {
  const colonIdx = codeProp.indexOf(":");
  if (colonIdx === -1) {
    return { text: codeProp, boldRanges: [{ start: 0, end: codeProp.length }] };
  }
  const namePart = codeProp.slice(0, colonIdx);
  const typePart = codeProp.slice(colonIdx + 1).trim();
  const typeStart = typePart ? codeProp.indexOf(typePart, colonIdx) : -1;
  return {
    text: codeProp,
    boldRanges: [
      { start: 0, end: namePart.length },
      ...(typeStart !== -1 ? [{ start: typeStart, end: codeProp.length }] : []),
    ],
  };
}

function buildInfoText(prop: NormalizedProp): string {
  const parts: string[] = [];

  if (prop.category) parts.push(`Category: ${prop.category}`);
  if (prop.status) parts.push(`Status: ${prop.status}`);
  if (prop.suggestedName && prop.suggestedName !== prop.designName) {
    parts.push(`Suggested: ${prop.suggestedName}`);
  }

  return parts.join(" · ");
}

function getDemoValues(prop: NormalizedProp): string[] {
  if (isBooleanLikeProp(prop)) {
    return ["true", "false"];
  }

  if (prop.rawVariantOptions && prop.rawVariantOptions.length) {
    return prop.rawVariantOptions.map(String);
  }

  if (prop.values && prop.values.length) {
    return prop.values.map(String);
  }

  return [];
}

async function buildPropDemos(blockRoot: any, prop: NormalizedProp, sourceNode: any) {

  const leftSection = findNodeByName(blockRoot, "leftSection");
  if (!leftSection) return;

  const demoTemplate = findNodeByName(leftSection, "block");
  if (!demoTemplate) return;

  const values = getDemoValues(prop);
  if (!values.length) return;

  const templateClone = typeof demoTemplate.clone === "function"
  ? demoTemplate.clone()
  : null;

  if (!templateClone) return;

  // очищаем leftSection
  const children = [...leftSection.children];
  for (const child of children) {
  if (child.name === "block") {
    child.remove();
  }
}

  for (const value of values) {

    const row = typeof templateClone.clone === "function"
      ? templateClone.clone()
      : null;

    if (!row) continue;

  await fillDemoRow(row, prop, value, sourceNode);

    leftSection.appendChild(row, false);
  }

    if (typeof templateClone.remove === "function") {
    templateClone.remove();
  }
}

function createDemoInstance(sourceNode: any, prop?: NormalizedProp, value?: string, extraOverrides?: Record<string, any>) {
  if (!sourceNode) return null;

  if (sourceNode.type === "COMPONENT_SET") {
    const variants = getCachedVariants(sourceNode);
    const resolver = getVariantResolver(sourceNode);

    const defaults = defaultPropsCache || {};

    const target = defaults ? { ...defaults } : {};

  if (prop && value !== undefined) {
    target[prop.pixsoName] =
      value === "true" ? true :
      value === "false" ? false :
      value;
  }

  if (extraOverrides) {
    for (const [k, v] of Object.entries(extraOverrides)) {
      target[k] = v;
    }
  }

    const resolverKey = buildVariantResolverKey(target);
  const resolvedVariant = resolver?.get(resolverKey);

  if (resolvedVariant && typeof resolvedVariant.createInstance === "function") {
    return resolvedVariant.createInstance();
  }

    const scoreVariant = (variant: any) => {
      const name = String(variant.name || "").toLowerCase();
      let score = 0;

      for (const [key, val] of Object.entries(target)) {
        const expected = `${String(key).toLowerCase()}=${String(val).toLowerCase()}`;
        const expectedAlt = `${String(key).toLowerCase()} = ${String(val).toLowerCase()}`;

        if (name.includes(expected) || name.includes(expectedAlt)) {
          score += 1;
        }
      }

      return score;
    };

    const matchedVariant =
      variants
        .map((variant: any) => ({ variant, score: scoreVariant(variant) }))
        .sort((a: any, b: any) => b.score - a.score)[0]?.variant || variants[0];

    if (matchedVariant && typeof matchedVariant.createInstance === "function") {
      return matchedVariant.createInstance();
    }
  }

  if (sourceNode.type === "COMPONENT" && typeof sourceNode.createInstance === "function") {
    return sourceNode.createInstance();
  }

  return null;
}

function getCachedNode(cache: Map<string, any>, root: any, name: string) {
  if (cache.has(name)) {
    return cache.get(name);
  }

  const node = findNodeByName(root, name);
  cache.set(name, node);

  return node;
}

function getPropBlockNodes(block: any) {
  const cache = new Map<string, any>();

  return {
    title:
      getCachedNode(cache, block, "title") ||
      getCachedNode(cache, block, "Header") ||
      getCachedNode(cache, block, "text"),

    design: getCachedNode(cache, block, "item/design"),
    dev: getCachedNode(cache, block, "item/dev"),
    info: getCachedNode(cache, block, "item/info"),
  };
}

async function fillDemoRow(row: any, prop: NormalizedProp, value: string, sourceNode: any) {
  const nodeCache = new Map<string, any>();

  const demoDescriptor =
  getCachedNode(nodeCache, row, "description") ||
  getCachedNode(nodeCache, row, "demoDescription");

  if (demoDescriptor && "visible" in demoDescriptor) {
    demoDescriptor.visible = true;
  }

  const textNode = demoDescriptor
    ? getCachedNode(nodeCache, demoDescriptor, "text")
    : null;

  if (textNode && "visible" in textNode) {
    textNode.visible = true;
  }

  if (textNode && textNode.type === "TEXT") {
    await loadTextNodeFontSafe(textNode);
    textNode.characters = `${prop.designName || prop.name} = ${value}`;
  }

  const demoPlaceholder =
  getCachedNode(nodeCache, row, "demo-placeholder") ||
  getCachedNode(nodeCache, row, "demoPlaceholder");

  const instance = createDemoInstance(sourceNode, prop, value);

  if (instance && typeof instance.setProperties === "function") {
  const instanceProps = instance.componentProperties || {};
  const resolvedPropKey =
    Object.keys(instanceProps).find((key) => key === prop.pixsoName) ||
    Object.keys(instanceProps).find((key) => key.startsWith(`${prop.pixsoName}#`));

  if (resolvedPropKey) {
    const parsedValue =
      value === "true" ? true :
      value === "false" ? false :
      value;

    instance.setProperties({
      [resolvedPropKey]: parsedValue
    });
  }
}

  if (demoPlaceholder && demoPlaceholder.parent && instance) {
  const parent = demoPlaceholder.parent;

    if (typeof demoPlaceholder.remove === "function") {
      demoPlaceholder.remove();
    }

    if (typeof parent.appendChild === "function") {
      parent.appendChild(instance, false);
    }
  }
}

async function fillPropBlock(block: any, prop: NormalizedProp, sourceNode: any) {
  const nodes = getPropBlockNodes(block);
  const titleText = nodes.title;

  if (titleText && titleText.type === "TEXT") {
    await loadTextNodeFontSafe(titleText);
    titleText.characters = prop.designName || prop.name;
  }

  await setTextInNamedContainer(block, "item/design", buildDesignText(prop));
  await setTextInNamedContainer(block, "item/dev", buildDevText(prop));
  await buildPropDemos(block, prop, sourceNode);
}

async function fillPurposeBlock(block: any, sourceNode: any) {
  const headerTitle =
    findNodeByName(block, "title") ||
    findNodeByName(block, "Header") ||
    findNodeByName(block, "text");

  if (headerTitle && headerTitle.type === "TEXT") {
    await loadTextNodeFontSafe(headerTitle);
    headerTitle.characters = "purpose";
  }

  const rightSection = findNodeByName(block, "rightSection");
  if (rightSection && typeof rightSection.remove === "function") {
    rightSection.remove();
  }

  const leftSection = findNodeByName(block, "leftSection");
  if (leftSection) {
    // Растягиваем doc/block (родитель leftSection) на всю ширину, высота — hug
    const docBlock = leftSection.parent;
    if (docBlock) {
      if ("primaryAxisSizingMode" in docBlock) docBlock.primaryAxisSizingMode = "FIXED";
      if ("counterAxisSizingMode" in docBlock) docBlock.counterAxisSizingMode = "AUTO";
      if ("layoutAlign" in docBlock) docBlock.layoutAlign = "STRETCH";
    }
    if ("layoutGrow" in leftSection) {
      leftSection.layoutGrow = 1;
    }
    if ("primaryAxisSizingMode" in leftSection) leftSection.primaryAxisSizingMode = "AUTO";
    if ("layoutAlign" in leftSection) {
      leftSection.layoutAlign = "STRETCH";
    }
  }

  const demoDescriptor =
    findNodeByName(block, "demoDescriptor") ||
    findNodeByName(block, "demoDescription") ||
    findNodeByName(block, "description");

  if (demoDescriptor && "visible" in demoDescriptor) {
    demoDescriptor.visible = false;
  }

  const descriptionText = pixso.createText();
  descriptionText.name = "descriptionText";
  await loadTextNodeFontSafe(descriptionText);
  descriptionText.characters = "Описание компонента";

  const header = findNodeByName(block, "header");
  const docBlock =
    findNodeByName(block, "doc/block") ||
    findNodeByName(block, "docBlock");

  if (header && header.parent && docBlock) {
    const parent = header.parent;
    parent.insertChild(parent.children.indexOf(docBlock), descriptionText);
  }

  const demoPlaceholder =
    findNodeByName(block, "demoPlaceholder") ||
    findNodeByName(block, "demo-placeholder");

  const instance = createDemoInstance(sourceNode);

  if (demoPlaceholder && demoPlaceholder.parent && instance) {
    const parent = demoPlaceholder.parent;

    if (typeof demoPlaceholder.remove === "function") {
      demoPlaceholder.remove();
    }

    if (typeof parent.appendChild === "function") {
      parent.appendChild(instance, false);
    }
  }
}

async function createDocLayoutFrame(name: string): Promise<any> {
  try {
    const template = await pixso.importComponentByKeyAsync(COMPONENT_KEY_DOC_LAYOUT);
    if (template && typeof template.createInstance === "function") {
      const instance = template.createInstance();
      const frame = typeof instance.detachInstance === "function"
        ? instance.detachInstance()
        : instance;
      frame.name = name;
      return frame;
    }
  } catch (e) {
    console.warn("createDocLayoutFrame fallback to createFrame:", e);
  }
  // Fallback — обычный фрейм с белым фоном
  const frame = pixso.createFrame();
  frame.name = name;
  frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  return frame;
}

async function createStatusNav(componentName: string): Promise<any | null> {
  const template = await pixso.importComponentByKeyAsync(COMPONENT_KEY_STATUS_NAV);
  if (!template || typeof template.createInstance !== "function") return null;

  const instance = template.createInstance();
  const nav = typeof instance.detachInstance === "function"
    ? instance.detachInstance()
    : instance;

  nav.name = `Status nav / ${componentName}`;

  // Меняем pageTitle: первая буква заглавная
  const capitalizedName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
  const titleNode = findNodeByName(nav, "pageTitle") as any;
  if (titleNode && titleNode.type === "TEXT") {
    await loadTextNodeFontSafe(titleNode);
    titleNode.characters = capitalizedName;
  }

  return nav;
}

async function createDocHeader(): Promise<any | null> {
  const template = await pixso.importComponentByKeyAsync(COMPONENT_KEY_DOC_HEADER);

  if (!template || typeof template.createInstance !== "function") {
    return null;
  }

  const header = template.createInstance();

  header.name = "doc header";

  const pageTitle =
    findNodeByName(header, "pageTitle") ||
    findNodeByName(header, "title") ||
    findNodeByName(header, "text");

  if (pageTitle && pageTitle.type === "TEXT") {
    await loadTextNodeFontSafe(pageTitle);
    pageTitle.characters = "Общее описание компонента";
  }

  if ("layoutPositioning" in header) {
    header.layoutPositioning = "AUTO";
  }
  if ("layoutAlign" in header) {
    header.layoutAlign = "STRETCH";
  }
  if ("layoutGrow" in header) {
    header.layoutGrow = 0;
  }

  return header;
}

async function createDocNavigation(items: string[]): Promise<any | null> {
  const template = await pixso.importComponentByKeyAsync(COMPONENT_KEY_DOC_NAVIGATION);

  if (!template || typeof template.clone !== "function") {
    return null;
  }

  const navInstance = template.createInstance();
  const navigation =
    typeof navInstance.detachInstance === "function"
      ? navInstance.detachInstance()
      : navInstance;

  navigation.name = "doc navigation";

  const navList = findNodeByName(navigation, "navList");
  const navItemTemplate = navList ? findNodeByName(navList, "navItem") : null;

  if (!navList || !navItemTemplate || typeof navItemTemplate.clone !== "function") {
    return navigation;
  }

  // СНАЧАЛА делаем безопасную копию шаблона
  const navItemMaster = navItemTemplate.clone();

  const navItems = items;

  // ПОТОМ очищаем список
  const oldChildren = [...navList.children];
  for (const child of oldChildren) {
    child.remove();
  }

  for (const itemName of navItems) {
    const navItem = navItemMaster.clone();
    navItem.name = `navItem / ${itemName}`;

    const textNode =
      findNodeByName(navItem, "text") ||
      findNodeByName(navItem, "title");

    if (textNode && textNode.type === "TEXT") {
      await loadTextNodeFontSafe(textNode);
      textNode.characters = itemName;
    }

    navList.appendChild(navItem, false);
  }

  if (typeof navItemMaster.remove === "function") {
    navItemMaster.remove();
  }

  if ("layoutPositioning" in navigation) {
    navigation.layoutPositioning = "AUTO";
  }
  if ("layoutAlign" in navigation) {
    navigation.layoutAlign = "STRETCH";
  }
  if ("layoutGrow" in navigation) {
    navigation.layoutGrow = 0;
  }

  if (typeof navigation.resize === "function") {
    navigation.resize(1200, navigation.height);
  }

  return navigation;
}

// ─── Dark mode helpers ────────────────────────────────────────────────────────

// Props that represent interactive state → columns of the matrix
const STATE_PROP_NAMES = /^(state|selected|checked|pressed|focused|status)$/i;
// Props that represent visual appearance → rows of the matrix
const COLOR_PROP_NAMES = /^(mode|variant|type|kind|appearance|level|severity|color|style|look)$/i;

function buildCombinations(props: NormalizedProp[]): Record<string, string>[] {
  if (props.length === 0) return [{}];
  const [first, ...rest] = props;
  const restCombos = buildCombinations(rest);
  const result: Record<string, string>[] = [];
  for (const val of (first.values as string[])) {
    for (const combo of restCombos) {
      result.push({ [first.pixsoName]: val, ...combo });
    }
  }
  return result;
}

async function applyDarkTokenMode(_frame: any): Promise<boolean> {
  // Pixso не открывает доступ к библиотечным токенам через plugin API.
  // getLocalVariables / getLocalVariableCollections / getAvailableLibraryVariableCollectionsAsync
  // возвращают 0. Заглушка для будущего API.
  return false;
}

async function _applyDarkTokenMode_disabled(frame: any): Promise<boolean> {
  try {
    const vars = (pixso as any).variables;
    const localVars: any[] = vars.getLocalVariables?.() ?? [];
    pixso.notify(`localVars: ${localVars.length}`);

    if (localVars.length > 0) {
      // Собираем уникальные collection IDs
      const colIds = [...new Set(localVars.map((v: any) => v.variableCollectionId).filter(Boolean))];
      pixso.notify(`colIds from localVars: ${colIds.join(', ')}`);

      for (const colId of colIds) {
        const col = vars.getVariableCollectionById?.(colId);
        if (!col) continue;
        const modes: string[] = col.modes?.map((m: any) => m.name) ?? [];
        pixso.notify(`col "${col.name}" modes: ${modes.join(', ')}`);
        const hasDark = modes.some(n => /dark/i.test(n));
        const hasLight = modes.some(n => /light|auto/i.test(n));
        if (!hasDark || !hasLight) continue;
        const darkMode = col.modes.find((m: any) => /dark/i.test(m.name));
        if (darkMode && typeof frame.setExplicitVariableModeForCollection === "function") {
          frame.setExplicitVariableModeForCollection(col.id, darkMode.modeId);
          pixso.notify(`Applied "${darkMode.name}" from "${col.name}"`);
          return true;
        }
      }
    }

    const tl = (pixso as any).teamLibrary;
    if (!tl?.getAvailableLibraryVariableCollectionsAsync) {
      pixso.notify("teamLibrary not available"); return false;
    }

    const libCollections: any[] = await tl.getAvailableLibraryVariableCollectionsAsync();
    pixso.notify(`libCollections: ${libCollections.length} | names: ${libCollections.map((c: any) => c.name).join(', ')}`);
    if (!libCollections.length) return false;

    let applied = 0;

    for (const libCol of libCollections) {
      pixso.notify(`processing: "${libCol.name}" key=${libCol.key}`);

      const libVars: any[] = await tl.getVariablesInLibraryCollectionAsync(libCol);
      pixso.notify(`  vars: ${libVars?.length ?? 0}`);
      if (!libVars?.length) continue;

      let localVar: any;
      try {
        localVar = await (pixso as any).variables.importVariableByKeyAsync(libVars[0].key);
      } catch (e) {
        pixso.notify(`  importVariableByKeyAsync failed: ${String(e)}`); continue;
      }
      pixso.notify(`  localVar: ${localVar?.name} colId=${localVar?.variableCollectionId}`);
      if (!localVar?.variableCollectionId) continue;

      const localCol = (pixso as any).variables.getVariableCollectionById(localVar.variableCollectionId);
      pixso.notify(`  localCol: ${localCol?.name} modes=${localCol?.modes?.map((m: any) => m.name).join(',')}`);
      if (!localCol?.modes) continue;

      const modeNames: string[] = localCol.modes.map((m: any) => m.name);
      const hasDark  = modeNames.some((n: string) => /dark/i.test(n));
      const hasLight = modeNames.some((n: string) => /light|auto/i.test(n));
      if (!hasDark || !hasLight) { pixso.notify(`  skip (no Light+Dark)`); continue; }

      const darkMode = localCol.modes.find((m: any) => /dark/i.test(m.name));
      if (darkMode) {
        frame.setExplicitVariableModeForCollection(localCol.id, darkMode.modeId);
        pixso.notify(`  applied Dark mode "${darkMode.name}"`);
        applied++;
      }
    }

    if (applied > 0) {
      pixso.notify(`Dark mode применён (${applied} коллекций)`);
      return true;
    }
    return false;
  } catch (e) {
    pixso.notify(`applyDarkTokenMode error: ${String(e)}`);
    return false;
  }
}

async function fillDarkModeBody(bodyFrame: any): Promise<void> {
  if (!lastInspectedNode || !lastInspectResult) return;

  // Убираем placeholder
  const placeholder = findNodeByName(bodyFrame, "doc content block");
  if (placeholder && typeof placeholder.remove === "function") placeholder.remove();

  // Загружаем шаблон блока
  const template = await pixso.importComponentByKeyAsync(COMPONENT_KEY_CONTENT_BLOCK);
  if (!template || typeof template.createInstance !== "function") return;

  const blockInstance = template.createInstance();
  const block = typeof blockInstance.detachInstance === "function"
    ? blockInstance.detachInstance()
    : blockInstance;

  block.name = "dark mode matrix";
  block.visible = true;

  // Убираем header
  const headerNode = findNodeByName(block, "header") || findNodeByName(block, "Header");
  if (headerNode && typeof headerNode.remove === "function") headerNode.remove();

  // Убираем rightSection
  const rightSection = findNodeByName(block, "rightSection");
  if (rightSection && typeof rightSection.remove === "function") rightSection.remove();

  // leftSection растягиваем на всю ширину; doc/block (родитель) тоже
  const leftSection = findNodeByName(block, "leftSection");
  if (leftSection) {
    const docBlock = leftSection.parent;
    if (docBlock) {
      if ("primaryAxisSizingMode" in docBlock) docBlock.primaryAxisSizingMode = "FIXED";
      if ("counterAxisSizingMode" in docBlock) docBlock.counterAxisSizingMode = "AUTO";
      if ("layoutAlign" in docBlock) docBlock.layoutAlign = "STRETCH";
    }
    if ("primaryAxisSizingMode" in leftSection) leftSection.primaryAxisSizingMode = "AUTO";
    if ("layoutAlign" in leftSection) leftSection.layoutAlign = "STRETCH";
    if ("layoutGrow" in leftSection) leftSection.layoutGrow = 1;

    // demoBG — меняем mode на white
    const demoBG = findNodeByName(leftSection, "demoBG");
    if (demoBG && demoBG.componentProperties !== undefined) {
      try {
        demoBG.setProperties({ mode: "white" });
      } catch (_) {}
    }
    if (demoBG && typeof (demoBG as any).setProperties === "function") {
      try { (demoBG as any).setProperties({ mode: "white" }); } catch (_) {}
    }
  }

  // Строим матрицу
  const variantProps: NormalizedProp[] = lastInspectResult.props.filter(
    (p: NormalizedProp) => p.designType === "VARIANT" && Array.isArray(p.values) && p.values.length > 1
  );

  const columnProps = variantProps.filter((p: NormalizedProp) => STATE_PROP_NAMES.test(p.pixsoName));
  let rowProps = variantProps.filter(
    (p: NormalizedProp) => !STATE_PROP_NAMES.test(p.pixsoName) && COLOR_PROP_NAMES.test(p.pixsoName)
  );
  if (rowProps.length === 0) {
    rowProps = variantProps.filter((p: NormalizedProp) => !STATE_PROP_NAMES.test(p.pixsoName));
  }

  const rowCombos = buildCombinations(rowProps);
  const colCombos = columnProps.length > 0 ? buildCombinations(columnProps) : [{}];

  // Контейнер матрицы — вертикальный, строки горизонтальные
  const matrixFrame = pixso.createFrame();
  matrixFrame.name = "matrix";
  matrixFrame.layoutMode = "VERTICAL";
  matrixFrame.itemSpacing = 24;
  matrixFrame.fills = [];
  matrixFrame.paddingLeft = 0;
  matrixFrame.paddingRight = 0;
  matrixFrame.paddingTop = 0;
  matrixFrame.paddingBottom = 0;
  if ("primaryAxisSizingMode" in matrixFrame) matrixFrame.primaryAxisSizingMode = "AUTO";

  for (const rowCombo of rowCombos) {
    const label = Object.entries(rowCombo).map(([k, v]) => `${k}=${v}`).join(', ') || 'default';

    const rowFrame = pixso.createFrame();
    rowFrame.name = `row / ${label}`;
    rowFrame.layoutMode = "HORIZONTAL";
    rowFrame.itemSpacing = 24;
    rowFrame.fills = [];
    rowFrame.paddingLeft = 0;
    rowFrame.paddingRight = 0;
    rowFrame.paddingTop = 0;
    rowFrame.paddingBottom = 0;
    if ("primaryAxisSizingMode" in rowFrame) rowFrame.primaryAxisSizingMode = "AUTO";
    if ("counterAxisSizingMode" in rowFrame) rowFrame.counterAxisSizingMode = "AUTO";

    for (const colCombo of colCombos) {
      const overrides: Record<string, any> = { ...rowCombo, ...colCombo };
      const instance = createDemoInstance(lastInspectedNode, undefined, undefined, overrides);
      if (instance) rowFrame.appendChild(instance, false);
    }

    matrixFrame.appendChild(rowFrame, false);
  }

  // Вставляем матрицу в demoPlaceholder блока
  const demoPh =
    findNodeByName(block, "demoPlaceholder") ||
    findNodeByName(block, "demo-placeholder");

  if (demoPh && demoPh.parent) {
    const demoParent = demoPh.parent;
    if (typeof demoPh.remove === "function") demoPh.remove();
    if (typeof demoParent.appendChild === "function") demoParent.appendChild(matrixFrame, false);
  } else {
    // Если placeholder не найден — кладём матрицу прямо в блок
    if (typeof block.appendChild === "function") block.appendChild(matrixFrame, false);
  }

  // После вставки в родителя растягиваем на всю ширину
  if ("counterAxisSizingMode" in matrixFrame) matrixFrame.counterAxisSizingMode = "FIXED";
  if ("layoutAlign" in matrixFrame) matrixFrame.layoutAlign = "STRETCH";
  if ("layoutGrow" in matrixFrame) matrixFrame.layoutGrow = 1;
  if ("counterAxisAlignItems" in matrixFrame) matrixFrame.counterAxisAlignItems = "CENTER";
  if ("primaryAxisAlignItems" in matrixFrame) matrixFrame.primaryAxisAlignItems = "CENTER";

  bodyFrame.appendChild(block, false);
  if ("counterAxisSizingMode" in block) block.counterAxisSizingMode = "FIXED";
  if ("layoutAlign" in block) block.layoutAlign = "STRETCH";
}

function removeFrameByName(name: string) {
  const existing = pixso.currentPage.children.find(
    (n: any) => n.name === name && n.type === "FRAME"
  ) as any;
  if (existing && typeof existing.remove === "function") {
    existing.remove();
  }
}

async function generateDocumentation(silent = false) {
  const startedAt = Date.now();
  try {
    if (!lastInspectResult) return;

    const templateComponent = await pixso.importComponentByKeyAsync(COMPONENT_KEY_CONTENT_BLOCK);
    if (!templateComponent) return;
    const template = templateComponent;

    removeFrameByName(`Doc / ${lastInspectResult.component || "Component"}`);

    const pageFrame = await createDocLayoutFrame(`Doc / ${lastInspectResult.component || "Component"}`);
    pageFrame.layoutMode = "VERTICAL";
    pageFrame.itemSpacing = 0;
    pageFrame.cornerRadius = 24;
    pageFrame.paddingLeft = 0;
    pageFrame.paddingRight = 0;
    pageFrame.paddingTop = 0;
    pageFrame.paddingBottom = 0;
    if ("primaryAxisSizingMode" in pageFrame) pageFrame.primaryAxisSizingMode = "AUTO";
    if ("counterAxisSizingMode" in pageFrame) pageFrame.counterAxisSizingMode = "FIXED";
    if (typeof pageFrame.resize === "function") pageFrame.resize(1280, 100);

    const bodyFrame = pixso.createFrame();
    bodyFrame.name = "bodyFrame";
    bodyFrame.layoutMode = "VERTICAL";
    bodyFrame.itemSpacing = 40;
    bodyFrame.fills = [];
    bodyFrame.paddingLeft = 40;
    bodyFrame.paddingRight = 40;
    bodyFrame.paddingTop = 40;
    bodyFrame.paddingBottom = 40;

    const docFrame = pixso.createFrame();
    docFrame.name = "doc frame";
    docFrame.layoutMode = "VERTICAL";
    docFrame.itemSpacing = 72;
    docFrame.fills = [];
    docFrame.layoutGrow = 1;
    docFrame.paddingLeft = 0;
    docFrame.paddingRight = 0;
    docFrame.paddingTop = 0;
    docFrame.paddingBottom = 0;

    if ("layoutPositioning" in docFrame) {
      docFrame.layoutPositioning = "AUTO";
    }
    if (typeof docFrame.resize === "function") {
      docFrame.resize(1200, 100);
    }

    const header = await createDocHeader();
    if (header) {
      const pageTitle =
        findNodeByName(header, "pageTitle") ||
        findNodeByName(header, "title") ||
        findNodeByName(header, "text");
      if (pageTitle && pageTitle.type === "TEXT") {
        await loadTextNodeFontSafe(pageTitle);
        pageTitle.characters = lastInspectResult.component || "Component";
      }
      pageFrame.appendChild(header, false);
    }

    const navigation = await createDocNavigation(["purpose", ...lastInspectResult.props.map((p: NormalizedProp) => p.designName || p.name)]);

    if (navigation) {
      bodyFrame.appendChild(navigation, false);
    }

    bodyFrame.appendChild(docFrame, false);
    if ("layoutAlign" in docFrame) docFrame.layoutAlign = "STRETCH";

    pageFrame.appendChild(bodyFrame, false);
    if ("layoutAlign" in bodyFrame) bodyFrame.layoutAlign = "STRETCH";
    if ("layoutPositioning" in bodyFrame) bodyFrame.layoutPositioning = "AUTO";

    let createdCount = 0;

    if (typeof template.createInstance !== "function") return;

    const purposeInstance = template.createInstance();
    const purposeBlock =
      typeof purposeInstance.detachInstance === "function"
        ? purposeInstance.detachInstance()
        : purposeInstance;

    purposeBlock.name = "section / purpose";
    purposeBlock.visible = true;

    docFrame.appendChild(purposeBlock, false);
    if ("counterAxisSizingMode" in purposeBlock) purposeBlock.counterAxisSizingMode = "FIXED";
    if ("layoutAlign" in purposeBlock) purposeBlock.layoutAlign = "STRETCH";
    await fillPurposeBlock(purposeBlock, lastInspectedNode);

    for (const prop of lastInspectResult.props) {
      pixso.ui.postMessage({
        type: "progress",
        current: createdCount + 1,
        total: lastInspectResult.props.length
      });

      const blockInstance = template.createInstance();
      const block = typeof blockInstance.detachInstance === "function"
        ? blockInstance.detachInstance()
        : blockInstance;
      block.name = `prop / ${prop.designName || prop.name}`;
      block.visible = true;

      docFrame.appendChild(block, false);
      if ("counterAxisSizingMode" in block) block.counterAxisSizingMode = "FIXED";
      if ("layoutAlign" in block) block.layoutAlign = "STRETCH";

      await fillPropBlock(block, prop, lastInspectedNode);

      createdCount += 1;
    }

    pixso.currentPage.appendChild(pageFrame, false);

    const nodeX = lastInspectedNode?.x || 0;
    const nodeY = lastInspectedNode?.y || 0;
    pageFrame.x = nodeX;
    pageFrame.y = nodeY + (lastInspectedNode?.height || 0) + 500;

    if ("selection" in pixso.currentPage) {
      pixso.currentPage.selection = [pageFrame];
      pixso.viewport.scrollAndZoomIntoView([pageFrame]);
    }

    const duration = ((Date.now() - startedAt) / 1000).toFixed(2);

    pixso.notify(
          `Документация создана: ${lastInspectResult.component}. Блоков: ${createdCount}. Время: ${duration}s`
        );
      } catch (error) {
        console.error(error);
        pixso.notify(`Ошибка генерации: ${String(error)}`);
      } finally {
        if (!silent) pixso.ui.postMessage({
          type: "generation-finished"
        });
      }
}

async function generateFullDocumentation(selectedTechIds: string[] = []) {
  try {
    if (!lastInspectResult) return;

    const componentName = lastInspectResult.component || "Component";

    const templateComponent = await pixso.importComponentByKeyAsync(COMPONENT_KEY_CONTENT_BLOCK);
    if (!templateComponent) return;

    // 1. Docs по пропам (без generation-finished — его шлёт generateFullDocumentation)
    await generateDocumentation(true);

    // 2. Технические компоненты
    const techDocFrames: any[] = [];
    for (const techId of selectedTechIds) {
      const techNode = pixso.getNodeById(techId) as any;
      if (!techNode) continue;

      // Сохраняем текущий контекст
      const savedNode = lastInspectedNode;
      const savedResult = lastInspectResult;

      // Инспектируем технический компонент
      lastInspectedNode = techNode;
      lastInspectResult = inspectNode(techNode);
      defaultPropsCache = lastInspectResult.props.reduce((acc, p) => {
        acc[p.pixsoName] = p.defaultValue;
        return acc;
      }, {} as Record<string, any>);

      const techName = techNode.name || techId;
      removeFrameByName(`Doc / ${techName}`);
      await generateDocumentation(true);

      const techFrame = pixso.currentPage.children.find(
        (n: any) => n.name === `Doc / ${techName}`
      ) as any;
      if (techFrame) techDocFrames.push(techFrame);

      // Восстанавливаем контекст
      lastInspectedNode = savedNode;
      lastInspectResult = savedResult;
    }

    // 3. How to use
    removeFrameByName(`How to use / ${componentName}`);
    const howToUseFrame = await createDocLayoutFrame(`How to use / ${componentName}`);
    howToUseFrame.layoutMode = "VERTICAL";
    howToUseFrame.itemSpacing = 0;
    howToUseFrame.cornerRadius = 24;
    howToUseFrame.paddingLeft = 0;
    howToUseFrame.paddingRight = 0;
    howToUseFrame.paddingTop = 0;
    howToUseFrame.paddingBottom = 0;
    if ("primaryAxisSizingMode" in howToUseFrame) howToUseFrame.primaryAxisSizingMode = "AUTO";
    if ("counterAxisSizingMode" in howToUseFrame) howToUseFrame.counterAxisSizingMode = "FIXED";
    if (typeof howToUseFrame.resize === "function") howToUseFrame.resize(1280, 100);

    const howToUseHeader = await createDocHeader();
    if (howToUseHeader) {
      const pageTitle =
        findNodeByName(howToUseHeader, "pageTitle") ||
        findNodeByName(howToUseHeader, "title") ||
        findNodeByName(howToUseHeader, "text");
      if (pageTitle && pageTitle.type === "TEXT") {
        await loadTextNodeFontSafe(pageTitle);
        pageTitle.characters = "How to use";
      }
      howToUseFrame.appendChild(howToUseHeader, false);
    }

    const howToUseBody = pixso.createFrame();
    howToUseBody.name = "bodyFrame";
    howToUseBody.layoutMode = "VERTICAL";
    howToUseBody.itemSpacing = 40;
    howToUseBody.fills = [];
    howToUseBody.paddingLeft = 40;
    howToUseBody.paddingRight = 40;
    howToUseBody.paddingTop = 40;
    howToUseBody.paddingBottom = 40;
    const howToUseNav = await createDocNavigation(["..."]);  // заменяется при Import How to use
    if (howToUseNav) {
      howToUseBody.appendChild(howToUseNav, false);
    }

    const howToUseBlock = templateComponent.createInstance();
    howToUseBlock.name = "doc content block";
    howToUseBody.appendChild(howToUseBlock, false);

    howToUseFrame.appendChild(howToUseBody, false);
    if ("layoutAlign" in howToUseBody) howToUseBody.layoutAlign = "STRETCH";
    if ("layoutPositioning" in howToUseBody) howToUseBody.layoutPositioning = "AUTO";
    pixso.currentPage.appendChild(howToUseFrame, false);

    // 3. Dark mode
    removeFrameByName(`Dark mode / ${componentName}`);
    const darkModeFrame = await createDocLayoutFrame(`Dark mode / ${componentName}`);
    darkModeFrame.layoutMode = "VERTICAL";
    darkModeFrame.itemSpacing = 0;
    darkModeFrame.cornerRadius = 24;
    darkModeFrame.paddingLeft = 0;
    darkModeFrame.paddingRight = 0;
    darkModeFrame.paddingTop = 0;
    darkModeFrame.paddingBottom = 0;
    if ("primaryAxisSizingMode" in darkModeFrame) darkModeFrame.primaryAxisSizingMode = "AUTO";
    if ("counterAxisSizingMode" in darkModeFrame) darkModeFrame.counterAxisSizingMode = "FIXED";
    if (typeof darkModeFrame.resize === "function") darkModeFrame.resize(1280, 100);

    const darkModeHeader = await createDocHeader();
    if (darkModeHeader) {
      const pageTitle =
        findNodeByName(darkModeHeader, "pageTitle") ||
        findNodeByName(darkModeHeader, "title") ||
        findNodeByName(darkModeHeader, "text");
      if (pageTitle && pageTitle.type === "TEXT") {
        await loadTextNodeFontSafe(pageTitle);
        pageTitle.characters = "Dark mode";
      }
      darkModeFrame.appendChild(darkModeHeader, false);
    }

    const darkModeBody = pixso.createFrame();
    darkModeBody.name = "bodyFrame";
    darkModeBody.layoutMode = "VERTICAL";
    darkModeBody.itemSpacing = 40;
    darkModeBody.fills = [];
    darkModeBody.paddingLeft = 40;
    darkModeBody.paddingRight = 40;
    darkModeBody.paddingTop = 40;
    darkModeBody.paddingBottom = 40;
    darkModeFrame.appendChild(darkModeBody, false);
    if ("counterAxisSizingMode" in darkModeBody) darkModeBody.counterAxisSizingMode = "FIXED";
    if ("layoutAlign" in darkModeBody) darkModeBody.layoutAlign = "STRETCH";
    if ("layoutPositioning" in darkModeBody) darkModeBody.layoutPositioning = "AUTO";
    pixso.currentPage.appendChild(darkModeFrame, false);

    // fillDarkModeBody вызываем ПОСЛЕ того как вся цепочка подключена к currentPage
    await fillDarkModeBody(darkModeBody);

    await applyDarkTokenMode(darkModeFrame);

    // Status nav — слева от Doc (пропускается если ключ не задан)
    let statusNavFrame: any = null;
    try {
      statusNavFrame = await createStatusNav(componentName);
      if (statusNavFrame) {
        pixso.currentPage.appendChild(statusNavFrame, false);
      }
    } catch (e) {
      console.warn("statusNav skipped:", e);
    }

    // Позиционирование: 500px ниже компонента, слева направо с отступом 150px
    const baseX = lastInspectedNode?.x || 0;
    const baseY = (lastInspectedNode?.y || 0) + (lastInspectedNode?.height || 0) + 500;
    const gap = 150;
    const frameWidth = 1280;
    const statusNavWidth = statusNavFrame?.width || 0;
    const docOffsetX = statusNavFrame ? statusNavWidth + gap : 0;

    // Status nav левее Doc
    if (statusNavFrame) {
      statusNavFrame.x = baseX;
      statusNavFrame.y = baseY;
    }

    // Найти props doc фрейм (он уже создан generateDocumentation)
    const propsDocFrame = pixso.currentPage.children.find(
      (n: any) => n.name === `Doc / ${componentName}`
    ) as any;

    if (propsDocFrame) {
      propsDocFrame.x = baseX + docOffsetX;
      propsDocFrame.y = baseY;
    }

    // Tech doc фреймы после основного Doc
    techDocFrames.forEach((f, i) => {
      f.x = baseX + docOffsetX + (frameWidth + gap) * (i + 1);
      f.y = baseY;
    });

    const techOffset = techDocFrames.length + 1;
    howToUseFrame.x = baseX + docOffsetX + (frameWidth + gap) * techOffset;
    howToUseFrame.y = baseY;

    darkModeFrame.x = baseX + docOffsetX + (frameWidth + gap) * (techOffset + 1);
    darkModeFrame.y = baseY;

    const frames = [statusNavFrame, propsDocFrame, ...techDocFrames, howToUseFrame, darkModeFrame].filter(Boolean);
    if ("selection" in pixso.currentPage) {
      pixso.currentPage.selection = frames;
    }
    pixso.viewport.scrollAndZoomIntoView(frames);

    pixso.notify(`Полная документация создана: ${componentName}`);
  } catch (error) {
    console.error(error);
    pixso.notify(`Ошибка: ${String(error)}`);
  } finally {
    pixso.ui.postMessage({ type: "generation-finished" });
  }
}

type HowToUseSection = {
  title: string;
  description: string;
  example: Record<string, string>;
  source?: string;
  noExample?: boolean;
};

type HowToUseData = {
  component: string;
  sections: HowToUseSection[];
  ideas?: HowToUseSection[];
  componentDescription?: string;
  techDescriptions?: Record<string, string>;
  propUpdates?: Array<{ designName: string; codeProp: string }>;
  unmatchedProps?: Array<
    | { designName: string; codeName: string; reason: string; codeOnly?: never }
    | { codeOnly: true; codeName: string; type: string }
  >;
};

async function fillHowToUseBlock(block: any, section: HowToUseSection) {
  // Title
  const titleNode =
    findNodeByName(block, "title") ||
    findNodeByName(block, "Header") ||
    findNodeByName(block, "text");

  if (titleNode && titleNode.type === "TEXT") {
    await loadTextNodeFontSafe(titleNode);
    titleNode.characters = section.title || "";
  }

  // Description → item/info
  await setTextInNamedContainer(block, "item/info", section.description || "");

  // Hide item/design and item/dev — not used here
  const designItem = findNodeByName(block, "item/design");
  if (designItem && "visible" in designItem) designItem.visible = false;

  const devItem = findNodeByName(block, "item/dev");
  if (devItem && "visible" in devItem) devItem.visible = false;

  // Wide layout: remove leftSection (demo area), stretch rightSection to full width
  if (section.noExample) {
    const leftSection = findNodeByName(block, "leftSection");
    if (leftSection && typeof leftSection.remove === "function") {
      leftSection.remove();
    } else {
      const demoPlaceholder =
        findNodeByName(block, "demoPlaceholder") ||
        findNodeByName(block, "demo-placeholder");
      if (demoPlaceholder && typeof demoPlaceholder.remove === "function") {
        demoPlaceholder.remove();
      }
    }
    const rightSection = findNodeByName(block, "rightSection");
    if (rightSection) {
      if ("layoutGrow" in rightSection) rightSection.layoutGrow = 1;
      if ("layoutAlign" in rightSection) rightSection.layoutAlign = "STRETCH";
    }
    return;
  }

  // Demo — apply ALL props from example
  if (lastInspectedNode && section.example && Object.keys(section.example).length > 0) {
    const exampleEntries = Object.entries(section.example);

    // Map all example keys to pixsoName overrides
    const overrides: Record<string, any> = {};
    let firstProp: NormalizedProp | undefined;
    let firstValue: string | undefined;

    for (const [exKey, exVal] of exampleEntries) {
      const matched = lastInspectResult?.props.find(
        (p: NormalizedProp) =>
          (p.designName || "").toLowerCase() === exKey.toLowerCase() ||
          (p.codeName || "").toLowerCase() === exKey.toLowerCase() ||
          p.pixsoName.toLowerCase() === exKey.toLowerCase()
      );
      if (matched) {
        const resolved = String(exVal) === "true" ? true : String(exVal) === "false" ? false : String(exVal);
        overrides[matched.pixsoName] = resolved;
        if (!firstProp) { firstProp = matched; firstValue = String(exVal); }
      }
    }

    const demo = createDemoInstance(
      lastInspectedNode,
      firstProp,
      firstValue,
      overrides
    );

    if (demo) {
      const placeholder =
        findNodeByName(block, "demoPlaceholder") ||
        findNodeByName(block, "demo-placeholder");

      if (placeholder && placeholder.parent) {
        const parent = placeholder.parent;
        if (typeof placeholder.remove === "function") placeholder.remove();
        if (typeof parent.appendChild === "function") parent.appendChild(demo, false);
      }
    }
  }
}

async function importHowToUse(data: HowToUseData) {
  try {
    if (!data?.sections?.length) return;

    const componentName = data.component || lastInspectResult?.component || "Component";
    const frameName = `How to use / ${componentName}`;

    const existingFrame = pixso.currentPage.children.find(
      (n: any) => n.name === frameName && n.type === "FRAME"
    ) ?? null;

    if (!existingFrame) return;

    // Если lastInspectedNode сброшен (перезагрузка плагина) — попробуем найти компонент по выделению или по странице
    if (!lastInspectedNode) {
      const sel = pixso.currentPage.selection[0] as any;
      if (sel && (sel.type === "COMPONENT_SET" || sel.type === "COMPONENT")) {
        lastInspectedNode = sel;
        defaultPropsCache = null;
      } else {
        const found = pixso.currentPage.children.find(
          (n: any) => (n.type === "COMPONENT_SET" || n.type === "COMPONENT") &&
            n.name.toLowerCase() === componentName.toLowerCase()
        ) as any;
        if (found) {
          lastInspectedNode = found;
          defaultPropsCache = null;
        }
      }
    }

    const template = await pixso.importComponentByKeyAsync(COMPONENT_KEY_CONTENT_BLOCK);

    if (!template || typeof template.createInstance !== "function") return;

    const bodyFrame = findNodeByName(existingFrame, "bodyFrame");
    if (!bodyFrame) return;

    // Remove placeholder block left by generateFullDocumentation
    const placeholder = findNodeByName(bodyFrame, "doc content block");
    if (placeholder && typeof placeholder.remove === "function") {
      placeholder.remove();
    }

    for (let i = 0; i < data.sections.length; i++) {
      const section = data.sections[i];
      let step = "createInstance";
      try {
        const blockInstance = template.createInstance();

        step = "detachInstance";
        const block =
          typeof blockInstance.detachInstance === "function"
            ? blockInstance.detachInstance()
            : blockInstance;

        step = "set name/visible";
        block.name = `section / ${section.title || "untitled"}`;
        block.visible = true;

        step = `appendChild (bodyFrame.type=${bodyFrame.type}, appendChild=${typeof bodyFrame.appendChild})`;
        bodyFrame.appendChild(block, false);

        if ((section as any).source === "suggested") {
          block.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.96 } }];
        }

        step = "fillHowToUseBlock";
        await fillHowToUseBlock(block, section);
      } catch (blockErr) {
        console.error(`Блок ${i + 1} упал на шаге "${step}":`, blockErr);
        return;
      }
    }

    // Ideas-блоки с серым фоном
    if (data.ideas && data.ideas.length > 0) {
      for (let i = 0; i < data.ideas.length; i++) {
        const idea = data.ideas[i];
        let step = "createInstance";
        try {
          const blockInstance = template.createInstance();
          step = "detachInstance";
          const block =
            typeof blockInstance.detachInstance === "function"
              ? blockInstance.detachInstance()
              : blockInstance;

          block.name = `idea / ${idea.title || "untitled"}`;
          block.visible = true;

          if ((idea as any).source === "suggested" || !(idea as any).source) {
            // backwards-compatible: ideas without source field keep gray background
            block.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.96 } }];
          }

          step = "appendChild idea";
          bodyFrame.appendChild(block, false);

          step = "fillHowToUseBlock idea";
          await fillHowToUseBlock(block, idea);
        } catch (ideaErr) {
          console.error(`Идея ${i + 1} упала на шаге "${step}":`, ideaErr);
        }
      }
    }

    // Пересоздаём навигацию из тайтлов секций
    const oldNav = findNodeByName(bodyFrame, "doc navigation");
    if (oldNav && typeof oldNav.remove === "function") oldNav.remove();

    const sectionTitles = data.sections.map((s: HowToUseSection) => s.title || "untitled");
    const newNav = await createDocNavigation(sectionTitles);
    if (newNav) {
      // Вставляем навигацию первым элементом bodyFrame
      if (bodyFrame.children && bodyFrame.children.length > 0) {
        bodyFrame.insertChild(0, newNav);
      } else {
        bodyFrame.appendChild(newNav, false);
      }
    }

    // Fill descriptionText in section / purpose of Doc frames
    async function fillPurposeDescription(frameName: string, description: string) {
      const frame = pixso.currentPage.children.find(
        (n: any) => n.name === frameName && n.type === "FRAME"
      ) as any;
      if (!frame) return;
      const purposeBlock = findNodeByName(frame, "section / purpose");
      if (!purposeBlock) return;
      const descText = findNodeByName(purposeBlock, "descriptionText");
      if (descText && descText.type === "TEXT") {
        await loadTextNodeFontSafe(descText);
        descText.characters = description;
      }
    }

    if (data.componentDescription) {
      await fillPurposeDescription(`Doc / ${componentName}`, data.componentDescription);
    }

    if (data.techDescriptions && typeof data.techDescriptions === "object") {
      for (const [techName, techDesc] of Object.entries(data.techDescriptions)) {
        await fillPurposeDescription(`Doc / ${techName}`, techDesc);
      }
    }

    // Apply propUpdates: update item/dev text in all doc frames
    if (data.propUpdates && Array.isArray(data.propUpdates) && data.propUpdates.length > 0) {
      const docFrameNames = [
        `Doc / ${componentName}`,
        ...(data.techDescriptions ? Object.keys(data.techDescriptions).map((t: string) => `Doc / ${t}`) : [])
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

          await setTextInNamedContainer(propBlock, "item/dev", buildCodePropPayload(update.codeProp));
        }
      }
    }

    pixso.viewport.scrollAndZoomIntoView([existingFrame]);
    pixso.notify(`How to use импортирован: ${data.sections.length} секций`);
  } catch (error) {
    pixso.notify(`Ошибка импорта: ${String(error)}`);
  }
}

type TechComponentItem = {
  id: string;
  name: string;
  isTechnical: boolean;
};

function findNestedComponents(rootNode: any): TechComponentItem[] {
  const seen = new Set<string>();
  const result: TechComponentItem[] = [];

  function traverse(node: any) {
    if (!node) return;
    // Если это инстанс — извлекаем его component set
    if (node.type === "INSTANCE") {
      const main = node.mainComponent;
      if (main) {
        const compSet = main.parent?.type === "COMPONENT_SET" ? main.parent : main;
        const id = compSet.id;
        const name: string = compSet.name || "";

        if (!seen.has(id)) {
          seen.add(id);

          // Проверяем список исключений (точное совпадение или startsWith без учёта регистра)
          const nameLower = name.toLowerCase();
          const excluded = techComponentsExclusions.some(exc =>
            nameLower === exc.toLowerCase()
          );

          // Исключаем компоненты, имя которых начинается с цифры
          const startsWithDigit = /^\d/.test(name);

          if (!excluded && !startsWithDigit) {
            result.push({
              id,
              name,
              isTechnical: name.startsWith("_"),
            });
          }
        }
      }
    }
    // Рекурсивно обходим дочерние ноды
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  // Для COMPONENT_SET обходим все варианты
  if (rootNode.type === "COMPONENT_SET") {
    for (const variant of rootNode.children || []) {
      traverse(variant);
    }
  } else {
    traverse(rootNode);
  }

  // Технические компоненты первыми, остальные по алфавиту
  result.sort((a, b) => {
    if (a.isTechnical && !b.isTechnical) return -1;
    if (!a.isTechnical && b.isTechnical) return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
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

function readTextFromContainer(parent: any, containerName: string): string {
  const container = findNodeByName(parent, containerName);
  if (!container) return "";
  // Ищем узел "text" — именно туда пишет setTextInNamedContainer
  const textNode = findNodeByName(container, "text");
  if (textNode && textNode.type === "TEXT") return textNode.characters || "";
  return "";
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

  // overview.json — из Doc-фреймов со страницы
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

  // props.json — из lastInspectResult (если совпадает главный компонент)
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

pixso.ui.onmessage = async (msg) => {
  if (msg.type === "inspect") {
    inspectSelectedNode();
    return;
  }

  if (msg.type === "find-tech-components") {
    if (!lastInspectedNode) {
      pixso.ui.postMessage({ type: "tech-components-result", items: [] });
      return;
    }
    const items = findNestedComponents(lastInspectedNode);
    pixso.ui.postMessage({ type: "tech-components-result", items });
    return;
  }

  if (msg.type === "check-frames") {
    const componentName = lastInspectResult?.component || "";
    const techIds: string[] = msg.selectedTechIds || [];
    const techNames = techIds
      .map(id => {
        const node = pixso.getNodeById(id) as any;
        return node ? node.name : null;
      })
      .filter(Boolean);

    const frameNames = msg.mode === "props"
      ? [`Doc / ${componentName}`]
      : [
          `Doc / ${componentName}`,
          ...techNames.map((n: string) => `Doc / ${n}`),
          `How to use / ${componentName}`,
          `Dark mode / ${componentName}`,
        ];

    const existing = frameNames.filter(name =>
      pixso.currentPage.children.some((n: any) => n.name === name)
    );
    pixso.ui.postMessage({ type: "frames-check-result", existing, selectedTechIds: techIds });
    return;
  }

  if (msg.type === "get-key") {
    const node = pixso.currentPage.selection[0] as any;
    if (node?.key) {
      pixso.ui.postMessage({ type: "key-result", key: node.key });
    } else {
      pixso.notify("Выбери компонент из библиотеки");
    }
    return;
  }

  if (msg.type === "generate-documentation") {
    await generateDocumentation();
    return;
  }

  if (msg.type === "generate-full-documentation") {
    await generateFullDocumentation(msg.selectedTechIds || []);
    return;
  }

  if (msg.type === "import-how-to-use") {
    await importHowToUse(msg.data);
    const unmatchedProps = msg.data?.unmatchedProps ?? [];
    pixso.ui.postMessage({ type: "generation-finished", unmatchedProps });
    return;
  }

  if (msg.type === "export-docs") {
    await exportDocs();
    return;
  }
};