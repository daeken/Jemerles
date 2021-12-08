export const indexToLineColumn = (text, index) => {
	const pretext = text.substring(0, index);
	const line = (pretext.match(/\n/g) || []).length + 1;
	const column = (line == 1 ? pretext : pretext.match(/\n([^\n]*)$/)[1]).length + 1;
	return [line, column]
};
