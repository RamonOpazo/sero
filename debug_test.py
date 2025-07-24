#!/usr/bin/env python3
"""Debug script to test API responses"""

import sys
sys.path.insert(0, 'src')

from fastapi.testclient import TestClient
from backend.app import app

def test_api():
    """Test basic API functionality"""
    client = TestClient(app)
    
    project_data = {
        "name": "Test Project",
        "description": "A test project",
        "version": 1,
        "contact_name": "Test User",
        "contact_email": "test@example.com",
        "password": "TestPassword123!"
    }
    
    print("Testing GET /api/projects (correct path - no trailing slash)")
    try:
        response = client.get("/api/projects")
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Content: {response.content}")
        print(f"Text: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    print()
    
    print("Testing POST /api/projects (correct path - no trailing slash)")
    try:
        response = client.post("/api/projects", json=project_data)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Content: {response.content}")
        print(f"Text: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    print()
    
    print("Testing GET /api/projects/ (wrong path - with trailing slash)")
    response = client.get("/api/projects/")
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Content: {response.content}")
    print(f"Text: {response.text}")
    print()
    
    print("Testing POST /api/projects/ (wrong path - with trailing slash)")
    response = client.post("/api/projects/", json=project_data)
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Content: {response.content}")
    print(f"Text: {response.text}")

if __name__ == "__main__":
    test_api()
