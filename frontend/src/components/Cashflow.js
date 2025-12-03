import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../hooks/useWeb3";
import {
  loadContractABIs,
  loadContractAddresses,
} from "../utils/contractHelpers";

// Render a cashflow timeline from TreasuryDAO events
export default function Cashflow() {
  const { provider } = useWeb3();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!provider) {
      setLoading(false);
      return;
    }

    let daoContract;
    let pollHandle;

    const clearListeners = () => {
      if (daoContract) {
        daoContract.removeAllListeners("FundsDeposited");
        daoContract.removeAllListeners("ProposalExecuted");
      }
    };

    const cleanup = () => {
      clearListeners();
      if (pollHandle) {
        clearInterval(pollHandle);
      }
    };

    const refreshEvents = async () => {
      if (!daoContract) return;

      const net = await provider.getNetwork();
      const latest = await provider.getBlockNumber();
      const lookback = net.chainId === 31337 ? 5000 : 10000;
      const fromBlock = Math.max(latest - lookback, 0);

      const depositFilter = daoContract.filters.FundsDeposited();
      const executedFilter = daoContract.filters.ProposalExecuted();

      const [deposits, executions] = await Promise.all([
        daoContract.queryFilter(depositFilter, fromBlock, latest),
        daoContract.queryFilter(executedFilter, fromBlock, latest),
      ]);

      const normalize = async (log) => {
        try {
          const block = await provider.getBlock(log.blockNumber);
          const ts = new Date((block?.timestamp || 0) * 1000);
          const eventName = log.fragment?.name || log.eventName;

          if (eventName === "FundsDeposited") {
            const { depositor, amount } = log.args;
            return {
              id: `${log.transactionHash}-${log.logIndex}`,
              type: "inflow",
              title: "Deposit",
              address: depositor,
              amountEth: ethers.formatEther(amount),
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              timestamp: ts,
            };
          }
          if (eventName === "ProposalExecuted") {
            const { proposalId, recipient, amount } = log.args;
            return {
              id: `${log.transactionHash}-${log.logIndex}`,
              type: "outflow",
              title: `Proposal Executed #${proposalId.toString()}`,
              address: recipient,
              amountEth: ethers.formatEther(amount),
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              timestamp: ts,
            };
          }
        } catch (err) {
          console.error("Error normalizing log:", err, log);
        }
        return null;
      };

      const combined = [...deposits, ...executions];
      const normalized = (await Promise.all(combined.map(normalize)))
        .filter(Boolean)
        .sort((a, b) => b.blockNumber - a.blockNumber);

      setEvents(normalized);
    };

    async function init() {
      try {
        setLoading(true);
        setError("");

        await loadContractABIs();
        const addresses = await loadContractAddresses();
        if (!addresses?.treasuryDAO) {
          throw new Error("TreasuryDAO address missing");
        }

        const treasuryAbi = [
          "event FundsDeposited(address indexed depositor, uint256 amount)",
          "event ProposalExecuted(uint256 indexed proposalId, address indexed recipient, uint256 amount)",
        ];

        daoContract = new ethers.Contract(
          addresses.treasuryDAO,
          treasuryAbi,
          provider
        );

        await refreshEvents();

        const net = await provider.getNetwork();
        if (net.chainId === 31337) {
          const onDeposit = async (depositor, amount, evt) => {
            const block = await provider.getBlock(evt.blockNumber);
            setEvents((prev) => [
              {
                id: `${evt.transactionHash}-${evt.logIndex}`,
                type: "inflow",
                title: "Deposit",
                address: depositor,
                amountEth: ethers.formatEther(amount),
                txHash: evt.transactionHash,
                blockNumber: evt.blockNumber,
                timestamp: new Date(block.timestamp * 1000),
              },
              ...prev,
            ]);
          };

          const onExecuted = async (proposalId, recipient, amount, evt) => {
            const block = await provider.getBlock(evt.blockNumber);
            setEvents((prev) => [
              {
                id: `${evt.transactionHash}-${evt.logIndex}`,
                type: "outflow",
                title: `Proposal Executed #${proposalId.toString()}`,
                address: recipient,
                amountEth: ethers.formatEther(amount),
                txHash: evt.transactionHash,
                blockNumber: evt.blockNumber,
                timestamp: new Date(block.timestamp * 1000),
              },
              ...prev,
            ]);
          };

          daoContract.on("FundsDeposited", onDeposit);
          daoContract.on("ProposalExecuted", onExecuted);
        } else {
          pollHandle = setInterval(refreshEvents, 30000);
        }
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    init();
    return cleanup;
  }, [provider]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">💸 Cashflow Timeline</h2>
      {!provider && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-3 text-sm text-yellow-700">
          Please connect your wallet to view cashflow events.
        </div>
      )}
      {loading && <p>Loading events…</p>}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded mb-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {events.length === 0 && !loading && provider ? (
          <p className="text-gray-600">No recent cashflow events found.</p>
        ) : (
          events.map((e) => (
            <div
              key={e.id}
              className={`border rounded p-3 flex items-center justify-between ${
                e.type === "inflow"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div>
                <div className="font-medium">
                  {e.title} — {e.amountEth} ETH
                </div>
                <div className="text-xs text-gray-600">
                  {e.type === "inflow" ? "From" : "To"}: {e.address}
                </div>
                <div className="text-xs text-gray-500">
                  Block #{e.blockNumber} • {e.timestamp?.toLocaleString?.()}
                </div>
              </div>
              <a
                href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View Tx
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
