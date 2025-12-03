import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

export const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if wallet is already connected
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  const checkIfWalletIsConnected = async () => {
    console.log("🔍 [DEBUG] checkIfWalletIsConnected called");
    try {
      if (!window.ethereum) {
        console.log("❌ [DEBUG] window.ethereum not found");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length > 0) {
        console.log("✅ [DEBUG] Accounts found, initializing provider...");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();

        console.log(`[DEBUG] Auto-connected on network: ${network.chainId}`);

        const signer = await provider.getSigner();

        console.log("✅ [DEBUG] Setting state for auto-connected wallet");
        setAccount(accounts[0]);
        setProvider(provider);
        setSigner(signer);
        setChainId(network.chainId.toString());
        setIsConnected(true);
      } else {
        console.log("❌ [DEBUG] No accounts found");
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error checking wallet connection:", error);
    }
  };

  const connectWallet = async () => {
    console.log("🔗 [DEBUG] connectWallet called");
    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        console.error("❌ [DEBUG] MetaMask not installed");
        setError(
          "MetaMask extension is required to use this DAO. Please install MetaMask browser extension first."
        );
        return;
      }

      console.log("✅ [DEBUG] MetaMask detected, requesting accounts...");

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      console.log("✅ [DEBUG] Accounts received:", accounts);

      if (accounts.length === 0) {
        console.error("❌ [DEBUG] No accounts found");
        throw new Error("No accounts found. Please unlock MetaMask.");
      }

      console.log("🔧 [DEBUG] Creating ethers provider...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      // Support multiple networks: localhost (31337) and Sepolia (11155111)
      const supportedNetworks = {
        localhost: "31337",
        sepolia: "11155111",
      };

      const currentChainId = network.chainId.toString();
      const isSupported =
        Object.values(supportedNetworks).includes(currentChainId);

      // Only force network switch if not on a supported network
      if (!isSupported) {
        console.warn(
          `[DEBUG] Unsupported network detected. Current: ${currentChainId}`
        );
        console.warn(
          `[DEBUG] Supported networks: Localhost (31337), Sepolia (11155111)`
        );
        setError(
          `Please switch to Localhost (chainId: 31337) or Sepolia (chainId: 11155111) network in MetaMask.`
        );
        setLoading(false);
        return;
      }

      console.log(
        `✅ [DEBUG] Connected to supported network: ${currentChainId}`
      );
      // --- END OF NETWORK DETECTION LOGIC ---

      const signer = await provider.getSigner();

      console.log("✅ [DEBUG] Provider and signer created");
      console.log("   - Network:", {
        name: network.name,
        chainId: network.chainId.toString(),
        ensAddress: network.ensAddress,
      });
      console.log("   - Signer address:", await signer.getAddress());

      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
      setChainId(network.chainId.toString());
      setIsConnected(true);

      console.log("🎉 [DEBUG] Wallet connected successfully:", accounts[0]);
    } catch (error) {
      console.error("❌ [DEBUG] Error connecting wallet:", error);
      if (error.code !== 4001 && error.code !== 4902) {
        // Don't show error if user rejected or network not found
        console.log("   - Error code:", error.code);
        console.log("   - Error message:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setIsConnected(false);
    setError(null);
    console.log("Wallet disconnected");
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
      console.log("Account changed to:", accounts[0]);
    }
  };

  const handleChainChanged = (chainId) => {
    setChainId(chainId);
    // Reload the page to reset the dapp state
    window.location.reload();
  };

  const switchToNetwork = async (targetChainId) => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error) {
      console.error("Error switching network:", error);
      throw error;
    }
  };

  const getBalance = async (address = account) => {
    try {
      if (!provider || !address) return "0";

      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting balance:", error);
      return "0";
    }
  };

  const sendTransaction = async (to, value, data = "0x") => {
    try {
      if (!signer) throw new Error("Wallet not connected");

      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(value.toString()),
        data,
      });

      return tx;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  };

  return {
    account,
    provider,
    signer,
    isConnected,
    chainId,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    switchToNetwork,
    getBalance,
    sendTransaction,
  };
};
