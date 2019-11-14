'use strict';
var SimpleNodeLogger = require('simple-node-logger');
var fs = require('fs');
var path = require("path");  

class loger{
    constructor(){
        this.logPath = process.cwd()+'/logs';
        console.log('use logs file path:'+this.logPath);
        this.mkdirsSync(this.logPath);
        this.log_info = {};
    }

    static getInstance(){
        if(false === loger.instance instanceof this){
            loger.instance = new loger();
        }
        return loger.instance;
    }

    mkdirsSync(dirname) {
        if (fs.existsSync(dirname)) {
            return true;
        } else {
            if (this.mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
            }
        }
    }

    info(content, filter='info'){
        var timestamp = Date.now();
        // var nowTimeString = this.nowTime(timestamp); 
        // console.log(nowTimeString, content);
        var todayString = this.today(timestamp);
        var fileName = this.logPath+'/'+filter+'_'+todayString+'.log';

        var opts_info = {
            logFilePath:fileName,
            timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
        };

        if(!this.log_info.hasOwnProperty(filter) || !fs.existsSync(fileName)){
            this.log_info[filter] = SimpleNodeLogger.createSimpleLogger( opts_info );
        }

        this.log_info[filter].info(content);
    }

    nowTime(inputTime){
        var date = new Date(inputTime);
        var y = date.getFullYear();
        var m = date.getMonth() + 1;
        m = m < 10 ? ('0' + m) : m;
        var d = date.getDate();
        d = d < 10 ? ('0' + d) : d;
        var h = date.getHours();
        h = h < 10 ? ('0' + h) : h;
        var minute = date.getMinutes();
        var second = date.getSeconds();
        minute = minute < 10 ? ('0' + minute) : minute;
        second = second < 10 ? ('0' + second) : second;
        return y+'-'+m+'-'+d+' '+' '+h+':'+minute+':'+second;
    }
    
    today(inputTime){
        var date = new Date(inputTime);
        var y = date.getFullYear();
        var m = date.getMonth() + 1;
        m = m < 10 ? ('0' + m) : m;
        var d = date.getDate();
        d = d < 10 ? ('0' + d) : d;
        return y+'-'+m+'-'+d
    }
};

module.exports = loger;