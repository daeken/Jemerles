import * as p from '../../LosingDogs/patterns.mjs';
import { Bobbin } from '../../LosingDogs/bobbin.mjs';

class ReparseException {
}

class Parser {
	constructor() {
		this.binaryOperators = [];
		this.unaryOperators = [];
		this.statements = [];
		this.expressions = [];

		this.inExprStack = [false];

		this.Expr = p.Forward();
		this.Stmt = p.Forward();
		this.Body = p.Forward();
		this.CSE = text =>
			this.inExprStack[this.inExprStack.length - 1] ? this.Expr(text) : this.Stmt(text);
		this.BodyOrStmt = p.Choice(this.Body, this.Stmt);
		this.BodyOrExpr = p.Choice(this.Body, this.Expr);
		this.BodyOrCSE = p.Choice(this.Body, this.CSE);

		this.statements.push(this.Expr);
	}

	wrapCse(value, sub) {
		return text => {
			this.inExprStack.push(value);
			const ret = sub(text);
			this.inExprStack.pop();
			return ret
		}
	}

	addStatement(name, stmt) { this.statements.push(p.Bind(() => ({'astnode': name}), stmt)); }
	addExpression(name, expr) {
		const bexpr = p.Bind(() => ({'astnode': name}), expr);

		let bobbinStack = [];
		let needRecurseStack = [];
		let curRet = p.None;

		const wexpr = text => {
			if(curRet !== p.None && curRet[0] == text.start && curRet[1] == text.end)
				return curRet[2]
			else if(!bobbinStack.includes(text)) {
				bobbinStack.push(text);
				needRecurseStack.push(false);
				let ret = bexpr(text);
				bobbinStack.pop();
				const needRecurse = needRecurseStack.pop();
				if(ret === p.None || !needRecurse) return ret;
				const oldCurRet = curRet;
				while(true) {
					curRet = [text.start, text.end, ret];
					const sret = bexpr(text);
					if(sret === p.None || sret == ret)
						break;
					ret = sret;
				}
				curRet = oldCurRet;
				return ret
			} else {
				needRecurseStack[needRecurseStack.length - 1] = true;
				return p.None
			}
		};
		this.expressions.push(wexpr);
	}

	buildGrammar() {
		this.Expr.value = p.IgnoreLeadingWhitespace(this.wrapCse(true, p.LongestChoice(...this.expressions)));
		this.Stmt.value = p.IgnoreLeadingWhitespace(this.wrapCse(false, p.LongestChoice(...this.statements)));

		const stmtOnly = p.IgnoreLeadingWhitespace(this.wrapCse(false, p.LongestChoice(...this.statements.filter(x => x != this.Expr))));
		const semicolon = p.Regex(/^(\s*;\s)+/);

		const stmtList = text => {
			const stmts = [];
			let needSemicolon = false;

			while(text.length != 0) {
				if(needSemicolon) {
					const cret = semicolon(text);
					if(cret === p.None)
						break;
					needSemicolon = false;
					text = cret[0]
				}
				const sret = stmtOnly(text);
				if(sret == p.None) {
					const eret = this.Expr(text);
					if(eret === p.None)
						break;
					needSemicolon = true;
					text = eret[0];
					stmts.push(eret[1])
				} else {
					text = sret[0];
					stmts.push(sret[1])
				}
			}

			return [text, stmts]
		};

		this.Body.value = p.PopValue(p.LooseSequence(p.Literal('{'), p.PushValue(stmtList), p.Literal('}')));
		return stmtList
	}

	parse(code) {
		const grammar = this.buildGrammar();
		const ast = grammar(new Bobbin(code));
		return ast
	}
}

const parser = new Parser();
import { addSyntax } from './coreSyntax.mjs';
addSyntax(parser);

const ret = parser.parse(`
foo[bar][baz](dsf, hax)[omg](wtf)(pdosj)
`)

if(ret === p.None)
	console.log('Parsing failed :(');
else
	console.log(JSON.stringify(ret[1], null, '\t'))

/*

[
        {
                "astnode": "call",
                "callee": {
                        "astnode": "call",
                        "callee": {
                                "astnode": "index",
                                "base": {
                                        "astnode": "call",
                                        "callee": {
                                                "astnode": "index",
                                                "base": {
                                                        "astnode": "index",
                                                        "base": {
                                                                "astnode": "identifier",
                                                                "name": "foo"
                                                        },
                                                        "index": {
                                                                "astnode": "identifier",
                                                                "name": "bar"
                                                        }
                                                },
                                                "index": {
                                                        "astnode": "identifier",
                                                        "name": "baz"
                                                }
                                        },
                                        "arguments": [
                                                {
                                                        "astnode": "identifier",
                                                        "name": "dsf"
                                                },
                                                {
                                                        "astnode": "identifier",
                                                        "name": "hax"
                                                }
                                        ]
                                },
                                "index": {
                                        "astnode": "identifier",
                                        "name": "omg"
                                }
                        },
                        "arguments": [
                                {
                                        "astnode": "identifier",
                                        "name": "wtf"
                                }
                        ]
                },
                "arguments": [
                        {
                                "astnode": "identifier",
                                "name": "pdosj"
                        }
                ]
        }
]

*/
