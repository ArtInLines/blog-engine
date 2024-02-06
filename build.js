import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import fs from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

const __dirname = dirname(fileURLToPath(import.meta.url));

const html = (title, content) => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="style.css">
	<title>${title}</title>
</head>
<body>
${content}
</body>
</html>`;

function rmExt(filename) {
	let i = filename.lastIndexOf('.');
	if (i < 0) i = filename.length;
	return filename.slice(0, i);
}

function titleFmt(title) {
	const words = title.split(' ').flatMap((x) => x.split('_'));
	return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function buildFile(inFilePath, title, outFilePath) {
	if (!outFilePath.endsWith('.html')) outFilePath += '.html';
	const md = readFileSync(inFilePath, { encoding: 'utf-8' });
	const res = await unified()
		.use(remarkParse)
		.use(remarkFrontmatter)
		.use(remarkGfm)
		.use(remarkToc, { maxDepth: 4, ordered: true, heading: 'toc|(table[ -]of[ -])?contents?|contents' })
		.use(remarkMath)
		.use(remarkRehype)
		.use(rehypeKatex)
		.use(rehypeStringify)
		.process(md);
	writeFileSync(outFilePath, html(title, res));
}

async function build(inDir, outDir) {
	let getFName = (name, ...dirs) => {
		return { title: titleFmt(rmExt(name)), in: join(...[inDir, ...dirs, name]), out: join(...[outDir, ...dirs, rmExt(name) + '.html']) };
	};

	let getFiles = (...dirs) => {
		const dir = readdirSync(join(inDir, ...dirs), { withFileTypes: true });
		// @TODO: Add files automatically to index
		// @TODO: Categorize files according to their parent directory in the index
		const files = dir
			.filter((dirent) => dirent.isFile())
			.map((file) => getFName(file.name, ...dirs));
		dir.filter((dirent) => dirent.isDirectory()).forEach((dir) => files.push(...getFiles(...[...dirs, dir.name])));
		return files;
	};

	for await (const file of getFiles()) {
		await buildFile(file.in, file.title, file.out);
	}
}

async function main(inDir = join(__dirname, 'markdown'), outDir = join(__dirname, 'public')) {
	if (!existsSync(outDir)) mkdirSync(outDir);
	build(inDir, outDir);
}

main(process.argv[2] || undefined, process.argv[3] || undefined)