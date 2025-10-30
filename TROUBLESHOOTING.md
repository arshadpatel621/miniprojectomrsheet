# Troubleshooting Guide

## PDF Worker Error (404)

### Problem
You're seeing this error:
```
Failed to load resource: the server responded with a status of 404
cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.296/pdf.worker.min.js
```

### Solution
The PDF.js worker file needs to be in your public directory. Follow these steps:

#### Option 1: Automatic (Recommended)
1. Stop the dev server (Ctrl+C)
2. Run: `node setup-pdf-worker.js`
3. Restart dev server: `npm run dev`

#### Option 2: Manual
1. Stop the dev server
2. Make sure the `public` directory exists
3. Copy the worker file:
   ```bash
   copy node_modules\pdfjs-dist\build\pdf.worker.min.mjs public\pdf.worker.min.mjs
   ```
4. Restart dev server: `npm run dev`

#### Option 3: Use postinstall hook (Already configured)
The worker file will be automatically copied when you run `npm install`.

### Why This Happens
PDF.js requires a separate worker file to process PDFs. The worker needs to be accessible from the browser, so it must be in the `public` directory where Vite can serve it.

## Other Common Issues

### Image Processing is Slow
- **Cause**: OCR processing can take 10-30 seconds per image
- **Solution**: 
  - Be patient during first load (Tesseract downloads language data)
  - Use smaller image files when possible
  - Process fewer images at once

### Bubble Detection Not Working
- **Cause**: Image quality, incorrect layout, or scan issues
- **Solutions**:
  - Use high-quality scans (300 DPI or higher)
  - Ensure bubbles are fully filled with dark ink
  - Make sure the sheet layout matches the expected format (4 columns, 50 rows)
  - Check that the image is not rotated or skewed
  - Try adjusting the `threshold` value in `omrProcessor.js` line 106

### OCR Not Detecting Student Info
- **Cause**: Poor image quality or unreadable text
- **Solutions**:
  - Use clear, high-contrast scans
  - Ensure text is printed clearly
  - Check that name/roll number are in the expected format

### Memory Issues with Large Files
- **Cause**: Processing large images in the browser
- **Solutions**:
  - Reduce image size/resolution before uploading
  - Process files in smaller batches
  - Use image compression tools

## Tips for Best Results

### For Answer Keys:
- Use clean, high-quality scans
- Fill bubbles completely with dark ink
- Scan at 300 DPI or higher
- Ensure good lighting and no shadows

### For Student Sheets:
- Same quality requirements as answer keys
- Ensure student info (name, roll number) is clearly printed
- Avoid handwritten information if possible (OCR works better with printed text)
- Keep sheets flat during scanning (no folds or creases)

### File Formats:
- **Images**: JPG, PNG work best (avoid BMP for large files)
- **PDF**: Single-page PDFs work fastest
- **Avoid**: Very large files (>5MB per sheet)

## Still Having Issues?

1. Check the browser console (F12) for detailed error messages
2. Verify all dependencies are installed: `npm install`
3. Clear browser cache and restart dev server
4. Try uploading a different format (e.g., PNG instead of PDF)
5. Test with the CSV format first to ensure basic functionality works

## Performance Tips

### Speed Up Processing:
1. Use images instead of PDFs when possible
2. Reduce image resolution (balance between speed and accuracy)
3. Process in smaller batches
4. Close other browser tabs to free up memory

### Accuracy Tips:
1. Use high-quality scans (300+ DPI)
2. Ensure good contrast between bubbles and background
3. Use clean, unmarked sheets
4. Fill bubbles completely and evenly

## Need Help?

If you're still experiencing issues:
1. Check the console for error messages
2. Review the `IMAGE_UPLOAD_GUIDE.md` for detailed usage instructions
3. Verify your OMR sheets match the expected layout
