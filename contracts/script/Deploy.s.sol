// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {Manah} from "../src/Manah.sol";

/// @title Deploy Manah to Monad Testnet
/// @dev Run:
///      forge script script/Deploy.s.sol:DeployManah \
///          --rpc-url monad_testnet --broadcast --private-key $PRIVATE_KEY
contract DeployManah is Script {
    function run() external returns (Manah manah) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        manah = new Manah();
        console.log("Manah deployed to:", address(manah));
        console.log("ChainId:", block.chainid);

        vm.stopBroadcast();
    }
}
