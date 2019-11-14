'use strict';

var Web3 = require("web3");
Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;

var Tx = require("ethereumjs-tx");
var BigNumber = require('big-number');

var Loger = require('./loger');

var __gERC20Instance = null;
function erc20() {

	var web3 = null;
	//构造函数
	function erc20() {
        web3 = new Web3();
        /*
        host:"https://rinkeby.infura.io/v3",
		projectid:"9febd3d076c944da90b66b1c82e8a77a",
        port:8546,
        */
		var URL_PORT = "https://rinkeby.infura.io/v3/9febd3d076c944da90b66b1c82e8a77a";
		var web3Provider = new Web3.providers.HttpProvider(URL_PORT);
		if (!web3.currentProvider) {
			web3.setProvider(web3Provider);
		}
	}

	//单例模式方法
	this.getInstance = function() {
		if (__gERC20Instance == null) {
			__gERC20Instance = new erc20();
		}
		return __gERC20Instance;
    }

    erc20.prototype.getAccounts = function(callback){
        web3.eth.getAccounts(function(err, accounts){
            if(!err){
                callback(1, accounts);
            }else{
                Loger.getInstance().info("erc20.prototype.getAccounts error");
                Loger.getInstance().info(err);
                callback(0, []);
            }
        })
    }

    erc20.prototype.createAccount = function(callback) {

		var promise = new Promise(function(resolve) {
			var accountInfo = web3.eth.accounts.create();
			Loger.getInstance().info("eth::createAccount");
			Loger.getInstance().info(accountInfo);
			resolve(accountInfo);
		});

		promise.then(function(accountInfo) {
			Loger.getInstance().info("eth::createAccount promise:address=%s, privateKey=%s", accountInfo.address, accountInfo.privateKey);
			callback(1, accountInfo.address, accountInfo.privateKey);
		}).catch(function(errorMessage) {
			Loger.getInstance().info('eth.prototype.createAccount error:' + errorMessage);
			callback(0, '', '');
		});
    };

    erc20.prototype.privateKeyBuffer = function(privatekey){
        var temp = privatekey;
        var pre = temp.substring(0,2);
        pre=pre.toLowerCase();
        if(pre=='0x'){
            temp = temp.substring(2);
        }
        var privateKeyBuffer = Buffer.from(temp, 'hex');
        return privateKeyBuffer;
    };

    //以太坊余额
    erc20.prototype.etherBalance = function(address, callback){
        web3.eth.getBalance(address, function(error_balance, result_balance) {
			if (!error_balance) {
				var ethBalance = web3.utils.fromWei(result_balance.toString(), 'ether');
				Loger.getInstance().info("eth.prototype.queryEthBalance balance is:");
				Loger.getInstance().info(ethBalance);
				callback(1, parseFloat(ethBalance.toString()));
			} else {
				Loger.getInstance().info('eth.prototype.queryEthBalance error');
				Loger.getInstance().info(error_balance);
				callback(0, 0);
			}
		});
    }

    //token余额
    erc20.prototype.tokenBalance = function(token, address, contractAddress, abi, callback) {

		var contract = new web3.eth.Contract(abi, contractAddress, {
			from: address
		});
		contract.methods.balanceOf(address)
		.call(function(err, result_balance){
			if(!err){
				var tokenBalance = web3.utils.fromWei(result_balance.toString(), 'ether');
				Loger.getInstance().info("eth.prototype.queryTokenBalance balance is:");
				Loger.getInstance().info(result_balance + ' in wei');
				Loger.getInstance().info(tokenBalance + ' in ether');
				
				var balance = parseFloat(tokenBalance.toString());
				callback(1, balance);
			}else{
                Loger.getInstance().info('获取token余额失败：'+token+';address='+address);
				callback(0, 0);
			}
		})
			
    };
    //估算发送以太坊所需要的燃油
    erc20.prototype.estimateEtherGas = function(fromAddress, toAddress, amount, speed, callback){
        var rawTransaction = {
            "from": fromAddress,
            "to": toAddress, //这里填写Token的智能合约的地址
            "value": web3.utils.toHex(web3.utils.toWei(amount.toString(), 'ether')),
        };
        
        this.doEstimateGas(rawTransaction, speed, callback);
    }

    //估算发送token燃油
    erc20.prototype.estimateTokenGas = function(fromAddress, toAddress, amount, speed, contractAddress, abi, callback){
        var valueAmount = web3.utils.toWei(amount.toString(), "ether");
        var contract = new web3.eth.Contract(abi, contractAddress, {
            from: fromAddress
        });
        var rawTransaction = {
            "from": fromAddress,
            "to": contractAddress, //这里填写Token的智能合约的地址
            "value": '0x0', //Token转账不要填写以太坊ether
            "data": contract.methods.transfer(toAddress, valueAmount).encodeABI(), //这里填写Token接收方的地址
        };
        
        this.doEstimateGas(rawTransaction, speed, callback);
    }

    erc20.prototype.doEstimateGas = function(rawTransaction, speed, callback){
        web3.eth.estimateGas(rawTransaction, function(err, gasValue) {
            if (!err) {
                //获取燃油单价
                web3.eth.getGasPrice(function(error_price, gasPrice) {
                    if (!error_price) {
                        Loger.getInstance().info('eth.prototype.estimateTokenGas ok-------');
                        var fGasValue = web3.utils.fromWei(gasValue.toString(), 'ether');
                        var fGasPrice = web3.utils.fromWei(gasPrice.toString(), 'ether');

                        var bGasValue = BigNumber(gasValue);
                        var bGasPrice = BigNumber(gasPrice);
                        var bGasValueTemp = bGasValue;
                        var bGasUsed = bGasValueTemp.mult(bGasPrice);
                        bGasUsed = bGasUsed.mult(speed);

                        var fGasUsed = web3.utils.fromWei(bGasUsed.toString(), 'ether');
                        fGasUsed = parseFloat(fGasUsed).toFixed(8);

                        callback(1, {
                            "gasValue": fGasValue,
                            "gasPrice": fGasPrice,
                            "gasUsed": fGasUsed,
                            "weiValue": gasValue,
                            "weiPrice": gasPrice,
                            // "transactionCount":transactionCount
                        });
                    } else {
                        Loger.getInstance().info('eth.prototype.estimateTokenGas getGasPrice error');
                        callback(0, {});
                    }
                });
            } else {
                Loger.getInstance().info('eth.prototype.estimateTokenGas estimateGas error');
                Loger.getInstance().info(err);
                callback(0, {});
            }
        });
    }

    //发送以太坊
    erc20.prototype.sendEther = function(processUUID, fromAddress, privKey, toAddress, amount, speed, callback){
        var me = this;
        web3.eth.getTransactionCount(fromAddress, "pending", function(err_getTransactionCount, transactionCount) {
            if (!err_getTransactionCount) {

                me.estimateEtherGas(fromAddress, toAddress, amount, speed, function(resGas, gasInfo){
                    if(resGas){
                        var weiValue = web3.utils.toWei(amount.toString(), 'ether');
                        var weiGasPrice = BigNumber(gasInfo.weiPrice).mult(speed);
                        var weiGasValue = BigNumber(gasInfo.weiValue);

                        var rawTransaction = {
                            "from": fromAddress,
                            "to": toAddress,
                            "value": web3.utils.toHex(weiValue.toString()),
                            "gasPrice": web3.utils.toHex(weiGasPrice.toString()),
                            "gasLimit": web3.utils.toHex(weiGasValue.toString()),
                            "nonce": web3.utils.toHex(transactionCount)
                        };

                        var transactionData = new Tx.Transaction(rawTransaction, { chain: 'rinkeby' });
                        var privateKeyBuffer = Buffer.from( privKey, 'hex' );
                        
                        transactionData.sign(privateKeyBuffer);
                        var transactionDataHex = '0x' + transactionData.serialize().toString('hex');

                        me.sendSignedTransactionData(1, processUUID, transactionDataHex, callback);
                    }else{
                        Loger.getInstance().info("估算燃油失败");
                        callback(1, processUUID, 2002, "估算燃油失败", 0, {});
                    }
                })
            }else{
                Loger.getInstance().info("getTransactionCount error");
                callback(1, processUUID, 2001, "getTransactionCount error", 0, {});
            }
        });
    }
    
    //发送token
    erc20.prototype.transferToken = function(processUUID, fromAddress, privKey, toAddress, amount, speed, contractAddress, abi, callback){

        var me = this;
        web3.eth.getTransactionCount(fromAddress, "pending", function(err_getTransactionCount, transactionCount) {
            if (!err_getTransactionCount) {

                me.estimateTokenGas(fromAddress, toAddress, amount, speed, contractAddress, abi, function(resGas, gasInfo){
                    if(resGas){
                        var weiValue = web3.utils.toWei(amount.toString(), 'ether');
                        var weiGasPrice = BigNumber(gasInfo.weiPrice).mult(speed);
                        var weiGasValue = BigNumber(gasInfo.weiValue);
                        
                        var contract = new web3.eth.Contract(abi, contractAddress, {
                            from: fromAddress
                        });
                
                        var rawTransaction = {
                            "from": fromAddress,
                            "to": contractAddress,
                            "value": '0x0',
                            "data": contract.methods.transfer(toAddress, weiValue).encodeABI(),
                            "gasPrice": web3.utils.toHex(weiGasPrice.toString()),
                            "gasLimit": web3.utils.toHex(weiGasValue.toString()),
                            "nonce": web3.utils.toHex(transactionCount)
                        };

                        var transactionData = new Tx.Transaction(rawTransaction, { chain: 'rinkeby' });
                        var privateKeyBuffer = Buffer.from( privKey, 'hex' );
                        
                        transactionData.sign(privateKeyBuffer);
                        var transactionDataHex = '0x' + transactionData.serialize().toString('hex');

                        me.sendSignedTransactionData(2, processUUID, transactionDataHex, callback);
                    }else{
                        Loger.getInstance().info("估算燃油失败");
                        callback(2, processUUID, 2002, "估算燃油失败", 0, {});
                    }
                })
            }else{
                Loger.getInstance().info("getTransactionCount error");
                callback(2, processUUID, 2001, "getTransactionCount error", 0, {});
            }
        });
    }

    erc20.prototype.sendSignedTransactionData = function(type, processUUID, transactionData, callback){
		web3.eth.sendSignedTransaction(transactionData)
		.on('transactionHash', function(hash) {
			//交易已经广播出去，返回了交易哈希凭证hash,但在极个别情况下，广播出去的交易有可能不被矿工打包
			Loger.getInstance().info('on transactionHash:');
			Loger.getInstance().info(hash);
			callback(type, processUUID, 10001, "成功提交交易", 0, {"txid":hash});
		})
		.on('receipt', function(receipt) {
			//确认交易完成，发送方账户余额已经发生了改变， 可以通知上层业务已经到账，让用户查询余额。
			//此时区块链仍然有工作要做，需要24个节点确认交易的真实性，见 on confirmation .
			//但上层业务可以不用等待确认
			Loger.getInstance().info('on receipt:');
            Loger.getInstance().info(receipt);
            callback(type, processUUID, 10002, "交易被接受", 0, receipt);
		})
		.on('confirmation', function(confirmationNumber, receipt) {
			//24个确认完成之后，整个交易流程结束
            Loger.getInstance().info('on confirmation:' + confirmationNumber);
            callback(type, processUUID, 10003, "交易确认", confirmationNumber, receipt);
		})
		.on('error', function(error_transaction) {
			//发生错误
			Loger.getInstance().info('on error:' + error_transaction);
			callback(type, processUUID, 10004, error_transaction, 0, {});
		});
	}
    
    

    
}

module.exports = erc20;
