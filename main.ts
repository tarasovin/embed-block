import { Plugin, MarkdownRenderer, TFile, MarkdownPostProcessorContext, MarkdownView, parseYaml, requestUrl} from 'obsidian';
import { EmbedCodeFileSettings, EmbedCodeFileSettingTab, DEFAULT_SETTINGS} from "./settings";
import { 
	analyseSrcLines, 
	extractSrcLines, 
	parseMarkers, 
	extractCodeByMarkers,
	parseJupyterNotebook,
	extractJupyterCell,
	getJupyterCellContent
} from "./utils";

export default class EmbedCodeFile extends Plugin {
	settings: EmbedCodeFileSettings;

	async onload() {
		console.log("Загрузка плагина embed-block");
		
		// Загрузка настроек
		await this.loadSettings();
		
		// Внедряем CSS-стили для решения проблемы с кнопками
		this.injectCustomStyles();

		this.addSettingTab(new EmbedCodeFileSettingTab(this.app, this));

		this.registerMarkdownPostProcessor((element, context) => {
			this.addTitle(element, context);
		});

		// live preview renderers
		const supportedLanguages = this.settings.includedLanguages.split(",")
		supportedLanguages.forEach(l => {
			console.log(`registering renderer for ${l}`)
			this.registerRenderer(l)
		});
		
		// Jupyter notebook support
		if (this.settings.jupyterSupport) {
			console.log("registering Jupyter notebook renderer");
			this.registerJupyterRenderer();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	async registerJupyterRenderer() {
		this.registerMarkdownCodeBlockProcessor('embed-jupyter', async (source, el, ctx) => {
			// Метаданные должны содержать как минимум PATH - путь к файлу .ipynb
			if (!source || source.trim() === '') {
				el.createEl('div', { text: 'Error: No metadata provided for embed-jupyter block.' });
				return;
			}
			
			// Если Jupyter поддержка отключена
			if (!this.settings.jupyterSupport) {
				el.createEl('div', { text: 'Error: Jupyter Notebook support is disabled in settings.' });
				return;
			}
			
			try {
				// Обработка метаданных
				const metaYaml = parseYaml(source);
				const path = metaYaml.PATH || '';
				const cellSelector = metaYaml.CELL || '0';
				const contentType = metaYaml.CONTENT || 'code';
				const title = metaYaml.TITLE ?? path;  // Если TITLE не указан, используем PATH
				
				if (!path) {
					el.createEl('div', { text: 'Error: No PATH specified for embed-jupyter block.' });
					return;
				}
				
				let content = '';
				
				// Получаем содержимое файла в зависимости от типа пути
				if (path.startsWith("https://") || path.startsWith("http://")) {
					try {
						// Для URL используем requestUrl
						let httpResp = await requestUrl({url: path, method: "GET"});
						content = httpResp.text;
					} catch(e) {
						el.createEl('div', { text: `Error: Could not fetch '${path}': ${e.message}` });
						return;
					}
				} else {
					// Для локальных файлов
					let filePath = path;
					if (path.startsWith("vault://")) {
						filePath = path.replace(/^(vault:\/\/)/,'');
					}
					
					const file = this.app.vault.getAbstractFileByPath(filePath);
					if (!file || !(file instanceof TFile)) {
						el.createEl('div', { text: `Error: File not found: ${filePath}` });
						return;
					}
					
					// Проверка расширения файла
					if (!file.path.endsWith('.ipynb')) {
						el.createEl('div', { text: `Error: Not a Jupyter Notebook file: ${filePath}` });
						return;
					}
					
					// Чтение содержимого файла
					content = await this.app.vault.read(file);
				}
				
				try {
					// Парсинг Jupyter notebook и извлечение выбранной ячейки
					const notebook = parseJupyterNotebook(content);
					const cell = extractJupyterCell(notebook, cellSelector);
					
					if (!cell) {
						el.createEl('div', { text: `Error: Cell not found: ${cellSelector}` });
						return;
					}
					
					// Получаем содержимое ячейки на основе запрошенного типа
					const cellContent = await getJupyterCellContent(
						cell, 
						contentType, 
						this.settings.jupyterOutputFormat,
						this.settings.maxOutputSize,
						this.app,
						this.settings,
						path,
						cellSelector
					);
					
					// Определяем язык блока кода
					let language = 'markdown';
					if (contentType === 'code') {
						language = 'python'; // Предполагаем Python по умолчанию
						// В будущем можно добавить определение языка из метаданных notebook
					}
					
					// Создаем элемент кода с содержимым ячейки
					const codeElement = await this.createCodeElement(cellContent, language, title);
					el.appendChild(codeElement);
					
				} catch (err) {
					el.createEl('div', { text: `Error parsing Jupyter Notebook: ${err.message}` });
					return;
				}
				
			} catch (err) {
				el.createEl('div', { text: `Error: ${err.message}` });
			}
		});
	}

	async registerRenderer(lang: string) {
		this.registerMarkdownCodeBlockProcessor(`embed-${lang}`, async (source, el, ctx) => {
			// Определяем метаданные и проверяем минимальные требования (PATH)
			if (!source || source.trim() === '') {
				el.createEl('div', { text: 'Error: No metadata provided.' });
				return;
			}
			
			try {
				// Обрабатываем PATH, LINES, MARKERS и TITLE из метаданных
				const metaYaml = parseYaml(source);
				const path = metaYaml.PATH || '';
				const lines = metaYaml.LINES || '';
				const markers = metaYaml.MARKERS || '';
				const title = metaYaml.TITLE ?? path;  // Если TITLE не указан, используем PATH
				
				if (!path) {
					el.createEl('div', { text: 'Error: No PATH specified.' });
					return;
				}
				
				let content = '';
				
				// Получаем содержимое файла в зависимости от типа пути
				if (path.startsWith("https://") || path.startsWith("http://")) {
					try {
						// Для URL используем requestUrl
						let httpResp = await requestUrl({url: path, method: "GET"});
						content = httpResp.text;
					} catch(e) {
						el.createEl('div', { text: `Error: Could not fetch '${path}': ${e.message}` });
						return;
					}
				} else {
					// Для локальных файлов
					let filePath = path;
					if (path.startsWith("vault://")) {
						filePath = path.replace(/^(vault:\/\/)/,'');
					}
					
					const file = this.app.vault.getAbstractFileByPath(filePath);
					if (!file || !(file instanceof TFile)) {
						el.createEl('div', { text: `Error: File not found: ${filePath}` });
						return;
					}
					
					// Чтение содержимого файла
					content = await this.app.vault.read(file);
				}
				
				// Извлечение запрошенных строк или блока кода между маркерами
				let code;
				if (lines) {
					// Извлекаем код по номерам строк
					const lineNums = analyseSrcLines(lines);
					code = extractSrcLines(content, lineNums);
				} else if (markers) {
					// Извлекаем код между маркерами
					try {
						const [startMarker, endMarker] = parseMarkers(markers);
						code = extractCodeByMarkers(
							content, 
							startMarker || this.settings.defaultStartMarker, 
							endMarker || this.settings.defaultEndMarker,
							lang,
							this.settings.commentStyles
						);
					} catch (err) {
						el.createEl('div', { text: `Error extracting code by markers: ${err.message}` });
						return;
					}
				} else {
					// Используем весь файл, если ни строки, ни маркеры не указаны
					code = content;
				}
				
				// Создаем элемент кода и добавляем на страницу
				const codeElement = await this.createCodeElement(code, lang, title);
				el.appendChild(codeElement);
				
			} catch (err) {
				el.createEl('div', { text: `Error: ${err.message}` });
			}
		});
	}

	addTitleLivePreview(el: HTMLElement, title: string) {
		const codeElm = el.querySelector('pre > code')
		if (!codeElm) { return }
		const pre = codeElm.parentElement as HTMLPreElement;

		this.insertTitlePreElement(pre, title)
	}

	addTitle(el: HTMLElement, context: MarkdownPostProcessorContext) {
		const codeElm = el.querySelector('pre > code')
		if (!codeElm) {
			return
		}

		const pre = codeElm.parentElement as HTMLPreElement;

		const codeSection = context.getSectionInfo(pre)
		if (!codeSection) {
			return
		}

		const view = app.workspace.getActiveViewOfType(MarkdownView)
		if (!view) {
			return
		}

		const num = codeSection.lineStart
		const codeBlockFirstLine = view.editor.getLine(num)

		let matchTitle = codeBlockFirstLine.match(/TITLE:\s*"([^"]*)"/i)
		if (matchTitle == null) {
			return
		}

		const title = matchTitle[1]
		if (title == "") {
			return
		}

		this.insertTitlePreElement(pre, title)
	}

	insertTitlePreElement(pre: HTMLPreElement, title: string) {
		// Удаляем существующие заголовки
		pre
		.querySelectorAll(".obsidian-embed-code-file")
		.forEach((x) => x.remove());

		// Если в настройках включено скрытие заголовков, то не добавляем его
		if (this.settings.hideTitle) {
			return;
		}

		// Добавляем заголовок
		let titleElement = document.createElement("pre");
		titleElement.appendText(title);
		titleElement.className = "obsidian-embed-code-file";
		titleElement.style.color = this.settings.titleFontColor;
		titleElement.style.backgroundColor = this.settings.titleBackgroundColor;
		pre.prepend(titleElement);
	}

	// Обработка кода и создание блока
	private async createCodeElement(code: string, language: string, title: string): Promise<HTMLElement> {
		// Улучшенное регулярное выражение для обнаружения Markdown изображений
		const hasImageMarkdown = code.includes('![](data:image/png;base64,') || 
			code.includes('![](') || 
			/!\[[^\]]*\]\([^)]+\)/g.test(code);
		
		// Если это только изображение и title пустой, напрямую рендерим изображение
		if (hasImageMarkdown && (title === '' || this.settings.hideTitle) && 
			code.trim().startsWith('![') && !code.includes('\n')) {
			// Создаем temp элемент для рендеринга markdown
			const containerEl = document.createElement('div');
			containerEl.addClass('jupyter-image-only');
			
			// Используем MarkdownRenderer вместо прямого присваивания innerHTML
			await MarkdownRenderer.renderMarkdown(code, containerEl, '', this);
			
			// Убедимся, что все внутренние отступы обнулены
			const paragraphs = containerEl.querySelectorAll('p');
			
			// Также обработаем встроенные div-ы если они есть
			const innerDivs = containerEl.querySelectorAll('div');

			// Обработаем изображения
			const images = containerEl.querySelectorAll('img');
			
			return containerEl;
		}
		
		// Основной контейнер
		const containerEl = document.createElement('div');
		containerEl.addClass('embed-code-file-container');
		
		// Только если заголовок не скрыт и не пуст
		if (!this.settings.hideTitle && title !== '') {
			const titleEl = document.createElement('div');
			titleEl.addClass('embed-code-file-title');
			titleEl.textContent = title;
			
			if (this.settings.titleBackgroundColor) {
				titleEl.style.backgroundColor = this.settings.titleBackgroundColor;
			}
			
			if (this.settings.titleFontColor) {
				titleEl.style.color = this.settings.titleFontColor;
			}
			
			containerEl.appendChild(titleEl);
		}
		
		// Отделяем изображения от текста
		let codeWithoutImages = code;
		const imageMatches: string[] = [];
		
		// Извлекаем все markdown-разметки изображений
		const imageRegex = /!\[[^\]]*\]\((?:data:image\/[^;]+;base64,[^)]+|[^)]+)\)/g;
		let match;
		while ((match = imageRegex.exec(code)) !== null) {
			imageMatches.push(match[0]);
			// Удаляем изображение из кода и оставляем пустую строку вместо него
			codeWithoutImages = codeWithoutImages.replace(match[0], '');
		}
		
		// Добавляем изображения в начале блока для лучшей видимости
		if (imageMatches.length > 0) {
			for (const imageMarkdown of imageMatches) {
				const imageWrapper = document.createElement('div');
				imageWrapper.addClass('embed-jupyter-image');

				// Используем MarkdownRenderer вместо прямого присваивания innerHTML
				await MarkdownRenderer.renderMarkdown(imageMarkdown, imageWrapper, '', this);
				
				// Убедимся, что все внутренние отступы обнулены
				const paragraphs = imageWrapper.querySelectorAll('p');
				
				// Также обработаем встроенные div-ы если они есть
				const innerDivs = imageWrapper.querySelectorAll('div');

				
				containerEl.appendChild(imageWrapper);
			}
		}
		
		// Если в коде остался текст (не изображения), добавляем блок кода
		if (codeWithoutImages.trim()) {
			// Используем MarkdownRenderer для рендеринга блока кода с подсветкой
			const codeWrapper = document.createElement('div');
			codeWrapper.addClass('code-wrapper');
			
			const formattedCode = '```' + language + '\n' + codeWithoutImages.trim() + '\n```';
			await MarkdownRenderer.renderMarkdown(formattedCode, codeWrapper, '', this);
			
			// Обнуляем отступы для всех внутренних элементов
			const preElements = codeWrapper.querySelectorAll('pre');
			preElements.forEach(pre => {
				pre.addClass('embed-code-file');
			});
			
			// Также обработаем другие элементы, которые могут добавить лишние отступы
			const paragraphs = codeWrapper.querySelectorAll('p');
			
			const divs = codeWrapper.querySelectorAll('div');

			containerEl.appendChild(codeWrapper);
		}
		
		return containerEl;
	}

	// Добавляем метод highlightSyntax для подсветки синтаксиса
	private highlightSyntax(codeBlock: Element, language: string) {
		// Используем стандартную подсветку Obsidian
		// Метод остается пустым, так как Obsidian автоматически
		// подсвечивает синтаксис на основе класса language-*
	}

	// Добавляем метод для внедрения CSS-стилей для решения проблемы с накладывающимися кнопками
	private injectCustomStyles() {
		const id = 'embed-code-custom-styles';
		
		// Удаляем существующий элемент стилей, если он есть
		const existingStyle = document.getElementById(id);
		if (existingStyle) {
			existingStyle.remove();
		}
		
		// Создаем новый элемент стилей с более жесткими правилами
		const styleEl = document.createElement('style');
		styleEl.id = id;
		styleEl.textContent = `
			/* Общие правила для кнопки копирования */
			.copy-code-button {
				top: 12px !important;
				right: 12px !important;
				z-index: 5 !important;
				opacity: 0.7 !important;
				position: absolute !important;
			}
			
			.copy-code-button:hover {
				opacity: 1 !important;
			}
			
			/* Общие правила для кнопки редактирования, перемещаем все в нижний угол */
			.edit-block-button {
				top: auto !important;
				bottom: 12px !important;
				right: 12px !important;
				z-index: 10 !important;
				position: absolute !important;
			}
			
			/* Правила для стандартных блоков кода Obsidian */
			.markdown-rendered pre > .copy-code-button {
				top: 12px !important;
				right: 12px !important;
			}
			
			/* Правила для блоков без заголовка */
			.markdown-rendered div.code-block-wrap + div > .edit-block-button,
			.markdown-rendered pre.code-block + div > .edit-block-button,
			.markdown-source-view div.code-block-wrap + div > .edit-block-button,
			.markdown-source-view pre.code-block + div > .edit-block-button {
				top: auto !important;
				bottom: 12px !important;
				right: 12px !important;
			}
			
			/* Специальные правила для наших кастомных блоков */
			.markdown-rendered .embed-code-file-container + div > .edit-block-button {
				top: auto !important;
				bottom: 12px !important;
				right: 12px !important;
			}
			
			/* Удаление серого бордера вокруг блока и стилизация под стандартные блоки кода Obsidian */
			.embed-code-file-container {
				border: none !important;
				background-color: transparent !important;
				border-radius: 0 !important;

				box-shadow: none !important;
				outline: none !important;
			}
			
			
			/* Добавляем отступы и фон для контейнеров с изображениями */
			.embed-code-file-container .embed-jupyter-image {
				background-color: var(--code-background) !important;
				border: var(--code-border-width) solid var(--code-border) !important;
				border-radius: var(--radius-s) !important;

			}
			
			/* Стили для блоков с кодом внутри контейнера */
			.embed-code-file-container pre,
			.embed-code-file-container pre.code-block {
				border-radius: var(--radius-s) !important;

				background-color: var(--code-background) !important;
				border: var(--code-border-width) solid var(--code-border) !important;
				outline: none !important;
			}
			
			/* Стиль для заголовка */
			.embed-code-file-title {

				font-size: var(--font-smaller) !important;
				border-bottom: none !important;
				border-radius: var(--radius-s) var(--radius-s) 0 0 !important;
				border: var(--code-border-width) solid var(--code-border) !important;
				border-bottom: none !important;
				background-color: var(--code-background) !important;
			}
			
			/* Отображение элементов в правильном контексте */
			.embed-code-file-container .code-wrapper pre {
				border-top-left-radius: 0 !important;
				border-top-right-radius: 0 !important;
			}
			
			/* Для блоков кода без заголовка сохраняем все закругления */
			.embed-code-file-container:not(:has(.embed-code-file-title)) .code-wrapper pre {
				border-radius: var(--radius-s) !important;
			}
			
			/* Убираем лишние отступы для всех элементов внутри контейнера */
			.embed-code-file-container p,
			.embed-code-file-container div:not(.embed-code-file-title):not(.code-wrapper),
			.jupyter-image-only p {

			}
			
			/* Стили ховера для наших блоков как у стандартных блоков кода */
			.theme-light .embed-code-file-container:hover .code-wrapper pre,
			.theme-dark .embed-code-file-container:hover .code-wrapper pre {
				background-color: var(--code-background-hover, var(--code-background)) !important;
				border-color: var(--interactive-accent) !important;
				outline: none !important;
			}
			
			/* Стили ховера для заголовка при наведении на весь контейнер */
			.theme-light .embed-code-file-container:hover .embed-code-file-title,
			.theme-dark .embed-code-file-container:hover .embed-code-file-title {
				background-color: var(--code-background-hover, var(--code-background)) !important;
				border-color: var(--interactive-accent) !important;
				border-bottom: none !important;
			}
			
			/* Убираем любые бордеры при наведении */
			.embed-code-file-container:hover {
				border: none !important;
				outline: none !important;
				box-shadow: none !important;
			}
			
			/* Фикс для консистентного цвета фона блока кода */
			.embed-code-file-container .code-wrapper {
				background-color: transparent !important;
			}
		`;
		
		// Добавляем элемент стилей в DOM
		document.head.appendChild(styleEl);
		
		console.log("Embedded custom styles for embed-block plugin buttons");
	}
}
