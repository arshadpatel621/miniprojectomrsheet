// ==================== APPLICATION STATE ====================
const AppState = {
    currentUser: null,
    currentPage: 'login',
    answerKeyFiles: [],
    studentSheetFiles: [],
    selectedClass: '',
    results: [],
    sortConfig: { key: 'rank', direction: 'asc' }
};

// ==================== AUTHENTICATION ====================
const Auth = {
    login(username, password) {
        if (username === 'admin' && password === 'admin123') {
            AppState.currentUser = { username };
            localStorage.setItem('omr_user', JSON.stringify(AppState.currentUser));
            return true;
        }
        return false;
    },

    logout() {
        AppState.currentUser = null;
        localStorage.removeItem('omr_user');
        Router.navigateTo('login');
    },

    isAuthenticated() {
        if (AppState.currentUser) return true;
        
        const savedUser = localStorage.getItem('omr_user');
        if (savedUser) {
            AppState.currentUser = JSON.parse(savedUser);
            return true;
        }
        return false;
    },

    checkAuth() {
        if (!Auth.isAuthenticated() && AppState.currentPage !== 'login') {
            Router.navigateTo('login');
            return false;
        }
        return true;
    }
};

// ==================== ROUTER ====================
const Router = {
    navigateTo(page) {
        // Check authentication for protected pages
        if (page !== 'login' && !Auth.isAuthenticated()) {
            page = 'login';
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show requested page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
            AppState.currentPage = page;

            // Update navigation active state
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Show/hide sidebar and mobile button based on page
            const sidebar = document.getElementById('sidebar');
            const mobileBtn = document.getElementById('mobile-menu-btn');
            
            if (page === 'login') {
                sidebar.style.display = 'none';
                mobileBtn.style.display = 'none';
            } else {
                sidebar.style.display = 'flex';
                if (window.innerWidth <= 1024) {
                    mobileBtn.style.display = 'block';
                }
            }

            // Load page-specific content
            switch(page) {
                case 'home':
                    HomePage.load();
                    break;
                case 'results':
                    ResultsPage.load();
                    break;
            }

            // Close mobile menu
            closeMobileMenu();
        }
    },

    init() {
        // Handle hash-based navigation
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1) || 'login';
            Router.navigateTo(hash);
        });

        // Handle navigation links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                const page = href.slice(1);
                if (page) {
                    e.preventDefault();
                    window.location.hash = href;
                }
            });
        });

        // Initial navigation
        const initialHash = window.location.hash.slice(1);
        if (Auth.isAuthenticated() && !initialHash) {
            window.location.hash = '#home';
        } else {
            Router.navigateTo(initialHash || 'login');
        }
    }
};

// ==================== MOBILE MENU ====================
function setupMobileMenu() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');

    mobileBtn.addEventListener('click', () => {
        const isActive = sidebar.classList.contains('active');
        
        if (isActive) {
            closeMobileMenu();
        } else {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            menuIcon.style.display = 'none';
            closeIcon.style.display = 'block';
        }
    });

    overlay.addEventListener('click', closeMobileMenu);
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');

    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    menuIcon.style.display = 'block';
    closeIcon.style.display = 'none';
}

// ==================== LOGIN PAGE ====================
function setupLoginPage() {
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (Auth.login(username, password)) {
            window.location.hash = '#home';
        } else {
            errorDiv.textContent = 'Invalid credentials. Use username: "admin" and password: "admin123"';
            errorDiv.style.display = 'block';
        }
    });
}

// ==================== HOME PAGE ====================
const HomePage = {
    load() {
        this.loadStats();
    },

    loadStats() {
        const results = JSON.parse(localStorage.getItem('omr_results') || '[]');
        const lastScanTime = localStorage.getItem('last_scan_time') || 'Never';

        let totalScanned = 0;
        let avgMarks = 0;
        let pendingReview = 0;

        if (results.length > 0) {
            totalScanned = results.length;
            const totalMarks = results.reduce((sum, r) => sum + r.marks, 0);
            avgMarks = (totalMarks / results.length).toFixed(1);
        }

        const stats = [
            {
                title: 'Total Scanned',
                value: totalScanned,
                icon: 'file-check',
                colorClass: 'stat-blue'
            },
            {
                title: 'Average Marks',
                value: avgMarks + '%',
                icon: 'trending',
                colorClass: 'stat-green'
            },
            {
                title: 'Pending Review',
                value: pendingReview,
                icon: 'users',
                colorClass: 'stat-orange'
            },
            {
                title: 'Last Scan',
                value: lastScanTime,
                icon: 'clock',
                colorClass: 'stat-purple'
            }
        ];

        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-card ${stat.colorClass}">
                <div class="stat-info">
                    <h3>${stat.title}</h3>
                    <div class="stat-value">${stat.value}</div>
                </div>
                <div class="stat-icon">
                    ${this.getIconSVG(stat.icon)}
                </div>
            </div>
        `).join('');
    },

    getIconSVG(icon) {
        const icons = {
            'file-check': '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>',
            'trending': '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
            'users': '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
            'clock': '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
        };
        return icons[icon] || '';
    }
};

// ==================== UPLOAD PAGE ====================
const UploadPage = {
    init() {
        this.setupDropzones();
        this.setupScanButton();
    },

    setupDropzones() {
        // Answer Key Dropzone
        this.setupDropzone(
            'answer-key-dropzone',
            'answer-key-input',
            'answer-key-files',
            false,
            (files) => { AppState.answerKeyFiles = files; }
        );

        // Student Sheets Dropzone
        this.setupDropzone(
            'student-sheets-dropzone',
            'student-sheets-input',
            'student-sheets-files',
            true,
            (files) => { AppState.studentSheetFiles = files; }
        );

        // Class selector
        document.getElementById('class-select').addEventListener('change', (e) => {
            AppState.selectedClass = e.target.value;
        });
    },

    setupDropzone(dropzoneId, inputId, filesListId, multiple, onFilesChange) {
        const dropzone = document.getElementById(dropzoneId);
        const input = document.getElementById(inputId);
        const filesList = document.getElementById(filesListId);
        let currentFiles = [];

        // Drag and drop handlers
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragging');
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragging');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragging');
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
        });

        // File input handler
        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            handleFiles(files);
        });

        function handleFiles(files) {
            if (!multiple && files.length > 0) {
                currentFiles = [files[0]];
            } else {
                currentFiles = files;
            }
            
            onFilesChange(currentFiles);
            renderFilesList();
        }

        function renderFilesList() {
            if (currentFiles.length === 0) {
                filesList.innerHTML = '';
                return;
            }

            filesList.innerHTML = currentFiles.map((file, index) => `
                <div class="file-item">
                    <div class="file-info">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        <div>
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${(file.size / 1024).toFixed(2)} KB</div>
                        </div>
                    </div>
                    <button class="file-remove" data-index="${index}">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `).join('');

            // Add remove handlers
            filesList.querySelectorAll('.file-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    currentFiles.splice(index, 1);
                    onFilesChange(currentFiles);
                    renderFilesList();
                });
            });
        }
    },

    setupScanButton() {
        const scanBtn = document.getElementById('scan-btn');
        const scanBtnText = document.getElementById('scan-btn-text');
        const scanLoader = document.getElementById('scan-loader');
        const scanComplete = document.getElementById('scan-complete');

        scanBtn.addEventListener('click', async () => {
            scanBtn.disabled = true;
            scanBtnText.textContent = 'Scanning...';
            scanLoader.style.display = 'inline-block';

            try {
                await this.scanSheets();
                
                scanBtn.style.display = 'none';
                scanComplete.style.display = 'flex';

                setTimeout(() => {
                    window.location.hash = '#results';
                }, 1500);
            } catch (error) {
                alert('Error scanning sheets: ' + error.message);
                scanBtn.disabled = false;
                scanBtnText.textContent = 'Scan Sheets';
                scanLoader.style.display = 'none';
            }
        });
    },

    async scanSheets() {
        return new Promise((resolve) => {
            setTimeout(async () => {
                try {
                    // Parse answer key
                    let answerKey = [];
                    if (AppState.answerKeyFiles.length > 0) {
                        answerKey = await this.parseAnswerKey(AppState.answerKeyFiles[0]);
                    } else {
                        // Mock answer key for demo
                        answerKey = Array.from({ length: 50 }, (_, i) => ({
                            question: i + 1,
                            answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
                        }));
                    }

                    // Parse student sheets
                    let students = [];
                    if (AppState.studentSheetFiles.length > 0) {
                        for (const file of AppState.studentSheetFiles) {
                            const parsed = await this.parseStudentSheet(file);
                            students = [...students, ...parsed];
                        }
                    } else {
                        // Mock student data for demo
                        students = [
                            { name: 'John Doe', rollNumber: '001', answers: answerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
                            { name: 'Jane Smith', rollNumber: '002', answers: answerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
                            { name: 'Mike Johnson', rollNumber: '003', answers: answerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
                            { name: 'Emily Brown', rollNumber: '004', answers: answerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
                            { name: 'David Wilson', rollNumber: '005', answers: answerKey.map(() => ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]) },
                        ];
                    }

                    // Calculate results
                    const results = students.map(student => {
                        let correctAnswers = 0;
                        answerKey.forEach((keyAnswer, index) => {
                            if (student.answers[index] === keyAnswer.answer) {
                                correctAnswers++;
                            }
                        });
                        
                        const totalQuestions = answerKey.length;
                        const marks = Math.round((correctAnswers / totalQuestions) * 100);

                        return {
                            name: student.name,
                            rollNumber: student.rollNumber,
                            class: AppState.selectedClass || 'Not specified',
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

                    resolve();
                } catch (error) {
                    throw error;
                }
            }, 2000);
        });
    },

    parseAnswerKey(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                complete: (results) => {
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
    },

    parseStudentSheet(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                complete: (results) => {
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
    }
};

// ==================== RESULTS PAGE ====================
const ResultsPage = {
    load() {
        const results = JSON.parse(localStorage.getItem('omr_results') || '[]');
        AppState.results = results;
        AppState.sortConfig = { key: 'rank', direction: 'asc' };

        if (results.length === 0) {
            document.getElementById('no-results').style.display = 'block';
            document.getElementById('results-table-container').style.display = 'none';
            document.getElementById('summary-stats').style.display = 'none';
            document.getElementById('export-btn').disabled = true;
        } else {
            document.getElementById('no-results').style.display = 'none';
            document.getElementById('results-table-container').style.display = 'block';
            document.getElementById('summary-stats').style.display = 'block';
            document.getElementById('export-btn').disabled = false;
            
            this.renderTable();
            this.renderSummary();
        }
    },

    renderTable() {
        const tbody = document.getElementById('results-tbody');
        tbody.innerHTML = AppState.results.map(result => `
            <tr>
                <td>
                    <span class="rank-badge ${this.getRankClass(result.rank)}">
                        ${result.rank}
                    </span>
                </td>
                <td class="student-name">${result.name}</td>
                <td class="roll-number">${result.rollNumber}</td>
                <td class="class-name">${result.class}</td>
                <td>
                    <span class="marks-badge ${this.getMarksClass(result.marks)}">
                        ${result.marks}%
                    </span>
                </td>
                <td class="roll-number">${result.correctAnswers}/${result.totalQuestions}</td>
            </tr>
        `).join('');
    },

    renderSummary() {
        const results = AppState.results;
        const totalStudents = results.length;
        const avgMarks = (results.reduce((sum, r) => sum + r.marks, 0) / totalStudents).toFixed(1);
        const highestScore = Math.max(...results.map(r => r.marks));
        const lowestScore = Math.min(...results.map(r => r.marks));

        const summaryGrid = document.getElementById('summary-grid');
        summaryGrid.innerHTML = `
            <div class="summary-item">
                <h4>Total Students</h4>
                <p>${totalStudents}</p>
            </div>
            <div class="summary-item">
                <h4>Average Marks</h4>
                <p>${avgMarks}%</p>
            </div>
            <div class="summary-item">
                <h4>Highest Score</h4>
                <p>${highestScore}%</p>
            </div>
            <div class="summary-item">
                <h4>Lowest Score</h4>
                <p>${lowestScore}%</p>
            </div>
        `;
    },

    getRankClass(rank) {
        if (rank === 1) return 'rank-1';
        if (rank === 2) return 'rank-2';
        if (rank === 3) return 'rank-3';
        return 'rank-other';
    },

    getMarksClass(marks) {
        if (marks >= 80) return 'marks-high';
        if (marks >= 60) return 'marks-medium';
        if (marks >= 40) return 'marks-low';
        return 'marks-fail';
    },

    sortResults(key) {
        let direction = 'asc';
        if (AppState.sortConfig.key === key && AppState.sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        AppState.sortConfig = { key, direction };

        AppState.results.sort((a, b) => {
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderTable();
    },

    exportToCSV() {
        const results = AppState.results;
        const headers = ['Rank', 'Student Name', 'Roll Number', 'Class', 'Marks', 'Correct Answers', 'Total Questions'];
        const csvContent = [
            headers.join(','),
            ...results.map(r => 
                [r.rank, r.name, r.rollNumber, r.class, r.marks, r.correctAnswers, r.totalQuestions].join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `omr_results_${new Date().toISOString().split('T')[0]}.csv`);
    },

    exportToExcel() {
        const results = AppState.results;
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
    },

    exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('OMR Scanner Results', 14, 20);
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        const tableData = AppState.results.map(r => [
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
    }
};

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
        Auth.logout();
    });

    // Export button
    document.getElementById('export-btn').addEventListener('click', () => {
        const format = document.getElementById('export-format').value;
        switch(format) {
            case 'csv':
                ResultsPage.exportToCSV();
                break;
            case 'excel':
                ResultsPage.exportToExcel();
                break;
            case 'pdf':
                ResultsPage.exportToPDF();
                break;
        }
    });

    // Table sorting
    document.querySelectorAll('.results-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            ResultsPage.sortResults(key);
        });
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    setupLoginPage();
    UploadPage.init();
    setupEventListeners();
    Router.init();
});
