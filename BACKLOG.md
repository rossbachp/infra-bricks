# Tempomat: Infrastruktur mit Qualität fortentwickeln und betreiben

## Themen für weitere Artikel
- (O AS,PR) Warum dieser Blog
- (S,P PR) Beispiel serverspec und vagrant
- (M PR) Arbeitsweisen
    - Deployment Pipeline
    - Welche Schritte sind in welchen Reihenfolgen und Tools zu machen?
    - Bewertung
- (P PR) Provisinierung und Test
    - Chef Kitchen
    - Cucumber
- (P PR) Eigene Betriebssystemen mit Virtualbox erstellen und testen
    - Vagrant
    - Veewee
    - Packer?
    - Virtualbox native
    - Kickstart
- (M PR) Entwickler und die Infrastruktur
- (M PR) Deployment Pipeline
- (Sec PR) Erzeuge ein Beispiel mit server_spec um die Anforderung an die Sicherheit eines Tomcats prüfbar zu machen
   [Tomcat 8 Security](http://tomcat.apache.org/tomcat-8.0-doc/security-howto.html)
- (M AS) Spezifikation von Infrastruktur-Schichten (Infrastruktur, Applikation, Security)
  - Mit serverspec lassen sich sehr viele Aspekte eines Applikationsstacks
    spezifizieren und testen. Es lohnt sich allerdings, nicht alle Aspekte "in einen
    Topf" zu werfen, sondern nach Anwendungsfall bzw. -schicht zu unterscheiden.
  - Warum das sinnvoll ist und wie das beispielhaft geht zeigt der Blogeintrag.
- (C AS,PR) Architektur von serverspec
  - Serverspec wurde von seinen Erbauern modular in einen Fronten- und Backendbereich
    refactored. 
  - Wir zeigen, welche Aufgaben diese Bereiche haben und wie sie zusammenarbeiten 
- (S AS) Testgetriebene Infrastruktur - nur etwas für Startups?
  - Test driven infrastructure operiert mit neuen Werkzeugen aus verschiedenen Bereichen.
  - Startups haben die wenigsten Berührungsängste, neue Technologien auszuprobieren. 
  - Dabei ist testgetriebene Infrastruktur auch für Unternehmen interessant. Erst recht
    steht in regulierten Bereichen wie Banken und Behörden-IT die Testbarkeit und 
    Fähigkeit zur Auditierung im Vordergrund
  - Der Blogartikel zeigt, für welche Unternehmensstrukturen eine testgetriebene
    Arbeitsweise und die SPezifikation von IT-Infrastruktur sinnvoll sein kann. 
- (C AS) Eigene Resource Types entwickeln am Beispiel Zertifikate
  - Serverspec erlaubt es, eigene Ressourcentypen zu entwickeln, um angepasste
    Spezifikationsfälle umzusetzen.
  - Durch die Trennung in SpecInfra und Serverspec-Frontend ist es allerdings nicht
    immer ganz klar, wo welche Teile einzubauen sind.
  - Der Blogartikel zeigt, wie ein neuer Resource Type 'sslcertificate' entsteht. Danach
    ist man in der Lage, die Inhalte von SSL-Zertifikaten zu spezifizieren und zu testen.
- (Str AS,PR) Spezifikation vs. Monitoring
  - Ein oft gehörter Einwand gegen Infrastruktur-Spezifikation lautet, dass es quasi
    identisch mit dem Thema Monitoring sei.
  - Wir zeigen, wo die Unterschiede liegen
- (C AS,PR) Funktionstest mit Resource type 'web_resource'
  - Im Monitoringbereich ist es weit verbreitet, Statusressourcen mit wget oder curl
    abzufragen und auszuwerten.
  - Ein Resourcetype für serverspec ist ebenfalls leicht umzusetzen.
- (Sec AS) Sicherheitstest mit Resource type 'secure_ssl_resource'
  - Serverspec lässt sich sehr gut zu Überprüfen von Sicherheitseinstellungen verwenden.
  - Ein neuer Resource Type zeigt, wie man die SSL-Sicherheit von Webservern testen kann.
- (Sec AS,PR) Umsetzung der NSA Security Guides in serverspec
  - In der Securityszene bekannt sind die Hardening Guides der NSA für verschiedene
    Betriebssysteme.
  - Sie lassen sich gut in serverspec umsetzen, um die Sicherheit der eigenen
    Infrastruktur zu erhöhen.
  - [NSA_RHEL_5_GUIDE](http://www.nsa.gov/ia/_files/os/redhat/NSA_RHEL_5_GUIDE_v4.2.pdf)  
- (M AS) Modellgetriebene Verbindungstests spezifizieren und testen
- (S AS) Serverspec: Blackbox vs. Whitebox Spezifikation und -testing
  - Serverspec lääst sich auf vielfältige Arten einsetzen, und relativ schnell kommt man
    in die Situation, einen Blackbox-Test zu bauen, der Abhängigkeiten ausweist, die man
    gar nicht haben wollte. Der Blogartikel zeigt die Unterschiede und Best Practises.
- (P PR) Container mit Docker
  - Atomic: http://www.projectatomic.io/
  - Docker: https://www.docker.io/
  - geard: http://openshift.github.io/geard/
  - Wie kann man dafür ein Infrastruktur aufbauen und Test einfliesen lassen?
  - Schaffen eines Ausfallsicheren Repository
     - Basis OpenStack Glance
     - Welchen Storagen nutze ich
  - Schaffen einer stabilen Package Basis für die Bereitstellung der Container   
- (P PR) Nutzung von CoreOS
  - CoreOS: https://coreos.com/
  - Pain Point CoreOS: http://michael.stapelberg.de/Artikel/coreos_and_docker_first_steps
     - Haben wir dafür ein Lösung
      
### Legende

Artikelkennzeichnung

|Kategorie|Erklärung      |
|---------|:--------------|
|C        |               |
|M        | model         |
|P        | provision     |
|O        | other         |
|S        | serverspec    |
|Sec      | security      |
|Str      |               |

Autoren

|Kürzel|Autor               |
|------|:-------------------|
|PR    | Peter Rossbach     |
|AS    | Andreas Schmidt    |

## ToDo
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
- Erzeugen eines Link Import Format für Browser Bookmarks
    http://msdn.microsoft.com/en-us/library/aa753582%28v=vs.85%29.aspx
    https://www.npmjs.org/package/netscape-bookmarks
    Vielleicht erzeugen wir dann eine Datei mit den Bookmarks.
    Die Tags können wir dann als Folder Strukturen benutzen.
    Sollen wir auch Hierachische Tags dort erlauben?
    Links kommen dann unter unterschiedlichen "SubFoldern" vor.
    Wir könnten eine Add Date erzeugen und ein Date Pflegen wann wir die Seite für eien Blog Artikel
    das Letzen mal besucht haben....
    Wenn der Link vorkommt wird das Datum auf den des letzten Blog Artikel gesetzt.
- Referenzieren in einem Blog Artikel auf unsere Bookmark Datenbank.
    Angabe der Links in einem Blog, für zu einem Erzeugen eines Eintrags in der Link Datenbank!
    Erzeugen einer Liste von Links unterhalb des Artikels. 
    
