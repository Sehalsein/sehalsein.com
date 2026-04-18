export type RepoLang = "ts" | "tsx" | "css" | "md" | "json" | "js";

export type RepoFile = {
	path: string;
	label: string;
	lang: RepoLang;
};

export const REPO = {
	owner: "Sehalsein",
	name: "sehalsein.com",
	branch: "main",
} as const;

export function rawUrl(path: string): string {
	return `https://raw.githubusercontent.com/${REPO.owner}/${REPO.name}/${REPO.branch}/${path}`;
}

export function blobUrl(path: string): string {
	return `https://github.com/${REPO.owner}/${REPO.name}/blob/${REPO.branch}/${path}`;
}

export function treeApiUrl(): string {
	return `https://api.github.com/repos/${REPO.owner}/${REPO.name}/git/trees/${REPO.branch}?recursive=1`;
}

export function langFromPath(path: string): RepoLang {
	const ext = path.split(".").pop()?.toLowerCase() ?? "";
	if (ext === "ts") return "ts";
	if (ext === "tsx") return "tsx";
	if (ext === "jsx" || ext === "js" || ext === "mjs" || ext === "cjs")
		return "js";
	if (ext === "css") return "css";
	if (ext === "md" || ext === "mdx") return "md";
	if (ext === "json") return "json";
	return "ts";
}

const HIDDEN_DIRS = new Set([
	"node_modules",
	".next",
	".git",
	"dist",
	"build",
	".turbo",
	".vercel",
	".vscode",
	".idea",
]);

const BINARY_EXT = new Set([
	"ico",
	"png",
	"jpg",
	"jpeg",
	"webp",
	"gif",
	"svg",
	"avif",
	"woff",
	"woff2",
	"ttf",
	"otf",
	"eot",
	"pdf",
	"zip",
	"gz",
	"tar",
	"mp4",
	"mov",
	"mp3",
	"wav",
	"lock",
	"tsbuildinfo",
]);

const EXCLUDE_BASENAMES = new Set([
	"pnpm-lock.yaml",
	"package-lock.json",
	"yarn.lock",
	"bun.lockb",
	"bun.lock",
	"tsconfig.tsbuildinfo",
	".DS_Store",
	".env",
	".env.local",
	".env.production",
]);

export function shouldShowPath(path: string, size?: number): boolean {
	if (size !== undefined && size > 256 * 1024) return false;
	const segments = path.split("/");
	for (const seg of segments) {
		if (seg.startsWith(".env")) return false;
		if (HIDDEN_DIRS.has(seg)) return false;
	}
	const base = segments[segments.length - 1];
	if (EXCLUDE_BASENAMES.has(base)) return false;
	const ext = base.split(".").pop()?.toLowerCase() ?? "";
	if (BINARY_EXT.has(ext)) return false;
	return true;
}

export const DEFAULT_FILE_PATH = "app/os/page.tsx";
export const DEFAULT_EXPANDED_DIRS = ["app", "app/os", "src", "src/view", "src/view/os"];

export type GithubTreeEntry = {
	path: string;
	type: "blob" | "tree";
	size?: number;
};

export type GithubTreeResponse = {
	tree: GithubTreeEntry[];
	truncated: boolean;
};
