# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1️⃣ Install Dependencies
```bash
cd C:\Users\ayesh\OneDrive\Desktop\OMR\omr-web-app
npm install
```

### 2️⃣ Start Development Server
```bash
npm run dev
```

### 3️⃣ Open in Browser
Visit: `http://localhost:5173`

## 🔑 Login Credentials
- **Username:** admin
- **Password:** admin123

## 📝 Quick Demo (No Files Needed!)

1. Login with credentials above
2. Click "Upload Sheets" in sidebar
3. Click "Scan Sheets" button (without uploading files)
4. View auto-generated demo results!
5. Download results as CSV, Excel, or PDF

## 📤 Upload Real Files (Optional)

### Answer Key Format (CSV):
```csv
1,A
2,B
3,C
4,D
5,A
```

### Student Sheets Format (CSV):
```csv
John Doe,001,A,B,C,D,A
Jane Smith,002,B,C,D,A,B
Mike Johnson,003,A,A,C,D,A
```

## 🎯 Features to Try

✅ Login/Logout  
✅ Dashboard with stats  
✅ Drag & drop file upload  
✅ Scan sheets (with or without files)  
✅ View results table  
✅ Sort by any column  
✅ Export as CSV/Excel/PDF  
✅ Mobile responsive sidebar  

## 🛠️ Troubleshooting

**Port already in use?**
```bash
# Change port in vite.config.js or:
npm run dev -- --port 3000
```

**Dependencies not installing?**
```bash
# Clear cache and reinstall:
npm cache clean --force
npm install
```

## 📱 Mobile Testing

The app is fully responsive! Test on:
- Desktop (1920x1080+)
- Tablet (768px - 1024px)
- Mobile (320px - 767px)

## 🎨 Tech Stack

- React 18
- Tailwind CSS
- Framer Motion
- React Router
- Vite

Enjoy building with the OMR Scanner! 🎉
