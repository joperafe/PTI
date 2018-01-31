var peerConnection;
var id = -1;
var m = 160;
var max = bigInt(2).pow(160);
var sdpStatus = false;
var fingerTable = [];
var tempPeers = [];
var pred = {
    id: null,
    pc: null,
};
var pendingFinds = [];
var pendingMsg = [];
var files = ["9e4af7f6b3fe2391aaa4e9a8ce4193df8dc48450"];
var pic = [];
var stableCount = 0;
var downList = [];
var downCount = [];
var pauseStabilize = false;
var fileList = [];

//Configuraçao dos servidores ICE
var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'}
    ]
};

//codigo a executar quando a página acaba de carregar
function pageReady() {

    console.log("Page ready");
    //ligaçao servidor
    serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    serverConnection.onmessage = gotMessageFromServer;

    //setup dos elementos html
    disconnectButton = document.getElementById('disconnectButton');
    ftButton = document.getElementById('printFTButton');

    idtxt = document.getElementById('id');
    succtxt = document.getElementById('succ');
    predtxt = document.getElementById('pred');

    reqButton = document.getElementById('reqButton');
    inputI = document.getElementById('fi');
    messageInputBox = document.getElementById('message');
    receiveBox = document.getElementById('receivebox');
    fingerTableBox = document.getElementById('pftable');
    findKSuccBox = document.getElementById('fkBox');

    fileListBox = document.getElementById('fltable');

    inputKey = document.getElementById('key');
    inputI2 = document.getElementById('fi2');

    reqButton = document.getElementById('reqButton');
    inputI3 = document.getElementById('fk');

    setImgButton = document.getElementById('setImgButton');
    inputI4 = document.getElementById('flc');
    inputI4.setAttribute("max", localStorage.length);

    //fingerTable = newFingerTable();
}

//envia mensagem ao servidor para se ligar à rede p2p
function joinNetwork(event) {
    serverConnection.send(JSON.stringify({'type': "newNode"}));

    setInterval(stabilizeF, 1000);
    setInterval(checkConn, 1000);
    setInterval(printFT, 1000);
    setInterval(askSucc, 1000);
    setInterval(scanFiles, 1000);
    setInterval(printFL, 1000);
    setInterval(distributeFiles, 1500);
    // setInterval(fixFingers, 500);

}

//tratamento de mensagens recebidas pelo servidor
function gotMessageFromServer(message) {
    var n, data, dest, answer;
    var msg = JSON.parse(message.data);
    // Ignore messages from ourself
    if (msg.id === id) {
        console.log("me to me: discard!");
        return;
    }
    console.log("gotMessageFromServer:");
    console.log("|msg.id/id: '" + msg.id + "' / '" + id + "'\n|msg.type: " + msg.type);//+"\n|msg: "+JSON.stringify(msg));

    switch (msg.type) {
        case "newNode":
            id = msg.newid;
            console.log("id: " + id);
            idtxt.textContent = id;
            newSucc(msg.succ);
            //envia join ao sucessor
            if (msg.succ !== id) {
                serverConnection.send(JSON.stringify({'type': "join", 'id': id, 'dest': msg.succ}));
                connectTo(0);
            }

            break;

        case "join":
            console.log("join: " + msg.id);
            if (pred.id !== msg.id) {
                if (pred.id != null)
                    serverConnection.send(JSON.stringify({
                        'type': "notify",
                        'id': id,
                        'dest': pred.id,
                        'newsucc': msg.id
                    }));
                pred.id = msg.id;
                predtxt.textContent = msg.id;

            }
            break;

        case "notify":
            console.log("notify: " + msg.newsucc);
            newSucc(msg.newsucc);
            connectTo(0);
            break;

        case "sdp":
            // Only create answers in response to offers
            n = checkTables(msg.id, true);
            console.log("sdp!");
            //console.log("msg.data: "+JSON.stringify(msg.data));
            console.log("n: " + JSON.stringify(n));
            if (n.t === "FT") {
                if (!fingerTable[n.n].sdpStatus || msg.data.type == 'answer') {

                    console.log("sdp ft");
                    //dest = fingerTable[n.n].id;
                    dest = msg.id;
                    /*data = JSON.parse(msg.data);*/
                    console.log(n.n + ".signalingState: " + fingerTable[n.n].pc.signalingState);
                    console.log("ldesc / remdesc -> " + fingerTable[n.n].pc.localDescription + " / " + fingerTable[n.n].pc.remoteDescription);

                    fingerTable[n.n].pc.setRemoteDescription(new RTCSessionDescription(msg.data)).then(function () {
                        fingerTable[n.n].sdpStatus = true;
                        console.log("sdp type: " + msg.data.type);
                        if (msg.data.type == 'offer') {
                            fingerTable[n.n].pc.createAnswer().then(createdDescription).then(function (sdp) {
                                fingerTable[n.n].pc.setLocalDescription(sdp).then(function () {
                                    console.log("(ft)sdp answer: " + sdp);
                                    serverConnection.send(sendThroughServer(fingerTable[n.n].pc.localDescription, dest, "sdp"));
                                }).catch(errorHandler);
                            }).catch(errorHandler);
                        }
                    }).catch(errorHandler);
                }
            }
            //console.log("msg.data.sdp: \n"+msg.data.sdp);
            else if (n.t === "TP") {
                if (!tempPeers[n.n].sdpStatus || msg.data.type == 'answer') {
                    console.log("sdp tp");
                    dest = tempPeers[n.n].id;
                    tempPeers[n.n].pc.setRemoteDescription(new RTCSessionDescription(msg.data)).then(function () {
                        fingerTable[n.n].sdpStatus = true;
                        if (msg.data.type === 'offer') {
                            answer = tempPeers[n.n].pc.createAnswer().then(createdDescription).catch(errorHandler);
                            console.log("(tp)sdp answer: " + answer);
                            tempPeers[n.n].pc.setLocalDescription(answer);
                        }
                    }).catch(errorHandler);
                }
            } else
                console.log("sdp already set!");
            break;

        case "ice":
            n = checkTables(msg.id, false);
            console.log("n, n.n : " + JSON.stringify(n) + ", " + n.n);
            if (n.n === undefined) {
                n = checkTables(msg.id, true);
                connectTo(n.n);
            }
            console.log("ice! /sdptatus:" + fingerTable[n.n].sdpStatus);
            if (n.t === "FT") {
                if (fingerTable[n.n].sdpStatus && n !== null) {
                    // dest = fingerTable[n.n].id;
                    fingerTable[n.n].pc.addIceCandidate(new RTCIceCandidate(msg.ice)).catch(errorHandler);
                    console.log("ft.signalingState(" + n.n + "): " + fingerTable[n.n].pc.signalingState);
                    console.log("ldesc / remdesc -> " + fingerTable[n.n].pc.localDescription + " / " + fingerTable[n.n].pc.remoteDescription);
                } else if (n !== null) {
                    fingerTable[n.n].pendingICE.push(msg.ice);
                    console.log("ice push (" + n.n + ")");
                }
            }
            if (n.t === "TP") {
                if (tempPeers[n.n].sdpStatus && n !== null) {
                    // dest = tempPeers[n.n].id;
                    tempPeers[n.n].pc.addIceCandidate(new RTCIceCandidate(msg.ice)).catch(errorHandler);
                } else if (n !== null) {
                    fingerTable[n.n].pendingICE.push(msg.ice);
                    console.log("ice push (" + n.n + ")");
                }
            }

            break;

        case "fileID":
            console.log("got fileID! ::" + JSON.stringify(msg));
            pendingFiles.forEach(function (value, index) {
                // console.log(value.name+ " /// "+ msg.name);
                if (value.name === msg.name) {
                    // console.log("aoefoenv:!:!");
                    if (!fileList.includes(msg.fileid)) {
                        fileList.push(msg.fileid);
                    }
                    localStorage.setItem(msg.fileid, JSON.stringify({name: value.name, raw: value.raw}));
                }
                pendingFiles.splice(index, 1);
            });
            break;
    }
}

//tratamento de mensagens recebidas pelo datachannel
function handleReceiveMessage(event) {
    console.log("Datachannel!"/* From: " + event.target.label + " /msg: " + event.data*/);

    var msg = JSON.parse(event.data);

    switch (msg.type) {
        case "join":
            console.log("join: " + msg.id);
            if (pred.id !== msg.id) {
                pred.id = msg.id;
                predtxt.textContent = msg.id;
                if (pred.id != null) {
                    fingerTable.forEach(function (value) {
                        if (value.id === pred.id)
                            value.sendChannel.send(JSON.stringify({
                                'type': "notify",
                                'id': id,
                                'dest': pred.id,
                                'newsucc': msg.id
                            }));
                    });
                }

            }
            break;

        case "notify":
            console.log("notify: " + msg.newsucc);
            newSucc(msg.newsucc);
            connectTo(0);
            break;

        case "findKSucc":
            // console.log("findksucc{source:" + msg.source + ", key:" + msg.key + ", id:" + msg.id + "}");
            //TODO esta porra não é uma função que aceite thens. Vê lá se te safas doutra maneira. Obrigado
            n = findKeySuccessor(msg.key, msg.source);
            if (n === "pending") {
                console.log("pending");
                pendingFinds.push({"type": msg.type, "source": msg.source, "key": msg.key, "id": msg.id});
            }
            else if (n === "succ") {
                n = checkTables(msg.id, false);
                if (n.t === "FT") {
                    // console.log("found succ! Sending to finger " + n.n);
                    fingerTable[n.n].sendChannel.send(JSON.stringify({
                        "type": "gotKSucc",
                        "source": msg.source,
                        "key": msg.key,
                        "id": id,
                        "succ": fingerTable[0].id
                    }));
                }
                if (n.t === "TP") {
                    tempPeers[n.n].sendChannel.send(JSON.stringify({
                        "type": "gotKSucc",
                        "source": msg.source,
                        "key": msg.key,
                        "id": id,
                        "succ": fingerTable[0].id
                    }));
                }
            }
            else {
                n = checkTables(msg.id, false);
                if (n.t === "FT") {
                    // console.log("found succ! Sending to finger " + n.n);
                    fingerTable[n.n].sendChannel.send(JSON.stringify({
                        "type": "gotKSucc",
                        "source": msg.source,
                        "key": msg.key,
                        "id": id,
                        "succ": id
                    }));
                }
                if (n.t === "TP") {
                    tempPeers[n.n].sendChannel.send(JSON.stringify({
                        "type": "gotKSucc",
                        "source": msg.source,
                        "key": msg.key,
                        "id": id,
                        "succ": id
                    }));
                }
            }
            //});
            break;

        case "gotKSucc":
            // console.log("gotSucc{source:" + msg.source + ", key:" + msg.key + ", id:" + msg.id + "}");
            if (msg.source === id && msg.succ !== id) {
                var type = null;

                pendingFinds.forEach(function (value) {
                    if (value.key === msg.key)
                        type = value.type;
                });
                // console.log("gotksucc source==id");
                // writeFS("key: " + msg.key + " / succ: " + msg.succ);
                i = inFT(msg.succ, false);
                switch (type) {
                    case "find":
                        break;

                    case "send":
                        console.log("sending file:"+localStorage.getItem(msg.key)+" key: "+msg.key);
                        if (i !== null) {
                            fingerTable[i].sendChannel.send(JSON.stringify({
                                "type": "file",
                                "fileid": msg.key,
                                "id": id,
                                "data": localStorage.getItem(msg.key)
                            }));
                        } else {
                            var n = checkTables(msg.succ, true);
                            if (n.t === "FT") {
                                if (fingerTable[n.n].sendChannel.readyState === "open") {
                                    fingerTable[n.n].sendChannel.send(JSON.stringify({
                                        "type": "file",
                                        "fileid": msg.key,
                                        "id": id,
                                        "data": localStorage.getItem(msg.key)
                                    }));
                                } else
                                    pendingMsg.push(JSON.stringify({
                                        "type": "file",
                                        "fileid": msg.key,
                                        "id": id,
                                        "data": localStorage.getItem(msg.key)
                                    }));
                            }
                            if (n.t === "TP") {
                                tempPeers[n.n].sendChannel.send(JSON.stringify({
                                    "type": "gotKSucc",
                                    "key": msg.key,
                                    "id": id
                                }));
                            }
                        }
                        break;

                    case "askF":
                        if (i !== null) {
                            fingerTable[i].sendChannel.send(JSON.stringify({
                                "type": "askF",
                                "fileid": msg.key,
                                "id": id
                            }));
                        } else {
                            var n = checkTables(msg.succ, true);
                            if (n.t === "FT") {
                                if (fingerTable[n.n].sendChannel.readyState === "open") {
                                    fingerTable[n.n].sendChannel.send(JSON.stringify({
                                        "type": "askF",
                                        "fileid": msg.key,
                                        "id": id
                                    }));
                                } else
                                    pendingMsg.push(JSON.stringify({
                                        "type": "askF",
                                        "fileid": msg.key,
                                        "id": id
                                    }));
                            }
                            if (n.t === "TP") {
                                tempPeers[n.n].sendChannel.send(JSON.stringify({
                                    "type": "askF",
                                    "fileid": msg.key,
                                    "id": id
                                }));
                            }
                        }
                        break;

                    case "req":
                        console.log("req k/i"+msg.key+" / "+i);
                        if (i !== null) {
                            fingerTable[i].sendChannel.send(JSON.stringify({
                                "type": "reqFile",
                                "id": id,
                                "key": msg.key
                            }));
                        }
                        else {
                            var n = checkTables(msg.succ, true);
                            if (n.t === "FT") {
                                if (fingerTable[n.n].sendChannel.readyState === "open") {

                                    fingerTable[n.n].sendChannel.send(JSON.stringify({
                                        "type": "reqFile",
                                        "key": msg.key,
                                        "id": id
                                    }));
                                } else
                                    pendingMsg.push(JSON.stringify({
                                        "type": "reqFile",
                                        "key": msg.key,
                                        "id": id,
                                        "dest": fingerTable[n.n].id
                                    }));
                            }
                            if (n.t === "TP") {
                                tempPeers[n.n].sendChannel.send(JSON.stringify({
                                    "type": "gotKSucc",
                                    "key": msg.key,
                                    "id": id
                                }));
                            }
                        }
                        break;
                }

            } else if (msg.succ = id) {
                // console.log("It's me!");
                /*pendingFinds.forEach(function (value) {
                    if (value.key === msg.key)
                        type = value.type;
                });*/

            } else
                pendingFinds.forEach(function (value, index) {
                    if (value.source === msg.source && value.key === msg.key) {
                        var n = checkTables(value.id, false);
                        if (n.t === "FT") {
                            fingerTable[n.n].sendChannel.send(JSON.stringify({
                                "type": "gotKSucc",
                                "source": msg.source,
                                "key": msg.key,
                                "id": id,
                                "succ": msg.succ
                            }));
                        }
                        if (n.t === "TP") {
                            tempPeers[n.n].sendChannel.send(JSON.stringify({
                                "type": "gotKSucc",
                                "source": msg.source,
                                "key": msg.key,
                                "id": id,
                                "succ": msg.succ
                            }));
                        }
                        pendingFinds.splice(index, 1);
                    }
                });
            break;

        case "stabilize":
            if (pred.id !== null) {
                n = checkTables(msg.id, false);
                // console.log("sending pred to: " + fingerTable[n.n].id + " " + msg.id);
                if (n.t === "FT") {
                    fingerTable[n.n].sendChannel.send(JSON.stringify({
                        "type": "pred",
                        "pred": pred.id,
                        "id": id
                    }));
                }
                if (n.t === "TP") {
                    fingerTable[n.n].sendChannel.send(JSON.stringify({
                        "type": "pred",
                        "pred": pred.id,
                        "id": id
                    }));
                }
            }
            break;

        case "pred":
            if (msg.id === fingerTable[0].id && msg.pred !== id && pred !== null) {
                console.log("unstable! ::" + msg.pred);
                if (inFT(msg.pred) !== null) {
                    fingerTable[0].sendChannel.send(JSON.stringify({'type': "join", 'id': id, 'dest': succ}));
                }
                n = checkTables(msg.pred, true);
                connectTo(n.n);
            } //else console.log("stable!");
            break;

        case "img":
            var el = document.createElement("p");
            var ul = document.querySelector("#bag>ul");

            var li = document.createElement("li");
            li.innerHTML = event.data;
            //ul.appendChild(li);
            document.getElementById("preview").src = msg.data;
            break;

        case "askSucc":
            n = checkTables(msg.id, false);
            // console.log("sending finger " + n.n + " my succ");
            if (n.t === "FT") {
                fingerTable[n.n].sendChannel.send(JSON.stringify({type: "mySucc", id: id, mySucc: fingerTable[0].id}));
            }
            break;

        case "mySucc":
            // console.log("got "+msg.id+"'s succ ("+msg.mySucc+")");
            if (inFT(msg.mySucc) !== null || msg.mySucc === id)
                break;
            n = checkTables(msg.mySucc, true);
            connectTo(n.n);
            break;

        case "getFileList":
            n = checkTables(msg.id, false);
            // console.log("sending finger " + n.n + " my file list");

            var idValues = [];
            var i;
            for (i = 0; i < localStorage.length; i++) {
                idValues.push(localStorage.key(i));
            }
            // console.log('idValues over here: ' + idValues);

            if (n.t === "FT") {
                fingerTable[n.n].sendChannel.send(JSON.stringify({type: "fileList", id: id, list: idValues}));
            }
            break;

        case "fileList":
            msg.list.forEach(function (value) {
                if (!fileList.includes(value)) {
                    fileList.push(value);
                }
            });
            break;

        case "reqFile":
            console.log("File requisition!");
            console.log("sending file:"+localStorage.getItem(msg.key)+" key: "+msg.key);

            var data = localStorage.getItem(msg.key);
            n = checkTables(msg.id, false);
            if (n.t === "FT") {
                fingerTable[n.n].sendChannel.send(JSON.stringify({
                    type: "file",
                    id: id,
                    data: localStorage.getItem(msg.key),
                    fileid: msg.key
                }));
            }
            break;

        case "askF":
            var flig = false;
            for (i = 0; i < localStorage.length; i++)
                if (msg.fileid === localStorage.key(i))
                    flig = true;
            if (!flig) {
                n = checkTables(msg.id, false);
                if (n.t === "FT") {
                    fingerTable[n.n].sendChannel.send(JSON.stringify({
                        type: "reqFile",
                        id: id,
                        key: msg.fileid
                    }))
                }
            }


            break;

        case "file":
            console.log("msg.data: " + msg.data);
            console.log("msg.data parsed: " + JSON.parse(msg.data));
            var aux = JSON.parse(msg.data);

            if (!fileList.includes(msg.fileid)) {
                fileList.push(msg.fileid);
            }
            if (aux.raw !== "none")
                localStorage.setItem(msg.fileid, JSON.stringify({name: aux.name, raw: aux.raw}));
            if (aux.raw === "none")
                console.log("got empty data.raw");
                break;

        case "ping":
            n = checkTables(msg.id, true);
            var flog = true;
            if(n.t === "FT") {
                pings[n.n] = 0;
                /*pings.forEach(function (value) {
                    if (value.id === msg.id) {
                        value.c = 0;
                        flog = false;
                    }
                });
                if (flog) {
                    pings.push({id: msg.id, c: 0});
                }*/
            }
            break;
        default:
            writeP(event.data);
            break;
    }
}

//inicia os parametros de uma RTCPeerConnection
function startUp(i, t) {
    console.log("starting up " + i + t);
    if (t === "ft") {
        fingerTable[i].sdpStatus = false;
        fingerTable[i].pc.onicecandidate = function (event) {
            if (event.candidate != null) {
                var hmmm = JSON.stringify({'type': 'ice', 'ice': event.candidate, 'id': id, 'dest': fingerTable[i].id});
                serverConnection.send(hmmm);
            }
        };
        fingerTable[i].sendChannel = fingerTable[i].pc.createDataChannel("sendChannel." + i + "." + t);
        fingerTable[i].pc.ondatachannel = function (event) {
            fingerTable[i].receiveChannel = event.channel;
            fingerTable[i].receiveChannel.onmessage = handleReceiveMessage;
            fingerTable[i].receiveChannel.onopen = function () {
                console.log("(" + i + ") Receive channel's status has changed to " +
                    fingerTable[i].receiveChannel.readyState + "  //open");
            };
            fingerTable[i].receiveChannel.onclose = function () {
                console.log("(" + i + ") Receive channel's status has changed to closed //" + fingerTable[i].sendChannel.readyState);
                if (i === 0 && fingerTable[i].sendChannel.readyState === 'closed') {
                    console.log("restarting succ");
                    serverConnection.send(JSON.stringify({'type': "join", 'id': id, 'dest': fingerTable[0].id}));
                    newSucc(fingerTable[0].id);
                    connectTo(0);
                }
                else if (fingerTable[i].sendChannel.readyState === 'closed' /*&& fingerTable[i].sdpStatus === true*/) {
                    restartFinger(i);
                }
            };
        };
        // console.log("receiveChannel: "+fingerTable[i].receiveChannel.readyState+ " /sendChannel: "+fingerTable[i].sendChannel.readyState);
        fingerTable[i].sendChannel.onopen = handleSendChannelStatusChange(i, "ft", "open");
        fingerTable[i].sendChannel.onclose = handleSendChannelStatusChange(i, "ft", "close");
        fingerTable[i].pc.onsignalingstatechange = function () {

            console.log("SignalingState(" + i + "): " + fingerTable[i].pc.signalingState);
            //console.log("ldesc / remdesc -> " + fingerTable[i].pc.localDescription + " / " + fingerTable[i].pc.remoteDescription);
            if (fingerTable[i].pc.signalingState === "stable" && fingerTable[i].pc.localDescription !== null && fingerTable[i].pc.remoteDescription) {
                fingerTable[i].pendingICE.forEach(function (value) {
                    fingerTable[i].pc.addIceCandidate(value).catch(errorHandler);
                    console.log("ice pop (" + i + ")");
                });
            }
            if (fingerTable[i].pc.signalingState === "closed") {
                // aux = fingerTable[i].id;
                // fingerTable[i] = newFTElement(fingerIndex(i), aux);
                // startUp(i, "ft");
                // connectTo(i);
            }
        };
        pings[i] = 0;
    }
    if (t === "tp") {
        fingerTable[i].pc.onicecandidate = gotIceCandidate;
        tempPeers[i].sendChannel = fingerTable[i].pc.createDataChannel("sendChannel");
        tempPeers[i].pc.ondatachannel = receiveChannelCallback.then(function (event) {
            tempPeers[i].receiveChannel = event.channel;
            tempPeers[i].receiveChannel = handleReceiveMessage;
        });
        tempPeers[i].sendChannel.onopen = handleSendChannelStatusChange(i, "tp", "open");
        tempPeers[i].sendChannel.onclose = handleSendChannelStatusChange(i, "tp", "close");
        tempPeers[i].pc.onsignalingstatechange = function () {
            console.log("SignalingState: " + tempPeers[i].pc.signalingState);
            console.log("ldesc / remdesc -> " + tempPeers[i].pc.localDescription + " / " + tempPeers[i].pc.remoteDescription);

        };
        tempPeers[i].sdpStatus = false;
    }
}

//Inicia a ligação com peer
function connectTo(i) {
    fingerTable[i].pc.createOffer().then(createdDescription).then(function (sdp) {
        fingerTable[i].pc.setLocalDescription(sdp).then(function () {
            console.log("connectTo_ sdp(" + i + "): " + sdp);
            serverConnection.send(sendThroughServer(sdp, fingerTable[i].id, type = 'sdp'));
        });
    }).catch(errorHandler);

}

function errorHandler(error) {
    console.log(error);
}

//escreve na Message Box
function writeP(data) {
    var el = document.createElement("p");
    var txtNode = document.createTextNode(data);

    el.appendChild(txtNode);
    receiveBox.appendChild(el);
}

//escreve na FindSuccessorKeyBox
function writeFS(data) {
    var el = document.createElement("p");
    var txtNode = document.createTextNode(data);

    if (findKSuccBox.childNodes.length > 4)
        findKSuccBox.removeChild(findKSuccBox.firstChild);

    el.appendChild(txtNode);
    findKSuccBox.appendChild(el);
}

//Envia uma mensagem para outro peer através do servidor
//usado para o signaling
function sendThroughServer(data, dest, type) {
    console.log("sendThroughServer: " + dest + " / " + type + " / " + data);
    return JSON.stringify({'type': type, 'id': id, 'dest': dest, 'data': data});
}

//imprime a finger table na página
function printFT(event) {

    while (fingerTableBox.firstChild) {
        fingerTableBox.removeChild(fingerTableBox.firstChild);
    }

    var el = document.createElement("p");
    // writeP("i / id / Signaling State / Data Channels (Send/Receive)/ 2^(i-1)")
    data = "i / id / Signaling State / Data Channels (Send/Receive)/ 2^(i-1)";

    var txtNode = document.createTextNode(data);
    el.appendChild(txtNode);
    fingerTableBox.appendChild(el);
    fingerTable.forEach(function (value, index) {
        data = ((index + 1) + "\t/ " + value.id + "\t/ " + value.pc.signalingState + "\t/ " + value.sendChannel.readyState + "\t / " + value.i.toString());
        txtNode = document.createTextNode(data);
        el = document.createElement("p");
        el.appendChild(txtNode);
        fingerTableBox.appendChild(el);
    });
}

function printFL(event) {

    while (fileListBox.firstChild) {
        fileListBox.removeChild(fileListBox.firstChild);
    }

    var el = document.createElement("p");
    // writeP("i / id / Signaling State / Data Channels (Send/Receive)/ 2^(i-1)")


    fileList.forEach(function (value, index) {
        txtNode = document.createTextNode(value);
        el = document.createElement("p");
        el.appendChild(txtNode);
        fileListBox.appendChild(el);
    });
}

//procura sucessor
function findKeySuccessor(key, source) {
    s = source;
    if (source === null || source === undefined)
        s = id;

    var bik = bigInt(key, 16);
    var biid = bigInt(id, 16);
    var bisuc = bigInt(fingerTable[0].id, 16);

    if ((bik.greater(biid) && bisuc.greaterOrEquals(bik) && bisuc.greater(biid)) ||
        (bik.greaterOrEquals(bisuc) && bik.greater(biid) && biid.greaterOrEquals(bisuc)) ||
        (bik.greater(biid) && bisuc.greaterOrEquals(bik) && biid.greater(bisuc))) {
        // console.log("(key) succ!");
        return "succ";
    }
    for (var i = fingerTable.length - 1; i >= 0; i--) {
        var bif = bigInt(fingerTable[i].id, 16);
        if ((bik.greater(biid) && bik.greaterOrEquals(bif) && bif.greater(biid)) ||
            (bif.greater(bik) && bif.greater(biid) && biid.greater(bik)) ||
            (biid.greater(bif) && bik.greater(bif) && biid.greater(bik))) {
            // console.log("sent findKsucc to finger " + i);
            fingerTable[i].sendChannel.send(JSON.stringify({
                "id": id,
                "type": "findKSucc",
                "key": key,
                "source": s
            }));
            console.log("pending to "+i);
            return "pending";
        }
    }
    return null;

}

function fkBtnHandler() {
    n = findKeySuccessor(inputKey.value, id);//.then(function (n) {
    if (n === "succ") {
        console.log("!");
        /*fingerTable[0].sendChannel.send(JSON.stringify({
            "type": "reqFile",
            "key": inputKey.value,
            "id": id
        }));*/
    }
    else if (n === "pending") {
        console.log("pending");
        pendingFinds.push({"type": "find", "source": id, "key": inputKey.value, "id": id});
    }
    else console.log("none: " + n);
    inputKey.value = "";
    // });
}

function stabilizeF() {
    if (fingerTable.length >= 1 && fingerTable[0].sendChannel !== undefined && !pauseStabilize) {
        if (fingerTable[0].sendChannel.readyState === 'open') {
            fingerTable[0].sendChannel.send(JSON.stringify({"type": "stabilize", "id": id}));
        }
    }
}

function unpauseStabilize() {
    pauseStabilize = false;
}

function reqFile(fid, id) {
    var i = inputI3.value;
    var key = fileList[i - 1];

    console.log("requesting key: "+key+" // "+fileList[i-1]);

    n = findKeySuccessor(key, id);//.then(function (n) {
    if (n === "succ") {
        console.log("!");
        fingerTable[0].sendChannel.send(JSON.stringify({
            "type": "reqFile",
            "key": key,
            "id": id
        }));
    }
    else if (n === "pending") {
        console.log(n);
        pendingFinds.push({"type": "req", "source": id, "key": key, "id": id});
    }
    else
        console.log("none: " + n);

    inputKey.value = "";
}

//outros
function newFingerTable() {
    for (var i = 1; i <= m; i++) {
        fingerTable[i] = newFTElement(fingerIndex(i), 0);
    }
    console.log("FT ready");
}

function getIDfromPC(pc) {
    fingerTable.forEach(function (value, index) {
        if (fingerTable[index].pc === pc) {
            return index;
        }
    });
}

function logConnData(i) {
    console.log("id: " + fingerTable[i].id);
    console.log("SignalingState: " + fingerTable[i].pc.signalingState);
    console.log("ldesc / remdesc -> " + fingerTable[i].pc.localDescription + " / " + fingerTable[i].pc.remoteDescription);
    console.log("sendChannel state: " + fingerTable[i].sendChannel.readyState + " /sendChannel: " + fingerTable[i].sendChannel.readyState);
}


