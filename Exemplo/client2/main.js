var peerConnection;
var uuid;
var sdpStatus = false;
var pic;

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

function pageReady() {
    uuid = uuid();

    console.log("pageReady (uuid: ", uuid,")");

    serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    serverConnection.onmessage = gotMessageFromServer;
   
    connectButton = document.getElementById('connectButton');
    disconnectButton = document.getElementById('disconnectButton');
    sendButton = document.getElementById('sendButton');
    messageInputBox = document.getElementById('message');
    receiveBox = document.getElementById('receivebox');
}

function start(isCaller) {
    console.log("isCaller: ", isCaller);
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;
    sendChannel = peerConnection.createDataChannel("sendChannel");
    sendChannel.onopen = handleSendChannelStatusChange;
    sendChannel.onclose = handleSendChannelStatusChange;
    peerConnection.ondatachannel = receiveChannelCallback;

    //connectButton.disabled = true;
    //disconnectButton.disabled = false;

    if(isCaller) {
        peerConnection.createOffer().then(createdDescription).catch(errorHandler);
    }
}

function handleLocalAddCandidateSuccess() {
    connectButton.disabled = true;
  }


function handleRemoteAddCandidateSuccess() {
    disconnectButton.disabled = false;
}

function gotMessageFromServer(message) {
    console.log("gotMessageFromServer:");
    if(!peerConnection) start(false);

    var signal = JSON.parse(message.data);
    console.log(signal);
    // Ignore messages from ourself
    console.log("signal.uuid/uuid: '" + signal.uuid +"' / '" + uuid+"'");
    if(signal.uuid === uuid) return;

    if(signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
            // Only create answers in response to offers
            if(signal.sdp.type == 'offer') {
                peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
            }
        }).catch(errorHandler);
        sdpStatus = true;
    } else if(signal.ice && sdpStatus) {
        console.log("sdpStatus: " + sdpStatus);
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    }
}

function gotIceCandidate(event) {
    console.log("gotIceCandidate: ",event);
    if(event.candidate != null) {
        serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
    }
}

function gotIceCandidate(event) {
    console.log("gotIceCandidate: ",event);
    if(event.candidate != null) {
        serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
    }
}

function createdDescription(description) {
    console.log('got description: ', description);

    peerConnection.setLocalDescription(description).then(function() {
        serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
}

function errorHandler(error) {
    console.log(error);
}

function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}





  // Handle status changes on the local end of the data
  // channel; this is the end doing the sending of data
// in this example.
function handleSendChannelStatusChange(event) {
    if (sendChannel) {
      var state = sendChannel.readyState;
    
      if (state === "open") {
        messageInputBox.disabled = false;
        messageInputBox.focus();
        sendButton.disabled = false;
        disconnectButton.disabled = false;
        connectButton.disabled = true;
      } else {
        messageInputBox.disabled = true;
        sendButton.disabled = true;
        connectButton.disabled = false;
        disconnectButton.disabled = true;
      }
    }
}

  // Called when the connection opens and the data
// channel is ready to be connected to the remote.

function receiveChannelCallback(event) {
    receiveChannel = event.channel;
    receiveChannel.onmessage = handleReceiveMessage;
    receiveChannel.onopen = handleReceiveChannelStatusChange;
    receiveChannel.onclose = handleReceiveChannelStatusChange;
}

// Handle onmessage events for the receiving channel.
// These are the data messages sent by the sending channel
function handleReceiveMessage(event) {
    var el = document.createElement("p");
    /*var txtNode = document.createTextNode(event.data);
    
    el.appendChild(txtNode);
    receiveBox.appendChild(el);*/
    var ul = document.querySelector("#bag>ul");

    var li = document.createElement("li");
    li.innerHTML = event.data;
    ul.appendChild(li);
    document.getElementById("pre").src = event.data;
}

 // Handle status changes on the receiver's channel.
    if (receiveChannel) {
function handleReceiveChannelStatusChange(event) {
      console.log("Receive channel's status has changed to " +
                  receiveChannel.readyState);
    }
    
    // Here you would do stuff that needs to be done
    // when the channel's status changes.
}

function disconnectPeers() {
  
    // Close the RTCDataChannels if they're open.
    
    sendChannel.close();
    receiveChannel.close();
    
    // Close the RTCPeerConnections
    
    peerConnection.close();

    sendChannel = null;
    receiveChannel = null;
    peerConnection = null;
    
    // Update user interface elements
    
    connectButton.disabled = false;
    disconnectButton.disabled = true;
    sendButton.disabled = true;
    
    messageInputBox.value = "";
    messageInputBox.disabled = true;
}


window.onload = function () {
    if (typeof window.FileReader !== 'function') {
        alert("The file API isn't supported on this browser yet.");
    }
}


function readmultifiles(files) {
    var ul = document.querySelector("#bag>ul");
    while (ul.hasChildNodes()) {
        ul.removeChild(ul.firstChild);
    }

    function setup_reader(file) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (e) {
            var bin = e.target.result; //get file content
            pic = bin;
            // do sth with text
            console.log('this size ' + bin.length);
            var li = document.createElement("li");
            li.innerHTML = bin;
            ul.appendChild(li);
            document.getElementById("pre").src = bin;
        }
    }

    for (var i = 0; i < files.length; i++) {
        setup_reader(files[i]);
        console.log('this name of file ' + files[i].name);
        console.log('this file ' + i);
    }
}

function sendMessage() {
    var message = pic;
    console.log('message ' + message);
    sendChannel.send(message);
    messageInputBox.value = "";
    messageInputBox.focus();
}