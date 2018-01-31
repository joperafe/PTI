var pendingFiles = [];
var tempFiles;

function readmultifiles(files) {

    var ul = document.querySelector("#bag>ul");
    while (ul.hasChildNodes()) {
        ul.removeChild(ul.firstChild);
    }

    function setup_reader(file, j) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (e) {
            var bin = e.target.result; //get file content
            caralho = bin;
            pendingFiles.forEach(function (value, index) {
                // console.log("pendingfile ("+j+")"+JSON.stringify(value));
                if (value.i === j) {
                    // console.log("pushing raw ::"+bin);
                    value.raw = bin;
                }
                if (value.raw === "nope") {
                    pendingFiles.splice(index, 1);
                    console.log("upload failed");
                }
            });
            // do sth with text
            // console.log('this size ' + bin.length);
            //var li = document.createElement("li");
            //li.innerHTML = bin;
            //ul.appendChild(li);
            //document.getElementById("preview").src = bin;
        }
    }

    for (var i = 0; i < files.length; i++) {
        console.log('file: ' + files[i].name);
        // console.log('this file ' + i);
        pendingFiles.push({name: files[i].name, i: i, raw: "nope"});
        setup_reader(files[i], i);
    }


}

function uploadFile(){
    pendingFiles.forEach(function (value, index) {
        if(value.raw !== "nope"){
            console.log("asking fileID");
            serverConnection.send(JSON.stringify({type: "fileID", name: value.name, i: value.i, id: id}))
        }
    });
    inputI4.setAttribute("max", localStorage.length);
}

function setImg(){
    var i = inputI4.value;
    console.log("setting img "+i);
    document.getElementById('preview').src = JSON.parse(localStorage.getItem(localStorage.key(i-1))).raw;
}

function sendImg() {
    var ii = inputI2.value;
    var message = pic;
    console.log('message ' + message);
    fingerTable[ii - 1].sendChannel.send(JSON.stringify({"type": "img", "data": message, "id": id}));
    messageInputBox.value = "";
    messageInputBox.focus();
}
