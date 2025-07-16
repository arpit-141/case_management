#!/usr/bin/env python3

import requests
import sys
import json
import io
from datetime import datetime
from pathlib import Path

class CasesAPITester:
    def __init__(self, base_url="https://f690a500-80a9-42ef-b7bb-3f7174cac1a4.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'users': [],
            'cases': [],
            'comments': [],
            'files': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_stats_endpoint(self):
        """Test statistics endpoint"""
        success, response = self.run_test(
            "Get Statistics",
            "GET", 
            "stats",
            200
        )
        if success:
            expected_keys = ['total_cases', 'open_cases', 'in_progress_cases', 'closed_cases', 'priority_stats']
            for key in expected_keys:
                if key not in response:
                    print(f"   Warning: Missing key '{key}' in stats response")
        return success

    def test_user_management(self):
        """Test user CRUD operations"""
        print("\n📋 Testing User Management...")
        
        # Create user
        user_data = {
            "username": f"testuser_{datetime.now().strftime('%H%M%S')}",
            "email": "test@example.com",
            "full_name": "Test User"
        }
        
        success, user = self.run_test(
            "Create User",
            "POST",
            "users",
            200,
            data=user_data
        )
        
        if success and 'id' in user:
            self.created_resources['users'].append(user['id'])
            user_id = user['id']
            
            # Get user by ID
            self.run_test(
                "Get User by ID",
                "GET",
                f"users/{user_id}",
                200
            )
            
            # Get all users
            self.run_test(
                "Get All Users",
                "GET",
                "users",
                200
            )
            
            return user
        
        return None

    def test_case_management(self, test_user):
        """Test case CRUD operations"""
        print("\n📋 Testing Case Management...")
        
        if not test_user:
            print("❌ Skipping case tests - no test user available")
            return None
            
        # Create case
        case_data = {
            "title": "Test Case - API Testing",
            "description": "This is a test case created during API testing",
            "priority": "high",
            "tags": ["test", "api"],
            "created_by": test_user['id'],
            "created_by_name": test_user['full_name']
        }
        
        success, case = self.run_test(
            "Create Case",
            "POST",
            "cases",
            200,
            data=case_data
        )
        
        if success and 'id' in case:
            self.created_resources['cases'].append(case['id'])
            case_id = case['id']
            
            # Get case by ID
            self.run_test(
                "Get Case by ID",
                "GET",
                f"cases/{case_id}",
                200
            )
            
            # Get all cases
            self.run_test(
                "Get All Cases",
                "GET",
                "cases",
                200
            )
            
            # Test filtering
            self.run_test(
                "Filter Cases by Status",
                "GET",
                "cases",
                200,
                params={"status": "open"}
            )
            
            self.run_test(
                "Filter Cases by Priority",
                "GET",
                "cases",
                200,
                params={"priority": "high"}
            )
            
            self.run_test(
                "Search Cases",
                "GET",
                "cases",
                200,
                params={"search": "test"}
            )
            
            # Update case
            update_data = {
                "status": "in_progress",
                "priority": "medium"
            }
            
            self.run_test(
                "Update Case",
                "PUT",
                f"cases/{case_id}",
                200,
                data=update_data
            )
            
            return case
        
        return None

    def test_comment_system(self, test_case, test_user):
        """Test comment CRUD operations"""
        print("\n💬 Testing Comment System...")
        
        if not test_case or not test_user:
            print("❌ Skipping comment tests - no test case or user available")
            return
            
        case_id = test_case['id']
        
        # Create comment
        comment_data = {
            "content": "This is a test comment",
            "author": test_user['id'],
            "author_name": test_user['full_name']
        }
        
        success, comment = self.run_test(
            "Create Comment",
            "POST",
            f"cases/{case_id}/comments",
            200,
            data=comment_data
        )
        
        if success and 'id' in comment:
            self.created_resources['comments'].append(comment['id'])
            comment_id = comment['id']
            
            # Get case comments
            self.run_test(
                "Get Case Comments",
                "GET",
                f"cases/{case_id}/comments",
                200
            )
            
            # Update comment
            self.run_test(
                "Update Comment",
                "PUT",
                f"comments/{comment_id}",
                200,
                params={"content": "Updated test comment"}
            )

    def test_file_management(self, test_case):
        """Test file upload/download operations"""
        print("\n📁 Testing File Management...")
        
        if not test_case:
            print("❌ Skipping file tests - no test case available")
            return
            
        case_id = test_case['id']
        
        # Create a test file
        test_content = "This is a test file for API testing"
        test_file = io.BytesIO(test_content.encode())
        
        # Upload file
        files = {'file': ('test.txt', test_file, 'text/plain')}
        data = {'uploaded_by': 'test_user'}
        
        success, file_info = self.run_test(
            "Upload File",
            "POST",
            f"cases/{case_id}/files",
            200,
            files=files,
            data=data
        )
        
        if success and 'id' in file_info:
            self.created_resources['files'].append(file_info['id'])
            file_id = file_info['id']
            
            # Get case files
            self.run_test(
                "Get Case Files",
                "GET",
                f"cases/{case_id}/files",
                200
            )
            
            # Download file
            success, _ = self.run_test(
                "Download File",
                "GET",
                f"files/{file_id}/download",
                200
            )

    def test_existing_case(self):
        """Test operations on existing case"""
        print("\n🔍 Testing Existing Case...")
        
        existing_case_id = "a40de4b2-5acf-4e7b-889c-53b293475052"
        
        # Get existing case
        success, case = self.run_test(
            "Get Existing Case",
            "GET",
            f"cases/{existing_case_id}",
            200
        )
        
        if success:
            # Get comments for existing case
            self.run_test(
                "Get Existing Case Comments",
                "GET",
                f"cases/{existing_case_id}/comments",
                200
            )
            
            # Get files for existing case
            self.run_test(
                "Get Existing Case Files",
                "GET",
                f"cases/{existing_case_id}/files",
                200
            )

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Delete files
        for file_id in self.created_resources['files']:
            self.run_test(
                f"Delete File {file_id[:8]}",
                "DELETE",
                f"files/{file_id}",
                200
            )
        
        # Delete comments
        for comment_id in self.created_resources['comments']:
            self.run_test(
                f"Delete Comment {comment_id[:8]}",
                "DELETE",
                f"comments/{comment_id}",
                200
            )
        
        # Delete cases
        for case_id in self.created_resources['cases']:
            self.run_test(
                f"Delete Case {case_id[:8]}",
                "DELETE",
                f"cases/{case_id}",
                200
            )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Cases Management API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Basic health and stats
        self.test_health_check()
        self.test_stats_endpoint()
        
        # Test existing case
        self.test_existing_case()
        
        # User management
        test_user = self.test_user_management()
        
        # Case management
        test_case = self.test_case_management(test_user)
        
        # Comment system
        self.test_comment_system(test_case, test_user)
        
        # File management
        self.test_file_management(test_case)
        
        # Cleanup
        self.cleanup_resources()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = CasesAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())