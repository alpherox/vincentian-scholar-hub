// OCR utility - fixed for pdf.js compatibility
import Tesseract from 'tesseract.js';

interface OCRResult {
  title: string;
  abstract: string;
  keywords: string[];
  rawText: string;
}

export async function extractTextFromPDF(file: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
  // Dynamic import for pdf.js to avoid bundling issues
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set up worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const totalPages = Math.min(pdf.numPages, 5); // Process first 5 pages max
  let fullText = '';
  
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
    
    onProgress?.(((i / totalPages) * 50)); // First 50% for PDF extraction
  }

  // If PDF text extraction got reasonable content, use it
  if (fullText.length > 200) {
    onProgress?.(100);
    return parseExtractedText(fullText);
  }

  // Otherwise, do OCR on the first page
  const page = await pdf.getPage(1);
  const scale = 2;
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({ 
    canvasContext: context, 
    viewport,
  }).promise;
  
  const imageData = canvas.toDataURL('image/png');
  
  const result = await Tesseract.recognize(imageData, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.(50 + (m.progress * 50));
      }
    },
  });
  
  return parseExtractedText(result.data.text);
}

export async function extractTextFromImage(file: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
  const result = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.(m.progress * 100);
      }
    },
  });
  
  return parseExtractedText(result.data.text);
}

function parseExtractedText(text: string): OCRResult {
  const lines = text.split('\n').filter(line => line.trim());
  
  // Try to extract title (usually the first substantial line)
  let title = '';
  for (const line of lines) {
    const cleaned = line.trim();
    if (cleaned.length > 10 && cleaned.length < 200) {
      title = cleaned;
      break;
    }
  }
  
  // Try to find abstract section
  let abstract = '';
  const abstractIndex = text.toLowerCase().indexOf('abstract');
  if (abstractIndex !== -1) {
    // Get text after "Abstract" until "Introduction" or "Keywords" or end
    const afterAbstract = text.substring(abstractIndex + 8);
    const introIndex = afterAbstract.toLowerCase().indexOf('introduction');
    const keywordsIndex = afterAbstract.toLowerCase().indexOf('keywords');
    const methodsIndex = afterAbstract.toLowerCase().indexOf('methods');
    
    let endIndex = afterAbstract.length;
    if (introIndex !== -1 && introIndex < endIndex) endIndex = introIndex;
    if (keywordsIndex !== -1 && keywordsIndex < endIndex) endIndex = keywordsIndex;
    if (methodsIndex !== -1 && methodsIndex < endIndex) endIndex = methodsIndex;
    
    abstract = afterAbstract.substring(0, endIndex).trim();
    // Clean up abstract
    abstract = abstract.replace(/\s+/g, ' ').trim();
    if (abstract.length > 2000) {
      abstract = abstract.substring(0, 2000) + '...';
    }
  } else {
    // If no explicit abstract, take a portion of the text
    abstract = lines.slice(1, 10).join(' ').replace(/\s+/g, ' ').trim();
    if (abstract.length > 500) {
      abstract = abstract.substring(0, 500) + '...';
    }
  }
  
  // Try to find keywords
  let keywords: string[] = [];
  const keywordsIndex = text.toLowerCase().indexOf('keywords');
  if (keywordsIndex !== -1) {
    const afterKeywords = text.substring(keywordsIndex + 8, keywordsIndex + 300);
    const keywordLine = afterKeywords.split('\n')[0];
    keywords = keywordLine
      .split(/[,;]/)
      .map(k => k.trim())
      .filter(k => k.length > 2 && k.length < 50)
      .slice(0, 10);
  }
  
  // If no keywords found, try to extract common academic terms
  if (keywords.length === 0) {
    const commonTerms = extractCommonTerms(text);
    keywords = commonTerms.slice(0, 5);
  }
  
  return {
    title: title || 'Untitled Research',
    abstract: abstract || 'No abstract could be extracted. Please enter manually.',
    keywords,
    rawText: text,
  };
}

function extractCommonTerms(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = new Map<string, number>();
  
  // Common stop words to exclude
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'their', 'them',
    'we', 'our', 'us', 'i', 'my', 'me', 'you', 'your', 'he', 'she', 'his', 'her',
  ]);
  
  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (cleaned.length > 4 && !stopWords.has(cleaned)) {
      wordCount.set(cleaned, (wordCount.get(cleaned) || 0) + 1);
    }
  }
  
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}
