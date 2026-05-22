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
      "Визуальный интерактивный статус компонента в дизайне: enabled/default, hover, active, focus, disabled, readonly",
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

  "validation-status": {
    designName: "validation-status",
    codeName: "validation-status",
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

  "content-before": createSlotVisibilityProp(
    "content-before",
    "Отображение контента перед основным содержимым",
    "Контент перед основным содержимым"
  ),

  "content-after": createSlotVisibilityProp(
    "content-after",
    "Отображение контента после основного содержимого",
    "Контент после основного содержимого"
  ),

  "content-centered": createSlotVisibilityProp(
    "content-centered",
    "Отображение контента по центру",
    "Контент по центру"
  ),

  "content-left": createSlotVisibilityProp(
    "content-left",
    "Отображение контента слева",
    "Контент слева"
  ),

  "content-right": createSlotVisibilityProp(
    "content-right",
    "Отображение контента справа",
    "Контент справа"
  ),

  "content-bottom": createSlotVisibilityProp(
    "content-bottom",
    "Отображение контента снизу",
    "Контент снизу"
  ),

  "content-top": createSlotVisibilityProp(
    "content-top",
    "Отображение контента сверху",
    "Контент сверху"
  ),

  "icon-before": createSlotVisibilityProp(
    "icon-before",
    "Отображение иконки перед контентом",
    "Иконка перед контентом"
  ),

  "icon-after": createSlotVisibilityProp(
    "icon-after",
    "Отображение иконки после контента",
    "Иконка после контента"
  ),

  "element-before": createSlotVisibilityProp(
    "element-before",
    "Отображение элемента перед основным контентом",
    "Элемент перед основным контентом"
  ),

  "element-after": createSlotVisibilityProp(
    "element-after",
    "Отображение элемента после основного контента",
    "Элемент после основного контента"
  ),

  "element-top": createSlotVisibilityProp(
    "element-top",
    "Отображение элемента сверху",
    "Элемент сверху"
  ),

  "element-bottom": createSlotVisibilityProp(
    "element-bottom",
    "Отображение элемента снизу",
    "Элемент снизу"
  ),

  "element-right": createSlotVisibilityProp(
    "element-right",
    "Отображение элемента справа",
    "Элемент справа"
  ),

  "element-left": createSlotVisibilityProp(
    "element-left",
    "Отображение элемента слева",
    "Элемент слева"
  ),

  "element-centered": createSlotVisibilityProp(
    "element-centered",
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

  filled: {
    designName: "filled",
    codeName: "filled",
    type: "boolean",
    description:
      "Компонент находится в заполненном состоянии — есть введённое или выбранное значение",
    category: "component",
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

  placeholder: createTextProp(
    "placeholder",
    "Переключает между пустым (placeholder) и заполненным состоянием",
    "Подсказывающий текст, отображаемый в пустом поле ввода"
  ),

  mask: createTextProp(
    "mask",
    "Включает маскирование ввода — визуально отображает что маска активна",
    "Строка-шаблон маски, отображаемая в поле ввода"
  ),

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

  "truncate-text": {
    designName: "truncate-text",
    codeName: "truncate-text",
    type: "boolean",
    description:
      "Обрезает переполняющий текст многоточием вместо переноса на новую строку",
    category: "dev",
  },
} as const;