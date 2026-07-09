import fs from 'fs';
import path from 'path';
import { mdToPdf } from 'md-to-pdf';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const docsDir = path.dirname(__filename);
const mdPath = path.join(docsDir, 'BUSINESS_PLAN.md');
const sanMdPath = path.join(docsDir, 'BUSINESS_PLAN_SAN.md');
const pdfPath = path.join(docsDir, 'BUSINESS_PLAN.pdf');

async function main() {
  console.log('Reading BUSINESS_PLAN.md...');
  let markdown = fs.readFileSync(mdPath, 'utf8');

  console.log('Sanitizing markdown (removing emojis, cleaning tables)...');
  
  // Replace checkmarks and crosses (using unicode escapes to keep codebase emoji-free)
  markdown = markdown.replace(/\u2705/g, 'Yes');
  markdown = markdown.replace(/\u274c/g, 'No');

  // Clean up specific icon labels in the ASCII flow diagram
  markdown = markdown.replace(/\ud83d\udcf8 SCAN/g, 'SCAN');
  markdown = markdown.replace(/\ud83e\udd16 SUGGEST/g, 'SUGGEST');
  markdown = markdown.replace(/\u270f\ufe0f EDIT/g, 'EDIT');
  markdown = markdown.replace(/\u2705 CREATE/g, 'CREATE');
  markdown = markdown.replace(/\ud83d\udcca ANALYSE/g, 'ANALYSE');

  // Strip any other remaining emojis/icons
  // Match standard emoji ranges and miscellaneous symbols
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/gu;
  markdown = markdown.replace(emojiRegex, '');

  // Write temporary sanitized markdown file
  fs.writeFileSync(sanMdPath, markdown, 'utf8');
  console.log('Temporary sanitized markdown created.');

  // Config for md-to-pdf
  const config = {
    pdf_options: {
      format: 'A4',
      margin: {
        top: '25mm',
        bottom: '25mm',
        left: '20mm',
        right: '20mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="width: 100%; font-family: \'Times New Roman\', serif; font-size: 9px; text-align: center; color: #555;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
    },
    stylesheet: 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css',
    css: `
      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #1a1a1a;
      }
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Georgia', serif;
        color: #0f0e1a;
        font-weight: bold;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        page-break-after: avoid;
      }
      h1 {
        font-size: 24pt;
        border-bottom: 2px solid #0f0e1a;
        padding-bottom: 8px;
        margin-top: 0;
      }
      h2 {
        font-size: 18pt;
        border-bottom: 1px solid #d1d1d1;
        padding-bottom: 4px;
      }
      h3 {
        font-size: 13pt;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        page-break-inside: avoid;
      }
      th, td {
        border: 1px solid #d1d1d1;
        padding: 8px 12px;
        font-size: 10pt;
        text-align: left;
      }
      th {
        background-color: #f7f7f7;
        font-weight: bold;
      }
      blockquote {
        border-left: 4px solid #0f0e1a;
        padding-left: 15px;
        margin: 15px 0;
        color: #4a4a4a;
        font-style: italic;
      }
      pre, code {
        font-family: 'Courier New', Courier, monospace;
        font-size: 9.5pt;
        background-color: #f4f4f4;
      }
      pre {
        padding: 12px;
        border: 1px solid #d1d1d1;
        border-radius: 4px;
        overflow: auto;
        page-break-inside: avoid;
        line-height: 1.4;
      }
      hr {
        border: 0;
        border-top: 1px solid #d1d1d1;
        margin: 25px 0;
      }
    `
  };

  console.log('Converting sanitized markdown to PDF...');
  try {
    const pdf = await mdToPdf({ path: sanMdPath }, config);
    fs.writeFileSync(pdfPath, pdf.content);
    console.log(`PDF successfully generated and saved to: ${pdfPath}`);
  } catch (err) {
    console.error('Error during PDF conversion:', err);
  } finally {
    // Cleanup temp markdown file
    if (fs.existsSync(sanMdPath)) {
      fs.unlinkSync(sanMdPath);
      console.log('Temporary sanitized markdown file cleaned up.');
    }
  }
}

main().catch(console.error);
