/**
 * Copyright 2023 The OWASP Coraza contributors
 * SPDX-License-Identifier: Apache-2.0
 */

var ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:21.0) Gecko/20100101 Firefox/21.0";
var directives = CodeMirror(document.querySelector("#directives"), {
    value: "",
    theme: "ayu-dark",
    mode: "seclang",
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2
});

var http_req = CodeMirror(document.querySelector("#httprequest"), {
    doc: "GET / HTTP/1.1\nHost: localhost\nUser-Agent: Example User-Agent\n\n",
    theme: "ayu-dark",
    mode: "http"
});

var http_res = CodeMirror(document.querySelector("#httpresponse"), {
    value: "",
    theme: "ayu-dark",
    mode: "http"
});

var auditlog_editor = CodeMirror(document.querySelector("#auditlog-editor"), {
    value: "No audit log data available",
    theme: "ayu-dark",
    mode: {name: "javascript", json: true},
    readOnly: true,
    lineNumbers: true,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    lineWrapping: true,
    indentUnit: 2,
    smartIndent: true
});

// Theme management
function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getCodeMirrorTheme(effectiveTheme) {
    return effectiveTheme === 'light' ? 'ayu-light' : 'ayu-dark';
}

function getEffectiveTheme(theme) {
    if (theme === 'auto') {
        return getSystemTheme();
    }
    return theme;
}

function applyTheme(theme) {
    const effectiveTheme = getEffectiveTheme(theme);
    const root = document.documentElement;
    
    // Set theme attribute
    root.setAttribute('data-theme', theme);
    
    // Update CodeMirror themes
    const cmTheme = getCodeMirrorTheme(effectiveTheme);
    directives.setOption('theme', cmTheme);
    http_req.setOption('theme', cmTheme);
    http_res.setOption('theme', cmTheme);
    auditlog_editor.setOption('theme', cmTheme);
    
    // Refresh CodeMirror instances
    setTimeout(refreshCodeMirrorInstances, 50);
    
    // Save preference
    localStorage.setItem('theme', theme);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    $('#theme-selector').val(savedTheme);
    applyTheme(savedTheme);
    
    // Listen for system theme changes when in auto mode
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function() {
        const currentTheme = $('#theme-selector').val();
        if (currentTheme === 'auto') {
            applyTheme('auto');
        }
    });
}

// Initialize UI
$(document).ready(function() {
    $('#use_crs').prop("checked", true);
    
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize theme
    initializeTheme();
    
    // Theme selector change handler
    $('#theme-selector').on('change', function() {
        const selectedTheme = $(this).val();
        applyTheme(selectedTheme);
    });
    
    // Load saved state
    loadFromStorage();
    
    // Update last analysis time
    updateLastAnalysisTime();
    
    // Refresh CodeMirror instances after DOM is ready
    setTimeout(function() {
        refreshCodeMirrorInstances();
    }, 100);
});

// Function to refresh CodeMirror instances
function refreshCodeMirrorInstances() {
    setTimeout(function() {
        directives.refresh();
        http_req.refresh();
        http_res.refresh();
        auditlog_editor.refresh();
        
        // Force a size recalculation
        directives.setSize(null, null);
        http_req.setSize(null, null);
        http_res.setSize(null, null);
        auditlog_editor.setSize(null, null);
    }, 50);
}

// Show/hide loading spinner
function showLoading() {
    $('#loading-spinner').show();
    $('#run-btn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i> Analyzing...');
}

function hideLoading() {
    $('#loading-spinner').hide();
    $('#run-btn').prop('disabled', false).html('<i class="fas fa-play me-1"></i> Run Analysis');
}

// Toast notifications
function showToast(type, message) {
    const toastId = type === 'success' ? 'success-toast' : 'error-toast';
    const messageId = type === 'success' ? 'success-message' : 'error-message';
    
    $('#' + messageId).text(message);
    const toast = new bootstrap.Toast(document.getElementById(toastId));
    toast.show();
}

function showSuccess(message) {
    showToast('success', message);
}

function showError(message) {
    showToast('error', message);
}

// Update statistics in sidebar (will be updated by updateResults with filtered counts)
function updateStats(results) {
    // Note: sidebar stats are now updated in updateResults with filtered security rules
    updateLastAnalysisTime();
}

function updateLastAnalysisTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    $('#last-analysis').text(timeString);
}

// Build table with improved styling
function build_table(selector, data) {
    var tbody = selector.getElementsByTagName("tbody")[0];
    
    // Remove all existing data rows but keep structure
    var existingRows = tbody.querySelectorAll('tr:not(.no-data)');
    existingRows.forEach(row => row.remove());
    
    if (!data || data.length === 0) {
        // Show "no data" message if it exists, otherwise create it
        let noDataRow = tbody.querySelector('.no-data');
        if (noDataRow) {
            noDataRow.style.display = 'table-row';
        } else {
            // Create no-data row if it doesn't exist
            noDataRow = document.createElement('tr');
            noDataRow.className = 'no-data';
            const colspan = (selector.id === 'matched_data_table' || selector.id === 'crs_data_table') ? '2' : '4';
            let message, icon;
            
            if (selector.id === 'matched_data_table') {
                message = 'No custom rules matched. Run an analysis to see results.';
                icon = 'info-circle';
            } else if (selector.id === 'crs_data_table') {
                message = 'No CRS rules matched. Run an analysis to see results.';
                icon = 'shield-alt';
            } else {
                message = 'No collections data. Run an analysis to populate.';
                icon = 'database';
            }
            
            noDataRow.innerHTML = `<td colspan="${colspan}" class="text-center text-muted py-4">
                <i class="fas fa-${icon} me-2"></i>${message}
            </td>`;
            tbody.appendChild(noDataRow);
        }
        return;
    }
    
    // Hide "no data" message
    const noDataRow = tbody.querySelector('.no-data');
    if (noDataRow) {
        noDataRow.style.display = 'none';
    }
    
    for (var i = 0; i < data.length; i++) {
        var collection = data[i];
        var tr = document.createElement("tr");
        tr.className = "fade-in";
        
        for(var j = 0; j < collection.length; j++) {
            var col = collection[j];
            var td = document.createElement("td");
            
            // Special formatting for rule IDs
            if ((selector.id === 'matched_data_table' || selector.id === 'crs_data_table') && j === 0) {
                const badgeClass = selector.id === 'matched_data_table' ? 'bg-danger' : 'bg-info';
                td.innerHTML = '<span class="badge ' + badgeClass + ' font-mono">' + col + '</span>';
            } else {
                td.appendChild(document.createTextNode(col));
            }
            
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

// Enhanced run function with better error handling
function run() {
    showLoading();
    
    try {
        var req = http_req.getValue();
        
        // Auto content length calculation
        if ($('#defaultCheck1').prop('checked')) {
            var regex = /Content-length:.*\n/gi;
            var sp = req.split("\n\n", 2);
            if (sp.length > 1) {
                var bodyLength = new TextEncoder().encode(sp[1]).length;
                req = req.replace(regex, "Content-Length: " + bodyLength + "\n");
                http_req.setValue(req);
            }
        }
        
        var crs = $('#use_crs').prop('checked');
        var result = playground(directives.getValue(), http_req.getValue(), http_res.getValue(), crs);
        
        console.log('Analysis result:', result);
        
        if (result.error) {
            showError('Analysis failed: ' + result.error);
            hideLoading();
            return;
        }
        
        // Update UI with results
        updateResults(result);
        
        // Save to localStorage
        saveToStorage();
        
        // Update statistics
        updateStats(result);
        
        showSuccess('Analysis completed successfully!');
        
    } catch (error) {
        console.error('Run error:', error);
        showError('An unexpected error occurred: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Update results with enhanced formatting
function updateResults(result) {
    // Overview tab
    $('#transaction_id').text(result.transaction_id || '-');
    
    // Enhanced disruptive action display
    const disruptiveAction = result.disruptive_action || 'none';
    const disruptiveRule = result.disruptive_rule || '-';
    const disruptiveStatus = result.disruptive_status || 0;
    
    $('#disruptive_action').text(disruptiveAction);
    $('#disruptive_rule').text(disruptiveRule);
    
    // Add status code if available
    if (disruptiveStatus && disruptiveStatus > 0) {
        $('#disruptive_action').text(disruptiveAction + ' (' + disruptiveStatus + ')');
    }
    
    $('#rules_matched_total').text(result.rules_matched_total || '0');
    
    // Format duration properly
    const duration = result.duration || 0;
    $('#duration').text(duration.toLocaleString() + ' μs');
    
    // Update engine status
    const engineStatus = result.engine_status || 'Unknown';
    $('#engine_status').text(engineStatus);
    
        // Parse and display data
    try {
        var collections = JSON.parse(result.collections || '[]');
        var matched_data = JSON.parse(result.matched_data || '[]');
        var audit_log = result.audit_log || 'No audit log data available';
        
        // Filter and categorize matched rules
        var customRules = [];
        var crsRules = [];
        var administrativeRules = [];
        
        if (matched_data && matched_data.length > 0) {
            matched_data.forEach(function(rule) {
                const ruleId = parseInt(rule[0], 10);
                
                if (isAdministrativeRule(ruleId)) {
                    // Completely filter out administrative rules
                    administrativeRules.push(rule);
                } else if (isCRSRule(ruleId)) {
                    // CRS rules (security-relevant)
                    crsRules.push(rule);
                } else {
                    // Custom user-defined rules
                    customRules.push(rule);
                }
            });
            
            // Sort all arrays numerically by rule ID
            customRules.sort(function(a, b) {
                return parseInt(a[0], 10) - parseInt(b[0], 10);
            });
            crsRules.sort(function(a, b) {
                return parseInt(a[0], 10) - parseInt(b[0], 10);
            });
            administrativeRules.sort(function(a, b) {
                return parseInt(a[0], 10) - parseInt(b[0], 10);
            });
            
            console.log('Custom Rules:', customRules.length);
            console.log('CRS Rules:', crsRules.length);
            console.log('Administrative Rules (filtered out):', administrativeRules.length);
        }
        
        // Update counts with filtered rules
        const customRulesCount = customRules.length;
        const crsRulesCount = crsRules.length;
        const totalRulesCount = result.rules_matched_total || '0';
        const adminRulesCount = administrativeRules.length;
        
        $('#rules-count').text(customRulesCount);
        $('#crs-rules-count').text(crsRulesCount);
        $('#rules_matched_total').text(customRulesCount);
        $('#crs_rules_total').text(crsRulesCount);
        
        // Update sidebar stats (total of all visible rules)
        const totalVisibleRules = customRulesCount + crsRulesCount;
        $('#sidebar-rules-matched').text(totalVisibleRules);
        
        console.log(`Rule filtering: ${totalRulesCount} total → ${customRulesCount} custom + ${crsRulesCount} CRS + ${adminRulesCount} administrative`);
            
            // Debug logging (can be removed in production)
            // console.log('Collections data:', collections);
            // console.log('Matched rules data (sorted):', matched_data);
            // console.log('Rules matched total:', result.rules_matched_total);
            
                        // Build tables - use filtered rules for respective displays
            build_table(document.getElementById("collections_table"), collections);
            build_table(document.getElementById("matched_data_table"), customRules);
            build_table(document.getElementById("crs_data_table"), crsRules);
            
                            // Update audit log with formatted JSON
        try {
            if (audit_log && audit_log !== 'No audit log data available') {
                const auditObj = JSON.parse(audit_log);
                const formattedAudit = JSON.stringify(auditObj, null, 2);
                auditlog_editor.setValue(formattedAudit);
            } else {
                auditlog_editor.setValue('No audit log data available');
            }
        } catch (error) {
            console.error('Error parsing audit log:', error);
            auditlog_editor.setValue(audit_log || 'Error parsing audit log');
        }
            
            // Show status badge
            $('#status-badge').show().text('Complete');
        
    } catch (error) {
        console.error('Error parsing results:', error);
        showError('Error parsing analysis results');
    }
}

// Function to determine if a rule is a CRS rule
function isCRSRule(ruleId) {
    // CRS rules are generally in the 900000+ range, but excluding administrative ones
    return ruleId >= 900000 && !isAdministrativeRule(ruleId);
}

// Function to determine if a rule is purely administrative (should be filtered out)
function isAdministrativeRule(ruleId) {
    // CRS configuration rules (900000 to < 901000)
    if (ruleId >= 900000 && ruleId < 901000) {
        return true;
    }
    
    // Reporting rules (above 949000)
    if (ruleId > 949000) {
        return true;
    }
    
    // Special rules
    if (ruleId === 941010 || ruleId === 921170) {
        return true;
    }
    
    // Paranoia level detection rules (900000-1000000 range ending in 11-18)
    if (ruleId >= 900000 && ruleId <= 1000000) {
        const lastTwoDigits = ruleId % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 18) {
            return true;
        }
    }
    
    return false;
}

// Enhanced filter function with better performance
function filtercols(ele) {
    var val = ele.value.toLowerCase();
    $("#collections_table tbody tr:not(.no-data)").each(function() {
        var row = $(this);
        var text = row.text().toLowerCase();
        row.toggle(text.indexOf(val) > -1);
    });
}

// Save state to localStorage
function saveToStorage() {
    try {
        window.localStorage.setItem("directives", directives.getValue());
        window.localStorage.setItem("httprequest", http_req.getValue());
        window.localStorage.setItem("httpresponse", http_res.getValue());
        window.localStorage.setItem("use_crs", $('#use_crs').prop('checked'));
        window.localStorage.setItem("auto_content_length", $('#defaultCheck1').prop('checked'));
    } catch (error) {
        console.warn('Could not save to localStorage:', error);
    }
}

// Load state from localStorage
function loadFromStorage() {
    try {
        const savedDirectives = window.localStorage.getItem("directives");
        const savedRequest = window.localStorage.getItem("httprequest");
        const savedResponse = window.localStorage.getItem("httpresponse");
        const savedCRS = window.localStorage.getItem("use_crs");
        const savedAutoLength = window.localStorage.getItem("auto_content_length");
        
        if (savedDirectives) directives.setValue(savedDirectives);
        if (savedRequest) http_req.setValue(savedRequest);
        if (savedResponse) http_res.setValue(savedResponse);
        if (savedCRS !== null) $('#use_crs').prop('checked', savedCRS === 'true');
        if (savedAutoLength !== null) $('#defaultCheck1').prop('checked', savedAutoLength === 'true');
    } catch (error) {
        console.warn('Could not load from localStorage:', error);
    }
}

// Clear all data
function clearAll() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        directives.setValue('');
        http_req.setValue('GET / HTTP/1.1\nHost: localhost\nUser-Agent: Example User-Agent\n\n');
        http_res.setValue('');
        
        // Clear results
        $('#transaction_id').text('-');
        $('#disruptive_action').text('none');
        $('#disruptive_rule').text('-');
        $('#rules_matched_total').text('0');
        $('#crs_rules_total').text('0');
        $('#duration').text('0 μs');
        $('#engine_status').text('Ready');
        $('#rules-count').text('0');
        $('#crs-rules-count').text('0');
        $('#sidebar-rules-matched').text('0');
        auditlog_editor.setValue('No audit log data available');
        $('#status-badge').hide();
        
        // Clear tables
        $('#collections_table tbody').html('<tr class="no-data"><td colspan="4" class="text-center text-muted py-4"><i class="fas fa-database me-2"></i>No collections data. Run an analysis to populate.</td></tr>');
        $('#matched_data_table tbody').html('<tr class="no-data"><td colspan="2" class="text-center text-muted py-4"><i class="fas fa-info-circle me-2"></i>No custom rules matched. Run an analysis to see results.</td></tr>');
        $('#crs_data_table tbody').html('<tr class="no-data"><td colspan="2" class="text-center text-muted py-4"><i class="fas fa-shield-alt me-2"></i>No CRS rules matched. Run an analysis to see results.</td></tr>');
        
        // Reset theme to auto
        $('#theme-selector').val('auto');
        applyTheme('auto');
        
        // Clear localStorage
        try {
            window.localStorage.removeItem("directives");
            window.localStorage.removeItem("httprequest");
            window.localStorage.removeItem("httpresponse");
            window.localStorage.removeItem("use_crs");
            window.localStorage.removeItem("auto_content_length");
            window.localStorage.removeItem("theme");
        } catch (error) {
            console.warn('Could not clear localStorage:', error);
        }
        
        showSuccess('All data cleared successfully');
    }
}

// Load example configuration
function loadExample() {
    const exampleDirectives = `# Example WAF Configuration

# Change SecRuleEngine to DetectionOnly if you want to see all rules matched
SecRuleEngine On
SecRequestBodyAccess On
SecResponseBodyAccess On

# SQL Injection Detection Rule
SecRule ARGS "@detectSQLi" \\
    "id:1001,\\
     phase:2,\\
     block,\\
     msg:'SQL Injection Attack',\\
     logdata:'Matched Data: %{MATCHED_VAR} found within %{MATCHED_VAR_NAME}',\\
     tag:'attack-sqli',\\
     severity:'CRITICAL'"

# XSS Detection Rule  
SecRule ARGS "@detectXSS" \\
    "id:1002,\\
     phase:2,\\
     block,\\
     msg:'XSS Attack Detected',\\
     logdata:'Matched Data: %{MATCHED_VAR} found within %{MATCHED_VAR_NAME}',\\
     tag:'attack-xss',\\
     severity:'CRITICAL'"

# Variable and Operator Examples
SecRule &REQUEST_HEADERS:Host "@eq 0" \\
    "id:1003,\\
     phase:1,\\
     deny,\\
     status:400,\\
     msg:'Request Missing a Host Header'"

# Collection and Action Examples
SecAction \\
    "id:1004,\\
     phase:1,\\
     setvar:tx.anomaly_score=0,\\
     setvar:tx.sql_injection_score=0,\\
     setvar:tx.xss_score=0,\\
     nolog,\\
     pass"

# Pattern matching with regular expressions
SecRule REQUEST_URI "@rx \\.php$" \\
    "id:1005,\\
     phase:1,\\
     setvar:tx.is_php=1,\\
     nolog,\\
     pass"`;

    const exampleRequest = `POST /login HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Content-Type: application/x-www-form-urlencoded
Content-Length: 53

username=admin'-- &password=test&submit=Login`;

    const exampleResponse = `HTTP/1.1 200 OK
Server: nginx/1.18.0
Content-Type: text/html; charset=UTF-8
Content-Length: 145

<!DOCTYPE html>
<html>
<head><title>Login</title></head>
<body><h1>Welcome</h1><p>Login successful!</p></body>
</html>`;

    directives.setValue(exampleDirectives);
    http_req.setValue(exampleRequest);
    http_res.setValue(exampleResponse);
    
    showSuccess('Example configuration loaded');
}

// Export results to JSON
function exportResults() {
    const results = {
        timestamp: new Date().toISOString(),
        directives: directives.getValue(),
        request: http_req.getValue(),
        response: http_res.getValue(),
        config: {
            use_crs: $('#use_crs').prop('checked'),
            auto_content_length: $('#defaultCheck1').prop('checked')
        },
        analysis: {
            transaction_id: $('#transaction_id').text(),
            disruptive_action: $('#disruptive_action').text(),
            disruptive_rule: $('#disruptive_rule').text(),
            rules_matched_total: $('#rules_matched_total').text(),
            duration: $('#duration').text()
        }
    };
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `coraza-analysis-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showSuccess('Results exported successfully');
}

// Format functions for the editor buttons
function formatDirectives() {
    // Simple formatting - could be enhanced
    const content = directives.getValue();
    const formatted = content.replace(/\s+/g, ' ').replace(/;/g, ';\n');
    directives.setValue(formatted);
    showSuccess('Directives formatted');
}

function formatRequest() {
    // Simple HTTP request formatting
    const content = http_req.getValue();
    const lines = content.split('\n');
    let formatted = '';
    let inHeaders = true;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (i === 0) {
            // Request line
            formatted += line + '\n';
        } else if (line === '' && inHeaders) {
            // End of headers
            formatted += '\n';
            inHeaders = false;
        } else if (inHeaders) {
            // Header line
            formatted += line + '\n';
        } else {
            // Body
            formatted += line + (i < lines.length - 1 ? '\n' : '');
        }
    }
    
    http_req.setValue(formatted);
    showSuccess('Request formatted');
}

function formatResponse() {
    // Simple HTTP response formatting
    const content = http_res.getValue();
    const lines = content.split('\n');
    let formatted = '';
    let inHeaders = true;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (i === 0) {
            // Status line
            formatted += line + '\n';
        } else if (line === '' && inHeaders) {
            // End of headers
            formatted += '\n';
            inHeaders = false;
        } else if (inHeaders) {
            // Header line
            formatted += line + '\n';
        } else {
            // Body
            formatted += line + (i < lines.length - 1 ? '\n' : '');
        }
    }
    
    http_res.setValue(formatted);
    showSuccess('Response formatted');
}

// Share function (placeholder - could integrate with GitHub Gist or similar)
function save() {
    const shareData = {
        directives: directives.getValue(),
        request: http_req.getValue(),
        response: http_res.getValue(),
        use_crs: $('#use_crs').prop('checked')
    };
    
    // For now, just copy to clipboard
    const shareText = JSON.stringify(shareData, null, 2);
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
            showSuccess('Configuration copied to clipboard');
        }).catch(() => {
            showError('Could not copy to clipboard');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showSuccess('Configuration copied to clipboard');
        } catch (err) {
            showError('Could not copy to clipboard');
        }
        document.body.removeChild(textArea);
    }
}

// Window resize handler
$(window).on('resize', function() {
    setTimeout(refreshCodeMirrorInstances, 100);
});

// Initialize WebAssembly
const go = new Go();
WebAssembly.instantiateStreaming(fetch("playground.wasm"), go.importObject).then((result) => {
    hideLoading();
    go.run(result.instance);
    // Refresh CodeMirror after WASM loads
    setTimeout(refreshCodeMirrorInstances, 200);
}).catch((error) => {
    console.error('Failed to load WebAssembly:', error);
    hideLoading();
    showError('Failed to initialize WAF engine. Please refresh the page.');
});   
