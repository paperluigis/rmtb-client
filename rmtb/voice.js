if (self == top)
    alert("DID YOU JUST TRY TO OPEN THIS IN A NEW TAB? XD");

var socket = parent.socket;
var ducks = {};
var phoneimg = new Image();
phoneimg.src = "phone.png";
var curruser = "";
var ctx = disp.getContext("2d", {
    alpha: false
});
disp.width = innerWidth;
disp.height = innerHeight;
window.addEventListener("resize", ()=>{
    disp.width = innerWidth;
    disp.height = innerHeight;
}
)

window.onbeforeunload = function() {
    socket.emit('voice_disconnect');
    socket.off("getvoice");
    socket.off("get_voice_users");
    socket.off("connect", _s_connect);
}

socket.on("connect", _s_connect);

function _s_connect() {
    socket.emit("voice_connectvc");
}

socket.on("get_voice_users", function update(duks) {
    ducks = duks || ducks;
    if (!ducks.includes(curruser)) {
        curruser = ducks[0];
    }
    users.innerHTML = "";
    for (let duc of ducks) {
        let dq = document.createElement("div");
        dq.innerText = duc;
        if (curruser == duc) {
            dq.style.fontWeight = "bold";
        } else {
            dq.onclick = ()=>{
                curruser = duc;
                update();
            }
        }
        users.appendChild(dq);
    }
})

_s_connect();

var config = {
    deaf: false
}

var stack = [];
Object.defineProperty(window, "stack0", {
    get() {
        return stack[0];
    }
})
socket.on("getvoice", async(sus)=>{
    if (!sus[curruser])
        return;
    var {mime, data} = sus[curruser];
    var type = mime.split("/")[0];
    console.log("data received with mime " + mime, data);

    if (type == "video" || type == "audio") {
        var d = document.createElement("video");
        d.onresize = function(){
            d.width = d.videoWidth;
            d.height = d.videoHeight;
        }
    }
    if (type == "image")
        var d = document.createElement("img");

    d.blob = new Blob([data]);
    d.type = type
    d.src = URL.createObjectURL(d.blob);
    d.onended = d.onerror = function() {
        URL.revokeObjectURL(d.src);
        stack.shift();
        if (stack0)
            stack0.playbackRate = 1;
    }
    d.play();
    if (stack.length)
        d.playbackRate = 0;
    stack.push(d);
    if (stack.length > 16)
        stack = stack.slice(-16)
}
);
function loop() {
    ctx.fillStyle = "#000";
    ctx.clearRect(0, 0, disp.width, disp.height);
    if (stack0) {
        if (stack0.videoWidth && stack0.videoHeight) {
            drawImageScaled(stack0, ctx);
        } else {
            drawImageScaled(phoneimg, ctx);
        }
    } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, disp.width, disp.height);
    }
}
(function e() {
    loop();
    requestAnimationFrame(e);
}
)();

control_disconnect.onclick = ()=>parent.voiceEnd();
control_deafen.onclick = ()=>{}

// fine you know that this code is stolen
// https://stackoverflow.com/questions/23104582/scaling-an-image-to-fit-on-canvas
function drawImageScaled(img, ctx) {
    var canvas = ctx.canvas;
    var hRatio = canvas.width / img.width;
    var vRatio = canvas.height / img.height;
    var ratio = Math.min(hRatio, vRatio);
    var centerShift_x = (canvas.width - img.width * ratio) / 2;
    var centerShift_y = (canvas.height - img.height * ratio) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
}
