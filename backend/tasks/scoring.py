from datetime import date, timedelta

class TaskScorer:
    def __init__(self, strategy='smart_balance'):
        self.strategy = strategy
        self.config = {
            'smart_balance': {
                'urgency_weight': 0.35,
                'importance_weight': 0.30,
                'effort_weight': 0.20,
                'dependency_weight': 0.15
            },
            'fastest_wins': {
                'urgency_weight': 0.10,
                'importance_weight': 0.20,
                'effort_weight': 0.60,
                'dependency_weight': 0.10
            },
            'high_impact': {
                'urgency_weight': 0.20,
                'importance_weight': 0.50,
                'effort_weight': 0.15,
                'dependency_weight': 0.15
            },
            'deadline_driven': {
                'urgency_weight': 0.60,
                'importance_weight': 0.20,
                'effort_weight': 0.10,
                'dependency_weight': 0.10
            }
        }
    
    def calculate_urgency_score(self, due_date):
        """Calculate urgency score based on due date"""
        today = date.today()
        days_until_due = (due_date - today).days
        
        if days_until_due < 0:
            # Past due - highest urgency
            return 100
        elif days_until_due == 0:
            # Due today
            return 95
        elif days_until_due <= 1:
            # Due tomorrow
            return 85
        elif days_until_due <= 3:
            # Due in 3 days
            return 70
        elif days_until_due <= 7:
            # Due in a week
            return 50
        elif days_until_due <= 14:
            # Due in two weeks
            return 30
        else:
            # More than two weeks - decreasing urgency
            return max(10, 100 - (days_until_due * 2))
    
    def calculate_importance_score(self, importance):
        """Calculate normalized importance score"""
        return (importance / 10) * 100
    
    def calculate_effort_score(self, estimated_hours):
        """Calculate effort score - lower effort gets higher score"""
        if estimated_hours <= 1:
            return 100  # Quick win
        elif estimated_hours <= 4:
            return 80   # Small task
        elif estimated_hours <= 8:
            return 60   # Medium task
        elif estimated_hours <= 16:
            return 40   # Large task
        else:
            return 20   # Very large task
    
    def calculate_dependency_score(self, dependencies, all_tasks):
        """Calculate dependency score - tasks blocking others get higher priority"""
        if not dependencies:
            return 50  # Neutral score for no dependencies
        
        # Check if this task is a dependency for other tasks
        blocking_count = 0
        task_ids = [task.get('id') for task in all_tasks if task.get('id')]
        
        for task in all_tasks:
            if task.get('id') in task_ids and any(dep in dependencies for dep in task.get('dependencies', [])):
                blocking_count += 1
        
        # Normalize based on total tasks
        total_tasks = len(all_tasks)
        if total_tasks > 0:
            return min(100, 50 + (blocking_count / total_tasks) * 50)
        return 50
    
    def detect_circular_dependencies(self, tasks):
        """Detect circular dependencies using DFS"""
        graph = {}
        task_ids = [task.get('id') for task in tasks if task.get('id')]
        
        for task in tasks:
            task_id = task.get('id')
            if task_id:
                graph[task_id] = [dep for dep in task.get('dependencies', []) if dep in task_ids]
        
        def has_cycle(node, visited, recursion_stack):
            visited.add(node)
            recursion_stack.add(node)
            
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor, visited, recursion_stack):
                        return True
                elif neighbor in recursion_stack:
                    return True
            
            recursion_stack.remove(node)
            return False
        
        visited = set()
        recursion_stack = set()
        cycles = []
        
        for node in graph:
            if node not in visited:
                if has_cycle(node, visited, recursion_stack):
                    cycles.append(f"Circular dependency detected involving task {node}")
        
        return cycles
    
    def is_weekend_or_holiday(self, check_date):
        """Check if date is weekend or holiday (simplified)"""
        # Weekend check
        if check_date.weekday() >= 5:  # Saturday (5) or Sunday (6)
            return True
        
        # Simple holiday check (US holidays - can be expanded)
        holidays = [
            date(check_date.year, 1, 1),   # New Year
            date(check_date.year, 12, 25), # Christmas
        ]
        
        return check_date in holidays
    
    def calculate_business_days(self, start_date, end_date):
        """Calculate business days between two dates"""
        business_days = 0
        current_date = start_date
        
        while current_date <= end_date:
            if not self.is_weekend_or_holiday(current_date):
                business_days += 1
            current_date += timedelta(days=1)
        
        return business_days
    
    def calculate_score(self, task, all_tasks, strategy=None):
        """Calculate overall priority score for a task"""
        if strategy is None:
            strategy = self.strategy
        
        weights = self.config.get(strategy, self.config['smart_balance'])
        
        urgency_score = self.calculate_urgency_score(task['due_date'])
        importance_score = self.calculate_importance_score(task['importance'])
        effort_score = self.calculate_effort_score(task['estimated_hours'])
        dependency_score = self.calculate_dependency_score(task.get('dependencies', []), all_tasks)
        
        total_score = (
            weights['urgency_weight'] * urgency_score +
            weights['importance_weight'] * importance_score +
            weights['effort_weight'] * effort_score +
            weights['dependency_weight'] * dependency_score
        )
        
        return {
            'total_score': round(total_score, 2),
            'breakdown': {
                'urgency_score': round(urgency_score, 2),
                'importance_score': round(importance_score, 2),
                'effort_score': round(effort_score, 2),
                'dependency_score': round(dependency_score, 2)
            }
        }
    
    def classify_eisenhower(self, task):
        """Classify task into Eisenhower Matrix quadrant"""
        urgency_score = self.calculate_urgency_score(task['due_date'])
        importance_score = self.calculate_importance_score(task['importance'])
        
        if urgency_score >= 70 and importance_score >= 70:
            return "Do First (Urgent & Important)"
        elif urgency_score >= 70 and importance_score < 70:
            return "Schedule (Urgent & Less Important)"
        elif urgency_score < 70 and importance_score >= 70:
            return "Delegate (Less Urgent & Important)"
        else:
            return "Don't Do (Less Urgent & Less Important)"