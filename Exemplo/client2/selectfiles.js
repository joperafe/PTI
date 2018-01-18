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
        var name = file.name;
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (e) {
            var bin = e.target.result; //get file content

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

        console.log('this file ' + i);
    }
}