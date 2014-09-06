---
layout: post
title: "Docker-Container mit Serverspec testen"
modified: 2014-09-06 20:03:56 +0200
tags: [draft, docker, tech, serverspec, andreasschmidt ]
category: Docker
links:
- http://supervisord.org/: Supervisor, a process control system.
keywords:
---

Nachdem wir vor einiger Zeit [Serverspec](www.serverspec.org) in [Posts](http://www.infrabricks.de/tags.html)
vorgestellt haben, brauchen wir jetzt natürlich auch noch eine sinnvolle Verbindung
zu Docker. Die Frage ist also, wie kann man innerhalb von Containern eine
Spezifikation prüfen?

Dazu gibt es (natürlich ...) mehrere Möglichkeiten.

## SSH

Die aus Serverspec-Sicht einfachste Art besteht darin, den Container als
Zielhost anzugeben, mit dem sich Serverspec dann regulär per SSH verbinden kann.
Für serverspec macht es keinen Unterschied, ob es sich um echte Hardware, eine
VM oder einen Container handelt.

Das wiederum führt aber zu größeren Umbauarbeiten im Container, da man nun neben
dem eigentlichen Service, den man laufen lassen möchte, noch einen SSH-Daemon
benötigt. Es gibt dazu Möglichkeiten, z.B. mit [Supervisor.d](http://supervisord.org/).

Letzen Endes muss man an der Stelle aber eigentlich die Grundlagen-Entscheidung
treffen, wie der eigene Container ausgestaltet sein soll: Als Microservice,
ausschließlich mit dem Zielprozess, oder als VM-Ersatz (mit mehreren Services,
dann z.B. auch dem sshd).

**Fazit**: Falls die Antwort "VM-Ersatz" lautet, stellt der SSH-Zugang für Serverspec die
einfachste Möglichkeit dar. Falls der Microservice-Ansatz geplant ist, müssen
wir uns andere Zugangsmöglichkeiten anschauen.

## Zur Build-Zeit

Man kann den Serverspec-Aufruf natürlich auch zur Build-Zeit in das Dockerfile
platzieren. Dabei lassen sich die Spezifikationsfiles per "ADD"-Befehl einsetzen,
über "RUN" wird serverspec dann ausgeführt und schreibt das Ergebnis in eine
Datei, zur späteren Einsicht. Die Spezifikationsfiles und die Ergebnisdatei
dürfen auch auf einem Volume liegen, um das ganze z.B. von außen steuern zu
können.

Am Beispiel:

```bash
$ mkdir serverspec-docker-test
$ cd serverspec-docker-test
$ mkdir spec.d
$ cd spec.d
$ serverspec --init

$ serverspec-init
Select OS type:

  1) UN*X
  2) Windows

Select number: 1

Select a backend type:

  1) SSH
  2) Exec (local)

Select number: 2

 + spec/
 + spec/localhost/
 + spec/localhost/httpd_spec.rb
 + spec/spec_helper.rb
 + Rakefile

$ vim Dockerfile
```

Hier setzen wir ein:

```
FROM ubuntu:14.04

RUN sudo apt-get -yqq update

RUN sudo apt-get -yqq install ruby1.9.3

RUN sudo gem install rake -v '10.3.2' --no-ri --no-rdoc
RUN sudo gem install rspec -v '2.99.0' --no-ri --no-rdoc
RUN sudo gem install specinfra -v '1.21.0' --no-ri --no-rdoc
RUN sudo gem install serverspec -v '1.10.0' --no-ri --no-rdoc

ADD ./spec.d /opt/spec.d

RUN ( cd /opt/spec.d; rake spec )

CMD /bin/bash
```

Jetzt den Container bauen (gekürzter Auszug):

```bash
$ docker build .
Sending build context to Docker daemon 7.168 kB
Sending build context to Docker daemon
Step 0 : FROM ubuntu:14.04
 ---> c4ff7513909d
Step 1 : RUN sudo apt-get -yqq update
 ---> Running in bc2eb91c00ff
[...]
Removing intermediate container bc2eb91c00ff
Step 2 : RUN sudo apt-get -yqq install ruby1.9.3
[...]
Step 3 : RUN sudo gem install rake -v '10.3.2' --no-ri --no-rdoc
[...]
Step 4 : RUN sudo gem install rspec -v '2.99.0' --no-ri --no-rdoc
[...]
Step 5 : RUN sudo gem install specinfra -v '1.21.0' --no-ri --no-rdoc
[...]
Step 6 : RUN sudo gem install serverspec -v '1.10.0' --no-ri --no-rdoc
[...]
Step 7 : ADD ./spec.d /opt/spec.d
[...]
Step 8 : RUN ( cd /opt/spec.d; rake spec )
 ---> Running in 1f880efa0c71
/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb
dpkg-query: no packages found matching httpd
FFhttpd: unrecognized service
FFFF

Failures:

  1) Package "httpd" should be installed
     On host ``
     Failure/Error: it { should be_installed }
       dpkg-query -f '${Status

[...]

Finished in 0.32489 seconds
6 examples, 6 failures

[...]

/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb failed
2014/09/06 18:35:10 The command [/bin/sh -c ( cd /opt/spec.d; rake spec )] returned a non-zero code: 1
```

Natürlich schlägt das Beispiel fehl, da der Container kein httpd enthält (Das
ist die Demo-Spezifikation von serverspec-init). Aber man sieht den Aufruf.

Vorteile:
* Man muss nichts an serverspec ändern, außer es im Container zu installieren.
* Es passt zum Ablauf in Build-Chains: Beim Bau des Containers wird eine Spezifikation
geprüft. Das Ergebnis kann von außen nachgeschaut werden, bei Failures stoppt die
Build-Chain.
* Bei aufeinander aufbauenden Images (z.B. FROM my-tomcat-image:latest) kann
man den darunterliegenden Containerinhalt prüfen, wenn man sich nicht darauf
verlassen möchte.

Nachteile:
* Man muss serverspec (und Abhängigkeiten, inkl. ruby) im Container installieren.
* Man kann nur statische Aspekte der Betriebssystem-Installation prüfen (z.B.
Files, Verzeichnisstrukturen, Pakete, Kernel-Settings).
* Dynamische Aspekte des Service (z.B. läuft der Service, horcht der Port, ...)
können nicht getestet werden, da der Zielprozess ja noch gar nicht läuft.

**Fazit**: Wem es reicht, innerhalb der Buildchain statische Aspekte seines
Containers zu prüfen, ist hiermit gut bedient.


## Mit serverspec und dem Docker-Backend

Serverspec (bzw. SpecInfra) besitzt in seiner Architektur einen "Backend"-Teil.
In diesem Backend wird unterschieden, wie die Spec-Kommandos auf dem Ziel
ausgeführt werden soll (Beispiel: SSH). Seit SpecInfra v0.4.0 gibt es ein
Docker-Backend, das wiederum auf dem `docker-api` gem aufbaut.

Es nimmt ein existierendes Image und ändert darin den "CMD"-Aufruf so ab, dass
nicht der im Image definierte Zielprozess gestartet wird, sondern der Prüfbefehl,
den serverspec gerade ausführen möchte. Der Container wird gestartet, der
Befehl ausgeführt, das Ergebnis zurückgeliefert und von Serverspec bearbeitet.

Wir probieren es aus. Als erstes installieren wir das docker-api gem, dabei
wird "mkmf" aus ruby-dev vorausgesetzt:

```bash
$ cd serverspec-docker-test

$ sudo apt-get install ruby-dev
[...]

$ sudo gem install docker-api
Building native extensions.  This could take a while...
Fetching: archive-tar-minitar-0.5.2.gem (100%)
Fetching: docker-api-1.13.2.gem (100%)
Successfully installed json-1.8.1
Successfully installed archive-tar-minitar-0.5.2
Successfully installed docker-api-1.13.2
3 gems installed
Installing ri documentation for json-1.8.1...
Installing ri documentation for archive-tar-minitar-0.5.2...
Installing ri documentation for docker-api-1.13.2...
Installing RDoc documentation for json-1.8.1...
Installing RDoc documentation for archive-tar-minitar-0.5.2...
Installing RDoc documentation for docker-api-1.13.2...
```

Dann muss Serverspec mitgeteilt werden, das statt SSH ein Docker-Container
geprüft wird, von auch, welcher Container es sein soll. Das ganze spielt sich
im File `spec_helper.rb` ab:

```ruby
require 'serverspec'

# - - - - - Docker einbauen (statt Exec-Helper)- - - - -
include SpecInfra::Helper::Docker
include SpecInfra::Helper::DetectOS

RSpec.configure do |c|
  # - - - - - Image setzen - - - - -
  c.docker_image = '9590610349ba'

  if ENV['ASK_SUDO_PASSWORD']
    require 'highline/import'
    c.sudo_password = ask("Enter sudo password: ") { |q| q.echo = false }
  else
    c.sudo_password = ENV['SUDO_PASSWORD']
  end
end
```

Und ausführen:

```bash
$ rake spec
/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb
FFFFFF

Failures:

  1) Package "httpd" should be installed
[...]  

Finished in 1 minute 13.09 seconds
6 examples, 6 failures
[...]  
```

Den ersten Unterschied den man bemerkt, ist der deutlich höhere Zeitaufwand
zum prüfen. Schließlich wird für jeden Prüfbefehl (das können mehrere je
describe-Block der Spec sein) ein neuer Container instanziiert.

Ein Nachweis gelingt indirekt über `docker ps -a`:

```bash
$ sudo docker ps -a
CONTAINER ID        IMAGE               COMMAND                CREATED             STATUS                        PORTS               NAMES
16643fab8e17        9590610349ba        "/bin/sh -c 'netstat   13 seconds ago      Exited (1) 12 seconds ago                         mad_goldstine
[...]
```

In der COMMAND-Spalte "sieht" man z.B. die Ausführen des netstat-Kommandos aus der
Spec (`port(80), it { should be_listening }``). Es handelt sich um eine bereits
abgelaufenen Container, da er nach Beendigung des Serverspec-Prüfkommandos (natürlich)
gestoppt ist.

Vorteile:
* Man muss serverspec im Container nicht installieren, es reicht die Installation
auf dem Host

Nachteile:
* Das Setzen der Container-ID im spec_helper ist in der Form unschön, d.h. man
benötigt weiteren Code um z.B. Ziel-Images abzufragen oder als Parameter entgegen
zu nehmen.
* Es lassen sich wieder nur statische Aspekte prüfen, da der eigentliche Zielprozess
nicht ausgeführt, sondern durch serverspec ersetzt wird.

**Fazit**: Schon besser, da der Container so ohne Serverspec-Overhead auskommt.
Aber es lässt sich immer noch kein laufender Service prüfen.

## nsenter

Die nächste Stufe besteht darin, in einen laufenden Container reinzuschauen und
dabei die Spec auszuführen. Hierbei hilft [nsenter](http://man7.org/linux/man-pages/man1/nsenter.1.html).

Die Installation ist im [Blogeintrag von Lukas Pustina](https://blog.codecentric.de/2014/07/vier-wege-in-den-docker-container/)
sehr schön beschrieben. nsenter liegt auch als [Docker-Container](https://github.com/jpetazzo/nsenter) von
@jpetazzo vor. Wir wählen die manuelle Installationsvariante:

```bash
$ curl --silent https://www.kernel.org/pub/linux/utils/util-linux/v2.24/util-linux-2.24.tar.gz | tar -zxf-
$ cd util-linux-2.24
$ ./configure --without-ncurses
$ make nsenter
$ sudo cp nsenter /usr/local/bin
```

Eine genaue Beschreibung von nsenter führt an der Stelle zu weit, dafür sei
auf die Blogeinträge verwiesen. In a nutshell: nsenter startet einen neuen Prozess
und setzt ihn in die Namespaces eines existierenden Containers.

Wir starten einen Container und ermitteln seine Prozess-ID:

```bash
$ docker run -tdi ubuntu:14.04
2c67dc16c6f0c1d90e53f5836b7c1de461578b63f903fd4454fafb32b02706f8

$ PID=$(docker inspect --format '{{.State.Pid}}' 2c67dc16c6f0c1d90e53f5836b7c1de461578b63f903fd4454fafb32b02706f8)
$ echo $PID
9452
```

Dann wird nsenter ausgeführt. Die Parameter stehen für die Namespaces, die
der neue Prozess "erben" soll:

```bash
$ sudo nsenter --target $PID --mount --uts --ipc --net --pid '/bin/sh'
# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 19:16 ?        00:00:00 /bin/bash
root        29     0  0 19:23 ?        00:00:00 /bin/sh
root        30    29  0 19:23 ?        00:00:00 ps -ef
```

D.h. man erhält eine Shell, die in der Prozessliste auch sichtbar ist (PID 1=Containerprozess,
PID 29=über nsenter gestartetes /bin/sh).

Nun könnte man serverspec ausführen, wenn es vorhanden wäre. Leider hat die neue Shell
den Mount-Namespace des Containers geerbt, und damit nur Zugriff auf das Dateisystem
innerhalb Containers (und serverspec liegt außerhalb).

Um dennoch etwas testen zu können, verwenden wir das gebaute Image aus dem ersten Beispiel,
in dem ruby und serverspec installiert wurde (ID bei mir 9590610349ba).

```bash
$ docker run -tdi 9590610349ba
c84aaa2adeadda9f1ea1fe080110e25b5d68b151aadbe4706ad0538208d82cc9
$ PID=$(docker inspect --format '{{.State.Pid}}' c84aaa)
$ echo $PID
9680
```

Dann kann man über nsenter einen neuen Prozess im Container starten und
serverspec ausführen:

```bash
$ sudo nsenter --target $PID --mount --uts --ipc --net --pid '/bin/bash'

root@c84aaa2adead:/# cd /opt/spec.d/

root@c84aaa2adead:/opt/spec.d# rake spec
/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb
dpkg-query: no packages found matching httpd
FFhttpd: unrecognized service
FFFF
[...]

Finished in 0.21691 seconds
6 examples, 6 failures
```

Das liefert ebenfalls Fehler, da der HTTP-Server nicht installiert ist. Da wir
die Spezifikation aber in einem laufenden Container "hineingebeamt" und
gestartet haben, können auch dynamische Aspekte des Zielservice mit abgeprüft werden.

Das ganze kann man natürlich auch abkürzen und in den nsenter Aufruf packen:

```bash
$ sudo nsenter --target $PID --mount --uts --ipc --net --pid -- /bin/bash -c 'cd /opt/spec.d && rake'
```

Vorteile:
* Dynamische Aspekte sind in der Spec nun auch prüfbar, da man sich zur Laufzeit auf
einen Container aufschalten kann.

Nachteile:
* Die Installation von nsenter wird notwendig.
* Serverspec muss im Container installiert sein.

**Fazit**: Hier ergeben sich noch nicht soviele Vorteile gegenüber der Variante mit
dem Docker-Backend in Serverspec.


## nsenter + serverspec

Jetzt bleibt noch die Möglichkeit, nsenter in serverspec (bzw. SpecInfra)
als Backend zu integrieren. Serverspec unterstützt das aktuell noch nicht, wir
probieren es als Prototyp.

```bash
$ cd
$ mkdir nsenter-proto
$ cd nsenter-proto
$ git clone https://github.com/serverspec/specinfra
Cloning into 'specinfra'...
remote: Counting objects: 5305, done.
Receiving objects: 100% (5305/5305), 628.18 KiB | 473.00 KiB/s, done.
remote: Total 5305 (delta 0), reused 0 (delta 0)
Resolving deltas: 100% (2810/2810), done.
Checking connectivity... done.
$ cd specinfra/lib/specinfra
$ vi backend.rb

.. anfügen ..
require 'specinfra/backend/nsenter'

$ vim helper/backend.rb

... den typ 'Nsenter' einfügen ...


module SpecInfra
  module Helper
    ['Exec', 'Nsenter', 'Ssh', 'Cmd', 'Docker', 'WinRM', 'ShellScript', 'Dockerfile', 'Lxc'].each do |type|

$ vim configuration.rb

... den Konfigurationsparameter nsenter_pid ans Array VALID_OPTIONS_KEYS anfügen ...

module SpecInfra
  module Configuration
    class << self
      VALID_OPTIONS_KEYS = [
        :path,
[...]
        :request_pty,
        :nsenter_pid,

# Eine Prototyp-Version von nsenter für specinfra liegt als gist vor
# https://gist.github.com/aschmidt75/bb38d971e4f47172e2de
$ curl https://gist.githubusercontent.com/aschmidt75/bb38d971e4f47172e2de/raw/350f9419159ffba282496f90232110e06b77cf69/specinfra_nsenter_prototype >backend/nsenter.rb

# das neue gem muss gebaut werden, der falsche wercker.yml link stört.
$ rm wercker.yml
$ touch wercker.yml

# Das Gem-Build kommando verlässt sich auf git ls-files, also added wir es
# im lokalen Repository

$ git add .
$ git commit -m "added nsenter"

# das wird gebaut und installiert.
$ gem build specinfra.gemspec --force
  Successfully built RubyGem
  Name: specinfra
  Version: 1.27.0
  File: specinfra-1.27.0.gem

$ sudo gem install specinfra-1.27.0.gem
Successfully installed specinfra-1.27.0
1 gem installed
Installing ri documentation for specinfra-1.27.0...
Installing RDoc documentation for specinfra-1.27.0...
```

Dazu erstellen wir eine kleine Spezifikation und starten ein Image:

```bash
$ cd
$ cd nsenter-proto
$ serverspec-init
Select OS type:

  1) UN*X
  2) Windows

Select number: 1

Select a backend type:

  1) SSH
  2) Exec (local)

Select number: 2

 + spec/
 + spec/localhost/
 + spec/localhost/httpd_spec.rb
 + spec/spec_helper.rb
 + Rakefile
 ```

 Zu testzwecken wird die Spezifikation verkleinert:

 ```bash
  $ vim spec/localhost/httpd_spec.rb

require 'spec_helper'

describe package('apache2') do
  it { should be_installed }
end
```

Ein Image wird gestartet, wir brauchen die PID:

```bash
$ docker run -tdi ubuntu:14.04
9367d023570d4670ca1d12aa431bb826a131a1dcc0b02797a90372489d7927a6
vagrant@docker-workshop:~/nsenter-proto$ docker inspect -f '{{ .State.Pid }}' 9367d0
15344
```

Der spec_helper wird auf nsenter umgestellt, und die PID (15344) wird mitgegeben:

```bash
$ vim spec/spec_helper.rb

require 'serverspec'

# - - - - - NSENTER verwenden - - - - -
include SpecInfra::Helper::Nsenter
# - - - - - nach problemen mit DetecOs
# wird hier Debian explizit gesetzt - - -
include Serverspec::Helper::Debian

RSpec.configure do |c|

  # - - - - - PID für NSENTER - - - - -
  c.nsenter_pid = 15344

  if ENV['ASK_SUDO_PASSWORD']

```

Der spannende Moment beginnt:

```bash
$ rake spec
$ rake spec
/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb
nsenter_exec! sudo dpkg-query -f '${Status}' -W apache2 | grep -E '^(install|hold) ok installed$'
F

Failures:

  1) Package "apache2" should be installed
     On host ``
     Failure/Error: it { should be_installed }
       sudo dpkg-query -f '${Status}' -W apache2 | grep -E '^(install|hold) ok installed$'
       expected Package "apache2" to be installed
     # ./spec/localhost/httpd_spec.rb:4:in `block (2 levels) in <top (required)>'

Finished in 0.02865 seconds
1 example, 1 failure
```

Der Debug-Aufruf "nsenter_exec!" zeigt, dass das neue nsenter-Backend aufgerufen
wird. Die spec liefert natürlich Fehler, weil der Apache nicht installiert ist.

Wir attachen uns in den laufenden Container und installieren es nach:

```bash
$ docker attach 9367


root@9367d023570d:/# apt-get update -yqq
root@9367d023570d:/# apt-get -yqq install apache2
Preconfiguring packages ...
[...]

[CRTL-P], [CTRL-Q] drücken, um zu detachen
```

Und die Spec erneut ausführen:

```bash
$ rake spec
/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb
nsenter_exec! sudo dpkg-query -f '${Status}' -W apache2 | grep -E '^(install|hold) ok installed$'
.

Finished in 0.05324 seconds
1 example, 0 failures
```

Vorteile:
* Wenn nsenter als Backend in Serverspec integriert wäre, könnte man so sehr einfach
laufende Container testen, d.h. mit allen statischen und dynamischen Aspekten
* serverspec muss nicht im Container installiert sein, es reicht wenn die Prüfkommandos
im Container funktionieren.

Nachteile:
* Der Aufruf von serverspec klappt nur noch als Root bzw. mit sudo-Rechte auf nsenter.
* Es wird nsenter als zusätzliches Paket auf dem Host benötigt.
* Die Integration der Prozess-PID in spec_helper erfordert noch geeignete Wrapper.

**Fazit**: Whew, what a ride. In a nutshell: Don't try this at home! Der Prototyp
hat zwar in Bezug auf Ubuntu und den Apache2-Package-Test funktioniert, er besitzt
aber noch keine Testabdeckung und deckt sicherlich nicht alle Eventualitäten ab.
Wenn nsenter als regulär installierbares Paket in die Package-Repositories der
Distributionen aufgenommen wird und Serverspec ggf. ab Version 2.X ein nsenter-backend
mitbringt, kann das ein sinnvoller Weg sein, um Container zu testen.

--
Andreas
