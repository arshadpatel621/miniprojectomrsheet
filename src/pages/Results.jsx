import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ArrowUpDown, FileText } from 'lucide-react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Results = () => {
  const [results, setResults] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  const [exportFormat, setExportFormat] = useState('csv');

  useEffect(() => {
    const storedResults = JSON.parse(localStorage.getItem('omr_results') || '[]');
    setResults(storedResults);
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
    const headers = ['Rank', 'Student Name', 'Roll Number', 'Class', 'Marks', 'Correct Answers', 'Total Questions'];
    const csvContent = [
      headers.join(','),
      ...results.map(r => 
        [r.rank, r.name, r.rollNumber, r.class, r.marks, r.correctAnswers, r.totalQuestions].join(',')
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
        'Class': r.class,
        'Marks': r.marks,
        'Correct Answers': r.correctAnswers,
        'Total Questions': r.totalQuestions
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `omr_results_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('OMR Scanner Results', 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    const tableData = results.map(r => [
      r.rank,
      r.name,
      r.rollNumber,
      r.class,
      r.marks,
      `${r.correctAnswers}/${r.totalQuestions}`
    ]);

    doc.autoTable({
      head: [['Rank', 'Student Name', 'Roll Number', 'Class', 'Marks', 'Score']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9 },
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

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Results</h1>
          <p className="text-gray-600">
            View and download scanned OMR sheet results
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="csv">CSV</option>
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            disabled={results.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Download Results
          </motion.button>
        </div>
      </motion.div>

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
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('rank')}
                  >
                    <div className="flex items-center gap-2">
                      Rank
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Student Name
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('rollNumber')}
                  >
                    <div className="flex items-center gap-2">
                      Roll Number
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('class')}
                  >
                    <div className="flex items-center gap-2">
                      Class
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('marks')}
                  >
                    <div className="flex items-center gap-2">
                      Marks
                      <ArrowUpDown size={16} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((result, index) => (
                  <motion.tr
                    key={result.rollNumber}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                            result.rank === 1
                              ? 'bg-yellow-100 text-yellow-700'
                              : result.rank === 2
                              ? 'bg-gray-100 text-gray-700'
                              : result.rank === 3
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {result.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {result.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {result.rollNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {result.class}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                          result.marks >= 80
                            ? 'bg-green-100 text-green-800'
                            : result.marks >= 60
                            ? 'bg-blue-100 text-blue-800'
                            : result.marks >= 40
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {result.marks}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {result.correctAnswers}/{result.totalQuestions}
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
          className="card bg-blue-50 border-blue-200"
        >
          <h3 className="font-semibold text-blue-900 mb-2">Summary Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-blue-700">Total Students</p>
              <p className="text-2xl font-bold text-blue-900">{results.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Average Marks</p>
              <p className="text-2xl font-bold text-blue-900">
                {(results.reduce((sum, r) => sum + r.marks, 0) / results.length).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Highest Score</p>
              <p className="text-2xl font-bold text-blue-900">
                {Math.max(...results.map(r => r.marks))}%
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Lowest Score</p>
              <p className="text-2xl font-bold text-blue-900">
                {Math.min(...results.map(r => r.marks))}%
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Results;
