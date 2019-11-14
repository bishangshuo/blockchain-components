'use strict';

const fs = require("fs")
const path = require("path")
const HashMap = require("hashmap")
var Loger = require('./loger');

var __gTokensManager = null;

function tokens(){

    /**
     * 构造函数
     */
    function tokens(){
        this.mapTokens = new HashMap();
    }
    //单例模式方法
	this.getInstance = function() {
		if (__gTokensManager == null) {
			__gTokensManager = new tokens();
		}
		return __gTokensManager;
    }

    tokens.prototype.openToken = function(fileName){
        var tokenObj = undefined;
        if(fs.existsSync(fileName)){
            var objString = fs.readFileSync(fileName);
            if(objString != null && objString != undefined && objString.length>0){
                tokenObj = JSON.parse(objString);
                var tokenObj_old = this.mapTokens.get(tokenObj.token);
                if(tokenObj_old == undefined){
                    this.mapTokens.set(tokenObj.token, tokenObj)
                }
            }
        }

        return tokenObj;
    }

    tokens.prototype.loadToken = function(token){
        var tokenObj = this.mapTokens.get(token);
        if(tokenObj == undefined){
            // Loger.getInstance().info("token not loaded, try to load");
            var tokensDir = path.resolve(__dirname, "../tokens");
            var tokenFileName = tokensDir+'/'+token+'.json';
            if(fs.existsSync(tokenFileName)){
                var objString = fs.readFileSync(tokenFileName);
                if(objString != null && objString != undefined && objString.length>0){
                    tokenObj = JSON.parse(objString);
                    this.mapTokens.set(token, tokenObj);
                }
            }
        }else{
            // Loger.getInstance().info("token loaded, use it in memory");
        }
        
        return tokenObj;
    }

    tokens.prototype.getAddress = function(token){
        var tokenObj = this.loadToken(token);
        if(tokenObj != undefined){
            return tokenObj.contract.address;
        }
        return "";
    }

    tokens.prototype.getAbi = function(token){
        var tokenObj = this.loadToken(token);
        if(tokenObj != undefined){
            return tokenObj.contract.abi;
        }
        return [];
    }

    tokens.prototype.getWallet = function(token){
        var tokenObj = this.loadToken(token);
        if(tokenObj != undefined){
            return tokenObj.wallet;
        }
        return {};
    }

    tokens.prototype.getTokenName = function(address){
        var tokenList = this.getTokenList();
        Loger.getInstance().info("tokenList.length="+tokenList.length);
        for(var i=0; i< tokenList.length; i++){
            var element = tokenList[i];
            Loger.getInstance().info(element.contract.address+"=?"+address);
            if(element.contract.address == address){
                return element.token;
            }
        };
        return "";
    }

    tokens.prototype.getTokenList = function(){
        var tokensDir = path.resolve(__dirname, "../tokens");
        var files = fs.readdirSync(tokensDir);
        var tokenList = new Array();
        for(var i = 0; i < files.length; i++){
            var tokenFileName = path.basename(files[i]);
            var extName = path.extname(tokenFileName);
            var tokenName = tokenFileName.substr(0, tokenFileName.length-extName.length);
            var tokenObj = this.loadToken(tokenName);
            if(tokenObj != undefined){
                tokenList.push(tokenObj);
            }
        }
        return tokenList;
    }
}

module.exports = tokens;