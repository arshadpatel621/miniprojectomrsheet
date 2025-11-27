import React, { useEffect, useState } from 'react';
import { getImage } from '../utils/indexedStorage';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle, Circle, FileText } from 'lucide-react';

const StudentDetail = () => {
  const { rollNumber } = useParams();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [answerKey, setAnswerKey] = useState([]);

  useEffect(() => {
    // Load student data from localStorage
    (async () => {
      const results = JSON.parse(localStorage.getItem('omr_results') || '[]');
      const student = results.find(s => s.rollNumber === rollNumber);

      if (student) {
        const thumbKey = student.rollNumber || student.name || `${student.rank}`;
        let image = student.image || null;
        if (!image) {
          try {
            image = await getImage(thumbKey);
          } catch (err) {
            console.warn('Failed to load thumbnail from IndexedDB', err);
            image = null;
          }
        }
        setStudentData({ ...student, image });
      }

      // Load answer key from localStorage
      const storedAnswerKey = JSON.parse(localStorage.getItem('answer_key') || '[]');
      setAnswerKey(storedAnswerKey);
    })();
  }, [rollNumber]);

  if (!studentData) {
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

  // Calculate statistics
  // Determine total questions dynamically from stored answer key or student data
  const detectedTotalFromKey = answerKey && answerKey.length ? answerKey.length : 0;
  const detectedTotalFromStudent = studentData && studentData.totalQuestions ? studentData.totalQuestions : (studentData && studentData.answers ? studentData.answers.length : 0);
  const totalQuestions = detectedTotalFromKey || detectedTotalFromStudent || 200;

  const getCountsFromComparison = () => {
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    for (let i = 0; i < totalQuestions; i++) {
      const studentAnswer = studentData.answers ? studentData.answers[i] : '';
      const correctAnswer = answerKey && answerKey[i] ? answerKey[i].answer : '';
      const status = compareAnswers(studentAnswer, correctAnswer);
      if (status === 'correct') correct++;
      else if (status === 'wrong') wrong++;
      else if (status === 'unattempted') unattempted++;
    }

    return { correct, wrong, unattempted };
  };

  const { correct: correctCount, wrong: wrongCount, unattempted: unattemptedCount } = getCountsFromComparison();

  // Generate answer comparison data
  const getAnswerComparison = () => {
    const comparison = [];
    for (let i = 0; i < totalQuestions; i++) {
      const studentAnswer = studentData.answers ? studentData.answers[i] : '';
      const correctAnswer = answerKey && answerKey[i] ? answerKey[i].answer : '';
      const status = compareAnswers(studentAnswer, correctAnswer);

      comparison.push({
        question: i + 1,
        studentAnswer: studentAnswer || '-',
        correctAnswer: correctAnswer || '-',
        status: status
      });
    }
    return comparison;
  };

  const answerComparison = getAnswerComparison();

  const renderAnswerBubble = (answer) => {
    if (answer.status === 'correct') {
      return (
        <div className="flex items-center space-x-2 p-2 bg-green-50 rounded border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-700">{answer.studentAnswer}</span>
        </div>
      );
    } else if (answer.status === 'wrong') {
      return (
        <div className="flex flex-col space-y-1 p-2 bg-red-50 rounded border border-red-200">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-700 line-through">{answer.studentAnswer}</span>
          </div>
          <div className="flex items-center space-x-2 pl-7">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">{answer.correctAnswer}</span>
          </div>
        </div>
      );
    } else if (answer.status === 'unattempted') {
      return (
        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded border border-gray-200">
          <Circle className="w-5 h-5 text-gray-400" />
          <span className="text-gray-500">Not Attempted</span>
        </div>
      );
    }
    return null;
  };

  const renderCompleteSheet = () => {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <FileText className="w-6 h-6 mr-2 text-indigo-600" />
          {`Complete Answer Sheet (Q1 - Q${totalQuestions})`}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {answerComparison.slice(0, totalQuestions).map((answer) => (
            <div key={answer.question} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="text-sm font-semibold text-gray-600 mb-2">Q{answer.question}</div>
              {renderAnswerBubble(answer)}
              <div className="mt-2 text-xs text-gray-500">
                <div>Student: <span className="font-medium text-gray-700">{answer.studentAnswer}</span></div>
                <div>Correct: <span className="font-medium text-gray-700">{answer.correctAnswer || '-'}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate('/results')}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Results
          </button>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Student Answer Sheet</h1>

            {/* Student Info */}
            {/* Scanned sheet image (if available) */}
            {studentData.image && (
              <div className="mb-4">
                <img src={studentData.image} alt="Scanned Sheet" className="w-full max-w-xl rounded-lg shadow-sm border" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-lg font-semibold text-gray-800">{studentData.name}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Roll Number</p>
                <p className="text-lg font-semibold text-gray-800">{studentData.rollNumber}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Class</p>
                <p className="text-lg font-semibold text-gray-800">{studentData.class || 'N/A'}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Marks</p>
                <p className="text-lg font-semibold text-gray-800">{studentData.marks}%</p>
              </div>
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

        {/* Answer Sheet Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {renderCompleteSheet()}
        </motion.div>
      </div>
    </div>
  );
};

export default StudentDetail;
