import * as p from '../../LosingDogs/patterns.mjs';

export const addSyntax = parser => {
	const name = p.Regex(/^[a-z_\$][a-z_\$0-9']*/i);

	parser.addStatement('class', p.LooseSequence(
		p.Named('export', p.Optional(p.Regex(/^export\s+/))), 
		p.Regex(/^class\s+/), p.Named('name', name), 
		p.Named('body', parser.Body)
	));

	parser.addExpression('index', p.LooseSequence(
		p.Named('base', parser.Expr), 
		p.Literal('['), 
		p.Named('index', parser.Expr), 
		p.Literal(']')
	));

	parser.addExpression('call', p.LooseSequence(
		p.Named('callee', parser.Expr), 
		p.Literal('('), 
		p.Named('arguments', p.BindArray(p.Optional(p.LooseSequence(
			p.AddValue(parser.Expr), 
			p.ZeroOrMore(p.LooseSequence(
				p.Literal(','), 
				p.AddValue(parser.Expr)
			))
		)))), 
		p.Literal(')')
	));

	parser.addExpression('identifier', p.Named('name', name));
};