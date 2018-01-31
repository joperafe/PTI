const HTTPS_PORT = 8443;
var bigInt = require("big-integer");
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
const sha1 = require('sha1');
var currentDate = new Date();

var n = 1;

// Yes, SSL is required
const serverConfig = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
};

var clientMap = [];

// ----------------------------------------------------------------------------------------

// Create a server for the client html page
var handleRequest = function (request, response) {
    // Render the single client html file for any request the HTTP server receives
    console.log('request received: ' + request.url);

    if (request.url === '/') {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(fs.readFileSync('node/index.html'));
    }
    else if (request.url === '/main.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('node/main.js'));
    }
    else if (request.url === '/adapter.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('node/adapter.js'));

    } else if (request.url === '/webrtc.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('node/webrtc.js'));
    } else if (request.url === '/Chord.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('node/Chord.js'));
    } else if (request.url === '/Files.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('node/Files.js'));
    }
    else if (request.url === '/http_peterolson.github.com_BigInteger.js_BigInteger.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('node/http_peterolson.github.com_BigInteger.js_BigInteger.js'));
    }

    var i = 1;
    wss.clients.forEach(function each(client) {
        console.log("client " + i);
        i++;
        for (var property in client) {
            //console.log(property);
        }

        //    str = JSON.stringify(client);
        //    str = JSON.stringify(client, null, 4); // (Optional) beautiful indented output.
        //    console.log(str);

    })
};

var httpsServer = https.createServer(serverConfig, handleRequest);
httpsServer.listen(HTTPS_PORT, '0.0.0.0');

// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls
var wss = new WebSocketServer({server: httpsServer});

wss.on('connection', function (ws, req) {

    ws.on('message', function (message) {
        /*console.log("\nSupostamente id, ip a seguir <" + clientMap.length + ">");
        clientMap.forEach(function (item, index, array) {
            console.log(item.id, item.ip);
        });*/

        currentDate = new Date();
        var msg = JSON.parse(message);
        const ip = req.connection.remoteAddress;
        console.log("\nip: " + ip + " /id: "+msg.id+" /dest: "+msg.dest+" ("+currentDate.getHours()+":"+currentDate.getMinutes()+":"+currentDate.getSeconds()+")");
        console.log("on msg: " + msg.type);

        var flag = true;
        clientMap.forEach(function (item, index, array) {
            if (item.ip === ip) {
                flag = false
            }
        });
        if (flag) {
            clientMap.push(newMapElement(ip, ws));
        }

        switch (msg.type) {
            case "newNode":
                if(ip === "127.0.0.1") {
                    id = sha1("127.0.0."+(n)).slice(0);
                    n++;
                }
                id = sha1(ip).slice(0);

                clientMap.forEach(function (item, index, array) {
                    if (item.ip === ip) {
                        item.id = id;
                    }
                });


                var succ = findSuccessor(id);
                try {
                    wss.send(JSON.stringify({'type': "newNode", 'newid': id, 'succ': succ, 'id': 0}), ip, null);
                } catch (e) {console.log("error: "+e);}
                break;

            case "fileID":
                console.log(msg);
                id = sha1(msg.name);
                try {
                    console.log("sending fileID to "+ip);
                    wss.send(JSON.stringify({type: "fileID", fileid: id, /*id:msg.id,*/ i:msg.i, name:msg.name}), ip, null);
                } catch (e) {console.log("fileID error: "+e);}
                break;

            default:
                if (msg.dest != null) {
                    wss.send(message, null, msg.dest);
                }
                else
                    wss.broadcast(message);
        }


    });
});

wss.send = function (data, ip, id) {
    //console.log("sending to "+ws);

    clientMap.forEach(function (item, index, array) {
        if ((item.ip === ip || item.id === id) && item.ws.readyState === WebSocket.OPEN) {
            //console.log(typeof data + ", " +data);//JSON.stringify(data));
            item.ws.send(data);
            console.log("sent data 1:" + data);
        }
    });
    /*this.clients.forEach(function (client) {
        console.log(client.url);
        //console.log("is "+client.connection.remoteAddress  +" equal to "+ip+"?");
        if (client.readyState === WebSocket.OPEN && client === ws) {
            client.send(data);
            console.log("sent data 2:"+data);
        }
    });*/
};

wss.broadcast = function (data) {
    this.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

console.log('Server running. Visit https://localhost:' + HTTPS_PORT + ' in Firefox/Chrome (note the HTTPS; there is no HTTP -> HTTPS redirect!)\n');

function newMapElement(ip, ws) {
    var me = {
        ip: ip,
        ws: ws

    };
    return me;
}

function findSuccessor(id) {
    var aux = clientMap[0].id;
    var gotID = false;
    var flg = true;
    clientMap.forEach(function (item, index, array) {
        if (flg) {
            if (item.id > id) {
                aux = item.id;
                flg = false;
                gotID = true;
            }
        }
        else {
            if (item.id > id && item.id < aux) {
                aux = item.id;
            }
        }
    });
    if (!gotID) {
        flg = true;
        clientMap.forEach(function (item, index, array) {
            if (flg) {
                if (item.id < id) {
                    aux = item.id;
                    flg = false;
                    gotID = true;
                }
            }
            else {
                if (item.id < aux) {
                    aux = item.id;
                }
            }
        });
    }
    if (!gotID) {
        aux = id;
    }

    return aux;
}
