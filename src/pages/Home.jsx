import { motion } from 'framer-motion';
import { Users, FileCheck, TrendingUp, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

const Home = () => {
  const [stats, setStats] = useState({
    totalScanned: 0,
    avgMarks: 0,
    pendingReview: 0,
    lastScanTime: 'Never',
  });

  useEffect(() => {
    const results = JSON.parse(localStorage.getItem('omr_results') || '[]');
    if (results.length > 0) {
      const totalMarks = results.reduce((sum, r) => sum + r.marks, 0);
      const avgMarks = (totalMarks / results.length).toFixed(2);
      const lastScan = localStorage.getItem('last_scan_time') || 'Never';

      setStats({
        totalScanned: results.length,
        avgMarks,
        pendingReview: 0,
        lastScanTime: lastScan,
      });
    }
  }, []);

  const statCards = [
    {
      title: 'Total Scanned',
      value: stats.totalScanned,
      icon: FileCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Average Marks',
      value: stats.avgMarks,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Pending Review',
      value: stats.pendingReview,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Last Scan',
      value: stats.lastScanTime,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      isTime: true,
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome to OMR Scanner Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor your scanned sheets and view analytics
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.isTime ? (
                    <span className="text-base">{stat.value}</span>
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/upload"
            className="p-6 border-2 border-primary-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 text-center group"
          >
            <FileCheck className="w-12 h-12 text-primary-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-800 mb-1">Upload Sheets</h3>
            <p className="text-sm text-gray-600">
              Upload answer keys and student sheets
            </p>
          </a>

          <a
            href="/results"
            className="p-6 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-center group"
          >
            <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-800 mb-1">View Results</h3>
            <p className="text-sm text-gray-600">
              Check scanned results and rankings
            </p>
          </a>

          <div className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 text-center group">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-800 mb-1">Reports</h3>
            <p className="text-sm text-gray-600">Generate detailed reports</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="card bg-gradient-to-r from-primary-500 to-blue-600 text-white"
      >
        <h2 className="text-2xl font-bold mb-2">Getting Started</h2>
        <p className="mb-4 opacity-90">
          Follow these steps to scan and evaluate OMR sheets:
        </p>
        <ol className="space-y-2 list-decimal list-inside">
          <li>Upload the answer key (CSV, XLSX, or TXT format)</li>
          <li>Upload student answer sheets</li>
          <li>Select the class/grade</li>
          <li>Click "Scan Sheets" to process</li>
          <li>View and download results from the Results page</li>
        </ol>
      </motion.div>
    </div>
  );
};

export default Home;
