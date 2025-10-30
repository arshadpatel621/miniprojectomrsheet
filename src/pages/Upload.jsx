import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import FileDropZone from '../components/FileDropZone';
import { CheckCircle, Loader, FileText, Image as ImageIcon } from 'lucide-react';
import Papa from 'papaparse';
import { processOMRSheet, processMultiPagePDF } from '../utils/omrProcessor';

const Upload = () => {
  const [answerKey, setAnswerKey] = useState([]);
  const [studentSheets, setStudentSheets] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [fileFormat, setFileFormat] = useState('csv'); // 'csv' or 'image'
  const [processingStatus, setProcessingStatus] = useState('');
  const navigate = useNavigate();

  const parseAnswerKey = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          // Expected format: question_number, correct_answer
          const answers = results.data
            .filter(row => row.length >= 2 && row[0] && row[1])
            .map(row => ({
              question: parseInt(row[0]),
              answer: row[1].toString().trim().toUpperCase()
            }));
          resolve(answers);
        },
        error: (error) => reject(error)
      });
    });
  };

  const parseStudentSheet = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          // Expected format: student_name, roll_number, q1_answer, q2_answer, ...
          const students = results.data
            .filter(row => row.length >= 3 && row[0] && row[1])
            .map(row => ({
              name: row[0].toString().trim(),
              rollNumber: row[1].toString().trim(),
              answers: row.slice(2).map(ans => ans.toString().trim().toUpperCase())
            }));
          resolve(students);
        },
        error: (error) => reject(error)
      });
    });
  };

  const processImageFiles = async () => {
    setProcessingStatus('Processing image files...');
    
    // Process answer key image (always single page)
    let parsedAnswerKey = [];
    if (answerKey.length > 0) {
      setProcessingStatus('Processing answer key image...');
      const answerKeyData = await processOMRSheet(answerKey[0]);
      parsedAnswerKey = answerKeyData.answers.map((answer, index) => ({
        question: index + 1,
        answer: answer || 'A' // Default to A if no answer detected
      }));
    }

    // Process student sheets - handle multi-page PDFs
    let students = [];
    if (studentSheets.length > 0) {
      for (let i = 0; i < studentSheets.length; i++) {
        const file = studentSheets[i];
        setProcessingStatus(`Processing file ${i + 1} of ${studentSheets.length}...`);
        
        // Check if it's a PDF - if so, process all pages
        if (file.type === 'application/pdf') {
          setProcessingStatus(`Processing multi-page PDF ${i + 1}...`);
          const allStudentsInPDF = await processMultiPagePDF(file);
          
          // Add all students from this PDF
          allStudentsInPDF.forEach((studentData, pageIndex) => {
            setProcessingStatus(`Processed page ${pageIndex + 1} of ${allStudentsInPDF.length} in PDF ${i + 1}`);
            students.push({
              name: studentData.name,
              rollNumber: studentData.rollNumber,
              answers: studentData.answers
            });
          });
        } else {
          // Single image file
          const studentData = await processOMRSheet(file);
          students.push({
            name: studentData.name,
            rollNumber: studentData.rollNumber,
            answers: studentData.answers
          });
        }
      }
    }

    return { parsedAnswerKey, students };
  };

  const calculateResults = async () => {
    setIsScanning(true);
    setScanComplete(false);
    setProcessingStatus('');

    try {
      let parsedAnswerKey = [];
      let students = [];

      if (fileFormat === 'image') {
        // Process image/PDF files
        const result = await processImageFiles();
        parsedAnswerKey = result.parsedAnswerKey;
        students = result.students;

        // Use demo data if no files uploaded
        if (answerKey.length === 0) {
          parsedAnswerKey = Array.from({ length: 200 }, (_, i) => ({
            question: i + 1,
            answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
          }));
        }

        if (studentSheets.length === 0) {
          students = [
            { name: 'John Doe', rollNumber: '001', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
            { name: 'Jane Smith', rollNumber: '002', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
          ];
        }
      } else {
        // Process CSV files (existing logic)
        if (answerKey.length > 0) {
          parsedAnswerKey = await parseAnswerKey(answerKey[0]);
        } else {
          parsedAnswerKey = Array.from({ length: 50 }, (_, i) => ({
            question: i + 1,
            answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
          }));
        }

        if (studentSheets.length > 0) {
          for (const file of studentSheets) {
            const parsed = await parseStudentSheet(file);
            students = [...students, ...parsed];
          }
        } else {
          students = [
            { name: 'John Doe', rollNumber: '001', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
            { name: 'Jane Smith', rollNumber: '002', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
            { name: 'Mike Johnson', rollNumber: '003', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
            { name: 'Emily Brown', rollNumber: '004', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
            { name: 'David Wilson', rollNumber: '005', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
          ];
        }
      }

      // Calculate marks
      const results = students.map(student => {
        let correctAnswers = 0;
        parsedAnswerKey.forEach((keyAnswer, index) => {
          if (student.answers[index] === keyAnswer.answer) {
            correctAnswers++;
          }
        });
        
        const totalQuestions = parsedAnswerKey.length;
        const marks = Math.round((correctAnswers / totalQuestions) * 100);

        return {
          name: student.name,
          rollNumber: student.rollNumber,
          class: selectedClass || 'Not specified',
          marks,
          totalQuestions,
          correctAnswers
        };
      });

      // Sort by marks and assign ranks
      results.sort((a, b) => b.marks - a.marks);
      results.forEach((result, index) => {
        result.rank = index + 1;
      });

      // Save to localStorage
      localStorage.setItem('omr_results', JSON.stringify(results));
      localStorage.setItem('last_scan_time', new Date().toLocaleString());

      // Simulate scanning delay
      setTimeout(() => {
        setIsScanning(false);
        setScanComplete(true);
        setTimeout(() => {
          navigate('/results');
        }, 1500);
      }, 2000);
    } catch (error) {
      console.error('Error scanning sheets:', error);
      setIsScanning(false);
      setProcessingStatus('');
      
      // Show specific error message
      const errorMessage = error.message || 'Error processing files. Please check the format and try again.';
      alert(errorMessage);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload Sheets</h1>
        <p className="text-gray-600">
          Upload answer keys and student sheets to scan
        </p>
      </motion.div>

      {/* File Format Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Step 1: Select File Format
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setFileFormat('csv');
              setAnswerKey([]);
              setStudentSheets([]);
            }}
            className={`p-6 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
              fileFormat === 'csv'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-300'
            }`}
          >
            <FileText className="w-8 h-8 text-primary-600" />
            <div className="text-left">
              <h3 className="font-semibold text-gray-800">CSV/Text Files</h3>
              <p className="text-sm text-gray-600">Upload CSV, Excel, or text files</p>
            </div>
          </button>
          <button
            onClick={() => {
              setFileFormat('image');
              setAnswerKey([]);
              setStudentSheets([]);
            }}
            className={`p-6 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
              fileFormat === 'image'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-300'
            }`}
          >
            <ImageIcon className="w-8 h-8 text-primary-600" />
            <div className="text-left">
              <h3 className="font-semibold text-gray-800">Images/PDF</h3>
              <p className="text-sm text-gray-600">Upload scanned OMR sheets (PDF, JPG, PNG)</p>
            </div>
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Step 2: Upload Answer Key
        </h2>
        <FileDropZone
          onFilesSelected={setAnswerKey}
          accept={fileFormat === 'csv' ? '.csv,.xlsx,.txt' : '.pdf,.jpg,.jpeg,.png,.bmp'}
          multiple={false}
          label="Answer Key File"
        />
        <p className="text-sm text-gray-500 mt-3">
          {fileFormat === 'csv'
            ? 'Format: Each row should contain question number and correct answer (e.g., 1,A)'
            : 'Upload a scanned OMR answer key sheet with filled bubbles'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Step 3: Upload Student Sheets
        </h2>
        <FileDropZone
          onFilesSelected={setStudentSheets}
          accept={fileFormat === 'csv' ? '.csv,.xlsx,.txt' : '.pdf,.jpg,.jpeg,.png,.bmp'}
          multiple={true}
          label="Student Answer Sheets"
        />
        <p className="text-sm text-gray-500 mt-3">
          {fileFormat === 'csv'
            ? 'Format: name, roll_number, answer1, answer2, ... (one student per row)'
            : 'Upload scanned OMR sheets. You can upload: (1) Multiple separate images, OR (2) One PDF with multiple pages (1 student per page)'}
        </p>
        {fileFormat === 'image' && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>💡 Tip:</strong> For multi-page PDFs, each page will be processed as a separate student.
              Example: 20-page PDF = 20 students
            </p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Step 4: Select Class
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Class/Grade
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="input-field"
          >
            <option value="">Select a class</option>
            <option value="Class 9">Class 9</option>
            <option value="Class 10">Class 10</option>
            <option value="Class 11">Class 11</option>
            <option value="Class 12">Class 12</option>
          </select>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        {!scanComplete ? (
          <button
            onClick={calculateResults}
            disabled={isScanning}
            className="btn-primary px-8 py-3 text-lg flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {processingStatus || 'Scanning...'}
              </>
            ) : (
              'Scan Sheets'
            )}
          </button>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-3 text-green-600 text-lg font-semibold"
          >
            <CheckCircle className="w-6 h-6" />
            Scan Complete! Redirecting...
          </motion.div>
        )}
      </motion.div>

      {(answerKey.length === 0 && studentSheets.length === 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="card bg-yellow-50 border-yellow-200"
        >
          <p className="text-sm text-yellow-800">
            <strong>Demo Mode:</strong> You can click "Scan Sheets" without uploading files to see a demo with mock data.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default Upload;
