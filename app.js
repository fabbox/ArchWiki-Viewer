// Be strict, do not try to understand my mistake and make error !
'use strict';

window.addEventListener("load", function () {
    console.log("Hello Wiki!");
});

// DOMContentLoaded is fired once the document has been loaded and parsed,
// but without waiting for other external resources to load (css/images/etc)
// That makes the app more responsive and perceived as faster.
// https://developer.mozilla.org/Web/Reference/Events/DOMContentLoaded
window.addEventListener('DOMContentLoaded', function () {
    console.log('dom content loaded');

    (function () { // avoid global var and function

        var warchUrl = "https://wiki.archlinux.org";
        var myhistory = [];
        var db = null;
        myhistory.push(document.URL);

        /* manage events listenner function */

        function addArchNavBarListenner() {
            var btSearch = document.querySelector("#action_search");
            var btMenu = document.querySelector("#action_menu");
            var btHome = document.querySelector("#action_home");

            btSearch.addEventListener('click', function (e) {
                /* show search form*/
                console.log("show search bar");
                var input = document.getElementById("topSearchInput");
                input.value = "";
                document.getElementById("topSearchForm").style.display = "inline";
                document.getElementById("topSearchInput").focus();
            }, false);

            btMenu.addEventListener('click', function (e) {
                /* show menu bar */
                console.log("show menu bar");
                document.getElementById("topMenuBar").style.display = "inline";
            }, false);

            btHome.addEventListener('click', function (e) {
                /* go home */
                console.log("go home");
                document.location.href = '/index.html';
            }, false);
        }

        function addLinksListener() {
            console.log("adding listener");
            var myLinks = document.querySelectorAll('a');
            for (var i = 0; i < myLinks.length; i++) {
                myLinks[i].addEventListener('click', clickOnLinks, false);
            }
        }

        function addSearchListenner() {
            console.log("add search event");
            var form = document.getElementById("topSearchForm");

            form.addEventListener('submit', function (e) {
                /* search string on wiki*/
                console.log('send !');
                e.preventDefault();
                searchWiki(document.getElementById("topSearchInput").value);
            }, true);

            form.addEventListener('blur', function (e) {
                console.log("hide search bar");
                document.getElementById("topSearchForm").style.display = "none";
                e.preventDefault();
            }, true);
        }

        function addTopMenuListenner() {
            console.log("add top menu event");
            var btClose = document.getElementById("action_close");
            var btBack = document.getElementById("action_back");

            btClose.addEventListener('click', function (e) {
                console.log("close");
                window.close();
            }, false);

            btBack.addEventListener('click', function (e) {
                console.log("back");
                if (myhistory.length > 2) {
                    myhistory.pop();
                    loadWikiUrl(myhistory[myhistory.length - 1]);
                    document.getElementById("topMenuBar").style.display = "inline";
                } else {
                    document.location.href = '/index.html';
                    return false;
                }
            }, false);

            document.getElementById("globalWrapper")
                    .addEventListener('click', function (e) {
                        // hide menu bar when click outside menubar
                        if (document.getElementById("topMenuBar").style.display) {
                            console.log("hide menu bar");
                            document.getElementById("topMenuBar").style.display = "";
                        }
                    }, false);
        }

        function opendb() {
            /* openning database */
            var request = indexedDB.open("MyTestDatabase", 2);
            
            request.onerror = function () {
                console.log("Why didn't you allow my web app to use IndexedDB?!");
            };

            request.onsuccess = function (e) {
                console.log("indexeddb is opened!");
                db = e.target.result;
                db.onerror = function (event) {
                    console.log("Database error: " + event.target.errorCode);
                };
            };

            request.onupgradeneeded = function (e) {
                var db = e.target.result;

                // Create an objectStore to hold information about our visited pages
                var objectStore = db.createObjectStore("pages", {keyPath: "url"});

                // Use transaction oncomplete to make sure the objectStore creation is 
                // finished before adding data into it.
                objectStore.transaction.oncomplete = function () {
                    console.log("creating object transaction complete");
                };
            };
        }

        function removeLinksListener() {
            console.log("removing link listener");
            var myLinks = document.querySelectorAll('a');

            for (var i = 0; i < myLinks.length; i++) {
                myLinks[i].removeEventListener('click', clickOnLinks, false);
            }
        }

        /* callback functions */

        function clickOnLinks(e) {
            e.preventDefault(); // do not follow click ! 

            /* check url to load */
            var url = null;

            if (e.target.hasAttribute('href')) {
                url = e.target.getAttribute('href');
            } else if (e.target.parentNode.hasAttribute('href')) {
                // need for "anchor" link
                url = e.target.parentNode.getAttribute('href');
            } else {
                console.log("no href to follow found...");
                return false;
            }

            if (url.startsWith('/')) {
                console.log("relative url detected");
                if (url === "/index.php/Main_page" || url === "/index.php") {
                    document.location.href = '/index.html';
                    return false;
                } else {
                    url = warchUrl + url;
                }
            } else if (url.indexOf("#") === 0) {
                // anchor on the same page
                var id = url.slice(1);
                scrollToId(id);
                return false;
            } else if (url.indexOf(warchUrl) !== 0) {
                console.log('not on ArchLinux wiki, sorry !');
                openWithOSBrowser(e); // open browser !
                return false;
            }

            /* format url to minimized loaded content */
            var str2replace = warchUrl + "/index.php/",
                    str2inject = warchUrl + "/index.php?action=render&title=";
            url = url.replace(str2replace, str2inject);

            /* load target link*/
            loadWikiUrl(url);
            myhistory.push(url);
        }

        function openWithOSBrowser(e) {
            e.preventDefault();

            var url = e.currentTarget.getAttribute('href');
            console.log('open url in browser: ' + url);

            // Open url in browser
            var activity = new MozActivity({
                name: "view",
                data: {
                    type: "url",
                    url: url
                }
            });

            activity.onerror = function () {
                console.log(this.error);
            };
        }

        /* helper functions */

        function fillPageContent(url, content) {
            removeLinksListener(); // Is it need to clean this in javascript ? 

            var ugly_url_part = warchUrl + "/index.php?action=render&title=";
            setArchbarTitle(decodeURI(url.replace(ugly_url_part, "")));

            /* inject target "at the good place" */
            document.getElementById("bodyContent").innerHTML = content;

            /* scroll to the good place */
            if (url.indexOf("#") >= 0) { // any anchor to go ? 
                var id = url.slice(url.indexOf("#") + 1);
                console.log("scrollToId : " + id);
                scrollToId(id);
            } else { // scroll to top
                scrollToId();
            }

            /* refresh listener */
            addLinksListener();
            document.getElementById("progressBar").style.display = "";
        }

        function cacheContent2db(url, content) {
            /*write it to the database */
            var trans = db.transaction(["pages"], "readwrite");

            trans.oncomplete = function () {
                console.log("caching page transaction done!");
            };

            trans.onerror = function () {
                console.log("caching page transaction error");
            };

            var pagesObjectStore = trans.objectStore("pages"),
                    req = pagesObjectStore.add({url: url, body: content});

            req.onsuccess = function () {
                console.log("page cached");
            };

            req.onerror = function () {
                console.log("caching page request error");
            };
        }

        function loadWikiUrl(url) {
            console.log('you clicked on : ' + url + ', continue!');
            document.getElementById("progressBar").style.display = "block";

            var localCache = db.transaction("pages").objectStore("pages").get(url);

            localCache.onsuccess = function (e) {
                var cachedPage = e.target.result;

                if (cachedPage) {
                    console.log("I know that url " + cachedPage.url);

                    fillPageContent(cachedPage.url, cachedPage.body);

                } else {
                    console.log("I do not know that url yet !");

                    /*get the page from the website*/
                    var xhr = new XMLHttpRequest({mozAnon: true, mozSystem: true}); // I am a cross request !
                    xhr.open('GET', url, true); // asynchrone
                    xhr.responseType = "document"; // "GET" required

                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4 && (xhr.status === 200)) {
                            /* keep only the interesting part */
                            var content = xhr.responseXML.body.innerHTML;

                            fillPageContent(url, content);
                            cacheContent2db(url, content);

                        } else if (xhr.readyState === 4 && xhr.status !== 200) {
                            console.log('Error ! !\n\nCode :' + xhr.status
                                    + '\nText : ' + xhr.statusText);

                            onXhrError(xhr.error);

                            document.getElementById("progressBar").style.display = "";
                        }
                    };

                    xhr.send(null);
                }
            };

            localCache.onerror = function () {
                console.log("problem with getting url in db");
            };
        }

        function onXhrError(errorMessage) {
            
            if (!errorMessage) {
                errorMessage = 'Loading error';
            }
            var h2 = document.createElement('h2');
            var p1 = document.createElement('p');
            var p2 = document.createElement('p');

            h2.textContent = errorMessage;
            p1.textContent = " :-( I failed to get your article.";
            p2.textContent = "you may heck your internet connection or go back to the previous page.";

            document.getElementById("bodyContent").innerHTML = "";
            document.getElementById("bodyContent").appendChild(h2);
            document.getElementById("bodyContent").appendChild(p1);
            document.getElementById("bodyContent").appendChild(p2);

            document.getElementById("topMenuBar").style.display = "inline";
        }

        function setArchbarTitle(title) {

            /* parse tilte string */
            if (!title || title.startsWith("app://")) {
                return "ArchWiki Viewer";
            }

            if (title.startsWith('Category:')) {
                title = title.replace("Category:", "");
            }

            if (title.indexOf('_')) {
                title = title.replace(/_/g, " ");
            }

            if (title.indexOf(' - ArchWiki')) {
                title = title.replace(' - ArchWiki', "");
            }

            /* set page title */
            var strTitle = document.createTextNode(title);
            var titleElt = document.getElementById("awPageTitle");

            titleElt.removeChild(titleElt.firstChild);
            titleElt.appendChild(strTitle);
        }

        function searchWiki(input) {
            var pb = document.getElementById("progressBar");
            pb.style.display = "block";

            if (!input) {
                input = "sorry";
            }

            var url = warchUrl + "/index.php?search=" + encodeURI(input);
            console.log("search url : " + url);

            /* load target link*/
            var xhr = new XMLHttpRequest({mozAnon: true, mozSystem: true}); // I am a cross request !

            xhr.open('GET', url, true); // asynchrone
            xhr.responseType = "document"; // need "GET"

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && (xhr.status === 200)) {
                    /* keep only the interesting part */

                    var respDoc = xhr.responseXML;
                    var resp = xhr.responseXML.getElementById("globalWrapper");

                    /* inject target "at the good place" */
                    removeLinksListener();
                    document.getElementById("globalWrapper").innerHTML = resp.innerHTML;

                    if (respDoc.title.startsWith("Search results")) {
                        setArchbarTitle("Search results");
                    } else {
                        setArchbarTitle(respDoc.title);
                    }

                    myhistory.push(url);

                    /* refresh listener*/
                    addLinksListener();
                    scrollToId();
                    pb.style.display = "none";
                } else if (xhr.readyState === 4 && xhr.status !== 200) {
                    console.log('Error ! !\n\nCode :' + xhr.status + '\nTexte : ' + xhr.statusText);
                    onXhrError(xhr.error);
                    pb.style.display = "none";
                }
            };

            xhr.send(null);
        }

        function scrollToId(id) {
            if (!id) {
                console.log("scroll to top id ");
                // window.scroll(0, 0); // <-- not working; bug ?
                document.getElementById("globalWrapper").scrollTop = 0;
            } else {
                console.log("scroll to id " + id);
                document.getElementById(id).scrollIntoView(true);
                /* then scroll back by the "topbar height" ; bug ? */
                document.getElementById("globalWrapper").scrollTop =
                        document.getElementById("globalWrapper").scrollTop - 46;
            }
            return false;
        }

        /* ----------------------------------------
         * First add event listener (Initialisation)
         * ------------------------------------------*/
        console.log("initialisation ");

        addArchNavBarListenner();
        addSearchListenner();
        addTopMenuListenner();

        addLinksListener();

        opendb();

    })();

});