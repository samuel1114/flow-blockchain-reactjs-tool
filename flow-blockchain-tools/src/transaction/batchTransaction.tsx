import { Button, Input, Upload, Divider, List, Radio, RadioChangeEvent, Modal, message } from 'antd';
import React, { useEffect, useState } from 'react'
import { UploadOutlined } from '@ant-design/icons';
import { SHA3 } from "sha3";
var fcl = require('@onflow/fcl');
var ec = require('elliptic').ec;

export default function BatchTransaction() {
    const [pubKey, setPubKey] = useState("");
    const [priKey, setPriKey] = useState("");
    const [flowAddr, setFlowAddr] = useState("");
    const [addresses, setAddresses] = useState("");
    const [txInfo, setTxInfo] = useState(new Array<string>());
    const [addressType, setAddressType] = useState(1);
    const [modal2Open, setModal2Open] = useState(false);
    const [networkType, setNetworkType] = useState(1);
    const [tokenType, setTokenType] = useState("FLOW");
    const [cadence, setCadence] = useState("");
    const [modalContent, setModalContent] = useState("");
    const [messageApi, contextHolder] = message.useMessage();

    const flowTokenTestnet = "0x7e60df042a9c0868";
    const flowTokenMainnet = "0x1654653399040a61";
    const rumbleTokenTestnet = "0xa5e9977792ad9c12";
    const rumbleTokenMainnet = "0x078f3716ca07719a";
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

    const setCdcScript = (token: string) => {
        if (token === "FLOW") {
            setCadence(`
                import FlowToken from ${networkType == 1 ? flowTokenTestnet : flowTokenMainnet}
                import FungibleToken from ${networkType == 1 ? fungibleTokenTestnet : fungibleTokenMainnet}
                
                transaction(addressAmountMap: {Address: UFix64}) {
                
                    // The Vault resource that holds the tokens that are being transferred
                    let vaultRef: &FlowToken.Vault
                
                    prepare(signer: AuthAccount) {
                
                        // Get a reference to the signer's stored vault
                        self.vaultRef = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                            ?? panic("Could not borrow reference to the owner's Vault!")
                    }
                
                    execute {
                
                        for address in addressAmountMap.keys {
                
                            // Withdraw tokens from the signer's stored vault
                            let sentVault <- self.vaultRef.withdraw(amount: addressAmountMap[address]!)
                
                            // Get the recipient's public account object
                            let recipient = getAccount(address)
                
                            // Get a reference to the recipient's Receiver
                            let receiverRef = recipient.getCapability(/public/flowTokenReceiver)
                                .borrow<&{FungibleToken.Receiver}>()
                                ?? panic("Could not borrow receiver reference to the recipient's Vault")
                
                            // Deposit the withdrawn tokens in the recipient's receiver
                            receiverRef.deposit(from: <-sentVault)
                
                        }
                    }
                }
                `);
        }
        else if (token === "RUMBLE") {
            setCadence(`
               import Rumble from ${networkType == 1 ? rumbleTokenTestnet : rumbleTokenMainnet}
               import FungibleToken from ${networkType == 1 ? fungibleTokenTestnet : fungibleTokenMainnet}
               transaction(addressAmountMap: {Address: UFix64}) {

                  // The Vault resource that holds the tokens that are being transferred
                  let vaultRef: &Rumble.Vault
            
                  prepare(signer: AuthAccount) {
            
                      // Get a reference to the signer's stored vault
                      self.vaultRef = signer.borrow<&Rumble.Vault>(from: Rumble.VaultStoragePath)
                          ?? panic("Could not borrow reference to the owner's Vault!")
                  }
            
                  execute {
             
                      for address in addressAmountMap.keys {
            
                          // Withdraw tokens from the signer's stored vault
                          let sentVault <- self.vaultRef.withdraw(amount: addressAmountMap[address]!)
            
                          // Get the recipient's public account object
                          let recipient = getAccount(address)
            
                          // Get a reference to the recipient's Receiver
                          let receiverRef = recipient.getCapability(Rumble.ReceiverPublicPath)
                              .borrow<&{FungibleToken.Receiver}>()
                              ?? panic("Could not borrow receiver reference to the recipient's Vault")
            
                          // Deposit the withdrawn tokens in the recipient's receiver
                          receiverRef.deposit(from: <-sentVault)
            
                      }
                  }
              }
            `);
        }
    }

    useEffect(() => {
        setCdcScript(tokenType);
    });

    const changeAddress = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFlowAddr(e.target.value);
    }

    const generateKeyPair = () => {
        const ecService = new ec('p256');
        const key = ecService.genKeyPair();
        let publicKey = key.getPublic('hex').toString();
        publicKey = publicKey.substring(2);
        setPubKey(publicKey);
        let privateKey = key.getPrivate('hex').toString();
        setPriKey(privateKey);
    }

    /*const generateKeyPair = () => {
        for (let i = 0; i < 2; i ++) 
        {
            const ecService = new ec('p256');
            const key = ecService.genKeyPair();
            let publicKey = key.getPublic('hex').toString();
            publicKey = publicKey.substring(2);
            let privateKey = key.getPrivate('hex').toString();
            console.log(publicKey, privateKey, "flow accounts create --key " + publicKey);
        }
    }*/

    const beforeUpload = (file: any) => {
        if (file != null && file.error == null) {
            const reader = new FileReader();

            reader.onload = (e: any) => {
                var textFromFileLoaded = e.target.result;
                setAddresses(textFromFileLoaded);
            };

            reader.readAsText(file);
        }

        return false;
    };

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
        const jsonObj = JSON.parse(addresses);

        const args = (arg: any, t: any) => [fcl.arg(
            jsonObj,
            fcl.t.Dictionary({ key: fcl.t.Address, value: fcl.t.UFix64 })
        )];

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
            <Radio.Group onChange={(e: RadioChangeEvent) => {
                setTokenType(e.target.value);
                setCdcScript(e.target.value);
            }} value={tokenType}>
                <Radio value={"FLOW"}>$FLOW</Radio>
                <Radio value={"RUMBLE"}>$RUMB</Radio>
            </Radio.Group>
            <br />
            <Divider orientation="left" orientationMargin="0"><span style={{ fontWeight: 'bold' }}>FLOW Sender Address</span></Divider>
            <span style={{ marginRight: 20 }}>FLOW Address:</span>
            <Input style={{ width: 200 }} placeholder="Please input your flow address" value={flowAddr}
                onChange={changeAddress} /><span style={{ marginLeft: 10 }}>e.g. 0x6aa2222bb22b222b</span>
            {
                (tokenType === "RUMBLE") ?
                    <Button type="primary" style={{ marginLeft: 10 }} onClick={() => {
                        if ((priKey !== null && priKey !== "") &&
                            (flowAddr !== null && flowAddr !== "")
                        ) {
                            authRumbleContract();
                        } else {
                            setModalContent("Please input FLOW sender address and private key.");
                            setModal2Open(true);
                        }
                    }}>
                        Connect to contract
                    </Button>
                    : <></>
            }
            <br /><br />
            <Radio.Group onChange={(e: RadioChangeEvent) => {
                setAddressType(e.target.value);
            }} value={addressType}>
                <Radio value={1}>Existing Account</Radio>
                <Radio value={2}>Create New Account</Radio>
            </Radio.Group>

            {
                (addressType === 2) ?
                    <div style={{ paddingLeft: 30 }}>
                        <br /><br /><span style={{ textDecoration: 'underline' }}>Step 1:</span>
                        <br /> <br />
                        <Button type="primary" onClick={() => generateKeyPair()}>
                            Generate Key Pair
                        </Button>
                    </div>
                    :
                    <></>
            }

            <br />
            <div style={{ paddingLeft: 30 }}>
                {
                    (addressType === 2) ? (
                        <>
                            <span>Public Key:</span><br />
                            {pubKey}<br /><br />
                        </>
                    ) : null
                }
                <span>Private Key:</span><br />
                <Input style={{ width: 450 }} placeholder="Please input your private key" value={priKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setPriKey(e.target.value) }} /><br />
                <br />
                {
                    (addressType === 2) ? <><span style={{ textDecoration: 'underline' }}>Step 2:</span><br /></> : <></>
                }

                {
                    (addressType === 2 && networkType === 2) ? <span>flow accounts create -n mainnet --key {priKey}</span> : <></>
                }

                {
                    (addressType === 2 && networkType !== 2) ?
                        <><a href="https://testnet-faucet.onflow.org/" target="_blank">Create FLOW Account.</a><br /><br /></> : <></>
                }

            </div>
            <Divider orientation="left" orientationMargin="0"><span style={{ fontWeight: 'bold' }}>Select Address List</span></Divider>
            <Upload beforeUpload={beforeUpload} multiple={false} maxCount={1}>
                <Button type="primary" icon={<UploadOutlined />}>Select File</Button>
            </Upload>
            {addresses}
            <Divider orientation="left" orientationMargin="0"><span style={{ fontWeight: 'bold' }}>Transaction</span></Divider>
            <br />
            <Button type="primary" onClick={() => {
                if ((priKey !== null && priKey !== "") &&
                    (flowAddr !== null && flowAddr !== "") &&
                    (addresses !== null && addresses !== "")
                ) {
                    (async () => {
                        console.clear();
                        const txDetails = await executeTransaction();
                        console.log({ txDetails });
                    })();
                }
                else {
                    setModalContent("Please input FLOW sender address and private key and receivers.");
                    setModal2Open(true);
                }
            }}>
                Execute Transaction
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

