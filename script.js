var electron = require('electron');
var ipcRenderer = electron.ipcRenderer;

electron.remote.getGlobal('goNormalSize')();

var client_id = 'YBKDIKB3DJbyZdwkFsRCIuJscq4Xy5YNuIyAwqPG';
var token = electron.remote.getGlobal('token');


if(typeof token === 'undefined') {
    login();
} else {
    setTimeout(login, 36000*100);
    checkForNewUpdate();
    setInterval(checkForNewUpdate,10*60*1000); // Every 10 minutes
    fetchHashtags();
}

ipcRenderer.on('darkModeChange', (event, arg) => {
    data.darkMode = electron.remote.getGlobal('darkMode');
})

ipcRenderer.on('focusContent', (event, arg) => {
    document.querySelector('.content').focus();
})

var data = {
    dragover: false,
    darkMode: electron.remote.getGlobal('darkMode'),
    taskComposer: {
        content: '',
        content_autocompleted: '',
        done: true,
        in_progress: false,
        processing: false,
        attachment: undefined,
        attachmentURL: undefined
    },
    hashtags: []
}

var vm = new Vue({
    el: '#app',
    data: data
});

function syncShadowContentScroll() {
    document.querySelector('.shadow-content').scrollLeft = document.querySelector('.content').scrollLeft;
}


function createTask(content, done, in_progress, attachment) {
    data.taskComposer.processing = true;

    var formData = new FormData();
    formData.append('content',content);
    formData.append('done',done);
    formData.append('in_progress',in_progress);
    if(typeof attachment !== 'undefined') {
        formData.append('attachment',attachment);
    }

    return myFetch('https://api.getmakerlog.com/tasks/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    }).then(r => {
        console.log(r);
        data.taskComposer.processing = false;
        data.taskComposer.content = '';
        document.querySelector('.content').value = '';
        data.taskComposer.content_autocompleted = '';
        data.taskComposer.attachment = undefined;
        data.taskComposer.attachmentURL = undefined;
        document.querySelector('.attachment').files = new FileList();
    })
}

function fetchHashtags() {
    return myFetch('https://api.getmakerlog.com/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then(r => myFetch(`https://api.getmakerlog.com/users/${r.id}/stats`))
    .then(r => {
        data.hashtags = r.tasks_per_project.labels.filter(label => label != 'No project').sort((a,b) => r.tasks_per_project.datasets[0].data[r.tasks_per_project.labels.indexOf(b)] - r.tasks_per_project.datasets[0].data[r.tasks_per_project.labels.indexOf(a)]);
    })
}

function autofillHashtag() {
    var fullTextWithSuggestion = data.taskComposer.content;
    if((/#./).test(data.taskComposer.content)) {
        var split = data.taskComposer.content.split('#');
        var hashtagText = split[split.length - 1];
        //console.log(hashtagText);
        var possibleHashtags = data.hashtags.filter(hashtag => hashtag.startsWith(hashtagText));
        //console.log(possibleHashtags);
        var bestSuggestion = possibleHashtags[0]; // Sorted by number of times used
        //console.log(bestSuggestion);
        fullTextWithSuggestion = split;
        fullTextWithSuggestion[split.length - 1] = bestSuggestion;
        fullTextWithSuggestion = fullTextWithSuggestion.join('#');
    }

    //console.log(fullTextWithSuggestion);
    data.taskComposer.content_autocompleted = fullTextWithSuggestion;
}

function dropEvent(e) {
    document.querySelector('.attachment').files = e.dataTransfer.files;
}

function login() {
    document.body.innerHTML = '';

    var storeAppHref = electron.remote.getGlobal('storeAppHref');
    storeAppHref(window.location.href);
    electron.remote.getGlobal('goFullscreen')();

    window.location = `https://api.getmakerlog.com/oauth/authorize/?client_id=${client_id}&scope=user:read%20tasks:write&response_type=token`;
}

function checkForNewUpdate() {
    return myFetch('https://api.github.com/repos/Booligoosh/makerlog-menubar/releases/latest')
    .then(latest => {
        var currentNum = Number(electron.remote.getGlobal('appVersion').replace(/\./g,''));
        var latestNum = Number(latest.tag_name.replace('v','').replace(/\./g,''));

        if(latestNum > currentNum) {
            alert(`Please update to the latest version!\nYou can download it here:\n\nhttps://github.com/Booligoosh/makerlog-menubar/releases/tag/${latest.tag_name}`);
        }
    })
}

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function myFetch(input,init = {}) {
    return fetch(input,init)
    .then(r => {
        if(r.status === 403) {
            // Credentials timed out
            login();
        } else {
            return r.headers.get('content-type').startsWith('application/json') ? r.json() : r;
        }
    }, err => {
        // No internet connection
    });
}

window.addEventListener('DOMContentLoaded', function(){vm.$forceUpdate()})