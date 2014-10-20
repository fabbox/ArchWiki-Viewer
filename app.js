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
    var currentPage = null,
        db = null,
        myhistory = [];

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
      
      if (!str) {
        console.error("no href found");
        this.raw = null;
        this.href = null;
        this.anchor = null;
        return;
      } else {
        this.raw = str;
        console.log("raw url :" + this.raw);
      }
      

      if (str.startsWith("/index.php/")) {
        str = this.root + str;
      }

      var anchor_idx = str.indexOf("#");

      if (str === this.root + "/index.php/Main_page"
          || str === document.URL) {
        this.href = document.URL;
        this.raw = null;
        return;
        // it remove all history : that's a problem
      } else if (anchor_idx === 0) {
        // anchor on the same page
        this.href = null;
        this.samePage = true;
        this.anchor = str.slice(1);

      } else if (str.indexOf(this.root) !== 0) {

        console.log('not on ArchLinux wiki, sorry !');
        this.extern = true;

      } else {

        /* format str to minimized loaded content */
        var str2replace = this.root + "/index.php/",
            str2inject = this.root + "/index.php?action=render&title=";
        this.samePage = false;

        if (str.indexOf(str2replace) === 0) { //
          this.href = encodeURI(str.replace(str2replace, str2inject));
        } else if (str.indexOf(str2inject) === 0) {
          this.href = str;
        } else { // search case
          this.href = encodeURI(str);
        }

        if (anchor_idx > 0) {
          this.anchor = str.slice(anchor_idx + 1);
        } else {
          this.anchor = null;
        }

      }

    }

    MyUrl.prototype.root = "https://wiki.archlinux.org";

    MyUrl.prototype.extern = false;

    MyUrl.prototype.openInOSBrowser = function () {
      console.log('open url in browser: ' + this.raw);
      // Open url in browser
      var activity = new MozActivity({
        name: "view",
        data: {
          type: "url",
          url: this.raw
        }
      });
      activity.onerror = function () {
        console.log("I can't open this link in OS Browser : " + this.error);
      };
    };

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
        if (title.indexOf(ugly_url_part) >= 0) {
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

      if (title.indexOf("#")) {
        var str2rm = title.slice(title.indexOf("#"));
        title.replace(str2rm, "");
      }

      if (title.indexOf('_')) {
        title = title.replace(/_/g, " ");
      }

      if (title.indexOf(' - ArchWiki')) {
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
      document.getElementById("bodyContent").innerHTML = this.body;
    };

    /* ----------------------------------------
     * WikiPage 
     * ------------------------------------------*/

    /*
     * Wikipage constructor : 
     * @param {type} url
     * @returns {app_L12.WikiPage}
     */
    function WikiPage(url) {
      //console.log("new WikiPage instance");

      this.url = url;
      this.anchor = url.anchor;
      this.content = null;

      this.date = Date.now();
    }

    WikiPage.prototype.loadCache = function () {
      document.getElementById("progressBar").style.display = "block";

      var self = this,
          localCache = db.transaction("pages").objectStore("pages").get(self.url.href);

      localCache.onsuccess = function (e) {
        var cachedPage = e.target.result;

        if (cachedPage) {

          console.log("I know that url " + cachedPage.url);
          self.title = new Title(cachedPage.title);
          self.setContent(cachedPage.body);
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

    WikiPage.prototype.loadUrl = function (save2db) {
      /*get the page from the website*/
      document.getElementById("progressBar").style.display = "block";
      
      var self = this;
      
      console.log("http request url : " + self.url.href);

      if (typeof save2db === 'undefined') { // always the case up to now
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
        var h2 = document.createElement('h2'),
            p1 = document.createElement('p'),
            p2 = document.createElement('p');

        h2.textContent = xhr.errorMessage || 'Loading error';
        p1.textContent = " :-( I failed to get your article.";
        p2.textContent = "you may check your internet connection or go back to the previous page.";

        var body = document.getElementById("bodyContent");
        body.innerHTML = "";

        body.appendChild(h2);
        body.appendChild(p1);
        body.appendChild(p2);

        document.getElementById("navbar").style.display = "inline";
      };

      xhr.onloadend = function () {
        console.log("load end");
        document.getElementById("progressBar").style.display = "";
      };

      xhr.onload = function () {
        console.log("load success");
        self.title = new Title(xhr.responseXML.title, self.url);

        var resp = xhr.responseXML.getElementById("bodyContent")
            || xhr.responseXML.body;

        self.setContent(resp.innerHTML);
        self.print();
        
        if (save2db) {
          self.toDb();
        }
      };

      xhr.send(null);
    };

    WikiPage.prototype.setContent = function (str) {
      this.content = new Content(str);
    };

    WikiPage.prototype.print = function () {
      uiListeners.remove.links(); // Is it need to clean this in javascript ? 
      this.title.print();
      this.content.print();
      this.scrollTo(this.anchor);
      uiListeners.add.links();
    };

    WikiPage.prototype.toDb = function () {
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
        if (cachedPage) { // page exists
          cachedPage.body = data.body;
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

    };

    WikiPage.prototype.title = new Title("ArchWiki Viewer");

    WikiPage.prototype.scrollTo = function (id) {
      var gw = document.getElementById("globalWrapper");
      if (!id) {
        console.log("scroll to top");
        gw.scrollTop = 0;
      } else {
        console.log("scroll to id " + id);
        document.getElementById(id).scrollIntoView(true);
        /* then scroll back by the "topbar height" ; bug ? */
        gw.scrollTop = gw.scrollTop - 46;
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
       * add listener
       */
      add: {
        /*
         * Main bar listeners
         * @returns {undefined}
         */
        mainBar: function () {
          console.log("add main event");

          var btSearch = document.querySelector("#action_search"),
              btMenu = document.querySelector("#action_menu"),
              btHome = document.querySelector("#action_home");

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
            document.getElementById("navbar").style.display = "inline";
          }, false);

          btHome.addEventListener('click', function (e) {
            /* go home */
            console.log("go home");
            document.location.href = '/index.html';
            currentPage = null;
          }, false);
        },
        /*
         * Links (<a href=... > listeners
         * @returns {undefined}
         */
        links: function () {
          console.log("add links listener");

          var myLinks = document.querySelectorAll('a');

          for (var i = 0; i < myLinks.length; i++) {
            myLinks[i].addEventListener('click', clickOnLinks, false);
          }
        },
        /*
         * Search form Listeners 
         * @returns {undefined}
         */
        searchBar: function () {
          console.log("add search event");

          var form = document.getElementById("topSearchForm");

          form.addEventListener('submit', searchWiki, true);

          form.addEventListener('blur', function (e) {
            console.log("hide search bar");
            e.preventDefault();
            document.getElementById("topSearchForm").style.display = "";
          }, true);
        },
        /*
         * Navigation bar Listeners
         * @returns {undefined}
         */
        navBar: function () {
          console.log("add navbar event");

          var btClose = document.getElementById("action_close"),
              btReload = document.getElementById("action_reload"),
              btBack = document.getElementById("action_back");

          btClose.addEventListener('click', function () {
            console.log("close");
            window.close();
          }, false);

          btBack.addEventListener('click', function () {
            console.log("back");

            if (myhistory.length > 2) {

              myhistory.pop();
              // console.log("history length : " + myhistory.length);
              var page = new WikiPage(myhistory[myhistory.length - 1]);

              page.loadCache();
              currentPage = page;

              document.getElementById("navbar").style.display = "inline";

            } else {

              document.location.href = '/index.html';

            }
          }, false);

          btReload.addEventListener('click', function () {
            console.log("reload");
            currentPage.loadUrl(true);
          }, false);

          document.getElementById("globalWrapper")
              .addEventListener('click', function () {
                // hide menu bar when click outside menubar
                if (document.getElementById("navbar").style.display) {
                  console.log("hide menu bar");
                  document.getElementById("navbar").style.display = "";
                }
              }, false);
        }
      },
      /*
       * removes Listener
       */
      remove: {
        /*
         * remove Links listener
         * @returns {undefined}
         */
        links: function () {
          console.log("remove links listener");
          var myLinks = document.querySelectorAll('a');
          for (var i = 0; i < myLinks.length; i++) {
            myLinks[i].removeEventListener('click', clickOnLinks, false);
          }
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
    function clickOnLinks(e) {
      e.preventDefault(); // do not follow click ! 

      /* check url to load */
      var href = e.currentTarget.getAttribute('href')
          || e.currentTarget.parentNode.getAttribute('href')
          || false,
          targetUrl = new MyUrl(href);

      if (!targetUrl.raw) {

        if (targetUrl.href === document.URL) {
          /* reload everything */
          document.location.href = document.URL;
        } else {
          console.log("i give up...");
          return;
        }

      } else if (targetUrl.samePage) {

        currentPage.scrollTo(targetUrl.anchor);

      } else if (!targetUrl.extern) {

        /* load target link*/
        var page = new WikiPage(targetUrl);
        page.loadCache();
        currentPage = page;
        myhistory.push(targetUrl);

      } else {

        targetUrl.openInOSBrowser();

      }
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
          page = new WikiPage(url);

      //console.log("input :" + input);

      page.loadUrl(false);
      myhistory.push(url);
      currentPage = page;
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
      var request = indexedDB.open("MyTestDatabase", 5);

      request.onerror = function () {
        console.log("Why didn't you allow my web app to use IndexedDB?!");
      };

      request.onsuccess = function (e) {
        console.log("indexeddb is opened!");
        db = this.result;
        db.onerror = function (e) {
          console.log("Database error: " + e.target.errorCode);
        };
      };

      request.onupgradeneeded = function (e) {
        // Create an objectStore to hold information about our visited pages
        var db = e.currentTarget.result;

        //        console.log("removing old database");
        //        db.deleteObjectStore("pages");

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

     // Nothing there ....
     

    /* ----------------------------------------
     * First add event listener (Initialisation)
     * ------------------------------------------*/
    console.log("initialisation ");
    
    myhistory.push(new MyUrl(document.URL));
    uiListeners.init();
    opendb();
    
    console.log("initialisation script end");
  })();
});