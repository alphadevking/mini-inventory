#!/usr/bin/env python3
"""Debug script to test API endpoints and see detailed error messages"""

import requests
import json

def test_endpoints():
    base_url = "http://localhost:9000"

    print("=== Testing API Endpoints ===\n")

    # Test 1: Basic products endpoint
    try:
        response = requests.get(f"{base_url}/products/", timeout=5)
        print(f"1. GET /products/ - Status: {response.status_code}")
        if response.status_code != 200:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"1. GET /products/ - Error: {e}")

    # Test 2: Low stock endpoint
    try:
        response = requests.get(f"{base_url}/products/low-stock", timeout=5)
        print(f"2. GET /products/low-stock - Status: {response.status_code}")
        if response.status_code != 200:
            print(f"   Error: {response.text}")
        else:
            data = response.json()
            print(f"   Response: {data}")
    except Exception as e:
        print(f"2. GET /products/low-stock - Error: {e}")

    # Test 3: Search endpoint
    try:
        response = requests.get(f"{base_url}/products/search?q=test", timeout=5)
        print(f"3. GET /products/search - Status: {response.status_code}")
        if response.status_code != 200:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"3. GET /products/search - Error: {e}")

if __name__ == "__main__":
    test_endpoints()
