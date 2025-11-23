import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const srcDir = 'src-public';
const outDir = 'public';

async function buildPublic() {
	mkdirSync(outDir, { recursive: true });

	// Minify JavaScript with esbuild
	await build({
		entryPoints: [join(srcDir, 'app.js')],
		bundle: true,
		minify: true,
		outfile: join(outDir, 'app.js'),
	});

	// Minify CSS with esbuild
	await build({
		entryPoints: [join(srcDir, 'styles.css')],
		bundle: true,
		minify: true,
		outfile: join(outDir, 'styles.css'),
	});

	// Copy and minify HTML (esbuild doesn't handle HTML, so simple copy or use html-minifier)
	const htmlFiles = ['index.html', 'terms-en.html', 'terms-ja.html'];
	
	for (const htmlFile of htmlFiles) {
		const htmlSource = readFileSync(join(srcDir, htmlFile), 'utf-8');
		const htmlMinified = htmlSource.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
		writeFileSync(join(outDir, htmlFile), htmlMinified);
	}

	console.log('✓ Public files minified successfully');
}

buildPublic().catch(console.error);
