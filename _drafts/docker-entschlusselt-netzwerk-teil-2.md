---
layout: post
title: "Docker entschlüsselt: Netzwerk-Teil 2"
modified: 2014-06-26 15:33:08 +0200
tags: [draft, docker, network, pipework, andreasschmidt ]
category: docker
links:
  - pipework: https://github.com/jpetazzo/pipework
  - Docker Advanced Networking: https://docs.docker.com/articles/networking/
  - Software Defined Networks: http://www.sflow.org/
    Network-Playground: github.com/aschmidt75/docker-network-playground/wiki
keywords:
  - pipework
  - docker
  - network
---

Im [ersten Teil]({% post_url 2014-07-03-docker-entschlusselt-netzwerk %}) von "Docker entschlüsselt: Netzwerk" haben wir gesehen,
wie der Docker-Daemon Netzwerkinterfaces, die `docker0`-Bridge und die
Kommunikation der Container nach außen und untereinander managed.

In diesem Teil sollen nun die Grundlagen geschaffen werden, damit Docker-Container
auch über Host-Grenzen hinweg kommunizieren können. Dafür gibt es mehrere
Möglichkeiten, wir wählen diejenige, welche mit der Standardkonfiguration
des Docker-Daemon funktioniert.

# Der Plan: Neue Bridges

Ziel ist es, auf zwei virtuellen Maschinen je einen Container zu instantiieren.
Dieser Container wird mit einem neuen Netzwerkinterface versorgt, das über
eine eigene Bridge mit einem Netzwerkinterface des äußeren Containers
verbunden ist:

![docker_network_2vms.png]({{ site.BASE_PATH }}/assets/images/docker_network_2vms.png))

# Voraussetzungen

Um ein solches Setup schnell aufzusetzen, empfiehlt sich die Kombination aus
Vagrant und Virtualbox. Dazu das passende Vagrantfile für zwei VMs auf Basis Ubuntu:

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "trusty64"
  config.vm.box_url = "http://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box"

  config.vm.define "docker-test1", primary: true do |s|
	  s.vm.network "private_network", ip: "192.168.77.5"
   	s.vm.provider "virtualbox" do |vb|
 		      vb.customize [ 'modifyvm', :id, '--nicpromisc1', 'allow-all']
        	vb.gui = false
        	vb.customize [ "modifyvm", :id, "--memory", "512"]
        	vb.customize [ "modifyvm", :id, "--cpus", "1"]
     	end
  end

  config.vm.define "docker-test2", primary: true do |s|
	  s.vm.network "private_network", ip: "192.168.77.6"
   	s.vm.provider "virtualbox" do |vb|
		     vb.customize [ 'modifyvm', :id, '--nicpromisc1', 'allow-all']
        	vb.gui = false
        	vb.customize [ "modifyvm", :id, "--memory", "512"]
        	vb.customize [ "modifyvm", :id, "--cpus", "1"]
     	end
  end
end
```

  - `Wollen wir hier nicht noch einen HashKey für das Virtualbox-Image hinterlegen?`
  - `Geht das unter boot2Docker tiny Linux auch?`


Das besondere liegt in der Definition eines zusätzlichen Netzwerkinterfaces
`eth1`, dass im weiteren in den Promisc-Mode geschaltet wird:

  - `Erklärung Promisc Mode - Brauchen wir eine Glossar Page?`


```ruby
 s.vm.network "private_network", ip: "192.168.77.5"
 s.vm.provider "virtualbox" do |vb|
       vb.customize [ 'modifyvm', :id, '--nicpromisc1', 'allow-all']
```

Auf der Seite des Hosts wird dazu eine Host-Only Bridge erzeugt (z.B. `vnet1`),
an dem diese virtuellen Netzwerkinterfaces angeklemmt sind.

Nach Starten der VMs kann man sich das Ergebnis anschauen:

```bash
$ vagrant up
....
$ vagrant ssh docker-test1
....
$ ip addr show
...
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast master ovs-system state UP group default qlen 1000
    link/ether 08:00:27:a5:83:64 brd ff:ff:ff:ff:ff:ff
    inet 192.168.77.5/24 brd 192.168.77.255 scope global eth1
       valid_lft forever preferred_lft forever
```

Damit die Demo funktioniert, muss in VirtualBox das Host-only Netzwerk in den Promisc-Modus gesetzt werden. Dazu
sucht man in der Liste der VMs die beiden von Vagrant gemanagten VMs heraus,
wählt sie aus -> Klick auf Ändern -> Netzwerk -> Adapter 2.
Der Promiscous-Mode wird auf "erlauben für alle VMs und Host" gesetzt:

 `BILD`

Leider muss nach einer Änderung die Vagrant-VM neu gestartet werden:

```bash
$ vagrant reload
$ vagrant ssh docker-test1
bzw.
$ vagrant ssh docker-test2
```

In den VMs werden nun noch Pakete, u.a. docker, nach installiert:


```bash
$ sudo apt-get -y update
$ sudo apt-get -y install curl git openssl ca-certificates make bridge-utils arping
$ sudo apt-get install -y docker.io
$ sudo ln -sf /usr/bin/docker.io /usr/local/bin/docker
```

..- `Warum nicht als shell Provisioner?`

Um mit Containern zu experimentieren, ziehen wir das Ubuntu-Image:


```bash
$ sudo -i
# docker pull ubuntu:latest
```

..- `Auch dafür gibt es ein Docker Plugin in Vargant`

Und instanziieren einen Container, lassen ihn im Vordergrund geöffnet.


```bash
# docker run -t -i ubuntu:latest /bin/bash
```

Um das Ziel zu erreichen, benötigt jeder Container ein neues Netzwerkinterface.
Außerdem soll auf den VMs eine neue Bridge existieren, die an das VM-Interface
mit dem privaten Netzwerk angeschlossen ist.

Den größten Teil dieser Arbeit kann dabei [Pipework](https://github.com/jpetazzo/pipework) übernehmen.

# Pipework

Bei pipework handelt es sich um ein Shell-Skript, das sich um genau diese Aufgaben
kümmert:
  - Anlegen einer Bridge auf dem Host
  - Anlegen eines Netzwerkinterfaces im Container, zugeordnet zu dessen Namenspace
  - Anlegen eines (Peer-)Netzwerkinterfaces auf dem Host, verknüpft zum Interface im Container
  - Anklemmen des  Host-Interfaces an die Bridge


Dabei versteht es sich mit der Linux Bridge und Open vSwitch und bietet weitreichende Möglichkeiten.

Also auf den VMs:


```bash
# git clone https://github.com/jpetazzo/pipework
# cd pipework

# # Wir benötigen die Container-ID
# docker ps
# CID=<Container-ID einsetzen>

# # Jetzt geben wir dem Container ein neues Interface, mit einer IP-Adresse
# ./pipework br0 $CID 192.168.77.10/24
bzw. auf der zweiten VM:
# ./pipework br0 $CID 192.168.77.20/24
```


In der (noch offenen, s.o.) Container-Shell lässt sich das nachprüfen:


```bash
$ ip addr show eth1
```

D.h. pipework hat uns ein passendes Interfaces erzeugt und mit einer IP versorgt.
Auf dem Host lässt sich der Zustand der Bridge anzeigen:


```bash
# brctl show
```

Es ist zu sehen, dass auf der `docker0`-Bridge ein veth-Interface angebunden ist
(im Container: eth0), und auf der neuen `br0`-Bridge ein anderes veth-Interface,
das im Container dem neuen eth1 entspricht.

## Anzeige der Bridge-/Interface-Struktur

Mit einem Ruby-Skript lässt sich der Zusammenhang zwischen Bridges, Interfaces
auf dem Host und in den Container anzeigen:


```bash
# git clone https://github.com/aschmidt75/docker-network-inspect
# cd docker-network-inspect/lib/
# ./docker-network-inspect.rb $CID
```

# Container über VM-Grenzen verbinden

Um die Container auf den beiden VMs miteinander sprechen zu lassen, wird eine
Verbindung der beiden neuen Bridges notwendig. Dazu liegen auf den VMs die
Host-Interfaces (`eth1`) bereit. Wichtig ist, dass diese Interfaces und die
Interfaces der Container im selben Subnetz liegen (hier: 192.168.77.0/24)

In den VMs verbinden wir das jeweilige `eth1` mit der Bridge `br0`


```bash
# brctl addif br0 eth1
# brctl show
```

Im Container selber lässt sich nun die IP des anderen Containers anpingen (auf
  die richtige IP achten):


```bash
# ping 196.168.77.20
bzw.
# ping 196.168.77.10
```

# Fazit

Das automatische Verlinken von Containern ist im Docker-Daemon
aktuell nur auf demselben Host möglich. Das Verbinden von Containern über Hostgrenzen
hinweg ist zur Zeit noch manueller Aufwand. Wir dürfen gespannt sein, wann das Docker-Team
auch hier eine Lösung anbieten wird.

Wer das obige Setup automatisiert aufsetzen möchte, findet in meinem
[Network Playground](github.com/aschmidt75/docker-network-playground/wiki) mit dem
"Simple-Setup" eine vorbereitete Lösung zum Ausprobieren.

Im Prinzip ist man mit Pipework in der Lage, komplexere Netzwerkarchitekturen
aufzubauen. Einen weiteren Schritt in Richtung Netzwerkvirtualisierung und SDN
(Software-Defined Network) stellt Open vSwitch dar. Das werden wir im
nächsten Post weiter beleuchten.


--
Andreas
