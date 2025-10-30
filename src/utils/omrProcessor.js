import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker from public directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Convert PDF to images
 */
export const pdfToImages = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;
      
      const imageDataUrl = canvas.toDataURL('image/png');
      images.push(imageDataUrl);
    }

    return images;
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw new Error('Failed to process PDF file. Please try uploading an image (JPG, PNG) instead.');
  }
};

/**
 * Detect filled bubbles using image processing
 * Returns an array of detected answers (A, B, C, D)
 */
export const detectBubbles = async (imageDataUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const answers = processBubbleSheet(imageData, canvas.width, canvas.height);
        resolve(answers);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
};

/**
 * Process bubble sheet image to detect filled circles
 */
const processBubbleSheet = (imageData, width, height) => {
  const data = imageData.data;
  const answers = [];
  
  // OMR sheet has 200 questions with 4 options each
  // Divided into 4 columns of 50 questions each
  const questionsPerColumn = 50;
  const columns = 4;
  const optionsPerQuestion = 4;
  
  // Calculate approximate bubble positions
  const columnWidth = width / columns;
  const rowHeight = height / questionsPerColumn;
  const bubbleRadius = Math.min(columnWidth, rowHeight) * 0.08;
  
  for (let col = 0; col < columns; col++) {
    for (let row = 0; row < questionsPerColumn; row++) {
      const questionNum = col * questionsPerColumn + row + 1;
      const baseY = row * rowHeight + rowHeight * 0.5;
      const baseX = col * columnWidth + columnWidth * 0.3;
      
      const optionDarkness = [];
      
      // Check darkness of each option bubble (A, B, C, D)
      for (let opt = 0; opt < optionsPerQuestion; opt++) {
        const bubbleX = Math.floor(baseX + (opt * columnWidth * 0.15));
        const bubbleY = Math.floor(baseY);
        
        const darkness = calculateBubbleDarkness(
          data, 
          width, 
          bubbleX, 
          bubbleY, 
          Math.floor(bubbleRadius)
        );
        
        optionDarkness.push({ option: String.fromCharCode(65 + opt), darkness });
      }
      
      // Find the darkest bubble (filled one)
      optionDarkness.sort((a, b) => b.darkness - a.darkness);
      
      // Only consider it filled if darkness is above threshold
      const threshold = 0.3;
      if (optionDarkness[0].darkness > threshold) {
        answers.push(optionDarkness[0].option);
      } else {
        answers.push(''); // No answer detected
      }
    }
  }
  
  return answers;
};

/**
 * Calculate the darkness of a circular region (bubble)
 */
const calculateBubbleDarkness = (data, width, centerX, centerY, radius) => {
  let totalDarkness = 0;
  let pixelCount = 0;
  
  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      // Check if pixel is within circle
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= radius * radius) {
        const index = (y * width + x) * 4;
        if (index >= 0 && index < data.length) {
          // Calculate grayscale value (0 = black, 255 = white)
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const gray = (r + g + b) / 3;
          
          // Darkness is inverse of brightness
          totalDarkness += (255 - gray) / 255;
          pixelCount++;
        }
      }
    }
  }
  
  return pixelCount > 0 ? totalDarkness / pixelCount : 0;
};

/**
 * Process OMR sheet using OCR (Tesseract.js)
 */
export const processWithOCR = async (imageDataUrl) => {
  try {
    const result = await Tesseract.recognize(imageDataUrl, 'eng', {
      logger: (m) => console.log(m),
    });
    
    // Extract text and try to identify filled bubbles
    const text = result.data.text;
    const answers = extractAnswersFromOCR(text);
    
    return answers;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
};

/**
 * Extract answers from OCR text
 */
const extractAnswersFromOCR = (text) => {
  const answers = [];
  const lines = text.split('\n');
  
  // Look for patterns like "1 A", "2 B", etc.
  const answerPattern = /(\d+)\s*([A-D])/gi;
  
  lines.forEach(line => {
    const matches = [...line.matchAll(answerPattern)];
    matches.forEach(match => {
      const questionNum = parseInt(match[1]);
      const answer = match[2].toUpperCase();
      answers[questionNum - 1] = answer;
    });
  });
  
  return answers;
};

/**
 * Extract student info from OMR sheet
 */
export const extractStudentInfo = async (imageDataUrl) => {
  try {
    const result = await Tesseract.recognize(imageDataUrl, 'eng', {
      logger: (m) => console.log(m),
    });
    
    const text = result.data.text;
    
    // Extract name, roll number, batch, mobile
    const nameMatch = text.match(/Name:\s*(.+)/i);
    const rollMatch = text.match(/Roll\s*No\.?:\s*(\d+)/i);
    const batchMatch = text.match(/Batch:\s*(.+)/i);
    const mobileMatch = text.match(/Mobile\s*No\.?:\s*(\d+)/i);
    
    return {
      name: nameMatch ? nameMatch[1].trim() : 'Unknown',
      rollNumber: rollMatch ? rollMatch[1].trim() : 'N/A',
      batch: batchMatch ? batchMatch[1].trim() : 'N/A',
      mobile: mobileMatch ? mobileMatch[1].trim() : 'N/A',
    };
  } catch (error) {
    console.error('Error extracting student info:', error);
    return {
      name: 'Unknown',
      rollNumber: 'N/A',
      batch: 'N/A',
      mobile: 'N/A',
    };
  }
};

/**
 * Main function to process OMR sheet (combines bubble detection and OCR)
 */
export const processOMRSheet = async (file) => {
  try {
    let imageDataUrls = [];
    
    // Convert PDF to images if needed
    if (file.type === 'application/pdf') {
      imageDataUrls = await pdfToImages(file);
    } else {
      // For image files, convert to data URL
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      imageDataUrls = [dataUrl];
    }
    
    // Process first page/image only (for single sheet)
    const imageDataUrl = imageDataUrls[0];
    
    // Try bubble detection first (faster and more accurate for OMR)
    let answers = await detectBubbles(imageDataUrl);
    
    // If bubble detection fails, fallback to OCR
    if (answers.filter(a => a).length === 0) {
      console.log('Bubble detection failed, trying OCR...');
      answers = await processWithOCR(imageDataUrl);
    }
    
    // Extract student info
    const studentInfo = await extractStudentInfo(imageDataUrl);
    
    return {
      ...studentInfo,
      answers,
    };
  } catch (error) {
    console.error('Error processing OMR sheet:', error);
    throw error;
  }
};

/**
 * Process multi-page PDF with one student per page
 */
export const processMultiPagePDF = async (file) => {
  try {
    if (file.type !== 'application/pdf') {
      // If it's an image, just process it as a single sheet
      return [await processOMRSheet(file)];
    }
    
    // Convert all PDF pages to images
    const imageDataUrls = await pdfToImages(file);
    const allStudents = [];
    
    // Process each page as a separate student
    for (let i = 0; i < imageDataUrls.length; i++) {
      console.log(`Processing page ${i + 1} of ${imageDataUrls.length}...`);
      
      const imageDataUrl = imageDataUrls[i];
      
      // Try bubble detection first
      let answers = await detectBubbles(imageDataUrl);
      
      // If bubble detection fails, fallback to OCR
      if (answers.filter(a => a).length === 0) {
        console.log(`Bubble detection failed for page ${i + 1}, trying OCR...`);
        answers = await processWithOCR(imageDataUrl);
      }
      
      // Extract student info
      const studentInfo = await extractStudentInfo(imageDataUrl);
      
      allStudents.push({
        ...studentInfo,
        answers,
      });
    }
    
    return allStudents;
  } catch (error) {
    console.error('Error processing multi-page PDF:', error);
    throw error;
  }
};
