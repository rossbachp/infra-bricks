---
layout: post
title: "Docker entschlüsselt: Netzwerk-Teil 2"
modified: 2014-06-26 15:33:08 +0200
tags: [draft, docker, network, pipework, andreasschmidt ]
category: docker
links:
  - Docker Advanced Networking: https://docs.docker.com/articles/networking/
  - Network-Playground: github.com/aschmidt75/docker-network-playground/wiki
  - openvswitch: http://openvswitch.org/
  - open-vswitch-201-301: http://www.jedelman.com/home/open-vswitch-201-301
  - pipework: https://github.com/jpetazzo/pipework
  - Software Defined Networks: http://www.sflow.org/
keywords:
  - docker
  - network
  - pipework
---

Im [ersten Teil](http://www.infrabricks.de/blog/2014/07/06/docker-entschlusselt-netzwerk/)
von "Docker entschlüsselt: Netzwerk" haben wir gesehen,
wie der Docker-Daemon Netzwerkinterfaces, die `docker0`-Bridge und die
Kommunikation der Container nach außen und untereinander managed.

Im zweiten Teil sollen nun die Grundlagen geschaffen werden, damit Docker-Container
auch über Host-Grenzen hinweg kommunizieren können. Dafür gibt es mehrere
Möglichkeiten (z.B. die Default-Bridge `docker0` an ein externes Interface anzuschließen oder
  das iptables-Regelwerk zu erweitern), wir wählen diejenige, welche mit der Standardkonfiguration
des Docker-Daemon funktioniert.

## Der Plan: Eine neue Bridge anlegen

Ziel ist es, auf zwei virtuellen Maschinen je einen Docker Container zu instanziieren.
Dieser Container wird mit einem neuen `eth1` Netzwerkinterface versorgt, das über
eine eigene `br0` Netzwerk-Bridge mit einem `eth1` Netzwerkinterface des Hosts verbunden ist:

![docker_network_2vms.png]({{ site.BASE_PATH }}/assets/images/docker_network_2vms.png)

## Voraussetzungen

Um ein solches Setup schnell aufzusetzen, empfiehlt sich die Kombination aus
Vagrant und Virtualbox. Als Basis kann dafür unser [DockerBox](https://github.com/rossbachp/dockerbox) - Projekt auf github dienen. Dazu das passende Vagrantfile für zwei VMs auf Basis Ubuntu:

```ruby
Vagrant.configure("2") do |config|
  # https://vagrantcloud.com/stamm/trusty64-dockeattr_reader :attr_names
  config.vm.box = "trusty64"
  config.vm.box_url = "http://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box"

  config.vm.define "docker-test1", primary: true do |s|
    s.vm.network "private_network", ip: "192.168.77.5"
    s.vm.provider "virtualbox" do |vb|
      vb.customize [ 'modifyvm', :id, '--nicpromisc2', 'allow-all']
      vb.gui = false
      vb.customize [ "modifyvm", :id, "--memory", "512"]
      vb.customize [ "modifyvm", :id, "--cpus", "1"]
    end
  end

  config.vm.define "docker-test2", primary: true do |s|
    s.vm.network "private_network", ip: "192.168.77.6"
    s.vm.provider "virtualbox" do |vb|
      vb.customize [ 'modifyvm', :id, '--nicpromisc2', 'allow-all']
        vb.gui = false
        vb.customize [ "modifyvm", :id, "--memory", "512"]
        vb.customize [ "modifyvm", :id, "--cpus", "1"]
     	end
  end
end
```
Das besondere liegt in der Definition eines zusätzlichen Netzwerkinterfaces
`eth1`, dass im weiteren in den [Promisc-Mode](http://de.wikipedia.org/wiki/Promiscuous_Mode) geschaltet wird:

```ruby
 s.vm.network "private_network", ip: "192.168.77.5"
 s.vm.provider "virtualbox" do |vb|
       vb.customize [ 'modifyvm', :id, '--nicpromisc2', 'allow-all']
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

In den beiden VMs werden nun noch Pakete, u.a. docker, nach installiert:


```bash
$ sudo apt-get -y update
$ sudo apt-get -y install curl git openssl ca-certificates make bridge-utils arping
$ sudo apt-get install -y docker.io
$ sudo ln -sf /usr/bin/docker.io /usr/local/bin/docker
```

Alternativ kann die [DockerBox](https://github.com/rossbachp/dockerbox) eingesetzt werden,
dort muss nur das Paket bridge-utils nachinstalliert werden.

Um mit dem Docker-Containern zu experimentieren, ziehen wir das Ubuntu-Image:

```bash
$ sudo -i
~# docker pull ubuntu:latest
```

Und instanziieren einen neuen Docker-Container, lassen ihn im Vordergrund geöffnet.


```bash
~# docker run -t -i ubuntu:latest /bin/bash
```

Um das Ziel zu erreichen, benötigt jeder Container ein neues Netzwerkinterface.
Außerdem soll auf den VMs eine neue Bridge existieren, die an das VM-Interface
mit dem privaten Netzwerk angeschlossen ist.

Den größten Teil dieser Arbeit kann dabei [Pipework](https://github.com/jpetazzo/pipework) übernehmen.

## Pipework

Bei pipework handelt es sich um ein Shell-Skript, das sich um genau diese Aufgaben kümmert:

  - Anlegen einer Bridge auf dem Host
  - Anlegen eines Netzwerkinterfaces im Container, zugeordnet zu dessen Namenspace
  - Anlegen eines (Peer-)Netzwerkinterfaces auf dem Host, verknüpft zum Interface im Container
  - Anklemmen des Host-Interfaces an die Bridge


Dabei versteht es sich mit der Linux Bridge und [Open vSwitch](http://openvswitch.org/) und bietet weitreichende Möglichkeiten.

Also auf den VMs kann pipework folgendermassen installiert werden:

```bash
$ sudo -i
~# git clone https://github.com/jpetazzo/pipework
~# cd pipework

~# # Wir benötigen die Container-ID des Containers, den wir erweitern wollen
~# docker ps
....
~# CID=<Container-ID einsetzen>

~# # Jetzt geben wir dem Container ein neues Interface, mit einer IP-Adresse
~# ./pipework br0 $CID 192.168.77.10/24
bzw. auf der zweiten VM:
~# ./pipework br0 $CID 192.168.77.20/24
```

In der (noch offenen, s.o.) Container-Shell lässt sich das nachprüfen:

```bash
$ ip addr show eth1
20: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether be:fc:f1:47:02:2a brd ff:ff:ff:ff:ff:ff
    inet 192.168.77.10/24 scope global eth1
       valid_lft forever preferred_lft forever
    inet6 fe80::bcfc:f1ff:fe47:22a/64 scope link
       valid_lft forever preferred_lft forever
```

D.h. pipework hat uns ein passendes Interfaces erzeugt und mit einer IP versorgt.
Auf dem Host lässt sich der Zustand der Bridge anzeigen:


```bash
~# brctl show
bridge name	bridge id		STP enabled	interfaces
br0		8000.0800273bcbbb	no	  pl5330eth1
```

Es ist zu sehen, dass auf der `docker0`-Bridge ein veth-Interface angebunden ist
(im Container: eth0), und auf der neuen `br0`-Bridge ein anderes virtuellees-Interface,
das im Container dem neuen eth1 entspricht. Pipework vergibt dabei Interface-Namen, die
mit "pl" prefixed sind.

## Anzeige der Bridge-/Interface-Struktur

Mit einem Ruby-Skript lässt sich der Zusammenhang zwischen Bridges, Interfaces
auf dem Host und in den Container anzeigen:


```bash
~# git clone https://github.com/aschmidt75/docker-network-inspect
~# cd docker-network-inspect/lib/
~# ./docker-network-inspect.rb $CID
CONTAINER 6437709a4ea2
+ PID 5330
+ INTERFACES
 + lo (1)
 + eth0 (5)
  + HOST PEER veth6166 (6)
   + BRIDGE
 + eth1 (8)
  + HOST PEER pl5330eth1 (9)
   + BRIDGE br0
```

## Container über VM-Grenzen verbinden

Um die Container auf den beiden VMs miteinander sprechen zu lassen, wird eine
Verbindung der beiden neuen Bridges notwendig. Dazu liegen auf den VMs die
Host-Interfaces (`eth1`) bereit. Wichtig ist, dass diese Interfaces und die
Interfaces der Container im selben Subnetz liegen (hier: 192.168.77.0/24)

In den VMs verbinden wir das jeweilige `eth1` mit der Bridge `br0`


```bash
~# brctl addif br0 eth1
~# brctl show br0
bridge name	bridge id		STP enabled	interfaces
br0		8000.0800273bcbbb	no		eth1
							pl5330eth1
```

Im Container selber lässt sich nun die IP des jeweils anderen Docker-Containers auf der anderen VM anpingen:

  - **Tipp**: Auf die richtige IP in der jeweiligen VM achten!

Im Docker-Container auf der `docker-test1`-VM hilft folgender Test:

```bash
~# ping 192.168.77.20
PING 192.168.77.20 (192.168.77.20) 56(84) bytes of data.
64 bytes from 192.168.77.20: icmp_seq=1 ttl=64 time=0.364 ms
64 bytes from 192.168.77.20: icmp_seq=2 ttl=64 time=0.524 ms
^C
--- 192.168.77.20 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1000ms
rtt min/avg/max/mdev = 0.364/0.444/0.524/0.080 ms
```

Im Docker-Container auf der `docker-test2`-VM hilft folgender Test:

```bash
~# ping 192.168.77.10
PING 192.168.77.10 (192.168.77.10) 56(84) bytes of data.
64 bytes from 192.168.77.10: icmp_seq=1 ttl=64 time=0.401 ms
64 bytes from 192.168.77.10: icmp_seq=2 ttl=64 time=0.675 ms
^C
--- 192.168.77.10 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 999ms
rtt min/avg/max/mdev = 0.401/0.538/0.675/0.137 ms
```

## Fazit

Das automatische Verlinken von Docker-Containern ist im Docker-Daemon
aktuell nur auf demselben Host möglich. Das Verbinden von Containern über Hostgrenzen
hinweg ist zur Zeit noch etwas manueller Aufwand. Wir dürfen gespannt sein, wann das Docker-Community
auch hier eine Lösung anbieten wird.

Aktuelle Entwicklungen wie [libswarm](https://github.com/docker/libswarm), CoreOS und Kubernetes
gehen schon in diese Richtung.

Wer das obige Setup automatisiert aufsetzen möchte, findet in meinem
[Network Playground](http://github.com/aschmidt75/docker-network-playground/wiki) mit dem
**Simple-Setup** eine vorbereitete Lösung zum Ausprobieren.

Im Prinzip ist man mit Pipework in der Lage, komplexere Netzwerkarchitekturen
aufzubauen. Einen weiteren Schritt in Richtung Netzwerkvirtualisierung und
[Software-Defined Network](http://www.sflow.org/) stellt Open vSwitch dar. Das werden wir im nächsten Post weiter beleuchten.


--
Andreas
