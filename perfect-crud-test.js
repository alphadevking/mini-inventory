#!/usr/bin/env node

/**
 * Perfect 100% CRUD API Test Script for Mini Inventory System
 * Addresses all identified issues to achieve 100% success rate
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:9000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  tests: [],
  createdIds: {
    category: null,
    subcategory: null,
    product: null,
    transaction: null,
    repair: null,
    expense: null,
    return: null
  }
};

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: null, ok: false, error: error.message };
  }
}

// Test function
async function test(name, testFn) {
  try {
    console.log(`${colors.blue}Testing: ${name}${colors.reset}`);
    const result = await testFn();

    if (result.passed) {
      console.log(`${colors.green}✓ PASSED${colors.reset} - ${result.message}`);
      results.passed++;
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} - ${result.message}`);
      results.failed++;
    }

    results.tests.push({ name, ...result });
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
    results.failed++;
    results.tests.push({ name, passed: false, message: error.message });
  }
}

// Generate truly unique identifiers
const timestamp = Date.now();
const randomId = Math.random().toString(36).substring(2, 15);
const uniqueId = `${timestamp}_${randomId}`;

// Test cases
async function runTests() {
  console.log(`${colors.bold}${colors.cyan}🚀 Perfect 100% CRUD API Tests${colors.reset}\n`);

  // ===== CATEGORIES CRUD TESTS =====
  console.log(`${colors.bold}${colors.magenta}📁 CATEGORIES CRUD TESTS${colors.reset}`);

  await test('Create Category', async () => {
    const categoryData = {
      name: `PerfectTestCategory_${uniqueId}`,
      description: 'Electronic devices and components for perfect testing',
      icon: 'electronics',
      color: '#FF5733'
    };

    const response = await makeRequest('POST', '/categories/', categoryData);
    if (response.ok && response.data?.id) {
      results.createdIds.category = response.data.id;
      return { passed: true, message: `Category created with ID: ${response.data.id}` };
    }
    return { passed: false, message: `Category creation failed: ${response.status} - ${JSON.stringify(response.data)}` };
  });

  await test('Read Category by ID', async () => {
    if (!results.createdIds.category) {
      return { passed: false, message: 'No category ID available for testing' };
    }

    const response = await makeRequest('GET', `/categories/${results.createdIds.category}`);
    if (response.ok && response.data?.id) {
      return { passed: true, message: `Category retrieved: ${response.data.name}` };
    }
    return { passed: false, message: `Category retrieval failed: ${response.status}` };
  });

  await test('Update Category', async () => {
    if (!results.createdIds.category) {
      return { passed: false, message: 'No category ID available for testing' };
    }

    const updateData = {
      name: `UpdatedPerfectCategory_${uniqueId}`,
      description: 'Updated electronic devices and components',
      color: '#33FF57'
    };

    const response = await makeRequest('PUT', `/categories/${results.createdIds.category}`, updateData);
    if (response.ok) {
      return { passed: true, message: `Category updated: ${response.data?.name || 'success'}` };
    }
    return { passed: false, message: `Category update failed: ${response.status} - ${JSON.stringify(response.data)}` };
  });

  // ===== SUBCATEGORIES CRUD TESTS =====
  console.log(`\n${colors.bold}${colors.magenta}📂 SUBCATEGORIES CRUD TESTS${colors.reset}`);

  await test('Create Subcategory', async () => {
    if (!results.createdIds.category) {
      return { passed: false, message: 'No category ID available for subcategory creation' };
    }

    const subcategoryData = {
      category_id: results.createdIds.category,
      name: `PerfectTestLaptops_${uniqueId}`,
      description: 'Laptop computers and accessories for perfect testing',
      icon: 'laptop',
      color: '#3498DB'
    };

    const response = await makeRequest('POST', `/categories/${results.createdIds.category}/subcategories`, subcategoryData);
    if (response.ok && response.data?.id) {
      results.createdIds.subcategory = response.data.id;
      return { passed: true, message: `Subcategory created with ID: ${response.data.id}` };
    }
    return { passed: false, message: `Subcategory creation failed: ${response.status} - ${JSON.stringify(response.data)}` };
  });

  await test('Read Subcategory by ID', async () => {
    if (!results.createdIds.subcategory) {
      return { passed: false, message: 'No subcategory ID available for testing' };
    }

    const response = await makeRequest('GET', `/categories/subcategories/${results.createdIds.subcategory}`);
    if (response.ok && response.data?.id) {
      return { passed: true, message: `Subcategory retrieved: ${response.data.name}` };
    }
    return { passed: false, message: `Subcategory retrieval failed: ${response.status}` };
  });

  // ===== PRODUCTS CRUD TESTS =====
  console.log(`\n${colors.bold}${colors.magenta}📦 PRODUCTS CRUD TESTS${colors.reset}`);

  await test('Create Product', async () => {
    if (!results.createdIds.category) {
      return { passed: false, message: 'No category ID available for product creation' };
    }

    const productData = {
      name: `PerfectTestMacBook_${uniqueId}`,
      category_id: results.createdIds.category,
      subcategory_id: results.createdIds.subcategory,
      brand: 'Apple',
      model: 'MacBook Pro 16"',
      sku: `PERFECT-MBP-${uniqueId}`,
      barcode: `1234567890${uniqueId}`,
      dimensions: '35.79 x 24.71 x 1.68 cm',
      weight: 2.1,
      weight_unit: 'kg',
      last_purchase_cost: 2000.00,
      suggested_sell_price: 2500.00,
      low_stock_threshold: 5,
      current_stock: 20, // Increased stock to ensure transactions work
      status: 'active',
      description: 'High-performance laptop for perfect testing',
      supplier: 'Perfect Test Supplier',
      is_active: true,
      attributes: {
        processor: 'M2 Pro',
        memory: '16GB',
        storage: '512GB SSD'
      }
    };

    const response = await makeRequest('POST', '/products/', productData);
    if (response.ok && response.data?.id) {
      results.createdIds.product = response.data.id;
      return { passed: true, message: `Product created with ID: ${response.data.id}` };
    }
    return { passed: false, message: `Product creation failed: ${response.status} - ${JSON.stringify(response.data)}` };
  });

  await test('Read Product by ID', async () => {
    if (!results.createdIds.product) {
      return { passed: false, message: 'No product ID available for testing' };
    }

    const response = await makeRequest('GET', `/products/${results.createdIds.product}`);
    if (response.ok && response.data?.id) {
      return { passed: true, message: `Product retrieved: ${response.data.name}` };
    }
    return { passed: false, message: `Product retrieval failed: ${response.status}` };
  });

  await test('Update Product', async () => {
    if (!results.createdIds.product) {
      return { passed: false, message: 'No product ID available for testing' };
    }

    const updateData = {
      name: `UpdatedPerfectMacBook_${uniqueId}`,
      suggested_sell_price: 2700.00,
      current_stock: 25, // Ensure we have enough stock
      description: 'Updated high-performance laptop for perfect testing'
    };

    const response = await makeRequest('PUT', `/products/${results.createdIds.product}`, updateData);
    if (response.ok) {
      return { passed: true, message: `Product updated: ${response.data?.name || 'success'}` };
    }
    return { passed: false, message: `Product update failed: ${response.status}` };
  });

  // ===== TRANSACTIONS CRUD TESTS =====
  console.log(`\n${colors.bold}${colors.magenta}💰 TRANSACTIONS CRUD TESTS${colors.reset}`);

  await test('Create Purchase Transaction (Stock)', async () => {
    if (!results.createdIds.product) {
      return { passed: false, message: 'No product ID available for transaction creation' };
    }

    const purchaseData = {
      product_id: results.createdIds.product,
      transaction_type: 'purchase', // Create purchase first to establish stock
      quantity: 20, // Purchase 20 units to establish stock
      unit_price: 2000.00,
      total_amount: 40000.00,
      supplier: 'Perfect Test Supplier',
      notes: 'Initial stock purchase for testing'
    };

    const response = await makeRequest('POST', '/transactions/', purchaseData);
    if (response.ok && response.data?.id) {
      return { passed: true, message: `Purchase transaction created with ID: ${response.data.id}` };
    }
    return { passed: false, message: `Purchase creation failed: ${response.status} - ${JSON.stringify(response.data)}` };
  });

  await test('Create Sale Transaction', async () => {
    if (!results.createdIds.product) {
      return { passed: false, message: 'No product ID available for transaction creation' };
    }

    const transactionData = {
      product_id: results.createdIds.product,
      transaction_type: 'sale',
      quantity: 1, // Small quantity to ensure stock is available
      unit_price: 2500.00,
      total_amount: 2500.00,
      customer_name: 'Perfect Test Customer',
      customer_email: 'perfect@example.com',
      notes: 'Perfect transaction for API testing'
    };

    const response = await makeRequest('POST', '/transactions/', transactionData);
    if (response.ok && response.data?.id) {
      results.createdIds.transaction = response.data.id;
      return { passed: true, message: `Sale transaction created with ID: ${response.data.id}` };
    }
    return { passed: false, message: `Sale transaction creation failed: ${response.status} - ${JSON.stringify(response.data)}` };
  });

  await test('Read Transaction by ID', async () => {
    if (!results.createdIds.transaction) {
      return { passed: false, message: 'No transaction ID available for testing' };
    }

    const response = await makeRequest('GET', `/transactions/${results.createdIds.transaction}`);
    if (response.ok && response.data?.id) {
      return { passed: true, message: `Transaction retrieved: ${response.data.transaction_type}` };
    }
    return { passed: false, message: `Transaction retrieval failed: ${response.status}` };
  });

  await test('Update Transaction', async () => {
    if (!results.createdIds.transaction) {
      return { passed: false, message: 'No transaction ID available for testing' };
    }

    const updateData = {
      quantity: 2,
      total_amount: 5000.00,
      notes: 'Updated perfect transaction'
    };

    const response = await makeRequest('PUT', `/transactions/${results.createdIds.transaction}`, updateData);
    if (response.ok) {
      return { passed: true, message: `Transaction updated: quantity ${response.data?.quantity || 'updated'}` };
    }
    return { passed: false, message: `Transaction update failed: ${response.status}` };
  });

  // ===== REPAIRS CRUD TESTS =====
  console.log(`\n${colors.bold}${colors.magenta}🔧 REPAIRS CRUD TESTS${colors.reset}`);

  await test('Create Repair', async () => {
    if (!results.createdIds.product) {
      return { passed: false, message: 'No product ID available for repair creation' };
    }

    const repairData = {
      product_id: results.createdIds.product,
      customer_name: 'Perfect Repair Customer',
      customer_email: 'repair@example.com',
      customer_phone: '+1234567890',
      phone_model: 'iPhone 13 Pro', // Required field
      issue_description: 'Screen flickering issue for perfect testing',
      estimated_cost: 150.00,
      estimated_completion_date: '2025-09-10',
      status: 'pending',
      notes: 'Perfect repair for API testing'
    };

    const response = await makeRequest('POST', '/repairs/', repairData);
    if (response.ok && response.data?.id) {
      results.createdIds.repair = response.data.id;
      return { passed: true, message: `Repair created with ID: ${response.data.id}` };
    }
    return { passed: false, message: `Repair creation failed: ${response.status} - ${JSON.stringify(response.data)}` };
  });

  await test('Read Repair by ID', async () => {
    if (!results.createdIds.repair) {
      return { passed: false, message: 'No repair ID available for testing' };
    }

    const response = await makeRequest('GET', `/repairs/${results.createdIds.repair}`);
    if (response.ok && response.data?.id) {
      return { passed: true, message: `Repair retrieved: ${response.data.issue_description}` };
    }
    return { passed: false, message: `Repair retrieval failed: ${response.status}` };
  });

  await test('Update Repair Status', async () => {
    if (!results.createdIds.repair) {
      return { passed: false, message: 'No repair ID available for testing' };
    }

    const updateData = {
      status: 'in_progress',
      actual_cost: 175.00,
      notes: 'Updated perfect repair status - in progress'
    };

    const response = await makeRequest('PUT', `/repairs/${results.createdIds.repair}`, updateData);
    if (response.ok) {
      return { passed: true, message: `Repair updated: status ${response.data?.status || 'updated'}` };
    }
    return { passed: false, message: `Repair update failed: ${response.status}` };
  });

  // ===== EXPENSES CRUD TESTS =====
  console.log(`\n${colors.bold}${colors.magenta}💸 EXPENSES CRUD TESTS${colors.reset}`);

  await test('Create Expense', async () => {
    const expenseData = {
      description: `Perfect office supplies for testing ${uniqueId}`,
      amount: 75.50,
      category: 'supplies', // Valid enum value
      expense_date: '2025-09-04',
      vendor: 'Perfect Office Supply Store',
      payment_method: 'credit_card',
      receipt_number: `PERFECT-RCP-${uniqueId}`,
      notes: 'Perfect expense for API testing'
    };

    const response = await makeRequest('POST', '/expenses/', expenseData);
    if (response.ok && response.data?.id) {
      results.createdIds.expense = response.data.id;
      return { passed: true, message: `Expense created with ID: ${response.data.id}` };
    }
    return { passed: false, message: `Expense creation failed: ${response.status} - ${JSON.stringify(response.data)}` };
  });

  await test('Read Expense by ID', async () => {
    if (!results.createdIds.expense) {
      return { passed: false, message: 'No expense ID available for testing' };
    }

    const response = await makeRequest('GET', `/expenses/${results.createdIds.expense}`);
    if (response.ok && response.data?.id) {
      return { passed: true, message: `Expense retrieved: ${response.data.description}` };
    }
    return { passed: false, message: `Expense retrieval failed: ${response.status}` };
  });

  await test('Update Expense', async () => {
    if (!results.createdIds.expense) {
      return { passed: false, message: 'No expense ID available for testing' };
    }

    const updateData = {
      amount: 85.50,
      description: `Updated perfect office supplies for testing ${uniqueId}`,
      notes: 'Updated perfect expense'
    };

    const response = await makeRequest('PUT', `/expenses/${results.createdIds.expense}`, updateData);
    if (response.ok) {
      return { passed: true, message: `Expense updated: amount $${response.data?.amount || 'updated'}` };
    }
    return { passed: false, message: `Expense update failed: ${response.status}` };
  });

  // ===== RETURNS CRUD TESTS =====
  console.log(`\n${colors.bold}${colors.magenta}↩️ RETURNS CRUD TESTS${colors.reset}`);

  await test('Create Return', async () => {
    if (!results.createdIds.product) {
      return { passed: false, message: 'No product ID available for return creation' };
    }

    const returnData = {
      product_id: results.createdIds.product,
      transaction_id: results.createdIds.transaction,
      customer_name: 'Perfect Return Customer',
      customer_email: 'return@example.com',
      customer_phone: '+1234567890', // Required field
      reason: 'defective_product',
      action: 'refund',
      action_taken: 'refund', // Valid enum value
      quantity: 1,
      refund_amount: 2500.00,
      status: 'pending',
      notes: 'Perfect return for API testing'
    };

    const response = await makeRequest('POST', '/returns/', returnData);
    if (response.ok && response.data?.id) {
      results.createdIds.return = response.data.id;
      return { passed: true, message: `Return created with ID: ${response.data.id}` };
    }
    return { passed: false, message: `Return creation failed: ${response.status} - ${JSON.stringify(response.data)}` };
  });

  await test('Read Return by ID', async () => {
    if (!results.createdIds.return) {
      return { passed: false, message: 'No return ID available for testing' };
    }

    const response = await makeRequest('GET', `/returns/${results.createdIds.return}`);
    if (response.ok && response.data?.id) {
      return { passed: true, message: `Return retrieved: ${response.data.reason}` };
    }
    return { passed: false, message: `Return retrieval failed: ${response.status}` };
  });

  await test('Update Return Status', async () => {
    if (!results.createdIds.return) {
      return { passed: false, message: 'No return ID available for testing' };
    }

    const updateData = {
      status: 'approved',
      notes: 'Perfect return approved and processed'
    };

    const response = await makeRequest('PUT', `/returns/${results.createdIds.return}`, updateData);
    if (response.ok) {
      return { passed: true, message: `Return updated: status ${response.data?.status || 'updated'}` };
    }
    return { passed: false, message: `Return update failed: ${response.status}` };
  });

  // ===== DELETE OPERATIONS (Cleanup) =====
  console.log(`\n${colors.bold}${colors.magenta}🗑️ DELETE OPERATIONS (Cleanup)${colors.reset}`);

  await test('Delete Return', async () => {
    if (!results.createdIds.return) {
      return { passed: false, message: 'No return ID available for deletion' };
    }

    const response = await makeRequest('DELETE', `/returns/${results.createdIds.return}`);
    if (response.ok || response.status === 204) {
      return { passed: true, message: 'Return deleted successfully' };
    }
    return { passed: false, message: `Return deletion failed: ${response.status}` };
  });

  await test('Delete Expense', async () => {
    if (!results.createdIds.expense) {
      return { passed: false, message: 'No expense ID available for deletion' };
    }

    const response = await makeRequest('DELETE', `/expenses/${results.createdIds.expense}`);
    if (response.ok || response.status === 204) {
      return { passed: true, message: 'Expense deleted successfully' };
    }
    return { passed: false, message: `Expense deletion failed: ${response.status}` };
  });

  await test('Delete Repair', async () => {
    if (!results.createdIds.repair) {
      return { passed: false, message: 'No repair ID available for deletion' };
    }

    const response = await makeRequest('DELETE', `/repairs/${results.createdIds.repair}`);
    if (response.ok || response.status === 204) {
      return { passed: true, message: 'Repair deleted successfully' };
    }
    return { passed: false, message: `Repair deletion failed: ${response.status}` };
  });

  await test('Delete Transaction', async () => {
    if (!results.createdIds.transaction) {
      return { passed: false, message: 'No transaction ID available for deletion' };
    }

    const response = await makeRequest('DELETE', `/transactions/${results.createdIds.transaction}`);
    if (response.ok || response.status === 204) {
      return { passed: true, message: 'Transaction deleted successfully' };
    }
    return { passed: false, message: `Transaction deletion failed: ${response.status}` };
  });

  await test('Delete Product', async () => {
    if (!results.createdIds.product) {
      return { passed: false, message: 'No product ID available for deletion' };
    }

    const response = await makeRequest('DELETE', `/products/${results.createdIds.product}`);
    if (response.ok || response.status === 204) {
      return { passed: true, message: 'Product deleted successfully' };
    }
    return { passed: false, message: `Product deletion failed: ${response.status}` };
  });

  await test('Delete Subcategory', async () => {
    if (!results.createdIds.subcategory) {
      return { passed: false, message: 'No subcategory ID available for deletion' };
    }

    const response = await makeRequest('DELETE', `/categories/subcategories/${results.createdIds.subcategory}`);
    if (response.ok || response.status === 204) {
      return { passed: true, message: 'Subcategory deleted successfully' };
    }
    return { passed: false, message: `Subcategory deletion failed: ${response.status}` };
  });

  await test('Delete Category', async () => {
    if (!results.createdIds.category) {
      return { passed: false, message: 'No category ID available for deletion' };
    }

    const response = await makeRequest('DELETE', `/categories/${results.createdIds.category}`);
    if (response.ok || response.status === 204) {
      return { passed: true, message: 'Category deleted successfully' };
    }
    return { passed: false, message: `Category deletion failed: ${response.status}` };
  });

  // Print summary
  console.log(`\n${colors.bold}📊 Perfect Test Summary:${colors.reset}`);
  console.log(`${colors.green}✓ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${results.failed}${colors.reset}`);
  console.log(`Total: ${results.passed + results.failed}`);

  const successRate = Math.round((results.passed / (results.passed + results.failed)) * 100);
  console.log(`\n${colors.bold}Success Rate: ${successRate}%${colors.reset}`);

  if (successRate === 100) {
    console.log(`${colors.green}🎉 PERFECT! 100% SUCCESS RATE ACHIEVED!${colors.reset}`);
    console.log(`${colors.green}🏆 Your API CRUD operations are flawless!${colors.reset}`);
  } else if (successRate >= 90) {
    console.log(`${colors.yellow}⚠️ Almost perfect! ${100 - successRate}% to go!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Need to fix ${results.failed} issues to reach 100%.${colors.reset}`);
  }

  if (results.failed > 0) {
    console.log(`\n${colors.yellow}Failed tests:${colors.reset}`);
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`  - ${test.name}: ${test.message}`);
    });
  }
}

// Run tests if this script is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                     import.meta.url.endsWith(process.argv[1]) ||
                     process.argv[1].endsWith('perfect-crud-test.js');

if (isMainModule) {
  runTests().catch(error => {
    console.error(`${colors.red}Test runner error:${colors.reset}`, error);
    process.exit(1);
  });
}

export { runTests, makeRequest, test };
