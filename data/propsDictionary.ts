function createSlotVisibilityProp(
  name: string,
  visibilityDescription: string,
  slotDescription: string
) {
  return {
    designName: name,
    codeName: name,
    variants: {
      visibility: {
        designName: name,
        codeName: name,
        type: "boolean",
        description: visibilityDescription,
        category: "visibility",
      },
      slot: {
        designName: `🔄 ${name}`,
        codeName: name,
        type: "ReactNode",
        description: slotDescription,
        category: "slot",
      },
    },
  };
}

function createTextProp(
  name: string,
  visibilityDescription: string,
  contentDescription: string
) {
  return {
    designName: name,
    codeName: name,
    variants: {
      visibility: {
        designName: name,
        codeName: name,
        type: "boolean",
        description: visibilityDescription,
        category: "visibility",
      },
      content: {
        designName: `✏️ ${name}`,
        codeName: name,
        type: "string",
        description: contentDescription,
        category: "content",
      },
    },
  };
}

export const propsDictionary = {
  variant: {
    designName: "variant",
    codeName: "variant",
    type: "enum",
    description:
      "Функциональный тип компонента, определяющий одновременно визуальное оформление и семантическую роль в интерфейсе",
    category: "component",
  },

  mode: {
    designName: "mode",
    codeName: "mode",
    type: "enum",
    description:
      "Режим отображения, определяющий визуальный стиль компонента. Менее семантичен чем variant — описывает «как», а не «зачем»",
    category: "component",
  },

  size: {
    designName: "size",
    codeName: "size",
    type: "enum",
    description:
      "Размер компонента, влияющий на высоту, размер шрифта и внутренние отступы",
    category: "component",
  },

  padding: {
    designName: "padding",
    codeName: "padding",
    type: "enum",
    description:
      "Внутренние отступы компонента, независимые от size. Используется когда нужно изменить плотность без смены габаритов",
    category: "component",
  },

  orientation: {
    designName: "orientation",
    codeName: "orientation",
    type: "enum",
    description:
      "Направление основной оси компонента. Определяет, как расположены дочерние элементы внутри него",
    category: "component",
  },

  state: {
    designName: "state",
    codeName: "state",
    type: "enum",
    description:
      "Визуальный интерактивный статус компонента в дизайне: enabled/default, hover, active, focus. Состояния disabled, loading и readonly вынесены в отдельные булевые пропы",
    category: "component",
  },

  loading: {
    designName: "loading",
    codeName: "loading",
    type: "boolean",
    description:
      "Компонент находится в процессе загрузки — взаимодействие заблокировано, отображается индикатор прогресса",
    category: "component",
  },

  disabled: {
    designName: "disabled",
    codeName: "disabled",
    type: "boolean",
    description:
      "Компонент недоступен для взаимодействия, визуально приглушён. Скринридеры объявляют элемент как unavailable",
    category: "component",
  },

  readonly: {
    designName: "readonly",
    codeName: "readonly",
    type: "boolean",
    description:
      "Значение доступно для просмотра, но не для редактирования. В отличие от disabled, элемент остаётся в фокусе и читается скринридерами",
    category: "component",
  },

  validationStatus: {
    designName: "validationStatus",
    codeName: "validationStatus",
    type: "enum",
    description:
      "Визуально отражает результат валидации через изменение цвета компонента и иконки состояния",
    category: "component",
  },

  interactive: {
    designName: "interactive",
    codeName: "interactive",
    type: "boolean",
    description:
      "Делает изначально статичный элемент интерактивным: добавляет hover, focus и active состояния",
    category: "component",
  },

  selected: {
    designName: "selected",
    codeName: "selected",
    type: "boolean",
    description:
      "Компонент находится в выбранном состоянии. Применяется как в группах элементов, так и для одиночных интерактивных компонентов",
    category: "component",
  },

  expanded: {
    designName: "expanded",
    codeName: "expanded",
    type: "boolean",
    description:
      "Компонент развёрнут. Управляет раскрытым/свёрнутым состоянием disclosure-элементов",
    category: "component",
  },

  title: createTextProp(
    "title",
    "Отображение заголовка компонента",
    "Заголовок компонента"
  ),

  text: createTextProp(
    "text",
    "Отображение основного текстового контента",
    "Основной текстовый контент компонента"
  ),

  description: createTextProp(
    "description",
    "Отображение вспомогательного текста",
    "Вспомогательный текст, дополняющий основной контент"
  ),

  value: createTextProp(
    "value",
    "Отображение текущего значения компонента",
    "Текущее значение компонента"
  ),

  children: createSlotVisibilityProp(
    "children",
    "Отображение вложенного контента",
    "Вложенный элемент компонента"
  ),

  content: createSlotVisibilityProp(
    "content",
    "Отображение контента",
    "Контент компонента"
  ),

  contentBefore: createSlotVisibilityProp(
    "contentBefore",
    "Отображение контента перед основным содержимым",
    "Контент перед основным содержимым"
  ),

  contentAfter: createSlotVisibilityProp(
    "contentAfter",
    "Отображение контента после основного содержимого",
    "Контент после основного содержимого"
  ),

  contentCentered: createSlotVisibilityProp(
    "contentCentered",
    "Отображение контента по центру",
    "Контент по центру"
  ),

  contentLeft: createSlotVisibilityProp(
    "contentLeft",
    "Отображение контента слева",
    "Контент слева"
  ),

  contentRight: createSlotVisibilityProp(
    "contentRight",
    "Отображение контента справа",
    "Контент справа"
  ),

  contentBottom: createSlotVisibilityProp(
    "contentBottom",
    "Отображение контента снизу",
    "Контент снизу"
  ),

  contentTop: createSlotVisibilityProp(
    "contentTop",
    "Отображение контента сверху",
    "Контент сверху"
  ),

  iconBefore: createSlotVisibilityProp(
    "iconBefore",
    "Отображение иконки перед контентом",
    "Иконка перед контентом"
  ),

  iconAfter: createSlotVisibilityProp(
    "iconAfter",
    "Отображение иконки после контента",
    "Иконка после контента"
  ),

  elementBefore: createSlotVisibilityProp(
    "elementBefore",
    "Отображение элемента перед основным контентом",
    "Элемент перед основным контентом"
  ),

  elementAfter: createSlotVisibilityProp(
    "elementAfter",
    "Отображение элемента после основного контента",
    "Элемент после основного контента"
  ),

  elementTop: createSlotVisibilityProp(
    "elementTop",
    "Отображение элемента сверху",
    "Элемент сверху"
  ),

  elementBottom: createSlotVisibilityProp(
    "elementBottom",
    "Отображение элемента снизу",
    "Элемент снизу"
  ),

  elementRight: createSlotVisibilityProp(
    "elementRight",
    "Отображение элемента справа",
    "Элемент справа"
  ),

  elementLeft: createSlotVisibilityProp(
    "elementLeft",
    "Отображение элемента слева",
    "Элемент слева"
  ),

  elementCentered: createSlotVisibilityProp(
    "elementCentered",
    "Отображение элемента по центру",
    "Элемент по центру"
  ),

  image: {
    designName: "image",
    codeName: "image",
    type: "boolean",
    description: "Показывает или скрывает изображение / иллюстрацию внутри компонента",
    category: "visibility",
  },

  actions: {
    designName: "actions",
    codeName: "actions",
    type: "boolean",
    description: "Показывает или скрывает блок дополнительных действий (кнопки, меню и т.д.)",
    category: "visibility",
  },

  action: {
    designName: "action",
    codeName: "action",
    type: "boolean",
    description: "Показывает или скрывает блок дополнительных действий (кнопки, меню и т.д.)",
    category: "visibility",
  },

  notification: {
    designName: "notification",
    codeName: "notification",
    type: "boolean",
    description:
      "Показывает или скрывает вложенный компонент уведомления. В коде передаётся ReactNode с нужным вариантом уведомления",
    category: "visibility",
  },

  draggable: {
    designName: "draggable",
    codeName: "draggable",
    type: "boolean",
    description:
      "Активирует возможность перетаскивания: отображает ручку drag-and-drop",
    category: "component",
  },

  resizable: {
    designName: "resizable",
    codeName: "resizable",
    type: "boolean",
    description:
      "Показывает элементы управления для ручного изменения размеров компонента",
    category: "component",
  },

  closable: {
    designName: "closable",
    codeName: "closable",
    type: "boolean",
    description:
      "Добавляет кнопку закрытия/удаления компонента",
    category: "component",
  },

  placeholder: {
    designName: "placeholder",
    codeName: "placeholder",
    type: "boolean",
    description:
      "Переключает между пустым (placeholder) и заполненным состоянием. В коде placeholder — строка с подсказывающим текстом",
    category: "component",
  },

  clearable: {
    designName: "clearable",
    codeName: "clearable",
    type: "boolean",
    description:
      "Показывает кнопку очистки значения внутри инпута. При нажатии сбрасывает введённый текст",
    category: "component",
  },

  scrollbar: {
    designName: "scrollbar",
    codeName: "scrollbar",
    type: "boolean",
    description:
      "Показывает или скрывает полосу прокрутки внутри компонента. Чисто визуальный проп дизайна",
    category: "dev",
  },

  truncateText: {
    designName: "truncateText",
    codeName: "truncateText",
    type: "boolean",
    description:
      "Обрезает переполняющий текст многоточием вместо переноса на новую строку",
    category: "dev",
  },
} as const;