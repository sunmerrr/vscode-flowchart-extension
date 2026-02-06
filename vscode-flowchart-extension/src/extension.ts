import * as vscode from 'vscode';
import Parser from 'web-tree-sitter';

let parser: Parser;

async function initTreeSitter() {
    await Parser.init();
    // Path to the wasm file needs to be accessible by the extension
    // For local testing in Node.js env, direct path might work.
    // For deployed extension, it needs to be copied to an 'out' dir and loaded with vscode.Uri
    const pathToWasm = vscode.Uri.file('/Users/lulu/.openclaw/workspace/vscode-flowchart-extension/vscode-flowchart-extension/node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm');
    const Lang = await Parser.Language.load(pathToWasm.fsPath); // Use fsPath for direct file access in Node.js
    parser = new Parser();
    parser.setLanguage(Lang);
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "vscode-flowchart-extension" is now active!');

    // Initialize Tree-sitter parser
    initTreeSitter().then(() => {
        console.log('Tree-sitter parser initialized with JavaScript grammar.');
    }).catch(err => {
        console.error('Failed to initialize Tree-sitter parser:', err);
        vscode.window.showErrorMessage('Failed to load Tree-sitter parser. Check console for details.');
    });

    // Original Hello World command
    let helloWorldDisposable = vscode.commands.registerCommand('vscode-flowchart-extension.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from vscode-flowchart-extension!');
    });

    context.subscriptions.push(helloWorldDisposable);

    // New command to parse the active editor's code
    let parseCodeDisposable = vscode.commands.registerCommand('vscode-flowchart-extension.parseCode', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && parser) {
            const document = editor.document;
            const text = document.getText();
            const tree = parser.parse(text);
            console.log('Tree-sitter CST for active editor:', tree.rootNode.toString());
            vscode.window.showInformationMessage('Code parsed! Check Debug Console for CST.');
        } else {
            vscode.window.showWarningMessage('No active editor or Tree-sitter parser not initialized.');
        }
    });

    context.subscriptions.push(parseCodeDisposable);
}

export function deactivate() {
    if (parser) {
        parser.delete();
    }
}
