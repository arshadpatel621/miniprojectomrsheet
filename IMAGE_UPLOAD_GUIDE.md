# Image/PDF Upload Feature Guide

## Overview
The OMR Web App now supports uploading and processing scanned OMR sheets in image and PDF formats, in addition to CSV files.

## Features Added

### 1. **File Format Selection**
- Users can now choose between two upload formats:
  - **CSV/Text Files**: Traditional CSV, Excel, or text file uploads
  - **Images/PDF**: Scanned OMR bubble sheets (PDF, JPG, PNG, BMP)

### 2. **Automatic Bubble Detection**
- The app uses advanced image processing algorithms to detect filled bubbles
- Analyzes darkness levels of circular regions to identify selected answers
- Supports 200 questions with 4 options (A, B, C, D) per question

### 3. **OCR Fallback**
- If bubble detection fails, the system automatically falls back to OCR (Tesseract.js)
- Extracts text from images to identify answers
- Extracts student information (Name, Roll Number, Batch, Mobile)

### 4. **PDF Support**
- Converts PDF files to images for processing
- **Full multi-page PDF support**: Each page is processed as a separate student
- Perfect for bulk uploads: 1 PDF with 20 pages = 20 students processed automatically

### 5. **Multiple File Upload**
- Upload multiple student sheets at once
- Progress tracking during processing
- Shows status for each sheet being processed

## How It Works

### Technical Details

#### Bubble Detection Algorithm
1. **Image Analysis**: Converts uploaded image to canvas
2. **Grid Mapping**: Maps the OMR sheet into a 4-column, 50-row grid (200 questions total)
3. **Darkness Calculation**: For each question, calculates the darkness of each bubble (A, B, C, D)
4. **Answer Selection**: Selects the darkest bubble above a threshold as the filled answer
5. **Validation**: Returns empty string if no bubble meets the darkness threshold

#### OCR Processing
1. **Text Extraction**: Uses Tesseract.js to extract all text from the image
2. **Pattern Matching**: Identifies answer patterns (e.g., "1 A", "2 B")
3. **Info Extraction**: Extracts student details using regex patterns
4. **Answer Mapping**: Maps detected answers to question numbers

#### Matching Algorithm
1. **Answer Key Processing**: Processes the answer key image first
2. **Student Sheet Processing**: Processes each student sheet
3. **String Matching**: Compares student answers with answer key
4. **Score Calculation**: 
   - Counts correct answers
   - Calculates percentage marks
   - Assigns ranks based on scores

## Usage Instructions

### For Answer Key (Correct Answers):
1. Select "Images/PDF" format
2. Upload a scanned OMR sheet with all correct answers filled
3. The system will detect all filled bubbles and create the answer key

### For Student Sheets:
1. Select "Images/PDF" format
2. Upload student answer sheets in one of two ways:
   - **Option A**: Multiple separate image files (1 student per file)
   - **Option B**: Single multi-page PDF (1 student per page) ← Recommended for bulk uploads!
3. System will:
   - Automatically detect and process each page/file as a separate student
   - Extract student information (name, roll number)
   - Detect filled bubbles
   - Compare with answer key
   - Calculate scores for ALL students

### Result Display:
- **Correct Answers**: Count of matches with answer key
- **Wrong Answers**: Total questions minus correct answers
- **Marks**: Percentage score
- **Rank**: Position among all students

## Supported File Formats
- **Images**: `.jpg`, `.jpeg`, `.png`, `.bmp`
- **PDF**: `.pdf` (converts to image internally)
- **CSV**: `.csv`, `.xlsx`, `.txt` (original functionality)

## OMR Sheet Requirements

### Layout Specifications:
- **Total Questions**: 200
- **Options per Question**: 4 (A, B, C, D)
- **Layout**: 4 columns × 50 rows
- **Bubble Type**: Circular filled marks
- **Recommended Resolution**: At least 300 DPI for accurate detection

### Quality Requirements:
- Clear, high-contrast scans
- Minimal skew or rotation
- No shadows or folds
- Clean bubble marks (dark, filled circles)

## Troubleshooting

### If Bubble Detection Fails:
- Ensure the scan is high quality and well-lit
- Check that bubbles are fully filled (not partially marked)
- Verify the sheet follows the standard layout
- The system will automatically try OCR as a fallback

### If OCR Returns Incorrect Results:
- Use higher resolution scans (300 DPI or higher)
- Ensure text is clear and readable
- Check that the image is not blurry or distorted

### Processing Takes Too Long:
- Large images take more time to process
- Consider reducing image size while maintaining quality
- Process fewer sheets at once

## Development Notes

### Key Files:
- `src/utils/omrProcessor.js`: Core image processing and OCR logic
- `src/pages/Upload.jsx`: Main upload interface with format selection
- `src/components/FileDropZone.jsx`: File upload component

### Dependencies:
- **tesseract.js**: OCR engine
- **pdfjs-dist**: PDF parsing and rendering
- **Canvas API**: Image manipulation

### Performance Considerations:
- Bubble detection is faster than OCR
- OCR can take 10-30 seconds per image
- Processing happens in the browser (client-side)
- No server required for basic functionality

## Future Enhancements
- [ ] Adjust bubble detection sensitivity settings
- [ ] Support for different OMR sheet layouts
- [ ] Image preprocessing (rotation correction, contrast enhancement)
- [ ] Batch processing optimization
- [ ] Preview of detected answers before submission
- [ ] Manual correction interface for misdetected bubbles

## Testing
To test the feature:
1. Run `npm run dev` to start the development server
2. Navigate to the Upload page
3. Select "Images/PDF" format
4. Upload sample OMR sheets
5. Click "Scan Sheets" to process
6. View results on the Results page

## Notes
- Processing happens entirely in the browser (no backend required yet)
- First OCR run may take longer as Tesseract loads language data
- The bubble detection algorithm is calibrated for standard OMR sheets
- Adjust threshold values in `omrProcessor.js` if needed for your specific sheets
