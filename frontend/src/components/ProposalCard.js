import React, { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../hooks/useWeb3";
import {
  ContractHelper,
  formatAddress,
  formatDate,
  formatNumber,
  calculateTimeRemaining,
} from "../utils/contractHelpers";
import { ethers } from "ethers";

const PROPOSAL_INITIATIVE_STORAGE_KEY = "dao-proposal-initiatives";

const readProposalInitiativeStore = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROPOSAL_INITIATIVE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("⚠️ Failed to read proposal initiative store:", error);
    return {};
  }
};

const writeProposalInitiativeStore = (data) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PROPOSAL_INITIATIVE_STORAGE_KEY,
      JSON.stringify(data)
    );
  } catch (error) {
    console.warn("⚠️ Failed to persist proposal initiative store:", error);
  }
};

const setProposalInitiativeMapping = (proposalId, payload) => {
  const store = readProposalInitiativeStore();
  store[proposalId] = payload;
  writeProposalInitiativeStore(store);
};

const getProposalInitiativeMapping = (proposalId) => {
  const store = readProposalInitiativeStore();
  return store[proposalId];
};

const clearProposalInitiativeMapping = (proposalId) => {
  const store = readProposalInitiativeStore();
  if (store[proposalId]) {
    delete store[proposalId];
    writeProposalInitiativeStore(store);
  }
};

const ProposalCard = ({ proposalPrefill, onPrefillConsumed }) => {
  const { provider, signer, account } = useWeb3();
  const [contractHelper, setContractHelper] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [budgetManager, setBudgetManager] = useState(null);
  const [pendingInitiative, setPendingInitiative] = useState(null);
  const [newProposal, setNewProposal] = useState({
    recipient: "",
    amount: "",
    description: "",
    durationValue: "3",
    durationUnit: "days",
  });

  const initializeContracts = useCallback(async () => {
    if (!provider) return;
    try {
      const helper = new ContractHelper(provider, signer);
      await helper.init();
      setContractHelper(helper);
    } catch (error) {
      console.error("Error initializing contracts:", error);
    }
  }, [provider, signer]);

  const initializeBudgetManager = useCallback(async () => {
    if (!signer) return;
    try {
      const [deploymentsRes, abisRes] = await Promise.all([
        fetch("/contracts/deployments.json"),
        fetch("/contracts/abis.json"),
      ]);
      if (!deploymentsRes.ok || !abisRes.ok) {
        console.error("Failed loading BudgetManager deployment data");
        return;
      }
      const deployments = await deploymentsRes.json();
      const abis = await abisRes.json();
      const contract = new ethers.Contract(
        deployments.budgetManager,
        abis.BudgetManager,
        signer
      );
      setBudgetManager(contract);
    } catch (error) {
      console.error("Error initializing BudgetManager for proposals:", error);
    }
  }, [signer]);

  const loadProposals = useCallback(async () => {
    if (!contractHelper) return;
    try {
      setLoading(true);
      const proposalsData = await contractHelper.getAllProposals();

      if (proposalsData.length === 0) {
        console.log("ℹ️ No proposals found");
        setProposals([]);
        return;
      }

      // Add additional data for each proposal
      const enrichedProposals = await Promise.all(
        proposalsData.map(async (proposal) => {
          const [hasVoted, hasPassed] = await Promise.all([
            contractHelper.hasVoted(proposal.id, account).catch(() => false),
            contractHelper.hasProposalPassed(proposal.id).catch(() => false),
          ]);

          return {
            ...proposal,
            hasVoted,
            hasPassed,
            isActive: new Date() <= proposal.deadline && !proposal.executed,
            timeRemaining: calculateTimeRemaining(proposal.deadline),
          };
        })
      );

      setProposals(enrichedProposals.reverse()); // Show newest first
    } catch (error) {
      console.warn("⚠️ Error loading proposals:", error.message);
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [contractHelper, account]);

  useEffect(() => {
    if (provider) {
      initializeContracts();
    }
  }, [provider, initializeContracts]);

  useEffect(() => {
    if (signer) {
      initializeBudgetManager();
    }
  }, [signer, initializeBudgetManager]);

  useEffect(() => {
    if (contractHelper) {
      loadProposals();
    }
  }, [contractHelper, loadProposals]);

  useEffect(() => {
    if (proposalPrefill && proposalPrefill.recipient) {
      setShowCreateForm(true);
      setNewProposal((prev) => ({
        ...prev,
        recipient: proposalPrefill.recipient || prev.recipient,
        amount: proposalPrefill.amount || prev.amount,
        description:
          proposalPrefill.description ||
          `Fund initiative ${proposalPrefill.initiativeName || ""}`,
      }));
      setPendingInitiative({ ...proposalPrefill });
      onPrefillConsumed?.();
    }
  }, [proposalPrefill, onPrefillConsumed]);

  const handleCreateProposal = async () => {
    console.log("📝 [DEBUG] handleCreateProposal called");
    console.log("   - Form data:", newProposal);

    if (
      !newProposal.recipient ||
      !newProposal.amount ||
      !newProposal.description
    ) {
      console.error("❌ [DEBUG] Missing required fields");
      alert("Please fill in all fields");
      return;
    }

    console.log("✅ [DEBUG] All fields filled, proceeding...");

    try {
      setCreating(true);
      console.log("🔧 [DEBUG] Calling contractHelper.createProposal...");

      const unitMap = {
        minutes: 60,
        hours: 60 * 60,
        days: 60 * 60 * 24,
      };
      const unitSeconds = unitMap[newProposal.durationUnit] || 0;
      let durationSeconds =
        parseFloat(newProposal.durationValue || "0") * unitSeconds;
      if (Number.isNaN(durationSeconds) || durationSeconds <= 0) {
        durationSeconds = 0; // fallback to contract default
      } else {
        const MIN_DURATION = 60;
        const MAX_DURATION = 60 * 60 * 24 * 30;
        durationSeconds = Math.max(
          MIN_DURATION,
          Math.min(MAX_DURATION, Math.floor(durationSeconds))
        );
      }

      const tx = await contractHelper.createProposal(
        newProposal.recipient,
        newProposal.amount,
        newProposal.description,
        Math.floor(durationSeconds)
      );

      console.log("✅ [DEBUG] Transaction object received:", tx);
      console.log("   - Hash:", tx.hash);
      console.log("   - Waiting for confirmation...");

      const receipt = await tx.wait();

      console.log("🎉 [DEBUG] Transaction confirmed!");
      console.log("   - Receipt:", {
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status,
        logs: receipt.logs?.length,
      });

      if (budgetManager && pendingInitiative) {
        try {
          const latestId = await contractHelper.getProposalCount();
          const proposalId = Number(latestId);
          await linkInitiativeToProposal(proposalId);
          setProposalInitiativeMapping(proposalId, {
            initiativeId: pendingInitiative.initiativeId,
            category: pendingInitiative.category,
            budgetId: pendingInitiative.budgetId || null,
          });
        } catch (linkError) {
          console.error("⚠️ Failed to link initiative:", linkError);
        }
      }

      // Reset form and refresh proposals
      console.log("🔄 [DEBUG] Resetting form and reloading proposals...");
      setNewProposal({
        recipient: "",
        amount: "",
        description: "",
        durationValue: "3",
        durationUnit: "days",
      });
      setShowCreateForm(false);
      await loadProposals();

      console.log("✅ [DEBUG] Proposal creation completed successfully");
      alert("Proposal created successfully!");
    } catch (error) {
      console.error("❌ [DEBUG] Error creating proposal:", error);
      console.log("   - Error name:", error.name);
      console.log("   - Error code:", error.code);
      console.log("   - Error message:", error.message);
      console.log("   - Error stack:", error.stack);

      // Check for specific error types
      if (error.code === 4001) {
        console.log("👤 [DEBUG] User rejected transaction");
        alert("Transaction was rejected by user");
      } else if (error.code === -32000) {
        console.log("💰 [DEBUG] Insufficient funds");
        alert("Insufficient funds for transaction");
      } else if (error.message.includes("Invalid recipient address")) {
        console.log("📍 [DEBUG] Invalid address format");
        alert("Invalid recipient address format");
      } else {
        console.log("🔍 [DEBUG] Other error - check console for details");
        alert("Error creating proposal: " + error.message);
      }
    } finally {
      setCreating(false);
      console.log("🏁 [DEBUG] handleCreateProposal finished");
    }
  };

  const handleExecuteProposal = async (proposalId) => {
    try {
      console.log("🚀 Executing proposal:", proposalId);
      const tx = await contractHelper.executeProposal(proposalId);
      console.log("⏳ Waiting for confirmation...");
      await tx.wait();
      console.log("✅ Proposal executed successfully!");
      await syncBudgetAfterExecution(proposalId);
      alert("Proposal executed successfully!");
      await loadProposals(); // Refresh proposals
    } catch (error) {
      console.error("❌ Error executing proposal:", error);
      alert("Error executing proposal: " + error.message);
    }
  };

  const linkInitiativeToProposal = async (proposalId) => {
    if (!budgetManager || !pendingInitiative) return;
    try {
      const tx = await budgetManager.linkToProposal(
        pendingInitiative.initiativeId,
        proposalId
      );
      await tx.wait();
      console.log(
        `🔗 Initiative ${pendingInitiative.initiativeId} linked to proposal ${proposalId}`
      );
      setPendingInitiative(null);
    } catch (error) {
      console.error("⚠️ Failed to link initiative to proposal:", error);
    }
  };

  const syncBudgetAfterExecution = async (proposalId) => {
    if (!budgetManager) return;
    try {
      let initiativeMeta = getProposalInitiativeMapping(proposalId);

      if (!initiativeMeta) {
        initiativeMeta = await findInitiativeByProposal(proposalId);
      }

      if (!initiativeMeta) {
        console.log(
          "ℹ️ No initiative linked to this proposal, skipping budget sync"
        );
        return;
      }

      if (initiativeMeta.funded) {
        console.log("ℹ️ Initiative already funded");
        clearProposalInitiativeMapping(proposalId);
        return;
      }

      let budgetId = initiativeMeta.budgetId;
      if (!budgetId || budgetId === 0) {
        const activeBudgetId = await budgetManager.getActiveBudgetForCategory(
          initiativeMeta.category
        );
        budgetId = Number(activeBudgetId);
      }

      const tx = await budgetManager.markInitiativeFunded(
        initiativeMeta.initiativeId || initiativeMeta.id,
        budgetId || 0
      );
      await tx.wait();
      clearProposalInitiativeMapping(proposalId);
      console.log("💸 Budget updated for initiative", initiativeMeta);
    } catch (error) {
      console.error("⚠️ Failed to sync budget after execution:", error);
    } finally {
    }
  };

  const findInitiativeByProposal = async (proposalId) => {
    try {
      const total = await budgetManager.initiativeCount();
      for (let i = 1; i <= Number(total); i++) {
        const initiative = await budgetManager.getInitiative(i);
        if (Number(initiative[9]) === Number(proposalId)) {
          return {
            id: Number(initiative[0]),
            initiativeId: Number(initiative[0]),
            category: initiative[2],
            budgetId: null,
            funded: initiative[8],
            proposalId: Number(initiative[9]),
          };
        }
      }
    } catch (error) {
      console.error("⚠️ Failed to search initiatives by proposal:", error);
    }
    return null;
  };

  const getStatusBadge = (proposal) => {
    if (proposal.executed) {
      return (
        <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
          Executed
        </span>
      );
    }
    if (new Date() > proposal.deadline) {
      if (proposal.hasPassed) {
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
            Ready to Execute
          </span>
        );
      } else {
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
            Failed
          </span>
        );
      }
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
        Active
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
          <p className="mt-2 text-gray-600">
            Create and manage funding proposals for the DAO treasury.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          {showCreateForm ? "Cancel" : "Create Proposal"}
        </button>
      </div>

      {/* Create Proposal Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create New Proposal
          </h2>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label
                htmlFor="recipient"
                className="block text-sm font-medium text-gray-700"
              >
                Recipient Address
              </label>
              <input
                type="text"
                id="recipient"
                value={newProposal.recipient}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("📝 [DEBUG] Recipient input changed:", value);
                  setNewProposal({ ...newProposal, recipient: value });
                }}
                placeholder="0x..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700"
              >
                Amount (ETH)
              </label>
              <input
                type="number"
                id="amount"
                value={newProposal.amount}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("💰 [DEBUG] Amount input changed:", value);
                  setNewProposal({ ...newProposal, amount: value });
                }}
                placeholder="1.0"
                step="0.01"
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={newProposal.description}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("📄 [DEBUG] Description input changed:", value);
                  setNewProposal({
                    ...newProposal,
                    description: value,
                  });
                }}
                placeholder="Describe the purpose of this funding request..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Voting Duration
              </label>
              <div className="mt-1 grid grid-cols-3 gap-3">
                <input
                  type="number"
                  min="1"
                  id="durationValue"
                  value={newProposal.durationValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log("⏱️ [DEBUG] Duration value changed:", value);
                    setNewProposal({ ...newProposal, durationValue: value });
                  }}
                  className="col-span-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <select
                  id="durationUnit"
                  value={newProposal.durationUnit}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log("⏱️ [DEBUG] Duration unit changed:", value);
                    setNewProposal({ ...newProposal, durationUnit: value });
                  }}
                  className="col-span-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Default is 3 days. Minimum 1 minute, maximum 30 days.
              </p>
            </div>
            <button
              onClick={() => {
                console.log("🔘 [DEBUG] Create Proposal button clicked");
                handleCreateProposal();
              }}
              disabled={creating}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              {creating ? "Creating..." : "Create Proposal"}
            </button>
          </div>
        </div>
      )}

      {/* Proposals List */}
      {proposals.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">📋</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Proposals Yet
          </h2>
          <p className="text-gray-600 mb-6">
            Be the first to create a proposal for the DAO treasury!
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
          >
            Create First Proposal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Proposal #{proposal.id}
                    </h3>
                    {getStatusBadge(proposal)}
                  </div>
                  <p className="text-gray-600">{proposal.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(proposal.amount)} ETH
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Recipient:</p>
                  <p className="font-mono text-sm">
                    {formatAddress(proposal.recipient)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Proposer:</p>
                  <p className="font-mono text-sm">
                    {formatAddress(proposal.proposer)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Deadline:</p>
                  <p className="text-sm">{formatDate(proposal.deadline)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status:</p>
                  <p className="text-sm">{proposal.timeRemaining}</p>
                </div>
              </div>

              {/* Voting Results */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Voting Results</span>
                  <span>
                    {formatNumber(
                      parseFloat(proposal.forVotes) +
                        parseFloat(proposal.againstVotes)
                    )}{" "}
                    total votes
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="w-12 text-sm text-green-600">For:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
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
                    <span className="w-16 text-sm text-gray-600">
                      {formatNumber(proposal.forVotes)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-12 text-sm text-red-600">Against:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
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
                    <span className="w-16 text-sm text-gray-600">
                      {formatNumber(proposal.againstVotes)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {proposal.isActive && (
                  <button
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("voteOnProposal", {
                          detail: proposal.id,
                        })
                      )
                    }
                    disabled={proposal.hasVoted}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                  >
                    {proposal.hasVoted ? "Already Voted" : "Vote"}
                  </button>
                )}
                {!proposal.executed &&
                  new Date() > proposal.deadline &&
                  proposal.hasPassed && (
                    <button
                      onClick={() => handleExecuteProposal(proposal.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                    >
                      Execute Proposal
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProposalCard;
