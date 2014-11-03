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
        myhistory = [], // array of "MyUrl" used to manage history
        USE_CACHE = null, // use cache or not ? 
        REFRESH_CACHE_PERIOD = null; // 


    /* ----------------------------------------
     * MyHistory
     * ------------------------------------------*/

    /*
     * MyHistory constructor ()
     * @returns {app_L35.MyHistory}
     */
    function MyHistory() {
      //console.log("new MyHistory instance");

      this._array = [];
      this.length = this._array;

      uiListeners.disable.navigation();
    }


    MyHistory.prototype = {
      /*
       * push url object in myhistory
       * @param {type} url
       * @returns {undefined}
       */
      push: function (url) {
        if (!(url instanceof MyUrl)) {
          console.error("Who try to corrupt my history ?");
          return false;
        }
        this._array.push(url);
        this.length = this._array.length;
        if (this.length > 1) {
          uiListeners.enable.navigation();
        }
      },
      /*
       * pop url object in myhistory
       * @returns {app_L35.MyHistory@pro;_array@call;pop}
       */
      pop: function () {

        var popval = this._array.pop();
        this.length = this._array.length;

        if (this.length <= 1) {
          uiListeners.disable.navigation();
          //document.getElementById("navbar").hidden = true;
          ui.navbar.hide();
        }

        return popval;
      },
      /*
       * delete the last element of myhistory and 
       * return the value of the new last element.
       * @returns {Array}
       */
      popget: function () {
        this.pop();
        // console.log("history length : " + myhistory.length);
        return this._array[this.length - 1];
      }
    };



    /* ----------------------------------------
     * MyUrl
     * ------------------------------------------*/

    /*
     * MyUrl constructor
     * @param {type} str
     * @returns {app_L35.MyUrl}
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

    Title.prototype = {
      /*
       * Display title in the document
       * @returns {undefined}
       */
      print: function () {
        //  XXX: Why it is still there ? it return a string to who ? o_O
        ///* parse tilte string */
        //if (!this.str || this.str.startsWith("app://")) {
        //  return "ArchWiki Viewer";
        //}

        /* set page title */
//      var strTitle = document.createTextNode(this.str),
//          titleElt = document.getElementById("awPageTitle");
//      titleElt.removeChild(titleElt.firstChild);
//      titleElt.appendChild(strTitle);

        document.getElementById("awPageTitle").textContent = this.str;
      }
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

    Content.prototype = {
      /*
       * Display content in a new article in the document
       * it delete the old article. 
       * @returns {undefined}
       */
      print: function () {

        var awart_old = document.getElementById("aw-article"),
            awart_content_old = document.getElementById("aw-article-body"),
            awsect = awart_old.parentNode;

        awart_old.id = "aw-article_old";
        awart_content_old.id = "aw-article-body_old";

        /* create new article element */
        var awart = document.createElement("article");
        var awart_content = document.createElement("div");

        awart.id = "aw-article";
        awart.className = "aw-article fade-out";

        awart_content.id = "aw-article-body";
        awart_content.className = "aw-article-body";
        awart_content.innerHTML = this.body;

        /* reformat "related articles" part (if any)*/
        var fec = awart_content.firstElementChild;
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
        /*
         * the collection of tango icon provide in the 
         * arch-wiki-doc package is use locally to do not 
         * downloading common icon
         */
        var img = awart_content.querySelectorAll("img");
        if (img) {
          var imgRoot = appRoot();

          for (var i = 0; i < img.length; i++) {

            if (img[i].src.startsWith(imgRoot + "/images/")) {
              var src = img[i].src;
              console.log(src);

              if (src.indexOf("Tango-") >= 0) {
                img[i].src = src.replace(/.*Tango-/g, imgRoot + "/images/tango/File:Tango-");
              } else {
                console.log("update image src");
                img[i].src = img[i].src.replace(imgRoot, "https://wiki.archlinux.org");
              }
              
              console.log(img[i].src);
            }

          }
        }

        /* set article content*/
        awart.appendChild(awart_content);

        /* replace current article by this article*/

        /* Direct transition */
        // awsect.replaceChild(awart,awart_old);
        /* fade out/in transition*/
        awsect.appendChild(awart);

        awart_old.addEventListener("transitionend", function (e) {
          awart.classList.add('fade-in');
          awart_old.parentNode.removeChild(awart_old);
          uiListeners.add.awArticle();
        }, true);

        awart_old.classList.remove('fade-in');
      }
    };


    /* ----------------------------------------
     * WikiArticle 
     * ------------------------------------------*/

    /*
     * Wikipage constructor : 
     * @param {type} url (MyUrl object)
     * @returns {app_L12.WikiArticle}
     */
    function WikiArticle(url) {
      //console.log("new WikiArticle instance");

      this.url = url;
      this.anchor = url.anchor;
      this.content = null;

      this.date = Date.now();
    }

    WikiArticle.prototype = {
      /*
       * load (and print article)
       * it just call the good method if we use or not the cache
       * @param {type} useCache
       * @returns {undefined}
       */
      loadArticle: function (useCache) {

        if (useCache) {
          this.loadCache();
        } else if (this.url.href === myAppUrl) {
          this.loadCache();
        } else {
          this.loadUrl(false);
        }
      },
      /*
       * load (and print article) : It try to load the cache page, if there is no such
       * page it download it.
       * @returns {undefined}
       */
      loadCache: function () {
        document.getElementById("progressBar").style.display = "block";

        var self = this,
            request = db.transaction("pages").objectStore("pages").get(self.url.href);

        request.onsuccess = function (e) {
          var cache = e.target.result;

          if (cache) {
            console.log("I know that url " + cache.url);

            if (self.date - cache.date < REFRESH_CACHE_PERIOD) {

              self.title = new Title(cache.title);
              self.setContent(cache.body);
              self.print();
              document.getElementById("progressBar").style.display = "";

            } else {
              console.log("updating cache");

              self.loadUrl(true);
            }

          } else {

            console.log("I do not know that url yet : " + self.url.href);
            self.loadUrl(true);

          }
        };

        request.onerror = function () {
          console.log("problem with getting url in db");
        };

      },
      /*
       * load (and print article) : It download the article from the archwiki website.
       * Here, we use a privilige XMLHttpRequest to contact the archwiki because 
       * we are not the archwiki !
       * @param {type} save2db : wether it must save the got page in the indexedDB
       * @returns {undefined}
       */
      loadUrl: function (save2db) {
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

          //document.getElementById("navbar").hidden = false;
          ui.navbar.show();
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
      },
      /*
       * set the content properties
       * @param {type} str 
       * @returns {undefined}
       */
      setContent: function (str) {
        this.content = new Content(str);
      },
      /*
       * set the title properties
       * @param {type} str
       * @param {type} url
       * @returns {undefined}
       */
      setTitle: function (str, url) {
        this.title = new Title(str, url);
      },
      /*
       * Dipslay the different properties to the current document
       * @returns {undefined}
       */
      print: function () {
        this.title.print();
        this.content.print();
        this.scrollTo(this.anchor);

        uiListeners.add.links();
      },
      /*
       * Save or update article in the indexedb
       * @returns {undefined}
       */
      toDb: function () {
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

      },
      /*
       * default article title
       */
      title: new Title("ArchWiki Viewer"),
      /*
       * Scroll to an id : 
       * XXX: This method do not depend on a wikiArticle properties...
       * @param {type} id
       * @returns {undefined}
       */
      scrollTo: function (id) {
        var gw = document.getElementById("aw-article");
        if (!id) {
          //console.log("scroll to top");
          gw.scrollTop = 0;
        } else {
          console.log("scroll to id " + id);
          document.getElementById(id).scrollIntoView(true);
        }
      }

    };

    /* ----------------------------------------
     * namespace related to the User Interface (UI)
     * ------------------------------------------*/

    /*
     * 
     * @type type
     */
    var ui = {
      /*
       * 
       */
      navbar: {
        /*
         * 
         * @returns {undefined}
         */
        hide: function () {
          if (document.getElementById("navbar").className.indexOf("navShown") >= 0) {
            console.log("hide navigation bar");
            document.getElementById("navbar").classList.remove('navShown');

            document.getElementById("action_settings_show").parentNode.classList.add('hidden');
            document.getElementById("action_settings_hide").parentNode.classList.add('hidden');

            document.getElementById("action_home").parentNode.classList.remove('hidden');

          }
        },
        /*
         * 
         * @returns {undefined}
         */
        show: function () {
          if (document.getElementById("navbar").className.indexOf("navShown") < 0) {
            console.log("show navigation bar");
            document.getElementById("navbar").classList.add('navShown');

            document.getElementById("action_home").parentNode.classList.add('hidden');

            document.getElementById("action_settings_show").parentNode.classList.remove('hidden');
            document.getElementById("action_settings_hide").parentNode.classList.remove('hidden');

          }
        },
        /*
         * 
         * @returns {undefined}
         */
        toggle: function () {
          if (document.getElementById("navbar").className.indexOf("navShown") >= 0) {
            ui.navbar.hide();
          } else {
            ui.navbar.show();
          }
        },
        /*
         * 
         */
        disable: {
          /*
           * 
           * @returns {undefined}
           */
          btReload: function () {
            document.getElementById("action_reload").setAttribute("disabled", "true");
          },
          /*
           * 
           * @returns {undefined}
           */
          btBack: function () {
            document.getElementById("action_back").setAttribute("disabled", "true");
          }
        },
        /*
         * 
         */
        enable: {
          /*
           * 
           * @returns {undefined}
           */
          btBack: function () {
            var btBack = document.getElementById("action_back");
            if (btBack.hasAttributes("disabled")) {
              btBack.removeAttribute("disabled");
            }
          },
          /*
           * 
           * @returns {undefined}
           */
          btReload: function () {
            var btReload = document.getElementById("action_reload");
            if (btReload.hasAttributes("disabled")) {
              btReload.removeAttribute("disabled");
            }
          }
        }
      }
    };

    /*
     * Namespace for UI Listeners
     * manage events listenner function from the UI
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
        uiListeners.add.awArticle();
        uiListeners.add.sidebar();
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
          ui.navbar.enable.btBack();
          ui.navbar.enable.btReload();
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
          ui.navbar.disable.btBack();
          ui.navbar.disable.btReload();
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
            ui.navbar.hide();

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
            /* toggle navigation bar */
            ui.navbar.toggle();
          }, false);

          btHome.addEventListener('click', function () {
            /* go home */
            var page = new WikiArticle(new MyUrl(myAppUrl));
            page.loadCache();
            myhistory.push(page.url);
            currentPage = page;
          }, false);

          /* 
           * Setting button :
           * show/hide sidebar is driven by css.
           * the two latter events are used to disable the default 
           * behaviour of the main article (which stay 20% visible and 
           * so clickable)
           * */

          /* action_settings : show sidebar -> disable article behaviour*/
          document.getElementById("action_settings_show").parentNode.addEventListener('click', function () {

            console.log("disable hide navitation bar");
            uiListeners.remove.awArticle();

            console.log("disable click on navitation bar");
            //uiListeners.disable.navigation();
            ui.navbar.disable.btBack();

            console.log("prevent click link event");
            uiListeners.remove.links();
            uiListeners.add.stoppedLinks();
          }, false);

          /* action_settings : hide sidebar -> re-enable article behaviour*/
          document.getElementById("action_settings_hide").parentNode.addEventListener('click', function () {

            console.log("enable hide navitation bar");
            uiListeners.add.awArticle();


            if (myhistory.length > 1) {
              console.log("enable click on navitation bar");
              ui.navbar.enable.btBack();
            }

            console.log("enable click link event");
            uiListeners.remove.stoppedLinks();
            uiListeners.add.links();
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
                || (a.host.startsWith(document.location.host) && a.protocol === document.location.protocol)
                // <- happen when a research result redirect to a page (example of search: zsh)
                ) {
              //console.log("wiki link event add : " + a.href);
              a.addEventListener('click', wiki.load, false);

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
            form.addEventListener('submit', wiki.search, true);

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

          var btClose = document.getElementById("action_close"),
              btReload = document.getElementById("action_reload"),
              btBack = document.getElementById("action_back"),
              btStar = document.getElementById("action_star");

          btClose.addEventListener('click', function () {
            console.log("close");
            window.close();
          }, false);


          btBack.addEventListener('click', function () {
            console.log("back");

            if (myhistory.length > 1) {

              // console.log("history length : " + myhistory.length);
              var page = new WikiArticle(myhistory.popget());

              page.loadArticle(USE_CACHE);
              currentPage = page;
            }
          }, false);

          btReload.addEventListener('click', function () {
            console.log("reload");
            currentPage.loadUrl(true);
          }, false);

          btStar.addEventListener('click', function () {
            console.log("star");
            getCachedArticleList();
            ui.navbar.disable.btReload();
          }, false);

        },
        /*
         * 
         * @returns {undefined}
         */
        stoppedLinks: function () {
          var myLinks = document.querySelectorAll('.aw-article a');

          for (var i = 0; i < myLinks.length; i++) {
            myLinks[i].addEventListener('click', stopprop, false);
          }
        },
        /*
         * clicking somewhere in an article
         * @returns {undefined}
         */
        awArticle: function () {
          document.getElementById("aw-article")
              .addEventListener('click', ui.navbar.hide, false);
        },
        /*
         * 
         * @returns {undefined}
         */
        sidebar: function () {
          document.getElementById("sideQuit")
              .addEventListener('click', function (e) {
                e.preventDefault();
                console.log("close");
                window.close();
              }, false);

          document.getElementById("use_cache").addEventListener('click', function (e) {
            USE_CACHE = e.target.checked;
            console.log('use_cache : ' + USE_CACHE);
            updateSettings("use_cache", USE_CACHE);
          }, false);


          /* confirm dialog*/
          document.getElementById("cleardb_cancel").addEventListener('click', function (e) {
            document.location.href = "#cacheSettings";
          }, false);

          document.getElementById("cleardb_ok").addEventListener('click', function (e) {
            clearObjectStore("pages");
          }, false);


          /* Change refresh cache */
          document.getElementById("refresh_cache_period").addEventListener('change', function () {
            REFRESH_CACHE_PERIOD = this.value;
            console.log('refresh cache page periode (ms): ' + REFRESH_CACHE_PERIOD);
            updateSettings("refresh_cache_period", REFRESH_CACHE_PERIOD);
            document.getElementById("refresh_label").textContent = this.options[this.selectedIndex].text;
          });
        }


      },
      /*
       * 
       */
      remove: {
        /*
         * 
         * @returns {undefined}
         */
        awArticle: function () {
          document.getElementById("aw-article")
              .removeEventListener('click', ui.navbar.hide, false);

        },
        /*
         * 
         * @returns {undefined}
         */
        links: function () {
          var myLinks = document.querySelectorAll('.aw-article a');

          for (var i = 0; i < myLinks.length; i++) {
            var a = myLinks[i];
            a.removeEventListener('click', wiki.load, false);
            a.removeEventListener('click', openInOSBrowser, false);
            a.addEventListener('click', stopprop, false);
          }
        },
        /*
         * 
         * @returns {undefined}
         */
        stoppedLinks: function () {
          var myLinks = document.querySelectorAll('.aw-article a');

          for (var i = 0; i < myLinks.length; i++) {
            myLinks[i].removeEventListener('click', stopprop, false);
          }
        }
      }
    };

    /* ----------------------------------------
     * callback
     * ------------------------------------------*/

    /*
     * 
     * @param {type} e
     * @returns {undefined}
     */
    function stopprop(e) {
      e.preventDefault();
      e.stopPropagation();
    }


    /*
     * Wiki related callback
     * @type type
     */
    var wiki = {
      /*
       * Callback for Links Events Listener
       * @param {type} e
       * @returns {undefined}
       */
      load: function (e) {
        e.preventDefault(); // do not follow click ! 
        /* load target link*/
        var href = e.currentTarget.getAttribute('href')
            || e.currentTarget.parentNode.getAttribute('href'),
            targetUrl = new MyUrl(href),
            page = new WikiArticle(targetUrl);

        page.loadArticle(USE_CACHE);
        currentPage = page;
        myhistory.push(targetUrl);
      },
      /*
       * Callback for submit search form
       * @param {type} e
       * @returns {undefined}
       */
      search: function (e) {
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
    };

    /*
     * Callback for external link
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

    /*
     * Callback for action_star (saved articles in the database)
     * @returns {undefined}
     */
    function getCachedArticleList() {

      /* retrieve all cached page and make a list*/
      var pagesStore = getObjectStore("pages"),
          ul = document.createElement("ul");

      pagesStore.openCursor().onsuccess = function (event) {

        var cursor = event.target.result;

        if (cursor) {

          var li = document.createElement("li"),
              a = document.createElement("a");
          a.href = cursor.key;
          a.textContent = cursor.value.title;

          li.appendChild(a);
          ul.appendChild(li);
          //console.log(" the URL " + cursor.key + " is entitle " + cursor.value.title);

          cursor.continue();

        } else {

          console.log("printing star page");
          var list = document.createElement("body");
          list.appendChild(ul);

          var cachedArticleList = new WikiArticle(new MyUrl(myAppUrl));
          cachedArticleList.setTitle("Cached articles");
          cachedArticleList.setContent(list.innerHTML);
          cachedArticleList.print();

          ui.navbar.hide();
        }
      };
    }


    /* ----------------------------------------
     * Database (indexedDB)
     * ------------------------------------------*/

    /*
     * Open and set database for cached article and settings pref.
     * @returns {undefined}
     */
    function opendb() {
      /* openning database */
      var request = indexedDB.open("awv", 3);
      /* XXX : checked if db is already opened ? */
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

        myhistory = new MyHistory();
        myhistory.push(currentPage.url);

        /* Initialise Application Settings*/
        var objStore = getObjectStore(["settings"], "readonly");

        /* "use cache" setting */
        var reqCacheEnable = objStore.get("use_cache");

        reqCacheEnable.onsuccess = function (e) {
          var use_cache = e.target.result;
          if (use_cache) {
            USE_CACHE = use_cache.value;
            document.getElementById("use_cache").checked = USE_CACHE;
            console.log("use_cache is " + USE_CACHE);
          } else {
            console.error("what is use_cache ?");
          }
        };

        reqCacheEnable.onerror = function (e) {
          console.log("local setting cache init error");
        };

        /* "refresh article period in cache" setting */
        var reqRefreshCache = objStore.get("refresh_cache_period");

        reqRefreshCache.onsuccess = function (e) {
          var refresh = e.target.result;
          if (refresh) {
            REFRESH_CACHE_PERIOD = refresh.value;

            var selectElt = document.getElementById("refresh_cache_period");

            selectElt.value = REFRESH_CACHE_PERIOD;

            document.getElementById("refresh_label").textContent =
                selectElt.options[selectElt.selectedIndex].text;

            console.log("refresh_cache_period is " + REFRESH_CACHE_PERIOD);

          } else {
            console.error("what is refresh_cache_period ?");
          }
        };

        reqRefreshCache.onerror = function (e) {
          console.log("local setting refresh init error");
        };

      };

      request.onupgradeneeded = function (e) {
        // Create an objectStore to hold information about our visited pages
        db = e.currentTarget.result;

        console.log(db.version);
        //console.log(db.objectStoreNames);

        console.log("creating new database");
        var objectStore = null;

        if (db.objectStoreNames[0] === "pages") {
//          console.log("removing old pages objet store");
//          db.deleteObjectStore("pages");
//
//          objectStore = db.createObjectStore("pages", {keyPath: "url"});
//          objectStore.createIndex("title", "title", {unique: false});
//          objectStore.createIndex("date", "date", {unique: false});

        } else {
          objectStore = db.createObjectStore("pages", {keyPath: "url"});
          objectStore.createIndex("title", "title", {unique: false});
          objectStore.createIndex("date", "date", {unique: false});

          // Use transaction oncomplete to make sure the objectStore creation is 
          // finished before adding data into it.
          objectStore.transaction.oncomplete = function () {
            console.log("creating object transaction complete");
          };
        }

        var objectStore_2 = null;

        if (db.objectStoreNames[1] === "settings") {
//          console.log("removing old settings objet store");
//          db.deleteObjectStore("settings");
//          objectStore_2 = db.createObjectStore("settings", {keyPath: "name"});
        } else {
          objectStore_2 = db.createObjectStore("settings", {keyPath: "name"});

          objectStore_2.transaction.oncomplete = function () {
            console.log("creating object 2 transaction complete");
            console.log("settings default value");
            USE_CACHE = "true";
            updateSettings("use_cache", USE_CACHE);

            REFRESH_CACHE_PERIOD = "2629743830";
            updateSettings("refresh_cache_period", REFRESH_CACHE_PERIOD);
          };
        }

      };
    }

    /*
     * 
     * @param {type} store_name
     * @param {type} mode
     * @returns {unresolved}
     */
    function getObjectStore(store_name, mode) {
      var tx = db.transaction(store_name, mode);
      return tx.objectStore(store_name);
    }

    /*
     * 
     * @param {type} store_name
     * @returns {undefined}
     */
    function clearObjectStore(store_name) {
      var store = getObjectStore([store_name], 'readwrite'),
          req = store.clear();
      req.onsuccess = function () {
        console.log("Store '" + store_name + "' cleared");
        document.location.href = "./index.html";
      };
      req.onerror = function (evt) {
        console.error("clearObjectStore:", evt.target.errorCode);
      };
    }

    /*
     * update settings in the database
     * @param {type} name
     * @param {type} value
     * @returns {undefined}
     */
    function updateSettings(name, value) {
      var objStore = getObjectStore(["settings"], "readwrite"),
          request = objStore.get(name);

      request.onsuccess = function (e) {
        var result = e.target.result;
        if (result) { // value exist
          /* update the data */
          result.value = value;

          /*update the database */
          var reqUpdate = objStore.put(result);

          reqUpdate.onerror = function () {
            console.log("update settings db error");
          };

          reqUpdate.onsuccess = function () {
            console.log("settings db update");
          };
        } else { // value does not exist
          /*write it to the database */
          var reqNew = objStore.add({name: name, value: value});
          reqNew.onsuccess = function () {
            console.log("settings db request done");
          };

          reqNew.onerror = function () {
            console.log("settings db request error");
          };
        }
      };

      request.onerror = function (e) {
        console.log("local setting error");
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

    /*
     * 
     * @returns {String}
     */
    function appRoot() {
      /* It is need in devellopment when "reloading" from simulator on page
       * with anchor */
      var url = document.location.protocol + "//" + document.location.host;
      return url;
    }


    /* ----------------------------------------
     * First add event listener (Initialisation)
     * ------------------------------------------*/
    console.log("initialisation script start");

    uiListeners.init();
    opendb();

    console.log("initialisation script end (some steps may not have been completed yet)");
  })();
});