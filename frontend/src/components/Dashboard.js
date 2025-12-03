import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../hooks/useWeb3";
import { ContractHelper, formatNumber } from "../utils/contractHelpers";

const Dashboard = () => {
  const { provider, signer, account } = useWeb3();
  const [contractHelper, setContractHelper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    treasuryBalance: "0",
    userTokenBalance: "0",
    userVotingPower: "0",
    totalSupply: "0",
    proposalCount: "0",
    userEthBalance: "0",
  });
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    if (provider) {
      initializeContracts();
    }
  }, [provider, signer]);

  useEffect(() => {
    if (contractHelper && account) {
      loadDashboardData();
    }
  }, [contractHelper, account]);

  const initializeContracts = async () => {
    try {
      const helper = new ContractHelper(provider, signer);
      await helper.init();
      setContractHelper(helper);
    } catch (error) {
      console.error("Error initializing contracts:", error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        treasuryBalance,
        userTokenBalance,
        userVotingPower,
        totalSupply,
        proposalCount,
        userEthBalance,
      ] = await Promise.all([
        contractHelper.getTreasuryBalance(),
        contractHelper.getTokenBalance(account),
        contractHelper.getVotingPower(account),
        contractHelper.getTotalSupply(),
        contractHelper.getProposalCount(),
        provider
          .getBalance(account)
          .then((balance) => formatNumber(ethers.formatEther(balance), 4)),
      ]);

      setDashboardData({
        treasuryBalance,
        userTokenBalance,
        userVotingPower,
        totalSupply,
        proposalCount,
        userEthBalance,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || !contractHelper) return;

    try {
      setDepositing(true);
      const tx = await contractHelper.depositFunds(depositAmount);
      await tx.wait();

      // Refresh data
      await loadDashboardData();
      setDepositAmount("");

      alert("Funds deposited successfully!");
    } catch (error) {
      console.error("Error depositing funds:", error);
      alert("Error depositing funds: " + error.message);
    } finally {
      setDepositing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: "Treasury Balance",
      value: `${formatNumber(dashboardData.treasuryBalance)} ETH`,
      icon: "🏦",
      description: "Total funds available for proposals",
    },
    {
      name: "Your GOV Tokens",
      value: formatNumber(dashboardData.userTokenBalance),
      icon: "🪙",
      description: "Your governance token balance",
    },
    {
      name: "Your Voting Power",
      value: formatNumber(dashboardData.userVotingPower),
      icon: "🗳️",
      description: "Your influence in governance decisions",
    },
    {
      name: "Total Proposals",
      value: dashboardData.proposalCount,
      icon: "📋",
      description: "All proposals created to date",
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to your DAO Treasury dashboard. Monitor treasury health and
          your participation.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">{stat.icon}</div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Account Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Account
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Address:</span>
              <span className="font-mono text-sm">
                {account?.slice(0, 10)}...{account?.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ETH Balance:</span>
              <span className="font-semibold">
                {dashboardData.userEthBalance} ETH
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">GOV Tokens:</span>
              <span className="font-semibold">
                {formatNumber(dashboardData.userTokenBalance)} GOV
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Voting Power:</span>
              <span className="font-semibold">
                {formatNumber(
                  (parseFloat(dashboardData.userVotingPower) /
                    parseFloat(dashboardData.totalSupply)) *
                    100,
                  2
                )}
                %
              </span>
            </div>
          </div>
        </div>

        {/* Deposit Funds */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Deposit Funds
          </h2>
          <p className="text-gray-600 mb-4">
            Contribute ETH to the treasury to support community initiatives.
          </p>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="deposit-amount"
                className="block text-sm font-medium text-gray-700"
              >
                Amount (ETH)
              </label>
              <input
                type="number"
                id="deposit-amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.001"
                step="0.001"
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleDeposit}
              disabled={!depositAmount || depositing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              {depositing ? "Depositing..." : "Deposit Funds"}
            </button>
          </div>
        </div>
      </div>

      {/* Treasury Health */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Treasury Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">📈</div>
            <p className="text-2xl font-bold text-green-600">
              {formatNumber(dashboardData.treasuryBalance)} ETH
            </p>
            <p className="text-sm text-gray-600">Available Funds</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">👥</div>
            <p className="text-2xl font-bold text-blue-600">
              {formatNumber(dashboardData.totalSupply)}
            </p>
            <p className="text-sm text-gray-600">Total Governance Tokens</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-2xl font-bold text-purple-600">
              {dashboardData.proposalCount}
            </p>
            <p className="text-sm text-gray-600">Active Governance</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("navigate", { detail: "proposals" })
              )
            }
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="text-2xl mb-2">📝</div>
            <p className="font-medium">Create Proposal</p>
            <p className="text-sm text-gray-600">
              Submit a new funding proposal
            </p>
          </button>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("navigate", { detail: "voting" })
              )
            }
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <div className="text-2xl mb-2">🗳️</div>
            <p className="font-medium">Vote on Proposals</p>
            <p className="text-sm text-gray-600">Participate in governance</p>
          </button>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("navigate", { detail: "analytics" })
              )
            }
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <div className="text-2xl mb-2">📊</div>
            <p className="font-medium">View Analytics</p>
            <p className="text-sm text-gray-600">Track treasury performance</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
