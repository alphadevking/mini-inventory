export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
      <h1 className="text-4xl font-bold mb-4 text-center">Welcome to Mini Inventory</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-300 text-center max-w-2xl">
        Manage your phone repair parts, track expenses, and monitor profits with our comprehensive inventory management system.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full px-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Products</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Manage your inventory of phone parts, track stock levels, and set pricing.
          </p>
          <div className="text-sm text-gray-500">
            Features: Add, edit, delete products • Stock tracking • Low stock alerts
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Transactions</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Record purchases and sales, track costs, and monitor your business performance.
          </p>
          <div className="text-sm text-gray-500">
            Features: Purchase/sale tracking • Cost analysis • Party management
          </div>
        </div>
      </div>
    </div>
  );
}