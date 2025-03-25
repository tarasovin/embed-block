import EmbedCodeFile from './main';

import { PluginSettingTab, Setting, App } from 'obsidian';

export interface EmbedCodeFileSettings {
	includedLanguages: string;
	titleBackgroundColor: string;
	titleFontColor: string;
	hideTitle: boolean;
	commentStyles: {[key: string]: string};
	defaultStartMarker: string;
	defaultEndMarker: string;
	jupyterSupport: boolean;
	jupyterOutputFormat: string;
	maxOutputSize: number;
	// Настройки для сохранения изображений
	saveImagesToAttachments: boolean;
	imagesFolderPath: string;
	imageNameTemplate: string;
}

export const DEFAULT_SETTINGS: EmbedCodeFileSettings = {
	includedLanguages: 'c,cs,cpp,java,python,go,ruby,javascript,js,typescript,ts,shell,sh,bash',
	titleBackgroundColor: "#00000020",
	titleFontColor: "",
	hideTitle: false,
	commentStyles: {
		'c,cpp,cs,java,javascript,js,typescript,ts': '//',
		'python,ruby,shell,sh,bash': '#',
		'html,xml': '<!--,-->'
	},
	defaultStartMarker: "BEGIN_SNIPPET",
	defaultEndMarker: "END_SNIPPET",
	jupyterSupport: true,
	jupyterOutputFormat: "markdown",
	maxOutputSize: 100000,
	// Значения по умолчанию для сохранения изображений
	saveImagesToAttachments: false,
	imagesFolderPath: "", // Пустое значение означает использование папки Obsidian по умолчанию
	imageNameTemplate: "jupyter_image_{{notebook}}_{{cell}}_{{index}}"
}

export class EmbedCodeFileSettingTab extends PluginSettingTab {
	plugin: EmbedCodeFile;

	constructor(app: App, plugin: EmbedCodeFile) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', {text: 'Embed Code File Settings'});

		new Setting(containerEl)
			.setName('Included Languages')
			.setDesc('Comma separated list of included languages.')
			.addText(text => text
				.setPlaceholder('Comma separated list')
				.setValue(this.plugin.settings.includedLanguages)
				.onChange(async (value) => {
					this.plugin.settings.includedLanguages = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Font color of title")
			.addText(text => text
				.setPlaceholder('Enter a color')
				.setValue(this.plugin.settings.titleFontColor)
				.onChange(async (value) => {
					this.plugin.settings.titleFontColor = value;
					await this.plugin.saveSettings();
				}));
		  
		new Setting(containerEl)
			.setName('Background color of title')
			.addText(text => text
				.setPlaceholder('#00000020')
				.setValue(this.plugin.settings.titleBackgroundColor)
				.onChange(async (value) => {
					this.plugin.settings.titleBackgroundColor = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Hide title')
			.setDesc('Hide the title completely for all embedded blocks')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideTitle)
				.onChange(async (value) => {
					this.plugin.settings.hideTitle = value;
					await this.plugin.saveSettings();
				}));
				
		new Setting(containerEl)
			.setName('Default start marker')
			.setDesc('Default marker for the beginning of a code snippet')
			.addText(text => text
				.setPlaceholder('BEGIN_SNIPPET')
				.setValue(this.plugin.settings.defaultStartMarker)
				.onChange(async (value) => {
					this.plugin.settings.defaultStartMarker = value;
					await this.plugin.saveSettings();
				}));
				
		new Setting(containerEl)
			.setName('Default end marker')
			.setDesc('Default marker for the end of a code snippet')
			.addText(text => text
				.setPlaceholder('END_SNIPPET')
				.setValue(this.plugin.settings.defaultEndMarker)
				.onChange(async (value) => {
					this.plugin.settings.defaultEndMarker = value;
					await this.plugin.saveSettings();
				}));

		// Добавляем раздел настроек для Jupyter
		containerEl.createEl('h3', {text: 'Jupyter Notebook Settings'});
		
		new Setting(containerEl)
			.setName('Enable Jupyter support')
			.setDesc('Enable support for embedding content from Jupyter notebooks')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.jupyterSupport)
				.onChange(async (value) => {
					this.plugin.settings.jupyterSupport = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Jupyter output format')
			.setDesc('Format for cell outputs: markdown (default) or raw')
			.addDropdown(dropdown => dropdown
				.addOption('markdown', 'Markdown')
				.addOption('raw', 'Raw')
				.setValue(this.plugin.settings.jupyterOutputFormat)
				.onChange(async (value) => {
					this.plugin.settings.jupyterOutputFormat = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Max output size')
			.setDesc('Maximum size of output to display (in characters)')
			.addText(text => text
				.setPlaceholder('1000')
				.setValue(String(this.plugin.settings.maxOutputSize))
				.onChange(async (value) => {
					const numValue = parseInt(value);
					if (!isNaN(numValue) && numValue > 0) {
						this.plugin.settings.maxOutputSize = numValue;
						await this.plugin.saveSettings();
					}
				}));
		
		// Добавляем настройки для изображений
		containerEl.createEl('h4', {text: 'Jupyter Images Settings'});
		
		new Setting(containerEl)
			.setName('Save images to attachments')
			.setDesc('Save Jupyter notebook images as files instead of embedding them as base64')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.saveImagesToAttachments)
				.onChange(async (value) => {
					this.plugin.settings.saveImagesToAttachments = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Images folder path')
			.setDesc('Path to save images relative to vault. Leave empty to use Obsidian\'s default attachments folder')
			.addText(text => text
				.setPlaceholder('assets/jupyter-images')
				.setValue(this.plugin.settings.imagesFolderPath)
				.onChange(async (value) => {
					this.plugin.settings.imagesFolderPath = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Image name template')
			.setDesc('Template for image filenames. Available variables: {{notebook}}, {{cell}}, {{index}}, {{date}}')
			.addText(text => text
				.setPlaceholder('jupyter_image_{{notebook}}_{{cell}}_{{index}}')
				.setValue(this.plugin.settings.imageNameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.imageNameTemplate = value;
					await this.plugin.saveSettings();
				}));
	}
}
