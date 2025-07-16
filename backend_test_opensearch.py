#!/usr/bin/env python3

import requests
import sys
import json
import io
from datetime import datetime
from pathlib import Path

class OpenSearchCasesAPITester:
    def __init__(self, base_url="https://f690a500-80a9-42ef-b7bb-3f7174cac1a4.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'users': [],
            'cases': [],
            'comments': [],
            'files': [],
            'alerts': []
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

    def test_opensearch_health_check(self):
        """Test health endpoint to verify OpenSearch connectivity"""
        print("\n🏥 Testing OpenSearch Health Check...")
        success, response = self.run_test(
            "OpenSearch Health Check",
            "GET",
            "health",
            200
        )
        
        if success:
            # Verify OpenSearch-specific fields
            if 'database' in response and response['database'] == 'opensearch':
                print("✅ OpenSearch database confirmed")
            else:
                print("❌ Expected OpenSearch database, got:", response.get('database', 'unknown'))
                
            if 'opensearch_cluster' in response:
                print(f"✅ OpenSearch cluster: {response['opensearch_cluster']}")
            else:
                print("❌ Missing OpenSearch cluster information")
                
            if 'opensearch_version' in response:
                print(f"✅ OpenSearch version: {response['opensearch_version']}")
            else:
                print("❌ Missing OpenSearch version information")
        
        return success

    def test_opensearch_index_initialization(self):
        """Test OpenSearch index initialization by creating and retrieving data"""
        print("\n📊 Testing OpenSearch Index Initialization...")
        
        # Test by creating a user (which should initialize the users index)
        user_data = {
            "username": f"opensearch_test_{datetime.now().strftime('%H%M%S')}",
            "email": "opensearch@test.com",
            "full_name": "OpenSearch Test User"
        }
        
        success, user = self.run_test(
            "Create User (Index Initialization Test)",
            "POST",
            "users",
            200,
            data=user_data
        )
        
        if success and 'id' in user:
            self.created_resources['users'].append(user['id'])
            
            # Immediately try to retrieve the user to test index functionality
            success2, _ = self.run_test(
                "Retrieve User (Index Verification)",
                "GET",
                f"users/{user['id']}",
                200
            )
            
            return success and success2
        
        return False

    def test_opensearch_advanced_search(self):
        """Test advanced search and filtering with OpenSearch"""
        print("\n🔍 Testing OpenSearch Advanced Search...")
        
        # Create test user first
        user_data = {
            "username": f"search_user_{datetime.now().strftime('%H%M%S')}",
            "email": "search@test.com",
            "full_name": "Search Test User"
        }
        
        success, user = self.run_test(
            "Create Search Test User",
            "POST",
            "users",
            200,
            data=user_data
        )
        
        if not success or 'id' not in user:
            print("❌ Failed to create test user for search tests")
            return False
            
        self.created_resources['users'].append(user['id'])
        
        # Create multiple test cases with different attributes
        test_cases = [
            {
                "title": "Critical Security Incident",
                "description": "Unauthorized access detected in production environment",
                "priority": "critical",
                "tags": ["security", "production", "urgent"],
                "created_by": user['id'],
                "created_by_name": user['full_name']
            },
            {
                "title": "Network Performance Issue",
                "description": "Slow response times reported by users",
                "priority": "high",
                "tags": ["network", "performance"],
                "created_by": user['id'],
                "created_by_name": user['full_name']
            },
            {
                "title": "Database Backup Failure",
                "description": "Automated backup process failed last night",
                "priority": "medium",
                "tags": ["database", "backup"],
                "created_by": user['id'],
                "created_by_name": user['full_name']
            }
        ]
        
        created_cases = []
        for i, case_data in enumerate(test_cases):
            success, case = self.run_test(
                f"Create Test Case {i+1}",
                "POST",
                "cases",
                200,
                data=case_data
            )
            
            if success and 'id' in case:
                self.created_resources['cases'].append(case['id'])
                created_cases.append(case)
        
        if len(created_cases) < 3:
            print("❌ Failed to create enough test cases for search testing")
            return False
        
        # Test various search scenarios
        search_tests = [
            # Text search
            {"search": "security", "expected_min": 1, "description": "Text search for 'security'"},
            {"search": "production", "expected_min": 1, "description": "Text search for 'production'"},
            {"search": "database", "expected_min": 1, "description": "Text search for 'database'"},
            
            # Priority filtering
            {"priority": "critical", "expected_min": 1, "description": "Filter by critical priority"},
            {"priority": "high", "expected_min": 1, "description": "Filter by high priority"},
            {"priority": "medium", "expected_min": 1, "description": "Filter by medium priority"},
            
            # Status filtering (all should be open by default)
            {"status": "open", "expected_min": 3, "description": "Filter by open status"},
            
            # Created by filtering
            {"created_by": user['id'], "expected_min": 3, "description": "Filter by creator"},
            
            # Combined filters
            {"priority": "critical", "search": "security", "expected_min": 1, "description": "Combined priority and text search"},
        ]
        
        all_passed = True
        for test in search_tests:
            params = {k: v for k, v in test.items() if k not in ['expected_min', 'description']}
            
            success, response = self.run_test(
                f"Advanced Search: {test['description']}",
                "GET",
                "cases",
                200,
                params=params
            )
            
            if success:
                if isinstance(response, list) and len(response) >= test['expected_min']:
                    print(f"✅ Found {len(response)} results (expected >= {test['expected_min']})")
                else:
                    print(f"❌ Found {len(response) if isinstance(response, list) else 0} results (expected >= {test['expected_min']})")
                    all_passed = False
            else:
                all_passed = False
        
        return all_passed

    def test_alert_management(self):
        """Test alert management endpoints"""
        print("\n🚨 Testing Alert Management...")
        
        # Create test alert
        alert_data = {
            "title": "High CPU Usage Alert",
            "description": "CPU usage exceeded 90% threshold",
            "severity": "high",
            "monitor_id": "cpu_monitor_001",
            "trigger_id": "cpu_trigger_001",
            "opensearch_query": {
                "query": {
                    "range": {
                        "cpu_usage": {"gte": 90}
                    }
                }
            },
            "visualization_id": "cpu_viz_001"
        }
        
        success, alert = self.run_test(
            "Create Alert",
            "POST",
            "alerts",
            200,
            data=alert_data
        )
        
        if not success or 'id' not in alert:
            return False
            
        self.created_resources['alerts'].append(alert['id'])
        alert_id = alert['id']
        
        # Get alert by ID
        success1, _ = self.run_test(
            "Get Alert by ID",
            "GET",
            f"alerts/{alert_id}",
            200
        )
        
        # Get all alerts
        success2, _ = self.run_test(
            "Get All Alerts",
            "GET",
            "alerts",
            200
        )
        
        # Filter alerts by severity
        success3, _ = self.run_test(
            "Filter Alerts by Severity",
            "GET",
            "alerts",
            200,
            params={"severity": "high"}
        )
        
        # Filter alerts by status
        success4, _ = self.run_test(
            "Filter Alerts by Status",
            "GET",
            "alerts",
            200,
            params={"status": "active"}
        )
        
        # Acknowledge alert
        success5, _ = self.run_test(
            "Acknowledge Alert",
            "PUT",
            f"alerts/{alert_id}/acknowledge",
            200
        )
        
        # Complete alert
        success6, _ = self.run_test(
            "Complete Alert",
            "PUT",
            f"alerts/{alert_id}/complete",
            200
        )
        
        return all([success, success1, success2, success3, success4, success5, success6])

    def test_alert_to_case_creation(self):
        """Test alert-to-case creation functionality"""
        print("\n🔄 Testing Alert-to-Case Creation...")
        
        # Create test user first
        user_data = {
            "username": f"alert_user_{datetime.now().strftime('%H%M%S')}",
            "email": "alert@test.com",
            "full_name": "Alert Test User"
        }
        
        success, user = self.run_test(
            "Create Alert Test User",
            "POST",
            "users",
            200,
            data=user_data
        )
        
        if not success or 'id' not in user:
            return False
            
        self.created_resources['users'].append(user['id'])
        
        # Create test alert
        alert_data = {
            "title": "Critical System Alert",
            "description": "System failure detected requiring immediate attention",
            "severity": "critical",
            "monitor_id": "system_monitor_001",
            "trigger_id": "system_trigger_001",
            "opensearch_query": {
                "query": {
                    "term": {"status": "error"}
                }
            },
            "visualization_id": "system_viz_001"
        }
        
        success, alert = self.run_test(
            "Create Alert for Case Creation",
            "POST",
            "alerts",
            200,
            data=alert_data
        )
        
        if not success or 'id' not in alert:
            return False
            
        self.created_resources['alerts'].append(alert['id'])
        alert_id = alert['id']
        
        # Create case from alert
        case_data = {
            "title": "Case for Critical System Alert",
            "description": "Investigating system failure from alert",
            "created_by": user['id'],
            "created_by_name": user['full_name'],
            "tags": ["alert-generated", "critical"]
        }
        
        success, case = self.run_test(
            "Create Case from Alert",
            "POST",
            f"alerts/{alert_id}/create-case",
            200,
            data=case_data
        )
        
        if success and 'id' in case:
            self.created_resources['cases'].append(case['id'])
            
            # Verify case has alert information
            if case.get('alert_id') == alert_id:
                print("✅ Case correctly linked to alert")
            else:
                print("❌ Case not properly linked to alert")
                return False
                
            if case.get('priority') == 'high':  # Should be high for critical alert
                print("✅ Case priority correctly set based on alert severity")
            else:
                print("❌ Case priority not correctly set from alert severity")
                
            # Verify alert is updated with case ID
            success2, updated_alert = self.run_test(
                "Verify Alert Updated with Case ID",
                "GET",
                f"alerts/{alert_id}",
                200
            )
            
            if success2 and updated_alert.get('case_id') == case['id']:
                print("✅ Alert correctly updated with case ID")
                return True
            else:
                print("❌ Alert not updated with case ID")
                return False
        
        return False

    def test_opensearch_statistics(self):
        """Test statistics endpoint with OpenSearch aggregations"""
        print("\n📈 Testing OpenSearch Statistics...")
        
        success, response = self.run_test(
            "Get OpenSearch Statistics",
            "GET",
            "stats",
            200
        )
        
        if success:
            # Check for expected statistics fields
            expected_fields = [
                'total_cases', 'open_cases', 'in_progress_cases', 'closed_cases',
                'priority_stats', 'total_alerts', 'alert_severity_stats', 'alert_status_stats'
            ]
            
            all_fields_present = True
            for field in expected_fields:
                if field in response:
                    print(f"✅ {field}: {response[field]}")
                else:
                    print(f"❌ Missing field: {field}")
                    all_fields_present = False
            
            # Verify that priority_stats is a proper breakdown
            if 'priority_stats' in response and isinstance(response['priority_stats'], dict):
                print("✅ Priority stats is properly structured as aggregation")
            else:
                print("❌ Priority stats not properly structured")
                all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_comment_system_opensearch(self):
        """Test comment system with OpenSearch backend"""
        print("\n💬 Testing Comment System with OpenSearch...")
        
        # Create test user and case first
        user_data = {
            "username": f"comment_user_{datetime.now().strftime('%H%M%S')}",
            "email": "comment@test.com",
            "full_name": "Comment Test User"
        }
        
        success, user = self.run_test(
            "Create Comment Test User",
            "POST",
            "users",
            200,
            data=user_data
        )
        
        if not success or 'id' not in user:
            return False
            
        self.created_resources['users'].append(user['id'])
        
        # Create test case
        case_data = {
            "title": "Comment Test Case",
            "description": "Case for testing comment functionality",
            "priority": "medium",
            "tags": ["test", "comments"],
            "created_by": user['id'],
            "created_by_name": user['full_name']
        }
        
        success, case = self.run_test(
            "Create Comment Test Case",
            "POST",
            "cases",
            200,
            data=case_data
        )
        
        if not success or 'id' not in case:
            return False
            
        self.created_resources['cases'].append(case['id'])
        case_id = case['id']
        
        # Test comment CRUD operations
        comment_data = {
            "content": "This is a test comment for OpenSearch backend",
            "author": user['id'],
            "author_name": user['full_name']
        }
        
        success1, comment = self.run_test(
            "Create Comment",
            "POST",
            f"cases/{case_id}/comments",
            200,
            data=comment_data
        )
        
        if not success1 or 'id' not in comment:
            return False
            
        self.created_resources['comments'].append(comment['id'])
        comment_id = comment['id']
        
        # Get case comments
        success2, comments = self.run_test(
            "Get Case Comments",
            "GET",
            f"cases/{case_id}/comments",
            200
        )
        
        # Update comment
        update_data = {"content": "Updated comment content for OpenSearch test"}
        success3, _ = self.run_test(
            "Update Comment",
            "PUT",
            f"comments/{comment_id}",
            200,
            data=update_data
        )
        
        # Verify case counts are updated
        success4, updated_case = self.run_test(
            "Verify Case Comment Count",
            "GET",
            f"cases/{case_id}",
            200
        )
        
        if success4 and updated_case.get('comments_count', 0) > 0:
            print("✅ Case comment count properly updated")
        else:
            print("❌ Case comment count not updated")
        
        return all([success1, success2, success3, success4])

    def test_file_attachment_system_opensearch(self):
        """Test file attachment system with OpenSearch backend"""
        print("\n📁 Testing File Attachment System with OpenSearch...")
        
        # Create test user and case first
        user_data = {
            "username": f"file_user_{datetime.now().strftime('%H%M%S')}",
            "email": "file@test.com",
            "full_name": "File Test User"
        }
        
        success, user = self.run_test(
            "Create File Test User",
            "POST",
            "users",
            200,
            data=user_data
        )
        
        if not success or 'id' not in user:
            return False
            
        self.created_resources['users'].append(user['id'])
        
        # Create test case
        case_data = {
            "title": "File Test Case",
            "description": "Case for testing file attachment functionality",
            "priority": "medium",
            "tags": ["test", "files"],
            "created_by": user['id'],
            "created_by_name": user['full_name']
        }
        
        success, case = self.run_test(
            "Create File Test Case",
            "POST",
            "cases",
            200,
            data=case_data
        )
        
        if not success or 'id' not in case:
            return False
            
        self.created_resources['cases'].append(case['id'])
        case_id = case['id']
        
        # Test file operations
        test_content = "This is a test file for OpenSearch backend testing"
        test_file = io.BytesIO(test_content.encode())
        
        # Upload file
        files = {'file': ('opensearch_test.txt', test_file, 'text/plain')}
        data = {'uploaded_by': user['id']}
        
        success1, file_info = self.run_test(
            "Upload File",
            "POST",
            f"cases/{case_id}/files",
            200,
            files=files,
            data=data
        )
        
        if not success1 or 'id' not in file_info:
            return False
            
        self.created_resources['files'].append(file_info['id'])
        file_id = file_info['id']
        
        # Get case files
        success2, files_list = self.run_test(
            "Get Case Files",
            "GET",
            f"cases/{case_id}/files",
            200
        )
        
        # Download file
        success3, _ = self.run_test(
            "Download File",
            "GET",
            f"files/{file_id}/download",
            200
        )
        
        # Verify case attachment count is updated
        success4, updated_case = self.run_test(
            "Verify Case Attachment Count",
            "GET",
            f"cases/{case_id}",
            200
        )
        
        if success4 and updated_case.get('attachments_count', 0) > 0:
            print("✅ Case attachment count properly updated")
        else:
            print("❌ Case attachment count not updated")
        
        return all([success1, success2, success3, success4])

    def test_opensearch_error_handling(self):
        """Test proper error handling with OpenSearch operations"""
        print("\n⚠️ Testing OpenSearch Error Handling...")
        
        # Test 404 errors
        success1, _ = self.run_test(
            "Get Non-existent Case",
            "GET",
            "cases/non-existent-id",
            404
        )
        
        success2, _ = self.run_test(
            "Get Non-existent User",
            "GET",
            "users/non-existent-id",
            404
        )
        
        success3, _ = self.run_test(
            "Get Non-existent Alert",
            "GET",
            "alerts/non-existent-id",
            404
        )
        
        success4, _ = self.run_test(
            "Update Non-existent Comment",
            "PUT",
            "comments/non-existent-id",
            404,
            data={"content": "test"}
        )
        
        success5, _ = self.run_test(
            "Delete Non-existent File",
            "DELETE",
            "files/non-existent-id",
            404
        )
        
        # Test validation errors
        success6, _ = self.run_test(
            "Create User with Duplicate Username",
            "POST",
            "users",
            400,
            data={
                "username": "admin",  # Likely to exist
                "email": "test@test.com",
                "full_name": "Test User"
            }
        )
        
        return all([success1, success2, success3, success4, success5])

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
        
        # Note: We don't delete alerts and users as they might be referenced

    def run_all_tests(self):
        """Run all OpenSearch API tests"""
        print("🚀 Starting OpenSearch Cases Management API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 70)
        
        test_results = {}
        
        # 1. Test health endpoint to verify OpenSearch connectivity
        test_results['health'] = self.test_opensearch_health_check()
        
        # 2. Test OpenSearch index initialization
        test_results['index_init'] = self.test_opensearch_index_initialization()
        
        # 3. Test advanced search and filtering with OpenSearch
        test_results['advanced_search'] = self.test_opensearch_advanced_search()
        
        # 4. Test alert management endpoints
        test_results['alert_management'] = self.test_alert_management()
        
        # 5. Test alert-to-case creation functionality
        test_results['alert_to_case'] = self.test_alert_to_case_creation()
        
        # 6. Test statistics endpoint with OpenSearch aggregations
        test_results['statistics'] = self.test_opensearch_statistics()
        
        # 7. Test comment system endpoints
        test_results['comments'] = self.test_comment_system_opensearch()
        
        # 8. Test file attachment system endpoints
        test_results['files'] = self.test_file_attachment_system_opensearch()
        
        # 9. Test error handling with OpenSearch operations
        test_results['error_handling'] = self.test_opensearch_error_handling()
        
        # Cleanup
        self.cleanup_resources()
        
        # Print detailed results
        print("\n" + "=" * 70)
        print("📊 OpenSearch Test Results Summary:")
        print("=" * 70)
        
        for test_name, result in test_results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_name.replace('_', ' ').title():<30} {status}")
        
        print(f"\nOverall: {self.tests_passed}/{self.tests_run} individual tests passed")
        
        passed_categories = sum(1 for result in test_results.values() if result)
        total_categories = len(test_results)
        
        if passed_categories == total_categories:
            print("🎉 All OpenSearch test categories passed!")
            return 0
        else:
            print(f"❌ {total_categories - passed_categories}/{total_categories} test categories failed")
            return 1

def main():
    tester = OpenSearchCasesAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())