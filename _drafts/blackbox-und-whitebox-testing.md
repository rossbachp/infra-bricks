---
layout: post
title: "Blackbox- und Whitebox-Testing"
modified: 2014-05-15 15:56:44 +0200
tags: [draft, serverspec,infrataster,andreasschmidt,testing ]
category: tech
image:
  feature:
  credit:
  creditlink:
comments:
share:
---

Für Infrastrukturtest bieten sich verschiedene Verfahren an. Aus der Softwareentwicklung
sind [**Blackbox**](http://de.wikipedia.org/wiki/Black-Box-Test) - und
[**Whitebox**](http://de.wikipedia.org/wiki/White-Box-Test)-Tests bekannt.
Bei der ersten Variante wird das, was man testen möchte ausschließlich von
außen (als Black Box) betrachtet, und das Verhalten der Komponenten wird über
seine Schnittstellen gegenüber einer Spezifikation bewertet.

## Whitebox ...

Bei Whitebox-Tests fließen Detailinformationen der zu testenden
Komponente ein, d.h. man muss also in die Komponente hereinschauen können, um
den Test durchzuführen.

In den letzten Posts über [serverspec](www.serverspec.org) haben wir uns
mit Whitebox-Testing beschäftigt. Hier beschreiben wir in einer Spezifikation
den Detailaufbau eines Servers, und serverspec prüft für uns diese Dinge ab.
Dazu muss serverspec natürlich in/auf den Server schauen.

Wenn der Server beispielsweise einen Webservice bereitstellt, können wir mit serverspec prüfen,
- ob die Pakete für Middleware und Applikation installiert sind,
- ob die Applikation ihre Konfigurationsdateien besitzt,
- und diese korrekt sind,
- ob der Service startet und einen Netzwerkport belegt,
- und vieles mehr.

Damit ist nur leider nicht gesagt, dass der Webservice auch wie gewünscht
funktioniert. Mit dem Whitebox-Test haben wir alle Grundlagen abgeprüft, die
überhaupt erst einmal notwendig sind.

Man könnte im nächsten Schritt mit einem Tool wie curl oder wget innerhalb
des Servers einen HTTP-Call absetzen und das Ergebnis prüfen. Die Funktionsfähigkeit
kann aber immer noch scheitern, etwa weil die Netzwerkkonfiguration nicht stimmt
oder iptables den Zugriff verhindert.

## ... und Blackbox

Das wiederum lässt sich mit einem Test von außen abprüfen. Wenn ein anderer
Server den Service abfragt und ein korrektes Ergebnis erhält, kann man eigentlich
sicher sein, dass alles korrekt ist.

Da serverspec erweiterbar ist, lassen sich prinzipiell auch Blackbox-Tests
durchführen. Ein einfaches - wenn auch unschönes - Beispiel nutzt das Kommandozeilentool
`curl` um einen HTTP-Call zu platzieren und Daten aus der Ausgabe zu prüfen:

```ruby
describe command 'curl http://appserver:8080/test' do
  it { should return_exit_status 0 }
  its(:content) { should match /^success$/ }
end
```

Das funktioniert, wandelt aber den deklarativen Ansatz von serverspec in einen
imperativen um: Wir beschreiben nicht eine Webresource, sondern konstruieren ein
`command`, um sie abzufragen. Vor allem wenn beim curl-Aufruf Parameter übergeben werden, vielleicht
noch über HTTP POST, wird der Einzeiler länger und unschöner.

## Geschmacksprobe: Infrataster

Glücklicherweise gibt es ein Projekt, das den Blackbox-Ansatz in rspec-Art und
Weise umsetzt, [Infrataster](https://github.com/ryotarai/infrataster). Dies ist
eine Erweiterung auf rspec, die verschiedene Typen einführt um Calls abzusetzen
und das Ergebnis abzuprüfen. Dabei werden Webcrawler-Frameworks aus der Ruby-Welt
eingesetzt um trotzdem bei einer lesbaren Testspezifikation bleiben zu können.

Das sieht dann beispielsweise so aus:

```ruby
describe server(:app) do
	describe http('http://appserver:8080/') do
		it "responds content including 'success'" do
			expect(response.body).to include('success')
		end
	end
end
```

Hier wird im äußeren describe-Blcok der zu testenden Server angegeben (`:app`, s.u.),
im inneren Block die Ressource (`appserver:8080`), und die Expectations, z.B.
bezüglich der Rückgabe.

Infrataster kann dabei die Rückgabe auch detaillierter prüfen, etwa ob
bestimmte Response-Header gesetzt sind, hier, ob der `Content-Type` `text/html` entspricht:

```ruby
		it "responds as 'text/html'" do
			expect(response.headers['content-type']).to match(%r{^text/html})
		end
```

Außerdem kann man bei Konstruktion des Calls auch Parameter mitgeben, z.B.

```ruby
	describe http(
    		'http://appserver:8080/foo/app',
    		method:   :get,
    		params:   {'foo'   => 'bar'},
    		headers:  {'USER'  => 'VALUE'}
  	) do
    ...
    ...
```

Damit lassen sich Webservices auch von außen gut testen. Weitere Post zeigen,
wie Infrataster aufgebaut ist, und wie man damit einen Testcase aufsetzt.

## Beides zusammen, FTW!  

Weder Blackbox- noch Whitebox-Tests sind für sich genommen ausreichend. Wenn
innerhalb der Komponente alles in Ordnung ist (Whitebox) heisst das nicht
automatisch, dass ihr Verhalten nach außen wie gewünscht funktioniert.

Umgekehrt kann man aus einem fehlschlagenden Blackbox-Test noch nicht ermitteln,
woran es eigentlich scheitert, d.h. der Fehler ist erkennbar, aber nicht
lokalisierbar.

Um Infrastrukturkomponenten qualitativ testen zu können, sind sowohl White-
als auch Blackbox-Tests sehr sinnvoll. Hier ist die Kombination von
serverspec und Infrataster äußerst wirksam und empfehlenswert! Interessanterweise
kann man beide Tools für beide Verfahren einsetzen:
- mit serverspec kann man Blackbox-Tests antriggern
- Infrataster kann auch per SSH-Kommandos ausführen und damit Whitebox-Tests durchführen.
Beide Werkzeuge haben aber definitiv ihre Stärken im jeweils eigenen Bereich: Den
für den sie entwickelt wurden.

--
Andreas
