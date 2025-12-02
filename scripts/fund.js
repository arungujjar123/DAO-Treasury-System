const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();

  const receiver = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

  await owner.sendTransaction({
    to: receiver,
    value: ethers.parseEther("1000"),
  });

  console.log("✅ Sent 1000 ETH to:", receiver);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
