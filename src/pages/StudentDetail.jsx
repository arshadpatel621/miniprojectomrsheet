import React, { useEffect, useState } from 'react';
import { getImage } from '../utils/indexedStorage';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle, Circle, FileText, Printer } from 'lucide-react';

const StudentDetail = () => {
  const { rollNumber } = useParams();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [answerKey, setAnswerKey] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Load student data from localStorage
    (async () => {
      setLoading(true);
      const results = JSON.parse(localStorage.getItem('omr_results') || '[]');
      const student = results.find(s => s.rollNumber === rollNumber);

      if (student) {
        // Try to load image from IndexedDB
        let imageDataUrl = null;
        try {
          imageDataUrl = await getImage(rollNumber);
        } catch (err) {
          console.warn('Failed to load image from IndexedDB', err);
        }
        setStudentData({ ...student, imageDataUrl });
        setNotFound(false);
      } else {
        setNotFound(true);
      }

      // Load answer key from localStorage (if stored separately)
      const storedAnswerKey = JSON.parse(localStorage.getItem('answer_key') || '[]');
      setAnswerKey(storedAnswerKey);
      setLoading(false);
    })();
  }, [rollNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (notFound || !studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Student not found</h2>
          <button
            onClick={() => navigate('/results')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  // String matching algorithm to compare answers
  const levenshteinDistance = (a = '', b = '') => {
    const pa = a.toString();
    const pb = b.toString();
    const lena = pa.length;
    const lenb = pb.length;
    if (lena === 0) return lenb;
    if (lenb === 0) return lena;
    const v0 = new Array(lenb + 1).fill(0);
    const v1 = new Array(lenb + 1).fill(0);
    for (let j = 0; j <= lenb; j++) v0[j] = j;
    for (let i = 0; i < lena; i++) {
      v1[0] = i + 1;
      for (let j = 0; j < lenb; j++) {
        const cost = pa[i].toLowerCase() === pb[j].toLowerCase() ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      for (let j = 0; j <= lenb; j++) v0[j] = v1[j];
    }
    return v1[lenb];
  };

  const similarity = (a = '', b = '') => {
    const sa = a.toString().trim();
    const sb = b.toString().trim();
    if (sa === '' && sb === '') return 1;
    if (sa === '' || sb === '') return 0;
    const dist = levenshteinDistance(sa, sb);
    const maxLen = Math.max(sa.length, sb.length);
    return 1 - dist / maxLen;
  };

  const compareAnswers = (studentAnswer, correctAnswer) => {
    if (!studentAnswer || studentAnswer === '') return 'unattempted';
    if (!correctAnswer || correctAnswer === '') return 'no-key';

    const sa = studentAnswer.toString().trim().toUpperCase();
    const ka = correctAnswer.toString().trim().toUpperCase();

    if (sa === ka) return 'correct';

    // If single-letter answers (A-D), use exact match only
    if (sa.length === 1 && ka.length === 1) return sa === ka ? 'correct' : 'wrong';

    // Otherwise use similarity threshold (>= 0.75 = correct)
    const sim = similarity(sa, ka);
    return sim >= 0.75 ? 'correct' : 'wrong';
  };

  // Calculate statistics - use new data structure if available
  const totalQuestions = studentData.totalQuestions || 200;
  const correctCount = studentData.correctAnswers || 0;
  const wrongCount = studentData.wrongAnswers || 0;
  const unattemptedCount = studentData.unattempted || 0;
  const totalMarks = studentData.totalMarks || 0;
  const maxMarks = studentData.maxMarks || 0;
  const percentage = studentData.percentage || 0;

  // Use detailed answers if available, otherwise generate from answer comparison
  const answerComparison = studentData.detailedAnswers || (() => {
    console.log('⚠️ detailedAnswers not found, generating from answer key');
    const comparison = [];
    for (let i = 0; i < totalQuestions; i++) {
      const studentAnswer = studentData.answers ? studentData.answers[i] : '';
      const correctAnswer = answerKey && answerKey[i] ? answerKey[i].answer : '';
      const status = compareAnswers(studentAnswer, correctAnswer);

      comparison.push({
        questionNumber: i + 1,
        studentAnswer: studentAnswer || '',
        correctAnswer: correctAnswer || '',
        isCorrect: status === 'correct',
        isAttempted: status !== 'unattempted'
      });
    }
    return comparison;
  })();

  console.log('📊 Student Detail Page Debug Info:');
  console.log('- Total Questions:', totalQuestions);
  console.log('- Answer Comparison Length:', answerComparison.length);
  console.log('- Correct:', correctCount);
  console.log('- Wrong:', wrongCount);
  console.log('- Unattempted:', unattemptedCount);
  console.log('- Has detailedAnswers:', !!studentData.detailedAnswers);

  const handlePrint = () => {
    window.print();
  };

  const renderAnswerBubble = (answer) => {
    const isCorrect = answer.isCorrect;
    const isAttempted = answer.isAttempted;

    if (isCorrect) {
      return (
        <div className="flex items-center space-x-2 p-2 bg-green-50 rounded border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-700">{answer.studentAnswer || '-'}</span>
        </div>
      );
    } else if (isAttempted && !isCorrect) {
      return (
        <div className="flex flex-col space-y-1 p-2 bg-red-50 rounded border border-red-200">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-700 line-through">{answer.studentAnswer || '-'}</span>
          </div>
          <div className="flex items-center space-x-2 pl-7">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">{answer.correctAnswer || '-'}</span>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col space-y-1 p-2 bg-gray-50 rounded border border-gray-200">
          <div className="flex items-center space-x-2">
            <Circle className="w-5 h-5 text-gray-400" />
            <span className="text-gray-500">Not Attempted</span>
          </div>
          <div className="flex items-center space-x-2 pl-7">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">{answer.correctAnswer || '-'}</span>
          </div>
        </div>
      );
    }
  };

  const renderCompleteSheet = () => {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-indigo-600" />
            {`Complete Answer Sheet (Q1 - Q${totalQuestions})`}
          </h3>
          <div className="px-4 py-2 bg-indigo-100 rounded-lg">
            <span className="text-sm font-semibold text-indigo-800">
              Showing {answerComparison.length} questions
            </span>
          </div>
        </div>

        {answerComparison.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">No question data available</p>
            <p className="text-sm">Please re-upload the student sheets to generate detailed question data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {answerComparison.map((answer) => (
              <div key={answer.questionNumber} className="border border-gray-200 rounded-lg p-3 bg-white print:break-inside-avoid hover:shadow-md transition-shadow">
                <div className="text-sm font-semibold text-gray-600 mb-2">Q{answer.questionNumber}</div>
                {renderAnswerBubble(answer)}
                <div className="mt-2 text-xs text-gray-500">
                  <div>Student: <span className="font-medium text-gray-700">{answer.studentAnswer || '-'}</span></div>
                  <div>Correct: <span className="font-medium text-gray-700">{answer.correctAnswer || '-'}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @media print {
          body {
            background: white;
            margin: 0;
            padding: 20px;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4 print:hidden">
            <button
              onClick={() => navigate('/results')}
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Results
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Printer className="w-5 h-5 mr-2" />
              Print Result
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Student Answer Sheet - NEET Format</h1>

            {/* Student Info */}
            {/* Scanned sheet image (if available) */}
            {studentData.imageDataUrl && (
              <div className="mb-4 print:hidden">
                <img src={studentData.imageDataUrl} alt="Scanned Sheet" className="w-full max-w-xl rounded-lg shadow-sm border" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-lg font-semibold text-gray-800">{studentData.name}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Roll Number</p>
                <p className="text-lg font-semibold text-gray-800 font-mono">{studentData.rollNumber}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Hall Ticket</p>
                <p className="text-lg font-semibold text-gray-800 font-mono">{studentData.hallTicket || 'N/A'}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Rank</p>
                <p className="text-lg font-semibold text-gray-800">#{studentData.rank}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Marks</p>
                <p className="text-lg font-semibold text-gray-800">{totalMarks}/{maxMarks}</p>
              </div>
            </div>

            {/* NEET Marking Info */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-blue-800 mb-2">NEET Marking Scheme:</p>
              <p className="text-xs text-blue-700">+4 for each correct answer | -1 for each wrong answer | 0 for unattempted</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white"
              >
                <FileText className="w-8 h-8 mb-2" />
                <p className="text-3xl font-bold">{totalQuestions}</p>
                <p className="text-blue-100">Total Questions</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white"
              >
                <CheckCircle className="w-8 h-8 mb-2" />
                <p className="text-3xl font-bold">{correctCount}</p>
                <p className="text-green-100">Correct Answers</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white"
              >
                <XCircle className="w-8 h-8 mb-2" />
                <p className="text-3xl font-bold">{wrongCount}</p>
                <p className="text-red-100">Wrong Answers</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg p-6 text-white"
              >
                <Circle className="w-8 h-8 mb-2" />
                <p className="text-3xl font-bold">{unattemptedCount}</p>
                <p className="text-gray-100">Unattempted</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Summary Section - Show lists of correct/wrong questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4">Question Summary</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Correct Answers */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <h4 className="text-lg font-bold text-green-800 mb-3 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Correct ({correctCount})
              </h4>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {answerComparison
                  .filter(a => a.isCorrect)
                  .map(a => (
                    <span key={a.questionNumber} className="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold">
                      Q{a.questionNumber}
                    </span>
                  ))}
                {correctCount === 0 && <p className="text-sm text-green-700">No correct answers</p>}
              </div>
            </div>

            {/* Wrong Answers */}
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
              <h4 className="text-lg font-bold text-red-800 mb-3 flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                Wrong ({wrongCount})
              </h4>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {answerComparison
                  .filter(a => a.isAttempted && !a.isCorrect)
                  .map(a => (
                    <span key={a.questionNumber} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold">
                      Q{a.questionNumber}
                    </span>
                  ))}
                {wrongCount === 0 && <p className="text-sm text-red-700">No wrong answers</p>}
              </div>
            </div>

            {/* Unattempted */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <Circle className="w-5 h-5 mr-2" />
                Unattempted ({unattemptedCount})
              </h4>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {answerComparison
                  .filter(a => !a.isAttempted)
                  .map(a => (
                    <span key={a.questionNumber} className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-semibold">
                      Q{a.questionNumber}
                    </span>
                  ))}
                {unattemptedCount === 0 && <p className="text-sm text-gray-700">All questions attempted</p>}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Answer Sheet Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {renderCompleteSheet()}
        </motion.div>
        </div>
      </div>
    </>
  );
};

export default StudentDetail;
