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
		await this.loadSettings();

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
		this.registerMarkdownCodeBlockProcessor('embed-jupyter', async (meta, el, ctx) => {
			let fullSrc = ""
			let srcPath = ""
			let src = ""
			let langType = "python"  // По умолчанию для кода ячейки
			
			let metaYaml: any
			try {
				metaYaml = parseYaml(meta)
			} catch(e) {
				await MarkdownRenderer.renderMarkdown("`ERROR: invalid embedding (invalid YAML)`", el, '', this)
				return
			}
			
			srcPath = metaYaml.PATH
			if (!srcPath) {
				await MarkdownRenderer.renderMarkdown("`ERROR: invalid source path`", el, '', this)
				return
			}
			
			// Проверяем наличие параметров CELL и CONTENT
			const cellSelector = metaYaml.CELL || "0"  // По умолчанию первая ячейка
			const contentType = metaYaml.CONTENT || "code"  // По умолчанию код
			
			// Получаем содержимое файла Jupyter notebook
			if (srcPath.startsWith("https://") || srcPath.startsWith("http://")) {
				try {
					let httpResp = await requestUrl({url: srcPath, method: "GET"})
					fullSrc = httpResp.text
				} catch(e) {
					const errMsg = `\`ERROR: could't fetch '${srcPath}'\``
					await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
					return
				}
			} else if (srcPath.startsWith("vault://")) {
				srcPath = srcPath.replace(/^(vault:\/\/)/,'');

				const tFile = app.vault.getAbstractFileByPath(srcPath)
				if (tFile instanceof TFile) {
					fullSrc = await app.vault.read(tFile)
				} else {
					const errMsg = `\`ERROR: could't read file '${srcPath}'\``
					await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
					return
				}
			} else {
				const errMsg = "`ERROR: invalid source path, use 'vault://...' or 'http[s]://...'`"
				await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
				return
			}
			
			// Парсим Jupyter notebook
			try {
				const notebook = parseJupyterNotebook(fullSrc);
				
				// Получаем ячейку
				const cell = extractJupyterCell(notebook, cellSelector);
				if (!cell) {
					await MarkdownRenderer.renderMarkdown("`ERROR: cell not found`", el, '', this)
					return
				}
				
				// Если тип контента markdown и ячейка markdown, выводим как markdown
				if (contentType === 'markdown' && cell.cell_type === 'markdown') {
					const markdownContent = await getJupyterCellContent(
						cell, 
						contentType, 
						this.settings.jupyterOutputFormat, 
						this.settings.maxOutputSize,
						this.app,  // Передаем объект приложения
						{         // Передаем настройки для изображений
							saveImagesToAttachments: this.settings.saveImagesToAttachments,
							imagesFolderPath: this.settings.imagesFolderPath,
							imageNameTemplate: this.settings.imageNameTemplate
						},
						srcPath,   // Передаем путь к ноутбуку
						cellSelector  // Передаем селектор ячейки
					);
					await MarkdownRenderer.renderMarkdown(markdownContent, el, '', this);
					return;
				}
				
				// Получаем содержимое ячейки
				src = await getJupyterCellContent(
					cell, 
					contentType, 
					this.settings.jupyterOutputFormat, 
					this.settings.maxOutputSize,
					this.app,  // Передаем объект приложения
					{         // Передаем настройки для изображений
						saveImagesToAttachments: this.settings.saveImagesToAttachments,
						imagesFolderPath: this.settings.imagesFolderPath,
						imageNameTemplate: this.settings.imageNameTemplate
					},
					srcPath,   // Передаем путь к ноутбуку
					cellSelector  // Передаем селектор ячейки
				);
				
				// Определяем язык для рендеринга
				if (contentType === 'output') {
					// Для вывода используем текстовый блок
					langType = 'text';
				} else if (contentType === 'code') {
					// Для кода Jupyter notebook обычно используется Python
					langType = 'python';
					
					// Но можно уточнить язык через метаданные
					if (cell.metadata && cell.metadata.kernelspec && cell.metadata.kernelspec.language) {
						langType = cell.metadata.kernelspec.language;
					}
				}
				
			} catch (error) {
				const errMsg = `\`ERROR: ${error.message}\``
				await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
				return
			}
			
			// Заголовок блока
			let title = metaYaml.TITLE
			if (title === "") {
				// Если TITLE явно установлен в пустую строку, не добавляем заголовок вообще
				return;
			} else if (!title) {
				title = `${srcPath} (${contentType} from cell ${cellSelector})`;
			}
			
			// Рендерим блок с кодом или результатом
			await MarkdownRenderer.renderMarkdown('```' + langType + '\n' + src + '\n```', el, '', this)
			this.addTitleLivePreview(el, title);
		});
	}

	async registerRenderer(lang: string) {
		this.registerMarkdownCodeBlockProcessor(`embed-${lang}`, async (meta, el, ctx) => {
			let fullSrc = ""
			let src = ""

			let metaYaml: any
			try {
				metaYaml = parseYaml(meta)
			} catch(e) {
				await MarkdownRenderer.renderMarkdown("`ERROR: invalid embedding (invalid YAML)`", el, '', this)
				return
			}

			let srcPath = metaYaml.PATH
			if (!srcPath) {
				await MarkdownRenderer.renderMarkdown("`ERROR: invalid source path`", el, '', this)
				return
			}

			if (srcPath.startsWith("https://") || srcPath.startsWith("http://")) {
				try {
					let httpResp = await requestUrl({url: srcPath, method: "GET"})
					fullSrc = httpResp.text
				} catch(e) {
					const errMsg = `\`ERROR: could't fetch '${srcPath}'\``
					await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
					return
				}
			} else if (srcPath.startsWith("vault://")) {
				srcPath = srcPath.replace(/^(vault:\/\/)/,'');

				const tFile = app.vault.getAbstractFileByPath(srcPath)
				if (tFile instanceof TFile) {
					fullSrc = await app.vault.read(tFile)
				} else {
					const errMsg = `\`ERROR: could't read file '${srcPath}'\``
					await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
					return
				}
			} else {
				const errMsg = "`ERROR: invalid source path, use 'vault://...' or 'http[s]://...'`"
				await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
				return
			}

			// Проверка на наличие маркеров
			const markersString = metaYaml.MARKERS;
			if (markersString) {
				try {
					// Парсим строку маркеров
					const [startMarkerFull, endMarkerFull] = parseMarkers(markersString);
					
					// Извлекаем id маркера если он есть (формат: MARKER:id)
					let startMarker = startMarkerFull;
					let endMarker = endMarkerFull;
					
					// Если указаны полные маркеры с id через двоеточие
					if (startMarkerFull.includes(':')) {
						const [markerName, markerId] = startMarkerFull.split(':');
						startMarker = markerName + ":" + markerId;
					} else {
						// Используем маркер без id
						startMarker = startMarkerFull;
					}
					
					if (endMarkerFull.includes(':')) {
						const [markerName, markerId] = endMarkerFull.split(':');
						endMarker = markerName + ":" + markerId;
					} else {
						endMarker = endMarkerFull;
					}
					
					// Извлекаем код между маркерами
					src = extractCodeByMarkers(
						fullSrc, 
						startMarker, 
						endMarker, 
						lang, 
						this.settings.commentStyles
					);
					
				} catch (error) {
					const errMsg = `\`ERROR: ${error.message}\``
					await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
					return
				}
			} else {
				// Существующая логика извлечения кода по номерам строк
				let srcLinesNum: number[] = []
				const srcLinesNumString = metaYaml.LINES
				if (srcLinesNumString) {
					srcLinesNum = analyseSrcLines(srcLinesNumString)
				}

				if (srcLinesNum.length == 0) {
					src = fullSrc
				} else {
					src = extractSrcLines(fullSrc, srcLinesNum)
				}
			}

			let title = metaYaml.TITLE
			if (title === "") {
				// Если TITLE явно установлен в пустую строку, не добавляем заголовок вообще
				return;
			} else if (!title) {
				title = srcPath
			}

			await MarkdownRenderer.renderMarkdown('```' + lang + '\n' + src + '\n```', el, '', this)
			this.addTitleLivePreview(el, title);
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
}
