'use strict';

var query = require('./dbconn');
var Loger = require('./loger');

function adman() {

	//记录归集
	adman.prototype.saveCollection = function(cid,token,contractAddress,fromAddress,toAddress,amount,callback) {
		var createtime = parseInt(Math.round(new Date().getTime() / 1000));
		var sql = "insert into collection(cid,token,contractAddress,fromAddress,toAddress,amount,status,needGiveGas,giveGasHash,giveGasAmount,createtime,statustime) values(?,?,?,?,?,?,0,0,'',0,?,?)";
		var params = [cid, token, contractAddress, fromAddress, toAddress, amount, createtime,createtime];
		query(sql, params, function(err, vals, fields){
			if(!err){
				callback(1);
			}else{
				Loger.getInstance().info(err);
				callback(0);
			}
		});
	};

	//设置赠送燃油状态
	adman.prototype.updateSetGiveGas = function(cid, giveGasAmount, giveGasHash, callback){
		var statustime = parseInt(Math.round(new Date().getTime() / 1000));
		var sql = "update collection set status=1, needGiveGas=1, giveGasHash=?, giveGasAmount=?, statustime=? where cid=?";
		var params = [giveGasHash, giveGasAmount, statustime, cid];
		query(sql, params, function(err, vals, fields){
			if(!err){
				callback(1);
			}else{
				Loger.getInstance().info(err);
				callback(0);
			}
		});
	}

	//设置赠送燃油为成功
	adman.prototype.updateGiveGasSuccess = function(cid, callback){
		var statustime = parseInt(Math.round(new Date().getTime() / 1000));
		var sql = "update collection set status=2, statustime=? where cid=?";
		var params = [statustime, cid];
		query(sql, params, function(err, vals, fields){
			if(!err){
				callback(1);
			}else{
				Loger.getInstance().info(err);
				callback(0);
			}
		});
	}

	//设置归集状态
	adman.prototype.updateCollectionStatus = function(cid, status, callback){
		var statustime = parseInt(Math.round(new Date().getTime() / 1000));
		var sql = "update collection set status=?, statustime=? where cid=?";
		var params = [status, statustime, cid];
		query(sql, params, function(err, vals, fields){
			if(!err){
				callback(1);
			}else{
				Loger.getInstance().info(err);
				callback(0);
			}
		});
	}

	//查询一个账号的归集状态是否正在进行
	adman.prototype.isCollecting = function(address, callback){
		var sql = 'select count(*) as cnt from collection where fromAddress=? and status in (0,1,3,4,5)';
		var params = [address];
		query(sql, params, function(err, vals, fields) {
			var res = 0;
			var cnt = 0;
			if (!err) {
				var rows = vals.length;
				if (rows > 0) {
					cnt = vals[0]['cnt'];
					if (cnt > 0) {
						res = 1;
					} else {
						res = 0;
					}
				}
			}
			callback(res);
		});
	}
}

module.exports = adman;