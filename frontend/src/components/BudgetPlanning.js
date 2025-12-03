import React, { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../hooks/useWeb3";
import { ethers } from "ethers";

const BudgetPlanning = () => {
  const { provider, signer } = useWeb3();
  const [budgetManager, setBudgetManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [categories, setCategories] = useState([]);

  // Form states
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showProposeInitiative, setShowProposeInitiative] = useState(false);

  const [budgetForm, setBudgetForm] = useState({
    category: "",
    allocated: "",
    duration: "30",
  });

  const [initiativeForm, setInitiativeForm] = useState({
    name: "",
    category: "",
    description: "",
    requestedAmount: "",
    recipient: "",
  });

  const getActiveBudgetIdForCategory = (category) => {
    const relevantBudgets = budgets
      .filter((b) => b.category === category)
      .sort((a, b) => b.id - a.id);
    const active = relevantBudgets.find((b) => b.active);
    return active?.id || null;
  };

  const handleInitiativeProposal = (initiative) => {
    const amountToUse =
      parseFloat(initiative.approvedAmount) > 0
        ? initiative.approvedAmount
        : initiative.requestedAmount;
    const budgetId = getActiveBudgetIdForCategory(initiative.category);

    window.dispatchEvent(
      new CustomEvent("create-proposal", {
        detail: {
          initiativeId: initiative.id,
          initiativeName: initiative.name,
          category: initiative.category,
          amount: amountToUse,
          description: initiative.description,
          recipient: initiative.recipient,
          budgetId,
        },
      })
    );
  };

  const initializeContract = useCallback(async () => {
    if (!provider || !signer) return;
    try {
      // Load deployments
      const response = await fetch("/contracts/deployments.json");
      const deployments = await response.json();

      // Load ABI
      const abiResponse = await fetch("/contracts/abis.json");
      const abis = await abiResponse.json();

      const contract = new ethers.Contract(
        deployments.budgetManager,
        abis.BudgetManager,
        signer
      );

      setBudgetManager(contract);
    } catch (error) {
      console.error("Error initializing BudgetManager:", error);
    }
  }, [provider, signer]);

  const loadData = useCallback(async () => {
    if (!budgetManager) return;
    try {
      setLoading(true);

      // Load categories
      const cats = await budgetManager.getCategories();
      setCategories(cats);

      // Load budgets
      const budgetCount = await budgetManager.budgetCount();
      const budgetsData = [];

      for (let i = 1; i <= Number(budgetCount); i++) {
        const budget = await budgetManager.getBudget(i);
        budgetsData.push({
          id: Number(budget[0]),
          category: budget[1],
          allocated: ethers.formatEther(budget[2]),
          spent: ethers.formatEther(budget[3]),
          remaining: ethers.formatEther(budget[4]),
          percentUsed: Number(budget[5]),
          startDate: new Date(Number(budget[6]) * 1000),
          endDate: new Date(Number(budget[7]) * 1000),
          active: budget[8],
        });
      }

      setBudgets(budgetsData);

      // Load initiatives
      const initiativeCount = await budgetManager.initiativeCount();
      const initiativesData = [];

      for (let i = 1; i <= Number(initiativeCount); i++) {
        const initiative = await budgetManager.getInitiative(i);
        initiativesData.push({
          id: Number(initiative[0]),
          name: initiative[1],
          category: initiative[2],
          description: initiative[3],
          requestedAmount: ethers.formatEther(initiative[4]),
          approvedAmount: ethers.formatEther(initiative[5]),
          recipient: initiative[6],
          approved: initiative[7],
          funded: initiative[8],
          proposalId: Number(initiative[9]),
          createdAt: new Date(Number(initiative[10]) * 1000),
        });
      }

      setInitiatives(initiativesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [budgetManager]);

  useEffect(() => {
    if (provider && signer) {
      initializeContract();
    }
  }, [provider, signer, initializeContract]);

  useEffect(() => {
    if (budgetManager) {
      loadData();
    }
  }, [budgetManager, loadData]);

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    if (!budgetManager) return;

    try {
      const tx = await budgetManager.createBudget(
        budgetForm.category,
        ethers.parseEther(budgetForm.allocated),
        parseInt(budgetForm.duration)
      );

      await tx.wait();
      alert("Budget created successfully!");

      setBudgetForm({ category: "", allocated: "", duration: "30" });
      setShowCreateBudget(false);
      await loadData();
    } catch (error) {
      console.error("Error creating budget:", error);
      alert("Error creating budget: " + error.message);
    }
  };

  const handleProposeInitiative = async (e) => {
    e.preventDefault();
    if (!budgetManager) return;

    try {
      const tx = await budgetManager.proposeInitiative(
        initiativeForm.name,
        initiativeForm.category,
        initiativeForm.description,
        ethers.parseEther(initiativeForm.requestedAmount),
        initiativeForm.recipient
      );

      await tx.wait();
      alert("Initiative proposed successfully!");

      setInitiativeForm({
        name: "",
        category: "",
        description: "",
        requestedAmount: "",
        recipient: "",
      });
      setShowProposeInitiative(false);
      await loadData();
    } catch (error) {
      console.error("Error proposing initiative:", error);
      alert("Error proposing initiative: " + error.message);
    }
  };

  const handleApproveInitiative = async (initiativeId, requestedAmount) => {
    if (!budgetManager) return;

    try {
      const tx = await budgetManager.approveInitiative(
        initiativeId,
        ethers.parseEther(requestedAmount)
      );

      await tx.wait();
      alert("Initiative approved! Now create a proposal in the Proposals tab.");
      await loadData();
    } catch (error) {
      console.error("Error approving initiative:", error);
      alert("Error approving initiative: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate total stats
  const totalAllocated = budgets
    .filter((b) => b.active)
    .reduce((sum, b) => sum + parseFloat(b.allocated), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + parseFloat(b.spent), 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Budget Planning</h1>
        <p className="mt-2 text-gray-600">
          Manage DAO budgets and initiatives across different categories
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">💰</div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Allocated
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalAllocated.toFixed(4)} ETH
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📊</div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Spent</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalSpent.toFixed(4)} ETH
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">✅</div>
            <div>
              <p className="text-sm font-medium text-gray-500">Remaining</p>
              <p className="text-2xl font-semibold text-green-600">
                {totalRemaining.toFixed(4)} ETH
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-8 flex gap-4">
        <button
          onClick={() => setShowCreateBudget(!showCreateBudget)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          {showCreateBudget ? "Cancel" : "Create Budget"}
        </button>
        <button
          onClick={() => setShowProposeInitiative(!showProposeInitiative)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          {showProposeInitiative ? "Cancel" : "Propose Initiative"}
        </button>
      </div>

      {/* Create Budget Form */}
      {showCreateBudget && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create New Budget
          </h2>
          <form onSubmit={handleCreateBudget} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={budgetForm.category}
                onChange={(e) =>
                  setBudgetForm({ ...budgetForm, category: e.target.value })
                }
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allocated Amount (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={budgetForm.allocated}
                onChange={(e) =>
                  setBudgetForm({ ...budgetForm, allocated: e.target.value })
                }
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (days)
              </label>
              <input
                type="number"
                min="1"
                value={budgetForm.duration}
                onChange={(e) =>
                  setBudgetForm({ ...budgetForm, duration: e.target.value })
                }
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              Create Budget
            </button>
          </form>
        </div>
      )}

      {/* Propose Initiative Form */}
      {showProposeInitiative && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Propose New Initiative
          </h2>
          <form onSubmit={handleProposeInitiative} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initiative Name
              </label>
              <input
                type="text"
                value={initiativeForm.name}
                onChange={(e) =>
                  setInitiativeForm({ ...initiativeForm, name: e.target.value })
                }
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={initiativeForm.category}
                onChange={(e) =>
                  setInitiativeForm({
                    ...initiativeForm,
                    category: e.target.value,
                  })
                }
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={initiativeForm.description}
                onChange={(e) =>
                  setInitiativeForm({
                    ...initiativeForm,
                    description: e.target.value,
                  })
                }
                required
                rows="3"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requested Amount (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={initiativeForm.requestedAmount}
                onChange={(e) =>
                  setInitiativeForm({
                    ...initiativeForm,
                    requestedAmount: e.target.value,
                  })
                }
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={initiativeForm.recipient}
                onChange={(e) =>
                  setInitiativeForm({
                    ...initiativeForm,
                    recipient: e.target.value,
                  })
                }
                required
                placeholder="0x..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              Propose Initiative
            </button>
          </form>
        </div>
      )}

      {/* Budgets by Category */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Budget Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets
            .filter((b) => b.active)
            .map((budget) => (
              <div key={budget.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {budget.category}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      budget.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {budget.active ? "Active" : "Closed"}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Allocated:</span>
                    <span className="font-medium">{budget.allocated} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Spent:</span>
                    <span className="font-medium">{budget.spent} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="font-medium text-green-600">
                      {budget.remaining} ETH
                    </span>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{budget.percentUsed}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${budget.percentUsed}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-4">
                  <div>Start: {budget.startDate.toLocaleDateString()}</div>
                  <div>End: {budget.endDate.toLocaleDateString()}</div>
                </div>
              </div>
            ))}
        </div>

        {budgets.filter((b) => b.active).length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No active budgets. Create one to get started!
          </p>
        )}
      </div>

      {/* Initiatives */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Initiatives</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {initiatives.map((initiative) => (
                <tr key={initiative.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {initiative.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {initiative.description.substring(0, 50)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {initiative.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {initiative.requestedAmount} ETH
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        initiative.funded
                          ? "bg-green-100 text-green-800"
                          : initiative.approved
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {initiative.funded
                        ? "Funded"
                        : initiative.approved
                        ? "Approved"
                        : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {initiative.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {!initiative.approved && !initiative.funded && (
                      <button
                        onClick={() =>
                          handleApproveInitiative(
                            initiative.id,
                            initiative.requestedAmount
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                      >
                        Approve
                      </button>
                    )}
                    {initiative.approved && !initiative.funded && (
                      <button
                        onClick={() => handleInitiativeProposal(initiative)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Create Proposal →
                      </button>
                    )}
                    {initiative.funded && (
                      <span className="text-green-600 text-xs font-medium">
                        ✓ Complete
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {initiatives.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No initiatives proposed yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetPlanning;
