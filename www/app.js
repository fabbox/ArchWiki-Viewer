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

// Be strict, make error for early debug!
'use strict';

// from mortar skeleton
// DOMContentLoaded is fired once the document has been loaded and parsed,
// but without waiting for other external resources to load (css/images/etc)
// That makes the app more responsive and perceived as faster.
// https://developer.mozilla.org/en-US/Web/Reference/Events/DOMContentLoaded
window.addEventListener('DOMContentLoaded', function () {

  console.log('dom content loaded');

  (function () { // avoid global variables and functions

    /* ----------------------------------------------------------------------
     * Global variables (initialized when opening/inializing the database)
     * ------------------------------------------------------------------------*/
    var currentPage = null, // "article" which is diplayed ()
        awvhistory = null;   // array of "AwvUrl" used to manage history

    /* string constant */
    var awv = {
      ROOT: document.location.protocol + "//" + document.location.host,
      URL: document.location.protocol + "//" + document.location.host + "/index.html",
      DOMAIN: document.location.host,
      STAR_URL: document.location.protocol + "//" + document.location.host + "/star.html", // <- fake url for dipslaying star (cached) url list
      RELATIVE_ROOT: "./index.html",
      WIKIROOT_URL: "https://wiki.archlinux.org"
    };


    /* ----------------------------------------
     * Formatter (Ugly string manipulation function)
     * ------------------------------------------*/
    var formatter = {
      /*
       * related to href
       */
      url: {
        /*
         * reformat href link to use media wiki "action=render"
         * and remove anchor stuff
         * @param {type} str
         * @returns {unresolved} 
         */
        toRender: function (str) {
          /* format str to minimized loaded content */
          var str2replace = awv.WIKIROOT_URL + "/index.php/",
              str2inject = awv.WIKIROOT_URL + "/index.php?action=render&title=";

          if (str.indexOf(str2replace) === 0) {
            str = str.replace(str2replace, str2inject);
          }

          var anchor_idx = str.indexOf("#");
          if (anchor_idx > 1) {
            str = str.slice(0, anchor_idx);
          }

          //console.log(str);
          return str;
        },
        /*
         * Extract title string from href
         * @param {type} str
         * @returns {unresolved}
         */
        extractTitle: function (str) {
          var base = awv.WIKIROOT_URL + "/index.php?action=render&title=";

          if (str.indexOf(base) >= 0) {
            return str.replace(base, "");
          } else {
            return null;
          }
        }

      },
      /*
       * related to article title
       */
      title: {
        /*
         * try to make a title string from an url
         * @param {type} str
         * @returns {String}
         */
        fromUrl: function (str) {
          var title = decodeURI(str),
              ugly_url_part = awv.WIKIROOT_URL + "/index.php?action=render&title=",
              ugly_url_part3 = awv.WIKIROOT_URL + "/index.php/",
              ugly_url_part2 = awv.WIKIROOT_URL + "/index.php?search=",
              ugly_url_part4 = awv.WIKIROOT_URL + "/index.php?title=Special:Search&search=";

          // who told I did'nt read "how to loop on an array in JS"?!
          if (title.startsWith(awv.URL)) {
            title = "ArchWiki Viewer";

          } else if (title.indexOf(ugly_url_part) >= 0) {
            title = decodeURI(title.replace(ugly_url_part, ""));

          } else if (title.indexOf(ugly_url_part2) >= 0) {
            title = decodeURI(title.replace(ugly_url_part2, ""));

          } else if (title.indexOf(ugly_url_part3) >= 0) {
            title = decodeURI(title.replace(ugly_url_part3, ""));

          } else if (title.indexOf(ugly_url_part4) >= 0) {
            title = title.replace(ugly_url_part4, "");
            title = title.replace("&fulltext=Search&profile=default&redirs=0", "");
            title = decodeURI(title);

          }
          return title;
        },
        /*
         * clean title string from usual additional data
         * @param {type} title
         * @returns {String}
         */
        commonFilter: function (title) {
          if (title.startsWith('Search results')) {
            title = "Search results";
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
          return title;
        },
        /*
         * remove extra information from title string to be easily displayed
         * on mobile device
         * @param {type} title
         * @returns {unresolved}
         */
        displayFilter: function (title) {
          /*
           * The following string will not appears in the apps title
           * in order to have the shorter title possible
           * It's simply the namespace (as I understand it)
           * */
          if (title.startsWith("Category:")) {
            title = title.replace("Category:", "");

          } else if (title.startsWith("Help:")) {
            title = title.replace("Help:", "");

          } else if (title.startsWith("File:")) {
            title = title.replace("File:", "");

          } else if (title.startsWith("ArchWiki:")) {
            title = title.replace("ArchWiki:", "");

          }

          return title;
        }

      },
      /*
       * related to article formatting
       */
      page: {
        /* 
         * reformat "related articles" part (if any
         * @param {type} mainDiv
         * @returns {unresolved}
         */
        relatedArticle: function (mainDiv) {

          var fec = mainDiv.firstElementChild,
              relatedStyle = "float:right; clear:right; width:25%; margin: 0 0 0.5em 0.5em;";

          if (!fec) {
            return mainDiv;
          }

          do {
            if (fec
                && fec.tagName === "DIV"
                && fec.hasAttributes()
                && fec.attributes[0].name === "style"
                && fec.attributes[0].value === relatedStyle) {

              //console.log("format 'related articles'");
              fec.className = "awv-related";
              fec.removeAttribute("style");

              /*the <p> where "related articles" is written*/
              var title = fec.firstElementChild;
              title.className = "awv-related-title";
              title.removeAttribute("style");

              /* ul */
              var ul = mainDiv.getElementsByTagName("ul");
              for (var i = ul.length - 1; i >= 0; i--) {
                if (ul[i].hasAttributes() && ul[i].attributes[0].name === "style") {
                  //console.log("clean ul");
                  ul[i].removeAttribute("style");
                }
              }

              /* li*/
              var li = mainDiv.getElementsByTagName("li");
              for (var i = li.length - 1; i >= 0; i--) {
                if (li[i].hasAttributes() && li[i].attributes[0].name === "style") {
                  //console.log("clean li");
                  li[i].removeAttribute("style");
                }
              }

              fec = null;

            } else {
              fec = fec.nextElementSibling;
            }
          } while (fec);
          return mainDiv;
        },
        /*
         * replace string style of note, tip and warning inset by css class
         * @param {type} mainDiv
         * @returns {unresolved}
         */
        inset: function (mainDiv) {
          var divs = mainDiv.getElementsByTagName("div"),
              note = "padding: 5px; margin: 0.50em 0; background-color: #DDDDFF; border: thin solid #BBBBDD; overflow: hidden;",
              tip = "padding: 5px; margin: 0.50em 0; background-color: #DDFFDD; border: thin solid #BBDDBB; overflow: hidden;",
              warning = "padding: 5px; margin: 0.50em 0; background-color: #FFDDDD; border: thin solid #DDBBBB; overflow: hidden;";

          for (var i = divs.length - 1; i >= 0; i--) {
            if (divs[i].hasAttributes() && divs[i].attributes[0].name === "style") {
              if (divs[i].attributes[0].value === note) {
                //console.log("format 'note'");
                divs[i].className = "awv-note";
                divs[i].removeAttribute("style");
              } else if (divs[i].attributes[0].value === tip) {
                //console.log("format 'tip'");
                divs[i].className = "awv-tip";
                divs[i].removeAttribute("style");
              } else if (divs[i].attributes[0].value === warning) {
                //console.log("format 'warning'");
                divs[i].className = "awv-warning";
                divs[i].removeAttribute("style");
              }
            }
          }
          return mainDiv;
        },
        /* 
         * find img  and update src point to archlinux when it's "necessary"
         * 
         * @param {type} mainDiv
         * @returns {unresolved}
         */
        imageSrc: function (mainDiv) {
          /* the collection of tango icon provide in the 
           * arch-wiki-doc package is use locally to do not 
           * downloading common icon
           */
          var img = mainDiv.querySelectorAll("img");
          if (img) {
            var imgRoot = awv.ROOT,
                tdStyle = "background-color: {{{signalcolor}}}; width: 100px",
                tableStyle = "background: {{{backgroundcolor}}}; border-color: {{{bordercolor}}}; width: 100%";

            for (var i = 0; i < img.length; i++) {
              if (img[i].src.startsWith(imgRoot + "/images/")) {
                var src = img[i].src;
                //console.log("update image src :" + src);
                if (src.indexOf("Tango-") >= 0) {
                  img[i].src = src.replace(/.*Tango-/g, imgRoot + "/images/tango/File:Tango-");

                  var td = img[i].parentNode.parentNode;
                  if (td.tagName === "TD"
                      && td.hasAttributes()
                      && td.hasAttribute("style")
                      && td.getAttribute("style") === tdStyle) {

                    td.classList.add("awv-tango");
                    td.removeAttribute("style");
                  }

                  var table = td.parentNode.parentNode.parentNode;
                  if (table.tagName === "TABLE"
                      && table.hasAttributes()
                      && table.hasAttribute("style")
                      && table.getAttribute("style") === tableStyle) {

                    table.classList.add("awv-tango");
                    table.removeAttribute("style");
                  }

                } else {
                  img[i].src = img[i].src.replace(imgRoot, "https://wiki.archlinux.org");


                }
              }
            }
          }
          return mainDiv;
        }

      }
    };


    /* ----------------------------------------
     * Settings
     * ------------------------------------------*/
    var settings = {
      use_cache: null, // use cache or not ? 
      refresh_cache_period: null, // do not use the cache after such period, download a new version
      /*
       * set default setting
       
       * @returns {undefined}
       */
      resetDefault: function () {
        console.log("settings default value");

        settings.setUseCache("true");
        settings.save("use_cache");

        settings.setRefreshCachePeriod("2629743830");
        settings.save("refresh_cache_period");
      },
      /*
       * Set the "use_cache" settings
       * @param {type} value
       * @returns {undefined}
       */
      setUseCache: function (value) {
        settings["use_cache"] = value;
        console.log('use_cache : ' + settings["use_cache"]);
      },
      /*
       * Set the "refresh_cache_period" settings
       * @param {type} value
       * @returns {undefined}
       */
      setRefreshCachePeriod: function (value) {
        settings["refresh_cache_period"] = value;
        console.log('refresh cache page period (ms): ' + settings["refresh_cache_period"]);
      },
      /*
       * update settings in the database
       * @param {type} name
       * @param {type} value
       * @returns {undefined}
       */
      save: function (name) {
        var settingsStore = database.getObjectStore(["settings"], "readwrite"),
            request = settingsStore.get(name);

        request.onsuccess = function (e) {
          var result = e.target.result;
          if (result) { // value exist
            /* update the data */
            result.value = settings[name];

            /*update the database */
            var reqUpdate = settingsStore.put(result);

            reqUpdate.onerror = function () {
              console.log("update settings db error");
            };

            reqUpdate.onsuccess = function () {
              console.log("settings db update");
            };
          } else { // value does not exist
            /*write it to the database */
            var reqNew = settingsStore.add({name: name, value: settings[name]});

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
      },
      /*
       * Save all the settings
       * @returns {undefined}
       */
      saveAll: function () {
        settings.save("use_cache");
        settings.save("refresh_cache_period");
      },
      /*
       * initialize environnement settings values from the database value
       */
      init: {
        /*
         * 
         * @returns {undefined}
         */
        useCache: function () {
          /* Initialise Application Settings*/
          var settingsStore = database.getObjectStore(["settings"], "readonly");
          /* "use cache" setting */
          var reqCacheEnable = settingsStore.get("use_cache");

          reqCacheEnable.onsuccess = function (e) {
            var use_cache = e.target.result;
            if (use_cache) {
              settings.setUseCache(use_cache.value);
              document.getElementById("use_cache").checked = settings["use_cache"];
            } else {
              console.error("what is use_cache ?");
            }
          };

          reqCacheEnable.onerror = function (e) {
            console.log("local setting cache init error");
          };
        },
        /*
         * 
         * @returns {undefined}
         */
        refreshCache: function () {
          /* Initialise Application Settings*/
          var settingsStore = database.getObjectStore(["settings"], "readonly");
          /* "refresh article period in cache" setting */
          var reqRefreshCache = settingsStore.get("refresh_cache_period");

          reqRefreshCache.onsuccess = function (e) {
            var refresh = e.target.result;
            if (refresh) {
              settings.setRefreshCachePeriod(refresh.value);

              var selectElt = document.getElementById("refresh_cache_period");
              selectElt.value = settings["refresh_cache_period"];

              document.getElementById("refresh_label").textContent =
                  selectElt.options[selectElt.selectedIndex].text;
            } else {
              console.error("what is refresh_cache_period ?");
            }
          };

          reqRefreshCache.onerror = function (e) {
            console.log("local setting refresh init error");
          };
        }
      }

    };


    /* ----------------------------------------
     * Database (indexedDB)
     * ------------------------------------------*/
    var database = {
      db: null,
      NAME: "awv",
      VERSION: 3,
      /*
       * Open and set database for cached article and settings pref.
       * @returns {undefined}
       */
      init: function () {
        /* openning database */
        var request = indexedDB.open(this.NAME, this.VERSION);
        /* XXX : checked if db is already opened ? */
        request.onerror = function () {
          console.log("Why didn't you allow ArchWiki Viewer to use IndexedDB?!");
        };

        request.onsuccess = function () {
          console.log("indexeddb is opened!");
          database.db = this.result;

          database.db.onerror = function (e) {
            console.log("Database error: " + e.target.errorCode);
          };

          /* start by (updating) caching the home page*/

          var homeArticle = document.getElementById("aw-article-body");

          currentPage = new WikiArticle(new AwvUrl(awv.URL, false));
          currentPage.setContent(homeArticle.innerHTML, false);
          currentPage.lastmodified = 0;
          currentPage.save();

          awvhistory = new AwvHistory();
          awvhistory.push(currentPage.url);

          /* Initialise Application Settings*/
          settings.init.useCache();
          settings.init.refreshCache();
        };

        request.onupgradeneeded = function (e) {
          var db = e.currentTarget.result;

          console.log("database update to version " + db.version);
          //console.log(db.objectStoreNames);

          console.log("creating new database");

          if (db.objectStoreNames[0] === "pages") {
            // several change in this store, delete it for safety
            // sorry for those who download all the site
            db.deleteObjectStore("pages");

            var pageStore = db.createObjectStore("pages", {keyPath: "url"});
            pageStore.createIndex("title", "title", {unique: false}); // probably true
            pageStore.createIndex("date", "date", {unique: false});
            pageStore.createIndex("lastmodified", "lastmodified", {unique: false});

          } else {

            var pageStore = db.createObjectStore("pages", {keyPath: "url"});
            pageStore.createIndex("title", "title", {unique: false}); // probably true
            pageStore.createIndex("date", "date", {unique: false});
            pageStore.createIndex("lastmodified", "lastmodified", {unique: false});

            // Use transaction oncomplete to make sure the pageStore creation is 
            // finished before adding data into it.
            pageStore.transaction.oncomplete = function () {
              console.log("creating 'pages' complete");
            };
          }

          if (db.objectStoreNames[1] === "settings") {
            // nothing there right now
          } else {
            var settingsStore = db.createObjectStore("settings", {keyPath: "name"});

            settingsStore.transaction.oncomplete = function () {
              console.log("creating  'settings' complete");
              /*we need a database to use settings.setDefault()*/
              database.db = db;
              settings.resetDefault();
              database.db = null;
            };
          }
        };
      },
      /*
       * 
       * @param {type} store_name
       * @param {type} mode
       * @returns {unresolved}
       */
      getObjectStore: function (store_name, mode) {
        var tx = database.db.transaction(store_name, mode);
        return tx.objectStore(store_name);
      },
      /*
       * 
       * @param {type} store_name
       * @returns {undefined}
       */
      clearObjectStore: function (store_name) {
        var store = database.getObjectStore([store_name], 'readwrite'),
            req = store.clear();
        req.onsuccess = function () {
          console.log("Store '" + store_name + "' cleared");
          document.location.href = awv.RELATIVE_ROOT;
        };
        req.onerror = function (evt) {
          console.error("clearObjectStore:", evt.target.errorCode);
        };
      }
    };


    /* ----------------------------------------
     * AwvHistory Class
     * ------------------------------------------*/

    /*
     * AwvHistory constructor ()
     * @returns {app_L35.AwvHistory}
     */
    function AwvHistory() {
      //console.log("new AwvHistory instance");

      this._array = [];
      this.length = this._array.length;

      uiListeners.disable.navigation();
    }

    AwvHistory.prototype = {
      /*
       * push url object in awvHistory
       * @param {type} url
       * @returns {undefined}
       */
      push: function (url) {
        if (!(url instanceof AwvUrl)) {
          console.error("Who try to corrupt awv history ?");
          return;
        } else if (this.length === 0) {
          this._array.push(url);
          this.length = this._array.length;
        } else if (this.length > 0 && url.href !== this._array[this.length - 1].href) {
          this._array.push(url);
          this.length = this._array.length;
        }

        if (this.length > 1) {
          uiListeners.enable.navigation();
        }
      },
      /*
       * pop url object in awvHistory
       * @returns {app_L35.AwvHistory@pro;_array@call;pop}
       */
      pop: function () {

        var popval = this._array.pop();
        this.length = this._array.length;

        if (this.length <= 1) {
          uiListeners.disable.navigation();
          ui.navbar.hide();
        }

        return popval;
      },
      /*
       * delete the last element of awvHistory and 
       * return the value of the new last element.
       * @returns {Array}
       */
      popget: function () {
        this.pop();
        // console.log("history length : " + awvHistory.length);
        return this._array[this.length - 1];
      }
    };


    /* ----------------------------------------
     * AwvUrl Class
     * ------------------------------------------*/

    /*
     * AwvUrl constructor
     * @param {type} str
     * @param {type} reformat
     * @returns {app_L35.AwvUrl}
     * 
     * properties are : href, anchor and raw;
     */
    function AwvUrl(str, reformat) {
      //console.log("new AwvUrl Instance");

      if (typeof reformat === 'undefined') {
        reformat = true;
      }

      this.raw = str;
      //console.log("raw url :" + this.raw);

      if (str.startsWith("/index.php/")) {
        str = awv.WIKIROOT_URL + str;
      }

      if (str === awv.WIKIROOT_URL + "/index.php/Main_page"
          || str.startsWith(awv.URL)) {
        /* home link */
        //console.log("this app url detected");
        this.href = awv.URL;
        this.anchor = null;

      } else {

        if (reformat) {
          /* format str to minimized loaded content */
          this.href = formatter.url.toRender(str);
          //this.title = formatter.url.extractTitle(this.href);
        } else {
          this.href = str;
        }

        // use this because use of str.hash can be buggy as it
        // decode the anchor string
        var anchor_idx = str.indexOf("#");
        if (anchor_idx > 0) {
          //console.log(str);
          this.anchor = str.slice(anchor_idx + 1);
        } else {
          this.anchor = null;
        }

      }

    }


    /* ----------------------------------------
     * Title Class
     * ------------------------------------------*/

    /*
     * Title constructor
     * @param {type} title
     * @param {type} awvUrl
     * @returns {app_L35.Title}
     */
    function Title(title, awvUrl) {
      //console.log("new Title instance");
      // if (typeof awvUrl !== 'undefined' && !title) {
      if (awvUrl instanceof AwvUrl && !title) {
        title = formatter.title.fromUrl(awvUrl.href);
      }
      title = formatter.title.commonFilter(title);
      this.str = title;
    }

    Title.prototype = {
      /*
       * Display title in the document
       * @returns {undefined}
       */
      print: function () {
        var title = formatter.title.displayFilter(this.str);
        document.getElementById("awPageTitle").textContent = title;
      }
    };


    /* ----------------------------------------
     * Content Class
     * ------------------------------------------*/

    /*
     * Content constructor
     * @param {type} content
     * @param {type} reformat
     * @returns {app_L35.Content}
     */
    function Content(content, reformat) {
      //console.log("new Content instance");

      if (typeof reformat === 'undefined') {
        reformat = true;
      }

      this.topElement = document.createElement("div");
      this.topElement.innerHTML = content;

      if (reformat) {
        this.reformat();
      }
    }

    Content.prototype = {
      /*
       * return html string of the article 
       * @returns {unresolved}
       */
      getHtml: function () {
        return this.topElement.innerHTML;
      },
      /*
       * reformat article content
       * @returns {undefined}
       */
      reformat: function () {
        this.topElement = formatter.page.relatedArticle(this.topElement);
        this.topElement = formatter.page.inset(this.topElement);
        this.topElement = formatter.page.imageSrc(this.topElement);
      },
      /*
       * append a DOM node to the content
       * @param {type} node
       * @returns {undefined}
       */
      append: function (node) {
        this.topElement.appendChild(node);
      },
      /*
       * Display content in a new article in the document
       * it delete the old article. 
       * @returns {undefined}
       */
      print: function () {

        var self = this,
            awart_old = document.getElementById("aw-article"),
            awart_content_old = document.getElementById("aw-article-body"),
            awsect = awart_old.parentNode;

        awart_old.id = "aw-article_old";
        awart_content_old.id = "aw-article-body_old";

        /* create new article element */
        var awart = document.createElement("article");

        awart.id = "aw-article";
        awart.className = "aw-article fade-out";

        self.topElement.id = "aw-article-body";
        self.topElement.className = "aw-article-body";

        awart.appendChild(self.topElement);

        /* replace current article by this article*/
        /* fade out/in transition*/
        awsect.appendChild(awart);

        awart_old.addEventListener("transitionend", function (e) {
          awart.classList.add('fade-in');
          awart_old.parentNode.removeChild(awart_old);
          uiListeners.add.awArticleBody();
          uiListeners.add.links();
        }, true);

        awart_old.classList.remove('fade-in');
      }
    };


    /* ----------------------------------------
     * WikiArticle Class
     * ------------------------------------------*/

    /*
     * Wikipage constructor : 
     * @param {type} url
     * @returns {app_L35.WikiArticle}
     */
    function WikiArticle(url) {
      //console.log("new WikiArticle instance");

      this.url = url;
      this.anchor = url.anchor;
      this.content = null;
      this.date = Date.now();
      this.lastmodified = 0; // is update in loadUrl
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
        } else if (this.url.href === awv.URL) {
          this.loadCache();
        } else {
          this.loadUrl(false);
        }
      },
      /*
       * Check for update version of an article. 
       * The article must be in the database and has been loaded.
       * In case of error, the version in the database is printed.
       * @returns {undefined}
       */
      update: function () {
        console.log("check update cache");

        ui.progressbar.show();
        var self = this;

        var updateReq = new XMLHttpRequest({mozSystem: true});

        updateReq.open("HEAD", self.url.href, true);

        updateReq.onerror = function () {
          console.log("error in update, loading cache version");
          self.print();
          ui.progressbar.hide();
        };

        updateReq.onload = function () {
          var lm = Date.parse(updateReq.getResponseHeader("Last-Modified"));

          //console.log('last modified local:' + self.lastmodified);
          //console.log('last modified dist.:' + lm);

          if (lm > self.lastmodified) {
            console.log("getting new version of this article ...");
            self.loadUrl(settings.use_cache);
          } else {
            console.log("article is up to date !");
            self.print();
            /* save it to update date field (not timestamp)*/
            self.save();
            ui.progressbar.hide();
          }
        };

        updateReq.send(null);
      },
      /*
       * load (and print article) : It try to load/update the cache page, 
       * if the page doesn't exist, it download it.
       * @returns {undefined}
       */
      loadCache: function () {
        ui.progressbar.show();

        var self = this,
            cacheRequest = database.getObjectStore("pages").get(self.url.href);

        cacheRequest.onsuccess = function (e) {
          var cache = e.target.result;

          if (cache) {
            console.log("I know that url : \n\t" + cache.url);

            self.lastmodified = cache.lastmodified;
            self.setTitle(cache.title);
            self.setContent(cache.body, false);

            if (self.date - cache.date < settings["refresh_cache_period"]) {
              self.print();
              /* do not save there is no change and no check*/
              ui.progressbar.hide();
              self.generateEventSave();
            } else {
              self.update();
            }

          } else {
            console.log("I do not know that url yet : \n\t" + self.url.href);
            self.loadUrl(true);
          }
        };

        cacheRequest.onerror = function () {
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
        console.log("http request url : \n\t" + this.url.href);

        ui.progressbar.show();
        if (typeof save2db === 'undefined') {
          save2db = true;
        }

        var self = this,
            xhr = new XMLHttpRequest({mozSystem: true});

        //* Initialize Cross XMLHttprequest 
        //* and open a http request with "document" responseType.
        //* It also define basic error handler 
        //* and mask the progress bar on request end

        /* ArchWiki server doesn't send "Content-Length" in the response header
         * so we cannot use progress event and having a real
         * progress bar. It may be due to nginx (found a rumor about
         * that on the web) but I don't know
         */

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

          ui.navbar.show();
        };

        xhr.onloadend = function () {
          //console.log("load end");
          ui.progressbar.hide();
        };

        xhr.onload = function () {
          console.log("load success");


          self.setTitle(xhr.responseXML.title, self.url);
          self.lastmodified = Date.parse(xhr.getResponseHeader("Last-Modified"));

          var resp = xhr.responseXML.getElementById("mw-content-text") || xhr.responseXML.body;

          if (!resp) {
            log.error("empty response");
            return;
          }

          // FIX-ME: Requesting "document" to just using innerHtml is 
          // probably a waste of ressources
          self.setContent(resp.innerHTML, true);
          self.print();

          if (save2db) {
            self.save();
          }
        };

        xhr.send(null);
      },
      /*
       * set the content properties
       * @param {type} str 
       * @returns {undefined}
       */
      setContent: function (str, reformat) {
        this.content = new Content(str, reformat);
      },
      /*
       * return the innerHTML of the content 
       * @returns {app_L35.WikiArticle.prototype@pro;content@call;getHtml}
       */
      getHtmlContent: function () {
        if (this.content) {
          return this.content.getHtml();
        } else {
          return null;
        }
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
       * return the full title string 
       * @returns {app_L35.WikiArticle.title.str}
       */
      getTitle: function () {
        return this.title.str;
      },
      /*
       * Dipslay the different properties to the current document
       * @returns {undefined}
       */
      print: function () {
        if (this.needPrint) {
          this.title.print();
          this.content.print();
          this.scrollTo(this.anchor);
        }
        //uiListeners.add.links();
      },
      /*
       * Save or update article in the indexedb
       * @returns {undefined}
       */
      save: function () {
        var self = this,
            data = {
              url: this.url.href,
              title: this.getTitle(),
              body: this.getHtmlContent(),
              date: this.date,
              lastmodified: this.lastmodified
            };

        /* fix index.html (home) date issue */
        if (this.url.href.startsWith(awv.ROOT)) {
          data.date = Number.MAX_VALUE;
        }

        /* check if page exist*/
        var pagesStore = database.getObjectStore(["pages"], "readwrite");
        var localCache = pagesStore.get(this.url.href);

        localCache.onsuccess = function (e) {
          var cachedPage = e.target.result;
          if (cachedPage) { // page exists : 
            /* update cached data */
            cachedPage.body = data.body; // dom cannot be clone so we stock innerhtml
            cachedPage.title = data.title;
            cachedPage.date = data.date;
            cachedPage.lastmodified = data.lastmodified;

            /*update the database */
            var updateCacheRequest = pagesStore.put(cachedPage);

            updateCacheRequest.onerror = function () {
              console.log("update cached page error");
            };

            updateCacheRequest.onsuccess = function () {
              console.log("page cached update");
              self.generateEventSave();
            };

          } else { // page does not exist
            /*write it to the database */
            var addCacheRequest = pagesStore.add(data);

            addCacheRequest.onsuccess = function () {
              console.log("new page cached");
              self.generateEventSave();
            };

            addCacheRequest.onerror = function () {
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
       * wether or not display the article when loading it
       * default is to display it
       */
      needPrint: true,
      /*
       * Scroll to an id : 
       * XXX: static method
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
      },
      /*
       * create and dispatch an event when the article is saved 
       * @returns {undefined}
       */
      generateEventSave: function () {
        // create the event
        var savedEvent = new CustomEvent("awvSaved", {});
        document.dispatchEvent(savedEvent);
      }
    };


    /* ----------------------------------------
     * namespaces related to the User Interface (UI)
     * ------------------------------------------*/

    /*
     * Namespace for ui (hide button, navigation bar...)
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

            document.getElementById("action_settings").parentNode.classList.add('hidden');
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
            //var navbar = document.getElementById("navbar");

            document.getElementById("navbar").classList.add('navShown');

            document.getElementById("action_home").parentNode.classList.add('hidden');
            document.getElementById("action_settings").parentNode.classList.remove('hidden');
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
      },
      /*
       * the progress (or activity) bar (when loading page)
       */
      progressbar: {
        hide: function () {
          document.getElementById("progressBar").style.display = "";
        },
        show: function () {
          document.getElementById("progressBar").style.display = "block";
        }
      },
      /*
       * general settings panel 
       */
      settings: {
        hide: function () {

          console.log("enable hide navitation bar");
          uiListeners.add.awArticleBody();

          if (awvhistory.length > 1) {
            console.log("enable click on navitation bar");
            ui.navbar.enable.btBack();
          }

          console.log("enable click link event");
          uiListeners.remove.stoppedLinks();
          uiListeners.add.links();

          var mainSection = document.getElementById("main");
          mainSection.classList.remove('move-left80');
          mainSection.classList.add('move-center');
        },
        show: function () {
          console.log("disable hide navitation bar");
          uiListeners.remove.awArticleBody();

          console.log("disable click on navitation bar");
          //uiListeners.disable.navigation();
          ui.navbar.disable.btBack();

          console.log("prevent click link event");
          uiListeners.remove.links();
          uiListeners.add.stoppedLinks();

          var mainSection = document.getElementById("main");

          mainSection.classList.remove('move-center');
          mainSection.classList.add('move-left80');
        }
      },
      /*
       * the database settings panel
       */
      dbSettings: {
        hide: function () {
          var dbSettings = document.getElementById("cacheSettings");

          dbSettings.classList.remove("move-center");
          dbSettings.classList.add("move-left");

        },
        show: function () {
          var dbSettings = document.getElementById("cacheSettings");

          dbSettings.classList.remove("move-left");
          dbSettings.classList.add("move-center");
        }
      },
      /*
       * the clear database confirmation dialog
       */
      cleardbDialog: {
        hide: function () {
          var cleardbDialog = document.getElementById("cleardb_confirm");

          cleardbDialog.classList.add("hidden");
        },
        show: function () {
          var cleardbDialog = document.getElementById("cleardb_confirm");

          cleardbDialog.classList.remove("hidden");
        }
      },
      /*
       * the about panel 
       */
      about: {
        hide: function () {
          var about = document.getElementById("awv-about");

          about.classList.remove("move-center");
          about.classList.add("move-left");

        },
        show: function () {
          var about = document.getElementById("awv-about");

          about.classList.remove("move-left");
          about.classList.add("move-center");
        }
      },
      /*
       * the downloader panel 
       */
      downloader: {
        hide: function () {
          var dl = document.getElementById("awv-downloader");

          dl.classList.remove("move-center");
          dl.classList.add("move-down");
        },
        show: function () {
          var dl = document.getElementById("awv-downloader");

          dl.classList.remove("move-down");
          dl.classList.add("move-center");
        }
      }
    };

    /*
     * Namespace for UI Listeners 
     * (disable or enable listener)
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
        uiListeners.add.awArticleBody();
        uiListeners.add.settings();
        uiListeners.add.databaseSettings();
        uiListeners.add.about();
        uiListeners.add.downloader();
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
              btHome = document.querySelector("#action_home").parentNode,
              btSettings = document.getElementById("action_settings").parentNode;

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
            if (currentPage.url.href !== awv.URL) {
              var page = new WikiArticle(new AwvUrl(awv.URL, false));
              page.loadCache();
              awvhistory.push(page.url);
              currentPage = page;
              ui.navbar.disable.btReload();
            }
          }, false);

          btSettings.addEventListener('click', function (e) {
            e.preventDefault();
            if (document.getElementById("main").className.indexOf("move-center") < 0) {
              ui.settings.hide();
            } else {
              ui.settings.show();
            }
          }, false);
        },
        /*
         * About panel listener 
         * @returns {undefined}
         */
        about: function () {
          console.log("add about listener");

          document.getElementById("CloseAbout")
              .addEventListener('click', function (e) {
                e.preventDefault();
                ui.about.hide();
              }, false);

          var links = document.querySelectorAll('#awv-about a');

          for (var i = links.length - 1; i >= 0 ; i--) {
            var a = links[i];
            if (!a.href) {
              a.addEventListener('click', callback.stopprop, false);
            } else if (a.id === "CloseAbout") {
              continue;
            } else {
              a.addEventListener('click', callback.openInOSBrowser, false);
            }
          }
        },
        /*
         * About panel listener 
         * @returns {undefined}
         */
        downloader: function () {
          console.log("add downloader listener");

          document.getElementById("CloseDownloader")
              .addEventListener('click', function (e) {
                e.preventDefault();
                document.removeEventListener("awvSaved", downloader.getNext, false);
                ui.downloader.hide();
              }, false);
        },
        /*
         * Links (<a href=... > listeners
         * @returns {undefined}
         */
        links: function () {
          console.log("add links listener");

          var links = document.querySelectorAll('.aw-article a');

          for (var i = links.length - 1; i >= 0 ; i--) {

            var a = links[i];

            if (!a.href) {
              //console.log("a with no ref found!");
              a.addEventListener('click',
                  function (e) {
                    e.preventDefault();
                    console.error("no href found");
                  }
              , false);

            } else if (a.href.startsWith(awv.URL + '#')) {
              // let local anchor be managed by the html engine.
              continue;
              //var id = a.href.replace(awv.URL + '#',"");

              //a.addEventListener('click',
              //    function (e) {
              //      e.preventDefault();
              //      currentPage.scrollTo(id);
              //    }
              //, false);

            } else if (
                (a.host.startsWith("wiki.archlinux.org") && a.protocol === "https:")
                || (a.host.startsWith(awv.DOMAIN) && a.protocol === "app:") // <- need in search page results
                ) {
              //console.log("wiki link event add : " + a.href);
              a.addEventListener('click', callback.load, false);

              if (a.className.indexOf('awv-inner-link') < 0) {
                a.classList.add('awv-inner-link');
              }

            } else {
              //console.log("external link event add : " + a.href);
              a.addEventListener('click', callback.openInOSBrowser, false);

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
            form.addEventListener('submit', callback.search, true);

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
              btStar = document.getElementById("action_star"),
              btDownload = document.getElementById("action_download");

          btClose.addEventListener('click', function () {
            console.log("close");
            window.close();
          }, false);


          btBack.addEventListener('click', function () {
            console.log("back");

            if (currentPage.url.href === awv.STAR_URL) {
              var lasturl = awvhistory.pop(),
                  page = new WikiArticle(lasturl);
              page.loadArticle(settings["use_cache"]);
              awvhistory.push(lasturl);
              currentPage = page;

            } else if (awvhistory.length > 1) {
              // console.log("history length : " + awvHistory.length);
              var page = new WikiArticle(awvhistory.popget());
              page.loadArticle(settings["use_cache"]);
              currentPage = page;

            }
          }, false);

          btReload.addEventListener('click', function () {
            console.log("reload");
            if (currentPage.url.href !== awv.URL) {
              currentPage.loadUrl(true);
            }
          }, false);

          btStar.addEventListener('click', function () {
            console.log("star");
            callback.printCachedArticleList();
            ui.navbar.disable.btReload();
          }, false);

          btDownload.addEventListener('click', function (e) {
            console.log("download");
            e.preventDefault();
            ui.settings.hide();
            ui.navbar.hide();
            downloader.confirm_form();
          }, false);

        },
        /*
         * add listener to prevent link to block link
         * @returns {undefined}
         */
        stoppedLinks: function () {
          var links = document.querySelectorAll('.aw-article a');

          for (var i = links.length - 1; i >= 0; i--) {
            links[i].addEventListener('click', callback.stopprop, false);
          }
        },
        /*
         * clicking somewhere in an article
         * @returns {undefined}
         */
        awArticleBody: function () {
          document.getElementById("aw-article")
              .addEventListener('click', ui.navbar.hide, false);
        },
        /*
         * confirm download link dialog box listener
         * @returns {undefined}
         */
        confirmDownload: function () {
          document.getElementById("dlLinks_cancel")
              .addEventListener('click', downloader.cancel, false);

          document.getElementById("dlLinks_ok")
              .addEventListener('click', downloader.start, false);
        },
        /*
         * Settings and DatabaseSetting Listener
         * @returns {undefined}
         */
        settings: function () {
          console.log("add settings event");

          document.getElementById("lnToCacheSettings")
              .addEventListener('click', function (e) {
                e.preventDefault();

                ui.settings.hide();
                ui.navbar.hide();
                ui.dbSettings.show();
              }, false);

          document.getElementById("lnToAbout")
              .addEventListener('click', function (e) {
                e.preventDefault();

                ui.settings.hide();
                ui.navbar.hide();
                ui.about.show();
              }, false);

          document.getElementById("sideQuit")
              .addEventListener('click', function (e) {
                e.preventDefault();
                console.log("close");
                window.close();
              }, false);

        },
        /*
         * database Settings Section
         * @returns {undefined}
         */
        databaseSettings: function () {
          console.log("add database settings event");

          document.getElementById("CloseCacheSettings")
              .addEventListener('click', function (e) {
                e.preventDefault();
                ui.dbSettings.hide();
              }, false);

          /* toggle use cache*/
          document.getElementById("use_cache")
              .addEventListener('click', function (e) {
                settings.setUseCache(e.target.checked);
                settings.save("use_cache");
              }, false);

          /* Change refresh cache */
          document.getElementById("refresh_cache_period")
              .addEventListener('change', function () {
                settings.setRefreshCachePeriod(this.value);
                settings.save("refresh_cache_period");
                document.getElementById("refresh_label").textContent = this.options[this.selectedIndex].text;
              });

          /* clear database*/
          document.getElementById("cleardb")
              .addEventListener('click', function (e) {
                e.preventDefault();
                ui.cleardbDialog.show();
              }, false);

          /*
           *  Clear db confirm dialog
           */
          document.getElementById("cleardb_cancel")
              .addEventListener('click', function (e) {
                e.preventDefault();
                ui.cleardbDialog.hide();
              }, false);

          document.getElementById("cleardb_ok")
              .addEventListener('click', function (e) {
                e.preventDefault();
                database.clearObjectStore("pages");
              }, false);
        }

      },
      /*
       * remove listener
       */
      remove: {
        /*
         * confirm download link dialog box listener
         * @returns {undefined}
         */
        confirmDownloader: function () {
          document.getElementById("dlLinks_cancel")
              .removeEventListener('click', downloader.cancel, false);

          document.getElementById("dlLinks_ok")
              .removeEventListener('click', downloader.start, false);
        },
        /*
         * clicking on article (somewhere)
         * @returns {undefined}
         */
        awArticleBody: function () {
          document.getElementById("aw-article")
              .removeEventListener('click', ui.navbar.hide, false);
        },
        /*
         * article link listener
         * @returns {undefined}
         */
        links: function () {
          var links = document.querySelectorAll('.aw-article a');

          for (var i = links.length - 1; i >= 0; i--) {
            var a = links[i];
            a.removeEventListener('click', callback.load, false);
            a.removeEventListener('click', callback.openInOSBrowser, false);
            a.addEventListener('click', callback.stopprop, false);
          }
        },
        /*
         * remove stopped link listener
         * @returns {undefined}
         */
        stoppedLinks: function () {
          var links = document.querySelectorAll('.aw-article a');

          for (var i = links.length - 1; i >= 0; i--) {
            links[i].removeEventListener('click', callback.stopprop, false);
          }
        }
      }
    };

    /*
     * callback functions (for the uiListeners)
     * @type type
     */
    var callback = {
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
            targetUrl = new AwvUrl(href, true),
            page = new WikiArticle(targetUrl);

        page.loadArticle(settings["use_cache"]);
        currentPage = page;
        awvhistory.push(targetUrl);
      },
      /*
       * Callback for submit search form
       * @param {type} e
       * @returns {undefined}
       */
      search: function (e) {
        console.log('Searching !');
        e.preventDefault();

        // XXX : use wikimedia api to avoid downlodaing the full page ?
        // pro : 
        // small response
        // I can provide a "local article response"
        // con :
        // several request needs
        // load impact on arch server (? completely unknown : don't they use
        // the api for building search page results ? )
        // 
        // example :
        //ex 1 :title match list
        //https://wiki.archlinux.org/api.php?action=query&list=search&srprop=timestamp&srwhat=title&srsearch=zsh
        //ex 2 : content match list
        //https://wiki.archlinux.org/api.php?action=query&list=search&srprop=timestamp&srwhat=text&srsearch=zsh

        var input = document.getElementById("topSearchInput").value || "sorry",
            strUrl = awv.WIKIROOT_URL
            + "/index.php?title=Special:Search&search="
            + encodeURIComponent(input)
            + "&fulltext=Search&profile=default&redirs=0",
            url = new AwvUrl(strUrl, false),
            page = new WikiArticle(url);

        //console.log("input :" + input);

        page.loadUrl(false);
        awvhistory.push(url);
        currentPage = page;
      },
      /*
       * Callback for action_star (saved articles in the database)
       * @returns {undefined}
       */
      printCachedArticleList: function () {

        /* retrieve each cached page and make a list*/
        var pagesStore = database.getObjectStore("pages"),
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

            /* note that is a fake url */
            var cachedArticleList = new WikiArticle(new AwvUrl(awv.STAR_URL, false));
            cachedArticleList.setTitle("Cached articles");
            cachedArticleList.setContent(list.innerHTML, false);
            cachedArticleList.print();

            currentPage = cachedArticleList;

            ui.navbar.hide();
          }
        };
      },
      /*
       * Callback for external link
       * @param {type} e
       * @returns {undefined}
       */
      openInOSBrowser: function (e) {
        e.preventDefault();

        console.log('open url in browser: ' + e.currentTarget.href);
        // Open url in browser
        var activity = new MozActivity({name: "view", data: {type: "url", url: e.currentTarget.href}});

        activity.onerror = function () {
          console.log("I can't open this link in OS Browser : " + this.error);
        };
      },
      /*
       * Callback for link to prevent default behaviour and stop propagation
       * @param {type} e
       * @returns {undefined}
       */
      stopprop: function (e) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    /*
     * A namespace to download archwiki links contained in the current page
     * Articles are downloaded one by one to respect Archwiki server thanks 
     * to a custom event fired by a saved article.
     * @type type
     */
    var downloader = {
      data: {
        downloaderBody: document.getElementById("downloader-body"),
        links: [], // array to stock inner wiki link
        length: 0, // number of links
        idx: 0     // current link
      },
      say: function (node) {
        downloader.data.downloaderBody.appendChild(node);
      },
      /*
       * execute downloader 
       * @returns {Boolean}
       */
      confirm_form: function () {
        if (!settings.use_cache) {
          return false;
          console.log("cache is disable. I will not download anything!");
        }

        console.log("downloader launch");

        var links = document.querySelectorAll('.awv-inner-link');
        console.log(links.length + " links to download");

        downloader.data.links = [];
        downloader.data.length = 0;
        downloader.data.idx = 0;
        downloader.data.downloaderBody.innerHTML = "";

        ui.downloader.show();

        for (var i = links.length - 1; i >= 0 ; i--) {
          downloader.data.links.push(links[i].href);
        }

        downloader.data.length = downloader.data.links.length;

        uiListeners.add.confirmDownload();

        document.getElementById("dlLinks_msg").textContent =
            'Number of articles to download : ' + downloader.data.length;

        document.getElementById("dlLinks_confirm").classList.remove("hidden");
      },
      /*
       * cancel button callback (confirm download dialog box)
       * @param {type} e
       * @returns {undefined}
       */
      cancel: function (e) {
        e.preventDefault();
        document.getElementById("dlLinks_confirm").classList.add("hidden");

        uiListeners.remove.confirmDownloader();

        downloader.data.links = [];
        downloader.data.length = 0;
        downloader.data.idx = 0;

        ui.downloader.hide();
      },
      /*
       * Download button callback (confirm download dialog box)
       * @param {type} e
       * @returns {undefined}
       */
      start: function (e) {
        e.preventDefault();

        document.getElementById("dlLinks_confirm").classList.add("hidden");
        uiListeners.remove.confirmDownloader();
        var nbToDl = downloader.data.length;
        if (nbToDl > 0) {
          /* add download/saved event (we do not want to overload arch server
           * by sending 50 request at the same time)
           */
          document.addEventListener("awvSaved", downloader.getNext, false);

          /* prepare the document*/
          var p = document.createElement("p"),
              ol = document.createElement("ol");

          if (nbToDl === 1) {
            p.textContent = 'One page to download/update :';

          } else {
            p.textContent = downloader.data.length + ' pages to download/update :';

          }

          ol.id = "downloadList";

          downloader.say(p);
          downloader.say(ol);

          /* launch the loop */
          downloader.getNext();
        }
      },
      /*
       * callback function to the 'awvSaved' eventListener define in main() 
       * If everythings is fine and save, the function will dispatch a new 
       * 'awvSaved' event. 
       * @param {type} e
       * @returns {undefined}
       */
      getNext: function () {
        // console.log("handle awvSaved event");

        if (downloader.data.idx < downloader.data.length) {
          var idx = downloader.data.idx,
              href = downloader.data.links[idx];

          console.log("Downloading links " + (idx + 1)
              + '/' + downloader.data.length + ' : '
              + downloader.data.links[idx]);

          /* give some information */
          var li = document.createElement("li"),
              str = formatter.title.fromUrl(href);

          li.textContent = formatter.title.commonFilter(str);
          document.getElementById("downloadList").appendChild(li);
          li.scrollIntoView(false);

          /* load target link*/
          var page = new WikiArticle(new AwvUrl(href, true));

          page.needPrint = false; // <- the secret property to avoid display
          page.loadArticle(settings["use_cache"]);

          downloader.data.idx += 1;

        } else {
          console.log("finish to download link. removing 'awvSaved' event listener");

          /* reset everything execpt the body of the downloader section */
          downloader.data.links = [];
          downloader.data.length = 0;
          downloader.data.idx = 0;
          document.removeEventListener("awvSaved", downloader.getNext, false);


          /* add an end message */
          var p = document.createElement("p");
          p.textContent = 'It seems to be finished. Enjoy reading now!';
          downloader.say(p);
        }
      }
    };


    /* ----------------------------------------
     * Helper function ()
     * ------------------------------------------*/



    /* ----------------------------------------
     * Initialisation :
     * - add event listener to the ui
     * - open the database
     * ------------------------------------------*/
    console.log("initialisation start");

    uiListeners.init();
    database.init();

    console.log("initialisation end (some steps may not have been completed yet)");

  })();

});