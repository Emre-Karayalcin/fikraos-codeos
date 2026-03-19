import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execFileAsync = promisify(execFile);

// Accept a Buffer (local file) or a URL string (external)
export async function convertPptxToPdf(pptxSource: Buffer | string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-'));
  const pptxPath = path.join(tmpDir, 'input.pptx');

  try {
    let pptxBuffer: Buffer;

    if (Buffer.isBuffer(pptxSource)) {
      console.log(`📦 Using provided PPTX buffer (${pptxSource.length} bytes)`);
      pptxBuffer = pptxSource;
    } else {
      console.log(`📥 Downloading PPTX from: ${pptxSource}`);
      const { validateUrlOrThrow } = await import('./utils/url-validator.js');
      await validateUrlOrThrow(pptxSource);
      const response = await fetch(pptxSource, {
        signal: AbortSignal.timeout(30000),
        headers: { 'User-Agent': 'FikraHub/1.0' },
      });
      if (!response.ok) throw new Error(`Failed to download PPTX: ${response.statusText}`);
      pptxBuffer = Buffer.from(await response.arrayBuffer());
    }

    fs.writeFileSync(pptxPath, pptxBuffer);
    console.log(`📄 Converting PPTX → PDF with LibreOffice...`);

    // Give LibreOffice a writable HOME for its user profile (required in containers)
    const loHome = path.join(tmpDir, 'lo-home');
    fs.mkdirSync(loHome, { recursive: true });

    // LibreOffice headless conversion
    await execFileAsync('libreoffice', [
      '--headless',
      '--norestore',
      '--nofirststartwizard',
      '--convert-to', 'pdf',
      '--outdir', tmpDir,
      pptxPath,
    ], { timeout: 120000, env: { ...process.env, HOME: loHome } });

    const pdfTmpPath = path.join(tmpDir, 'input.pdf');
    if (!fs.existsSync(pdfTmpPath)) {
      throw new Error('LibreOffice did not produce a PDF output');
    }

    // Copy to public/pdfs
    const pdfsDir = path.join(process.cwd(), 'public', 'pdfs');
    if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true });

    const { randomBytes } = await import('crypto');
    const pdfFilename = `converted-${Date.now()}-${randomBytes(6).toString('hex')}.pdf`;
    const pdfPath = path.join(pdfsDir, pdfFilename);
    fs.copyFileSync(pdfTmpPath, pdfPath);

    console.log(`✅ PDF saved: ${pdfPath}`);
    return `/pdfs/${pdfFilename}`;

  } catch (error) {
    console.error('❌ PDF conversion error:', error);
    throw error;
  } finally {
    // Cleanup temp dir
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}