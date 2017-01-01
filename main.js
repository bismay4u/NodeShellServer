/*
 * This is a node command agent server. This is a 2 part project.
 * This agent runs in the targeted computer in daemon mode, and waits
 * for the control server to execute command. It uses encryption commands
 * to keep the data transfer safe.
 * 
 * It has to be run in adminstrative mode or root mode.
 * 
 * Currently this can handle native commands only.
 * Planning to execute js codes using sandbox as well.
 * 
 * 
 * @author Bismay K Mohapatra bismay4u@gmail.com
 * @version 3.0
 * */

var crypto = require('crypto');
var cluster = require('cluster');
var os = require("os");

var cfg = require("./config.json");

if (cfg.hostName === null || cfg.hostName.length <= 1 || cfg.hostName === "auto") {
    cfg['hostName'] = getIPAddress();
}
cfg['hostURL'] = "http://" + cfg.hostName + ":" + cfg.hostPort;

function Server() {
    var cmdServer = this;
    var password = 'abcdefghijklmnop';
    var enableEncrypt = false;

    this.start = function (host, port, pwd) {
        cmdServer.password = pwd;

        if (host == null || port == null) {
            console.error("HOST/PORT Not Defined");
            process.exit();
        }

        var http = require('http'),
                url = require('url'),
                exec = require('child_process').exec;

        cfg['hostURL'] = "http://" + host + ":" + port;
        cfg['exitCode'] = Math.ceil(Math.random() * Math.pow(10, cfg.codeLength));


        http.createServer(function (req, res) {
            req.addListener('end', function () {
                cmdServer.enableEncrypt = false;
            });
            //console.log(cmdServer.decrypt(req.url.substr(2)));
            //var parsedUrl = url.parse(cmdServer.decrypt(req.url.substr(2)), true);

            var parsedUrl = url.parse(req.url, true);
            var cmd = parsedUrl.query['cmd'];
            var async = parsedUrl.query['async'];
            var secure = parsedUrl.query['secure'];

            if (secure === null)
                secure = false;
            if (async === null)
                async = false;

            if (secure === true || secure === "true") {
                cmdServer.enableEncrypt = true;
            }

            switch (cmd) {
                case "restart":
                    cmdServer.restart();
                    break;
                case "exit":
                    if (parsedUrl.query['code'] == cfg.exitCode) {
                        cmdServer.printResponse("Thank you, quiting Server.\n", res, 200);
                        cmdServer.stop();
                    } else {
                        cmdServer.printResponse("You are not permitted to terminate me.\n", res, 200);
                    }
                    return;
                    break;
                case "test":
                    throw new Error('User generated fault.');
                    return;
                    break;
                case null:
                case undefined:
                case "undefined":
                case "null":
                case "":
                    cmdServer.printResponse("CMD is mandatory", res);
                    break;
                default:
                    //cmds=cmd.split(";");
                    cmdArr = cmd.split(" ");
                    if (cfg.forbidden.indexOf(cmdArr[0]) >= 0) {
                        cmdServer.printResponse("CMD is forbidden", res);
                    } else {
                        if(cfg.allowScripts) {
                            fs = require("fs");
                            
                            scrpt=__dirname+"/scripts/"+cmd+".js";
                            if(fs.existsSync(scrpt)) {
                                GLOBAL.cmdServer=cmdServer;
                                GLOBAL.res=res;
                                
                                require(scrpt);
                            } else {
                                cmdServer.runCmd(cmdArr[0], cmdArr.slice(1), function (result) {
                                    cmdServer.printResponse(result, res);
                                });
                            }
                        } else {
                            cmdServer.runCmd(cmdArr[0], cmdArr.slice(1), function (result) {
                                cmdServer.printResponse(result, res);
                            });
                        }
                    }
                    break;
            }
            //console.log(parsedUrl);
        }).listen(port, host);

        console.log('Server running at ' + cfg.hostURL);
        console.log('Termination Code :' + cfg.exitCode);
        console.log('Secure Keys :' + cmdServer.password);
    }

    this.stop = function () {
        process.exit(1);
    }
    this.restart = function () {
        process.exit(1);
    }

    this.writeFile = function (fname, content) {
        var fs = require('fs');
        fs.writeFile(fname, content, function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        });
    }

    this.execCmd = function (cmd, args, callBack) {
        var child = exec(cmd, function (error, stdout, stderr) {
            //stdout=stdout.split("\n");
            //var result = '{"stdout":' + stdout + ',"stderr":"' + stderr + '","cmd":"' + cmd + '"}';
            console.error(error);
            if (stderr == null || stderr.length <= 0) {
                callBack(stdout);
            } else {
                callBack(stderr);
            }
        });
    }

    this.runCmd = function (cmd, args, callBack) {
        var spawn = require('child_process').spawn;
        var child = spawn(cmd, args);
        var resp = "";

        child.stdout.on('data', function (buffer) {
            resp += buffer.toString()
        });
        child.stdout.on('end', function () {
            callBack(resp)
        });
    }

    this.printResponse = function (result, res, code, typeMime) {
        if (typeMime == null)
            typeMime = "text/plain";
        if (code == null)
            code = 412;

        res.writeHead(code, {'Content-Type': typeMime});
        res.end(cmdServer.encrypt(result));
    }

    this.encrypt = function (text) {
        if (!cmdServer.enableEncrypt)
            return text;
        cipher = crypto.createCipheriv(algorithm, cmdServer.password, iv);
        crypted = cipher.update(text, 'utf-8', 'hex');
        crypted += cipher.final('hex');

        return crypted;
    }

    this.decrypt = function (text) {
        if (!cmdServer.enableEncrypt)
            return text;
        var decipher = crypto.createDecipheriv(algorithm, cmdServer.password, iv);
        decrypted = decipher.update(text, 'hex', 'utf-8');
        decrypted += decipher.final('utf-8');
        return decrypted;
    }
}

function getIPAddress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];

        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }

    return '0.0.0.0';
}

process.on('uncaughtException', function (e) {
    console.warn(e);
    process.exit(1);
});
process.on('message', function (e) {
    console.info(e);
});

if (cfg.cluster) {
    if (cluster.isMaster) {
        cluster.fork();

        cluster.on('exit', function (worker, code, signal) {
            cluster.fork();
        });
    }
    if (cluster.isWorker) {
        s = new Server();
        s.start(cfg.hostName, cfg.hostPort, cfg.password);
    }
} else {
    s = new Server();
    s.start(cfg.hostName, cfg.hostPort, cfg.password);
}


//process.send('Hello from Child!');