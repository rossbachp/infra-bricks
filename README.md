# Tempomat: Infrastruktur mit Qualität fortentwickeln und betreiben

Wir müssen das Thema der Qualität in der Infrastrukturentwicklung neu definieren.
Die Komplexität und Vielfalt nimmt täglich zu. Als Reaktion darauf müssen wir in der Adminstration und der Entwicklung
konsequenter automatisieren. Immer mehr wird deutlich, dass uns alle das Thema "Infrastruktur als Code" etwas angeht.
Eine neue komplexe Herausforderungen wird uns da beschert. 

In diesem Blog beginnen wir nun die testgetriebene Vorgehensweise auch für die Entwicklung der Infrastruktur zu adaptieren. Hierbei versuchen wir bestehende Techniken, Werkzeuge und Vorgehensweise vorzustellen.

## Setup
- Start von Intellij und import des Projekts (RubySDK installed)
- Öffnen eines Terminals
- jekyll serve --watch --drafts
- Öffnen eines Browser unter Adresse http://localhost:4000
- Editiren der blog post
- Reload des browser zeigt die Änderungen
- Bei Änderungen der _config.yml oder später der Inhalte des Verzeichnis _data ist ein Reload des webbrick Servers notwendig!

### Erzeugen einer neuer Post
    rake new_post
### Erzeugen einer neuen Seite
    rake new_page
### Testumgebung starten
    rake

### Themen für weitere Posts
- Warum dieser Blog
- Architektur von Serverspec (Zusammenspiel mit Rspec und serverinfra)
- Beispiel serverspec und vagrant
- Verschiedene Beispiele serverspec
    - Auswertung von Andreas Beispielen
- Arbeitsweisen
    - Deployment Pipeline
    - Welche Schritte sind in welchen Reihenfolgen und Tools zu machen?
    - Bewertung
- Provisinierung und Test
    - Chef Kitchen
    - Cucumber
- Eigene Betriebssystemen mit Virtualbox erstellen und testen
    - Vagrant
    - Veewee
    - Packer?
    - Virtualbox native
    - Kickstart
- Entwickler und die Infrastruktur
- Deployment Pipeline
            
### ToDo
- Name für den Blog finden
- Überlegen ob man ein eigens gitrepo und eine eigene Domain nutzt.
- Logo, favicon.ico
    - _includes/header.html
    - assets/ico
        Neue Bilder!!
- Verbesserung des Mobile Support
    - Kleiner Schrift
    - Verbesserung der Navigation
    - Logos      
- Integration Google Analytics
    - neue Tracking ID vergeben
    - Auswertung testen und lernen
- neue Seite 404.html
- Integration disqus
- sidebar.html - Fix! s assets/js/app.js
    Welche Sozialen Netze wollen wir?
    xing, linkedin, twitter, github
    Avatar Link ändern-- Logo? Bild
    Liste von Autoren
    Zusammenhang mit Css contact-list
        Mobile?
- Rake
   - Support von erstellen von drafts und freigabe
   - Veröffentlichung steuern
       aktuellö merge from master to lh-pages
- Verbesserung des "Responsive layout"
    - Sofortige Selektion der Tag oder Kategorie
    - Verrignerung des Platzbedarfs für Mobiles von Tag und Kategorie
    - Weniger Header ist bei Phones mehr
- Aktuallisierung von Bootstrap
- Ist das wirklich unser Font?: Glyphicon and Font-Awesome Icons.
- Liste von Büchern
- Categorie erfinden
       News
       Konferenz slides
       Datenformate für Links und Bücher.
           Referenz Seite.
           
### Links
- Blog Software Jekyll [Jekyll](http://jekyllrb.com/)
- Dieser Blog basiert auf dem Theme von [JekyllThemeDbykll](http://dbtek.github.io/dbyll/)
- Information zur markdown syntax [Markdown](http://daringfireball.net/projects/markdown/syntax#precode)
- Setup eines Jekyll blog [JekyllIntro](http://jekyllbootstrap.com/lessons/jekyll-introduction.html)
- Google Meta Tagging [GoogleMetaTagging](https://support.google.com/webmasters/answer/79812?hl=de)
- Jekyll bootstrap site generator [Jekyllbootstrap](http://jekyllbootstrap.com/)

#### Infos
* http://blog.crowdint.com/2010/08/02/instant-blog-using-jekyll-and-heroku.html
* https://github.com/ejholmes/vagrant-heroku
* https://github.com/bry4n/rack-jekyll
* http://jekyllthemes.org/
* https://github.com/jamesallardice/jslint-error-explanations

#### Link List ServerSpec

* http://serverspec.org
* http://de.slideshare.net/m_richardson/serverspec-and-sensu-testing-and-monitoring-collide
* http://de.slideshare.net/aschmidt75/testing-server-infrastructure-with-serverspec

### Copyright
* logo http://commons.wikimedia.org/wiki/File:Kontrollleuchte_Geschwindigkeitsregelanlage.svg

### License

- [MIT](http://opensource.org/licenses/MIT)

