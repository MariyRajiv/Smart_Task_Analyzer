from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from datetime import date
from .scoring import TaskScorer


def add_cors_headers(response):
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@api_view(['POST', 'OPTIONS'])
def analyze_tasks(request):
    if request.method == 'OPTIONS':
        response = Response()
        return add_cors_headers(response)
    
    try:
        tasks = request.data.get('tasks', [])
        strategy = request.data.get('strategy', 'smart_balance')
        
        if not tasks:
            response = Response({'error': 'No tasks provided'}, status=status.HTTP_400_BAD_REQUEST)
            return add_cors_headers(response)
        
        scorer = TaskScorer(strategy)
        
        # Detect circular dependencies
        circular_deps = scorer.detect_circular_dependencies(tasks)
        
        # Calculate scores for all tasks
        analyzed_tasks = []
        for task in tasks:
            # Ensure due_date is a date object
            if isinstance(task['due_date'], str):
                task['due_date'] = date.fromisoformat(task['due_date'])
            
            score_data = scorer.calculate_score(task, tasks, strategy)
            eisenhower_category = scorer.classify_eisenhower(task)
            
            analyzed_task = {
                **task,
                'priority_score': score_data['total_score'],
                'score_breakdown': score_data['breakdown'],
                'eisenhower_category': eisenhower_category,
                'has_circular_dependency': any(str(task.get('id')) in str(circ) for circ in circular_deps)
            }
            analyzed_tasks.append(analyzed_task)
        
        # Sort by priority score (descending)
        analyzed_tasks.sort(key=lambda x: x['priority_score'], reverse=True)
        
        response_data = {
            'analyzed_tasks': analyzed_tasks,
            'strategy_used': strategy,
            'circular_dependencies': circular_deps,
            'total_tasks': len(tasks)
        }
        
        response = Response(response_data)
        return add_cors_headers(response)
    
    except Exception as e:
        response = Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return add_cors_headers(response)

@api_view(['POST', 'OPTIONS'])
def suggest_tasks(request):
    if request.method == 'OPTIONS':
        response = Response()
        return add_cors_headers(response)
    
    try:
        tasks = request.data.get('tasks', [])
        strategy = request.data.get('strategy', 'smart_balance')
        
        if not tasks:
            response = Response({'error': 'No tasks provided'}, status=status.HTTP_400_BAD_REQUEST)
            return add_cors_headers(response)
        
        scorer = TaskScorer(strategy)
        
        # Calculate scores and get top 3
        scored_tasks = []
        for task in tasks:
            # Ensure due_date is a date object
            if isinstance(task['due_date'], str):
                task['due_date'] = date.fromisoformat(task['due_date'])
            
            score_data = scorer.calculate_score(task, tasks, strategy)
            eisenhower_category = scorer.classify_eisenhower(task)
            
            scored_task = {
                **task,
                'priority_score': score_data['total_score'],
                'score_breakdown': score_data['breakdown'],
                'eisenhower_category': eisenhower_category
            }
            scored_tasks.append(scored_task)
        
        # Sort and get top 3
        scored_tasks.sort(key=lambda x: x['priority_score'], reverse=True)
        top_tasks = scored_tasks[:3]
        
        # Generate explanations
        suggestions = []
        for i, task in enumerate(top_tasks):
            explanation = generate_suggestion_explanation(task, i+1, strategy)
            suggestions.append({
                **task,
                'explanation': explanation
            })
        
        response = Response({
            'suggested_tasks': suggestions,
            'strategy_used': strategy
        })
        return add_cors_headers(response)
    
    except Exception as e:
        response = Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return add_cors_headers(response)

@api_view(['GET', 'OPTIONS'])
def get_eisenhower_matrix(request):
    if request.method == 'OPTIONS':
        response = Response()
        return add_cors_headers(response)
        
    response = Response({
        'quadrants': {
            'q1': {
                'name': 'Do First',
                'description': 'Urgent & Important',
                'color': '#ff4444'
            },
            'q2': {
                'name': 'Schedule',
                'description': 'Not Urgent & Important', 
                'color': '#ffaa00'
            },
            'q3': {
                'name': 'Delegate',
                'description': 'Urgent & Not Important',
                'color': '#00aa00'
            },
            'q4': {
                'name': 'Don\'t Do',
                'description': 'Not Urgent & Not Important',
                'color': '#4444ff'
            }
        }
    })
    return add_cors_headers(response)

def generate_suggestion_explanation(task, rank, strategy):
    base_explanations = {
        1: "This is your top priority because",
        2: "This should be your second focus as",
        3: "Consider working on this task because"
    }
    
    strategy_explanations = {
        'smart_balance': "it balances urgency, importance, effort, and dependencies effectively.",
        'fastest_wins': "it's a quick win that can be completed efficiently.",
        'high_impact': "it has high importance and will make a significant impact.",
        'deadline_driven': "it has an approaching deadline that requires immediate attention."
    }
    
    explanation = f"{base_explanations.get(rank, 'This task is important because')} "
    explanation += strategy_explanations.get(strategy, "it requires your attention.")
    
    # Add specific reasons
    reasons = []
    if task['score_breakdown']['urgency_score'] > 80:
        reasons.append("it's very urgent")
    if task['score_breakdown']['importance_score'] > 80:
        reasons.append("it's highly important")
    if task['score_breakdown']['effort_score'] > 80:
        reasons.append("it requires low effort")
    
    if reasons:
        explanation += f" Specifically: {', '.join(reasons)}."
    
    return explanation