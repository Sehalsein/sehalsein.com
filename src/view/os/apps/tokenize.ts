import type { RepoLang } from "@/src/data/repoSources";

export type Token = { cls?: string; text: string };
export type Line = Token[];

const TS_KEYWORDS = new Set([
	"import",
	"from",
	"export",
	"default",
	"const",
	"let",
	"var",
	"function",
	"return",
	"if",
	"else",
	"for",
	"while",
	"do",
	"switch",
	"case",
	"break",
	"continue",
	"new",
	"class",
	"extends",
	"implements",
	"interface",
	"type",
	"enum",
	"public",
	"private",
	"protected",
	"readonly",
	"static",
	"async",
	"await",
	"yield",
	"try",
	"catch",
	"finally",
	"throw",
	"this",
	"super",
	"null",
	"undefined",
	"true",
	"false",
	"void",
	"as",
	"in",
	"of",
	"typeof",
	"instanceof",
	"delete",
	"keyof",
	"satisfies",
	"declare",
	"namespace",
	"module",
	"abstract",
	"package",
	"func",
	"struct",
	"defer",
	"nil",
]);

const TS_TYPES = new Set([
	"string",
	"number",
	"boolean",
	"object",
	"any",
	"unknown",
	"never",
	"bigint",
	"symbol",
	"Array",
	"Promise",
	"Record",
	"Partial",
	"Pick",
	"Omit",
	"ReadonlyArray",
	"Readonly",
	"Map",
	"Set",
	"WeakMap",
	"WeakSet",
	"int",
	"error",
]);

function tokenizeCode(src: string): Line[] {
	return src.split("\n").map(tokenizeCodeLine);
}

function tokenizeCodeLine(line: string): Line {
	const tokens: Token[] = [];
	let i = 0;
	const n = line.length;

	while (i < n) {
		const c = line[i];

		if (c === "/" && line[i + 1] === "/") {
			tokens.push({ cls: "co", text: line.slice(i) });
			return tokens;
		}
		if (c === "/" && line[i + 1] === "*") {
			const end = line.indexOf("*/", i + 2);
			if (end >= 0) {
				tokens.push({ cls: "co", text: line.slice(i, end + 2) });
				i = end + 2;
				continue;
			}
			tokens.push({ cls: "co", text: line.slice(i) });
			return tokens;
		}
		if (c === "#") {
			tokens.push({ cls: "co", text: line.slice(i) });
			return tokens;
		}

		if (c === '"' || c === "'" || c === "`") {
			const quote = c;
			let j = i + 1;
			while (j < n) {
				if (line[j] === "\\" && j + 1 < n) {
					j += 2;
					continue;
				}
				if (line[j] === quote) {
					j++;
					break;
				}
				j++;
			}
			tokens.push({ cls: "st", text: line.slice(i, j) });
			i = j;
			continue;
		}

		if (/[0-9]/.test(c)) {
			let j = i;
			while (j < n && /[0-9_.]/.test(line[j])) j++;
			tokens.push({ cls: "nu", text: line.slice(i, j) });
			i = j;
			continue;
		}

		if (/[A-Za-z_$]/.test(c)) {
			let j = i;
			while (j < n && /[A-Za-z0-9_$]/.test(line[j])) j++;
			const word = line.slice(i, j);
			if (TS_KEYWORDS.has(word)) {
				tokens.push({ cls: "kw", text: word });
			} else if (TS_TYPES.has(word)) {
				tokens.push({ cls: "tp", text: word });
			} else if (line[j] === "(") {
				tokens.push({ cls: "fn", text: word });
			} else {
				tokens.push({ text: word });
			}
			i = j;
			continue;
		}

		let j = i;
		while (
			j < n &&
			!/[A-Za-z_$0-9'"`/#]/.test(line[j]) &&
			!(line[j] === "/" && (line[j + 1] === "/" || line[j + 1] === "*"))
		) {
			j++;
		}
		tokens.push({ text: line.slice(i, Math.max(i + 1, j)) });
		i = Math.max(i + 1, j);
	}

	return tokens;
}

function tokenizeCss(src: string): Line[] {
	return src.split("\n").map((line) => {
		const tokens: Token[] = [];
		let i = 0;
		const n = line.length;
		while (i < n) {
			const rest = line.slice(i);
			const comment = rest.match(/^\/\*[^\n]*?\*\//);
			if (comment) {
				tokens.push({ cls: "co", text: comment[0] });
				i += comment[0].length;
				continue;
			}
			if (rest.startsWith("/*")) {
				tokens.push({ cls: "co", text: rest });
				return tokens;
			}
			const str = rest.match(/^"[^"]*"|^'[^']*'/);
			if (str) {
				tokens.push({ cls: "st", text: str[0] });
				i += str[0].length;
				continue;
			}
			const selector = rest.match(/^[.#][-\w]+/);
			if (selector) {
				tokens.push({ cls: "fn", text: selector[0] });
				i += selector[0].length;
				continue;
			}
			const cssVar = rest.match(/^var\([^)]*\)/);
			if (cssVar) {
				tokens.push({ cls: "tp", text: cssVar[0] });
				i += cssVar[0].length;
				continue;
			}
			const prop = rest.match(/^[a-z-]+(?=\s*:)/);
			if (prop) {
				tokens.push({ cls: "kw", text: prop[0] });
				i += prop[0].length;
				continue;
			}
			const num = rest.match(/^-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?/);
			if (num) {
				tokens.push({ cls: "nu", text: num[0] });
				i += num[0].length;
				continue;
			}
			tokens.push({ text: line[i] });
			i++;
		}
		return tokens;
	});
}

function tokenizeMd(src: string): Line[] {
	return src.split("\n").map((line) => {
		if (/^#{1,6}\s/.test(line)) return [{ cls: "kw", text: line }];
		if (line.startsWith("```") || line.startsWith("    ")) {
			return [{ cls: "co", text: line }];
		}
		const tokens: Token[] = [];
		const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
		const matches = Array.from(line.matchAll(pattern));
		let last = 0;
		for (let k = 0; k < matches.length; k++) {
			const match = matches[k];
			const start = match.index ?? 0;
			if (start > last) tokens.push({ text: line.slice(last, start) });
			const m = match[0];
			if (m.startsWith("**")) tokens.push({ cls: "st", text: m });
			else if (m.startsWith("`")) tokens.push({ cls: "tp", text: m });
			else tokens.push({ cls: "fn", text: m });
			last = start + m.length;
		}
		if (last < line.length) tokens.push({ text: line.slice(last) });
		return tokens;
	});
}

function tokenizeJson(src: string): Line[] {
	return src.split("\n").map((line) => {
		const tokens: Token[] = [];
		let i = 0;
		const n = line.length;
		while (i < n) {
			const c = line[i];
			if (c === '"') {
				let j = i + 1;
				while (j < n && line[j] !== '"') {
					if (line[j] === "\\") j++;
					j++;
				}
				j++;
				const text = line.slice(i, j);
				const isKey = line.slice(j).trimStart().startsWith(":");
				tokens.push({ cls: isKey ? "kw" : "st", text });
				i = j;
				continue;
			}
			if (/[0-9-]/.test(c)) {
				let j = i;
				while (j < n && /[-0-9.eE+]/.test(line[j])) j++;
				tokens.push({ cls: "nu", text: line.slice(i, j) });
				i = j;
				continue;
			}
			const kw = line.slice(i).match(/^(true|false|null)/);
			if (kw) {
				tokens.push({ cls: "kw", text: kw[0] });
				i += kw[0].length;
				continue;
			}
			tokens.push({ text: line[i] });
			i++;
		}
		return tokens;
	});
}

export function tokenize(src: string, lang: RepoLang): Line[] {
	switch (lang) {
		case "css":
			return tokenizeCss(src);
		case "md":
			return tokenizeMd(src);
		case "json":
			return tokenizeJson(src);
		default:
			return tokenizeCode(src);
	}
}
