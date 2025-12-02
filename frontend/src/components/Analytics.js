import React, { useState, useEffect } from "react";
import { useWeb3 } from "../hooks/useWeb3";
import { ContractHelper, formatNumber } from "../utils/contractHelpers";

const Analytics = () => {
  const { provider, signer, account } = useWeb3();
  const [contractHelper, setContractHelper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    treasuryBalance: "0",
    totalProposals: 0,
    executedProposals: 0,
    totalFundsAllocated: "0",
    averageProposalAmount: "0",
    participationRate: 0,
    proposals: [],
  });

  useEffect(() => {
    if (provider) {
      initializeContracts();
    }
  }, [provider, signer]);

  useEffect(() => {
    if (contractHelper) {
      loadAnalyticsData();
    }
  }, [contractHelper]);

  const initializeContracts = async () => {
    try {
      const helper = new ContractHelper(provider, signer);
      await helper.init();
      setContractHelper(helper);
    } catch (error) {
      console.error("Error initializing contracts:", error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      const [treasuryBalance, totalSupply, proposals] = await Promise.all([
        contractHelper.getTreasuryBalance(),
        contractHelper.getTotalSupply(),
        contractHelper.getAllProposals(),
      ]);

      // Calculate analytics
      const executedProposals = proposals.filter((p) => p.executed);
      const totalFundsAllocated = executedProposals
        .reduce((sum, p) => sum + parseFloat(p.amount), 0)
        .toString();

      const averageProposalAmount =
        proposals.length > 0
          ? (
              proposals.reduce((sum, p) => sum + parseFloat(p.amount), 0) /
              proposals.length
            ).toString()
          : "0";

      // Calculate participation rate (simplified - based on proposals with votes)
      const proposalsWithVotes = proposals.filter(
        (p) => parseFloat(p.forVotes) + parseFloat(p.againstVotes) > 0
      );
      const participationRate =
        proposals.length > 0
          ? (proposalsWithVotes.length / proposals.length) * 100
          : 0;

      setAnalyticsData({
        treasuryBalance,
        totalProposals: proposals.length,
        executedProposals: executedProposals.length,
        totalFundsAllocated,
        averageProposalAmount,
        participationRate,
        proposals,
      });
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProposalStatusBreakdown = () => {
    const { proposals } = analyticsData;
    const active = proposals.filter(
      (p) => new Date() <= p.deadline && !p.executed
    ).length;
    const executed = proposals.filter((p) => p.executed).length;
    const failed = proposals.filter(
      (p) => new Date() > p.deadline && !p.executed
    ).length;

    return { active, executed, failed };
  };

  const getMonthlyTrends = () => {
    const { proposals } = analyticsData;
    const monthlyData = {};

    proposals.forEach((proposal) => {
      const month = new Date(proposal.deadline).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

      if (!monthlyData[month]) {
        monthlyData[month] = {
          proposals: 0,
          fundsRequested: 0,
          fundsAllocated: 0,
        };
      }

      monthlyData[month].proposals += 1;
      monthlyData[month].fundsRequested += parseFloat(proposal.amount);

      if (proposal.executed) {
        monthlyData[month].fundsAllocated += parseFloat(proposal.amount);
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-6); // Last 6 months
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statusBreakdown = getProposalStatusBreakdown();
  const monthlyTrends = getMonthlyTrends();

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Analytics Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Comprehensive insights into DAO treasury performance and governance
          activity.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">💰</div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Treasury Balance
              </p>
              <p className="text-2xl font-semibold text-green-600">
                {formatNumber(analyticsData.treasuryBalance)} ETH
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📊</div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Proposals
              </p>
              <p className="text-2xl font-semibold text-blue-600">
                {analyticsData.totalProposals}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">✅</div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Executed Proposals
              </p>
              <p className="text-2xl font-semibold text-purple-600">
                {analyticsData.executedProposals}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📈</div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Participation Rate
              </p>
              <p className="text-2xl font-semibold text-orange-600">
                {formatNumber(analyticsData.participationRate)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Financial Summary
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Current Treasury:</span>
              <span className="font-semibold text-green-600">
                {formatNumber(analyticsData.treasuryBalance)} ETH
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Allocated:</span>
              <span className="font-semibold text-red-600">
                {formatNumber(analyticsData.totalFundsAllocated)} ETH
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Proposal:</span>
              <span className="font-semibold text-blue-600">
                {formatNumber(analyticsData.averageProposalAmount)} ETH
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Success Rate:</span>
              <span className="font-semibold text-purple-600">
                {analyticsData.totalProposals > 0
                  ? formatNumber(
                      (analyticsData.executedProposals /
                        analyticsData.totalProposals) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Proposal Status Breakdown
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-600">Executed</span>
              </div>
              <span className="font-semibold">{statusBreakdown.executed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-gray-600">Active</span>
              </div>
              <span className="font-semibold">{statusBreakdown.active}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                <span className="text-gray-600">Failed</span>
              </div>
              <span className="font-semibold">{statusBreakdown.failed}</span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="mt-6">
            <div className="flex h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="bg-green-500"
                style={{
                  width: `${
                    analyticsData.totalProposals > 0
                      ? (statusBreakdown.executed /
                          analyticsData.totalProposals) *
                        100
                      : 0
                  }%`,
                }}
              ></div>
              <div
                className="bg-blue-500"
                style={{
                  width: `${
                    analyticsData.totalProposals > 0
                      ? (statusBreakdown.active /
                          analyticsData.totalProposals) *
                        100
                      : 0
                  }%`,
                }}
              ></div>
              <div
                className="bg-red-500"
                style={{
                  width: `${
                    analyticsData.totalProposals > 0
                      ? (statusBreakdown.failed /
                          analyticsData.totalProposals) *
                        100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      {monthlyTrends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Monthly Trends (Last 6 Months)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proposals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested (ETH)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allocated (ETH)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyTrends.map(([month, data]) => (
                  <tr key={month}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.proposals}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(data.fundsRequested)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(data.fundsAllocated)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.proposals > 0
                        ? formatNumber(
                            (data.fundsAllocated / data.fundsRequested) * 100
                          )
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Proposals
        </h2>
        {analyticsData.proposals.length > 0 ? (
          <div className="space-y-4">
            {analyticsData.proposals.slice(0, 5).map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-gray-900">
                    Proposal #{proposal.id}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {proposal.description.slice(0, 100)}...
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">
                    {formatNumber(proposal.amount)} ETH
                  </p>
                  <p className="text-sm text-gray-500">
                    {proposal.executed
                      ? "✅ Executed"
                      : new Date() <= proposal.deadline
                      ? "🔄 Active"
                      : "❌ Failed"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-600">
              No proposals yet. Create the first one to start tracking
              analytics!
            </p>
          </div>
        )}
      </div>

      {/* Treasury Health Score */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Treasury Health Score
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-lg font-semibold text-green-600">
              {parseFloat(analyticsData.treasuryBalance) > 5
                ? "Healthy"
                : parseFloat(analyticsData.treasuryBalance) > 1
                ? "Moderate"
                : "Low"}
            </p>
            <p className="text-sm text-gray-600">Liquidity Status</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-lg font-semibold text-blue-600">
              {analyticsData.participationRate > 70
                ? "High"
                : analyticsData.participationRate > 40
                ? "Medium"
                : "Low"}
            </p>
            <p className="text-sm text-gray-600">Engagement Level</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-lg font-semibold text-purple-600">
              {analyticsData.totalProposals > 0 &&
              analyticsData.executedProposals / analyticsData.totalProposals >
                0.6
                ? "Efficient"
                : "Developing"}
            </p>
            <p className="text-sm text-gray-600">Governance Efficiency</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
