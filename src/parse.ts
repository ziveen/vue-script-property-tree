import { parse as _parse } from "@babel/parser";
import * as t from "@babel/types";
import * as vscode from 'vscode';

const vueHookNames = [
  "computed",
  "methods",
  "data",
  "provide",
  "inject",
  "components",
  "props",
  "watch",
  "created",
  "mounted",
  "beforeDestroy",
];

export function parse(source: string, filePath: string) {
  if (!source) {
    return [];
  }
  
  const scriptReg = /<\/?script>/g;

  const [start, end] = [...source.matchAll(scriptReg)].map((d) => d.index);
  const scriptStr = source.slice(start + 8, end);

  const ast = _parse(scriptStr, {
    sourceType: "module",
    plugins: ["jsx"],
  });
  const astBody = ast.program.body;

  const declarationConfig = astBody.find(
    (a) => a.type === "ExportDefaultDeclaration"
  ) as t.ExportDefaultDeclaration | undefined;
  if (!declarationConfig) {
    return [];
  }

  if (!t.isObjectExpression(declarationConfig.declaration)) {
    console.log("the export default is not an object");
    return [];
  }

  const hookConfigs = declarationConfig.declaration.properties;

	function createTreeItem(name: string, loc: t.SourceLocation, children?: VueTreeItem[]) {
		const isLeaf = !children;
		return new VueTreeItem(
			name, 
			isLeaf ? vscode.TreeItemCollapsibleState.None:  vscode.TreeItemCollapsibleState.Collapsed, 
			filePath,
			new vscode.Position(loc.start.line, loc.start.column),
			children
		);
	}

  const ret = hookConfigs.reduce((acc, cur) => {
    if (!t.isSpreadElement(cur)) {
      const keyName = t.isIdentifier(cur.key) ? cur.key.name : "";
      if (vueHookNames.includes(keyName)) {
        let children: VueTreeItem[] = [];
				// created、provide等hook的处理
        if (t.isObjectMethod(cur)) {
          for (let child of cur.body.body) {
            if (t.isExpressionStatement(child)) {
              const expression = child.expression;
              if (
                t.isCallExpression(expression) &&
                t.isMemberExpression(expression.callee) &&
                t.isIdentifier(expression.callee.property)
              ) {
								children.push(createTreeItem(expression.callee.property.name, expression.callee.property.loc!));
              }
            }

            if (
              t.isReturnStatement(child) &&
              t.isObjectExpression(child.argument)
            ) {
              child.argument?.properties.forEach((p) => {
                if (t.isObjectProperty(p) && t.isIdentifier(p.key)) {
									children.push(createTreeItem(p.key.name, p.loc!));
                }
              });
            }
          }
        }
				// methods、watch等hook的处理
        if (t.isObjectProperty(cur) && t.isObjectExpression(cur.value)) {
          cur.value.properties.forEach((v) => {
            if ((t.isObjectProperty(v) || t.isObjectMethod(v)) && t.isIdentifier(v.key)) {
							children.push(createTreeItem(v.key.name, v.loc!));
            }
          });
        }

				acc.push(createTreeItem(keyName, cur.key.loc!, children));
      }
    }
    return acc;
  }, [] as VueTreeItem[]);
  return ret;
}

export class VueTreeItem extends vscode.TreeItem {
	children?: VueTreeItem[] = [];
	constructor(
			public readonly label: string,
			public readonly collapsibleState: vscode.TreeItemCollapsibleState,
			filePath: string,
			pos: vscode.Position,
			children?: VueTreeItem[],
	) {
			super(label, collapsibleState);
			this.command = {
				title: 'jump to property',
				command: 'jumpToProperty',
				arguments: [filePath, pos]
			};
			this.children = children;
	}
}