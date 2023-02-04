import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const __dirname = dirname(fileURLToPath(import.meta.url));

const html = (title, content) => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
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

async function buildFile(inFilePath, title, outFilePath = null) {
	if (outFilePath == null) {
		let fname = rmExt(basename(inFilePath)) + '.html';
		outFilePath = join(__dirname, '..', 'public', fname);
	}
	if (!outFilePath.endsWith('.html')) outFilePath += '.html';

	const md = readFileSync(inFilePath, { encoding: 'utf-8' });
	const res = await unified()
		.use(remarkParse)
		.use(remarkFrontmatter)
		.use(remarkGfm)
		.use(remarkToc, { maxDepth: 4, ordered: true, heading: 'toc|table[ -]of[ -]contents?|contents' })
		.use(remarkRehype)
		.use(rehypeStringify)
		.process(md);
	writeFileSync(outFilePath, html(title, res));
}

async function build() {
	const dirpath = join(__dirname, 'markdown');

	let getFName = (name, ...dirs) => {
		return { title: titleFmt(rmExt(name)), in: join(...[dirpath, ...dirs, name]), out: join(...[__dirname, '..', 'public', ...dirs, rmExt(name) + '.html']) };
	};

	let getFiles = (...dirs) => {
		const dir = readdirSync(join(dirpath, ...dirs), { withFileTypes: true });
		const files = dir.filter((dirent) => dirent.isFile()).map((file) => getFName(file.name, ...dirs));
		dir.filter((dirent) => dirent.isDirectory()).forEach((dir) => files.push(...getFiles(...[...dirs, dir.name])));
		return files;
	};

	for await (const file of getFiles()) {
		await buildFile(file.in, file.title, file.out);
	}
}

const publicPath = join(__dirname, '..', 'public');
if (!existsSync(publicPath)) mkdirSync(publicPath);
build();
