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
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="stat-card group cursor-pointer"
          >
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">{stat.title}</p>
                <p className={`text-3xl font-bold ${stat.color} transition-all duration-300 group-hover:scale-110`}>
                  {stat.isTime ? (
                    <span className="text-base">{stat.value}</span>
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
              <div className={`p-4 rounded-2xl ${stat.bgColor} shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
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
            className="p-6 border-2 border-primary-200 rounded-2xl hover:border-primary-500 bg-gradient-to-br from-white to-primary-50 hover:shadow-xl transition-all duration-300 text-center group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100/0 to-primary-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <FileCheck className="w-12 h-12 text-primary-600 mx-auto mb-3 group-hover:scale-125 group-hover:rotate-3 transition-all duration-300 relative z-10" />
            <h3 className="font-bold text-gray-800 mb-2 relative z-10">Upload Sheets</h3>
            <p className="text-sm text-gray-600 relative z-10">
              Upload answer keys and student sheets
            </p>
          </a>

          <a
            href="/results"
            className="p-6 border-2 border-green-200 rounded-2xl hover:border-green-500 bg-gradient-to-br from-white to-green-50 hover:shadow-xl transition-all duration-300 text-center group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-100/0 to-green-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3 group-hover:scale-125 group-hover:rotate-3 transition-all duration-300 relative z-10" />
            <h3 className="font-bold text-gray-800 mb-2 relative z-10">View Results</h3>
            <p className="text-sm text-gray-600 relative z-10">
              Check scanned results and rankings
            </p>
          </a>

          <div className="p-6 border-2 border-purple-200 rounded-2xl hover:border-purple-500 bg-gradient-to-br from-white to-purple-50 hover:shadow-xl transition-all duration-300 text-center group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100/0 to-purple-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Users className="w-12 h-12 text-purple-600 mx-auto mb-3 group-hover:scale-125 group-hover:rotate-3 transition-all duration-300 relative z-10" />
            <h3 className="font-bold text-gray-800 mb-2 relative z-10">Reports</h3>
            <p className="text-sm text-gray-600 relative z-10">Generate detailed reports</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-blue-600 to-indigo-600 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Getting Started</h2>
          </div>
          <p className="mb-6 opacity-90 text-lg">
            Follow these steps to scan and evaluate OMR sheets:
          </p>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span className="pt-0.5">Upload the answer key (CSV, XLSX, or TXT format)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span className="pt-0.5">Upload student answer sheets</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span className="pt-0.5">Select the class/grade</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <span className="pt-0.5">Click "Scan Sheets" to process</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">5</span>
              <span className="pt-0.5">View and download results from the Results page</span>
            </li>
          </ol>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
