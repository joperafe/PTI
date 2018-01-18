const HTTPS_PORT = 8443;

const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;

// Yes, SSL is required
const serverConfig = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
};

var clientMap = [];

// ----------------------------------------------------------------------------------------

// Create a server for the client html page
var handleRequest = function(request, response) {
    // Render the single client html file for any request the HTTP server receives
    console.log('request received: ' + request.url + '\n');

    if(request.url === '/') {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(fs.readFileSync('client2/index2.html'));
    } else if(request.url === '/main.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('client2/main.js'));
    } else if(request.url === '/adapter.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('adapter.js'));
    }

    console.log("Clients:");
    var i = 1;
    wss.clients.forEach(function each(client) {
        console.log("client "+i);
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

wss.on('connection', function(ws, req) {
    
    ws.on('message', function(message) {
        console.log("\nSupostamente id, ip a seguir <"+clientMap.length+">");
        clientMap.forEach(function(item, index, array) {
            console.log(item.id, item.ip);
        });

        const ip = req.connection.remoteAddress;
        console.log("\nso ip: " + ip);
        var msg = JSON.parse(message);
        const uuid = msg.uuid;
        var flag = true;
        clientMap.forEach(function(item, index, array) {
            if(item.ip === ip){
                flag = false
            }
        });
        if(flag){
            clientMap.push(newMapElement(ip,uuid));
        }
        console.log("\nso id: " + msg.uuid);
        // Broadcast any received message to all clients
        console.log('received: %s', message);
        wss.broadcast(message);
    });
});

wss.broadcast = function(data) {
    this.clients.forEach(function(client) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

console.log('Server running. Visit https://localhost:' + HTTPS_PORT + ' in Firefox/Chrome (note the HTTPS; there is no HTTP -> HTTPS redirect!)\n');

function newMapElement(ip, id){
    var me = {
        id : id,
        ip : ip,
    };
    return me;
}