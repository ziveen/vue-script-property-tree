import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { VueTreeItem, parse } from "./parse";

export class VueFnMapProvider implements vscode.TreeDataProvider<any> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    VueTreeItem | undefined | void
  > = new vscode.EventEmitter<VueTreeItem | undefined | void>();
  readonly onDidChangeTreeData?: vscode.Event<VueTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private vueProperties: VueTreeItem[] = [];

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  parseVueFile(filePath: string) {
    const resolvePath = path.resolve(__dirname, filePath);
    const source = fs.readFileSync(resolvePath, "utf-8");
    const tree = parse(source, filePath);
    this.vueProperties = tree;
    this.refresh();
  }

  getTreeItem(element: any): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: any): vscode.ProviderResult<any[]> {
    if (!element) {
      return Promise.resolve(this.vueProperties);
    } else {
      return Promise.resolve(element.children);
    }
  }
}
