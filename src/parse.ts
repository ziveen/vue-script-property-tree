import * as t from "@babel/types";
import * as vscode from 'vscode';
import {parse as _parse} from '@babel/parser';

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

/**search the line number in the vue file */
function getLineNumber(input: string, searchString: string): number {
  const lines = input.split('\n');
  for(let i = 0;i<lines.length;i++) {
    if(lines[i]?.includes(searchString)) {
      return i;
    }
  }
  return 0;
}

export function parse(source: string, filePath: string) {
  if (!source) {
    return [];
  }

  const reg = /<script>([\s\S]*?)<\/script>/;
  const scriptStr = source.match(reg)?.[1];
  console.log('scriptStr :>> ', scriptStr);
  if(!scriptStr) {
    console.log('no config in this file');
    return [];
  }
  
  const ast =_parse(scriptStr, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('ast :>> ', ast);

  const astBody = ast.program.body;
  if(!astBody) {
    return [];
  }

  const scriptStartLine = getLineNumber(source, '<script');

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
			new vscode.Position(loc.start.line + scriptStartLine - 1, loc.start.column),
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