import { LooseSequence, Regex, Literal, Optional, Named, AddValue, BindArray, ZeroOrMore, OneOrMore } from '../../LosingDogs/patterns.mjs';

export const addSyntax = parser => {
	const name = Regex(/^[a-z_\$][a-z_\$0-9']*/i);

	const Expr = parser.Expr;
	const Body = parser.Body;

	parser.addStatement('class', LooseSequence(
		Named('export', Optional(Regex(/^export\s+/))), 
		Regex(/^class\s+/), Named('name', name), 
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
		Named('arguments', BindArray(Optional(LooseSequence(
			AddValue(Expr), 
			ZeroOrMore(LooseSequence(
				Literal(','), 
				AddValue(Expr)
			))
		)))), 
		Optional(Literal(',')), 
		Literal(')')
	));

	parser.addExpression('assignment', LooseSequence(
		Named('left', Expr), 
		Literal('='), 
		Named('right', Expr)
	));

	parser.addExpression('identifier', Named('name', name));
};