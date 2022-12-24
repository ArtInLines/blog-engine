import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import { math, mathHtml } from 'micromark-extension-math';

const __dirname = dirname(fileURLToPath(import.meta.url));

const micromarkOpts = { extensions: [gfm(), math()], htmlExtensions: [gfmHtml(), mathHtml()], allowDangerousHtml: true };

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

function buildFile(inFilePath, title, outFilePath = null) {
	if (outFilePath == null) {
		let fname = rmExt(basename(inFilePath)) + '.html';
		outFilePath = join(__dirname, '..', 'public', fname);
	}
	if (!outFilePath.endsWith('.html')) outFilePath += '.html';

	const md = readFileSync(inFilePath);
	const res = micromark(md, 'utf-8', micromarkOpts);
	writeFileSync(outFilePath, html(title, res));
}

function build() {
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

	getFiles().forEach((f) => buildFile(f.in, f.title, f.out));
}

build();
