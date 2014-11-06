ArchWiki Viewer for FirefoxOS
=============================

Description
-----------

A simple viewer for the [wiki of Arch Linux](https://wiki.archlinux.org)
adapted to mobile device runnning [Firefox
OS](https://developer.mozilla.org/en-US/Firefox_OS).  (clone of [ArchWiki
Viewer](https://github.com/jtmcn/archwiki-viewer) for Android).

Viewed content is cached (by default) to enable offline reading. Options are
provide to see all the cached pages and to periodically check if an update version
of the current article is available. User can disable these features.

Permissions
-----------

* systemXHR : Cross-domain requests needed to get html file from
  https://wiki.archlinux.org to the app.

Change log
----------

### 0.2.0 :

* navigation bar is now at bottom to a better accessibility.
* adding a settings menu to manage cache options
* access to cache page index (star icon in navigation bar).
* possibility to enable/disable cache.
* possibility to clear the cache.
* check for update after a certain time (parameters are in settings).
* fix multiple homepage in history
* adding html5 transition (not always smooth)

### 0.1.0 :

* add indexedDB to cache content (so offline surfing is possible if the page has been loaded).
* you can refresh the cache by pushing the reload button in the navigation menu.
* improve error handling.
* improve "responsive designess" in css (thanks to [Building Blocks](http://buildingfirefoxos.com)).
* navigation history is no more reset by pushing the app home button.

### 0.0.2 :

* fix missing stylesheet in zip archive.


Privacy Policy
--------------

This application saves the pages you have requested thanks to this application
on https://wiki.archlinux.org in an indexedDB.
It also records the url, the download date and the "timestamp" of each page.
This 4 data enables to provide you an offline accessibility
and an up to date content. You can disable the use of this caching feature in
the setting menu of the application and clear your cached data as well.
You can see all the cached pages by pushing the "star" icon (if the cache is
clear, you will only see the homepage).

To provide you these options, the application also saves your settings in the
database.

Obviously, no content of this database is transmitted (except the url during an
update of a page).

To prevent security issue, an effort was made to disable login possibility.
Please report bug to fbox.dev@gmail.com.

Disclaimer
----------

This project isn't approved, sponsored, or affiliated with Arch Linux(tm) or
its related project.


Licenses
--------

### ArchWiki Viewer for firefox OS

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see [http://www.gnu.org/licenses/](http://www.gnu.org/licenses/).

### Icons
Icons, with the exception of the logo, are based on
[gaia-icons](https://github.com/gaia-components/gaia-icons) (which is probably
under Apache2 ?).

The logo of this application use the ArchLinux logo with the permission of Arch
Linux Project Lead.

### Archlinux

The Arch Linux name and logo are recognized
[trademarks](https://wiki.archlinux.org/index.php/DeveloperWiki:TrademarkPolicy")
 owned by Aaron Griffin (hereinafter the "Arch Linux Project Lead") and Judd Vinet.
Some rights reserved.


### wiki.archlinux.org
The [wiki content](https://wiki.archlinux.org/index.php/ArchWiki:Privacy_policy) 
is available under GNU Free Documentation License 1.3.

The content is provided "as is" without warranty of any kind, either expressed or 
implied, including, but not limited to, the implied warranties of correctness and 
relevance to a particular subject. The entire risk as to the quality and accuracy 
of the content is with you. Should the content prove substandard, you assume the
cost of all necessary servicing, repair, or correction.

