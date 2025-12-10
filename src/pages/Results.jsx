import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ArrowUpDown, FileText, TrendingUp, AlertTriangle, Eye, UserPlus, Upload as UploadIcon, X } from 'lucide-react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { processOMRSheet } from '../utils/omrProcessor';
import { saveImage } from '../utils/indexedStorage';

const Results = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [invalidSheets, setInvalidSheets] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  const [exportFormat, setExportFormat] = useState('csv');
  const [filterText, setFilterText] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [uploadingStudent, setUploadingStudent] = useState(false);

  useEffect(() => {
    const storedResults = JSON.parse(localStorage.getItem('omr_results') || '[]');
    const storedInvalid = JSON.parse(localStorage.getItem('omr_invalid_sheets') || '[]');
    setResults(storedResults);
    setInvalidSheets(storedInvalid);
  }, []);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...results].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setResults(sorted);
  };

  const exportToCSV = () => {
    const headers = ['Rank', 'Student Name', 'Roll Number', 'Hall Ticket', 'Class', 'Total Marks', 'Max Marks', 'Percentage', 'Correct', 'Wrong', 'Unattempted'];
    const csvContent = [
      headers.join(','),
      ...results.map(r =>
        [r.rank, r.name, r.rollNumber, r.hallTicket || 'N/A', r.class, r.totalMarks || 0, r.maxMarks || 0, r.percentage || 0, r.correctAnswers, r.wrongAnswers || 0, r.unattempted || 0].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `omr_results_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      results.map(r => ({
        'Rank': r.rank,
        'Student Name': r.name,
        'Roll Number': r.rollNumber,
        'Hall Ticket': r.hallTicket || 'N/A',
        'Class': r.class,
        'Total Marks': r.totalMarks || 0,
        'Max Marks': r.maxMarks || 0,
        'Percentage': r.percentage || 0,
        'Correct Answers': r.correctAnswers,
        'Wrong Answers': r.wrongAnswers || 0,
        'Unattempted': r.unattempted || 0
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `omr_results_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(18);
    doc.text('OMR Scanner Results - NEET Format', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    const tableData = results.map(r => [
      r.rank,
      r.name,
      r.rollNumber,
      r.hallTicket || 'N/A',
      r.class,
      `${r.totalMarks || 0}/${r.maxMarks || 0}`,
      `${r.percentage || 0}%`,
      r.correctAnswers,
      r.wrongAnswers || 0,
      r.unattempted || 0
    ]);

    doc.autoTable({
      head: [['Rank', 'Name', 'Roll No.', 'Hall Ticket', 'Class', 'Marks', '%', 'Correct', 'Wrong', 'Unattempted']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [14, 165, 233] }
    });

    doc.save(`omr_results_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExport = () => {
    switch (exportFormat) {
      case 'csv':
        exportToCSV();
        break;
      case 'excel':
        exportToExcel();
        break;
      case 'pdf':
        exportToPDF();
        break;
      default:
        exportToCSV();
    }
  };

  const handleAddStudentSheet = async (file) => {
    if (!file) return;

    setUploadingStudent(true);
    try {
      // Process the OMR sheet
      const studentData = await processOMRSheet(file);

      if (!studentData.isValid) {
        alert(`Sheet could not be processed: ${studentData.validation?.reason || 'Unknown error'}`);
        setUploadingStudent(false);
        return;
      }

      // Get stored answer key
      const storedResults = JSON.parse(localStorage.getItem('omr_results') || '[]');
      if (storedResults.length === 0) {
        alert('No answer key found. Please upload answer key and at least one student first.');
        setUploadingStudent(false);
        return;
      }

      // Use answer key from first result
      const answerKey = storedResults[0].answerKey || [];
      if (answerKey.length === 0) {
        alert('Answer key not found in stored results.');
        setUploadingStudent(false);
        return;
      }

      // Calculate marks
      let correctAnswers = 0;
      let wrongAnswers = 0;
      let unattempted = 0;
      const detailedAnswers = [];

      answerKey.forEach((keyAnswer, index) => {
        const studentAnswer = studentData.answers[index] || '';
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

      const totalQuestions = answerKey.length;
      // Use same marking scheme as existing results
      const correctMarks = storedResults[0].maxMarks / totalQuestions;
      const totalMarks = (correctAnswers * correctMarks) - (wrongAnswers * 1);
      const maxMarks = totalQuestions * correctMarks;
      const percentage = ((totalMarks / maxMarks) * 100).toFixed(2);

      const newStudent = {
        name: studentData.name,
        rollNumber: studentData.rollNumber,
        hallTicket: studentData.hallTicket || 'N/A',
        batch: studentData.batch || 'N/A',
        mobile: studentData.mobile || 'N/A',
        class: storedResults[0].class || 'Not specified',
        totalMarks,
        maxMarks,
        percentage: parseFloat(percentage),
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        unattempted,
        detailedAnswers,
        answerKey
      };

      // Save image to IndexedDB
      if (studentData.imageDataUrl) {
        try {
          await saveImage(studentData.rollNumber, studentData.imageDataUrl);
        } catch (err) {
          console.warn('Failed to save image to IndexedDB', err);
        }
      }

      // Add to results and re-rank
      const updatedResults = [...storedResults, newStudent];
      updatedResults.sort((a, b) => b.totalMarks - a.totalMarks);
      updatedResults.forEach((result, index) => {
        result.rank = index + 1;
      });

      // Save to localStorage
      localStorage.setItem('omr_results', JSON.stringify(updatedResults));
      setResults(updatedResults);

      alert(`Student "${newStudent.name}" added successfully!`);
      setShowAddStudent(false);
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Error processing student sheet: ' + (error.message || 'Unknown error'));
    } finally {
      setUploadingStudent(false);
    }
  };

  // Filter results based on search text
  const filteredResults = results.filter(r =>
    r.name.toLowerCase().includes(filterText.toLowerCase()) ||
    r.rollNumber.toLowerCase().includes(filterText.toLowerCase()) ||
    (r.hallTicket && r.hallTicket.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">Results</h1>
          <p className="text-gray-600 text-lg">
            View and download scanned OMR sheet results
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none bg-white/80 hover:border-gray-300 transition-all duration-300 font-medium"
          >
            <option value="csv">📊 CSV Format</option>
            <option value="excel">📗 Excel (.xlsx)</option>
            <option value="pdf">📄 PDF Document</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddStudent(true)}
            disabled={results.length === 0}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <UserPlus size={18} />
            Add Student
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExport}
            disabled={results.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed px-6"
          >
            <Download size={18} />
            Download Results
          </motion.button>
        </div>
      </motion.div>

      {/* Invalid Sheets Warning */}
      {invalidSheets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-red-50 border-2 border-red-200"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 mb-2">
                {invalidSheets.length} Sheet{invalidSheets.length > 1 ? 's' : ''} Could Not Be Processed
              </h3>
              <p className="text-sm text-red-700 mb-3">
                The following sheets were rejected due to quality issues or processing errors:
              </p>
              <div className="space-y-2">
                {invalidSheets.map((sheet, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="text-sm font-semibold text-gray-800">
                      Sheet #{sheet.fileNumber}{sheet.pageNumber ? ` (Page ${sheet.pageNumber})` : ''}
                      {sheet.name !== 'Unknown' && ` - ${sheet.name}`}
                      {sheet.rollNumber !== 'N/A' && ` (Roll: ${sheet.rollNumber})`}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Reason: {sheet.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search/Filter */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card"
        >
          <input
            type="text"
            placeholder="Search by name, roll number, or hall ticket..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
          />
        </motion.div>
      )}

      {results.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-12"
        >
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Results Available
          </h3>
          <p className="text-gray-500 mb-6">
            Upload and scan answer sheets to see results here
          </p>
          <a href="/upload" className="btn-primary inline-block">
            Go to Upload
          </a>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-hidden p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-primary-50 to-blue-50 border-b-2 border-primary-200">
                <tr>
                  <th
                    className="px-4 py-4 text-left text-sm font-bold text-gray-800 cursor-pointer hover:bg-primary-100/50 transition-all duration-200"
                    onClick={() => handleSort('rank')}
                  >
                    <div className="flex items-center gap-2">
                      Rank
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-bold text-gray-800 cursor-pointer hover:bg-primary-100/50 transition-all duration-200"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-bold text-gray-800 cursor-pointer hover:bg-primary-100/50 transition-all duration-200"
                    onClick={() => handleSort('rollNumber')}
                  >
                    <div className="flex items-center gap-2">
                      Roll No.
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-bold text-gray-800 cursor-pointer hover:bg-primary-100/50 transition-all duration-200"
                    onClick={() => handleSort('hallTicket')}
                  >
                    <div className="flex items-center gap-2">
                      Hall Ticket
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-bold text-gray-800 cursor-pointer hover:bg-primary-100/50 transition-all duration-200"
                    onClick={() => handleSort('totalMarks')}
                  >
                    <div className="flex items-center gap-2">
                      Marks
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-bold text-gray-800 cursor-pointer hover:bg-primary-100/50 transition-all duration-200"
                    onClick={() => handleSort('percentage')}
                  >
                    <div className="flex items-center gap-2">
                      %
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-gray-800">
                    <span className="text-green-700">✓</span>
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-gray-800">
                    <span className="text-red-700">✗</span>
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-gray-800">
                    <span className="text-gray-500">—</span>
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-gray-800">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredResults.map((result, index) => (
                  <motion.tr
                    key={result.rollNumber}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(14, 165, 233, 0.05)' }}
                    className="transition-all duration-200 border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-bold text-base shadow-md ${result.rank === 1
                              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white'
                              : result.rank === 2
                                ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                                : result.rank === 3
                                  ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                                  : 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700'
                            }`}
                        >
                          {result.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-800">
                      {result.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                      {result.rollNumber}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                      {result.hallTicket || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-800">
                      {result.totalMarks || 0}/{result.maxMarks || 0}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-lg text-sm font-bold ${result.percentage >= 75
                            ? 'bg-green-100 text-green-800'
                            : result.percentage >= 50
                              ? 'bg-blue-100 text-blue-800'
                              : result.percentage >= 35
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {result.percentage?.toFixed(1) || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-green-700">
                      {result.correctAnswers}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-red-700">
                      {result.wrongAnswers || 0}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-gray-500">
                      {result.unattempted || 0}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => {
                          if (result.rollNumber && result.rollNumber !== 'N/A') {
                            navigate(`/student/${result.rollNumber}`);
                          } else {
                            // If roll number is missing, try to navigate using rank or index if possible, 
                            // but for now just alert or navigate to a fallback
                            console.warn('Invalid roll number:', result);
                            navigate(`/student/${result.rollNumber || 'unknown'}`);
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Eye size={16} />
                        Details
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          <div className="relative p-8 text-white">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              Class Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <p className="text-sm text-white/80 mb-2">Total Students</p>
                <p className="text-3xl font-bold">{results.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <p className="text-sm text-white/80 mb-2">Average Percentage</p>
                <p className="text-3xl font-bold">
                  {(results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length).toFixed(1)}%
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <p className="text-sm text-white/80 mb-2">Highest Marks</p>
                <p className="text-3xl font-bold">
                  {Math.max(...results.map(r => r.totalMarks || 0))}
                </p>
                <p className="text-xs text-white/70 mt-1">
                  ({Math.max(...results.map(r => r.percentage || 0)).toFixed(1)}%)
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <p className="text-sm text-white/80 mb-2">Lowest Marks</p>
                <p className="text-3xl font-bold">
                  {Math.min(...results.map(r => r.totalMarks || 0))}
                </p>
                <p className="text-xs text-white/70 mt-1">
                  ({Math.min(...results.map(r => r.percentage || 0)).toFixed(1)}%)
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <p className="text-sm text-white/80 mb-2">Average Correct</p>
                <p className="text-3xl font-bold">
                  {(results.reduce((sum, r) => sum + r.correctAnswers, 0) / results.length).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Add Student Sheet</h3>
                  <p className="text-sm text-gray-600 mt-1">Upload student OMR sheet (Image or PDF)</p>
                </div>
                <button
                  onClick={() => setShowAddStudent(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} className="text-gray-600" />
                </button>
              </div>

              <div className="p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.bmp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAddStudentSheet(file);
                    }}
                    className="hidden"
                    id="add-student-file"
                    disabled={uploadingStudent}
                  />
                  <label
                    htmlFor="add-student-file"
                    className="cursor-pointer block"
                  >
                    {uploadingStudent ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
                        <p className="text-gray-600 font-medium">Processing sheet...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadIcon className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-lg font-semibold text-gray-700 mb-2">
                          Click to upload OMR sheet
                        </p>
                        <p className="text-sm text-gray-500">
                          Supported: PDF, JPG, PNG, BMP
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> The sheet will be evaluated using the same answer key and marking scheme as existing students.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Results;
