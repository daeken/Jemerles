import { LooseSequence, Regex, Literal, Optional, Named, AddValue, BindArray, ZeroOrMore, OneOrMore, None, IgnoreLeadingWhitespace, Sequence } from '../../LosingDogs/patterns.mjs';

export const addSyntax = parser => {
	const name = Regex(/^([a-z_\$][a-z_\$0-9]*|@[a-z0-9_\-+`~!@#$%\^&*\\|\/?.,<>;:]+)/i);

	const Expr = parser.Expr;
	const Body = parser.Body;
	const BodyOrCSE = parser.BodyOrCSE;

	const csexpr = LooseSequence(
		AddValue(Expr), 
		ZeroOrMore(LooseSequence(
			Literal(','), 
			AddValue(Expr)
		))
	);

	parser.addStatement('class', LooseSequence(
		Named('export', Optional(Regex(/^export\s+/))), 
		Regex(/^class\s+/), Named('name', name), 
		Named('body', Body)
	));

	const acceptableWs = ['"\',.[](){} \t\n\r'];
	parser.addStatementWithTransform('macro', macro => {
		if(macro.syntax === null || parser.hasExpression(macro.name)) return macro;
		
		const syntax = macro.syntax.map(elem => {
			if(elem.astnode == 'identifier')
				return Named(elem.name, BodyOrCSE);
			if(elem.astnode != 'plain-string')
				throw new Exception('No idea how to handle macro syntax: ' + JSON.stringify(elem));
			
			const str = elem.raw_data.substring(1, elem.raw_data.length - 1);
			return Literal(str)
		});
		parser.addExpression(macro.name, LooseSequence(...syntax));
		return macro
	}, LooseSequence(
		Regex(/^macro\s+/), 
		Named('name', name), Literal('('),
		Named('arguments', BindArray(Optional(csexpr))), 
		Literal(')'), 
		Named('syntax', Optional(BindArray(LooseSequence(
			Literal('syntax'), Literal('('), 
			csexpr, 
			Literal(')')
		)))), 
		Named('body', Body)
	));

	parser.addExpression('index', LooseSequence(
		Named('base', Expr), 
		Literal('['), 
		Named('index', Expr), 
		Literal(']')
	));

	parser.addExpression('call', LooseSequence(
		Named('callee', Expr), 
		Literal('('), 
		Named('arguments', BindArray(Optional(csexpr))), 
		Optional(Literal(',')), 
		Literal(')')
	));

	parser.addExpression('assignment', LooseSequence(
		Named('left', Expr), 
		Literal('='), 
		Named('right', Expr)
	));

	parser.addExpression('identifier', Named('name', name));

	parser.addExpression('plain-string', Named('raw_data', text => {
		const se = text.peek(1);
		if(se != '"' && se != "'") return None;
		let data = '';
		text = text.forward(1);
		while(true) {
			const next = text.peek(1);
			if(next == se)
				break;
			if(next == '\\') {
				data += text.peek(2);
				text = text.forward(2);
			}
			else {
				data += next;
				text = text.forward(1);
			}
		}
		return [text.forward(1), se + data + se]
	}));
};