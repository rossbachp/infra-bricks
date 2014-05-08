---
layout: post
title: "Erste Schritte mit serverspec - standalone"
modified: 2014-05-07 15:37:46 +0200
tags: [serverspec,code,andreasschmidt]
category: tech
links:
  - serverspec: http://serverspec.org/
image:
  feature:
  credit:
  creditlink:
comments:
share:
---

Nachdem wir im letzten Post allgemein vorgestellt haben, was man mit [serverspec](http://serverspec.org/)
machen kann, wollen wir die ersten Beispiele in eine ausführbare Form bringen,
sodass man damit weiter experimentieren kann.

## Voraussetzungen

Um den Post nicht zu groß aufzubauen und nicht zu viele Abhängigkeiten einzuführen,
benötigen wir nur eine Serverinstanz, auf der wir lokal testen. Das kann eine
VM oder auch das eigene Notebook sein. Auch wenn serverspec mit vielen Betriebssystemen
umgehen kann, sind Debian- oder Redhat-Distros zum Spielen am einfachsten.
Die Beispiele gehen von CentOS-6.5 mit englischem Locale aus.

Es läuft einfacher, wenn die Instanz auf Repos im Internet zugreifen kann, es
geht aber auch offline bzw. mit lokalen Mirrors. Das ist durchaus hilfreich in
Umgebungen, in denen nicht jeder Server Zugriff nach außen hat und auch (noch)
keine lokalen Mirros aufgesetzt sind.

Eine weitere Voraussetzung ist eine lauffähige Ruby- und rubygems-Installation ab Version 1.8.7.
Diese wird in der Regel von den Linux-Distributionen in den eigenen Paketrepositories
mitgeliefert. Also:

```bash
$ sudo yum install -y ruby rubygems
```

oder bei Debian

```bash
$ sudo apt-get install ruby1.9.3 rubygems
```


## Installation von serverspec

### Online

Natürlich ist die online-Installation am einfachsten. serverspec liegt als gem-Paket
bei rubygems.org vor, und darüber werden abhängige Pakete erkannt und mit installiert.

```bash
$ sudo gem install serverspec rake --no-ri --no-rdoc
Successfully installed net-ssh-2.9.0
Successfully installed rspec-core-2.14.8
Successfully installed diff-lcs-1.2.5
Successfully installed rspec-expectations-2.14.5
Successfully installed rspec-mocks-2.14.6
Successfully installed rspec-2.14.1
Successfully installed highline-1.6.21
Successfully installed specinfra-1.11.0
Successfully installed serverspec-1.6.0
Successfully installed rake-10.3.1
10 gems installed
```

Was machen die Pakete:

* ```diff-lcs``` findet Unterschiede bspw. in Arrays
* ```net-ssh``` ist eine Ruby-Library zum SSH-Connect zu anderen Hosts
* ```rspec-*``` sind alle Pakete für RSpec (www.rspec.info)
* ```highline``` für etwas Farbe im Kommandozeilenleben
* ```specinfra``` ist das Serverspec-Backend mit einer Abstraktion für verschiedene Betriebssysteme mit deren Kommandos.
* ```serverspec``` das eigentliche Serverspec-Frontend, das wir benutzen wollen.

### Offline

Die Offlineinstallation ist auch kein Problem, dazu ziehen wir uns die notwendigen
Pakete von rubygems und kopieren sie auf die Serverinstanz. Wer mag, setzt sich
eine eigenen rubygems-Mirrorserver auf.

```bash
$ for i in diff-lcs-1.2.5 net-ssh-2.9.0 highline-1.6.21 bundler-1.6.2 rake-10.3.1 rspec-core-2.14.8 rspec-expectations-2.14.5 rspec-mocks-2.14.6 rspec-2.14.1 specinfra-1.11.0 serverspec-1.6.0; do
  wget http://rubygems.org/downloads/${i}.gem
done;
```

Dann lokal installieren:

```bash
$ sudo gem install --local --no-ri --no-rdoc rake-10.3.1.gem bundler-1.6.2.gem diff-lcs-1.2.5.gem rspec-core-2.14.8.gem rspec-expectations-2.14.5.gem rspec-mocks-2.14.6.gem rspec-2.14.1.gem net-ssh-2.9.0.gem highline-1.6.21.gem specinfra-1.11.0.gem serverspec-1.6.0.gem
Successfully installed rake-10.3.1
Successfully installed bundler-1.6.2
Successfully installed diff-lcs-1.2.5
Successfully installed rspec-core-2.14.8
Successfully installed rspec-expectations-2.14.5
Successfully installed rspec-mocks-2.14.6
Successfully installed rspec-2.14.1
Successfully installed net-ssh-2.9.0
Successfully installed highline-1.6.21
Successfully installed specinfra-1.11.0
Successfully installed serverspec-1.6.0
11 gems installed
```

## Init!

Um mit den eigenen Specs loszulegen, bringt serverspec ein Skript ```serverspec-init```
mit, um eine Art Vorlage zu generieren, die erstmal lauffähig ist. Das rufen wir
in einem leeren Verzeichnis auf, und beantworten einige Fragen:

```bash
$ mkdir myspecs
$ cd myspecs
$ serverspec-init
```

Hier müssen wir entscheiden, wo die zu testende Instanz liegt. Entweder greift
serverspec per ```ssh``` darauf zu, oder man testet die eigene Instanz (```local```).
Das wollen wir in unserem Fall auch tun, für Unix:

```bash
$ serverspec-init
Select OS type:

  1) UN*X
  2) Windows

Select number: 1

Select a backend type:

  1) SSH
  2) Exec (local)

Select number: 2
```


## Die leere Vorlage

Serverspec hat das folgende für uns erzeugt:

```
 + spec/
 + spec/localhost/
 + spec/localhost/httpd_spec.rb
 + spec/spec_helper.rb
 + Rakefile
```

Wofür braucht man was?

### *_spec.rb

Das sind die eigentlichen Spezifikationsfiles, wo die Tests lagern. Bei der
Zusammenstellung ist man frei: Ein _spec.rb für hunderte Tests (nicht sinnvoll)
oder für jeden Tests ein eigenes _spec.rb (auch nicht sinnvoll). In den nächsten
Posts werden wir hierfür eine sinnvolle Struktur aufzubauen.

### Rakefile

Rake ist quasi das "make" für ruby. Es automatisiert Vorgänge und dient uns
hier als "Glue", um die rspec-basierten Tests anzustarten. Man könnte auch
rspec direkt ausführen, allerdings biegt das für uns generierte Rakefile
einige Dinge für die Ausführung richtig.
In der Standardversion werden einfach alle Dateien im spec/ Unterverzeichnis
(und den darunter liegenden Verzeichnissen) aufgegriffen, die auf _spec.rb
enden.

### spec_helper.rb

Der Spec-Helper wird von den Testcases verwendet ("require") und schafft einige
Voraussetzungen. Interessant sind z.B. das Erkennen von Betriebssystemen
(``` include .... DetectOS```) sowie (falls noch notwendig) das abfragen eines
Passworts für sudo.

### http_spec.rb

Die leere Vorlage ist gar nicht so leer, sie enthält nämlich ein Beispiel
für einen funktionierenden Webserver, die wir einfach verwenden werden.
Geprüft wird:

- dass ein OS-Paket installiert wurde (hier: httpd, passt auf RHEL),
- dass der Service automatisch gestartet wird und aktuell läuft,
- dass ein Port geöffnet ist und
-  dass eine Konfigurationsdatei mit bestimmten Inhalte vorliegt.

Das sieht dann so aus:

```ruby
require 'spec_helper'

describe package('httpd') do
  it { should be_installed }
end

describe service('httpd') do
  it { should be_enabled  }
  it { should be_running  }
end

describe port(80) do
  it { should be_listening }
end

describe file('/etc/httpd/conf/httpd.conf') do
  it { should be_file }
  it { should contain "ServerName localhost" }
end
```

Die Syntax ist sehr einfach und fast natürlichsprachlich. Es besteht aus mehreren
Blöcken, die bestimmte Aspekte (package, service, port, file) beschreiben. In
den Blöcken liegen dann Match-Ausdrücke, die bestimmte Konditionen abprüfen

## Erster Testrun

Wir lassen "die spec" einfach mal laufen und schauen, was passiert:

```bash
$ sudo rake spec
Failures:

  1) Package "httpd" should be installed
     Failure/Error: it { should be_installed }
       rpm -q httpd
       package httpd is not installed
       expected Package "httpd" to be installed
     # ./spec/localhost/httpd_spec.rb:4

  2) Service "httpd" should be enabled
  ....

  ....

Finished in 0.05863 seconds
6 examples, 6 failures

Failed examples:

rspec ./spec/localhost/httpd_spec.rb:4 # Package "httpd" should be installed
rspec ./spec/localhost/httpd_spec.rb:8 # Service "httpd" should be enabled
rspec ./spec/localhost/httpd_spec.rb:9 # Service "httpd" should be running
rspec ./spec/localhost/httpd_spec.rb:13 # Port "80" should be listening
rspec ./spec/localhost/httpd_spec.rb:17 # File "/etc/httpd/conf/httpd.conf" should be file
rspec ./spec/localhost/httpd_spec.rb:18 # File "/etc/httpd/conf/httpd.conf" content should match /ServerName localhost/
/usr/bin/ruby -S rspec spec/localhost/httpd_spec.rb failed
```

Wir sehen, dass eigentlich alles fehlschlägt. Klar, denn noch haben wir nichts
installiert bzw. provisioniert.

## Red, Green, Refactor

Gemäß dem Testdriven-Zyklus sind wir jetzt im "Red" angelangt. Wir haben einen
Testcase, der einen Zielzustand beschreibt. Unsere Infrastruktur-
Tests schlagen fehl, also machen wir uns daran, diese grün zu bekommen.

**Disclaimer**: Natürlich wählt man hierzu am besten ein Provisionierungswerkzeug,
also Salt, Chef, Puppet, ... Um den Post einfach zu halten werden wir hier manuell
installieren, das Umformen (z.B. ein Provisioner für Vagrant) bleibt
dann für den "Refactor"-Schritt :-)

Das erste ist die Installation des Pakets.

```bash
$ sudo yum install -y httpd
```

Wir lassen die spec noch einmal laufen und sehen:

```bash
$ sudo rake spec
...
...
Finished in 0.0678 seconds
6 examples, 4 failures

Failed examples:

rspec ./spec/localhost/httpd_spec.rb:8 # Service "httpd" should be enabled
rspec ./spec/localhost/httpd_spec.rb:9 # Service "httpd" should be running
rspec ./spec/localhost/httpd_spec.rb:13 # Port "80" should be listening
rspec ./spec/localhost/httpd_spec.rb:18 # File "/etc/httpd/conf/httpd.conf" content should match /ServerName localhost/
/usr/bin/ruby -S rspec spec/localhost/httpd_spec.rb failed
```

Oben hatten wir noch 6 Failures, jetzt nur noch 4. Es wird. Als nächstes sollte
httpd.conf konfiguriert werden. Wir fügen dort `localhost` ein:

```
$ sudo vi /etc/httpd/conf/httpd.conf
....
ServerName localhost:80
...
```

Ein erneuter Test:

```
$ sudo rake spec
6 examples, 3 failures

Failed examples:

rspec ./spec/localhost/httpd_spec.rb:8 # Service "httpd" should be enabled
rspec ./spec/localhost/httpd_spec.rb:9 # Service "httpd" should be running
rspec ./spec/localhost/httpd_spec.rb:13 # Port "80" should be listening
```

Nur noch 3 Failures. Als nächstes sollte der Service laufen und automatisch gestartet sein:

```
$ sudo chkconfig --add httpd
$ sudo chkconfig --level 345 httpd on
$ sudo service httpd start
```


Und so ist das Endresultat:

```bash
$ sudo rake spec
/usr/bin/ruby -S rspec spec/localhost/httpd_spec.rb
......

Finished in 0.05298 seconds
6 examples, 0 failures
```


Damit sind wir "green".

## What's next?

Jetzt können wir unsere Tests spezifizieren und auf einem konkreten Server ausführen.
Mit dieser Basis können wir spielen und neue Tests einbauen. Eine gute Übersicht dessen
was möglich ist, gibt die Seite [Resource Types](http://serverspec.org/resource_types.html)

In einer etwas realistischeren Arbeitsumgebung
wird es aber viele Server geben, die sich in Gruppen einteilen lassen (Webserver,
  Applikationsserver, ...).
Und vermutlich haben wir mehrere Umgebungen (Test, Live, ...), die sich in
Teilen unterscheiden.

All das lässt sich auch mit serverspec abdecken, die nächsten Posts zeigen, wie :-)

--
Andreas
