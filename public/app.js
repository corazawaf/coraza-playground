var ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:21.0) Gecko/20100101 Firefox/21.0";
var directives = CodeMirror(document.querySelector("#directives"), {
    value: "",
    theme: "ayu-dark",
    mode: "none"
});

var http_req = CodeMirror(document.querySelector("#httprequest"), {
    value: "",
    theme: "ayu-dark",
    mode: "http"
});

var http_res = CodeMirror(document.querySelector("#httpresponse"), {
    value: "",
    theme: "ayu-dark",
    mode: "http"
});

$('#use_crs').prop("checked", true);

function build_table(selector, data) {
    var tbody = selector.getElementsByTagName("tbody")[0];
    tbody.innerHTML = "";
    for (var i = 0; i < data.length; i++) {
        var collection = data[i];
        var tr = document.createElement("tr");
        var td = document.createElement("td");
        for(var j = 0; j < collection.length; j++) {
            var col = collection[j];
            var td = document.createElement("td");
            td.appendChild(document.createTextNode(col));
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

function run() {
    var req = http_req.getValue();
    var regex = /Content-length:.*\n/g;
    try {
        //WIP
        var sp = req.split("\n\n", 2);
        if (sp.length > 1) {
            req = req.replace(regex, "Content-length: " + sp[1].length + "\n");
            http_req.setValue(req);
        }
    } catch (err) { }
    var crs = $('#use_crs').prop('checked');
    var result = playground(directives.getValue(), http_req.getValue(), http_res.getValue(), crs?true:false);
    console.log(result);
    if (result.error) {
        alert(result.error);
        return;
    }
    $('#transaction_id').text(result.transaction_id);
    var collections = JSON.parse(result.collections);
    var matched_data = JSON.parse(result.matched_data);
    var audit_log = result.audit_log;
    build_table(document.getElementById("collections_table"), collections);
    build_table(document.getElementById("matched_data_table"), matched_data);
    $('#auditlog').text(audit_log);
	$('#disruptive_action').text(result.disruptive_action)
	$('#disruptive_rule').text(result.disruptive_rule)
	$('#duration').text(result.duration)
    $('#rules_matched_total').text(result.rules_matched_total)
    window.localStorage.setItem("directives", directives.getValue());
    window.localStorage.setItem("httprequest", http_req.getValue());
    window.localStorage.setItem("httpresponse", http_res.getValue());
}

function filtercols(ele) {
    var val = ele.value.toLowerCase();
    $("#collections tr").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(val) > -1)
    });
}
const go = new Go();
WebAssembly.instantiateStreaming(fetch("playground.wasm"), go.importObject).then((result) => {
    directives.setValue(window.localStorage.getItem("directives") || ""); 
    http_req.setValue(window.localStorage.getItem("httprequest") || "");
    http_res.setValue(window.localStorage.getItem("httpresponse") || "");
    go.run(result.instance);
});   