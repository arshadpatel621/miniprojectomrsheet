import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import FileDropZone from '../components/FileDropZone';
import { CheckCircle, Loader, FileText, Image as ImageIcon } from 'lucide-react';
import Papa from 'papaparse';
import { processOMRSheet, processMultiPagePDF } from '../utils/omrProcessor';
import { saveImage } from '../utils/indexedStorage';

const Upload = () => {
  const [answerKey, setAnswerKey] = useState([]);
  const [studentSheets, setStudentSheets] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [fileFormat, setFileFormat] = useState('csv'); // 'csv' or 'image'
  const [processingStatus, setProcessingStatus] = useState('');

  // Marking scheme settings
  const [useNegativeMarking, setUseNegativeMarking] = useState(true);
  const [correctMarks, setCorrectMarks] = useState(4);
  const [wrongMarks, setWrongMarks] = useState(-1);
  const [unattemptedMarks, setUnattemptedMarks] = useState(0);

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
    let invalidSheets = [];

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

            // Check if sheet is valid
            if (!studentData.isValid) {
              invalidSheets.push({
                fileNumber: i + 1,
                pageNumber: studentData.pageNumber || pageIndex + 1,
                reason: studentData.validation?.reason || 'Unable to process sheet',
                name: studentData.name,
                rollNumber: studentData.rollNumber,
                hallTicket: studentData.hallTicket
              });
            } else {
              students.push({
                name: studentData.name,
                rollNumber: studentData.rollNumber,
                hallTicket: studentData.hallTicket,
                batch: studentData.batch,
                mobile: studentData.mobile,
                answers: studentData.answers,
                imageDataUrl: studentData.imageDataUrl
              });
            }
          });
        } else {
          // Single image file
          const studentData = await processOMRSheet(file);

          // Check if sheet is valid
          if (!studentData.isValid) {
            invalidSheets.push({
              fileNumber: i + 1,
              reason: studentData.validation?.reason || 'Unable to process sheet',
              name: studentData.name,
              rollNumber: studentData.rollNumber,
              hallTicket: studentData.hallTicket
            });
          } else {
            students.push({
              name: studentData.name,
              rollNumber: studentData.rollNumber,
              hallTicket: studentData.hallTicket,
              batch: studentData.batch,
              mobile: studentData.mobile,
              answers: studentData.answers,
              imageDataUrl: studentData.imageDataUrl
            });
          }
        }
      }
    }

    return { parsedAnswerKey, students, invalidSheets };
  };

  const calculateResults = async () => {
    setIsScanning(true);
    setScanComplete(false);
    setProcessingStatus('');

    try {
      let parsedAnswerKey = [];
      let students = [];
      let invalidSheets = [];

      if (fileFormat === 'image') {
        // Process image/PDF files
        const result = await processImageFiles();
        parsedAnswerKey = result.parsedAnswerKey;
        students = result.students;
        invalidSheets = result.invalidSheets;

        // Use demo data if no files uploaded
        if (answerKey.length === 0) {
          parsedAnswerKey = Array.from({ length: 200 }, (_, i) => ({
            question: i + 1,
            answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
          }));
        }

        if (studentSheets.length === 0) {
          students = [
            { name: 'John Doe', rollNumber: '001', hallTicket: 'HT001', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
            { name: 'Jane Smith', rollNumber: '002', hallTicket: 'HT002', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
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
            { name: 'John Doe', rollNumber: '001', hallTicket: 'HT001', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
            { name: 'Jane Smith', rollNumber: '002', hallTicket: 'HT002', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
            { name: 'Mike Johnson', rollNumber: '003', hallTicket: 'HT003', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
            { name: 'Emily Brown', rollNumber: '004', hallTicket: 'HT004', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
            { name: 'David Wilson', rollNumber: '005', hallTicket: 'HT005', answers: parsedAnswerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
          ];
        }
      }

      // Calculate marks with NEET-style marking (+4 correct, -1 wrong, 0 unattempted)
      const results = students.map(student => {
        let correctAnswers = 0;
        let wrongAnswers = 0;
        let unattempted = 0;
        const detailedAnswers = [];

        parsedAnswerKey.forEach((keyAnswer, index) => {
          const studentAnswer = student.answers[index] || '';
          const isCorrect = studentAnswer && studentAnswer === keyAnswer.answer;
          const isAttempted = studentAnswer && studentAnswer.trim() !== '';

          if (isCorrect) {
            correctAnswers++;
          } else if (isAttempted) {
            wrongAnswers++;
          } else {
            unattempted++;
          }

          detailedAnswers.push({
            questionNumber: index + 1,
            correctAnswer: keyAnswer.answer,
            studentAnswer: studentAnswer,
            isCorrect,
            isAttempted
          });
        });

        const totalQuestions = parsedAnswerKey.length;
        // Apply marking scheme
        const totalMarks = (correctAnswers * correctMarks) +
                          (useNegativeMarking ? (wrongAnswers * wrongMarks) : 0) +
                          (unattempted * unattemptedMarks);
        const maxMarks = totalQuestions * correctMarks;
        const percentage = ((totalMarks / maxMarks) * 100).toFixed(2);

        return {
          name: student.name,
          rollNumber: student.rollNumber,
          hallTicket: student.hallTicket || 'N/A',
          batch: student.batch || 'N/A',
          mobile: student.mobile || 'N/A',
          class: selectedClass || 'Not specified',
          totalMarks,
          maxMarks,
          percentage: parseFloat(percentage),
          totalQuestions,
          correctAnswers,
          wrongAnswers,
          unattempted,
          detailedAnswers,
          imageDataUrl: student.imageDataUrl,
          answerKey: parsedAnswerKey
        };
      });

      // Sort by total marks and assign ranks
      results.sort((a, b) => b.totalMarks - a.totalMarks);
      results.forEach((result, index) => {
        result.rank = index + 1;
      });

      // Save images to IndexedDB and remove from results
      for (const result of results) {
        if (result.imageDataUrl) {
          try {
            await saveImage(result.rollNumber, result.imageDataUrl);
            delete result.imageDataUrl; // Remove to save localStorage space
          } catch (err) {
            console.warn('Failed to save image to IndexedDB', err);
            delete result.imageDataUrl; // Remove anyway to prevent quota issues
          }
        }
      }

      // Save to localStorage (without large image data)
      localStorage.setItem('omr_results', JSON.stringify(results));
      localStorage.setItem('omr_invalid_sheets', JSON.stringify(invalidSheets));
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
        transition={{ delay: 0.45 }}
        className="card"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Step 5: Marking Scheme
        </h2>

        <div className="space-y-4">
          {/* Negative Marking Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <label className="text-sm font-semibold text-gray-800">Enable Negative Marking</label>
              <p className="text-xs text-gray-600 mt-1">Deduct marks for wrong answers</p>
            </div>
            <button
              onClick={() => setUseNegativeMarking(!useNegativeMarking)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useNegativeMarking ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useNegativeMarking ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Marking Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marks for Correct Answer
              </label>
              <input
                type="number"
                value={correctMarks}
                onChange={(e) => setCorrectMarks(Number(e.target.value))}
                className="input-field"
                min="1"
                step="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marks for Wrong Answer
              </label>
              <input
                type="number"
                value={wrongMarks}
                onChange={(e) => setWrongMarks(Number(e.target.value))}
                className="input-field"
                max="0"
                step="0.5"
                disabled={!useNegativeMarking}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marks for Unattempted
              </label>
              <input
                type="number"
                value={unattemptedMarks}
                onChange={(e) => setUnattemptedMarks(Number(e.target.value))}
                className="input-field"
                step="0.5"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-800 mb-2">Marking Scheme Preview:</p>
            <p className="text-xs text-green-700">
              <span className="font-medium">Correct:</span> +{correctMarks} marks |
              <span className="font-medium ml-2">Wrong:</span> {useNegativeMarking ? wrongMarks : 0} marks |
              <span className="font-medium ml-2">Unattempted:</span> {unattemptedMarks} marks
            </p>
            <p className="text-xs text-green-600 mt-1">
              Max Marks per question: {correctMarks} | Example: 100 questions = {correctMarks * 100} max marks
            </p>
          </div>
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
