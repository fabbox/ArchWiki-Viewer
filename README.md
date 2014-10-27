ArchWiki Viewer for FirefoxOS
=============================

Description
-----------

A simple viewer for the [wiki of Arch Linux](https://wiki.archlinux.org) adapted
to mobile device runnning [Firefox OS](https://developer.mozilla.org/en-US/Firefox_OS).
(clone of [ArchWiki Viewer](https://github.com/jtmcn/archwiki-viewer) for Android).
Viewed content is cached to enable offline consultation.

Permissions
-----------

    * systemXHR : Cross-domain requests needed to get html file from https://wiki.archlinux.org to the app.

Change log
----------

### 0.1.0 :
    * add indexedDB to cached content (offline surfing is possible if the page was already consult).
    * you can refresh the cache by pushing the reload button in the navigation menu.
    * improve error handling.
    * improve "responsive designess" in css (thanks to [Building Blocks](http://buildingfirefoxos.com)).
    * navigation history is no more reset by pushing the app home button.

### 0.0.2 :
    * fix missing stylesheet in zip archive.

Disclaimer
----------

This project isn't approved, sponsored, or affiliated with Arch Linux(TM) or its related project.


Licenses
--------

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


Icons are based on [gaia-icons](https://github.com/gaia-components/gaia-icons)
(which seems to be under Apache 2 License ?).


The Arch Linux name and logo are recognized [trademarks](https://wiki.archlinux.org/index.php/DeveloperWiki:TrademarkPolicy")
 owned by Aaron Griffin (hereinafter the "Arch Linux Project Lead") and Judd Vinet.
Some rights reserved.


The [wiki content](https://wiki.archlinux.org/index.php/ArchWiki:Privacy_policy) 
is available under GNU Free Documentation License 1.3.

The content is provided "as is" without warranty of any kind, either expressed or 
implied, including, but not limited to, the implied warranties of correctness and 
relevance to a particular subject. The entire risk as to the quality and accuracy 
of the content is with you. Should the content prove substandard, you assume the
cost of all necessary servicing, repair, or correction. 

