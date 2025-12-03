import React, { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../hooks/useWeb3";
import { ContractHelper } from "../utils/contractHelpers";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const RiskAnalytics = () => {
  const { provider, signer } = useWeb3();
  const [contractHelper, setContractHelper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riskMetrics, setRiskMetrics] = useState({
    healthScore: 0,
    runway: 0,
    spendingVelocity: 0,
    riskLevel: "Unknown",
    burnRate: 0,
  });
  const [treasuryBalance, setTreasuryBalance] = useState("0");
  const [proposals, setProposals] = useState([]);
  const [spendingHistory, setSpendingHistory] = useState([]);

  const initializeContracts = useCallback(async () => {
    if (!provider || !signer) return;
    try {
      const helper = new ContractHelper(provider, signer);
      await helper.init();
      setContractHelper(helper);
    } catch (error) {
      console.error("Error initializing contracts:", error);
    }
  }, [provider, signer]);

  const generateSpendingHistory = useCallback((executedProposals) => {
    const history = [];
    let cumulativeSpent = 0;

    executedProposals.forEach((proposal) => {
      cumulativeSpent += parseFloat(proposal.amount);
      history.push({
        date: proposal.deadline.toLocaleDateString(),
        spent: cumulativeSpent,
        amount: parseFloat(proposal.amount),
      });
    });

    setSpendingHistory(history);
  }, []);

  const calculateRiskMetrics = useCallback(async () => {
    if (!contractHelper) return;
    try {
      setLoading(true);

      // Get treasury balance
      const balance = await contractHelper.getTreasuryBalance();
      setTreasuryBalance(balance);

      // Get all proposals
      const allProposals = await contractHelper.getAllProposals();
      setProposals(allProposals);

      // Calculate metrics only if there are executed proposals
      const executedProposals = allProposals.filter((p) => p.executed);

      if (executedProposals.length === 0) {
        setRiskMetrics({
          healthScore: 100,
          runway: 999,
          spendingVelocity: 0,
          riskLevel: "Low",
          burnRate: 0,
        });
        setLoading(false);
        return;
      }

      // Calculate total spent
      const totalSpent = executedProposals.reduce(
        (sum, p) => sum + parseFloat(p.amount),
        0
      );

      // Calculate days since first proposal
      const now = new Date();
      const firstProposal = executedProposals[0];
      const daysSinceFirst = Math.max(
        1,
        (now - firstProposal.deadline) / (1000 * 60 * 60 * 24)
      );

      // Calculate spending velocity (ETH per day)
      const velocity = totalSpent / daysSinceFirst;

      // Calculate runway (days of funding remaining)
      const runway = velocity > 0 ? parseFloat(balance) / velocity : 999;

      // Calculate monthly burn rate
      const burnRate = velocity * 30;

      // Calculate health score
      const healthScore = calculateHealthScore(balance, velocity, runway);

      // Determine risk level
      const riskLevel =
        healthScore > 80 ? "Low" : healthScore > 50 ? "Medium" : "High";

      setRiskMetrics({
        healthScore,
        runway,
        spendingVelocity: velocity,
        riskLevel,
        burnRate,
      });

      // Generate spending history
      generateSpendingHistory(executedProposals);
    } catch (error) {
      console.error("Error calculating risk metrics:", error);
    } finally {
      setLoading(false);
    }
  }, [contractHelper, generateSpendingHistory]);

  useEffect(() => {
    if (provider && signer) {
      initializeContracts();
    }
  }, [provider, signer, initializeContracts]);

  useEffect(() => {
    if (contractHelper) {
      calculateRiskMetrics();
    }
  }, [contractHelper, calculateRiskMetrics]);

  const calculateHealthScore = (balance, velocity, runway) => {
    let score = 100;

    // Deduct points for low balance
    const bal = parseFloat(balance);
    if (bal < 0.01) score -= 40;
    else if (bal < 0.1) score -= 30;
    else if (bal < 1) score -= 20;
    else if (bal < 5) score -= 10;

    // Deduct points for short runway
    if (runway < 30) score -= 30;
    else if (runway < 90) score -= 20;
    else if (runway < 180) score -= 10;

    // Deduct points for high spending velocity
    if (velocity > 0.1) score -= 20;
    else if (velocity > 0.05) score -= 15;
    else if (velocity > 0.01) score -= 10;

    return Math.max(0, Math.min(100, score));
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "Low":
        return "text-green-600";
      case "Medium":
        return "text-yellow-600";
      case "High":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getRiskBgColor = (level) => {
    switch (level) {
      case "Low":
        return "bg-green-100 text-green-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "High":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Data for proposal status pie chart
  const proposalStatusData = [
    {
      name: "Executed",
      value: proposals.filter((p) => p.executed).length,
      color: "#10B981",
    },
    {
      name: "Active",
      value: proposals.filter((p) => !p.executed && new Date() < p.deadline)
        .length,
      color: "#3B82F6",
    },
    {
      name: "Expired",
      value: proposals.filter((p) => !p.executed && new Date() >= p.deadline)
        .length,
      color: "#EF4444",
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Treasury Risk Assessment
        </h1>
        <p className="mt-2 text-gray-600">
          Analyze treasury health, spending patterns, and financial risks
        </p>
      </div>

      {/* Health Score Card */}
      <div className="bg-white rounded-lg shadow p-8 mb-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Treasury Health Score
          </h2>
          <div
            className={`text-7xl font-bold mb-4 ${getRiskColor(
              riskMetrics.riskLevel
            )}`}
          >
            {riskMetrics.healthScore}/100
          </div>
          <span
            className={`inline-block px-6 py-2 rounded-full text-lg font-semibold ${getRiskBgColor(
              riskMetrics.riskLevel
            )}`}
          >
            Risk Level: {riskMetrics.riskLevel}
          </span>
          <p className="mt-4 text-gray-600">
            Based on balance, spending velocity, and runway analysis
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-sm font-medium text-gray-500">Current Balance</p>
          <p className="text-2xl font-semibold text-gray-900">
            {parseFloat(treasuryBalance).toFixed(4)} ETH
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-sm font-medium text-gray-500">Runway</p>
          <p className="text-2xl font-semibold text-gray-900">
            {riskMetrics.runway > 365
              ? "1+ year"
              : `${Math.floor(riskMetrics.runway)} days`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {(riskMetrics.runway / 30).toFixed(1)} months
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">⚡</div>
          <p className="text-sm font-medium text-gray-500">Spending Velocity</p>
          <p className="text-2xl font-semibold text-gray-900">
            {riskMetrics.spendingVelocity.toFixed(6)} ETH/day
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">🔥</div>
          <p className="text-sm font-medium text-gray-500">Monthly Burn Rate</p>
          <p className="text-2xl font-semibold text-gray-900">
            {riskMetrics.burnRate.toFixed(4)} ETH/mo
          </p>
        </div>
      </div>

      {/* Risk Indicators */}
      {(riskMetrics.runway < 90 ||
        riskMetrics.spendingVelocity > 0.05 ||
        riskMetrics.healthScore < 60) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Risk Warnings
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {riskMetrics.runway < 30 && (
                    <li>
                      ⚠️ Critical: Treasury will be depleted in{" "}
                      {Math.floor(riskMetrics.runway)} days
                    </li>
                  )}
                  {riskMetrics.runway >= 30 && riskMetrics.runway < 90 && (
                    <li>
                      ⚠️ Warning: Low runway ({Math.floor(riskMetrics.runway)}{" "}
                      days remaining)
                    </li>
                  )}
                  {riskMetrics.spendingVelocity > 0.05 && (
                    <li>⚠️ High spending velocity detected</li>
                  )}
                  {riskMetrics.healthScore < 50 && (
                    <li>
                      🚨 Treasury health critical - consider pausing new
                      proposals
                    </li>
                  )}
                  {parseFloat(treasuryBalance) < 0.1 && (
                    <li>⚠️ Low treasury balance - deposits recommended</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Spending History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Cumulative Spending Trend
          </h3>
          {spendingHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingHistory}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="spent"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">
              No spending data available yet
            </p>
          )}
        </div>

        {/* Proposal Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Proposal Status Distribution
          </h3>
          {proposals.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={proposalStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    value > 0 ? `${name}: ${value}` : ""
                  }
                  outerRadius={100}
                  dataKey="value"
                >
                  {proposalStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">
              No proposals created yet
            </p>
          )}
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Predictive Insights
        </h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <span className="text-2xl mr-3">📊</span>
            <p className="text-gray-700">
              At current spending rate, the treasury will last approximately{" "}
              <strong>
                {riskMetrics.runway > 365
                  ? "more than 1 year"
                  : `${Math.floor(riskMetrics.runway)} days (${(
                      riskMetrics.runway / 30
                    ).toFixed(1)} months)`}
              </strong>
            </p>
          </div>

          <div className="flex items-start">
            <span className="text-2xl mr-3">💡</span>
            <p className="text-gray-700">
              {riskMetrics.runway < 90
                ? "Recommended: Increase deposits or reduce spending to maintain at least 90 days runway"
                : "Treasury runway is healthy - continue monitoring spending patterns"}
            </p>
          </div>

          <div className="flex items-start">
            <span className="text-2xl mr-3">🎯</span>
            <p className="text-gray-700">
              Target treasury balance for 6 months runway:{" "}
              <strong>
                {(riskMetrics.spendingVelocity * 180).toFixed(4)} ETH
              </strong>
            </p>
          </div>

          {proposals.length > 0 && (
            <div className="flex items-start">
              <span className="text-2xl mr-3">📈</span>
              <p className="text-gray-700">
                Proposal execution rate:{" "}
                <strong>
                  {(
                    (proposals.filter((p) => p.executed).length /
                      proposals.length) *
                    100
                  ).toFixed(1)}
                  %
                </strong>{" "}
                ({proposals.filter((p) => p.executed).length} of{" "}
                {proposals.length} proposals executed)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          💼 Recommendations
        </h3>
        <ul className="space-y-2 text-blue-800">
          {riskMetrics.healthScore >= 80 && (
            <li>
              ✅ Treasury health is excellent - continue current practices
            </li>
          )}

          {riskMetrics.healthScore < 80 && riskMetrics.healthScore >= 50 && (
            <li>
              ⚠️ Consider implementing spending limits or increasing deposits
            </li>
          )}

          {riskMetrics.healthScore < 50 && (
            <li>
              🚨 Urgent action required - pause new proposals or increase
              funding immediately
            </li>
          )}

          {parseFloat(treasuryBalance) < 0.1 && (
            <li>💰 Encourage community members to deposit more funds</li>
          )}

          {riskMetrics.runway < 90 && (
            <li>
              📅 Runway below 90 days - prioritize essential proposals only
            </li>
          )}

          <li>
            📊 Regularly monitor these metrics to maintain treasury health
          </li>
        </ul>
      </div>
    </div>
  );
};

export default RiskAnalytics;
