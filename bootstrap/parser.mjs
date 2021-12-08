import * as p from '../../LosingDogs/patterns.mjs';
import { Bobbin } from '../../LosingDogs/bobbin.mjs';
import { indexToLineColumn } from './common.mjs';

class ReparseException {
}

class Parser {
	constructor() {
		this.binaryOperators = {};
		this.statements = [];
		this.expressions = [];
		this.expressionNames = [];

		this.inExprStack = [false];

		this.Expr = p.Forward();
		this.Stmt = p.Forward();
		this.StmtList = p.Forward();
		this.Body = p.PopValue(p.LooseSequence(p.Literal('{'), p.PushValue(this.StmtList), p.Literal('}')));
		this.CSE = text =>
			this.inExprStack[this.inExprStack.length - 1] ? this.Expr(text) : this.Stmt(text);
		this.BodyOrStmt = p.Choice(this.Body, this.Stmt);
		this.BodyOrExpr = p.Choice(this.Body, this.Expr);
		this.BodyOrCSE = p.Choice(this.Body, this.CSE);

		this.statements.push(this.Expr);

		this.parsing = false;
	}

	wrapCse(value, sub) {
		return text => {
			this.inExprStack.push(value);
			const ret = sub(text);
			this.inExprStack.pop();
			return ret
		}
	}

	rewriteLeftRecursion(expr) {
		let bobbinStack = [];
		let needRecurseStack = [];
		let curRet = p.None;

		return text => {
			if(curRet !== p.None && curRet[0] === text.start && curRet[1] === text.end)
				return curRet[2]
			else if(!bobbinStack.includes(text)) {
				bobbinStack.push(text);
				needRecurseStack.push(false);
				let ret, needRecurse;
				try {
					ret = expr(text);
				} finally {
					bobbinStack.pop();
					needRecurse = needRecurseStack.pop();
				}
				if(ret === p.None || !needRecurse) return ret;
				const oldCurRet = curRet;
				try {
					while(true) {
						curRet = [text.start, text.end, ret];
						const sret = expr(text);
						if(sret === p.None || sret === ret)
							break;
						ret = sret;
					}
				} finally {
					curRet = oldCurRet;
				}
				return ret
			} else {
				needRecurseStack[needRecurseStack.length - 1] = true;
				return p.None
			}
		};
	}

	addStatement(name, stmt) { this.statements.push(p.Bind(() => ({'astnode': name}), stmt)); }
	addStatementWithTransform(name, transform, stmt) {
		this.statements.push(p.Transform(transform, p.Bind(() => ({'astnode': name}), stmt)));
	}
	hasExpression(name) {
		return this.expressionNames.includes(name);
	}
	addExpressionWithTransform(name, transform, expr) {
		this.expressionNames.push(name);
		const texpr = p.Bind(() => ({'astnode': name}), expr);
		const bexpr = transform === null ? texpr : p.Transform(transform, texpr);

		this.expressions.push(this.rewriteLeftRecursion(bexpr));

		if(this.parsing)
			throw new ReparseException();
	}
	addExpression(name, expr) {
		this.addExpressionWithTransform(name, null, expr)
	}

	addLeftToRightOperator(precedence, operator) {
		if(this.binaryOperators[precedence] === undefined)
			this.binaryOperators[precedence] = [false, [operator]];
		else {
			const bo = this.binaryOperators[precedence];
			if(bo[0] !== false)
				throw new Error('Left-associative operator "' + operator + '" being defined with precedence ' + precedence + ' but that is a right-associative precedence');
			bo[1].push(operator)
		}
	}

	addRightToLeftOperator(precedence, operator) {
		if(this.binaryOperators[precedence] === undefined)
			this.binaryOperators[precedence] = [true, [operator]];
		else {
			const bo = this.binaryOperators[precedence];
			if(bo[0] !== true)
				throw new Error('Right-associative operator "' + operator + '" being defined with precedence ' + precedence + ' but that is a left-associative precedence');
			bo[1].push(operator)
		}
	}

	buildGrammar() {
		const pexpr = p.LongestChoice(...this.expressions);
		let cexpr = pexpr;
		const precedences = Object.keys(this.binaryOperators);
		precedences.sort((a, b) => b - a);
		for(const key of precedences) {
			const [assoc, operators] = this.binaryOperators[key];
			if(!assoc)
				cexpr = p.Transform(arr => {
					let lhs = arr[0];
					for(let i = 1; i < arr.length; i += 2)
						lhs = {
							'astnode': 'binary-operator', 
							'lhs': lhs, 
							'operator': arr[i], 
							'rhs': arr[i + 1]
						};
					return lhs
				}, p.BindArray(p.LooseSequence(
					p.AddValue(cexpr), 
					p.ZeroOrMore(p.LooseSequence(
						p.AddValue(p.Choice(...operators.map(p.Literal))), 
						p.AddValue(cexpr)
					))
				)));
			else {
				const wrap = p.Forward();
				wrap.value = cexpr = p.Transform(obj => obj.rhs === undefined || obj.rhs === null ? obj.lhs : obj,
					p.Bind(() => ({'astnode': 'binary-operator'}), p.LooseSequence(
						p.Named('lhs', cexpr),
						p.Optional(p.LooseSequence(
							p.Named('operator', p.Choice(...operators.map(p.Literal))),
							p.Named('rhs', wrap)
						))
				)));
			}
		}

		this.Expr.value = p.IgnoreLeadingWhitespace(this.wrapCse(true, cexpr));
		this.Stmt.value = p.IgnoreLeadingWhitespace(this.wrapCse(false, p.LongestChoice(...this.statements)));

		const stmtOnly = p.IgnoreLeadingWhitespace(this.wrapCse(false, p.LongestChoice(...this.statements.filter(x => x !== this.Expr))));
		const semicolon = p.Regex(/^(\s*;\s)+/);

		this.StmtList.value = text => {
			const stmts = [];
			let needSemicolon = false;

			while(text.length !== 0) {
				if(needSemicolon) {
					const pretext = text.toStringBackwards();
					if(pretext.match(/}\s*$/)) {
						needSemicolon = false;
						continue;
					}
					const cret = semicolon(text);
					if(cret === p.None)
						break;
					needSemicolon = false;
					text = cret[0]
				}
				const cret = semicolon(text);
				if(cret !== p.None)
					text = cret[0];
				const sret = stmtOnly(text);
				if(sret === p.None) {
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

		return this.StmtList
	}

	parse(code) {
		while(true) {
			const grammar = this.buildGrammar();
			this.parsing = true;
			try {
				const ret = grammar(new Bobbin(code));
				if(ret === p.None) return p.None;
				const eret = p.IgnoreLeadingWhitespace(p.End)(ret[0]);
				if(eret === p.None) {
					const [ln, cn] = indexToLineColumn(code, ret[0].start);
					return [ret[0], [ret[1], 'Parsing failed some time at/after line ' + ln + ' column ' + cn]];
				}
				return ret;
			} catch(e) {
				if(e instanceof ReparseException)
					continue;
				throw e;
			} finally {
				this.parsing = false;
			}
		}
	}
}

const parser = new Parser();
import { addSyntax } from './coreSyntax.mjs';
addSyntax(parser);

const ret = parser.parse(`
foo[foo][asdf];
(foo = bar = baz + omg + hax[sdf] + foo)[bar];

macro if(cond, if_, else_)
syntax('if', '(', cond, ')', if_, 'else', else_) {
}

asdfp = if(foo) bar else baz;
asdfp = asdfoj + if(foo) bar else { baz = sdaf };
`)

if(ret === p.None)
	console.log('Parsing failed :(');
else
	console.log(JSON.stringify(ret[1], null, '\t'))

const format = ast => {
	if(Array.isArray(ast))
		return ast.map(format).join('\n');
	switch(ast.astnode) {
		case 'binary-operator':
			return `(${format(ast.lhs)} ${ast.operator} ${format(ast.rhs)})`;
		case 'identifier':
			return ast.name;
		case 'index':
			return `(${format(ast.base)})[${format(ast.index)}]`;
		default:
			return JSON.stringify(ast);
	}
}

console.log(format(ret[1]))
