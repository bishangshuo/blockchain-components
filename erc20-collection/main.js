'use strict';

const Erc20 = require('./src/erc20');

const TokenManager = require('./src/tokens');
var Thenjs = require('thenjs');
var uuid = require('node-uuid');
var DBMan = require('./src/dbman');
const LineByLine = require('./src/LineReader'); 
var program = require('commander');
var Loger = require('./src/loger');

const receivedAddress = "0x36D1DB197CAe24948010463651dFB116A52c54F0";
//燃油基金
const fuelAddress = "0x36D1DB197CAe24948010463651dFB116A52c54F0";
const fuelPrivKey = "3C2CBE7BD0F0E4867D945779E688A64D29F752EAEE5E80FD546D8A4AF860D4AF";

const speed = 1;

program
    .usage('[options] [value ...]')
    .option('-f, --file <s>', 'input a file');

program.parse(process.argv);

function CollectToken(fromAddress, privKey, callback){
    //归集接收账号
    const toAddress = receivedAddress;

    //智能合约
    var usdcObj = (new TokenManager()).getInstance().loadToken('USDC');
    var contractAddress = usdcObj.contract.address;
    var abi = usdcObj.contract.abi;

    Thenjs(function (cont) {//1 查询发送账号token余额
        (new Erc20()).getInstance().tokenBalance(usdcObj.token, fromAddress, contractAddress, abi, function(res_Balance, balance){
            Loger.getInstance().info('balance:'+balance);
            if(res_Balance && balance > 0){
                 cont(null, balance);
            }else{
                Loger.getInstance().info('token余额为0，无需归集');
                callback(501);
            }
        })
    }).then(function(cont, balance){//2 估算发送token需要的燃油
        (new Erc20()).getInstance().estimateTokenGas(fromAddress, toAddress, balance, speed, contractAddress, abi, function(resGas, gasInfo){
            if(resGas){
                cont(null, balance, gasInfo);
            }else{
                Loger.getInstance().info('评估燃油失败');
                callback(502);
            }
        });
    }).then(function(cont, balance, gasInfo){//3 查询发送账号的以太坊余额,判断以太坊余额是否足以作为归集的燃油
        (new Erc20()).getInstance().etherBalance(fromAddress, function(resEthBalance, ethBalance){
            if(resEthBalance){
                if(ethBalance >= gasInfo.gasUsed){
                    cont(null, 0, balance, gasInfo);
                }else{
                    Loger.getInstance().info('发送账号的以太坊余额不足以作为归集的燃油，需要赠送燃油');
                    cont(null, 1, balance, gasInfo);
                }
            }else{
                Loger.getInstance().info('查询发送账号的以太坊余额失败');
                callback(503);
            }
        })
    }).then(function(cont, giveGas, amount, gasInfo){//赠送燃油或直接发送token
        //从这里开始， 交易流程有一个完整过程，这个过程有一个唯一的uuid对应
        var processUUID = uuid.v4();
        //数据库记录cid流程
        (new DBMan()).saveCollection(processUUID,usdcObj.token,usdcObj.contract.address,fromAddress,toAddress,amount,function(res){
            if(res){
                cont(null, processUUID, giveGas, amount, gasInfo);
            }else{
                Loger.getInstance().info('db connection error');
                callback(504);
            }
        })
    }).then(function(cont, processUUID, giveGas, amount, gasInfo){
        if(giveGas){//向fromAddress赠送燃油, 燃油使用量等于第2步估算的结果
            (new Erc20()).getInstance().sendEther(processUUID, fuelAddress, fuelPrivKey, fromAddress, gasInfo.gasUsed, speed, function(type, pid, res, message, number, option){
                Loger.getInstance().info('\n');
                Loger.getInstance().info('sendEther callback:');
                Loger.getInstance().info(type);
                Loger.getInstance().info(pid);
                Loger.getInstance().info(res);
                Loger.getInstance().info(message);
                Loger.getInstance().info(number);
                Loger.getInstance().info(JSON.stringify(option));
                Loger.getInstance().info('\n');

                if(type == 1 && processUUID == pid){
                    if(res == 10001){//成功提交交易
                        (new DBMan()).updateSetGiveGas(pid, gasInfo.gasUsed, option.txid, function(resUpdate){});
                    }else if(res == 10002){//交易被接受
                        //不处理
                    }else if(res == 10003){//交易确认
                        (new DBMan()).updateGiveGasSuccess(pid, function(resUpdate){
                            if(resUpdate && number == 1){
                                cont(null, processUUID, amount, gasInfo, 1);
                            }
                        });
                        
                    }else if(res == 10004){//发送错误
                        //发生错误时，不一定是赠送燃油失败了，这里不用处理
                        (new DBMan()).updateCollectionStatus(processUUID, 7, function(resUpdate){});
                    }
                }else{
                    Loger.getInstance().info('不可能的类型错误');
                    callback(505);
                }
            })
        }else{//直接发送token
            cont(null, processUUID, amount, gasInfo);
        }
    }).then(function(cont, processUUID, amount, gasInfo){//更改归集状态为3-正在发送token
        (new DBMan()).updateCollectionStatus(processUUID, 3, function(resUpdate){
            if(resUpdate){
                cont(null, processUUID, amount, gasInfo);
            }else{
                callback(506);
            }
        })
    }).then(function(cont, processUUID, amount, gasInfo){//
        (new Erc20()).getInstance().transferToken(processUUID, fromAddress, privKey, toAddress, amount, speed, usdcObj.contract.address, usdcObj.contract.abi, function(type, pid, res, message, number, option){
            Loger.getInstance().info('\n');
            Loger.getInstance().info('transferToken callback:');
            Loger.getInstance().info(type);
            Loger.getInstance().info(pid);
            Loger.getInstance().info(res);
            Loger.getInstance().info(message);
            Loger.getInstance().info(number);
            Loger.getInstance().info(JSON.stringify(option));
            Loger.getInstance().info('\n');

            if(type == 2 && processUUID == pid){
                if(res == 10001){//成功提交交易
                    (new DBMan()).updateCollectionStatus(processUUID, 4, function(resUpdate){});
                }else if(res == 10002){//交易被接受
                    (new DBMan()).updateCollectionStatus(processUUID, 5, function(resUpdate){});
                }else if(res == 10003){//交易确认，完成
                    (new DBMan()).updateCollectionStatus(processUUID, 6, function(resUpdate){
                        Loger.getInstance().info('交易完成:'+pid);
                        if(resUpdate && number == 1){
                            callback(600);
                        }
                    });
                    
                }else if(res == 10004){//发送错误
                    //发生错误时，不一定是赠送燃油失败了，这里不用处理
                    (new DBMan()).updateCollectionStatus(processUUID, 7, function(resUpdate){});
                }
            }else{
                Loger.getInstance().info('不可能的类型错误');
                callback(507);
            }
        });
    }).fail(function (cont, error){
        Loger.getInstance().info('发生错误');
        Loger.getInstance().info(error);
        callback(508);
    });
    

}

//归集发送账号
// var accounts = [
//     {"address": "0xeA4876beFA5d43D12B4392f4DAdDB3a4Bf174d7B", "privkey": "AE4BF08477F54838B49538CB08F7E70D8344B01D54815760038A495FABD32C40"},
//     {"address": "0x6Cc191454B878b218Bef2b7DDD3a87ecc8797d28", "privkey": "1BF58C6FA80BC6BA332916DB824349F6EDEFAA3E97B616FA1617B7BE688E7137"},
//     {"address": "0x8d1aADAF05f7B174Bd1E4763c49427c867714aAD", "privkey": "9A1654F97210124B7521366253C555D3263AA698481CC770180EB93F1ED04EB6"},
//     {"address": "0xbfAfe3Ea7C82FDaA0FCBFCB6fD7fddA887D93e5f", "privkey": "7B6911FE2FE22D1446BA1940B53469786CAFFBA72EF9402286ABEE4E9D6E9498"},
//     {"address": "0xE50924BD6389a831c14BCe1fa1564D7a08b99820", "privkey": "D92004166A559FF3515685073D1574073F30BACF5222A0D88DD5C1A7D8B909D6"},
//     {"address": "0x0762864F9Cbb1A590b6d61f28cfC52C7b295F8dd", "privkey": "E72F69243D2641E4DB52E4C54EF7ECE8C59825A71A3CB8B7A84B4583F6925530"},
//     {"address": "0x188A39764802e2768219802ADdA4585A1Ac09c62", "privkey": "E7A48F4A22D6C41517E7B12D444EC3A3B67DF8B2C2EA7C806B2E1E55EE668F16"},
//     {"address": "0x119ef6aDca1C5ad1435A55f8087218f03eF2fd65", "privkey": "7EC1F7D0C83CC57D28805EF5F5CAFA5EA0018EE39C54EF9469D5AA9DF5FCA228"},
// ];

function collectFunc(i, total){
    if(i < total){
        var account = accounts[i];
        Loger.getInstance().info('collect token for:');
        Loger.getInstance().info(account);
        (new DBMan()).isCollecting(account.address, function(res){
            if(!res){
                CollectToken(account.address, account.privkey, function(res){
                    if(res == 600){
                        setTimeout(function(){
                            collectFunc(i+1, total);
                        }, 1000);
                    }else{
                        collectFunc(i+1, total);
                    }
                })
            }else{
                Loger.getInstance().info('此账号正在归集，跳过');
                collectFunc(i+1, total);
            }
        })
        
    }
}

var accounts = [];
var filename = program.file;
var liner = new LineByLine();

liner.open( filename ); 
var theline;
while( !liner._EOF )
{
    theline = liner.next();
    //Loger.getInstance().info("line:"+theline);
    if(theline != undefined && theline.length > 0 && theline != 'undefined'){
        var account = theline.split(",");
        if(account.length == 2){
            accounts.push({"address": account[0], "privkey": account[1]});
        }
    }
}
 
liner.close();

Loger.getInstance().info(accounts);

collectFunc(0, accounts.length);
