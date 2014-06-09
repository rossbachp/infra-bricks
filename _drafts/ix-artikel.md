---
layout: post
title: "ix_Artikel"
modified: 2014-06-04 13:23:14 +0200
tags: [draft, testing,serverspec,vagrant ]
category: article
image:
  feature:
  credit:
  creditlink:
comments:
share:
---

# Ziele
- zeigen, was serverspec ist, was es kann und wofür es gut ist
- zeigen, wie die Kombination von Vagrant und serverspec in einer CD-Umgebung qualitativ hochwertige, reproduzierbare Ergebnisse sicherstellt.
  - Wollen wir dafür einen Jenkins integration testen?

# Titel
- "Gebaut wie bestellt - Testgetriebene Infrastruktur"

## Teaser

Testgetriebene Vorgehen gehören in der Softwareentwicklung seit Jahren zum Standard, gleiches ist nun auch im Infrastrukturbereich sinnvoll. Der Artikel stellt eine entsprechende Arbeitsweise mit Serverspec vor. Wer das Thema DevOps ernst nimmt, muss die Qualität einbauen und mit Sorgfalt vorgehen.

## Aufbau

Motivation/Problemstellung
- Ergebnisartefakte in Continuous Delivery Chains sind in der Regel Pakete, manchmal auch schon ablauffähige virtuelle Maschinen oder Docker Container.
- Während in der Softwareentwicklung die testgetriebene Vorgehensweise schon seit Jahren einen festen Platz eingenommen hat, wird im Betriebsbereich nur selten auf Infrastrukturebene getestet. Wenn überhaupt werden einige wenige Healthchecks umgesetzt und zentral überwacht.
- Moderne Werkezuge können die Testbarkeit von Servern, virtuellen Maschinen und ganzen Umgebungen sicherstellen. Wenn jeder Schritt schon in der Entwicklung der Infrastruktur gepüft wird, dann können Qualität und Sicherheit gesteigert werden.
- Durch die Testspezifikation entsteht eine von Menschen und Maschinen lesbare Beschreibung einer IT-Umgebung. Die Ausführbarkeit hilf es schnell und zuverlässig Fehler einzugrenzen und die Veränderungen mit allen Aspekten wiederholt zu überprüfen.

### Serverspec
- serverspec.org
- Ist ein Werkzeug, um Serverinfrastruktur zu beschreiben und automatisiert testen zu können.
- Es adressiert vor allem betriebssystemnahe Aspekte: Dateien und Verzeichnisse,
  Rechte, Nutzer, installierte Pakete, Services, Netzwerkeinstellungen.
- Es ist in der Lage, verschiedenste Betriebssystem von Solaris über Linux bis zu Windows anzusteuern.
- Es baut auf dem bekannten TDD-Werkzeug rspec auf und erweitert es durch Resource Types und Matchers.
- Beispiel:

```ruby
  describe file "/etc/ssl/mykey.crt" do
    it { should be_file }
    it { should be_mode         '644' }
    it { should be_owned_by     'root' }
    it { should be_grouped_into 'root' }
  end
```

- Beispiel für diesen Artikel: Einen Apache-Webserver in einer virtuellen Maschine mit seinen Eigenschaften spezifizieren, aufbauen und testen.
- Bild des Beispiel-Setup

### Vagrant-Setup
  - vagrant installieren, VM aufbauen
  - serverspec installieren
- $ serverspec-init
  - legt ein leeres Demoskelett für einen Webserver an
- Red, Green, Refactor: Testzyklus ist auch für Infrastrukturchanges möglich.
- Testausführung -> (rot)
- Provisionierung über Vagrant
- Testausführung -> (grün)
- Weitere Anwendungsgebiete und weiterführende Aspekte
- Beispiele für serverspec mit kurzen Codeblöcken geben:
  - Prüfen von Netzwerkinterfaces
  - Erreichbarkeit von Hosts
  - Spezifikation von Nutzern und Gruppen
  - Testen von Dateiberechtigungen
- Ggf: Blackbox und Whitebox-Tests
  - Serverspec ist ein Beispiel für Whitebox-Testing. Das garantiert aber noch nicht ihre Fehlerfreiheit. Als Gegenstück zum Blackbox-Test ist Infrataster ein passendes Werkzeug (für Onlinequellen, ggf. kurzes Beispiel)

## Fazit
- Serverspec stellt eine gute Möglichkeit dar, die eigene Serverlandschaft zu spezifizieren und testbar zu machen.
- Es kann bei der Fehlersuche, bei Abnahmen und Audits sowie zur Unterstützung von Security-Tests eingesetzt werden.
- Zusammen mit Vagrant erhalten auch Entwickler die Möglichkeit, die zukünftige Ablaufumgebungen der eigenen Software in Zusammenarbeit mit dem Betrieb zu gestalten und deren Testbarkeit zu gewährleisten.

==
Diagramme: 1-2
Listings: ca. 7-8
Referenzen: www.serverspec.org
