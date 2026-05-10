/**
 * Синонимы для пропов словаря.
 * Если имя пропа в Pixso совпадает с синонимом — ставится статус REVIEW
 * с подсказкой на стандартное название.
 *
 * Ключи — те же, что в propsDictionary.
 */
export const propSynonyms: Record<string, string[]> = {
  variant: [
    "type", "kind", "appearance", "look", "style", "theme", "color",
    "intent", "purpose", "semantic", "colorScheme", "role", "view",
    "visualVariant", "componentType",
  ],

  mode: [
    "theme", "appearance", "look", "display", "view", "layout",
    "format", "scheme", "colorMode", "displayMode", "visualMode",
    "renderMode", "presentationMode",
  ],

  size: [
    "scale", "dimension", "xs", "sm", "md", "lg", "xl",
    "small", "medium", "large", "height", "width",
    "sizeVariant", "componentSize", "inputSize",
  ],

  padding: [
    "spacing", "indent", "inset", "gap", "density",
    "paddingSize", "space", "offset", "paddingVariant",
    "innerSpacing", "contentPadding",
  ],

  orientation: [
    "direction", "axis", "layout", "flow", "position", "align",
    "flexDirection", "arrangement", "placement", "layoutDirection",
    "itemDirection", "mainAxis",
  ],

  state: [
    "status", "interactionState", "visualState", "interaction",
    "phase", "currentState", "uiState", "componentState",
    "inputState", "hoverState",
  ],

  loading: [
    "isLoading", "pending", "fetching", "busy", "progress",
    "inProgress", "isBusy", "isPending", "isFetching",
    "spinner", "processing", "isProcessing",
  ],

  disabled: [
    "isDisabled", "inactive", "unavailable", "locked", "blocked",
    "nonInteractive", "isInactive", "deactivated",
    "forbidden", "isLocked", "isForbidden",
  ],

  readonly: [
    "isReadonly", "readOnly", "nonEditable", "immutable",
    "viewOnly", "displayOnly", "isReadOnly", "notEditable",
    "locked", "isLocked", "editDisabled",
  ],

  validationStatus: [
    "error", "errorState", "validity", "valid", "invalid",
    "inputState", "fieldState", "validation", "hasError",
    "errorType", "validationState", "formStatus",
  ],

  interactive: [
    "clickable", "hoverable", "focusable", "isInteractive",
    "hasHover", "isClickable", "actionable", "enabled",
    "isActive", "isEnabled", "hasInteraction",
  ],

  selected: [
    "isSelected", "checked", "isChecked", "active",
    "highlighted", "marked", "current", "chosen",
    "isActive", "isCurrent", "isHighlighted", "isMarked",
  ],

  expanded: [
    "isExpanded", "open", "isOpen", "collapsed", "isCollapsed",
    "unfolded", "revealed", "toggled", "opened", "shown",
    "isToggled", "isShown",
  ],

  title: [
    "heading", "label", "name", "caption", "header",
    "headline", "subject", "titleText", "headingText",
    "headerText", "titleLabel",
  ],

  text: [
    "label", "body", "message", "copy", "bodyText",
    "mainText", "textContent", "contentText",
    "labelText", "innerText",
  ],

  description: [
    "subtitle", "subtext", "hint", "helper", "note",
    "info", "details", "secondary", "helperText",
    "supportText", "caption", "subTitle", "desc", "subDescription",
  ],

  value: [
    "currentValue", "inputValue", "val", "data",
    "amount", "count", "number", "valueText",
    "fieldValue", "modelValue", "displayValue",
  ],

  children: [
    "body", "inner", "slot", "default",
    "innerContent", "childContent", "nestedContent",
    "defaultSlot", "defaultContent",
  ],

  content: [
    "body", "inner", "slot", "default",
    "mainContent", "innerContent", "bodyContent",
    "contentSlot", "pageContent",
  ],

  contentBefore: [
    "prefix", "prepend", "leading", "before", "start",
    "startContent", "leftContent", "prependContent",
    "leadingContent", "prefixContent", "headerContent",
  ],

  contentAfter: [
    "suffix", "append", "trailing", "after", "end",
    "endContent", "rightContent", "appendContent",
    "trailingContent", "suffixContent", "footerContent",
  ],

  contentCentered: [
    "center", "middle", "centerContent", "centeredContent",
    "centralContent", "middleContent", "centerSlot",
  ],

  contentLeft: [
    "left", "leftSlot", "startSlot", "leftSide",
    "startSide", "leftSection", "startSection",
  ],

  contentRight: [
    "right", "rightSlot", "endSlot", "rightSide",
    "endSide", "rightSection", "endSection",
  ],

  contentBottom: [
    "bottom", "bottomSlot", "footer",
    "belowContent", "bottomContent", "bottomSection",
  ],

  contentTop: [
    "top", "topSlot", "header",
    "aboveContent", "topContent", "topSection",
  ],

  iconBefore: [
    "leftIcon", "startIcon", "prefixIcon", "leadingIcon",
    "iconLeft", "iconStart", "startAdornment",
    "adornmentStart", "iconPrefix", "leadIcon", "leftAdornment",
  ],

  iconAfter: [
    "rightIcon", "endIcon", "suffixIcon", "trailingIcon",
    "iconRight", "iconEnd", "endAdornment",
    "adornmentEnd", "iconSuffix", "trailIcon", "rightAdornment",
  ],

  elementBefore: [
    "componentBefore", "nodeBefore", "slotBefore", "leftElement",
    "startElement", "prefixElement", "leadingElement",
    "adornmentBefore", "elementStart", "before",
    "prependElement", "startSlot", "leadingSlot",
  ],

  elementAfter: [
    "componentAfter", "nodeAfter", "slotAfter", "rightElement",
    "endElement", "suffixElement", "trailingElement",
    "adornmentAfter", "elementEnd", "after",
    "appendElement", "endSlot", "trailingSlot",
  ],

  elementTop: [
    "componentTop", "nodeTop", "topElement",
    "aboveElement", "headerElement", "topSlot", "topNode",
  ],

  elementBottom: [
    "componentBottom", "nodeBottom", "bottomElement",
    "belowElement", "footerElement", "bottomSlot", "bottomNode",
  ],

  elementRight: [
    "componentRight", "nodeRight", "rightSlot",
    "endSlot", "rightSection", "endSection", "rightNode",
  ],

  elementLeft: [
    "componentLeft", "nodeLeft", "leftSlot",
    "startSlot", "leftSection", "startSection", "leftNode",
  ],

  elementCentered: [
    "componentCentered", "nodeCentered", "centerElement",
    "centeredElement", "middleElement", "centerSlot", "centerNode",
  ],

  image: [
    "img", "picture", "photo", "illustration",
    "thumbnail", "cover", "avatar", "hasImage",
    "showImage", "imageSlot", "imageContent",
  ],

  actions: [
    "buttons", "controls", "toolbar", "actionBar",
    "actionButtons", "cta", "ctaButtons", "footerActions",
    "actionSlot", "footer", "buttonGroup",
  ],

  notification: [
    "alert", "badge", "indicator", "notif",
    "notify", "message", "warn", "warning",
    "notificationSlot", "alertSlot", "notificationBadge",
  ],

  draggable: [
    "isDraggable", "drag", "dragHandle", "sortable",
    "reorderable", "canDrag", "hasDragHandle",
    "dragEnabled", "isDragging", "hasDrag",
  ],

  resizable: [
    "isResizable", "resize", "scalable", "canResize",
    "hasResize", "resizeHandle", "resizeEnabled",
    "isScalable", "hasResizeHandle",
  ],

  closable: [
    "isClosable", "dismissible", "close", "removable",
    "deletable", "dismissable", "canClose",
    "hasCloseButton", "closeButton", "isDismissible",
  ],

  placeholder: [
    "isEmpty", "empty", "noContent", "noValue",
    "defaultState", "hint", "hasPlaceholder",
    "emptyState", "isPlaceholder", "showPlaceholder",
  ],

  clearable: [
    "isClearable", "clear", "clearButton", "clearIcon",
    "hasClear", "showClear", "resetable", "erasable",
    "clearValue", "clearInput", "clearAction", "withClear",
  ],

  scrollbar: [
    "scroll", "hasScrollbar", "showScrollbar", "isScrollable",
    "scrollable", "overflow", "overflowY", "overflowX",
    "scrollVisible", "scrollIndicator", "scrollTrack",
    "hasScroll", "withScrollbar", "scrollEnabled",
  ],

  truncateText: [
    "ellipsis", "overflow", "clip", "nowrap", "noWrap",
    "textOverflow", "truncate", "clamp",
    "textEllipsis", "overflowHidden", "isTruncated",
  ],
};
