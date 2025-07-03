import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/exportUtils";

interface Transaction {
  id: string;
  product_id: string;
  transaction_date: string;
  transaction_type: "purchase" | "sale";
  quantity: number;
  unit_cost: number | null;
  unit_price: number | null;
  party_name: string | null;
  transport_other_cost: number;
  created_at: string;
  product?: {
    phone_model: string;
    part_type: string;
  };
}

interface Product {
  id: string;
  phone_model: string;
  part_type: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: "purchase" as "purchase" | "sale",
    quantity: "",
    unit_cost: "",
    unit_price: "",
    party_name: "",
    transport_other_cost: "0"
  });

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions/");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  };

  // Fetch products for dropdown
  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products/");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, []);

  // Add transaction
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/transactions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
          unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
          transport_other_cost: parseFloat(formData.transport_other_cost)
        })
      });
      if (response.ok) {
        setIsAddDialogOpen(false);
        setFormData({
          product_id: "",
          transaction_date: new Date().toISOString().split('T')[0],
          transaction_type: "purchase",
          quantity: "",
          unit_cost: "",
          unit_price: "",
          party_name: "",
          transport_other_cost: "0"
        });
        fetchTransactions();
      }
    } catch (error) {
      console.error("Failed to add transaction:", error);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        fetchTransactions();
      }
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? `${product.phone_model} (${product.part_type})` : "Unknown Product";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <Button onClick={() => exportToExcel(transactions, "transactions")}>Export Excel</Button>
          <Button onClick={() => exportToCSV(transactions, "transactions")}>Export CSV</Button>
          <Button onClick={() => exportToPDF(transactions, [
            { header: "Product", dataKey: "product_id" },
            { header: "Date", dataKey: "transaction_date" },
            { header: "Type", dataKey: "transaction_type" },
            { header: "Quantity", dataKey: "quantity" },
            { header: "Unit Cost", dataKey: "unit_cost" },
            { header: "Unit Price", dataKey: "unit_price" },
            { header: "Party", dataKey: "party_name" },
            { header: "Other Costs", dataKey: "transport_other_cost" },
          ], "transactions")}>Export PDF</Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Transaction</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({...formData, product_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.phone_model} ({product.part_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                  required
                />

                <Select
                  value={formData.transaction_type}
                  onValueChange={(value: "purchase" | "sale") => setFormData({...formData, transaction_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                />

                <Input
                  type="number"
                  step="0.01"
                  placeholder="Unit Cost"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                />

                <Input
                  type="number"
                  step="0.01"
                  placeholder="Unit Price"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                />

                <Input
                  placeholder="Party Name"
                  value={formData.party_name}
                  onChange={(e) => setFormData({...formData, party_name: e.target.value})}
                />

                <Input
                  type="number"
                  step="0.01"
                  placeholder="Transport/Other Cost"
                  value={formData.transport_other_cost}
                  onChange={(e) => setFormData({...formData, transport_other_cost: e.target.value})}
                />

                <Button type="submit" className="w-full">Add Transaction</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Other Costs</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{getProductName(transaction.product_id)}</TableCell>
                  <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      transaction.transaction_type === "purchase"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}>
                      {transaction.transaction_type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{transaction.quantity}</TableCell>
                  <TableCell>{transaction.unit_cost ? `$${transaction.unit_cost}` : "-"}</TableCell>
                  <TableCell>{transaction.unit_price ? `$${transaction.unit_price}` : "-"}</TableCell>
                  <TableCell>{transaction.party_name || "-"}</TableCell>
                  <TableCell>${transaction.transport_other_cost}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTransaction(transaction.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}