---
layout: post
title: "Docker Container mit serverspec testen - Teil 2"
modified: 2015-03-30 10:12:30 +0200
tags: [draft, docker, testing, serverspec, andreasschmidt, peterrossbach ]
category: docker
links:
  - serverspec: http://serverspec.org/
keywords:
  - testing
  - docker
  - serverspec
---

Vor einiger Zeit hatten wir in einem Post gezeigt, welche Möglichkeiten existieren, um [Container mit Serverspec zu testen](http://www.infrabricks.de/blog/2014/09/10/docker-container-mit-serverspec-testen).
Zu diesem Zeitpunkt waren die Möglichkeiten im Großen und Ganzen in Ordnung, aber sicherlich nicht
einfach zu handhaben. Nur durch eigene Erweiterungen von serverspec mit einem experimentellem nsenter-Backend war das Testen von Docker-Container sinnvoll möglich.

Seitdem hat sich im Projekt Serverspec einiges getan. Zum einen gibt es nun *Resource Types* für Docker-Container und -Images. Damit lassen sich auf einem Docker-Host die Eigenschaften von lokal liegenden Images und laufenden Containern prüfen. Zum anderen wurde das Docker-Backend so erweitert, dass auch über den API-Call von `docker exec`
Prüfkommandos in einem laufenden Container mit ausgeführt werden können. Zeit, sich das Ganze im Detail anzuschauen.

![Serverspec-Kommandos über docker-exec ausführen]({{ site.BASE_PATH }}/assets/images/docker_serverspec_docker-exec.png)

# Resource Types

Bei *Resource Types* handelt es sich um die Zielobjekte, die man in einem `describe`-Block beschreibt. So sind z.B. die
bekannten `file`, `process`, `port` usw. Resource Types. Es gibt zwei Typen, die Docker-Objekte beschreiben, beide
beziehen ihre Daten aus dem API-Call zu `docker inspect`. D.h. alles was ein `inspect`-Aufruf an Metadaten liefert, kann
auch mit serverspec abgefragt werden.

## docker_image

Bei Images ist natürlich erstmal interessant, dass es lokal vorliegt, um gestartet werden zu können. Meistens kommt
ein Image aus einer Registry, ggf. hat man aber auch andere Lieferwege - z.B. aus der eigenen Buildchain per Tarball auf
die Zielmaschine - implementiert. Das kann man testen:

**Gemfile**

```ruby
source 'https://rubygems.org'
ruby '2.1.5'

gem 'serverspec', '~> 2'
gem 'docker-api'
```

**.rspec**

```
--color
--format documentation
```

**spec/localhost/fedora_21_spec.rb**

```ruby
require 'serverspec'

set :backend, :exec

describe docker_image 'fedora:21' do
  it { should exist }
end
```

```bash
$ bundle install --path vendor
$ bundle exec rspec --pattern spec/localhost/\*_spec.rb

Docker image "fedora:21"
 should exist

Finished in 0.13116 seconds (files took 0.34526 seconds to load)
1 example, 0 failures

```

Wenn gerade kein Ruby auf dem eigenen Rechner installiert ist, kann dies
natürlich auch im Container erledigt werden. Damit die Docker *Resource Types* funktionieren, muss eine Docker-CLI und funktionierender Docker Host installiere sein.

```bash
$ docker run -v $(pwd):$(pwd) \
 -v /var/run/docker.sock:/var/run/docker.sock \
 -v /usr/local/bin/docker:/usr/local/bin/docker \
 --workdir=$(pwd) -ti --rm ruby:2.1.5 \
  /bin/bash -c "bundle install --path vendor ; bundle exec rspec --pattern spec/localhost/fedora_21_spec.rb"
```

Um an die `inspect`-Daten heranzukommen, gibt es zwei Alternativen, hier am Beispiel der Systemarchitektur. Entweder
verwendet man den `inspection`-Matcher, der eine komplette Map zurückliefert, aus der Teile testet. Oder man gibt
den zu testenden Schlüssel als Parameter mit und prüft das Ergebnis. Beide Alternativen sind sinnvoll, so kann man
z.B. bei der zweiten Variante auch mit regulären Ausdrücken testen.

```ruby
describe docker_image 'fedora:21' do
  its(:inspection) { should_not include 'Architecture' => 'i386' }
  its(['Architecture']) { should eq 'amd64' }
end
```

```bash
$ bundle exec rspec
(...)
Docker image "fedora:21"
  inspection
    should not include {"Architecture" => "i386"}
  ["Architecture"]
    should eq "amd64"
(...)
```

Welche Eigenschaften sind an einem Docker-Image interessant, was kann sinnvoll getestet werden?

* Ein Maintainer sollte gesetzt sein, z.B. kann man dort einen Schlüssel einbauen, der anzeigt, dass dieses Image aus der eigenen Build-Chain stammt, und nicht von extern kommt.
* Good Practise für ist es, einen ENTRYPOINT zu verwenden, um Nutzung und einzuschränken und Falsch-Nutzung zu vermeiden.
* Für Service-Container sollten bestimmte Ports exposed werden.
* Bestimmte Environment-Parameter müssen vorhanden sein, sonst funktionieren Skripte oder Konfigurationen nicht.

Zum Beispiel hier ein Demo-Dockerfile:

```bash
FROM fedora:21
MAINTAINER My Private Build Chain

ENV MYAPP_VERSION 47.11

EXPOSE 80

ENTRYPOINT ["/bin/entrypoint"]
```

Gebaut:

```bash
$ docker build -t testimage .
(...)
Successfully built aeb232471f6f

$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED              VIRTUAL SIZE
testimage           latest              aeb232471f6f        54 seconds ago       241.3 MB
```

Mit einer passenden Spec ist die Überprüfung schnell implementiert:

```ruby
describe docker_image 'testimage' do
  it { should exist }
  its(['Author']) { should eq 'My Private Build Chain' }
  its(['Entrypoint']) { should_not eq '' }
  its(['Entrypoint']) { should_not eq '/bin/entrypoint' }
  its(['Config.Env']) { should include /MYAPP_VERSION=47\.11/ }
  its(['Config.ExposedPorts']) { should include /80\/tcp/ }
  its(['Config.ExposedPorts']) { should_not include /22\/tcp/ }
end
```

Ergibt:

```bash
$ bundle exec rspec --pattern spec/localhost/\*_spec.rb

Docker image "testimage"
  should exist
  ["Author"]
    should eq "My Private Build Chain"
  ["Entrypoint"]
    should not eq ""
  ["Entrypoint"]
    should not eq "/bin/entrypoint"
  ["Config.Env"]
    should include /MYAPP_VERSION=47\.11/
  ["Config.ExposedPorts"]
    should include /80\/tcp/
  ["Config.ExposedPorts"]
    should not include /22\/tcp/

Finished in 0.12227 seconds (files took 0.35186 seconds to load)
7 examples, 0 failures
```

Es ist also sehr einfach bestimmte Qualitätsnormen der Docker-Images zu überprüfen. Manche Dinge sollen unbedingt enthalten sein, und andere Einstellungen, z.B. einen offenen SSH-Port, sind ehr unerwünscht.

## docker_container

Dasselbe gibt es natürlich auch für Container. Hier wird es interessanter, weil wir in der Lage sind, Laufzeitaspekte
zu berücksichtigen. Das fängt mit einem laufenden Container an:

```ruby
describe docker_container 'testcontainer' do
  it { should exist }
  it { should be_running }
end

```

Ohne einen Container mit dem Namen gestartet zu haben, läuft die Spec in zwei Fehler. Also kann die Spec mit dem folgenden Befehl erfüllt werden:

```bash
$ docker run -tdi --name testcontainer fedora:21 /bin/bash
$ bundle exec rspec --pattern spec/localhost/\*_spec.rb

Docker container "testcontainer"
 should exist
 should be running

Finished in 0.13791 seconds (files took 0.39023 seconds to load)
2 examples, 0 failures
```

Mit den gleichen Inspection-Ausdrücken können nun Container Checks implementiert werden. Serverspec unterstützt noch einen weiteren Ausdruck `have_volume` für die Prüfung von Volumes:

```ruby
describe docker_container 'testcontainer' do
  it { should have_volume('/mnt', '/tmp') }
end
```

Ausgeführt:

```bash
$ docker run -tdi --name testcontainer -v /tmp:/mnt fedora:21 /bin/bash
$ bundle exec rspec --pattern spec/localhost/\*_spec.rb

Docker container "testcontainer"
  should have volume "/mnt", "/tmp"

Finished in 0.10888 seconds (files took 0.35251 seconds to load)
1 example, 0 failures

```

## Einer nach dem anderen...

Ein Nachteil dieser Resource Types liegt darin, das nur ein Image oder Container auf einmal geprüft werden kann. In einer Teststufe der _Build chain_ ist das in Ordnung, weil in der Regel nur ein Image oder Container gebaut wird. In Produktions- oder Staging-Systemen besteht ggf. der Wunsch, alle Container eines bestimmten Typs auf einmal
zu prüfen: z.B. "Alle Container, die `web*` heissen, sollen nur Port 443 exposen und nicht privilegiert ablaufen."

Das ist in der Form nicht mit den aktuellen *Resource Types* von Serverspec möglich. Eine alternative Variante ist in
[Containerspec](https://github.com/de-wiring/containerspec) implementiert. Dort wird cucumber an Stelle von
rspec verwendet, um in der Gherkin-Syntax Prüffälle zu formulieren.

Damit lassen sich mehrere Images bzw. Container auf einmal prüfen:

```
Scenario: NGINX Container
  When there is a running container named like 'nginx.*'
  Then it should run on image 'nginx:1.7.8'
  And containers should not expose port '80'
  And containers should expose port '443' on host port '8443'
  And container volume '/etc/nginx/sites-enabled' should be mounted
  And container volume '/var/log/nginx' should not be mounted
```

Der Ausdruck "When there is a running container..." selektiert alle laufenden Container mit bestimmten Eigenschaften, hier z.B. einen Container-Namen der auf "nginx.*" matcht.
Ein [ausführlicheres Beispiel](https://github.com/de-wiring/containerspec/wiki/Specifying-and-testing-a-docker-setup) ist im Github-Wiki hinterlegt.


# Docker-Backend

Mit den obigen Resource Types ist das Docker-Setup auf dem Host spezifizierbar. Im nächsten Schritte möchten wir
aber auch gerne innerhalb von laufenden Containern Specs ausführen. Dabei hilft eine Erweiterung des Docker-Backends.
Es kennt zwei Modi:

* Wenn `docker_image` gesetzt ist, wird ein Image geprüft. Das hatten wir im [Blog-Post](http://www.infrabricks.de/blog/2014/09/10/docker-container-mit-serverspec-testen/) schon beschrieben.
* Wenn `docker_container` gesetzt ist, wird ein laufender Container geprüft. Dazu werden die Befehle mit `docker exec` in den Container gebeamt und ausgeführt.

Hier ein Beispiel, um Container zu testen. Wir möchten den Namen des Containers als Environmentvariable mitgeben, also
brauchen wir einen angepassten `spec_helper.rb`. Damit das Docker-Backend läuft, müssen vorher noch abhängige Pakete installiert werden (s. Gemfile).


```bash
$ bundle exec serverspec-init
Select number: 1
Select number: 2

 + spec/
 + spec/localhost/
 + spec/localhost/sample_spec.rb
 + spec/spec_helper.rb
 + Rakefile
 + .rspec
```

Der Spec-Helper sieht dann so aus:

```ruby
[root@localhost ~]# cat spec/spec_helper.rb
require 'serverspec'

set :backend, :docker

set :docker_container, ENV['TARGET']
```

Damit können wir beim `rake spec`-Aufruf ein `TARGET=xyz` vorstellen und so den Containernamen (oder ID) mitgeben, der wir testen möchten.

Als Beispiel nehmen wir den laufenden Fedora21-Testcontainer von oben, mit einer Demo-Spec:

```ruby
# cat spec/localhost/sample_spec.rb
require 'spec_helper'

describe package('httpd') do
  it { should be_installed }
end
```

```bash
$ TARGET=testcontainer rake spec
(...)
Package "httpd"
  should be installed (FAILED - 1)

Failures:

  1) Package "httpd" should be installed
     On host `localhost'
     Failure/Error: it { should be_installed }
       expected Package "httpd" to be installed

     # ./spec/localhost/sample_spec.rb:4:in block (2 levels) in <top (required)>'`

Finished in 0.34612 seconds (files took 0.29735 seconds to load)
1 example, 1 failure
```

Klar, das Paket httpd ist noch nicht installiert. Wir holen es nach:

```bash
$ docker attach testcontainer
bash-4.3# yum install -y httpd
(...)
Complete!
bash-4.3# <CTRL-P> + <CTRL-Q>
```

Damit läuft die Spec durch:

```bash
$ TARGET=testcontainer bundle exec rspec --pattern spec/localhost/\*_spec.rb

Package "httpd"
  should be installed

Finished in 0.50143 seconds (files took 0.5923 seconds to load)
1 example, 0 failures
```

Nachteilig ist und bleibt, dass die für die Tests notwendigen Binaries im Container vorhanden sein müssen. Das trifft
mittlerweile selbst bei Distributionen nur noch teilweise zu. Ein *fedora:21* hat erstmal kein `netstat`, so kann `port` nicht geprüft werden. Ein *debian:wheezy* kennt kein `ps`, usw. Für die White-Box-Testbarkeit sollten also diese Tools nachinstalliert werden.

Schwierig wird es, wenn das Image statisch gelinkte Binaries als Applikationen beinhaltet (z.B. aus der Go-Welt), und
auf ein "klassisches" Linux-Userland verzichtet. Dann müssen die Tools ggf. als Volume mit eingemountet werden, um den Container testbar zu machen.

# Fazit

Das Thema Testing und Docker wird langsam rund :) Wir haben ausreichend Möglichkeiten, einen Docker-Host durchzutesten, und mit dem erweiterten Docker-Backend von Serverspec nun auch die laufenden Container. D.h. einer Test-Driven Infrastructure mit Docker steht nun nichts mehr im Weg.

Buildchains führen seit einger Zeit automatisierte Tests mit dem Applikationcode aus. Viele Unternehmen, die Konfigurationsmanagement-Tools einsetzen lassen in Buildchains diesen Code ebenfalls Unit-testen.

Beim Einsatz von Docker kommt Buildchains eine neue Aufgabe zu: Sie _produzieren_ nicht mehr nur Anwendungscode, sie produzieren Infrastrukturen. Und diese Infrastruktur-Artefakte lassen sich genau so gut testen, wie die Anwendung selbst.

Viel Spaß beim Ausprobieren wünschen:

Andreas und Peter
