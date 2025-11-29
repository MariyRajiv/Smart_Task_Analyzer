class SmartTaskAnalyzer {
    constructor() {
        this.tasks = [];
        this.currentStrategy = 'smart_balance';
        this.chart = null;
        this.API_BASE_URL = 'http://localhost:8000'; // Backend URL
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSampleData();
    }

    bindEvents() {
        // Form submission
        document.getElementById('singleTaskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSingleTask();
        });

        // Strategy buttons
        document.querySelectorAll('.strategy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setStrategy(e.target.dataset.strategy);
            });
        });

        // Action buttons
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeTasks());
        document.getElementById('suggestBtn').addEventListener('click', () => this.getSuggestions());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());

        // Bulk input example
        document.getElementById('bulkInput').addEventListener('focus', (e) => {
            if (!e.target.value.trim()) {
                e.target.value = this.getSampleJSON();
            }
        });
    }

    loadSampleData() {
        // Load sample tasks for demonstration
        const sampleTasks = [
            {
                id: 1,
                title: "Fix critical login bug",
                due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
                estimated_hours: 3,
                importance: 9,
                dependencies: []
            },
            {
                id: 2,
                title: "Update documentation",
                due_date: new Date(Date.now() + 604800000).toISOString().split('T')[0], // Next week
                estimated_hours: 2,
                importance: 6,
                dependencies: [1]
            },
            {
                id: 3,
                title: "Implement new feature",
                due_date: new Date(Date.now() + 2592000000).toISOString().split('T')[0], // Next month
                estimated_hours: 8,
                importance: 7,
                dependencies: []
            },
            {
                id: 4,
                title: "Code review for PR #123",
                due_date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // Day after tomorrow
                estimated_hours: 1,
                importance: 5,
                dependencies: []
            }
        ];

        this.tasks = sampleTasks;
        this.renderTaskList();
    }

    getSampleJSON() {
        return `[
  {
    "title": "Fix login bug",
    "due_date": "${new Date(Date.now() + 86400000).toISOString().split('T')[0]}",
    "estimated_hours": 3,
    "importance": 8,
    "dependencies": []
  },
  {
    "title": "Write documentation", 
    "due_date": "${new Date(Date.now() + 604800000).toISOString().split('T')[0]}",
    "estimated_hours": 2,
    "importance": 6,
    "dependencies": [1]
  }
]`;
    }

    addSingleTask() {
        const form = document.getElementById('singleTaskForm');
        const formData = new FormData(form);
        
        const task = {
            id: this.tasks.length > 0 ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1,
            title: document.getElementById('taskTitle').value,
            due_date: document.getElementById('taskDueDate').value,
            estimated_hours: parseFloat(document.getElementById('taskHours').value),
            importance: parseInt(document.getElementById('taskImportance').value),
            dependencies: document.getElementById('taskDependencies').value
                ? document.getElementById('taskDependencies').value.split(',').map(id => parseInt(id.trim()))
                : []
        };

        // Validate task
        if (!this.validateTask(task)) {
            return;
        }

        this.tasks.push(task);
        this.renderTaskList();
        form.reset();
        
        // Show success message
        this.showNotification('Task added successfully!', 'success');
    }

    validateTask(task) {
        if (!task.title.trim()) {
            this.showNotification('Task title is required', 'error');
            return false;
        }
        if (!task.due_date) {
            this.showNotification('Due date is required', 'error');
            return false;
        }
        if (task.estimated_hours <= 0) {
            this.showNotification('Estimated hours must be positive', 'error');
            return false;
        }
        if (task.importance < 1 || task.importance > 10) {
            this.showNotification('Importance must be between 1 and 10', 'error');
            return false;
        }
        return true;
    }

    setStrategy(strategy) {
        this.currentStrategy = strategy;
        
        // Update UI
        document.querySelectorAll('.strategy-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-strategy="${strategy}"]`).classList.add('active');
        
        this.showNotification(`Strategy changed to: ${this.getStrategyName(strategy)}`);
    }

    getStrategyName(strategy) {
        const names = {
            'smart_balance': 'Smart Balance',
            'fastest_wins': 'Fastest Wins', 
            'high_impact': 'High Impact',
            'deadline_driven': 'Deadline Driven'
        };
        return names[strategy] || strategy;
    }

    async analyzeTasks() {
        if (this.tasks.length === 0) {
            this.showNotification('Please add some tasks first', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Prepare tasks for API (convert dates to strings)
            const tasksForApi = this.tasks.map(task => ({
                ...task,
                due_date: typeof task.due_date === 'string' ? task.due_date : task.due_date.toISOString().split('T')[0]
            }));

            const response = await fetch(`${this.API_BASE_URL}/api/tasks/analyze/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tasks: tasksForApi,
                    strategy: this.currentStrategy
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Network error' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.displayResults(data);
            this.showNotification('Tasks analyzed successfully!', 'success');

        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification('Error analyzing tasks: ' + error.message, 'error');
            
            // Fallback: Use client-side analysis if server fails
            this.showNotification('Using client-side analysis as fallback', 'warning');
            this.clientSideAnalysis();
        } finally {
            this.showLoading(false);
        }
    }

    async getSuggestions() {
        if (this.tasks.length === 0) {
            this.showNotification('Please add some tasks first', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Prepare tasks for API (convert dates to strings)
            const tasksForApi = this.tasks.map(task => ({
                ...task,
                due_date: typeof task.due_date === 'string' ? task.due_date : task.due_date.toISOString().split('T')[0]
            }));

            const response = await fetch(`${this.API_BASE_URL}/api/tasks/suggest/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tasks: tasksForApi,
                    strategy: this.currentStrategy
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Network error' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.displaySuggestions(data);
            this.showNotification('Suggestions generated!', 'success');

        } catch (error) {
            console.error('Suggestion error:', error);
            this.showNotification('Error getting suggestions: ' + error.message, 'error');
            
            // Fallback: Use client-side suggestions if server fails
            this.showNotification('Using client-side suggestions as fallback', 'warning');
            this.clientSideSuggestions();
        } finally {
            this.showLoading(false);
        }
    }
    clientSideSuggestions() {
        const scorer = new ClientSideScorer();
        const scoredTasks = this.tasks.map(task => {
            const scoreData = scorer.calculateScore(task, this.tasks, this.currentStrategy);
            const eisenhowerCategory = scorer.classifyEisenhower(task);
            
            return {
                ...task,
                priority_score: scoreData.total_score,
                score_breakdown: scoreData.breakdown,
                eisenhower_category: eisenhowerCategory
            };
        });

        scoredTasks.sort((a, b) => b.priority_score - a.priority_score);
        const topTasks = scoredTasks.slice(0, 3);

        const suggestions = topTasks.map((task, index) => ({
            ...task,
            explanation: this.generateClientSideExplanation(task, index + 1, this.currentStrategy)
        }));

        this.displaySuggestions({
            suggested_tasks: suggestions,
            strategy_used: this.currentStrategy
        });
    }

    generateClientSideExplanation(task, rank, strategy) {
        const baseExplanations = {
            1: "This is your top priority because",
            2: "This should be your second focus as", 
            3: "Consider working on this task because"
        };

        const strategyExplanations = {
            'smart_balance': "it balances multiple factors effectively.",
            'fastest_wins': "it's a quick win that can be completed efficiently.",
            'high_impact': "it has high importance and impact.",
            'deadline_driven': "it has an approaching deadline."
        };

        let explanation = `${baseExplanations[rank]} ${strategyExplanations[strategy]}`;
        
        // Add specific reasons
        const reasons = [];
        if (task.score_breakdown.urgency_score > 80) reasons.push("it's very urgent");
        if (task.score_breakdown.importance_score > 80) reasons.push("it's highly important");
        if (task.score_breakdown.effort_score > 80) reasons.push("it requires low effort");
        
        if (reasons.length > 0) {
            explanation += ` Specifically: ${reasons.join(', ')}.`;
        }

        return explanation;
    }

    displayResults(data) {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'block';
        resultsSection.classList.add('fade-in');

        // Show circular dependencies warning if any
        this.showCircularDependencies(data.circular_dependencies);

        // Display priority ranking
        this.displayPriorityRanking(data.analyzed_tasks);

        // Create score distribution chart
        this.createScoreChart(data.analyzed_tasks);

        // Display Eisenhower Matrix
        this.displayEisenhowerMatrix(data.analyzed_tasks);

        // Create dependency graph visualization
        this.createDependencyGraph(data.analyzed_tasks);
    }

    displaySuggestions(data) {
        const suggestionsSection = document.getElementById('suggestionsSection');
        suggestionsSection.style.display = 'block';

        const suggestionsList = document.getElementById('suggestionsList');
        suggestionsList.innerHTML = '';

        data.suggested_tasks.forEach((task, index) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <div class="suggestion-rank">
                    <span>#${index + 1}</span>
                    <span>${task.title}</span>
                </div>
                <div class="task-meta">
                    <span>Due: ${new Date(task.due_date).toLocaleDateString()}</span>
                    <span>Effort: ${task.estimated_hours}h</span>
                    <span>Importance: ${task.importance}/10</span>
                    <span>Score: ${task.priority_score}</span>
                </div>
                <div class="suggestion-explanation">
                    ${task.explanation}
                </div>
                <div class="score-breakdown">
                    ${Object.entries(task.score_breakdown).map(([key, value]) => `
                        <div class="score-item">
                            <span>${key.replace('_score', '').toUpperCase()}:</span>
                            <span>${value}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            suggestionsList.appendChild(suggestionItem);
        });
    }

    showCircularDependencies(circularDeps) {
        const warningBanner = document.getElementById('circularDepsWarning');
        const depsList = document.getElementById('circularDepsList');

        if (circularDeps && circularDeps.length > 0) {
            warningBanner.style.display = 'block';
            depsList.innerHTML = circularDeps.map(dep => 
                `<div>• ${dep}</div>`
            ).join('');
        } else {
            warningBanner.style.display = 'none';
        }
    }

    displayPriorityRanking(tasks) {
        const rankingContainer = document.getElementById('priorityRanking');
        rankingContainer.innerHTML = '';

        tasks.forEach((task, index) => {
            const priorityItem = document.createElement('div');
            priorityItem.className = 'priority-item fade-in';
            
            const scoreClass = this.getScoreClass(task.priority_score);
            
            priorityItem.innerHTML = `
                <div class="priority-rank">${index + 1}</div>
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        <span>Due: ${new Date(task.due_date).toLocaleDateString()}</span>
                        <span>Effort: ${task.estimated_hours}h</span>
                        <span>Importance: ${task.importance}/10</span>
                        <span>Category: ${task.eisenhower_category}</span>
                    </div>
                    <div class="score-breakdown">
                        ${Object.entries(task.score_breakdown).map(([key, value]) => `
                            <div class="score-item">
                                <span>${key.replace('_score', '').toUpperCase()}:</span>
                                <span>${value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="priority-score ${scoreClass}">
                    ${task.priority_score}
                </div>
            `;
            
            rankingContainer.appendChild(priorityItem);
        });
    }

    getScoreClass(score) {
        if (score >= 80) return 'score-high';
        if (score >= 60) return 'score-medium';
        return 'score-low';
    }

    createScoreChart(tasks) {
        const ctx = document.getElementById('scoreChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const scores = tasks.map(task => task.priority_score);
        const labels = tasks.map(task => task.title.substring(0, 20) + (task.title.length > 20 ? '...' : ''));

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Priority Score',
                    data: scores,
                    backgroundColor: scores.map(score => {
                        if (score >= 80) return '#ef4444';
                        if (score >= 60) return '#f59e0b';
                        return '#10b981';
                    }),
                    borderColor: scores.map(score => {
                        if (score >= 80) return '#dc2626';
                        if (score >= 60) return '#d97706';
                        return '#059669';
                    }),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Task Priority Scores'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Priority Score'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Tasks'
                        }
                    }
                }
            }
        });
    }

    displayEisenhowerMatrix(tasks) {
        // Clear all quadrants
        ['q1', 'q2', 'q3', 'q4'].forEach(quadrant => {
            const container = document.getElementById(`${quadrant}-tasks`);
            container.innerHTML = '';
        });

        // Group tasks by Eisenhower category
        tasks.forEach(task => {
            const quadrant = this.getEisenhowerQuadrant(task.eisenhower_category);
            const container = document.getElementById(`${quadrant}-tasks`);
            
            const taskElement = document.createElement('div');
            taskElement.className = 'quadrant-task';
            taskElement.style.borderLeftColor = this.getQuadrantColor(quadrant);
            taskElement.innerHTML = `
                <strong>${task.title}</strong>
                <div style="font-size: 0.8rem; opacity: 0.8;">
                    Score: ${task.priority_score} | Due: ${new Date(task.due_date).toLocaleDateString()}
                </div>
            `;
            
            container.appendChild(taskElement);
        });
    }

    getEisenhowerQuadrant(category) {
        const mapping = {
            'Do First (Urgent & Important)': 'q1',
            'Schedule (Not Urgent & Important)': 'q2',
            'Delegate (Urgent & Not Important)': 'q3',
            'Don\'t Do (Less Urgent & Less Important)': 'q4'
        };
        return mapping[category] || 'q4';
    }

    getQuadrantColor(quadrant) {
        const colors = {
            'q1': '#ef4444',
            'q2': '#f59e0b', 
            'q3': '#10b981',
            'q4': '#6366f1'
        };
        return colors[quadrant];
    }

    createDependencyGraph(tasks) {
        const graphContainer = document.getElementById('dependencyGraph');
        
        // Simple ASCII dependency graph for demonstration
        let graphHTML = '<div class="graph-visual">';
        
        tasks.forEach(task => {
            graphHTML += `<div style="margin: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                <strong>${task.title}</strong> (ID: ${task.id})<br/>
                <small>Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}</small>
            </div>`;
            
            if (task.dependencies.length > 0) {
                graphHTML += `<div style="text-align: center; margin: 5px;">↓ depends on</div>`;
            }
        });
        
        graphHTML += '</div>';
        graphContainer.innerHTML = graphHTML;
    }

    renderTaskList() {
        const taskList = document.getElementById('taskList');
        
        if (this.tasks.length === 0) {
            taskList.innerHTML = '<p class="empty-state">No tasks added yet. Add tasks using the form or bulk input.</p>';
            return;
        }

        taskList.innerHTML = this.tasks.map(task => `
            <div class="task-item">
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        <span>Due: ${new Date(task.due_date).toLocaleDateString()}</span>
                        <span>Effort: ${task.estimated_hours}h</span>
                        <span>Importance: ${task.importance}/10</span>
                        <span>Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="delete-task" onclick="app.deleteTask(${task.id})">×</button>
                </div>
            </div>
        `).join('');
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.renderTaskList();
        this.showNotification('Task deleted', 'success');
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all tasks?')) {
            this.tasks = [];
            this.renderTaskList();
            document.getElementById('resultsSection').style.display = 'none';
            document.getElementById('suggestionsSection').style.display = 'none';
            this.showNotification('All tasks cleared', 'success');
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'flex' : 'none';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#6366f1'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 1001;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Client-side scoring fallback
class ClientSideScorer {
    calculateScore(task, allTasks, strategy) {
        const urgencyScore = this.calculateUrgencyScore(task.due_date);
        const importanceScore = (task.importance / 10) * 100;
        const effortScore = this.calculateEffortScore(task.estimated_hours);
        const dependencyScore = 50; // Simplified

        const weights = this.getWeights(strategy);
        
        const totalScore = (
            weights.urgency * urgencyScore +
            weights.importance * importanceScore +
            weights.effort * effortScore +
            weights.dependency * dependencyScore
        );

        return {
            total_score: Math.round(totalScore * 100) / 100,
            breakdown: {
                urgency_score: Math.round(urgencyScore * 100) / 100,
                importance_score: Math.round(importanceScore * 100) / 100,
                effort_score: Math.round(effortScore * 100) / 100,
                dependency_score: dependencyScore
            }
        };
    }

    calculateUrgencyScore(dueDate) {
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 100;
        if (diffDays === 0) return 95;
        if (diffDays <= 1) return 85;
        if (diffDays <= 3) return 70;
        if (diffDays <= 7) return 50;
        if (diffDays <= 14) return 30;
        return 10;
    }

    calculateEffortScore(hours) {
        if (hours <= 1) return 100;
        if (hours <= 4) return 80;
        if (hours <= 8) return 60;
        if (hours <= 16) return 40;
        return 20;
    }

    getWeights(strategy) {
        const strategies = {
            'smart_balance': { urgency: 0.35, importance: 0.30, effort: 0.20, dependency: 0.15 },
            'fastest_wins': { urgency: 0.10, importance: 0.20, effort: 0.60, dependency: 0.10 },
            'high_impact': { urgency: 0.20, importance: 0.50, effort: 0.15, dependency: 0.15 },
            'deadline_driven': { urgency: 0.60, importance: 0.20, effort: 0.10, dependency: 0.10 }
        };
        return strategies[strategy] || strategies.smart_balance;
    }

    classifyEisenhower(task) {
        const urgencyScore = this.calculateUrgencyScore(task.due_date);
        const importanceScore = (task.importance / 10) * 100;

        if (urgencyScore >= 70 && importanceScore >= 70) return "Do First (Urgent & Important)";
        if (urgencyScore >= 70 && importanceScore < 70) return "Schedule (Urgent & Less Important)";
        if (urgencyScore < 70 && importanceScore >= 70) return "Delegate (Less Urgent & Important)";
        return "Don't Do (Less Urgent & Less Important)";
    }
}
// Initialize the application
const app = new SmartTaskAnalyzer();

// Handle bulk input
document.getElementById('bulkInput').addEventListener('blur', function(e) {
    const jsonInput = e.target.value.trim();
    if (jsonInput) {
        try {
            const tasks = JSON.parse(jsonInput);
            if (Array.isArray(tasks)) {
                // Add IDs if missing
                tasks.forEach((task, index) => {
                    if (!task.id) {
                        task.id = app.tasks.length > 0 ? Math.max(...app.tasks.map(t => t.id)) + index + 1 : index + 1;
                    }
                });
                app.tasks = tasks;
                app.renderTaskList();
                app.showNotification('Bulk tasks loaded successfully!', 'success');
            }
        } catch (error) {
            app.showNotification('Invalid JSON format', 'error');
        }
    }
});