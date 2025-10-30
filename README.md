# OMR Scanner Web App

A complete responsive OMR (Optical Mark Recognition) Scanner Web Application built with React and Tailwind CSS.

## Features

### 🔐 Authentication
- Single Admin Login Page
- Demo credentials: `admin` / `admin123`
- Session management with localStorage
- Protected routes

### 🏠 Dashboard
- Home page with statistics cards
- Total scanned sheets
- Average marks
- Last scan time
- Quick action cards

### 📤 Upload Sheets
- Drag & drop file upload zones
- Upload answer key (CSV, XLSX, TXT)
- Upload student answer sheets (multiple files)
- Class selection dropdown
- Mock data generation for demo
- Scanning simulation with loading state

### 📊 Results
- Responsive results table
- Sortable columns (rank, name, roll number, class, marks)
- Color-coded marks badges
- Rank badges with special styling for top 3
- Summary statistics
- Export functionality:
  - CSV format
  - Excel (.xlsx) format
  - PDF format

### 🎨 UI/UX Features
- Modern, clean dashboard interface
- Smooth scrolling enabled
- Framer Motion animations
- Responsive design (mobile, tablet, desktop)
- Sidebar navigation with mobile menu
- Soft shadows and rounded corners
- Consistent color scheme
- Loading states and success indicators

## Tech Stack

- **React 18** - UI library
- **React Router DOM** - Routing
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **PapaParse** - CSV parsing
- **XLSX** - Excel file handling
- **jsPDF** - PDF generation
- **FileSaver** - File download
- **Vite** - Build tool

## Installation

1. Navigate to the project directory:
```bash
cd omr-web-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit: `http://localhost:5173`

## Usage

### Login
1. Use demo credentials:
   - Username: `admin`
   - Password: `admin123`

### Upload and Scan
1. Navigate to "Upload Sheets" from the sidebar
2. Upload answer key (optional - demo data available)
   - Format: CSV with `question_number,correct_answer` per row
   - Example: `1,A` or `2,B`
3. Upload student sheets (optional - demo data available)
   - Format: CSV with `name,roll_number,answer1,answer2,...` per row
   - Example: `John Doe,001,A,B,C,D`
4. Select class from dropdown
5. Click "Scan Sheets"
6. Results will be automatically calculated and saved

### View Results
1. Navigate to "Results" from the sidebar
2. View results table with sorting capability
3. Check summary statistics
4. Select export format (CSV, Excel, or PDF)
5. Click "Download Results" to export

### Demo Mode
You can click "Scan Sheets" without uploading any files to see the app in action with mock data (5 students with random scores).

## File Format Specifications

### Answer Key Format (CSV)
```csv
1,A
2,B
3,C
4,D
5,A
```

### Student Sheets Format (CSV)
```csv
John Doe,001,A,B,C,D,A
Jane Smith,002,B,C,D,A,B
```

## Project Structure

```
omr-web-app/
├── src/
│   ├── components/
│   │   ├── FileDropZone.jsx
│   │   ├── Layout.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── Sidebar.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Results.jsx
│   │   └── Upload.jsx
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## Features in Detail

### Authentication System
- Local storage-based authentication
- Automatic redirect on login/logout
- Protected routes for dashboard pages
- Session persistence across page refreshes

### File Upload System
- Drag and drop support
- Multiple file selection
- File type validation
- Visual feedback for uploads
- File size display
- Remove uploaded files

### Results Processing
- Answer comparison algorithm
- Marks calculation (percentage-based)
- Automatic ranking system
- Sorting and filtering
- Statistical summaries

### Export System
- CSV export with proper encoding
- Excel export with formatted sheets
- PDF export with tables and headers
- Timestamped filenames

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Author

Built with React + Tailwind CSS
"# miniprojectomrsheet" 
