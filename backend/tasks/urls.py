from django.urls import path
from . import views

urlpatterns = [
    path('tasks/analyze/', views.analyze_tasks, name='analyze-tasks'),
    path('tasks/suggest/', views.suggest_tasks, name='suggest-tasks'),
    path('eisenhower-matrix/', views.get_eisenhower_matrix, name='eisenhower-matrix'),
]