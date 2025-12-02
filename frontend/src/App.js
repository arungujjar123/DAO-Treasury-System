import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import { useWeb3 } from "./hooks/useWeb3";
import Dashboard from "./components/Dashboard";
import ProposalCard from "./components/ProposalCard";
import VotingPanel from "./components/VotingPanel";
import Analytics from "./components/Analytics";
import BudgetPlanning from "./components/BudgetPlanning";
import RiskAnalytics from "./components/RiskAnalytics";

function App() {
  const {
    account,
    connectWallet,
    disconnectWallet,
    isConnected,
    error,
    loading,
  } = useWeb3();
  const [activeTab, setActiveTab] = useState("dashboard");

  const navigation = [
    { id: "dashboard", name: "Dashboard", component: Dashboard },
    { id: "proposals", name: "Proposals", component: ProposalCard },
    { id: "voting", name: "Voting", component: VotingPanel },
    { id: "budget", name: "Budget Planning", component: BudgetPlanning },
    { id: "risk", name: "Risk Analytics", component: RiskAnalytics },
    { id: "analytics", name: "Analytics", component: Analytics },
  ];

  const renderActiveComponent = () => {
    const activeNav = navigation.find((nav) => nav.id === activeTab);
    const Component = activeNav?.component || Dashboard;
    return <Component />;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="app-title">
                🏛️ DAO Treasury
              </h1>
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center space-x-4">
              {isConnected ? (
                <div className="flex items-center space-x-3">
                  <div className="wallet-info">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="btn-disconnect"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="btn-connect"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav-container">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="nav-tabs">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-tab ${
                  activeTab === item.id ? "active" : ""
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content fade-in">
        {isConnected ? (
          renderActiveComponent()
        ) : (
          <div className="connect-screen">
            <div className="connect-icon">
              <span>🔒</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              Connect Your Wallet
            </h2>
            <p className="text-lg text-white mb-8" style={{opacity: 0.9}}>
              Please connect your wallet to access the DAO Treasury Management
              System
            </p>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Connection Error
                    </h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                    <div className="mt-3">
                      <a
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Download MetaMask
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={connectWallet}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-md font-medium transition-colors"
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer mt-12">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>
              © 2025 DAO Treasury Management System. Built with ❤️ for
              decentralized governance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
