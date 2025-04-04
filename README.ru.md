# Embed Block (Плагин для Obsidian)

Этот плагин позволяет встраивать блоки кода из внешних файлов (локальных или удаленных) и ячеек Jupyter Notebook в заметки Obsidian. Наилучшие результаты достигаются при использовании функции Live Preview в Obsidian.

## Функциональные возможности

1. **Встраивание кода из файлов** 
   - По номерам строк
   - По специальным маркерам в коде
   - Из локальных и удаленных источников

2. **Встраивание содержимого из Jupyter Notebook**
   - Исходный код ячеек
   - Результаты выполнения кода
   - Текст из Markdown-ячеек
   - Поддержка выбора ячеек по номеру, ID, типу или тегу

3. **Обработка изображений из Jupyter Notebook**
   - Встраивание изображений как base64
   - Сохранение изображений как файлов в хранилище Obsidian

## Настройки

### Основные настройки

В плагине по умолчанию включена поддержка множества языков программирования (`c,cpp,java,python,go,ruby,javascript,js,typescript,ts,shell,sh,bash`). Вы можете добавить любые необходимые языки в список, разделенный запятыми.

Также вы можете настроить маркеры, используемые для извлечения кода, и стили комментариев для разных языков.

#### Настройки заголовка

- **Цвет текста заголовка** - Настройка цвета текста заголовка встраиваемого блока
- **Цвет фона заголовка** - Настройка цвета фона строки заголовка
- **Скрыть заголовок** - Включите эту опцию, чтобы полностью скрыть заголовки во всех встраиваемых блоках

### Настройки Jupyter Notebook

В настройках плагина вы можете настроить обработку содержимого Jupyter Notebook:

* **Enable Jupyter support** - Включение/отключение интеграции с Jupyter Notebook
* **Jupyter output format** - Формат вывода ячеек: markdown или raw
* **Max output size** - Ограничение максимального размера выводимого содержимого

### Настройки обработки изображений

Для ноутбуков Jupyter, содержащих изображения, вы можете настроить способ их обработки:

* **Save images to attachments** - Когда включено, изображения из ноутбуков будут сохраняться в виде файлов вместо встраивания в формате base64
* **Images folder path** - Путь для сохранения изображений (относительно вашего хранилища). Оставьте пустым для использования папки вложений Obsidian по умолчанию
* **Image name template** - Шаблон имен файлов изображений с переменными:
  - `{{notebook}}` - Имя ноутбука
  - `{{cell}}` - Индекс ячейки или идентификатор
  - `{{index}}` - Индекс изображения в ячейке
  - `{{date}}` - Текущая дата (ГГГГ-ММ-ДД)

## Как использовать

Сначала активируйте плагин в разделе Community Plugins в настройках Obsidian. После этого вы можете встраивать код следующим образом:

### Встраивание кода из обычных файлов

````yaml
```embed-<язык>
PATH: "vault://<путь-к-файлу-с-кодом>" или "http[s]://<путь-к-удаленному-файлу>"
LINES: "<номер-строки>,<другой-номер>,...,<диапазон>"
TITLE: "<заголовок>"
```
````

Или с использованием маркеров в коде:

````yaml
```embed-<язык>
PATH: "vault://<путь-к-файлу-с-кодом>" или "http[s]://<путь-к-удаленному-файлу>"
MARKERS: "BEGIN_SNIPPET:пример,END_SNIPPET:пример"
TITLE: "<заголовок>"
```
````

### Встраивание содержимого из Jupyter Notebook

````yaml
```embed-jupyter
PATH: "vault://<путь-к-notebook.ipynb>" или "http[s]://<url-к-notebook.ipynb>"
CELL: "0" или "id:cell_id" или "type:code" или "type:markdown" или "tag:cell_tag"
CONTENT: "code" или "output" или "markdown"
TITLE: "<заголовок>"
```
````

Примеры:

#### Файл из хранилища с указанием номеров строк:

````yaml
```embed-cpp
PATH: "vault://Code/main.cpp"
LINES: "2,9,30-40,100-122,150"
TITLE: "Заголовок примера"
```
````

#### Файл из хранилища с маркерами:

````yaml
```embed-cpp
PATH: "vault://Code/main.cpp"
MARKERS: "BEGIN_SNIPPET:example,END_SNIPPET:example"
TITLE: "Заголовок примера"
```
````

#### Файл из хранилища со скрытым заголовком:

````yaml
```embed-cpp
PATH: "vault://Code/main.cpp"
LINES: "10-20"
TITLE: ""
```
````

Где в файле с кодом могут быть маркеры вида:

```cpp
// Обычный код...

// BEGIN_SNIPPET:example
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
// END_SNIPPET:example

// Ещё код...
```

#### Удаленный файл:

````yaml
```embed-cpp
PATH: "https://raw.githubusercontent.com/almariah/embed-code-file/main/main.ts"
LINES: "30-40"
TITLE: "Заголовок примера"
```
````

#### Код из ячейки Jupyter Notebook:

````yaml
```embed-jupyter
PATH: "vault://Data/analysis.ipynb"
CELL: "3"
CONTENT: "code"
TITLE: "Python код для очистки данных"
```
````

#### Код из ячейки Jupyter Notebook (без заголовка):

````yaml
```embed-jupyter
PATH: "vault://Data/analysis.ipynb"
CELL: "3"
CONTENT: "code"
TITLE: ""
```
````

#### Ячейка Jupyter Notebook с тегом:

````yaml
```embed-jupyter
PATH: "vault://Data/analysis.ipynb"
CELL: "tag:important_chart"
CONTENT: "output"
TITLE: "Важный график из анализа"
```
````

#### Вывод ячейки Jupyter Notebook:

````yaml
```embed-jupyter
PATH: "vault://Data/analysis.ipynb"
CELL: "3"
CONTENT: "output"
TITLE: "Результаты анализа данных"
```
````

#### Markdown-ячейка Jupyter Notebook:

````yaml
```embed-jupyter
PATH: "vault://Data/analysis.ipynb"
CELL: "type:markdown"
CONTENT: "markdown"
TITLE: "Документация из ноутбука"
```
````

## Параметры

Для обычных файлов с кодом:

* `PATH` должен указывать на файл с кодом в хранилище или удаленный файл. Если вы используете GitHub, убедитесь, что используете `https://raw.githubusercontent.com/...`

* `LINES` будет включать только указанные строки из файла. Каждый набор включенных строк (отдельные строки или диапазон) будет добавлять многоточие (`...`) к включенной строке в новой строке. Если вы хотите избавиться от многоточия, минимизируйте количество наборов, используя один диапазон, насколько это возможно.

* `MARKERS` позволяет извлекать код между определенными маркерами в файле. Формат: `START_MARKER,END_MARKER` или с идентификаторами `START_MARKER:id,END_MARKER:id`. Плагин автоматически определит стиль комментариев на основе языка.

Для Jupyter Notebook:

* Параметр `CELL` может быть:
  - Числом (индекс, начиная с 0): `CELL: "0"` для первой ячейки
  - ID: `CELL: "id:cell123"` для ячейки с определенным ID в метаданных
  - Тегом: `CELL: "tag:important_chart"` для ячейки с определенным тегом (видимым в интерфейсе Jupyter)
  - Селектором типа: `CELL: "type:code"` или `CELL: "type:markdown"`

* Параметр `CONTENT` определяет, что извлекать:
  - `code`: Показать код ячейки (для ячеек с кодом)
  - `output`: Показать результат выполнения ячейки (для ячеек с кодом)
  - `markdown`: Показать markdown-содержимое ячейки (для markdown-ячеек)

* Если `TITLE` не задан, заголовком блока кода будет значение `PATH`.
* Вы можете использовать `TITLE: ""` (пустую строку), чтобы скрыть заголовок для конкретного блока, даже если глобальная настройка "Скрыть заголовок" не включена.

### Работа с тегами ячеек в Jupyter Notebook

Чтобы добавить теги к ячейкам в Jupyter Notebook:

1. Покажите панель тегов:
   - Jupyter Notebook: View → Cell Toolbar → Tags
   - JupyterLab: Теги видны в правой боковой панели

2. Добавьте тег к ячейке:
   - Нажмите "Add Tag" и введите имя тега (например, "important_chart")
   - Нажмите Enter для подтверждения

3. Теперь вы можете ссылаться на эту ячейку в Obsidian, используя `CELL: "tag:important_chart"`

### Обработка изображений из Jupyter Notebook

При работе с ноутбуками Jupyter, содержащими изображения (графики, диаграммы и т.д.), у вас есть два варианта:

1. **Встроенные изображения** (по умолчанию): Изображения встраиваются в виде данных в формате base64 непосредственно в markdown-файл. Это делает ваши заметки автономными, но может привести к большим файлам.

2. **Сохраненные изображения**: Когда в настройках включена опция "Save images to attachments", плагин будет:
   - Извлекать изображения из ноутбука
   - Сохранять их как PNG-файлы в указанную папку вложений
   - Вставлять markdown-ссылки на эти файлы в вашу заметку

Для использования функции сохранения изображений:
1. Перейдите в настройки плагина
2. Включите "Save images to attachments"
3. При желании укажите папку и шаблон именования
4. При встраивании ячейки с выводом изображений они будут автоматически извлечены и сохранены

Также можно использовать `TITLE` с обычным блоком кода (без `embed-`), но убедитесь, что значение заголовка задано в двойных кавычках:

````cpp
```cpp TITLE: "Заголовок примера"
// какой-то код
...
```
````

Использование функции Live Preview улучшит опыт встраивания.

## Дополнительная информация

### Обновление содержимого

В текущей реализации плагин не имеет автоматического механизма отслеживания изменений в исходных файлах. Содержимое обновляется в следующих случаях:

1. При первом открытии заметки в Obsidian
2. При перезагрузке заметки (например, Ctrl+R)
3. При переключении между режимами просмотра (редактирование/чтение)
4. При перезагрузке приложения

Плагин не отслеживает изменения в исходных файлах в реальном времени, чтобы не потреблять лишние ресурсы и не создавать лишний сетевой трафик для удаленных файлов.

### Маркеры в коде

Маркеры позволяют выделять участки кода для вставки непосредственно в исходном файле. Это особенно полезно для больших файлов, где вы хотите встраивать только определенные части. Формат маркеров:

```
// BEGIN_SNIPPET:имя_маркера
код для вставки
// END_SNIPPET:имя_маркера
```

Плагин автоматически определяет стиль комментариев (`//`, `#`, `<!---->`) на основе языка программирования, указанного в блоке кода.

### Изображения из Jupyter Notebook

Функция сохранения изображений на диск вместо встраивания их в виде base64 имеет несколько преимуществ:

1. **Уменьшение размера файлов заметок** - base64-кодированные изображения могут значительно увеличивать размер.
2. **Улучшенная читаемость исходного кода** заметок.
3. **Возможность повторного использования изображений** между разными заметками.
4. **Автоматическая организация изображений** - плагин создает папки и именует файлы согласно настройкам.
5. **Совместимость с другими плагинами Obsidian**, которые работают с изображениями.

Вы можете настроить шаблон имени файла с помощью переменных:
- `{{notebook}}` - Имя ноутбука
- `{{cell}}` - Идентификатор ячейки
- `{{index}}` - Индекс изображения в ячейке
- `{{date}}` - Текущая дата

### Теги ячеек в Jupyter

Теги в Jupyter Notebook легко добавлять через интерфейс (View → Cell Toolbar → Tags). Теги видны в интерфейсе, что упрощает их использование. Их можно использовать для категоризации ячеек (например, "plot", "important", "explanation").

Использование тегов имеет важное преимущество: даже если порядок или количество ячеек в ноутбуке изменится, ссылка на ячейку по тегу останется действительной, в отличие от ссылки по номеру ячейки. 