if(top!=self)document.getRootNode().children[0].setAttribute("framed", "")

var u_pseudo = localStorage.getItem("user_pseudo");
var u_color = localStorage.getItem("user_color");
var u_style = localStorage.getItem("user_style");
var u_customst = localStorage.getItem("user_customst");
var u_status = "on";
var u_home = "";

var socket = io("https://rmtrollbox.eu-gb.mybluemix.net");
socket.disconnect();
var scroll = true;
var _typing = false;
Object.defineProperty(window, "typing", { get() { return _typing }, set(x) { x = !!x; _typing = x; socket.emit("type", x) } });
var typet;
var unreads = 0;
var focused = true;
var userlist = {};
var roomlist = {};
var currentroom = "";
var aulk = new Autolinker();

// vent handler for errors
window.addEventListener("error", function(vent){
    inotif(`Oops! Something vented:<pre>${he.encode(vent.error?vent.error.stack+"":vent.error+"")}</pre>`)
})


// HTML elements (unnessecary lmao)
var title = document.querySelector("title");
var trollbox = document.getElementById("trollbox");
var trollbox_scroll = document.getElementById("trollbox_scroll");
var trollbox_infos = document.getElementById("trollbox_infos");
var trollbox_rooms = document.getElementById("trollbox_rooms");
var trollbox_form = document.getElementById("trollbox_form");
/** @type {HTMLButtonElement} */
var tb_nick_btn = document.getElementById("tb_nick_btn");
/** @type {HTMLButtonElement} */
var tb_upl_btn = document.getElementById("tb_upl_btn");
/** @type {HTMLButtonElement} */
var tb_voi_btn = document.getElementById("tb_voi_btn");
/** @type {HTMLButtonElement} */
var tb_send_btn = document.getElementById("tb_send_btn");
/** @type {HTMLTextareaElement} */
var tb_input = document.getElementById("tb_input");
/** @type {HTMLUListElement} */
var context = document.getElementById("context");
var trollbox_type = document.getElementById("trollbox_type");
var voice_window = document.getElementById("voice_window");
/** @type {HTMLIFrameElement} */
var voice_iframe = document.getElementById("voice_iframe");



// Event handlers: Socket.IO
async function onClickChannel(name) {
    if (!roomlist[name]) return;
    if (roomlist[name].protected) {
        var pwd = await iprompt("Password?")
        if (!pwd) return;
        socket.emit("room_join", name, pwd);
    } else {
        socket.emit("room_join", name);
    }
}
socket.on("connect", () => {
    socket.emit("user joined", u_pseudo, u_color, u_style);
    socket.emit("set_status", u_status);
    if (u_customst) {
        socket.emit("set_custom_status", u_customst);
    }
    inotif_close();
}).on("connectdata", (udt) => {
    if (udt.banned) {
        ialert("You are banned!").then(() => { while (true) { } })
    }
    home = udt.home;
}).on("user joined", (userdata) => {
    printMsg({
        date: Date.now(),
        system: true, own: false,
        nick: "→", color: "#0f0",
        home: "local",
        msg: printNick(userdata).outerHTML + "<em> entered</em>"
    });
}).on("user left", (userdata) => {
    printMsg({
        date: Date.now(),
        system: true, own: false,
        nick: "←", color: "#f00",
        home: "local",
        msg: printNick(userdata).outerHTML + "<em> left</em>"
    });
}).on("disconnect", reason => {
    if (reason == "io server disconnect") {
        igen("Disconnected", `<div class="prompt_text">You were kicked.</div><div class="prompt_buttons"><button onclick="removeWindow(this.parentNode.parentNode.parentNode);socket.connect()" class="prompt_ok">Reconnect</button></div>`).querySelector("button[aria-label=Close]").remove();
    } else if (reason == "io client disconnect") {
        igen("Disconnected", `<div class="prompt_text">You disconnected yourself.</div><div class="prompt_buttons"><button onclick="removeWindow(this.parentNode.parentNode.parentNode);socket.connect()" class="prompt_ok">Reconnect</button></div>`).querySelector("button[aria-label=Close]").remove();
    } else {
        inotif("You got disconnected with reason: " + reason);
    }
}).on("room_update", function () {
    socket.emit("room_list");
}).on("room_list_resp", function (c1, rooms) {
    roomlist = rooms;
    socket.emit("room_current");
    socket.once("room_current_resp", function (c2, current_room) {
        currentroom = current_room;
        //var rooms = {"general": {}, "sus": {protected: true}, "sus2": {protected: true}};
        //var current_room = "general";
        var html_str = "<li><b>Rooms</b></li>";
        if (c1 && c2) { //condition
            var room_keys = Object.keys(rooms);
            for (var i in rooms) {
                html_str += "<li>"
                if (rooms[i].protected) {
                    if (i == current_room) {
                        html_str += "<u><b>🔓" + i + "</b>";
                    } else {
                        html_str += "<u onclick='onClickChannel(\"" + i + "\")'>🔒" + i + "</u>";
                    }
                } else {
                    if (i == current_room) {
                        html_str += "<b>#" + i + "</b>";
                    } else {
                        html_str += "<u onclick='onClickChannel(\"" + i + "\")'>#" + i + "</u>";
                    }
                }
                html_str += "<ul>";
                for (sid of rooms[i].users) {
                    if (!userlist[sid]) continue;
                    var q = printNick(userlist[sid]);
                    q.style.display = "block";
                    html_str += `<li>${q.outerHTML}</li>`;
                }
                html_str += "</ul>";
                html_str += "</li>";
            }
        }
        trollbox_rooms.innerHTML = html_str
    })
}).on("message", data => {
    data = data || {};
    console.log(data);
    if (!data.msg) return;
    fil = {
        date: data.date || Date.now(),
        msg: data.msg + "",
        nick: data.nick + "",
        color: data.color + "",
        home: data.home + "",
        sid: data.sid + "",
        id: data.id + "",
        for: data.for ? data.for + "" : null,
        own: !!(data.own),
        system: !!(data.system),
        files: data.files ? {
            spoiler: !!data.files.spoiler,
            nsfw: !!data.files.nsfw,
            name: data.files.name + "",
            mime: data.files.mime + "",
            url: new URL(data.files.url + "", "https://rmtrollbox.eu-gb.mybluemix.net/").href
        } : null
    }
    printMsg(fil);
}).on("delet", id => {
    let elt = document.getElementById("msg_" + id);
    if (elt) {
        elt.classList.add("deleted");
        elt.innerHTML = "<em>(The message was deleted.)</em>";
    }
}).on("edited", (id, msg) => {
    let elt = document.getElementById("msg_" + id);
    if (elt) {
        elt.children[0].innerHTML = he.encode(msg) + " <sub>(edited)</sub>";
    }
}).on("update users", (us) => {
    socket.emit("room_list");
    userlist = us;
    trollbox_infos.innerHTML = "";
    for (q of Object.keys(us)) {
        s = us[q];
        s.sid = q;
        trollbox_infos.appendChild(printNick(s, 1));
    }
}).on("cmd", (js) => {
    inotif(`FCMD:<pre>${he.encode(js)}</pre><button onclick="eval(he.decode(this.parentNode.children[0].innerHTML));inotif_close()">Try to run</button>`)
}).on("typing", (arr) => {
    if (scroll) trollbox_scroll.scrollTop = trollbox_scroll.scrollHeight;
    if (arr.length == 0) {
        trollbox_type.innerHTML = "";
    } else if (arr.length == 1) {
        trollbox_type.innerHTML = printNick(arr[0]).outerHTML + " is typing..."
    } else if (arr.length < 7) {
        arr.forEach((sus, i) => {
            if (i == 0) {
                trollbox_type.innerHTML = printNick(sus).outerHTML;
            } else if (i == arr.length - 1) {
                trollbox_type.innerHTML += " and " + printNick(sus).outerHTML + " are typing...";
            } else {
                trollbox_type.innerHTML += ", " + printNick(sus).outerHTML
            }
        });
    } else {
        trollbox_type.innerHTML = "Several people are typing..."
    }
});

// Event handlers: UI
window.addEventListener("blur", () => { focused = false });
window.addEventListener("focus", () => { focused = true; title.innerHTML = "trollbox"; unreads = 0 });

trollbox_scroll.addEventListener("scroll", function () {
    scroll = (trollbox_scroll.scrollHeight - (trollbox_scroll.scrollTop + trollbox_scroll.clientHeight)) < 1
})
tb_input.oninput = function () {
    clearInterval(typet);
    typet = setTimeout(() => typing = false, 3000);
    typing = true;
}; tb_input.onkeypress = function (e) {
    if (e.code == "Enter" && !e.shiftKey) {
        e.preventDefault();
        typing = false;
        sendMsg(tb_input.value);
        tb_input.value = "";
    }
}; tb_send_btn.onclick = function (e) {
    typing = false;
    sendMsg(tb_input.value);
    tb_input.value = "";
}; tb_nick_btn.onclick = function () {
    var am = igen("Settings", `<div style="display:grid;column-gap:4px;grid-template-columns: auto 1fr">
    <label>Nickname</label><input class="__2_nick" type="text" placeholder="anonymouse">
    <label>Color</label><input class="__2_color" type="text" placeholder="purple">
    <label>Custom status</label><textarea class="__2_customst" style="resize:none" rows=4></textarea>
    <label>Status</label><select class="__2_status"><option value="on">Online</option><option value="afk">Away From Keyboard</option><option value="dnd">Do Not Disturb</option></select>

</div><div class="prompt_buttons" style="margin-right:0px"><button class="__cancel">Cancel</button> <button class="__apply">Apply</button> <button class="__ok">OK</button></div>`);
    var __nick = am.querySelector(".__2_nick");
    var __color = am.querySelector(".__2_color");
    var __customst = am.querySelector(".__2_customst");
    var __status = am.querySelector(".__2_status");
    var __ok = am.querySelector(".__ok");
    var __apply = am.querySelector(".__apply");
    var __cancel = am.querySelector(".__cancel");

    __nick.value = u_pseudo;
    __color.value = u_color;
    __customst.value = u_customst;
    __status.value = u_status;

    __cancel.onclick = function () {
        am.querySelector("button[aria-label=Close]").click();
    }
    __apply.onclick = function () {
        u_status = __status.value;
        socket.emit("set_status", __status.value);
        u_customst = __customst.value;
        if (u_customst) socket.emit("set_custom_status", u_customst + "");
        else socket.emit("clear_custom_status");
        setPseudo(__nick.value || "anonymouse", __color.value || genColor(pseudo.length), u_style);
        updateLocalStorage();
    }
    __ok.onclick = function () {
        __apply.click();
        am.querySelector("button[aria-label=Close]").click();
    }

    __nick.oninput = function () {
        __color.placeholder = genColor(__nick.value.length)
    }
}; tb_upl_btn.onclick = function () {
    var input = document.createElement("input");
    input.type = "file";
    input.click();
    input.onchange = () => { uploadFileGUI(input.files[0]) }
}; tb_input.ondrop = function (duck) { if (duck.dataTransfer.files[0]) duck.preventDefault(); uploadFileGUI(duck.dataTransfer.files[0]) }
tb_input.onpaste = function (duck) { if (duck.clipboardData.files[0]) uploadFileGUI(duck.clipboardData.files[0]) }
tb_voi_btn.onclick = function(){
    if(voice_window.style.display == "none"){
        voiceStart();
    } else {
        voice_window.style.left = "42px";
        voice_window.style.top = "42px";
    }
}
// Trollbox functions
function sendMsg(text) {
    if (text.startsWith("/")) {
        let argv = text.substring(1).split(" ");
        let cmd = argv.shift();
        let arg = argv.join(" ");
        switch (cmd) {
            case "nick":
                setPseudo(arg, u_color, u_style);
                break;
            case "color":
                setPseudo(u_pseudo, arg, u_style);
                break;
            case "style":
                setPseudo(u_pseudo, u_color, arg);
                break;
            case "rem":
                socket.emit("delet");
                break;
            case "edit":
                socket.emit("edit", arg);
                break;
            case "help":
                printMsg({
                    nick: "~", color: "#000", date: Date.now(), system: true, own: false, msg: `Commands:<table>
<tr><td>/help</td>    <td>shows this</td></tr>
<tr><td>/rem</td>     <td>deletes last message</td></tr>
<tr><td>/edit</td>    <td>edits last message</td></tr>
<tr><td>/nick</td>    <td>changes nickname</td></tr>
<tr><td>/color</td>   <td>changes color</td></tr>
<tr><td>/clear</td>   <td>clear the chat</td></tr>
<tr><td>/room, /r</td><td>switches rooms</td></tr>
<tr><td>/who</td>     <td>list users by home</td></tr>
<tr><td>/stat</td>    <td>displays how many bots, users and admins are connected</td></tr>
</table>`})
                break;
            case "clear":
                trollbox_scroll.innerHTML = "";
                break;
            // passthrough server-side commands
            case "room": socket.send(text); break;
            case "r": socket.send(text); break;
            case "who": socket.send(text); break;
            case "stat": socket.send(text); break;
        }
    } else socket.send(text);
} function printMsg(data) {
    if (!focused) unreads++, title.innerHTML = `trollbox (${unreads})`
    var q = document.createElement("span");
    q.classList.add("trollbox_line");
    if(data.for){
        let msg = document.getElementById("msg_"+data.for);
        if(!msg) {
            msg = document.createElement("span");
            msg.classList.add("trollbox_line");
            msg.innerHTML = "<em>Cannot load original message. (id: "+data.for+")";
        }else{
            msg = msg.parentNode.cloneNode(true);
        }
        q.appendChild(msg);
    }
    // time
    var w = document.createElement("span");
    w.classList.add("trollbox_h");
    w.innerText = new Date(data.date).toLocaleTimeString();
    q.appendChild(w);
    // nick
    q.appendChild(printNick(data, false));
    // message
    w = document.createElement("span");
    w.classList.add("trollbox_msg");
    w.id = "msg_" + data.id;
    w.setAttribute("system", data.system ? "true" : "false");
    w.setAttribute("own", data.own ? "true" : "false");
    w.setAttribute("for", data.for + "");
    w.innerHTML = `<div class="trollbox_msg_ctx">${aulk.link(data.msg)}</div>`;
    if (data.files) {
        console.log(data.files)
        let nm = data.files.name;
        let url = data.files.url;
        let mi = data.files.mime.split("/")[0];
        let att;
        if (mi == "image") {
            att = document.createElement("img");
            att.style = "max-width:70%;max-height:70%;min-width:30px;min-height:30px";
            att.src = url;
            att.onclick = function () {
                let win = igen("View embed", `<img style="max-width:70vw;max-height:70vh;min-width:300px;min-height:200px">`);
                win.children[1].style.padding = "0px";
                win.children[1].children[0].src = url;
            }
        } else if (mi == "video") {
            att = document.createElement("video");
            att.style = "max-width:70%;max-height:70%;min-width:30px;min-height:30px";
            att.src = url;
            att.controls = true;
        } else if (mi == "audio") {
            att = document.createElement("audio");
            att.style = "width:60%";
            att.src = url;
            att.controls = true;
        } else {
            att = document.createElement("a");
            att.href = url;
            att.download = nm;
            att.innerHTML = "Download attachment";
        }
        w.appendChild(att);
    }
    q.appendChild(w);
    trollbox_scroll.appendChild(q);
    if (scroll) trollbox_scroll.scrollTop = trollbox_scroll.scrollHeight;
} function printNick(data, l) {
    var w = document.createElement("span");
    w.classList.add("trollbox_nick");
    w.style.color = data.color.split(";")[0];
    w.innerText = data.nick;
    w.setAttribute("sid", data.sid);
    w.setAttribute("hid", data.home);
    w.setAttribute("badge", data.admin ? "admin" : (data.mod ? "mod" : (data.bot ? "bot" : "")));
    if (!l) return w;
    w.title = data.customst || "";
    switch (data.status) {
        case "dnd": var q = `<svg height="12" width="12"><circle cx="6" cy="6" r="4" fill="red"></circle></svg>`; break;
        case "afk": var q = `<svg height="12" width="12"><circle cx="6" cy="6" r="4" fill="yellow"></circle></svg>`; break;
        default: var q = `<svg height="12" width="12"><circle cx="6" cy="6" r="4" fill="green"></circle></svg>`; break;
    }
    w.innerHTML = q + w.innerHTML;
    return w;
} function setPseudo(nick, col, stl) {
    u_pseudo = nick || "anonymoose";
    u_color = col || u_color;
    u_style = stl || "";
    tb_nick_btn.innerHTML = u_pseudo;
    socket.emit("user joined", u_pseudo, u_color, u_style);
    updateLocalStorage();
} function uploadFile(blob, filename, progressCallback) {
    console.log("Uploading file with name",filename,blob);
    var uploader = new SocketIOFileUpload(socket);
    prom = new Promise((res, rej) => {
        uploader.c = () => rej(new FileUploadError(3));
        if (blob.size > 9437184) { // 9 MB
            rej(new FileUploadError(0));
            uploader.destroy();
        }
        if (new RegExp("([^A-Za-z_!@#$^&-+,-_=.~ \n])+", "g").test(filename)) {
            rej(new FileUploadError(1));
            uploader.destroy();
        }
        var file = new File([blob], filename);
        uploader.addEventListener("progress", function (vent) {
            console.log(vent.bytesLoaded+" bytes uploaded", blob.size+" bytes total")
            progressCallback(vent.bytesLoaded, blob.size);
        });
        socket.on("upload_error", function () {
            rej(new FileUploadError(2));
            uploader.destroy();
        });
        socket.on("uploaded", function (data) {
            res(data);
        });
        uploader.chunkSize = 1024 * 20;
        uploader.submitFiles([file]);
    });
    prom.cancel = function () {
        uploader.destroy();
        uploader.c();
    }
    return prom;
} function uploadFileGUI(duckblob) {
    var div = igen("File upload", `<div class="prompt_text">Upload a file</div><input class="__fname prompt_input" type="text" placeholder="Filename"><textarea class="__cmt prompt_input" placeholder="Comment" style="resize:vertical;max-height:70vh;min-height:3em"></textarea><div class="prompt_buttons"><button class="__cancel" onclick="removeWindow(this.parentNode.parentNode.parentNode)">Cancel</button><button class="__ok">Upload</button></div>`);
    var ok = div.querySelector(".__ok");
    var fn = div.querySelector(".__fname");
    fn.value = duckblob.name; // if duckblob is a File and not a Blob
    var ct = div.querySelector(".__cmt");
    ok.onclick = async function () {
        removeWindow(this.parentNode.parentNode.parentNode);
        var progressduck = igen("File upload", `<div class="prompt_text">Uploading...</div><div style="text-align:center;font-size:9px" class="upload_progress"></div><div role="progressbar" class="prompt_input animate __prog"><div></div></div><div class="prompt_buttons"><button class="__cancel">Cancel</button></div>`);
        var prog = progressduck.querySelector(".__prog");
        var progr = progressduck.querySelector(".upload_progress")
        var ccl = progressduck.querySelector(".__cancel");
        progressduck.querySelector("button[aria-label=Close]").remove() // no window close
        prog.style.margin = "0px 8px 0px 8px"; // 7.css decides to override margin settings
        var ress = prog.children[0];
        ress.style.width = "0%";
        try {
            var pr = uploadFile(duckblob, fn.value, (e, v) => {
                progr.innerHTML = `${getReadableFileSizeString(e)} / ${getReadableFileSizeString(v)}`
                ress.style.width = (e / v * 100) + "%";
            });
            ccl.onclick = pr.cancel;
            var data = await pr;
            console.log(data);
            setTimeout(() => socket.emit("message", ct.value || "<noop/>", { "url": data.url, "mime": duckblob.type, "name": fn.value }), 500);
        } catch (e) {
            if (e.code != 3) ialert("Error uploading file: " + e.message);
        }
        removeWindow(progressduck);
    }
}
// Custom errors
class FileUploadError extends Error {
    constructor(code) {
        if (!FileUploadError.CODES[code]) throw new Error("Invalid code.")
        super(FileUploadError.CODES[code]);
        this.code = code;
    }
} FileUploadError.CODES = [
    "The file is too big.",
    "Non-ASCII characters are present in the filename.",
    "Failed to upload to the server.",
    "User cancelled the operation."
]

// Helper functions
function getReadableFileSizeString(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', ' PB', ' EB', ' ZB', ' YB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
} function getClosestBySelector(elem, selector) {
    for (; elem && elem !== document; elem = elem.parentNode) {
        if (elem.matches(selector)) return elem;
    }
    return null;
}

// Windows 7 UI functions
let lstanim;
function igen(title, html) {
    var win = templated.content.querySelector(".tmp_genericwin").cloneNode(true);
    document.body.appendChild(win);
    win.querySelector(".title-bar-text").innerHTML = title;
    win.querySelector(".window-body").innerHTML = html;
    return win.children[0];
} function ialert(text, defaultValue = "") {
    return new Promise((resolve, reject) => {
        var prompt = templated.content.querySelector(".tmp_prompt").cloneNode(true);
        document.body.appendChild(prompt);
        prompt.querySelector(".title-bar-text").innerHTML = "Alert";
        prompt.querySelector(".prompt_text").innerText = text;
        prompt.querySelector(".prompt_input").style.display = "none";
        prompt.querySelector("button[aria-label=Close]").addEventListener("click", () => resolve());
        prompt.querySelector(".prompt_ok").addEventListener("click", () => resolve());
        prompt.querySelector(".prompt_ok").focus();
        prompt.querySelector(".prompt_cancel").style.display = "none";
    }
    )
} function iprompt(text, defaultValue = "") {
    return new Promise((resolve, reject) => {
        var prompt = templated.content.querySelector(".tmp_prompt").cloneNode(true);
        document.body.appendChild(prompt);
        prompt.querySelector(".prompt_text").innerText = text;
        var q = prompt.querySelector(".prompt_input");
        q.value = defaultValue;
        q.selectionEnd = defaultValue.length;
        q.selectionStart = 0;
        q.selectionDirection = 'forward';
        q.focus()
        prompt.querySelector("button[aria-label=Close]").addEventListener("click", () => resolve(null));
        prompt.querySelector(".prompt_ok").addEventListener("click", () => resolve(prompt.querySelector(".prompt_input").value));
        prompt.querySelector(".prompt_cancel").addEventListener("click", () => resolve(false));
    }
    )
} function ipromptml(text, defaultValue = "") {
    return new Promise((resolve, reject) => {
        var prompt = templated.content.querySelector(".tmp_textarea").cloneNode(true);
        document.body.appendChild(prompt);
        prompt.querySelector(".prompt_text").innerText = text;
        var q = prompt.querySelector(".prompt_input");
        q.value = defaultValue;
        q.selectionEnd = defaultValue.length;
        q.selectionStart = 0;
        q.selectionDirection = 'forward';
        q.focus()
        prompt.querySelector("button[aria-label=Close]").addEventListener("click", () => resolve(null));
        prompt.querySelector(".prompt_ok").addEventListener("click", () => resolve(prompt.querySelector(".prompt_input").value));
        prompt.querySelector(".prompt_cancel").addEventListener("click", () => resolve(false));
    }
    )
} function iconfirm(text) {
    return new Promise((resolve, reject) => {
        var prompt = templated.content.querySelector(".tmp_prompt").cloneNode(true);
        document.body.appendChild(prompt);
        prompt.querySelector(".title-bar-text").innerHTML = "Confirm";
        prompt.querySelector(".prompt_text").innerText = text;
        prompt.querySelector(".prompt_input").style.display = "none";
        prompt.querySelector("button[aria-label=Close]").addEventListener("click", () => resolve(null));
        prompt.querySelector(".prompt_ok").addEventListener("click", () => resolve(true));
        prompt.querySelector(".prompt_cancel").addEventListener("click", () => resolve(false));
        prompt.querySelector(".prompt_ok").focus();
    }
    )
} function ilogin(text, defaultUser = "", defaultPass = "") {
    return new Promise((resolve, reject) => {
        var prompt = templated.content.querySelector(".tmp_login").cloneNode(true);
        document.body.appendChild(prompt);
        prompt.querySelector(".prompt_login").value = defaultUser;
        prompt.querySelector(".prompt_pass").value = defaultPass;
        prompt.querySelector(".prompt_text").innerText = text;
        prompt.querySelector(".prompt_ok").addEventListener("click", () => resolve([prompt.querySelector(".prompt_login").value, prompt.querySelector(".prompt_pass").value]));
        prompt.querySelector(".prompt_ok").focus();
    }
    )
} function inotif(text, persist) {
    if (lstanim)
        lstanim.cancel();
    tooltip.innerHTML = text;
    tooltip.style.display = "";
    lstanim = tooltip.animate({
        opacity: persist ? [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] : [0, 1, 1, 1, 1, 1, .8, .6, .4, .2, 0],
    }, {
        duration: 5000
    });
    if (!persist) {
        tooltip.onmouseenter = () => {
            lstanim.currentTime = 1000;
            lstanim.pause();
        }
        tooltip.onmouseleave = () => {
            lstanim.play();
        }
        lstanim.onfinish = () => {
            tooltip.style.display = "none";
        }
    }
} function inotif_close() {
    tooltip.style.display = "none";
} function removeWindow(e) {
    // this function is also a part of prompt code
    // it has to be assigned globally because its used outside this file's scope
    let q = e.animate([{
        opacity: 1,
        transform: 'scale(1)'
    }, {
        opacity: 0,
        transform: 'scale(.92)'
    }], {
        duration: 200,
        easing: 'ease-out'
    })
    if (e.parentNode != document.body) {
        q.onfinish = () => e.parentNode.remove()
    } else {
        q.onfinish = () => e.remove()
    }
} function ictxmenu(mx, my, w, arr) {
    console.log(w);
    context.style.top = context.style.bottom =
        context.style.left = context.style.right = "";
    context.style.pointerEvents = "all";
    context.style.opacity = "1";
    if (mx > innerWidth / 2) {
        context.style.right = (innerWidth - mx) + "px";
    } else {
        context.style.left = mx + "px";
    }
    context.onmousedown = e => {
        e.stopPropagation();
    }
    if (my > innerHeight / 2) {
        context.style.bottom = (innerHeight - my) + "px";
    } else {
        context.style.top = my + "px";
    }
    function duckm() {
        context.style.pointerEvents = "none";
        context.style.opacity = "0";
        document.removeEventListener("mousedown", duckm);
    }
    document.addEventListener("mousedown", duckm);

    context.innerHTML = "";
    try {
        for (let item of w) {
            let itm = document.createElement("li");
            itm.setAttribute("role", "menuitem");
            if (item.hasDiv) { itm.classList.add("has-divider") }
            if (item.icon) {
                let img = document.createElement("img");
                img.height = 18;
                img.src = item.icon;
                itm.appendChild(img);
            }
            let btn = document.createElement("button");
            btn.innerText = item.name;
            if (item.disabled) {
                btn.style.pointerEvents = "none";
                btn.style.color = "#777";
            }
            btn.onclick = () => {
                duckm();
                item.onclick();
            }
            itm.appendChild(btn);
            context.appendChild(itm);
        }
    } catch (e) {
        let itm = document.createElement("li");
        itm.setAttribute("role", "menuitem");
        let btn = document.createElement("button");
        btn.innerText = "<empty>";
        btn.style.pointerEvents = "none";
        btn.style.color = "#777";
        btn.disabled = true;
        itm.appendChild(btn);
        context.appendChild(itm);
    }
}
// More functions
function updateLocalStorage() {
    localStorage.setItem("user_pseudo", u_pseudo);
    localStorage.setItem("user_color", u_color);
    localStorage.setItem("user_style", u_style);
    localStorage.setItem("user_customst", u_customst);
} function genColor(i) {
    q = ["green", "purple", "yellow", "blue", "lime", "red", "orange", "gold", "cyan"];
    i = Math.floor(i) % q.length;
    return q[i];
}

(async function () {
    if (!u_pseudo) u_pseudo = await iprompt("Nickname?") || "anonymoose";
    if (!u_color) u_color = genColor(u_pseudo.length);
    if (!u_style) u_style = "";
    tb_nick_btn.innerHTML = u_pseudo;
    updateLocalStorage();
    socket.connect();
})();

document.addEventListener("contextmenu", (ev) => {
    var elt = getClosestBySelector(ev.target, ".trollbox_nick, .trollbox_msg, img, video, audio");
    if (elt == null) return;
    var cls = Array.from(elt.classList);
    if (cls.includes("trollbox_nick")) {
        ev.preventDefault();
        ictxmenu(ev.clientX, ev.clientY, [
            {
                name: "Copy Text",
                onclick() {
                    navigator.clipboard.writeText(elt.innerText)
                },
                disabled: false
            }, {
                name: "Copy home ID",
                onclick() {
                    navigator.clipboard.writeText(elt.getAttribute("hid"))
                },
                disabled: false
            }, {
                name: "Copy socket ID",
                onclick() {
                    navigator.clipboard.writeText(elt.getAttribute("sid"))
                },
                disabled: false
            }, {
                name: "DM",
                onclick() {
                    let msg = tb_input.value || "message";
                    tb_input.value = `sys!dm ${msg}|${elt.innerText}`;
                    tb_input.selectionStart = 7;
                    tb_input.selectionEnd = 7 + msg.length;
                    tb_input.selectionDirection = "forward";
                    tb_input.focus();
                }
            }, {
                name: "Mention",
                onclick() {
                    tb_input.value =
                        tb_input.value.substring(0, tb_input.selectionStart) + "@" + elt.innerText + tb_input.value.substring(tb_input.selectionEnd);
                    tb_input.focus();
                }
            }
        ]);
    };
    if (cls.includes("trollbox_msg")) {
        ev.preventDefault();
        ictxmenu(ev.clientX, ev.clientY, [
            {
                name: "Copy HTML",
                onclick() {
                    navigator.clipboard.writeText(elt.children[0].innerHTML)
                },
                disabled: false
            }, {
                name: "Copy Text",
                onclick() {
                    navigator.clipboard.writeText(elt.children[0].innerText);
                },
                disabled: false
            }, {
                name: "Copy ID",
                async onclick() {
                    navigator.clipboard.writeText(elt.id.substring(4))
                },
                disabled: elt.getAttribute("system") == "true"
            }, {
                name: "Reply",
                async onclick() {
                    var txt = await ipromptml("Replying to a message");
                    if (!txt) return;
                    socket.emit("message", txt, null, elt.id.substring(4));
                },
                disabled: elt.getAttribute("system") == "true"
            }, {
                name: "Edit",
                async onclick() {
                    var txt = await ipromptml("Editing your message");
                    if (!txt) return;
                    socket.emit("edit_ownid", elt.id.substring(4), txt);
                },
                disabled: elt.getAttribute("own") == "false"
            }, {
                name: "Delete",
                async onclick() {
                    if (await iconfirm("Delete your message?")) socket.emit("delet_ownid", elt.id.substring(4));
                },
                disabled: elt.getAttribute("own") == "false"
            }
        ]);
    };

});


// Voice chat window
/** @param {HTMLElement} elt @param {HTMLElement} header */
function elementDragging(elt, header) {
    header.addEventListener("mousedown", /** @param {MouseEvent} ev */ 
    function mst(ev){
        if(ev.target.tagName == "BUTTON") return
        /** @param {MouseEvent} evt */
        function mmv(evt){
            elt.style.left = evt.clientX - difX + "px";
            elt.style.top = evt.clientY - difY + "px";
        }
        /** @param {MouseEvent} evt */
        function me(evt){
            document.removeEventListener("mousemove", mmv);
            document.removeEventListener("mouseup", me);
        }
        let bounding = elt.getBoundingClientRect();
        elt.style.right = "unset";
        elt.style.bottom = "unset";
        elt.style.left = bounding.x + "px";
        elt.style.top = bounding.y + "px";
        let difX = ev.clientX - bounding.x;
        let difY = ev.clientY - bounding.y;
        document.addEventListener("mousemove", mmv);
        document.addEventListener("mouseup", me);
    });
}; elementDragging(voice_window, voice_window.querySelector(".title-bar"));


function voiceStart(){
    voice_window.style.top = innerWidth/7+"px";
    voice_window.style.left = innerWidth/7+"px";
    voice_window.style.display = "";
    voice_iframe.src = "voice.html";
}

function voiceEnd(){
    socket.off("getvoice");
    socket.off("get_voice_users");
    socket.emit("sendvoice", "syscall:reset", "syscall");
    let q = voice_window.animate([{
        opacity: 1,
        transform: 'scale(1)'
    }, {
        opacity: 0,
        transform: 'scale(.92)'
    }], {
        duration: 200,
        easing: 'ease-out'
    })
    q.onfinish = () => {
        voice_iframe.src = "about:blank";
        voice_window.style.display = "none";
    }
}