import path from "path";

export function pathJoin(dir: string, subpath: string): string {
  const result = path.join(dir, subpath);
  // it seems that obsidian do not understand paths with backslashes in Windows, so turn them into forward slashes
  return result.replace(/\\/g, "/");
}

export function analyseSrcLines(str: string): number[] {
	str = str.replace(/\s*/g, "")
	const result: number[] = []

	let strs = str.split(",")
	strs.forEach(it => {
		if(/\w+-\w+/.test(it)) {
			let left = Number(it.split('-')[0])
			let right = Number(it.split('-')[1])
			for(let i = left; i <= right; i++) {
				result.push(i)
			}
			result.push(0) // three dots
		} else {
			result.push(Number(it))
			result.push(0) // three dots
		}
	})

	return result
}

export function extractSrcLines(fullSrc: string,  srcLinesNum: number[]): string {
    let src = ""

    const fullSrcLines = fullSrc.split("\n")
	const fullSrcLinesLen = fullSrcLines.length

	srcLinesNum.forEach((lineNum, index, arr) => {
		if (lineNum > fullSrcLinesLen) {
		  arr.splice(index, 1);
		}
	});

	srcLinesNum.forEach((lineNum, index, arr) => {
		if (lineNum == 0 && arr[index-1] == 0) {
		  arr.splice(index, 1);
		}
	});
	
    srcLinesNum.forEach((lineNum, index) => {
		if (lineNum > fullSrcLinesLen) {
			return
		}

		if (index == srcLinesNum.length-1 && lineNum == 0 && srcLinesNum[index-1] == fullSrcLinesLen) {
			return
		} 

		if (index == 0 && lineNum != 1) {
			src = '...' + '\n' + fullSrcLines[lineNum-1]
			return
		}
		
		// zeros is dots (analyseSrcLines)
        if (lineNum == 0 ) {
			src = src + '\n' + '...'
			return
		}

		if (index == 0) {
			src = fullSrcLines[lineNum-1]
		} else {
			src = src + '\n' + fullSrcLines[lineNum-1]
		}
	});

    return src
}

/**
 * Парсинг строки MARKERS из метаданных блока.
 * Формат: "START_MARKER:id,END_MARKER:id"
 */
export function parseMarkers(markersString: string): [string, string] {
    const markers = markersString.split(',');
    if (markers.length !== 2) {
        throw new Error("MARKERS should contain exactly two markers separated by comma");
    }
    return [markers[0].trim(), markers[1].trim()];
}

/**
 * Получает стиль комментариев для языка на основе настроек.
 */
export function getCommentStyle(language: string, commentStyles: {[key: string]: string}): string {
    for (const langs in commentStyles) {
        if (langs.split(',').includes(language)) {
            return commentStyles[langs];
        }
    }
    // По умолчанию используем "//" для комментариев
    return "//";
}

/**
 * Извлекает код между маркерами.
 * @param fullSrc - полный исходный код
 * @param startMarker - маркер начала блока
 * @param endMarker - маркер конца блока
 * @param language - язык программирования
 * @param commentStyles - стили комментариев из настроек
 * @returns извлеченный код
 */
export function extractCodeByMarkers(
    fullSrc: string, 
    startMarker: string, 
    endMarker: string, 
    language: string, 
    commentStyles: {[key: string]: string}
): string {
    const commentStyle = getCommentStyle(language, commentStyles);
    
    // Создаем регулярное выражение для поиска блока кода между маркерами
    // Учитываем различные стили комментариев
    let regex;
    if (commentStyle.includes(',')) {
        // Для HTML-подобных комментариев (<!-- -->)
        const [openComment, closeComment] = commentStyle.split(',');
        regex = new RegExp(`${openComment}\\s*${startMarker}\\s*${closeComment}([\\s\\S]*?)${openComment}\\s*${endMarker}\\s*${closeComment}`, 'i');
    } else {
        // Для однострочных комментариев (// или #)
        regex = new RegExp(`${commentStyle}\\s*${startMarker}([\\s\\S]*?)${commentStyle}\\s*${endMarker}`, 'i');
    }
    
    const match = fullSrc.match(regex);
    if (!match) {
        return `ERROR: Could not find the specified markers: ${startMarker}, ${endMarker}`;
    }
    
    // Извлекаем код между маркерами и удаляем начальные и конечные пробелы
    return match[1].trim();
}

/**
 * Интерфейс, представляющий ячейку Jupyter notebook
 */
interface JupyterCell {
    cell_type: string;       // 'code', 'markdown', 'raw'
    source: string[];        // Исходный код или текст ячейки
    metadata: any;           // Метаданные ячейки
    execution_count?: number; // Порядковый номер выполнения (для code ячеек)
    outputs?: any[];         // Результаты выполнения (для code ячеек)
}

/**
 * Интерфейс, представляющий Jupyter notebook
 */
interface JupyterNotebook {
    cells: JupyterCell[];
    metadata: any;
    nbformat: number;
    nbformat_minor: number;
}

/**
 * Парсит содержимое файла Jupyter notebook
 * @param content содержимое .ipynb файла
 * @returns распарсенный объект notebook
 */
export function parseJupyterNotebook(content: string): JupyterNotebook {
    try {
        return JSON.parse(content) as JupyterNotebook;
    } catch (error) {
        throw new Error("Failed to parse Jupyter notebook: Invalid JSON");
    }
}

/**
 * Извлекает ячейку по номеру, идентификатору, типу или тегу
 * @param notebook Jupyter notebook
 * @param cellSelector селектор ячейки (number | id:xxx | type:xxx | tag:xxx)
 * @returns найденная ячейка или null
 */
export function extractJupyterCell(notebook: JupyterNotebook, cellSelector: string): JupyterCell | null {
    // Если селектор - число, находим ячейку по номеру
    if (/^\d+$/.test(cellSelector)) {
        const cellIndex = parseInt(cellSelector);
        if (cellIndex >= 0 && cellIndex < notebook.cells.length) {
            return notebook.cells[cellIndex];
        }
        return null;
    }
    
    // Поиск по ID в метаданных
    if (cellSelector.startsWith('id:')) {
        const cellId = cellSelector.substring(3);
        for (const cell of notebook.cells) {
            if (cell.metadata && cell.metadata.id === cellId) {
                return cell;
            }
        }
        return null;
    }
    
    // Поиск по тегу ячейки
    if (cellSelector.startsWith('tag:')) {
        const cellTag = cellSelector.substring(4);
        for (const cell of notebook.cells) {
            if (cell.metadata && cell.metadata.tags && Array.isArray(cell.metadata.tags)) {
                if (cell.metadata.tags.includes(cellTag)) {
                    return cell;
                }
            }
        }
        return null;
    }
    
    // Поиск по типу ячейки
    if (cellSelector.startsWith('type:')) {
        const cellType = cellSelector.substring(5);
        for (const cell of notebook.cells) {
            if (cell.cell_type === cellType) {
                return cell;
            }
        }
        return null;
    }
    
    return null;
}

/**
 * Получает содержимое ячейки Jupyter notebook
 * @param cell ячейка Jupyter
 * @param contentType тип содержимого ('code', 'output', 'markdown')
 * @param outputFormat формат вывода ('markdown', 'raw')
 * @param maxOutputSize максимальный размер вывода
 * @param app объект приложения Obsidian для доступа к хранилищу
 * @param settings настройки для обработки изображений
 * @param notebookPath путь к ноутбуку (для именования изображений)
 * @param cellSelector селектор ячейки (для именования изображений)
 * @returns извлеченное содержимое
 */
export async function getJupyterCellContent(
    cell: JupyterCell, 
    contentType: string, 
    outputFormat: string = 'markdown',
    maxOutputSize: number = 1000,
    app?: any,
    settings?: {
        saveImagesToAttachments: boolean,
        imagesFolderPath: string,
        imageNameTemplate: string
    },
    notebookPath?: string,
    cellSelector?: string | number
): Promise<string> {
    // Для ячеек с кодом - возвращаем код или вывод
    if (cell.cell_type === 'code') {
        // Возвращаем исходный код
        if (contentType === 'code') {
            return cell.source.join('');
        }
        
        // Возвращаем результат выполнения кода
        if (contentType === 'output' && cell.outputs && cell.outputs.length > 0) {
            let result = '';
            let imageIndex = 0;
            
            for (const output of cell.outputs) {
                // Текстовый вывод (stdout, stderr)
                if (output.output_type === 'stream') {
                    result += output.text.join('');
                }
                // Текстовые данные
                else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
                    if (output.data && output.data['text/plain']) {
                        result += output.data['text/plain'].join('');
                    }
                    // Изображения
                    else if (output.data && output.data['image/png'] && outputFormat === 'markdown') {
                        const base64Image = output.data['image/png'];
                        
                        // Если есть все необходимые параметры и включена опция сохранения изображений
                        if (app && settings && settings.saveImagesToAttachments && notebookPath) {
                            const imageMd = await processJupyterImage(
                                base64Image,
                                notebookPath,
                                cellSelector || 'unknown',
                                imageIndex,
                                app,
                                settings
                            );
                            result += imageMd + '\n';
                        } else {
                            // Стандартное встраивание как base64
                            result += `![](data:image/png;base64,${base64Image})\n`;
                        }
                        
                        imageIndex++;
                    }
                    // HTML вывод
                    else if (output.data && output.data['text/html'] && outputFormat === 'markdown') {
                        result += '\n```html\n' + output.data['text/html'].join('') + '\n```\n';
                    }
                }
                // Ошибки
                else if (output.output_type === 'error') {
                    result += `Error: ${output.ename}: ${output.evalue}\n`;
                    if (output.traceback) {
                        result += output.traceback.join('\n');
                    }
                }
            }
            
            // Ограничиваем размер вывода
            if (result.length > maxOutputSize) {
                result = result.substring(0, maxOutputSize) + '... (output truncated)';
            }
            
            return result;
        }
    }
    
    // Для markdown ячеек возвращаем markdown
    if (cell.cell_type === 'markdown' && contentType === 'markdown') {
        return cell.source.join('');
    }
    
    // Для raw ячеек
    if (cell.cell_type === 'raw' && contentType === 'raw') {
        return cell.source.join('');
    }
    
    return `ERROR: Could not extract ${contentType} from ${cell.cell_type} cell`;
}

/**
 * Форматирует имя файла изображения на основе шаблона
 */
export function formatImageName(
    template: string,
    notebookName: string,
    cellIndex: number | string,
    imageIndex: number
): string {
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    return template
        .replace('{{notebook}}', sanitizeFilename(notebookName))
        .replace('{{cell}}', typeof cellIndex === 'number' ? cellIndex.toString() : sanitizeFilename(cellIndex.toString()))
        .replace('{{index}}', imageIndex.toString())
        .replace('{{date}}', formattedDate);
}

/**
 * Очищает строку от недопустимых символов в имени файла
 */
export function sanitizeFilename(name: string): string {
    return name
        .replace(/[/\\?%*:|"<>]/g, '_') // Заменяем недопустимые символы на подчеркивание
        .replace(/\s+/g, '_')          // Заменяем пробелы на подчеркивание
        .replace(/__+/g, '_')          // Заменяем множественные подчеркивания на одно
        .substring(0, 50);             // Ограничиваем длину имени файла
}

/**
 * Получает имя ноутбука из пути к файлу
 */
export function getNotebookNameFromPath(path: string): string {
    const pathSegments = path.split('/');
    const filename = pathSegments[pathSegments.length - 1];
    return filename.replace('.ipynb', '');
}

/**
 * Обрабатывает изображения из вывода ячейки Jupyter
 * В зависимости от настроек либо встраивает их как base64, либо сохраняет на диск
 */
export async function processJupyterImage(
    base64Image: string,
    notebookPath: string,
    cellIndex: number | string,
    imageIndex: number,
    app: any,
    settings: {
        saveImagesToAttachments: boolean,
        imagesFolderPath: string,
        imageNameTemplate: string
    }
): Promise<string> {
    // Если не нужно сохранять изображения на диск, просто возвращаем markdown-ссылку с base64
    if (!settings.saveImagesToAttachments) {
        return `![](data:image/png;base64,${base64Image})`;
    }
    
    try {
        // Получаем имя ноутбука из пути
        const notebookName = getNotebookNameFromPath(notebookPath);
        
        // Формируем имя файла изображения
        const imageName = formatImageName(
            settings.imageNameTemplate,
            notebookName,
            cellIndex,
            imageIndex
        ) + '.png';
        
        // Определяем папку для сохранения
        const attachmentFolder = settings.imagesFolderPath || '';
        const fullPath = attachmentFolder ? 
            `${attachmentFolder}/${imageName}` : 
            imageName;
        
        // Декодируем Base64 в бинарные данные
        const imageData = Buffer.from(base64Image, 'base64');
        
        // Создаем папку, если она не существует
        if (attachmentFolder) {
            const folderExists = await app.vault.adapter.exists(attachmentFolder);
            if (!folderExists) {
                await app.vault.createFolder(attachmentFolder);
            }
        }
        
        // Сохраняем изображение в хранилище Obsidian
        await app.vault.createBinary(fullPath, imageData);
        
        // Возвращаем markdown-ссылку на сохраненное изображение
        return `![](${fullPath})`;
    } catch (error) {
        console.error("Failed to save image from Jupyter notebook:", error);
        // В случае ошибки возвращаем изображение как base64
        return `![](data:image/png;base64,${base64Image})`;
    }
}
