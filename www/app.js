/*
 Copyright (C) 2014 fbox
 
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/* 
 Created on : 21 oct. 2014, 23:55:52
 Author     : fbox
 */

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

    /* ----------------------------------------
     * Global variables
     * ------------------------------------------*/
    var currentPage = null, // "article" which is diplayed
        db = null, // indexeddb which store cache, pref... 
        myAppUrl = appUrl(), // reference url ("app://.../index.html")
        myhistory = []; // array of "MyUrl" used to manage history

    function MyHistory() {
      //console.log("new MyHistory instance");
      
      this._array = [];
      this.length = this._array;
      
      uiListeners.disable.navigation();
    }

    MyHistory.prototype.push = function (url) {
      
      this._array.push(url);
      this.length = this._array.length;
      
      uiListeners.enable.navigation();
    };

    MyHistory.prototype.pop = function () {
      
      var popval = this._array.pop();
      this.length = this._array.length;
      
      if (this.length <= 1) {
        uiListeners.disable.navigation();
        document.getElementById("s_navbar").hidden = true;
      }
      
      return popval;
    };

    MyHistory.prototype.popget = function () {
      this.pop();
      // console.log("history length : " + myhistory.length);
      return this._array[this.length - 1];
    };

    /* ----------------------------------------
     * MyUrl
     * ------------------------------------------*/

    /*
     * MyUrl constructor
     * @param {type} str
     * @returns {undefined}
     */
    function MyUrl(str) {
      //console.log("new MyUrl Instance");

      this.raw = str;
      //console.log("raw url :" + this.raw);

      if (str.startsWith("/index.php/")) {
        str = this.root + str;
      }

      if (str === this.root + "/index.php/Main_page"
          || str.startsWith(myAppUrl)) {
        /* home link */
        //console.log("this app url detected");
        this.href = myAppUrl;
        this.anchor = null;

      } else {

        /* format str to minimized loaded content */
        var str2replace = this.root + "/index.php/",
            str2inject = this.root + "/index.php?action=render&title=";

        if (str.indexOf(str2replace) === 0) {
          this.href = str.replace(str2replace, str2inject);
        } else if (str.indexOf(str2inject) === 0) {
          this.href = str;
        } else { // search case
          this.href = encodeURI(str);
        }

        // use this because use of str.hash can be buggy as it
        // decode the anchor string
        var anchor_idx = str.indexOf("#");
        if (anchor_idx > 0) {
          this.anchor = str.slice(anchor_idx + 1);
        } else {
          this.anchor = null;
        }

      }

    }

    MyUrl.prototype.root = "https://wiki.archlinux.org";


    /* ----------------------------------------
     * Title
     * ------------------------------------------*/

    /*
     * Title constructor
     * @param {type} str
     * @returns {app_L12.Title}
     */
    function Title(title, myUrl) {
      //console.log("new Title instance");
      if (typeof myUrl !== 'undefined') {
        var ugly_url_part = myUrl.root + "/index.php?action=render&title=",
            ugly_url_part3 = myUrl.root + "/index.php/",
            ugly_url_part2 = myUrl.root + "/index.php?search=";

        if (!title) {
          title = decodeURI(myUrl.href);
        }

        // who told I did'nt read "how to loop on an array in JS"?!
        if (title.startsWith(myAppUrl)) {
          title = "ArchWiki Viewer";
        } else if (title.indexOf(ugly_url_part) >= 0) {
          title = decodeURI(title.replace(ugly_url_part, ""));

        } else if (title.indexOf(ugly_url_part2) >= 0) {
          title = decodeURI(title.replace(ugly_url_part2, ""));

        } else if (title.indexOf(ugly_url_part3) >= 0) {
          title = decodeURI(title.replace(ugly_url_part3, ""));

        }
      }

      if (title.startsWith('Search results')) {
        title = "Search results";
      }

      if (title.startsWith('Category:')) {
        title = title.replace("Category:", "");
      }

      if (title.indexOf("#") >= 0) {
        var str2rm = title.slice(title.indexOf("#"));
        title = title.replace(str2rm, "");
      }

      if (title.indexOf('_') >= 0) {
        title = title.replace(/_/g, " ");
      }

      if (title.indexOf(' - ArchWiki') >= 0) {
        title = title.replace(' - ArchWiki', "");
      }

      this.str = title;
    }

    Title.prototype.print = function () {
      /* parse tilte string */
      if (!this.str || this.str.startsWith("app://")) {
        return "ArchWiki Viewer";
      }

      /* set page title */
      var strTitle = document.createTextNode(this.str),
          titleElt = document.getElementById("awPageTitle");
      titleElt.removeChild(titleElt.firstChild);
      titleElt.appendChild(strTitle);
    };


    /* ----------------------------------------
     * Content 
     * ------------------------------------------*/

    /*
     * Content constructor
     * @param {type} content
     * @returns {app_L12.Content}
     */
    function Content(content) {
      //console.log("new Content instance");
      this.body = content;



    }

    Content.prototype.print = function () {
      /* create new article element */
      var awart = document.createElement("div");

      awart.id = "aw-article-body";
      awart.className = "aw-article-body";
      awart.innerHTML = this.body;

      /* reformat "related articles" part (if any)*/
      var fec = awart.firstElementChild;
      do {
        if (fec
            && fec.tagName === "DIV"
            && fec.hasAttributes()
            && fec.attributes[0].name === "style"
            && fec.attributes[0].value === "float:right; clear:right; width:25%; margin: 0 0 0.5em 0.5em;") {

          //console.log("format 'related articles'");
          fec.id = "related-articles";
          fec.removeAttribute("style");
          fec = null;

        } else {
          fec = fec.nextElementSibling;
        }
      } while (fec);

      /* find img to update link to point to archlinux */
      /* XXX: Try to find img usage to include the most used in app */
      var img = awart.querySelectorAll("img");
      if (img) {
        for (var i = 0; i < img.length; i++) {
          
          if (img[i].src.startsWith(appRoot() + "/images/")) {
            console.log("update image src");
            img[i].src = img[i].src.replace(appRoot(), "https://wiki.archlinux.org");
          }
          
        }
      }

      /* set article content*/
      document.querySelector("#aw-article-body").parentNode
          .replaceChild(awart, document.querySelector("#aw-article-body"));


    };


    /* ----------------------------------------
     * WikiArticle 
     * ------------------------------------------*/

    /*
     * Wikipage constructor : 
     * @param {type} url
     * @returns {app_L12.WikiArticle}
     */
    function WikiArticle(url) {
      //console.log("new WikiArticle instance");

      this.url = url;
      this.anchor = url.anchor;
      this.content = null;

      this.date = Date.now();
    }

    WikiArticle.prototype.loadCache = function () {
      document.getElementById("progressBar").style.display = "block";

      var self = this,
          localCache = db.transaction("pages").objectStore("pages").get(self.url.href);

      localCache.onsuccess = function (e) {
        var cachedArticle = e.target.result;

        if (cachedArticle) {

          console.log("I know that url " + cachedArticle.url);
          self.title = new Title(cachedArticle.title);
          self.setContent(cachedArticle.body);
          self.print();

          document.getElementById("progressBar").style.display = "";

        } else {

          console.log("I do not know that url yet : " + self.url.href);
          self.loadUrl(true);

        }
      };

      localCache.onerror = function () {
        console.log("problem with getting url in db");
      };

    };

    WikiArticle.prototype.loadUrl = function (save2db) {
      /*get the page from the website*/
      document.getElementById("progressBar").style.display = "block";

      var self = this;

      console.log("http request url : " + self.url.href);

      if (typeof save2db === 'undefined') {
        save2db = true;
      }

      var self = this,
          xhr = new XMLHttpRequest({mozSystem: true});

      //* Initialize Cross XMLHttprequest 
      //* and open a http request with "document" responseType.
      //* It also define basic error handler 
      //* and mask the progress bar on request end

      xhr.open('GET', self.url.href, true); // asynchrone
      xhr.responseType = "document"; // need "GET"

      xhr.onerror = function () {
        console.error("load error");
        
        var h2 = document.createElement('h2'),
            p1 = document.createElement('p'),
            p2 = document.createElement('p');

        h2.textContent = xhr.errorMessage || 'Loading error';
        p1.textContent = " :-( I failed to get your article.";
        p2.textContent = "you may check your internet connection or go back to the previous page.";

        var body = document.getElementById("aw-article-body");
        body.innerHTML = "";

        body.appendChild(h2);
        body.appendChild(p1);
        body.appendChild(p2);

        document.getElementById("s_navbar").hidden = false;
      };

      xhr.onloadend = function () {
        console.log("load end");
        document.getElementById("progressBar").style.display = "";
      };

      xhr.onload = function () {
        console.log("load success");
        self.title = new Title(xhr.responseXML.title, self.url);

        var resp = xhr.responseXML.getElementById("mw-content-text") || xhr.responseXML.body;

        if (!resp) {
          log.error("empty response");
          return;
        }

        self.setContent(resp.innerHTML);
        self.print();

        if (save2db) {
          self.toDb();
        }
      };

      xhr.send(null);
    };

    WikiArticle.prototype.setContent = function (str) {
      this.content = new Content(str);
    };

    WikiArticle.prototype.print = function () {
      this.title.print();
      this.content.print();
      this.scrollTo(this.anchor);

      uiListeners.add.links();
    };

    WikiArticle.prototype.toDb = function () {
      var data = {
        url: this.url.href,
        title: this.title.str,
        body: this.content.body,
        date: this.date
      };

      /* check if page exist*/
      var objStore = db.transaction(["pages"], "readwrite").objectStore("pages");
      var localCache = objStore.get(this.url.href);

      localCache.onsuccess = function (e) {
        var cachedPage = e.target.result;
        if (cachedPage) { // page exists : 
          /* update cached data */
          cachedPage.body = data.body; // dom cannot be clone so we stock innerhtml
          cachedPage.title = data.title;
          cachedPage.date = data.date;

          /*update the database */
          var reqUpdate = objStore.put(cachedPage);

          reqUpdate.onerror = function () {
            console.log("update cached page error");
          };

          reqUpdate.onsuccess = function () {
            console.log("page cached update");
          };
        } else { // page does not exist
          /*write it to the database */
          var req = objStore.add(data);

          req.onsuccess = function () {
            console.log("new page cached");
          };

          req.onerror = function () {
            console.log("caching page request error");
          };
        }

      };

      localCache.onerror = function (e) {
        console.log("local cache error");
      };

    };

    WikiArticle.prototype.title = new Title("ArchWiki Viewer");

    WikiArticle.prototype.scrollTo = function (id) {
      var gw = document.getElementById("aw-article");
      if (!id) {
        //console.log("scroll to top");
        gw.scrollTop = 0;
      } else {
        console.log("scroll to id " + id);
        document.getElementById(id).scrollIntoView(true);
      }
    };


    /* ----------------------------------------
     * namespace uiListeners: manage events listenner function from the UI
     * ------------------------------------------*/

    /*
     * Namespace for UI Listeners
     * @type type
     */
    var uiListeners = {
      /*
       * initialize (add) all UI listerners
       * @returns {undefined}
       */
      init: function () {
        uiListeners.add.mainBar();
        uiListeners.add.searchBar();
        uiListeners.add.navBar();
        uiListeners.add.links();
      },
      /*
       * enable stuff
       */
      enable: {
        /*
         * enable navigation button
         * @returns {undefined}
         */
        navigation: function () {
          var btReload = document.getElementById("action_reload").parentNode,
              btBack = document.getElementById("action_back").parentNode;
          if (btReload.hasAttributes("disabled")) {
            btReload.removeAttribute("disabled");
          }
          if (btBack.hasAttributes("disabled")) {
            btBack.removeAttribute("disabled");
          }
        }
      },
      /*
       * disable stuff
       */
      disable: {
        /*
         * disable navigation button
         * @returns {undefined}
         */
        navigation: function () {
          var btReload = document.getElementById("action_reload").parentNode,
              btBack = document.getElementById("action_back").parentNode;

          btReload.setAttribute("disabled", "true");
          btBack.setAttribute("disabled", "true");
        }

      },
      /*
       * add listener
       */
      add: {
        /*
         * Main bar listeners
         * @returns {undefined}
         */
        mainBar: function () {
          console.log("add main event");

          var btSearch = document.querySelector("#action_search").parentNode,
              btMenu = document.querySelector("#action_menu").parentNode,
              btHome = document.querySelector("#action_home").parentNode;

          btSearch.addEventListener('click', function () {
            /* show search form*/
            console.log("show search bar");
            var form = document.getElementById("topSearchForm");
            if (form) {
              var input = document.getElementById("topSearchInput");
              input.value = "";
              form.style.display = "inline";
              input.focus();
            }
          }, false);

          btMenu.addEventListener('click', function () {
            /* show menu bar */
            console.log("show navigation bar");
            document.getElementById("s_navbar").hidden = false;

          }, false);

          btHome.addEventListener('click', function () {
            /* go home */
            var page = new WikiArticle(new MyUrl(myAppUrl));
            page.loadCache();
            myhistory.push(page.url);
            currentPage = page;
          }, false);
        },
        /*
         * Links (<a href=... > listeners
         * @returns {undefined}
         */
        links: function () {
          console.log("add links listener");

          var myLinks = document.querySelectorAll('.aw-article a');
          //console.log("links to add :" + myLinks.length);

          for (var i = 0; i < myLinks.length; i++) {

            var a = myLinks[i];
            //console.log("links :" + i + "\n" + a.href + "\n" + a.host + "\n" + a.protocol);

            if (!a.href) {
              //console.log("a with no ref found!");
              a.addEventListener('click',
                  function (e) {
                    e.preventDefault();
                    console.error("no href found");
                  }
              , false);

            } else if (a.href.startsWith(myAppUrl + '#')) {
              // let's local anchor manage by the html engine
              continue;

            } else if (
                (a.host.startsWith("wiki.archlinux.org") && a.protocol === "https:") // <- common case 
                || (a.host.startsWith(document.location.host) && a.protocol === document.location.protocol) // <- happen when a research result redirect to a page (example of search: zsh)
                ) {
              //console.log("wiki link event add : " + a.href);
              a.addEventListener('click', loadWiki, false);

            } else {
              //console.log("external link event add : " + a.href);
              a.addEventListener('click', openInOSBrowser, false);

            }
          }
        },
        /*
         * Search form Listeners 
         * @returns {undefined}
         */
        searchBar: function () {
          console.log("add search event");

          var form = document.getElementById("topSearchForm");

          if (form) {
            form.addEventListener('submit', searchWiki, true);

            form.addEventListener('blur', function (e) {
              console.log("hide search bar");
              e.preventDefault();
              document.getElementById("topSearchForm").style.display = "";
            }, true);
          } else {
            console.log("couldn't get search form");
          }

        },
        /*
         * Navigation bar Listeners
         * @returns {undefined}
         */
        navBar: function () {
          console.log("add navbar event");

          var btClose = document.getElementById("action_close").parentNode,
              btReload = document.getElementById("action_reload").parentNode,
              btBack = document.getElementById("action_back").parentNode;

          btClose.addEventListener('click', function () {
            console.log("close");
            window.close();
          }, false);


          btBack.addEventListener('click', function () {
            console.log("back");

            if (myhistory.length > 1) {

              // console.log("history length : " + myhistory.length);
              var page = new WikiArticle(myhistory.popget());

              page.loadCache();
              currentPage = page;

//              if (myhistory.length > 1) {
//                document.getElementById("s_navbar").hidden = false;
//              } else {
//                document.getElementById("s_navbar").hidden = true;
//              }
            }
          }, false);

          btReload.addEventListener('click', function () {
            console.log("reload");
            currentPage.loadUrl(true);
          }, false);

          document.getElementById("aw-article")
              .addEventListener('click', function () {
                // hide menu bar when click outside menubar
                if (!document.getElementById("s_navbar").hidden) {
                  console.log("hide navigation bar");
                  document.getElementById("s_navbar").hidden = true;
                }
              }, false);
        }
      }
    };


    /* ----------------------------------------
     * callback
     * ------------------------------------------*/


    /*
     * Callback functions for Links Events Listener
     * @param {type} e
     * @returns {undefined}
     */
    function loadWiki(e) {
      e.preventDefault(); // do not follow click ! 
      /* load target link*/
      var href = e.currentTarget.getAttribute('href')
          || e.currentTarget.parentNode.getAttribute('href'),
          targetUrl = new MyUrl(href),
          page = new WikiArticle(targetUrl);

      page.loadCache();
      currentPage = page;
      myhistory.push(targetUrl);

    }


    /*
     * Callback for submit search form
     * @param {type} e
     * @returns {undefined}
     */
    function searchWiki(e) {
      console.log('Searching !');
      e.preventDefault();

      var input = document.getElementById("topSearchInput").value || "sorry",
          url = new MyUrl("https://wiki.archlinux.org/index.php?search=" + input),
          page = new WikiArticle(url);

      //console.log("input :" + input);

      page.loadUrl(false);
      myhistory.push(url);
      currentPage = page;
    }


    /*
     * callback for external link
     * @param {type} e
     * @returns {undefined}
     */
    function openInOSBrowser(e) {
      e.preventDefault();

      console.log('open url in browser: ' + e.currentTarget.href);
      // Open url in browser
      var activity = new MozActivity({
        name: "view",
        data: {
          type: "url",
          url: e.currentTarget.href
        }
      });

      activity.onerror = function () {
        console.log("I can't open this link in OS Browser : " + this.error);
      };
    }


    /* ----------------------------------------
     * Database (indexedDB)
     * ------------------------------------------*/


    /*
     * Open and set database for cached content
     * @returns {undefined}
     */
    function opendb() {
      /* openning database */
      var request = indexedDB.open("awv", 1);

      request.onerror = function () {
        console.log("Why didn't you allow my web app to use IndexedDB?!");
      };

      request.onsuccess = function () {
        console.log("indexeddb is opened!");
        db = this.result;

        db.onerror = function (e) {
          console.log("Database error: " + e.target.errorCode);
        };

        /* start by (updating) caching the home page*/
        currentPage = new WikiArticle(new MyUrl(myAppUrl));
        currentPage.setContent(document.getElementById("aw-article-body").innerHTML);
        currentPage.toDb();
        myhistory.push(currentPage.url);
      };

      request.onupgradeneeded = function (e) {
        // Create an objectStore to hold information about our visited pages
        var db = e.currentTarget.result;

        // console.log("removing old database");
        // db.deleteObjectStore("pages");

        console.log("creating new database");
        var objectStore = db.createObjectStore("pages", {keyPath: "url"});

        objectStore.createIndex("title", "title", {unique: false});
        objectStore.createIndex("date", "date", {unique: false});
        // Use transaction oncomplete to make sure the objectStore creation is 
        // finished before adding data into it.
        objectStore.transaction.oncomplete = function () {
          console.log("creating object transaction complete");
        };
      };
    }


    /* ----------------------------------------
     * Helper function ()
     * ------------------------------------------*/

    /*
     * return the main document url at load
     * @returns {Node.URL|Document.URL|document.URL|String}
     */
    function appUrl() {
      /* It is need in devellopment when "reloading" from simulator on page
       * with anchor */
      var url = appRoot() + "/index.html";
      //console.log("appUrl is init to :\n" + url);
      return url;
    }

    function appRoot() {
      /* It is need in devellopment when "reloading" from simulator on page
       * with anchor */
      var url = document.location.protocol + "//" + document.location.host;
      return url;
    }

    /* 
     * HTML5 transition example        
     */
//    function test() {
//      console.log("add body event");
//      document.body
//          .addEventListener('click', function () {
//            // translate article
//            document.getElementById("aw-article").classList.add('move-center');
//            document.getElementById("aw-article").className = "";
//            var list = document.getElementsByTagName('move-center');
//            console.log('move center element number : ' + list.length);
//          });
//    }


    /* ----------------------------------------
     * First add event listener (Initialisation)
     * ------------------------------------------*/
    console.log("initialisation script start");

    uiListeners.init();
    opendb();
    myhistory = new MyHistory();

    console.log("initialisation script end (some steps may not have been completed yet)");
  })();
});