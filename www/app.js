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
    var currentPage = null, // "article" which is diplayed ()
        myhistory = null; // array of "MyUrl" used to manage history

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
      setDefault: function () {
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
        console.log('refresh cache page periode (ms): ' + settings["refresh_cache_period"]);
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
      saveAll: function () {
        settings.save("use_cache");
        settings.save("refresh_cache_period");
      },
      init: {
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
     * 
     * properties are : href, anchor and raw;
     */
    function MyUrl(str) {
      //console.log("new MyUrl Instance");

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

        /* format str to minimized loaded content */
        this.href = formatter.url.toRender(str);

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
     * Formatter
     * ------------------------------------------*/
    var formatter = {
      url: {
        toRender: function (str) {
          /* format str to minimized loaded content */
          var str2replace = awv.WIKIROOT_URL + "/index.php/",
              str2inject = awv.WIKIROOT_URL + "/index.php?action=render&title=";

          if (str.indexOf(str2replace) === 0) {
            str = str.replace(str2replace, str2inject);
          } else if (str.indexOf(str2inject) === 0) {
            // nothing
          } else { // search case
            str = encodeURI(str);
          }

          var anchor_idx = str.indexOf("#");
          if (anchor_idx > 1) {
            str = str.slice(0, anchor_idx);
          }
          
          //console.log(str);
          return str;
        }

      },
      title: {
        fromUrl: function (str) {
          var title = decodeURI(str),
              ugly_url_part = awv.WIKIROOT_URL + "/index.php?action=render&title=",
              ugly_url_part3 = awv.WIKIROOT_URL + "/index.php/",
              ugly_url_part2 = awv.WIKIROOT_URL + "/index.php?search=";

          // who told I did'nt read "how to loop on an array in JS"?!
          if (title.startsWith(awv.URL)) {
            title = "ArchWiki Viewer";
          } else if (title.indexOf(ugly_url_part) >= 0) {
            title = decodeURI(title.replace(ugly_url_part, ""));

          } else if (title.indexOf(ugly_url_part2) >= 0) {
            title = decodeURI(title.replace(ugly_url_part2, ""));

          } else if (title.indexOf(ugly_url_part3) >= 0) {
            title = decodeURI(title.replace(ugly_url_part3, ""));

          }
          return title;
        },
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
        displayFilter: function (title) {
          if (title.startsWith("Category:")) {
            title = title.replace("Category:", "");
          }
          return title;
        }

      },
      page: {
        /* 
         * reformat "related articles" part (if any
         * @param {type} mainDiv
         * @returns {unresolved}
         */
        relatedArticle: function (mainDiv) {

          var fec = mainDiv.firstElementChild,
              relatedStyle = "float:right; clear:right; width:25%; margin: 0 0 0.5em 0.5em;";

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
            var imgRoot = awv.ROOT;

            for (var i = 0; i < img.length; i++) {
              if (img[i].src.startsWith(imgRoot + "/images/")) {
                var src = img[i].src;
                //console.log(src);
                console.log("update image src");
                if (src.indexOf("Tango-") >= 0) {
                  img[i].src = src.replace(/.*Tango-/g, imgRoot + "/images/tango/File:Tango-");
                } else {
                  img[i].src = img[i].src.replace(imgRoot, "https://wiki.archlinux.org");
                }
                //console.log(img[i].src);
              }
            }
          }
          return mainDiv;
        }

      }
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
      if (typeof myUrl !== 'undefined' && !title) {
        title = formatter.title.fromUrl(myUrl.href);
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
     * Content 
     * ------------------------------------------*/

    /*
     * Content constructor
     * @param {type} content
     * @returns {app_L12.Content}
     */
    function Content(content, reformat) {
      //console.log("new Content instance");

      if (typeof reformat === 'undefined') {
        reformat = true;
      }

      this.body = content;

      if (reformat) {
        this.reformat();
      }
    }

    Content.prototype = {
      reformat: function () {
        /* create a div node */
        var mainDiv = document.createElement("div");
        mainDiv.innerHTML = this.body;

        mainDiv = formatter.page.relatedArticle(mainDiv);
        mainDiv = formatter.page.inset(mainDiv);
        mainDiv = formatter.page.imageSrc(mainDiv);

        this.body = mainDiv.innerHTML;
      },
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
        var awart = document.createElement("article"),
            awart_content = document.createElement("div");

        awart.id = "aw-article";
        awart.className = "aw-article fade-out";

        awart_content.id = "aw-article-body";
        awart_content.className = "aw-article-body";
        awart_content.innerHTML = this.body;

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
        } else if (this.url.href === awv.URL) {
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
        ui.progressbar.show();

        var self = this,
            request = database.getObjectStore("pages").get(self.url.href);

        request.onsuccess = function (e) {
          var cache = e.target.result;

          if (cache) {
            console.log("I know that url " + cache.url);

            if (self.date - cache.date < settings["refresh_cache_period"]) {

              self.setTitle(cache.title);
              self.setContent(cache.body, false);
              self.print();
              ui.progressbar.hide();

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
        ui.progressbar.show();

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
          ui.progressbar.hide();
        };

        xhr.onload = function () {
          console.log("load success");
          self.setTitle(xhr.responseXML.title, self.url);

          var resp = xhr.responseXML.getElementById("mw-content-text") || xhr.responseXML.body;

          if (!resp) {
            log.error("empty response");
            return;
          }

          self.setContent(resp.innerHTML, true);
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
      setContent: function (str, reformat) {
        this.content = new Content(str, reformat);
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
        var pagesStore = database.getObjectStore(["pages"], "readwrite");
        var localCache = pagesStore.get(this.url.href);

        localCache.onsuccess = function (e) {
          var cachedPage = e.target.result;
          if (cachedPage) { // page exists : 
            /* update cached data */
            cachedPage.body = data.body; // dom cannot be clone so we stock innerhtml
            cachedPage.title = data.title;
            cachedPage.date = data.date;

            /*update the database */
            var reqUpdate = pagesStore.put(cachedPage);

            reqUpdate.onerror = function () {
              console.log("update cached page error");
            };

            reqUpdate.onsuccess = function () {
              console.log("page cached update");
            };
          } else { // page does not exist
            /*write it to the database */
            var req = pagesStore.add(data);

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
      },
      /*
       * 
       */
      progressbar: {
        hide: function () {
          document.getElementById("progressBar").style.display = "";
        },
        show: function () {
          document.getElementById("progressBar").style.display = "block";
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
            var page = new WikiArticle(new MyUrl(awv.URL));
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

            } else if (a.href.startsWith(awv.URL + '#')) {
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

              page.loadArticle(settings["use_cache"]);
              currentPage = page;
            }
          }, false);

          btReload.addEventListener('click', function () {
            console.log("reload");
            currentPage.loadUrl(true);
          }, false);

          btStar.addEventListener('click', function () {
            console.log("star");
            wiki.printCachedArticleList();
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
            settings.setUseCache(e.target.checked);

            settings.save("use_cache");
          }, false);


          /* confirm dialog*/
          document.getElementById("cleardb_cancel").addEventListener('click', function (e) {
            document.location.href = "#cacheSettings";
          }, false);

          document.getElementById("cleardb_ok").addEventListener('click', function (e) {
            database.clearObjectStore("pages");
          }, false);


          /* Change refresh cache */
          document.getElementById("refresh_cache_period").addEventListener('change', function () {
            settings.setRefreshCachePeriod(this.value);
            settings.save("refresh_cache_period");
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

        page.loadArticle(settings["use_cache"]);
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

          var cachedArticleList = new WikiArticle(new MyUrl(awv.URL));
          cachedArticleList.setTitle("Cached articles");
          cachedArticleList.setContent(list.innerHTML, false);
          cachedArticleList.print();

          ui.navbar.hide();
        }
      };
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
      var activity = new MozActivity({name: "view", data: {type: "url", url: e.currentTarget.href}});

      activity.onerror = function () {
        console.log("I can't open this link in OS Browser : " + this.error);
      };
    }

    /*
     * 
     * @param {type} e
     * @returns {undefined}
     */
    function stopprop(e) {
      e.preventDefault();
      e.stopPropagation();
    }

 

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
          console.log("Why didn't you allow my web app to use IndexedDB?!");
        };

        request.onsuccess = function () {
          console.log("indexeddb is opened!");
          database.db = this.result;

          database.db.onerror = function (e) {
            console.log("Database error: " + e.target.errorCode);
          };

          /* start by (updating) caching the home page*/
          currentPage = new WikiArticle(new MyUrl(awv.URL));
          currentPage.setContent(document.getElementById("aw-article-body").innerHTML, false);
          currentPage.toDb();

          myhistory = new MyHistory();
          myhistory.push(currentPage.url);

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
            // nothing there right now
          } else {
            var pageStore = db.createObjectStore("pages", {keyPath: "url"});
            pageStore.createIndex("title", "title", {unique: false});
            pageStore.createIndex("date", "date", {unique: false});

            // Use transaction oncomplete to make sure the pageStore creation is 
            // finished before adding data into it.
            pageStore.transaction.oncomplete = function () {
              console.log("creating object transaction complete");
            };
          }

          if (db.objectStoreNames[1] === "settings") {
            // nothing there right now
          } else {
            var settingsStore = db.createObjectStore("settings", {keyPath: "name"});

            settingsStore.transaction.oncomplete = function () {
              console.log("creating object 2 transaction complete");
              settings.setDefault();
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
     * Helper function ()
     * ------------------------------------------*/

    var awv = {
      ROOT: document.location.protocol + "//" + document.location.host,
      URL: document.location.protocol + "//" + document.location.host + "/index.html",
      RELATIVE_ROOT: "./index.html",
      WIKIROOT_URL: "https://wiki.archlinux.org"
    };


    /* ----------------------------------------
     * First add event listener (Initialisation)
     * ------------------------------------------*/
    console.log("initialisation script start");

    uiListeners.init();
    database.init();

    console.log("initialisation script end (some steps may not have been completed yet)");
  })();
});