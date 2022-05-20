ilogin("Admin login?", localStorage["adm_login"], localStorage["adm_pass"]).then(e=>{
    if(!e) window.adminmode = false
})