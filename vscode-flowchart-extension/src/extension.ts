import * as vscode from 'vscode';
import Parser from 'web-tree-sitter';
import { buildControlFlowGraph, ControlFlowGraph } from './cfgBuilder'; // Import the new function and types

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

    // New command to parse the active editor's code and build CFG
    let parseCodeDisposable = vscode.commands.registerCommand('vscode-flowchart-extension.parseCode', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && parser) {
            const document = editor.document;
            const text = document.getText();
            const tree = parser.parse(text);

            // Use the new cfgBuilder to build the Control Flow Graph
            const cfg: ControlFlowGraph = buildControlFlowGraph(tree);
            console.log('Generated Control Flow Graph:', JSON.stringify(cfg, null, 2)); // Log the CFG
            vscode.window.showInformationMessage('Code parsed and CFG generated! Check Debug Console.');
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
