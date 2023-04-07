import { Button, Input, Upload, Divider, List, Radio, RadioChangeEvent, Modal, message, InputNumber } from 'antd';
import React, { useEffect, useState } from 'react'
import { SHA3 } from "sha3";
var fcl = require('@onflow/fcl');
var ec = require('elliptic').ec;

export default function MintToken() {
    const [priKey, setPriKey] = useState("");
    const [flowAddr, setFlowAddr] = useState("");
    const [modal2Open, setModal2Open] = useState(false);
    const [networkType, setNetworkType] = useState(1);
    const [modalContent, setModalContent] = useState("");
    const [txInfo, setTxInfo] = useState(new Array<string>());
    const [mintAmount, setMintAmount] = useState(0.0);
    const [cadence, setCadence] = useState("");

    const flowTokenTestnet = "0x7e60df042a9c0868";
    const flowTokenMainnet = "0x1654653399040a61";
    const rumbleTokenTestnet = "0xa5e9977792ad9c12";
    const rumbleTokenMainnet = "";
    const fungibleTokenTestnet = "0x9a0766d93b6608b7";
    const fungibleTokenMainnet = "0xf233dcee88fe0abe";
    const metaViewTestnet = "0x631e88ae7f1d7c20";
    const metaViewMainnet = "0x1d7e57aa55817448";

    if (networkType == 1) {
        fcl.config({
            "accessNode.api": "https://rest-testnet.onflow.org",
            "flow.network": "testnet",
            "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
            "discovery.authn.endpoint": "https://fcl-discovery.onflow.org/api/testnet/authn"
        });
    }

    const changeAddress = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFlowAddr(e.target.value);
    }

    const hashMessageHex = (msgHex: any) => {
        const sha = new SHA3(256);
        sha.update(Buffer.from(msgHex, "hex"));
        return sha.digest();
    };

    const signWithKey = (privateKey: any, msgHex: any) => {
        const curve = new ec('p256');
        const key = curve.keyFromPrivate(Buffer.from(privateKey, "hex"));
        const sig = key.sign(hashMessageHex(msgHex));
        const n = 32;
        const r = sig.r.toArrayLike(Buffer, "be", n);
        const s = sig.s.toArrayLike(Buffer, "be", n);
        return Buffer.concat([r, s]).toString("hex");
    };

    const signer = async (account: any) => {
        // We are hard coding these values here, but you can pass those values from outside as well.
        // For example, you can create curried function:
        // const signer = (keyId, accountAdddress, pkey) => (accouint) => {...}
        // and then create multiple signers for different key indices

        const keyId = 0;

        // authorization function need to return an account
        return {
            ...account, // bunch of defaults in here, we want to overload some of them though
            tempId: `${flowAddr}-${keyId}`, // tempIds are more of an advanced topic, for 99% of the times where you know the address and keyId you will want it to be a unique string per that address and keyId
            addr: fcl.sansPrefix(flowAddr), // the address of the signatory, currently it needs to be without a prefix right now
            keyId: Number(keyId), // this is the keyId for the accounts registered key that will be used to sign, make extra sure this is a number and not a string

            // This is where magic happens! ✨
            signingFunction: async (signable: any) => {
                // Singing functions are passed a signable and need to return a composite signature
                // signable.message is a hex string of what needs to be signed.
                const signature = await signWithKey(priKey, signable.message);
                return {
                    addr: fcl.withPrefix(flowAddr), // needs to be the same as the account.addr but this time with a prefix, eventually they will both be with a prefix
                    keyId: Number(keyId), // needs to be the same as account.keyId, once again make sure its a number and not a string
                    signature // this needs to be a hex string of the signature, where signable.message is the hex value that needs to be signed
                };
            }
        };
    };

    const authRumbleContract = async () => {
        console.log("EXEC")
        let info: any = [];
        info.push(`Signing Transaction`);
        setTxInfo([...info]);

        const args = (arg: any, t: any) => [fcl.arg(
            flowAddr,
            fcl.t.Address
        )];

        const authScript = `
           import Rumble from ${networkType == 1 ? rumbleTokenTestnet : rumbleTokenMainnet}
           import FungibleToken from ${networkType == 1 ? fungibleTokenTestnet : fungibleTokenMainnet}
           import MetadataViews from ${networkType == 1 ? metaViewTestnet : metaViewMainnet}
           import TokenManager from ${networkType == 1 ? rumbleTokenTestnet : rumbleTokenMainnet}

           transaction() {

              prepare(signer: AuthAccount) {
                 if signer.borrow<&Rumble.Vault>(from: Rumble.VaultStoragePath) == nil {
                    signer.save(<- Rumble.createEmptyVault(), to: Rumble.VaultStoragePath)
                    signer.link<&Rumble.Vault{FungibleToken.Receiver}>(Rumble.ReceiverPublicPath,target: Rumble.VaultStoragePath)
                    signer.link<&Rumble.Vault{FungibleToken.Balance}>(Rumble.VaultPublicPath, target: Rumble.VaultStoragePath)
                 }

                 if signer.borrow<&TokenManager.LockedVault>(from: TokenManager.VaultStoragePath) == nil {
                    signer.save(<- TokenManager.createEmptyVault(), to: TokenManager.VaultStoragePath)
                    signer.link<&TokenManager.LockedVault{TokenManager.Public}>(TokenManager.VaultPublicPath,target: TokenManager.VaultStoragePath)
                 }
              }

              execute {
        
              }
           }
        `;

        const proposer = signer;
        const payer = signer;
        const authorizations = [signer];

        try {
            // "mutate" method will return us transaction id
            const txId = await fcl.mutate({
                cadence: authScript,
                proposer,
                payer,
                authorizations,
                limit: 999
            });

            info.push(`Submitted transaction ${txId} to the network`);
            setTxInfo([...info]);
            info.push(`Waiting for transaction to be sealed...`);
            setTxInfo([...info]);

            const label = `Transaction is sealing`;
            info.push(label + ` - ` + (new Date().toJSON()));
            setTxInfo([...info]);
            // We will use transaction id in order to "subscribe" to it's state change and get the details
            // of the transaction
            //console.time(label);
            const txDetails = await fcl.tx(txId).onceSealed();
            info.push(`Transaction is Sealed - ` + (new Date().toJSON()));
            setTxInfo([...info]);
            if (networkType === 1) {
                info.push(`Please check transaction status: https://flow-view-source.com/testnet/tx/${txId}`);
            } else {
                info.push(`Please check transaction status: https://flow-view-source.com/mainnet/tx/${txId}`);
            }

            //console.timeEnd(label);
            setTxInfo([...info]);

            return txDetails;
        }
        catch (ex) {
            console.log(ex);
            info.push(`Transaction fail!`);
            setTxInfo([...info]);
        }
    };

    const executeTransaction = async () => {
        let info: any = [];
        info.push(`Signing Transaction`);
        setTxInfo([...info]);

        // List of arguments
        /* const jsonObj = JSON.parse(addresses);

        const args = (arg: any, t: any) => [fcl.arg(
            jsonObj,
            fcl.t.Dictionary({ key: fcl.t.Address, value: fcl.t.UFix64 })
        )]; */
        const args = (arg: any, t: any) => [];

        const proposer = signer;
        const payer = signer;
        const authorizations = [signer];

        try {
            // "mutate" method will return us transaction id
            const txId = await fcl.mutate({
                cadence,
                args,
                proposer,
                payer,
                authorizations,
                limit: 999
            });

            info.push(`Submitted transaction ${txId} to the network`);
            setTxInfo([...info]);
            info.push(`Waiting for transaction to be sealed...`);
            setTxInfo([...info]);

            const label = `Transaction is sealing`;
            info.push(label + ` - ` + (new Date().toJSON()));
            setTxInfo([...info]);
            // We will use transaction id in order to "subscribe" to it's state change and get the details
            // of the transaction
            //console.time(label);
            const txDetails = await fcl.tx(txId).onceSealed();
            info.push(`Transaction is Sealed - ` + (new Date().toJSON()));
            setTxInfo([...info]);
            if (networkType === 1) {
                info.push(`Please check transaction status: https://flow-view-source.com/testnet/tx/${txId}`);
            } else {
                info.push(`Please check transaction status: https://flow-view-source.com/mainnet/tx/${txId}`);
            }

            //console.timeEnd(label);
            setTxInfo([...info]);

            return txDetails;
        }
        catch (ex) {
            console.log(ex);
            info.push(`Transaction fail!`);
            setTxInfo([...info]);
        }
    };

    return (
        <>
            <Divider orientation="left" orientationMargin="0"><span style={{ fontWeight: 'bold' }}>Configs</span></Divider>
            <Radio.Group onChange={(e: RadioChangeEvent) => {
                setNetworkType(e.target.value);
                if (e.target.value === 1) {
                    fcl.config({
                        "accessNode.api": "https://rest-testnet.onflow.org",
                        "flow.network": "testnet",
                        "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
                        "discovery.authn.endpoint": "https://fcl-discovery.onflow.org/api/testnet/authn"
                    });
                } else if (e.target.value === 2) {
                    fcl.config({
                        "accessNode.api": "https://rest-mainnet.onflow.org",
                        "flow.network": "mainnet",
                        "discovery.wallet": "https://fcl-discovery.onflow.org/mainnet/authn",
                        "discovery.authn.endpoint": "https://fcl-discovery.onflow.org/api/mainnet/authn"
                    });
                }
            }} value={networkType}>
                <Radio value={1}>Testnet</Radio>
                <Radio value={2}>Mainnet</Radio>
            </Radio.Group><br /><br />
            <Divider orientation="left" orientationMargin="0"><span style={{ fontWeight: 'bold' }}>FLOW Sender Address</span></Divider>
            <span style={{ marginRight: 20 }}>FLOW Address:</span>
            <Input style={{ width: 200 }} placeholder="Please input your flow address" value={flowAddr}
                onChange={changeAddress} /><span style={{ marginLeft: 10 }}>e.g. 0x6aa2222bb22b222b</span>
            <Button type="primary" style={{ marginLeft: 10 }} onClick={() => {
                if (networkType === 2) {
                    setModalContent("Mainnet is not ready!");
                    setModal2Open(true);
                } else {
                    if ((priKey !== null && priKey !== "") &&
                        (flowAddr !== null && flowAddr !== "")
                    ) {
                        if (networkType === 2) {
                            setModalContent("Mainnet is not ready!");
                            setModal2Open(true);
                        } else {
                            authRumbleContract();
                        }
                    } else {
                        setModalContent("Please input FLOW sender address and private key.");
                        setModal2Open(true);
                    }

                }
            }}>
                Connect to contract
            </Button>
            <br /><br />
            <div>
                <span style={{ marginRight: 20 }}>Private Key:</span>
                <Input style={{ width: 450 }} placeholder="Please input your private key" value={priKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setPriKey(e.target.value) }} /><br />
            </div>
            <Divider orientation="left" orientationMargin="0"><span style={{ fontWeight: 'bold' }}>Transaction</span></Divider>
            <br />
            <Input style={{ width: 150 }} placeholder="How many Rumble tokens wants to mint." value={mintAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setMintAmount(parseInt(e.target.value)) }} />
            <InputNumber
                style={{ width: 200 }}
                placeholder="How many Rumble tokens wants to mint." value={mintAmount}
                defaultValue={1.00000000}
                min={0}
                max={10000000}
                step={0.00000001}
                onChange={(value: number | null) => {
                    if (value !== null) {
                        setMintAmount(value);
                    }
                }}
            />
            <Button type="primary" onClick={() => {
                if ((priKey !== null && priKey !== "") &&
                    (flowAddr !== null && flowAddr !== "")
                ) {
                    if (networkType === 2) {
                        setModalContent("Mainnet is not ready!");
                        setModal2Open(true);
                    } else {
                        (async () => {
                            console.clear();
                            const txDetails = await executeTransaction();
                            console.log({ txDetails });
                        })();
                    }
                } else {
                    setModalContent("Please input FLOW sender address and private key and receivers.");
                    setModal2Open(true);
                }
            }}>
                Mint Tokens
            </Button>
            <br /><br />
            <List
                bordered
                dataSource={txInfo}
                renderItem={(item) => (
                    <List.Item>
                        {item}
                    </List.Item>
                )}
            />
            <Modal
                title="Warning!"
                centered
                open={modal2Open}
                onOk={() => setModal2Open(false)}
            >
                <p>{modalContent}</p>
            </Modal>
        </>
    );
}