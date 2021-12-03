import * as p from '../../LosingDogs/patterns.mjs';
import { Bobbin } from '../../LosingDogs/bobbin.mjs';

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

		this.addExpression('if', p.LooseSequence(
			p.Literal('if'), 
			p.Literal('('), 
			p.Named('cond', this.Expr), 
			p.Literal(')'), 
			p.Named('if_', this.BodyOrCSE), 
			p.Literal('else'), 
			p.Named('else_', this.BodyOrCSE)
		));

		this.addExpression('foo', p.Literal('foo'));
	}

	wrapCse(value, sub) {
		return text => {
			this.inExprStack.push(value);
			const ret = sub(text);
			this.inExprStack.pop();
			return ret
		}
	}

	addStatement(name, stmt) { this.statements.push(p.Bind(() => ({'name': name}), stmt)); }
	addExpression(name, expr) { this.expressions.push(p.Bind(() => ({'name': name}), expr)); }

	buildGrammar() {
		this.Expr.value = p.IgnoreLeadingWhitespace(this.wrapCse(true, p.Choice(...this.expressions)));
		this.Stmt.value = p.IgnoreLeadingWhitespace(this.wrapCse(false, p.Choice(...this.statements)));

		const stmtOnly = p.IgnoreLeadingWhitespace(this.wrapCse(false, p.Choice(...this.statements.filter(x => x != this.Expr))));
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
const ret = parser.parse(`
foo;
if(foo) {
	foo
} else
	foo;
foo
`)

if(ret === p.None)
	console.log('Parsing failed :(');
else
	console.log(JSON.stringify(ret[1], null, '\t'))

/*

[
        {
                "name": "foo"
        },
        {
                "name": "if",
                "cond": {
                        "name": "foo"
                },
                "if_": [
                        {
                                "name": "foo"
                        }
                ],
                "else_": {
                        "name": "foo"
                }
        },
        {
                "name": "foo"
        }
]

*/
