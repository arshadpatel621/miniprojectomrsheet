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
 * Adjusted for NEET 180 questions format (4 columns x 45 questions)
 */
const processBubbleSheet = (imageData, width, height) => {
  const data = imageData.data;
  const answers = [];

  // NEET OMR sheet has 180 questions
  // 4 columns of 45 questions each
  const questionsPerColumn = 45;
  const columns = 4;
  const optionsPerQuestion = 4;

  // Margins based on the provided image
  const startX = width * 0.05; // Left margin
  const endX = width * 0.75;   // Right margin
  const startY = height * 0.40; // Top margin
  const endY = height * 0.95;   // Bottom margin

  const activeWidth = endX - startX;
  const activeHeight = endY - startY;

  const columnWidth = activeWidth / columns;
  const rowHeight = activeHeight / questionsPerColumn;
  const bubbleRadius = Math.min(columnWidth, rowHeight) * 0.12;

  for (let col = 0; col < columns; col++) {
    for (let row = 0; row < questionsPerColumn; row++) {
      const baseX = startX + (col * columnWidth);
      const baseY = startY + (row * rowHeight) + (rowHeight * 0.5);

      const optionDarkness = [];
      const optionsWidth = columnWidth * 0.8;
      const optionsStartX = baseX + (columnWidth * 0.15);

      for (let opt = 0; opt < optionsPerQuestion; opt++) {
        const bubbleX = Math.floor(optionsStartX + (opt * (optionsWidth / optionsPerQuestion)) + (optionsWidth / optionsPerQuestion / 2));
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

      // Find the darkest bubble
      optionDarkness.sort((a, b) => b.darkness - a.darkness);
      const darkest = optionDarkness[0];
      const secondDarkest = optionDarkness[1];

      // Improved Detection Logic:
      // 1. Absolute threshold: Must be dark enough (0.35) - Lowered from 0.45 to catch lighter marks
      // 2. Relative threshold: Must be significantly darker than the second darkest (1.1x) - Lowered from 1.2
      const absoluteThreshold = 0.35;
      const relativeThreshold = 1.1;

      if (darkest.darkness > absoluteThreshold && darkest.darkness > (secondDarkest.darkness * relativeThreshold)) {
        answers.push(darkest.option);
      } else {
        answers.push(''); // Unattempted
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
 * Extract student info from OMR sheet using Bubble Reading (Grid)
 * Returns info and a debug image with grids drawn
 */
export const extractStudentInfo = async (imageDataUrl) => {
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

        // Debug: Set up drawing style
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';

        // 1. Name Grid (Left side)
        // Adjusted coordinates based on user feedback (Wider search)
        const nameConfig = {
          startX: 0.08,
          startY: 0.18,
          width: 0.45, // Widened from 0.38
          height: 0.16,
          columns: 20,
          rows: 26 // A-Z
        };

        // 2. Roll Number Grid (Right side, Top)
        const rollConfig = {
          startX: 0.58,
          startY: 0.18,
          width: 0.30, // Widened from 0.25
          height: 0.12,
          columns: 10,
          rows: 10 // 0-9
        };

        // 3. Test Booklet Number (Right side, Below Roll No)
        const bookletConfig = {
          startX: 0.58,
          startY: 0.31,
          width: 0.30, // Widened from 0.18
          height: 0.12,
          columns: 7,
          rows: 10 // 0-9
        };

        // Process Grids
        const name = processNameGrid(imageData, canvas.width, canvas.height, nameConfig, ctx);
        const rollNumber = processNumericGrid(imageData, canvas.width, canvas.height, rollConfig, ctx);
        const hallTicket = processNumericGrid(imageData, canvas.width, canvas.height, bookletConfig, ctx);

        // Get debug image
        const debugImageDataUrl = canvas.toDataURL('image/png');

        resolve({
          name: name || 'Unknown',
          rollNumber: rollNumber || 'N/A',
          hallTicket: hallTicket || 'N/A',
          batch: 'N/A',
          mobile: 'N/A',
          debugImageDataUrl // Return the debug image
        });
      } catch (error) {
        console.error('Error extracting student info:', error);
        resolve({ name: 'Unknown', rollNumber: 'N/A', hallTicket: 'N/A' });
      }
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
};

/**
 * Process Name Grid (A-Z)
 */
const processNameGrid = (imageData, width, height, config, ctx) => {
  const startX = width * config.startX;
  const startY = height * config.startY;
  const gridWidth = width * config.width;
  const gridHeight = height * config.height;

  const columns = config.columns;
  const rows = config.rows;    // A-Z

  const colWidth = gridWidth / columns;
  const rowHeight = gridHeight / rows;
  const bubbleRadius = Math.min(colWidth, rowHeight) * 0.3;

  let name = "";

  // Debug: Draw Grid Box
  if (ctx) {
    ctx.strokeRect(startX, startY, gridWidth, gridHeight);
  }

  for (let col = 0; col < columns; col++) {
    let bestChar = "";
    let maxDarkness = 0;

    for (let row = 0; row < rows; row++) {
      const bubbleX = Math.floor(startX + (col * colWidth) + (colWidth * 0.5));
      const bubbleY = Math.floor(startY + (row * rowHeight) + (rowHeight * 0.5));

      const darkness = calculateBubbleDarkness(imageData.data, width, bubbleX, bubbleY, Math.floor(bubbleRadius));

      // Debug: Draw bubble center for ALL bubbles
      if (ctx) {
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, 2, 0, 2 * Math.PI);
        ctx.fillStyle = darkness > 0.35 ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.2)';
        ctx.fill();
      }

      if (darkness > maxDarkness) {
        maxDarkness = darkness;
        bestChar = String.fromCharCode(65 + row); // A + row index
      }
    }

    // Threshold for name bubbles (Lowered to 0.35)
    if (maxDarkness > 0.35) {
      name += bestChar;
    } else {
      if (name.length > 0 && name[name.length - 1] !== ' ') {
        name += " ";
      }
    }
  }

  return name.trim();
};

/**
 * Process Numeric Grid (0-9)
 */
const processNumericGrid = (imageData, width, height, config, ctx) => {
  const startX = width * config.startX;
  const startY = height * config.startY;
  const gridWidth = width * config.width;
  const gridHeight = height * config.height;

  const columns = config.columns;
  const rows = config.rows; // 0-9

  const colWidth = gridWidth / columns;
  const rowHeight = gridHeight / rows;
  const bubbleRadius = Math.min(colWidth, rowHeight) * 0.3;

  let result = "";

  // Debug: Draw Grid Box
  if (ctx) {
    ctx.strokeRect(startX, startY, gridWidth, gridHeight);
  }

  for (let col = 0; col < columns; col++) {
    let bestDigit = "";
    let maxDarkness = 0;

    for (let row = 0; row < rows; row++) {
      const bubbleX = Math.floor(startX + (col * colWidth) + (colWidth * 0.5));
      const bubbleY = Math.floor(startY + (row * rowHeight) + (rowHeight * 0.5));

      const darkness = calculateBubbleDarkness(imageData.data, width, bubbleX, bubbleY, Math.floor(bubbleRadius));

      // Debug: Draw bubble center for ALL bubbles
      if (ctx) {
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, 2, 0, 2 * Math.PI);
        ctx.fillStyle = darkness > 0.35 ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.2)';
        ctx.fill();
      }

      if (darkness > maxDarkness) {
        maxDarkness = darkness;
        bestDigit = row.toString();
      }
    }

    if (maxDarkness > 0.35) {
      result += bestDigit;
    }
  }

  return result;
};

/**
 * Validate sheet quality and detect if sheet is processable
 */
export const validateSheet = async (imageDataUrl) => {
  try {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Calculate image sharpness and quality metrics
          const sharpness = calculateSharpness(imageData);
          const contrast = calculateContrast(imageData);

          // Validate minimum resolution
          const minWidth = 800;
          const minHeight = 1000;
          const hasMinResolution = canvas.width >= minWidth && canvas.height >= minHeight;

          const isValid = sharpness > 10 && contrast > 0.2 && hasMinResolution;

          resolve({
            isValid,
            sharpness,
            contrast,
            width: canvas.width,
            height: canvas.height,
            reason: !isValid ?
              (!hasMinResolution ? 'Low resolution image' :
                sharpness <= 10 ? 'Blurred or low quality image' :
                  'Poor contrast') : null
          });
        } catch (error) {
          resolve({ isValid: false, reason: 'Failed to process image' });
        }
      };
      img.onerror = () => resolve({ isValid: false, reason: 'Invalid image file' });
      img.src = imageDataUrl;
    });
  } catch (error) {
    return { isValid: false, reason: 'Error validating sheet' };
  }
};

/**
 * Calculate image sharpness using Laplacian variance
 */
const calculateSharpness = (imageData) => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  let variance = 0;
  let count = 0;

  // Sample every 10th pixel for performance
  for (let y = 1; y < height - 1; y += 10) {
    for (let x = 1; x < width - 1; x += 10) {
      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      const idx_right = (y * width + (x + 1)) * 4;
      const gray_right = (data[idx_right] + data[idx_right + 1] + data[idx_right + 2]) / 3;

      const idx_down = ((y + 1) * width + x) * 4;
      const gray_down = (data[idx_down] + data[idx_down + 1] + data[idx_down + 2]) / 3;

      const laplacian = Math.abs(gray_right - gray) + Math.abs(gray_down - gray);
      variance += laplacian * laplacian;
      count++;
    }
  }

  return count > 0 ? variance / count : 0;
};

/**
 * Calculate image contrast
 */
const calculateContrast = (imageData) => {
  const data = imageData.data;
  let min = 255, max = 0;

  // Sample every 20th pixel for performance
  for (let i = 0; i < data.length; i += 80) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    min = Math.min(min, gray);
    max = Math.max(max, gray);
  }

  return (max - min) / 255;
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

    // Validate sheet quality
    const validation = await validateSheet(imageDataUrl);

    // Try bubble detection first (faster and more accurate for OMR)
    let answers = await detectBubbles(imageDataUrl);

    // If bubble detection fails, fallback to OCR
    if (answers.filter(a => a).length === 0) {
      console.log('Bubble detection failed, trying OCR...');
      answers = await processWithOCR(imageDataUrl);
    }

    // Extract student info (now returns debug image too)
    const studentInfo = await extractStudentInfo(imageDataUrl);

    return {
      ...studentInfo,
      answers,
      imageDataUrl: studentInfo.debugImageDataUrl || imageDataUrl, // Use debug image if available
      validation,
      isValid: validation.isValid && (answers.filter(a => a).length > 0),
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

      // Validate sheet quality
      const validation = await validateSheet(imageDataUrl);

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
        imageDataUrl,
        validation,
        isValid: validation.isValid && (answers.filter(a => a).length > 0),
        pageNumber: i + 1,
      });
    }

    return allStudents;
  } catch (error) {
    console.error('Error processing multi-page PDF:', error);
    throw error;
  }
};
