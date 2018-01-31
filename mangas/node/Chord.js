var ffcount = 0;
var scanCount = 0;
var distCount = 0;
var pings = [50];


//novo elemento da tabela de peers temporarios
function newTempPeer(id) {
    var me = {
        pc: new RTCPeerConnection(peerConnectionConfig),
        id: id,
        pendingICE: []
    };
    return me;
}

//novo elemento da finger table
function newFTElement(i, id) {
    var me = {
        pc: new RTCPeerConnection(peerConnectionConfig),
        id: id,
        i: i,
        pendingICE: []
        //f: fingerIndex(id),
    };
    return me;
}

//Estabelece o novo sucessor
function newSucc(succ) {
    console.log("new succ: " + succ);
    var auxPeer;
    if (fingerTable.length > 0) {
        // auxPeer = fingerTable[0];
        fingerTable[0].pc.close();
        fingerTable.shift();
    }
    fingerTable.unshift(newFTElement(fingerIndex(0), succ));
    startUp(0, "ft");
    serverConnection.send(JSON.stringify({'type': "join", 'id': id, 'dest': succ}));
    // var n = checkTables(auxPeer.id, true);
    succtxt.textContent = succ;
}

//verifica se um id está ou se pode ser adicionado à finger table
//tem a opção de verificação apenas ou de addicionar mesmo
//na opção de adicionar caso não encaixe na finger table é
//colocado na tabela de peers temporários
function checkTables(newid, add) {
    if (newid === id)
        return null;

    var n = inFT(newid);
    var loc = "OoOops";
    var k;
    // console.log("!!N: " + n);
    if (n === null) {
        console.log('add: ' + add);
        n = checkFT(newid);
        console.log('n2(' + n.length + '): ' + n);
        if (n.length === 0) {
            n = inTP(newid);
            loc = "TP";
            console.log('n3: ' + n);
            if (n === null) {
                n = tempPeers.length;
                tempPeers.push(newTempPeer(newid));
                startUp(0, "tp");
            }
        } else {
            loc = "FT";
            // fingerTable[n[0]] = newFTElement(n[0], newid);
            k = n[0];
            flag = true;
            if (fingerTable[n[0]] !== undefined) {
                if (fingerTable[n[0]].id === newid) {

                    k = n[0];
                    return {t: loc, n: k};
                }
            }
            if (add) {
                if (n[0] === 0) {
                    console.log("check produced new succ");
                    // aux = fingerTable[0].id;
                    newSucc(newid);
                    connectTo(0);
                    flag = false;
                    /*if (aux !== id) {
                        aux = checkTables(aux, true);
                        if (aux.n !== undefined)
                            connectTo(aux.n);
                    }*/
                } else {
                    console.log("nao foi succ, foi " + n[0]);
                    aux = id;
                    if (fingerTable[n[0]] !== undefined) {
                        aux = fingerTable[n[0]].id;
                        fingerTable[n[0]].pc.close();
                    }
                    fingerTable[n[0]] = newFTElement(fingerIndex(n[0]), newid);
                    startUp(n[0], "ft");
                    flag = false;
                    /*if (aux !== id) {
                        aux = checkTables(aux, true);
                        if (aux.n !== undefined)
                            connectTo(aux.n);
                    }*/
                }
                console.log("k: " + n[0]);
                k = n[0];
            }

            if (flag && add) {
                // var flag2 = true;
                // var i = ;
                // do {
                console.log("checktables last if");
                k = fingerTable.length;
                fingerTable.push(newFTElement(fingerIndex(k), newid));
                startUp(k, "ft");
                // }while(flag2)
            }
            inputI.setAttribute("max", fingerTable.length);
            n = k;
            console.log('n4: ' + n);
            pings[n] = 0;
        }
    } else
        loc = "FT";
    return {t: loc, n: n};
}

//verifica se um determinado id está na finger table
function inFT(id) {
    var foo = null;
    fingerTable.forEach(function (item, index, array) {
        if (item.id === id) {
            // console.log("found " + id + " in " + index + "   /" + item.id);
            foo = index;
        }
    });
    return foo;
}

//verifica se um determinado id está na tabela de peers temporários
function inTP(id) {
    tempPeers.forEach(function (item, index, array) {
        if (item.id === id)
            return index;
    });
    return null;
}

//verifica se um id preenche os parâmetros para estar na finger table
function checkFT(dest) {
    var newfinger = [];
    biid = bigInt(id, 16);
    bidest = bigInt(dest, 16);
    // console.log("id: " + biid.toString() + ", dest: " + bidest + ", m: " + m + ", 2^m:" + max.toString());
    for (var j = 1; j <= m; j++) {
        var aux = bigInt(2).pow(j - 1);
        //fi = bigInt(id, 16);
        //aux = aux.plus(bigInt(id, 16));
        var fi = biid.plus(aux);
        if (fi.greater(max))
            fi = fi.minus(max);

        if (typeof fingerTable[j - 1] !== 'undefined') {
            var biprev = bigInt(fingerTable[j - 1].id, 16);
            console.log("j:" + j + " /fi: " + fi.toString() + " /biprev: " + biprev.toString() + " /bidest: " + bidest.toString());
            // console.log("dest/fi/ft[j-1]: " + bigInt(dest, 16).toString() + " / " + fi.toString() + " / " + bigInt(fingerTable[j - 1].id, 16).toString());
            if ((bidest.greaterOrEquals(fi) && !bidest.greater(biprev)) ||
                (fi.greater(biprev) && biprev.greaterOrEquals(bidest) && biid.greater(bidest)) ||
                (bidest.greaterOrEquals(fi) && biid.greater(biprev) && bidest.greaterOrEquals(biprev)) ||
                (bidest.greaterOrEquals(fi) && fi.greater(biprev) && bidest.greater(biprev))) {

                newfinger.push(j - 1);
                if (j < 5) console.log("checkFT_ j d: " + j);
            }
        }
        else {
            if (j < 0) console.log("checkFT_ j u: " + j);
            newfinger.push(j - 1)
            //if(((j/m)*100)%10===0)
            //console.log("filling the table "+(j/m)*100+"%");
        }
        prev = j;
    }
    //console.log("new finger: " + newfinger);
    return newfinger;
}

//calculates the value in the ith element of the finger table
function fingerIndex(i) {

    var aux = bigInt(2).pow(i);
    aux = bigInt(id, 16).plus(aux);
    if (aux.greater(max))
        aux = aux.minus(max);
    return aux;
}

//função que vai verificando e reparando ligações quebradas
function checkConn() {
    var fleg = false;



    fingerTable.forEach(function (value, index) {
        /*var flog = true;
        /*var j = 0;
        var ji = -1;
        pings.forEach(function (value2, index2) {
            if(value2.id === value.id)
                flog = false;
                j = value2.c;
                ji = index2;
        });
        if(flog){
            pings.push({id: value.id, c:0});
        }

        if(value.receiveChannel && pings[ji]) {
            try{
            value.sendChannel.send(JSON.stringify({type: "ping", id: id}));}
            catch (e) {console.log("sendChannel não definido");}
            pings[ji].c++;
        }*/
        pings[index]++;
        try{
            value.sendChannel.send(JSON.stringify({type: "ping", id: id}));}
        catch (e) {
            pings[index]++;
            console.log("sendChannel não definido");
        }
        // value.sendChannel.send(JSON.stringify({type: "ping", id: id}));

        if (value.sendChannel.readyState === "connecting" || value.sendChannel.readyState === "closed" || pings[index]>10) {

            if (downList.indexOf(index) >= 0) {
                console.log("cc +1 in " + index);
                i = downList.indexOf(index);
                downCount[i]++;
                if (downCount[i] > 10 && fingerTable.length > 1)
                    restartFinger(index);
                if (downCount[i] > 20) {
                    console.log("cc Terminating finger _" + index);
                    pauseStabilize = true;
                    // pings[ji]=0;
                    setTimeout(unpauseStabilize, 5000);
                    fleg = true;
                    downList.splice(i, 1);
                    downCount.splice(i, 1);
                    fingerTable.splice(index, 1);
                    if (index === 0 && fingerTable[0]) {
                        fingerTable[0].sendChannel.send(JSON.stringify({'type': "join", 'id': id}));
                    }
                }
            } else {
                console.log("cc Finger Down! _" + index);
                // restartFinger(index);
                downList.push(index);
                downCount.push(0);
            }
        }
        else if (downList.indexOf(index) >= 0) {
            console.log("cc finger active again! _" + index);
            i = downList.indexOf(index);
            downList.splice(i, 1);
            downCount.splice(i, 1);
            pings[index] = 0;
            pendingMsg.forEach(function (value2) {
                aux = JSON.parse(value2);
                if (aux.dest === fingerTable[index].id) {
                    fingerTable[index].sendChannel.send(value2);
                }
            });

        }
    });
    if (fleg) {
        fingerTable.forEach(function (value, index) {
            value.i = fingerIndex(index);
        })
    }
}

//Reinicia a ligação RTC do dedo i
function restartFinger(i) {
    console.log("restarting finger No " + i);
    auxID = fingerTable[i].id;
    fingerTable[i] = newFTElement(fingerIndex(i), auxID);
    startUp(i, "ft");
    connectTo(i);
}

//pergunta a determinado nó o seu sucessor
function askSucc() {

    if (ffcount >= fingerTable.length-1)
        ffcount = 0;
    if (fingerTable[ffcount] !== undefined && fingerTable[ffcount].receiveChannel !== undefined) {
        // console.log("asking finger " + ffcount + " his succ");
        try {
            fingerTable[ffcount].sendChannel.send(JSON.stringify({type: "askSucc", id: id}));
        } catch (e) {console.log("error: "+e);}
    }
    ffcount++;
}

function scanFiles(){
    inputI3.setAttribute("max", fileList.length);
    inputI4.setAttribute("max", localStorage.length);
    for (i = 0; i < localStorage.length; i++) {
        if (!fileList.includes(localStorage.key(i)))
            fileList.push(localStorage.key(i));
    }

    if (scanCount >= fingerTable.length-1)
        scanCount = 0;
    if (fingerTable[scanCount] !== undefined) {
        // console.log("asking finger " + scanCount + " his file list");
        try {fingerTable[scanCount].sendChannel.send(JSON.stringify({type: "getFileList", id: id}));} catch (e) {console.log("error: "+e);}
    }
    scanCount++;
}

function distributeFiles(){
    if(distCount >= localStorage.length)
        distCount = 0;
    if(localStorage.key(distCount) !== undefined && localStorage.length>0 && fingerTable.length > 0) {
        k = localStorage.key(distCount);
        n = findKeySuccessor(k, id);
        if (n === "succ") {
            console.log("!");
            fingerTable[0].sendChannel.send(JSON.stringify({
                "type": "askF",
                "fileid": k,
                "id": id
            }));
        }else if (n===null) {
            console.log("null fks :"+n+" / k: "+k);
        }
        else if (n.includes("pending")) {
            console.log("pending ::"+k);
            pendingFinds.push({"type": "askF", "source": id, "key":k, "id": id});
        }
        // else console.log("none: "+n);
        distCount++;
    }
}

/////////////Outros

function fixFingers() {
    console.log("fixing finger " + ffcount);
    aux = fingerTable[ffcount].id;
    aux2 = aux.charAt(aux.length - 1);
    if (aux2 < 10 && aux2 >= 0) {
        aux2++;
        aux2 = decToHexa(aux2);
    } else switch (aux2) {
        case "a":
            aux2 = "b";
            break;
        case "b":
            aux2 = "c";
            break;
        case "c":
            aux2 = "d";
            break;
        case "d":
            aux2 = "e";
            break;
        case "e":
            aux2 = "f";
            break;
        case "f":
            aux2 = "0";
            break;
    }
    aux3 = aux.substr(0, aux.length - 1);
    aux3 = aux3.concat(aux2);
    console.log("aux: " + aux + " / aux2: " + aux2 + " / aux3: " + aux3);

    n = findKeySuccessor(aux);
    ffcount++;
    if (ffcount === fingerTable.length)
        ffcount = 0;
}

function decToHexa(c) {
    var aux = c.toString();
    console.log(typeof aux);
    switch (aux) {
        case '10':
            aux = 'a';
            break;
        case '11':
            aux = 'b';
            break;
        case '12':
            aux = 'c';
            break;
        case '13':
            aux = 'd';
            break;
        case '14':
            aux = 'e';
            break;
        case '15':
            aux = 'f';
            break;
    }
    console.log("dectohex: " + c + "->" + aux);
    return aux;
}