var siteslider = document.querySelector('.site-slider');
function haslocalStorage() {
    var idValues = [];
    var i;
    var localImages = [];
    var listStorage = document.createElement('div');
    listStorage.className = 'boxslider';
    listStorage.style = "width: auto; position: relative;";
    if (localStorage.length != 0){

        for (i = 0; i < localStorage.length; i++) {
            idValues.push(localStorage.key(i));
            var para = document.createElement('li');
            var image = document.createElement('img');

            console.log('local   '+ localStorage.getItem(idValues[i]));
            localImages[i] = localStorage.getItem(idValues[i]);
            console.log('local images '+ localImages[i]);
            image.className = ('mySlides');
            image.src = localImages[i];
            image.style = "width:10%";
/*            console.log('preview I '+ image.src);
            console.log('this i ' + i);
            console.log('this image '+ idValues[i]);*/
            image.alt = i;
            /*console.log('this image alt '+ image.alt);*/
            para.style="float: none; list-style: none; position: absolute; width: 1519px; z-index: 0; display: none;";
            listStorage.appendChild(image);
            console.log('image append   ' + image);

        }
        siteslider.appendChild(listStorage);
        carousel();
        console.log('idValues over here    ' + idValues);
        return idValues;
    }
}


var myIndex = 0;
function carousel() {
    var i;
    var x = document.getElementsByClassName("mySlides");
    for (i = 0; i < x.length; i++) {
        x[i].style.display = "none";
        console.log('display::  ' + i);
    }
    myIndex++;
    if (myIndex > x.length) {myIndex = 1}
    x[myIndex-1].style.display = "block";
    setTimeout(carousel, 2000); // Change image every 2 seconds
}
