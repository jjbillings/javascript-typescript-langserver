import {
	IConnection,
	createConnection,
	InitializeParams,
	InitializeResult,
	TextDocuments,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	Definition,
	ReferenceParams,
	Location,
	Hover,
	WorkspaceSymbolParams,
	DocumentSymbolParams,
	SymbolInformation,
	RequestType,
	Range,
	DidOpenTextDocumentParams,
	DidCloseTextDocumentParams,
	DidChangeTextDocumentParams,
	DidSaveTextDocumentParams
} from 'vscode-languageserver';

import * as ts from 'typescript';
import * as types from 'vscode-languageserver-types';

import * as util from './util';
import { LanguageHandler, TypeScriptService } from './typescript-service';

import * as rt from './request-type';

export default function NewConnection(input: any, output: any, strict: boolean, handler: LanguageHandler): IConnection {
	const connection = createConnection(input, output);

	input.removeAllListeners('end');
	input.removeAllListeners('close');
	output.removeAllListeners('end');
	output.removeAllListeners('close');

	let closed = false;
	function close() {
		if (!closed) {
			input.close();
			output.close();
			closed = true;
		}
	}

	connection.onRequest(rt.InitializeRequest.type, (params: InitializeParams): Promise<InitializeResult> => {
		console.error('initialize', params.rootPath);
		return handler.initialize(params, connection, strict);
	});

	connection.onNotification(rt.ExitRequest.type, close);
	connection.onRequest(rt.ShutdownRequest.type, () => []);

	connection.onDidOpenTextDocument((params: DidOpenTextDocumentParams) => handler.didOpen(params));
	connection.onDidChangeTextDocument((params: DidChangeTextDocumentParams) => handler.didChange(params));
	connection.onDidSaveTextDocument((params: DidSaveTextDocumentParams) => handler.didSave(params));
	connection.onDidCloseTextDocument((params: DidCloseTextDocumentParams) => handler.didClose(params));

	connection.onRequest(rt.WorkspaceSymbolsRequest.type, (params: rt.WorkspaceSymbolParamsWithLimit): Promise<SymbolInformation[]> => {
		const enter = new Date().getTime();
		return new Promise<SymbolInformation[]>((resolve, reject) => {
			const init = new Date().getTime();
			try {
				return handler.getWorkspaceSymbols(params).then((result) => {
					const exit = new Date().getTime();
					console.error('workspace/symbol', params.query, 'total', (exit - enter) / 1000.0, 'busy', (exit - init) / 1000.0, 'wait', (init - enter) / 1000.0);
					return resolve(result || []);
				});
			} catch (e) {
				console.error(params, e);
				return resolve([]);
			}
		});
	});

	connection.onRequest(rt.DocumentSymbolRequest.type, (params: DocumentSymbolParams): Promise<SymbolInformation[]> => {
		const enter = new Date().getTime();
		return new Promise<SymbolInformation[]>((resolve, reject) => {
			const init = new Date().getTime();
			try {
				return handler.getDocumentSymbol(params).then((result) => {
					const exit = new Date().getTime();
					console.error('textDocument/documentSymbol', "", 'total', (exit - enter) / 1000.0, 'busy', (exit - init) / 1000.0, 'wait', (init - enter) / 1000.0);
					return resolve(result || []);
				});
			} catch (e) {
				console.error(params, e);
				return resolve([]);
			}
		});
	});

	connection.onRequest(rt.WorkspaceReferenceRequest.type, (params: rt.WorkspaceReferenceParams): Promise<rt.ReferenceInformation[]> => {
		const enter = new Date().getTime();
		return new Promise<rt.ReferenceInformation[]>((resolve, reject) => {
			const init = new Date().getTime();
			try {
				return handler.getWorkspaceReference(params).then((result) => {
					const exit = new Date().getTime();
					console.error('workspace/reference', 'total', (exit - enter) / 1000.0, 'busy', (exit - init) / 1000.0, 'wait', (init - enter) / 1000.0);
					return resolve(result || []);
				});
			} catch (e) {
				console.error(params, e);
				return resolve([]);
			}
		});
	});


	connection.onDefinition((params: TextDocumentPositionParams): Promise<Definition> => {
		const enter = new Date().getTime();
		return new Promise<Definition>((resolve, reject) => {
			try {
				const init = new Date().getTime();
				handler.getDefinition(params).then((result) => {
					const exit = new Date().getTime();
					console.error('definition', params.textDocument.uri, params.position.line, params.position.character, 'total', (exit - enter) / 1000.0, 'busy', (exit - init) / 1000.0, 'wait', (init - enter) / 1000.0);
					return resolve(result || []);
				}, (e) => {
					return reject(e);
				});
			} catch (e) {
				console.error(params, e);
				return resolve([]);
			}
		});
	});

	connection.onHover((params: TextDocumentPositionParams): Promise<Hover> => {
		const enter = new Date().getTime();
		return new Promise<Hover>((resolve, reject) => {
			const init = new Date().getTime();
			try {
				handler.getHover(params).then((hover) => {
					const exit = new Date().getTime();
					console.error('hover', params.textDocument.uri, params.position.line, params.position.character, 'total', (exit - enter) / 1000.0, 'busy', (exit - init) / 1000.0, 'wait', (init - enter) / 1000.0);
					resolve(hover || { contents: [] });
				}, (e) => {
					return reject(e);
				});
			} catch (e) {
				console.error(params, e);
				resolve({ contents: [] });
			}
		});
	});

	connection.onReferences((params: ReferenceParams): Promise<Location[]> => {
		return new Promise<Location[]>((resolve, reject) => {
			const enter = new Date().getTime();
			const init = new Date().getTime();
			try {
				handler.getReferences(params).then((result) => {
					const exit = new Date().getTime();
					console.error('references', params.textDocument.uri, params.position.line, params.position.character, 'found', result.length, 'total', (exit - enter) / 1000.0, 'busy', (exit - init) / 1000.0, 'wait', (init - enter) / 1000.0);
					return resolve(result || []);
				}
				);
			} catch (e) {
				console.error(params, e);
				return resolve([]);
			}
		});
	});

	return connection;
}
