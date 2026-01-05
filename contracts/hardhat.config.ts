import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    // mantle: {
    //   type: "http",
    //   url: "https://rpc.mantle.xyz", //mainnet
    //   accounts: [process.env.ACCOUNT_PRIVATE_KEY ?? ""],
    // },
    // mantleSepolia: {
    //   type: "http",
    //   url: "https://rpc.sepolia.mantle.xyz", // Sepolia Testnet
    //   accounts: [process.env.ACCOUNT_PRIVATE_KEY ?? ""],
    // },
  },
});
