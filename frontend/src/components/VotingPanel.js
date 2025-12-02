import React, { useState, useEffect } from "react";
import { useWeb3 } from "../hooks/useWeb3";
import {
  ContractHelper,
  formatAddress,
  formatDate,
  formatNumber,
  calculateTimeRemaining,
} from "../utils/contractHelpers";

const VotingPanel = () => {
  const { provider, signer, account } = useWeb3();
  const [contractHelper, setContractHelper] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState({});
  const [executing, setExecuting] = useState({});
  const [userVotingPower, setUserVotingPower] = useState("0");

  useEffect(() => {
    if (provider) {
      initializeContracts();
    }
  }, [provider, signer]);

  useEffect(() => {
    if (contractHelper && account) {
      loadData();
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

  const loadData = async () => {
    try {
      setLoading(true);

      const [proposalsData, votingPower] = await Promise.all([
        contractHelper.getAllProposals(),
        contractHelper.getVotingPower(account),
      ]);

      // Enrich proposals with voting data
      const enrichedProposals = await Promise.all(
        proposalsData.map(async (proposal) => {
          const [hasVoted, voteChoice, hasPassed] = await Promise.all([
            contractHelper.hasVoted(proposal.id, account).catch(() => false),
            contractHelper
              .hasVoted(proposal.id, account)
              .then((voted) =>
                voted
                  ? contractHelper.getVoteChoice(proposal.id, account)
                  : null
              )
              .catch(() => null),
            contractHelper.hasProposalPassed(proposal.id).catch(() => false),
          ]);

          return {
            ...proposal,
            hasVoted,
            voteChoice,
            hasPassed,
            isActive: new Date() <= proposal.deadline && !proposal.executed,
            canExecute:
              new Date() > proposal.deadline && hasPassed && !proposal.executed,
            timeRemaining: calculateTimeRemaining(proposal.deadline),
          };
        })
      );

      setProposals(enrichedProposals.reverse());
      setUserVotingPower(votingPower);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId, support) => {
    try {
      setVoting((prev) => ({ ...prev, [proposalId]: true }));
      const tx = await contractHelper.vote(proposalId, support);
      await tx.wait();

      await loadData(); // Refresh data
      alert(
        `Vote ${
          support ? "for" : "against"
        } proposal #${proposalId} submitted successfully!`
      );
    } catch (error) {
      console.error("Error voting:", error);
      alert("Error voting: " + error.message);
    } finally {
      setVoting((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const handleExecute = async (proposalId) => {
    try {
      setExecuting((prev) => ({ ...prev, [proposalId]: true }));
      const tx = await contractHelper.executeProposal(proposalId);
      await tx.wait();

      await loadData(); // Refresh data
      alert(`Proposal #${proposalId} executed successfully!`);
    } catch (error) {
      console.error("Error executing proposal:", error);
      alert("Error executing proposal: " + error.message);
    } finally {
      setExecuting((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const getProposalsByStatus = () => {
    const active = proposals.filter((p) => p.isActive);
    const canExecute = proposals.filter((p) => p.canExecute);
    const completed = proposals.filter(
      (p) => p.executed || (new Date() > p.deadline && !p.hasPassed)
    );

    return { active, canExecute, completed };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { active, canExecute, completed } = getProposalsByStatus();

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Voting Panel</h1>
        <p className="mt-2 text-gray-600">
          Participate in DAO governance by voting on proposals and executing
          approved ones.
        </p>
      </div>

      {/* Voting Power Display */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Your Voting Power
            </h2>
            <p className="text-gray-600">
              Your influence in governance decisions
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">
              {formatNumber(userVotingPower)}
            </p>
            <p className="text-sm text-gray-600">GOV Tokens</p>
          </div>
        </div>
        {parseFloat(userVotingPower) === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800">
              You need GOV tokens to participate in voting. Contact the DAO
              administrator to receive tokens.
            </p>
          </div>
        )}
      </div>

      {/* Active Proposals */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🗳️ Active Proposals
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {active.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Proposal #{proposal.id}
                    </h3>
                    <p className="text-gray-600 mb-3">{proposal.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <p className="font-semibold">
                          {formatNumber(proposal.amount)} ETH
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Recipient:</span>
                        <p className="font-mono">
                          {formatAddress(proposal.recipient)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Time Remaining:</span>
                        <p className="font-semibold text-orange-600">
                          {proposal.timeRemaining}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <p className="font-semibold text-green-600">Active</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voting Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Current Votes</span>
                    <span>
                      {formatNumber(
                        parseFloat(proposal.forVotes) +
                          parseFloat(proposal.againstVotes)
                      )}{" "}
                      total
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="w-12 text-sm font-medium text-green-600">
                        For:
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-3 mx-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              parseFloat(proposal.forVotes) +
                                parseFloat(proposal.againstVotes) >
                              0
                                ? (parseFloat(proposal.forVotes) /
                                    (parseFloat(proposal.forVotes) +
                                      parseFloat(proposal.againstVotes))) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="w-20 text-sm font-medium text-gray-600">
                        {formatNumber(proposal.forVotes)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-12 text-sm font-medium text-red-600">
                        Against:
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-3 mx-3">
                        <div
                          className="bg-red-500 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              parseFloat(proposal.forVotes) +
                                parseFloat(proposal.againstVotes) >
                              0
                                ? (parseFloat(proposal.againstVotes) /
                                    (parseFloat(proposal.forVotes) +
                                      parseFloat(proposal.againstVotes))) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="w-20 text-sm font-medium text-gray-600">
                        {formatNumber(proposal.againstVotes)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Voting Buttons */}
                <div className="flex space-x-3">
                  {proposal.hasVoted ? (
                    <div className="flex-1 p-3 bg-gray-100 rounded-md text-center">
                      <span className="text-gray-600">
                        You voted:{" "}
                        {proposal.voteChoice ? "✅ For" : "❌ Against"}
                      </span>
                    </div>
                  ) : parseFloat(userVotingPower) > 0 ? (
                    <>
                      <button
                        onClick={() => handleVote(proposal.id, true)}
                        disabled={voting[proposal.id]}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium transition-colors"
                      >
                        {voting[proposal.id] ? "Voting..." : "✅ Vote For"}
                      </button>
                      <button
                        onClick={() => handleVote(proposal.id, false)}
                        disabled={voting[proposal.id]}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium transition-colors"
                      >
                        {voting[proposal.id] ? "Voting..." : "❌ Vote Against"}
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 p-3 bg-yellow-100 rounded-md text-center">
                      <span className="text-yellow-800">
                        Need GOV tokens to vote
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ready to Execute */}
      {canExecute.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ⚡ Ready to Execute
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {canExecute.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Proposal #{proposal.id} - PASSED
                    </h3>
                    <p className="text-gray-600 mb-3">{proposal.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <p className="font-semibold text-green-600">
                          {formatNumber(proposal.amount)} ETH
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Recipient:</span>
                        <p className="font-mono">
                          {formatAddress(proposal.recipient)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Final Result:</span>
                        <p className="font-semibold text-green-600">
                          {formatNumber(proposal.forVotes)} For vs{" "}
                          {formatNumber(proposal.againstVotes)} Against
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleExecute(proposal.id)}
                  disabled={executing[proposal.id]}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium transition-colors"
                >
                  {executing[proposal.id]
                    ? "Executing..."
                    : "⚡ Execute Proposal"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Active Proposals */}
      {active.length === 0 && canExecute.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🗳️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Active Proposals
          </h2>
          <p className="text-gray-600 mb-6">
            There are currently no proposals available for voting or execution.
          </p>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("navigate", { detail: "proposals" })
              )
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
          >
            Create New Proposal
          </button>
        </div>
      )}

      {/* Completed Proposals Summary */}
      {completed.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📋 Recent History
          </h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl mb-2">✅</div>
                <p className="text-2xl font-bold text-green-600">
                  {completed.filter((p) => p.executed).length}
                </p>
                <p className="text-sm text-gray-600">Executed</p>
              </div>
              <div>
                <div className="text-3xl mb-2">❌</div>
                <p className="text-2xl font-bold text-red-600">
                  {completed.filter((p) => !p.executed && !p.hasPassed).length}
                </p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
              <div>
                <div className="text-3xl mb-2">📊</div>
                <p className="text-2xl font-bold text-blue-600">
                  {proposals.length}
                </p>
                <p className="text-sm text-gray-600">Total Proposals</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingPanel;
