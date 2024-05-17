import * as vscode from 'vscode';
import { VueFnMapProvider } from './vueFnMapProvider';

export function activate(context: vscode.ExtensionContext) {
	const dataProvider = new VueFnMapProvider();
	const treeView = vscode.window.createTreeView('vuePropertiesMap', {treeDataProvider: dataProvider});

	vscode.workspace.onDidOpenTextDocument(document => {
		if(document.languageId === 'vue') {
			vscode.window.showInformationMessage('open editor');
			dataProvider.parseVueFile(document.fileName);
		}
	});

	context.subscriptions.push(vscode.commands.registerCommand('extension.refreshVueFunctions', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'vue') {
            dataProvider.parseVueFile(editor.document.fileName);
        }
    }));

	context.subscriptions.push(vscode.commands.registerCommand('jumpToProperty', (filePath, pos) => {
		vscode.workspace.openTextDocument(filePath).then(doc => {
			vscode.window.showTextDocument(doc).then(editor => {
				const range = new vscode.Range(pos, pos);
				editor.revealRange(range);
				editor.selection = new vscode.Selection(pos, pos);
			});
		});
	}));

	vscode.window.registerTreeDataProvider('vuePropertiesMap', dataProvider);
}

export function deactivate() {}
