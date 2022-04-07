if(self == top) alert("DID YOU JUST TRY TO OPEN THIS IN A NEW TAB? XD");

var socket = parent.socket;
var ducks = {};
var curruser = "";

window.onbeforeunload = function(){
    socket.emit('voice_disconnect');
    socket.off("getvoice");
    socket.off("get_voice_users");
    socket.off("connect", _s_connect);
}

socket.on("connect", _s_connect);

function _s_connect(){
    socket.emit("voice_connectvc");
}

socket.on("get_voice_users", function update(duks){
    ducks = duks || ducks;
    if(!ducks.includes(curruser)){
        curruser = ducks[0];
    }
    users.innerHTML = "";
    for(let duc of ducks){
        let dq = document.createElement("div");
        dq.innerText = duc;
        if(curruser == duc){
            dq.style.fontWeight = "bold";
        } else {
            dq.onclick = () => {
                curruser = duc;
                update();
            }
        }
        users.appendChild(dq);
    }
})

_s_connect();


var q = new AudioContext()
var astack = [];

socket.on("getvoice", async (sus)=>{
    if(!sus[curruser]) return;
    var {mime,data} = sus[curruser];
    console.log("data received with mime "+mime, data);

    var ddt = await q.decodeAudioData(data)
    var v = new AudioBufferSourceNode(q, {buffer: ddt});
    v.connect(q.destination);
    astack.push(v);
    v.onended = function(){
        astack.shift();
        if(astack[0] && !astack[0].ducked){
            astack[0].start();
            astack[0].ducked = true;
        }
    }
    if(!astack[0].ducked){
        astack[0].start();
        astack[0].ducked = true;
    }
});