# Embed Code File (Obsidian Plugin)

This plugin allows to embed code files from Obsidian vault or remote file (eg., GitHub), as well as cells from Jupyter notebooks. It works better with live preview feature of Obsidian.

## Enhancements Over Original Plugin

This fork adds significant new features to the original embed-code-file plugin:

1. **Code Extraction by Markers** - Extract code between specific markers in files instead of just line numbers:
   ```
   MARKERS: "BEGIN_SNIPPET:example,END_SNIPPET:example"
   ```

2. **Jupyter Notebook Integration** - Embed content from Jupyter notebooks:
   - Code from cells
   - Output results (including plots and images)
   - Markdown content

3. **Flexible Cell Selection** - Choose cells by:
   - Index number: `CELL: "0"`
   - Cell ID: `CELL: "id:cell_id"`
   - Cell type: `CELL: "type:code"`
   - Cell tag: `CELL: "tag:important_chart"` (visible in Jupyter UI)

4. **Image Handling Options** - Two ways to handle notebook images:
   - Embed as base64 (default)
   - Save as files to Obsidian's attachments folder

## Settings

The plugin include multiple language by default (`c,cpp,java,python,go,ruby,javascript,js,typescript,ts,shell,sh,bash`). You can include any needed language to the comma separated list.

You can also customize the markers used for code extraction and the comment styles for different languages.

### Jupyter Notebook Settings

In the plugin settings, you can configure how Jupyter Notebook content is handled:

* **Enable Jupyter support** - Enable/disable Jupyter notebook integration
* **Jupyter output format** - Choose the format for cell outputs: markdown or raw
* **Max output size** - Limit the maximum size of output to display

### Image Handling Settings

For Jupyter notebooks containing images, you can configure how images are handled:

* **Save images to attachments** - When enabled, images from notebooks will be saved as files instead of being embedded as base64
* **Images folder path** - Path to save images (relative to your vault). Leave empty to use Obsidian's default attachments folder
* **Image name template** - Template for image filenames with variables:
  - `{{notebook}}` - Name of the notebook
  - `{{cell}}` - Cell index or identifier
  - `{{index}}` - Image index within the cell
  - `{{date}}` - Current date (YYYY-MM-DD)

## How to use

First you need to activate the plugin from Community Plugins. Then you can embed the code as follow:

### Embedding code from regular files

````yaml
```embed-<some-language>
PATH: "vault://<some-path-to-code-file>" or "http[s]://<some-path-to-remote-file>"
LINES: "<some-line-number>,<other-number>,...,<some-range>"
TITLE: "<some-title>"
```
````

Or, using markers in code:

````yaml
```embed-<some-language>
PATH: "vault://<some-path-to-code-file>" or "http[s]://<some-path-to-remote-file>"
MARKERS: "BEGIN_SNIPPET:example,END_SNIPPET:example"
TITLE: "<some-title>"
```
````

### Embedding content from Jupyter Notebooks

````yaml
```embed-jupyter
PATH: "vault://<path-to-notebook.ipynb>" or "http[s]://<url-to-notebook.ipynb>"
CELL: "0" or "id:cell_id" or "type:code" or "type:markdown" or "tag:cell_tag"
CONTENT: "code" or "output" or "markdown"
TITLE: "<some-title>"
```
````

Examples:

#### Vault File with line numbers:

````yaml
```embed-cpp
PATH: "vault://Code/main.cpp"
LINES: "2,9,30-40,100-122,150"
TITLE: "Some title"
```
````

#### Vault File with markers:

````yaml
```embed-cpp
PATH: "vault://Code/main.cpp"
MARKERS: "BEGIN_SNIPPET:example,END_SNIPPET:example"
TITLE: "Some title"
```
````

Where the code file might have markers like:

```cpp
// Regular code...

// BEGIN_SNIPPET:example
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
// END_SNIPPET:example

// More code...
```

#### Remote File:

````yaml
```embed-cpp
PATH: "https://raw.githubusercontent.com/almariah/embed-code-file/main/main.ts"
LINES: "30-40"
TITLE: "Some title"
```
````

#### Jupyter Notebook Code Cell:

````yaml
```embed-jupyter
PATH: "vault://Data/analysis.ipynb"
CELL: "3"
CONTENT: "code"
TITLE: "Python code for data cleaning"
```
````

#### Jupyter Notebook Cell with Tag:

````yaml
```embed-jupyter
PATH: "vault://Data/analysis.ipynb"
CELL: "tag:important_chart"
CONTENT: "output"
TITLE: "Important chart from analysis"
```
````

#### Jupyter Notebook Output:

````yaml
```embed-jupyter
PATH: "vault://Data/analysis.ipynb"
CELL: "3"
CONTENT: "output"
TITLE: "Results of data analysis"
```
````

#### Jupyter Notebook Markdown Cell:

````yaml
```embed-jupyter
PATH: "vault://Data/analysis.ipynb"
CELL: "type:markdown"
CONTENT: "markdown"
TITLE: "Documentation from notebook"
```
````

## Properties

For regular code files:

* The `PATH` should be a code file in the vault or remote. If you have used GitHub for example, make sure to use `https://raw.githubusercontent.com/...`

* The `LINES` will include only the specified lines of the code file. Every set of included lines either range or explicit line will append dots (`...`) to included line in a newline. If you want to get rid of dots, minimize the number of sets by using one range as much as you can.

* The `MARKERS` allows you to extract code between specific markers in the file. The format is `START_MARKER,END_MARKER` or with identifiers `START_MARKER:id,END_MARKER:id`. The plugin will automatically detect the comment style based on the language.

For Jupyter notebooks:

* The `CELL` parameter can be:
  - A number (0-based index): `CELL: "0"` for the first cell
  - An ID: `CELL: "id:cell123"` for a cell with a specific ID in its metadata
  - A tag: `CELL: "tag:important_chart"` for a cell with a specific tag (visible in Jupyter UI)
  - A type selector: `CELL: "type:code"` or `CELL: "type:markdown"`

* The `CONTENT` parameter specifies what to extract:
  - `code`: To show the cell's code (for code cells)
  - `output`: To show the cell's execution output (for code cells)
  - `markdown`: To show the cell's markdown content (for markdown cells)

* If `TITLE` is not set, then the title of the code block will be `PATH` value.

### Working with Cell Tags in Jupyter Notebook

To add tags to cells in Jupyter Notebook:

1. Show the tags toolbar:
   - Jupyter Notebook: View → Cell Toolbar → Tags
   - JupyterLab: Tags are visible in the right sidebar

2. Add a tag to a cell:
   - Click "Add Tag" and type your tag name (e.g., "important_chart")
   - Press Enter to confirm

3. Now you can reference this cell in Obsidian using `CELL: "tag:important_chart"`

### Handling Images from Jupyter Notebooks

When working with Jupyter notebooks that contain images (plots, charts, etc.), you have two options:

1. **Embedded images** (default): Images are embedded as base64-encoded data directly in the markdown file. This makes your notes self-contained but may result in large files.

2. **Saved images**: When the "Save images to attachments" option is enabled in settings, the plugin will:
   - Extract images from the notebook
   - Save them as PNG files in your specified attachments folder
   - Insert markdown links to these files in your note

To use the image saving feature:
1. Go to plugin settings
2. Enable "Save images to attachments"
3. Optionally specify a folder and naming pattern
4. When embedding a cell with image outputs, they will be automatically extracted and saved

You can use also `TITLE` with normal code block (without `embed-`), but make sure that the title value is set with double quotes:

````cpp
```cpp TITLE: "Some title"
// some code
...
```
````

Using live preview feature will enhance the embedding experience.

## Content Updates

The plugin loads the content from external files or Jupyter notebooks when:
1. You first open a note in Obsidian
2. You reload the note (e.g., Ctrl+R)
3. You switch between editing/reading views
4. You reload the application

There is no automatic tracking of changes in source files to preserve performance.

## Credits

This plugin is a fork of [embed-code-file](https://github.com/almariah/embed-code-file) by Abdullah Almariah with additional features.

## Demo

#### Embed code file
![Gif](https://github.com/almariah/embed-code-file/blob/main/demo/embed-code-file.gif?raw=true)

#### Embed lines from code file
![Gif](https://github.com/almariah/embed-code-file/blob/main/demo/embed-code-file-lines.gif?raw=true)

#### Embed lines from remote file (eg., GitHub)
![Gif](https://github.com/almariah/embed-code-file/blob/main/demo/embed-remote-code-file.gif?raw=true)

#### Add title to normal code block
![Gif](https://github.com/almariah/embed-code-file/blob/main/demo/normal-code-block-title.gif?raw=true)
