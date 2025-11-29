from django.test import TestCase
from datetime import date, timedelta
from .scoring import TaskScorer

class TaskScoringTests(TestCase):
    def setUp(self):
        self.scorer = TaskScorer()
        self.sample_tasks = [
            {
                'id': 1,
                'title': 'Urgent Important Task',
                'due_date': date.today() + timedelta(days=1),
                'estimated_hours': 2,
                'importance': 9,
                'dependencies': []
            },
            {
                'id': 2,
                'title': 'Low Priority Task',
                'due_date': date.today() + timedelta(days=30),
                'estimated_hours': 8,
                'importance': 3,
                'dependencies': [1]
            }
        ]
    
    def test_urgency_score_calculation(self):
        # Test past due
        past_due = date.today() - timedelta(days=1)
        self.assertEqual(self.scorer.calculate_urgency_score(past_due), 100)
        
        # Test due today
        today = date.today()
        self.assertEqual(self.scorer.calculate_urgency_score(today), 95)
    
    def test_importance_score_calculation(self):
        self.assertEqual(self.scorer.calculate_importance_score(10), 100)
        self.assertEqual(self.scorer.calculate_importance_score(5), 50)
    
    def test_effort_score_calculation(self):
        self.assertEqual(self.scorer.calculate_effort_score(0.5), 100)
        self.assertEqual(self.scorer.calculate_effort_score(20), 20)
    
    def test_circular_dependency_detection(self):
        tasks_with_cycle = [
            {'id': 1, 'dependencies': [2]},
            {'id': 2, 'dependencies': [1]}
        ]
        cycles = self.scorer.detect_circular_dependencies(tasks_with_cycle)
        self.assertTrue(len(cycles) > 0)
    
    def test_no_circular_dependencies(self):
        tasks_no_cycle = [
            {'id': 1, 'dependencies': [2]},
            {'id': 2, 'dependencies': []}
        ]
        cycles = self.scorer.detect_circular_dependencies(tasks_no_cycle)
        self.assertEqual(len(cycles), 0)
    
    def test_eisenhower_classification(self):
        urgent_important_task = {
            'due_date': date.today() + timedelta(days=1),
            'importance': 9
        }
        classification = self.scorer.classify_eisenhower(urgent_important_task)
        self.assertEqual(classification, "Do First (Urgent & Important)")
    
    def test_different_strategies(self):
        task = self.sample_tasks[0]
        
        smart_balance_score = self.scorer.calculate_score(task, self.sample_tasks, 'smart_balance')
        fastest_wins_score = self.scorer.calculate_score(task, self.sample_tasks, 'fastest_wins')
        
        # Scores should be different for different strategies
        self.assertNotEqual(smart_balance_score['total_score'], fastest_wins_score['total_score'])